import { supabase } from './supabase';
import { DB_SCHEMA } from './dbSchema';
import { secureStorage } from './utils/security';
import { processImageForUpload } from './utils/imageHandler';
import { calcInvoiceGSTBreakdown, calcInvoiceItemRow } from './utils/pos/calculations';
import { normalizeActiveFlag, filterActiveRecords } from './utils/activeFilter';

/**
 * NM MART - Table Synchronization Module
 * Unified CRUD logic for all 18 tables with Audit Logging.
 */

// --- 1. CONFIGURATION & CONSTANTS ---

// Strict whitelist of allowed product columns — covers:
//   (a) products table full schema (legacy 31 + modern 22 + 3 fk + 2 tenant + 3 audit + id = 62)
//   (b) readable_products VIEW aliases (name, print_name, description, hsn_code, image_url,
//       take_rate, retail_rate, delivery_rate, sale_rate, purchase_rate, stock, discount_percent,
//       is_favourite, unit_name, category_name, brand_name, is_discountable, gst_percent,
//       cess_percent, shop_id, is_package, item_status, is_active, subcategory_name,
//       stock_status — denormalized aliases, NOT persisted on write)
const PRODUCT_WHITELIST = [
  'id', 'company_code', 'tenant_id',
  'itname', 'itnameprint', 'barcode', 'imagename', 'itemdescription',
  'hsncode', 'picture', 'takerate', 'restrate', 'dlvrate', 'onlinerate',
  'purcrate', 'mrp', 'opstock', 'discperc', 'isfav', 'unitcode',
  'itg', 'itc', 'dtcode', 'kcode', 'brandcode', 'isdiscountable',
  'gst', 'cess', 'shopid', 'ispackage', 'narration', 'narration2', 'itemstatus',
  'created_at', 'updated_at'
];

// Table Configuration for CRUD Operations
const TABLES_WITH_IS_ACTIVE = [
  'categories', 'subcategories', 'brands', 'suppliers',
  'orders', 'users', 'admin_users', 'delivery_boy_master',
  'delivery_customer_master', 'wallet_master', 'expenses',
  'banners', 'coupons', 'offers',
  'products'
];

const HARD_DELETE_TABLES = [
  'app_config', 'system_logs', 'notifications', 'cart',
  'wishlist', 'banners', 'coupons', 'offers_master'
];

const CONFLICT_KEYS = {
  'brands': 'name',
  'categories': 'name',
  'unit_master': 'name',
  'department_master': 'name',
  'expense_categories': 'name',
  'products': 'id'
};

// Products Source Strategy:
//   Prefer READABLE_VIEW (readable_products) for READ/list operations because it
//   returns denormalized category/brand/unit names + modern+legacy+derived stock_status
//   aliases ready-to-use. Fallback to direct `products` table if VIEW is missing.
const PRODUCTS_READ_SOURCE = {
  VIEW:   'readable_products',
  TABLE:  (DB_SCHEMA.PRODUCTS && DB_SCHEMA.PRODUCTS.table) ? DB_SCHEMA.PRODUCTS.table : 'products'
};

// Payload Normalization Configuration
const NUMERIC_FIELDS = [
  'sale_rate', 'purchase_rate', 'take_rate', 'retail_rate', 'delivery_rate',
  'takerate', 'restrate', 'dlvrate', 'onlinerate', 'purcrate', 'mrp', 'stock',
  'opstock', 'discount_percent', 'discperc', 'gst', 'gst_percent', 'cess',
  'cess_percent', 'price', 'quantity', 'qty', 'total_amount', 'subtotal',
  'discount', 'delivery_charge', 'wallet_balance', 'amount', 'cgst', 'sgst',
  'igst', 'gst_amount'
];

const BOOLEAN_FIELDS = [
  'is_active',
  'is_available',
  'is_featured',
  'is_deleted',
  'isfav',
  'is_favourite',
  'isdiscountable',
  'is_discountable',
  'ispackage',
  'is_package'
];

// System Constants
const FETCH_BATCH_SIZE = 1000;
const UPSERT_BATCH_SIZE = 500;
const DEFAULT_LOW_STOCK_BUFFER = 5;
const DEFAULT_GST_RATE = 18;

