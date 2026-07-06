-- ========================================
-- NM MART - COMPLETE AUDITED SCHEMA WITH RLS POLICIES
-- Last Updated: 2026-07-06
-- ========================================

-- 1. ENABLE REQUIRED EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ========================================
-- 2. CREATE ALL TABLES WITH PROPER STRUCTURE
-- ========================================

-- App Configuration
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
    primary_color TEXT DEFAULT '#FFC107',
    secondary_color TEXT DEFAULT '#212121',
    accent_color TEXT DEFAULT '#FF5722',
    logo_url TEXT,
    brand_name TEXT DEFAULT 'NM MART',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Home Configuration
CREATE TABLE IF NOT EXISTS home_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    section_name TEXT NOT NULL,
    section_type TEXT,
    is_active BOOLEAN DEFAULT true,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Banners
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

-- Categories
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    image_url TEXT,
    position INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Subcategories
CREATE TABLE IF NOT EXISTS subcategories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    image_url TEXT,
    position INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (category_id, name)
);

-- Brands
CREATE TABLE IF NOT EXISTS brands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    code TEXT UNIQUE,
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Units
CREATE TABLE IF NOT EXISTS unit_master (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    code TEXT UNIQUE,
    short_name TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Departments
CREATE TABLE IF NOT EXISTS department_master (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    code TEXT UNIQUE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Products (IMPORTANT: Full table structure)
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    barcode TEXT UNIQUE,
    name TEXT NOT NULL,
    itname TEXT,
    print_name TEXT,
    category_id UUID REFERENCES categories(id),
    category_name TEXT,
    subcategory_id UUID REFERENCES subcategories(id),
    subcategory_name TEXT,
    brand_id UUID REFERENCES brands(id),
    brand_name TEXT,
    brand_code TEXT,
    unit_id UUID REFERENCES unit_master(id),
    unit_name TEXT,
    unit_code TEXT,
    department_id UUID REFERENCES department_master(id),
    department_code TEXT,
    hsn_code TEXT,
    mrp NUMERIC DEFAULT 0.00,
    sale_rate NUMERIC DEFAULT 0.00,
    purchase_rate NUMERIC DEFAULT 0.00,
    take_rate NUMERIC DEFAULT 0,
    retail_rate NUMERIC DEFAULT 0,
    delivery_rate NUMERIC DEFAULT 0,
    online_rate NUMERIC DEFAULT 0,
    onlinerate NUMERIC DEFAULT 0,
    basic_sale_price NUMERIC DEFAULT 0,
    gst NUMERIC DEFAULT 0.00,
    gst_percent NUMERIC DEFAULT 0.00,
    cess NUMERIC DEFAULT 0.00,
    cess_percent NUMERIC DEFAULT 0.00,
    discount NUMERIC DEFAULT 0.00,
    discount_pct NUMERIC DEFAULT 0.00,
    discount_percent NUMERIC DEFAULT 0.00,
    min_qty NUMERIC DEFAULT 1.00,
    stock NUMERIC DEFAULT 0.00,
    opstock NUMERIC DEFAULT 0.00,
    description TEXT,
    image_url TEXT,
    size TEXT,
    color TEXT,
    counter_name TEXT,
    item_group TEXT,
    item_group_code TEXT,
    item_category TEXT,
    item_category_code TEXT,
    k_code TEXT,
    shop_id TEXT,
    is_package TEXT DEFAULT 'No',
    narration TEXT,
    narration2 TEXT,
    item_status TEXT DEFAULT 'Active',
    is_favourite TEXT DEFAULT 'No',
    is_discountable TEXT DEFAULT 'Yes',
    is_active BOOLEAN DEFAULT true,
    is_live_on_app BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Admin Users
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

-- Delivery Boys
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

-- Delivery Customers
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

-- Purchases
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

-- Purchase Items
CREATE TABLE IF NOT EXISTS purchase_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_id UUID REFERENCES purchases(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    quantity NUMERIC NOT NULL,
    rate NUMERIC NOT NULL,
    total NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Orders
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

-- Order Items
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

-- Wallet Master
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

-- Addresses
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

-- Pincode Master
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

-- Offers Master
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

-- Basket (Same as Cart for Compatibility)
CREATE TABLE IF NOT EXISTS basket (
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

-- System Logs (AUDIT TRAIL - IMPORTANT)
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

-- Inventory Logs (Stock Changes)
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

-- Credit Notes
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

-- Return Items
CREATE TABLE IF NOT EXISTS return_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id),
    product_id UUID REFERENCES products(id),
    quantity NUMERIC NOT NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Customer Loyalty
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
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- ========================================

-- Enable RLS on ALL tables
DO $$
DECLARE
    tables CURSOR FOR
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
          AND tablename NOT IN ('pg_stat_statements', 'pg_buffercache');
BEGIN
    FOR table_rec IN tables LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_rec.tablename);
        
        -- Drop existing policies (cleanup)
        EXECUTE format('DROP POLICY IF EXISTS "Enable Full Access" ON %I', table_rec.tablename);
        
        -- Create a simple policy that allows full access (for now, for admin panel)
        EXECUTE format('CREATE POLICY "Enable Full Access" ON %I FOR ALL USING (true) WITH CHECK (true)', table_rec.tablename);
    END LOOP;
END $$;

-- ========================================
-- 4. INSERT DEFAULT DATA
-- ========================================

-- Default App Config
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

-- ========================================
-- 5. AUDIT AND VERIFICATION QUERIES
-- ========================================

-- Query 1: List All Tables
SELECT 'All Tables' AS info, tablename AS table_name 
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Query 2: Get Table Row Counts
SELECT table_name, COUNT(*) AS row_count 
FROM (
    SELECT 'app_config' AS table_name, COUNT(*) FROM app_config UNION ALL
    SELECT 'addresses', COUNT(*) FROM addresses UNION ALL
    SELECT 'admin_users', COUNT(*) FROM admin_users UNION ALL
    SELECT 'banners', COUNT(*) FROM banners UNION ALL
    SELECT 'basket', COUNT(*) FROM basket UNION ALL
    SELECT 'brands', COUNT(*) FROM brands UNION ALL
    SELECT 'cart', COUNT(*) FROM cart UNION ALL
    SELECT 'categories', COUNT(*) FROM categories UNION ALL
    SELECT 'credit_master', COUNT(*) FROM credit_master UNION ALL
    SELECT 'credit_notes', COUNT(*) FROM credit_notes UNION ALL
    SELECT 'customer_loyalty', COUNT(*) FROM customer_loyalty UNION ALL
    SELECT 'delivery_boy_master', COUNT(*) FROM delivery_boy_master UNION ALL
    SELECT 'delivery_customer_master', COUNT(*) FROM delivery_customer_master UNION ALL
    SELECT 'department_master', COUNT(*) FROM department_master UNION ALL
    SELECT 'expense_categories', COUNT(*) FROM expense_categories UNION ALL
    SELECT 'expenses', COUNT(*) FROM expenses UNION ALL
    SELECT 'home_config', COUNT(*) FROM home_config UNION ALL
    SELECT 'inventory_logs', COUNT(*) FROM inventory_logs UNION ALL
    SELECT 'notifications', COUNT(*) FROM notifications UNION ALL
    SELECT 'offers_master', COUNT(*) FROM offers_master UNION ALL
    SELECT 'order_items', COUNT(*) FROM order_items UNION ALL
    SELECT 'orders', COUNT(*) FROM orders UNION ALL
    SELECT 'pincode_master', COUNT(*) FROM pincode_master UNION ALL
    SELECT 'products', COUNT(*) FROM products UNION ALL
    SELECT 'purchase_items', COUNT(*) FROM purchase_items UNION ALL
    SELECT 'purchases', COUNT(*) FROM purchases UNION ALL
    SELECT 'return_items', COUNT(*) FROM return_items UNION ALL
    SELECT 'stock_alerts', COUNT(*) FROM stock_alerts UNION ALL
    SELECT 'subcategories', COUNT(*) FROM subcategories UNION ALL
    SELECT 'support_tickets', COUNT(*) FROM support_tickets UNION ALL
    SELECT 'system_logs', COUNT(*) FROM system_logs UNION ALL
    SELECT 'unit_master', COUNT(*) FROM unit_master UNION ALL
    SELECT 'users', COUNT(*) FROM users UNION ALL
    SELECT 'wallet_master', COUNT(*) FROM wallet_master UNION ALL
    SELECT 'wallet_transactions', COUNT(*) FROM wallet_transactions UNION ALL
    SELECT 'wishlist', COUNT(*) FROM wishlist
) AS counts
ORDER BY row_count DESC;

-- Query 3: Get All Columns for All Tables
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- ========================================
-- 6. READABLE VIEWS (WITHOUT UUIDs)
-- ========================================

-- Readable Products View
CREATE OR REPLACE VIEW readable_products AS
SELECT 
    name,
    itname,
    print_name,
    barcode,
    category_name,
    brand_name,
    unit_name,
    mrp,
    sale_rate,
    onlinerate,
    online_rate,
    stock,
    opstock,
    hsn_code,
    description,
    image_url,
    is_active,
    is_live_on_app,
    created_at,
    updated_at
FROM products
ORDER BY created_at DESC;

-- Readable Categories View
CREATE OR REPLACE VIEW readable_categories AS
SELECT 
    name,
    image_url,
    position,
    is_active,
    created_at,
    updated_at
FROM categories
ORDER BY name;

-- Readable Brands View
CREATE OR REPLACE VIEW readable_brands AS
SELECT 
    name,
    code,
    image_url,
    is_active,
    created_at,
    updated_at
FROM brands
ORDER BY name;

-- Readable Banners View
CREATE OR REPLACE VIEW readable_banners AS
SELECT 
    title,
    image_url,
    position,
    is_active,
    created_at,
    updated_at
FROM banners
ORDER BY position;

-- Readable Coupons View
CREATE OR REPLACE VIEW readable_coupons AS
SELECT 
    code,
    discount_type,
    discount_value,
    min_order_value,
    max_discount,
    usage_limit,
    used_count,
    valid_from,
    valid_to,
    is_active,
    created_at,
    updated_at
FROM coupons
ORDER BY created_at DESC;

-- Readable Orders View
CREATE OR REPLACE VIEW readable_orders AS
SELECT 
    order_number,
    customer_name,
    user_mobile,
    address,
    pincode,
    subtotal,
    delivery_charge,
    discount,
    total_amount,
    payment_mode,
    payment_status,
    order_status,
    created_at,
    updated_at
FROM orders
ORDER BY created_at DESC;

-- Readable Users View
CREATE OR REPLACE VIEW readable_users AS
SELECT 
    name,
    email,
    mobile,
    is_active,
    created_at,
    updated_at
FROM users
ORDER BY created_at DESC;

-- ========================================
-- SCHEMA DEPLOYMENT COMPLETE!
-- ========================================
