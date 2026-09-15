BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";

-- ============================================================
-- RPC 1/4: verify_admin_pin (BOOLEAN)
-- ============================================================
CREATE OR REPLACE FUNCTION public.verify_admin_pin(p_pin TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_guc_pin TEXT; v_db_pin TEXT; v_match BOOLEAN;
BEGIN
  IF p_pin IS NULL THEN RETURN FALSE; END IF;
  BEGIN v_guc_pin := current_setting('app.admin_security_pin', true);
  EXCEPTION WHEN OTHERS THEN v_guc_pin := NULL; END;
  BEGIN SELECT value::TEXT INTO v_db_pin FROM public.app_config
        WHERE key = 'admin_security_pin' LIMIT 1;
  EXCEPTION WHEN OTHERS THEN v_db_pin := NULL; END;
  v_match := FALSE;
  IF v_guc_pin IS NOT NULL AND LENGTH(v_guc_pin) > 0 THEN
    v_match := v_match OR (v_guc_pin = p_pin);
  END IF;
  IF v_db_pin IS NOT NULL AND LENGTH(v_db_pin) > 0 THEN
    v_match := v_match OR (v_db_pin = p_pin);
  END IF;
  RETURN v_match;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
GRANT EXECUTE ON FUNCTION public.verify_admin_pin(TEXT) TO anon, authenticated, service_role;

-- ============================================================
-- RPC 2/4: verify_admin_password (JSONB — FIXED for AuthContext)
-- ============================================================
CREATE OR REPLACE FUNCTION public.verify_admin_password(
  p_username_or_email TEXT, p_password TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_row RECORD; v_ok BOOLEAN; v_hash TEXT;
BEGIN
  IF p_username_or_email IS NULL OR p_password IS NULL THEN
    RETURN jsonb_build_object('verified', FALSE, 'profile', NULL, 'error', 'missing_inputs');
  END IF;
  SELECT * INTO v_row FROM public.admin_users
    WHERE is_active = TRUE
      AND ( LOWER(username) = LOWER(TRIM(p_username_or_email))
         OR LOWER(email)    = LOWER(TRIM(p_username_or_email)) )
    LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('verified', FALSE, 'profile', NULL, 'error', 'user_not_found');
  END IF;
  v_hash := v_row.password_hash;
  IF v_hash IS NULL OR LENGTH(v_hash) = 0 THEN
    RETURN jsonb_build_object('verified', FALSE, 'profile', NULL, 'error', 'no_password_set');
  END IF;
  BEGIN v_ok := (v_hash = public.crypt(p_password, v_hash));
  EXCEPTION WHEN OTHERS THEN v_ok := FALSE; END;
  IF NOT v_ok THEN
    RETURN jsonb_build_object('verified', FALSE, 'profile', NULL, 'error', 'wrong_password');
  END IF;
  RETURN jsonb_build_object(
    'verified', TRUE,
    'profile', jsonb_build_object(
      'id',           v_row.id,
      'username',     v_row.username,
      'email',        COALESCE(v_row.email, ''),
      'name',         COALESCE(v_row.name, v_row.username),
      'role',         COALESCE(v_row.role, 'cashier'),
      'company_code', v_row.company_code,
      'tenant_id',    v_row.tenant_id,
      'is_active',    v_row.is_active,
      'status',       COALESCE(v_row.status, 'active'),
      'permissions',  COALESCE(v_row.permissions, '{}'::jsonb)
    )
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
GRANT EXECUTE ON FUNCTION public.verify_admin_password(TEXT, TEXT) TO anon, authenticated, service_role;

-- ============================================================
-- RPC 3/4: adjust_wallet_atomic (BOOLEAN)
-- ============================================================
CREATE OR REPLACE FUNCTION public.adjust_wallet_atomic(
  p_user_id BIGINT, p_amount NUMERIC, p_type TEXT, p_reason TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_tenant_id   BIGINT   := current_setting('app.current_tenant_id',    true)::BIGINT;
  v_company     TEXT     := current_setting('app.current_company_code', true);
  v_wallet_id   BIGINT;
  v_old_bal     NUMERIC  := 0;
  v_new_bal     NUMERIC;
  v_signed_amt  NUMERIC;
BEGIN
  IF p_user_id IS NULL OR p_amount IS NULL OR p_type IS NULL THEN RETURN FALSE; END IF;
  p_amount      := ABS(p_amount);
  v_signed_amt  := CASE WHEN LOWER(p_type) = 'debit' THEN -p_amount ELSE p_amount END;
  SELECT id, balance INTO v_wallet_id, v_old_bal FROM public.wallet_master
    WHERE (user_id = p_user_id OR customer_id = p_user_id)
      AND (tenant_id = v_tenant_id OR v_tenant_id IS NULL)
    ORDER BY id LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.wallet_master
        (user_id, customer_id, balance, is_active, tenant_id, company_code, created_at, updated_at)
    VALUES (p_user_id, p_user_id, 0, TRUE, v_tenant_id, SUBSTRING(v_company FROM 1 FOR 16), NOW(), NOW())
    RETURNING id, balance INTO v_wallet_id, v_old_bal;
  END IF;
  v_new_bal := COALESCE(v_old_bal, 0) + v_signed_amt;
  IF LOWER(p_type) = 'debit' AND v_new_bal < 0 THEN
    RAISE EXCEPTION 'Wallet overdraw denied: old=%, amount=%, new=%', v_old_bal, v_signed_amt, v_new_bal;
  END IF;
  UPDATE public.wallet_master SET balance = v_new_bal, updated_at = NOW() WHERE id = v_wallet_id;
  INSERT INTO public.wallet_transactions
      (wallet_id, user_id, amount, type, reason, reference_id, opening_balance, closing_balance,
       created_at, updated_at, tenant_id, company_code)
  VALUES
      (v_wallet_id, p_user_id, p_amount, LOWER(p_type), p_reason, NULL, COALESCE(v_old_bal,0), v_new_bal,
       NOW(), NOW(), v_tenant_id, SUBSTRING(v_company FROM 1 FOR 16));
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;
GRANT EXECUTE ON FUNCTION public.adjust_wallet_atomic(BIGINT, NUMERIC, TEXT, TEXT) TO anon, authenticated, service_role;

-- ============================================================
-- RPC 4/4: place_order_atomic (BIGINT)
-- ============================================================
CREATE OR REPLACE FUNCTION public.place_order_atomic(p_payload JSONB)
RETURNS BIGINT AS $$
DECLARE
  v_tenant_id   BIGINT   := current_setting('app.current_tenant_id',    true)::BIGINT;
  v_company     TEXT     := current_setting('app.current_company_code', true);
  v_header      JSONB; v_items JSONB; v_payment JSONB;
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
  IF p_payload IS NULL THEN RAISE EXCEPTION 'place_order_atomic: NULL payload'; END IF;
  v_header  := COALESCE(p_payload->'order_header', p_payload);
  v_items   := p_payload->'items';
  IF v_items IS NULL OR jsonb_typeof(v_items) <> 'array' THEN
    RAISE EXCEPTION 'place_order_atomic: items array missing in payload';
  END IF;
  INSERT INTO public.orders (
      order_number, order_type, user_id, customer_name, user_mobile, delivery_address, pincode,
      subtotal, discount, coupon_discount, delivery_charge, packaging_charge,
      cgst_amount, sgst_amount, igst_amount, cess_amount, round_off, total_amount,
      payment_method, payment_status, order_status, coupon_id, delivery_boy_id,
      cashier_admin_user_id, notes,
      tenant_id, company_code, created_at, updated_at
  ) VALUES (
      COALESCE(v_header->>'order_number', 'ORD'||EXTRACT(EPOCH FROM NOW())::BIGINT||(random()*999)::INT::TEXT),
      COALESCE(v_header->>'order_type',   'pos_counter'),
      (v_header->>'user_id')::BIGINT,
      v_header->>'customer_name',
      v_header->>'user_mobile',
      v_header->>'delivery_address',
      v_header->>'pincode',
      COALESCE((v_header->>'subtotal')::NUMERIC, 0),
      COALESCE((v_header->>'discount')::NUMERIC, 0),
      COALESCE((v_header->>'coupon_discount')::NUMERIC, 0),
      COALESCE((v_header->>'delivery_charge')::NUMERIC, 0),
      COALESCE((v_header->>'packaging_charge')::NUMERIC, 0),
      COALESCE((v_header->>'cgst_amount')::NUMERIC, 0),
      COALESCE((v_header->>'sgst_amount')::NUMERIC, 0),
      COALESCE((v_header->>'igst_amount')::NUMERIC, 0),
      COALESCE((v_header->>'cess_amount')::NUMERIC, 0),
      COALESCE((v_header->>'round_off')::NUMERIC, 0),
      COALESCE((v_header->>'total_amount')::NUMERIC, 0),
      COALESCE(v_header->>'payment_method', 'cash'),
      COALESCE(v_header->>'payment_status', 'pending'),
      COALESCE(v_header->>'order_status',   'pending'),
      (v_header->>'coupon_id')::BIGINT,
      (v_header->>'delivery_boy_id')::BIGINT,
      (v_header->>'cashier_admin_user_id')::BIGINT,
      v_header->>'notes',
      v_tenant_id,
      SUBSTRING(v_company FROM 1 FOR 16),
      NOW(), NOW()
  ) RETURNING id INTO v_new_order_id;
  v_item_len := jsonb_array_length(v_items);
  FOR v_item_idx IN 0..(v_item_len - 1) LOOP
    v_item         := v_items->v_item_idx;
    v_product_id   := (v_item->>'product_id')::BIGINT;
    v_qty          := COALESCE((v_item->>'quantity')::NUMERIC, (v_item->>'qty')::NUMERIC, 0);
    v_rate         := COALESCE((v_item->>'rate')::NUMERIC,     (v_item->>'price')::NUMERIC, 0);
    v_item_total   := COALESCE((v_item->>'total')::NUMERIC, v_qty * v_rate);
    v_product_name := v_item->>'product_name';
    IF v_product_id IS NULL OR v_qty <= 0 THEN CONTINUE; END IF;
    SELECT COALESCE(stock, 0) INTO v_old_stock FROM public.products
      WHERE id = v_product_id AND (tenant_id = v_tenant_id OR v_tenant_id IS NULL)
      FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product % not found (order_id=%)', v_product_id, v_new_order_id;
    END IF;
    v_new_stock := v_old_stock - v_qty;
    IF v_new_stock < 0 THEN
      RAISE EXCEPTION 'Out-of-Stock: product=%, qty_requested=%, available=%',
                       v_product_id, v_qty, v_old_stock;
    END IF;
    UPDATE public.products SET stock = v_new_stock, updated_at = NOW() WHERE id = v_product_id;
    INSERT INTO public.inventory_logs
        (product_id, old_stock, new_stock, change_qty, change_type, reference_id,
         created_at, updated_at, tenant_id, company_code)
    VALUES
        (v_product_id, v_old_stock, v_new_stock, v_qty, 'sold', v_new_order_id,
         NOW(), NOW(), v_tenant_id, SUBSTRING(v_company FROM 1 FOR 16));
    INSERT INTO public.order_items
        (order_id, product_id, product_name, quantity, qty, rate, price, total,
         created_at, updated_at, tenant_id, company_code)
    VALUES
        (v_new_order_id, v_product_id, v_product_name, v_qty, v_qty, v_rate, v_rate, v_item_total,
         NOW(), NOW(), v_tenant_id, SUBSTRING(v_company FROM 1 FOR 16));
  END LOOP;
  RETURN v_new_order_id;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;
GRANT EXECUTE ON FUNCTION public.place_order_atomic(JSONB) TO anon, authenticated, service_role;

COMMIT;
