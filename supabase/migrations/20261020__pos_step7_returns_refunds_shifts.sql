BEGIN;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS cashier_shift_id BIGINT;

CREATE TABLE IF NOT EXISTS public.pos_returns (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES public.orders(id),
  processed_by_admin_user_id BIGINT NOT NULL REFERENCES public.admin_users(id),
  auth_user_id UUID NOT NULL REFERENCES auth.users(id),
  idempotency_key UUID NOT NULL UNIQUE,
  reason TEXT NOT NULL,
  return_amount NUMERIC(12, 2) NOT NULL CHECK (return_amount >= 0),
  status TEXT NOT NULL DEFAULT 'accepted' CHECK (status IN ('accepted')),
  refund_status TEXT NOT NULL DEFAULT 'pending' CHECK (refund_status IN ('pending', 'not_required')),
  refund_method TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.pos_return_items (
  id BIGSERIAL PRIMARY KEY,
  return_id BIGINT NOT NULL REFERENCES public.pos_returns(id),
  order_item_id BIGINT NOT NULL REFERENCES public.order_items(id),
  product_id BIGINT REFERENCES public.products(id),
  product_name TEXT NOT NULL,
  quantity NUMERIC(12, 3) NOT NULL CHECK (quantity > 0),
  unit_rate NUMERIC(12, 2) NOT NULL,
  discount_amount NUMERIC(12, 2) NOT NULL,
  gst_percent NUMERIC(8, 3) NOT NULL,
  gst_amount NUMERIC(12, 2) NOT NULL,
  total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount >= 0),
  restockable BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.pos_refund_requests (
  id BIGSERIAL PRIMARY KEY,
  return_id BIGINT NOT NULL UNIQUE REFERENCES public.pos_returns(id),
  idempotency_key UUID NOT NULL UNIQUE,
  payment_method TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending')),
  provider_reference TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.pos_cashier_shifts (
  id BIGSERIAL PRIMARY KEY,
  admin_user_id BIGINT NOT NULL REFERENCES public.admin_users(id),
  tenant_id UUID NOT NULL,
  company_code TEXT NOT NULL,
  open_idempotency_key UUID NOT NULL UNIQUE,
  close_idempotency_key UUID UNIQUE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  opening_cash NUMERIC(12, 2) NOT NULL CHECK (opening_cash >= 0),
  closing_cash NUMERIC(12, 2),
  expected_cash NUMERIC(12, 2),
  variance NUMERIC(12, 2),
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  CHECK (
    (status = 'open' AND closing_cash IS NULL AND closed_at IS NULL)
    OR (status = 'closed' AND closing_cash IS NOT NULL AND closed_at IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS pos_cashier_shifts_one_open_per_cashier_store
  ON public.pos_cashier_shifts (admin_user_id, tenant_id, company_code)
  WHERE status = 'open';

CREATE TABLE IF NOT EXISTS public.pos_cashier_shift_movements (
  id BIGSERIAL PRIMARY KEY,
  shift_id BIGINT NOT NULL REFERENCES public.pos_cashier_shifts(id),
  admin_user_id BIGINT NOT NULL REFERENCES public.admin_users(id),
  idempotency_key UUID NOT NULL UNIQUE,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('cash_in', 'cash_out')),
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.pos_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_refund_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_cashier_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_cashier_shift_movements ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.pos_returns, public.pos_return_items,
  public.pos_refund_requests, public.pos_cashier_shifts,
  public.pos_cashier_shift_movements FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.pos_order_returnable_items(
  p_order_id BIGINT,
  p_company_code TEXT,
  p_tenant_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_admin public.admin_users%ROWTYPE;
  v_order public.orders%ROWTYPE;
  v_items JSONB;
BEGIN
  IF auth.uid() IS NULL OR p_order_id IS NULL OR p_tenant_id IS NULL
     OR NULLIF(BTRIM(p_company_code), '') IS NULL THEN
    RAISE EXCEPTION 'POS_RETURN_AUTHORIZATION_REQUIRED';
  END IF;

  SELECT *
    INTO v_admin
    FROM public.admin_users AS admin_user
   WHERE admin_user.auth_user_id = auth.uid()
     AND admin_user.company_code = p_company_code
     AND admin_user.tenant_id = p_tenant_id
     AND admin_user.is_active IS TRUE
     AND LOWER(COALESCE(admin_user.status, '')) = 'active'
     AND LOWER(BTRIM(COALESCE(admin_user.role, ''))) IN (
       'super_admin', 'admin', 'sales_manager'
     );
  IF NOT FOUND THEN
    RAISE EXCEPTION 'POS_RETURN_AUTHORIZATION_REQUIRED';
  END IF;

  SELECT *
    INTO v_order
    FROM public.orders AS order_row
   WHERE order_row.id = p_order_id
     AND order_row.tenant_id = v_admin.tenant_id
     AND order_row.company_code = v_admin.company_code;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'POS_RETURN_ORDER_NOT_FOUND_IN_STORE';
  END IF;
  IF LOWER(COALESCE(v_order.payment_status, '')) <> 'paid'
     OR LOWER(COALESCE(v_order.order_status, v_order.status, '')) IN ('cancelled', 'returned') THEN
    RAISE EXCEPTION 'POS_RETURN_ORDER_NOT_ELIGIBLE';
  END IF;
  IF LOWER(COALESCE(v_order.payment_method, '')) IN ('mixed', 'split') THEN
    RAISE EXCEPTION 'POS_MIXED_TENDER_RETURN_UNSUPPORTED';
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'order_item_id', item.id,
    'product_id', item.product_id,
    'product_name', item.product_name,
    'sold_quantity', COALESCE(item.quantity, item.qty),
    'returned_quantity', COALESCE(returned.quantity, 0),
    'remaining_quantity', CASE
      WHEN COALESCE(item.is_returned, FALSE) IS TRUE THEN 0
      ELSE GREATEST(
        0,
        COALESCE(item.quantity, item.qty) - COALESCE(returned.quantity, 0)
      )
    END,
    'unit_rate', COALESCE(item.rate, item.price),
    'discount_amount', COALESCE(item.discount_amount, 0),
    'gst_percent', COALESCE(item.gst_percent, 0),
    'gst_amount', COALESCE(item.gst_amount, 0),
    'total_amount', COALESCE(item.total, COALESCE(item.rate, item.price) * COALESCE(item.quantity, item.qty)),
    'is_returned', COALESCE(item.is_returned, FALSE)
  ) ORDER BY item.id), '[]'::JSONB)
    INTO v_items
    FROM public.order_items AS item
    LEFT JOIN LATERAL (
      SELECT SUM(return_item.quantity) AS quantity
        FROM public.pos_return_items AS return_item
        JOIN public.pos_returns AS return_row ON return_row.id = return_item.return_id
       WHERE return_item.order_item_id = item.id
         AND return_row.order_id = v_order.id
         AND return_row.status = 'accepted'
    ) AS returned ON TRUE
   WHERE item.order_id = v_order.id;

  RETURN v_items;
END;
$$;

CREATE OR REPLACE FUNCTION public.process_pos_return(
  p_order_id BIGINT,
  p_company_code TEXT,
  p_tenant_id UUID,
  p_items JSONB,
  p_reason TEXT,
  p_idempotency_key UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_admin public.admin_users%ROWTYPE;
  v_order public.orders%ROWTYPE;
  v_order_item public.order_items%ROWTYPE;
  v_input JSONB;
  v_prepared JSONB := '[]'::JSONB;
  v_return_id BIGINT;
  v_refund_id BIGINT;
  v_return_amount NUMERIC := 0;
  v_line_amount NUMERIC;
  v_line_discount NUMERIC;
  v_line_gst NUMERIC;
  v_sold_quantity NUMERIC;
  v_prior_quantity NUMERIC;
  v_quantity NUMERIC;
  v_order_item_id BIGINT;
  v_product_id BIGINT;
  v_restockable BOOLEAN;
  v_stock_update_count BIGINT;
  v_existing public.pos_returns%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR p_order_id IS NULL OR p_tenant_id IS NULL OR p_idempotency_key IS NULL
     OR NULLIF(BTRIM(p_company_code), '') IS NULL
     OR NULLIF(BTRIM(p_reason), '') IS NULL THEN
    RAISE EXCEPTION 'INVALID_POS_RETURN_REQUEST';
  END IF;
  IF jsonb_typeof(p_items) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'INVALID_POS_RETURN_REQUEST';
  END IF;
  IF jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'INVALID_POS_RETURN_REQUEST';
  END IF;

  SELECT *
    INTO v_admin
    FROM public.admin_users AS admin_user
   WHERE admin_user.auth_user_id = auth.uid()
     AND admin_user.company_code = p_company_code
     AND admin_user.tenant_id = p_tenant_id
     AND admin_user.is_active IS TRUE
     AND LOWER(COALESCE(admin_user.status, '')) = 'active'
     AND LOWER(BTRIM(COALESCE(admin_user.role, ''))) IN (
       'super_admin', 'admin', 'sales_manager'
     )
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'POS_RETURN_AUTHORIZATION_REQUIRED';
  END IF;

  SELECT *
    INTO v_existing
    FROM public.pos_returns AS return_row
   WHERE return_row.idempotency_key = p_idempotency_key;
  IF FOUND THEN
    IF v_existing.order_id <> p_order_id
       OR v_existing.auth_user_id <> auth.uid()
       OR v_existing.processed_by_admin_user_id <> v_admin.id
       OR NOT EXISTS (
         SELECT 1
           FROM public.orders AS order_row
          WHERE order_row.id = v_existing.order_id
            AND order_row.tenant_id = v_admin.tenant_id
            AND order_row.company_code = v_admin.company_code
       ) THEN
      RAISE EXCEPTION 'POS_RETURN_IDEMPOTENCY_KEY_CONFLICT';
    END IF;
    SELECT refund.id
      INTO v_refund_id
      FROM public.pos_refund_requests AS refund
     WHERE refund.return_id = v_existing.id;
    RETURN jsonb_build_object(
      'return_id', v_existing.id,
      'return_status', v_existing.status,
      'refund_status', v_existing.refund_status,
      'refund_request_id', v_refund_id,
      'refund_amount', v_existing.return_amount,
      'replayed', TRUE
    );
  END IF;

  SELECT *
    INTO v_order
    FROM public.orders AS order_row
   WHERE order_row.id = p_order_id
     AND order_row.tenant_id = v_admin.tenant_id
     AND order_row.company_code = v_admin.company_code
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'POS_RETURN_ORDER_NOT_FOUND_IN_STORE';
  END IF;
  IF LOWER(COALESCE(v_order.payment_status, '')) <> 'paid'
     OR LOWER(COALESCE(v_order.order_status, v_order.status, '')) IN ('cancelled', 'returned') THEN
    RAISE EXCEPTION 'POS_RETURN_ORDER_NOT_ELIGIBLE';
  END IF;
  IF LOWER(COALESCE(v_order.payment_method, '')) IN ('mixed', 'split') THEN
    RAISE EXCEPTION 'POS_MIXED_TENDER_RETURN_UNSUPPORTED';
  END IF;

  IF jsonb_array_length(p_items) <> (
    SELECT COUNT(DISTINCT item->>'order_item_id')
      FROM jsonb_array_elements(p_items) AS lines(item)
  ) THEN
    RAISE EXCEPTION 'DUPLICATE_POS_RETURN_LINE';
  END IF;

  FOR v_input IN SELECT item FROM jsonb_array_elements(p_items) AS lines(item)
  LOOP
    IF NULLIF(v_input->>'order_item_id', '') IS NULL
       OR NULLIF(v_input->>'quantity', '') IS NULL
       OR (
         v_input->'restockable' IS DISTINCT FROM 'true'::JSONB
         AND v_input->'restockable' IS DISTINCT FROM 'false'::JSONB
       ) THEN
      RAISE EXCEPTION 'INVALID_POS_RETURN_LINE';
    END IF;

    v_order_item_id := (v_input->>'order_item_id')::BIGINT;
    v_quantity := (v_input->>'quantity')::NUMERIC;
    v_restockable := (v_input->>'restockable')::BOOLEAN;
    IF v_quantity <= 0 OR v_quantity::TEXT IN ('NaN', 'Infinity', '-Infinity') THEN
      RAISE EXCEPTION 'INVALID_POS_RETURN_QUANTITY';
    END IF;

    SELECT *
      INTO v_order_item
      FROM public.order_items AS item
     WHERE item.id = v_order_item_id
       AND item.order_id = v_order.id
     FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'POS_RETURN_ITEM_NOT_IN_ORIGINAL_ORDER';
    END IF;

    v_sold_quantity := COALESCE(v_order_item.quantity, v_order_item.qty);
    IF v_sold_quantity IS NULL OR v_sold_quantity <= 0
       OR COALESCE(v_order_item.is_returned, FALSE) IS TRUE THEN
      RAISE EXCEPTION 'POS_RETURN_ITEM_NOT_ELIGIBLE';
    END IF;

    SELECT COALESCE(SUM(return_item.quantity), 0)
      INTO v_prior_quantity
      FROM public.pos_return_items AS return_item
      JOIN public.pos_returns AS return_row ON return_row.id = return_item.return_id
     WHERE return_item.order_item_id = v_order_item.id
       AND return_row.order_id = v_order.id
       AND return_row.status = 'accepted';
    IF v_prior_quantity + v_quantity > v_sold_quantity THEN
      RAISE EXCEPTION 'POS_RETURN_QUANTITY_EXCEEDS_REMAINING';
    END IF;

    v_line_amount := COALESCE(
      v_order_item.total,
      COALESCE(v_order_item.rate, v_order_item.price) * v_sold_quantity
    );
    v_line_discount := COALESCE(v_order_item.discount_amount, 0);
    v_line_gst := COALESCE(v_order_item.gst_amount, 0);
    v_return_amount := v_return_amount
      + ROUND(v_line_amount * (v_prior_quantity + v_quantity) / v_sold_quantity, 2)
      - ROUND(v_line_amount * v_prior_quantity / v_sold_quantity, 2);

    v_prepared := v_prepared || jsonb_build_array(jsonb_build_object(
      'order_item_id', v_order_item.id,
      'product_id', v_order_item.product_id,
      'product_name', COALESCE(v_order_item.product_name, 'Product'),
      'quantity', v_quantity,
      'unit_rate', COALESCE(v_order_item.rate, v_order_item.price, 0),
      'discount_amount',
        ROUND(v_line_discount * (v_prior_quantity + v_quantity) / v_sold_quantity, 2)
        - ROUND(v_line_discount * v_prior_quantity / v_sold_quantity, 2),
      'gst_percent', COALESCE(v_order_item.gst_percent, 0),
      'gst_amount',
        ROUND(v_line_gst * (v_prior_quantity + v_quantity) / v_sold_quantity, 2)
        - ROUND(v_line_gst * v_prior_quantity / v_sold_quantity, 2),
      'total_amount',
        ROUND(v_line_amount * (v_prior_quantity + v_quantity) / v_sold_quantity, 2)
        - ROUND(v_line_amount * v_prior_quantity / v_sold_quantity, 2),
      'restockable', v_restockable
    ));
  END LOOP;

  INSERT INTO public.pos_returns (
    order_id, processed_by_admin_user_id, auth_user_id, idempotency_key,
    reason, return_amount, refund_status, refund_method
  )
  VALUES (
    v_order.id, v_admin.id, auth.uid(), p_idempotency_key,
    LEFT(BTRIM(p_reason), 500), ROUND(v_return_amount, 2),
    CASE WHEN v_return_amount > 0 THEN 'pending' ELSE 'not_required' END,
    LOWER(COALESCE(v_order.payment_method, ''))
  )
  RETURNING id INTO v_return_id;

  INSERT INTO public.pos_return_items (
    return_id, order_item_id, product_id, product_name, quantity, unit_rate,
    discount_amount, gst_percent, gst_amount, total_amount, restockable
  )
  SELECT
    v_return_id,
    (line->>'order_item_id')::BIGINT,
    NULLIF(line->>'product_id', '')::BIGINT,
    line->>'product_name',
    (line->>'quantity')::NUMERIC,
    (line->>'unit_rate')::NUMERIC,
    (line->>'discount_amount')::NUMERIC,
    (line->>'gst_percent')::NUMERIC,
    (line->>'gst_amount')::NUMERIC,
    (line->>'total_amount')::NUMERIC,
    (line->>'restockable')::BOOLEAN
  FROM jsonb_array_elements(v_prepared) AS lines(line);

  IF v_return_amount > 0 THEN
    INSERT INTO public.pos_refund_requests (
      return_id, idempotency_key, payment_method, amount
    )
    VALUES (
      v_return_id, p_idempotency_key, LOWER(COALESCE(v_order.payment_method, '')),
      ROUND(v_return_amount, 2)
    )
    RETURNING id INTO v_refund_id;
  END IF;

  FOR v_input IN SELECT item FROM jsonb_array_elements(v_prepared) AS lines(item)
  LOOP
    IF (v_input->>'restockable')::BOOLEAN IS TRUE THEN
      v_product_id := (v_input->>'product_id')::BIGINT;
      IF v_product_id IS NULL THEN
        RAISE EXCEPTION 'POS_RETURN_RESTOCK_PRODUCT_REQUIRED';
      END IF;

      UPDATE public.products AS product
         SET stock = COALESCE(product.stock, 0) + (v_input->>'quantity')::NUMERIC
       WHERE product.id = v_product_id
         AND product.tenant_id = v_order.tenant_id
         AND product.company_code = v_order.company_code;
      GET DIAGNOSTICS v_stock_update_count = ROW_COUNT;
      IF v_stock_update_count <> 1 THEN
        RAISE EXCEPTION 'POS_RETURN_RESTOCK_PRODUCT_NOT_IN_STORE';
      END IF;

      INSERT INTO public.inventory_logs (product_id, change_qty)
      VALUES (v_product_id, (v_input->>'quantity')::NUMERIC);
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'return_id', v_return_id,
    'return_status', 'accepted',
    'refund_status', CASE WHEN v_return_amount > 0 THEN 'pending' ELSE 'not_required' END,
    'refund_request_id', v_refund_id,
    'refund_amount', ROUND(v_return_amount, 2),
    'replayed', FALSE
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.pos_cashier_shift_current(p_tenant_id UUID, p_company_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_admin public.admin_users%ROWTYPE;
  v_shift public.pos_cashier_shifts%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR p_tenant_id IS NULL OR NULLIF(BTRIM(p_company_code), '') IS NULL THEN
    RAISE EXCEPTION 'POS_SHIFT_AUTHORIZATION_REQUIRED';
  END IF;
  SELECT *
    INTO v_admin
    FROM public.admin_users AS admin_user
   WHERE admin_user.auth_user_id = auth.uid()
     AND admin_user.company_code = p_company_code
     AND admin_user.tenant_id = p_tenant_id
     AND admin_user.is_active IS TRUE
     AND LOWER(COALESCE(admin_user.status, '')) = 'active'
     AND LOWER(BTRIM(COALESCE(admin_user.role, ''))) IN (
       'super_admin', 'admin', 'manager', 'cashier'
     );
  IF NOT FOUND THEN
    RAISE EXCEPTION 'POS_SHIFT_AUTHORIZATION_REQUIRED';
  END IF;
  SELECT *
    INTO v_shift
    FROM public.pos_cashier_shifts AS shift
   WHERE shift.admin_user_id = v_admin.id
     AND shift.company_code = v_admin.company_code
     AND shift.tenant_id = v_admin.tenant_id
     AND shift.status = 'open';
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  RETURN jsonb_build_object(
    'id', v_shift.id,
    'status', v_shift.status,
    'opening_cash', v_shift.opening_cash,
    'opened_at', v_shift.opened_at,
    'company_code', v_shift.company_code
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.pos_cashier_shift_open(
  p_tenant_id UUID,
  p_company_code TEXT,
  p_opening_cash NUMERIC,
  p_idempotency_key UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_admin public.admin_users%ROWTYPE;
  v_shift public.pos_cashier_shifts%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR p_tenant_id IS NULL OR p_idempotency_key IS NULL
     OR NULLIF(BTRIM(p_company_code), '') IS NULL
     OR p_opening_cash IS NULL OR p_opening_cash < 0
     OR p_opening_cash::TEXT IN ('NaN', 'Infinity', '-Infinity') THEN
    RAISE EXCEPTION 'INVALID_POS_SHIFT_OPEN';
  END IF;
  SELECT *
    INTO v_admin
    FROM public.admin_users AS admin_user
   WHERE admin_user.auth_user_id = auth.uid()
     AND admin_user.company_code = p_company_code
     AND admin_user.tenant_id = p_tenant_id
     AND admin_user.is_active IS TRUE
     AND LOWER(COALESCE(admin_user.status, '')) = 'active'
     AND LOWER(BTRIM(COALESCE(admin_user.role, ''))) IN (
       'super_admin', 'admin', 'manager', 'cashier'
     )
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'POS_SHIFT_AUTHORIZATION_REQUIRED';
  END IF;

  SELECT *
    INTO v_shift
    FROM public.pos_cashier_shifts AS shift
   WHERE shift.open_idempotency_key = p_idempotency_key
     AND shift.admin_user_id = v_admin.id
     AND shift.company_code = v_admin.company_code
     AND shift.tenant_id = v_admin.tenant_id;
  IF FOUND THEN
    IF v_shift.opening_cash <> ROUND(p_opening_cash, 2) THEN
      RAISE EXCEPTION 'POS_SHIFT_IDEMPOTENCY_KEY_CONFLICT';
    END IF;
    RETURN jsonb_build_object(
      'id', v_shift.id, 'status', v_shift.status,
      'opening_cash', v_shift.opening_cash, 'opened_at', v_shift.opened_at,
      'replayed', TRUE
    );
  END IF;

  INSERT INTO public.pos_cashier_shifts (
    admin_user_id, tenant_id, company_code, open_idempotency_key, opening_cash
  )
  VALUES (
    v_admin.id, v_admin.tenant_id, v_admin.company_code,
    p_idempotency_key, ROUND(p_opening_cash, 2)
  )
  RETURNING * INTO v_shift;

  RETURN jsonb_build_object(
    'id', v_shift.id, 'status', v_shift.status,
    'opening_cash', v_shift.opening_cash, 'opened_at', v_shift.opened_at,
    'replayed', FALSE
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.pos_cashier_shift_record_movement(
  p_shift_id BIGINT,
  p_movement_type TEXT,
  p_amount NUMERIC,
  p_reason TEXT,
  p_idempotency_key UUID,
  p_company_code TEXT,
  p_tenant_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_admin public.admin_users%ROWTYPE;
  v_shift public.pos_cashier_shifts%ROWTYPE;
  v_movement public.pos_cashier_shift_movements%ROWTYPE;
  v_available_cash NUMERIC;
  v_sales NUMERIC;
  v_in NUMERIC;
  v_out NUMERIC;
BEGIN
  IF auth.uid() IS NULL OR p_shift_id IS NULL OR p_idempotency_key IS NULL
     OR p_amount IS NULL OR p_amount <= 0
     OR p_amount::TEXT IN ('NaN', 'Infinity', '-Infinity')
     OR p_movement_type NOT IN ('cash_in', 'cash_out')
     OR NULLIF(BTRIM(p_reason), '') IS NULL
     OR NULLIF(BTRIM(p_company_code), '') IS NULL OR p_tenant_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_POS_SHIFT_MOVEMENT';
  END IF;
  SELECT *
    INTO v_admin
    FROM public.admin_users AS admin_user
   WHERE admin_user.auth_user_id = auth.uid()
     AND admin_user.company_code = p_company_code
     AND admin_user.tenant_id = p_tenant_id
     AND admin_user.is_active IS TRUE
     AND LOWER(COALESCE(admin_user.status, '')) = 'active'
     AND LOWER(BTRIM(COALESCE(admin_user.role, ''))) IN (
       'super_admin', 'admin', 'manager', 'cashier'
     )
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'POS_SHIFT_AUTHORIZATION_REQUIRED';
  END IF;

  SELECT *
    INTO v_movement
    FROM public.pos_cashier_shift_movements AS movement
   WHERE movement.idempotency_key = p_idempotency_key
     AND movement.admin_user_id = v_admin.id;
  IF FOUND THEN
    IF v_movement.shift_id <> p_shift_id
       OR v_movement.movement_type <> p_movement_type
       OR v_movement.amount <> ROUND(p_amount, 2)
       OR v_movement.reason <> LEFT(BTRIM(p_reason), 500) THEN
      RAISE EXCEPTION 'POS_SHIFT_IDEMPOTENCY_KEY_CONFLICT';
    END IF;
    RETURN jsonb_build_object(
      'id', v_movement.id, 'shift_id', v_movement.shift_id,
      'movement_type', v_movement.movement_type, 'amount', v_movement.amount,
      'replayed', TRUE
    );
  END IF;

  SELECT *
    INTO v_shift
    FROM public.pos_cashier_shifts AS shift
   WHERE shift.id = p_shift_id
     AND shift.admin_user_id = v_admin.id
     AND shift.company_code = v_admin.company_code
     AND shift.tenant_id = v_admin.tenant_id
     AND shift.status = 'open'
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'POS_SHIFT_NOT_OPEN_OR_NOT_OWNED';
  END IF;

  IF p_movement_type = 'cash_out' THEN
    IF EXISTS (
      SELECT 1
        FROM public.orders AS order_row
       WHERE order_row.cashier_shift_id = v_shift.id
         AND LOWER(COALESCE(order_row.payment_method, '')) IN ('mixed', 'split')
         AND LOWER(COALESCE(order_row.payment_status, '')) = 'paid'
    ) THEN
      RAISE EXCEPTION 'POS_MIXED_TENDER_RECONCILIATION_UNAVAILABLE';
    END IF;
    SELECT COALESCE(SUM(order_row.total_amount), 0)
      INTO v_sales
      FROM public.orders AS order_row
     WHERE order_row.cashier_shift_id = v_shift.id
       AND LOWER(COALESCE(order_row.payment_method, '')) = 'cash'
       AND LOWER(COALESCE(order_row.payment_status, '')) = 'paid'
       AND LOWER(COALESCE(order_row.order_status, order_row.status, '')) <> 'cancelled';
    SELECT COALESCE(SUM(movement.amount) FILTER (WHERE movement.movement_type = 'cash_in'), 0),
           COALESCE(SUM(movement.amount) FILTER (WHERE movement.movement_type = 'cash_out'), 0)
      INTO v_in, v_out
      FROM public.pos_cashier_shift_movements AS movement
     WHERE movement.shift_id = v_shift.id;
    v_available_cash := v_shift.opening_cash + v_sales + v_in - v_out;
    IF p_amount > v_available_cash THEN
      RAISE EXCEPTION 'POS_SHIFT_CASH_OUT_EXCEEDS_EXPECTED_CASH';
    END IF;
  END IF;

  INSERT INTO public.pos_cashier_shift_movements (
    shift_id, admin_user_id, idempotency_key, movement_type, amount, reason
  )
  VALUES (
    v_shift.id, v_admin.id, p_idempotency_key, p_movement_type,
    ROUND(p_amount, 2), LEFT(BTRIM(p_reason), 500)
  )
  RETURNING * INTO v_movement;
  RETURN jsonb_build_object(
    'id', v_movement.id, 'shift_id', v_movement.shift_id,
    'movement_type', v_movement.movement_type, 'amount', v_movement.amount,
    'replayed', FALSE
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.pos_cashier_shift_close(
  p_shift_id BIGINT,
  p_counted_cash NUMERIC,
  p_idempotency_key UUID,
  p_company_code TEXT,
  p_tenant_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_admin public.admin_users%ROWTYPE;
  v_shift public.pos_cashier_shifts%ROWTYPE;
  v_sales NUMERIC;
  v_cash_in NUMERIC;
  v_cash_out NUMERIC;
  v_expected NUMERIC;
BEGIN
  IF auth.uid() IS NULL OR p_shift_id IS NULL OR p_idempotency_key IS NULL
     OR p_counted_cash IS NULL OR p_counted_cash < 0
     OR p_counted_cash::TEXT IN ('NaN', 'Infinity', '-Infinity')
     OR NULLIF(BTRIM(p_company_code), '') IS NULL OR p_tenant_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_POS_SHIFT_CLOSE';
  END IF;
  SELECT *
    INTO v_admin
    FROM public.admin_users AS admin_user
   WHERE admin_user.auth_user_id = auth.uid()
     AND admin_user.company_code = p_company_code
     AND admin_user.tenant_id = p_tenant_id
     AND admin_user.is_active IS TRUE
     AND LOWER(COALESCE(admin_user.status, '')) = 'active'
     AND LOWER(BTRIM(COALESCE(admin_user.role, ''))) IN (
       'super_admin', 'admin', 'manager', 'cashier'
     )
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'POS_SHIFT_AUTHORIZATION_REQUIRED';
  END IF;

  SELECT *
    INTO v_shift
    FROM public.pos_cashier_shifts AS shift
   WHERE shift.id = p_shift_id
     AND shift.admin_user_id = v_admin.id
     AND shift.company_code = v_admin.company_code
     AND shift.tenant_id = v_admin.tenant_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'POS_SHIFT_NOT_FOUND_IN_STORE';
  END IF;
  IF v_shift.status = 'closed' THEN
    IF v_shift.close_idempotency_key = p_idempotency_key THEN
      IF v_shift.closing_cash <> ROUND(p_counted_cash, 2) THEN
        RAISE EXCEPTION 'POS_SHIFT_IDEMPOTENCY_KEY_CONFLICT';
      END IF;
      RETURN jsonb_build_object(
        'id', v_shift.id, 'status', v_shift.status,
        'opening_cash', v_shift.opening_cash, 'closing_cash', v_shift.closing_cash,
        'expected_cash', v_shift.expected_cash, 'variance', v_shift.variance,
        'closed_at', v_shift.closed_at, 'replayed', TRUE
      );
    END IF;
    RAISE EXCEPTION 'POS_SHIFT_ALREADY_CLOSED';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM public.orders AS order_row
     WHERE order_row.cashier_shift_id = v_shift.id
       AND LOWER(COALESCE(order_row.payment_status, '')) = 'paid'
       AND LOWER(COALESCE(order_row.payment_method, '')) IN ('mixed', 'split')
  ) THEN
    RAISE EXCEPTION 'POS_MIXED_TENDER_RECONCILIATION_UNAVAILABLE';
  END IF;
  IF EXISTS (
    SELECT 1
      FROM public.orders AS order_row
     WHERE order_row.cashier_shift_id = v_shift.id
       AND LOWER(COALESCE(order_row.order_status, order_row.status, '')) = 'returned'
  ) THEN
    RAISE EXCEPTION 'POS_LEGACY_RETURN_REQUIRES_RECONCILIATION';
  END IF;

  SELECT COALESCE(SUM(order_row.total_amount), 0)
    INTO v_sales
    FROM public.orders AS order_row
   WHERE order_row.cashier_shift_id = v_shift.id
     AND LOWER(COALESCE(order_row.payment_method, '')) = 'cash'
     AND LOWER(COALESCE(order_row.payment_status, '')) = 'paid'
     AND LOWER(COALESCE(order_row.order_status, order_row.status, '')) <> 'cancelled';
  SELECT COALESCE(SUM(movement.amount) FILTER (WHERE movement.movement_type = 'cash_in'), 0),
         COALESCE(SUM(movement.amount) FILTER (WHERE movement.movement_type = 'cash_out'), 0)
    INTO v_cash_in, v_cash_out
    FROM public.pos_cashier_shift_movements AS movement
   WHERE movement.shift_id = v_shift.id;
  v_expected := ROUND(v_shift.opening_cash + v_sales + v_cash_in - v_cash_out, 2);

  UPDATE public.pos_cashier_shifts
     SET status = 'closed',
         close_idempotency_key = p_idempotency_key,
         closing_cash = ROUND(p_counted_cash, 2),
         expected_cash = v_expected,
         variance = ROUND(p_counted_cash - v_expected, 2),
         closed_at = NOW()
   WHERE id = v_shift.id
  RETURNING * INTO v_shift;

  RETURN jsonb_build_object(
    'id', v_shift.id, 'status', v_shift.status,
    'opening_cash', v_shift.opening_cash, 'closing_cash', v_shift.closing_cash,
    'expected_cash', v_shift.expected_cash, 'variance', v_shift.variance,
    'closed_at', v_shift.closed_at, 'replayed', FALSE
  );
END;
$$;

REVOKE ALL ON FUNCTION public.pos_order_returnable_items(BIGINT, TEXT, UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.process_pos_return(BIGINT, TEXT, UUID, JSONB, TEXT, UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.pos_cashier_shift_current(UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.pos_cashier_shift_open(UUID, TEXT, NUMERIC, UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.pos_cashier_shift_record_movement(BIGINT, TEXT, NUMERIC, TEXT, UUID, TEXT, UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.pos_cashier_shift_close(BIGINT, NUMERIC, UUID, TEXT, UUID) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.pos_order_returnable_items(BIGINT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_pos_return(BIGINT, TEXT, UUID, JSONB, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pos_cashier_shift_current(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pos_cashier_shift_open(UUID, TEXT, NUMERIC, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pos_cashier_shift_record_movement(BIGINT, TEXT, NUMERIC, TEXT, UUID, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pos_cashier_shift_close(BIGINT, NUMERIC, UUID, TEXT, UUID) TO authenticated;

COMMIT;
