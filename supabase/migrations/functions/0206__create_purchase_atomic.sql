-- Create Purchase Atomic RPC Function
CREATE OR REPLACE FUNCTION public.create_purchase_atomic(p_payload JSONB)
RETURNS JSONB AS $$
DECLARE
  v_purchase_id BIGINT;
  v_item JSONB;
  v_product_id BIGINT;
  v_qty DECIMAL;
BEGIN
  -- Insert purchases
  INSERT INTO public.purchases (supplier_id, invoice_number, total_amount)
  VALUES ((p_payload->'purchase_header'->>'supplier_id')::BIGINT, p_payload->'purchase_header'->>'invoice_number', (p_payload->'purchase_header'->>'total_amount')::DECIMAL)
  RETURNING id INTO v_purchase_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_payload->'items') LOOP
    v_product_id := (v_item->>'product_id')::BIGINT;
    v_qty := (v_item->>'quantity')::DECIMAL;

    IF v_product_id IS NULL THEN
      RAISE EXCEPTION 'INVALID_PRODUCT';
    END IF;
    IF v_qty <= 0 THEN
      RAISE EXCEPTION 'INVALID_QUANTITY';
    END IF;

    -- Lock stock row
    PERFORM stock FROM public.products WHERE id = v_product_id FOR UPDATE;

    -- Update products stock
    UPDATE public.products SET stock = stock + v_qty WHERE id = v_product_id;

    -- Insert purchase items
    INSERT INTO public.purchase_items (purchase_id, product_id, quantity)
    VALUES (v_purchase_id, v_product_id, v_qty);

    -- Insert inventory logs
    INSERT INTO public.inventory_logs (product_id, change_qty)
    VALUES (v_product_id, v_qty);
  END LOOP;

  RETURN jsonb_build_object('purchase_id', v_purchase_id);
END;
$$ LANGUAGE plpgsql;
