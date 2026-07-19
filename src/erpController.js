import { toast } from 'sonner';
import { dbSync } from './dbSync';
import { DB_SCHEMA, TABLE_COLUMN_MAPPINGS } from './dbSchema';

/**
 * Generic Export to Excel function
 * @param {Array} data - Array of objects to export
 * @param {string} fileName - Name of the Excel file (without .xlsx)
 * @param {string} sheetName - Name of the sheet (default: 'Sheet1')
 */
export const exportToExcel = async (data, fileName, sheetName = 'Sheet1') => {
  if (!data || data.length === 0) {
    alert("No data to export!");
    return;
  }
  
  // Dynamic import of XLSX library
  const XLSX = await import('xlsx');
  
  // Convert data to worksheet
  const worksheet = XLSX.utils.json_to_sheet(data);
  
  // Create workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  
  // Download file
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

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
  GENERATE_BILL: 'GENERATE_BILL',
  GENERATE_GST_INVOICE: 'GENERATE_GST_INVOICE'
};

/**
 * Main Controller Function
 * @param {string} moduleName - The module table name or bucket name
 * @param {string} actionType - The action constant from ACTION_TYPES
 * @param {object|array} payload - Data for the operation
 */
export const handleERPAction = async (moduleName, actionType, payload) => {
  // --- Smart Logic Audit ---
  if (import.meta.env.DEV) {
    console.log(`[ERP Dispatch] ${actionType} -> ${moduleName}`, payload);
  }

  // Guard: Prevention of duplicate submissions
  if (window._isERPProcessing) {
    console.warn("Action ignored: ERP is already processing a request");
    return { success: false, error: "System Busy" };
  }

  window._isERPProcessing = true;
  
  try {
    let data = null;
    let toastId = null;

    // Show loading for heavy operations
    if (['INSERT', 'UPDATE', 'DELETE', 'UPSERT'].includes(actionType)) {
      toastId = toast.loading(`Syncing ${moduleName}...`);
    }

    switch (actionType) {
      case ACTION_TYPES.FETCH:
        data = await dbSync.fetch(moduleName, payload);
        break;

      case ACTION_TYPES.INSERT:
        // Bariki: Automatic Timestamping (ID is handled by DB auto-increment)
        const insertPayload = Array.isArray(payload) ? payload : [payload];
        const sanitizedInsert = insertPayload.map(item => ({
          ...item,
          created_at: item.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));
        data = await dbSync.insert(moduleName, sanitizedInsert);
        break;

      case ACTION_TYPES.UPDATE:
        if (!payload.id) throw new Error("Update requires an ID");
        const { id, ...updateData } = payload;
        // Bariki: Protect critical system fields
        delete updateData.created_at;
        updateData.updated_at = new Date().toISOString();
        data = await dbSync.update(moduleName, id, updateData);
        break;

      case ACTION_TYPES.DELETE:
        if (!payload.id) throw new Error("Delete requires an ID");
        // Bariki: Hard delete only for non-inventory tables
        const hardDeleteTables = ['app_config', 'system_logs', 'notifications', 'cart', 'wishlist'];
        const isHard = hardDeleteTables.includes(moduleName);
        data = await dbSync.delete(moduleName, payload.id, isHard);
        break;

      case ACTION_TYPES.BULK_UPSERT:
        // Bariki: Split huge datasets automatically in Controller
        data = await dbSync.upsert(moduleName, payload);
        break;

      case ACTION_TYPES.ATOMIC_ORDER:
        data = await dbSync.executeAtomic('place_order_atomic', payload, DB_SCHEMA.ORDERS.table, 'ATOMIC_PLACE_ORDER');
        break;

      case ACTION_TYPES.MAINTENANCE_EXPORT:
        data = await dbSync.maintenance.exportTableToExcel(moduleName, payload.fileName);
        break;

      case ACTION_TYPES.CLEAR_CACHE:
        dbSync.maintenance.clearSystemCache();
        break;

      default:
        throw new Error(`Invalid Action: ${actionType}`);
    }

    if (toastId) toast.success(`${actionType} Successful`, { id: toastId });
    return { success: true, data };

  } catch (error) {
    console.error(`[Controller Logic Failure]`, error);
    toast.error(`Error: ${error.message}`);
    return { success: false, error: error.message };
  } finally {
    window._isERPProcessing = false;
  }
};

/**
 * Parse Excel or CSV file properly using XLSX library
 * Handles both .xlsx and .csv files
 * @param {File} file - The uploaded file
 * @param {object} columnMapping - Maps display labels to database columns
 * @returns {Array} - Parsed data
 */
export const parseERPCSV = async (file, columnMapping, uniqueField = null) => {
  // Dynamic import of XLSX library
  const XLSX = await import('xlsx');
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Get first sheet
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        
        // Convert sheet to JSON
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: "" });
        
        // Clean up empty rows at the end and filter out rows that are entirely empty
        const cleanRows = jsonData.filter(row => row && row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== ""));

        if (cleanRows.length === 0) {
          reject(new Error("File is empty or contains no valid data rows"));
          return;
        }
        
        // Get headers from first row
        const headers = cleanRows[0].map(h => String(h || "").trim());
        if (import.meta.env.DEV) {
          console.log("Excel file headers found:", headers);
          console.log("Expected column mapping keys:", Object.keys(columnMapping));
        }
        
        // Create case-insensitive header map
        const headerMap = {};
        headers.forEach((header, index) => {
          if (header) headerMap[header.toLowerCase()] = index;
        });
        
        // Create case-insensitive column mapping lookup
        const normalizedColumnMapping = {};
        Object.keys(columnMapping).forEach(key => {
          normalizedColumnMapping[key.toLowerCase()] = columnMapping[key];
        });
        
        // Find which of our expected headers are present
        const matchedHeaders = Object.keys(normalizedColumnMapping).filter(key => headerMap[key] !== undefined);
        if (import.meta.env.DEV) {
          console.log("Matched headers:", matchedHeaders);
        }
        
        // Parse data rows (starting from row index 1)
        const parsedData = cleanRows.slice(1).map(row => {
          const record = {};
          let hasAnyValue = false;
          
          Object.keys(normalizedColumnMapping).forEach((headerKey) => {
            const dbColumn = normalizedColumnMapping[headerKey];
            const colIndex = headerMap[headerKey];
            
            if (colIndex !== undefined) {
              const value = row[colIndex];
              let cleanValue = (value === undefined || value === null) ? '' : String(value).trim();
              
              if (cleanValue !== '') {
                hasAnyValue = true;
                if (!isNaN(Number(cleanValue)) && cleanValue !== '') {
                  record[dbColumn] = Number(cleanValue);
                } else {
                  record[dbColumn] = cleanValue;
                }
              } else {
                record[dbColumn] = null; // Important for numeric fields in DB
              }
            }
          });
          
          return hasAnyValue ? record : null;
        }).filter(record => record !== null);

        if (parsedData.length === 0) {
          const expectedHeaders = Object.keys(columnMapping).join(", ");
          const foundHeaders = headers.join(", ");
          reject(new Error(`No data found matching the required headers.\n\nExpected headers (any of): ${expectedHeaders}\n\nFound headers: ${foundHeaders}\n\nPlease check your Excel column names.`));
          return;
        }
        
        // Remove duplicates based on unique field if specified
        let uniqueData = parsedData;
        if (uniqueField) {
          uniqueData = [];
          const seenValues = new Set();
          
          // Iterate in reverse to keep last occurrence of each unique value
          for (let i = parsedData.length - 1; i >= 0; i--) {
            const item = parsedData[i];
            const fieldValue = item[uniqueField] ? String(item[uniqueField]).trim() : null;
            
            if (fieldValue && !seenValues.has(fieldValue)) {
              seenValues.add(fieldValue);
              uniqueData.unshift(item);
            } else if (!fieldValue) {
              // If no unique field value, add it (but we'll let DB handle)
              uniqueData.unshift(item);
            }
          }
        }
        
        if (import.meta.env.DEV) {
          console.log("Parsed unique data:", uniqueData);
        }
        resolve(uniqueData);
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
 * Generic function to upload Excel/CSV data for any table
 * @param {File} file - The Excel/CSV file
 * @param {string} tableKey - The table key from DB_SCHEMA (e.g., 'PRODUCTS', 'CATEGORIES')
 * @param {function} setLoading - Loading state setter
 * @param {function} onSuccess - Success callback (receives processed data and message)
 * @param {function} onError - Error callback
 * @param {string} uniqueField - Optional unique field for deduplication
 * @param {function} processData - Optional custom function to process parsed data before upload
 */
