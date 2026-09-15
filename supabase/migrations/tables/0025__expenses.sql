-- =============================================================================
-- Migration Number: 0025
-- Filename Label: expenses
-- Table Name: public.expenses
-- Architectural Rules Reference: Standard tenant table with FK to expense_categories
--   PK = BIGSERIAL | FK = BIGINT | NO UUID
--   tenant_id BIGINT + company_code VARCHAR(16) mandatory
--   DEV GRANTS: RLS disabled + ALL to anon/authenticated/service_role
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.expenses (
    id                      BIGSERIAL PRIMARY KEY,
    tenant_id               BIGINT NOT NULL,
    company_code            VARCHAR(16) NOT NULL,
    expense_category_id     BIGINT REFERENCES public.expense_categories(id) ON DELETE SET NULL,
    amount                  NUMERIC NOT NULL DEFAULT 0,
    description             TEXT,
    date                    DATE,
    receipt_url             TEXT,
    is_active               BOOLEAN DEFAULT TRUE,
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_tenant ON public.expenses (tenant_id, company_code);
CREATE INDEX IF NOT EXISTS idx_expenses_expense_category_id ON public.expenses (expense_category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_is_active ON public.expenses (is_active);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses (date);

CREATE TRIGGER set_timestamp
    BEFORE UPDATE ON public.expenses
    FOR EACH ROW
    EXECUTE FUNCTION public.set_current_timestamp_updated_at();

CREATE TRIGGER inject_tenant_context_on_insert
    BEFORE INSERT ON public.expenses
    FOR EACH ROW
    EXECUTE FUNCTION public.inject_tenant_context_on_insert();

ALTER TABLE public.expenses DISABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.expenses TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE public.expenses_id_seq TO anon, authenticated, service_role;

COMMIT;
