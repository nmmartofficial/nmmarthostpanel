-- =====================================================================
-- NM MART ULTRA RETAIL ERP — CONSOLIDATED MASTER SCHEMA v3.0
-- Supabase PostgreSQL | UUID-FREE (BIGSERIAL/BIGINT All PKs)
-- Multi-Tenant SaaS | RLS Enforced | 38 Tables + 4 RPCs + 7 Views
-- Single-Run File: Copy-Paste directly into Supabase SQL Editor
-- =====================================================================
-- EXECUTION ORDER IS CRITICAL (FK dependencies):
--   0. Extensions + Utility Functions
--   1. Core Tenant Table (companies)
--   2. Catalog Master Tables (unit, category, subcat, brand, dept, hsn)
--   3. Products + Stock Logs
--   4. Account Master (Suppliers + Customers) → Purchases
--   5. Users: Admin, App Users, Delivery Customers, Boys
--   6. Sales: Orders + Order Items + Payment Transactions
--   7. Wallet, Credit, Expenses, Finance
--   8. Logistics: Pincodes, Addresses
--   9. Loyalty + Marketing: Tiers, Coupons, Offers, Banners
--  10. System: App Config, Home Config, Cart, Wishlist
--  11. Audit: System Logs, Notifications, Support Tickets
--  12. RPC Functions (verify_admin_pin, verify_admin_password FIXED, adjust_wallet, place_order)
--  13. Triggers (updated_at + inject_tenant_context)
--  14. Row Level Security ENABLE + CRUD Policies
--  15. Readable Views + GRANT SELECT
--  16. Seed / Reference Data
--  17. Final GRANT permissions
-- =====================================================================

BEGIN;

-- =====================================================================
-- 0. EXTENSIONS
-- =====================================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";

-- =====================================================================
-- 0.1  UNIVERSAL updated_at TRIGGER FUNCTION
-- =====================================================================
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql VOLATILE;

-- =====================================================================
-- 0.2  INJECT TENANT CONTEXT ON INSERT (DB-LEVEL SAFETY NET)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.inject_tenant_context_on_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_tid  BIGINT; v_cc TEXT; v_aid BIGINT;
BEGIN
  IF to_regclass(TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME) IS NOT NULL
     AND EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_schema = TG_TABLE_SCHEMA
                    AND table_name   = TG_TABLE_NAME
                    AND column_name  = 'tenant_id') THEN
    IF NEW.tenant_id IS NULL THEN
      BEGIN v_tid := current_setting('app.current_tenant_id', true)::BIGINT;
      EXCEPTION WHEN OTHERS THEN v_tid := NULL; END;
      IF v_tid IS NOT NULL THEN NEW.tenant_id := v_tid; END IF;
    END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = TG_TABLE_SCHEMA
               AND table_name   = TG_TABLE_NAME
               AND column_name  = 'company_code') THEN
    IF NEW.company_code IS NULL THEN
      BEGIN v_cc := current_setting('app.current_company_code', true);
      EXCEPTION WHEN OTHERS THEN v_cc := NULL; END;
      IF v_cc IS NOT NULL THEN NEW.company_code := SUBSTRING(v_cc FROM 1 FOR 16); END IF;
    END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = TG_TABLE_SCHEMA
               AND table_name   = TG_TABLE_NAME
               AND column_name  = 'created_by') THEN
    IF NEW.created_by IS NULL THEN
      BEGIN v_aid := current_setting('app.current_admin_id', true)::BIGINT;
      EXCEPTION WHEN OTHERS THEN v_aid := NULL; END;
      IF v_aid IS NOT NULL THEN NEW.created_by := v_aid; END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql VOLATILE;

CREATE OR REPLACE FUNCTION public.install_inject_tenant_triggers_on_all()
RETURNS VOID AS $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT table_schema, table_name FROM information_schema.columns
           WHERE table_schema = 'public' AND column_name = 'tenant_id'
             AND table_name NOT IN ('companies')
           GROUP BY table_schema, table_name ORDER BY table_name LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I_inject_tenant_before_insert ON public.%I;',
                   r.table_name, r.table_name);
    EXECUTE format('CREATE TRIGGER %I_inject_tenant_before_insert
                    BEFORE INSERT ON public.%I
                    FOR EACH ROW EXECUTE FUNCTION public.inject_tenant_context_on_insert();',
                   r.table_name, r.table_name);
  END LOOP;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- =====================================================================
-- 0.3  RLS HELPER FUNCTIONS
-- =====================================================================
CREATE OR REPLACE FUNCTION public.current_company_code()
RETURNS TEXT LANGUAGE sql STABLE AS $$
  SELECT COALESCE(
    NULLIF(current_setting('request.jwt.claims', true)::jsonb ->> 'company_code', ''),
    NULLIF(current_setting('request.jwt.claims', true)::jsonb ->> 'companyCode', ''),
    'DEFAULT'
  );
$$;

