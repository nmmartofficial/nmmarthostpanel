-- Secure tenant-aware RLS for NM MART
CREATE OR REPLACE FUNCTION public.current_company_code()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    NULLIF(current_setting('request.jwt.claims', true)::jsonb ->> 'company_code', ''),
    NULLIF(current_setting('request.jwt.claims', true)::jsonb ->> 'companyCode', ''),
    'DEFAULT'
  );
$$;

CREATE OR REPLACE FUNCTION public.matches_company_scope(p_company_code text)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT (
    auth.role() = 'service_role'
    OR COALESCE(p_company_code, 'DEFAULT') = 'DEFAULT'
    OR public.current_company_code() = COALESCE(p_company_code, 'DEFAULT')
  );
$$;

DO $$
DECLARE
  tbl text;
  policy_name text;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'companies', 'products', 'admin_users', 'categories', 'subcategories', 'brands',
    'unit_master', 'department_master', 'suppliers', 'stock_alerts', 'hsn_master',
    'account_master', 'purchases', 'purchase_items', 'inventory_logs', 'delivery_boy_master',
    'delivery_customer_master', 'users', 'credit_master', 'orders', 'order_items',
    'wallet_master', 'wallet_transactions', 'expense_categories', 'expenses', 'addresses',
    'pincode_master', 'banners', 'coupons', 'offers_master', 'home_config', 'app_config',
    'customer_loyalty', 'loyalty_transactions', 'loyalty_tiers', 'cart', 'wishlist',
    'system_logs', 'notifications', 'support_tickets'
  ]) LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
    policy_name := tbl || '_tenant_policy';
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_name, tbl);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL USING (public.matches_company_scope(COALESCE(company_code, ''DEFAULT''))) WITH CHECK (public.matches_company_scope(COALESCE(company_code, ''DEFAULT'')))',
      policy_name,
      tbl
    );
  END LOOP;
END $$;
