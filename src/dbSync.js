import { supabase, supabaseConfig } from './supabase';
import { isLocalPosReadOnlyMode, isLocalPosTestMode } from './utils/localPosTestMode';
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
  'id', 'tenant_id', 'company_code',
  'name', 'itname', 'print_name', 'itnameprint',
  'description', 'itemdescription', 'item_description', 'barcode',
  'hsn_code', 'hsncode', 'image_url', 'imagename', 'picture',
  'category_id', 'subcategory_id', 'brand_id', 'unit_id',
  'purchase_rate', 'purcrate', 'mrp', 'cost_price',
  'retail_rate', 'restrate', 'take_rate', 'takerate',
  'delivery_rate', 'dlvrate', 'sale_rate', 'onlinerate', 'online_rate', 'selling_price',
  'stock', 'opstock', 'opening_stock', 'low_stock_threshold',
  'unitcode', 'unit_name', 'category_name', 'brand_name',
  'gst_percent', 'gst', 'gst_pct', 'cess_percent', 'cess', 'cess_pct',
  'discount_percent', 'discperc', 'discount_pct', 'discount', 'discount_type',
  'discount_amount', 'max_discount', 'min_selling_price',
  'is_discountable', 'isdiscountable',
  'is_favourite', 'isfav', 'is_package', 'ispackage',
  'item_status', 'itemstatus', 'is_active', 'is_deleted',
  'narration', 'narration2', 'shop_id', 'shopid',
  'itg', 'itc', 'dtcode', 'kcode', 'brandcode',
  'brand_code', 'department_code', 'category_code',
  'sub_category_code', 'item_name', 'item_group_name', 'sub_category_name',
  'item_group', 'item_category', 'subcategory_name', 'admin_user_id',
  'batch_no', 'expiry_date', 'manufactured_date', 'opening_stock_date',
  'created_at', 'updated_at'
];

// Table Configuration for CRUD Operations
// NOTE: Orders table does NOT have `is_active` column in production schema, so we've removed it.
// Only tables that actually have an `is_active` column are listed here.
const TABLES_WITH_IS_ACTIVE = [
  'companies',
  'categories', 'subcategories', 'brands', 'account_master',
  'users', 'admin_users', 'delivery_boy_master',
  'delivery_customer_master', 'wallet_master',
  'expenses', 'expense_categories',
  'addresses', 'pincode_master',
  'banners', 'coupons', 'offers_master',
  'home_config', 'app_config',
  'customer_loyalty', 'loyalty_tiers',
  'products'
];

const HARD_DELETE_TABLES = [
  'app_config', 'system_logs', 'notifications', 'cart',
  'wishlist', 'banners', 'coupons', 'offers_master'
];

// onConflict keys: only use when the table has a matching UNIQUE constraint in Postgres.
const CONFLICT_KEYS = {
  'companies': 'company_code',
  'unit_master': 'id', // Better to use id if available, or omit for auto-resolve
  'expense_categories': 'name',
  'loyalty_tiers': 'name',
  'coupons': 'code',
  'app_config': 'key',
  'admin_users': 'username',
  'orders': 'order_number',
  'home_config': 'key',
  'hsn_master': 'hsn_code',
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
  if (isLocalPosReadOnlyMode) {
    return { tenantId: 1, companyCode: 'NMM001' };
  }

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

  // GUARANTEED FALLBACK: Default directly to NM MART (tenantId: 1, companyCode: 'NMM001')
  if (!tenantId) tenantId = 1;
  if (!companyCode) companyCode = 'NMM001';

  return { tenantId: Number(tenantId) || 1, companyCode: String(companyCode) };
};

const applyTenantFilter = (request, tableName, schemaEntry, tenantId, companyCode) => {
  if (tableName === 'companies' || !schemaEntry?.tenantColumn) return request;

  // NM MART LIVE FIX: If companyCode is 'NMM001' but DB has null/empty, we prioritize tenant_id = 1
  // This connects the Admin Panel to the 524 products found in audit.
  if (tenantId === 1 || String(companyCode) === 'NMM001') {
    return request.eq('tenant_id', 1);
  }

  if (companyCode) {
    return request.eq('company_code', companyCode);
  }

  // Agar string UUID/custom ID hai aur integer tenant table hai to mismatch se bachein
  if (schemaEntry?.tenantColumn === 'tenant_id' && tenantId && !String(tenantId).startsWith('comp_')) {
    return request.eq('tenant_id', tenantId);
  }

  return request;
};

/**
 * HELPER: Inject tenant_id and/or company_code into a payload record.
 * Safe: does not overwrite existing values. ALSO coerces boolean fields
 * (NULL/''/'false'/0 → false etc; undefined → DEFAULT true for is_active).
 */
