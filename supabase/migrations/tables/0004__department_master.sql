-- =============================================================================
-- Migration Number: 0004
-- Filename Label: department_master
-- Table Name: public.department_master
-- Architectural Rules Reference: Standard tenant table
--   PK = BIGSERIAL | FK = BIGINT | NO UUID
--   tenant_id BIGINT + company_code VARCHAR(16) mandatory
--   DEV GRANTS: RLS disabled + ALL to anon/authenticated/service_role
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.department_master (
    id              BIGSERIAL PRIMARY KEY,
    tenant_id       BIGINT NOT NULL,
    company_code    VARCHAR(16) NOT NULL,
    name            TEXT NOT NULL,
    description     TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_department_master_tenant ON public.department_master (tenant_id, company_code);
CREATE INDEX IF NOT EXISTS idx_department_master_is_active ON public.department_master (is_active);
CREATE INDEX IF NOT EXISTS idx_department_master_name ON public.department_master (name);

CREATE TRIGGER set_timestamp
    BEFORE UPDATE ON public.department_master
    FOR EACH ROW
    EXECUTE FUNCTION public.set_current_timestamp_updated_at();

CREATE TRIGGER inject_tenant_context_on_insert
    BEFORE INSERT ON public.department_master
    FOR EACH ROW
    EXECUTE FUNCTION public.inject_tenant_context_on_insert();

ALTER TABLE public.department_master DISABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.department_master TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE public.department_master_id_seq TO anon, authenticated, service_role;

COMMIT;
