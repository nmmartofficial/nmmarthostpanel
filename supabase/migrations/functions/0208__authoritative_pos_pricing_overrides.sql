CREATE OR REPLACE FUNCTION public.authorize_pos_override(
  p_action_type TEXT,
  p_product_id BIGINT,
  p_original_value NUMERIC,
  p_requested_value NUMERIC,
  p_tenant_id UUID,
  p_company_code TEXT,
  p_reason TEXT,
  p_remarks TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_admin public.admin_users%ROWTYPE;
  v_product public.products%ROWTYPE;
  v_original_price NUMERIC;
  v_approval_id UUID;
BEGIN
  IF auth.uid() IS NULL OR p_tenant_id IS NULL OR NULLIF(BTRIM(p_company_code), '') IS NULL THEN
    RAISE EXCEPTION 'POS_MANAGER_AUTHORIZATION_REQUIRED';
  END IF;

  SELECT *
    INTO v_admin
    FROM public.admin_users AS admin_user
   WHERE admin_user.auth_user_id = auth.uid()
     AND admin_user.tenant_id = p_tenant_id
     AND admin_user.company_code = p_company_code
     AND admin_user.is_active IS TRUE
     AND LOWER(COALESCE(admin_user.status, '')) = 'active'
     AND LOWER(COALESCE(admin_user.role, '')) IN ('admin', 'manager')
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'POS_MANAGER_AUTHORIZATION_REQUIRED';
  END IF;

  IF NULLIF(BTRIM(p_reason), '') IS NULL THEN
    RAISE EXCEPTION 'POS_OVERRIDE_REASON_REQUIRED';
  END IF;

  IF p_action_type = 'price_override' THEN
    IF p_product_id IS NULL OR p_original_value IS NULL OR p_requested_value IS NULL
       OR p_requested_value < 0
       OR p_original_value::TEXT IN ('NaN', 'Infinity', '-Infinity')
       OR p_requested_value::TEXT IN ('NaN', 'Infinity', '-Infinity') THEN
      RAISE EXCEPTION 'INVALID_POS_PRICE_OVERRIDE';
    END IF;

    SELECT *
      INTO v_product
      FROM public.products AS product
     WHERE product.id = p_product_id
       AND product.tenant_id = p_tenant_id
       AND product.company_code = p_company_code
     FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'POS_PRODUCT_NOT_FOUND_IN_STORE';
    END IF;

    v_original_price := CASE
      WHEN v_product.onlinerate IS NOT NULL AND v_product.onlinerate <> 0
        THEN v_product.onlinerate
      WHEN v_product.sale_rate IS NOT NULL THEN v_product.sale_rate
      WHEN v_product.onlinerate = 0 THEN 0
      ELSE NULL
    END;

    IF v_original_price IS NULL
       OR ABS(v_original_price - p_original_value) > 0.01 THEN
      RAISE EXCEPTION 'POS_PRICE_CHANGED_RELOAD_PRODUCT';
    END IF;
  ELSIF p_action_type = 'high_discount_pct' THEN
    IF p_original_value IS NULL OR p_original_value < 0
       OR p_requested_value IS NULL OR p_requested_value <= 20
       OR p_requested_value > 100 THEN
      RAISE EXCEPTION 'INVALID_POS_DISCOUNT_OVERRIDE';
    END IF;
  ELSIF p_action_type = 'high_discount_flat' THEN
    IF p_original_value IS NULL OR p_original_value < 0
       OR p_requested_value IS NULL OR p_requested_value <= 500
       OR p_requested_value > p_original_value THEN
      RAISE EXCEPTION 'INVALID_POS_DISCOUNT_OVERRIDE';
    END IF;
  ELSIF p_action_type = 'void_sale' THEN
    IF p_product_id IS NOT NULL THEN
      RAISE EXCEPTION 'INVALID_POS_VOID_OVERRIDE';
    END IF;
  ELSE
    RAISE EXCEPTION 'UNSUPPORTED_POS_OVERRIDE_ACTION';
  END IF;

  INSERT INTO public.pos_override_approvals (
    auth_user_id,
    admin_user_id,
    tenant_id,
    company_code,
    action_type,
    product_id,
    original_value,
    requested_value,
    reason,
    remarks,
    status,
    consumed_at
  )
  VALUES (
    auth.uid(),
    v_admin.id,
    p_tenant_id,
    p_company_code,
    p_action_type,
    p_product_id,
    p_original_value,
    p_requested_value,
    LEFT(BTRIM(p_reason), 200),
    NULLIF(LEFT(BTRIM(COALESCE(p_remarks, '')), 500), ''),
    CASE WHEN p_action_type = 'void_sale' THEN 'consumed' ELSE 'approved' END,
    CASE WHEN p_action_type = 'void_sale' THEN NOW() ELSE NULL END
  )
  RETURNING id INTO v_approval_id;

  RETURN v_approval_id;
END;
$$;

REVOKE ALL ON FUNCTION public.authorize_pos_override(
  TEXT, BIGINT, NUMERIC, NUMERIC, UUID, TEXT, TEXT, TEXT
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.authorize_pos_override(
  TEXT, BIGINT, NUMERIC, NUMERIC, UUID, TEXT, TEXT, TEXT
) TO authenticated;

CREATE OR REPLACE FUNCTION public.place_order_atomic(p_payload JSONB)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_header JSONB := COALESCE(p_payload->'order_header', '{}'::JSONB);
  v_item JSONB;
  v_line JSONB;
  v_prepared_lines JSONB := '[]'::JSONB;
  v_candidates JSONB := '[]'::JSONB;
  v_candidate_items JSONB;
  v_best_promotion JSONB;
  v_promotion JSONB := p_payload->'promotion';
  v_product public.products%ROWTYPE;
  v_admin public.admin_users%ROWTYPE;
  v_coupon public.coupons%ROWTYPE;
  v_offer RECORD;
  v_product_id BIGINT;
  v_customer_id BIGINT;
  v_order_id BIGINT;
  v_shift_id BIGINT;
  v_tenant_id UUID;
  v_stock_update_count BIGINT;
  v_company_code TEXT;
  v_gst_mode TEXT;
  v_gst_config_count BIGINT;
  v_quantity NUMERIC;
  v_stock NUMERIC;
  v_rate NUMERIC;
  v_base_rate NUMERIC;
  v_gst_percent NUMERIC;
  v_subtotal NUMERIC := 0;
  v_client_subtotal NUMERIC;
  v_delivery_charge NUMERIC := 0;
  v_delivery_percent NUMERIC := 0;
  v_manual_type TEXT;
  v_manual_value NUMERIC := 0;
  v_manual_discount NUMERIC := 0;
  v_points_discount NUMERIC := 0;
  v_promotion_discount NUMERIC := 0;
  v_total_discount NUMERIC := 0;
  v_global_discount NUMERIC := 0;
  v_total_gst NUMERIC := 0;
  v_client_total_gst NUMERIC;
  v_raw_total NUMERIC;
  v_expected_total NUMERIC;
  v_expected_round_off NUMERIC;
  v_client_total NUMERIC;
  v_client_round_off NUMERIC;
  v_payment_amount NUMERIC;
  v_coupon_code TEXT;
  v_target_type TEXT;
  v_target_id TEXT;
  v_offer_type TEXT;
  v_discount_value NUMERIC;
  v_buy_qty NUMERIC;
  v_get_qty NUMERIC;
  v_eligible_total NUMERIC;
  v_candidate_discount NUMERIC;
  v_line_discount NUMERIC;
  v_allocated_discount NUMERIC;
  v_allocated_so_far NUMERIC;
  v_after_promotion NUMERIC;
  v_remaining_gross NUMERIC;
  v_net_amount NUMERIC;
  v_taxable_amount NUMERIC;
  v_line_gst NUMERIC;
  v_line_index BIGINT;
  v_last_eligible_index BIGINT;
  v_used_count BIGINT;
  v_usage_count BIGINT;
  v_customer_usage_count BIGINT;
  v_approval_ids UUID[] := ARRAY[]::UUID[];
  v_price_override_id UUID;
  v_discount_override_id UUID;
  v_payment_method TEXT;
  v_target_matches BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'POS_AUTHENTICATION_REQUIRED';
  END IF;

  IF jsonb_typeof(p_payload->'items') IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'POS_CART_EMPTY';
  END IF;
  IF jsonb_array_length(p_payload->'items') = 0 THEN
    RAISE EXCEPTION 'POS_CART_EMPTY';
  END IF;

  v_tenant_id := NULLIF(v_header->>'tenant_id', '')::UUID;
  v_company_code := NULLIF(BTRIM(v_header->>'company_code'), '');
  IF v_tenant_id IS NULL OR v_company_code IS NULL THEN
    RAISE EXCEPTION 'POS_STORE_SCOPE_REQUIRED';
  END IF;

  SELECT *
    INTO v_admin
    FROM public.admin_users AS admin_user
   WHERE admin_user.auth_user_id = auth.uid()
     AND admin_user.tenant_id = v_tenant_id
     AND admin_user.company_code = v_company_code
     AND admin_user.is_active IS TRUE
     AND LOWER(COALESCE(admin_user.status, '')) = 'active'
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'POS_CASHIER_NOT_AUTHORIZED_FOR_STORE';
  END IF;

  IF LOWER(BTRIM(COALESCE(v_admin.role, ''))) NOT IN (
    'super_admin',
    'admin',
    'manager',
    'cashier'
  ) THEN
    RAISE EXCEPTION 'POS_ROLE_NOT_AUTHORIZED';
  END IF;

  SELECT shift.id
    INTO v_shift_id
    FROM public.pos_cashier_shifts AS shift
   WHERE shift.admin_user_id = v_admin.id
     AND shift.tenant_id = v_tenant_id
     AND shift.company_code = v_company_code
     AND shift.status = 'open'
   FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'POS_CASHIER_SHIFT_REQUIRED';
  END IF;

  SELECT COUNT(*), MAX(config.value)
    INTO v_gst_config_count, v_gst_mode
    FROM public.app_config AS config
   WHERE config.tenant_id = v_tenant_id
     AND config.company_code = v_company_code
     AND config.key = 'pos_gst_pricing_mode'
     AND config.is_active IS TRUE;

  IF v_gst_config_count <> 1 OR LOWER(BTRIM(COALESCE(v_gst_mode, ''))) <> 'inclusive' THEN
    RAISE EXCEPTION 'POS_GST_CONFIGURATION_REQUIRED';
  END IF;
  v_gst_mode := LOWER(BTRIM(v_gst_mode));

  v_payment_method := LOWER(COALESCE(v_header->>'payment_method', 'cash'));
  IF v_payment_method NOT IN ('cash', 'upi', 'card', 'wallet', 'credit', 'mixed') THEN
    RAISE EXCEPTION 'INVALID_PAYMENT_METHOD';
  END IF;

  v_customer_id := NULLIF(v_header->>'user_id', '')::BIGINT;
  IF v_customer_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
      FROM public.users AS customer
     WHERE customer.id = v_customer_id
       AND customer.tenant_id = v_tenant_id
       AND customer.company_code = v_company_code
       AND customer.is_active IS TRUE
  ) THEN
    RAISE EXCEPTION 'POS_CUSTOMER_NOT_FOUND_IN_STORE';
  END IF;

  FOR v_item IN
    SELECT item
      FROM jsonb_array_elements(p_payload->'items') AS items(item)
  LOOP
    v_product_id := NULLIF(v_item->>'product_id', '')::BIGINT;
    v_quantity := NULLIF(v_item->>'quantity', '')::NUMERIC;
    v_rate := NULLIF(v_item->>'rate', '')::NUMERIC;

    IF v_product_id IS NULL OR v_quantity IS NULL OR v_quantity <= 0
       OR v_rate IS NULL OR v_rate < 0
       OR v_quantity::TEXT IN ('NaN', 'Infinity', '-Infinity')
       OR v_rate::TEXT IN ('NaN', 'Infinity', '-Infinity') THEN
      RAISE EXCEPTION 'INVALID_POS_ITEM';
    END IF;

    IF EXISTS (
      SELECT 1
        FROM jsonb_array_elements(v_prepared_lines) AS existing(line)
       WHERE existing.line->>'product_id' = v_product_id::TEXT
    ) THEN
      RAISE EXCEPTION 'DUPLICATE_POS_PRODUCT_LINE';
    END IF;

    SELECT *
      INTO v_product
      FROM public.products AS product
     WHERE product.id = v_product_id
       AND product.tenant_id = v_tenant_id
       AND product.company_code = v_company_code
     FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'POS_PRODUCT_NOT_FOUND_IN_STORE';
    END IF;

    v_stock := COALESCE(v_product.stock, 0);
    IF v_stock < v_quantity THEN
      RAISE EXCEPTION 'INSUFFICIENT_STOCK';
    END IF;

    v_base_rate := CASE
      WHEN v_product.onlinerate IS NOT NULL AND v_product.onlinerate <> 0
        THEN v_product.onlinerate
      WHEN v_product.sale_rate IS NOT NULL THEN v_product.sale_rate
      WHEN v_product.onlinerate = 0 THEN 0
      ELSE NULL
    END;
    IF v_base_rate IS NULL THEN
      RAISE EXCEPTION 'POS_PRODUCT_PRICE_REQUIRED';
    END IF;

    v_price_override_id := NULLIF(v_item->>'override_approval_id', '')::UUID;
    IF ABS(v_rate - v_base_rate) > 0.01 OR v_price_override_id IS NOT NULL THEN
      IF v_price_override_id IS NULL OR NOT EXISTS (
        SELECT 1
          FROM public.pos_override_approvals AS approval
         WHERE approval.id = v_price_override_id
           AND approval.auth_user_id = auth.uid()
           AND approval.tenant_id = v_tenant_id
           AND approval.company_code = v_company_code
           AND approval.action_type = 'price_override'
           AND approval.product_id = v_product_id
           AND ABS(approval.original_value - v_base_rate) <= 0.01
           AND ABS(approval.requested_value - v_rate) <= 0.01
           AND approval.status = 'approved'
           AND approval.expires_at > NOW()
      ) THEN
        RAISE EXCEPTION 'POS_PRICE_OVERRIDE_APPROVAL_REQUIRED';
      END IF;
      v_approval_ids := array_append(v_approval_ids, v_price_override_id);
    END IF;

    v_gst_percent := v_product.gst_percent;
    IF v_gst_percent IS NULL OR v_gst_percent < 0
       OR v_gst_percent::TEXT IN ('NaN', 'Infinity', '-Infinity') THEN
      RAISE EXCEPTION 'POS_GST_RATE_REQUIRED';
    END IF;

    v_subtotal := v_subtotal + (v_rate * v_quantity);
    v_prepared_lines := v_prepared_lines || jsonb_build_array(jsonb_build_object(
      'product_id', v_product_id,
      'product_name', COALESCE(NULLIF(v_product.name, ''), 'Product'),
      'quantity', v_quantity,
      'rate', v_rate,
      'gst_percent', v_gst_percent,
      'gross', v_rate * v_quantity,
      'category_id', v_product.category_id,
      'subcategory_id', v_product.subcategory_id,
      'hsn_code', v_product.hsn_code
    ));
  END LOOP;

  v_client_subtotal := NULLIF(v_header->>'subtotal', '')::NUMERIC;
  IF v_client_subtotal IS NULL OR ABS(v_client_subtotal - v_subtotal) > 0.01 THEN
    RAISE EXCEPTION 'POS_SUBTOTAL_MISMATCH';
  END IF;

  v_delivery_percent := COALESCE(
    NULLIF(v_header->>'delivery_charge_percent', '')::NUMERIC,
    0
  );
  v_delivery_charge := v_subtotal * v_delivery_percent / 100;
  IF v_delivery_percent < 0
     OR v_delivery_percent::TEXT IN ('NaN', 'Infinity', '-Infinity')
     OR ABS(
       COALESCE(NULLIF(v_header->>'delivery_charge', '')::NUMERIC, 0)
       - ROUND(v_delivery_charge, 2)
     ) > 0.01 THEN
    RAISE EXCEPTION 'INVALID_POS_DELIVERY_CHARGE';
  END IF;

  v_manual_type := LOWER(COALESCE(v_header->>'manual_discount_type', ''));
  v_manual_value := COALESCE(NULLIF(v_header->>'manual_discount_value', '')::NUMERIC, 0);
  IF v_manual_value < 0
     OR v_manual_value::TEXT IN ('NaN', 'Infinity', '-Infinity') THEN
    RAISE EXCEPTION 'INVALID_POS_MANUAL_DISCOUNT';
  END IF;
  IF v_manual_type IN ('percentage', 'percent') THEN
    IF v_manual_value > 100 THEN
      RAISE EXCEPTION 'INVALID_POS_MANUAL_DISCOUNT';
    END IF;
    v_manual_discount := v_subtotal * v_manual_value / 100;
  ELSIF v_manual_type IN ('flat', 'fixed') THEN
    IF v_manual_value > v_subtotal THEN
      RAISE EXCEPTION 'INVALID_POS_MANUAL_DISCOUNT';
    END IF;
    v_manual_discount := v_manual_value;
  ELSIF v_manual_type = '' AND v_manual_value = 0 THEN
    v_manual_discount := 0;
  ELSE
    RAISE EXCEPTION 'INVALID_POS_MANUAL_DISCOUNT';
  END IF;

  v_points_discount := COALESCE(NULLIF(v_header->>'points_discount', '')::NUMERIC, 0);
  IF v_points_discount <> 0 THEN
    RAISE EXCEPTION 'POS_POINTS_REDEMPTION_NOT_AUTHORIZED';
  END IF;

  v_coupon_code := UPPER(BTRIM(COALESCE(p_payload->>'coupon_code', '')));
  IF v_coupon_code <> '' THEN
    SELECT *
      INTO v_coupon
      FROM public.coupons AS coupon
     WHERE UPPER(coupon.code) = v_coupon_code
       AND coupon.tenant_id = v_tenant_id
       AND coupon.company_code = v_company_code
     FOR UPDATE;

    IF NOT FOUND OR v_coupon.is_active IS NOT TRUE
       OR (NULLIF(v_coupon.valid_from::TEXT, '') IS NOT NULL
           AND NULLIF(v_coupon.valid_from::TEXT, '')::DATE > CURRENT_DATE)
       OR (NULLIF(v_coupon.valid_to::TEXT, '') IS NOT NULL
           AND NULLIF(v_coupon.valid_to::TEXT, '')::DATE < CURRENT_DATE)
       OR COALESCE(v_coupon.min_order_amount, 0) > v_subtotal THEN
      RAISE EXCEPTION 'POS_COUPON_NOT_ELIGIBLE';
    END IF;

    SELECT COUNT(*)
      INTO v_usage_count
      FROM public.orders AS existing_order
     WHERE existing_order.tenant_id = v_tenant_id
       AND existing_order.company_code = v_company_code
       AND existing_order.coupon_id = v_coupon.id;
    v_used_count := GREATEST(COALESCE(v_coupon.used_count, 0), v_usage_count);
    IF v_coupon.usage_limit IS NOT NULL AND v_coupon.usage_limit > 0
       AND v_used_count >= v_coupon.usage_limit THEN
      RAISE EXCEPTION 'POS_COUPON_USAGE_LIMIT_REACHED';
    END IF;

    IF v_coupon.per_user_limit IS NOT NULL AND v_coupon.per_user_limit > 0 THEN
      IF v_customer_id IS NULL THEN
        RAISE EXCEPTION 'POS_COUPON_CUSTOMER_REQUIRED';
      END IF;
      SELECT COUNT(*)
        INTO v_customer_usage_count
        FROM public.orders AS existing_order
       WHERE existing_order.tenant_id = v_tenant_id
         AND existing_order.company_code = v_company_code
         AND existing_order.coupon_id = v_coupon.id
         AND existing_order.user_id = v_customer_id;
      IF v_customer_usage_count >= v_coupon.per_user_limit THEN
        RAISE EXCEPTION 'POS_COUPON_CUSTOMER_LIMIT_REACHED';
      END IF;
    END IF;

    v_target_type := LOWER(COALESCE(v_coupon.applies_to, 'all'));
    v_target_id := v_coupon.applies_to_id::TEXT;
    v_eligible_total := 0;
    FOR v_line IN SELECT line FROM jsonb_array_elements(v_prepared_lines) AS lines(line)
    LOOP
      v_target_matches := v_target_type IN ('', 'all')
        OR (v_target_type IN ('product', 'products', 'item')
            AND v_line->>'product_id' = v_target_id)
        OR (v_target_type IN ('category', 'categories')
            AND v_line->>'category_id' = v_target_id)
        OR (v_target_type IN ('subcategory', 'subcategories')
            AND v_line->>'subcategory_id' = v_target_id);
      IF v_target_matches THEN
        v_eligible_total := v_eligible_total + (v_line->>'gross')::NUMERIC;
      END IF;
    END LOOP;

    IF v_eligible_total <= 0 THEN
      RAISE EXCEPTION 'POS_COUPON_HAS_NO_ELIGIBLE_ITEMS';
    END IF;

    v_discount_value := COALESCE(v_coupon.discount_value, 0);
    v_offer_type := LOWER(COALESCE(v_coupon.discount_type, ''));
    IF v_discount_value <= 0 THEN
      RAISE EXCEPTION 'POS_COUPON_INVALID_DISCOUNT';
    ELSIF v_offer_type IN ('percentage', 'percent', 'percentage_discount') THEN
      IF v_discount_value > 100 THEN
        RAISE EXCEPTION 'POS_COUPON_INVALID_DISCOUNT';
      END IF;
      v_candidate_discount := v_eligible_total * v_discount_value / 100;
    ELSIF v_offer_type IN ('flat', 'fixed', 'amount') THEN
      v_candidate_discount := v_discount_value;
    ELSE
      RAISE EXCEPTION 'POS_COUPON_UNSUPPORTED_DISCOUNT';
    END IF;
    IF COALESCE(v_coupon.max_discount, 0) > 0 THEN
      v_candidate_discount := LEAST(v_candidate_discount, v_coupon.max_discount);
    END IF;
    v_candidate_discount := ROUND(LEAST(v_eligible_total, v_candidate_discount), 2);

    v_candidate_items := '{}'::JSONB;
    v_allocated_so_far := 0;
    v_line_index := 0;
    SELECT COUNT(*)
      INTO v_line_count
      FROM jsonb_array_elements(v_prepared_lines) AS lines(line)
     WHERE (v_target_type IN ('', 'all')
        OR (v_target_type IN ('product', 'products', 'item')
            AND line->>'product_id' = v_target_id)
        OR (v_target_type IN ('category', 'categories')
            AND line->>'category_id' = v_target_id)
        OR (v_target_type IN ('subcategory', 'subcategories')
            AND line->>'subcategory_id' = v_target_id));

    FOR v_line IN SELECT line FROM jsonb_array_elements(v_prepared_lines) AS lines(line)
    LOOP
      v_target_matches := v_target_type IN ('', 'all')
        OR (v_target_type IN ('product', 'products', 'item')
            AND v_line->>'product_id' = v_target_id)
        OR (v_target_type IN ('category', 'categories')
            AND v_line->>'category_id' = v_target_id)
        OR (v_target_type IN ('subcategory', 'subcategories')
            AND v_line->>'subcategory_id' = v_target_id);
      IF v_target_matches THEN
        v_line_index := v_line_index + 1;
        IF v_line_index = v_line_count THEN
          v_allocated_discount := ROUND(v_candidate_discount - v_allocated_so_far, 2);
        ELSE
          v_allocated_discount := ROUND(
            v_candidate_discount * (v_line->>'gross')::NUMERIC / v_eligible_total,
            2
          );
        END IF;
        v_allocated_discount := LEAST(
          (v_line->>'gross')::NUMERIC,
          GREATEST(0, v_allocated_discount)
        );
        v_allocated_so_far := v_allocated_so_far + v_allocated_discount;
        v_candidate_items := jsonb_set(
          v_candidate_items,
          ARRAY[v_line->>'product_id'],
          to_jsonb(v_allocated_discount),
          TRUE
        );
      END IF;
    END LOOP;

    IF v_candidate_discount > 0 THEN
      v_candidates := v_candidates || jsonb_build_array(jsonb_build_object(
        'kind', 'coupon',
        'id', v_coupon.id::TEXT,
        'discount_amount', v_allocated_so_far,
        'item_discounts', v_candidate_items
      ));
    END IF;
  END IF;

  FOR v_offer IN
    SELECT offer.*
      FROM public.offers_master AS offer
     WHERE offer.tenant_id = v_tenant_id
       AND offer.company_code = v_company_code
       AND offer.is_active IS TRUE
       AND (NULLIF(offer.valid_from::TEXT, '') IS NULL
            OR NULLIF(offer.valid_from::TEXT, '')::DATE <= CURRENT_DATE)
       AND (NULLIF(offer.valid_to::TEXT, '') IS NULL
            OR NULLIF(offer.valid_to::TEXT, '')::DATE >= CURRENT_DATE)
       AND COALESCE(offer.min_order_amount, 0) <= v_subtotal
     ORDER BY offer.id
  LOOP
    v_target_type := LOWER(COALESCE(v_offer.applies_to_type, 'all'));
    v_target_id := v_offer.applies_to_id::TEXT;
    v_eligible_total := 0;
    v_candidate_discount := 0;
    v_candidate_items := '{}'::JSONB;
    v_offer_type := LOWER(COALESCE(v_offer.offer_type, ''));
    v_discount_value := COALESCE(v_offer.discount_value, 0);
    v_buy_qty := COALESCE(v_offer.buy_qty, 0);
    v_get_qty := COALESCE(v_offer.get_qty, 0);

    FOR v_line IN SELECT line FROM jsonb_array_elements(v_prepared_lines) AS lines(line)
    LOOP
      v_target_matches := v_target_type IN ('', 'all')
        OR (v_target_type IN ('product', 'products', 'item')
            AND v_line->>'product_id' = v_target_id)
        OR (v_target_type IN ('category', 'categories')
            AND v_line->>'category_id' = v_target_id)
        OR (v_target_type IN ('subcategory', 'subcategories')
            AND v_line->>'subcategory_id' = v_target_id);
      IF v_target_matches THEN
        v_eligible_total := v_eligible_total + (v_line->>'gross')::NUMERIC;
      END IF;
    END LOOP;
    IF v_eligible_total <= 0 THEN
      CONTINUE;
    END IF;

    IF v_offer_type = 'bogo' THEN
      IF v_buy_qty <= 0 OR v_get_qty <= 0
         OR v_buy_qty <> TRUNC(v_buy_qty) OR v_get_qty <> TRUNC(v_get_qty) THEN
        CONTINUE;
      END IF;
      FOR v_line IN SELECT line FROM jsonb_array_elements(v_prepared_lines) AS lines(line)
      LOOP
        v_target_matches := v_target_type IN ('', 'all')
          OR (v_target_type IN ('product', 'products', 'item')
              AND v_line->>'product_id' = v_target_id)
          OR (v_target_type IN ('category', 'categories')
              AND v_line->>'category_id' = v_target_id)
          OR (v_target_type IN ('subcategory', 'subcategories')
              AND v_line->>'subcategory_id' = v_target_id);
        IF v_target_matches THEN
          v_line_discount := FLOOR(
            (v_line->>'quantity')::NUMERIC / (v_buy_qty + v_get_qty)
          ) * v_get_qty * (v_line->>'rate')::NUMERIC;
          IF v_line_discount > 0 THEN
            v_candidate_items := jsonb_set(
              v_candidate_items,
              ARRAY[v_line->>'product_id'],
              to_jsonb(ROUND(LEAST((v_line->>'gross')::NUMERIC, v_line_discount), 2)),
              TRUE
            );
            v_candidate_discount := v_candidate_discount + v_line_discount;
          END IF;
        END IF;
      END LOOP;
    ELSIF v_offer_type IN ('percentage', 'percent', 'percentage_discount') THEN
      IF v_discount_value <= 0 OR v_discount_value > 100 THEN
        CONTINUE;
      END IF;
      v_candidate_discount := v_eligible_total * v_discount_value / 100;
    ELSIF v_offer_type IN ('discount', 'fixed', 'flat', 'amount') THEN
      IF v_discount_value <= 0 THEN
        CONTINUE;
      END IF;
      v_candidate_discount := v_discount_value;
    ELSE
      CONTINUE;
    END IF;

    v_candidate_discount := ROUND(LEAST(v_eligible_total, v_candidate_discount), 2);
    IF v_offer_type <> 'bogo' THEN
      v_candidate_items := '{}'::JSONB;
      v_allocated_so_far := 0;
      v_line_index := 0;
      SELECT COUNT(*)
        INTO v_line_count
        FROM jsonb_array_elements(v_prepared_lines) AS lines(line)
       WHERE (v_target_type IN ('', 'all')
          OR (v_target_type IN ('product', 'products', 'item')
              AND line->>'product_id' = v_target_id)
          OR (v_target_type IN ('category', 'categories')
              AND line->>'category_id' = v_target_id)
          OR (v_target_type IN ('subcategory', 'subcategories')
              AND line->>'subcategory_id' = v_target_id));
      FOR v_line IN SELECT line FROM jsonb_array_elements(v_prepared_lines) AS lines(line)
      LOOP
        v_target_matches := v_target_type IN ('', 'all')
          OR (v_target_type IN ('product', 'products', 'item')
              AND v_line->>'product_id' = v_target_id)
          OR (v_target_type IN ('category', 'categories')
              AND v_line->>'category_id' = v_target_id)
          OR (v_target_type IN ('subcategory', 'subcategories')
              AND v_line->>'subcategory_id' = v_target_id);
        IF v_target_matches THEN
          v_line_index := v_line_index + 1;
          IF v_line_index = v_line_count THEN
            v_allocated_discount := ROUND(v_candidate_discount - v_allocated_so_far, 2);
          ELSE
            v_allocated_discount := ROUND(
              v_candidate_discount * (v_line->>'gross')::NUMERIC / v_eligible_total,
              2
            );
          END IF;
          v_allocated_discount := LEAST(
            (v_line->>'gross')::NUMERIC,
            GREATEST(0, v_allocated_discount)
          );
          v_allocated_so_far := v_allocated_so_far + v_allocated_discount;
          v_candidate_items := jsonb_set(
            v_candidate_items,
            ARRAY[v_line->>'product_id'],
            to_jsonb(v_allocated_discount),
            TRUE
          );
        END IF;
      END LOOP;
    END IF;

    IF v_candidate_discount > 0 THEN
      v_candidates := v_candidates || jsonb_build_array(jsonb_build_object(
        'kind', 'offer',
        'id', v_offer.id::TEXT,
        'discount_amount', CASE
          WHEN v_offer_type = 'bogo' THEN ROUND(v_candidate_discount, 2)
          ELSE v_allocated_so_far
        END,
        'item_discounts', v_candidate_items
      ));
    END IF;
  END LOOP;

  SELECT candidate
    INTO v_best_promotion
    FROM jsonb_array_elements(v_candidates) AS candidates(candidate)
   ORDER BY (candidate->>'discount_amount')::NUMERIC DESC,
            candidate->>'kind',
            candidate->>'id'
   LIMIT 1;

  IF v_best_promotion IS NULL THEN
    IF v_promotion IS NOT NULL AND v_promotion <> 'null'::JSONB THEN
      RAISE EXCEPTION 'POS_PROMOTION_MISMATCH';
    END IF;
    IF v_coupon_code <> '' THEN
      RAISE EXCEPTION 'POS_COUPON_NOT_ELIGIBLE';
    END IF;
  ELSE
    IF v_promotion IS NULL OR v_promotion = 'null'::JSONB
       OR v_promotion->>'kind' IS DISTINCT FROM v_best_promotion->>'kind'
       OR v_promotion->>'id' IS DISTINCT FROM v_best_promotion->>'id'
       OR ABS(
         COALESCE(NULLIF(v_promotion->>'discount_amount', '')::NUMERIC, 0)
         - (v_best_promotion->>'discount_amount')::NUMERIC
       ) > 0.01 THEN
      RAISE EXCEPTION 'POS_PROMOTION_MISMATCH';
    END IF;
    v_promotion_discount := (v_best_promotion->>'discount_amount')::NUMERIC;
  END IF;

  v_discount_override_id := NULLIF(v_header->>'manual_discount_approval_id', '')::UUID;
  IF v_manual_discount > 0 THEN
    IF (v_manual_type IN ('percentage', 'percent') AND v_manual_value > 20)
       OR (v_manual_type IN ('flat', 'fixed') AND v_manual_value > 500) THEN
      IF v_discount_override_id IS NULL OR NOT EXISTS (
        SELECT 1
          FROM public.pos_override_approvals AS approval
         WHERE approval.id = v_discount_override_id
           AND approval.auth_user_id = auth.uid()
           AND approval.tenant_id = v_tenant_id
           AND approval.company_code = v_company_code
           AND approval.action_type = CASE
             WHEN v_manual_type IN ('percentage', 'percent') THEN 'high_discount_pct'
             ELSE 'high_discount_flat'
           END
           AND ABS(approval.original_value - v_subtotal) <= 0.01
           AND ABS(approval.requested_value - v_manual_value) <= 0.01
           AND approval.status = 'approved'
           AND approval.expires_at > NOW()
      ) THEN
        RAISE EXCEPTION 'POS_DISCOUNT_OVERRIDE_APPROVAL_REQUIRED';
      END IF;
      v_approval_ids := array_append(v_approval_ids, v_discount_override_id);
    ELSIF v_discount_override_id IS NOT NULL THEN
      RAISE EXCEPTION 'POS_UNNECESSARY_DISCOUNT_OVERRIDE';
    END IF;
  ELSIF v_discount_override_id IS NOT NULL THEN
    RAISE EXCEPTION 'POS_UNNECESSARY_DISCOUNT_OVERRIDE';
  END IF;

  v_global_discount := v_manual_discount + v_points_discount;
  IF v_global_discount + v_promotion_discount > v_subtotal + 0.01 THEN
    RAISE EXCEPTION 'POS_DISCOUNT_EXCEEDS_SUBTOTAL';
  END IF;
  v_total_discount := v_global_discount + v_promotion_discount;
  IF ABS(
    COALESCE(NULLIF(v_header->>'discount', '')::NUMERIC, 0)
    - v_total_discount
  ) > 0.01 THEN
    RAISE EXCEPTION 'POS_DISCOUNT_MISMATCH';
  END IF;
  v_raw_total := v_subtotal - v_total_discount + v_delivery_charge;
  IF v_raw_total < 0 THEN
    RAISE EXCEPTION 'INVALID_POS_TOTAL';
  END IF;
  v_expected_total := ROUND(v_raw_total);
  v_expected_round_off := ROUND(v_expected_total - v_raw_total, 2);
  v_client_total := NULLIF(v_header->>'total_amount', '')::NUMERIC;
  v_client_round_off := COALESCE(NULLIF(v_header->>'round_off', '')::NUMERIC, 0);
  v_client_total_gst := NULLIF(v_header->>'total_gst', '')::NUMERIC;

  IF v_client_total IS NULL OR ABS(v_client_total - v_expected_total) > 0.01
     OR ABS(v_client_round_off - v_expected_round_off) > 0.01 THEN
    RAISE EXCEPTION 'POS_TOTAL_MISMATCH';
  END IF;

  v_payment_amount := NULLIF(p_payload->'payment'->>'amount', '')::NUMERIC;
  IF v_payment_amount IS NULL OR v_payment_amount < v_expected_total THEN
    RAISE EXCEPTION 'INSUFFICIENT_PAYMENT';
  END IF;

  v_remaining_gross := v_subtotal - v_promotion_discount;
  v_line_index := 0;
  v_last_eligible_index := 0;
  FOR v_line IN
    SELECT line
      FROM jsonb_array_elements(v_prepared_lines) WITH ORDINALITY AS lines(line, line_order)
     ORDER BY line_order
  LOOP
    v_line_index := v_line_index + 1;
    v_line_discount := COALESCE(
      NULLIF(v_best_promotion->'item_discounts'->>(v_line->>'product_id'), '')::NUMERIC,
      0
    );
    IF (v_line->>'gross')::NUMERIC - v_line_discount > 0 THEN
      v_last_eligible_index := v_line_index;
    END IF;
  END LOOP;
  IF v_global_discount > 0 AND v_last_eligible_index = 0 THEN
    RAISE EXCEPTION 'POS_DISCOUNT_ALLOCATION_INVALID';
  END IF;
  v_allocated_so_far := 0;
  v_line_index := 0;
  FOR v_line IN
    SELECT line
      FROM jsonb_array_elements(v_prepared_lines) WITH ORDINALITY AS lines(line, line_order)
     ORDER BY line_order
  LOOP
    v_product_id := (v_line->>'product_id')::BIGINT;
    v_line_discount := COALESCE(
      NULLIF(v_best_promotion->'item_discounts'->>(v_product_id::TEXT), '')::NUMERIC,
      0
    );
    v_after_promotion := (v_line->>'gross')::NUMERIC - v_line_discount;
    IF v_remaining_gross > 0 THEN
      IF v_line_index + 1 = v_last_eligible_index THEN
        v_allocated_discount := ROUND(v_global_discount - v_allocated_so_far, 2);
      ELSE
        v_allocated_discount := LEAST(
          ROUND(v_global_discount * v_after_promotion / v_remaining_gross, 2),
          GREATEST(0, ROUND(v_global_discount - v_allocated_so_far, 2))
        );
      END IF;
    ELSE
      v_allocated_discount := 0;
    END IF;
    v_allocated_discount := LEAST(v_after_promotion, GREATEST(0, v_allocated_discount));
    v_allocated_so_far := v_allocated_so_far + v_allocated_discount;
    v_line_discount := ROUND(v_line_discount + v_allocated_discount, 2);
    v_net_amount := ROUND(GREATEST(0, v_after_promotion - v_allocated_discount), 2);
    v_taxable_amount := v_net_amount / (1 + (v_line->>'gst_percent')::NUMERIC / 100);
    v_line_gst := ROUND(v_net_amount - v_taxable_amount, 2);
    v_total_gst := v_total_gst + v_line_gst;
    v_line_index := v_line_index + 1;

    v_prepared_lines := jsonb_set(
      v_prepared_lines,
      ARRAY[(v_line_index - 1)::TEXT],
      v_line || jsonb_build_object(
        'discount_amount', v_line_discount,
        'gst_amount', v_line_gst,
        'total', v_net_amount
      ),
      FALSE
    );
  END LOOP;

  v_total_gst := ROUND(v_total_gst, 2);
  IF v_client_total_gst IS NULL OR ABS(v_client_total_gst - v_total_gst) > 0.01 THEN
    RAISE EXCEPTION 'POS_GST_TOTAL_MISMATCH';
  END IF;

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
    total_gst,
    gst_pricing_mode,
    round_off,
    coupon_id,
    coupon_discount,
    offer_id,
    offer_discount,
    manual_discount_type,
    manual_discount_value,
    points_discount,
    cashier_admin_user_id,
    cashier_shift_id,
    tenant_id,
    company_code,
    payment_method,
    payment_status,
    order_status,
    created_at,
    updated_at,
    status
  )
  VALUES (
    'POS-' || gen_random_uuid()::TEXT,
    COALESCE(NULLIF(v_header->>'order_type', ''), 'pos_counter'),
    v_customer_id,
    COALESCE(NULLIF(v_header->>'customer_name', ''), 'Walk-in Customer'),
    NULLIF(v_header->>'user_mobile', ''),
    NULLIF(v_header->>'user_mobile', ''),
    NULLIF(v_header->>'delivery_address', ''),
    ROUND(v_subtotal, 2),
    ROUND(v_total_discount, 2),
    ROUND(v_delivery_charge, 2),
    v_expected_total,
    v_total_gst,
    v_gst_mode,
    v_expected_round_off,
    CASE WHEN v_best_promotion->>'kind' = 'coupon'
      THEN (v_best_promotion->>'id')::BIGINT ELSE NULL END,
    CASE WHEN v_best_promotion->>'kind' = 'coupon'
      THEN v_promotion_discount ELSE 0 END,
    CASE WHEN v_best_promotion->>'kind' = 'offer'
      THEN (v_best_promotion->>'id')::BIGINT ELSE NULL END,
    CASE WHEN v_best_promotion->>'kind' = 'offer'
      THEN v_promotion_discount ELSE 0 END,
    NULLIF(v_manual_type, ''),
    ROUND(v_manual_value, 2),
    ROUND(v_points_discount, 2),
    v_admin.id,
    v_shift_id,
    v_tenant_id,
    v_company_code,
    v_payment_method,
    'paid',
    COALESCE(NULLIF(v_header->>'order_status', ''), 'delivered'),
    NOW(),
    NOW(),
    COALESCE(NULLIF(v_header->>'order_status', ''), 'delivered')
  )
  RETURNING id INTO v_order_id;

  INSERT INTO public.order_items (
    order_id,
    tenant_id,
    company_code,
    product_id,
    product_name,
    quantity,
    qty,
    rate,
    price,
    discount_amount,
    gst_percent,
    gst_amount,
    hsn_code_snapshot,
    total
  )
  SELECT
    v_order_id,
    v_tenant_id,
    v_company_code,
    (line->>'product_id')::BIGINT,
    line->>'product_name',
    (line->>'quantity')::NUMERIC,
    (line->>'quantity')::NUMERIC,
    (line->>'rate')::NUMERIC,
    (line->>'rate')::NUMERIC,
    (line->>'discount_amount')::NUMERIC,
    (line->>'gst_percent')::NUMERIC,
    (line->>'gst_amount')::NUMERIC,
    line->>'hsn_code',
    (line->>'total')::NUMERIC
  FROM jsonb_array_elements(v_prepared_lines) AS lines(line);

  UPDATE public.products AS product
     SET stock = product.stock - (line->>'quantity')::NUMERIC
    FROM jsonb_array_elements(v_prepared_lines) AS lines(line)
   WHERE product.id = (line->>'product_id')::BIGINT
     AND product.tenant_id = v_tenant_id
     AND product.company_code = v_company_code
     AND product.stock >= (line->>'quantity')::NUMERIC;

  GET DIAGNOSTICS v_stock_update_count = ROW_COUNT;
  IF v_stock_update_count <> jsonb_array_length(v_prepared_lines) THEN
    RAISE EXCEPTION 'POS_STOCK_UPDATE_FAILED';
  END IF;

  INSERT INTO public.inventory_logs (product_id, change_qty)
  SELECT
    (line->>'product_id')::BIGINT,
    -(line->>'quantity')::NUMERIC
  FROM jsonb_array_elements(v_prepared_lines) AS lines(line);

  INSERT INTO public.payment_transactions (order_id, amount)
  VALUES (v_order_id, v_payment_amount);

  IF v_best_promotion->>'kind' = 'coupon' THEN
    UPDATE public.coupons
       SET used_count = COALESCE(used_count, 0) + 1,
           updated_at = NOW()
     WHERE id = (v_best_promotion->>'id')::BIGINT
       AND tenant_id = v_tenant_id
       AND company_code = v_company_code;
  END IF;

  IF cardinality(v_approval_ids) > 0 THEN
    UPDATE public.pos_override_approvals AS approval
       SET status = 'consumed',
           order_id = v_order_id,
           consumed_at = NOW()
     WHERE approval.id = ANY(v_approval_ids)
       AND approval.auth_user_id = auth.uid()
       AND approval.tenant_id = v_tenant_id
       AND approval.company_code = v_company_code
       AND approval.status = 'approved'
       AND approval.expires_at > NOW();

    IF NOT FOUND OR (
      SELECT COUNT(*)
        FROM public.pos_override_approvals AS approval
       WHERE approval.id = ANY(v_approval_ids)
         AND approval.order_id = v_order_id
    ) <> cardinality(v_approval_ids) THEN
      RAISE EXCEPTION 'POS_OVERRIDE_APPROVAL_ALREADY_USED';
    END IF;
  END IF;

  RETURN v_order_id;
END;
$$;

REVOKE ALL ON FUNCTION public.place_order_atomic(JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.place_order_atomic(JSONB) TO authenticated;
