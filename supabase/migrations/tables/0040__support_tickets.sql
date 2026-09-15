-- =============================================================================
-- Migration Number: 0040
-- Filename Label: support_tickets
-- Table Name: public.support_tickets
-- Architectural Rules Reference: Standard tenant table with FKs (users, delivery_customer, admin_users)
--   PK = BIGSERIAL | FK = BIGINT | NO UUID
--   tenant_id BIGINT + company_code VARCHAR(16) mandatory
--   DEV GRANTS: RLS disabled + ALL to anon/authenticated/service_role
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.support_tickets (
    id                      BIGSERIAL PRIMARY KEY,
    tenant_id               BIGINT NOT NULL,
    company_code            VARCHAR(16) NOT NULL,
    user_id                 BIGINT REFERENCES public.users(id) ON DELETE SET NULL,
    customer_id             BIGINT REFERENCES public.delivery_customer_master(id) ON DELETE SET NULL,
    subject                 TEXT,
    description             TEXT,
    status                  VARCHAR(20) DEFAULT 'open',
    priority                VARCHAR(10) DEFAULT 'medium',
    assigned_admin_user_id  BIGINT REFERENCES public.admin_users(id) ON DELETE SET NULL,
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_tenant ON public.support_tickets (tenant_id, company_code);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON public.support_tickets (user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_customer_id ON public.support_tickets (customer_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets (status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON public.support_tickets (priority);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_admin ON public.support_tickets (assigned_admin_user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON public.support_tickets (created_at);

CREATE TRIGGER set_timestamp
    BEFORE UPDATE ON public.support_tickets
    FOR EACH ROW
    EXECUTE FUNCTION public.set_current_timestamp_updated_at();

CREATE TRIGGER inject_tenant_context_on_insert
    BEFORE INSERT ON public.support_tickets
    FOR EACH ROW
    EXECUTE FUNCTION public.inject_tenant_context_on_insert();

ALTER TABLE public.support_tickets DISABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.support_tickets TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE public.support_tickets_id_seq TO anon, authenticated, service_role;

COMMIT;
