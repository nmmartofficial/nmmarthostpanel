-- =============================================================================
-- Migration Number: 0024
-- Filename Label: expense_categories
-- Table Name: public.expense_categories
-- Architectural Rules Reference: Standard tenant table
--   PK = BIGSERIAL | FK = BIGINT | NO UUID
--   tenant_id BIGINT + company_code VARCHAR(16) mandatory
--   DEV GRANTS: RLS disabled + ALL to anon/authenticated/service_role
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.expense_categories (
    id              BIGSERIAL PRIMARY KEY,
    tenant_id       BIGINT NOT NULL,
    company_code    VARCHAR(16) NOT NULL,
    name            TEXT NOT NULL,
    description     TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expense_categories_tenant ON public.expense_categories (tenant_id, company_code);
CREATE INDEX IF NOT EXISTS idx_expense_categories_is_active ON public.expense_categories (is_active);
CREATE INDEX IF NOT EXISTS idx_expense_categories_name ON public.expense_categories (name);

CREATE TRIGGER set_timestamp
    BEFORE UPDATE ON public.expense_categories
    FOR EACH ROW
    EXECUTE FUNCTION public.set_current_timestamp_updated_at();

CREATE TRIGGER inject_tenant_context_on_insert
    BEFORE INSERT ON public.expense_categories
    FOR EACH ROW
    EXECUTE FUNCTION public.inject_tenant_context_on_insert();

ALTER TABLE public.expense_categories DISABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.expense_categories TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE public.expense_categories_id_seq TO anon, authenticated, service_role;

COMMIT;
