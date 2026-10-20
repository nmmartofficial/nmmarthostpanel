import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildBarcodeIndex,
  filterProductsBySearch,
  normalizeBarcode,
  resolveBarcodeMatch
} from './pos/barcodeHelpers.js';

const item = (id, overrides = {}) => ({
  id,
  barcode: `100${id}`,
  itname: `Item ${id}`,
  ...overrides
});

test('barcode lookup trims scanner input and matches only the product barcode field', () => {
  const product = item(1, { barcode: '89001', hsn_code: '1001' });
  const index = buildBarcodeIndex([product]);

  assert.equal(normalizeBarcode(' 1001 \n'), '1001');
  assert.deepEqual(resolveBarcodeMatch(index, ' 1001 '), {
    status: 'not-found',
    products: []
  });
  assert.equal(resolveBarcodeMatch(index, ' 89001 ').product, product);
});

test('one product with an exact barcode resolves, while duplicate barcodes stay ambiguous', () => {
  const single = item(1, { barcode: ' 89001 ' });
  const singleMatch = resolveBarcodeMatch(buildBarcodeIndex([single]), '89001');
  assert.equal(singleMatch.status, 'match');
  assert.equal(singleMatch.product, single);

  const duplicateIndex = buildBarcodeIndex([
    item(2, { barcode: '89002' }),
    item(3, { barcode: ' 89002 ' })
  ]);
  const ambiguous = resolveBarcodeMatch(duplicateIndex, '89002');
  assert.equal(ambiguous.status, 'ambiguous');
  assert.equal(ambiguous.products.length, 2);
});

test('search prioritizes exact barcode and item codes, and matches names, brand, and categories', () => {
  const nameMatch = item(1, { itname: 'Coffee Beans' });
  const barcodeMatch = item(2, { barcode: 'coffee', itname: 'Tea' });
  const skuMatch = item(3, { kcode: 'coffee', itname: 'Sugar' });
  const brandMatch = item(4, { brand_name: 'Coffee House', itname: 'Milk' });
  const categoryMatch = item(5, { category_name: 'Coffee & Tea', itname: 'Cup' });
  const results = filterProductsBySearch([
    nameMatch,
    brandMatch,
    categoryMatch,
    skuMatch,
    barcodeMatch
  ], 'coffee');

  assert.deepEqual(results.slice(0, 2), [barcodeMatch, skuMatch]);
  assert.ok(results.includes(nameMatch));
  assert.ok(results.includes(brandMatch));
  assert.ok(results.includes(categoryMatch));
});

test('search suppresses duplicate item IDs and includes supported variant attributes when present', () => {
  const product = item(1, { variant_name: '1kg Family Pack' });
  const results = filterProductsBySearch([product, { ...product, itname: 'Duplicate row' }], 'family pack');
  assert.deepEqual(results, [product]);
});

test('search can use the existing category and brand master records when product labels are absent', () => {
  const product = item(1, { category_name: null, brand_name: null, category_id: 7, brand_id: 9 });
  const lookups = {
    categories: [{ id: 7, name: 'Grocery' }],
    brands: [{ id: 9, name: 'NM Select' }]
  };

  assert.deepEqual(filterProductsBySearch([product], 'grocery', lookups), [product]);
  assert.deepEqual(filterProductsBySearch([product], 'nm select', lookups), [product]);
});
