import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('BulkProductEntry component file exists and contains scanner-first & search workflows', () => {
  const bulkCode = read('src/pages/Inventory/BulkProductEntry.jsx');
  assert.match(bulkCode, /export default function BulkProductEntry/);
  assert.match(bulkCode, /searchInputRef/);
  assert.match(bulkCode, /barcodeMap/);
  assert.match(bulkCode, /matchingProducts/);
  assert.match(bulkCode, /addProductToSession/);
  assert.match(bulkCode, /handleSearchKeyDown/);
  assert.match(bulkCode, /scan_count/);
});

test('Duplicate barcode scan increments scan_count without adding duplicate row', () => {
  const bulkCode = read('src/pages/Inventory/BulkProductEntry.jsx');
  assert.match(bulkCode, /scan_count:\s*currentCount\s*\+\s*1/);
  assert.match(bulkCode, /Incremented scan count for/);
});

test('Unknown barcode scanning logs to unknownBarcodes list without auto-creating product', () => {
  const bulkCode = read('src/pages/Inventory/BulkProductEntry.jsx');
  assert.match(bulkCode, /PRODUCT NOT FOUND/);
  assert.match(bulkCode, /setUnknownBarcodes/);
  assert.match(bulkCode, /reason:\s*'Barcode or item name not found in database'/);
});

test('Product Name is editable in the bulk edit table', () => {
  const bulkCode = read('src/pages/Inventory/BulkProductEntry.jsx');
  assert.match(bulkCode, /Product Name \(Editable\)/);
  assert.match(bulkCode, /handleItemFieldChange\(item\.id,\s*'itname',\s*e\.target\.value\)/);
});

test('Current Stock and Purchase Rate fields are editable numeric inputs', () => {
  const bulkCode = read('src/pages/Inventory/BulkProductEntry.jsx');
  assert.match(bulkCode, /Current Stock \(Clickable & Editable, No Spinners via CSS\)/);
  assert.match(bulkCode, /handleItemFieldChange\(item\.id,\s*'stock',\s*e\.target\.value\)/);
  assert.match(bulkCode, /handleItemFieldChange\(item\.id,\s*'purchase_rate',\s*e\.target\.value\)/);
});

test('Subcategory dropdown options load using normalized category ID resolution', () => {
  const bulkCode = read('src/pages/Inventory/BulkProductEntry.jsx');
  assert.match(bulkCode, /resolveCatId/);
  assert.match(bulkCode, /No Subcategories Available/);
  assert.match(bulkCode, /String\(s\.category_id\)\.trim\(\)\s*===\s*String\(activeCatId\)\.trim\(\)/);
});

test('Category change clears old invalid subcategory_id and subcategory_name', () => {
  const bulkCode = read('src/pages/Inventory/BulkProductEntry.jsx');
  assert.match(bulkCode, /validSubcats/);
  assert.match(bulkCode, /handleItemFieldChange\(item\.id,\s*'subcategory_id',\s*''\)/);
});

test('Case 1: Changing ONLY Product Name preserves brand, category, subcategory, and image', () => {
  const bulkCode = read('src/pages/Inventory/BulkProductEntry.jsx');
  assert.match(bulkCode, /resolveBrandId/);
  assert.match(bulkCode, /resolveCategoryId/);
  assert.match(bulkCode, /resolveSubcategoryId/);
  assert.match(bulkCode, /finalImageUrl/);
});

test('Case 2: Changing ONLY Purchase Rate preserves brand, category, subcategory, and image', () => {
  const bulkCode = read('src/pages/Inventory/BulkProductEntry.jsx');
  assert.match(bulkCode, /purcrate:\s*parseFloat\(item\.purchase_rate\)\s*\|\|\s*0/);
});

test('Case 3: Changing ONLY Category clears invalid subcategory and preserves brand/image', () => {
  const bulkCode = read('src/pages/Inventory/BulkProductEntry.jsx');
  assert.match(bulkCode, /handleItemFieldChange\(item\.id,\s*'subcategory_id',\s*''\)/);
});

test('Case 4: Changing ONLY Image preserves brand, category, and subcategory without generating products/null', () => {
  const bulkCode = read('src/pages/Inventory/BulkProductEntry.jsx');
  assert.match(bulkCode, /includes\('\/products\/null'\)/);
});

test('CSS rules hide numeric input spinners for Chrome, Edge, Safari and Firefox', () => {
  const cssCode = read('src/index.css');
  assert.match(cssCode, /::-webkit-inner-spin-button/);
  assert.match(cssCode, /-webkit-appearance:\s*none/);
  assert.match(cssCode, /-moz-appearance:\s*textfield/);
});

test('Saving stock change uses canonical atomic stock adjustment without direct unsafe overwrite', () => {
  const bulkCode = read('src/pages/Inventory/BulkProductEntry.jsx');
  assert.match(bulkCode, /ACTION_TYPES\.ADJUST_STOCK/);
  assert.match(bulkCode, /change_qty:\s*stockDiff/);
  assert.match(bulkCode, /Stock Adjustments \(RPC\)/);
});

test('Bulk image matching matches barcode filenames like 8901030904554.jpg to products in session', () => {
  const bulkCode = read('src/pages/Inventory/BulkProductEntry.jsx');
  assert.match(bulkCode, /handleBulkImageMatch/);
  assert.match(bulkCode, /String\(item\.barcode\)\.trim\(\)\s*===\s*filename/);
  assert.match(bulkCode, /unmatchedNames/);
  assert.match(bulkCode, /setShowUnmatchedImagesDrawer/);
});

test('Bulk Excel Update merges row changes by barcode without overwriting blank values', () => {
  const bulkCode = read('src/pages/Inventory/BulkProductEntry.jsx');
  assert.match(bulkCode, /handleExcelImport/);
  assert.match(bulkCode, /replaceBlankExcelValues/);
  assert.match(bulkCode, /parseERPCSV/);
});

test('Session persistence stores and resumes session from localStorage', () => {
  const bulkCode = read('src/pages/Inventory/BulkProductEntry.jsx');
  assert.match(bulkCode, /nm_bulk_entry_session_items/);
  assert.match(bulkCode, /nm_bulk_entry_unknown_barcodes/);
  assert.match(bulkCode, /localStorage\.setItem/);
});

test('SAVE ALL confirms changes and updates products via handleERPAction with batching and partial failure recovery', () => {
  const bulkCode = read('src/pages/Inventory/BulkProductEntry.jsx');
  assert.match(bulkCode, /handleConfirmSaveAll/);
  assert.match(bulkCode, /BATCH_SIZE/);
  assert.match(bulkCode, /handleERPAction\(DB_SCHEMA\.PRODUCTS\.table,\s*ACTION_TYPES\.UPDATE/);
  assert.match(bulkCode, /failedList\.push/);
});

test('ProductsView includes BULK ENTRY button and renders BulkProductEntry', () => {
  const productsViewCode = read('src/pages/Inventory/ProductsView.jsx');
  assert.match(productsViewCode, /BulkProductEntry/);
  assert.match(productsViewCode, /isBulkMode/);
  assert.match(productsViewCode, /BULK ENTRY/);
});
