-- =============================================================================
-- Migration Number: 0036
-- Filename Label: cart
-- Table Name: public.cart
-- Architectural Rules Reference: Standard tenant table with UNIQUE composite key
--   PK = BIGSERIAL | FK = BIGINT | NO UUID
--   tenant_id BIGINT + company_code VARCHAR(16) mandatory
--   UNIQUE(tenant_id, user_id, product_id)
--   DEV GRANTS: RLS disabled + ALL to anon/authenticated/service_role
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.cart (
    id              BIGSERIAL PRIMARY KEY,
    tenant_id       BIGINT NOT NULL,
    company_code    VARCHAR(16) NOT NULL,
    user_id         BIGINT REFERENCES public.users(id) ON DELETE CASCADE,
    product_id      BIGINT REFERENCES public.products(id) ON DELETE CASCADE,
    quantity        NUMERIC DEFAULT 1,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (tenant_id, user_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_cart_tenant ON public.cart (tenant_id, company_code);
CREATE INDEX IF NOT EXISTS idx_cart_user_id ON public.cart (user_id);
CREATE INDEX IF NOT EXISTS idx_cart_product_id ON public.cart (product_id);

CREATE TRIGGER set_timestamp
    BEFORE UPDATE ON public.cart
    FOR EACH ROW
    EXECUTE FUNCTION public.set_current_timestamp_updated_at();

CREATE TRIGGER inject_tenant_context_on_insert
    BEFORE INSERT ON public.cart
    FOR EACH ROW
    EXECUTE FUNCTION public.inject_tenant_context_on_insert();

ALTER TABLE public.cart DISABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.cart TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE public.cart_id_seq TO anon, authenticated, service_role;

COMMIT;
