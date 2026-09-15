-- =============================================================================
-- Migration Number: 0012
-- Filename Label: account_master
-- Table Name: public.account_master
-- Architectural Rules Reference: Standard tenant table
--   PK = BIGSERIAL | FK = BIGINT | NO UUID
--   tenant_id BIGINT + company_code VARCHAR(16) mandatory
--   DEV GRANTS: RLS disabled + ALL to anon/authenticated/service_role
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.account_master (
    id              BIGSERIAL PRIMARY KEY,
    tenant_id       BIGINT NOT NULL,
    company_code    VARCHAR(16) NOT NULL,
    name            TEXT NOT NULL,
    type            VARCHAR(20) DEFAULT 'general',
    balance         NUMERIC DEFAULT 0,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_account_master_tenant ON public.account_master (tenant_id, company_code);
CREATE INDEX IF NOT EXISTS idx_account_master_is_active ON public.account_master (is_active);
CREATE INDEX IF NOT EXISTS idx_account_master_name ON public.account_master (name);
CREATE INDEX IF NOT EXISTS idx_account_master_type ON public.account_master (type);

CREATE TRIGGER set_timestamp
    BEFORE UPDATE ON public.account_master
    FOR EACH ROW
    EXECUTE FUNCTION public.set_current_timestamp_updated_at();

CREATE TRIGGER inject_tenant_context_on_insert
    BEFORE INSERT ON public.account_master
    FOR EACH ROW
    EXECUTE FUNCTION public.inject_tenant_context_on_insert();

ALTER TABLE public.account_master DISABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.account_master TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE public.account_master_id_seq TO anon, authenticated, service_role;

COMMIT;
