-- =============================================================================
-- Migration Number: 0037
-- Filename Label: wishlist
-- Table Name: public.wishlist
-- Architectural Rules Reference: Standard tenant table with UNIQUE composite key
--   PK = BIGSERIAL | FK = BIGINT | NO UUID
--   tenant_id BIGINT + company_code VARCHAR(16) mandatory
--   UNIQUE(tenant_id, user_id, product_id)
--   DEV GRANTS: RLS disabled + ALL to anon/authenticated/service_role
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.wishlist (
    id              BIGSERIAL PRIMARY KEY,
    tenant_id       BIGINT NOT NULL,
    company_code    VARCHAR(16) NOT NULL,
    user_id         BIGINT REFERENCES public.users(id) ON DELETE CASCADE,
    product_id      BIGINT REFERENCES public.products(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (tenant_id, user_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_wishlist_tenant ON public.wishlist (tenant_id, company_code);
CREATE INDEX IF NOT EXISTS idx_wishlist_user_id ON public.wishlist (user_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_product_id ON public.wishlist (product_id);

CREATE TRIGGER set_timestamp
    BEFORE UPDATE ON public.wishlist
    FOR EACH ROW
    EXECUTE FUNCTION public.set_current_timestamp_updated_at();

CREATE TRIGGER inject_tenant_context_on_insert
    BEFORE INSERT ON public.wishlist
    FOR EACH ROW
    EXECUTE FUNCTION public.inject_tenant_context_on_insert();

ALTER TABLE public.wishlist DISABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.wishlist TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE public.wishlist_id_seq TO anon, authenticated, service_role;

COMMIT;
