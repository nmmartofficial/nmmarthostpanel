import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeProductDelta, PRODUCT_DELTA_OVERLAP_MS } from './productDeltaCache.js';

test('product delta merge preserves unchanged rows and upserts by ID', () => {
  const unchanged = { id: 1, name: 'Milk', created_at: '2026-10-01T00:00:00Z' };
  const updated = { id: 2, name: 'Rice old', created_at: '2026-10-02T00:00:00Z' };
  const merged = mergeProductDelta([unchanged, updated], [
    { ...updated, name: 'Rice new' },
    { id: 3, name: 'Tea', created_at: '2026-10-03T00:00:00Z' }
  ]);

  assert.equal(merged.length, 3);
  assert.equal(merged.find((product) => product.id === 1), unchanged);
  assert.equal(merged.find((product) => product.id === 2).name, 'Rice new');
  assert.equal(merged[0].id, 3);
});

test('inactive delta rows remove products from active cache but remain visible in trash cache', () => {
  const existing = [{ id: 5, name: 'Old item', is_active: true }];
  const inactive = { id: 5, name: 'Old item', is_active: false };

  assert.deepEqual(mergeProductDelta(existing, [inactive]), []);
  assert.deepEqual(mergeProductDelta(existing, [inactive], { includeDeleted: true }), [inactive]);
});

test('invalid product rows are rejected and delta overlap is configured', () => {
  assert.throws(() => mergeProductDelta([], [{ name: 'Missing ID' }]), /without an ID/);
  assert.equal(PRODUCT_DELTA_OVERLAP_MS, 120_000);
});
