import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyInventoryRealtimeChange,
  fetchAndReconcileInventoryRows,
  reconcileInventoryRows,
  syncCartInventory
} from './inventorySync.js';

const scope = { tenantId: 42, companyCode: 'SHOP042' };
const product = (id, overrides = {}) => ({
  id,
  tenant_id: 42,
  company_code: 'SHOP042',
  name: `Product ${id}`,
  quantity: 10,
  stock: 10,
  price: 25,
  is_active: true,
  created_at: `2026-01-0${id}T00:00:00.000Z`,
  updated_at: '2026-01-10T00:00:00.000Z',
  ...overrides
});

test('unchanged realtime items keep the cache and item references untouched', () => {
  const first = product(1);
  const second = product(2);
  const rows = [first, second];
  let fullFetchCount = 0;
  const result = applyInventoryRealtimeChange(rows, {
    eventType: 'UPDATE',
    new: { ...first }
  }, { scope });

  if (result.requiresReconciliation) {
    fullFetchCount += 1;
  }
  assert.equal(result.changed, false);
  assert.equal(result.rows, rows);
  assert.equal(result.rows[0], first);
  assert.equal(result.rows[1], second);
  assert.equal(fullFetchCount, 0);
});

test('new realtime items are added once in the existing created-at ordering', () => {
  const first = product(1);
  const third = product(3);
  const rows = [third, first];
  const incoming = product(2);

  const added = applyInventoryRealtimeChange(rows, {
    eventType: 'INSERT',
    new: incoming
  }, { scope });
  const duplicate = applyInventoryRealtimeChange(added.rows, {
    eventType: 'INSERT',
    new: { ...incoming }
  }, { scope });

  assert.deepEqual(added.rows.map(({ id }) => id), [3, 2, 1]);
  assert.equal(duplicate.changed, false);
  assert.equal(duplicate.rows, added.rows);
  assert.equal(duplicate.rows.filter(({ id }) => id === 2).length, 1);
});

test('changed stock quantity and other fields replace only the changed item', () => {
  const unchanged = product(1);
  const changed = product(2);
  const rows = [unchanged, changed];
  const result = applyInventoryRealtimeChange(rows, {
    eventType: 'UPDATE',
    new: { ...changed, quantity: 4, stock: 4, price: 19 }
  }, { scope });

  assert.equal(result.rows[0], unchanged);
  assert.notEqual(result.rows[1], changed);
  assert.equal(result.rows[1].quantity, 4);
  assert.equal(result.rows[1].stock, 4);
  assert.equal(result.rows[1].price, 19);
});

test('out-of-order stock events cannot overwrite newer inventory records', () => {
  const current = product(1, { stock: 5, updated_at: '2026-01-12T00:00:00.000Z' });
  const rows = [current];
  const result = applyInventoryRealtimeChange(rows, {
    eventType: 'UPDATE',
    new: product(1, { stock: 9, updated_at: '2026-01-11T00:00:00.000Z' })
  }, { scope });

  assert.equal(result.rows, rows);
  assert.equal(result.changed, false);
  assert.equal(result.rows[0].stock, 5);

  const staleDelete = applyInventoryRealtimeChange(rows, {
    eventType: 'DELETE',
    old: product(1, { updated_at: '2026-01-11T00:00:00.000Z' })
  }, { scope });
  assert.equal(staleDelete.rows, rows);
  assert.equal(staleDelete.changed, false);
});

