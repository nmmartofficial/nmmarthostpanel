import test from 'node:test';
import assert from 'node:assert/strict';
import { savePOSLayoutSettingsToSupabase } from './posLayoutSettingsBackend.js';
import { POS_LAYOUT_CONFIG_KEY } from './posLayoutSettings.js';

const admin = {
  auth_user_id: 'auth-admin-1',
  role: 'admin',
  status: 'active',
  is_active: true,
  tenant_id: 7,
  company_code: 'STORE-7'
};

const createClient = ({ existing = null, authUserId = 'auth-admin-1', returnedScope } = {}) => {
  const calls = [];
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: authUserId } }, error: null }) },
    from(table) {
      const state = { table, operation: 'select', filters: [], values: null };
      const builder = {
        select(columns) {
          state.columns = columns;
          calls.push({ ...state, method: 'select' });
          return builder;
        },
        eq(column, value) {
          state.filters.push([column, value]);
          return builder;
        },
        update(values) {
          state.operation = 'update';
          state.values = values;
          return builder;
        },
        insert(values) {
          state.operation = 'insert';
          state.values = values;
          return builder;
        },
        maybeSingle: async () => {
          calls.push({ ...state, filters: [...state.filters], method: 'maybeSingle' });
          if (state.operation === 'select') return { data: existing, error: null };
          const saved = state.operation === 'insert'
            ? state.values
            : { ...existing, ...state.values };
          return {
            data: {
              id: saved.id || 22,
              tenant_id: returnedScope?.tenant_id ?? saved.tenant_id,
              company_code: returnedScope?.company_code ?? saved.company_code,
              key: returnedScope?.key ?? saved.key,
              value: saved.value
            },
            error: null
          };
        }
      };
      return builder;
    }
  };
  return { client, calls };
};

test('saves a new settings row scoped to the authenticated tenant and company', async () => {
  const { client, calls } = createClient();
  const saved = await savePOSLayoutSettingsToSupabase(client, admin, { theme: 'blue' });
  const insert = calls.find((call) => call.method === 'maybeSingle' && call.operation === 'insert');

  assert.equal(saved.key, POS_LAYOUT_CONFIG_KEY);
  assert.equal(saved.tenant_id, admin.tenant_id);
  assert.equal(saved.company_code, admin.company_code);
  assert.equal(JSON.parse(saved.value).theme, 'blue');
  assert.deepEqual(insert.filters, []);
});

test('updates only the existing settings row in the matching tenant and company', async () => {
  const existing = {
    id: 12,
    tenant_id: admin.tenant_id,
    company_code: admin.company_code,
    key: POS_LAYOUT_CONFIG_KEY
  };
  const { client, calls } = createClient({ existing });
  const saved = await savePOSLayoutSettingsToSupabase(client, admin, { theme: 'blue' });
  const update = calls.find((call) => call.method === 'maybeSingle' && call.operation === 'update');

  assert.equal(saved.id, existing.id);
  assert.deepEqual(update.filters, [
    ['id', existing.id],
    ['tenant_id', admin.tenant_id],
    ['company_code', admin.company_code],
    ['key', POS_LAYOUT_CONFIG_KEY]
  ]);
});

test('rejects an unverified admin session or a row returned for another store', async () => {
  const mismatchedSession = createClient({ authUserId: 'different-auth-user' });
  await assert.rejects(
    savePOSLayoutSettingsToSupabase(mismatchedSession.client, admin, {}),
    /authenticated admin session could not be verified/
  );
  assert.equal(mismatchedSession.calls.length, 0);

  const wrongScope = createClient({ returnedScope: { tenant_id: 8 } });
  await assert.rejects(
    savePOSLayoutSettingsToSupabase(wrongScope.client, admin, {}),
    /did not confirm saving/
  );
});
