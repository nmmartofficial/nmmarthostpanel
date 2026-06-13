import { supabase } from './supabase';
import { DB_SCHEMA } from './dbSchema';
import * as XLSX from 'xlsx';
import { secureStorage } from './utils/security';

/**
 * NM MART - Table Synchronization Module
 * Unified CRUD logic for all 18 tables with Audit Logging.
 */

/**
 * HELPER: Compress Image using Canvas
 * "Image Optimization: Badi photos ko upload karne se pehle compress kar de."
 */
const compressImage = async (file, maxWidth = 1200, quality = 0.7) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (maxWidth / width) * height;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          const compressedFile = new File([blob], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          resolve(compressedFile);
        }, 'image/jpeg', quality);
      };
    };
  });
};

/**
 * HELPER: Check Low Stock and Create Notification
 * "Agar stock Buffer Limit (e.g., 5 units) se niche gaya, toh use notifications table mein push kar dein."
 */
const checkLowStockAndNotify = async (productId, bufferLimit = 5) => {
  try {
    const { data: product, error } = await supabase
      .from(DB_SCHEMA.PRODUCTS.table)
      .select('name, stock') // Updated from stock_qty to stock
      .eq('id', productId)
      .single();

    if (error) throw error;

    if (product.stock <= bufferLimit) {
      const message = `Low Stock Alert: ${product.name} has only ${product.stock} units left!`;
      
      if (DB_SCHEMA.NOTIFICATIONS) {
        await supabase.from(DB_SCHEMA.NOTIFICATIONS.table).insert([{
          title: 'Inventory Alert',
          message: message,
          type: 'low_stock',
          reference_id: productId,
          created_at: new Date().toISOString()
        }]);
      }

      console.warn(`[Inventory Alert] ${message}`);
    }
  } catch (err) {
    console.error("Low Stock Alert System Failed", err);
  }
};

/**
 * Audit Logger Helper
 * Records structured audit trail into system_logs table.
 */
const logTableAction = async (tableName, action, { oldData = null, newData = null, metadata = {} } = {}) => {
  const timestamp = new Date().toISOString();
  let user = { username: 'system', role: 'system' };
  try {
    const userData = secureStorage.getItem('nm_user_data');
    if (userData) {
      user = userData;
    }
  } catch (e) {
    console.warn('Failed to get nm_user_data from secureStorage, using system user');
  }
  
  try {
    if (DB_SCHEMA.SYSTEM_LOGS) {
      await supabase.from(DB_SCHEMA.SYSTEM_LOGS.table).insert([{
        table_name: tableName,
        action_type: action,
        username: user.username,
        user_role: user.role,
        old_data: oldData ? JSON.stringify(oldData) : null,
        new_data: newData ? JSON.stringify(newData) : null,
        metadata: Object.keys(metadata).length > 0 ? JSON.stringify(metadata) : null,
        created_at: timestamp
      }]);
    }
    console.log(`[Audit Log] [${user.username}] ${action} on ${tableName} at ${timestamp}`, { oldData, newData, metadata });
  } catch (err) {
    console.error("Audit Log Failed", err);
  }
};

/**
 * HELPER: Validate Payload before DB Operations
 * "Data Safety: Database mein kachra (dirty data) jane se pehle check karein."
 */
const validatePayload = (tableName, payload) => {
  if (!payload || (typeof payload !== 'object' && !Array.isArray(payload))) {
    throw new Error(`Invalid payload for ${tableName}`);
  }

  // Generic validations
  const records = Array.isArray(payload) ? payload : [payload];
  
  for (const record of records) {
    // 1. Check for negative prices/stock if applicable
    if (record.sale_rate !== undefined && record.sale_rate < 0) throw new Error("Sale rate cannot be negative");
    if (record.mrp !== undefined && record.mrp < 0) throw new Error("MRP cannot be negative");
    if (record.stock !== undefined && record.stock < 0) throw new Error("Stock cannot be negative");
    
    // 2. Prevent empty names for core entities
    if (record.name !== undefined && String(record.name).trim() === "") {
      throw new Error("Name field cannot be empty");
    }
  }
  return true;
};

/**
 * Generic Table Synchronization Controller
 */
