-- =============================================================================
-- Migration Number: 0028
-- Filename Label: banners
-- Table Name: public.banners
-- Architectural Rules Reference: Standard tenant table
--   PK = BIGSERIAL | FK = BIGINT | NO UUID
--   tenant_id BIGINT + company_code VARCHAR(16) mandatory
--   DEV GRANTS: RLS disabled + ALL to anon/authenticated/service_role
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.banners (
    id              BIGSERIAL PRIMARY KEY,
    tenant_id       BIGINT NOT NULL,
    company_code    VARCHAR(16) NOT NULL,
    title           TEXT,
    description     TEXT,
    image_url       TEXT,
    link_url        TEXT,
    sort_order      INT DEFAULT 0,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_banners_tenant ON public.banners (tenant_id, company_code);
CREATE INDEX IF NOT EXISTS idx_banners_is_active ON public.banners (is_active);
CREATE INDEX IF NOT EXISTS idx_banners_sort_order ON public.banners (sort_order);
CREATE INDEX IF NOT EXISTS idx_banners_title ON public.banners (title);

CREATE TRIGGER set_timestamp
    BEFORE UPDATE ON public.banners
    FOR EACH ROW
    EXECUTE FUNCTION public.set_current_timestamp_updated_at();

CREATE TRIGGER inject_tenant_context_on_insert
    BEFORE INSERT ON public.banners
    FOR EACH ROW
    EXECUTE FUNCTION public.inject_tenant_context_on_insert();

ALTER TABLE public.banners DISABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.banners TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE public.banners_id_seq TO anon, authenticated, service_role;

COMMIT;
