-- =============================================================================
-- Migration Number: 0010
-- Filename Label: hsn_master
-- Table Name: public.hsn_master
-- Architectural Rules Reference: Standard tenant table with unique hsn_code
--   PK = BIGSERIAL | FK = BIGINT | NO UUID
--   tenant_id BIGINT + company_code VARCHAR(16) mandatory
--   DEV GRANTS: RLS disabled + ALL to anon/authenticated/service_role
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.hsn_master (
    id                  BIGSERIAL PRIMARY KEY,
    tenant_id           BIGINT NOT NULL,
    company_code        VARCHAR(16) NOT NULL,
    hsn_code            TEXT NOT NULL,
    hsn_description     TEXT,
    gst_rate            NUMERIC DEFAULT 0,
    cess_rate           NUMERIC DEFAULT 0,
    is_active           BOOLEAN DEFAULT TRUE,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (tenant_id, company_code, hsn_code)
);

CREATE INDEX IF NOT EXISTS idx_hsn_master_tenant ON public.hsn_master (tenant_id, company_code);
CREATE INDEX IF NOT EXISTS idx_hsn_master_is_active ON public.hsn_master (is_active);
CREATE INDEX IF NOT EXISTS idx_hsn_master_hsn_code ON public.hsn_master (hsn_code);

CREATE TRIGGER set_timestamp
    BEFORE UPDATE ON public.hsn_master
    FOR EACH ROW
    EXECUTE FUNCTION public.set_current_timestamp_updated_at();

CREATE TRIGGER inject_tenant_context_on_insert
    BEFORE INSERT ON public.hsn_master
    FOR EACH ROW
    EXECUTE FUNCTION public.inject_tenant_context_on_insert();

ALTER TABLE public.hsn_master DISABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.hsn_master TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE public.hsn_master_id_seq TO anon, authenticated, service_role;

COMMIT;
