BEGIN;

DROP POLICY IF EXISTS categories_admin_update ON public.categories;
CREATE POLICY categories_admin_update
  ON public.categories
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.admin_users AS admin_user
      WHERE admin_user.auth_user_id = auth.uid()
        AND admin_user.status = 'active'
        AND admin_user.role = 'super_admin'
        AND admin_user.tenant_id = categories.tenant_id
        AND admin_user.company_code = categories.company_code
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.admin_users AS admin_user
      WHERE admin_user.auth_user_id = auth.uid()
        AND admin_user.status = 'active'
        AND admin_user.role = 'super_admin'
        AND admin_user.tenant_id = categories.tenant_id
        AND admin_user.company_code = categories.company_code
    )
  );

DROP POLICY IF EXISTS subcategories_admin_update ON public.subcategories;
CREATE POLICY subcategories_admin_update
  ON public.subcategories
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.admin_users AS admin_user
      WHERE admin_user.auth_user_id = auth.uid()
        AND admin_user.status = 'active'
        AND admin_user.role = 'super_admin'
        AND admin_user.tenant_id = subcategories.tenant_id
        AND admin_user.company_code = subcategories.company_code
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.admin_users AS admin_user
      WHERE admin_user.auth_user_id = auth.uid()
        AND admin_user.status = 'active'
        AND admin_user.role = 'super_admin'
        AND admin_user.tenant_id = subcategories.tenant_id
        AND admin_user.company_code = subcategories.company_code
    )
  );

COMMIT;