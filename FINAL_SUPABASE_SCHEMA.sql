
-- NM MART ULTRA RETAIL ERP – PRODUCTION-READY SUPABASE SQL SCHEMA
-- Version: 1.0.3
-- Created: 2026-06-05
-- Database: PostgreSQL (Supabase)

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. app_config – Global App Settings
CREATE TABLE IF NOT EXISTS app_config (
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

-- 2. home_config – Home Page Configuration
CREATE TABLE IF NOT EXISTS home_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    section_name TEXT NOT NULL,
    section_type TEXT,
    is_active BOOLEAN DEFAULT true,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. banners – App Banners
CREATE TABLE IF NOT EXISTS banners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT,
    image_url TEXT NOT NULL,
    description TEXT,
    redirect_path TEXT,
    position INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. categories – Main Categories
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    image_url TEXT,
    position INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. subcategories – Subcategories
CREATE TABLE IF NOT EXISTS subcategories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    image_url TEXT,
    position INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. brands – Brands
CREATE TABLE IF NOT EXISTS brands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    logo_url TEXT,
    position INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. unit_master – Item Units
CREATE TABLE IF NOT EXISTS unit_master (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    short_name TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. department_master – Departments
CREATE TABLE IF NOT EXISTS department_master (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. products – Product Master
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
    mrp NUMERIC(10,2) DEFAULT 0.00,
    sale_rate NUMERIC(10,2) DEFAULT 0.00,
    purchase_rate NUMERIC(10,2) DEFAULT 0.00,
    gst NUMERIC(5,2) DEFAULT 0.00,
    gst_percent NUMERIC(5,2) DEFAULT 0.00,
    cess NUMERIC(5,2) DEFAULT 0.00,
    discount NUMERIC(10,2) DEFAULT 0.00,
    discount_pct NUMERIC(5,2) DEFAULT 0.00,
    stock NUMERIC(10,2) DEFAULT 0.00,
    description TEXT,
    image_url TEXT,
    is_favourite TEXT DEFAULT 'No',
    is_discountable TEXT DEFAULT 'Yes',
    is_active BOOLEAN DEFAULT true,
    is_live_on_app BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. admin_users – Admin Users
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    full_name TEXT,
    role TEXT DEFAULT 'admin',
    permissions JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 11. account_master – Accounts (Customers/Suppliers)
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
    opening_balance NUMERIC(12,2) DEFAULT 0.00,
    current_balance NUMERIC(12,2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 12. credit_master – Credit Transactions
CREATE TABLE IF NOT EXISTS credit_master (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID REFERENCES account_master(id),
    account_name TEXT,
    cr_days INTEGER,
    cr_amount NUMERIC(12,2),
    mobile TEXT,
    name TEXT,
    address TEXT,
    amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    type TEXT NOT NULL DEFAULT 'Credit',
    reason TEXT,
    transaction_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 13. delivery_boy_master – Delivery Boys
CREATE TABLE IF NOT EXISTS delivery_boy_master (
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

-- 14. delivery_customer_master – Delivery Customers
CREATE TABLE IF NOT EXISTS delivery_customer_master (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    mobile TEXT NOT NULL,
    address TEXT,
    pincode TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 15. purchases – Purchase Entries
CREATE TABLE IF NOT EXISTS purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_no TEXT,
    supplier_id UUID REFERENCES account_master(id),
    purchase_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    total_amount NUMERIC(12,2) DEFAULT 0.00,
    paid_amount NUMERIC(12,2) DEFAULT 0.00,
    balance_amount NUMERIC(12,2) DEFAULT 0.00,
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 16. purchase_items – Purchase Items
CREATE TABLE IF NOT EXISTS purchase_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_id UUID REFERENCES purchases(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    quantity NUMERIC(10,2) NOT NULL,
    rate NUMERIC(10,2) NOT NULL,
    total NUMERIC(12,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 17. orders – Customer Orders
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number TEXT,
    user_id UUID,
    customer_name TEXT,
    user_mobile TEXT,
    address TEXT,
    pincode TEXT,
    subtotal NUMERIC(12,2) NOT NULL,
    delivery_charge NUMERIC(10,2) DEFAULT 0.00,
    discount NUMERIC(10,2) DEFAULT 0.00,
    total_amount NUMERIC(12,2) NOT NULL,
    payment_method TEXT DEFAULT 'Online',
    payment_status TEXT DEFAULT 'pending',
    order_status TEXT DEFAULT 'pending',
    delivery_boy_id UUID REFERENCES delivery_boy_master(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 18. order_items – Order Items
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    product_name TEXT NOT NULL,
    quantity NUMERIC(10,2) NOT NULL,
    rate NUMERIC(10,2) NOT NULL,
    total NUMERIC(12,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 19. wallet_master – User Wallets
CREATE TABLE IF NOT EXISTS wallet_master (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    balance NUMERIC(12,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 20. wallet_transactions – Wallet Transactions
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    type TEXT NOT NULL,
    reason TEXT,
    transaction_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 21. addresses – User Addresses
CREATE TABLE IF NOT EXISTS addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    full_name TEXT NOT NULL,
    mobile TEXT NOT NULL,
    house_no TEXT,
    city TEXT,
    state TEXT,
    pincode TEXT NOT NULL,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 22. pincode_master – Serviceable Pincodes
CREATE TABLE IF NOT EXISTS pincode_master (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pincode TEXT NOT NULL UNIQUE,
    city TEXT,
    state TEXT,
    delivery_charge NUMERIC(10,2) DEFAULT 0.00,
    is_allowed BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 23. coupons – Promo Coupons
CREATE TABLE IF NOT EXISTS coupons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT NOT NULL UNIQUE,
    discount_type TEXT NOT NULL,
    discount_value NUMERIC(10,2) NOT NULL,
    min_order_amount NUMERIC(12,2) DEFAULT 0.00,
    max_discount NUMERIC(12,2),
    usage_limit INTEGER,
    used_count INTEGER DEFAULT 0,
    valid_from TIMESTAMP WITH TIME ZONE,
    valid_to TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 24. offers_master – Offers
CREATE TABLE IF NOT EXISTS offers_master (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    discount TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 25. cart – Shopping Cart
CREATE TABLE IF NOT EXISTS cart (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    product_id UUID REFERENCES products(id),
    quantity NUMERIC(10,2) DEFAULT 1.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 26. wishlist – User Wishlist
CREATE TABLE IF NOT EXISTS wishlist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    product_id UUID REFERENCES products(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 27. notifications – Push Notifications
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

-- 28. system_logs – Audit Logs
CREATE TABLE IF NOT EXISTS system_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    log_entry TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 29. users – App Users
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

-- Insert initial data
INSERT INTO app_config (security_pin, shop_name) 
VALUES ('1234', 'NM MART') 
ON CONFLICT DO NOTHING;

INSERT INTO admin_users (username, password, full_name, role)
VALUES ('admin', 'admin123', 'Super Admin', 'admin')
ON CONFLICT DO NOTHING;

-- Grant full permissions to all users (anon and authenticated)
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;

-- 30. bom_master – Bill of Materials
CREATE TABLE IF NOT EXISTS bom_master (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    finished_item_id UUID REFERENCES products(id),
    qty NUMERIC(10,2) DEFAULT 1.00,
    unit TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 31. bom_items – BOM Raw Materials
CREATE TABLE IF NOT EXISTS bom_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bom_id UUID REFERENCES bom_master(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    qty NUMERIC(10,2) NOT NULL,
    unit TEXT,
    rate NUMERIC(12,2) DEFAULT 0.00,
    amount NUMERIC(12,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 32. production_entries – Production Entries
CREATE TABLE IF NOT EXISTS production_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE DEFAULT CURRENT_DATE,
    department TEXT,
    finished_item_id UUID REFERENCES products(id),
    qty NUMERIC(10,2) DEFAULT 1.00,
    total_amount NUMERIC(12,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 33. production_items – Production Raw Materials
CREATE TABLE IF NOT EXISTS production_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    production_id UUID REFERENCES production_entries(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    qty NUMERIC(10,2) NOT NULL,
    rate NUMERIC(12,2) DEFAULT 0.00,
    dis_percent NUMERIC(5,2) DEFAULT 0.00,
    gst_amt NUMERIC(12,2) DEFAULT 0.00,
    amount NUMERIC(12,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 34. stock_transfers – Stock Transfers
CREATE TABLE IF NOT EXISTS stock_transfers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE DEFAULT CURRENT_DATE,
    from_dept TEXT,
    to_dept TEXT,
    po_no TEXT,
    total_qty NUMERIC(10,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 35. stock_transfer_items – Stock Transfer Items
CREATE TABLE IF NOT EXISTS stock_transfer_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transfer_id UUID REFERENCES stock_transfers(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    qty NUMERIC(10,2) NOT NULL,
    rate NUMERIC(12,2) DEFAULT 0.00,
    amount NUMERIC(12,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 36. wastage_entries – Wastage Entries
CREATE TABLE IF NOT EXISTS wastage_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE DEFAULT CURRENT_DATE,
    total_qty NUMERIC(10,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 37. wastage_items – Wastage Items
CREATE TABLE IF NOT EXISTS wastage_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wastage_id UUID REFERENCES wastage_entries(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    qty NUMERIC(10,2) NOT NULL,
    rate NUMERIC(12,2) DEFAULT 0.00,
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 38. purchase_orders – Purchase Orders (PO)
CREATE TABLE IF NOT EXISTS purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_no TEXT UNIQUE,
    date DATE DEFAULT CURRENT_DATE,
    department TEXT,
    total_qty NUMERIC(10,2) DEFAULT 0.00,
    total_amount NUMERIC(12,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 39. po_items – Purchase Order Items
CREATE TABLE IF NOT EXISTS po_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    qty NUMERIC(10,2) NOT NULL,
    unit TEXT,
    rate NUMERIC(12,2) DEFAULT 0.00,
    amount NUMERIC(12,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 40. transactions – General Transactions
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE DEFAULT CURRENT_DATE,
    type TEXT, -- Cash, UPI, Wallet, etc.
    category TEXT, -- Sale, Purchase, Expense, etc.
    account_id UUID REFERENCES account_master(id),
    amount NUMERIC(12,2) DEFAULT 0.00,
    reference_id UUID,
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- --- SUPABASE STORAGE BUCKETS SETUP ---
-- Creating buckets for images
INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('category-images', 'category-images', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('brand-images', 'brand-images', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('banner-images', 'banner-images', true) ON CONFLICT DO NOTHING;

-- Storage RLS Policies (Allow Public Read and Admin Upload)
DROP POLICY IF EXISTS "Public Read Access" ON storage.objects;
CREATE POLICY "Public Read Access" ON storage.objects FOR SELECT USING (bucket_id IN ('product-images', 'category-images', 'brand-images', 'banner-images'));

DROP POLICY IF EXISTS "Admin Full Access" ON storage.objects;
CREATE POLICY "Admin Full Access" ON storage.objects FOR ALL USING (bucket_id IN ('product-images', 'category-images', 'brand-images', 'banner-images')) WITH CHECK (bucket_id IN ('product-images', 'category-images', 'brand-images', 'banner-images'));

-- Enable RLS and Add Public Access Policies (Safe but accessible)
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
        'bom_master', 'bom_items', 'production_entries', 'production_items', 
        'stock_transfers', 'stock_transfer_items', 'wastage_entries', 'wastage_items', 
        'purchase_orders', 'po_items', 'transactions'
    ];
BEGIN 
    FOREACH t IN ARRAY tables LOOP 
        -- Enable RLS
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
        
        -- Drop policy if exists and recreate
        EXECUTE format('DROP POLICY IF EXISTS "Public Full Access" ON %I', t);
        EXECUTE format('CREATE POLICY "Public Full Access" ON %I FOR ALL USING (true) WITH CHECK (true)', t);
    END LOOP; 
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_brand_id ON products(brand_id);
CREATE INDEX IF NOT EXISTS idx_subcategories_category_id ON subcategories(category_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(order_status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id ON wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_user_id ON wishlist(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_product_id ON wishlist(product_id);
CREATE INDEX IF NOT EXISTS idx_cart_user_id ON cart(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_product_id ON cart(product_id);

-- End of schema
