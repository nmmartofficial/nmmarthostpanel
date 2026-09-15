-- =============================================================================
-- Migration Number: 0033
-- Filename Label: customer_loyalty
-- Table Name: public.customer_loyalty
-- Architectural Rules Reference: Standard tenant table with UNIQUE constraint + FKs
--   PK = BIGSERIAL | FK = BIGINT | NO UUID
--   tenant_id BIGINT + company_code VARCHAR(16) mandatory
--   UNIQUE(tenant_id, user_id)
--   DEV GRANTS: RLS disabled + ALL to anon/authenticated/service_role
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.customer_loyalty (
    id              BIGSERIAL PRIMARY KEY,
    tenant_id       BIGINT NOT NULL,
    company_code    VARCHAR(16) NOT NULL,
    user_id         BIGINT REFERENCES public.users(id) ON DELETE CASCADE,
    customer_id     BIGINT REFERENCES public.delivery_customer_master(id) ON DELETE SET NULL,
    points          NUMERIC DEFAULT 0,
    tier_id         BIGINT,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (tenant_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_customer_loyalty_tenant ON public.customer_loyalty (tenant_id, company_code);
CREATE INDEX IF NOT EXISTS idx_customer_loyalty_is_active ON public.customer_loyalty (is_active);
CREATE INDEX IF NOT EXISTS idx_customer_loyalty_user_id ON public.customer_loyalty (user_id);
CREATE INDEX IF NOT EXISTS idx_customer_loyalty_customer_id ON public.customer_loyalty (customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_loyalty_tier_id ON public.customer_loyalty (tier_id);

CREATE TRIGGER set_timestamp
    BEFORE UPDATE ON public.customer_loyalty
    FOR EACH ROW
    EXECUTE FUNCTION public.set_current_timestamp_updated_at();

CREATE TRIGGER inject_tenant_context_on_insert
    BEFORE INSERT ON public.customer_loyalty
    FOR EACH ROW
    EXECUTE FUNCTION public.inject_tenant_context_on_insert();

ALTER TABLE public.customer_loyalty DISABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.customer_loyalty TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE public.customer_loyalty_id_seq TO anon, authenticated, service_role;

COMMIT;
