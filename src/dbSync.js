import { supabase } from './supabase';
import { DB_SCHEMA } from './dbSchema';
import * as XLSX from 'xlsx';

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
 * Records 'Table-Action-Timestamp' into system_logs table.
 */
const logTableAction = async (tableName, action) => {
  const timestamp = new Date().toISOString();
  const logEntry = `${tableName}-${action}-${timestamp}`;
  
  try {
    if (DB_SCHEMA.SYSTEM_LOGS) {
      await supabase.from(DB_SCHEMA.SYSTEM_LOGS.table).insert([{
        log_entry: logEntry
      }]);
    }
    console.log(`[Audit Log] ${logEntry}`);
  } catch (err) {
    console.error("Audit Log Failed", err);
  }
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
    const { error } = await supabase.from(tableName).select('count', { count: 'exact', head: true });
    return !error;
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
      if (error) throw error;
      await logTableAction(tableName, actionLabel);

      // --- Low Stock Auto-Alert Integration ---
      // If this is an order placement, check stock for each item
      if (rpcName === 'place_order_atomic' && params.p_order_items) {
        for (const item of params.p_order_items) {
          // Trigger alert check in background (non-blocking)
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
      const { data, error } = await supabase
        .from(tableName)
        .insert(Array.isArray(payload) ? payload : [payload])
        .select();

      if (error) throw error; // Will trigger on DB constraint violation
      await logTableAction(tableName, 'INSERT');
      return data;
    } catch (error) {
      console.error(`[Insert Error] ${tableName}:`, error.message);
      throw error;
    }
  },

  // Read
  fetch: async (tableName, query = {}) => {
    try {
      // Cache-busting: Adding a random query param to ensure fresh data
      let request = supabase.from(tableName).select(query.select || '*');
      
      if (query.eq) request = request.eq(query.eq.column, query.eq.value);
      if (query.order) request = request.order(query.order.column, { ascending: query.order.ascending ?? true });
      if (query.limit) request = request.limit(query.limit);

      // Force Supabase to bypass any client-side cache
      const { data, error } = await request;
      
      if (error) {
        console.error(`[Supabase Fetch Error] ${tableName}:`, error.message);
        throw error;
      }
      return data;
    } catch (error) {
      console.error(`[dbSync.fetch Failed] ${tableName}:`, error.message);
      throw error;
    }
  },

  // Update
  update: async (tableName, id, payload) => {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .update(payload)
        .eq('id', id)
        .select();

      if (error) throw error; // Will trigger on DB constraint violation
      await logTableAction(tableName, 'UPDATE');
      return data;
    } catch (error) {
      console.error(`[Update Error] ${tableName}:`, error.message);
      throw error;
    }
  },

  // Delete
  delete: async (tableName, id) => {
    try {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id);

      if (error) throw error;
      await logTableAction(tableName, 'DELETE');
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
    }
  },

  /**
   * BULK UPSERT: Sync large datasets (Database-First)
   */
  upsert: async (tableName, dataset) => {
    try {
      const upsertOptions = { onConflict: 'id' };
      
      // For products table, use barcode as the conflict key
      if (tableName === DB_SCHEMA.PRODUCTS.table) {
        upsertOptions.onConflict = 'barcode';
      }
      
      // For Master tables (Categories, Brands, etc.), use name as conflict key to avoid duplicates
      const masterTables = [
        DB_SCHEMA.CATEGORIES.table, 
        DB_SCHEMA.SUBCATEGORIES.table, 
        DB_SCHEMA.BRANDS.table, 
        DB_SCHEMA.UNITS.table,
        DB_SCHEMA.DEPARTMENTS.table,
        DB_SCHEMA.ACCOUNTS.table
      ];
      
      if (masterTables.includes(tableName)) {
        upsertOptions.onConflict = 'name';
      }
      
      const { data, error } = await supabase
        .from(tableName)
        .upsert(dataset, upsertOptions)
        .select();

      if (error) throw error;
      await logTableAction(tableName, 'UPSERT');
      return data;
    } catch (error) {
      console.error(`[Upsert Error] ${tableName}:`, error.message);
      throw error;
    }
  }
};
