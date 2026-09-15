-- ======================================================================
-- NM MART ULTRA RETAIL ERP
-- View Number: 0105
-- View Name: readable_coupons
-- Description: Currently valid, active, and not fully-used coupons.
--              Checks date range and usage_limit vs used_count.
-- ======================================================================
BEGIN;

CREATE OR REPLACE VIEW public.readable_coupons AS
SELECT *
FROM public.coupons
WHERE is_active = true
  AND NOW() BETWEEN COALESCE(valid_from, NOW())
                AND COALESCE(valid_to, NOW() + INTERVAL '1 year')
  AND used_count < COALESCE(usage_limit, used_count + 1);

ALTER VIEW public.readable_coupons DISABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.readable_coupons TO anon, authenticated, service_role;

COMMIT;
