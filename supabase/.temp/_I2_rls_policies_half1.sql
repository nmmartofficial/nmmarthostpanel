BEGIN;

-- HALF 1: CRUD tenant policies for first 19 tables
-- FIXED: CREATE POLICY has no IF NOT EXISTS in PG14; use DROP IF EXISTS + CREATE pattern
DO $$
DECLARE t TEXT; tables TEXT[] := ARRAY[
  'unit_master','categories','subcategories','brands','department_master',
  'products','stock_alerts','inventory_logs',
  'account_master','purchases','purchase_items',
  'admin_users','users','delivery_customer_master','delivery_boy_master',
  'orders','order_items','pincode_master','addresses'
];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    -- SELECT
    EXECUTE format('DROP POLICY IF EXISTS %I_tenant_read ON public.%I;', t, t);
    EXECUTE format('CREATE POLICY %I_tenant_read ON public.%I FOR SELECT USING (
      (auth.jwt() ->> ''tenant_id'' IS NOT NULL AND tenant_id = (auth.jwt() ->> ''tenant_id'')::bigint)
      OR (auth.jwt() ->> ''company_code'' IS NOT NULL AND company_code = (auth.jwt() ->> ''company_code''))
      OR (auth.jwt() ->> ''role'' = ''super_admin'')
      OR public.matches_company_scope(company_code)
    );', t, t);
    -- INSERT
    EXECUTE format('DROP POLICY IF EXISTS %I_tenant_insert ON public.%I;', t, t);
    EXECUTE format('CREATE POLICY %I_tenant_insert ON public.%I FOR INSERT WITH CHECK (
      (auth.jwt() ->> ''role'' = ''super_admin'')
      OR (
        (auth.jwt() ->> ''tenant_id'' IS NOT NULL AND tenant_id = (auth.jwt() ->> ''tenant_id'')::bigint)
        AND company_code = (auth.jwt() ->> ''company_code'')
      )
    );', t, t);
    -- UPDATE
    EXECUTE format('DROP POLICY IF EXISTS %I_tenant_update ON public.%I;', t, t);
    EXECUTE format('CREATE POLICY %I_tenant_update ON public.%I FOR UPDATE
      USING (
        (auth.jwt() ->> ''role'' = ''super_admin'')
        OR (auth.jwt() ->> ''tenant_id'' IS NOT NULL AND tenant_id = (auth.jwt() ->> ''tenant_id'')::bigint)
        OR company_code = (auth.jwt() ->> ''company_code'')
      )
      WITH CHECK (
        (auth.jwt() ->> ''role'' = ''super_admin'')
        OR (
          (auth.jwt() ->> ''tenant_id'' IS NOT NULL AND tenant_id = (auth.jwt() ->> ''tenant_id'')::bigint)
          AND company_code = (auth.jwt() ->> ''company_code'')
        )
      );', t, t);
    -- DELETE
    EXECUTE format('DROP POLICY IF EXISTS %I_tenant_delete ON public.%I;', t, t);
    EXECUTE format('CREATE POLICY %I_tenant_delete ON public.%I FOR DELETE USING (
      (auth.jwt() ->> ''role'' = ''super_admin'')
      OR (auth.jwt() ->> ''tenant_id'' IS NOT NULL AND tenant_id = (auth.jwt() ->> ''tenant_id'')::bigint)
      OR company_code = (auth.jwt() ->> ''company_code'')
    );', t, t);
  END LOOP;
END $$;

COMMIT;
