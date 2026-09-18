-- =============================================================================
-- Migration Number: 0041
-- Filename Label: unique_master_indexes
-- Purpose: Prevent duplicate master records and duplicate product combinations.
-- Rules:
--   - Categories unique per tenant + company + name
--   - Subcategories unique per tenant + company + category + name
--   - Brands unique per tenant + company + name
--   - Products unique per tenant + company + brand + category + subcategory
-- =============================================================================

BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS uq_categories_tenant_company_name
    ON public.categories (tenant_id, company_code, lower(name));

CREATE UNIQUE INDEX IF NOT EXISTS uq_subcategories_tenant_category_name
    ON public.subcategories (tenant_id, company_code, category_id, lower(name));

CREATE UNIQUE INDEX IF NOT EXISTS uq_brands_tenant_company_name
    ON public.brands (tenant_id, company_code, lower(name));

CREATE UNIQUE INDEX IF NOT EXISTS uq_products_tenant_brand_category_subcategory
    ON public.products (tenant_id, company_code, brand_id, category_id, subcategory_id)
    WHERE brand_id IS NOT NULL AND category_id IS NOT NULL AND subcategory_id IS NOT NULL;

COMMIT;
