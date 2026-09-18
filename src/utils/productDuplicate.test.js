import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeProductName,
  normalizeBarcode,
  checkProductDuplicate,
  validateProductReferenceData
} from './productDuplicate.js';

test('normalizes item name with spaces and case differences', () => {
  assert.equal(normalizeProductName('  Surf   Excel 80g  '), 'surf excel 80g');
  assert.equal(normalizeProductName('SURF EXCEL 80G'), 'surf excel 80g');
});

test('normalizes barcode by trimming spaces', () => {
  assert.equal(normalizeBarcode('  8901234567890  '), '8901234567890');
});

test('allows same brand with different item name', () => {
  const products = [{ id: 1, name: 'Surf Excel 80g', barcode: '8901', brand_id: 5, category_id: 11, subcategory_id: 20, is_active: true }];

  const result = checkProductDuplicate({
    products,
    productId: null,
    itemName: 'Surf Excel 500g',
    barcode: '8902',
    brandId: 5,
    categoryId: 11,
    subCategoryId: 20
  });

  assert.equal(result.isDuplicate, false);
});

test('allows same category with different item name', () => {
  const products = [{ id: 1, name: 'A', barcode: '1', brand_id: 5, category_id: 11, subcategory_id: 20, is_active: true }];

  const result = checkProductDuplicate({
    products,
    productId: null,
    itemName: 'B',
    barcode: '2',
    brandId: 7,
    categoryId: 11,
    subCategoryId: 20
  });

  assert.equal(result.isDuplicate, false);
});

test('allows same subcategory with different item name', () => {
  const products = [{ id: 1, name: 'A', barcode: '1', brand_id: 5, category_id: 11, subcategory_id: 20, is_active: true }];

  const result = checkProductDuplicate({
    products,
    productId: null,
    itemName: 'B',
    barcode: '2',
    brandId: 8,
    categoryId: 12,
    subCategoryId: 20
  });

  assert.equal(result.isDuplicate, false);
});

test('allows same brand/category/subcategory with different item name', () => {
  const products = [{ id: 1, name: 'Surf Excel 80g', barcode: '8901', brand_id: 5, category_id: 11, subcategory_id: 20, is_active: true }];

  const result = checkProductDuplicate({
    products,
    productId: null,
    itemName: 'Surf Excel 500g',
    barcode: '8902',
    brandId: 5,
    categoryId: 11,
    subCategoryId: 20
  });

  assert.equal(result.isDuplicate, false);
});

test('blocks duplicate item name', () => {
  const products = [{ id: 1, name: 'Surf Excel 80g', barcode: '8901', brand_id: 5, category_id: 11, subcategory_id: 20, is_active: true }];

  const result = checkProductDuplicate({
    products,
    productId: null,
    itemName: ' surf excel 80g ',
    barcode: '8902',
    brandId: 5,
    categoryId: 11,
    subCategoryId: 20
  });

  assert.equal(result.isDuplicate, true);
  assert.equal(result.field, 'itemName');
});

test('blocks duplicate barcode', () => {
  const products = [{ id: 1, name: 'Surf Excel 80g', barcode: '8901', brand_id: 5, category_id: 11, subcategory_id: 20, is_active: true }];

  const result = checkProductDuplicate({
    products,
    productId: null,
    itemName: 'Surf Excel 500g',
    barcode: ' 8901 ',
    brandId: 5,
    categoryId: 11,
    subCategoryId: 20
  });

  assert.equal(result.isDuplicate, true);
  assert.equal(result.field, 'barcode');
});

test('allows editing same product without duplicate detection', () => {
  const products = [{ id: 123, name: 'Surf Excel 80g', barcode: '8901', brand_id: 5, category_id: 11, subcategory_id: 20, is_active: true }];

  const result = checkProductDuplicate({
    products,
    productId: 123,
    itemName: 'Surf Excel 80g',
    barcode: '8901',
    brandId: 5,
    categoryId: 11,
    subCategoryId: 20
  });

  assert.equal(result.isDuplicate, false);
});

test('blocks item name when editing to another existing product item name', () => {
  const products = [
    { id: 123, name: 'Surf Excel 80g', barcode: '8901', brand_id: 5, category_id: 11, subcategory_id: 20, is_active: true },
    { id: 456, name: 'Surf Excel 500g', barcode: '8902', brand_id: 5, category_id: 11, subcategory_id: 20, is_active: true }
  ];

  const result = checkProductDuplicate({
    products,
    productId: 123,
    itemName: 'surf excel 500g',
    barcode: '8903',
    brandId: 5,
    categoryId: 11,
    subCategoryId: 20
  });

  assert.equal(result.isDuplicate, true);
  assert.equal(result.field, 'itemName');
});

test('allows multiple products with blank barcode', () => {
  const products = [
    { id: 1, name: 'Surf Excel 80g', barcode: '', brand_id: 5, category_id: 11, subcategory_id: 20, is_active: true },
    { id: 2, name: 'Surf Excel 500g', barcode: null, brand_id: 5, category_id: 11, subcategory_id: 20, is_active: true }
  ];

  const result = checkProductDuplicate({
    products,
    productId: null,
    itemName: 'Surf Excel 1kg',
    barcode: '',
    brandId: 5,
    categoryId: 11,
    subCategoryId: 20
  });

  assert.equal(result.isDuplicate, false);
});

test('validates missing main category', () => {
  const result = validateProductReferenceData({
    categories: [],
    subcategories: [],
    brands: [{ id: 1, name: 'Surf Excel' }],
    brandId: 1,
    categoryId: 99,
    subCategoryId: 20
  });

  assert.equal(result.isValid, false);
  assert.equal(result.field, 'mainCategory');
});

test('validates missing sub category', () => {
  const result = validateProductReferenceData({
    categories: [{ id: 11, name: 'Cleaning Essential' }],
    subcategories: [],
    brands: [{ id: 1, name: 'Surf Excel' }],
    brandId: 1,
    categoryId: 11,
    subCategoryId: 999
  });

  assert.equal(result.isValid, false);
  assert.equal(result.field, 'subCategory');
});

test('validates sub category belongs to selected main category', () => {
  const result = validateProductReferenceData({
    categories: [{ id: 11, name: 'Cleaning Essential' }],
    subcategories: [{ id: 20, category_id: 12, name: 'Detergent Powder' }],
    brands: [{ id: 1, name: 'Surf Excel' }],
    brandId: 1,
    categoryId: 11,
    subCategoryId: 20
  });

  assert.equal(result.isValid, false);
  assert.equal(result.field, 'subCategory');
});
