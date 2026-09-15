-- =============================================================================
-- Migration Number: 0005
-- Filename Label: categories
-- Table Name: public.categories
-- Architectural Rules Reference: Standard tenant table
--   PK = BIGSERIAL | FK = BIGINT | NO UUID
--   tenant_id BIGINT + company_code VARCHAR(16) mandatory
--   DEV GRANTS: RLS disabled + ALL to anon/authenticated/service_role
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.categories (
    id              BIGSERIAL PRIMARY KEY,
    tenant_id       BIGINT NOT NULL,
    company_code    VARCHAR(16) NOT NULL,
    name            TEXT NOT NULL,
    description     TEXT,
    image_url       TEXT,
    sort_order      INT DEFAULT 0,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categories_tenant ON public.categories (tenant_id, company_code);
CREATE INDEX IF NOT EXISTS idx_categories_is_active ON public.categories (is_active);
CREATE INDEX IF NOT EXISTS idx_categories_name ON public.categories (name);
CREATE INDEX IF NOT EXISTS idx_categories_sort_order ON public.categories (sort_order);

CREATE TRIGGER set_timestamp
    BEFORE UPDATE ON public.categories
    FOR EACH ROW
    EXECUTE FUNCTION public.set_current_timestamp_updated_at();

CREATE TRIGGER inject_tenant_context_on_insert
    BEFORE INSERT ON public.categories
    FOR EACH ROW
    EXECUTE FUNCTION public.inject_tenant_context_on_insert();

ALTER TABLE public.categories DISABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.categories TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE public.categories_id_seq TO anon, authenticated, service_role;

COMMIT;