export const uploadExcelForTable = async (
  file, 
  tableKey, 
  setLoading = null, 
  onSuccess = null, 
  onError = null, 
  uniqueField = null,
  processData = null
) => {
  if (!file) {
    if (onError) onError(new Error("No file selected"));
    return;
  }
  
  try {
    if (setLoading) setLoading(true);
    
    // Get table info from DB_SCHEMA
    const tableInfo = DB_SCHEMA[tableKey];
    if (!tableInfo) {
      throw new Error(`Invalid table: ${tableKey}`);
    }
    
    // Get column mappings for this table
    const columnMapping = TABLE_COLUMN_MAPPINGS[tableKey] || {};
    
    // Parse the Excel file
    const parsedData = await parseERPCSV(file, columnMapping, uniqueField);
    if (!parsedData || parsedData.length === 0) {
      throw new Error("No data found in file");
    }
    
    if (import.meta.env.DEV) {
      console.log(`Uploading ${parsedData.length} records to ${tableInfo.table}`);
      console.log("Parsed data sample:", parsedData[0]);
    }
    
    // Process data with custom function if provided
    let processedData = parsedData;
    if (processData) {
      processedData = await processData(parsedData);
    }
    
    // Upload to database
    await dbSync.insert(tableInfo.table, processedData);
    
    const successMessage = `SUCCESS! ${processedData.length} records imported to ${tableKey}`;
    if (import.meta.env.DEV) console.log(successMessage);
    if (onSuccess) onSuccess(processedData, successMessage);
    alert(successMessage);
    
  } catch (error) {
    console.error(`[${tableKey} Upload Error]`, error);
    if (onError) onError(error);
    alert(`Upload Failed: ${error.message}`);
  } finally {
    if (setLoading) setLoading(false);
  }
};

