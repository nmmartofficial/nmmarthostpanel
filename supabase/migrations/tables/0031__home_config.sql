-- =============================================================================
-- Migration Number: 0031
-- Filename Label: home_config
-- Table Name: public.home_config
-- Architectural Rules Reference: Standard tenant table with UNIQUE composite key
--   PK = BIGSERIAL | FK = BIGINT | NO UUID
--   tenant_id BIGINT + company_code VARCHAR(16) mandatory
--   UNIQUE(tenant_id, company_code, key)
--   DEV GRANTS: RLS disabled + ALL to anon/authenticated/service_role
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.home_config (
    id              BIGSERIAL PRIMARY KEY,
    tenant_id       BIGINT NOT NULL,
    company_code    VARCHAR(16) NOT NULL,
    key             TEXT NOT NULL,
    value           TEXT,
    description     TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (tenant_id, company_code, key)
);

CREATE INDEX IF NOT EXISTS idx_home_config_tenant ON public.home_config (tenant_id, company_code);
CREATE INDEX IF NOT EXISTS idx_home_config_is_active ON public.home_config (is_active);
CREATE INDEX IF NOT EXISTS idx_home_config_key ON public.home_config (key);

CREATE TRIGGER set_timestamp
    BEFORE UPDATE ON public.home_config
    FOR EACH ROW
    EXECUTE FUNCTION public.set_current_timestamp_updated_at();

CREATE TRIGGER inject_tenant_context_on_insert
    BEFORE INSERT ON public.home_config
    FOR EACH ROW
    EXECUTE FUNCTION public.inject_tenant_context_on_insert();

ALTER TABLE public.home_config DISABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.home_config TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE public.home_config_id_seq TO anon, authenticated, service_role;

COMMIT;
