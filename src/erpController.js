import { dbSync } from './dbSync';
import { DB_SCHEMA } from './dbSchema';
import * as XLSX from 'xlsx';

/**
 * NM MART ERP - Modular Action Controller
 * Handles all 54+ button actions using a unified switch-case logic.
 * Integrated with dbSync for Audit Logging and Database-First synchronization.
 */

export const ERP_MODULES = {
  ITEM_MASTER: DB_SCHEMA.PRODUCTS.table,
  CATEGORY_MASTER: DB_SCHEMA.CATEGORIES.table,
  SUBCAT_MASTER: DB_SCHEMA.SUBCATEGORIES.table,
  BRAND_MASTER: DB_SCHEMA.BRANDS.table,
  ORDER_MASTER: DB_SCHEMA.ORDERS.table,
  ORDER_ITEMS: DB_SCHEMA.ORDER_ITEMS.table,
  BANNER_MASTER: DB_SCHEMA.BANNERS.table,
  COUPON_MASTER: DB_SCHEMA.COUPONS.table,
  OFFER_MASTER: DB_SCHEMA.OFFERS.table,
  PINCODE_MASTER: DB_SCHEMA.PINCODES.table,
  WALLET_MASTER: DB_SCHEMA.WALLET_MASTER.table,
  WALLET_TX: DB_SCHEMA.WALLET_TRANSACTIONS.table,
  ADDRESS_MASTER: DB_SCHEMA.ADDRESSES.table,
  HOME_CONFIG: DB_SCHEMA.HOME_CONFIG.table,
  APP_CONFIG: DB_SCHEMA.APP_CONFIG.table,
  CART_MASTER: DB_SCHEMA.CART.table,
  WISHLIST_MASTER: DB_SCHEMA.WISHLIST.table
};

export const ACTION_TYPES = {
  INSERT: 'INSERT',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  BULK_UPSERT: 'UPSERT',
  FETCH: 'FETCH',
  ATOMIC_ORDER: 'ATOMIC_ORDER',
  UPLOAD_IMAGE: 'UPLOAD_IMAGE',
  WALLET_ADJUST: 'WALLET_ADJUST',
  MAINTENANCE_EXPORT: 'MAINTENANCE_EXPORT',
  CLEAR_CACHE: 'CLEAR_CACHE',
  GENERATE_BILL: 'GENERATE_BILL'
};

/**
 * Main Controller Function
 * @param {string} moduleName - The module table name or bucket name
 * @param {string} actionType - The action constant from ACTION_TYPES
 * @param {object|array} payload - Data for the operation
 */
export const handleERPAction = async (moduleName, actionType, payload) => {
  console.log(`[ERP Action] ${actionType} on ${moduleName}`, payload);
  
  try {
    let data = null;

    switch (actionType) {
      case ACTION_TYPES.FETCH:
        data = await dbSync.fetch(moduleName, payload);
        break;

      case ACTION_TYPES.INSERT:
        data = await dbSync.insert(moduleName, payload);
        break;

      case ACTION_TYPES.UPDATE:
        if (!payload.id) throw new Error("Update requires an ID");
        const { id, ...updateData } = payload;
        data = await dbSync.update(moduleName, id, updateData);
        break;

      case ACTION_TYPES.DELETE:
        if (!payload.id) throw new Error("Delete requires an ID");
        data = await dbSync.delete(moduleName, payload.id);
        break;

      case ACTION_TYPES.BULK_UPSERT:
        data = await dbSync.upsert(moduleName, payload);
        break;

      case ACTION_TYPES.ATOMIC_ORDER:
        data = await dbSync.executeAtomic(
          'place_order_atomic', 
          payload, 
          DB_SCHEMA.ORDERS.table, 
          'ATOMIC_PLACE_ORDER'
        );
        break;

      case ACTION_TYPES.UPLOAD_IMAGE:
        data = await dbSync.uploadFile(moduleName, payload);
        break;

      case ACTION_TYPES.WALLET_ADJUST:
        data = await dbSync.adjustWalletBalance(
          payload.userId,
          payload.amount,
          payload.type,
          payload.reason
        );
        break;

      case ACTION_TYPES.MAINTENANCE_EXPORT:
        data = await dbSync.maintenance.exportTableToExcel(moduleName, payload.fileName);
        break;

      case ACTION_TYPES.CLEAR_CACHE:
        dbSync.maintenance.clearSystemCache();
        break;

      case ACTION_TYPES.GENERATE_BILL:
        data = dbSync.printer.generateBillCommands(payload.order, payload.items);
        break;

      default:
        throw new Error(`Unsupported action type: ${actionType}`);
    }

    return { success: true, data };

  } catch (error) {
    console.error(`[ERP Controller Error]`, error);
    return { success: false, error: error.message };
  }
};