/**
 * Download a sample Excel template for any table
 * @param {string} tableKey - The table key from DB_SCHEMA
 */
export const downloadExcelTemplate = async (tableKey) => {
  try {
    // Dynamic import of XLSX library
    const XLSX = await import('xlsx');
    
    // Get column mappings for this table
    const columnMapping = TABLE_COLUMN_MAPPINGS[tableKey];
    if (!columnMapping) {
      throw new Error(`No column mapping found for table: ${tableKey}`);
    }
    
    // Create sample data row
    const headers = Object.keys(columnMapping);
    const sampleRow = {};
    headers.forEach(header => {
      const dbColumn = columnMapping[header];
      // Add sample values based on column name
      if (dbColumn.includes('name') || dbColumn.includes('title')) {
        sampleRow[header] = 'Sample ' + dbColumn;
      } else if (dbColumn.includes('id')) {
        sampleRow[header] = ''; // Leave empty for auto-generated IDs
      } else if (dbColumn.includes('price') || dbColumn.includes('rate') || dbColumn.includes('amount') || dbColumn.includes('total') || dbColumn.includes('discount') || dbColumn.includes('gst') || dbColumn.includes('cess') || dbColumn.includes('stock') || dbColumn.includes('quantity')) {
        sampleRow[header] = 100;
      } else if (dbColumn.includes('is_') || dbColumn.includes('active')) {
        sampleRow[header] = 'Yes';
      } else if (dbColumn.includes('date')) {
        sampleRow[header] = new Date().toISOString().split('T')[0];
      } else {
        sampleRow[header] = 'Sample ' + dbColumn;
      }
    });
    
    // Create worksheet and workbook
    const worksheet = XLSX.utils.json_to_sheet([sampleRow]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `${tableKey} Template`);
    
    // Download file
    XLSX.writeFile(workbook, `${tableKey}_Template.xlsx`);
    
  } catch (error) {
    console.error("[Template Download Error]", error);
    alert(`Failed to download template: ${error.message}`);
  }
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
