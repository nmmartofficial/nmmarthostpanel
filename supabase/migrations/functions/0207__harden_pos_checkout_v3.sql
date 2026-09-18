-- Migration 0207: Harden POS Checkout v3
-- 1. Add transaction_id to orders for idempotency
-- 2. Update place_order_atomic with GST calculations and idempotency

BEGIN;

-- Add transaction_id if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='orders' AND COLUMN_NAME='transaction_id') THEN
    ALTER TABLE public.orders ADD COLUMN transaction_id VARCHAR(100);
    CREATE UNIQUE INDEX idx_orders_transaction_id ON public.orders (transaction_id) WHERE transaction_id IS NOT NULL;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.place_order_atomic(p_payload JSONB)
RETURNS BIGINT AS $$
DECLARE
  v_header JSONB;
  v_items JSONB;
  v_payment JSONB;
  v_transaction_id TEXT;
  v_new_order_id BIGINT;
  v_auth_email TEXT := auth.email();
  v_tenant_id BIGINT;
  v_company_code TEXT;
  v_admin_user_id BIGINT;
  v_item JSONB;
  v_product_id BIGINT;
  v_qty NUMERIC;
  v_rate NUMERIC;
  v_item_total NUMERIC;
  v_item_gst_percent NUMERIC;
  v_item_gst_amount NUMERIC;
  v_old_stock NUMERIC;
  v_new_stock NUMERIC;
  v_payment_method TEXT;
  v_total_amount NUMERIC;
  v_calc_subtotal NUMERIC := 0;
  v_calc_total_gst NUMERIC := 0;
  v_calc_total_discount NUMERIC := 0;
  v_paid_amount NUMERIC;
  v_index INTEGER;
  v_order_number TEXT;
