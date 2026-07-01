-- ========================================
-- NM MART - COMPREHENSIVE SUPABASE SCHEMA
-- Creates tables IF NOT EXISTS (NO TABLE DELETION!)
-- Adds missing columns, creates necessary functions
-- ========================================

-- Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ========================================
-- 1. CREATE ALL TABLES IF THEY DON'T EXIST
-- ========================================

-- App Config Table
CREATE TABLE IF NOT EXISTS app_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    security_pin TEXT DEFAULT crypt('1234', gen_salt('bf')),
    shop_name TEXT DEFAULT 'NM MART',
    address TEXT,
    mobile TEXT,
    email TEXT,
    gst_no TEXT,
    tax_rate NUMERIC DEFAULT 5,
    enable_guard_verification BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Home Config Table
CREATE TABLE IF NOT EXISTS home_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    section_name TEXT NOT NULL,
    section_type TEXT,
    is_active BOOLEAN DEFAULT true,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Banners Table
CREATE TABLE IF NOT EXISTS banners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT,
    image_url TEXT NOT NULL,
    linked_category_id UUID,
    linked_product_id UUID,
    is_active BOOLEAN DEFAULT true,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Categories Table (Main Categories)
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    image_url TEXT,
    position INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Subcategories Table
CREATE TABLE IF NOT EXISTS subcategories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    position INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Brands Table
CREATE TABLE IF NOT EXISTS brands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    code TEXT UNIQUE,
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Units Table (Unit Master)
CREATE TABLE IF NOT EXISTS unit_master (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    code TEXT UNIQUE,
    short_name TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Departments Table
CREATE TABLE IF NOT EXISTS department_master (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    code TEXT UNIQUE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Item Groups Table
CREATE TABLE IF NOT EXISTS item_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    code TEXT UNIQUE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Item Categories Table
CREATE TABLE IF NOT EXISTS item_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    code TEXT UNIQUE,
    item_group_id UUID REFERENCES item_groups(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Products Table (Item Master)
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    barcode TEXT UNIQUE,
    name TEXT NOT NULL,
    category_id UUID REFERENCES categories(id),
    sub_category_id UUID REFERENCES subcategories(id),
    brand_id UUID REFERENCES brands(id),
    unit_id UUID REFERENCES unit_master(id),
    department_id UUID REFERENCES department_master(id),
    hsn_code TEXT,
    mrp NUMERIC DEFAULT 0.00,
    sale_rate NUMERIC DEFAULT 0.00,
    purchase_rate NUMERIC DEFAULT 0.00,
    gst NUMERIC DEFAULT 0.00,
    gst_percent NUMERIC DEFAULT 0.00,
    cess NUMERIC DEFAULT 0.00,
    cess_percent NUMERIC DEFAULT 0.00,
    discount NUMERIC DEFAULT 0.00,
    discount_pct NUMERIC DEFAULT 0.00,
    discount_percent NUMERIC DEFAULT 0.00,
    min_qty NUMERIC DEFAULT 1.00,
    stock NUMERIC DEFAULT 0.00,
    description TEXT,
    image_url TEXT,
    is_favourite TEXT DEFAULT 'No',
    is_discountable TEXT DEFAULT 'Yes',
    is_active BOOLEAN DEFAULT true,
    is_live_on_app BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Admin Users Table
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    full_name TEXT,
    role TEXT DEFAULT 'admin',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Account Master (Customers/Suppliers)
CREATE TABLE IF NOT EXISTS account_master (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    mobile TEXT UNIQUE,
    email TEXT,
    address TEXT,
    address1 TEXT,
    address2 TEXT,
    pincode TEXT,
    gst_no TEXT,
    account_type TEXT DEFAULT 'Customer',
    opening_balance NUMERIC DEFAULT 0.00,
    current_balance NUMERIC DEFAULT 0.00,
    credit_days INTEGER DEFAULT 0,
    last_purchase_date TIMESTAMP WITH TIME ZONE,
    lastPurchaseDate TIMESTAMP WITH TIME ZONE,
    purchase_count INTEGER DEFAULT 0,
    purchaseCount INTEGER DEFAULT 0,
    total_purchases NUMERIC DEFAULT 0,
    totalPurchases NUMERIC DEFAULT 0,
    rating NUMERIC DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Credit Master
CREATE TABLE IF NOT EXISTS credit_master (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID REFERENCES account_master(id),
    account_name TEXT,
    cr_days INTEGER,
    cr_amount NUMERIC,
    mobile TEXT,
    name TEXT,
    address TEXT,
    amount NUMERIC NOT NULL DEFAULT 0.00,
    type TEXT NOT NULL DEFAULT 'Credit',
    reason TEXT,
    transaction_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Delivery Boys Table
CREATE TABLE IF NOT EXISTS delivery_boy_master (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    mobile TEXT,
    vehicle_type TEXT DEFAULT 'Motorcycle',
    status TEXT DEFAULT 'active',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Delivery Customers Table
CREATE TABLE IF NOT EXISTS delivery_customer_master (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    mobile TEXT NOT NULL,
    address TEXT,
    pincode TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Purchases Table
CREATE TABLE IF NOT EXISTS purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_no TEXT,
    supplier_id UUID REFERENCES account_master(id),
    purchase_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    total_amount NUMERIC DEFAULT 0.00,
    paid_amount NUMERIC DEFAULT 0.00,
    balance_amount NUMERIC DEFAULT 0.00,
    remarks TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Purchase Items Table
CREATE TABLE IF NOT EXISTS purchase_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_id UUID REFERENCES purchases(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    quantity NUMERIC NOT NULL,
    rate NUMERIC NOT NULL,
    total NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Orders Table (Customer Orders)
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number TEXT,
    user_id TEXT,
    customer_name TEXT,
    user_mobile TEXT,
    address TEXT,
    pincode TEXT,
    subtotal NUMERIC NOT NULL,
    delivery_charge NUMERIC DEFAULT 0.00,
    discount NUMERIC DEFAULT 0.00,
    total_amount NUMERIC NOT NULL,
    payment_mode TEXT DEFAULT 'Online',
    payment_status TEXT DEFAULT 'pending',
    order_status TEXT DEFAULT 'pending',
    delivery_boy_id UUID REFERENCES delivery_boy_master(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Order Items Table
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    product_name TEXT NOT NULL,
    quantity NUMERIC NOT NULL,
    rate NUMERIC NOT NULL,
    total NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Wallet Master (User Wallets)
CREATE TABLE IF NOT EXISTS wallet_master (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    balance NUMERIC DEFAULT 0.00,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Wallet Transactions
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    type TEXT NOT NULL,
    reason TEXT,
    transaction_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- User Addresses
CREATE TABLE IF NOT EXISTS addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT,
    full_name TEXT NOT NULL,
    mobile TEXT NOT NULL,
    address_line1 TEXT NOT NULL,
    address_line2 TEXT,
    city TEXT,
    state TEXT,
    pincode TEXT NOT NULL,
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Pincode Master (Serviceable Areas)
CREATE TABLE IF NOT EXISTS pincode_master (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pincode TEXT NOT NULL UNIQUE,
    city TEXT,
    state TEXT,
    delivery_charge NUMERIC DEFAULT 0.00,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Coupons
CREATE TABLE IF NOT EXISTS coupons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT NOT NULL UNIQUE,
    discount_type TEXT NOT NULL,
    discount_value NUMERIC NOT NULL,
    min_order_value NUMERIC DEFAULT 0.00,
    max_discount NUMERIC,
    usage_limit INTEGER,
    used_count INTEGER DEFAULT 0,
    valid_from TIMESTAMP WITH TIME ZONE,
    valid_to TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Offers
CREATE TABLE IF NOT EXISTS offers_master (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    discount_type TEXT,
    discount_value NUMERIC,
    valid_from TIMESTAMP WITH TIME ZONE,
    valid_to TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Cart
CREATE TABLE IF NOT EXISTS cart (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    product_id UUID REFERENCES products(id),
    quantity NUMERIC DEFAULT 1.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Wishlist
CREATE TABLE IF NOT EXISTS wishlist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    product_id UUID REFERENCES products(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Basket (same as cart for compatibility)
CREATE TABLE IF NOT EXISTS basket (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    product_id UUID REFERENCES products(id),
    quantity NUMERIC DEFAULT 1.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT,
    reference_id UUID,
    user_id UUID,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- System Logs (Enhanced for audit)
CREATE TABLE IF NOT EXISTS system_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name TEXT,
    action_type TEXT,
    username TEXT,
    user_role TEXT,
    old_data JSONB,
    new_data JSONB,
    metadata JSONB,
    log_entry TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Users (App Users)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    mobile TEXT UNIQUE NOT NULL,
    password TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Inventory Logs (Audit Trail for stock changes)
CREATE TABLE IF NOT EXISTS inventory_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    old_stock NUMERIC,
    new_stock NUMERIC,
    quantity NUMERIC,
    type TEXT,
    change_type TEXT,
    reference_id TEXT,
    reference_type TEXT,
    notes TEXT,
    created_by UUID,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Credit Notes (For Returns/Exchanges)
CREATE TABLE IF NOT EXISTS credit_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cn_number TEXT UNIQUE NOT NULL,
    original_order_id UUID REFERENCES orders(id),
    customer_mobile TEXT,
    amount NUMERIC NOT NULL,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Return Items (Tracking specific items returned)
CREATE TABLE IF NOT EXISTS return_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id),
    product_id UUID REFERENCES products(id),
    quantity NUMERIC NOT NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Customer Loyalty (Points & Rewards)
CREATE TABLE IF NOT EXISTS customer_loyalty (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_mobile TEXT UNIQUE NOT NULL,
    total_points INTEGER DEFAULT 0,
    lifetime_earnings INTEGER DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Expense Categories
CREATE TABLE IF NOT EXISTS expense_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Expenses
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    amount NUMERIC NOT NULL,
    date DATE DEFAULT CURRENT_DATE,
    expense_date DATE DEFAULT CURRENT_DATE,
    category_id UUID REFERENCES expense_categories(id),
    description TEXT,
    receipt_url TEXT,
    created_by UUID,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Stock Alerts
CREATE TABLE IF NOT EXISTS stock_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) UNIQUE,
    threshold NUMERIC DEFAULT 5.00,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Support Tickets
CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT,
    user_name TEXT,
    user_mobile TEXT,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'open',
    priority TEXT DEFAULT 'medium',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ========================================
-- 2. ADD MISSING COLUMNS TO EXISTING TABLES
-- ========================================

-- App Config additional columns for theming
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'app_config' AND column_name = 'primary_color') THEN
        ALTER TABLE app_config ADD COLUMN primary_color TEXT DEFAULT '#FFC107';
    END IF;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'app_config' AND column_name = 'secondary_color') THEN
        ALTER TABLE app_config ADD COLUMN secondary_color TEXT DEFAULT '#212121';
    END IF;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'app_config' AND column_name = 'accent_color') THEN
        ALTER TABLE app_config ADD COLUMN accent_color TEXT DEFAULT '#FF5722';
    END IF;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'app_config' AND column_name = 'logo_url') THEN
        ALTER TABLE app_config ADD COLUMN logo_url TEXT;
    END IF;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'app_config' AND column_name = 'brand_name') THEN
        ALTER TABLE app_config ADD COLUMN brand_name TEXT DEFAULT 'NM MART';
    END IF;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Expenses additional columns
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'date') THEN
        ALTER TABLE expenses ADD COLUMN date DATE DEFAULT CURRENT_DATE;
    END IF;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'expense_date') THEN
        ALTER TABLE expenses ADD COLUMN expense_date DATE DEFAULT CURRENT_DATE;
    END IF;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Inventory Logs additional columns
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_logs' AND column_name = 'is_active') THEN
        ALTER TABLE inventory_logs ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_logs' AND column_name = 'quantity') THEN
        ALTER TABLE inventory_logs ADD COLUMN quantity NUMERIC;
    END IF;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_logs' AND column_name = 'reference_type') THEN
        ALTER TABLE inventory_logs ADD COLUMN reference_type TEXT;
    END IF;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_logs' AND column_name = 'notes') THEN
        ALTER TABLE inventory_logs ADD COLUMN notes TEXT;
    END IF;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_logs' AND column_name = 'created_by') THEN
        ALTER TABLE inventory_logs ADD COLUMN created_by UUID;
    END IF;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Add is_active to all missing tables
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'credit_master' AND column_name = 'is_active') THEN
        ALTER TABLE credit_master ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'is_active') THEN
        ALTER TABLE orders ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wallet_transactions' AND column_name = 'is_active') THEN
        ALTER TABLE wallet_transactions ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wallet_master' AND column_name = 'is_active') THEN
        ALTER TABLE wallet_master ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'addresses' AND column_name = 'is_active') THEN
        ALTER TABLE addresses ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Make user_id column optional in addresses table
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'addresses' AND column_name = 'user_id' AND is_nullable = 'NO') THEN
        ALTER TABLE addresses ALTER COLUMN user_id DROP NOT NULL;
    END IF;
EXCEPTION WHEN others THEN NULL; END $$;

-- Add credit_days column to account_master table
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'account_master' AND column_name = 'credit_days') THEN
        ALTER TABLE account_master ADD COLUMN credit_days INTEGER DEFAULT 0;
    END IF;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Add last_purchase_date column to account_master table
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'account_master' AND column_name = 'last_purchase_date') THEN
        ALTER TABLE account_master ADD COLUMN last_purchase_date TIMESTAMP WITH TIME ZONE;
    END IF;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Add lastPurchaseDate column to account_master table (camelCase for app compatibility)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'account_master' AND column_name = 'lastPurchaseDate') THEN
        ALTER TABLE account_master ADD COLUMN "lastPurchaseDate" TIMESTAMP WITH TIME ZONE;
    END IF;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Add purchase_count column to account_master table
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'account_master' AND column_name = 'purchase_count') THEN
        ALTER TABLE account_master ADD COLUMN purchase_count INTEGER DEFAULT 0;
    END IF;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Add purchaseCount column to account_master table (camelCase for app compatibility)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'account_master' AND column_name = 'purchaseCount') THEN
        ALTER TABLE account_master ADD COLUMN "purchaseCount" INTEGER DEFAULT 0;
    END IF;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Add rating column to account_master table
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'account_master' AND column_name = 'rating') THEN
        ALTER TABLE account_master ADD COLUMN rating NUMERIC DEFAULT 0;
    END IF;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Add total_purchases column to account_master table
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'account_master' AND column_name = 'total_purchases') THEN
        ALTER TABLE account_master ADD COLUMN total_purchases NUMERIC DEFAULT 0;
    END IF;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Add totalPurchases column to account_master table (camelCase for app compatibility)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'account_master' AND column_name = 'totalPurchases') THEN
        ALTER TABLE account_master ADD COLUMN "totalPurchases" NUMERIC DEFAULT 0;
    END IF;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'delivery_customer_master' AND column_name = 'is_active') THEN
        ALTER TABLE delivery_customer_master ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchases' AND column_name = 'is_active') THEN
        ALTER TABLE purchases ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'delivery_boy_master' AND column_name = 'is_active') THEN
        ALTER TABLE delivery_boy_master ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Add cess_percent column to products table
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'cess_percent') THEN
        ALTER TABLE products ADD COLUMN cess_percent NUMERIC DEFAULT 0.00;
    END IF;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Add discount_percent column to products table
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'discount_percent') THEN
        ALTER TABLE products ADD COLUMN discount_percent NUMERIC DEFAULT 0.00;
    END IF;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Add min_qty column to products table
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'min_qty') THEN
        ALTER TABLE products ADD COLUMN min_qty NUMERIC DEFAULT 1.00;
    END IF;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Add missing columns for Excel import
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'brand_name') THEN
        ALTER TABLE products ADD COLUMN brand_name TEXT;
    END IF;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'category_name') THEN
        ALTER TABLE products ADD COLUMN category_name TEXT;
    END IF;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'subcategory_name') THEN
        ALTER TABLE products ADD COLUMN subcategory_name TEXT;
    END IF;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'unit_name') THEN
        ALTER TABLE products ADD COLUMN unit_name TEXT;
    END IF;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'size') THEN
        ALTER TABLE products ADD COLUMN size TEXT;
    END IF;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'color') THEN
        ALTER TABLE products ADD COLUMN color TEXT;
    END IF;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'counter_name') THEN
        ALTER TABLE products ADD COLUMN counter_name TEXT;
    END IF;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'basic_sale_price') THEN
        ALTER TABLE products ADD COLUMN basic_sale_price NUMERIC DEFAULT 0;
    END IF;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Make sure all foreign key columns are present
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'category_id') THEN
        ALTER TABLE products ADD COLUMN category_id UUID REFERENCES categories(id);
    END IF;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'subcategory_id') THEN
        ALTER TABLE products ADD COLUMN subcategory_id UUID REFERENCES subcategories(id);
    END IF;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'brand_id') THEN
        ALTER TABLE products ADD COLUMN brand_id UUID REFERENCES brands(id);
    END IF;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'unit_id') THEN
        ALTER TABLE products ADD COLUMN unit_id UUID REFERENCES unit_master(id);
    END IF;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'department_id') THEN
        ALTER TABLE products ADD COLUMN department_id UUID REFERENCES department_master(id);
    END IF;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Add columns for Excel import
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'print_name') THEN
        ALTER TABLE products ADD COLUMN print_name TEXT;
    END IF;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'take_rate') THEN
        ALTER TABLE products ADD COLUMN take_rate NUMERIC DEFAULT 0;
    END IF;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'retail_rate') THEN
        ALTER TABLE products ADD COLUMN retail_rate NUMERIC DEFAULT 0;
    END IF;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'delivery_rate') THEN
        ALTER TABLE products ADD COLUMN delivery_rate NUMERIC DEFAULT 0;
    END IF;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'online_rate') THEN
        ALTER TABLE products ADD COLUMN online_rate NUMERIC DEFAULT 0;
    END IF;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'item_group') THEN
        ALTER TABLE products ADD COLUMN item_group TEXT;
    END IF;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'item_category') THEN
        ALTER TABLE products ADD COLUMN item_category TEXT;
    END IF;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'department_code') THEN
        ALTER TABLE products ADD COLUMN department_code TEXT;
    END IF;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'k_code') THEN
        ALTER TABLE products ADD COLUMN k_code TEXT;
    END IF;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'shop_id') THEN
        ALTER TABLE products ADD COLUMN shop_id TEXT;
    END IF;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'is_package') THEN
        ALTER TABLE products ADD COLUMN is_package TEXT DEFAULT 'No';
    END IF;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'narration') THEN
        ALTER TABLE products ADD COLUMN narration TEXT;
    END IF;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'narration2') THEN
        ALTER TABLE products ADD COLUMN narration2 TEXT;
    END IF;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'item_status') THEN
        ALTER TABLE products ADD COLUMN item_status TEXT DEFAULT 'Active';
    END IF;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Add code columns to existing master tables
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'brands' AND column_name = 'code') THEN
        ALTER TABLE brands ADD COLUMN code TEXT UNIQUE;
    END IF;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'unit_master' AND column_name = 'code') THEN
        ALTER TABLE unit_master ADD COLUMN code TEXT UNIQUE;
    END IF;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'department_master' AND column_name = 'code') THEN
        ALTER TABLE department_master ADD COLUMN code TEXT UNIQUE;
    END IF;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Add foreign key columns for item groups and item categories to products table
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'item_group_id') THEN
        ALTER TABLE products ADD COLUMN item_group_id UUID REFERENCES item_groups(id);
    END IF;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'item_category_id') THEN
        ALTER TABLE products ADD COLUMN item_category_id UUID REFERENCES item_categories(id);
    END IF;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Add code columns to products table for Excel import mapping
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'brand_code') THEN
        ALTER TABLE products ADD COLUMN brand_code TEXT;
    END IF;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'unit_code') THEN
        ALTER TABLE products ADD COLUMN unit_code TEXT;
    END IF;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'item_group_code') THEN
        ALTER TABLE products ADD COLUMN item_group_code TEXT;
    END IF;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'item_category_code') THEN
        ALTER TABLE products ADD COLUMN item_category_code TEXT;
    END IF;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Alter existing columns to NUMERIC type to prevent overflow
