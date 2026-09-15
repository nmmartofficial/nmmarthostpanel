BEGIN;

-- ============================================================
-- 3 MISSING TABLES: system_logs, notifications, support_tickets
-- ============================================================

-- 1. system_logs (Audit Trail)
CREATE TABLE IF NOT EXISTS public.system_logs (
  id              BIGSERIAL PRIMARY KEY,
  table_name      VARCHAR(60) NOT NULL,
  action_type     VARCHAR(10) NOT NULL,
  record_id       BIGINT,
  admin_user_id   BIGINT,
  username        VARCHAR(80),
  user_role       VARCHAR(30),
  company_code    VARCHAR(16) NOT NULL,
  old_data        JSONB DEFAULT '{}'::jsonb,
  new_data        JSONB DEFAULT '{}'::jsonb,
  metadata        JSONB DEFAULT '{}'::jsonb,
  affected_rows   INTEGER DEFAULT 0,
  status          VARCHAR(20) DEFAULT 'success',
  error_message   TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_syslogs_code   ON public.system_logs (company_code, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_syslogs_table  ON public.system_logs (company_code, table_name);
CREATE INDEX IF NOT EXISTS idx_syslogs_action ON public.system_logs (company_code, action_type);

-- 2. notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id               BIGSERIAL PRIMARY KEY,
  tenant_id        BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  company_code     VARCHAR(16) NOT NULL,
  user_id          BIGINT REFERENCES public.users(id) ON DELETE CASCADE,
  title            VARCHAR(200) NOT NULL,
  message          TEXT,
  type             VARCHAR(30) DEFAULT 'system',
  image_url        TEXT,
  reference_id     BIGINT,
  deep_link        TEXT,
  is_read          BOOLEAN DEFAULT FALSE,
  sent_at          TIMESTAMPTZ,
  delivery_status  VARCHAR(20) DEFAULT 'pending',
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notif_tenant ON public.notifications (tenant_id, company_code);
CREATE INDEX IF NOT EXISTS idx_notif_user   ON public.notifications (user_id, is_read);

-- 3. support_tickets
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id                      BIGSERIAL PRIMARY KEY,
  tenant_id               BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  company_code            VARCHAR(16) NOT NULL,
  ticket_number           VARCHAR(20),
  user_id                 BIGINT REFERENCES public.users(id) ON DELETE SET NULL,
  customer_id             BIGINT,
  subject                 VARCHAR(200) NOT NULL,
  description             TEXT,
  category                VARCHAR(30) DEFAULT 'app',
  status                  VARCHAR(20) DEFAULT 'open',
  priority                VARCHAR(10) DEFAULT 'medium',
  assigned_admin_user_id  BIGINT,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tickets_tenant ON public.support_tickets (tenant_id, company_code);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.support_tickets (tenant_id, status);

COMMIT;
