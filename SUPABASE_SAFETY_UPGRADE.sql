-- NM MART - Data Safety & RLS Policies
-- Execute this in your Supabase SQL Editor to secure your tables.

-- 1. Enable RLS on all tables
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'ALTER TABLE public.' || quote_ident(r.tablename) || ' ENABLE ROW LEVEL SECURITY;';
    END LOOP;
END $$;

-- 2. Create a generic policy for Admin Access
-- Note: This assumes you are using Supabase Auth or a specific admin check.
-- For now, we allow authenticated users to perform all actions.
-- You can restrict this further by checking user roles.

DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        -- Drop existing policies if any to avoid duplicates
        EXECUTE 'DROP POLICY IF EXISTS "Admin Full Access" ON public.' || quote_ident(r.tablename);
        
        -- Create Full Access Policy
        EXECUTE 'CREATE POLICY "Admin Full Access" ON public.' || quote_ident(r.tablename) || 
                ' FOR ALL USING (auth.role() = ''authenticated'') WITH CHECK (auth.role() = ''authenticated'');';
    END LOOP;
END $$;

-- 3. Specific Public Read Access (e.g., for Customer App)
-- These tables should be readable by everyone (anon) but writable only by admins.

-- Products
DROP POLICY IF EXISTS "Public Read Products" ON public.products;
CREATE POLICY "Public Read Products" ON public.products FOR SELECT USING (true);

-- Categories
DROP POLICY IF EXISTS "Public Read Categories" ON public.categories;
CREATE POLICY "Public Read Categories" ON public.categories FOR SELECT USING (true);

-- Sub-Categories
DROP POLICY IF EXISTS "Public Read Subcategories" ON public.subcategories;
CREATE POLICY "Public Read Subcategories" ON public.subcategories FOR SELECT USING (true);

-- Banners
DROP POLICY IF EXISTS "Public Read Banners" ON public.banners;
CREATE POLICY "Public Read Banners" ON public.banners FOR SELECT USING (true);

-- 4. Audit Trail (System Logs) - Read Only for Admins
DROP POLICY IF EXISTS "System Logs Read Only" ON public.system_logs;
CREATE POLICY "System Logs Read Only" ON public.system_logs FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "System Logs Insert Only" ON public.system_logs FOR INSERT WITH CHECK (true);

-- 5. Soft Delete Support (Adding column if not exists)
-- This allows us to hide data instead of deleting it permanently.
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = r.tablename AND column_name = 'is_active') THEN
            EXECUTE 'ALTER TABLE public.' || quote_ident(r.tablename) || ' ADD COLUMN is_active BOOLEAN DEFAULT TRUE;';
        END IF;
    END LOOP;
END $$;