BEGIN
  -- 1. AUTH & CONTEXT
  IF v_auth_email IS NULL OR btrim(v_auth_email) = '' THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  SELECT au.id, au.tenant_id, au.company_code
    INTO v_admin_user_id, v_tenant_id, v_company_code
  FROM public.admin_users au
  WHERE lower(au.email) = lower(v_auth_email)
     OR lower(au.username) = lower(v_auth_email)
  LIMIT 1;

  IF v_tenant_id IS NULL OR v_company_code IS NULL THEN
    RAISE EXCEPTION 'TENANT_CONTEXT_REQUIRED';
  END IF;

  -- 2. PAYLOAD VALIDATION
  IF p_payload IS NULL THEN
    RAISE EXCEPTION 'INVALID_PAYLOAD';
  END IF;

  v_header := p_payload->'order_header';
  v_items := p_payload->'items';
  v_payment := p_payload->'payment';
  v_transaction_id := p_payload->>'transaction_id';

  IF v_header IS NULL OR jsonb_typeof(v_header) <> 'object'
     OR v_items IS NULL OR jsonb_typeof(v_items) <> 'array'
     OR jsonb_array_length(v_items) = 0 THEN
    RAISE EXCEPTION 'INVALID_PAYLOAD';
  END IF;

  -- 3. IDEMPOTENCY CHECK
  IF v_transaction_id IS NOT NULL THEN
    SELECT id INTO v_new_order_id FROM public.orders
    WHERE transaction_id = v_transaction_id AND tenant_id = v_tenant_id;
    IF v_new_order_id IS NOT NULL THEN
      RETURN v_new_order_id;
    END IF;
  END IF;

  -- 4. PRE-CALCULATION & VALIDATION
  v_payment_method := lower(coalesce(v_header->>'payment_method', 'cash'));
  IF v_payment_method NOT IN ('cash', 'upi', 'card', 'wallet', 'credit', 'mixed') THEN
    RAISE EXCEPTION 'INVALID_PAYMENT_METHOD';
  END IF;

  -- Verify Customer if provided
  IF nullif(v_header->>'user_id', '') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = (v_header->>'user_id')::BIGINT
        AND u.tenant_id = v_tenant_id
    ) THEN
      RAISE EXCEPTION 'INVALID_CUSTOMER';
    END IF;
  END IF;

  -- 5. CREATE ORDER HEADER
  v_order_number := format('POS-%s-%s', to_char(clock_timestamp(), 'YYMMDDHH24MISS'), floor(random()*8999+1000)::int);

  INSERT INTO public.orders (
    order_number, transaction_id, order_type, user_id, customer_name, user_mobile,
    delivery_address, subtotal, discount, delivery_charge,
    payment_method, payment_status, order_status,
    cashier_admin_user_id, tenant_id, company_code,
    created_at, updated_at
  ) VALUES (
    v_order_number, v_transaction_id,
    coalesce(v_header->>'order_type', 'pos_counter'),
    nullif(v_header->>'user_id', '')::BIGINT,
    v_header->>'customer_name',
    v_header->>'user_mobile',
    v_header->>'delivery_address',
    0, 0, 0, -- Placeholders for now
    v_payment_method, 'paid',
    coalesce(v_header->>'order_status', 'delivered'),
    v_admin_user_id, v_tenant_id, v_company_code,
    now(), now()
  ) RETURNING id INTO v_new_order_id;

  -- 6. PROCESS ITEMS
  FOR v_index IN 0..jsonb_array_length(v_items) - 1 LOOP
    v_item := v_items->v_index;
    v_product_id := nullif(v_item->>'product_id', '')::BIGINT;
    v_qty := coalesce((v_item->>'quantity')::NUMERIC, 0);
    v_rate := coalesce((v_item->>'rate')::NUMERIC, 0);

    IF v_product_id IS NULL THEN RAISE EXCEPTION 'INVALID_PRODUCT_AT_INDEX_%', v_index; END IF;
    IF v_qty <= 0 THEN RAISE EXCEPTION 'INVALID_QUANTITY_FOR_PRODUCT_%', v_product_id; END IF;

    -- Lock Product for Stock Update
    SELECT coalesce(p.stock, 0), p.gst_percent, p.hsn_code
      INTO v_old_stock, v_item_gst_percent, v_transaction_id -- reuse var
    FROM public.products p
    WHERE p.id = v_product_id AND p.tenant_id = v_tenant_id
    FOR UPDATE;

    IF NOT FOUND THEN RAISE EXCEPTION 'PRODUCT_NOT_FOUND_%', v_product_id; END IF;

    v_new_stock := v_old_stock - v_qty;
    IF v_new_stock < 0 THEN RAISE EXCEPTION 'INSUFFICIENT_STOCK_FOR_PRODUCT_%', v_product_id; END IF;

    -- Calculate Item GST
    v_item_gst_percent := coalesce((v_item->>'gst_percent')::NUMERIC, v_item_gst_percent, 0);
    v_item_gst_amount := (v_rate * v_qty * v_item_gst_percent) / 100;
    v_item_total := (v_rate * v_qty) + v_item_gst_amount;

    v_calc_subtotal := v_calc_subtotal + (v_rate * v_qty);
    v_calc_total_gst := v_calc_total_gst + v_item_gst_amount;

    -- Update Stock
    UPDATE public.products
    SET stock = v_new_stock, updated_at = now()
    WHERE id = v_product_id;

    -- Insert Order Item
    INSERT INTO public.order_items (
      order_id, product_id, product_name, hsn_code_snapshot,
      quantity, qty, rate, price, gst_percent, gst_amount, total,
      tenant_id, company_code, created_at, updated_at
    ) VALUES (
      v_new_order_id, v_product_id, v_item->>'product_name',
      v_item->>'hsn_code',
      v_qty, v_qty, v_rate, v_rate, v_item_gst_percent, v_item_gst_amount, v_item_total,
      v_tenant_id, v_company_code, now(), now()
    );

    -- Inventory Log
    INSERT INTO public.inventory_logs (
      product_id, old_stock, new_stock, change_qty, change_type, reference_id, reference_number,
      admin_user_id, tenant_id, company_code, created_at, updated_at
    ) VALUES (
      v_product_id, v_old_stock, v_new_stock, v_qty, 'sold', v_new_order_id, v_order_number,
      v_admin_user_id, v_tenant_id, v_company_code, now(), now()
    );
  END LOOP;

  -- 7. UPDATE HEADER TOTALS
  v_calc_total_discount := coalesce((v_header->>'discount')::NUMERIC, 0);
  v_total_amount := v_calc_subtotal + v_calc_total_gst + coalesce((v_header->>'delivery_charge')::NUMERIC, 0) - v_calc_total_discount;

  -- Round off
  v_paid_amount := round(v_total_amount);

  UPDATE public.orders SET
    subtotal = v_calc_subtotal,
    cgst_amount = v_calc_total_gst / 2,
    sgst_amount = v_calc_total_gst / 2,
    total_amount = v_paid_amount,
    round_off = v_paid_amount - v_total_amount,
    discount = v_calc_total_discount,
    delivery_charge = coalesce((v_header->>'delivery_charge')::NUMERIC, 0)
  WHERE id = v_new_order_id;

  -- 8. PAYMENT TRANSACTION
  v_paid_amount := coalesce((v_payment->>'amount')::NUMERIC, v_paid_amount);

  INSERT INTO public.payment_transactions (
    tenant_id, company_code, order_id, transaction_id, method,
    amount, status, admin_user_id, created_at, updated_at
  ) VALUES (
    v_tenant_id, v_company_code, v_new_order_id, nullif(v_payment->>'reference_no', ''),
    v_payment_method, v_paid_amount, 'success', v_admin_user_id, now(), now()
  );

  RETURN v_new_order_id;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.place_order_atomic(JSONB) TO authenticated;

COMMIT;
