BEGIN;

CREATE OR REPLACE VIEW public.readable_products AS
SELECT
  p.id, p.tenant_id, p.company_code, p.name, p.itname, p.print_name, p.itnameprint,
  p.barcode, p.hsn_code, p.hsncode, p.image_url, p.imagename, p.picture,
  p.description, p.itemdescription,
  c.id AS category_id, c.name AS category_name,
  sc.id AS subcategory_id, sc.name AS subcategory_name,
  b.id AS brand_id, b.name AS brand_name,
  u.id AS unit_id, u.name AS unit_name, u.symbol AS unit_symbol,
  p.purchase_rate, p.purcrate, p.mrp, p.retail_rate, p.restrate,
  p.take_rate, p.takerate, p.delivery_rate, p.dlvrate,
  p.sale_rate, p.onlinerate, p.stock, p.opstock, p.low_stock_threshold,
  p.gst_percent, p.gst, p.cess_percent, p.cess,
  p.discount_percent, p.discperc, p.is_discountable, p.isdiscountable,
  p.is_favourite, p.isfav, p.is_package, p.ispackage,
  p.itemstatus, p.is_active, p.created_at, p.updated_at
FROM public.products p
LEFT JOIN public.categories c    ON c.id  = p.category_id
LEFT JOIN public.subcategories sc ON sc.id = p.subcategory_id
LEFT JOIN public.brands b        ON b.id  = p.brand_id
LEFT JOIN public.unit_master u   ON u.id::text = p.unitcode OR u.symbol = p.unitcode OR FALSE;
GRANT SELECT ON public.readable_products TO anon, authenticated, service_role;

CREATE OR REPLACE VIEW public.readable_categories AS
SELECT c.*, (SELECT COUNT(*) FROM public.products p WHERE p.category_id = c.id) AS product_count
FROM public.categories c;
GRANT SELECT ON public.readable_categories TO anon, authenticated, service_role;

CREATE OR REPLACE VIEW public.readable_brands AS
SELECT b.*, (SELECT COUNT(*) FROM public.products p WHERE p.brand_id = b.id) AS product_count
FROM public.brands b;
GRANT SELECT ON public.readable_brands TO anon, authenticated, service_role;

CREATE OR REPLACE VIEW public.readable_banners AS SELECT b.* FROM public.banners b;
GRANT SELECT ON public.readable_banners TO anon, authenticated, service_role;

CREATE OR REPLACE VIEW public.readable_coupons AS
SELECT c.*, (c.usage_limit - c.used_count) AS remaining_uses FROM public.coupons c;
GRANT SELECT ON public.readable_coupons TO anon, authenticated, service_role;

CREATE OR REPLACE VIEW public.readable_orders AS
SELECT
  o.id, o.tenant_id, o.company_code, o.order_number, o.order_type,
  o.user_id, u.name AS user_name, o.customer_name, o.user_mobile,
  o.delivery_address, o.pincode,
  o.subtotal, o.discount, o.coupon_discount,
  o.delivery_charge, o.packaging_charge,
  o.cgst_amount, o.sgst_amount, o.igst_amount, o.cess_amount,
  o.round_off, o.total_amount,
  o.payment_method, o.payment_status, o.order_status,
  o.delivery_boy_id, db.name AS delivery_boy_name,
  o.cashier_admin_user_id, au.name AS cashier_name,
  o.notes, o.invoice_generated, o.invoice_printed_at,
  o.delivered_at, o.cancelled_at,
  (SELECT COUNT(*) FROM public.order_items oi WHERE oi.order_id = o.id) AS item_count,
  (SELECT SUM(oi.quantity) FROM public.order_items oi WHERE oi.order_id = o.id) AS total_qty,
  o.created_at, o.updated_at
FROM public.orders o
LEFT JOIN public.users u                  ON u.id  = o.user_id
LEFT JOIN public.admin_users au           ON au.id = o.cashier_admin_user_id
LEFT JOIN public.delivery_boy_master db   ON db.id = o.delivery_boy_id;
GRANT SELECT ON public.readable_orders TO anon, authenticated, service_role;

CREATE OR REPLACE VIEW public.readable_users AS
SELECT
  u.*,
  COALESCE(w.balance, 0)              AS wallet_balance,
  COALESCE(cl.points, 0)              AS loyalty_points,
  (SELECT COUNT(*) FROM public.orders o WHERE o.user_id = u.id) AS total_orders,
  COALESCE((SELECT SUM(o.total_amount) FROM public.orders o
            WHERE o.user_id = u.id AND o.order_status = 'delivered'), 0)
      AS lifetime_spend
FROM public.users u
LEFT JOIN public.wallet_master w     ON w.user_id  = u.id
LEFT JOIN public.customer_loyalty cl ON cl.user_id = u.id;
GRANT SELECT ON public.readable_users TO anon, authenticated, service_role;

COMMIT;
