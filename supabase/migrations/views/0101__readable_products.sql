-- ======================================================================
-- NM MART ULTRA RETAIL ERP
-- View Number: 0101
-- View Name: readable_products
-- Description: Human-readable products view with joined category,
--              subcategory, brand names and unit symbol. Filters active.
-- ======================================================================
BEGIN;

CREATE OR REPLACE VIEW public.readable_products AS
SELECT p.*,
       cat.name AS category_name_readable,
       sub.name AS subcategory_name_readable,
       br.name  AS brand_name_readable,
       u.symbol AS unit_symbol
FROM public.products p
         LEFT JOIN categories cat     ON cat.id = p.category_id
         LEFT JOIN subcategories sub  ON sub.id = p.subcategory_id
         LEFT JOIN brands br          ON br.id  = p.brand_id
         LEFT JOIN unit_master u      ON u.name = p.unit_name OR u.id::text = p.unitcode::text
WHERE COALESCE(p.is_active, true) = true;

ALTER VIEW public.readable_products DISABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.readable_products TO anon, authenticated, service_role;

COMMIT;
