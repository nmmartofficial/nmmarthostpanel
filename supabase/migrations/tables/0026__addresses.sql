-- =============================================================================
-- Migration Number: 0026
-- Filename Label: addresses
-- Table Name: public.addresses
-- Architectural Rules Reference: Standard tenant table with FK to users
--   PK = BIGSERIAL | FK = BIGINT | NO UUID
--   tenant_id BIGINT + company_code VARCHAR(16) mandatory
--   DEV GRANTS: RLS disabled + ALL to anon/authenticated/service_role
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.addresses (
    id              BIGSERIAL PRIMARY KEY,
    tenant_id       BIGINT NOT NULL,
    company_code    VARCHAR(16) NOT NULL,
    user_id         BIGINT REFERENCES public.users(id) ON DELETE CASCADE,
    name            TEXT,
    phone           TEXT,
    address_line1   TEXT,
    address_line2   TEXT,
    city            TEXT,
    state           TEXT,
    pincode         TEXT,
    is_default      BOOLEAN DEFAULT FALSE,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_addresses_tenant ON public.addresses (tenant_id, company_code);
CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON public.addresses (user_id);
CREATE INDEX IF NOT EXISTS idx_addresses_is_active ON public.addresses (is_active);
CREATE INDEX IF NOT EXISTS idx_addresses_is_default ON public.addresses (is_default);
CREATE INDEX IF NOT EXISTS idx_addresses_pincode ON public.addresses (pincode);

CREATE TRIGGER set_timestamp
    BEFORE UPDATE ON public.addresses
    FOR EACH ROW
    EXECUTE FUNCTION public.set_current_timestamp_updated_at();

CREATE TRIGGER inject_tenant_context_on_insert
    BEFORE INSERT ON public.addresses
    FOR EACH ROW
    EXECUTE FUNCTION public.inject_tenant_context_on_insert();

ALTER TABLE public.addresses DISABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.addresses TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE public.addresses_id_seq TO anon, authenticated, service_role;

COMMIT;