DO $$ BEGIN
    ALTER TABLE products ALTER COLUMN mrp TYPE NUMERIC;
    ALTER TABLE products ALTER COLUMN sale_rate TYPE NUMERIC;
    ALTER TABLE products ALTER COLUMN purchase_rate TYPE NUMERIC;
    ALTER TABLE products ALTER COLUMN gst TYPE NUMERIC;
    ALTER TABLE products ALTER COLUMN gst_percent TYPE NUMERIC;
    ALTER TABLE products ALTER COLUMN cess TYPE NUMERIC;
    ALTER TABLE products ALTER COLUMN discount TYPE NUMERIC;
    ALTER TABLE products ALTER COLUMN discount_pct TYPE NUMERIC;
    ALTER TABLE products ALTER COLUMN stock TYPE NUMERIC;
EXCEPTION WHEN others THEN NULL; END $$;

-- ========================================
-- 3. INSERT DEFAULT DATA IF NOT EXISTS
-- ========================================

-- Default App Config (only insert if table is empty)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM app_config LIMIT 1) THEN
        INSERT INTO app_config (security_pin, shop_name, address, mobile, gst_no, email) 
        VALUES (crypt('1234', gen_salt('bf')), 'NM MART', 'Naya Nagar, First Dhata Road, Manjhanpur Kaushambi, UP', '7081154604', '09CCFPR9966P1Z9', 'nmmart@gmail.com');
    END IF;