/**
 * Parse Excel or CSV file properly using XLSX library
 * Handles both .xlsx and .csv files
 * @param {File} file - The uploaded file
 * @param {object} columnMapping - Maps display labels to database columns
 * @returns {Array} - Parsed data
 */
export const parseERPCSV = async (file, columnMapping) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Get first sheet
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        
        // Convert sheet to JSON
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
        
        if (jsonData.length === 0) {
          reject(new Error("File is empty"));
          return;
        }
        
        // Get headers from first row
        const headers = jsonData[0].map(h => String(h).trim());
        console.log("Excel file headers found:", headers); // Show headers in browser console
        
        // Create case-insensitive header map
        const headerMap = {};
        headers.forEach((header, index) => {
          headerMap[header.toLowerCase()] = index;
        });
        
        // Create case-insensitive column mapping lookup
        const normalizedColumnMapping = {};
        Object.keys(columnMapping).forEach(key => {
          normalizedColumnMapping[key.toLowerCase()] = columnMapping[key];
        });
        
        // Parse data rows
        const parsedData = jsonData.slice(1).filter(row => row.some(cell => cell)).map(row => {
          const record = {};
          
          headers.forEach((header) => {
            const index = headerMap[header.toLowerCase()];
            const value = row[index];
            const dbColumn = normalizedColumnMapping[header.toLowerCase()];
            
            // Only add to record if we have a valid mapped column
            if (dbColumn) {
              // Clean the value
              let cleanValue = value === undefined || value === null ? '' : String(value).trim();
              
              // Try to parse numbers
              if (cleanValue !== '' && !isNaN(Number(cleanValue))) {
                record[dbColumn] = Number(cleanValue);
              } else {
                // IMPORTANT: If value is empty, use null instead of empty string
                // This prevents "invalid input syntax for type numeric: """ error in Supabase
                record[dbColumn] = cleanValue === '' ? null : cleanValue;
              }
            }
          });
          
          return record;
        }).filter(row => Object.keys(row).length > 0);
        
        // Remove duplicates based on barcode - keep the last occurrence
        const uniqueProducts = [];
        const seenBarcodes = new Set();
        
        // Iterate in reverse to keep last occurrence of each barcode
        for (let i = parsedData.length - 1; i >= 0; i--) {
          const item = parsedData[i];
          const barcode = item.barcode ? String(item.barcode).trim() : null;
          
          if (barcode && !seenBarcodes.has(barcode)) {
            seenBarcodes.add(barcode);
            uniqueProducts.unshift(item);
          } else if (!barcode) {
            // If no barcode, add it (but we'll let DB handle)
            uniqueProducts.unshift(item);
          }
        }
        
        console.log("Parsed unique product data:", uniqueProducts); // Show parsed data in console
        resolve(uniqueProducts);
      } catch (error) {
        console.error("[Parse Error]", error);
        reject(new Error("Failed to parse file. Please use a valid Excel or CSV file."));
      }
    };
    
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Example Usage for 54+ Buttons:
 * 
 * 1. Add Item Button:
 * handleERPAction(ERP_MODULES.ITEM_MASTER, ACTION_TYPES.INSERT, { name: 'New Item', price: 100 })
 * 
 * 2. Bulk Product Upload:
 * const data = parseERPCSV(csvContent, { 'Product Name': 'name', 'MRP': 'mrp' });
 * handleERPAction(ERP_MODULES.ITEM_MASTER, ACTION_TYPES.BULK_UPSERT, data);
 * 
 * 3. Update Order Status:
 * handleERPAction(ERP_MODULES.ORDER_MASTER, ACTION_TYPES.UPDATE, { id: 123, status: 'Shipped' })
 */
