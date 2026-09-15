-- ======================================================================
-- NM MART ULTRA RETAIL ERP
-- View Number: 0104
-- View Name: readable_banners
-- Description: Active banners ordered by sort_order.
-- ======================================================================
BEGIN;

CREATE OR REPLACE VIEW public.readable_banners AS
SELECT *
FROM public.banners
WHERE is_active = true
ORDER BY sort_order;

ALTER VIEW public.readable_banners DISABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.readable_banners TO anon, authenticated, service_role;

COMMIT;
