-- NM MART - Ultra Retail ERP Database Schema
-- Run this in your Supabase SQL Editor to create all required tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. Core Inventory Tables
-- ============================================

-- Categories Table
CREATE TABLE IF NOT EXISTS categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subcategories Table
CREATE TABLE IF NOT EXISTS subcategories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Brands Table
CREATE TABLE IF NOT EXISTS brands (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    logo_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Units Table
CREATE TABLE IF NOT EXISTS unit_master (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    symbol TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Products (Item Master) Table
CREATE TABLE IF NOT EXISTS products (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    barcode TEXT UNIQUE,
    hsn_code TEXT,
    mrp NUMERIC(10,2) DEFAULT 0,
    sale_rate NUMERIC(10,2) DEFAULT 0,
    purchase_rate NUMERIC(10,2) DEFAULT 0,
    gst_percent NUMERIC(5,2) DEFAULT 0,
    cess_percent NUMERIC(5,2) DEFAULT 0,
    stock NUMERIC(10,2) DEFAULT 0,
    min_qty NUMERIC(10,2) DEFAULT 0,
    low_stock_threshold NUMERIC(10,2) DEFAULT 10,
    discount_percent NUMERIC(5,2) DEFAULT 0,
    size TEXT,
    color TEXT,
    counter_name TEXT,
    image_url TEXT,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    category_name TEXT,
    subcategory_id UUID REFERENCES subcategories(id) ON DELETE SET NULL,
    subcategory_name TEXT,
    brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,
    brand_name TEXT,
    unit_name TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    is_favourite BOOLEAN DEFAULT FALSE,
    is_discountable BOOLEAN DEFAULT TRUE,
    batch_no TEXT,
    expiry_date DATE,
    is_perishable BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Suppliers Table
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    company_name TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    gstin TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Purchases Table
CREATE TABLE IF NOT EXISTS purchases (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    purchase_number TEXT UNIQUE NOT NULL,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    supplier_name TEXT,
    total_amount NUMERIC(10,2) DEFAULT 0,
    discount NUMERIC(10,2) DEFAULT 0,
    tax_amount NUMERIC(10,2) DEFAULT 0,
    grand_total NUMERIC(10,2) DEFAULT 0,
    payment_method TEXT,
    payment_status TEXT DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Purchase Items Table
CREATE TABLE IF NOT EXISTS purchase_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    purchase_id UUID REFERENCES purchases(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    product_name TEXT,
    quantity NUMERIC(10,2) DEFAULT 0,
    unit_price NUMERIC(10,2) DEFAULT 0,
    total_price NUMERIC(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inventory Logs Table
CREATE TABLE IF NOT EXISTS inventory_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    product_name TEXT,
    old_stock NUMERIC(10,2) DEFAULT 0,
    new_stock NUMERIC(10,2) DEFAULT 0,
    change_type TEXT NOT NULL, -- 'purchase', 'sale', 'manual', 'return', etc.
    reference_id TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stock Alerts Table
CREATE TABLE IF NOT EXISTS stock_alerts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    product_name TEXT,
    current_stock NUMERIC(10,2),
    threshold NUMERIC(10,2),
    is_resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. Sales & Orders Tables
-- ============================================

-- Users (App Customers) Table
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT,
    phone TEXT UNIQUE,
    email TEXT,
    address TEXT,
    pincode TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Orders Table
CREATE TABLE IF NOT EXISTS orders (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    order_number TEXT UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    customer_name TEXT,
    user_phone TEXT,
    total_amount NUMERIC(10,2) DEFAULT 0,
    subtotal NUMERIC(10,2) DEFAULT 0,
    discount NUMERIC(10,2) DEFAULT 0,
    delivery_charge NUMERIC(10,2) DEFAULT 0,
    tax_amount NUMERIC(10,2) DEFAULT 0,
    payment_method TEXT,
    payment_status TEXT DEFAULT 'pending',
    order_status TEXT DEFAULT 'pending', -- 'pending', 'confirmed', 'packed', 'out_for_delivery', 'delivered', 'cancelled'
    delivery_address TEXT,
    delivery_boy_id UUID,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Order Items Table
CREATE TABLE IF NOT EXISTS order_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    product_name TEXT,
    quantity NUMERIC(10,2) DEFAULT 0,
    price NUMERIC(10,2) DEFAULT 0,
    total NUMERIC(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 3. Wallet & Finance Tables
-- ============================================

-- Wallet Master Table
CREATE TABLE IF NOT EXISTS wallet_master (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    user_name TEXT,
    user_phone TEXT,
    balance NUMERIC(10,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Wallet Transactions Table
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    wallet_id UUID REFERENCES wallet_master(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    amount NUMERIC(10,2) NOT NULL,
    type TEXT NOT NULL, -- 'credit', 'debit'
    reason TEXT,
    reference_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Expense Categories Table
CREATE TABLE IF NOT EXISTS expense_categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Expenses Table
CREATE TABLE IF NOT EXISTS expenses (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    category_id UUID REFERENCES expense_categories(id) ON DELETE SET NULL,
    category_name TEXT,
    amount NUMERIC(10,2) NOT NULL,
    description TEXT,
    date DATE DEFAULT CURRENT_DATE,
    receipt_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 4. Logistics & Users Tables
-- ============================================

-- Addresses Table
CREATE TABLE IF NOT EXISTS addresses (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    full_address TEXT,
    landmark TEXT,
    pincode TEXT,
    city TEXT,
    state TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pincodes Table
CREATE TABLE IF NOT EXISTS pincode_master (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    pincode TEXT NOT NULL,
    city TEXT,
    state TEXT,
    is_serviceable BOOLEAN DEFAULT TRUE,
    delivery_charge NUMERIC(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admin Users Table
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    username TEXT NOT NULL,
    pin TEXT NOT NULL,
    role TEXT DEFAULT 'super_admin', -- 'super_admin', 'sales_manager', 'inventory_head', 'accountant'
    email TEXT,
    phone TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Delivery Boys Table
CREATE TABLE IF NOT EXISTS delivery_boy_master (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT UNIQUE,
    email TEXT,
    vehicle_details TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Delivery Customers Table
CREATE TABLE IF NOT EXISTS delivery_customer_master (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT UNIQUE,
    email TEXT,
    address TEXT,
    pincode TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Departments Table
CREATE TABLE IF NOT EXISTS department_master (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Accounts Table
CREATE TABLE IF NOT EXISTS account_master (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT, -- 'cash', 'bank', 'wallet', etc.
    balance NUMERIC(10,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Credit Master Table
CREATE TABLE IF NOT EXISTS credit_master (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    customer_id UUID,
    customer_name TEXT,
    customer_phone TEXT,
    amount NUMERIC(10,2) NOT NULL,
    due_date DATE,
    status TEXT DEFAULT 'pending', -- 'pending', 'paid', 'overdue'
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 5. Marketing & Config Tables
-- ============================================

-- Banners Table
CREATE TABLE IF NOT EXISTS banners (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT,
    description TEXT,
    image_url TEXT,
    link_url TEXT,
    order_index INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Coupons Table
CREATE TABLE IF NOT EXISTS coupons (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    description TEXT,
    discount_type TEXT NOT NULL, -- 'percentage', 'fixed'
    discount_value NUMERIC(10,2) NOT NULL,
    min_order_value NUMERIC(10,2) DEFAULT 0,
    max_discount NUMERIC(10,2),
    usage_limit INTEGER,
    used_count INTEGER DEFAULT 0,
    valid_from TIMESTAMP WITH TIME ZONE,
    valid_until TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Offers Table
CREATE TABLE IF NOT EXISTS offers_master (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    offer_type TEXT,
    discount_value NUMERIC(10,2),
    valid_from TIMESTAMP WITH TIME ZONE,
    valid_until TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Home Config Table
CREATE TABLE IF NOT EXISTS home_config (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    type TEXT NOT NULL, -- 'banner_slider', 'category_grid', 'product_scroll', 'promo_banner'
    section_title TEXT,
    order_index INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    config JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- App Config Table
CREATE TABLE IF NOT EXISTS app_config (
    id TEXT PRIMARY KEY DEFAULT 'default',
    store_name TEXT DEFAULT 'NM MART',
    store_address TEXT,
    store_phone TEXT,
    gstin TEXT,
    primary_color TEXT DEFAULT '#FFC107',
    secondary_color TEXT DEFAULT '#212121',
    accent_color TEXT,
    currency TEXT DEFAULT '₹',
    tax_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 6. Customer Loyalty Tables
-- ============================================

-- Customer Loyalty (Points) Table
CREATE TABLE IF NOT EXISTS customer_loyalty (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    user_name TEXT,
    user_phone TEXT,
    points NUMERIC(10,0) DEFAULT 0,
    tier_id UUID,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Loyalty Tiers Table
CREATE TABLE IF NOT EXISTS loyalty_tiers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    min_points INTEGER NOT NULL,
    max_points INTEGER,
    discount_percent NUMERIC(5,2) NOT NULL,
    color TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Loyalty Transactions Table
CREATE TABLE IF NOT EXISTS loyalty_transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    loyalty_id UUID REFERENCES customer_loyalty(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    points INTEGER NOT NULL,
    type TEXT NOT NULL, -- 'earned', 'redeemed'
    reason TEXT,
    reference_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 7. System & Audit Tables
-- ============================================

-- System Logs Table
CREATE TABLE IF NOT EXISTS system_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    table_name TEXT,
    action_type TEXT, -- 'INSERT', 'UPDATE', 'DELETE', 'SOFT_DELETE', etc.
    username TEXT,
    user_role TEXT,
    old_data JSONB,
    new_data JSONB,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'general', -- 'general', 'low_stock', 'order', 'promo'
    reference_id TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cart Table
CREATE TABLE IF NOT EXISTS cart (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    product_name TEXT,
    quantity NUMERIC(10,2) DEFAULT 1,
    price NUMERIC(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Wishlist Table
CREATE TABLE IF NOT EXISTS wishlist (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Support Tickets Table
CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_name TEXT,
    user_phone TEXT,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'open', -- 'open', 'in_progress', 'resolved', 'closed'
    priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Insert Default Data
-- ============================================

-- Insert default admin user (PIN: 1234)
INSERT INTO admin_users (username, pin, role) 
VALUES ('Admin', '1234', 'super_admin')
ON CONFLICT DO NOTHING;

-- Insert default app config
INSERT INTO app_config (id, store_name, currency)
VALUES ('default', 'NM MART', '₹')
ON CONFLICT (id) DO UPDATE SET updated_at = NOW();

-- Insert default loyalty tiers
INSERT INTO loyalty_tiers (name, min_points, max_points, discount_percent, color)
VALUES 
('Bronze', 0, 999, 2, '#CD7F32'),
('Silver', 1000, 4999, 5, '#C0C0C0'),
('Gold', 5000, 99999, 10, '#FFD700')
ON CONFLICT DO NOTHING;

-- Insert default expense categories
INSERT INTO expense_categories (name, description)
VALUES 
('Rent', 'Shop or office rent'),
('Electricity', 'Electricity bills'),
('Salary', 'Employee salaries'),
('Supplies', 'Office or shop supplies'),
('Maintenance', 'Equipment maintenance'),
('Marketing', 'Advertising and marketing'),
('Other', 'Other miscellaneous expenses')
ON CONFLICT DO NOTHING;

-- ============================================
-- Create PostgreSQL Functions (RPC)
-- ============================================

-- Verify Admin PIN Function
CREATE OR REPLACE FUNCTION verify_admin_pin(input_pin TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM admin_users 
        WHERE pin = input_pin AND is_active = TRUE
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Enable Row Level Security (RLS) - Optional but Recommended
-- ============================================
-- Note: Configure RLS policies based on your security needs in Supabase Dashboard

-- Enable RLS on all tables (example)
-- ALTER TABLE products ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
-- ... and so on for other tables

-- Create simple policies for development (allow all authenticated users)
-- CREATE POLICY "Allow all authenticated access" ON products FOR ALL USING (auth.role() = 'authenticated');
-- CREATE POLICY "Allow all authenticated access" ON orders FOR ALL USING (auth.role() = 'authenticated');
-- ... and so on for other tables
