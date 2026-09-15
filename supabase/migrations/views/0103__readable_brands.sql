-- ======================================================================
-- NM MART ULTRA RETAIL ERP
-- View Number: 0103
-- View Name: readable_brands
-- Description: Active brands with computed product count.
-- ======================================================================
BEGIN;

CREATE OR REPLACE VIEW public.readable_brands AS
SELECT b.*,
       (SELECT COUNT(*) FROM products p WHERE p.brand_id = b.id) AS product_count
FROM public.brands b
WHERE b.is_active = true;

ALTER VIEW public.readable_brands DISABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.readable_brands TO anon, authenticated, service_role;

COMMIT;
