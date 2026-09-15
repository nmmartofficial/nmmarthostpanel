-- =============================================================================
-- Migration Number: 0001
-- Filename Label: companies
-- Table Name: public.companies
-- Architectural Rules Reference: GLOBAL table - skip tenant_id, keep company_code + company_slug
--   PK = BIGSERIAL | FK = BIGINT | NO UUID (except admin_users.auth_user_id)
--   DEV GRANTS: RLS disabled + ALL to anon/authenticated/service_role
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.companies (
    id                  BIGSERIAL PRIMARY KEY,
    company_code        VARCHAR(16) UNIQUE NOT NULL,
    company_slug        VARCHAR(32) NOT NULL,
    name                TEXT NOT NULL,
    address             TEXT,
    phone               TEXT,
    email               CITEXT UNIQUE,
    gstin               TEXT,
    logo_url            TEXT,
    is_active           BOOLEAN DEFAULT TRUE,
    subscription_plan   VARCHAR(30) DEFAULT 'free',
    subscription_end    TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_companies_company_code ON public.companies (company_code);
CREATE INDEX IF NOT EXISTS idx_companies_company_slug ON public.companies (company_slug);
CREATE INDEX IF NOT EXISTS idx_companies_is_active ON public.companies (is_active);
CREATE INDEX IF NOT EXISTS idx_companies_email ON public.companies (email);
CREATE INDEX IF NOT EXISTS idx_companies_subscription ON public.companies (subscription_plan, subscription_end);

CREATE TRIGGER set_timestamp
    BEFORE UPDATE ON public.companies
    FOR EACH ROW
    EXECUTE FUNCTION public.set_current_timestamp_updated_at();

ALTER TABLE public.companies DISABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.companies TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE public.companies_id_seq TO anon, authenticated, service_role;

COMMIT;
