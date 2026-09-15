-- =============================================================================
-- Migration Number: 0006
-- Filename Label: subcategories
-- Table Name: public.subcategories
-- Architectural Rules Reference: Standard tenant table with FK to categories
--   PK = BIGSERIAL | FK = BIGINT | NO UUID
--   tenant_id BIGINT + company_code VARCHAR(16) mandatory
--   DEV GRANTS: RLS disabled + ALL to anon/authenticated/service_role
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.subcategories (
    id              BIGSERIAL PRIMARY KEY,
    tenant_id       BIGINT NOT NULL,
    company_code    VARCHAR(16) NOT NULL,
    category_id     BIGINT REFERENCES public.categories(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    description     TEXT,
    image_url       TEXT,
    sort_order      INT DEFAULT 0,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subcategories_tenant ON public.subcategories (tenant_id, company_code);
CREATE INDEX IF NOT EXISTS idx_subcategories_is_active ON public.subcategories (is_active);
CREATE INDEX IF NOT EXISTS idx_subcategories_category_id ON public.subcategories (category_id);
CREATE INDEX IF NOT EXISTS idx_subcategories_name ON public.subcategories (name);
CREATE INDEX IF NOT EXISTS idx_subcategories_sort_order ON public.subcategories (sort_order);

CREATE TRIGGER set_timestamp
    BEFORE UPDATE ON public.subcategories
    FOR EACH ROW
    EXECUTE FUNCTION public.set_current_timestamp_updated_at();

CREATE TRIGGER inject_tenant_context_on_insert
    BEFORE INSERT ON public.subcategories
    FOR EACH ROW
    EXECUTE FUNCTION public.inject_tenant_context_on_insert();

ALTER TABLE public.subcategories DISABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.subcategories TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE public.subcategories_id_seq TO anon, authenticated, service_role;

COMMIT;
