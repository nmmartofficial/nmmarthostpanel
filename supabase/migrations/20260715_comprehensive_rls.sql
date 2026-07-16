-- =====================================================
-- NM MART - Comprehensive RLS & Tenant Isolation
-- Migration: 20260715_comprehensive_rls.sql
-- =====================================================

-- 1. First, ensure admin_users has tenant_id, email, and proper structure
ALTER TABLE IF EXISTS admin_users 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES companies(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS company_code TEXT;

-- Add unique constraint on email only if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'admin_users_email_key'
  ) THEN
    ALTER TABLE admin_users ADD CONSTRAINT admin_users_email_key UNIQUE (email);
  END IF;
END $$;

-- Create indexes on admin_users
CREATE INDEX IF NOT EXISTS idx_admin_users_tenant_id ON admin_users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);

-- 2. Create a function to get the current user's tenant ID from admin_users
CREATE OR REPLACE FUNCTION get_current_user_tenant_id()
RETURNS UUID AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  -- Get tenant_id from admin_users where email matches auth.users.email
  SELECT tenant_id INTO v_tenant_id
  FROM admin_users
  WHERE email = auth.email()
  LIMIT 1;
  
  RETURN v_tenant_id;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- 3. Create a function to check if current user is super admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
DECLARE
  v_is_super BOOLEAN;
BEGIN
  SELECT (role = 'super_admin') INTO v_is_super
  FROM admin_users
  WHERE email = auth.email()
  LIMIT 1;
  
  RETURN COALESCE(v_is_super, FALSE);
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- 4. List of all tenant tables to apply policies to
DO $$
DECLARE
  tenant_tables TEXT[] := ARRAY[
    'products', 'stock_alerts', 'categories', 'subcategories', 'brands',
    'admin_users', 'credit_master', 'delivery_boy_master', 'delivery_customer_master',
    'purchases', 'purchase_items', 'unit_master', 'department_master', 'account_master',
    'users', 'orders', 'order_items', 'wallet_master', 'wallet_transactions',
    'expenses', 'expense_categories', 'addresses', 'pincode_master', 'banners',
    'coupons', 'offers_master', 'home_config', 'app_config', 'customer_loyalty',
    'loyalty_transactions', 'loyalty_tiers', 'cart', 'wishlist', 'system_logs',
    'inventory_logs', 'notifications', 'support_tickets', 'basket', 'credit_notes', 'return_items'
  ];
  table_name TEXT;
  column_exists BOOLEAN;
BEGIN
  FOREACH table_name IN ARRAY tenant_tables LOOP
    -- Check if table exists
    IF EXISTS (
      SELECT 1
      FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename = table_name
    ) THEN
      -- Enable RLS
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
      
      -- Force RLS even for table owners
      EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', table_name);
      
      -- Check if tenant_id column exists
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = table_name
        AND column_name = 'tenant_id'
      ) INTO column_exists;
      
      IF column_exists THEN
        -- Create index on tenant_id if doesn't exist
        EXECUTE format('
          CREATE INDEX IF NOT EXISTS idx_%I_tenant_id 
          ON %I(tenant_id)', table_name, table_name);
        
        -- Drop existing policies to avoid conflicts
        EXECUTE format('DROP POLICY IF EXISTS "Tenant Isolation Policy" ON %I', table_name);
        EXECUTE format('DROP POLICY IF EXISTS "Enable Full Access" ON %I', table_name);
        
        -- Create comprehensive RLS policy
        EXECUTE format('
          CREATE POLICY "Tenant Isolation Policy" ON %I
          FOR ALL
          USING (
            -- Super admin can access everything
            is_super_admin() OR 
            -- Or user belongs to the same tenant
            tenant_id = get_current_user_tenant_id()
          )
          WITH CHECK (
            -- Super admin can do anything
            is_super_admin() OR 
            -- Or user is inserting/updating their own tenant's data
            tenant_id = get_current_user_tenant_id()
          )', table_name);
          
        RAISE NOTICE 'Applied RLS policies to %', table_name;
      ELSE
        RAISE NOTICE 'Table % does not have tenant_id column - skipping RLS policy creation', table_name;
      END IF;
    ELSE
      RAISE NOTICE 'Table % does not exist - skipping', table_name;
    END IF;
  END LOOP;
END $$;

-- 5. Special policy for companies table (only super admins can manage)
ALTER TABLE IF EXISTS companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS companies FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Companies Management Policy" ON companies;
CREATE POLICY "Companies Management Policy" ON companies
FOR ALL
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- 6. Allow service role to bypass RLS (no policy needed - service role bypasses RLS by default)

-- =====================================================
-- Verification Queries
-- =====================================================

-- Check which tables have RLS enabled
SELECT 
  tablename,
  relrowsecurity AS rls_enabled,
  relforcerowsecurity AS rls_forced
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Check policies for each table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Check indexes on tenant_id
SELECT 
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%_tenant_id'
ORDER BY tablename;
