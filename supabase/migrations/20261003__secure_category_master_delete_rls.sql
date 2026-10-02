BEGIN;

DROP POLICY IF EXISTS categories_admin_delete ON public.categories;
CREATE POLICY categories_admin_delete
  ON public.categories
  FOR DELETE
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
  );

COMMIT;
