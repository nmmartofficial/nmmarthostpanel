-- =============================================================================
-- Migration Number: 0041
-- Filename Label: unique_master_indexes
-- Purpose: Prevent duplicate master names while allowing multiple products in the same
--          brand/category/subcategory grouping.
-- Rules:
--   - Categories unique per tenant + company + name
--   - Subcategories unique per tenant + company + category + name
--   - Brands unique per tenant + company + name
--   - Products intentionally do NOT enforce name/barcode/brand/category/subcategory uniqueness
-- =============================================================================

BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS uq_categories_tenant_company_name
    ON public.categories (tenant_id, company_code, lower(name));

CREATE UNIQUE INDEX IF NOT EXISTS uq_subcategories_tenant_category_name
    ON public.subcategories (tenant_id, company_code, category_id, lower(name));

CREATE UNIQUE INDEX IF NOT EXISTS uq_brands_tenant_company_name
    ON public.brands (tenant_id, company_code, lower(name));

-- Product-level duplicate validation is intentionally not enforced here.
-- Product duplicates are allowed by design according to the master-data rule.

COMMIT;
