
-- NM MART ERP - Supabase Complete SQL Schema
-- Run this in your Supabase SQL Editor
-- Enable UUID extension first
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. App Config Table
CREATE TABLE app_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    security_pin TEXT DEFAULT '1234',
    shop_name TEXT DEFAULT 'NM MART',
    address TEXT,
    mobile TEXT,
    email TEXT,
    gst_no TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert default app config
INSERT INTO app_config (security_pin, shop_name) VALUES ('1234', 'NM MART');

-- 2. Home Config Table
CREATE TABLE home_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    section_name TEXT NOT NULL,
    section_type TEXT,
    is_active BOOLEAN DEFAULT true,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Banners Table
CREATE TABLE banners (
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

-- 4. Categories Table (Main Categories)
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    image_url TEXT,
    position INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Subcategories Table
CREATE TABLE subcategories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    position INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Brands Table
CREATE TABLE brands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Units Table (Unit Master)
CREATE TABLE unit_master (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    short_name TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Departments Table
CREATE TABLE department_master (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. Products Table (Item Master)
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    barcode TEXT UNIQUE,
    item_name TEXT NOT NULL,
    category_id UUID REFERENCES categories(id),
    sub_category_id UUID REFERENCES subcategories(id),
    brand_id UUID REFERENCES brands(id),
    unit_id UUID REFERENCES unit_master(id),
    department_id UUID REFERENCES department_master(id),
    hsn_code TEXT,
    mrp DECIMAL(10,2) DEFAULT 0.00,
    sale_rate DECIMAL(10,2) DEFAULT 0.00,
    purchase_rate DECIMAL(10,2) DEFAULT 0.00,
    gst DECIMAL(5,2) DEFAULT 0.00,
    gst_percent DECIMAL(5,2) DEFAULT 0.00,
    cess DECIMAL(5,2) DEFAULT 0.00,
    discount DECIMAL(10,2) DEFAULT 0.00,
    discount_pct DECIMAL(5,2) DEFAULT 0.00,
    stock DECIMAL(10,2) DEFAULT 0.00,
    description TEXT,
    image_url TEXT,
    is_favourite TEXT DEFAULT 'No',
    is_discountable TEXT DEFAULT 'Yes',
    is_active BOOLEAN DEFAULT true,
    is_live_on_app BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. Admin Users Table
CREATE TABLE admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    full_name TEXT,
    role TEXT DEFAULT 'admin',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert default admin user
INSERT INTO admin_users (username, password, full_name, role) 
VALUES ('admin', 'admin123', 'Admin User', 'admin');

-- 11. Account Master (Customers/Suppliers)
CREATE TABLE account_master (
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
    opening_balance DECIMAL(12,2) DEFAULT 0.00,
    current_balance DECIMAL(12,2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 12. Credit Master
CREATE TABLE credit_master (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID REFERENCES account_master(id),
    account_name TEXT,
    cr_days INTEGER,
    cr_amount DECIMAL(12,2),
    mobile TEXT,
    name TEXT,
    address TEXT,
    amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    type TEXT NOT NULL DEFAULT 'Credit',
    reason TEXT,
    transaction_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 13. Delivery Boys Table
CREATE TABLE delivery_boy_master (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    mobile TEXT,
    vehicle_type TEXT DEFAULT 'Motorcycle',
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 14. Delivery Customers Table
CREATE TABLE delivery_customer_master (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    mobile TEXT NOT NULL,
    address TEXT,
    pincode TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 15. Purchases Table
CREATE TABLE purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_no TEXT,
    supplier_id UUID REFERENCES account_master(id),
    purchase_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    total_amount DECIMAL(12,2) DEFAULT 0.00,
    paid_amount DECIMAL(12,2) DEFAULT 0.00,
    balance_amount DECIMAL(12,2) DEFAULT 0.00,
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 16. Purchase Items Table
CREATE TABLE purchase_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_id UUID REFERENCES purchases(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    quantity DECIMAL(10,2) NOT NULL,
    rate DECIMAL(10,2) NOT NULL,
    total DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 17. Orders Table (Customer Orders)
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number TEXT,
    user_id TEXT,
    customer_name TEXT,
    user_mobile TEXT,
    address TEXT,
    pincode TEXT,
    subtotal DECIMAL(12,2) NOT NULL,
    delivery_charge DECIMAL(10,2) DEFAULT 0.00,
    discount DECIMAL(10,2) DEFAULT 0.00,
    total_amount DECIMAL(12,2) NOT NULL,
    payment_mode TEXT DEFAULT 'Online',
    payment_status TEXT DEFAULT 'pending',
    order_status TEXT DEFAULT 'pending',
    delivery_boy_id UUID REFERENCES delivery_boy_master(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 18. Order Items Table
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    product_name TEXT NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    rate DECIMAL(10,2) NOT NULL,
    total DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 19. Wallet Master (User Wallets)
CREATE TABLE wallet_master (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    balance DECIMAL(12,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 20. Wallet Transactions
CREATE TABLE wallet_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    type TEXT NOT NULL,
    reason TEXT,
    transaction_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 21. User Addresses
CREATE TABLE addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    full_name TEXT NOT NULL,
    mobile TEXT NOT NULL,
    address_line1 TEXT NOT NULL,
    address_line2 TEXT,
    city TEXT,
    state TEXT,
    pincode TEXT NOT NULL,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 22. Pincode Master (Serviceable Areas)
CREATE TABLE pincode_master (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pincode TEXT NOT NULL UNIQUE,
    city TEXT,
    state TEXT,
    delivery_charge DECIMAL(10,2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 23. Coupons
CREATE TABLE coupons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT NOT NULL UNIQUE,
    discount_type TEXT NOT NULL,
    discount_value DECIMAL(10,2) NOT NULL,
    min_order_value DECIMAL(12,2) DEFAULT 0.00,
    max_discount DECIMAL(12,2),
    usage_limit INTEGER,
    used_count INTEGER DEFAULT 0,
    valid_from TIMESTAMP WITH TIME ZONE,
    valid_to TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 24. Offers
CREATE TABLE offers_master (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    discount_type TEXT,
    discount_value DECIMAL(10,2),
    valid_from TIMESTAMP WITH TIME ZONE,
    valid_to TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 25. Cart
CREATE TABLE cart (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    product_id UUID REFERENCES products(id),
    quantity DECIMAL(10,2) DEFAULT 1.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 26. Wishlist
CREATE TABLE wishlist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    product_id UUID REFERENCES products(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 27. Notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT,
    reference_id UUID,
    user_id UUID,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 28. System Logs
CREATE TABLE system_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    log_entry TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 29. Users (App Users)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    mobile TEXT UNIQUE NOT NULL,
    password TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 30. Inventory Logs (Audit Trail for stock changes)
CREATE TABLE inventory_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    old_stock DECIMAL(10,2),
    new_stock DECIMAL(10,2),
    change_type TEXT, -- 'sale', 'purchase', 'return', 'manual'
    reference_id TEXT, -- order_number or invoice_no
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 31. Credit Notes (For Returns/Exchanges)
CREATE TABLE credit_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cn_number TEXT UNIQUE NOT NULL,
    original_order_id UUID REFERENCES orders(id),
    customer_mobile TEXT,
    amount DECIMAL(12,2) NOT NULL,
    status TEXT DEFAULT 'active', -- 'active', 'used', 'expired'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 32. Return Items (Tracking specific items returned)
CREATE TABLE return_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id),
    product_id UUID REFERENCES products(id),
    quantity DECIMAL(10,2) NOT NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 33. Customer Loyalty (Points & Rewards)
CREATE TABLE customer_loyalty (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_mobile TEXT UNIQUE NOT NULL,
    total_points INTEGER DEFAULT 0,
    lifetime_earnings INTEGER DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 34. Sample Data & Initial Setup
-- Run these after creating all tables

-- Insert Default Categories
INSERT INTO categories (id, name, image_url, position) VALUES 
(uuid_generate_v4(), 'Grocery', 'https://cpipmysooynedtpreekt.supabase.co/storage/v1/object/public/category-images/grocery.png', 1),
(uuid_generate_v4(), 'Beverages', 'https://cpipmysooynedtpreekt.supabase.co/storage/v1/object/public/category-images/beverages.png', 2),
(uuid_generate_v4(), 'Personal Care', 'https://cpipmysooynedtpreekt.supabase.co/storage/v1/object/public/category-images/care.png', 3)
ON CONFLICT (name) DO NOTHING;

-- Insert Default Brands
INSERT INTO brands (id, name) VALUES 
(uuid_generate_v4(), 'Amul'),
(uuid_generate_v4(), 'Nestle'),
(uuid_generate_v4(), 'Tata Consumer')
ON CONFLICT (name) DO NOTHING;

-- Insert Default Units
INSERT INTO unit_master (id, name, short_name) VALUES 
(uuid_generate_v4(), 'Kilogram', 'KG'),
(uuid_generate_v4(), 'Piece', 'PCS'),
(uuid_generate_v4(), 'Litre', 'LTR'),
(uuid_generate_v4(), 'Packet', 'PKT')
ON CONFLICT (name) DO NOTHING;

-- Insert Default Departments
INSERT INTO department_master (id, name) VALUES 
(uuid_generate_v4(), 'FMCG'),
(uuid_generate_v4(), 'Dairy'),
(uuid_generate_v4(), 'Cosmetics')
ON CONFLICT (name) DO NOTHING;

-- Update App Config with detailed info
UPDATE app_config SET 
    address = 'Naya Nagar, First Dhata Road, Manjhanpur Kaushambi, UP',
    mobile = '7081154604',
    gst_no = '09CCFPR9966P1Z9',
    email = 'nmmart@gmail.com'
WHERE shop_name = 'NM MART';

-- Final RLS and Verification
-- NOTE: In production, change 'anon' to 'authenticated' and use Supabase Auth
DO $$ 
DECLARE 
    t TEXT;
    tables TEXT[] := ARRAY[
        'app_config', 'home_config', 'banners', 'categories', 'subcategories', 
        'brands', 'unit_master', 'department_master', 'products', 'admin_users', 
        'account_master', 'credit_master', 'delivery_boy_master', 'delivery_customer_master', 
        'purchases', 'purchase_items', 'orders', 'order_items', 'wallet_master', 
        'wallet_transactions', 'addresses', 'pincode_master', 'coupons', 'offers_master', 
        'cart', 'wishlist', 'notifications', 'system_logs', 'users',
        'inventory_logs', 'credit_notes', 'return_items', 'customer_loyalty'
    ];
BEGIN 
    FOREACH t IN ARRAY tables LOOP 
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('DROP POLICY IF EXISTS "Public Full Access" ON %I', t);
        -- More secure policy: Only allow access if a specific header or authenticated role is present
        -- For now, we allow 'anon' for development, but recommend switching to 'authenticated'
        EXECUTE format('CREATE POLICY "Authenticated Access Only" ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true)', t);
        -- Temporary policy for admin dashboard (using anon key) - SHOULD BE REPLACED WITH AUTH
        EXECUTE format('CREATE POLICY "Admin Dashboard Access" ON %I FOR ALL TO anon USING (true) WITH CHECK (true)', t);
    END LOOP; 
END $$;

-- RPC Function to verify PIN securely on server-side
CREATE OR REPLACE FUNCTION verify_admin_pin(input_pin TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM app_config 
        WHERE security_pin = input_pin
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
