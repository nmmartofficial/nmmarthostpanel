-- =============================================================================
-- Migration Number: 0014
-- Filename Label: purchase_items
-- Table Name: public.purchase_items
-- Architectural Rules Reference: Standard tenant table with FKs (purchases, products)
--   PK = BIGSERIAL | FK = BIGINT | NO UUID
--   tenant_id BIGINT + company_code VARCHAR(16) mandatory
--   DEV GRANTS: RLS disabled + ALL to anon/authenticated/service_role
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.purchase_items (
    id              BIGSERIAL PRIMARY KEY,
    tenant_id       BIGINT NOT NULL,
    company_code    VARCHAR(16) NOT NULL,
    purchase_id     BIGINT REFERENCES public.purchases(id) ON DELETE CASCADE,
    product_id      BIGINT REFERENCES public.products(id) ON DELETE SET NULL,
    quantity        NUMERIC NOT NULL DEFAULT 0,
    rate            NUMERIC NOT NULL DEFAULT 0,
    total           NUMERIC DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_purchase_items_tenant ON public.purchase_items (tenant_id, company_code);
CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase_id ON public.purchase_items (purchase_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_product_id ON public.purchase_items (product_id);

CREATE TRIGGER set_timestamp
    BEFORE UPDATE ON public.purchase_items
    FOR EACH ROW
    EXECUTE FUNCTION public.set_current_timestamp_updated_at();

CREATE TRIGGER inject_tenant_context_on_insert
    BEFORE INSERT ON public.purchase_items
    FOR EACH ROW
    EXECUTE FUNCTION public.inject_tenant_context_on_insert();

ALTER TABLE public.purchase_items DISABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.purchase_items TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE public.purchase_items_id_seq TO anon, authenticated, service_role;

COMMIT;
