BEGIN;

CREATE TABLE IF NOT EXISTS public.customer_auth_links (
  auth_user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  tenant_id BIGINT NOT NULL,
  company_code CHARACTER VARYING(16) NOT NULL,
  linked_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT customer_auth_links_tenant_customer_unique UNIQUE (tenant_id, user_id)
);

ALTER TABLE public.customer_auth_links ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.customer_auth_links FROM PUBLIC, anon, authenticated;

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
    RAISE EXCEPTION 'Only active super admins can view linked wallet customers'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    customer.id,
    customer.tenant_id,
    customer.company_code::TEXT,
    customer.name::TEXT,
    customer.email::TEXT,
    customer.phone::TEXT,
    COALESCE(wallet.balance, 0)::NUMERIC,
    login.last_sign_in_at
  FROM public.customer_auth_links AS account_link
  JOIN public.users AS customer
    ON customer.id = account_link.user_id
   AND customer.tenant_id = account_link.tenant_id
   AND customer.company_code = account_link.company_code
  JOIN auth.users AS login
    ON login.id = account_link.auth_user_id
   AND login.last_sign_in_at IS NOT NULL
  JOIN (
    SELECT DISTINCT admin_user.tenant_id, admin_user.company_code
    FROM public.admin_users AS admin_user
    WHERE admin_user.auth_user_id = auth.uid()
      AND admin_user.status = 'active'
      AND admin_user.role = 'super_admin'
  ) AS permitted
    ON permitted.tenant_id = customer.tenant_id
   AND permitted.company_code = customer.company_code
  LEFT JOIN LATERAL (
    SELECT wallet_row.balance
    FROM public.wallet_master AS wallet_row
    WHERE wallet_row.user_id = customer.id
      AND wallet_row.tenant_id = customer.tenant_id
      AND wallet_row.company_code = customer.company_code
    ORDER BY wallet_row.id
    LIMIT 1
  ) AS wallet ON TRUE
  WHERE customer.is_active IS DISTINCT FROM FALSE
  ORDER BY customer.name, customer.id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_list_wallet_login_candidates()
RETURNS TABLE (
  auth_user_id UUID,
  login_email TEXT,
  login_phone TEXT,
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
    RAISE EXCEPTION 'Only active super admins can view customer login candidates'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    login.id,
    login.email::TEXT,
    login.phone::TEXT,
    login.last_sign_in_at
  FROM auth.users AS login
  WHERE login.last_sign_in_at IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM public.customer_auth_links AS account_link
      WHERE account_link.auth_user_id = login.id
    )
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
  ORDER BY login.last_sign_in_at DESC, login.id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_list_wallet_link_customers()
RETURNS TABLE (
  user_id BIGINT,
  tenant_id BIGINT,
  company_code TEXT,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT
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
    RAISE EXCEPTION 'Only active super admins can view unlinked wallet customers'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    customer.id,
    customer.tenant_id,
    customer.company_code::TEXT,
    customer.name::TEXT,
    customer.email::TEXT,
    customer.phone::TEXT
  FROM public.users AS customer
  JOIN (
    SELECT DISTINCT admin_user.tenant_id, admin_user.company_code
    FROM public.admin_users AS admin_user
    WHERE admin_user.auth_user_id = auth.uid()
      AND admin_user.status = 'active'
      AND admin_user.role = 'super_admin'
  ) AS permitted
    ON permitted.tenant_id = customer.tenant_id
   AND permitted.company_code = customer.company_code
  WHERE customer.is_active IS DISTINCT FROM FALSE
    AND NOT EXISTS (
      SELECT 1
      FROM public.customer_auth_links AS account_link
      WHERE account_link.tenant_id = customer.tenant_id
        AND account_link.user_id = customer.id
    )
  ORDER BY customer.name, customer.id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_link_wallet_customer(
  p_auth_user_id UUID,
  p_user_id BIGINT,
  p_tenant_id BIGINT,
  p_company_code TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $function$
DECLARE
  v_existing_link RECORD;
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
    RAISE EXCEPTION 'Not authorized to link customer accounts for this tenant'
      USING ERRCODE = '42501';
  END IF;

  IF p_auth_user_id IS NULL OR p_user_id IS NULL OR p_tenant_id IS NULL
     OR NULLIF(BTRIM(p_company_code), '') IS NULL THEN
    RAISE EXCEPTION 'A login, customer, and tenant are required'
      USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM auth.users AS login
    WHERE login.id = p_auth_user_id
      AND login.last_sign_in_at IS NOT NULL
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
  ) THEN
    RAISE EXCEPTION 'Selected account is not an eligible signed-in customer'
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
    RAISE EXCEPTION 'Selected customer does not belong to this tenant'
      USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(p_auth_user_id::TEXT, 0)
  );
  PERFORM pg_advisory_xact_lock(
    hashtextextended(p_tenant_id::TEXT || ':' || p_user_id::TEXT, 0)
  );

  SELECT account_link.auth_user_id, account_link.user_id, account_link.tenant_id
  INTO v_existing_link
  FROM public.customer_auth_links AS account_link
  WHERE account_link.auth_user_id = p_auth_user_id
     OR (
       account_link.user_id = p_user_id
       AND account_link.tenant_id = p_tenant_id
     )
  FOR UPDATE;

  IF FOUND THEN
    IF v_existing_link.auth_user_id = p_auth_user_id
       AND v_existing_link.user_id = p_user_id
       AND v_existing_link.tenant_id = p_tenant_id THEN
      RETURN TRUE;
    END IF;
    RAISE EXCEPTION 'The selected login or customer is already linked'
      USING ERRCODE = '23505';
  END IF;

  INSERT INTO public.customer_auth_links (
    auth_user_id, user_id, tenant_id, company_code, linked_by
  )
  VALUES (
    p_auth_user_id, p_user_id, p_tenant_id, p_company_code, auth.uid()
  );

  RETURN TRUE;
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_list_wallet_customers() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_wallet_customers() TO authenticated;

REVOKE ALL ON FUNCTION public.admin_list_wallet_login_candidates() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_wallet_login_candidates() TO authenticated;

REVOKE ALL ON FUNCTION public.admin_list_wallet_link_customers() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_wallet_link_customers() TO authenticated;

REVOKE ALL ON FUNCTION public.admin_link_wallet_customer(UUID, BIGINT, BIGINT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_link_wallet_customer(UUID, BIGINT, BIGINT, TEXT) TO authenticated;

COMMIT;
