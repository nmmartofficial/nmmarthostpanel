-- =============================================================================
-- Migration Number: 0008
-- Filename Label: products
-- Table Name: public.products
-- Architectural Rules Reference: CRITICAL Dual-Column table (31 legacy + modern cols)
--   PK = BIGSERIAL | FK = BIGINT | NO UUID
--   tenant_id BIGINT + company_code VARCHAR(16) mandatory
--   31 LEGACY cols + ALL modern dual cols + category_id/subcategory_id/brand_id BIGINT
--   CHECK constraints: stock>=0, sale_rate <= COALESCE(mrp, sale_rate)
--   DEV GRANTS: RLS disabled + ALL to anon/authenticated/service_role
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.products (
    id                  BIGSERIAL PRIMARY KEY,
    tenant_id           BIGINT NOT NULL,
    company_code        VARCHAR(16) NOT NULL,

    itname              TEXT,
    itnameprint         TEXT,
    barcode             TEXT,
    imagename           TEXT,
    itemdescription     TEXT,
    hsncode             TEXT,
    picture             TEXT,
    takerate            NUMERIC,
    restrate            NUMERIC,
    dlvrate             NUMERIC,
    onlinerate          NUMERIC,
    purcrate            NUMERIC,
    mrp                 NUMERIC,
    opstock             NUMERIC,
    discperc            NUMERIC,
    isfav               BOOLEAN DEFAULT FALSE,
    unitcode            TEXT,
    itg                 TEXT,
    itc                 TEXT,
    dtcode              TEXT,
    kcode               TEXT,
    brandcode           TEXT,
    isdiscountable      BOOLEAN DEFAULT TRUE,
    gst                 NUMERIC,
    cess                NUMERIC,
    shopid              TEXT,
    ispackage           BOOLEAN DEFAULT FALSE,
    narration           TEXT,
    narration2          TEXT,
    itemstatus          TEXT,

    name                TEXT NOT NULL,
    print_name          TEXT,
    description         TEXT,
    hsn_code            TEXT,
    image_url           TEXT,
    take_rate           NUMERIC,
    retail_rate         NUMERIC,
    delivery_rate       NUMERIC,
    sale_rate           NUMERIC,
    purchase_rate       NUMERIC,
    stock               NUMERIC DEFAULT 0,
    discount_percent    NUMERIC DEFAULT 0,
    is_favourite        BOOLEAN DEFAULT FALSE,
    unit_name           TEXT,
    category_name       TEXT,
    brand_name          TEXT,
    is_discountable     BOOLEAN DEFAULT TRUE,
    gst_percent         NUMERIC DEFAULT 0,
    cess_percent        NUMERIC DEFAULT 0,
    shop_id             TEXT,
    is_package          BOOLEAN DEFAULT FALSE,
    item_status         TEXT DEFAULT 'active',

    category_id         BIGINT REFERENCES public.categories(id) ON DELETE SET NULL,
    subcategory_id      BIGINT REFERENCES public.subcategories(id) ON DELETE SET NULL,
    brand_id            BIGINT REFERENCES public.brands(id) ON DELETE SET NULL,

    is_active           BOOLEAN DEFAULT TRUE,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT check_products_stock_nonnegative CHECK (stock >= 0),
    CONSTRAINT check_products_sale_rate_le_mrp CHECK (sale_rate <= COALESCE(mrp, sale_rate))
);

CREATE INDEX IF NOT EXISTS idx_products_tenant ON public.products (tenant_id, company_code);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON public.products (is_active);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products (category_id);
CREATE INDEX IF NOT EXISTS idx_products_subcategory_id ON public.products (subcategory_id);
CREATE INDEX IF NOT EXISTS idx_products_brand_id ON public.products (brand_id);
CREATE INDEX IF NOT EXISTS idx_products_name ON public.products (name);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products (barcode);
CREATE INDEX IF NOT EXISTS idx_products_search ON public.products (name, barcode, hsn_code);

CREATE TRIGGER set_timestamp
    BEFORE UPDATE ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION public.set_current_timestamp_updated_at();

CREATE TRIGGER inject_tenant_context_on_insert
    BEFORE INSERT ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION public.inject_tenant_context_on_insert();

ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.products TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE public.products_id_seq TO anon, authenticated, service_role;

COMMIT;
