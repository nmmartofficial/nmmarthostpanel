-- =============================================================================
-- Migration Number: 0034
-- Filename Label: loyalty_transactions
-- Table Name: public.loyalty_transactions
-- Architectural Rules Reference: Standard tenant table with FKs
--   PK = BIGSERIAL | FK = BIGINT | NO UUID
--   tenant_id BIGINT + company_code VARCHAR(16) mandatory
--   DEV GRANTS: RLS disabled + ALL to anon/authenticated/service_role
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.loyalty_transactions (
    id                  BIGSERIAL PRIMARY KEY,
    tenant_id           BIGINT NOT NULL,
    company_code        VARCHAR(16) NOT NULL,
    loyalty_point_id    BIGINT REFERENCES public.customer_loyalty(id) ON DELETE CASCADE,
    user_id             BIGINT REFERENCES public.users(id) ON DELETE SET NULL,
    points              NUMERIC DEFAULT 0,
    type                VARCHAR(10),
    reason              TEXT,
    reference_id        BIGINT,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_tenant ON public.loyalty_transactions (tenant_id, company_code);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_loyalty_point_id ON public.loyalty_transactions (loyalty_point_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_user_id ON public.loyalty_transactions (user_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_type ON public.loyalty_transactions (type);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_reference_id ON public.loyalty_transactions (reference_id);

CREATE TRIGGER set_timestamp
    BEFORE UPDATE ON public.loyalty_transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.set_current_timestamp_updated_at();

CREATE TRIGGER inject_tenant_context_on_insert
    BEFORE INSERT ON public.loyalty_transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.inject_tenant_context_on_insert();

ALTER TABLE public.loyalty_transactions DISABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.loyalty_transactions TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE public.loyalty_transactions_id_seq TO anon, authenticated, service_role;

COMMIT;
