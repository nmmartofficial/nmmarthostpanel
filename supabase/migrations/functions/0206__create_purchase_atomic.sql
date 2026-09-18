-- Migration 0206 — Atomic purchase receipt
-- Contract: p_payload JSONB -> { purchase_header, items }
-- Returns: { purchase_id } JSONB
-- Atomic effects: purchases, purchase_items, products.stock, inventory_logs.
-- Purchase accounting is intentionally excluded because no existing purchase-linked
-- accounting/payment table is present in the canonical schema.

BEGIN;

CREATE OR REPLACE FUNCTION public.create_purchase_atomic(p_payload JSONB)
RETURNS JSONB AS $$
DECLARE
  v_header JSONB;
  v_items JSONB;
  v_item JSONB;
  v_tenant_id BIGINT;
  v_company_code TEXT;
  v_auth_email TEXT := auth.email();
  v_purchase_id BIGINT;
  v_supplier_id BIGINT;
  v_product_id BIGINT;
  v_qty NUMERIC;
  v_rate NUMERIC;
  v_gst_percent NUMERIC;
  v_gst_amount NUMERIC;
  v_discount_percent NUMERIC;
  v_discount_amount NUMERIC;
  v_item_total NUMERIC;
  v_old_stock NUMERIC;
  v_new_stock NUMERIC;
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

  IF p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object' THEN
    RAISE EXCEPTION 'INVALID_PAYLOAD';
  END IF;

  v_header := p_payload->'purchase_header';
  v_items := p_payload->'items';

  IF v_header IS NULL OR jsonb_typeof(v_header) <> 'object'
     OR v_items IS NULL OR jsonb_typeof(v_items) <> 'array'
     OR jsonb_array_length(v_items) = 0 THEN
    RAISE EXCEPTION 'INVALID_PAYLOAD';
  END IF;

  v_supplier_id := NULLIF(v_header->>'supplier_id', '')::BIGINT;
  IF v_supplier_id IS NULL THEN
    RAISE EXCEPTION 'SUPPLIER_REQUIRED';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.account_master a
    WHERE a.id = v_supplier_id
      AND a.tenant_id = v_tenant_id
      AND a.company_code = v_company_code
      AND lower(coalesce(a.account_type, '')) = 'supplier'
      AND coalesce(a.is_active, true) = true
      AND coalesce(a.is_deleted, false) = false
  ) THEN
    RAISE EXCEPTION 'INVALID_SUPPLIER';
  END IF;

  IF coalesce((v_header->>'subtotal')::NUMERIC, 0) < 0
     OR coalesce((v_header->>'gst_amount')::NUMERIC, 0) < 0
     OR coalesce((v_header->>'discount_amount')::NUMERIC, 0) < 0
     OR coalesce((v_header->>'total_amount')::NUMERIC, 0) < 0
     OR coalesce((v_header->>'paid_amount')::NUMERIC, 0) < 0
     OR coalesce((v_header->>'paid_amount')::NUMERIC, 0) > coalesce((v_header->>'total_amount')::NUMERIC, 0) THEN
    RAISE EXCEPTION 'INVALID_PURCHASE_TOTALS';
  END IF;

  INSERT INTO public.purchases (
    supplier_id, invoice_number, invoice_date,
    subtotal, gst_amount, discount_amount, round_off, total_amount,
    paid_amount, balance_due, tax_type, notes, status, payment_status,
    tenant_id, company_code, created_at, updated_at
  ) VALUES (
    v_supplier_id,
    NULLIF(v_header->>'invoice_number', ''),
    NULLIF(v_header->>'invoice_date', '')::DATE,
    coalesce((v_header->>'subtotal')::NUMERIC, 0),
    coalesce((v_header->>'gst_amount')::NUMERIC, 0),
    coalesce((v_header->>'discount_amount')::NUMERIC, 0),
    coalesce((v_header->>'round_off')::NUMERIC, 0),
    coalesce((v_header->>'total_amount')::NUMERIC, 0),
    coalesce((v_header->>'paid_amount')::NUMERIC, 0),
    coalesce((v_header->>'balance_due')::NUMERIC, 0),
    coalesce(v_header->>'tax_type', 'Exclude'),
    v_header->>'notes',
    coalesce(v_header->>'status', 'completed'),
    coalesce(v_header->>'payment_status', 'unpaid'),
    v_tenant_id, v_company_code, now(), now()
  ) RETURNING id INTO v_purchase_id;

  FOR v_index IN 0..jsonb_array_length(v_items) - 1 LOOP
    v_item := v_items->v_index;
    v_product_id := NULLIF(v_item->>'product_id', '')::BIGINT;
    v_qty := coalesce((v_item->>'quantity')::NUMERIC, 0);
    v_rate := coalesce((v_item->>'rate')::NUMERIC, 0);
    v_gst_percent := coalesce((v_item->>'gst_percent')::NUMERIC, 0);
    v_gst_amount := coalesce((v_item->>'gst_amount')::NUMERIC, 0);
    v_discount_percent := coalesce((v_item->>'discount_percent')::NUMERIC, 0);
    v_discount_amount := coalesce((v_item->>'discount_amount')::NUMERIC, 0);
    v_item_total := coalesce((v_item->>'total')::NUMERIC, 0);

    IF v_product_id IS NULL THEN
      RAISE EXCEPTION 'INVALID_PRODUCT';
    END IF;
    IF v_qty <= 0 THEN
      RAISE EXCEPTION 'INVALID_QUANTITY';
    END IF;
    IF v_rate < 0 OR v_gst_percent < 0 OR v_gst_amount < 0
       OR v_discount_percent < 0 OR v_discount_amount < 0 OR v_item_total < 0 THEN
      RAISE EXCEPTION 'INVALID_PURCHASE_ITEM';
    END IF;

    SELECT coalesce(p.stock, 0)
      INTO v_old_stock
    FROM public.products p
    WHERE p.id = v_product_id
      AND p.tenant_id = v_tenant_id
      AND p.company_code = v_company_code
      AND coalesce(p.is_active, true) = true
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'INVALID_PRODUCT';
    END IF;

    v_new_stock := v_old_stock + v_qty;

    INSERT INTO public.purchase_items (
      purchase_id, product_id, product_name_snapshot,
      quantity, rate, gst_percent, gst_amount,
      discount_percent, discount_amount, total,
      tenant_id, company_code, created_at, updated_at
    ) VALUES (
      v_purchase_id, v_product_id, v_item->>'product_name',
      v_qty, v_rate, v_gst_percent, v_gst_amount,
      v_discount_percent, v_discount_amount, v_item_total,
      v_tenant_id, v_company_code, now(), now()
    );

    UPDATE public.products
    SET stock = v_new_stock,
        opstock = v_new_stock,
        updated_at = now()
    WHERE id = v_product_id
      AND tenant_id = v_tenant_id
      AND company_code = v_company_code;

    INSERT INTO public.inventory_logs (
      product_id, old_stock, new_stock, change_qty, change_type,
      reference_id, reference_number, narration,
      tenant_id, company_code, created_at, updated_at
    ) VALUES (
      v_product_id, v_old_stock, v_new_stock, v_qty, 'purchase',
      v_purchase_id, coalesce(v_header->>'invoice_number', v_purchase_id::TEXT),
      coalesce(v_header->>'notes', 'Purchase receipt'),
      v_tenant_id, v_company_code, now(), now()
    );
  END LOOP;

  RETURN jsonb_build_object('purchase_id', v_purchase_id);
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.create_purchase_atomic(JSONB) TO authenticated;

COMMIT;
