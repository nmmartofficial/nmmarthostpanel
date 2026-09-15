-- ======================================================================
-- NM MART ULTRA RETAIL ERP
-- View Number: 0106
-- View Name: readable_orders
-- Description: Orders with joined user (name, phone) and delivery boy
--              name. Ordered by created_at DESC.
-- ======================================================================
BEGIN;

CREATE OR REPLACE VIEW public.readable_orders AS
SELECT o.*,
       u.name     AS user_name,
       u.phone    AS user_phone,
       db.name    AS delivery_boy_name
FROM public.orders o
         LEFT JOIN users u                ON u.id  = o.user_id
         LEFT JOIN delivery_boy_master db ON db.id = o.delivery_boy_id
ORDER BY o.created_at DESC;

ALTER VIEW public.readable_orders DISABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.readable_orders TO anon, authenticated, service_role;

COMMIT;