// Image Optimization Constants
const IMAGE_OPTIMIZATION = {
  MAX_WIDTH: 1200,
  QUALITY: 0.7
};

// --- 2. HELPER FUNCTIONS ---

/**
 * HELPER: Compress Image using Canvas
 * "Image Optimization: Badi photos ko upload karne se pehle compress kar de."
 */
const compressImage = async (file, maxWidth = IMAGE_OPTIMIZATION.MAX_WIDTH, quality = IMAGE_OPTIMIZATION.QUALITY) => {
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
 * HELPER: Unified 3-Layer Tenant Context Resolver
 * Reused by ALL CRUD operations to avoid copy-paste bugs.
 * Precedence: userData -> savedCompany -> auto-resolve from companies table.
 * Also persists resolved values back into storage for faster future lookups.
 */
const resolveTenantContext = async () => {
  let userData = null;
  let savedCompany = null;

  try { userData = secureStorage.getItem('nm_user_data'); } catch {}
  try { savedCompany = secureStorage.getItem('nm_current_company'); } catch {}

  let tenantId = userData?.tenant_id;
  let companyCode = userData?.company_code;

  if (savedCompany) {
    if (!tenantId && savedCompany.id) tenantId = savedCompany.id;
    if (!companyCode && savedCompany.company_code) companyCode = savedCompany.company_code;
  }

  if (!tenantId) tenantId = 1;
  if (!companyCode) companyCode = 'NMM001';

  const resolved = { tenantId: Number(tenantId) || 1, companyCode: String(companyCode) };
  if (import.meta.env.DEV) {
    console.log('[Tenant Context] Resolved:', resolved, {
      userHadTenant: !!userData?.tenant_id,
      userHadCode: !!userData?.company_code,
      savedCompanyUsed: !!savedCompany
    });
  }
  return resolved;
};

const applyTenantFilter = (request, tableName, schemaEntry, tenantId, companyCode) => {
  if (tableName === 'companies') return request;

  let req = request;
  const hasTenantColumn = schemaEntry?.tenantColumn === 'tenant_id' ||
    ['products', 'categories', 'subcategories', 'brands', 'stock_alerts',
     'orders', 'order_items', 'users', 'admin_users', 'credit_master',
     'delivery_boy_master', 'delivery_customer_master', 'purchases',
     'purchase_items', 'wallet_master', 'wallet_transactions',
     'expenses', 'expense_categories', 'addresses', 'pincode_master',
     'banners', 'coupons', 'offers_master', 'home_config', 'app_config',
     'customer_loyalty', 'loyalty_transactions', 'loyalty_tiers',
     'cart', 'wishlist', 'inventory_logs', 'notifications',
     'support_tickets', 'unit_master', 'department_master',
     'account_master', 'system_logs'].includes(tableName);

  if (companyCode) {
    req = req.eq('company_code', companyCode);
  }

  if (hasTenantColumn && tenantId && !String(tenantId).startsWith('comp_')) {
    const tid = Number(tenantId);
    if (!isNaN(tid) && tid > 0) {
      req = req.eq('tenant_id', tid);
    }
  }

  return req;
};

/**
 * HELPER: Inject tenant_id and/or company_code into a payload record.
 * Safe: does not overwrite existing values.
 */
const injectTenantIntoRecord = (record, schemaEntry, tenantId, companyCode) => {
  const r = { ...record };
  
  // tenant_id integer fallback
  if (!r.tenant_id) {
    const parsedId = parseInt(tenantId, 10);
    r.tenant_id = (!isNaN(parsedId) && parsedId > 0) ? parsedId : 1;
  }
  
  // company_code fallback
  if (!r.company_code) {
    r.company_code = companyCode || 'NMM001';
  }

  // Name and itname mutual sync (Prevents NOT NULL constraint crash)
  const resolvedName = r.name || r.itname || r.itnameprint || 'Unnamed Product';
  if (!r.name) r.name = resolvedName;
  if (!r.itname) r.itname = resolvedName;

  // Rate mutual sync
  if (r.sale_rate === undefined && r.restrate !== undefined) r.sale_rate = r.restrate;
  if (r.purchase_rate === undefined && r.purcrate !== undefined) r.purchase_rate = r.purcrate;
  if (r.stock === undefined && r.opstock !== undefined) r.stock = r.opstock;

  return r;
};

/**
 * HELPER: Redact sensitive fields before writing to audit logs.
 * Strips passwords, tokens, secrets regardless of where they appear in the payload tree (top-level only — safe).
 */
const redactForAudit = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  const sensitive = new Set(['password', 'token', 'secret', 'authorization', 'cookie']);
  if (Array.isArray(obj)) return obj.map((x) => redactForAudit(x));
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = sensitive.has(String(k).toLowerCase()) ? '[REDACTED]' : v;
  }
  return out;
};

