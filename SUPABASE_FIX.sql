-- ========================================
-- NM MART - FIX ONLY WHAT'S MISSING
-- ========================================

-- 1. CREATE MISSING TABLES

-- Expense Categories
CREATE TABLE IF NOT EXISTS public.expense_categories (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    name text NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    CONSTRAINT expense_categories_pkey PRIMARY KEY (id)
);

-- Expenses (with 'date' column as expected by app)
CREATE TABLE IF NOT EXISTS public.expenses (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    amount numeric(12, 2) NOT NULL,
    date date NOT NULL DEFAULT CURRENT_DATE,
    expense_date date NOT NULL DEFAULT CURRENT_DATE,
    category_id uuid REFERENCES public.expense_categories(id),
    description text,
    receipt_url text,
    created_by uuid,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    CONSTRAINT expenses_pkey PRIMARY KEY (id)
);

-- Inventory Logs (with is_active column)
CREATE TABLE IF NOT EXISTS public.inventory_logs (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    product_id uuid REFERENCES public.products(id),
    quantity numeric(10, 2) NOT NULL,
    type text NOT NULL,
    reference_id uuid,
    reference_type text,
    notes text,
    created_by uuid,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    CONSTRAINT inventory_logs_pkey PRIMARY KEY (id)
);

-- 2. FIX EXISTING TABLES (add missing columns if needed)

-- Add 'date' column to expenses if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'date') THEN
        ALTER TABLE public.expenses ADD COLUMN date date DEFAULT CURRENT_DATE;
    END IF;
END $$;

-- Add 'is_active' column to inventory_logs if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_logs' AND column_name = 'is_active') THEN
        ALTER TABLE public.inventory_logs ADD COLUMN is_active boolean DEFAULT true;
    END IF;
END $$;

-- 3. CREATE VERIFY ADMIN PIN FUNCTION

CREATE OR REPLACE FUNCTION public.verify_admin_pin(input_pin TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    stored_pin_hash TEXT;
BEGIN
    -- Check admin_users first
    SELECT pin INTO stored_pin_hash 
    FROM public.admin_users 
    WHERE is_active = true 
    LIMIT 1;

    IF stored_pin_hash IS NOT NULL THEN
        RETURN stored_pin_hash = input_pin;
    END IF;

    -- Fallback to app_config
    SELECT security_pin INTO stored_pin_hash 
    FROM public.app_config 
    LIMIT 1;

    RETURN stored_pin_hash = input_pin;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;

-- 4. DISABLE RLS FOR NOW (so your app works with existing PIN login)
-- You can re-enable RLS later when you set up proper Supabase Auth
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        BEGIN
            EXECUTE 'ALTER TABLE public.' || quote_ident(r.tablename) || ' DISABLE ROW LEVEL SECURITY;';
        EXCEPTION
            WHEN OTHERS THEN
                NULL; -- Ignore errors
        END;
    END LOOP;
END $$;

-- FINISHED!
NOTIFY pgrst, 'reload schema';
