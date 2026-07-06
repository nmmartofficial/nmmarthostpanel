-- ========================================
-- NM MART - SINGLE CONSOLIDATED SUPABASE SQL
-- Run this single file in Supabase SQL Editor
-- ========================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Core master tables
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE,
    name TEXT NOT NULL,
    image_url TEXT,
    position INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS subcategories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE,
    category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    category_code TEXT,
    name TEXT NOT NULL,
    image_url TEXT,
    position INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (category_id, name)
);

CREATE TABLE IF NOT EXISTS brands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    code TEXT UNIQUE,
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS unit_master (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    code TEXT UNIQUE,
    short_name TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS department_master (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    code TEXT UNIQUE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Products table with app-compatible columns
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    barcode TEXT UNIQUE,
    name TEXT NOT NULL,
    category_id UUID REFERENCES categories(id),
    subcategory_id UUID REFERENCES subcategories(id),
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
    print_name TEXT,
    take_rate NUMERIC DEFAULT 0,
    retail_rate NUMERIC DEFAULT 0,
    delivery_rate NUMERIC DEFAULT 0,
    online_rate NUMERIC DEFAULT 0,
    brand_code TEXT,
    unit_code TEXT,
    item_group_code TEXT,
    item_category_code TEXT,
    department_code TEXT,
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

-- 3. Add missing columns to existing products table safely
ALTER TABLE products ADD COLUMN IF NOT EXISTS subcategory_id UUID REFERENCES subcategories(id);
ALTER TABLE products ADD COLUMN IF NOT EXISTS brand_code TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS unit_code TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS item_group_code TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS item_category_code TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS department_code TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS k_code TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS shop_id TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS print_name TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS take_rate NUMERIC DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS retail_rate NUMERIC DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS delivery_rate NUMERIC DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS online_rate NUMERIC DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_package TEXT DEFAULT 'No';
ALTER TABLE products ADD COLUMN IF NOT EXISTS narration TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS narration2 TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS item_status TEXT DEFAULT 'Active';
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_favourite TEXT DEFAULT 'No';
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_discountable TEXT DEFAULT 'Yes';
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS category_name TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS subcategory_name TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS brand_name TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS unit_name TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS size TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS color TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS counter_name TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS basic_sale_price NUMERIC DEFAULT 0;

-- 4. Default data for app usage
INSERT INTO categories (name, code, position)
VALUES ('Grocery', 'GROCERY', 1), ('Beverages', 'BEVERAGES', 2), ('Personal Care', 'PERSONAL_CARE', 3)
ON CONFLICT (code) DO NOTHING;

INSERT INTO brands (name, code)
VALUES ('Generic', 'GENERIC'), ('NM MART', 'NMMART')
ON CONFLICT (code) DO NOTHING;

INSERT INTO unit_master (name, code, short_name)
VALUES ('Piece', 'PCS', 'PCS'), ('Kg', 'KG', 'KG'), ('Ltr', 'LTR', 'LTR')
ON CONFLICT (code) DO NOTHING;

INSERT INTO department_master (name, code)
VALUES ('General', 'GEN'), ('Grocery', 'GRO')
ON CONFLICT (code) DO NOTHING;

-- 5. Default subcategories linked to categories
INSERT INTO subcategories (name, code, category_id, category_code)
SELECT 'Rice', 'RICE', c.id, c.code
FROM categories c WHERE c.code = 'GROCERY'
ON CONFLICT (category_id, name) DO NOTHING;

INSERT INTO subcategories (name, code, category_id, category_code)
SELECT 'Tea', 'TEA', c.id, c.code
FROM categories c WHERE c.code = 'BEVERAGES'
ON CONFLICT (category_id, name) DO NOTHING;

-- 6. Quick verification queries
SELECT 'categories' AS table_name, COUNT(*) AS row_count FROM categories
UNION ALL
SELECT 'subcategories', COUNT(*) FROM subcategories
UNION ALL
SELECT 'brands', COUNT(*) FROM brands
UNION ALL
SELECT 'unit_master', COUNT(*) FROM unit_master
UNION ALL
SELECT 'department_master', COUNT(*) FROM department_master
UNION ALL
SELECT 'products', COUNT(*) FROM products;
