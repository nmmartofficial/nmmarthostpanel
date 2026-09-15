-- =============================================================================
-- Migration Number: 0011
-- Filename Label: suppliers
-- Table Name: public.suppliers
-- Architectural Rules Reference: Standard tenant table
--   PK = BIGSERIAL | FK = BIGINT | NO UUID
--   tenant_id BIGINT + company_code VARCHAR(16) mandatory
--   DEV GRANTS: RLS disabled + ALL to anon/authenticated/service_role
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.suppliers (
    id              BIGSERIAL PRIMARY KEY,
    tenant_id       BIGINT NOT NULL,
    company_code    VARCHAR(16) NOT NULL,
    name            TEXT NOT NULL,
    phone           TEXT,
    email           TEXT,
    address         TEXT,
    gstin           TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suppliers_tenant ON public.suppliers (tenant_id, company_code);
CREATE INDEX IF NOT EXISTS idx_suppliers_is_active ON public.suppliers (is_active);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON public.suppliers (name);
CREATE INDEX IF NOT EXISTS idx_suppliers_phone ON public.suppliers (phone);

CREATE TRIGGER set_timestamp
    BEFORE UPDATE ON public.suppliers
    FOR EACH ROW
    EXECUTE FUNCTION public.set_current_timestamp_updated_at();

CREATE TRIGGER inject_tenant_context_on_insert
    BEFORE INSERT ON public.suppliers
    FOR EACH ROW
    EXECUTE FUNCTION public.inject_tenant_context_on_insert();

ALTER TABLE public.suppliers DISABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.suppliers TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE public.suppliers_id_seq TO anon, authenticated, service_role;

COMMIT;
