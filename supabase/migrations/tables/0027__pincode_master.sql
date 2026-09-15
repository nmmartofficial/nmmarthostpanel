-- =============================================================================
-- Migration Number: 0027
-- Filename Label: pincode_master
-- Table Name: public.pincode_master
-- Architectural Rules Reference: Standard tenant table
--   PK = BIGSERIAL | FK = BIGINT | NO UUID
--   tenant_id BIGINT + company_code VARCHAR(16) mandatory
--   DEV GRANTS: RLS disabled + ALL to anon/authenticated/service_role
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.pincode_master (
    id                  BIGSERIAL PRIMARY KEY,
    tenant_id           BIGINT NOT NULL,
    company_code        VARCHAR(16) NOT NULL,
    pincode             TEXT,
    city                TEXT,
    state               TEXT,
    is_serviceable      BOOLEAN DEFAULT TRUE,
    delivery_charge     NUMERIC DEFAULT 0,
    is_active           BOOLEAN DEFAULT TRUE,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pincode_master_tenant ON public.pincode_master (tenant_id, company_code);
CREATE INDEX IF NOT EXISTS idx_pincode_master_is_active ON public.pincode_master (is_active);
CREATE INDEX IF NOT EXISTS idx_pincode_master_pincode ON public.pincode_master (pincode);
CREATE INDEX IF NOT EXISTS idx_pincode_master_city ON public.pincode_master (city);
CREATE INDEX IF NOT EXISTS idx_pincode_master_is_serviceable ON public.pincode_master (is_serviceable);

CREATE TRIGGER set_timestamp
    BEFORE UPDATE ON public.pincode_master
    FOR EACH ROW
    EXECUTE FUNCTION public.set_current_timestamp_updated_at();

CREATE TRIGGER inject_tenant_context_on_insert
    BEFORE INSERT ON public.pincode_master
    FOR EACH ROW
    EXECUTE FUNCTION public.inject_tenant_context_on_insert();

ALTER TABLE public.pincode_master DISABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.pincode_master TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE public.pincode_master_id_seq TO anon, authenticated, service_role;

COMMIT;
