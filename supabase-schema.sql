-- ========================================
-- NM MART - COMPREHENSIVE SUPABASE SCHEMA
-- Creates tables IF NOT EXISTS, adds missing columns, creates functions
-- ========================================

-- Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ========================================
-- TABLE: app_config
-- ========================================
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

-- ========================================
-- TABLE: home_config
-- ========================================
CREATE TABLE IF NOT EXISTS home_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    section_name TEXT NOT NULL,
    section_type TEXT,
    is_active BOOLEAN DEFAULT true,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ========================================
-- TABLE: banners (with click action support)
-- ========================================
CREATE TABLE IF NOT EXISTS banners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT,
    image_url TEXT NOT NULL,
    linked_category_id UUID,
    linked_product_id UUID,
    link_url TEXT,
    link_type TEXT DEFAULT 'none', -- 'none', 'product', 'category', 'url'
    is_active BOOLEAN DEFAULT true,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ========================================
-- TABLE: categories
-- ========================================
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    image_url TEXT,
    position INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ========================================
-- TABLE: subcategories
-- ========================================
CREATE TABLE IF NOT EXISTS subcategories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    position INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ========================================
-- TABLE: brands
-- ========================================
CREATE TABLE IF NOT EXISTS brands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    code TEXT UNIQUE,
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ========================================
-- TABLE: unit_master
-- ========================================
CREATE TABLE IF NOT EXISTS unit_master (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    code TEXT UNIQUE,
    short_name TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ========================================
-- TABLE: department_master
-- ========================================
CREATE TABLE IF NOT EXISTS department_master (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    code TEXT UNIQUE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ========================================
-- TABLE: item_groups
-- ========================================
CREATE TABLE IF NOT EXISTS item_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    code TEXT UNIQUE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ========================================
-- TABLE: item_categories
-- ========================================
CREATE TABLE IF NOT EXISTS item_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    code TEXT UNIQUE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ========================================
-- TABLE: products (FULL SCHEMA for Excel import)
-- ========================================
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    barcode TEXT UNIQUE,
    name TEXT NOT NULL,
    print_name TEXT,
    category_id UUID REFERENCES categories(id),
    category_name TEXT,
    subcategory_id UUID REFERENCES subcategories(id),
    subcategory_name TEXT,
    brand_id UUID REFERENCES brands(id),
    brand_name TEXT,
    unit_id UUID REFERENCES unit_master(id),
    unit_name TEXT,
    department_id UUID REFERENCES department_master(id),
    department_code TEXT,
    k_code TEXT,
    shop_id TEXT,
    hsn_code TEXT,
    mrp NUMERIC DEFAULT 0.00,
    sale_rate NUMERIC DEFAULT 0.00,
    purchase_rate NUMERIC DEFAULT 0.00,
    take_rate NUMERIC DEFAULT 0.00,
    retail_rate NUMERIC DEFAULT 0.00,
    delivery_rate NUMERIC DEFAULT 0.00,
    online_rate NUMERIC DEFAULT 0.00,
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
    size TEXT,
    color TEXT,
    counter_name TEXT,
    description TEXT,
    image_url TEXT,
    is_favourite TEXT DEFAULT 'No',
    is_discountable TEXT DEFAULT 'Yes',
    is_package TEXT DEFAULT 'No',
    is_active BOOLEAN DEFAULT true,
    is_live_on_app BOOLEAN DEFAULT false,
    item_group TEXT,
    item_category TEXT,
    narration TEXT,
    narration2 TEXT,
    item_status TEXT DEFAULT 'Active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ========================================
-- TABLE: admin_users
-- ========================================
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

-- ========================================
-- TABLE: account_master
-- ========================================
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
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ========================================
-- TABLE: credit_master
-- ========================================
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

-- ========================================
-- TABLE: delivery_boy_master
-- ========================================
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

-- ========================================
-- TABLE: delivery_customer_master
-- ========================================
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

-- ========================================
-- TABLE: purchases
-- ========================================
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

-- ========================================
-- TABLE: purchase_items
-- ========================================
CREATE TABLE IF NOT EXISTS purchase_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_id UUID REFERENCES purchases(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    quantity NUMERIC NOT NULL,
    rate NUMERIC NOT NULL,
    total NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ========================================
-- TABLE: orders
-- ========================================
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

-- ========================================
-- TABLE: order_items
-- ========================================
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

-- ========================================
-- TABLE: wallet_master
-- ========================================
CREATE TABLE IF NOT EXISTS wallet_master (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    balance NUMERIC DEFAULT 0.00,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ========================================
-- TABLE: wallet_transactions
-- ========================================
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

-- ========================================
-- TABLE: addresses
-- ========================================
CREATE TABLE IF NOT EXISTS addresses (
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
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ========================================
-- TABLE: pincode_master
-- ========================================
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

-- ========================================
-- TABLE: coupons
-- ========================================
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

-- ========================================
-- TABLE: offers_master
-- ========================================
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

-- ========================================
-- TABLE: cart
-- ========================================
CREATE TABLE IF NOT EXISTS cart (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    product_id UUID REFERENCES products(id),
    quantity NUMERIC DEFAULT 1.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ========================================
-- TABLE: wishlist
-- ========================================
CREATE TABLE IF NOT EXISTS wishlist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    product_id UUID REFERENCES products(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ========================================
-- TABLE: basket (for compatibility)
-- ========================================
CREATE TABLE IF NOT EXISTS basket (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    product_id UUID REFERENCES products(id),
    quantity NUMERIC DEFAULT 1.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ========================================
-- TABLE: notifications
-- ========================================
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

-- ========================================
-- TABLE: system_logs
-- ========================================
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

-- ========================================
-- TABLE: users (App Users)
-- ========================================
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

-- ========================================
-- TABLE: inventory_logs
-- ========================================
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

-- ========================================
-- TABLE: credit_notes
-- ========================================
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

-- ========================================
-- TABLE: return_items
-- ========================================
CREATE TABLE IF NOT EXISTS return_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id),
    product_id UUID REFERENCES products(id),
    quantity NUMERIC NOT NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ========================================
-- TABLE: customer_loyalty
-- ========================================
CREATE TABLE IF NOT EXISTS customer_loyalty (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_mobile TEXT UNIQUE NOT NULL,
    total_points INTEGER DEFAULT 0,
    lifetime_earnings INTEGER DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ========================================
-- TABLE: expense_categories
-- ========================================
CREATE TABLE IF NOT EXISTS expense_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ========================================
-- TABLE: expenses
-- ========================================
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

-- ========================================
-- TABLE: stock_alerts
-- ========================================
CREATE TABLE IF NOT EXISTS stock_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) UNIQUE,
    threshold NUMERIC DEFAULT 5.00,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ========================================
-- TABLE: support_tickets
-- ========================================
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
-- INSERT DEFAULT DATA
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
-- CREATE REQUIRED FUNCTIONS
-- ========================================

-- Verify Admin PIN
CREATE OR REPLACE FUNCTION verify_admin_pin(input_pin TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    is_valid BOOLEAN;
BEGIN
    SELECT (password = input_pin) INTO is_valid
    FROM admin_users 
    WHERE is_active = true
    LIMIT 1;
    
    IF is_valid = true THEN
        RETURN true;
    END IF;
    
    SELECT (security_pin = crypt(input_pin, security_pin)) INTO is_valid
    FROM app_config 
    LIMIT 1;
    
    RETURN COALESCE(is_valid, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atomic Place Order
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
    
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_order_items) LOOP
        SELECT stock INTO v_current_stock 
        FROM products 
        WHERE id = (v_item->>'product_id')::UUID;
        
        IF v_current_stock < (v_item->>'quantity')::NUMERIC THEN
            RAISE EXCEPTION 'Insufficient stock for product %', (v_item->>'product_name')::TEXT;
        END IF;
        
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
        
        UPDATE products 
        SET stock = stock - (v_item->>'quantity')::NUMERIC,
            updated_at = timezone('utc'::text, now())
        WHERE id = (v_item->>'product_id')::UUID;
        
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

-- Atomic Wallet Adjustment
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
    SELECT id INTO v_wallet_id
    FROM wallet_master
    WHERE user_id = p_user_id;
    
    IF v_wallet_id IS NULL THEN
        INSERT INTO wallet_master (user_id, balance)
        VALUES (p_user_id, 0.00)
        RETURNING id INTO v_wallet_id;
    END IF;
    
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
        RAISE EXCEPTION 'Invalid type: %', p_type;
    END IF;
    
    INSERT INTO wallet_transactions (
        user_id, amount, type, reason, created_at
    ) VALUES (
        p_user_id, p_amount, p_type, p_reason, timezone('utc'::text, now())
    );
    
    RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
