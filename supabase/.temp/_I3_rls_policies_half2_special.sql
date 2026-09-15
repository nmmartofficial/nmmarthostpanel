BEGIN;

-- HALF 2: CRUD tenant policies for remaining tables
-- FIXED: CREATE POLICY has no IF NOT EXISTS in PG14; use DROP IF EXISTS + CREATE pattern
DO $$
DECLARE t TEXT; tables TEXT[] := ARRAY[
  'wallet_master','wallet_transactions','credit_master',
  'expense_categories','expenses','payment_transactions',
  'loyalty_tiers','customer_loyalty','loyalty_transactions',
  'coupons','offers_master','banners',
  'app_config','home_config','cart','wishlist',
  'notifications','support_tickets'
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

-- Special policies for system_logs (v3.1 L1412-1417)
DROP POLICY IF EXISTS syslogs_company_code ON public.system_logs;
CREATE POLICY syslogs_company_code ON public.system_logs FOR SELECT
  USING ((auth.jwt() ->> 'company_code') = company_code OR (auth.jwt() ->> 'role') = 'super_admin');
DROP POLICY IF EXISTS syslogs_insert ON public.system_logs;
CREATE POLICY syslogs_insert ON public.system_logs FOR INSERT WITH CHECK (TRUE);

-- Special policies for companies (v3.1 L1420-1427)
DROP POLICY IF EXISTS companies_own_read ON public.companies;
CREATE POLICY companies_own_read ON public.companies FOR SELECT
  USING ((auth.jwt() ->> 'role') = 'super_admin' OR company_code = (auth.jwt() ->> 'company_code'));
DROP POLICY IF EXISTS companies_superadmin_write ON public.companies;
CREATE POLICY companies_superadmin_write ON public.companies
  FOR ALL USING ((auth.jwt() ->> 'role') = 'super_admin')
  WITH CHECK ((auth.jwt() ->> 'role') = 'super_admin');

-- Special policies for hsn_master (global reference table, v3.1 L1430-1433)
DROP POLICY IF EXISTS hsn_global_read ON public.hsn_master;
CREATE POLICY hsn_global_read ON public.hsn_master
  FOR SELECT USING (TRUE);

COMMIT;
