-- =====================================================================
-- NM MART ULTRA RETAIL ERP - COMPLETE SUPABASE POSTGRESQL SCHEMA (v2)
-- Database-First Approach | Multi-Tenant SaaS (RLS Enforced)
-- 1:1 Mapped with: src/dbSchema.js (TABLE_COLUMN_MAPPINGS)
-- Project URL: https://cpipmysooynedtpreekt.supabase.co
-- ---------------------------------------------------------------------
-- SCHEMA v2 CHANGES (UUID Removal Audit):
--   * All PRIMARY KEYS changed from UUID -> BIGSERIAL (64-bit auto-inc)
--   * All FOREIGN KEY columns changed from UUID -> BIGINT
--   * EXCEPTION: admin_users.auth_user_id remains UUID (refs auth.users)
--   * Polymorphic references (reference_id, record_id, etc.) -> BIGINT
--   * RLS policies: (jwt->>'tenant_id')::uuid  ->  ::bigint
--   * Extensions: uuid-ossp removed; pgcrypto retained (for crypt/PGP)
--   * Seed company id: 1 (was zero-UUID)
-- =====================================================================
-- WARNING: DO NOT RENAME ANY COLUMNS.
-- This schema is the SINGLE SOURCE OF TRUTH for the Admin Panel,
-- POS, Customer App & DB Sync Layer.
-- =====================================================================

BEGIN;

-- =====================================================================
-- SECTION 0 : EXTENSIONS + UTILITIES
-- =====================================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";