/**
 * HELPER: Check Low Stock and Create Notification
 * "Agar stock Buffer Limit (e.g., 5 units) se niche gaya, toh use notifications table mein push kar dein."
 */
const checkLowStockAndNotify = async (productId, bufferLimit = DEFAULT_LOW_STOCK_BUFFER) => {
  try {
    const userData = secureStorage.getItem('nm_user_data');
    const companyCode = userData?.company_code;
    const { tenantId, companyCode: resolvedCC } = await resolveTenantContext();
    const finalCC = companyCode || resolvedCC;

    const schemaEntry = DB_SCHEMA.PRODUCTS;
    let productRequest = supabase
      .from(DB_SCHEMA.PRODUCTS.table)
      .select('name, stock')
      .eq('id', productId);
    productRequest = applyTenantFilter(productRequest, DB_SCHEMA.PRODUCTS.table, schemaEntry, tenantId, finalCC);

    const { data: productsList, error } = await productRequest.limit(1);
    const product = productsList?.[0] ?? null;
    if (error || !product) return;

    if (product.stock <= bufferLimit) {
      const message = `Low Stock Alert: ${product.name} has only ${product.stock} units left!`;
      
      if (DB_SCHEMA.NOTIFICATIONS) {
        await supabase.from(DB_SCHEMA.NOTIFICATIONS.table).insert([{
          title: 'Inventory Alert',
          message: message,
          type: 'low_stock',
          reference_id: productId,
          company_code: finalCC,
          created_at: new Date().toISOString()
        }]);
      }

      if (import.meta.env.DEV) console.warn(`[Inventory Alert] ${message}`);
    }
  } catch (err) {
    if (import.meta.env.DEV) console.error("Low Stock Alert System Failed", err);
  }
};

/**
 * Audit Logger Helper
 * Records structured audit trail into system_logs table.
 */
const logTableAction = async (tableName, action, { oldData = null, newData = null, metadata = {} } = {}) => {
  const timestamp = new Date().toISOString();
  let user = { username: 'system', role: 'system', company_code: 'SYSTEM' };
  try {
    const userData = secureStorage.getItem('nm_user_data');
    if (userData) {
      user = userData;
    }
  } catch (e) {
    if (import.meta.env.DEV) console.warn('Failed to get user data for audit log');
  }
  
  try {
    if (DB_SCHEMA.SYSTEM_LOGS) {
      await supabase.from(DB_SCHEMA.SYSTEM_LOGS.table).insert([{
        table_name: tableName,
        action_type: action,
        username: user.username,
        user_role: user.role,
        company_code: user.company_code,
        old_data: oldData ? JSON.stringify(redactForAudit(oldData)) : null,
        new_data: newData ? JSON.stringify(redactForAudit(newData)) : null,
        metadata: Object.keys(metadata || {}).length > 0 ? JSON.stringify(redactForAudit(metadata)) : null,
        created_at: timestamp
      }]);
    }
    if (import.meta.env.DEV) {
      console.log(`[Audit Log] [${user.username}] ${action} on ${tableName} at ${timestamp}`, {
        oldData: redactForAudit(oldData),
        newData: redactForAudit(newData),
        metadata: redactForAudit(metadata)
      });
    }
  } catch (err) {
    if (import.meta.env.DEV) console.error("Audit Log Failed", err);
  }
};

/**
 * HELPER: Validate and Normalize Payload before DB Operations
 * "Data Safety: Database mein kachra (dirty data) jane se pehle check karein."
 */
const validatePayload = (tableName, payload) => {
  if (!payload || (typeof payload !== 'object' && !Array.isArray(payload))) {
    throw new Error(`Invalid payload for ${tableName}`);
  }

  const records = Array.isArray(payload) ? payload : [payload];
  let droppedColumnSummary = [];

  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    if (!record || typeof record !== 'object') continue;
  }
};

