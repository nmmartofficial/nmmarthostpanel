import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ADMIN_PRODUCT_FIELDS,
  applyPosProductSync,
  buildPosProductPatch,
  planPosProductSync
} from './posProductSync.js';

test('POS patch allowlist excludes admin-owned fields and stock', () => {
  const patch = buildPosProductPatch({
    RawName: 'Updated Item',
    barcode: '890123',
    MRP: 100,
    OpStock: 999,
    brand_id: 10,
    category_id: 20,
    image_url: 'should-not-pass'
  });

  assert.equal(patch.name, 'Updated Item');
  assert.equal(patch.mrp, 100);
  assert.equal(patch.stock, undefined);
  ADMIN_PRODUCT_FIELDS.forEach((field) => assert.equal(patch[field], undefined));
});

test('POS patch preserves blank existing values by omitting blank fields', () => {
  const patch = buildPosProductPatch({ barcode: '000123', RawName: '', GSTPERC: '' });
  assert.deepEqual(patch, { barcode: '000123' });
});

test('POS sync updates an existing barcode match and inserts a new product', () => {
  const result = planPosProductSync({
    existingProducts: [{ id: 7, barcode: '123', name: 'Old Item', image_url: 'admin-image' }],
    posProducts: [
      { barcode: '123', RawName: 'New Name', MRP: 50 },
      { barcode: '999', RawName: 'New Product', MRP: 100 }
    ]
  });

  assert.deepEqual(result.plan.map(({ action, id, barcode }) => ({ action, id, barcode })), [
    { action: 'UPDATE', id: 7, barcode: '123' },
    { action: 'INSERT', id: undefined, barcode: '999' }
  ]);
  assert.deepEqual(result.plan[0].patch, { name: 'New Name', barcode: '123', mrp: 50 });
  assert.equal(result.plan[0].patch.image_url, undefined);
  assert.equal(result.summary.inserted, 1);
  assert.equal(result.summary.conflicts, 0);
});

test('POS sync rejects ambiguous name matches and duplicate incoming barcodes', () => {
  const result = planPosProductSync({
    existingProducts: [
      { id: 1, name: 'Same Item' },
      { id: 2, name: 'Same Item' }
    ],
    posProducts: [
      { RawName: 'Same Item', MRP: 10 },
      { barcode: '123', RawName: 'A', MRP: 10 },
      { barcode: '123', RawName: 'B', MRP: 20 }
    ]
  });

  assert.equal(result.plan.length, 1);
  assert.equal(result.conflicts.length, 2);
  assert.deepEqual(result.conflicts.map(({ reason }) => reason), [
    'Ambiguous product name match',
    'Duplicate barcode in POS batch'
  ]);
});

test('POS apply defaults to dry-run and never writes in dry-run mode', async () => {
  let writes = 0;
  const report = await applyPosProductSync({
    plan: [{ action: 'INSERT', patch: { barcode: '123' } }],
    repository: {
      insert: async () => { writes += 1; },
      update: async () => { writes += 1; }
    }
  });

  assert.equal(report.dryRun, true);
  assert.equal(writes, 0);
});
