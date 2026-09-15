-- ======================================================================
-- NM MART ULTRA RETAIL ERP
-- View Number: 0102
-- View Name: readable_categories
-- Description: Active categories with computed subcategory count,
--              ordered by sort_order.
-- ======================================================================
BEGIN;

CREATE OR REPLACE VIEW public.readable_categories AS
SELECT c.*,
       (SELECT COUNT(*) FROM subcategories s WHERE s.category_id = c.id) AS subcategory_count
FROM public.categories c
WHERE c.is_active = true
ORDER BY sort_order;

ALTER VIEW public.readable_categories DISABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.readable_categories TO anon, authenticated, service_role;

COMMIT;
