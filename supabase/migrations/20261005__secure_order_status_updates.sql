BEGIN;

CREATE OR REPLACE FUNCTION public.admin_update_order_status(
  p_order_id BIGINT,
  p_order_status TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $function$
DECLARE
  v_updated_order JSONB;
BEGIN
  IF auth.uid() IS NULL OR p_order_id IS NULL
     OR p_order_status NOT IN (
       'pending',
       'confirmed',
       'packed',
       'out_for_delivery',
       'delivered',
       'cancelled',
       'returned'
     ) THEN
    RAISE EXCEPTION 'A valid order and status are required'
      USING ERRCODE = '22023';
  END IF;

  UPDATE public.orders AS order_row
  SET
    order_status = p_order_status,
    status = p_order_status,
    updated_at = NOW()
  FROM public.admin_users AS admin_user
  WHERE order_row.id = p_order_id
    AND admin_user.auth_user_id = auth.uid()
    AND admin_user.is_active IS TRUE
    AND admin_user.status = 'active'
    AND admin_user.role IN ('super_admin', 'admin', 'sales_manager')
    AND admin_user.tenant_id = order_row.tenant_id
    AND admin_user.company_code = order_row.company_code
  RETURNING to_jsonb(order_row) INTO v_updated_order;

  IF v_updated_order IS NULL THEN
    RAISE EXCEPTION 'Order was not found in an active admin tenant'
      USING ERRCODE = '42501';
  END IF;

  RETURN v_updated_order;
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_update_order_status(BIGINT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_order_status(BIGINT, TEXT) TO authenticated;

COMMIT;
