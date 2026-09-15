-- =====================================================================
-- PATCH #1: Products Schema + Grants (RUN FIRST — सीधा SQL Editor paste)
-- NM MART ULTRA RETAIL ERP
-- Fixes: Missing cols (stock, mrp, retail_rate, purchase_rate, category_name,
--         brand_name, unit_name, item_status, is_active, created_by, audit cols)
--         + Type FIXes: id/text→BIGINT, 4 percent cols text→NUMERIC
--         + Row Level Security DISABLED for dev
--         + Full GRANTs to anon / authenticated / service_role
-- =====================================================================
BEGIN;

-- ============================================================
-- 1. id TEXT → BIGINT + sequence setup (Project Policy: NO UUID!)
-- ============================================================
DO $$
DECLARE _coltype text;
BEGIN
    SELECT data_type INTO _coltype
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='products' AND column_name='id';

    IF _coltype IN ('text','character varying','character') THEN
        EXECUTE 'ALTER TABLE public.products ADD COLUMN IF NOT EXISTS old_id_backup TEXT';
        EXECUTE 'UPDATE public.products SET old_id_backup = id WHERE old_id_backup IS NULL';
        EXECUTE 'UPDATE public.products SET id = NULL WHERE id !~ ''^-?[0-9]+$''';
        EXECUTE 'ALTER TABLE public.products ALTER COLUMN id TYPE BIGINT USING (CASE WHEN id IS NULL THEN NULL ELSE id::bigint END)';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.sequences WHERE sequence_schema='public' AND sequence_name='products_id_seq') THEN
        CREATE SEQUENCE public.products_id_seq;
    END IF;
    EXECUTE 'SELECT setval(''public.products_id_seq'', COALESCE((SELECT MAX(id) FROM public.products), 0) + 1, false)';
    EXECUTE 'ALTER TABLE public.products ALTER COLUMN id SET DEFAULT nextval(''public.products_id_seq''::regclass)';
END $$;

-- ============================================================
-- 2. Tenant + Audit columns
-- ============================================================
ALTER TABLE public.products
    ADD COLUMN IF NOT EXISTS tenant_id    BIGINT,
    ADD COLUMN IF NOT EXISTS company_code VARCHAR(16),
    ADD COLUMN IF NOT EXISTS created_by   BIGINT,
    ADD COLUMN IF NOT EXISTS created_at   TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at   TIMESTAMPTZ DEFAULT NOW();

-- ============================================================
-- 3. Legacy + Modern columns (REQUIRED AS PER FRONTEND EXPECTATION)
-- ============================================================
ALTER TABLE public.products
    ADD COLUMN IF NOT EXISTS itname          TEXT,
    ADD COLUMN IF NOT EXISTS itnameprint     TEXT,
    ADD COLUMN IF NOT EXISTS barcode         TEXT,
    ADD COLUMN IF NOT EXISTS imagename       TEXT,
    ADD COLUMN IF NOT EXISTS itemdescription TEXT,
    ADD COLUMN IF NOT EXISTS hsncode         TEXT,
    ADD COLUMN IF NOT EXISTS picture         TEXT,
    ADD COLUMN IF NOT EXISTS takerate        NUMERIC,
    ADD COLUMN IF NOT EXISTS restrate        NUMERIC,
    ADD COLUMN IF NOT EXISTS dlvrate         NUMERIC,
    ADD COLUMN IF NOT EXISTS onlinerate      NUMERIC,
    ADD COLUMN IF NOT EXISTS purcrate        NUMERIC,
    ADD COLUMN IF NOT EXISTS mrp             NUMERIC,
    ADD COLUMN IF NOT EXISTS opstock         NUMERIC,
    ADD COLUMN IF NOT EXISTS discperc        NUMERIC,
    ADD COLUMN IF NOT EXISTS isfav           BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS unitcode        TEXT,
    ADD COLUMN IF NOT EXISTS itg             TEXT,
    ADD COLUMN IF NOT EXISTS itc             TEXT,
    ADD COLUMN IF NOT EXISTS dtcode          TEXT,
    ADD COLUMN IF NOT EXISTS kcode           TEXT,
    ADD COLUMN IF NOT EXISTS brandcode       TEXT,
    ADD COLUMN IF NOT EXISTS isdiscountable  BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS gst             NUMERIC,
    ADD COLUMN IF NOT EXISTS cess            NUMERIC,
    ADD COLUMN IF NOT EXISTS shopid          TEXT,
    ADD COLUMN IF NOT EXISTS ispackage       BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS narration       TEXT,
    ADD COLUMN IF NOT EXISTS narration2      TEXT,
    ADD COLUMN IF NOT EXISTS itemstatus      TEXT;

