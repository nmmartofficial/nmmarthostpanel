-- =============================================================================
-- Migration Number: 0019
-- Filename Label: credit_master
-- Table Name: public.credit_master
-- Architectural Rules Reference: Standard tenant table with customer_id FK
--   PK = BIGSERIAL | FK = BIGINT | NO UUID
--   tenant_id BIGINT + company_code VARCHAR(16) mandatory
--   DEV GRANTS: RLS disabled + ALL to anon/authenticated/service_role
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.credit_master (
    id              BIGSERIAL PRIMARY KEY,
    tenant_id       BIGINT NOT NULL,
    company_code    VARCHAR(16) NOT NULL,
    customer_id     BIGINT REFERENCES public.users(id) ON DELETE SET NULL,
    amount          NUMERIC DEFAULT 0,
    type            VARCHAR(10) DEFAULT 'credit',
    reason          TEXT,
    reference_id    BIGINT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_master_tenant ON public.credit_master (tenant_id, company_code);
CREATE INDEX IF NOT EXISTS idx_credit_master_customer_id ON public.credit_master (customer_id);
CREATE INDEX IF NOT EXISTS idx_credit_master_type ON public.credit_master (type);
CREATE INDEX IF NOT EXISTS idx_credit_master_reference_id ON public.credit_master (reference_id);

CREATE TRIGGER set_timestamp
    BEFORE UPDATE ON public.credit_master
    FOR EACH ROW
    EXECUTE FUNCTION public.set_current_timestamp_updated_at();

CREATE TRIGGER inject_tenant_context_on_insert
    BEFORE INSERT ON public.credit_master
    FOR EACH ROW
    EXECUTE FUNCTION public.inject_tenant_context_on_insert();

ALTER TABLE public.credit_master DISABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.credit_master TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE public.credit_master_id_seq TO anon, authenticated, service_role;

COMMIT;
