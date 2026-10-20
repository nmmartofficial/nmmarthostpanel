BEGIN;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS total_gst NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gst_pricing_mode TEXT,
  ADD COLUMN IF NOT EXISTS round_off NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS coupon_id BIGINT,
  ADD COLUMN IF NOT EXISTS coupon_discount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS offer_id BIGINT,
  ADD COLUMN IF NOT EXISTS offer_discount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS manual_discount_type TEXT,
  ADD COLUMN IF NOT EXISTS manual_discount_value NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS points_discount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cashier_admin_user_id BIGINT,
  ADD COLUMN IF NOT EXISTS tenant_id UUID,
  ADD COLUMN IF NOT EXISTS company_code TEXT;

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hsn_code_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS tenant_id UUID,
  ADD COLUMN IF NOT EXISTS company_code TEXT;

CREATE TABLE IF NOT EXISTS public.pos_override_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID NOT NULL REFERENCES auth.users(id),
  admin_user_id BIGINT NOT NULL REFERENCES public.admin_users(id),
  tenant_id UUID NOT NULL,
  company_code TEXT NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN (
    'price_override',
    'high_discount_pct',
    'high_discount_flat',
    'void_sale'
  )),
  product_id BIGINT,
  original_value NUMERIC(12, 2),
  requested_value NUMERIC(12, 2),
  reason TEXT NOT NULL,
  remarks TEXT,
  status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('approved', 'consumed', 'revoked')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '10 minutes'),
  order_id BIGINT REFERENCES public.orders(id),
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.pos_override_approvals ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.pos_override_approvals FROM PUBLIC, anon, authenticated;

INSERT INTO public.app_config (
  tenant_id,
  company_code,
  key,
  value,
  value_type,
  group_name,
  description,
  is_active
)
SELECT DISTINCT
  admin_user.tenant_id,
  admin_user.company_code,
  'pos_gst_pricing_mode',
  'inclusive',
  'string',
  'pos',
  'POS product prices include configured GST.',
  TRUE
FROM public.admin_users AS admin_user
WHERE admin_user.tenant_id IS NOT NULL
  AND admin_user.company_code IS NOT NULL
  AND BTRIM(admin_user.company_code) <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM public.app_config AS existing
    WHERE existing.tenant_id = admin_user.tenant_id
      AND existing.company_code = admin_user.company_code
      AND existing.key = 'pos_gst_pricing_mode'
  );

COMMIT;
