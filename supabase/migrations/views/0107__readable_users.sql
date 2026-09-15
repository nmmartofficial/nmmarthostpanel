-- ======================================================================
-- NM MART ULTRA RETAIL ERP
-- View Number: 0107
-- View Name: readable_users
-- Description: Limited public-safe columns for active users,
--              ordered by created_at DESC.
-- ======================================================================
BEGIN;

CREATE OR REPLACE VIEW public.readable_users AS
SELECT id, name, email, phone, pincode, is_active, created_at, tenant_id, company_code
FROM public.users
WHERE is_active = true
ORDER BY created_at DESC;

ALTER VIEW public.readable_users DISABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.readable_users TO anon, authenticated, service_role;

COMMIT;