export const dbSync = {
  /**
   * CONNECTION CHECK: 
   * Verifies if the table exists and is accessible.
   */
  checkConnection: async (tableName) => {
    try {
      const { error } = await supabase.from(tableName).select('count', { count: 'exact', head: true });
      if (error) {
        if (error.code === 'PGRST116') return false;
        console.warn(`[dbSync] Connection check for ${tableName} failed:`, error.message);
        return false;
      }
      return true;
    } catch (e) {
      return false;
    }
  },

  /**
   * REALTIME SUBSCRIPTION:
   * Enables live updates for a specific table.
   */
  subscribe: (tableName, callback) => {
    return supabase
      .channel(`public:${tableName}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: tableName }, (payload) => {
        callback(payload);
      })
      .subscribe();
  },

  /**
   * ATOMIC OPERATIONS (Constraint Enforcement)
   * Ensures stock reduction logic is followed via Database RPC.
   */
  executeAtomic: async (rpcName, params, tableName, actionLabel) => {
    try {
      const { data, error } = await supabase.rpc(rpcName, params);
      
      if (error) {
        if (error.message.includes('permission denied')) {
          throw new Error("Security Violation: You do not have permission to execute this action.");
        }
        throw error;
      }
      
      await logTableAction(tableName, actionLabel);

      // --- Low Stock Auto-Alert Integration ---
      if (rpcName === 'place_order_atomic' && params.p_order_items) {
        for (const item of params.p_order_items) {
          checkLowStockAndNotify(item.product_id);
        }
      }

      return data;
    } catch (error) {
      console.error(`[Atomic Error] ${rpcName}:`, error.message);
      throw error;
    }
  },

  /**
   * STANDARD CRUD PATTERN (Direct Table Binding)
   */
  
  // Create
  insert: async (tableName, payload) => {
    try {
      validatePayload(tableName, payload);

      const { data, error } = await supabase
        .from(tableName)
        .insert(Array.isArray(payload) ? payload : [payload])
        .select();

      if (error) {
        if (error.code === '42501') throw new Error("Security Error: RLS Policy denied this insert.");
        throw error;
      }

      await logTableAction(tableName, 'INSERT', { newData: data });
      return data;
    } catch (error) {
      console.error(`[Insert Error] ${tableName}:`, error.message);
      throw error;
    }
  },

  // Read
  fetch: async (tableName, query = {}) => {
    try {
      const BATCH_SIZE = 1000;
      let allData = [];
      let from = 0;
      let hasMore = true;
      const limit = query.limit || Infinity;

      console.log(`[dbSync] Fetching ${tableName}...`);

      while (hasMore) {
        if (allData.length >= limit) {
          hasMore = false;
          break;
        }

        let request = supabase.from(tableName).select(query.select || '*');
        
        // Safety: Only filter by 'is_active' if the table is known to have it or we've verified it
        // To avoid "column does not exist" errors, we wrap this in a check or only apply to specific tables
        if (!query.includeDeleted && !['app_config', 'system_logs', 'notifications', 'cart', 'wishlist'].includes(tableName)) {
          request = request.or('is_active.eq.true,is_active.is.null');
        }

        if (query.eq) request = request.eq(query.eq.column, query.eq.value);
        
        if (query.order) {
          request = request.order(query.order.column, { ascending: query.order.ascending ?? true });
        } else {
          request = request.order('created_at', { ascending: false });
        }
        
        const currentBatchLimit = Math.min(BATCH_SIZE, limit - allData.length);
        const to = from + currentBatchLimit - 1;
        
        request = request.range(from, to);

        const { data, error } = await request;
        
        if (error) {
          if (error.code === 'PGRST116' || error.message.includes('cache') || error.message.includes('not found')) {
            console.warn(`[dbSync.fetch] Table not yet available: ${tableName}`);
            return [];
          }
          if (error.code === '42501') throw new Error("Security Error: RLS Policy denied access to this table.");
          
          console.error(`[Supabase Fetch Error] ${tableName}:`, error.message);
          throw error;
        }

        if (!data || data.length === 0) {
          hasMore = false;
          break;
        }

        allData = [...allData, ...data];
        from += data.length;
        
        if (data.length < currentBatchLimit || data.length < BATCH_SIZE) {
          hasMore = false;
        }
      }

      console.log(`[dbSync] ${tableName} fetch complete. Total: ${allData.length}`);
      return allData;
    } catch (error) {
      if (!error.message.includes('cache') && !error.message.includes('not found')) {
        console.error(`[dbSync.fetch Failed] ${tableName}:`, error.message);
      }
      throw error;
    }
  },

  // Update
  update: async (tableName, id, payload) => {
    try {
      validatePayload(tableName, payload);

      // Fetch old data first
      const { data: oldData } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', id)
        .single();

      const { data, error } = await supabase
        .from(tableName)
        .update(payload)
        .eq('id', id)
        .select();

      if (error) {
        if (error.code === '42501') throw new Error("Security Error: RLS Policy denied this update.");
        throw error;
      }

      await logTableAction(tableName, 'UPDATE', { oldData, newData: data });
      return data;
    } catch (error) {
      console.error(`[Update Error] ${tableName}:`, error.message);
      throw error;
    }
  },

  // Delete (Enhanced with Soft Delete Support)
  delete: async (tableName, id, permanent = false) => {
    try {
      let error;
      // Fetch old data first
      const { data: oldData } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', id)
        .single();

      if (permanent || ['app_config', 'system_logs', 'notifications', 'cart', 'wishlist'].includes(tableName)) {
        // Hard Delete for specific tables or if requested
        const res = await supabase.from(tableName).delete().eq('id', id);
        error = res.error;
      } else {
        // Soft Delete (Security Feature: Data is hidden but not lost)
        const res = await supabase.from(tableName).update({ is_active: false }).eq('id', id);
        error = res.error;
      }

      if (error) {
        if (error.code === '42501') throw new Error("Security Error: RLS Policy denied this deletion.");
        throw error;
      }

      await logTableAction(tableName, permanent ? 'HARD_DELETE' : 'SOFT_DELETE', { oldData });
      return true;
    } catch (error) {
      console.error(`[Delete Error] ${tableName}:`, error.message);
      throw error;
    }
  },

  /**
   * STORAGE: Upload Image/File to Supabase Storage
   * @param {string} bucket - Bucket name (e.g., 'banners', 'products')
   * @param {File} file - The file object to upload
   * @returns {string} Public URL of the uploaded file
   */
  uploadFile: async (bucket, file) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      await logTableAction(`STORAGE:${bucket}`, 'UPLOAD');
      return data.publicUrl;
    } catch (error) {
      console.error(`[Upload Error] ${bucket}:`, error.message);
      throw error;
    }
  },

  /**
   * BANNER UPLOAD & SYNC:
   * Uploads banner to storage and syncs metadata to database.
   * "Supabase Storage aur Database ke saath perfectly integrate ho."
   */
  uploadAndSyncBanner: async (file, bannerDetails) => {
    try {
      // 1. Cleanup Old Image if exists
      // "Cleanup Logic: Jab aap kisi purane banner ko UPSERT karke replace karte hain, toh purani image delete ho rahi hai?"
      if (bannerDetails.id) {
        const { data: oldBanner } = await supabase
          .from(DB_SCHEMA.BANNERS.table)
          .select('image_url')
          .eq('id', bannerDetails.id)
          .single();

        if (oldBanner && oldBanner.image_url) {
          const oldPath = oldBanner.image_url.split('/').pop();
          if (oldPath) {
            await supabase.storage.from('banner-images').remove([`banners/${oldPath}`]);
          }
        }
      }

      // 2. Image Optimization (Compression)
      // "Agar aapka Admin panel web par slow chal raha ho... badi photos ko upload karne se pehle compress kar de."
      const optimizedFile = file.type.startsWith('image/') ? await compressImage(file) : file;

      // 3. Upload to Storage (banner-images bucket)
      const fileExt = optimizedFile.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `banners/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('banner-images')
        .upload(filePath, optimizedFile);

      if (uploadError) throw new Error(`Storage Upload Failed: ${uploadError.message}`);

      // 4. Get Public URL
      const { data: urlData } = supabase.storage
        .from('banner-images')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      // 5. Sync to Database (UPSERT)
      const payload = {
        ...bannerDetails,
        image_url: publicUrl,
        updated_at: new Date().toISOString()
      };

      const { data: dbData, error: dbError } = await supabase
        .from(DB_SCHEMA.BANNERS.table)
        .upsert(payload, { onConflict: 'id' })
        .select();

      if (dbError) throw new Error(`Database Sync Failed: ${dbError.message}`);

      // 6. Audit Trail (JSON Payload Logging)
      await logTableAction(DB_SCHEMA.BANNERS.table, 'UPLOAD_AND_SYNC_BANNER');
      
      return { success: true, data: dbData[0], url: publicUrl };
    } catch (error) {
      console.error(`[Banner Sync Error]:`, error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * WALLET MANAGEMENT:
   * Adjusts customer wallet balance and logs the transaction.
   * "Customer credits/debits logic for Returns, Loyalty, and Coupons."
   */
  adjustWalletBalance: async (userId, amount, type, reason) => {
    try {
      // Calling a PostgreSQL function 'adjust_wallet_atomic'
      // This ensures that balance update and transaction log happen together
      const { data, error } = await supabase.rpc('adjust_wallet_atomic', {
        p_user_id: userId,
        p_amount: parseFloat(amount),
        p_type: type, // 'credit' or 'debit'
        p_reason: reason
      });

      if (error) throw error;

      await logTableAction(DB_SCHEMA.WALLET_TRANSACTIONS.table, `WALLET_${type.toUpperCase()}`);
      return { success: true, data };
    } catch (error) {
      console.error(`[Wallet Sync Error]:`, error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * SYSTEM MAINTENANCE:
   * Backup table data to Excel and clear local cache.
   */
  maintenance: {
    exportTableToExcel: async (tableName, fileName = 'NM_MART_Backup') => {
      try {
        const { data, error } = await supabase.from(tableName).select('*');
        if (error) throw error;

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
        XLSX.writeFile(workbook, `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`);
        
        await logTableAction(tableName, 'MAINTENANCE_EXPORT');
        return { success: true };
      } catch (error) {
        console.error("Export Failed", error);
        return { success: false, error: error.message };
      }
    },

    clearSystemCache: () => {
      localStorage.clear();
      window.location.reload();
    }
  },

  /**
   * PRINTER INTEGRATION:
   * Basic Thermal Printer (ESC/POS) Command Generator.
   */
  printer: {
    generateBillCommands: (order, items) => {
      // ESC/POS Command basics
      const ESC = '\x1B';
      const GS = '\x1D';
      const commands = [];

      commands.push(`${ESC}@`); // Initialize
      commands.push(`${ESC}a1`); // Center align
      commands.push(`NM MART\n`);
      commands.push(`Ultra Retail ERP\n`);
      commands.push(`--------------------------------\n`);
      commands.push(`${ESC}a0`); // Left align
      commands.push(`Order ID: ${order.id}\n`);
      commands.push(`Date: ${new Date().toLocaleString()}\n`);
      commands.push(`--------------------------------\n`);
      
      items.forEach(item => {
        commands.push(`${item.name.substring(0, 20).padEnd(20)} x${item.qty} ${item.price}\n`);
      });

      commands.push(`--------------------------------\n`);
      commands.push(`${ESC}a2`); // Right align
      commands.push(`TOTAL: Rs. ${order.total_amount}\n`);
      commands.push(`\n\n\n\x1Bm`); // Cut paper

      return commands.join('');
    },
    
    generateGSTInvoice: (order, items, appConfig = {}) => {
      // Generate GST-compliant invoice as PDF/Printable HTML
      const gstRate = 18; // Default GST rate (can be made dynamic per product)
      
      // Calculate GST breakdown
      const subtotal = parseFloat(order.subtotal) || parseFloat(order.total_amount);
      const discount = parseFloat(order.discount) || 0;
      const deliveryCharge = parseFloat(order.delivery_charge) || 0;
      const taxableAmount = subtotal - discount + deliveryCharge;
      const gstAmount = (taxableAmount * gstRate) / (100 + gstRate);
      const cgst = gstAmount / 2;
      const sgst = gstAmount / 2;

      // Generate HTML for invoice
      const invoiceHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>GST Invoice - ${order.order_number}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
            }
            .invoice-header {
              text-align: center;
              border-bottom: 2px solid #000;
              padding-bottom: 10px;
              margin-bottom: 20px;
            }
            .invoice-header h1 {
              margin: 0;
              font-size: 24px;
            }
            .invoice-details {
              display: flex;
              justify-content: space-between;
              margin-bottom: 20px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            table, th, td {
              border: 1px solid #ddd;
            }
            th, td {
              padding: 8px;
              text-align: left;
            }
            th {
              background-color: #f2f2f2;
            }
            .total-section {
              margin-left: auto;
              width: 300px;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              padding: 5px 0;
            }
            .total-row.total {
              font-weight: bold;
              font-size: 18px;
              border-top: 2px solid #000;
              padding-top: 10px;
            }
            .gst-summary {
              margin-top: 20px;
              padding-top: 10px;
              border-top: 1px solid #ddd;
            }
            .footer {
              text-align: center;
              margin-top: 40px;
              border-top: 1px solid #ddd;
              padding-top: 20px;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="invoice-header">
            <h1>${appConfig.store_name || 'NM MART'}</h1>
            <p>${appConfig.store_address || 'Retail Store'}</p>
            <p>Phone: ${appConfig.store_phone || 'N/A'}</p>
            <p>GSTIN: ${appConfig.gstin || 'N/A'}</p>
          </div>
          
          <div class="invoice-details">
            <div>
              <strong>Invoice #:</strong> ${order.order_number || order.id}<br>
              <strong>Date:</strong> ${new Date(order.created_at).toLocaleString()}<br>
              <strong>Customer:</strong> ${order.customer_name || 'Walk-in'}<br>
              <strong>Mobile:</strong> ${order.user_mobile || 'N/A'}
            </div>
            <div>
              <strong>Payment Method:</strong> ${order.payment_method || 'N/A'}<br>
              <strong>Payment Status:</strong> ${order.payment_status || 'N/A'}<br>
              <strong>Delivery Status:</strong> ${order.order_status || 'N/A'}
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Product</th>
                <th>Qty</th>
                <th>Rate</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((item, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${item.product_name || item.name}</td>
                  <td>${item.quantity || item.qty}</td>
                  <td>₹${parseFloat(item.rate || item.price).toFixed(2)}</td>
                  <td>₹${parseFloat(item.total || (item.qty * item.price)).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="total-section">
            <div class="total-row">
              <span>Subtotal:</span>
              <span>₹${subtotal.toFixed(2)}</span>
            </div>
            ${discount > 0 ? `
              <div class="total-row">
                <span>Discount:</span>
                <span>-₹${discount.toFixed(2)}</span>
              </div>
            ` : ''}
            ${deliveryCharge > 0 ? `
              <div class="total-row">
                <span>Delivery:</span>
                <span>+₹${deliveryCharge.toFixed(2)}</span>
              </div>
            ` : ''}
            <div class="total-row total">
              <span>Grand Total:</span>
              <span>₹${parseFloat(order.total_amount).toFixed(2)}</span>
            </div>
            
            <div class="gst-summary">
              <h4>GST Summary (${gstRate}%):</h4>
              <div class="total-row">
                <span>CGST (${gstRate/2}%):</span>
                <span>₹${cgst.toFixed(2)}</span>
              </div>
              <div class="total-row">
                <span>SGST (${gstRate/2}%):</span>
                <span>₹${sgst.toFixed(2)}</span>
              </div>
              <div class="total-row">
                <span>Total GST:</span>
                <span>₹${gstAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>
          
          <div class="footer">
            <p>This is a computer-generated invoice and does not require a signature.</p>
            <p>Thank you for shopping with us!</p>
          </div>
        </body>
        </html>
      `;
      
      // Open invoice in new window for printing
      const printWindow = window.open('', '_blank');
      printWindow.document.write(invoiceHTML);
      printWindow.document.close();
      printWindow.focus();
      
      // Auto print after a short delay
      setTimeout(() => {
        printWindow.print();
      }, 500);
      
      return invoiceHTML;
    }
  },

  /**
   * BULK UPSERT: Sync large datasets (Database-First)
   * Handles large datasets by splitting into batches to avoid Supabase limits.
   */
  upsert: async (tableName, dataset) => {
    try {
      const BATCH_SIZE = 500; // Smaller batch size for writes to avoid timeouts/limits
      
      // Always use id as conflict key
      const upsertOptions = { onConflict: 'id' };

      const allResults = [];
      const dataArray = Array.isArray(dataset) ? dataset : [dataset];

      // Process in batches
      for (let i = 0; i < dataArray.length; i += BATCH_SIZE) {
        const batch = dataArray.slice(i, i + BATCH_SIZE);
        const { data, error } = await supabase
          .from(tableName)
          .upsert(batch, upsertOptions)
          .select();

        if (error) {
          console.error(`[Upsert Batch Error] ${tableName} at index ${i}:`, error.message);
          throw error;
        }
        
        if (data) allResults.push(...data);
      }
      
      await logTableAction(tableName, 'BULK_UPSERT');
      return allResults;
    } catch (error) {
      console.error(`[Upsert Error] ${tableName}:`, error.message);
      throw error;
    }
  },

  /**
   * BULK DELETE ALL: Clear all records from a table
   */
  deleteAll: async (tableName) => {
    try {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Deletes everything that has an ID

      if (error) throw error;
      await logTableAction(tableName, 'BULK_DELETE_ALL');
      return { success: true };
    } catch (error) {
      console.error(`[Bulk Delete Error] ${tableName}:`, error.message);
      return { success: false, error: error.message };
    }
  }
};
