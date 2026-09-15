-- =============================================================================
-- Migration Number: 0039
-- Filename Label: notifications
-- Table Name: public.notifications
-- Architectural Rules Reference: Standard tenant table with user_id FK
--   PK = BIGSERIAL | FK = BIGINT | NO UUID
--   tenant_id BIGINT + company_code VARCHAR(16) mandatory
--   DEV GRANTS: RLS disabled + ALL to anon/authenticated/service_role
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.notifications (
    id              BIGSERIAL PRIMARY KEY,
    tenant_id       BIGINT NOT NULL,
    company_code    VARCHAR(16) NOT NULL,
    title           TEXT,
    message         TEXT,
    type            VARCHAR(20),
    reference_id    BIGINT,
    user_id         BIGINT REFERENCES public.users(id) ON DELETE SET NULL,
    is_read         BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_tenant ON public.notifications (tenant_id, company_code);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications (is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications (type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications (created_at);

CREATE TRIGGER set_timestamp
    BEFORE UPDATE ON public.notifications
    FOR EACH ROW
    EXECUTE FUNCTION public.set_current_timestamp_updated_at();

CREATE TRIGGER inject_tenant_context_on_insert
    BEFORE INSERT ON public.notifications
    FOR EACH ROW
    EXECUTE FUNCTION public.inject_tenant_context_on_insert();

ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.notifications TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE public.notifications_id_seq TO anon, authenticated, service_role;

COMMIT;
