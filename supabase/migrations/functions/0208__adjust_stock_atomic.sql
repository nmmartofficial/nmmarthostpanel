-- Migration 0208: Atomic Stock Adjustment RPC
-- Handles manual adjustments, damage, expiry, wastage, and opening stock

BEGIN;

CREATE OR REPLACE FUNCTION public.adjust_stock_atomic(p_payload JSONB)
RETURNS BIGINT AS $$
DECLARE
  v_product_id BIGINT;
  v_tenant_id BIGINT;
  v_company_code TEXT;
  v_admin_user_id BIGINT;
  v_change_qty NUMERIC;
  v_change_type TEXT; -- 'adjustment', 'damage', 'expiry', 'wastage', 'opening', 'manual'
  v_narration TEXT;
  v_reference_number TEXT;
  v_old_stock NUMERIC;
  v_new_stock NUMERIC;
  v_auth_email TEXT := auth.email();
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
  v_product_id := (p_payload->>'product_id')::BIGINT;
  v_change_qty := (p_payload->>'change_qty')::NUMERIC;
  v_change_type := lower(coalesce(p_payload->>'change_type', 'manual'));
  v_narration := p_payload->>'narration';
  v_reference_number := p_payload->>'reference_number';

  IF v_product_id IS NULL OR v_change_qty IS NULL THEN
    RAISE EXCEPTION 'INVALID_PAYLOAD';
  END IF;

  -- 3. LOCK PRODUCT & GET OLD STOCK
  SELECT coalesce(stock, 0) INTO v_old_stock
  FROM public.products
  WHERE id = v_product_id AND tenant_id = v_tenant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PRODUCT_NOT_FOUND';
  END IF;

  -- 4. CALCULATE NEW STOCK
  -- Positive change_qty adds to stock, negative decreases it.
  v_new_stock := v_old_stock + v_change_qty;

  -- For reduction types (damage, expiry, wastage), we usually expect a negative qty or we subtract if positive.
  -- To keep it simple, the RPC trusts the change_qty sign, but we can enforce non-negative stock.
  IF v_new_stock < 0 THEN
    RAISE EXCEPTION 'INSUFFICIENT_STOCK_FOR_ADJUSTMENT';
  END IF;

  -- 5. UPDATE PRODUCT STOCK
  UPDATE public.products
  SET stock = v_new_stock, opstock = v_new_stock, updated_at = now()
  WHERE id = v_product_id;

  -- 6. LOG MOVEMENT
  INSERT INTO public.inventory_logs (
    tenant_id, company_code, product_id, old_stock, new_stock, change_qty,
    change_type, narration, reference_number, admin_user_id, created_at, updated_at
  ) VALUES (
    v_tenant_id, v_company_code, v_product_id, v_old_stock, v_new_stock, abs(v_change_qty),
    v_change_type, v_narration, v_reference_number, v_admin_user_id, now(), now()
  );

  RETURN v_product_id;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.adjust_stock_atomic(JSONB) TO authenticated;

COMMIT;
