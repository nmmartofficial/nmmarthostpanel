-- NM MART ERP & POS - COMPLETE Supabase SQL Blueprint
-- Run this in your Supabase SQL Editor to create all necessary tables

-- 1. Master: Main Categories
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Master: Sub Categories
CREATE TABLE sub_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Master: Brands
CREATE TABLE brands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Master: Units (Kg, Pcs, etc.)
CREATE TABLE units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    short_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Master: Items (Products)
CREATE TABLE items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    barcode TEXT UNIQUE,
    item_name TEXT NOT NULL,
    category_id UUID REFERENCES categories(id),
    sub_category_id UUID REFERENCES sub_categories(id),
    brand_id UUID REFERENCES brands(id),
    unit_id UUID REFERENCES units(id),
    mrp DECIMAL(10,2) DEFAULT 0.00,
    selling_rate DECIMAL(10,2) DEFAULT 0.00,
    gst_percent DECIMAL(5,2) DEFAULT 0.00,
    stock_qty DECIMAL(10,2) DEFAULT 0.00,
    description TEXT,
    image_url TEXT,
    is_live_on_app BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Master: Accounts (Suppliers, Customers, Employees)
CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    mobile TEXT UNIQUE,
    email TEXT,
    address TEXT,
    account_type TEXT DEFAULT 'Customer', -- 'Customer', 'Supplier', 'Employee'
    opening_balance DECIMAL(12,2) DEFAULT 0.00,
    current_balance DECIMAL(12,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Logistics: Delivery Boys
CREATE TABLE delivery_boys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    mobile TEXT,
    vehicle_type TEXT DEFAULT 'Motorcycle',
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Marketing: Banners
CREATE TABLE banners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT,
    image_url TEXT NOT NULL,
    target_category UUID REFERENCES categories(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. Sales: Invoices (POS & Online)
CREATE TABLE sales_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bill_no SERIAL,
    customer_id UUID REFERENCES accounts(id),
    customer_name TEXT DEFAULT 'Cash Customer',
    customer_mobile TEXT,
    subtotal DECIMAL(12,2) NOT NULL,
    total_tax DECIMAL(12,2) DEFAULT 0.00,
    delivery_charge DECIMAL(10,2) DEFAULT 0.00,
    discount_amount DECIMAL(10,2) DEFAULT 0.00,
    round_off DECIMAL(5,2) DEFAULT 0.00,
    final_amount DECIMAL(12,2) NOT NULL,
    billing_type TEXT DEFAULT 'POS', -- 'POS', 'Online', 'B2B'
    transaction_status TEXT DEFAULT 'completed', -- 'completed', 'pending', 'cancelled'
    payment_mode TEXT DEFAULT 'Cash', -- 'Cash', 'Online', 'Wallet'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. Sales: Invoice Items
CREATE TABLE sales_invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID REFERENCES sales_invoices(id) ON DELETE CASCADE,
    item_id UUID REFERENCES items(id),
    item_name TEXT NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    rate DECIMAL(10,2) NOT NULL,
    tax_amount DECIMAL(10,2) DEFAULT 0.00,
    total_amount DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 11. Procurement: Purchase Invoices
CREATE TABLE purchase_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_no TEXT NOT NULL,
    supplier_id UUID REFERENCES accounts(id),
    total_amount DECIMAL(12,2) NOT NULL,
    tax_amount DECIMAL(12,2) DEFAULT 0.00,
    other_charges DECIMAL(10,2) DEFAULT 0.00,
    net_amount DECIMAL(12,2) NOT NULL,
    purchase_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 12. Procurement: Purchase Items
CREATE TABLE purchase_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_id UUID REFERENCES purchase_invoices(id) ON DELETE CASCADE,
    item_id UUID REFERENCES items(id),
    quantity DECIMAL(10,2) NOT NULL,
    purchase_rate DECIMAL(10,2) NOT NULL,
    tax_amount DECIMAL(10,2) DEFAULT 0.00,
    total_amount DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 13. Finance: Transactions (Cash/Bank)
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID REFERENCES accounts(id),
    type TEXT NOT NULL, -- 'Receipt', 'Payment'
    amount DECIMAL(12,2) NOT NULL,
    description TEXT,
    payment_mode TEXT DEFAULT 'Cash',
    transaction_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 14. Logistics: Stock Transfers
CREATE TABLE stock_transfers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID REFERENCES items(id),
    from_warehouse TEXT,
    to_warehouse TEXT,
    quantity DECIMAL(10,2) NOT NULL,
    transfer_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 15. Logistics: Wastage Tracking
CREATE TABLE wastage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID REFERENCES items(id),
    quantity DECIMAL(10,2) NOT NULL,
    reason TEXT,
    wastage_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Row Level Security (RLS) Enablement
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_boys ENABLE ROW LEVEL SECURITY;
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE wastage ENABLE ROW LEVEL SECURITY;

-- Policies (Allow read/write for now)
CREATE POLICY "Public Read Access" ON categories FOR SELECT USING (true);
CREATE POLICY "Public Read Access" ON sub_categories FOR SELECT USING (true);
CREATE POLICY "Public Read Access" ON brands FOR SELECT USING (true);
CREATE POLICY "Public Read Access" ON units FOR SELECT USING (true);
CREATE POLICY "Public Read Access" ON items FOR SELECT USING (true);
CREATE POLICY "Public Read Access" ON accounts FOR SELECT USING (true);
CREATE POLICY "Public Read Access" ON banners FOR SELECT USING (true);
CREATE POLICY "Public All Access" ON sales_invoices FOR ALL USING (true);
CREATE POLICY "Public All Access" ON sales_invoice_items FOR ALL USING (true);
CREATE POLICY "Public All Access" ON purchase_invoices FOR ALL USING (true);
CREATE POLICY "Public All Access" ON purchase_items FOR ALL USING (true);
CREATE POLICY "Public All Access" ON transactions FOR ALL USING (true);
