-- =============================================================================
-- Migration Number: 0015
-- Filename Label: inventory_logs
-- Table Name: public.inventory_logs
-- Architectural Rules Reference: Standard tenant table with FK to products
--   PK = BIGSERIAL | FK = BIGINT | NO UUID
--   tenant_id BIGINT + company_code VARCHAR(16) mandatory
--   DEV GRANTS: RLS disabled + ALL to anon/authenticated/service_role
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.inventory_logs (
    id              BIGSERIAL PRIMARY KEY,
    tenant_id       BIGINT NOT NULL,
    company_code    VARCHAR(16) NOT NULL,
    product_id      BIGINT REFERENCES public.products(id) ON DELETE CASCADE,
    old_stock       NUMERIC DEFAULT 0,
    new_stock       NUMERIC DEFAULT 0,
    change_type     VARCHAR(20) DEFAULT 'adjustment',
    reference_id    BIGINT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_logs_tenant ON public.inventory_logs (tenant_id, company_code);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_product_id ON public.inventory_logs (product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_change_type ON public.inventory_logs (change_type);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_reference_id ON public.inventory_logs (reference_id);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_created_at ON public.inventory_logs (created_at);

CREATE TRIGGER set_timestamp
    BEFORE UPDATE ON public.inventory_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.set_current_timestamp_updated_at();

CREATE TRIGGER inject_tenant_context_on_insert
    BEFORE INSERT ON public.inventory_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.inject_tenant_context_on_insert();

ALTER TABLE public.inventory_logs DISABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.inventory_logs TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE public.inventory_logs_id_seq TO anon, authenticated, service_role;

COMMIT;