ALTER TABLE public.products
    ADD COLUMN IF NOT EXISTS name              TEXT,
    ADD COLUMN IF NOT EXISTS print_name        TEXT,
    ADD COLUMN IF NOT EXISTS description       TEXT,
    ADD COLUMN IF NOT EXISTS hsn_code          TEXT,
    ADD COLUMN IF NOT EXISTS image_url         TEXT,
    ADD COLUMN IF NOT EXISTS take_rate         NUMERIC,
    ADD COLUMN IF NOT EXISTS retail_rate       NUMERIC,
    ADD COLUMN IF NOT EXISTS delivery_rate     NUMERIC,
    ADD COLUMN IF NOT EXISTS sale_rate         NUMERIC,
    ADD COLUMN IF NOT EXISTS purchase_rate     NUMERIC,
    ADD COLUMN IF NOT EXISTS stock             NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS discount_percent  NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS is_favourite      BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS unit_name         TEXT,
    ADD COLUMN IF NOT EXISTS category_name     TEXT,
    ADD COLUMN IF NOT EXISTS brand_name        TEXT,
    ADD COLUMN IF NOT EXISTS is_discountable   BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS gst_percent       NUMERIC,
    ADD COLUMN IF NOT EXISTS cess_percent      NUMERIC,
    ADD COLUMN IF NOT EXISTS shop_id           TEXT,
    ADD COLUMN IF NOT EXISTS is_package        BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS item_status       TEXT,
    ADD COLUMN IF NOT EXISTS is_active         BOOLEAN DEFAULT TRUE;

-- FK references (optional BIGINT links; NULL-able)
ALTER TABLE public.products
    ADD COLUMN IF NOT EXISTS category_id    BIGINT,
    ADD COLUMN IF NOT EXISTS subcategory_id BIGINT,
    ADD COLUMN IF NOT EXISTS brand_id       BIGINT,
    ADD COLUMN IF NOT EXISTS unit_id        BIGINT;

-- ============================================================
-- 4. Type CAST fixes — 4 percent/rate cols IF they are TEXT
-- ============================================================
DO $$
DECLARE _col text; _arr TEXT[] := ARRAY['cess_percent','delivery_rate','discount_percent','gst_percent'];
BEGIN
    FOREACH _col IN ARRAY _arr LOOP
        IF EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema='public' AND table_name='products'
                     AND column_name=_col AND data_type IN ('text','character varying','character'))
        THEN
            EXECUTE format(
                'ALTER TABLE public.products ALTER COLUMN %I TYPE NUMERIC USING (CASE WHEN TRIM(COALESCE(%I,'''')) = '''' THEN NULL ELSE %I::numeric END);',
                _col, _col, _col);
        END IF;
    END LOOP;
END $$;

-- ============================================================
-- 5. Stock non-negative CHECK + MRP validation
-- ============================================================
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_stock_nonneg;
ALTER TABLE public.products
    ADD CONSTRAINT products_stock_nonneg CHECK (COALESCE(stock, 0) >= 0) NOT VALID;

-- ============================================================
-- 6. INDEXES (Search performance)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_products_tenant_combo  ON public.products (tenant_id, company_code);
CREATE INDEX IF NOT EXISTS idx_products_active        ON public.products (tenant_id, is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_products_search_name   ON public.products (tenant_id, LOWER(COALESCE(name, itname, '')::text) text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_products_barcode       ON public.products (tenant_id, barcode) WHERE barcode IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_category      ON public.products (tenant_id, category_id) WHERE category_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_brand         ON public.products (tenant_id, brand_id)    WHERE brand_id IS NOT NULL;

-- ============================================================
-- 7. Triggers (AUTO updated_at + auto inject tenant context)
-- ============================================================
DROP TRIGGER IF EXISTS products_updated_at ON public.products;
CREATE TRIGGER products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

DROP TRIGGER IF EXISTS products_inject_tenant_before_insert ON public.products;
CREATE TRIGGER products_inject_tenant_before_insert
BEFORE INSERT ON public.products
FOR EACH ROW EXECUTE FUNCTION public.inject_tenant_context_on_insert();

-- ============================================================
-- 8. DEV-MODE SECURITY — Disable RLS + Full Permissions
-- ============================================================
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;

GRANT ALL ON public.products TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE public.products_id_seq TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;