END $$;

-- Default Admin User
INSERT INTO admin_users (username, password, full_name, role) 
VALUES ('admin', 'admin123', 'Admin User', 'admin')
ON CONFLICT (username) DO NOTHING;

-- Default Categories
INSERT INTO categories (id, name, image_url, position) VALUES 
(uuid_generate_v4(), 'Grocery', NULL, 1),
(uuid_generate_v4(), 'Beverages', NULL, 2),
(uuid_generate_v4(), 'Personal Care', NULL, 3)
ON CONFLICT (name) DO NOTHING;

-- Default Brands
INSERT INTO brands (id, name) VALUES 
(uuid_generate_v4(), 'Amul'),
(uuid_generate_v4(), 'Nestle'),
(uuid_generate_v4(), 'Tata Consumer')
ON CONFLICT (name) DO NOTHING;

-- Default Units
INSERT INTO unit_master (id, name, short_name) VALUES 
(uuid_generate_v4(), 'Kilogram', 'KG'),
(uuid_generate_v4(), 'Piece', 'PCS'),
(uuid_generate_v4(), 'Litre', 'LTR'),
(uuid_generate_v4(), 'Packet', 'PKT')
ON CONFLICT (name) DO NOTHING;

-- Default Departments
INSERT INTO department_master (id, name) VALUES 
(uuid_generate_v4(), 'FMCG'),
(uuid_generate_v4(), 'Dairy'),
(uuid_generate_v4(), 'Cosmetics')
ON CONFLICT (name) DO NOTHING;