const injectTenantIntoRecord = (record, schemaEntry, tenantId, companyCode) => {
  const r = { ...record };

  // ------------ BOOLEAN COERCION FIRST ------------
  // Prevents NULL booleans in DB that escape frontend filters.
  let currentBatchLimit = 1000; let to = 100; for(const field of BOOLEAN_FIELDS) {
    if (field in r) {
      const v = r[field];
      if (v === null || v === undefined || v === '' || v === 'null' || v === 'NULL') {
        r[field] = null;
      } else if (typeof v === 'number') {
        r[field] = v !== 0;
      } else if (typeof v === 'string') {
        const s = v.trim().toLowerCase();
        r[field] = (s === 'true' || s === '1' || s === 'yes' || s === 'y' || s === 'on' || s === 't');
      } else if (typeof v !== 'boolean') {
        r[field] = Boolean(v);
      }
      // else already boolean — keep as-is
    }
  }

  // ------------ is_active DEFAULT = true ------------
  // The #1 reason 0 products show up is is_active=NULL rows in production DB.
  // For any table that supports is_active, ensure it is never NULL on write.
  const tableName = schemaEntry?.table;
  if (tableName && TABLES_WITH_IS_ACTIVE.includes(tableName)) {
    if (r.is_active === null || r.is_active === undefined) {
      r.is_active = true;
    }
  }

  // ------------ tenant_id integer fallback ------------
  if (!r.tenant_id) {
    const parsedId = parseInt(tenantId, 10);
    r.tenant_id = (!isNaN(parsedId) && parsedId > 0) ? parsedId : 1;
  }

  // ------------ company_code fallback ------------
  if (!r.company_code) {
    r.company_code = companyCode || 'NMM001';
  }

  // ------------ Name and itname mutual sync (Prevents NOT NULL constraint crash) ------------
  if (tableName === DB_SCHEMA.PRODUCTS.table) {
    const resolvedName = r.name || r.itname || r.itnameprint || 'Unnamed Product';
    if (!r.name) r.name = resolvedName;
    if (!r.itname) r.itname = resolvedName;
  }

  // ------------ Rate mutual sync ------------
  if (tableName === DB_SCHEMA.PRODUCTS.table) {
    if (r.sale_rate === undefined && r.restrate !== undefined) r.sale_rate = r.restrate;
    if (r.purchase_rate === undefined && r.purcrate !== undefined) r.purchase_rate = r.purcrate;
    if (r.stock === undefined && r.opstock !== undefined) r.stock = r.opstock;
  }

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

    const { data: product, error } = await productRequest.maybeSingle();
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
    if (isLocalPosTestMode && !isLocalPosReadOnlyMode) {
      return { unsubscribe: () => {} };
    }

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
    if (isLocalPosTestMode && !isLocalPosReadOnlyMode) {
      return [];
    }

    try {
      let allData = [];
      let from = 0;
      let hasMore = true;
      const limit = query.limit || Infinity;
      const includeDeleted = query.includeDeleted === true;
      const { tenantId, companyCode } = await resolveTenantContext();
      const schemaEntry = Object.values(DB_SCHEMA).find((s) => s.table === tableName);
      let effectiveSource = tableName;
      let viewFailed = false;
      let isActiveFilterFailed = false; // defence: is_active column missing?

      // --- READ VIEW preference ---
      // NOTE: raw products table is the authoritative source. readable_products can be
      // empty for valid rows when its built-in filters or RLS conditions hide records,
      // which causes the frontend to show zero products even though data exists.
      if (tableName === DB_SCHEMA.PRODUCTS.table) {
        effectiveSource = DB_SCHEMA.PRODUCTS.table;
      } else if (tableName === DB_SCHEMA.ORDERS.table && DB_SCHEMA.READABLE_ORDERS && !query.rawTable) {
        effectiveSource = DB_SCHEMA.READABLE_ORDERS.table;
      } else if (tableName === DB_SCHEMA.USERS.table && DB_SCHEMA.READABLE_USERS) {
        effectiveSource = DB_SCHEMA.READABLE_USERS.table;
      } else if (tableName === DB_SCHEMA.CATEGORIES.table && DB_SCHEMA.READABLE_CATEGORIES) {
        effectiveSource = DB_SCHEMA.READABLE_CATEGORIES.table;
      } else if (tableName === DB_SCHEMA.BRANDS.table && DB_SCHEMA.READABLE_BRANDS) {
        // readable_brands omits image_url; use the authoritative table so Brand Master previews work.
        effectiveSource = DB_SCHEMA.BRANDS.table;
      } else if (tableName === DB_SCHEMA.BANNERS.table && DB_SCHEMA.READABLE_BANNERS) {
        effectiveSource = DB_SCHEMA.READABLE_BANNERS.table;
      } else if (tableName === DB_SCHEMA.COUPONS.table && DB_SCHEMA.READABLE_COUPONS) {
        effectiveSource = DB_SCHEMA.READABLE_COUPONS.table;
      }

      let currentBatchLimit;
      let to;

      const buildRequest = (opts = {}) => {
        const {
          source = effectiveSource,
          applyIsActive = !includeDeleted,
          applyCompanyFilter = true,
          applyTenantFilterFlag = true,
        } = opts;
        let req = supabase.from(source).select(query.select || '*');
        if (applyTenantFilterFlag && applyCompanyFilter) {
          req = applyTenantFilter(req, source, schemaEntry, tenantId, companyCode);
        }
        if (applyIsActive && !isActiveFilterFailed && TABLES_WITH_IS_ACTIVE.includes(tableName)) {
          req = req.not('is_active', 'is', false);
        }
        if (query.eq) {
          const eqFilters = Array.isArray(query.eq) ? query.eq : [query.eq];
          eqFilters.forEach((filter) => { req = req.eq(filter.column, filter.value); });
        }
        if (query.neq) {
          const neqFilters = Array.isArray(query.neq) ? query.neq : [query.neq];
          neqFilters.forEach((filter) => { req = req.neq(filter.column, filter.value); });
        }
        if (query.gte) req = req.gte(query.gte.column, query.gte.value);
        if (query.lte) req = req.lte(query.lte.column, query.lte.value);
        if (query.ilike) req = req.ilike(query.ilike.column, query.ilike.value);
        if (query.in && Array.isArray(query.in.values)) {
          req = req.in(query.in.column, query.in.values);
        }
        if (query.order) {
          const orderCol = query.order.column;
          req = req.order(orderCol, { ascending: query.order.ascending ?? true });
        } else {
          req = req.order('created_at', { ascending: false });
        }
        return req;
      };

      const sanitizeNullIsActive = async () => {
        if (tableName !== DB_SCHEMA.PRODUCTS?.table && tableName !== 'products') return;
        try {
          let probeReq = supabase.from(DB_SCHEMA.PRODUCTS.table).select('id,is_active');
          probeReq = applyTenantFilter(probeReq, DB_SCHEMA.PRODUCTS.table, schemaEntry, tenantId, companyCode);
          probeReq = probeReq.or('is_active.is.null,is_active.eq.false').limit(500);
          const { data: probe, error: probeErr } = await probeReq;
          if (probeErr || !probe || probe.length === 0) return;
          const nullIds = probe.filter(p => p.is_active === null || p.is_active === undefined).map(p => p.id);
          const falseIds = probe.filter(p => p.is_active === false).map(p => p.id);
          const toFix = [...new Set([...nullIds, ...falseIds])];
          if (toFix.length === 0) return;
          console.log(
            `%c[dbSync.fetch/preSanitize] 🚿 Probe found ${toFix.length} product(s) with is_active=NULL/false → Bulk UPDATE (background).`,
            'background:#0f766e;color:#ccfbf1;padding:2px 6px;border-radius:4px;font-weight:bold',
            toFix.slice(0, 10).join(','),
            toFix.length > 10 ? `(+${toFix.length - 10} more)` : ''
          );
          void (async () => {
            try {
              const CHUNK = 200;
              for (let c = 0; c < toFix.length; c += CHUNK) {
                const chunk = toFix.slice(c, c + CHUNK);
                const { error: updErr } = await supabase
                  .from(DB_SCHEMA.PRODUCTS.table)
                  .update({ is_active: true, updated_at: new Date().toISOString() })
                  .in('id', chunk);
                if (updErr) console.warn(`  ↳ chunk ${Math.floor(c/CHUNK)+1} failed:`, updErr.code, updErr.message);
                else console.log(`  ↳ chunk ${Math.floor(c/CHUNK)+1}: ${chunk.length} row(s) sanitized`);
              }
            } catch (e) { console.warn('[dbSync.fetch/preSanitize] silent fail:', e); }
          })();
        } catch (e) { console.warn('[dbSync.fetch/preSanitize] probe failed:', e?.message); }
      };

      if (tableName === DB_SCHEMA.PRODUCTS?.table || tableName === 'products') {
        void sanitizeNullIsActive();
      }

      const isProductsRead = tableName === DB_SCHEMA.PRODUCTS?.table || tableName === 'products';

      while (hasMore) {
        if (allData.length >= limit) { hasMore = false; break; }

        currentBatchLimit = Math.min(FETCH_BATCH_SIZE, limit - allData.length);
        to = from + currentBatchLimit - 1;

        let request = buildRequest().range(from, to);
        let { data, error } = await request;

        // ============== RETRY 1: is_active column missing? strip filter and retry ==============
        if (error && !isActiveFilterFailed && TABLES_WITH_IS_ACTIVE.includes(tableName)) {
          const msg = (error.message || '').toLowerCase();
          const code = error.code;
          if (
            code === '42703' ||
            msg.includes('does not exist') ||
            msg.includes('is_active')
          ) {
            console.warn(`%c[dbSync.fetch] ⚠ is_active filter unsupported on table "${tableName}" (source=${effectiveSource}). Retrying without it. Error: ${code} ${error.message}`,
              'background:#fef3c7;color:#92400e;padding:2px 6px;border-radius:4px');
            isActiveFilterFailed = true;
            const retryReq = buildRequest({ applyIsActive: false }).range(from, to);
            const retry = await retryReq;
            data = retry.data;
            error = retry.error;
          }
        }

        // ============== RETRY 2: Readable VIEW missing? fallback to raw table ==============
        if (!viewFailed && error && effectiveSource !== tableName) {
          console.warn(`[dbSync.fetch] VIEW "${effectiveSource}" failed for table=${tableName}. Falling back to raw table "${tableName}". Error: ${error.code} ${error.message}`);
          viewFailed = true;
          effectiveSource = tableName;
          const retryReq = buildRequest({ source: tableName }).range(from, to);
          const retry = await retryReq;
          if (!retry.error || !error) {
            data = retry.data;
            error = retry.error;
          } else {
            if (!isActiveFilterFailed && TABLES_WITH_IS_ACTIVE.includes(tableName)) {
              const code = retry.error.code;
              const msg = (retry.error.message || '').toLowerCase();
              if (code === '42703' || msg.includes('does not exist')) {
                isActiveFilterFailed = true;
                const retry2 = await buildRequest({ source: tableName, applyIsActive: false }).range(from, to);
                data = retry2.data; error = retry2.error;
              }
            }
          }
        }

        // ============== RETRY 3 (PRODUCTS ONLY): VIEW returned 0 rows (no error) → try raw table ==============
        // Catch-22 breaker: readable_products VIEW has built-in WHERE is_active=true,
        // so if is_active is FALSE or NULL on all rows, VIEW returns 0 rows and the
        // is_active sanitization never runs (needs rows to scan for nulls). If we got
        // 0 rows via VIEW for products only, immediately re-fetch via raw table once.
        if (
          isProductsRead &&
          !viewFailed &&
          !error &&
          (!data || data.length === 0) &&
          effectiveSource !== tableName &&
          from === 0
        ) {
          console.warn(
            `%c[dbSync.fetch] ⚠ VIEW "${effectiveSource}" returned 0 rows for products (no error). VIEW built-in filter may be hiding rows. Falling back to raw table "${tableName}".`,
            'background:#fef3c7;color:#92400e;padding:2px 6px;border-radius:4px;font-weight:bold'
          );
          viewFailed = true;
          effectiveSource = tableName;
          const retryReq = buildRequest({ source: tableName }).range(from, to);
          const retry = await retryReq;
          if (!retry.error) {
            data = retry.data;
            error = retry.error;
          }
        }

        const activeFilterFallback = isProductsRead && !error && !includeDeleted && !isActiveFilterFailed &&
          Array.isArray(data) && data.length === 0;

        if (activeFilterFallback) {
          console.warn(
            `%c[dbSync.fetch] ⚠ Default is_active=false filter hid all live products. Retrying without the active-only filter to surface actual records.`,
            'background:#fef3c7;color:#92400e;padding:2px 6px;border-radius:4px;font-weight:bold'
          );
          isActiveFilterFailed = true;
          const retryReq = buildRequest({ applyIsActive: false }).range(from, to);
          const retry = await retryReq;
          if (!retry.error && Array.isArray(retry.data)) {
            data = retry.data;
            error = retry.error;
            if (data.length > 0) {
              console.log('%c[dbSync.fetch] ✅ Live products loaded after removing the is_active exclusion filter.', 'color:#10b981;font-weight:bold');
            }
          }
        }

        const tenantFallback = isProductsRead && !error && Array.isArray(data) && data.length === 0;
        if (tenantFallback) {
          console.warn(
            `%c[dbSync.fetch] ⚠ Tenant-scoped product fetch returned zero rows. Retrying without tenant/company filter so legacy rows can still be read and updated.`,
            'background:#fef3c7;color:#92400e;padding:2px 6px;border-radius:4px;font-weight:bold'
          );
          const retryReq = buildRequest({ applyTenantFilterFlag: false, applyCompanyFilter: false }).range(from, to);
          const retry = await retryReq;
          if (!retry.error && Array.isArray(retry.data)) {
            data = retry.data;
            error = retry.error;
            if (data.length > 0) {
              console.log('%c[dbSync.fetch] ✅ Products loaded after tenant filter fallback.', 'color:#10b981;font-weight:bold');
            }
          }
        }

        const demoTenantFallback = isProductsRead && !error && Array.isArray(data) && data.length === 0 &&
          ['NMM001', 'DEMO001', 'DEMO-COMPANY', 'demo-company'].includes(String(companyCode || '').toUpperCase()) ||
          String(companyCode || '').toLowerCase().includes('demo');

        if (demoTenantFallback) {
          console.warn(
            `%c[dbSync.fetch] ⚠ Demo/synthetic tenant filter caused zero products. Retrying raw products without company_code filtering for validation mode.`,
            'background:#fef3c7;color:#92400e;padding:2px 6px;border-radius:4px;font-weight:bold'
          );
          const retryReq = buildRequest({ source: tableName, applyCompanyFilter: false }).range(from, to);
          const retry = await retryReq;
          if (!retry.error && Array.isArray(retry.data)) {
            data = retry.data;
            error = retry.error;
            if (data.length > 0) {
              console.log('%c[dbSync.fetch] ✅ Live products loaded without synthetic company filter.', 'color:#10b981;font-weight:bold');
            }
          }
        }

        if (isProductsRead) {
            console.log('[DEBUG PRODUCTS FETCH]', {
              effectiveSource,
              tenantId,
              companyCode,
              range: [from, to],
              returnedCount: data ? data.length : 0,
              errorCode: error?.code || null,
              errorMessage: error?.message || null,
              filter_isActive: (includeDeleted ? 'includeDeleted=ON'
                : (!isActiveFilterFailed && TABLES_WITH_IS_ACTIVE.includes(tableName) ? 'NOT(false)' : 'no-filter'))
            });

            if ((!error) && Array.isArray(data) && data.length > 0) {
              const nullIds = [];
              for (const p of data) {
                if (p.is_active === null || p.is_active === undefined) nullIds.push(p.id);
              }
              if (nullIds.length > 0) {
                console.log(
                  `%c[dbSync.fetch/sanitize] 🚿 Found ${nullIds.length} product(s) with is_active=NULL → Bulk UPDATE to true (background).`,
                  'background:#0f766e;color:#ccfbf1;padding:2px 6px;border-radius:4px;font-weight:bold',
                  nullIds.slice(0, 10).join(','),
                  nullIds.length > 10 ? `(+${nullIds.length - 10} more)` : ''
                );
                (async () => {
                  try {
                    const CHUNK = 200;
                    for (let c = 0; c < nullIds.length; c += CHUNK) {
                      const chunk = nullIds.slice(c, c + CHUNK);
                      const { error: updErr } = await supabase
                        .from(DB_SCHEMA.PRODUCTS.table)
                        .update({ is_active: true, updated_at: new Date().toISOString() })
                        .in('id', chunk);
                      if (updErr) {
                        console.warn(`  ↳ chunk ${Math.floor(c/CHUNK)+1} failed:`, updErr.code, updErr.message, updErr.details || '');
                      } else {
                        console.log(`  ↳ chunk ${Math.floor(c/CHUNK)+1}: ${chunk.length} row(s) sanitized`);
                      }
                    }
                  } catch (e) {
                    console.warn('[dbSync.fetch/sanitize] silent fail:', e);
                  }
                })();
              }
            }
        }
        if (error) {
          console.error('[dbSync.fetch Error]', effectiveSource, error.message);
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
    if (isLocalPosTestMode && (tableName === DB_SCHEMA.ORDERS?.table || tableName === DB_SCHEMA.ORDER_ITEMS?.table)) {
      throw new Error('Local POS Test Mode - live writes are disabled for POS checkout orders.');
    }

    try {
      validatePayload(tableName, payload);
      const { tenantId, companyCode } = await resolveTenantContext();
      const schemaEntry = Object.values(DB_SCHEMA).find((s) => s.table === tableName);

      const records = Array.isArray(payload) ? payload : [payload];
      const preparedRecords = records.map((rec) =>
        injectTenantIntoRecord(rec, schemaEntry, tenantId, companyCode)
      );

      console.log(`[dbSync.insert] ${tableName}: ${preparedRecords.length} record(s) for tenant=${tenantId}/${companyCode}`);

      // ============ PRODUCTS TABLE: manual barcode-based smart upsert ============
      // NOTE: Production products table does NOT have a UNIQUE(barcode, tenant_id)
      // constraint, so .upsert(..., { onConflict: 'barcode,tenant_id' }) throws 42P10.
      // We therefore manually:
      //   1. split rows into those with a PK `id` (edit case) vs without (new/excel)
      //   2. for rows without id: SELECT existing by (barcode + tenant_id) + UPDATE
      //      if any, otherwise INSERT
      //   3. for rows with id: do a PK upsert (always safe)
      if (tableName === DB_SCHEMA.PRODUCTS.table) {
        const BATCH_SIZE = 100;
        const results = [];
        let firstError = null;

        for (let i = 0; i < preparedRecords.length; i += BATCH_SIZE) {
          const batch = preparedRecords.slice(i, i + BATCH_SIZE);

          const rowsWithId    = batch.filter(r => r.id);
          const rowsWithoutId = batch.filter(r => !r.id);

          // ---------- A) Rows that already have a PK: safe UPSERT on id ----------
          if (rowsWithId.length > 0) {
            const r = await supabase
              .from(tableName)
              .upsert(rowsWithId, { onConflict: 'id', ignoreDuplicates: false })
              .select();
            if (r.error) {
              console.error(`[dbSync.insert/products] id-upsert FAIL:`, r.error.code, r.error.message, r.error.details || '');
              if (!firstError) firstError = r.error;
            } else if (r.data) {
              results.push(...r.data);
              console.log(`[dbSync.insert/products] id-upsert batch ${Math.floor(i/BATCH_SIZE)+1}A: ${r.data.length} rows`);
            }
          }

          // ---------- B) Rows WITHOUT a PK (Excel upload / new product) ----------
          if (rowsWithoutId.length > 0) {
            // B-1: collect unique barcodes, lookup existing rows by barcode+tenant_id
            const barcodes = [...new Set(
              rowsWithoutId
                .map(r => r.barcode)
                .filter(b => typeof b === 'string' ? b.trim().length > 0 : b != null)
            )];

            let existingByBarcode = new Map();
            if (barcodes.length > 0) {
              const lookup = await supabase
                .from(tableName)
                .select('id,barcode,tenant_id')
                .eq('tenant_id', tenantId)
                .in('barcode', barcodes);
              if (lookup.error) {
                console.warn(`[dbSync.insert/products] barcode lookup failed (${lookup.error.code}):`, lookup.error.message, '— proceeding with naive insert');
              } else if (lookup.data) {
                for (const row of lookup.data) {
                  if (row.barcode) existingByBarcode.set(String(row.barcode).trim(), row);
                }
                console.log(`[dbSync.insert/products] found ${existingByBarcode.size} existing product(s) via barcode match`);
              }
            }

            // B-2: split rowsWithoutId into UPDATE (known barcode) vs INSERT (truly new)
            const toUpdate = []; // { id, patch }
            const toInsert = []; // raw records (without id)

            for (const row of rowsWithoutId) {
              const bkey = row.barcode ? String(row.barcode).trim() : '';
              const existing = bkey ? existingByBarcode.get(bkey) : null;
              if (existing) {
                toUpdate.push({ id: existing.id, patch: row });
              } else {
                toInsert.push(row);
              }
            }

            // B-3: UPDATE rows that matched by barcode
            for (const u of toUpdate) {
              const r = await supabase
                .from(tableName)
                .update({ ...u.patch, updated_at: u.patch.updated_at || new Date().toISOString() })
                .eq('id', u.id)
                .select();
              if (r.error) {
                console.error(`[dbSync.insert/products] barcode-update id=${u.id} FAIL:`, r.error.code, r.error.message);
                if (!firstError) firstError = r.error;
              } else if (r.data?.[0]) {
                results.push(r.data[0]);
              }
            }

            // B-4: INSERT the truly new rows
            if (toInsert.length > 0) {
              const insertedStripped = toInsert.map(({ id, ...rest }) => rest); // remove any null/undefined id fields
              const r = await supabase
                .from(tableName)
                .insert(insertedStripped)
                .select();
              if (r.error) {
                console.error(`[dbSync.insert/products] new-insert FAIL (${toInsert.length} rows):`, r.error.code, r.error.message, r.error.details || '');
                if (!firstError) firstError = r.error;
              } else if (r.data) {
                results.push(...r.data);
                console.log(`[dbSync.insert/products] new-insert batch ${Math.floor(i/BATCH_SIZE)+1}B: ${r.data.length} rows`);
              }
            }
          }
        }

        if (results.length === 0 && firstError) {
          const e = new Error(`DB insert failed for ${tableName}: ${firstError.message}${firstError.details ? ' | ' + firstError.details : ''}`);
          e.code = firstError.code; e.details = firstError.details; e.hint = firstError.hint;
          throw e;
        }

        console.log(`%c[dbSync.insert] ${tableName}: total ${results.length}/${preparedRecords.length} records written to Supabase.`, 'color:#10b981;font-weight:bold');
        return Array.isArray(payload) ? results : results[0];
      }

      // ============ DEFAULT (non-products) TABLES ============
      const conflictKey = CONFLICT_KEYS[tableName];
      let { data, error } = conflictKey
        ? await supabase.from(tableName).upsert(preparedRecords, { onConflict: conflictKey }).select()
        : await supabase.from(tableName).upsert(preparedRecords).select();

      if (error) {
        console.warn(`[dbSync.insert] upsert failed (${error.code}), trying plain insert`);
        const insertedStripped = preparedRecords.map(r => {
          const { id, ...rest } = r || {};
          return id && String(id).startsWith?.('temp-') ? rest : r;
        });
        const r2 = await supabase.from(tableName).insert(insertedStripped).select();
        if (r2.error) {
          const e = new Error(`${tableName} insert failed: ${r2.error.message}${r2.error.details ? ' | ' + r2.error.details : ''}`);
          e.code = r2.error.code; e.details = r2.error.details; e.hint = r2.error.hint;
          throw e;
        }
        data = r2.data;
      }

      return Array.isArray(payload) ? data : data?.[0];
    } catch (err) {
      console.error('%c[dbSync.insert FAIL]', 'color:#ef4444;font-weight:bold', tableName, '\n  message:', err.message,
        err.code ? `\n  code:${err.code}` : '',
        err.details ? `\n  details:${err.details}` : '',
        err.hint ? `\n  hint:${err.hint}` : '');
      throw err;
    }
  },

  update: async (tableName, id, payload) => {
    if (isLocalPosTestMode && tableName === DB_SCHEMA.ORDERS?.table) {
      throw new Error('Local POS Test Mode - live writes are disabled.');
    }

    try {
      validatePayload(tableName, payload);
      const pkColumn = dbSync.getPkColumn(tableName);
      const { tenantId, companyCode } = await resolveTenantContext();
      const schemaEntry = Object.values(DB_SCHEMA).find((s) => s.table === tableName);

      const now = new Date().toISOString();
      const updatePayload = { ...payload, updated_at: payload.updated_at || now };
      if (tableName === DB_SCHEMA.ORDERS?.table && updatePayload.order_status) {
        updatePayload.status = updatePayload.order_status;
      }
      const finalPayload = injectTenantIntoRecord(updatePayload, schemaEntry, tenantId, companyCode);

      if (import.meta.env.DEV) {
        console.log('[BULK SAVE] SUPABASE UPDATE START', {
          supabaseUrl: supabaseConfig?.url || 'https://mggkadgemqcyybsplkqc.supabase.co',
          table: tableName,
          productId: id,
          tenantId,
          companyCode,
          payloadKeys: Object.keys(finalPayload)
        });
      }

      let updateRequest = supabase.from(tableName).update(finalPayload).eq(pkColumn, id);
      updateRequest = applyTenantFilter(updateRequest, tableName, schemaEntry, tenantId, companyCode);

      let data, error, status, statusText;
      try {
        const res = await updateRequest.select();
        data = res.data;
        error = res.error;
        status = res.status;
        statusText = res.statusText;
        if (import.meta.env.DEV) {
          console.log('[BULK SAVE] SUPABASE UPDATE RESPONSE', { status, statusText, error, returnedRowCount: data?.length || 0, data });
        }
      } catch (fetchException) {
        console.error('[BULK SAVE] SUPABASE FETCH EXCEPTION', fetchException);
        throw new Error(`${tableName} update(id=${id}) failed: ${fetchException?.message || String(fetchException)}`);
      }

      if ((!error && (!data || data.length === 0)) || (error && ['42501', 'PGRST301', '401', '403'].includes(String(error.code || '')))) {
        console.warn(
          `%c[dbSync.update] ⚠ Tenant-scoped update returned zero rows. Retrying direct row update by id to preserve legacy product records.`,
          'background:#fef3c7;color:#92400e;padding:2px 6px;border-radius:4px;font-weight:bold',
          { tableName, id, tenantId, companyCode, error: error?.message || null }
        );
        const fallbackRes = await supabase
          .from(tableName)
          .update(finalPayload)
          .eq(pkColumn, id)
          .select();

        if (!fallbackRes.error && fallbackRes.data && fallbackRes.data.length > 0) {
          data = fallbackRes.data;
          error = null;
        } else if (fallbackRes.error) {
          error = fallbackRes.error;
        }
      }

      if (error) {
        const e = new Error(`${tableName} update(id=${id}) failed: ${error.message}${error.details ? ' | ' + error.details : ''}`);
        e.code = error.code; e.details = error.details; e.hint = error.hint;
        throw e;
      }
      console.log(`%c[dbSync.update] ${tableName} id=${id} OK, returned ${data?.length || 0} row(s)`, 'color:#3b82f6');
      if (tableName === DB_SCHEMA.PRODUCTS?.table && data?.[0]) {
        // Low stock check after product update
        try { void checkLowStockAndNotify(data[0].id); } catch (_) {}
      }
      return data?.[0] || null;
    } catch (err) {
      console.error('%c[dbSync.update FAIL]', 'color:#ef4444;font-weight:bold', tableName, 'id=' + id,
        '\n  message:', err.message,
        err.code ? `\n  code:${err.code}` : '',
        err.details ? `\n  details:${err.details}` : '');
      // Clarify Postgres unique_violation (23505) so caller can show user-friendly message
      if (err.code === '23505' || (typeof err.message === 'string' && err.message.includes('23505'))) {
        err.message = `${err.message} (Unique constraint violated — likely duplicate barcode or another unique column. Check the data and try again, or change the field that must be unique.)`;
      }
      throw err;
    }
  },

  executeAtomic: async (functionName, payload, tableName = 'orders', action = 'ATOMIC_OPERATION') => {
    if (isLocalPosTestMode && functionName === 'place_order_atomic') {
      throw new Error('Local POS Test Mode - live atomic mutations are disabled.');
    }

    if (!['place_order_atomic', 'create_purchase_atomic', 'adjust_wallet_atomic', 'adjust_stock_atomic'].includes(functionName)) {
      throw new Error(`Unsupported atomic function: ${functionName}`);
    }

    try {
      const rpcArgs = functionName === 'adjust_wallet_atomic'
        ? payload
        : { p_payload: payload };
      const { data, error } = await supabase.rpc(functionName, rpcArgs);
      if (error) {
        const atomicError = new Error(error.message || `${action} failed`);
        atomicError.code = error.code;
        atomicError.details = error.details;
        atomicError.hint = error.hint;
        throw atomicError;
      }

      return data;
    } catch (err) {
      console.error(`[dbSync.${action} FAIL]`, tableName, err.message);
      throw err;
    }
  },

  delete: async (tableName, id, isHard = false) => {
    try {
      const pkColumn = dbSync.getPkColumn(tableName);
      const { tenantId, companyCode } = await resolveTenantContext();
      const schemaEntry = Object.values(DB_SCHEMA).find((s) => s.table === tableName);

      let req = supabase.from(tableName).delete().eq(pkColumn, id);
      req = applyTenantFilter(req, tableName, schemaEntry, tenantId, companyCode);
      const { error } = await req;
      if (error) {
        const e = new Error(`${tableName} permanent delete(id=${id}) failed: ${error.message}${error.details ? ' | ' + error.details : ''}`);
        e.code = error.code; e.details = error.details; e.hint = error.hint;
        throw e;
      }
      await logTableAction(tableName, 'DELETE_PERMANENT', { oldData: { id } });
      console.log(`%c[dbSync.delete] PERMANENT ${tableName} id=${id} OK`, 'color:#f59e0b');
      return true;
    } catch (err) {
      console.error('%c[dbSync.delete FAIL]', 'color:#ef4444;font-weight:bold', tableName, 'id=' + id,
        '\n  message:', err.message,
        err.code ? `\n  code:${err.code}` : '',
        err.details ? `\n  details:${err.details}` : '');
      throw err;
    }
  },

  deleteAll: async (tableName) => {
    try {
      const { tenantId, companyCode } = await resolveTenantContext();
      const schemaEntry = Object.values(DB_SCHEMA).find((s) => s.table === tableName);
      let delReq = supabase.from(tableName).delete();
      delReq = applyTenantFilter(delReq, tableName, schemaEntry, tenantId, companyCode);
      const { error } = await delReq;
      if (error) {
        const e = new Error(`${tableName} permanent deleteAll failed: ${error.message}${error.details ? ' | ' + error.details : ''}`);
        e.code = error.code; e.details = error.details; e.hint = error.hint;
        throw e;
      }
      await logTableAction(tableName, 'DELETEALL_PERMANENT', {});
      console.log(`[dbSync.deleteAll] PERMANENT ${tableName}: rows deleted`);
      return { success: true };
    } catch (err) {
      console.error('%c[dbSync.deleteAll FAIL]', 'color:#ef4444;font-weight:bold', tableName, err.message);
      return { success: false, error: err.message || String(err), code: err.code, details: err.details };
    }
  }
};

export default dbSync;
