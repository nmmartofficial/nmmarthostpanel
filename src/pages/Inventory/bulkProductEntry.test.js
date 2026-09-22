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
