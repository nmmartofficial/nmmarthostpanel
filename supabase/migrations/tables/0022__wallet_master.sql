-- =============================================================================
-- Migration Number: 0022
-- Filename Label: wallet_master
-- Table Name: public.wallet_master
-- Architectural Rules Reference: Standard tenant table with FKs (users, delivery_customer)
--   PK = BIGSERIAL | FK = BIGINT | NO UUID
--   tenant_id BIGINT + company_code VARCHAR(16) mandatory
--   DEV GRANTS: RLS disabled + ALL to anon/authenticated/service_role
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.wallet_master (
    id              BIGSERIAL PRIMARY KEY,
    tenant_id       BIGINT NOT NULL,
    company_code    VARCHAR(16) NOT NULL,
    user_id         BIGINT REFERENCES public.users(id) ON DELETE SET NULL,
    customer_id     BIGINT REFERENCES public.delivery_customer_master(id) ON DELETE SET NULL,
    balance         NUMERIC DEFAULT 0,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallet_master_tenant ON public.wallet_master (tenant_id, company_code);
CREATE INDEX IF NOT EXISTS idx_wallet_master_user_id ON public.wallet_master (user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_master_customer_id ON public.wallet_master (customer_id);
CREATE INDEX IF NOT EXISTS idx_wallet_master_is_active ON public.wallet_master (is_active);

CREATE TRIGGER set_timestamp
    BEFORE UPDATE ON public.wallet_master
    FOR EACH ROW
    EXECUTE FUNCTION public.set_current_timestamp_updated_at();

CREATE TRIGGER inject_tenant_context_on_insert
    BEFORE INSERT ON public.wallet_master
    FOR EACH ROW
    EXECUTE FUNCTION public.inject_tenant_context_on_insert();

ALTER TABLE public.wallet_master DISABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.wallet_master TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE public.wallet_master_id_seq TO anon, authenticated, service_role;

COMMIT;