test('cart inventory refresh updates stock fields without replacing prices or other cart state', () => {
  const cartItem = {
    ...product(1, { stock: 8 }),
    quantity: 2,
    sale_rate: 17,
    price_override_approval_id: 'approval-1',
    discount_amount: 3
  };
  const updatedProduct = product(1, {
    stock: 3,
    low_stock_threshold: 4,
    stock_status: 'low',
    sale_rate: 99
  });
  const cart = [cartItem];
  const updatedCart = syncCartInventory(cart, [updatedProduct]);

  assert.notEqual(updatedCart, cart);
  assert.equal(updatedCart[0].stock, 3);
  assert.equal(updatedCart[0].low_stock_threshold, 4);
  assert.equal(updatedCart[0].stock_status, 'low');
  assert.equal(updatedCart[0].sale_rate, 17);
  assert.equal(updatedCart[0].quantity, 2);
  assert.equal(updatedCart[0].price_override_approval_id, 'approval-1');
  assert.equal(updatedCart[0].discount_amount, 3);
  assert.equal(syncCartInventory(updatedCart, [updatedProduct]), updatedCart);
});

test('explicit deactivation and fully scoped deletion remove cached items safely', () => {
  const active = product(1);
  const deactivated = product(2);
  const rows = [active, deactivated];
  const afterDeactivate = applyInventoryRealtimeChange(rows, {
    eventType: 'UPDATE',
    new: { ...deactivated, is_active: false }
  }, { scope });
  const afterDelete = applyInventoryRealtimeChange(afterDeactivate.rows, {
    eventType: 'DELETE',
    old: product(1)
  }, { scope });

  assert.deepEqual(afterDeactivate.rows, [active]);
  assert.deepEqual(afterDelete.rows, []);

  const trashView = applyInventoryRealtimeChange(rows, {
    eventType: 'UPDATE',
    new: { ...deactivated, is_active: false }
  }, { scope, includeDeleted: true });
  assert.equal(trashView.rows[1].is_active, false);
});

test('partial delete payloads request reconciliation instead of inferring deletion', () => {
  const rows = [product(1)];
  const result = applyInventoryRealtimeChange(rows, {
    eventType: 'DELETE',
    old: { id: 1 }
  }, { scope });

  assert.equal(result.rows, rows);
  assert.equal(result.changed, false);
  assert.equal(result.requiresReconciliation, true);
});

test('tenant and company mismatches cannot mutate the cached inventory', () => {
  const rows = [product(1)];
  const result = applyInventoryRealtimeChange(rows, {
    eventType: 'UPDATE',
    new: product(1, { quantity: 0, tenant_id: 99 })
  }, { scope });

  assert.equal(result.rows, rows);
  assert.equal(result.changed, false);
  assert.equal(result.requiresReconciliation, false);

  const otherCompany = applyInventoryRealtimeChange(rows, {
    eventType: 'UPDATE',
    new: product(1, { quantity: 0, company_code: 'OTHER' })
  }, { scope });
  assert.equal(otherCompany.rows, rows);
  assert.equal(otherCompany.requiresReconciliation, false);
});

test('full reconciliation preserves unchanged item references and deduplicates IDs', () => {
  const unchanged = product(1);
  const changed = product(2);
  const previous = [unchanged, changed];
  const next = reconcileInventoryRows(previous, [
    { ...unchanged },
    { ...changed, quantity: 6 },
    { ...changed, quantity: 3 },
    product(3)
  ]);

  assert.equal(next[0], unchanged);
  assert.equal(next[1].quantity, 3);
  assert.equal(next.filter(({ id }) => id === 2).length, 1);
  assert.equal(next[2].id, 3);
});

test('invalid reconciliation responses fail without mutating the valid cache', () => {
  const cached = [product(1)];
  assert.throws(() => reconcileInventoryRows(cached, [{ name: 'missing id' }]), /without an item ID/);
  assert.throws(() => reconcileInventoryRows(cached, null), /valid row arrays/);
  assert.equal(cached.length, 1);
  assert.equal(cached[0].id, 1);
});

test('failed inventory fetches reject and leave the existing cache intact', async () => {
  const cached = [product(1)];
  let fetchCount = 0;

  await assert.rejects(
    () => fetchAndReconcileInventoryRows(cached, async () => {
      fetchCount += 1;
      throw new Error('network unavailable');
    }),
    /network unavailable/
  );

  assert.equal(fetchCount, 1);
  assert.equal(cached.length, 1);
  assert.equal(cached[0].id, 1);
});
