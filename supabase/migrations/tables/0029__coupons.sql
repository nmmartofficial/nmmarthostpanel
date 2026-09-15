-- =============================================================================
-- Migration Number: 0029
-- Filename Label: coupons
-- Table Name: public.coupons
-- Architectural Rules Reference: Standard tenant table with unique code + CHECK
--   PK = BIGSERIAL | FK = BIGINT | NO UUID
--   tenant_id BIGINT + company_code VARCHAR(16) mandatory
--   CHECK(discount_type IN('percent','fixed'))
--   DEV GRANTS: RLS disabled + ALL to anon/authenticated/service_role
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.coupons (
    id                  BIGSERIAL PRIMARY KEY,
    tenant_id           BIGINT NOT NULL,
    company_code        VARCHAR(16) NOT NULL,
    code                CITEXT UNIQUE NOT NULL,
    title               TEXT,
    description         TEXT,
    discount_type       VARCHAR(15) NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
    discount_value      NUMERIC NOT NULL DEFAULT 0,
    min_order_amount    NUMERIC DEFAULT 0,
    max_discount        NUMERIC,
    valid_from          TIMESTAMPTZ,
    valid_to            TIMESTAMPTZ,
    usage_limit         INT,
    used_count          INT DEFAULT 0,
    is_active           BOOLEAN DEFAULT TRUE,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coupons_tenant ON public.coupons (tenant_id, company_code);
CREATE INDEX IF NOT EXISTS idx_coupons_is_active ON public.coupons (is_active);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON public.coupons (code);
CREATE INDEX IF NOT EXISTS idx_coupons_validity ON public.coupons (valid_from, valid_to);
CREATE INDEX IF NOT EXISTS idx_coupons_discount_type ON public.coupons (discount_type);

CREATE TRIGGER set_timestamp
    BEFORE UPDATE ON public.coupons
    FOR EACH ROW
    EXECUTE FUNCTION public.set_current_timestamp_updated_at();

CREATE TRIGGER inject_tenant_context_on_insert
    BEFORE INSERT ON public.coupons
    FOR EACH ROW
    EXECUTE FUNCTION public.inject_tenant_context_on_insert();

ALTER TABLE public.coupons DISABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.coupons TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE public.coupons_id_seq TO anon, authenticated, service_role;

COMMIT;
