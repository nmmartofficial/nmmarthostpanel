-- =============================================================================
-- Migration Number: 0009
-- Filename Label: stock_alerts
-- Table Name: public.stock_alerts
-- Architectural Rules Reference: Standard tenant table with FK to products
--   PK = BIGSERIAL | FK = BIGINT | NO UUID
--   tenant_id BIGINT + company_code VARCHAR(16) mandatory
--   DEV GRANTS: RLS disabled + ALL to anon/authenticated/service_role
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.stock_alerts (
    id              BIGSERIAL PRIMARY KEY,
    tenant_id       BIGINT NOT NULL,
    company_code    VARCHAR(16) NOT NULL,
    product_id      BIGINT REFERENCES public.products(id) ON DELETE CASCADE,
    alert_type      VARCHAR(20) DEFAULT 'low_stock',
    threshold       NUMERIC NOT NULL,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_alerts_tenant ON public.stock_alerts (tenant_id, company_code);
CREATE INDEX IF NOT EXISTS idx_stock_alerts_is_active ON public.stock_alerts (is_active);
CREATE INDEX IF NOT EXISTS idx_stock_alerts_product_id ON public.stock_alerts (product_id);
CREATE INDEX IF NOT EXISTS idx_stock_alerts_alert_type ON public.stock_alerts (alert_type);

CREATE TRIGGER set_timestamp
    BEFORE UPDATE ON public.stock_alerts
    FOR EACH ROW
    EXECUTE FUNCTION public.set_current_timestamp_updated_at();

CREATE TRIGGER inject_tenant_context_on_insert
    BEFORE INSERT ON public.stock_alerts
    FOR EACH ROW
    EXECUTE FUNCTION public.inject_tenant_context_on_insert();

ALTER TABLE public.stock_alerts DISABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.stock_alerts TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE public.stock_alerts_id_seq TO anon, authenticated, service_role;

COMMIT;
