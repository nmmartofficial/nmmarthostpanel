-- =============================================================================
-- Migration Number: 0023
-- Filename Label: wallet_transactions
-- Table Name: public.wallet_transactions
-- Architectural Rules Reference: Standard tenant table with FKs, CHECK constraint
--   PK = BIGSERIAL | FK = BIGINT | NO UUID
--   tenant_id BIGINT + company_code VARCHAR(16) mandatory
--   CHECK(type IN('credit','debit'))
--   DEV GRANTS: RLS disabled + ALL to anon/authenticated/service_role
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.wallet_transactions (
    id              BIGSERIAL PRIMARY KEY,
    tenant_id       BIGINT NOT NULL,
    company_code    VARCHAR(16) NOT NULL,
    wallet_id       BIGINT REFERENCES public.wallet_master(id) ON DELETE CASCADE,
    user_id         BIGINT REFERENCES public.users(id) ON DELETE SET NULL,
    amount          NUMERIC NOT NULL DEFAULT 0,
    type            VARCHAR(10) NOT NULL CHECK (type IN ('credit', 'debit')),
    reason          TEXT,
    reference_id    BIGINT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_tenant ON public.wallet_transactions (tenant_id, company_code);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet_id ON public.wallet_transactions (wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id ON public.wallet_transactions (user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_type ON public.wallet_transactions (type);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_reference_id ON public.wallet_transactions (reference_id);

CREATE TRIGGER set_timestamp
    BEFORE UPDATE ON public.wallet_transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.set_current_timestamp_updated_at();

CREATE TRIGGER inject_tenant_context_on_insert
    BEFORE INSERT ON public.wallet_transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.inject_tenant_context_on_insert();

ALTER TABLE public.wallet_transactions DISABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.wallet_transactions TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE public.wallet_transactions_id_seq TO anon, authenticated, service_role;

COMMIT;
