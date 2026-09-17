-- Phase 1: harden the existing POS atomic checkout function.
-- This replaces the function body only; it does not create or alter tables.
BEGIN;

CREATE OR REPLACE FUNCTION public.place_order_atomic(p_payload JSONB)
RETURNS BIGINT AS $$
DECLARE
  v_header JSONB;
  v_items JSONB;
  v_payment JSONB;
  v_new_order_id BIGINT;
  v_auth_email TEXT := auth.email();
  v_tenant_id BIGINT;
  v_company_code TEXT;
  v_item JSONB;
  v_product_id BIGINT;
  v_qty NUMERIC;
  v_rate NUMERIC;
  v_item_total NUMERIC;
  v_old_stock NUMERIC;
  v_new_stock NUMERIC;
  v_payment_method TEXT;
  v_total_amount NUMERIC;
  v_paid_amount NUMERIC;
  v_index INTEGER;
BEGIN
  IF v_auth_email IS NULL OR btrim(v_auth_email) = '' THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  SELECT au.tenant_id, au.company_code
    INTO v_tenant_id, v_company_code
  FROM public.admin_users au
  WHERE lower(au.email) = lower(v_auth_email)
     OR lower(au.username) = lower(v_auth_email)
  LIMIT 1;

  IF v_tenant_id IS NULL OR v_company_code IS NULL THEN
    RAISE EXCEPTION 'TENANT_CONTEXT_REQUIRED';
  END IF;

  IF p_payload IS NULL THEN
    RAISE EXCEPTION 'INVALID_PAYLOAD';
  END IF;

  v_header := p_payload->'order_header';
  v_items := p_payload->'items';
  v_payment := p_payload->'payment';

  IF v_header IS NULL OR jsonb_typeof(v_header) <> 'object'
     OR v_items IS NULL OR jsonb_typeof(v_items) <> 'array'
     OR jsonb_array_length(v_items) = 0 THEN
    RAISE EXCEPTION 'INVALID_PAYLOAD';
  END IF;

  v_payment_method := lower(coalesce(v_header->>'payment_method', 'cash'));
  IF v_payment_method NOT IN ('cash', 'upi', 'card', 'wallet', 'credit', 'mixed') THEN
    RAISE EXCEPTION 'INVALID_PAYMENT_METHOD';
  END IF;

  v_total_amount := coalesce((v_header->>'total_amount')::NUMERIC, 0);
  v_paid_amount := coalesce((v_payment->>'amount')::NUMERIC, v_total_amount);
  IF v_total_amount < 0 OR v_paid_amount < v_total_amount THEN
    RAISE EXCEPTION 'INSUFFICIENT_PAYMENT';
  END IF;

  IF nullif(v_header->>'user_id', '') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = (v_header->>'user_id')::BIGINT
        AND u.tenant_id = v_tenant_id
    ) THEN
      RAISE EXCEPTION 'INVALID_CUSTOMER';
    END IF;
  END IF;

  INSERT INTO public.orders (
    order_number, order_type, user_id, customer_name, user_mobile,
    delivery_address, subtotal, discount, delivery_charge, total_amount,
    payment_method, payment_status, order_status, tenant_id, company_code,
    created_at, updated_at
  ) VALUES (
    format('POS-%s-%s', to_char(clock_timestamp(), 'YYMMDDHH24MISS'), txid_current()),
    coalesce(v_header->>'order_type', 'pos_counter'),
    nullif(v_header->>'user_id', '')::BIGINT,
    v_header->>'customer_name',
    v_header->>'user_mobile',
    v_header->>'delivery_address',
    coalesce((v_header->>'subtotal')::NUMERIC, 0),
    coalesce((v_header->>'discount')::NUMERIC, 0),
    coalesce((v_header->>'delivery_charge')::NUMERIC, 0),
    v_total_amount,
    v_payment_method,
    'paid',
    coalesce(v_header->>'order_status', 'delivered'),
    v_tenant_id,
    v_company_code,
    now(), now()
  ) RETURNING id INTO v_new_order_id;

  FOR v_index IN 0..jsonb_array_length(v_items) - 1 LOOP
    v_item := v_items->v_index;
    v_product_id := nullif(v_item->>'product_id', '')::BIGINT;
    v_qty := coalesce((v_item->>'quantity')::NUMERIC, 0);
    v_rate := coalesce((v_item->>'rate')::NUMERIC, 0);
    v_item_total := coalesce((v_item->>'total')::NUMERIC, v_qty * v_rate);

    IF v_product_id IS NULL THEN
      RAISE EXCEPTION 'INVALID_PRODUCT';
    END IF;
    IF v_qty <= 0 OR v_rate < 0 THEN
      RAISE EXCEPTION 'INVALID_QUANTITY';
    END IF;

    SELECT coalesce(p.stock, 0)
      INTO v_old_stock
    FROM public.products p
    WHERE p.id = v_product_id
      AND p.tenant_id = v_tenant_id
      AND p.company_code = v_company_code
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'INVALID_PRODUCT';
    END IF;

    v_new_stock := v_old_stock - v_qty;
    IF v_new_stock < 0 THEN
      RAISE EXCEPTION 'INSUFFICIENT_STOCK';
    END IF;

    UPDATE public.products
    SET stock = v_new_stock, opstock = v_new_stock, updated_at = now()
    WHERE id = v_product_id
      AND tenant_id = v_tenant_id
      AND company_code = v_company_code;

    INSERT INTO public.order_items (
      order_id, product_id, product_name, quantity, qty, rate, price, total,
      tenant_id, company_code, created_at, updated_at
    ) VALUES (
      v_new_order_id, v_product_id, v_item->>'product_name',
      v_qty, v_qty, v_rate, v_rate, v_item_total,
      v_tenant_id, v_company_code, now(), now()
    );

    INSERT INTO public.inventory_logs (
      product_id, old_stock, new_stock, change_qty, change_type, reference_id,
      tenant_id, company_code, created_at, updated_at
    ) VALUES (
      v_product_id, v_old_stock, v_new_stock, v_qty, 'sold', v_new_order_id,
      v_tenant_id, v_company_code, now(), now()
    );
  END LOOP;

  INSERT INTO public.payment_transactions (
    tenant_id, company_code, order_id, user_id, transaction_type,
    payment_method, gateway, reference_number, amount, currency, status,
    processed_at, created_at, updated_at
  ) VALUES (
    v_tenant_id, v_company_code, v_new_order_id,
    nullif(v_header->>'user_id', '')::BIGINT, 'sale', v_payment_method,
    'manual', nullif(v_payment->>'reference_no', ''), v_paid_amount,
    'INR', 'completed', now(), now(), now()
  );

  RETURN v_new_order_id;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.place_order_atomic(JSONB) TO authenticated;

COMMIT;
