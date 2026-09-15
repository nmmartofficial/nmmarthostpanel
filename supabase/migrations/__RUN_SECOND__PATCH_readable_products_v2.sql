-- =====================================================================
-- PATCH #2: Recreate readable_products (100% frontend alias match)
-- NM MART ULTRA RETAIL ERP
-- ---------------------------------------------------------------------
-- Run AFTER Patch #1 (Products Schema Patch)
-- Provides: Legacy cols (itname..itemstatus) + Modern cols +
--           Category/Brand/Unit names via JOINs + column aliases
--           so that frontend erpController + ProductsView see every col.
-- =====================================================================
BEGIN;

DROP VIEW IF EXISTS public.readable_products;

CREATE OR REPLACE VIEW public.readable_products AS
SELECT
    -- 1. Identity / Primary keys
    p.id,
    p.tenant_id,
    p.company_code,

    -- 2. Modern canonical cols (Top priority — frontend default)
    COALESCE(NULLIF(p.name,''), NULLIF(p.itname,''))                                AS name,
    COALESCE(NULLIF(p.print_name,''), NULLIF(p.itnameprint,''),
           NULLIF(p.name,''), NULLIF(p.itname,''))                                   AS print_name,
    COALESCE(NULLIF(p.description,''), NULLIF(p.itemdescription,''))                 AS description,
    COALESCE(NULLIF(p.hsn_code,''),  NULLIF(p.hsncode,''))                            AS hsn_code,
    COALESCE(NULLIF(p.image_url,''), NULLIF(p.imagename,''), NULLIF(p.picture,''))   AS image_url,

    COALESCE(p.take_rate,     p.takerate)     AS take_rate,
    COALESCE(p.retail_rate,   p.restrate)     AS retail_rate,
    COALESCE(p.delivery_rate, p.dlvrate)      AS delivery_rate,
    COALESCE(p.sale_rate,     p.onlinerate,
             COALESCE(p.retail_rate, p.restrate))                                   AS sale_rate,
    COALESCE(p.purchase_rate, p.purcrate)     AS purchase_rate,
    COALESCE(p.mrp,           p.mrp)          AS mrp,
    COALESCE(p.stock,         p.opstock, 0)   AS stock,
    COALESCE(p.discount_percent, p.discperc, 0) AS discount_percent,
    COALESCE(p.is_favourite,  p.isfav, FALSE) AS is_favourite,
    COALESCE(NULLIF(p.unit_name,''), NULLIF(p.unitcode,''))                         AS unit_name,
    COALESCE(NULLIF(p.brand_name,''), NULLIF(p.brandcode,''), br.name)              AS brand_name,
    COALESCE(NULLIF(p.category_name,''), NULLIF(p.itg,''), c.name)                  AS category_name,
    COALESCE(p.is_discountable, p.isdiscountable, TRUE)                             AS is_discountable,
    COALESCE(p.gst_percent, p.gst, 0)         AS gst_percent,
    COALESCE(p.cess_percent, p.cess, 0)       AS cess_percent,
    COALESCE(NULLIF(p.shop_id,''), NULLIF(p.shopid,''))                             AS shop_id,
    COALESCE(p.is_package, p.ispackage, FALSE) AS is_package,
    COALESCE(NULLIF(p.item_status,''), NULLIF(p.itemstatus,''))                     AS item_status,
    COALESCE(p.is_active, TRUE)                AS is_active,

    -- 3. Legacy cols — mirrored verbatim (Excel upload compatibility)
    p.itname,
    p.itnameprint,
    p.barcode,
    p.imagename,
    p.itemdescription,
    p.hsncode,
    p.picture,
    p.takerate,
    p.restrate,
    p.dlvrate,
    p.onlinerate,
    p.purcrate,
    p.opstock,
    p.discperc,
    p.isfav,
    p.unitcode,
    p.itg,
    p.itc,
    p.dtcode,
    p.kcode,
    p.brandcode,
    p.isdiscountable,
    p.gst,
    p.cess,
    p.shopid,
    p.ispackage,
    p.narration,
    p.narration2,
    p.itemstatus,

    -- 4. FK cols + Sub-category helper
    p.category_id,
    p.subcategory_id,
    p.brand_id,
    p.unit_id,
    sc.name  AS subcategory_name,

    -- 5. Derived read-only helpers
    CASE WHEN COALESCE(p.stock, p.opstock, 0) <= 0 THEN 'out_of_stock'
         WHEN COALESCE(p.stock, p.opstock, 0) <= 3 THEN 'low_stock'
         ELSE 'in_stock' END                       AS stock_status,

    -- 6. Audit
    p.created_at,
    p.updated_at,
    p.created_by

FROM public.products p
LEFT JOIN public.categories    c  ON c.id  = p.category_id
LEFT JOIN public.subcategories sc ON sc.id = p.subcategory_id
LEFT JOIN public.brands        br ON br.id = p.brand_id
LEFT JOIN public.unit_master   um ON um.id  = p.unit_id OR um.name::text = COALESCE(NULLIF(p.unit_name,''), NULLIF(p.unitcode,''))::text
WHERE COALESCE(p.is_active, TRUE) = TRUE;

ALTER VIEW public.readable_products DISABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.readable_products TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;
