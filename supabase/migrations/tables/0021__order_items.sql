-- =============================================================================
-- Migration Number: 0021
-- Filename Label: order_items
-- Table Name: public.order_items
-- Architectural Rules Reference: CRITICAL Dual-Column table (quantity+qty, rate+price)
--   PK = BIGSERIAL | FK = BIGINT | NO UUID
--   tenant_id BIGINT + company_code VARCHAR(16) mandatory
--   Dual cols: quantity+qty NUMERIC, rate+price NUMERIC (both sets present)
--   DEV GRANTS: RLS disabled + ALL to anon/authenticated/service_role
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.order_items (
    id              BIGSERIAL PRIMARY KEY,
    tenant_id       BIGINT NOT NULL,
    company_code    VARCHAR(16) NOT NULL,
    order_id        BIGINT REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id      BIGINT REFERENCES public.products(id) ON DELETE SET NULL,
    product_name    TEXT,

    quantity        NUMERIC DEFAULT 0,
    qty             NUMERIC DEFAULT 0,
    rate            NUMERIC DEFAULT 0,
    price           NUMERIC DEFAULT 0,

    total           NUMERIC DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_items_tenant ON public.order_items (tenant_id, company_code);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items (product_id);

CREATE TRIGGER set_timestamp
    BEFORE UPDATE ON public.order_items
    FOR EACH ROW
    EXECUTE FUNCTION public.set_current_timestamp_updated_at();

CREATE TRIGGER inject_tenant_context_on_insert
    BEFORE INSERT ON public.order_items
    FOR EACH ROW
    EXECUTE FUNCTION public.inject_tenant_context_on_insert();

ALTER TABLE public.order_items DISABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.order_items TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE public.order_items_id_seq TO anon, authenticated, service_role;

COMMIT;