-- Default Expense Categories
INSERT INTO expense_categories (id, name, description) VALUES 
(uuid_generate_v4(), 'Rent', 'Shop or office rent'),
(uuid_generate_v4(), 'Electricity', 'Electricity bills'),
(uuid_generate_v4(), 'Staff Salary', 'Employee salaries'),
(uuid_generate_v4(), 'Transportation', 'Delivery and logistics'),
(uuid_generate_v4(), 'Utilities', 'Other utilities')
ON CONFLICT (name) DO NOTHING;

-- ========================================
-- 4. CREATE NECESSARY POSTGRESQL FUNCTIONS
-- ========================================

-- Verify Admin PIN Function
CREATE OR REPLACE FUNCTION verify_admin_pin(input_pin TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    is_valid BOOLEAN;
BEGIN
    -- First check admin_users table
    SELECT (password = input_pin) INTO is_valid
    FROM admin_users 
    WHERE is_active = true
    LIMIT 1;
    
    IF is_valid = true THEN
        RETURN true;
    END IF;
    
    -- Fallback to app_config (hashed pin)
    SELECT (security_pin = crypt(input_pin, security_pin)) INTO is_valid
    FROM app_config 
    LIMIT 1;
    
    RETURN COALESCE(is_valid, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atomic Place Order Function
CREATE OR REPLACE FUNCTION place_order_atomic(
    p_order_items JSONB,
    p_order_data JSONB
)
RETURNS UUID AS $$
DECLARE
    v_order_id UUID;
    v_item JSONB;
    v_current_stock NUMERIC;
BEGIN
    -- Insert the order
    INSERT INTO orders (
        order_number, user_id, customer_name, user_mobile, address, pincode,
        subtotal, delivery_charge, discount, total_amount, payment_mode,
        payment_status, order_status
    ) VALUES (
        (p_order_data->>'order_number')::TEXT,
        (p_order_data->>'user_id')::TEXT,
        (p_order_data->>'customer_name')::TEXT,
        (p_order_data->>'user_mobile')::TEXT,
        (p_order_data->>'address')::TEXT,
        (p_order_data->>'pincode')::TEXT,
        (p_order_data->>'subtotal')::NUMERIC,
        (p_order_data->>'delivery_charge')::NUMERIC,
        (p_order_data->>'discount')::NUMERIC,
        (p_order_data->>'total_amount')::NUMERIC,
        (p_order_data->>'payment_mode')::TEXT,
        (p_order_data->>'payment_status')::TEXT,
        (p_order_data->>'order_status')::TEXT
    ) RETURNING id INTO v_order_id;
    
    -- Insert order items and update stock
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_order_items) LOOP
        -- Get current stock
        SELECT stock INTO v_current_stock 
        FROM products 
        WHERE id = (v_item->>'product_id')::UUID;
        
        IF v_current_stock < (v_item->>'quantity')::NUMERIC THEN
            RAISE EXCEPTION 'Insufficient stock for product %', (v_item->>'product_name')::TEXT;
        END IF;
        
        -- Insert order item
        INSERT INTO order_items (
            order_id, product_id, product_name, quantity, rate, total
        ) VALUES (
            v_order_id,
            (v_item->>'product_id')::UUID,
            (v_item->>'product_name')::TEXT,
            (v_item->>'quantity')::NUMERIC,
            (v_item->>'rate')::NUMERIC,
            (v_item->>'total')::NUMERIC
        );
        
        -- Update stock
        UPDATE products 
        SET stock = stock - (v_item->>'quantity')::NUMERIC,
            updated_at = timezone('utc'::text, now())
        WHERE id = (v_item->>'product_id')::UUID;
        
        -- Log inventory change
        INSERT INTO inventory_logs (
            product_id, old_stock, new_stock, quantity, change_type, reference_id, created_at
        ) VALUES (
            (v_item->>'product_id')::UUID,
            v_current_stock,
            v_current_stock - (v_item->>'quantity')::NUMERIC,
            (v_item->>'quantity')::NUMERIC,
            'sale',
            v_order_id::TEXT,
            timezone('utc'::text, now())
        );
    END LOOP;
    
    RETURN v_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atomic Wallet Adjustment Function
CREATE OR REPLACE FUNCTION adjust_wallet_atomic(
    p_user_id TEXT,
    p_amount NUMERIC,
    p_type TEXT,
    p_reason TEXT
)
RETURNS NUMERIC AS $$
DECLARE
    v_wallet_id UUID;
    v_new_balance NUMERIC;
BEGIN
    -- Check if wallet exists
    SELECT id INTO v_wallet_id
    FROM wallet_master
    WHERE user_id = p_user_id;
    
    IF v_wallet_id IS NULL THEN
        -- Create new wallet
        INSERT INTO wallet_master (user_id, balance)
        VALUES (p_user_id, 0.00)
        RETURNING id INTO v_wallet_id;
    END IF;
    
    -- Update balance
    IF p_type = 'credit' THEN
        UPDATE wallet_master
        SET balance = balance + p_amount,
            updated_at = timezone('utc'::text, now())
        WHERE id = v_wallet_id
        RETURNING balance INTO v_new_balance;
    ELSIF p_type = 'debit' THEN
        UPDATE wallet_master
        SET balance = balance - p_amount,
            updated_at = timezone('utc'::text, now())
        WHERE id = v_wallet_id
        RETURNING balance INTO v_new_balance;
        
        IF v_new_balance < 0 THEN
            RAISE EXCEPTION 'Insufficient wallet balance';
        END IF;
    ELSE
        RAISE EXCEPTION 'Invalid transaction type';
    END IF;
    
    -- Log transaction
    INSERT INTO wallet_transactions (
        user_id, amount, type, reason, transaction_date, created_at
    ) VALUES (
        p_user_id,
        p_amount,
        p_type,
        p_reason,
        timezone('utc'::text, now()),
        timezone('utc'::text, now())
    );
    
    RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 5. EXPLICITLY ENABLE RLS AND CREATE POLICIES FOR ALL TABLES
-- ========================================

-- Enable RLS and create policies explicitly for each table
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin Full Access" ON app_config;
CREATE POLICY "Admin Full Access" ON app_config FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE home_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin Full Access" ON home_config;
CREATE POLICY "Admin Full Access" ON home_config FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE banners ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin Full Access" ON banners;
CREATE POLICY "Admin Full Access" ON banners FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin Full Access" ON categories;
CREATE POLICY "Admin Full Access" ON categories FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE subcategories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin Full Access" ON subcategories;
CREATE POLICY "Admin Full Access" ON subcategories FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin Full Access" ON brands;
CREATE POLICY "Admin Full Access" ON brands FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE unit_master ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin Full Access" ON unit_master;
CREATE POLICY "Admin Full Access" ON unit_master FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE department_master ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin Full Access" ON department_master;
CREATE POLICY "Admin Full Access" ON department_master FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE item_groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin Full Access" ON item_groups;
CREATE POLICY "Admin Full Access" ON item_groups FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE item_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin Full Access" ON item_categories;
CREATE POLICY "Admin Full Access" ON item_categories FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin Full Access" ON products;
CREATE POLICY "Admin Full Access" ON products FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin Full Access" ON admin_users;
CREATE POLICY "Admin Full Access" ON admin_users FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE account_master ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin Full Access" ON account_master;
CREATE POLICY "Admin Full Access" ON account_master FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE credit_master ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin Full Access" ON credit_master;
CREATE POLICY "Admin Full Access" ON credit_master FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE delivery_boy_master ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin Full Access" ON delivery_boy_master;
CREATE POLICY "Admin Full Access" ON delivery_boy_master FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE delivery_customer_master ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin Full Access" ON delivery_customer_master;
CREATE POLICY "Admin Full Access" ON delivery_customer_master FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin Full Access" ON purchases;
CREATE POLICY "Admin Full Access" ON purchases FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin Full Access" ON purchase_items;
CREATE POLICY "Admin Full Access" ON purchase_items FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin Full Access" ON orders;
CREATE POLICY "Admin Full Access" ON orders FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin Full Access" ON order_items;
CREATE POLICY "Admin Full Access" ON order_items FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE wallet_master ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin Full Access" ON wallet_master;
CREATE POLICY "Admin Full Access" ON wallet_master FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin Full Access" ON wallet_transactions;
CREATE POLICY "Admin Full Access" ON wallet_transactions FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin Full Access" ON addresses;
CREATE POLICY "Admin Full Access" ON addresses FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE pincode_master ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin Full Access" ON pincode_master;
CREATE POLICY "Admin Full Access" ON pincode_master FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin Full Access" ON coupons;
CREATE POLICY "Admin Full Access" ON coupons FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE offers_master ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin Full Access" ON offers_master;
CREATE POLICY "Admin Full Access" ON offers_master FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE cart ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin Full Access" ON cart;
CREATE POLICY "Admin Full Access" ON cart FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE wishlist ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin Full Access" ON wishlist;
CREATE POLICY "Admin Full Access" ON wishlist FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE basket ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin Full Access" ON basket;
CREATE POLICY "Admin Full Access" ON basket FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin Full Access" ON notifications;
CREATE POLICY "Admin Full Access" ON notifications FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin Full Access" ON system_logs;
CREATE POLICY "Admin Full Access" ON system_logs FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin Full Access" ON users;
CREATE POLICY "Admin Full Access" ON users FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE inventory_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin Full Access" ON inventory_logs;
CREATE POLICY "Admin Full Access" ON inventory_logs FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE credit_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin Full Access" ON credit_notes;
CREATE POLICY "Admin Full Access" ON credit_notes FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE return_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin Full Access" ON return_items;
CREATE POLICY "Admin Full Access" ON return_items FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE customer_loyalty ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin Full Access" ON customer_loyalty;
CREATE POLICY "Admin Full Access" ON customer_loyalty FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin Full Access" ON expense_categories;
CREATE POLICY "Admin Full Access" ON expense_categories FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin Full Access" ON expenses;
CREATE POLICY "Admin Full Access" ON expenses FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE stock_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin Full Access" ON stock_alerts;
CREATE POLICY "Admin Full Access" ON stock_alerts FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin Full Access" ON support_tickets;
CREATE POLICY "Admin Full Access" ON support_tickets FOR ALL USING (true) WITH CHECK (true);

-- ========================================
-- FINISHED!
-- ========================================
NOTIFY pgrst, 'reload schema';
