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
  assert.match(bulkCode, /Product Name/);
  assert.match(bulkCode, /handleItemFieldChange\(item\.id,\s*'itname',\s*e\.target\.value\)/);
});

test('Current Stock and Purchase Rate fields are editable numeric inputs', () => {
  const bulkCode = read('src/pages/Inventory/BulkProductEntry.jsx');
  assert.match(bulkCode, /Current Stock/);
  assert.match(bulkCode, /handleItemFieldChange\(item\.id,\s*'stock',\s*e\.target\.value\)/);
  assert.match(bulkCode, /handleItemFieldChange\(item\.id,\s*'purchase_rate',\s*e\.target\.value\)/);
});

test('Subcategory dropdown options load using normalized category ID resolution', () => {
  const bulkCode = read('src/pages/Inventory/BulkProductEntry.jsx');
  assert.match(bulkCode, /resolveCatId/);
  assert.match(bulkCode, /No Subcategories Available/);
  assert.match(bulkCode, /const bulkSubcategories = useMemo/);
  assert.match(bulkCode, /const rowSubcategories = bulkSubcategories/);
});

test('Subcategory dropdown keeps the complete master list available', () => {
  const bulkCode = read('src/pages/Inventory/BulkProductEntry.jsx');
  assert.match(bulkCode, /const rowSubcategories\s*=\s*bulkSubcategories/);
});

test('Case 1: Changing ONLY Product Name preserves brand, category, subcategory, and image', () => {
  const bulkCode = read('src/pages/Inventory/BulkProductEntry.jsx');
  assert.match(bulkCode, /resolveBrandId/);
  assert.match(bulkCode, /resolveCatId/);
  assert.match(bulkCode, /bulkSubcategories/);
  assert.match(bulkCode, /finalImageUrl/);
});

test('Case 2: Changing ONLY Purchase Rate preserves brand, category, subcategory, and image', () => {
  const bulkCode = read('src/pages/Inventory/BulkProductEntry.jsx');
  assert.match(bulkCode, /purcrate:\s*parseFloat\(item\.purchase_rate\)\s*\|\|\s*0/);
});

test('Case 3: Category and subcategory fields remain independently editable', () => {
  const bulkCode = read('src/pages/Inventory/BulkProductEntry.jsx');
  assert.match(bulkCode, /'category_id'/);
  assert.match(bulkCode, /'subcategory_id'/);
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
  assert.match(bulkCode, /productBarcodeMap/);
  assert.match(bulkCode, /Invalid Barcode Filename/);
  assert.match(bulkCode, /Duplicate Barcode/);
  assert.match(bulkCode, /bulk_image_status/);
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
  assert.match(bulkCode, /ACTION_TYPES\.UPDATE/);
  assert.match(bulkCode, /failedList\.push/);
});

test('ProductsView includes BULK ENTRY button and renders BulkProductEntry', () => {
  const productsViewCode = read('src/pages/Inventory/ProductsView.jsx');
  assert.match(productsViewCode, /BulkProductEntry/);
  assert.match(productsViewCode, /isBulkMode/);
  assert.match(productsViewCode, /BULK ENTRY/);
});

test('Product Excel merge classifies NEW, UPDATE, INVALID and DUPLICATE rows before apply', () => {
  const bulkCode = read('src/pages/Inventory/BulkProductEntry.jsx');
  assert.match(bulkCode, /MERGE_EXCEL_COLUMN_MAPPING/);
  assert.match(bulkCode, /productBarcodeMap\.get\(barcode\)/);
  assert.match(bulkCode, /status: existing \? 'UPDATE' : 'NEW'/);
  assert.match(bulkCode, /status: 'DUPLICATE'/);
  assert.match(bulkCode, /status: 'INVALID'/);
  assert.match(bulkCode, /handleERPAction\(/);
  assert.match(bulkCode, /ACTION_TYPES\.INSERT/);
});

test('Product Excel merge does not send blank cells as destructive updates', () => {
  const bulkCode = read('src/pages/Inventory/BulkProductEntry.jsx');
  assert.match(bulkCode, /value === undefined \|\| value === null/);
  assert.match(bulkCode, /if \(!hasDataField\)/);
  assert.match(bulkCode, /Confirm Merge/);
});
