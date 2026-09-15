-- =============================================================================
-- Migration Number: 0003
-- Filename Label: unit_master
-- Table Name: public.unit_master
-- Architectural Rules Reference: Standard tenant table
--   PK = BIGSERIAL | FK = BIGINT | NO UUID
--   tenant_id BIGINT + company_code VARCHAR(16) mandatory
--   DEV GRANTS: RLS disabled + ALL to anon/authenticated/service_role
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.unit_master (
    id              BIGSERIAL PRIMARY KEY,
    tenant_id       BIGINT NOT NULL,
    company_code    VARCHAR(16) NOT NULL,
    name            TEXT NOT NULL,
    symbol          TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_unit_master_tenant ON public.unit_master (tenant_id, company_code);
CREATE INDEX IF NOT EXISTS idx_unit_master_is_active ON public.unit_master (is_active);
CREATE INDEX IF NOT EXISTS idx_unit_master_name ON public.unit_master (name);

CREATE TRIGGER set_timestamp
    BEFORE UPDATE ON public.unit_master
    FOR EACH ROW
    EXECUTE FUNCTION public.set_current_timestamp_updated_at();

CREATE TRIGGER inject_tenant_context_on_insert
    BEFORE INSERT ON public.unit_master
    FOR EACH ROW
    EXECUTE FUNCTION public.inject_tenant_context_on_insert();

ALTER TABLE public.unit_master DISABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.unit_master TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE public.unit_master_id_seq TO anon, authenticated, service_role;

COMMIT;
