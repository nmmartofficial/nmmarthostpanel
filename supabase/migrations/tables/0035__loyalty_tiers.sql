-- =============================================================================
-- Migration Number: 0035
-- Filename Label: loyalty_tiers
-- Table Name: public.loyalty_tiers
-- Architectural Rules Reference: Standard tenant table
--   PK = BIGSERIAL | FK = BIGINT | NO UUID
--   tenant_id BIGINT + company_code VARCHAR(16) mandatory
--   DEV GRANTS: RLS disabled + ALL to anon/authenticated/service_role
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.loyalty_tiers (
    id              BIGSERIAL PRIMARY KEY,
    tenant_id       BIGINT NOT NULL,
    company_code    VARCHAR(16) NOT NULL,
    name            TEXT NOT NULL,
    min_points      NUMERIC DEFAULT 0,
    max_points      NUMERIC,
    benefits        TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_loyalty_tiers_tenant ON public.loyalty_tiers (tenant_id, company_code);
CREATE INDEX IF NOT EXISTS idx_loyalty_tiers_is_active ON public.loyalty_tiers (is_active);
CREATE INDEX IF NOT EXISTS idx_loyalty_tiers_name ON public.loyalty_tiers (name);
CREATE INDEX IF NOT EXISTS idx_loyalty_tiers_points ON public.loyalty_tiers (min_points, max_points);

CREATE TRIGGER set_timestamp
    BEFORE UPDATE ON public.loyalty_tiers
    FOR EACH ROW
    EXECUTE FUNCTION public.set_current_timestamp_updated_at();

CREATE TRIGGER inject_tenant_context_on_insert
    BEFORE INSERT ON public.loyalty_tiers
    FOR EACH ROW
    EXECUTE FUNCTION public.inject_tenant_context_on_insert();

ALTER TABLE public.loyalty_tiers DISABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.loyalty_tiers TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE public.loyalty_tiers_id_seq TO anon, authenticated, service_role;

COMMIT;
