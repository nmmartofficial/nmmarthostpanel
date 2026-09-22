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

  -- Insert order header
  INSERT INTO public.orders (order_number, total_amount)
  VALUES (p_payload->'order_header'->>'order_number', (p_payload->'order_header'->>'total_amount')::DECIMAL)
  RETURNING id INTO v_order_id;

  -- Insert order items
  INSERT INTO public.order_items (order_id, product_id, quantity)
  SELECT v_order_id, (item->>'product_id')::BIGINT, (item->>'quantity')::DECIMAL
  FROM jsonb_array_elements(p_payload->'items') AS item;

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
