-- ==========================================
-- NM MART - FINAL SUPABASE DATABASE SCHEMA
-- ==========================================

-- 1. EXTENSIONS (Zaroori for UUID generation)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. MASTER TABLES (Categories, Brands, Units, etc.)

-- Categories Table
CREATE TABLE IF NOT EXISTS public.categories (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    name text NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    CONSTRAINT categories_pkey PRIMARY KEY (id),
    CONSTRAINT categories_name_unique UNIQUE (name)
);

-- Subcategories Table
CREATE TABLE IF NOT EXISTS public.subcategories (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    name text NOT NULL,
    category_id uuid REFERENCES public.categories(id),
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    CONSTRAINT subcategories_pkey PRIMARY KEY (id),
    CONSTRAINT subcategories_name_unique UNIQUE (name)
);

-- Brands Table
CREATE TABLE IF NOT EXISTS public.brands (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    name text NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    CONSTRAINT brands_pkey PRIMARY KEY (id),
    CONSTRAINT brands_name_unique UNIQUE (name)
);

-- Unit Master Table
CREATE TABLE IF NOT EXISTS public.unit_master (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    name text NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unit_master_pkey PRIMARY KEY (id),
    CONSTRAINT unit_master_name_unique UNIQUE (name)
);

-- Department Master Table
CREATE TABLE IF NOT EXISTS public.department_master (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    name text NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    CONSTRAINT department_master_pkey PRIMARY KEY (id)
);

-- 3. PRODUCTS TABLE (Main Inventory)
CREATE TABLE IF NOT EXISTS public.products (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    barcode text NULL,
    name text NOT NULL,
    category_id uuid NULL REFERENCES public.categories(id),
    sub_category_id uuid NULL REFERENCES public.subcategories(id),
    brand_id uuid NULL REFERENCES public.brands(id),
    unit_id uuid NULL REFERENCES public.unit_master(id),
    department_id uuid NULL REFERENCES public.department_master(id),
    hsn_code text NULL,
    mrp numeric(10, 2) NULL DEFAULT 0.00,
    sale_rate numeric(10, 2) NULL DEFAULT 0.00,
    purchase_rate numeric(10, 2) NULL DEFAULT 0.00,
    gst_percent numeric(5, 2) NULL DEFAULT 0.00,
    discount numeric(10, 2) NULL DEFAULT 0.00,
    stock numeric(10, 2) NULL DEFAULT 0.00,
    description text NULL,
    image_url text NULL,
    is_live_on_app boolean NULL DEFAULT false,
    created_at timestamp with time zone NOT NULL DEFAULT timezone ('utc'::text, now()),
    updated_at timestamp with time zone NOT NULL DEFAULT timezone ('utc'::text, now()),
    gst numeric(5, 2) NULL DEFAULT 0.00,
    cess numeric(5, 2) NULL DEFAULT 0.00,
    discount_pct numeric(5, 2) NULL DEFAULT 0.00,
    is_favourite text NULL DEFAULT 'No'::text,
    is_discountable text NULL DEFAULT 'Yes'::text,
    is_active boolean NULL DEFAULT true,
    wholesale_rate numeric(10, 2) NULL DEFAULT 0.00,
    cess_percent numeric NULL DEFAULT 0,
    min_qty numeric NULL DEFAULT 0,
    discount_percent numeric NULL DEFAULT 0,
    basic_sale_price numeric NULL DEFAULT 0,
    size text NULL,
    color text NULL,
    counter_name text NULL,
    category_name text NULL,
    subcategory_name text NULL,
    brand_name text NULL,
    unit_name text NULL,
    CONSTRAINT products_pkey PRIMARY KEY (id),
    CONSTRAINT products_barcode_key UNIQUE (barcode)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products USING btree (category_id);
CREATE INDEX IF NOT EXISTS idx_products_brand_id ON public.products USING btree (brand_id);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products USING btree (barcode);

-- 4. LOGS & SYSTEM TABLES

-- System Logs (For Audit Trail)
CREATE TABLE IF NOT EXISTS public.system_logs (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    log_entry text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    CONSTRAINT system_logs_pkey PRIMARY KEY (id)
);

-- Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    title text NOT NULL,
    message text NOT NULL,
    type text,
    reference_id uuid,
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    CONSTRAINT notifications_pkey PRIMARY KEY (id)
);

-- 5. REFRESH SCHEMA CACHE (Recommended)
NOTIFY pgrst, 'reload schema';
