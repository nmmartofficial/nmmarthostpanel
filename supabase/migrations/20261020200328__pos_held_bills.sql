BEGIN;

CREATE TABLE IF NOT EXISTS public.pos_held_bills (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  company_code TEXT NOT NULL,
  created_by_admin_user_id BIGINT NOT NULL REFERENCES public.admin_users(id),
  resumed_by_admin_user_id BIGINT REFERENCES public.admin_users(id),
  deleted_by_admin_user_id BIGINT REFERENCES public.admin_users(id),
  cart JSONB NOT NULL CHECK (jsonb_typeof(cart) = 'array' AND jsonb_array_length(cart) > 0),
  customer_info JSONB NOT NULL DEFAULT '{}'::JSONB CHECK (jsonb_typeof(customer_info) = 'object'),
  total NUMERIC(12, 2) NOT NULL CHECK (total >= 0),
  status TEXT NOT NULL DEFAULT 'held' CHECK (status IN ('held', 'resumed', 'deleted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS pos_held_bills_store_queue_idx
  ON public.pos_held_bills (tenant_id, company_code, created_at DESC)
  WHERE status = 'held';

ALTER TABLE public.pos_held_bills ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.pos_held_bills FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.pos_held_bills_list(
  p_tenant_id UUID,
  p_company_code TEXT
)
RETURNS SETOF public.pos_held_bills
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_admin public.admin_users%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR p_tenant_id IS NULL
     OR NULLIF(BTRIM(p_company_code), '') IS NULL THEN
    RAISE EXCEPTION 'POS_HELD_BILL_AUTHORIZATION_REQUIRED';
  END IF;

  SELECT *
    INTO v_admin
    FROM public.admin_users AS admin_user
   WHERE admin_user.auth_user_id = auth.uid()
     AND admin_user.tenant_id = p_tenant_id
     AND admin_user.company_code = p_company_code
     AND admin_user.is_active IS TRUE
     AND LOWER(COALESCE(admin_user.status, '')) = 'active'
     AND LOWER(BTRIM(COALESCE(admin_user.role, ''))) IN (
       'super_admin', 'admin', 'manager', 'cashier'
     );
  IF NOT FOUND THEN
    RAISE EXCEPTION 'POS_HELD_BILL_AUTHORIZATION_REQUIRED';
  END IF;

  RETURN QUERY
    SELECT held_bill.*
      FROM public.pos_held_bills AS held_bill
     WHERE held_bill.tenant_id = v_admin.tenant_id
       AND held_bill.company_code = v_admin.company_code
       AND held_bill.status = 'held'
     ORDER BY held_bill.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.pos_held_bill_save(
  p_bill_id UUID,
  p_tenant_id UUID,
  p_company_code TEXT,
  p_cart JSONB,
  p_customer_info JSONB,
  p_total NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_admin public.admin_users%ROWTYPE;
  v_bill public.pos_held_bills%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR p_bill_id IS NULL OR p_tenant_id IS NULL
     OR NULLIF(BTRIM(p_company_code), '') IS NULL
     OR p_cart IS NULL OR jsonb_typeof(p_cart) IS DISTINCT FROM 'array'
     OR jsonb_typeof(COALESCE(p_customer_info, '{}'::JSONB)) <> 'object'
     OR p_total IS NULL OR p_total < 0 OR p_total::TEXT IN ('NaN', 'Infinity', '-Infinity') THEN
    RAISE EXCEPTION 'INVALID_POS_HELD_BILL';
  END IF;
  IF jsonb_array_length(p_cart) = 0 THEN
    RAISE EXCEPTION 'INVALID_POS_HELD_BILL';
  END IF;

  SELECT *
    INTO v_admin
    FROM public.admin_users AS admin_user
   WHERE admin_user.auth_user_id = auth.uid()
     AND admin_user.tenant_id = p_tenant_id
     AND admin_user.company_code = p_company_code
     AND admin_user.is_active IS TRUE
     AND LOWER(COALESCE(admin_user.status, '')) = 'active'
     AND LOWER(BTRIM(COALESCE(admin_user.role, ''))) IN (
       'super_admin', 'admin', 'manager', 'cashier'
     );
  IF NOT FOUND THEN
    RAISE EXCEPTION 'POS_HELD_BILL_AUTHORIZATION_REQUIRED';
  END IF;

  INSERT INTO public.pos_held_bills (
    id, tenant_id, company_code, created_by_admin_user_id,
    cart, customer_info, total
  )
  VALUES (
    p_bill_id, v_admin.tenant_id, v_admin.company_code, v_admin.id,
    p_cart, COALESCE(p_customer_info, '{}'::JSONB), ROUND(p_total, 2)
  )
  ON CONFLICT (id) DO NOTHING;

  SELECT *
    INTO v_bill
    FROM public.pos_held_bills AS held_bill
   WHERE held_bill.id = p_bill_id
   FOR UPDATE;

  IF NOT FOUND
     OR v_bill.tenant_id <> v_admin.tenant_id
     OR v_bill.company_code <> v_admin.company_code
     OR v_bill.created_by_admin_user_id <> v_admin.id
     OR v_bill.status <> 'held'
     OR v_bill.cart <> p_cart
     OR v_bill.customer_info <> COALESCE(p_customer_info, '{}'::JSONB)
     OR v_bill.total <> ROUND(p_total, 2) THEN
    RAISE EXCEPTION 'POS_HELD_BILL_IDEMPOTENCY_CONFLICT';
  END IF;

  RETURN TO_JSONB(v_bill);
END;
$$;

CREATE OR REPLACE FUNCTION public.pos_held_bill_resume(
  p_bill_id UUID,
  p_tenant_id UUID,
  p_company_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_admin public.admin_users%ROWTYPE;
  v_bill public.pos_held_bills%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR p_bill_id IS NULL OR p_tenant_id IS NULL
     OR NULLIF(BTRIM(p_company_code), '') IS NULL THEN
    RAISE EXCEPTION 'POS_HELD_BILL_AUTHORIZATION_REQUIRED';
  END IF;

  SELECT *
    INTO v_admin
    FROM public.admin_users AS admin_user
   WHERE admin_user.auth_user_id = auth.uid()
     AND admin_user.tenant_id = p_tenant_id
     AND admin_user.company_code = p_company_code
     AND admin_user.is_active IS TRUE
     AND LOWER(COALESCE(admin_user.status, '')) = 'active'
     AND LOWER(BTRIM(COALESCE(admin_user.role, ''))) IN (
       'super_admin', 'admin', 'manager', 'cashier'
     );
  IF NOT FOUND THEN
    RAISE EXCEPTION 'POS_HELD_BILL_AUTHORIZATION_REQUIRED';
  END IF;

  UPDATE public.pos_held_bills AS held_bill
     SET status = 'resumed',
         resumed_by_admin_user_id = v_admin.id,
         completed_at = NOW(),
         updated_at = NOW()
   WHERE held_bill.id = p_bill_id
     AND held_bill.tenant_id = v_admin.tenant_id
     AND held_bill.company_code = v_admin.company_code
     AND held_bill.status = 'held'
  RETURNING held_bill.* INTO v_bill;

  IF NOT FOUND THEN
    SELECT *
      INTO v_bill
      FROM public.pos_held_bills AS held_bill
     WHERE held_bill.id = p_bill_id
       AND held_bill.tenant_id = v_admin.tenant_id
       AND held_bill.company_code = v_admin.company_code
       AND held_bill.status = 'resumed'
       AND held_bill.resumed_by_admin_user_id = v_admin.id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'POS_HELD_BILL_NOT_AVAILABLE';
    END IF;
  END IF;

  RETURN TO_JSONB(v_bill);
END;
$$;

CREATE OR REPLACE FUNCTION public.pos_held_bill_delete(
  p_bill_id UUID,
  p_tenant_id UUID,
  p_company_code TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_admin public.admin_users%ROWTYPE;
  v_updated_id UUID;
BEGIN
  IF auth.uid() IS NULL OR p_bill_id IS NULL OR p_tenant_id IS NULL
     OR NULLIF(BTRIM(p_company_code), '') IS NULL THEN
    RAISE EXCEPTION 'POS_HELD_BILL_AUTHORIZATION_REQUIRED';
  END IF;

  SELECT *
    INTO v_admin
    FROM public.admin_users AS admin_user
   WHERE admin_user.auth_user_id = auth.uid()
     AND admin_user.tenant_id = p_tenant_id
     AND admin_user.company_code = p_company_code
     AND admin_user.is_active IS TRUE
     AND LOWER(COALESCE(admin_user.status, '')) = 'active'
     AND LOWER(BTRIM(COALESCE(admin_user.role, ''))) IN (
       'super_admin', 'admin', 'manager', 'cashier'
     );
  IF NOT FOUND THEN
    RAISE EXCEPTION 'POS_HELD_BILL_AUTHORIZATION_REQUIRED';
  END IF;

  UPDATE public.pos_held_bills AS held_bill
     SET status = 'deleted',
         deleted_by_admin_user_id = v_admin.id,
         completed_at = NOW(),
         updated_at = NOW()
   WHERE held_bill.id = p_bill_id
     AND held_bill.tenant_id = v_admin.tenant_id
     AND held_bill.company_code = v_admin.company_code
     AND held_bill.status = 'held'
  RETURNING held_bill.id INTO v_updated_id;

  IF v_updated_id IS NULL THEN
    SELECT held_bill.id
      INTO v_updated_id
      FROM public.pos_held_bills AS held_bill
     WHERE held_bill.id = p_bill_id
       AND held_bill.tenant_id = v_admin.tenant_id
       AND held_bill.company_code = v_admin.company_code
       AND held_bill.status = 'deleted'
       AND held_bill.deleted_by_admin_user_id = v_admin.id;
    IF v_updated_id IS NULL THEN
      RAISE EXCEPTION 'POS_HELD_BILL_NOT_AVAILABLE';
    END IF;
  END IF;

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.pos_held_bills_list(UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.pos_held_bill_save(UUID, UUID, TEXT, JSONB, JSONB, NUMERIC) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.pos_held_bill_resume(UUID, UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.pos_held_bill_delete(UUID, UUID, TEXT) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.pos_held_bills_list(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pos_held_bill_save(UUID, UUID, TEXT, JSONB, JSONB, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pos_held_bill_resume(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pos_held_bill_delete(UUID, UUID, TEXT) TO authenticated;

COMMIT;