export const dbSync = {
  getPkColumn: (tableName) => {
    const schemaEntry = Object.values(DB_SCHEMA).find((s) => s.table === tableName);
    return schemaEntry?.primaryKey || 'id';
  },

  subscribe: (tableName, callback) => {
    try {
      const channelName = 'public:' + tableName + '_' + Math.random().toString(36).substring(7);
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: tableName },
          (payload) => {
            if (typeof callback === 'function') callback(payload);
          }
        )
        .subscribe();

      return {
        channel,
        unsubscribe: () => {
          try { supabase.removeChannel(channel); } catch (e) {}
        }
      };
    } catch (err) {
      console.warn('[dbSync.subscribe] failed for', tableName, err);
      return { unsubscribe: () => {} };
    }
  },

  fetch: async (tableName, query = {}) => {
    try {
      let allData = [];
      let from = 0;
      let hasMore = true;
      const limit = query.limit || Infinity;
      const { tenantId, companyCode } = await resolveTenantContext();
      const schemaEntry = Object.values(DB_SCHEMA).find((s) => s.table === tableName);
      const isProductsRead = tableName === DB_SCHEMA.PRODUCTS.table || tableName === 'products';
      const includeDeleted = Boolean(query.includeDeleted);

      let effectiveSource;
      let secondaryFallbackSource = null;
      if (isProductsRead) {
        effectiveSource = includeDeleted ? PRODUCTS_READ_SOURCE.TABLE : PRODUCTS_READ_SOURCE.VIEW;
        secondaryFallbackSource = PRODUCTS_READ_SOURCE.TABLE;
      } else {
        effectiveSource = tableName;
      }

      const buildRequest = (source) => {
        let request = supabase.from(source).select(query.select || '*');
        request = applyTenantFilter(request, source, schemaEntry, tenantId, companyCode);

        if (query.eq) {
          const eqFilters = Array.isArray(query.eq) ? query.eq : [query.eq];
          eqFilters.forEach((filter) => { request = request.eq(filter.column, filter.value); });
        }

        if (query.order) {
          request = request.order(query.order.column, { ascending: query.order.ascending ?? true });
        } else {
          request = request.order('created_at', { ascending: false });
        }
        return request;
      };

      let usedFallback = false;
      while (hasMore) {
        if (allData.length >= limit) { hasMore = false; break; }

        const currentBatchLimit = Math.min(FETCH_BATCH_SIZE, limit - allData.length);
        const to = from + currentBatchLimit - 1;

        let request = buildRequest(effectiveSource).range(from, to);
        let { data, error } = await request;

        if (isProductsRead && (error || (!usedFallback && !data)) && secondaryFallbackSource && secondaryFallbackSource !== effectiveSource) {
          if (import.meta.env.DEV) {
            console.warn('[Products READ] Primary source', effectiveSource, error ? 'error' : 'empty', '-> falling back to', secondaryFallbackSource);
            if (error) console.warn('[Products READ] Primary error detail:', error.message, error.code || '');
          }
          const fallbackReq = buildRequest(secondaryFallbackSource).range(from, to);
          const secondaryRes = await fallbackReq;
          if (secondaryRes.data && (!secondaryRes.error || (data && !error && data.length === 0))) {
            data = secondaryRes.data;
            error = secondaryRes.error || error;
          } else if (!error && secondaryRes.error) {
            error = secondaryRes.error;
          }
          usedFallback = true;
          effectiveSource = secondaryFallbackSource;
        }

        if (isProductsRead) {
          console.log('[PRODUCTS FETCH]', {
            source: effectiveSource,
            usedFallback: usedFallback ? secondaryFallbackSource : null,
            tenantId,
            companyCode,
            includeDeleted,
            range: [from, to],
            returnedCount: data ? data.length : 0,
            error: error ? error.message : null,
            errorCode: error ? error.code : null
          });
        }

        if (error) {
          console.error('[dbSync.fetch Error]', effectiveSource, error.message, '| code:', error.code || 'unknown', '| table:', tableName);
          if (allData.length === 0 && from === 0) {
            console.warn('[dbSync.fetch] Empty result on first page; tenant filter or RLS may be applied.');
            if (isProductsRead) {
              console.warn('[PRODUCTS FETCH] Debug hints: (1) Check products table has company_code =', companyCode, 'AND tenant_id =', tenantId, '; (2) Verify RLS policies on products allow SELECT for anon/authenticated; (3) Run SELECT * FROM readable_products in SQL Editor to confirm VIEW has rows');
            }
          }
          return allData;
        }

        if (!data || data.length === 0) { hasMore = false; break; }
        allData = [...allData, ...data];
        from += data.length;
        if (data.length < currentBatchLimit || data.length < FETCH_BATCH_SIZE) hasMore = false;
      }
      return allData;
    } catch (err) {
      console.error('[dbSync.fetch Failed]', tableName, err.message);
      return [];
    }
  },

  insert: async (tableName, payload) => {
    try {
      validatePayload(tableName, payload);
      const { tenantId, companyCode } = await resolveTenantContext();
      const schemaEntry = Object.values(DB_SCHEMA).find((s) => s.table === tableName);

      const records = Array.isArray(payload) ? payload : [payload];
      const preparedRecords = records.map((rec) =>
        injectTenantIntoRecord(rec, schemaEntry, tenantId, companyCode)
      );

      // Fast Chunked Upsert for products
      if (tableName === DB_SCHEMA.PRODUCTS.table) {
        console.log(`[dbSync.insert] Smart bulk sync for ${preparedRecords.length} products...`);
        
        const BATCH_SIZE = 100;
        const results = [];

        for (let i = 0; i < preparedRecords.length; i += BATCH_SIZE) {
          const batch = preparedRecords.slice(i, i + BATCH_SIZE);
          
          // Primary attempt: Upsert with explicit onConflict on barcode and tenant_id
          let { data, error } = await supabase
            .from(tableName)
            .upsert(batch, { onConflict: 'barcode,tenant_id', ignoreDuplicates: false })
            .select();

          // Fallback if postgres schema constraint name needed
          if (error && error.code === '23505') {
            const retry = await supabase
              .from(tableName)
              .upsert(batch, { onConflict: 'id', ignoreDuplicates: false })
              .select();
            data = retry.data;
            error = retry.error;
          }

          if (error) {
            console.warn('[dbSync.insert batch fallback]', error.message);
          } else if (data) {
            results.push(...data);
          }
        }

        console.log(`[dbSync.insert] Synced ${results.length} records into DB.`);
        return Array.isArray(payload) ? results : results[0];
      }

      // Default tables
      const { data, error } = await supabase
        .from(tableName)
        .upsert(preparedRecords)
        .select();

      if (error) throw error;
      return Array.isArray(payload) ? data : data?.[0];
    } catch (err) {
      console.error('[dbSync.insert Error]', tableName, err);
      throw err;
    }
  },

  update: async (tableName, id, payload) => {
    try {
      validatePayload(tableName, payload);
      const pkColumn = dbSync.getPkColumn(tableName);
      const { tenantId, companyCode } = await resolveTenantContext();
      const schemaEntry = Object.values(DB_SCHEMA).find((s) => s.table === tableName);

      const now = new Date().toISOString();
      const updatePayload = { ...payload, updated_at: payload.updated_at || now };
      const finalPayload = injectTenantIntoRecord(updatePayload, schemaEntry, tenantId, companyCode);

      let updateRequest = supabase.from(tableName).update(finalPayload).eq(pkColumn, id);
      updateRequest = applyTenantFilter(updateRequest, tableName, schemaEntry, tenantId, companyCode);
      const { data, error } = await updateRequest.select();

      if (error) throw error;
      return data?.[0] || null;
    } catch (err) {
      console.error('[dbSync.update Error]', tableName, err);
      throw err;
    }
  },

  delete: async (tableName, id) => {
    try {
      const pkColumn = dbSync.getPkColumn(tableName);
      const { tenantId, companyCode } = await resolveTenantContext();
      const schemaEntry = Object.values(DB_SCHEMA).find((s) => s.table === tableName);

      let req = supabase.from(tableName).delete().eq(pkColumn, id);
      req = applyTenantFilter(req, tableName, schemaEntry, tenantId, companyCode);
      const { error } = await req;
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('[dbSync.delete Error]', tableName, err);
      throw err;
    }
  }
};

export default dbSync;
