-- =============================================================================
-- Migration Number: 0030
-- Filename Label: offers_master
-- Table Name: public.offers_master
-- Architectural Rules Reference: Standard tenant table
--   PK = BIGSERIAL | FK = BIGINT | NO UUID
--   tenant_id BIGINT + company_code VARCHAR(16) mandatory
--   DEV GRANTS: RLS disabled + ALL to anon/authenticated/service_role
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.offers_master (
    id                  BIGSERIAL PRIMARY KEY,
    tenant_id           BIGINT NOT NULL,
    company_code        VARCHAR(16) NOT NULL,
    title               TEXT,
    description         TEXT,
    offer_type          VARCHAR(20),
    discount_value      NUMERIC DEFAULT 0,
    min_order_amount    NUMERIC DEFAULT 0,
    valid_from          TIMESTAMPTZ,
    valid_to            TIMESTAMPTZ,
    is_active           BOOLEAN DEFAULT TRUE,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_offers_master_tenant ON public.offers_master (tenant_id, company_code);
CREATE INDEX IF NOT EXISTS idx_offers_master_is_active ON public.offers_master (is_active);
CREATE INDEX IF NOT EXISTS idx_offers_master_offer_type ON public.offers_master (offer_type);
CREATE INDEX IF NOT EXISTS idx_offers_master_validity ON public.offers_master (valid_from, valid_to);
CREATE INDEX IF NOT EXISTS idx_offers_master_title ON public.offers_master (title);

CREATE TRIGGER set_timestamp
    BEFORE UPDATE ON public.offers_master
    FOR EACH ROW
    EXECUTE FUNCTION public.set_current_timestamp_updated_at();

CREATE TRIGGER inject_tenant_context_on_insert
    BEFORE INSERT ON public.offers_master
    FOR EACH ROW
    EXECUTE FUNCTION public.inject_tenant_context_on_insert();

ALTER TABLE public.offers_master DISABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.offers_master TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE public.offers_master_id_seq TO anon, authenticated, service_role;

COMMIT;