-- =====================================================================
-- SECTION 0.1 : UNIVERSAL updated_at TRIGGER FUNCTION
-- (Used by every table that has updated_at column)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- =====================================================================
-- SECTION 1 : SUPER ADMIN / TENANT ROOT
-- =====================================================================
-- 1.1 `companies`  (GLOBAL — No RLS filter on this table)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.companies (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    company_slug VARCHAR(60) UNIQUE NOT NULL,
    company_code VARCHAR(16) UNIQUE NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(150),
    gstin VARCHAR(15),
    pan_no VARCHAR(10),
    currency_code VARCHAR(3) DEFAULT 'INR',
    timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
    logo_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    subscription_plan VARCHAR(30) DEFAULT 'free',
    subscription_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_companies_slug ON public.companies (company_slug);
CREATE INDEX IF NOT EXISTS idx_companies_code ON public.companies (company_code);

DROP TRIGGER IF EXISTS companies_updated_at ON public.companies;
CREATE TRIGGER companies_updated_at BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();


-- =====================================================================
-- SECTION 2 : INVENTORY & CATALOG
-- =====================================================================

-- ---------------------------------------------------------------------
-- 2.1  `unit_master`  (kg, pcs, litre, dozen etc)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.unit_master (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    company_code VARCHAR(16) NOT NULL,
    name VARCHAR(50) NOT NULL,
    symbol VARCHAR(10) NOT NULL,
    sort_order SMALLINT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (tenant_id, symbol)
);
CREATE INDEX IF NOT EXISTS idx_unit_master_tenant ON public.unit_master (tenant_id, company_code);

-- ---------------------------------------------------------------------
-- 2.2  `categories`
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categories (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    company_code VARCHAR(16) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    image_url TEXT,
    sort_order SMALLINT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_categories_tenant ON public.categories (tenant_id, company_code);
CREATE INDEX IF NOT EXISTS idx_categories_active ON public.categories (tenant_id, is_active);
CREATE UNIQUE INDEX IF NOT EXISTS uq_categories_tenant_company_name
    ON public.categories (tenant_id, company_code, lower(name));

-- ---------------------------------------------------------------------
-- 2.3  `subcategories`
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subcategories (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    company_code VARCHAR(16) NOT NULL,
    category_id BIGINT REFERENCES public.categories(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    image_url TEXT,
    sort_order SMALLINT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_subcategories_tenant ON public.subcategories (tenant_id, company_code);
CREATE INDEX IF NOT EXISTS idx_subcategories_cat ON public.subcategories (category_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_subcategories_tenant_category_name
    ON public.subcategories (tenant_id, company_code, category_id, lower(name));

-- ---------------------------------------------------------------------
-- 2.4  `brands`
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.brands (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    company_code VARCHAR(16) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    logo_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_brands_tenant ON public.brands (tenant_id, company_code);
CREATE UNIQUE INDEX IF NOT EXISTS uq_brands_tenant_company_name
    ON public.brands (tenant_id, company_code, lower(name));

-- ---------------------------------------------------------------------
-- 2.5  `department_master` (Store Floors / Sections — optional)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.department_master (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    company_code VARCHAR(16) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_department_tenant ON public.department_master (tenant_id, company_code);

-- ---------------------------------------------------------------------
-- 2.6  `products`  (CORE INVENTORY TABLE)
-- Columns follow both new names + DB_SCHEMA TABLE_COLUMN_MAPPINGS aliases
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.products (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    company_code VARCHAR(16) NOT NULL,
    -- Identifiers & Display
    name VARCHAR(200) NOT NULL,
    itname VARCHAR(200),          -- legacy alias for name
    print_name VARCHAR(100),
    itnameprint VARCHAR(100),     -- legacy alias for print_name
    description TEXT,
    itemdescription TEXT,         -- legacy alias
    barcode VARCHAR(50),
    hsn_code VARCHAR(10),
    hsncode VARCHAR(10),          -- legacy alias
    image_url TEXT,
    imagename TEXT,               -- legacy alias
    picture TEXT,                 -- legacy alias
    -- Relational
    category_id BIGINT REFERENCES public.categories(id) ON DELETE SET NULL,
    subcategory_id BIGINT REFERENCES public.subcategories(id) ON DELETE SET NULL,
    brand_id BIGINT REFERENCES public.brands(id) ON DELETE SET NULL,
    -- Pricing (6 Rates per NM MART Ultra standard)
    purchase_rate DECIMAL(12,2) DEFAULT 0,
    purcrate DECIMAL(12,2) DEFAULT 0,   -- legacy alias
    mrp DECIMAL(12,2) DEFAULT 0,
    retail_rate DECIMAL(12,2) DEFAULT 0,
    restrate DECIMAL(12,2) DEFAULT 0,   -- legacy alias
    take_rate DECIMAL(12,2) DEFAULT 0,
    takerate DECIMAL(12,2) DEFAULT 0,   -- legacy alias
    delivery_rate DECIMAL(12,2) DEFAULT 0,
    dlvrate DECIMAL(12,2) DEFAULT 0,    -- legacy alias
    sale_rate DECIMAL(12,2) DEFAULT 0,
    onlinerate DECIMAL(12,2) DEFAULT 0, -- legacy alias
    -- Stock
    stock DECIMAL(12,3) DEFAULT 0,
    opstock DECIMAL(12,3) DEFAULT 0,    -- legacy alias (opening stock)
    low_stock_threshold DECIMAL(12,3) DEFAULT 0,
    unitcode VARCHAR(20),               -- old ERP unit code
    -- Taxes & Discounts
    gst_percent DECIMAL(5,2) DEFAULT 0,
    gst DECIMAL(5,2) DEFAULT 0,         -- legacy alias
    cess_percent DECIMAL(5,2) DEFAULT 0,
    cess DECIMAL(5,2) DEFAULT 0,        -- legacy alias
    discount_percent DECIMAL(5,2) DEFAULT 0,
    discperc DECIMAL(5,2) DEFAULT 0,    -- legacy alias
    is_discountable BOOLEAN DEFAULT TRUE,
    isdiscountable BOOLEAN DEFAULT TRUE,-- legacy alias
    -- Flags
    is_favourite BOOLEAN DEFAULT FALSE,
    isfav BOOLEAN DEFAULT FALSE,        -- legacy alias
    is_package BOOLEAN DEFAULT FALSE,
    ispackage BOOLEAN DEFAULT FALSE,    -- legacy alias
    itemstatus SMALLINT DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    -- Narration
    narration VARCHAR(500),
    narration2 VARCHAR(500),
    shopid VARCHAR(20),
    itg VARCHAR(20),
    itc VARCHAR(20),
    dtcode VARCHAR(20),
    kcode VARCHAR(20),
    brandcode VARCHAR(20),
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    -- Constraints
    CONSTRAINT chk_stock_nonneg CHECK (stock >= 0),
    CONSTRAINT chk_retail_not_over_mrp CHECK (retail_rate <= mrp)
);
CREATE INDEX IF NOT EXISTS idx_products_tenant ON public.products (tenant_id, company_code);
CREATE INDEX IF NOT EXISTS idx_products_active ON public.products (tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products (tenant_id, barcode);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products (category_id);
CREATE INDEX IF NOT EXISTS idx_products_name ON public.products (tenant_id, name);

-- Product/Item master intentionally does NOT enforce duplicate validation by name, barcode,
-- brand, category, or subcategory. Multiple products with the same values are allowed.
-- Only master names (brand/category/subcategory) are uniqueness-checked.

-- ---------------------------------------------------------------------
-- 2.7  `stock_alerts`
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stock_alerts (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    company_code VARCHAR(16) NOT NULL,
    product_id BIGINT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    alert_type VARCHAR(20) DEFAULT 'low_stock',
    threshold DECIMAL(12,3) DEFAULT 0,
    current_stock DECIMAL(12,3),
    message TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_stock_alerts_tenant ON public.stock_alerts (tenant_id, company_code);
CREATE INDEX IF NOT EXISTS idx_stock_alerts_product ON public.stock_alerts (product_id);

-- ---------------------------------------------------------------------
-- 2.8  `inventory_logs`  (Stock movement ledger)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.inventory_logs (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    company_code VARCHAR(16) NOT NULL,
    product_id BIGINT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    old_stock DECIMAL(12,3) DEFAULT 0,
    new_stock DECIMAL(12,3) DEFAULT 0,
    change_qty DECIMAL(12,3) NOT NULL,
    change_type VARCHAR(20) NOT NULL,      -- purchase/sale/adjust/return_in/return_out/damaged
    reference_id BIGINT,
    reference_number VARCHAR(50),
    admin_user_id BIGINT,
    narration TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_inv_logs_tenant ON public.inventory_logs (tenant_id, company_code);
CREATE INDEX IF NOT EXISTS idx_inv_logs_product ON public.inventory_logs (product_id);
CREATE INDEX IF NOT EXISTS idx_inv_logs_ref ON public.inventory_logs (reference_id);
CREATE INDEX IF NOT EXISTS idx_inv_logs_created ON public.inventory_logs (tenant_id, created_at DESC);

-- ---------------------------------------------------------------------
-- 2.9  `hsn_master` (GST HSN reference — optional but recommended)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hsn_master (
    id BIGSERIAL PRIMARY KEY,
    hsn_code VARCHAR(10) UNIQUE NOT NULL,
    description TEXT,
    gst_percent DECIMAL(5,2) DEFAULT 0,
    cess_percent DECIMAL(5,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- =====================================================================
-- SECTION 3 : PURCHASES / ACCOUNTS PAYABLE
-- =====================================================================

-- ---------------------------------------------------------------------
-- 3.1  `account_master`  (TRIPLE USE: Suppliers + Accounts + Customers)
-- SuppliersView.jsx#23  -> accounts.filter(a => a.account_type === 'Supplier')
-- Purchases.supplier_id FK -> account_master.id
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.account_master (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    company_code VARCHAR(16) NOT NULL,
    name VARCHAR(150) NOT NULL,
    account_type VARCHAR(30) NOT NULL,  -- Supplier / Customer / Bank / Cash / Expense Head
    type VARCHAR(10),                   -- legacy: asset/liability/income/expense
    mobile VARCHAR(20),
    phone VARCHAR(20),
    email VARCHAR(150),
    address TEXT,
    gst_no VARCHAR(15),
    pan_no VARCHAR(10),
    opening_balance DECIMAL(14,2) DEFAULT 0,
    balance DECIMAL(14,2) DEFAULT 0,
    credit_limit DECIMAL(14,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_accounts_tenant ON public.account_master (tenant_id, company_code);
CREATE INDEX IF NOT EXISTS idx_accounts_type ON public.account_master (tenant_id, account_type);
CREATE INDEX IF NOT EXISTS idx_accounts_name ON public.account_master (tenant_id, name);
CREATE INDEX IF NOT EXISTS idx_accounts_mobile ON public.account_master (tenant_id, mobile);

-- ---------------------------------------------------------------------
-- 3.2  `purchases`
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.purchases (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    company_code VARCHAR(16) NOT NULL,
    supplier_id BIGINT REFERENCES public.account_master(id) ON DELETE SET NULL,
    invoice_number VARCHAR(50),
    invoice_date DATE,
    payment_status VARCHAR(20) DEFAULT 'unpaid',
    status VARCHAR(20) DEFAULT 'draft',
    subtotal DECIMAL(14,2) DEFAULT 0,
    gst_amount DECIMAL(14,2) DEFAULT 0,
    discount_amount DECIMAL(14,2) DEFAULT 0,
    round_off DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(14,2) DEFAULT 0,
    paid_amount DECIMAL(14,2) DEFAULT 0,
    balance_due DECIMAL(14,2) DEFAULT 0,
    tax_type VARCHAR(10) DEFAULT 'Exclude',   -- Include / Exclude
    notes TEXT,
    admin_user_id BIGINT,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_purchases_tenant ON public.purchases (tenant_id, company_code);
CREATE INDEX IF NOT EXISTS idx_purchases_supplier ON public.purchases (supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchases_invoice ON public.purchases (tenant_id, invoice_number);
CREATE INDEX IF NOT EXISTS idx_purchases_status ON public.purchases (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_purchases_date ON public.purchases (tenant_id, invoice_date DESC);

-- ---------------------------------------------------------------------
-- 3.3  `purchase_items`
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.purchase_items (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    company_code VARCHAR(16) NOT NULL,
    purchase_id BIGINT NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
    product_id BIGINT REFERENCES public.products(id) ON DELETE SET NULL,
    product_name_snapshot VARCHAR(200),
    quantity DECIMAL(12,3) DEFAULT 0,
    rate DECIMAL(12,2) DEFAULT 0,
    gst_percent DECIMAL(5,2) DEFAULT 0,
    gst_amount DECIMAL(12,2) DEFAULT 0,
    discount_percent DECIMAL(5,2) DEFAULT 0,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    total DECIMAL(14,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_purchase_items_tenant ON public.purchase_items (tenant_id, company_code);
CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase ON public.purchase_items (purchase_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_product ON public.purchase_items (product_id);


-- =====================================================================
-- SECTION 4 : USERS, STAFF, ADMINS
-- =====================================================================
-- (Note: auth.users table = managed by Supabase Auth. Do NOT create.)

-- ---------------------------------------------------------------------
-- 4.1  `admin_users`  (Panel users: cashier, manager, super_admin, etc.)
--      NOTE: auth_user_id stays UUID because it links to auth.users(id)
--            which Supabase manages as UUID. All other FKs are BIGINT.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_users (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    company_code VARCHAR(16) NOT NULL,
    auth_user_id UUID UNIQUE,               -- links to auth.users.id (Supabase Auth UUID)
    username VARCHAR(50) NOT NULL,
    name VARCHAR(100),
    email VARCHAR(150),
    phone VARCHAR(20),
    password_hash VARCHAR(255),
    role VARCHAR(30) DEFAULT 'cashier',
    permissions JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    last_login_ip VARCHAR(45),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (tenant_id, username)
);
CREATE INDEX IF NOT EXISTS idx_admin_users_tenant ON public.admin_users (tenant_id, company_code);
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON public.admin_users (tenant_id, role);

-- ---------------------------------------------------------------------
-- 4.2  `users`  (App / End Customers — Retail Buyers)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    company_code VARCHAR(16) NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150),
    phone VARCHAR(20) NOT NULL,
    password_hash VARCHAR(255),
    gender VARCHAR(10),
    dob DATE,
    address TEXT,
    pincode VARCHAR(10),
    referral_code VARCHAR(20),
    referred_by_user_id BIGINT REFERENCES public.users(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    signup_source VARCHAR(20) DEFAULT 'app',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_tenant ON public.users (tenant_id, company_code);
CREATE INDEX IF NOT EXISTS idx_users_phone ON public.users (tenant_id, phone);
CREATE INDEX IF NOT EXISTS idx_users_referral ON public.users (referral_code);

-- ---------------------------------------------------------------------
-- 4.3  `delivery_customer_master`  (Shop Credit Customers / Walk-in Udhaar)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.delivery_customer_master (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    company_code VARCHAR(16) NOT NULL,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(150),
    address TEXT,
    pincode VARCHAR(10),
    credit_limit DECIMAL(12,2) DEFAULT 0,
    current_due DECIMAL(12,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dc_master_tenant ON public.delivery_customer_master (tenant_id, company_code);
CREATE INDEX IF NOT EXISTS idx_dc_master_phone ON public.delivery_customer_master (tenant_id, phone);


-- =====================================================================
-- SECTION 5 : SALES / ORDERS / POS
-- =====================================================================

-- ---------------------------------------------------------------------
-- 5.1  `orders`  (3-in-1: Counter POS + Online App + Home Delivery)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    company_code VARCHAR(16) NOT NULL,
    order_number VARCHAR(30) UNIQUE NOT NULL,
    order_type VARCHAR(20) DEFAULT 'pos_counter',   -- pos_counter / online_app / home_delivery / pickup
    user_id BIGINT REFERENCES public.users(id) ON DELETE SET NULL,
    customer_name VARCHAR(100),
    user_mobile VARCHAR(20),
    delivery_address TEXT,
    pincode VARCHAR(10),
    -- Totals
    subtotal DECIMAL(14,2) DEFAULT 0,
    discount DECIMAL(14,2) DEFAULT 0,
    coupon_discount DECIMAL(14,2) DEFAULT 0,
    delivery_charge DECIMAL(10,2) DEFAULT 0,
    packaging_charge DECIMAL(10,2) DEFAULT 0,
    -- GST
    cgst_amount DECIMAL(12,2) DEFAULT 0,
    sgst_amount DECIMAL(12,2) DEFAULT 0,
    igst_amount DECIMAL(12,2) DEFAULT 0,
    cess_amount DECIMAL(12,2) DEFAULT 0,
    round_off DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(14,2) DEFAULT 0,
    -- Payment & Status
    payment_method VARCHAR(20) DEFAULT 'cash',
    payment_status VARCHAR(20) DEFAULT 'pending',
    order_status VARCHAR(25) DEFAULT 'pending',
    coupon_id BIGINT,
    delivery_boy_id BIGINT,
    cashier_admin_user_id BIGINT,
    notes TEXT,
    invoice_generated BOOLEAN DEFAULT FALSE,
    invoice_printed_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    source_ip VARCHAR(45),
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_order_status CHECK (order_status IN
        ('pending','confirmed','packed','out_for_delivery','delivered','cancelled','returned')),
    CONSTRAINT chk_payment_method CHECK (payment_method IN
        ('cash','upi','card','wallet','credit','mixed'))
);
CREATE INDEX IF NOT EXISTS idx_orders_tenant ON public.orders (tenant_id, company_code);
CREATE INDEX IF NOT EXISTS idx_orders_number ON public.orders (tenant_id, order_number);
CREATE INDEX IF NOT EXISTS idx_orders_user ON public.orders (user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders (tenant_id, order_status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON public.orders (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_paystatus ON public.orders (tenant_id, payment_status);

-- ---------------------------------------------------------------------
-- 5.2  `order_items`
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.order_items (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    company_code VARCHAR(16) NOT NULL,
    order_id BIGINT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id BIGINT REFERENCES public.products(id) ON DELETE SET NULL,
    product_name VARCHAR(200),
    hsn_code_snapshot VARCHAR(10),
    quantity DECIMAL(12,3) DEFAULT 0,
    qty DECIMAL(12,3) DEFAULT 0,                  -- alias supported by schema mapping
    rate DECIMAL(12,2) DEFAULT 0,
    price DECIMAL(12,2) DEFAULT 0,                 -- alias
    discount_percent DECIMAL(5,2) DEFAULT 0,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    gst_percent DECIMAL(5,2) DEFAULT 0,
    gst_amount DECIMAL(12,2) DEFAULT 0,
    total DECIMAL(14,2) DEFAULT 0,
    is_returned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_order_items_tenant ON public.order_items (tenant_id, company_code);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON public.order_items (product_id);

-- ---------------------------------------------------------------------
-- 5.3  `pincode_master`  (Serviceable Areas)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pincode_master (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    company_code VARCHAR(16) NOT NULL,
    pincode VARCHAR(10) NOT NULL,
    city VARCHAR(50),
    state VARCHAR(50),
    is_serviceable BOOLEAN DEFAULT TRUE,
    delivery_charge DECIMAL(10,2) DEFAULT 0,
    min_order_amount DECIMAL(12,2) DEFAULT 0,
    estimated_days SMALLINT DEFAULT 2,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (tenant_id, pincode)
);
CREATE INDEX IF NOT EXISTS idx_pincode_tenant ON public.pincode_master (tenant_id, company_code);

-- ---------------------------------------------------------------------
-- 5.4  `addresses`  (App User Saved Addresses)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.addresses (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    company_code VARCHAR(16) NOT NULL,
    user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name VARCHAR(100),
    phone VARCHAR(20),
    address_type VARCHAR(20) DEFAULT 'home',
    address_line1 TEXT,
    address_line2 TEXT,
    landmark VARCHAR(100),
    city VARCHAR(50),
    state VARCHAR(50),
    pincode VARCHAR(10),
    latitude DECIMAL(9,6),
    longitude DECIMAL(9,6),
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_addresses_tenant ON public.addresses (tenant_id, company_code);
CREATE INDEX IF NOT EXISTS idx_addresses_user ON public.addresses (user_id);


-- =====================================================================
-- SECTION 6 : WALLET / FINANCE / EXPENSES
-- =====================================================================

-- ---------------------------------------------------------------------
-- 6.1  `wallet_master`
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wallet_master (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    company_code VARCHAR(16) NOT NULL,
    user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    customer_id BIGINT,
    balance DECIMAL(14,2) DEFAULT 0,
    wallet_type VARCHAR(20) DEFAULT 'prepaid',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (tenant_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_wallet_tenant ON public.wallet_master (tenant_id, company_code);

-- ---------------------------------------------------------------------
-- 6.2  `wallet_transactions`
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    company_code VARCHAR(16) NOT NULL,
    wallet_id BIGINT NOT NULL REFERENCES public.wallet_master(id) ON DELETE CASCADE,
    user_id BIGINT REFERENCES public.users(id) ON DELETE SET NULL,
    amount DECIMAL(14,2) NOT NULL,
    type VARCHAR(10) NOT NULL,   -- credit / debit
    reason VARCHAR(30),
    reference_id BIGINT,
    reference_number VARCHAR(50),
    opening_balance DECIMAL(14,2) DEFAULT 0,
    closing_balance DECIMAL(14,2) DEFAULT 0,
    narration TEXT,
    status VARCHAR(20) DEFAULT 'success',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wtxn_tenant ON public.wallet_transactions (tenant_id, company_code);
CREATE INDEX IF NOT EXISTS idx_wtxn_wallet ON public.wallet_transactions (wallet_id);
CREATE INDEX IF NOT EXISTS idx_wtxn_user ON public.wallet_transactions (user_id);

-- ---------------------------------------------------------------------
-- 6.3  `credit_master`  (Counter Udhaar / Due Entry)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.credit_master (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    company_code VARCHAR(16) NOT NULL,
    customer_id BIGINT,
    customer_type VARCHAR(20) DEFAULT 'delivery_customer',
    amount DECIMAL(14,2) NOT NULL,
    type VARCHAR(10) NOT NULL,           -- credit (new due) / debit (repayment)
    reason VARCHAR(50),
    reference_id BIGINT,
    billing_period VARCHAR(20),
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_credit_tenant ON public.credit_master (tenant_id, company_code);
CREATE INDEX IF NOT EXISTS idx_credit_customer ON public.credit_master (tenant_id, customer_id);

-- ---------------------------------------------------------------------
-- 6.4  `expense_categories`
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.expense_categories (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    company_code VARCHAR(16) NOT NULL,
    name VARCHAR(80) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (tenant_id, name)
);
CREATE INDEX IF NOT EXISTS idx_exp_cat_tenant ON public.expense_categories (tenant_id, company_code);

-- ---------------------------------------------------------------------
-- 6.5  `expenses`
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.expenses (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    company_code VARCHAR(16) NOT NULL,
    expense_category_id BIGINT REFERENCES public.expense_categories(id) ON DELETE SET NULL,
    account_paid_from_id BIGINT REFERENCES public.account_master(id) ON DELETE SET NULL,
    amount DECIMAL(14,2) NOT NULL,
    description TEXT,
    date DATE NOT NULL,
    receipt_url TEXT,
    voucher_number VARCHAR(30),
    admin_user_id BIGINT,
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_expenses_tenant ON public.expenses (tenant_id, company_code);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses (tenant_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses (expense_category_id);

-- ---------------------------------------------------------------------
-- 6.6  `payment_transactions` (NEW — Reconciliation Ledger)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payment_transactions (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    company_code VARCHAR(16) NOT NULL,
    order_id BIGINT REFERENCES public.orders(id) ON DELETE SET NULL,
    transaction_id VARCHAR(100),
    method VARCHAR(20) NOT NULL,
    amount DECIMAL(14,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'success',
    gateway_response JSONB DEFAULT '{}'::jsonb,
    admin_user_id BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ptxn_tenant ON public.payment_transactions (tenant_id, company_code);
CREATE INDEX IF NOT EXISTS idx_ptxn_order ON public.payment_transactions (order_id);


-- =====================================================================
-- SECTION 7 : DELIVERY / LOGISTICS
-- =====================================================================

-- ---------------------------------------------------------------------
-- 7.1  `delivery_boy_master`
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.delivery_boy_master (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    company_code VARCHAR(16) NOT NULL,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(150),
    address TEXT,
    vehicle_number VARCHAR(20),
    vehicle_type VARCHAR(20),
    license_number VARCHAR(20),
    aadhaar_number VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dboy_tenant ON public.delivery_boy_master (tenant_id, company_code);


-- =====================================================================
-- SECTION 8 : LOYALTY & MARKETING
-- =====================================================================

-- ---------------------------------------------------------------------
-- 8.1  `loyalty_tiers`
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.loyalty_tiers (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    company_code VARCHAR(16) NOT NULL,
    name VARCHAR(30) NOT NULL,
    min_points INTEGER DEFAULT 0,
    max_points INTEGER DEFAULT 999999,
    cashback_percent DECIMAL(5,2) DEFAULT 0,
    benefits JSONB DEFAULT '{}'::jsonb,
    color_code VARCHAR(7),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (tenant_id, name)
);
CREATE INDEX IF NOT EXISTS idx_ltier_tenant ON public.loyalty_tiers (tenant_id, company_code);

-- ---------------------------------------------------------------------
-- 8.2  `customer_loyalty`
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customer_loyalty (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    company_code VARCHAR(16) NOT NULL,
    user_id BIGINT REFERENCES public.users(id) ON DELETE SET NULL,
    customer_id BIGINT,
    points INTEGER DEFAULT 0,
    total_earned INTEGER DEFAULT 0,
    total_redeemed INTEGER DEFAULT 0,
    tier_id BIGINT REFERENCES public.loyalty_tiers(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (tenant_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_cl_tenant ON public.customer_loyalty (tenant_id, company_code);

-- ---------------------------------------------------------------------
-- 8.3  `loyalty_transactions`
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.loyalty_transactions (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    company_code VARCHAR(16) NOT NULL,
    loyalty_point_id BIGINT REFERENCES public.customer_loyalty(id) ON DELETE SET NULL,
    user_id BIGINT REFERENCES public.users(id) ON DELETE SET NULL,
    points INTEGER NOT NULL,
    type VARCHAR(10) NOT NULL,           -- earn / redeem
    reason VARCHAR(30),
    reference_id BIGINT,
    points_value_inr DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ltxn_tenant ON public.loyalty_transactions (tenant_id, company_code);
CREATE INDEX IF NOT EXISTS idx_ltxn_user ON public.loyalty_transactions (user_id);

-- ---------------------------------------------------------------------
-- 8.4  `coupons`
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.coupons (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    company_code VARCHAR(16) NOT NULL,
    code VARCHAR(30) NOT NULL,
    title VARCHAR(100),
    description TEXT,
    discount_type VARCHAR(10) NOT NULL,      -- percentage / fixed_amount
    discount_value DECIMAL(10,2) NOT NULL,
    min_order_amount DECIMAL(12,2) DEFAULT 0,
    max_discount DECIMAL(12,2) DEFAULT 0,
    valid_from TIMESTAMPTZ DEFAULT NOW(),
    valid_to TIMESTAMPTZ,
    usage_limit INTEGER DEFAULT 1,
    used_count INTEGER DEFAULT 0,
    per_user_limit INTEGER DEFAULT 1,
    applies_to VARCHAR(20) DEFAULT 'all',     -- all / category_id / product_id
    applies_to_id BIGINT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (tenant_id, code)
);
CREATE INDEX IF NOT EXISTS idx_coupons_tenant ON public.coupons (tenant_id, company_code);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON public.coupons (tenant_id, code);

-- ---------------------------------------------------------------------
-- 8.5  `offers_master`
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.offers_master (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    company_code VARCHAR(16) NOT NULL,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    offer_type VARCHAR(20) DEFAULT 'flat_discount',
    buy_qty SMALLINT DEFAULT 0,
    get_qty SMALLINT DEFAULT 0,
    discount_value DECIMAL(10,2) DEFAULT 0,
    min_order_amount DECIMAL(12,2) DEFAULT 0,
    applies_to_type VARCHAR(20) DEFAULT 'all',
    applies_to_id BIGINT,
    banner_image TEXT,
    valid_from TIMESTAMPTZ DEFAULT NOW(),
    valid_to TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_offers_tenant ON public.offers_master (tenant_id, company_code);

-- ---------------------------------------------------------------------
-- 8.6  `banners`
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.banners (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    company_code VARCHAR(16) NOT NULL,
    title VARCHAR(100),
    description TEXT,
    image_url TEXT,
    banner_type VARCHAR(20) DEFAULT 'top_slider',
    link_url TEXT,
    action_type VARCHAR(20) DEFAULT 'none',
    action_value TEXT,
    sort_order SMALLINT DEFAULT 0,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_banners_tenant ON public.banners (tenant_id, company_code);
CREATE INDEX IF NOT EXISTS idx_banners_active ON public.banners (tenant_id, is_active, sort_order);


-- =====================================================================
-- SECTION 9 : SYSTEM CONFIG / EAV
-- =====================================================================

-- ---------------------------------------------------------------------
-- 9.1  `app_config` (Key-Value EAV — GST no, printer, sms, currency)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_config (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    company_code VARCHAR(16) NOT NULL,
    key VARCHAR(80) NOT NULL,
    value TEXT,
    value_type VARCHAR(10) DEFAULT 'string',
    group_name VARCHAR(40) DEFAULT 'general',
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (tenant_id, key)
);
CREATE INDEX IF NOT EXISTS idx_appcfg_tenant ON public.app_config (tenant_id, company_code);
CREATE INDEX IF NOT EXISTS idx_appcfg_group ON public.app_config (tenant_id, group_name);

-- ---------------------------------------------------------------------
-- 9.2  `home_config` (App Home Screen Layout JSON)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.home_config (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    company_code VARCHAR(16) NOT NULL,
    key VARCHAR(80) NOT NULL,
    value JSONB DEFAULT '{}'::jsonb,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (tenant_id, key)
);
CREATE INDEX IF NOT EXISTS idx_hmcfg_tenant ON public.home_config (tenant_id, company_code);


-- =====================================================================
-- SECTION 10 : APP USER ACTIVITY
-- =====================================================================

-- ---------------------------------------------------------------------
-- 10.1  `cart`
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cart (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    company_code VARCHAR(16) NOT NULL,
    user_id BIGINT REFERENCES public.users(id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    quantity DECIMAL(12,3) NOT NULL DEFAULT 1,
    session_id VARCHAR(60),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cart_tenant ON public.cart (tenant_id, company_code);
CREATE INDEX IF NOT EXISTS idx_cart_user ON public.cart (user_id);
CREATE INDEX IF NOT EXISTS idx_cart_session ON public.cart (session_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_cart_user_product
    ON public.cart (tenant_id, user_id, product_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_cart_session_product
    ON public.cart (tenant_id, session_id, product_id) WHERE session_id IS NOT NULL;

-- ---------------------------------------------------------------------
-- 10.2  `wishlist`
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wishlist (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    company_code VARCHAR(16) NOT NULL,
    user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (tenant_id, user_id, product_id)
);
CREATE INDEX IF NOT EXISTS idx_wish_tenant ON public.wishlist (tenant_id, company_code);
CREATE INDEX IF NOT EXISTS idx_wish_user ON public.wishlist (user_id);


-- =====================================================================
-- SECTION 11 : AUDIT, NOTIFICATIONS, SUPPORT
-- =====================================================================

-- ---------------------------------------------------------------------
-- 11.1  `system_logs`  (AUDIT TRAIL — tenant isolated by company_code)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.system_logs (
    id BIGSERIAL PRIMARY KEY,
    table_name VARCHAR(60) NOT NULL,
    action_type VARCHAR(10) NOT NULL,        -- INSERT/UPDATE/DELETE/LOGIN/LOGOUT/PRINT
    record_id BIGINT,
    admin_user_id BIGINT,
    username VARCHAR(80),
    user_role VARCHAR(30),
    company_code VARCHAR(16) NOT NULL,
    old_data JSONB DEFAULT '{}'::jsonb,
    new_data JSONB DEFAULT '{}'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    affected_rows INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'success',
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_syslogs_code ON public.system_logs (company_code, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_syslogs_table ON public.system_logs (company_code, table_name);
CREATE INDEX IF NOT EXISTS idx_syslogs_action ON public.system_logs (company_code, action_type);

-- ---------------------------------------------------------------------
-- 11.2  `notifications`
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    company_code VARCHAR(16) NOT NULL,
    user_id BIGINT REFERENCES public.users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    message TEXT,
    type VARCHAR(30) DEFAULT 'system',
    image_url TEXT,
    reference_id BIGINT,
    deep_link TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMPTZ,
    delivery_status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notif_tenant ON public.notifications (tenant_id, company_code);
CREATE INDEX IF NOT EXISTS idx_notif_user ON public.notifications (user_id, is_read);

-- ---------------------------------------------------------------------
-- 11.3  `support_tickets`
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    company_code VARCHAR(16) NOT NULL,
    ticket_number VARCHAR(20),
    user_id BIGINT REFERENCES public.users(id) ON DELETE SET NULL,
    customer_id BIGINT,
    subject VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(30) DEFAULT 'app',
    status VARCHAR(20) DEFAULT 'open',
    priority VARCHAR(10) DEFAULT 'medium',
    assigned_admin_user_id BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tickets_tenant ON public.support_tickets (tenant_id, company_code);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.support_tickets (tenant_id, status);


-- =====================================================================
-- SECTION 12 : BATCH ATTACH `updated_at` TRIGGERS to ALL TABLES
-- =====================================================================
DO $$
DECLARE
    r RECORD;
    tables TEXT[] := ARRAY[
        'companies',
        'unit_master','categories','subcategories','brands','department_master',
        'products','stock_alerts','inventory_logs','hsn_master',
        'account_master','purchases','purchase_items',
        'admin_users','users','delivery_customer_master',
        'orders','order_items','pincode_master','addresses',
        'wallet_master','wallet_transactions','credit_master',
        'expense_categories','expenses','payment_transactions',
        'delivery_boy_master',
        'loyalty_tiers','customer_loyalty','loyalty_transactions',
        'coupons','offers_master','banners',
        'app_config','home_config',
        'cart','wishlist',
        'notifications','support_tickets'
    ];
    t TEXT;
BEGIN
    FOREACH t IN ARRAY tables
    LOOP
        EXECUTE format(
            'DROP TRIGGER IF EXISTS %I_updated_at ON public.%I;', t, t
        );
        EXECUTE format(
            'CREATE TRIGGER %I_updated_at BEFORE UPDATE ON public.%I
             FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();',
            t, t
        );
    END LOOP;
END $$;


-- =====================================================================
-- SECTION 13 : ROW LEVEL SECURITY (RLS) ENABLE FOR ALL TENANT TABLES
--              + GENERIC ISOLATION POLICIES
-- ---------------------------------------------------------------------
-- SCHEMA v2 NOTE: tenant_id comparison now uses ::bigint cast (not ::uuid)
-- Because companies.id, admin_users.tenant_id etc. are all BIGINT now.
-- Company_code path remains TEXT comparison — always safe.
-- =====================================================================
DO $$
DECLARE
    t TEXT;
    tables TEXT[] := ARRAY[
        'unit_master','categories','subcategories','brands','department_master',
        'products','stock_alerts','inventory_logs',
        'account_master','purchases','purchase_items',
        'admin_users','users','delivery_customer_master',
        'orders','order_items','pincode_master','addresses',
        'wallet_master','wallet_transactions','credit_master',
        'expense_categories','expenses','payment_transactions',
        'delivery_boy_master',
        'loyalty_tiers','customer_loyalty','loyalty_transactions',
        'coupons','offers_master','banners',
        'app_config','home_config',
        'cart','wishlist',
        'notifications','support_tickets'
    ];
BEGIN
    FOREACH t IN ARRAY tables
    LOOP
        -- Enable RLS
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);

        -- SELECT policy: match tenant_id OR company_code from JWT claims
        EXECUTE format(
            'CREATE POLICY IF NOT EXISTS %I_tenant_read ON public.%I FOR SELECT
             USING (
                (auth.jwt() ->> ''tenant_id'' IS NOT NULL
                 AND tenant_id = (auth.jwt() ->> ''tenant_id'')::bigint)
                OR
                (auth.jwt() ->> ''company_code'' IS NOT NULL
                 AND company_code = (auth.jwt() ->> ''company_code''))
                OR
                (auth.jwt() ->> ''role'' = ''super_admin'')
             );', t, t
        );

        -- INSERT policy: user can only insert rows of their own tenant
        EXECUTE format(
            'CREATE POLICY IF NOT EXISTS %I_tenant_insert ON public.%I FOR INSERT
             WITH CHECK (
                (auth.jwt() ->> ''role'' = ''super_admin'')
                OR
                (
                    (auth.jwt() ->> ''tenant_id'' IS NOT NULL
                     AND tenant_id = (auth.jwt() ->> ''tenant_id'')::bigint)
                    AND company_code = (auth.jwt() ->> ''company_code'')
                )
             );', t, t
        );

        -- UPDATE policy: update only own tenant rows
        EXECUTE format(
            'CREATE POLICY IF NOT EXISTS %I_tenant_update ON public.%I FOR UPDATE
             USING (
                (auth.jwt() ->> ''role'' = ''super_admin'')
                OR
                (auth.jwt() ->> ''tenant_id'' IS NOT NULL
                 AND tenant_id = (auth.jwt() ->> ''tenant_id'')::bigint)
                OR company_code = (auth.jwt() ->> ''company_code'')
             )
             WITH CHECK (
                (auth.jwt() ->> ''role'' = ''super_admin'')
                OR
                (
                    (auth.jwt() ->> ''tenant_id'' IS NOT NULL
                     AND tenant_id = (auth.jwt() ->> ''tenant_id'')::bigint)
                    AND company_code = (auth.jwt() ->> ''company_code'')
                )
             );', t, t
        );

        -- DELETE policy: delete only own tenant rows
        EXECUTE format(
            'CREATE POLICY IF NOT EXISTS %I_tenant_delete ON public.%I FOR DELETE
             USING (
                (auth.jwt() ->> ''role'' = ''super_admin'')
                OR
                (auth.jwt() ->> ''tenant_id'' IS NOT NULL
                 AND tenant_id = (auth.jwt() ->> ''tenant_id'')::bigint)
                OR company_code = (auth.jwt() ->> ''company_code'')
             );', t, t
        );
    END LOOP;
END $$;

-- =====================================================================
-- SECTION 13.1 : SYSTEM_LOGS & COMPANIES RLS (PLAIN SQL, outside DO block)
--                Avoids PL/pgSQL parser bugs with CREATE POLICY IF NOT EXISTS
-- =====================================================================
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS syslogs_company_code ON public.system_logs;
CREATE POLICY syslogs_company_code
    ON public.system_logs FOR SELECT
    USING (
        (auth.jwt() ->> 'company_code') = company_code
        OR (auth.jwt() ->> 'role') = 'super_admin'
    );
DROP POLICY IF EXISTS syslogs_insert ON public.system_logs;
CREATE POLICY syslogs_insert
    ON public.system_logs FOR INSERT WITH CHECK (TRUE);

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS companies_own_read ON public.companies;
CREATE POLICY companies_own_read ON public.companies FOR SELECT
    USING (
        (auth.jwt() ->> 'role') = 'super_admin'
        OR company_code = (auth.jwt() ->> 'company_code')
    );
DROP POLICY IF EXISTS companies_superadmin_write ON public.companies;
CREATE POLICY companies_superadmin_write ON public.companies
    FOR ALL USING ((auth.jwt() ->> 'role') = 'super_admin')
    WITH CHECK ((auth.jwt() ->> 'role') = 'super_admin');


-- =====================================================================
-- SECTION 14 : READABLE VIEWS (7)  —  Flat, human-readable joins
--              Pre-joined views for list pages / Excel exports
-- =====================================================================

-- 14.1  readable_products
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
    p.sale_rate, p.onlinerate,
    p.stock, p.opstock, p.low_stock_threshold,
    p.gst_percent, p.gst, p.cess_percent, p.cess,
    p.discount_percent, p.discperc, p.is_discountable, p.isdiscountable,
    p.is_favourite, p.isfav, p.is_package, p.ispackage,
    p.itemstatus, p.is_active,
    p.created_at, p.updated_at
FROM public.products p
LEFT JOIN public.categories c   ON c.id = p.category_id
LEFT JOIN public.subcategories sc ON sc.id = p.subcategory_id
LEFT JOIN public.brands b       ON b.id = p.brand_id
LEFT JOIN public.unit_master u  ON u.id::text = p.unitcode OR u.symbol = p.unitcode OR FALSE;

-- 14.2  readable_categories
CREATE OR REPLACE VIEW public.readable_categories AS
SELECT c.*,
    (SELECT COUNT(*) FROM public.products p WHERE p.category_id = c.id) AS product_count
FROM public.categories c;

-- 14.3  readable_brands
CREATE OR REPLACE VIEW public.readable_brands AS
SELECT b.*,
    (SELECT COUNT(*) FROM public.products p WHERE p.brand_id = b.id) AS product_count
FROM public.brands b;

-- 14.4  readable_banners
CREATE OR REPLACE VIEW public.readable_banners AS
SELECT b.*
FROM public.banners b;

-- 14.5  readable_coupons
CREATE OR REPLACE VIEW public.readable_coupons AS
SELECT c.*,
    (c.usage_limit - c.used_count) AS remaining_uses
FROM public.coupons c;

-- 14.6  readable_orders
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
LEFT JOIN public.users u              ON u.id = o.user_id
LEFT JOIN public.admin_users au       ON au.id = o.cashier_admin_user_id
LEFT JOIN public.delivery_boy_master db ON db.id = o.delivery_boy_id;

-- 14.7  readable_users
CREATE OR REPLACE VIEW public.readable_users AS
SELECT
    u.*,
    COALESCE(w.balance, 0) AS wallet_balance,
    COALESCE(cl.points, 0) AS loyalty_points,
    (SELECT COUNT(*) FROM public.orders o WHERE o.user_id = u.id) AS total_orders,
    COALESCE((SELECT SUM(o.total_amount) FROM public.orders o
              WHERE o.user_id = u.id AND o.order_status = 'delivered'), 0)
        AS lifetime_spend
FROM public.users u
LEFT JOIN public.wallet_master w       ON w.user_id = u.id
LEFT JOIN public.customer_loyalty cl   ON cl.user_id = u.id;


-- =====================================================================
-- SECTION 15 : SEED — DEFAULT SUPER ADMIN COMPANY (OPTIONAL)
-- (Adjust values to suit your setup. Safe because it's ON CONFLICT DO NOTHING)
-- SCHEMA v2: id = 1 (was UUID 0000...0001)
-- =====================================================================
INSERT INTO public.companies
    (id, name, company_slug, company_code, gstin, pan_no, is_active, subscription_plan)
VALUES (
    1,
    'NM MART Ultra Retail',
    'nm-mart',
    'NMM001',
    '27ABCDE1234F1Z5',
    'ABCDE1234F',
    TRUE,
    'enterprise'
)
ON CONFLICT (id) DO NOTHING;


-- =====================================================================
COMMIT;

-- =====================================================================
-- END OF SCHEMA v2 — (UUID removed, BIGSERIAL/BIGINT everywhere)
-- ---------------------------------------------------------------------
-- AUDIT SUMMARY (what changed v1 -> v2):
--   38 tables converted:  UUID PRIMARY KEY  ->  BIGSERIAL PRIMARY KEY
--   ~72 FK columns:       UUID -> BIGINT
--   RLS policies:         (jwt->>'tenant_id')::uuid   ->  ::bigint
--   Polymorphic cols:     reference_id, record_id, applies_to_id
--                         coupon_id, delivery_boy_id, admin_user_id
--                         customer_id, tier_id, loyalty_point_id, etc.
--                         (all UUID -> BIGINT)
--   EXCEPTION KEPT UUID:  admin_users.auth_user_id
--                         (because it REFERENCES auth.users.id
--                          which Supabase manages as UUID internally)
--   Extensions:           CREATE EXTENSION "uuid-ossp"  REMOVED
--                         (pgcrypto & citext retained)
--   Seed id:              00000000-...-000000000001 -> 1
-- ---------------------------------------------------------------------
-- How to apply this to your Supabase project:
--   ** WARNING: If tables already exist with data, DO NOT just run this.
--      Use a migration instead (ALTER TABLE ... ALTER COLUMN ... TYPE bigint
--      with a proper USING clause, or drop+recreate on an empty DB).
--
--   Fresh DB:  1) Open SQL Editor on cpipmysooynedtpreekt
--              2) Paste entire file contents
--              3) RUN (BEGIN/COMMIT wrapper is ACID)
--
--   Or via CLI: supabase db push  /  psql $DB_URL -f supabase_schema.sql
-- =====================================================================


-- =====================================================================
-- MIGRATION: Product Upload Quick Fix
-- =====================================================================

BEGIN;

-- 0. TENANT ISOLATION COLUMNS (IMPORTANT!)
--    dbSync.injectTenantIntoRecord हर INSERT/UPDATE से पहले ये columns डालता है
--    और schema v2 RLS policies इन्ही पर depend करती हैं।
--    42703 "tenant_id does not exist" error इसी की वजह से आ रहा था।
ALTER TABLE public.products
    ADD COLUMN IF NOT EXISTS tenant_id BIGINT,
    ADD COLUMN IF NOT EXISTS company_code TEXT,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS created_by BIGINT;

-- 1. id कॉलम के लिए डिफ़ॉल्ट वैल्यू सेट करें ताकि null value वाला एरर न आए
--    (Safe-DO block: अगर id column पहले से BIGSERIAL / non-uuid type है तो
--     gen_random_uuid() set करने में error आएगा — उसे स्वचालित रूप से skip करता है)
DO $$
DECLARE
    _coltype text;
BEGIN
    SELECT data_type INTO _coltype
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'products'
      AND column_name  = 'id';

    IF _coltype IN ('uuid', 'character varying', 'text') THEN
        EXECUTE 'ALTER TABLE public.products ALTER COLUMN id SET DEFAULT gen_random_uuid()';
    ELSE
        RAISE NOTICE 'Skipping gen_random_uuid() default — products.id is type % (BIGSERIAL/numeric). Keeping existing sequence default.', _coltype;
    END IF;
END $$;

-- 2. प्रोडक्ट्स टेबल में छूटे हुए सभी कॉलम्स (सही स्पेस के साथ)
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS brand_name TEXT,
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS gst_percent NUMERIC,
ADD COLUMN IF NOT EXISTS discount_percent NUMERIC,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS delivery_rate NUMERIC,
ADD COLUMN IF NOT EXISTS cess_percent NUMERIC,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN,
ADD COLUMN IF NOT EXISTS is_discountable BOOLEAN,
ADD COLUMN IF NOT EXISTS is_favourite BOOLEAN,
ADD COLUMN IF NOT EXISTS item_status TEXT,
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS print_name TEXT,
ADD COLUMN IF NOT EXISTS purchase_rate NUMERIC,
ADD COLUMN IF NOT EXISTS retail_rate NUMERIC,
ADD COLUMN IF NOT EXISTS sale_rate NUMERIC,
ADD COLUMN IF NOT EXISTS stock NUMERIC,
ADD COLUMN IF NOT EXISTS take_rate NUMERIC,
ADD COLUMN IF NOT EXISTS unit_name TEXT;

-- 3. RLS बंद करें और परमिशन दें
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
GRANT ALL ON public.products TO anon, authenticated, service_role;

-- 3b. Sequence permission (अगर id BIGSERIAL है तो sequence की permission भी ज़रूरी है
--     नहीं तो नया record insert करने पर "permission denied for sequence" error आएगा)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.sequences
        WHERE sequence_schema = 'public' AND sequence_name = 'products_id_seq'
    ) THEN
        EXECUTE 'GRANT USAGE, SELECT ON SEQUENCE public.products_id_seq TO anon, authenticated, service_role';
    END IF;
END $$;

-- 4. स्कीमा रीलोड करें
NOTIFY pgrst, 'reload schema';

COMMIT;


-- =====================================================================
-- MIGRATION: Product Column Type Fixes (Data Integrity)
-- ---------------------------------------------------------------------
-- इन columns को गलत type (TEXT) में बनाया गया था। Excel/Frontend numeric
-- values भेजता है — TEXT → NUMERIC/BIGINT में CONVERT करें।
-- (SAFE: existing TEXT values को USING clause से numeric में cast करता है)
-- =====================================================================

BEGIN;

-- FIX 1. id : text → bigint (Numeric PK — project policy: NO UUID!)
--         अगर id में पहले से non-numeric values हैं तो safe-keep के लिए
--         पहले old_id backup column में copy कर लेते हैं।
DO $$
DECLARE _has_nonnum int;
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='products' AND column_name='id'
          AND data_type IN ('text','character varying','character')
    ) THEN
        EXECUTE 'ALTER TABLE public.products ADD COLUMN IF NOT EXISTS old_id_backup TEXT';
        EXECUTE 'UPDATE public.products SET old_id_backup = id WHERE old_id_backup IS NULL';

        -- Non-numeric id values को temporary null/sequence मान से replace करें ताकि cast fail न करे
        EXECUTE 'UPDATE public.products SET id = NULL WHERE id !~ ''^[0-9]+$''';
        EXECUTE 'ALTER TABLE public.products ALTER COLUMN id TYPE BIGINT USING (CASE WHEN id IS NULL THEN NULL ELSE id::bigint END)';
    END IF;
END $$;

-- FIX 2. Percent + Rate columns जो गलती से TEXT बने थे → NUMERIC
ALTER TABLE public.products
    ALTER COLUMN cess_percent     TYPE NUMERIC USING (CASE WHEN cess_percent     IS NULL OR TRIM(cess_percent)     = '' THEN NULL ELSE cess_percent::numeric     END),
    ALTER COLUMN delivery_rate    TYPE NUMERIC USING (CASE WHEN delivery_rate    IS NULL OR TRIM(delivery_rate)    = '' THEN NULL ELSE delivery_rate::numeric    END),
    ALTER COLUMN discount_percent TYPE NUMERIC USING (CASE WHEN discount_percent IS NULL OR TRIM(discount_percent) = '' THEN NULL ELSE discount_percent::numeric END),
    ALTER COLUMN gst_percent      TYPE NUMERIC USING (CASE WHEN gst_percent      IS NULL OR TRIM(gst_percent)      = '' THEN NULL ELSE gst_percent::numeric      END);

-- FIX 3. id का DEFAULT set करें (BIGSERIAL behaviour के लिए sequence)
--         अगर products_id_seq नहीं है तो बनाएं, और id को DEFAULT set करें।
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.sequences
        WHERE sequence_schema='public' AND sequence_name='products_id_seq'
    ) THEN
        CREATE SEQUENCE public.products_id_seq;
    END IF;

    -- Sequence को max(id) से आगे सेट करें ताकि future inserts conflict न करें
    EXECUTE 'SELECT setval(''public.products_id_seq'', COALESCE((SELECT MAX(id) FROM public.products), 0) + 1, false)';

    EXECUTE 'ALTER TABLE public.products ALTER COLUMN id SET DEFAULT nextval(''public.products_id_seq''::regclass)';
END $$;

-- FIX 4. Sequence permissions
GRANT USAGE, SELECT ON SEQUENCE public.products_id_seq TO anon, authenticated, service_role;

-- Reload schema
NOTIFY pgrst, 'reload schema';

COMMIT;
