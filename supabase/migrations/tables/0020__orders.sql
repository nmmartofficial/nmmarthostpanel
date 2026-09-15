-- =============================================================================
-- Migration Number: 0020
-- Filename Label: orders
-- Table Name: public.orders
-- Architectural Rules Reference: Standard tenant table with FKs (users, delivery_boy)
--   PK = BIGSERIAL | FK = BIGINT | NO UUID
--   tenant_id BIGINT + company_code VARCHAR(16) mandatory
--   DEV GRANTS: RLS disabled + ALL to anon/authenticated/service_role
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.orders (
    id                      BIGSERIAL PRIMARY KEY,
    tenant_id               BIGINT NOT NULL,
    company_code            VARCHAR(16) NOT NULL,
    order_number            TEXT UNIQUE NOT NULL,
    user_id                 BIGINT REFERENCES public.users(id) ON DELETE SET NULL,
    customer_name           TEXT,
    user_mobile             TEXT,
    delivery_address        TEXT,
    pincode                 TEXT,
    subtotal                NUMERIC DEFAULT 0,
    discount                NUMERIC DEFAULT 0,
    delivery_charge         NUMERIC DEFAULT 0,
    total_amount            NUMERIC DEFAULT 0,
    payment_method          VARCHAR(30),
    payment_status          VARCHAR(20) DEFAULT 'pending',
    order_status            VARCHAR(30) DEFAULT 'pending',
    delivery_boy_id         BIGINT REFERENCES public.delivery_boy_master(id) ON DELETE SET NULL,
    notes                   TEXT,
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_tenant ON public.orders (tenant_id, company_code);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders (user_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders (order_number);
CREATE INDEX IF NOT EXISTS idx_orders_order_status ON public.orders (order_status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders (payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_boy_id ON public.orders (delivery_boy_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders (created_at);

CREATE TRIGGER set_timestamp
    BEFORE UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.set_current_timestamp_updated_at();

CREATE TRIGGER inject_tenant_context_on_insert
    BEFORE INSERT ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.inject_tenant_context_on_insert();

ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.orders TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE public.orders_id_seq TO anon, authenticated, service_role;

COMMIT;
