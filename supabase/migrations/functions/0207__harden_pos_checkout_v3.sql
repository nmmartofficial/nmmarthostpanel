-- Harden POS Checkout v3 RPC Function
CREATE OR REPLACE FUNCTION public.place_order_atomic(p_payload JSONB)
RETURNS BIGINT AS $$
DECLARE
  v_order_id BIGINT;
  v_item JSONB;
  v_product_id BIGINT;
  v_qty DECIMAL;
  v_current_stock DECIMAL;
BEGIN
  -- Lock stock rows
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_payload->'items') LOOP
    v_product_id := (v_item->>'product_id')::BIGINT;
    v_qty := (v_item->>'quantity')::DECIMAL;

    SELECT stock INTO v_current_stock FROM public.products WHERE id = v_product_id FOR UPDATE;
    IF v_current_stock < v_qty THEN
      RAISE EXCEPTION 'INSUFFICIENT_STOCK';
    END IF;
  END LOOP;

  -- Insert order header with canonical customer/order metadata so the admin list can display names.
  INSERT INTO public.orders (
    order_number,
    order_type,
    user_id,
    customer_name,
    user_mobile,
    customer_phone,
    delivery_address,
    subtotal,
    discount,
    delivery_charge,
    total_amount,
    payment_method,
    payment_status,
    order_status,
    created_at,
    updated_at,
    status
  )
  VALUES (
    COALESCE(p_payload->'order_header'->>'order_number', 'POS-' || gen_random_uuid()::text),
    COALESCE(p_payload->'order_header'->>'order_type', 'pos_counter'),
    NULLIF(p_payload->'order_header'->>'user_id', '')::BIGINT,
    COALESCE(NULLIF(p_payload->'order_header'->>'customer_name', ''), 'Walk-in Customer'),
    NULLIF(p_payload->'order_header'->>'user_mobile', ''),
    NULLIF(p_payload->'order_header'->>'customer_phone', ''),
    NULLIF(p_payload->'order_header'->>'delivery_address', ''),
    COALESCE((p_payload->'order_header'->>'subtotal')::DECIMAL, 0),
    COALESCE((p_payload->'order_header'->>'discount')::DECIMAL, 0),
    COALESCE((p_payload->'order_header'->>'delivery_charge')::DECIMAL, 0),
    COALESCE((p_payload->'order_header'->>'total_amount')::DECIMAL, 0),
    COALESCE(NULLIF(p_payload->'order_header'->>'payment_method', ''), 'cash'),
    COALESCE(NULLIF(p_payload->'order_header'->>'payment_status', ''), 'paid'),
    COALESCE(NULLIF(p_payload->'order_header'->>'order_status', ''), 'pending'),
    NOW(),
    NOW(),
    COALESCE(NULLIF(p_payload->'order_header'->>'order_status', ''), 'pending')
  )
  RETURNING id INTO v_order_id;

  -- Insert order items with immutable product snapshots for admin receipts and history.
  INSERT INTO public.order_items (
    order_id,
    product_id,
    product_name,
    quantity,
    qty,
    rate,
    price,
    gst_percent,
    gst_amount,
    total
  )
  SELECT
    v_order_id,
    (item->>'product_id')::BIGINT,
    COALESCE(NULLIF(item->>'product_name', ''), product.name),
    (item->>'quantity')::DECIMAL,
    (item->>'quantity')::DECIMAL,
    COALESCE((item->>'rate')::DECIMAL, 0),
    COALESCE((item->>'rate')::DECIMAL, 0),
    COALESCE((item->>'gst_percent')::DECIMAL, 0),
    COALESCE((item->>'gst_amount')::DECIMAL, 0),
    COALESCE((item->>'total')::DECIMAL, (item->>'rate')::DECIMAL * (item->>'quantity')::DECIMAL, 0)
  FROM jsonb_array_elements(p_payload->'items') AS item
  JOIN public.products AS product ON product.id = (item->>'product_id')::BIGINT;

  -- Insert inventory logs
  INSERT INTO public.inventory_logs (product_id, change_qty)
  SELECT (item->>'product_id')::BIGINT, -(item->>'quantity')::DECIMAL
  FROM jsonb_array_elements(p_payload->'items') AS item;

  -- Insert payment transactions
  INSERT INTO public.payment_transactions (order_id, amount)
  VALUES (v_order_id, (p_payload->'payment'->>'amount')::DECIMAL);

  RETURN v_order_id;
END;
$$ LANGUAGE plpgsql;
