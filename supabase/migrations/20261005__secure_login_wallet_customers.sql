BEGIN;

CREATE OR REPLACE FUNCTION public.admin_list_wallet_customers()
RETURNS TABLE (
  user_id BIGINT,
  tenant_id BIGINT,
  company_code TEXT,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  wallet_balance NUMERIC,
  last_login_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $function$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.admin_users AS admin_user
    WHERE admin_user.auth_user_id = auth.uid()
      AND admin_user.status = 'active'
      AND admin_user.role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'Only active super admins can view login-linked wallet customers'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH permitted_tenants AS (
    SELECT DISTINCT admin_user.tenant_id, admin_user.company_code
    FROM public.admin_users AS admin_user
    WHERE admin_user.auth_user_id = auth.uid()
      AND admin_user.status = 'active'
      AND admin_user.role = 'super_admin'
      AND admin_user.tenant_id IS NOT NULL
      AND admin_user.company_code IS NOT NULL
  ),
  signed_in_customers AS (
    SELECT DISTINCT
      customer.id AS matched_user_id,
      customer.tenant_id AS matched_tenant_id,
      customer.company_code AS matched_company_code,
      customer.name AS matched_name,
      customer.email AS matched_email,
      customer.phone AS matched_phone,
      login.last_sign_in_at AS matched_last_login_at,
      login.id AS auth_user_id
    FROM auth.users AS login
    JOIN public.users AS customer
      ON (
        (
          NULLIF(BTRIM(login.email), '') IS NOT NULL
          AND NULLIF(BTRIM(customer.email), '') IS NOT NULL
          AND LOWER(BTRIM(login.email)) = LOWER(BTRIM(customer.email))
        )
        OR (
          NULLIF(REGEXP_REPLACE(COALESCE(login.phone, login.raw_user_meta_data ->> 'phone', ''), '[^0-9]', '', 'g'), '') IS NOT NULL
          AND REGEXP_REPLACE(customer.phone, '[^0-9]', '', 'g')
              = REGEXP_REPLACE(COALESCE(login.phone, login.raw_user_meta_data ->> 'phone', ''), '[^0-9]', '', 'g')
        )
      )
    JOIN permitted_tenants AS permitted
      ON permitted.tenant_id = customer.tenant_id
     AND permitted.company_code = customer.company_code
    WHERE login.last_sign_in_at IS NOT NULL
      AND customer.is_active IS DISTINCT FROM FALSE
      AND NOT EXISTS (
        SELECT 1
        FROM public.admin_users AS admin_account
        WHERE admin_account.auth_user_id = login.id
           OR (
             NULLIF(BTRIM(login.email), '') IS NOT NULL
             AND (
               LOWER(BTRIM(COALESCE(admin_account.username, ''))) = LOWER(BTRIM(login.email))
               OR LOWER(BTRIM(COALESCE(admin_account.email, ''))) = LOWER(BTRIM(login.email))
             )
           )
      )
  ),
  unique_matches AS (
    SELECT
      matched.*,
      COUNT(*) OVER (PARTITION BY matched.auth_user_id) AS matches_for_login,
      COUNT(*) OVER (PARTITION BY matched.matched_user_id) AS matches_for_customer
    FROM signed_in_customers AS matched
  )
  SELECT
    matched.matched_user_id,
    matched.matched_tenant_id,
    matched.matched_company_code::TEXT,
    matched.matched_name::TEXT,
    matched.matched_email::TEXT,
    matched.matched_phone::TEXT,
    COALESCE(wallet.balance, 0)::NUMERIC,
    matched.matched_last_login_at
  FROM unique_matches AS matched
  LEFT JOIN LATERAL (
    SELECT wallet_row.balance
    FROM public.wallet_master AS wallet_row
    WHERE wallet_row.user_id = matched.matched_user_id
      AND wallet_row.tenant_id = matched.matched_tenant_id
      AND wallet_row.company_code = matched.matched_company_code
    ORDER BY wallet_row.id
    LIMIT 1
  ) AS wallet ON TRUE
  WHERE matched.matches_for_login = 1
    AND matched.matches_for_customer = 1
  ORDER BY matched.matched_name, matched.matched_user_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_adjust_wallet_atomic(
  p_user_id BIGINT,
  p_tenant_id BIGINT,
  p_company_code TEXT,
  p_amount NUMERIC,
  p_type TEXT,
  p_reason TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $function$
DECLARE
  v_wallet_id BIGINT;
  v_old_balance NUMERIC := 0;
  v_new_balance NUMERIC;
  v_amount NUMERIC;
  v_type TEXT;
  v_company_code TEXT;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.admin_users AS admin_user
    WHERE admin_user.auth_user_id = auth.uid()
      AND admin_user.status = 'active'
      AND admin_user.role = 'super_admin'
      AND admin_user.tenant_id = p_tenant_id
      AND admin_user.company_code = p_company_code
  ) THEN
    RAISE EXCEPTION 'Not authorized to adjust wallets for this tenant'
      USING ERRCODE = '42501';
  END IF;

  v_amount := ABS(p_amount);
  v_type := LOWER(BTRIM(p_type));
  v_company_code := SUBSTRING(p_company_code FROM 1 FOR 16);

  IF p_user_id IS NULL OR p_tenant_id IS NULL
     OR v_amount IS NULL OR v_amount <= 0
     OR v_type IS NULL OR v_type NOT IN ('credit', 'debit')
     OR NULLIF(BTRIM(p_reason), '') IS NULL THEN
    RAISE EXCEPTION 'Valid customer, amount, type, and reason are required'
      USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.users AS customer
    WHERE customer.id = p_user_id
      AND customer.tenant_id = p_tenant_id
      AND customer.company_code = p_company_code
      AND customer.is_active IS DISTINCT FROM FALSE
  ) THEN
    RAISE EXCEPTION 'Customer does not belong to the selected tenant'
      USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(p_tenant_id::TEXT || ':' || p_user_id::TEXT, 0)
  );

  SELECT wallet_row.id, wallet_row.balance
  INTO v_wallet_id, v_old_balance
  FROM public.wallet_master AS wallet_row
  WHERE wallet_row.user_id = p_user_id
    AND wallet_row.tenant_id = p_tenant_id
    AND wallet_row.company_code = p_company_code
  ORDER BY wallet_row.id
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.wallet_master (
      user_id, customer_id, balance, is_active, tenant_id, company_code, created_at, updated_at
    )
    VALUES (
      p_user_id, p_user_id, 0, TRUE, p_tenant_id, v_company_code, NOW(), NOW()
    )
    RETURNING id, balance INTO v_wallet_id, v_old_balance;
  END IF;

  v_new_balance := COALESCE(v_old_balance, 0)
    + CASE WHEN v_type = 'debit' THEN -v_amount ELSE v_amount END;

  IF v_type = 'debit' AND v_new_balance < 0 THEN
    RAISE EXCEPTION 'Wallet overdraw denied'
      USING ERRCODE = '22023';
  END IF;

  UPDATE public.wallet_master
  SET balance = v_new_balance, updated_at = NOW()
  WHERE id = v_wallet_id;

  INSERT INTO public.wallet_transactions (
    wallet_id, user_id, amount, type, reason, reference_id,
    opening_balance, closing_balance, created_at, updated_at, tenant_id, company_code
  )
  VALUES (
    v_wallet_id, p_user_id, v_amount, v_type, BTRIM(p_reason), NULL,
    COALESCE(v_old_balance, 0), v_new_balance, NOW(), NOW(), p_tenant_id, v_company_code
  );

  RETURN TRUE;
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_list_wallet_customers() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_wallet_customers() TO authenticated;

REVOKE ALL ON FUNCTION public.admin_adjust_wallet_atomic(BIGINT, BIGINT, TEXT, NUMERIC, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_adjust_wallet_atomic(BIGINT, BIGINT, TEXT, NUMERIC, TEXT, TEXT) TO authenticated;

COMMIT;
