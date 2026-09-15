-- =============================================================================
-- Migration Number: 0032
-- Filename Label: app_config
-- Table Name: public.app_config
-- Architectural Rules Reference: Standard tenant table with UNIQUE composite key
--   PK = BIGSERIAL | FK = BIGINT | NO UUID
--   tenant_id BIGINT + company_code VARCHAR(16) mandatory
--   UNIQUE(tenant_id, company_code, key)
--   DEV GRANTS: RLS disabled + ALL to anon/authenticated/service_role
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.app_config (
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

CREATE INDEX IF NOT EXISTS idx_app_config_tenant ON public.app_config (tenant_id, company_code);
CREATE INDEX IF NOT EXISTS idx_app_config_is_active ON public.app_config (is_active);
CREATE INDEX IF NOT EXISTS idx_app_config_key ON public.app_config (key);

CREATE TRIGGER set_timestamp
    BEFORE UPDATE ON public.app_config
    FOR EACH ROW
    EXECUTE FUNCTION public.set_current_timestamp_updated_at();

CREATE TRIGGER inject_tenant_context_on_insert
    BEFORE INSERT ON public.app_config
    FOR EACH ROW
    EXECUTE FUNCTION public.inject_tenant_context_on_insert();

ALTER TABLE public.app_config DISABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.app_config TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE public.app_config_id_seq TO anon, authenticated, service_role;

COMMIT;
