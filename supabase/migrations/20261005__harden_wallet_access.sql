BEGIN;

REVOKE ALL ON FUNCTION public.adjust_wallet_atomic(BIGINT, NUMERIC, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.admin_adjust_wallet_atomic(BIGINT, BIGINT, TEXT, NUMERIC, TEXT, TEXT)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_adjust_wallet_atomic(BIGINT, BIGINT, TEXT, NUMERIC, TEXT, TEXT)
  TO authenticated;

REVOKE ALL ON TABLE public.wallet_master, public.wallet_transactions
  FROM PUBLIC, anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.wallet_master, public.wallet_transactions
  FROM authenticated;
GRANT SELECT ON TABLE public.wallet_master, public.wallet_transactions TO authenticated;

DROP POLICY IF EXISTS wallet_master_tenant_delete ON public.wallet_master;
DROP POLICY IF EXISTS wallet_master_tenant_insert ON public.wallet_master;
DROP POLICY IF EXISTS wallet_master_tenant_read ON public.wallet_master;
DROP POLICY IF EXISTS wallet_master_tenant_update ON public.wallet_master;
DROP POLICY IF EXISTS wallet_transactions_tenant_delete ON public.wallet_transactions;
DROP POLICY IF EXISTS wallet_transactions_tenant_insert ON public.wallet_transactions;
DROP POLICY IF EXISTS wallet_transactions_tenant_read ON public.wallet_transactions;
DROP POLICY IF EXISTS wallet_transactions_tenant_update ON public.wallet_transactions;

CREATE POLICY wallet_master_admin_read
  ON public.wallet_master
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.admin_users AS admin_user
      WHERE admin_user.auth_user_id = auth.uid()
        AND admin_user.status = 'active'
        AND admin_user.role = 'super_admin'
        AND admin_user.tenant_id = wallet_master.tenant_id
        AND admin_user.company_code = wallet_master.company_code
    )
  );

CREATE POLICY wallet_transactions_admin_read
  ON public.wallet_transactions
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.admin_users AS admin_user
      WHERE admin_user.auth_user_id = auth.uid()
        AND admin_user.status = 'active'
        AND admin_user.role = 'super_admin'
        AND admin_user.tenant_id = wallet_transactions.tenant_id
        AND admin_user.company_code = wallet_transactions.company_code
    )
  );

COMMIT;