CREATE OR REPLACE FUNCTION public.matches_company_scope(p_company_code TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
  SELECT (
    auth.role() = 'service_role'
    OR COALESCE(p_company_code, 'DEFAULT') = 'DEFAULT'
    OR public.current_company_code() = COALESCE(p_company_code, 'DEFAULT')
  );
$$;

-- =====================================================================
-- 1.  COMPANIES (GLOBAL TENANT ROOT — no tenant_id, no parent FK)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.companies (
  id                BIGSERIAL PRIMARY KEY,
  name              VARCHAR(150) NOT NULL,
  company_slug      VARCHAR(60)  UNIQUE NOT NULL,
  company_code      VARCHAR(16)  UNIQUE NOT NULL,
  address           TEXT,
  phone             VARCHAR(20),
  email             VARCHAR(150),
  gstin             VARCHAR(15),
  pan_no            VARCHAR(10),
  currency_code     VARCHAR(3)   DEFAULT 'INR',
  timezone          VARCHAR(50)  DEFAULT 'Asia/Kolkata',
  logo_url          TEXT,
  is_active         BOOLEAN      DEFAULT TRUE,
  status            VARCHAR(16)  DEFAULT 'active',
  subscription_plan VARCHAR(30)  DEFAULT 'free',
  subscription_end  TIMESTAMPTZ,
  theme_config      JSONB        DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ  DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_companies_slug ON public.companies (company_slug);
CREATE INDEX IF NOT EXISTS idx_companies_code ON public.companies (company_code);

-- =====================================================================
-- 2.  CATALOG MASTER TABLES (Lookup / Dropdown data)
-- =====================================================================

-- 2.1  unit_master  —  kg, g, pcs, litre, dozen, box etc.
CREATE TABLE IF NOT EXISTS public.unit_master (
  id           BIGSERIAL PRIMARY KEY,
  tenant_id    BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  company_code VARCHAR(16) NOT NULL,
  name         VARCHAR(50) NOT NULL,
  symbol       VARCHAR(10) NOT NULL,
  short_name   VARCHAR(10),
  code         VARCHAR(20),
  sort_order   SMALLINT DEFAULT 0,
  is_active    BOOLEAN  DEFAULT TRUE,
  is_deleted   BOOLEAN  DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, symbol)
);
CREATE INDEX IF NOT EXISTS idx_unit_master_tenant ON public.unit_master (tenant_id, company_code);

-- 2.2  categories
CREATE TABLE IF NOT EXISTS public.categories (
  id           BIGSERIAL PRIMARY KEY,
  tenant_id    BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  company_code VARCHAR(16) NOT NULL,
  name         VARCHAR(100) NOT NULL,
  description  TEXT,
  image_url    TEXT,
  sort_order   SMALLINT DEFAULT 0,
  is_active    BOOLEAN  DEFAULT TRUE,
  is_deleted   BOOLEAN  DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_categories_tenant ON public.categories (tenant_id, company_code);
CREATE INDEX IF NOT EXISTS idx_categories_active ON public.categories (tenant_id, is_active);

-- 2.3  subcategories
CREATE TABLE IF NOT EXISTS public.subcategories (
  id            BIGSERIAL PRIMARY KEY,
  tenant_id     BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  company_code  VARCHAR(16) NOT NULL,
  category_id   BIGINT REFERENCES public.categories(id) ON DELETE SET NULL,
  name          VARCHAR(100) NOT NULL,
  description   TEXT,
  image_url     TEXT,
  sort_order    SMALLINT DEFAULT 0,
  is_active     BOOLEAN  DEFAULT TRUE,
  is_deleted    BOOLEAN  DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_subcategories_tenant ON public.subcategories (tenant_id, company_code);
CREATE INDEX IF NOT EXISTS idx_subcategories_cat    ON public.subcategories (category_id);

-- 2.4  brands
CREATE TABLE IF NOT EXISTS public.brands (
  id           BIGSERIAL PRIMARY KEY,
  tenant_id    BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  company_code VARCHAR(16) NOT NULL,
  name         VARCHAR(100) NOT NULL,
  code         VARCHAR(30),
  description  TEXT,
  logo_url     TEXT,
  is_active    BOOLEAN  DEFAULT TRUE,
  is_deleted   BOOLEAN  DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_brands_tenant ON public.brands (tenant_id, company_code);

-- 2.5  department_master (Store Floors / Sections)
CREATE TABLE IF NOT EXISTS public.department_master (
  id           BIGSERIAL PRIMARY KEY,
  tenant_id    BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  company_code VARCHAR(16) NOT NULL,
  name         VARCHAR(100) NOT NULL,
  code         VARCHAR(20),
  description  TEXT,
  is_active    BOOLEAN  DEFAULT TRUE,
  is_deleted   BOOLEAN  DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_department_tenant ON public.department_master (tenant_id, company_code);

-- 2.6  hsn_master (GST HSN reference)
CREATE TABLE IF NOT EXISTS public.hsn_master (
  id            BIGSERIAL PRIMARY KEY,
  hsn_code      VARCHAR(10) UNIQUE NOT NULL,
  description   TEXT,
  gst_percent   DECIMAL(5,2) DEFAULT 0,
  cess_percent  DECIMAL(5,2) DEFAULT 0,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================
-- 3.  PRODUCTS (CORE INVENTORY TABLE) + Stock Logs + Alerts
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.products (
  -- Primary keys + Tenant
  id               BIGSERIAL PRIMARY KEY,
  tenant_id        BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  company_code     VARCHAR(16) NOT NULL,
  -- Identifiers + Display (modern + legacy dual cols)
  name             VARCHAR(200) NOT NULL,
  itname           VARCHAR(200),
  print_name       VARCHAR(100),
  itnameprint      VARCHAR(100),
  description      TEXT,
  itemdescription  TEXT,
  barcode          VARCHAR(50),
  hsn_code         VARCHAR(10),
  hsncode          VARCHAR(10),
  image_url        TEXT,
  imagename        TEXT,
  picture          TEXT,
  -- Relational FKs
  category_id      BIGINT REFERENCES public.categories(id)          ON DELETE SET NULL,
  subcategory_id   BIGINT REFERENCES public.subcategories(id)       ON DELETE SET NULL,
  brand_id         BIGINT REFERENCES public.brands(id)              ON DELETE SET NULL,
  -- Pricing (6 Rates)
  purchase_rate    DECIMAL(12,2) DEFAULT 0,
  purcrate         DECIMAL(12,2) DEFAULT 0,
  mrp              DECIMAL(12,2) DEFAULT 0,
  retail_rate      DECIMAL(12,2) DEFAULT 0,
  restrate         DECIMAL(12,2) DEFAULT 0,
  take_rate        DECIMAL(12,2) DEFAULT 0,
  takerate         DECIMAL(12,2) DEFAULT 0,
  delivery_rate    DECIMAL(12,2) DEFAULT 0,
  dlvrate          DECIMAL(12,2) DEFAULT 0,
  sale_rate        DECIMAL(12,2) DEFAULT 0,
  onlinerate       DECIMAL(12,2) DEFAULT 0,
  -- Stock
  stock            DECIMAL(12,3) DEFAULT 0,
  opstock          DECIMAL(12,3) DEFAULT 0,
  low_stock_threshold DECIMAL(12,3) DEFAULT 0,
  unitcode         VARCHAR(20),
  unit_name        VARCHAR(50),
  category_name    VARCHAR(100),
  brand_name       VARCHAR(100),
  -- Taxes + Discounts
  gst_percent      DECIMAL(5,2) DEFAULT 0,
  gst              DECIMAL(5,2) DEFAULT 0,
  cess_percent     DECIMAL(5,2) DEFAULT 0,
  cess             DECIMAL(5,2) DEFAULT 0,
  discount_percent DECIMAL(5,2) DEFAULT 0,
  discperc         DECIMAL(5,2) DEFAULT 0,
  is_discountable  BOOLEAN DEFAULT TRUE,
  isdiscountable   BOOLEAN DEFAULT TRUE,
  -- Flags
  is_favourite     BOOLEAN DEFAULT FALSE,
  isfav            BOOLEAN DEFAULT FALSE,
  is_package       BOOLEAN DEFAULT FALSE,
  ispackage        BOOLEAN DEFAULT FALSE,
  item_status      TEXT DEFAULT 'active',
  itemstatus       SMALLINT DEFAULT 1,
  is_active        BOOLEAN DEFAULT TRUE,
  is_deleted       BOOLEAN DEFAULT FALSE,
  -- Narration + Legacy Codes
  narration        VARCHAR(500),
  narration2       VARCHAR(500),
  shop_id          VARCHAR(20),
  shopid           VARCHAR(20),
  itg              VARCHAR(20),
  itc              VARCHAR(20),
  dtcode           VARCHAR(20),
  kcode            VARCHAR(20),
  brandcode        VARCHAR(20),
  -- Timestamps
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  -- Constraints
  CONSTRAINT chk_stock_nonneg           CHECK (stock >= 0),
  CONSTRAINT chk_retail_not_over_mrp    CHECK (retail_rate <= mrp)
);
CREATE INDEX IF NOT EXISTS idx_products_tenant   ON public.products (tenant_id, company_code);
CREATE INDEX IF NOT EXISTS idx_products_active   ON public.products (tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_products_barcode  ON public.products (tenant_id, barcode);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products (category_id);
CREATE INDEX IF NOT EXISTS idx_products_name     ON public.products (tenant_id, name);
CREATE UNIQUE INDEX IF NOT EXISTS uq_products_barcode_tenant
  ON public.products (tenant_id, barcode) WHERE barcode IS NOT NULL;

-- 3.2  stock_alerts
CREATE TABLE IF NOT EXISTS public.stock_alerts (
  id             BIGSERIAL PRIMARY KEY,
  tenant_id      BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  company_code   VARCHAR(16) NOT NULL,
  product_id     BIGINT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  alert_type     VARCHAR(20) DEFAULT 'low_stock',
  threshold      DECIMAL(12,3) DEFAULT 0,
  current_stock  DECIMAL(12,3),
  message        TEXT,
  is_active      BOOLEAN DEFAULT TRUE,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_stock_alerts_tenant  ON public.stock_alerts (tenant_id, company_code);
CREATE INDEX IF NOT EXISTS idx_stock_alerts_product ON public.stock_alerts (product_id);

-- 3.3  inventory_logs  (Stock Movement Ledger)
CREATE TABLE IF NOT EXISTS public.inventory_logs (
  id                BIGSERIAL PRIMARY KEY,
  tenant_id         BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  company_code      VARCHAR(16) NOT NULL,
  product_id        BIGINT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  old_stock         DECIMAL(12,3) DEFAULT 0,
  new_stock         DECIMAL(12,3) DEFAULT 0,
  change_qty        DECIMAL(12,3) NOT NULL,
  change_type       VARCHAR(20) NOT NULL,
  reference_id      BIGINT,
  reference_number  VARCHAR(50),
  admin_user_id     BIGINT,
  narration         TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_inv_logs_tenant  ON public.inventory_logs (tenant_id, company_code);
CREATE INDEX IF NOT EXISTS idx_inv_logs_product ON public.inventory_logs (product_id);
CREATE INDEX IF NOT EXISTS idx_inv_logs_ref     ON public.inventory_logs (reference_id);
CREATE INDEX IF NOT EXISTS idx_inv_logs_created ON public.inventory_logs (tenant_id, created_at DESC);

-- =====================================================================
-- 4.  ACCOUNTS PAYABLE / PURCHASES
-- =====================================================================

-- 4.1  account_master — TRIPLE USE: Suppliers + Customers + Bank/Cash Accounts
CREATE TABLE IF NOT EXISTS public.account_master (
  id               BIGSERIAL PRIMARY KEY,
  tenant_id        BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  company_code     VARCHAR(16) NOT NULL,
  name             VARCHAR(150) NOT NULL,
  account_type     VARCHAR(30) NOT NULL,
  type             VARCHAR(10),
  mobile           VARCHAR(20),
  phone            VARCHAR(20),
  email            VARCHAR(150),
  address          TEXT,
  gst_no           VARCHAR(15),
  pan_no           VARCHAR(10),
  opening_balance  DECIMAL(14,2) DEFAULT 0,
  balance          DECIMAL(14,2) DEFAULT 0,
  credit_limit     DECIMAL(14,2) DEFAULT 0,
  is_active        BOOLEAN DEFAULT TRUE,
  is_deleted       BOOLEAN DEFAULT FALSE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_accounts_tenant ON public.account_master (tenant_id, company_code);
CREATE INDEX IF NOT EXISTS idx_accounts_type   ON public.account_master (tenant_id, account_type);
CREATE INDEX IF NOT EXISTS idx_accounts_name   ON public.account_master (tenant_id, name);
CREATE INDEX IF NOT EXISTS idx_accounts_mobile ON public.account_master (tenant_id, mobile);

-- 4.2  purchases
CREATE TABLE IF NOT EXISTS public.purchases (
  id                 BIGSERIAL PRIMARY KEY,
  tenant_id          BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  company_code       VARCHAR(16) NOT NULL,
  supplier_id        BIGINT REFERENCES public.account_master(id) ON DELETE SET NULL,
  invoice_number     VARCHAR(50),
  invoice_date       DATE,
  payment_status     VARCHAR(20) DEFAULT 'unpaid',
  status             VARCHAR(20) DEFAULT 'draft',
  subtotal           DECIMAL(14,2) DEFAULT 0,
  gst_amount         DECIMAL(14,2) DEFAULT 0,
  discount_amount    DECIMAL(14,2) DEFAULT 0,
  round_off          DECIMAL(10,2) DEFAULT 0,
  total_amount       DECIMAL(14,2) DEFAULT 0,
  paid_amount        DECIMAL(14,2) DEFAULT 0,
  balance_due        DECIMAL(14,2) DEFAULT 0,
  tax_type           VARCHAR(10) DEFAULT 'Exclude',
  notes              TEXT,
  admin_user_id      BIGINT,
  is_deleted         BOOLEAN DEFAULT FALSE,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_purchases_tenant   ON public.purchases (tenant_id, company_code);
CREATE INDEX IF NOT EXISTS idx_purchases_supplier ON public.purchases (supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchases_invoice  ON public.purchases (tenant_id, invoice_number);
CREATE INDEX IF NOT EXISTS idx_purchases_status   ON public.purchases (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_purchases_date     ON public.purchases (tenant_id, invoice_date DESC);

-- 4.3  purchase_items
CREATE TABLE IF NOT EXISTS public.purchase_items (
  id                 BIGSERIAL PRIMARY KEY,
  tenant_id          BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  company_code       VARCHAR(16) NOT NULL,
  purchase_id        BIGINT NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
  product_id         BIGINT REFERENCES public.products(id) ON DELETE SET NULL,
  product_name_snapshot VARCHAR(200),
  quantity           DECIMAL(12,3) DEFAULT 0,
  rate               DECIMAL(12,2) DEFAULT 0,
  gst_percent        DECIMAL(5,2)  DEFAULT 0,
  gst_amount         DECIMAL(12,2) DEFAULT 0,
  discount_percent   DECIMAL(5,2)  DEFAULT 0,
  discount_amount    DECIMAL(12,2) DEFAULT 0,
  total              DECIMAL(14,2) DEFAULT 0,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_purchase_items_tenant   ON public.purchase_items (tenant_id, company_code);
CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase ON public.purchase_items (purchase_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_product  ON public.purchase_items (product_id);

-- =====================================================================
-- 5.  USERS / ADMINS / STAFF
-- =====================================================================

-- 5.1  admin_users  —  auth_user_id stays UUID (links to Supabase auth.users.id)
CREATE TABLE IF NOT EXISTS public.admin_users (
  id               BIGSERIAL PRIMARY KEY,
  tenant_id        BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  company_code     VARCHAR(16) NOT NULL,
  auth_user_id     UUID UNIQUE,
  username         VARCHAR(50) NOT NULL,
  name             VARCHAR(100),
  email            VARCHAR(150),
  phone            VARCHAR(20),
  password_hash    VARCHAR(255),
  role             VARCHAR(30) DEFAULT 'cashier',
  permissions      JSONB DEFAULT '{}'::jsonb,
  is_active        BOOLEAN DEFAULT TRUE,
  status           VARCHAR(16) DEFAULT 'active',
  last_login_at    TIMESTAMPTZ,
  last_login_ip    VARCHAR(45),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, username)
);
CREATE INDEX IF NOT EXISTS idx_admin_users_tenant ON public.admin_users (tenant_id, company_code);
CREATE INDEX IF NOT EXISTS idx_admin_users_role   ON public.admin_users (tenant_id, role);

-- 5.2  users  —  App / End Customers
CREATE TABLE IF NOT EXISTS public.users (
  id                 BIGSERIAL PRIMARY KEY,
  tenant_id          BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  company_code       VARCHAR(16) NOT NULL,
  name               VARCHAR(100) NOT NULL,
  email              VARCHAR(150),
  phone              VARCHAR(20) NOT NULL,
  password_hash      VARCHAR(255),
  gender             VARCHAR(10),
  dob                DATE,
  address            TEXT,
  pincode            VARCHAR(10),
  referral_code      VARCHAR(20),
  referred_by_user_id BIGINT REFERENCES public.users(id) ON DELETE SET NULL,
  is_active          BOOLEAN DEFAULT TRUE,
  signup_source      VARCHAR(20) DEFAULT 'app',
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_tenant   ON public.users (tenant_id, company_code);
CREATE INDEX IF NOT EXISTS idx_users_phone    ON public.users (tenant_id, phone);
CREATE INDEX IF NOT EXISTS idx_users_referral ON public.users (referral_code);

-- 5.3  delivery_customer_master  —  Shop Credit / Walk-in Udhaar
CREATE TABLE IF NOT EXISTS public.delivery_customer_master (
  id              BIGSERIAL PRIMARY KEY,
  tenant_id       BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  company_code    VARCHAR(16) NOT NULL,
  name            VARCHAR(100) NOT NULL,
  phone           VARCHAR(20),
  email           VARCHAR(150),
  address         TEXT,
  pincode         VARCHAR(10),
  credit_limit    DECIMAL(12,2) DEFAULT 0,
  current_due     DECIMAL(12,2) DEFAULT 0,
  is_active       BOOLEAN DEFAULT TRUE,
  is_deleted      BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dc_master_tenant ON public.delivery_customer_master (tenant_id, company_code);
CREATE INDEX IF NOT EXISTS idx_dc_master_phone  ON public.delivery_customer_master (tenant_id, phone);

-- 5.4  delivery_boy_master
CREATE TABLE IF NOT EXISTS public.delivery_boy_master (
  id                BIGSERIAL PRIMARY KEY,
  tenant_id         BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  company_code      VARCHAR(16) NOT NULL,
  name              VARCHAR(100) NOT NULL,
  phone             VARCHAR(20),
  email             VARCHAR(150),
  address           TEXT,
  vehicle_number    VARCHAR(20),
  vehicle_type      VARCHAR(20),
  license_number    VARCHAR(20),
  aadhaar_number    VARCHAR(20),
  is_active         BOOLEAN DEFAULT TRUE,
  is_deleted        BOOLEAN DEFAULT FALSE,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dboy_tenant ON public.delivery_boy_master (tenant_id, company_code);

-- =====================================================================
-- 6.  SALES / ORDERS / POS
-- =====================================================================

-- 6.1  orders  (3-in-1: POS Counter + Online App + Home Delivery)
CREATE TABLE IF NOT EXISTS public.orders (
  id                     BIGSERIAL PRIMARY KEY,
  tenant_id              BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  company_code           VARCHAR(16) NOT NULL,
  order_number           VARCHAR(30) UNIQUE NOT NULL,
  order_type             VARCHAR(20) DEFAULT 'pos_counter',
  user_id                BIGINT REFERENCES public.users(id) ON DELETE SET NULL,
  customer_name          VARCHAR(100),
  user_mobile            VARCHAR(20),
  delivery_address       TEXT,
  pincode                VARCHAR(10),
  -- Totals
  subtotal               DECIMAL(14,2) DEFAULT 0,
  discount               DECIMAL(14,2) DEFAULT 0,
  coupon_discount        DECIMAL(14,2) DEFAULT 0,
  delivery_charge        DECIMAL(10,2) DEFAULT 0,
  packaging_charge       DECIMAL(10,2) DEFAULT 0,
  cgst_amount            DECIMAL(12,2) DEFAULT 0,
  sgst_amount            DECIMAL(12,2) DEFAULT 0,
  igst_amount            DECIMAL(12,2) DEFAULT 0,
  cess_amount            DECIMAL(12,2) DEFAULT 0,
  round_off              DECIMAL(10,2) DEFAULT 0,
  total_amount           DECIMAL(14,2) DEFAULT 0,
  -- Payment + Status
  payment_method         VARCHAR(20) DEFAULT 'cash',
  payment_status         VARCHAR(20) DEFAULT 'pending',
  order_status           VARCHAR(25) DEFAULT 'pending',
  coupon_id              BIGINT,
  delivery_boy_id        BIGINT,
  cashier_admin_user_id  BIGINT,
  notes                  TEXT,
  invoice_generated      BOOLEAN DEFAULT FALSE,
  invoice_printed_at     TIMESTAMPTZ,
  delivered_at           TIMESTAMPTZ,
  cancelled_at           TIMESTAMPTZ,
  source_ip              VARCHAR(45),
  is_deleted             BOOLEAN DEFAULT FALSE,
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT chk_order_status CHECK (order_status IN
      ('pending','confirmed','packed','out_for_delivery','delivered','cancelled','returned')),
  CONSTRAINT chk_payment_method CHECK (payment_method IN
      ('cash','upi','card','wallet','credit','mixed'))
);
CREATE INDEX IF NOT EXISTS idx_orders_tenant    ON public.orders (tenant_id, company_code);
CREATE INDEX IF NOT EXISTS idx_orders_number    ON public.orders (tenant_id, order_number);
CREATE INDEX IF NOT EXISTS idx_orders_user      ON public.orders (user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status    ON public.orders (tenant_id, order_status);
CREATE INDEX IF NOT EXISTS idx_orders_created   ON public.orders (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_paystatus ON public.orders (tenant_id, payment_status);

-- 6.2  order_items
CREATE TABLE IF NOT EXISTS public.order_items (
  id                BIGSERIAL PRIMARY KEY,
  tenant_id         BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  company_code      VARCHAR(16) NOT NULL,
  order_id          BIGINT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id        BIGINT REFERENCES public.products(id) ON DELETE SET NULL,
  product_name      VARCHAR(200),
  hsn_code_snapshot VARCHAR(10),
  quantity          DECIMAL(12,3) DEFAULT 0,
  qty               DECIMAL(12,3) DEFAULT 0,
  rate              DECIMAL(12,2) DEFAULT 0,
  price             DECIMAL(12,2) DEFAULT 0,
  discount_percent  DECIMAL(5,2)  DEFAULT 0,
  discount_amount   DECIMAL(12,2) DEFAULT 0,
  gst_percent       DECIMAL(5,2)  DEFAULT 0,
  gst_amount        DECIMAL(12,2) DEFAULT 0,
  total             DECIMAL(14,2) DEFAULT 0,
  is_returned       BOOLEAN DEFAULT FALSE,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_order_items_tenant  ON public.order_items (tenant_id, company_code);
CREATE INDEX IF NOT EXISTS idx_order_items_order   ON public.order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON public.order_items (product_id);

-- 6.3  payment_transactions  (Dual-entry Payments Ledger — v3.1 FIXED / UNIFIED)
-- NOTE: Second duplicate definition below (in AUDIT section) has been removed
--       to avoid "column user_id does not exist" errors when indexes are applied
--       to a stale short-column payment_transactions table.
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id                  BIGSERIAL PRIMARY KEY,
  tenant_id           BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  company_code        VARCHAR(16) NOT NULL,
  order_id            BIGINT REFERENCES public.orders(id) ON DELETE SET NULL,
  wallet_id           BIGINT REFERENCES public.wallet_master(id) ON DELETE SET NULL,
  user_id             BIGINT REFERENCES public.users(id) ON DELETE SET NULL,
  transaction_type    VARCHAR(20) NOT NULL,
  payment_method      VARCHAR(20) NOT NULL,
  gateway             VARCHAR(30),
  gateway_txn_id      VARCHAR(100),
  reference_number    VARCHAR(80),
  amount              NUMERIC(14,2) NOT NULL DEFAULT 0,
  currency            VARCHAR(3) DEFAULT 'INR',
  status              VARCHAR(20) DEFAULT 'pending',
  failure_reason      TEXT,
  notes               JSONB DEFAULT '{}'::jsonb,
  processed_at        TIMESTAMPTZ,
  created_by          BIGINT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_paytx_tenant  ON public.payment_transactions (tenant_id, company_code);
CREATE INDEX IF NOT EXISTS idx_paytx_order   ON public.payment_transactions (order_id);
CREATE INDEX IF NOT EXISTS idx_paytx_user    ON public.payment_transactions (user_id);
CREATE INDEX IF NOT EXISTS idx_paytx_status  ON public.payment_transactions (tenant_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_paytx_method  ON public.payment_transactions (tenant_id, payment_method);

-- =====================================================================
-- 7.  FINANCE / WALLET / CREDIT / EXPENSES
-- =====================================================================

-- 7.1  wallet_master
CREATE TABLE IF NOT EXISTS public.wallet_master (
  id           BIGSERIAL PRIMARY KEY,
  tenant_id    BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  company_code VARCHAR(16) NOT NULL,
  user_id      BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  customer_id  BIGINT,
  balance      DECIMAL(14,2) DEFAULT 0,
  wallet_type  VARCHAR(20) DEFAULT 'prepaid',
  is_active    BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_wallet_tenant ON public.wallet_master (tenant_id, company_code);

-- 7.2  wallet_transactions
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id              BIGSERIAL PRIMARY KEY,
  tenant_id       BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  company_code    VARCHAR(16) NOT NULL,
  wallet_id       BIGINT NOT NULL REFERENCES public.wallet_master(id) ON DELETE CASCADE,
  user_id         BIGINT REFERENCES public.users(id) ON DELETE SET NULL,
  amount          DECIMAL(14,2) NOT NULL,
  type            VARCHAR(10) NOT NULL,
  reason          VARCHAR(30),
  reference_id    BIGINT,
  reference_number VARCHAR(50),
  opening_balance DECIMAL(14,2) DEFAULT 0,
  closing_balance DECIMAL(14,2) DEFAULT 0,
  narration       TEXT,
  status          VARCHAR(20) DEFAULT 'success',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wtxn_tenant ON public.wallet_transactions (tenant_id, company_code);
CREATE INDEX IF NOT EXISTS idx_wtxn_wallet ON public.wallet_transactions (wallet_id);
CREATE INDEX IF NOT EXISTS idx_wtxn_user   ON public.wallet_transactions (user_id);

-- 7.3  credit_master  (Udhaar / Counter Due)
CREATE TABLE IF NOT EXISTS public.credit_master (
  id              BIGSERIAL PRIMARY KEY,
  tenant_id       BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  company_code    VARCHAR(16) NOT NULL,
  customer_id     BIGINT,
  customer_type   VARCHAR(20) DEFAULT 'delivery_customer',
  amount          DECIMAL(14,2) NOT NULL,
  type            VARCHAR(10) NOT NULL,
  reason          VARCHAR(50),
  reference_id    BIGINT,
  billing_period  VARCHAR(20),
  is_deleted      BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_credit_tenant   ON public.credit_master (tenant_id, company_code);
CREATE INDEX IF NOT EXISTS idx_credit_customer ON public.credit_master (tenant_id, customer_id);

-- 7.4  expense_categories
CREATE TABLE IF NOT EXISTS public.expense_categories (
  id           BIGSERIAL PRIMARY KEY,
  tenant_id    BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  company_code VARCHAR(16) NOT NULL,
  name         VARCHAR(80) NOT NULL,
  description  TEXT,
  is_active    BOOLEAN DEFAULT TRUE,
  is_deleted   BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, name)
);
CREATE INDEX IF NOT EXISTS idx_exp_cat_tenant ON public.expense_categories (tenant_id, company_code);

-- 7.5  expenses
CREATE TABLE IF NOT EXISTS public.expenses (
  id                  BIGSERIAL PRIMARY KEY,
  tenant_id           BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  company_code        VARCHAR(16) NOT NULL,
  expense_category_id BIGINT REFERENCES public.expense_categories(id) ON DELETE SET NULL,
  account_paid_from_id BIGINT REFERENCES public.account_master(id)  ON DELETE SET NULL,
  amount              DECIMAL(14,2) NOT NULL,
  description         TEXT,
  date                DATE NOT NULL,
  receipt_url         TEXT,
  voucher_number      VARCHAR(30),
  admin_user_id       BIGINT,
  is_active           BOOLEAN DEFAULT TRUE,
  is_deleted          BOOLEAN DEFAULT FALSE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_expenses_tenant   ON public.expenses (tenant_id, company_code);
CREATE INDEX IF NOT EXISTS idx_expenses_date     ON public.expenses (tenant_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses (expense_category_id);

-- =====================================================================
-- 8.  LOGISTICS: PINCODES + ADDRESSES
-- =====================================================================

-- 8.1  pincode_master  (Serviceable Areas)
CREATE TABLE IF NOT EXISTS public.pincode_master (
  id                BIGSERIAL PRIMARY KEY,
  tenant_id         BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  company_code      VARCHAR(16) NOT NULL,
  pincode           VARCHAR(10) NOT NULL,
  city              VARCHAR(50),
  state             VARCHAR(50),
  is_serviceable    BOOLEAN DEFAULT TRUE,
  delivery_charge   DECIMAL(10,2) DEFAULT 0,
  min_order_amount  DECIMAL(12,2) DEFAULT 0,
  estimated_days    SMALLINT DEFAULT 2,
  is_active         BOOLEAN DEFAULT TRUE,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, pincode)
);
CREATE INDEX IF NOT EXISTS idx_pincode_tenant ON public.pincode_master (tenant_id, company_code);

-- 8.2  addresses  (App User Saved Addresses)
CREATE TABLE IF NOT EXISTS public.addresses (
  id             BIGSERIAL PRIMARY KEY,
  tenant_id      BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  company_code   VARCHAR(16) NOT NULL,
  user_id        BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name           VARCHAR(100),
  phone          VARCHAR(20),
  address_type   VARCHAR(20) DEFAULT 'home',
  address_line1  TEXT,
  address_line2  TEXT,
  landmark       VARCHAR(100),
  city           VARCHAR(50),
  state          VARCHAR(50),
  pincode        VARCHAR(10),
  latitude       DECIMAL(9,6),
  longitude      DECIMAL(9,6),
  is_default     BOOLEAN DEFAULT FALSE,
  is_active      BOOLEAN DEFAULT TRUE,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_addresses_tenant ON public.addresses (tenant_id, company_code);
CREATE INDEX IF NOT EXISTS idx_addresses_user   ON public.addresses (user_id);

-- =====================================================================
-- 9.  LOYALTY + MARKETING
-- =====================================================================

-- 9.1  loyalty_tiers
CREATE TABLE IF NOT EXISTS public.loyalty_tiers (
  id                BIGSERIAL PRIMARY KEY,
  tenant_id         BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  company_code      VARCHAR(16) NOT NULL,
  name              VARCHAR(30) NOT NULL,
  min_points        INTEGER DEFAULT 0,
  max_points        INTEGER DEFAULT 999999,
  cashback_percent  DECIMAL(5,2) DEFAULT 0,
  benefits          JSONB DEFAULT '{}'::jsonb,
  color_code        VARCHAR(7),
  is_active         BOOLEAN DEFAULT TRUE,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, name)
);
CREATE INDEX IF NOT EXISTS idx_ltier_tenant ON public.loyalty_tiers (tenant_id, company_code);

-- 9.2  customer_loyalty
CREATE TABLE IF NOT EXISTS public.customer_loyalty (
  id              BIGSERIAL PRIMARY KEY,
  tenant_id       BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  company_code    VARCHAR(16) NOT NULL,
  user_id         BIGINT REFERENCES public.users(id) ON DELETE SET NULL,
  customer_id     BIGINT,
  points          INTEGER DEFAULT 0,
  total_earned    INTEGER DEFAULT 0,
  total_redeemed  INTEGER DEFAULT 0,
  tier_id         BIGINT REFERENCES public.loyalty_tiers(id) ON DELETE SET NULL,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_cl_tenant ON public.customer_loyalty (tenant_id, company_code);

-- 9.3  loyalty_transactions
CREATE TABLE IF NOT EXISTS public.loyalty_transactions (
  id                  BIGSERIAL PRIMARY KEY,
  tenant_id           BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  company_code        VARCHAR(16) NOT NULL,
  loyalty_point_id    BIGINT REFERENCES public.customer_loyalty(id) ON DELETE SET NULL,
  user_id             BIGINT REFERENCES public.users(id) ON DELETE SET NULL,
  points              INTEGER NOT NULL,
  type                VARCHAR(10) NOT NULL,
  reason              VARCHAR(30),
  reference_id        BIGINT,
  points_value_inr    DECIMAL(10,2) DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ltxn_tenant ON public.loyalty_transactions (tenant_id, company_code);
CREATE INDEX IF NOT EXISTS idx_ltxn_user   ON public.loyalty_transactions (user_id);

-- 9.4  coupons
CREATE TABLE IF NOT EXISTS public.coupons (
  id                   BIGSERIAL PRIMARY KEY,
  tenant_id            BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  company_code         VARCHAR(16) NOT NULL,
  code                 VARCHAR(30) NOT NULL,
  title                VARCHAR(100),
  description          TEXT,
  discount_type        VARCHAR(10) NOT NULL,
  discount_value       DECIMAL(10,2) NOT NULL,
  min_order_amount     DECIMAL(12,2) DEFAULT 0,
  max_discount         DECIMAL(12,2) DEFAULT 0,
  valid_from           TIMESTAMPTZ DEFAULT NOW(),
  valid_to             TIMESTAMPTZ,
  usage_limit          INTEGER DEFAULT 1,
  used_count           INTEGER DEFAULT 0,
  per_user_limit       INTEGER DEFAULT 1,
  applies_to           VARCHAR(20) DEFAULT 'all',
  applies_to_id        BIGINT,
  is_active            BOOLEAN DEFAULT TRUE,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, code)
);
CREATE INDEX IF NOT EXISTS idx_coupons_tenant ON public.coupons (tenant_id, company_code);
CREATE INDEX IF NOT EXISTS idx_coupons_code   ON public.coupons (tenant_id, code);

-- 9.5  offers_master
CREATE TABLE IF NOT EXISTS public.offers_master (
  id                  BIGSERIAL PRIMARY KEY,
  tenant_id           BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  company_code        VARCHAR(16) NOT NULL,
  title               VARCHAR(100) NOT NULL,
  description         TEXT,
  offer_type          VARCHAR(20) DEFAULT 'flat_discount',
  buy_qty             SMALLINT DEFAULT 0,
  get_qty             SMALLINT DEFAULT 0,
  discount_value      DECIMAL(10,2) DEFAULT 0,
  min_order_amount    DECIMAL(12,2) DEFAULT 0,
  applies_to_type     VARCHAR(20) DEFAULT 'all',
  applies_to_id       BIGINT,
  banner_image        TEXT,
  valid_from          TIMESTAMPTZ DEFAULT NOW(),
  valid_to            TIMESTAMPTZ,
  is_active           BOOLEAN DEFAULT TRUE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_offers_tenant ON public.offers_master (tenant_id, company_code);

-- 9.6  banners
CREATE TABLE IF NOT EXISTS public.banners (
  id            BIGSERIAL PRIMARY KEY,
  tenant_id     BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  company_code  VARCHAR(16) NOT NULL,
  title         VARCHAR(100),
  description   TEXT,
  image_url     TEXT,
  banner_type   VARCHAR(20) DEFAULT 'top_slider',
  link_url      TEXT,
  action_type   VARCHAR(20) DEFAULT 'none',
  action_value  TEXT,
  sort_order    SMALLINT DEFAULT 0,
  start_date    TIMESTAMPTZ,
  end_date      TIMESTAMPTZ,
  is_active     BOOLEAN DEFAULT TRUE,
  is_deleted    BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_banners_tenant ON public.banners (tenant_id, company_code);
CREATE INDEX IF NOT EXISTS idx_banners_active ON public.banners (tenant_id, is_active, sort_order);

-- =====================================================================
-- 10. SYSTEM CONFIG / APP CONFIG / USER ACTIVITY
-- =====================================================================

-- 10.1  app_config  (Key-Value EAV)
CREATE TABLE IF NOT EXISTS public.app_config (
  id           BIGSERIAL PRIMARY KEY,
  tenant_id    BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  company_code VARCHAR(16) NOT NULL,
  key          VARCHAR(80) NOT NULL,
  value        TEXT,
  value_type   VARCHAR(10) DEFAULT 'string',
  group_name   VARCHAR(40) DEFAULT 'general',
  description  TEXT,
  is_active    BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, key)
);
CREATE INDEX IF NOT EXISTS idx_appcfg_tenant ON public.app_config (tenant_id, company_code);
CREATE INDEX IF NOT EXISTS idx_appcfg_group  ON public.app_config (tenant_id, group_name);

-- 10.2  home_config  (App Home Screen Layout)
CREATE TABLE IF NOT EXISTS public.home_config (
  id           BIGSERIAL PRIMARY KEY,
  tenant_id    BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  company_code VARCHAR(16) NOT NULL,
  key          VARCHAR(80) NOT NULL,
  value        JSONB DEFAULT '{}'::jsonb,
  description  TEXT,
  section_name TEXT,
  section_type TEXT,
  position     INTEGER DEFAULT 0,
  is_active    BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, key)
);
CREATE INDEX IF NOT EXISTS idx_hmcfg_tenant ON public.home_config (tenant_id, company_code);

-- 10.3  cart
CREATE TABLE IF NOT EXISTS public.cart (
  id           BIGSERIAL PRIMARY KEY,
  tenant_id    BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  company_code VARCHAR(16) NOT NULL,
  user_id      BIGINT REFERENCES public.users(id) ON DELETE CASCADE,
  product_id   BIGINT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity     DECIMAL(12,3) NOT NULL DEFAULT 1,
  session_id   VARCHAR(60),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cart_tenant  ON public.cart (tenant_id, company_code);
CREATE INDEX IF NOT EXISTS idx_cart_user    ON public.cart (user_id);
CREATE INDEX IF NOT EXISTS idx_cart_session ON public.cart (session_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_cart_user_product
  ON public.cart (tenant_id, user_id, product_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_cart_session_product
  ON public.cart (tenant_id, session_id, product_id) WHERE session_id IS NOT NULL;

-- 10.4  wishlist
CREATE TABLE IF NOT EXISTS public.wishlist (
  id           BIGSERIAL PRIMARY KEY,
  tenant_id    BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  company_code VARCHAR(16) NOT NULL,
  user_id      BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  product_id   BIGINT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, user_id, product_id)
);
CREATE INDEX IF NOT EXISTS idx_wish_tenant ON public.wishlist (tenant_id, company_code);
CREATE INDEX IF NOT EXISTS idx_wish_user   ON public.wishlist (user_id);

-- =====================================================================
-- 11. AUDIT / NOTIFICATIONS / SUPPORT
-- =====================================================================

-- 11.1  system_logs  (Audit Trail)
CREATE TABLE IF NOT EXISTS public.system_logs (
  id              BIGSERIAL PRIMARY KEY,
  table_name      VARCHAR(60) NOT NULL,
  action_type     VARCHAR(10) NOT NULL,
  record_id       BIGINT,
  admin_user_id   BIGINT,
  username        VARCHAR(80),
  user_role       VARCHAR(30),
  company_code    VARCHAR(16) NOT NULL,
  old_data        JSONB DEFAULT '{}'::jsonb,
  new_data        JSONB DEFAULT '{}'::jsonb,
  metadata        JSONB DEFAULT '{}'::jsonb,
  affected_rows   INTEGER DEFAULT 0,
  status          VARCHAR(20) DEFAULT 'success',
  error_message   TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_syslogs_code   ON public.system_logs (company_code, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_syslogs_table  ON public.system_logs (company_code, table_name);
CREATE INDEX IF NOT EXISTS idx_syslogs_action ON public.system_logs (company_code, action_type);

-- 11.2  notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id               BIGSERIAL PRIMARY KEY,
  tenant_id        BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  company_code     VARCHAR(16) NOT NULL,
  user_id          BIGINT REFERENCES public.users(id) ON DELETE CASCADE,
  title            VARCHAR(200) NOT NULL,
  message          TEXT,
  type             VARCHAR(30) DEFAULT 'system',
  image_url        TEXT,
  reference_id     BIGINT,
  deep_link        TEXT,
  is_read          BOOLEAN DEFAULT FALSE,
  sent_at          TIMESTAMPTZ,
  delivery_status  VARCHAR(20) DEFAULT 'pending',
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notif_tenant ON public.notifications (tenant_id, company_code);
CREATE INDEX IF NOT EXISTS idx_notif_user   ON public.notifications (user_id, is_read);

-- 11.3  support_tickets
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id                      BIGSERIAL PRIMARY KEY,
  tenant_id               BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  company_code            VARCHAR(16) NOT NULL,
  ticket_number           VARCHAR(20),
  user_id                 BIGINT REFERENCES public.users(id) ON DELETE SET NULL,
  customer_id             BIGINT,
  subject                 VARCHAR(200) NOT NULL,
  description             TEXT,
  category                VARCHAR(30) DEFAULT 'app',
  status                  VARCHAR(20) DEFAULT 'open',
  priority                VARCHAR(10) DEFAULT 'medium',
  assigned_admin_user_id  BIGINT,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tickets_tenant ON public.support_tickets (tenant_id, company_code);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.support_tickets (tenant_id, status);

-- =====================================================================
-- 12.  RPC FUNCTIONS  (4 total, with frontend-return contract FIXES)
-- =====================================================================

-- 12.1  verify_admin_pin  →  BOOLEAN (correct)
CREATE OR REPLACE FUNCTION public.verify_admin_pin(p_pin TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_guc_pin TEXT; v_db_pin TEXT; v_match BOOLEAN;
BEGIN
  IF p_pin IS NULL THEN RETURN FALSE; END IF;
  BEGIN v_guc_pin := current_setting('app.admin_security_pin', true);
  EXCEPTION WHEN OTHERS THEN v_guc_pin := NULL; END;
  BEGIN SELECT value::TEXT INTO v_db_pin FROM public.app_config
        WHERE key = 'admin_security_pin' LIMIT 1;
  EXCEPTION WHEN OTHERS THEN v_db_pin := NULL; END;
  v_match := FALSE;
  IF v_guc_pin IS NOT NULL AND LENGTH(v_guc_pin) > 0 THEN
    v_match := v_match OR (v_guc_pin = p_pin);
  END IF;
  IF v_db_pin IS NOT NULL AND LENGTH(v_db_pin) > 0 THEN
    v_match := v_match OR (v_db_pin = p_pin);
  END IF;
  RETURN v_match;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
-- ALTER FUNCTION on functions not supported for RLS (RLS applies only to tables); SECURITY DEFINER already set above.
GRANT EXECUTE ON FUNCTION public.verify_admin_pin(TEXT) TO anon, authenticated, service_role;

-- 12.2  verify_admin_password  —  ⚠️  FIXED! returns JSON (verified + profile)
--      Old migration returned BOOLEAN only, but AuthContext.jsx expects:
--      { verified: true, profile: { id, username, email, role, company_code, ... } }
CREATE OR REPLACE FUNCTION public.verify_admin_password(
  p_username_or_email TEXT, p_password TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_row RECORD; v_ok BOOLEAN; v_hash TEXT;
BEGIN
  IF p_username_or_email IS NULL OR p_password IS NULL THEN
    RETURN jsonb_build_object('verified', FALSE, 'profile', NULL, 'error', 'missing_inputs');
  END IF;
  SELECT * INTO v_row FROM public.admin_users
    WHERE is_active = TRUE
      AND ( LOWER(username) = LOWER(TRIM(p_username_or_email))
         OR LOWER(email)    = LOWER(TRIM(p_username_or_email)) )
    LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('verified', FALSE, 'profile', NULL, 'error', 'user_not_found');
  END IF;
  v_hash := v_row.password_hash;
  IF v_hash IS NULL OR LENGTH(v_hash) = 0 THEN
    RETURN jsonb_build_object('verified', FALSE, 'profile', NULL, 'error', 'no_password_set');
  END IF;
  BEGIN v_ok := (v_hash = public.crypt(p_password, v_hash));
  EXCEPTION WHEN OTHERS THEN v_ok := FALSE; END;
  IF NOT v_ok THEN
    RETURN jsonb_build_object('verified', FALSE, 'profile', NULL, 'error', 'wrong_password');
  END IF;
  RETURN jsonb_build_object(
    'verified', TRUE,
    'profile', jsonb_build_object(
      'id',           v_row.id,
      'username',     v_row.username,
      'email',        COALESCE(v_row.email, ''),
      'name',         COALESCE(v_row.name, v_row.username),
      'role',         COALESCE(v_row.role, 'cashier'),
      'company_code', v_row.company_code,
      'tenant_id',    v_row.tenant_id,
      'is_active',    v_row.is_active,
      'status',       COALESCE(v_row.status, 'active'),
      'permissions',  COALESCE(v_row.permissions, '{}'::jsonb)
    )
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
-- ALTER FUNCTION on functions not supported for RLS (RLS applies only to tables); SECURITY DEFINER already set above.
GRANT EXECUTE ON FUNCTION public.verify_admin_password(TEXT, TEXT) TO anon, authenticated, service_role;

-- 12.3  adjust_wallet_atomic  →  BOOLEAN
CREATE OR REPLACE FUNCTION public.adjust_wallet_atomic(
  p_user_id BIGINT, p_amount NUMERIC, p_type TEXT, p_reason TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_tenant_id   BIGINT   := current_setting('app.current_tenant_id',    true)::BIGINT;
  v_company     TEXT     := current_setting('app.current_company_code', true);
  v_wallet_id   BIGINT;
  v_old_bal     NUMERIC  := 0;
  v_new_bal     NUMERIC;
  v_signed_amt  NUMERIC;
BEGIN
  IF p_user_id IS NULL OR p_amount IS NULL OR p_type IS NULL THEN RETURN FALSE; END IF;
  p_amount      := ABS(p_amount);
  v_signed_amt  := CASE WHEN LOWER(p_type) = 'debit' THEN -p_amount ELSE p_amount END;
  SELECT id, balance INTO v_wallet_id, v_old_bal FROM public.wallet_master
    WHERE (user_id = p_user_id OR customer_id = p_user_id)
      AND (tenant_id = v_tenant_id OR v_tenant_id IS NULL)
    ORDER BY id LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.wallet_master
        (user_id, customer_id, balance, is_active, tenant_id, company_code, created_at, updated_at)
    VALUES (p_user_id, p_user_id, 0, TRUE, v_tenant_id, SUBSTRING(v_company FROM 1 FOR 16), NOW(), NOW())
    RETURNING id, balance INTO v_wallet_id, v_old_bal;
  END IF;
  v_new_bal := COALESCE(v_old_bal, 0) + v_signed_amt;
  IF LOWER(p_type) = 'debit' AND v_new_bal < 0 THEN
    RAISE EXCEPTION 'Wallet overdraw denied: old=%, amount=%, new=%', v_old_bal, v_signed_amt, v_new_bal;
  END IF;
  UPDATE public.wallet_master SET balance = v_new_bal, updated_at = NOW() WHERE id = v_wallet_id;
  INSERT INTO public.wallet_transactions
      (wallet_id, user_id, amount, type, reason, reference_id, opening_balance, closing_balance,
       created_at, updated_at, tenant_id, company_code)
  VALUES
      (v_wallet_id, p_user_id, p_amount, LOWER(p_type), p_reason, NULL, COALESCE(v_old_bal,0), v_new_bal,
       NOW(), NOW(), v_tenant_id, SUBSTRING(v_company FROM 1 FOR 16));
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;
-- ALTER FUNCTION on functions not supported for RLS (RLS applies only to tables); SECURITY DEFINER already set above.
GRANT EXECUTE ON FUNCTION public.adjust_wallet_atomic(BIGINT, NUMERIC, TEXT, TEXT) TO anon, authenticated, service_role;

-- 12.4  place_order_atomic  →  BIGINT (new orders.id)
CREATE OR REPLACE FUNCTION public.place_order_atomic(p_payload JSONB)
RETURNS BIGINT AS $$
DECLARE
  v_tenant_id   BIGINT   := current_setting('app.current_tenant_id',    true)::BIGINT;
  v_company     TEXT     := current_setting('app.current_company_code', true);
  v_header      JSONB; v_items JSONB; v_payment JSONB;
  v_new_order_id   BIGINT;
  v_item           JSONB;
  v_item_idx       INT      := 0;
  v_item_len       INT;
  v_product_id     BIGINT;
  v_qty            NUMERIC;
  v_rate           NUMERIC;
  v_item_total     NUMERIC;
  v_product_name   TEXT;
  v_old_stock      NUMERIC;
  v_new_stock      NUMERIC;
BEGIN
  IF p_payload IS NULL THEN RAISE EXCEPTION 'place_order_atomic: NULL payload'; END IF;
  v_header  := COALESCE(p_payload->'order_header', p_payload);
  v_items   := p_payload->'items';
  v_payment := p_payload->'payment';
  IF v_items IS NULL OR jsonb_typeof(v_items) <> 'array' THEN
    RAISE EXCEPTION 'place_order_atomic: items array missing in payload';
  END IF;
  -- Step 1: Insert order header
  INSERT INTO public.orders (
      order_number, order_type, user_id, customer_name, user_mobile, delivery_address, pincode,
      subtotal, discount, coupon_discount, delivery_charge, packaging_charge,
      cgst_amount, sgst_amount, igst_amount, cess_amount, round_off, total_amount,
      payment_method, payment_status, order_status, coupon_id, delivery_boy_id,
      cashier_admin_user_id, notes,
      tenant_id, company_code, created_at, updated_at
  ) VALUES (
      COALESCE(v_header->>'order_number', 'ORD'||EXTRACT(EPOCH FROM NOW())::BIGINT||(random()*999)::INT::TEXT),
      COALESCE(v_header->>'order_type',   'pos_counter'),
      (v_header->>'user_id')::BIGINT,
      v_header->>'customer_name',
      v_header->>'user_mobile',
      v_header->>'delivery_address',
      v_header->>'pincode',
      COALESCE((v_header->>'subtotal')::NUMERIC, 0),
      COALESCE((v_header->>'discount')::NUMERIC, 0),
      COALESCE((v_header->>'coupon_discount')::NUMERIC, 0),
      COALESCE((v_header->>'delivery_charge')::NUMERIC, 0),
      COALESCE((v_header->>'packaging_charge')::NUMERIC, 0),
      COALESCE((v_header->>'cgst_amount')::NUMERIC, 0),
      COALESCE((v_header->>'sgst_amount')::NUMERIC, 0),
      COALESCE((v_header->>'igst_amount')::NUMERIC, 0),
      COALESCE((v_header->>'cess_amount')::NUMERIC, 0),
      COALESCE((v_header->>'round_off')::NUMERIC, 0),
      COALESCE((v_header->>'total_amount')::NUMERIC, 0),
      COALESCE(v_header->>'payment_method', 'cash'),
      COALESCE(v_header->>'payment_status', 'pending'),
      COALESCE(v_header->>'order_status',   'pending'),
      (v_header->>'coupon_id')::BIGINT,
      (v_header->>'delivery_boy_id')::BIGINT,
      (v_header->>'cashier_admin_user_id')::BIGINT,
      v_header->>'notes',
      v_tenant_id,
      SUBSTRING(v_company FROM 1 FOR 16),
      NOW(), NOW()
  ) RETURNING id INTO v_new_order_id;
  -- Step 2: Insert items + reduce stock atomically (row lock)
  v_item_len := jsonb_array_length(v_items);
  FOR v_item_idx IN 0..(v_item_len - 1) LOOP
    v_item         := v_items->v_item_idx;
    v_product_id   := (v_item->>'product_id')::BIGINT;
    v_qty          := COALESCE((v_item->>'quantity')::NUMERIC, (v_item->>'qty')::NUMERIC, 0);
    v_rate         := COALESCE((v_item->>'rate')::NUMERIC,     (v_item->>'price')::NUMERIC, 0);
    v_item_total   := COALESCE((v_item->>'total')::NUMERIC, v_qty * v_rate);
    v_product_name := v_item->>'product_name';
    IF v_product_id IS NULL OR v_qty <= 0 THEN CONTINUE; END IF;
    SELECT COALESCE(stock, 0) INTO v_old_stock FROM public.products
      WHERE id = v_product_id AND (tenant_id = v_tenant_id OR v_tenant_id IS NULL)
      FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product % not found (order_id=%)', v_product_id, v_new_order_id;
    END IF;
    v_new_stock := v_old_stock - v_qty;
    IF v_new_stock < 0 THEN
      RAISE EXCEPTION 'Out-of-Stock: product=%, qty_requested=%, available=%',
                       v_product_id, v_qty, v_old_stock;
    END IF;
    UPDATE public.products SET stock = v_new_stock, updated_at = NOW() WHERE id = v_product_id;
    INSERT INTO public.inventory_logs
        (product_id, old_stock, new_stock, change_qty, change_type, reference_id,
         created_at, updated_at, tenant_id, company_code)
    VALUES
        (v_product_id, v_old_stock, v_new_stock, v_qty, 'sold', v_new_order_id,
         NOW(), NOW(), v_tenant_id, SUBSTRING(v_company FROM 1 FOR 16));
    INSERT INTO public.order_items
        (order_id, product_id, product_name, quantity, qty, rate, price, total,
         created_at, updated_at, tenant_id, company_code)
    VALUES
        (v_new_order_id, v_product_id, v_product_name, v_qty, v_qty, v_rate, v_rate, v_item_total,
         NOW(), NOW(), v_tenant_id, SUBSTRING(v_company FROM 1 FOR 16));
  END LOOP;
  RETURN v_new_order_id;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;
-- ALTER FUNCTION on functions not supported for RLS (RLS applies only to tables); SECURITY DEFINER already set above.
GRANT EXECUTE ON FUNCTION public.place_order_atomic(JSONB) TO anon, authenticated, service_role;

-- =====================================================================
-- 13.  BATCH ATTACH TRIGGERS  (updated_at + inject_tenant_context)
-- =====================================================================
DO $$
DECLARE t TEXT; tables TEXT[] := ARRAY[
  'companies','unit_master','categories','subcategories','brands','department_master',
  'products','stock_alerts','inventory_logs','hsn_master',
  'account_master','purchases','purchase_items',
  'admin_users','users','delivery_customer_master','delivery_boy_master',
  'orders','order_items','pincode_master','addresses',
  'wallet_master','wallet_transactions','credit_master',
  'expense_categories','expenses','payment_transactions',
  'loyalty_tiers','customer_loyalty','loyalty_transactions',
  'coupons','offers_master','banners',
  'app_config','home_config','cart','wishlist',
  'notifications','support_tickets'
];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I_updated_at ON public.%I;', t, t);
    EXECUTE format('CREATE TRIGGER %I_updated_at BEFORE UPDATE ON public.%I
                    FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();', t, t);
  END LOOP;
END $$;

SELECT public.install_inject_tenant_triggers_on_all();

-- =====================================================================
-- 14.  ROW LEVEL SECURITY  —  ENABLE + CRUD Policies (All tenant tables)
-- =====================================================================
DO $$
DECLARE t TEXT; tables TEXT[] := ARRAY[
  'unit_master','categories','subcategories','brands','department_master',
  'products','stock_alerts','inventory_logs',
  'account_master','purchases','purchase_items',
  'admin_users','users','delivery_customer_master','delivery_boy_master',
  'orders','order_items','pincode_master','addresses',
  'wallet_master','wallet_transactions','credit_master',
  'expense_categories','expenses','payment_transactions',
  'loyalty_tiers','customer_loyalty','loyalty_transactions',
  'coupons','offers_master','banners',
  'app_config','home_config','cart','wishlist',
  'notifications','support_tickets'
];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    -- SELECT
    EXECUTE format('CREATE POLICY IF NOT EXISTS %I_tenant_read ON public.%I FOR SELECT USING (
      (auth.jwt() ->> ''tenant_id'' IS NOT NULL AND tenant_id = (auth.jwt() ->> ''tenant_id'')::bigint)
      OR (auth.jwt() ->> ''company_code'' IS NOT NULL AND company_code = (auth.jwt() ->> ''company_code''))
      OR (auth.jwt() ->> ''role'' = ''super_admin'')
      OR public.matches_company_scope(company_code)
    );', t, t);
    -- INSERT
    EXECUTE format('CREATE POLICY IF NOT EXISTS %I_tenant_insert ON public.%I FOR INSERT WITH CHECK (
      (auth.jwt() ->> ''role'' = ''super_admin'')
      OR (
        (auth.jwt() ->> ''tenant_id'' IS NOT NULL AND tenant_id = (auth.jwt() ->> ''tenant_id'')::bigint)
        AND company_code = (auth.jwt() ->> ''company_code'')
      )
    );', t, t);
    -- UPDATE
    EXECUTE format('CREATE POLICY IF NOT EXISTS %I_tenant_update ON public.%I FOR UPDATE
      USING (
        (auth.jwt() ->> ''role'' = ''super_admin'')
        OR (auth.jwt() ->> ''tenant_id'' IS NOT NULL AND tenant_id = (auth.jwt() ->> ''tenant_id'')::bigint)
        OR company_code = (auth.jwt() ->> ''company_code'')
      )
      WITH CHECK (
        (auth.jwt() ->> ''role'' = ''super_admin'')
        OR (
          (auth.jwt() ->> ''tenant_id'' IS NOT NULL AND tenant_id = (auth.jwt() ->> ''tenant_id'')::bigint)
          AND company_code = (auth.jwt() ->> ''company_code'')
        )
      );', t, t);
    -- DELETE
    EXECUTE format('CREATE POLICY IF NOT EXISTS %I_tenant_delete ON public.%I FOR DELETE USING (
      (auth.jwt() ->> ''role'' = ''super_admin'')
      OR (auth.jwt() ->> ''tenant_id'' IS NOT NULL AND tenant_id = (auth.jwt() ->> ''tenant_id'')::bigint)
      OR company_code = (auth.jwt() ->> ''company_code'')
    );', t, t);
  END LOOP;
END $$;

-- system_logs RLS
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS syslogs_company_code ON public.system_logs;
CREATE POLICY syslogs_company_code ON public.system_logs FOR SELECT
  USING ((auth.jwt() ->> 'company_code') = company_code OR (auth.jwt() ->> 'role') = 'super_admin');
DROP POLICY IF EXISTS syslogs_insert ON public.system_logs;
CREATE POLICY syslogs_insert ON public.system_logs FOR INSERT WITH CHECK (TRUE);

-- companies RLS
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS companies_own_read ON public.companies;
CREATE POLICY companies_own_read ON public.companies FOR SELECT
  USING ((auth.jwt() ->> 'role') = 'super_admin' OR company_code = (auth.jwt() ->> 'company_code'));
DROP POLICY IF EXISTS companies_superadmin_write ON public.companies;
CREATE POLICY companies_superadmin_write ON public.companies
  FOR ALL USING ((auth.jwt() ->> 'role') = 'super_admin')
  WITH CHECK ((auth.jwt() ->> 'role') = 'super_admin');

-- hsn_master: Global reference table → NO RLS filter (GUC fallback)
ALTER TABLE public.hsn_master ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS hsn_global_read ON public.hsn_master;
CREATE POLICY hsn_global_read ON public.hsn_master
  FOR SELECT USING (TRUE);

-- =====================================================================
-- 15.  READABLE VIEWS  (7)  —  All with GRANT SELECT
-- =====================================================================

CREATE OR REPLACE VIEW public.readable_products AS
SELECT
  p.id, p.tenant_id, p.company_code, p.name, p.itname, p.print_name, p.itnameprint,
  p.barcode, p.hsn_code, p.hsncode, p.image_url, p.imagename, p.picture,
  p.description, p.itemdescription,
  c.id AS category_id, c.name AS category_name,
  sc.id AS subcategory_id, sc.name AS subcategory_name,
  b.id AS brand_id, b.name AS brand_name,
  u.id AS unit_id, u.name AS unit_name, u.symbol AS unit_symbol,
  p.purchase_rate, p.purcrate, p.mrp, p.retail_rate, p.restrate,
  p.take_rate, p.takerate, p.delivery_rate, p.dlvrate,
  p.sale_rate, p.onlinerate, p.stock, p.opstock, p.low_stock_threshold,
  p.gst_percent, p.gst, p.cess_percent, p.cess,
  p.discount_percent, p.discperc, p.is_discountable, p.isdiscountable,
  p.is_favourite, p.isfav, p.is_package, p.ispackage,
  p.itemstatus, p.is_active, p.created_at, p.updated_at
FROM public.products p
LEFT JOIN public.categories c    ON c.id  = p.category_id
LEFT JOIN public.subcategories sc ON sc.id = p.subcategory_id
LEFT JOIN public.brands b        ON b.id  = p.brand_id
LEFT JOIN public.unit_master u   ON u.id::text = p.unitcode OR u.symbol = p.unitcode OR FALSE;
-- Views do not support RLS configuration; security via GRANT SELECT list below.
GRANT SELECT ON public.readable_products TO anon, authenticated, service_role;

CREATE OR REPLACE VIEW public.readable_categories AS
SELECT c.*, (SELECT COUNT(*) FROM public.products p WHERE p.category_id = c.id) AS product_count
FROM public.categories c;
-- Views do not support RLS configuration; security via GRANT SELECT list below.
GRANT SELECT ON public.readable_categories TO anon, authenticated, service_role;

CREATE OR REPLACE VIEW public.readable_brands AS
SELECT b.*, (SELECT COUNT(*) FROM public.products p WHERE p.brand_id = b.id) AS product_count
FROM public.brands b;
-- Views do not support RLS configuration; security via GRANT SELECT list below.
GRANT SELECT ON public.readable_brands TO anon, authenticated, service_role;

CREATE OR REPLACE VIEW public.readable_banners AS SELECT b.* FROM public.banners b;
-- Views do not support RLS configuration; security via GRANT SELECT list below.
GRANT SELECT ON public.readable_banners TO anon, authenticated, service_role;

CREATE OR REPLACE VIEW public.readable_coupons AS
SELECT c.*, (c.usage_limit - c.used_count) AS remaining_uses FROM public.coupons c;
-- Views do not support RLS configuration; security via GRANT SELECT list below.
GRANT SELECT ON public.readable_coupons TO anon, authenticated, service_role;

CREATE OR REPLACE VIEW public.readable_orders AS
SELECT
  o.id, o.tenant_id, o.company_code, o.order_number, o.order_type,
  o.user_id, u.name AS user_name, o.customer_name, o.user_mobile,
  o.delivery_address, o.pincode,
  o.subtotal, o.discount, o.coupon_discount,
  o.delivery_charge, o.packaging_charge,
  o.cgst_amount, o.sgst_amount, o.igst_amount, o.cess_amount,
  o.round_off, o.total_amount,
  o.payment_method, o.payment_status, o.order_status,
  o.delivery_boy_id, db.name AS delivery_boy_name,
  o.cashier_admin_user_id, au.name AS cashier_name,
  o.notes, o.invoice_generated, o.invoice_printed_at,
  o.delivered_at, o.cancelled_at,
  (SELECT COUNT(*) FROM public.order_items oi WHERE oi.order_id = o.id) AS item_count,
  (SELECT SUM(oi.quantity) FROM public.order_items oi WHERE oi.order_id = o.id) AS total_qty,
  o.created_at, o.updated_at
FROM public.orders o
LEFT JOIN public.users u                  ON u.id  = o.user_id
LEFT JOIN public.admin_users au           ON au.id = o.cashier_admin_user_id
LEFT JOIN public.delivery_boy_master db   ON db.id = o.delivery_boy_id;
-- Views do not support RLS configuration; security via GRANT SELECT list below.
GRANT SELECT ON public.readable_orders TO anon, authenticated, service_role;

CREATE OR REPLACE VIEW public.readable_users AS
SELECT
  u.*,
  COALESCE(w.balance, 0)              AS wallet_balance,
  COALESCE(cl.points, 0)              AS loyalty_points,
  (SELECT COUNT(*) FROM public.orders o WHERE o.user_id = u.id) AS total_orders,
  COALESCE((SELECT SUM(o.total_amount) FROM public.orders o
            WHERE o.user_id = u.id AND o.order_status = 'delivered'), 0)
      AS lifetime_spend
FROM public.users u
LEFT JOIN public.wallet_master w     ON w.user_id  = u.id
LEFT JOIN public.customer_loyalty cl ON cl.user_id = u.id;
-- Views do not support RLS configuration; security via GRANT SELECT list below.
GRANT SELECT ON public.readable_users TO anon, authenticated, service_role;

-- =====================================================================
-- 16.  SEED / REFERENCE DATA  (All ON CONFLICT DO NOTHING = Re-runnable)
-- =====================================================================

-- 16.1  Default Company (Super Admin Tenant)
INSERT INTO public.companies
    (id, name, company_slug, company_code, address, phone, email, gstin, pan_no,
     currency_code, timezone, is_active, status, subscription_plan)
VALUES (
    1,
    'NM MART Ultra Retail',
    'nm-mart',
    'NMM001',
    '123 Main Market Road, Near Bus Stand',
    '+91-98765-43210',
    'support@nmmart.in',
    '27ABCDE1234F1Z5',
    'ABCDE1234F',
    'INR',
    'Asia/Kolkata',
    TRUE,
    'active',
    'enterprise'
) ON CONFLICT (id) DO NOTHING;

-- 16.2  Default App Config (per tenant, key=unique)
INSERT INTO public.app_config
    (tenant_id, company_code, key, value, value_type, group_name, description)
VALUES
  (1, 'NMM001', 'admin_security_pin',          '1234',                     'string',  'security',  'Global Admin Security PIN'),
  (1, 'NMM001', 'shop_name',                   'NM MART',                  'string',  'branding',  'Shop Display Name'),
  (1, 'NMM001', 'shop_address',                '123 Main Market Road',     'string',  'branding',  'Shop Address for Receipt'),
  (1, 'NMM001', 'shop_mobile',                 '+91-98765-43210',          'string',  'branding',  'Shop Contact No'),
  (1, 'NMM001', 'shop_email',                  'support@nmmart.in',        'string',  'branding',  'Shop Email'),
  (1, 'NMM001', 'shop_gst_no',                 '27ABCDE1234F1Z5',          'string',  'tax',       'GST Registration No'),
  (1, 'NMM001', 'default_tax_rate',            '5',                        'number',  'tax',       'Default GST %'),
  (1, 'NMM001', 'currency_symbol',             '₹',                        'string',  'general',   'Currency Symbol'),
  (1, 'NMM001', 'enable_guard_verification',   'false',                    'boolean', 'security',  'Enable 2nd PIN for Deletes'),
  (1, 'NMM001', 'primary_color',               '#FFC107',                  'string',  'theme',     'Brand Primary Color'),
  (1, 'NMM001', 'secondary_color',             '#212121',                  'string',  'theme',     'Brand Secondary Color'),
  (1, 'NMM001', 'accent_color',                '#FF5722',                  'string',  'theme',     'Brand Accent Color'),
  (1, 'NMM001', 'default_sales_rate',          'retail_rate',              'string',  'pos',       'Default rate column for POS'),
  (1, 'NMM001', 'low_stock_days',              '5',                        'number',  'inventory', 'Run-out risk days threshold'),
  (1, 'NMM001', 'urgent_expiry_days',          '15',                       'number',  'inventory', 'Urgent expiry alert threshold')
ON CONFLICT (tenant_id, key) DO NOTHING;

-- 16.3  Unit Master (Common units)
INSERT INTO public.unit_master
    (tenant_id, company_code, name, symbol, short_name, sort_order, is_active)
VALUES
  (1, 'NMM001', 'Kilogram',     'kg',     'kg',    1, TRUE),
  (1, 'NMM001', 'Gram',         'g',      'g',     2, TRUE),
  (1, 'NMM001', 'Piece',        'pcs',    'pc',    3, TRUE),
  (1, 'NMM001', 'Litre',        'L',      'L',     4, TRUE),
  (1, 'NMM001', 'Millilitre',   'ml',     'ml',    5, TRUE),
  (1, 'NMM001', 'Dozen',        'dozen',  'dz',    6, TRUE),
  (1, 'NMM001', 'Box',          'box',    'bx',    7, TRUE),
  (1, 'NMM001', 'Pack',         'pack',   'pk',    8, TRUE),
  (1, 'NMM001', 'Metre',        'm',      'm',     9, TRUE),
  (1, 'NMM001', 'Foot',         'ft',     'ft',   10, TRUE),
  (1, 'NMM001', 'Nos',          'nos',    'nos',  11, TRUE)
ON CONFLICT DO NOTHING;

-- 16.4  Popular / Seed Categories
INSERT INTO public.categories
    (tenant_id, company_code, name, description, sort_order, is_active)
VALUES
  (1, 'NMM001', 'Grocery & Staples', 'Daily need items like rice, dal, atta',         1, TRUE),
  (1, 'NMM001', 'Dairy & Eggs',      'Milk, curd, paneer, ghee, butter, eggs',       2, TRUE),
  (1, 'NMM001', 'Beverages',         'Cold drinks, juices, tea, coffee, water',      3, TRUE),
  (1, 'NMM001', 'Bakery & Snacks',   'Biscuits, chips, namkeen, cakes, bread',       4, TRUE),
  (1, 'NMM001', 'Personal Care',     'Soap, shampoo, toothpaste, cosmetics',         5, TRUE),
  (1, 'NMM001', 'Household',         'Detergent, cleaning, utensils, paper',         6, TRUE),
  (1, 'NMM001', 'Fresh Vegetables',  'Locally sourced daily vegetables',              7, TRUE),
  (1, 'NMM001', 'Fresh Fruits',      'Seasonal fresh fruits',                         8, TRUE),
  (1, 'NMM001', 'Frozen Food',       'Frozen peas, french fries, ice cream',          9, TRUE),
  (1, 'NMM001', 'Pharma & Wellness', 'OTC medicines, vitamins, health drinks',       10, TRUE)
ON CONFLICT DO NOTHING;

-- 16.5  Sub-Categories (Groceries)
INSERT INTO public.subcategories
    (tenant_id, company_code, category_id, name, description, sort_order, is_active)
SELECT 1, 'NMM001', c.id, sub.name, sub.descr, sub.so, TRUE
FROM public.categories c
CROSS JOIN (VALUES
  ('Rice & Rice Products', 'Basmati, sona masoori etc.', 1),
  ('Dal & Pulses',        'Toor, chana, moong, masoor',  2),
  ('Atta & Flours',       'Wheat, maida, besan, ragi',   3),
  ('Sugar & Jaggery',     'Sugar, khandsari, gur',       4),
  ('Salt & Spices',       'Salt, haldi, mirchi, garam masala', 5)
) AS sub(name, descr, so)
WHERE c.name = 'Grocery & Staples'
  AND NOT EXISTS (SELECT 1 FROM public.subcategories s WHERE s.category_id = c.id AND s.name = sub.name);

-- 16.6  Seed Brands
INSERT INTO public.brands
    (tenant_id, company_code, name, code, description, logo_url, is_active)
VALUES
  (1, 'NMM001', 'Local / Desi',        'LOCAL',    'Sourced from local vendors', NULL, TRUE),
  (1, 'NMM001', 'Tata',                'TATA',     'Tata Consumer Products',     NULL, TRUE),
  (1, 'NMM001', 'Haldiram''s',         'HALDIRAM', 'Haldiram Foods International', NULL, TRUE),
  (1, 'NMM001', 'Amul',                'AMUL',     'Amul Dairy Cooperative',     NULL, TRUE),
  (1, 'NMM001', 'Parle',               'PARLE',    'Parle Products Pvt Ltd',     NULL, TRUE),
  (1, 'NMM001', 'Britannia',           'BRIT',     'Britannia Industries',       NULL, TRUE),
  (1, 'NMM001', 'Patanjali',           'PAT',      'Patanjali Ayurved',          NULL, TRUE),
  (1, 'NMM001', 'Nestle',              'NESTLE',   'Nestle India',               NULL, TRUE),
  (1, 'NMM001', 'Dabur',               'DABUR',    'Dabur India',                NULL, TRUE),
  (1, 'NMM001', 'Coca-Cola',           'COKE',     'Coca-Cola India Beverages',  NULL, TRUE)
ON CONFLICT DO NOTHING;

-- 16.7  Expense Categories (Finance dropdown)
INSERT INTO public.expense_categories
    (tenant_id, company_code, name, description, is_active)
VALUES
  (1, 'NMM001', 'Shop Rent',               'Monthly shop / godown rent',           TRUE),
  (1, 'NMM001', 'Salaries & Wages',        'Staff salaries, overtime, bonus',      TRUE),
  (1, 'NMM001', 'Electricity',             'Electricity bill, gensel fuel',        TRUE),
  (1, 'NMM001', 'Water & Utilities',       'Water, telephone, internet bills',     TRUE),
  (1, 'NMM001', 'Packaging Material',      'Bags, labels, tape, box, thermocol',   TRUE),
  (1, 'NMM001', 'Transport & Logistics',   'Petrol, tempu, courier charges',       TRUE),
  (1, 'NMM001', 'Marketing & Advertising', 'Boards, banners, pamphlets, social',  TRUE),
  (1, 'NMM001', 'Repairs & Maintenance',   'AC, fridge, printer, computer fix',   TRUE),
  (1, 'NMM001', 'Printing & Stationery',   'Bill roll, printer paper, pens, etc.', TRUE),
  (1, 'NMM001', 'GST & Taxes',             'GST payment, income tax, licence',    TRUE),
  (1, 'NMM001', 'Loss / Damage / Shrinkage','Expired stock, theft, breakage',      TRUE),
  (1, 'NMM001', 'Miscellaneous',           'Other small expenses not categorized', TRUE)
ON CONFLICT (tenant_id, name) DO NOTHING;

-- 16.8  Loyalty Tiers (4 default: Bronze → Platinum)
INSERT INTO public.loyalty_tiers
    (tenant_id, company_code, name, min_points, max_points, cashback_percent, benefits, color_code, is_active)
VALUES
  (1, 'NMM001', 'Bronze',     0,     2499,   0.5,  '{"welcome":"Points on signup","discount":"0.5% cashback"}',    '#CD7F32', TRUE),
  (1, 'NMM001', 'Silver',   2500,    9999,   1.0,  '{"shipping":"Free delivery above ₹500","discount":"1% cashback"}', '#C0C0C0', TRUE),
  (1, 'NMM001', 'Gold',    10000,   49999,   2.0,  '{"priority":"Priority support","exclusive":"Early sales access","discount":"2% cashback"}', '#FFD700', TRUE),
  (1, 'NMM001', 'Platinum',50000, 9999999,   3.0,  '{"manager":"Dedicated account manager","returns":"Lifetime returns","free_delivery":"All orders free","discount":"3% cashback"}', '#00CED1', TRUE)
ON CONFLICT (tenant_id, name) DO NOTHING;

-- 16.9  Default Super-Admin User (bcrypt hash for "admin@123")
-- NOTE: hash below = crypt('admin@123', gen_salt('bf')) — change for production!
INSERT INTO public.admin_users
    (tenant_id, company_code, username, name, email, phone, password_hash, role, is_active, status)
VALUES
  (1, 'NMM001',
   'superadmin',
   'Super Administrator',
   'admin@nmmart.in',
   '+91-99999-99999',
   crypt('admin@123', gen_salt('bf')),
   'super_admin',
   TRUE,
   'active'
  )
ON CONFLICT (tenant_id, username) DO NOTHING;

-- Also create a cashier role user (password: "cashier@123")
INSERT INTO public.admin_users
    (tenant_id, company_code, username, name, email, phone, password_hash, role, is_active, status)
VALUES
  (1, 'NMM001',
   'cashier',
   'Counter Cashier',
   'cashier@nmmart.in',
   '+91-98888-88888',
   crypt('cashier@123', gen_salt('bf')),
   'cashier',
   TRUE,
   'active'
  )
ON CONFLICT (tenant_id, username) DO NOTHING;

-- 16.10  Sample HSN Codes (Indian GST Standard)
INSERT INTO public.hsn_master
    (hsn_code, description, gst_percent, cess_percent, is_active)
VALUES
  ('1006',  'Rice (Other than Basmati)',           0,  0, TRUE),
  ('1001',  'Wheat and meslin',                     0,  0, TRUE),
  ('1101',  'Wheat flour (Atta / Maida)',           5,  0, TRUE),
  ('0713',  'Dried leguminous vegetables (Dal)',    5,  0, TRUE),
  ('1701',  'Sugar',                                 5,  0, TRUE),
  ('2101',  'Salt (common / edible)',                0,  0, TRUE),
  ('0904',  'Turmeric (Haldi), Pepper, Spices',     5,  0, TRUE),
  ('0401',  'Milk (raw / pasteurized)',              0,  0, TRUE),
  ('0406',  'Paneer / Cheese',                       5,  0, TRUE),
  ('0405',  'Butter & Ghee',                        12,  0, TRUE),
  ('0210',  'Eggs',                                  0,  0, TRUE),
  ('0805',  'Citrus fruits - Orange, Mosambi',       5,  0, TRUE),
  ('0709',  'Fresh vegetables',                      0,  0, TRUE),
  ('0808',  'Apples, Pears, Banana',                 5,  0, TRUE),
  ('1905',  'Bread, Biscuits, Cakes',               18,  0, TRUE),
  ('2201',  'Mineral / Aerated Water',              18,  0, TRUE),
  ('2202',  'Soft Drinks (Carbonated)',             28, 12, TRUE),
  ('2106',  'Biscuits, Namkeen, Chips',             18,  0, TRUE),
  ('3304',  'Beauty / Cosmetic Products',           18,  0, TRUE),
  ('3401',  'Soap (Toilet / Laundry)',              18,  0, TRUE),
  ('3004',  'Medicaments (OTC / Patented)',         12,  0, TRUE)
ON CONFLICT (hsn_code) DO NOTHING;

-- 16.11  Sample Pincodes (Ahmedabad + Surat)
INSERT INTO public.pincode_master
    (tenant_id, company_code, pincode, city,         state,           is_serviceable, delivery_charge, min_order_amount, estimated_days, is_active)
VALUES
  (1, 'NMM001', '380001', 'Ahmedabad',  'Gujarat',          TRUE,  0, 200, 1, TRUE),
  (1, 'NMM001', '380002', 'Ahmedabad',  'Gujarat',          TRUE, 20, 199, 1, TRUE),
  (1, 'NMM001', '380006', 'Ahmedabad',  'Gujarat',          TRUE, 25, 300, 1, TRUE),
  (1, 'NMM001', '380015', 'Ahmedabad',  'Gujarat',          TRUE, 30, 499, 2, TRUE),
  (1, 'NMM001', '395001', 'Surat',      'Gujarat',          TRUE, 40, 299, 2, TRUE),
  (1, 'NMM001', '395002', 'Surat',      'Gujarat',          TRUE, 40, 299, 2, TRUE),
  (1, 'NMM001', '400001', 'Mumbai',     'Maharashtra',      TRUE, 60, 499, 3, TRUE),
  (1, 'NMM001', '400008', 'Mumbai',     'Maharashtra',      TRUE, 60, 499, 3, TRUE),
  (1, 'NMM001', '110001', 'New Delhi',  'Delhi',            TRUE, 80, 999, 4, TRUE),
  (1, 'NMM001', '560001', 'Bengaluru',  'Karnataka',        TRUE, 80, 999, 4, TRUE)
ON CONFLICT (tenant_id, pincode) DO NOTHING;

-- 16.12  Home Config (Default 5 sections)
INSERT INTO public.home_config
    (tenant_id, company_code, key, section_name, section_type, position, is_active, value, description)
VALUES
  (1, 'NMM001', 'hero_banner_section',    'Hero Banner Slider', 'banners',     1, TRUE, '{"auto_play": true, "interval": 3000}', 'Top rotating banners'),
  (1, 'NMM001', 'category_grid_section', 'Shop By Category',   'categories',  2, TRUE, '{"columns": 4, "show_icons": true}',       'Category circle grid'),
  (1, 'NMM001', 'offer_banner_section',  'Today Offers',       'offers',      3, TRUE, '{"limit": 3}',                            'Offer banners'),
  (1, 'NMM001', 'product_grid_section',  'Best Selling',       'products',    4, TRUE, '{"filter": "best_seller", "limit": 10}',  'Product grid'),
  (1, 'NMM001', 'footer_quick_links',    'Quick Links',        'links',       9, TRUE, '{"about": true, "contact": true, "t_c": true}', 'Footer links')
ON CONFLICT (tenant_id, key) DO NOTHING;

-- =====================================================================
-- 17.  FINAL GRANT PERMISSIONS  (All Supabase roles)
-- =====================================================================
DO $$
DECLARE t TEXT; tables TEXT[] := ARRAY[
  'companies','unit_master','categories','subcategories','brands','department_master',
  'products','stock_alerts','inventory_logs','hsn_master',
  'account_master','purchases','purchase_items',
  'admin_users','users','delivery_customer_master','delivery_boy_master',
  'orders','order_items','pincode_master','addresses',
  'wallet_master','wallet_transactions','credit_master',
  'expense_categories','expenses','payment_transactions',
  'loyalty_tiers','customer_loyalty','loyalty_transactions',
  'coupons','offers_master','banners',
  'app_config','home_config','cart','wishlist',
  'system_logs','notifications','support_tickets'
];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('GRANT ALL ON TABLE public.%I TO anon, authenticated, service_role;', t);
    EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE public.%I_id_seq TO anon, authenticated, service_role;', t);
  END LOOP;
END $$;

COMMIT;

-- =====================================================================
-- END OF CONSOLIDATED MASTER SCHEMA  (38 Tables + 4 RPCs + 7 Views)
-- ---------------------------------------------------------------------
-- How to use:
--   1. Open https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new
--   2. Select "New query" → Paste this ENTIRE file
--   3. Click "RUN" (Green triangle) — Done in ~1-3 seconds.
--
-- Verify after execution:
--   SELECT count(*) FROM information_schema.tables
--   WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
--   → Expected: 39 rows (38 tables + 1 schema_migrations from Supabase)
--
-- Also verify:
--   SELECT count(*) FROM pg_proc WHERE pronamespace = 'public'::regnamespace;
--   → Should include: set_current_timestamp_updated_at, inject_tenant_context_on_insert,
--     install_inject_tenant_triggers_on_all, current_company_code, matches_company_scope,
--     verify_admin_pin, verify_admin_password, adjust_wallet_atomic, place_order_atomic
-- =====================================================================
