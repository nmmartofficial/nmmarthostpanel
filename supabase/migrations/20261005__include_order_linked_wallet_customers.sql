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
    RAISE EXCEPTION 'Only active super admins can view wallet customers'
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
  ),
  unique_login_customers AS (
    SELECT matched_user_id, matched_last_login_at
    FROM unique_matches
    WHERE matches_for_login = 1
      AND matches_for_customer = 1
  ),
  eligible_customers AS (
    SELECT
      customer.id,
      customer.tenant_id,
      customer.company_code,
      customer.name,
      customer.email,
      customer.phone,
      login_customer.matched_last_login_at
    FROM public.users AS customer
    JOIN permitted_tenants AS permitted
      ON permitted.tenant_id = customer.tenant_id
     AND permitted.company_code = customer.company_code
    LEFT JOIN unique_login_customers AS login_customer
      ON login_customer.matched_user_id = customer.id
    WHERE customer.is_active IS DISTINCT FROM FALSE
      AND (
        login_customer.matched_user_id IS NOT NULL
        OR EXISTS (
          SELECT 1
          FROM public.orders AS customer_order
          WHERE customer_order.user_id = customer.id
            AND customer_order.tenant_id = customer.tenant_id
            AND customer_order.company_code = customer.company_code
            AND customer_order.is_deleted IS DISTINCT FROM TRUE
        )
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.admin_users AS admin_account
        WHERE NULLIF(BTRIM(customer.email), '') IS NOT NULL
          AND (
            LOWER(BTRIM(COALESCE(admin_account.username, ''))) = LOWER(BTRIM(customer.email))
            OR LOWER(BTRIM(COALESCE(admin_account.email, ''))) = LOWER(BTRIM(customer.email))
          )
      )
  )
  SELECT
    customer.id,
    customer.tenant_id,
    customer.company_code::TEXT,
    customer.name::TEXT,
    customer.email::TEXT,
    customer.phone::TEXT,
    COALESCE(wallet.balance, 0)::NUMERIC,
    customer.matched_last_login_at
  FROM eligible_customers AS customer
  LEFT JOIN LATERAL (
    SELECT wallet_row.balance
    FROM public.wallet_master AS wallet_row
    WHERE wallet_row.user_id = customer.id
      AND wallet_row.tenant_id = customer.tenant_id
      AND wallet_row.company_code = customer.company_code
    ORDER BY wallet_row.id
    LIMIT 1
  ) AS wallet ON TRUE
  ORDER BY customer.name, customer.id;
END;
$function$;

COMMIT;
