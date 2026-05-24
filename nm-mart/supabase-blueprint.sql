-- NM MART ERP & POS - ORIGINAL TERMINOLOGY Supabase SQL Blueprint
-- Run this in your Supabase SQL Editor

-- 1. Master: Main Category
CREATE TABLE main_category (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Master: Sub Category
CREATE TABLE sub_category (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES main_category(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Master: Brand Master
CREATE TABLE brand_master (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Master: Unit Master
CREATE TABLE unit_master (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    short_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Master: Item Master
CREATE TABLE item_master (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    barcode TEXT UNIQUE,
    item_name TEXT NOT NULL,
    category_id UUID REFERENCES main_category(id),
    sub_category_id UUID REFERENCES sub_category(id),
    brand_id UUID REFERENCES brand_master(id),
    unit_id UUID REFERENCES unit_master(id),
    mrp DECIMAL(10,2) DEFAULT 0.00,
    selling_rate DECIMAL(10,2) DEFAULT 0.00,
    gst_percent DECIMAL(5,2) DEFAULT 0.00,
    stock_qty DECIMAL(10,2) DEFAULT 0.00,
    description TEXT,
    image_url TEXT,
    is_live_on_app BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Master: Account Master
CREATE TABLE account_master (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    mobile TEXT UNIQUE,
    email TEXT,
    address TEXT,
    account_type TEXT DEFAULT 'Customer',
    opening_balance DECIMAL(12,2) DEFAULT 0.00,
    current_balance DECIMAL(12,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Logistics: Delivery Boy Master
CREATE TABLE delivery_boy_master (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    mobile TEXT,
    vehicle_type TEXT DEFAULT 'Motorcycle',
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Marketing: Banner Master
CREATE TABLE banner_master (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT,
    image_url TEXT NOT NULL,
    target_category UUID REFERENCES main_category(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. Sales: Sales Invoices
CREATE TABLE sales_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bill_no SERIAL,
    customer_id UUID REFERENCES account_master(id),
    customer_name TEXT DEFAULT 'Cash Customer',
    customer_mobile TEXT,
    subtotal DECIMAL(12,2) NOT NULL,
    total_tax DECIMAL(12,2) DEFAULT 0.00,
    delivery_charge DECIMAL(10,2) DEFAULT 0.00,
    discount_amount DECIMAL(10,2) DEFAULT 0.00,
    round_off DECIMAL(5,2) DEFAULT 0.00,
    final_amount DECIMAL(12,2) NOT NULL,
    billing_type TEXT DEFAULT 'POS',
    transaction_status TEXT DEFAULT 'completed',
    payment_mode TEXT DEFAULT 'Cash',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. Sales: Sales Invoice Items
CREATE TABLE sales_invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID REFERENCES sales_invoices(id) ON DELETE CASCADE,
    item_id UUID REFERENCES item_master(id),
    item_name TEXT NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    rate DECIMAL(10,2) NOT NULL,
    tax_amount DECIMAL(10,2) DEFAULT 0.00,
    total_amount DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Row Level Security (RLS) Enablement
ALTER TABLE main_category ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_category ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE unit_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_boy_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE banner_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_invoice_items ENABLE ROW LEVEL SECURITY;

-- Basic Access Policies
CREATE POLICY "Public Read" ON main_category FOR SELECT USING (true);
CREATE POLICY "Public Read" ON sub_category FOR SELECT USING (true);
CREATE POLICY "Public Read" ON brand_master FOR SELECT USING (true);
CREATE POLICY "Public Read" ON unit_master FOR SELECT USING (true);
CREATE POLICY "Public Read" ON item_master FOR SELECT USING (true);
CREATE POLICY "Public Read" ON account_master FOR SELECT USING (true);
CREATE POLICY "Public Read" ON banner_master FOR SELECT USING (true);
CREATE POLICY "Public All" ON sales_invoices FOR ALL USING (true);
CREATE POLICY "Public All" ON sales_invoice_items FOR ALL USING (true);
