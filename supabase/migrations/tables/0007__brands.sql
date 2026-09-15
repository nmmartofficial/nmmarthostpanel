-- =============================================================================
-- Migration Number: 0007
-- Filename Label: brands
-- Table Name: public.brands
-- Architectural Rules Reference: Standard tenant table
--   PK = BIGSERIAL | FK = BIGINT | NO UUID
--   tenant_id BIGINT + company_code VARCHAR(16) mandatory
--   DEV GRANTS: RLS disabled + ALL to anon/authenticated/service_role
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.brands (
    id              BIGSERIAL PRIMARY KEY,
    tenant_id       BIGINT NOT NULL,
    company_code    VARCHAR(16) NOT NULL,
    name            TEXT NOT NULL,
    description     TEXT,
    logo_url        TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brands_tenant ON public.brands (tenant_id, company_code);
CREATE INDEX IF NOT EXISTS idx_brands_is_active ON public.brands (is_active);
CREATE INDEX IF NOT EXISTS idx_brands_name ON public.brands (name);

CREATE TRIGGER set_timestamp
    BEFORE UPDATE ON public.brands
    FOR EACH ROW
    EXECUTE FUNCTION public.set_current_timestamp_updated_at();

CREATE TRIGGER inject_tenant_context_on_insert
    BEFORE INSERT ON public.brands
    FOR EACH ROW
    EXECUTE FUNCTION public.inject_tenant_context_on_insert();

ALTER TABLE public.brands DISABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.brands TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE public.brands_id_seq TO anon, authenticated, service_role;

COMMIT;
