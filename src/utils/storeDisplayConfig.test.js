import test from 'node:test';
import assert from 'node:assert/strict';
import {
  loadStoreDisplaySelection,
  saveStoreDisplaySelection
} from './storeDisplayConfig.js';

function createClient(result) {
  const calls = [];
  const builder = {
    from(table) {
      calls.push({ method: 'from', table });
      return builder;
    },
    select(columns) {
      calls.push({ method: 'select', columns });
      return builder;
    },
    eq(column, value) {
      calls.push({ method: 'eq', column, value });
      return builder;
    },
    upsert(payload, options) {
      calls.push({ method: 'upsert', payload, options });
      return builder;
    },
    maybeSingle() {
      return Promise.resolve(result);
    },
    single() {
      return Promise.resolve(result);
    }
  };
  return { client: builder, calls };
}

function createMemoryClient() {
  const rows = [];
  let pendingRow = null;
  const client = {
    from() {
      const filters = [];
      const builder = {
        select() {
          return builder;
        },
        eq(column, value) {
          filters.push([column, String(value)]);
          return builder;
        },
        upsert(payload) {
          const existing = rows.find((row) => (
            row.tenant_id === payload.tenant_id && row.key === payload.key
          ));
          if (existing) Object.assign(existing, payload);
          else rows.push({ ...payload, id: rows.length + 1 });
          pendingRow = rows.find((row) => (
            row.tenant_id === payload.tenant_id && row.key === payload.key
          ));
          return builder;
        },
        maybeSingle() {
          const row = rows.find((candidate) => filters.every(([column, value]) => (
            String(candidate[column]) === value
          )));
          return Promise.resolve({ data: row || null, error: null });
        },
        single() {
          return Promise.resolve({ data: pendingRow, error: null });
        }
      };
      return builder;
    }
  };

  return { client, rows };
}

const scope = { tenantId: 12, companyCode: 'NM012' };

test('saves selected IDs atomically against the verified tenant/key constraint', async () => {
  const { client, calls } = createClient({
    data: { id: 41, key: 'store_display_item', tenant_id: 12, company_code: 'NM012' },
    error: null
  });

  const selected = await saveStoreDisplaySelection(client, {
    scope,
    key: 'store_display_item',
    title: 'Store Item Display',
    selectedIds: [1, '2', 1],
    updatedBy: 7
  });

  const write = calls.find((call) => call.method === 'upsert');
  assert.deepEqual(selected, ['1', '2']);
  assert.deepEqual(write.options, { onConflict: 'tenant_id,key' });
  assert.equal(write.payload.tenant_id, 12);
  assert.equal(write.payload.company_code, 'NM012');
  assert.equal(write.payload.key, 'store_display_item');
  assert.deepEqual(write.payload.value.selected_ids, ['1', '2']);
  assert.equal(write.payload.value.updated_by, 7);
});

test('reloads the saved selection only for its tenant, company, and setting key', async () => {
  const { client, calls } = createClient({
    data: {
      id: 41,
      key: 'store_display_item',
      tenant_id: 12,
      company_code: 'NM012',
      value: { selected_ids: [3, '4', 3] }
    },
    error: null
  });

  const selected = await loadStoreDisplaySelection(client, scope, 'store_display_item');

  assert.deepEqual(selected, ['3', '4']);
  assert.deepEqual(
    calls.filter((call) => call.method === 'eq'),
    [
      { method: 'eq', column: 'tenant_id', value: 12 },
      { method: 'eq', column: 'company_code', value: 'NM012' },
      { method: 'eq', column: 'key', value: 'store_display_item' }
    ]
  );
});

test('reloads selections without overwriting other keys or tenants', async () => {
  const { client, rows } = createMemoryClient();

  await saveStoreDisplaySelection(client, {
    scope,
    key: 'store_display_item',
    title: 'Store Item Display',
    selectedIds: ['101', '202']
  });
  await saveStoreDisplaySelection(client, {
    scope: { tenantId: 13, companyCode: 'NM013' },
    key: 'store_display_item',
    title: 'Store Item Display',
    selectedIds: ['303']
  });
  await saveStoreDisplaySelection(client, {
    scope,
    key: 'store_display_subcategory',
    title: 'Store Sub-Cat Display',
    selectedIds: ['404']
  });

  assert.deepEqual(
    await loadStoreDisplaySelection(client, scope, 'store_display_item'),
    ['101', '202']
  );
  assert.deepEqual(
    await loadStoreDisplaySelection(client, scope, 'store_display_subcategory'),
    ['404']
  );
  assert.deepEqual(
    await loadStoreDisplaySelection(
      client,
      { tenantId: 13, companyCode: 'NM013' },
      'store_display_item'
    ),
    ['303']
  );
  assert.equal(rows.length, 3);
});

test('a missing row and an empty selection both load as an empty selection', async () => {
  const missing = createClient({ data: null, error: null });
  const empty = createClient({ data: { value: { selected_ids: [] } }, error: null });

  assert.deepEqual(
    await loadStoreDisplaySelection(missing.client, scope, 'store_display_subcategory'),
    []
  );
  assert.deepEqual(
    await loadStoreDisplaySelection(empty.client, scope, 'store_display_main_category'),
    []
  );
});

test('preserves Supabase select errors with table and operation metadata', async () => {
  const { client } = createClient({
    data: null,
    error: {
      code: '42501',
      message: 'permission denied for table home_config',
      status: 403
    }
  });

  await assert.rejects(
    () => loadStoreDisplaySelection(client, scope, 'store_display_item'),
    (error) => {
      assert.equal(error.table, 'home_config');
      assert.equal(error.operation, 'select');
      assert.equal(error.code, '42501');
      assert.equal(error.status, 403);
      return true;
    }
  );
});

test('preserves Supabase error code, table, and operation for diagnostic logging', async () => {
  const { client } = createClient({
    data: null,
    error: {
      code: '42501',
      message: 'new row violates row-level security policy for table "home_config"'
    }
  });

  await assert.rejects(
    () => saveStoreDisplaySelection(client, {
      scope,
      key: 'store_display_item',
      title: 'Store Item Display',
      selectedIds: ['3']
    }),
    (error) => {
      assert.equal(error.table, 'home_config');
      assert.equal(error.operation, 'upsert');
      assert.equal(error.code, '42501');
      assert.equal(error.status, null);
      assert.match(error.message, /row-level security policy/);
      return true;
    }
  );
});

test('refuses reads and writes without tenant and company scope', async () => {
  const { client, calls } = createClient({ data: null, error: null });

  await assert.rejects(
    () => loadStoreDisplaySelection(client, { tenantId: 12 }, 'store_display_item'),
    /Tenant and company context are required/
  );
  await assert.rejects(
    () => saveStoreDisplaySelection(client, {
      scope: { companyCode: 'NM012' },
      key: 'store_display_item',
      title: 'Store Item Display',
      selectedIds: []
    }),
    /Tenant and company context are required/
  );
  assert.deepEqual(calls, []);
});

test('rejects a successful-shaped response for another tenant or setting key', async () => {
  const { client } = createClient({
    data: { id: 41, key: 'other_key', tenant_id: 99, company_code: 'NM099' },
    error: null
  });

  await assert.rejects(
    () => saveStoreDisplaySelection(client, {
      scope,
      key: 'store_display_item',
      title: 'Store Item Display',
      selectedIds: ['3']
    }),
    /did not confirm the selection for this tenant and key/
  );
});
