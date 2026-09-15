-- =============================================================================
-- Migration Number: 0038
-- Filename Label: system_logs
-- Table Name: public.system_logs
-- Architectural Rules Reference: GLOBAL table - NO tenant_id, NO updated_at column
--   PK = BIGSERIAL | FK = BIGINT | NO UUID
--   NOTE: No updated_at, no inject_tenant_context trigger (no tenant_id column)
--   DEV GRANTS: RLS disabled + ALL to anon/authenticated/service_role
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.system_logs (
    id              BIGSERIAL PRIMARY KEY,
    table_name      TEXT,
    action_type     VARCHAR(20),
    username        TEXT,
    user_role       TEXT,
    company_code    TEXT,
    old_data        JSONB,
    new_data        JSONB,
    metadata        JSONB,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_logs_table_name ON public.system_logs (table_name);
CREATE INDEX IF NOT EXISTS idx_system_logs_action_type ON public.system_logs (action_type);
CREATE INDEX IF NOT EXISTS idx_system_logs_company_code ON public.system_logs (company_code);
CREATE INDEX IF NOT EXISTS idx_system_logs_username ON public.system_logs (username);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON public.system_logs (created_at);

ALTER TABLE public.system_logs DISABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.system_logs TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE public.system_logs_id_seq TO anon, authenticated, service_role;

COMMIT;
