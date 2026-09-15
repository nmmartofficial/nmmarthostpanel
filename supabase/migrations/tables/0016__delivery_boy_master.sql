-- =============================================================================
-- Migration Number: 0016
-- Filename Label: delivery_boy_master
-- Table Name: public.delivery_boy_master
-- Architectural Rules Reference: Standard tenant table
--   PK = BIGSERIAL | FK = BIGINT | NO UUID
--   tenant_id BIGINT + company_code VARCHAR(16) mandatory
--   DEV GRANTS: RLS disabled + ALL to anon/authenticated/service_role
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.delivery_boy_master (
    id                  BIGSERIAL PRIMARY KEY,
    tenant_id           BIGINT NOT NULL,
    company_code        VARCHAR(16) NOT NULL,
    name                TEXT NOT NULL,
    phone               TEXT,
    email               TEXT,
    address             TEXT,
    vehicle_number      TEXT,
    is_active           BOOLEAN DEFAULT TRUE,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_delivery_boy_master_tenant ON public.delivery_boy_master (tenant_id, company_code);
CREATE INDEX IF NOT EXISTS idx_delivery_boy_master_is_active ON public.delivery_boy_master (is_active);
CREATE INDEX IF NOT EXISTS idx_delivery_boy_master_name ON public.delivery_boy_master (name);
CREATE INDEX IF NOT EXISTS idx_delivery_boy_master_phone ON public.delivery_boy_master (phone);

CREATE TRIGGER set_timestamp
    BEFORE UPDATE ON public.delivery_boy_master
    FOR EACH ROW
    EXECUTE FUNCTION public.set_current_timestamp_updated_at();

CREATE TRIGGER inject_tenant_context_on_insert
    BEFORE INSERT ON public.delivery_boy_master
    FOR EACH ROW
    EXECUTE FUNCTION public.inject_tenant_context_on_insert();

ALTER TABLE public.delivery_boy_master DISABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.delivery_boy_master TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE public.delivery_boy_master_id_seq TO anon, authenticated, service_role;

COMMIT;
