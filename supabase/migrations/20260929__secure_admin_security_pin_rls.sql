BEGIN;

DROP POLICY IF EXISTS "Global Read Access" ON public.app_config;
CREATE POLICY "Global Read Access"
  ON public.app_config
  FOR SELECT
  TO public
  USING (key <> 'admin_security_pin');

DROP POLICY IF EXISTS app_config_tenant_read ON public.app_config;
CREATE POLICY app_config_tenant_read
  ON public.app_config
  FOR SELECT
  TO authenticated
  USING (
    (
      key = 'admin_security_pin'
      AND EXISTS (
        SELECT 1
        FROM public.admin_users AS admin_user
        WHERE admin_user.auth_user_id = auth.uid()
          AND admin_user.role = 'super_admin'
          AND admin_user.status = 'active'
      )
    )
    OR (
      key <> 'admin_security_pin'
      AND (
      (
        (auth.jwt() ->> 'tenant_id') IS NOT NULL
        AND tenant_id = ((auth.jwt() ->> 'tenant_id'))::bigint
      )
      OR (
        (auth.jwt() ->> 'company_code') IS NOT NULL
        AND company_code::text = (auth.jwt() ->> 'company_code')
      )
      OR (auth.jwt() ->> 'role') = 'super_admin'
      OR matches_company_scope(company_code::text)
      )
    )
  );

DROP POLICY IF EXISTS app_config_tenant_update ON public.app_config;
CREATE POLICY app_config_tenant_update
  ON public.app_config
  FOR UPDATE
  TO authenticated
  USING (
    key = 'admin_security_pin'
    AND EXISTS (
      SELECT 1
      FROM public.admin_users AS admin_user
      WHERE admin_user.auth_user_id = auth.uid()
        AND admin_user.role = 'super_admin'
        AND admin_user.status = 'active'
    )
  )
  WITH CHECK (
    key = 'admin_security_pin'
    AND EXISTS (
      SELECT 1
      FROM public.admin_users AS admin_user
      WHERE admin_user.auth_user_id = auth.uid()
        AND admin_user.role = 'super_admin'
        AND admin_user.status = 'active'
    )
  );

COMMIT;