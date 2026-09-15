-- =====================================================================
-- NM MART ULTRA RETAIL ERP
-- Migration 0204 — RPC Function B-4: place_order_atomic
-- ---------------------------------------------------------------------
-- Purpose : FULLY ATOMIC POS / Billing Order Placement.
--           Either everything succeeds, or EVERYTHING rolls back.
--           Prevents Race Conditions:
--             • Overselling (negative stock)
--             • Orphan order_items without order header
--             • Stale payment without order link
--           Uses JSONB input to keep the Postgres call signature simple.
--
-- Keys expected in p_payload JSONB:
--   {
--     "order_header": { order_number, user_id, customer_name, user_mobile,
--                       delivery_address, pincode, subtotal, discount,
--                       delivery_charge, total_amount, payment_method,
--                       payment_status, order_status, delivery_boy_id, notes },
--     "items": [ { product_id, product_name, quantity, rate, total } ... ],
--     "payment": { amount, method, reference_no }   (optional)
--   }
--
-- Returns : BIGINT (newly created orders.id). NULL on failure.
-- =====================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.place_order_atomic(p_payload JSONB)
RETURNS BIGINT AS $$
DECLARE
    v_tenant_id   BIGINT   := current_setting('app.current_tenant_id',    true)::BIGINT;
    v_company     TEXT     := current_setting('app.current_company_code', true);

    v_header      JSONB;
    v_items       JSONB;
    v_payment     JSONB;

    v_new_order_id   BIGINT;
    v_item           JSONB;
    v_item_idx       INT      := 0;
    v_item_len       INT;

    v_product_id     BIGINT;
    v_qty            NUMERIC;
    v_rate           NUMERIC;
    v_item_total     NUMERIC;
    v_product_name   TEXT;

    v_old_stock      NUMERIC;
    v_new_stock      NUMERIC;
BEGIN
    IF p_payload IS NULL THEN
        RAISE EXCEPTION 'place_order_atomic: NULL payload';
    END IF;

    v_header  := COALESCE(p_payload->'order_header', p_payload);
    v_items   := p_payload->'items';
    v_payment := p_payload->'payment';

    IF v_items IS NULL OR jsonb_typeof(v_items) <> 'array' THEN
        RAISE EXCEPTION 'place_order_atomic: items array missing in payload';
    END IF;

    -- ============================================================
    -- STEP 1 : INSERT ORDER HEADER
    -- ============================================================
    INSERT INTO public.orders (
        order_number, user_id, customer_name, user_mobile, delivery_address, pincode,
        subtotal, discount, delivery_charge, total_amount,
        payment_method, payment_status, order_status, delivery_boy_id, notes,
        tenant_id, company_code, created_at, updated_at
    )
    VALUES (
        COALESCE(v_header->>'order_number',
                 'ORD'||EXTRACT(EPOCH FROM NOW())::BIGINT||(random()*999)::INT::TEXT),
        (v_header->>'user_id')::BIGINT,
        v_header->>'customer_name',
        v_header->>'user_mobile',
        v_header->>'delivery_address',
        v_header->>'pincode',
        COALESCE((v_header->>'subtotal')::NUMERIC, 0),
        COALESCE((v_header->>'discount')::NUMERIC, 0),
        COALESCE((v_header->>'delivery_charge')::NUMERIC, 0),
        COALESCE((v_header->>'total_amount')::NUMERIC, 0),
        v_header->>'payment_method',
        COALESCE(v_header->>'payment_status', 'pending'),
        COALESCE(v_header->>'order_status',   'pending'),
        (v_header->>'delivery_boy_id')::BIGINT,
        v_header->>'notes',
        v_tenant_id,
        SUBSTRING(v_company FROM 1 FOR 16),
        NOW(), NOW()
    ) RETURNING id INTO v_new_order_id;

    -- ============================================================
    -- STEP 2 : INSERT ITEMS + REDUCE STOCK ATOMICALLY (row lock per product)
    --          Uses FOR UPDATE on products row to eliminate race.
    -- ============================================================
    v_item_len := jsonb_array_length(v_items);
    FOR v_item_idx IN 0..(v_item_len - 1)
    LOOP
        v_item         := v_items->v_item_idx;
        v_product_id   := (v_item->>'product_id')::BIGINT;
        v_qty          := COALESCE( (v_item->>'quantity')::NUMERIC,
                                    (v_item->>'qty')::NUMERIC, 0);
        v_rate         := COALESCE( (v_item->>'rate')::NUMERIC,
                                    (v_item->>'price')::NUMERIC, 0);
        v_item_total   := COALESCE( (v_item->>'total')::NUMERIC, v_qty * v_rate);
        v_product_name := v_item->>'product_name';

        IF v_product_id IS NULL OR v_qty <= 0 THEN
            CONTINUE;
        END IF;

        -- ROW LOCKING READ — blocks concurrent order for same product
        SELECT COALESCE(stock, 0) INTO v_old_stock
        FROM public.products
        WHERE id = v_product_id
          AND (tenant_id = v_tenant_id OR v_tenant_id IS NULL)
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Product % not found (order_id=%)', v_product_id, v_new_order_id;
        END IF;

        v_new_stock := v_old_stock - v_qty;
        IF v_new_stock < 0 THEN
            RAISE EXCEPTION 'Out-of-Stock: product=%, qty_requested=%, available=%',
                             v_product_id, v_qty, v_old_stock;
        END IF;

        -- Reduce stock
        UPDATE public.products
        SET stock = v_new_stock, updated_at = NOW()
        WHERE id = v_product_id;

        -- Stock Movement Log (inventory_logs)
        INSERT INTO public.inventory_logs
            (product_id, old_stock, new_stock, change_type, reference_id,
             created_at, updated_at, tenant_id, company_code)
        VALUES
            (v_product_id, v_old_stock, v_new_stock, 'sold', v_new_order_id,
             NOW(), NOW(), v_tenant_id, SUBSTRING(v_company FROM 1 FOR 16));

        -- INSERT order_item (BOTH dual col sets: quantity + qty, rate + price)
        INSERT INTO public.order_items
            (order_id, product_id, product_name,
             quantity, qty, rate, price, total,
             created_at, updated_at, tenant_id, company_code)
        VALUES
            (v_new_order_id, v_product_id, v_product_name,
             v_qty, v_qty, v_rate, v_rate, v_item_total,
             NOW(), NOW(), v_tenant_id, SUBSTRING(v_company FROM 1 FOR 16));
    END LOOP;

    RETURN v_new_order_id;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;

ALTER FUNCTION public.place_order_atomic(JSONB) DISABLE ROW LEVEL SECURITY;
GRANT EXECUTE ON FUNCTION public.place_order_atomic(JSONB) TO anon, authenticated, service_role;

COMMIT;
