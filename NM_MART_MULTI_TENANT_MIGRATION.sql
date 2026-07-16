-- ========================================
-- NM MART - MULTI-TENANT SAAS MIGRATION
-- Last Updated: 2026-07-15
-- ========================================

-- ========================================
-- 1. ADD COMPANIES TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_code TEXT UNIQUE NOT NULL,
    company_slug TEXT UNIQUE NOT NULL,
    company_name TEXT NOT NULL,
    owner_name TEXT NOT NULL,
    email TEXT NOT NULL,
    mobile TEXT NOT NULL,
    subscription_plan TEXT DEFAULT 'basic',
    expiry_date DATE,
    country TEXT DEFAULT 'India',
    timezone TEXT DEFAULT 'Asia/Kolkata',
    currency TEXT DEFAULT 'INR',
    max_users INTEGER DEFAULT 5,
    storage_limit INTEGER DEFAULT 10,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ========================================
-- 2. ADD TENANT_ID COLUMN TO EXISTING TABLES
-- ========================================
DO $$
DECLARE
    tables_with_tenant_id TEXT[] := ARRAY[
        'products', 'categories', 'subcategories', 'brands', 
        'unit_master', 'department_master', 'account_master', 
        'credit_master', 'delivery_boy_master', 'delivery_customer_master',
        'purchases', 'purchase_items', 'orders', 'order_items',
        'wallet_master', 'wallet_transactions', 'addresses', 
        'pincode_master', 'banners', 'coupons', 'offers_master',
        'cart', 'basket', 'wishlist', 'notifications', 'system_logs',
        'users', 'inventory_logs', 'credit_notes', 'return_items',
        'customer_loyalty', 'expense_categories', 'expenses', 
        'stock_alerts', 'support_tickets', 'app_config', 'home_config',
        'admin_users'
    ];
    table_name TEXT;
BEGIN
    FOREACH table_name IN ARRAY tables_with_tenant_id LOOP
        -- Check if column already exists
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = table_name 
              AND column_name = 'tenant_id'
        ) THEN
            EXECUTE format('ALTER TABLE %I ADD COLUMN tenant_id UUID REFERENCES companies(id) ON DELETE SET NULL', table_name);
            EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_tenant_id ON %I(tenant_id)', table_name, table_name);
            RAISE NOTICE 'Added tenant_id to %', table_name;
        END IF;
        
        -- Also keep company_code for backward compatibility
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = table_name 
              AND column_name = 'company_code'
        ) THEN
            EXECUTE format('ALTER TABLE %I ADD COLUMN company_code TEXT', table_name);
            RAISE NOTICE 'Added company_code to % for backward compatibility', table_name;
        END IF;
    END LOOP;
END $$;

-- ========================================
-- 3. INSERT DEFAULT SUPER ADMIN COMPANY
-- ========================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM companies WHERE company_code = 'NM001') THEN
        INSERT INTO companies (
            company_code,
            company_slug,
            company_name,
            owner_name,
            email,
            mobile,
            subscription_plan,
            status
        ) VALUES (
            'NM001',
            'nm-mart',
            'NM MART',
            'Admin',
            'admin@nmmart.in',
            '7081154604',
            'enterprise',
            'active'
        );
        RAISE NOTICE 'Default NM MART company created';
    END IF;
END $$;

-- ========================================
-- 4. ENABLE RLS POLICIES FOR TENANT ISOLATION
-- ========================================
DO $$
DECLARE
    table_name TEXT;
    tables_with_tenant_id TEXT[] := ARRAY[
        'products', 'categories', 'subcategories', 'brands', 
        'unit_master', 'department_master', 'account_master', 
        'credit_master', 'delivery_boy_master', 'delivery_customer_master',
        'purchases', 'purchase_items', 'orders', 'order_items',
        'wallet_master', 'wallet_transactions', 'addresses', 
        'pincode_master', 'banners', 'coupons', 'offers_master',
        'cart', 'basket', 'wishlist', 'notifications',
        'users', 'inventory_logs', 'credit_notes', 'return_items',
        'customer_loyalty', 'expense_categories', 'expenses', 
        'stock_alerts', 'support_tickets', 'app_config', 'home_config',
        'admin_users'
    ];
BEGIN
    -- Create a function to get current tenant_id
    CREATE OR REPLACE FUNCTION get_current_tenant_id() 
    RETURNS UUID AS $$
    BEGIN
        RETURN current_setting('app.current_tenant_id', true)::UUID;
    EXCEPTION
        WHEN OTHERS THEN
            RETURN NULL;
    END;
    $$ LANGUAGE plpgsql;

    -- Apply RLS policies to tenant tables
    FOREACH table_name IN ARRAY tables_with_tenant_id LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Tenant Isolation Policy" ON %I', table_name);
        EXECUTE format('
            CREATE POLICY "Tenant Isolation Policy" ON %I
            FOR ALL
            USING (tenant_id = get_current_tenant_id() OR get_current_tenant_id() IS NULL)
            WITH CHECK (tenant_id = get_current_tenant_id() OR get_current_tenant_id() IS NULL)
        ', table_name);
        RAISE NOTICE 'RLS policy applied to %', table_name;
    END LOOP;
END $$;

-- ========================================
-- MIGRATION COMPLETE
-- ========================================
