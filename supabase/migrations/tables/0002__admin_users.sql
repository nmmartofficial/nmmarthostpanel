-- =============================================================================
-- Migration Number: 0002
-- Filename Label: admin_users
-- Table Name: public.admin_users
-- Architectural Rules Reference: Tenant table + ONLY UUID column allowed (auth_user_id)
--   PK = BIGSERIAL | FK = BIGINT | UUID ONLY for auth_user_id
--   tenant_id BIGINT + company_code VARCHAR(16) mandatory
--   DEV GRANTS: RLS disabled + ALL to anon/authenticated/service_role
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.admin_users (
    id              BIGSERIAL PRIMARY KEY,
    tenant_id       BIGINT NOT NULL,
    company_code    VARCHAR(16) NOT NULL,
    username        CITEXT UNIQUE NOT NULL,
    email           CITEXT UNIQUE NOT NULL,
    password_hash   TEXT NOT NULL,
    role            VARCHAR(20) DEFAULT 'admin',
    auth_user_id    UUID,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_users_tenant ON public.admin_users (tenant_id, company_code);
CREATE INDEX IF NOT EXISTS idx_admin_users_is_active ON public.admin_users (is_active);
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON public.admin_users (role);
CREATE INDEX IF NOT EXISTS idx_admin_users_username ON public.admin_users (username);
CREATE INDEX IF NOT EXISTS idx_admin_users_auth_user_id ON public.admin_users (auth_user_id);

CREATE TRIGGER set_timestamp
    BEFORE UPDATE ON public.admin_users
    FOR EACH ROW
    EXECUTE FUNCTION public.set_current_timestamp_updated_at();

CREATE TRIGGER inject_tenant_context_on_insert
    BEFORE INSERT ON public.admin_users
    FOR EACH ROW
    EXECUTE FUNCTION public.inject_tenant_context_on_insert();

ALTER TABLE public.admin_users DISABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.admin_users TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE public.admin_users_id_seq TO anon, authenticated, service_role;

COMMIT;
