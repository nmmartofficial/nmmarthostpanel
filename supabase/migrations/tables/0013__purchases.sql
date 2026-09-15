-- =============================================================================
-- Migration Number: 0013
-- Filename Label: purchases
-- Table Name: public.purchases
-- Architectural Rules Reference: Standard tenant table with FK to suppliers
--   PK = BIGSERIAL | FK = BIGINT | NO UUID
--   tenant_id BIGINT + company_code VARCHAR(16) mandatory
--   DEV GRANTS: RLS disabled + ALL to anon/authenticated/service_role
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.purchases (
    id                  BIGSERIAL PRIMARY KEY,
    tenant_id           BIGINT NOT NULL,
    company_code        VARCHAR(16) NOT NULL,
    supplier_id         BIGINT REFERENCES public.suppliers(id) ON DELETE SET NULL,
    invoice_number      TEXT,
    invoice_date        DATE,
    total_amount        NUMERIC DEFAULT 0,
    paid_amount         NUMERIC DEFAULT 0,
    payment_status      VARCHAR(20) DEFAULT 'unpaid',
    status              VARCHAR(20) DEFAULT 'pending',
    notes               TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_purchases_tenant ON public.purchases (tenant_id, company_code);
CREATE INDEX IF NOT EXISTS idx_purchases_supplier_id ON public.purchases (supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchases_invoice_number ON public.purchases (invoice_number);
CREATE INDEX IF NOT EXISTS idx_purchases_status ON public.purchases (status);
CREATE INDEX IF NOT EXISTS idx_purchases_payment_status ON public.purchases (payment_status);
CREATE INDEX IF NOT EXISTS idx_purchases_invoice_date ON public.purchases (invoice_date);

CREATE TRIGGER set_timestamp
    BEFORE UPDATE ON public.purchases
    FOR EACH ROW
    EXECUTE FUNCTION public.set_current_timestamp_updated_at();

CREATE TRIGGER inject_tenant_context_on_insert
    BEFORE INSERT ON public.purchases
    FOR EACH ROW
    EXECUTE FUNCTION public.inject_tenant_context_on_insert();

ALTER TABLE public.purchases DISABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.purchases TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE public.purchases_id_seq TO anon, authenticated, service_role;

COMMIT;
