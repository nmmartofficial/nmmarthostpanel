BEGIN;

CREATE OR REPLACE FUNCTION public.admin_wallet_customer_profile(
  p_user_id BIGINT,
  p_tenant_id BIGINT,
  p_company_code TEXT,
  p_months INTEGER DEFAULT 12
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $function$
DECLARE
  v_profile JSONB;
  v_orders JSONB;
  v_wallet_transactions JSONB;
  v_spending_trend JSONB;
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
    RAISE EXCEPTION 'Not authorized to view this customer profile'
      USING ERRCODE = '42501';
  END IF;

  IF p_user_id IS NULL OR p_months IS NULL OR p_months NOT IN (1, 3, 6, 12) THEN
    RAISE EXCEPTION 'A valid customer and history period are required'
      USING ERRCODE = '22023';
  END IF;

  SELECT JSONB_BUILD_OBJECT(
    'linked_login_email', login.email,
    'linked_login_phone', login.phone,
    'linked_at', account_link.created_at,
    'last_login_at', login.last_sign_in_at,
    'customer_email', customer.email,
    'customer_since', customer.created_at,
    'customer_status', CASE WHEN customer.is_active IS FALSE THEN 'Inactive' ELSE 'Active' END,
    'wallet_balance', COALESCE(wallet.balance, 0),
    'wallet_transaction_count', COALESCE(ledger.transaction_count, 0),
    'wallet_credit_total', COALESCE(ledger.credit_total, 0),
    'wallet_debit_total', COALESCE(ledger.debit_total, 0),
    'last_transaction_at', ledger.last_transaction_at
  )
  INTO v_profile
  FROM public.customer_auth_links AS account_link
  JOIN public.users AS customer
    ON customer.id = account_link.user_id
   AND customer.tenant_id = account_link.tenant_id
   AND customer.company_code = account_link.company_code
  JOIN auth.users AS login
    ON login.id = account_link.auth_user_id
  LEFT JOIN LATERAL (
    SELECT wallet_row.balance
    FROM public.wallet_master AS wallet_row
    WHERE wallet_row.user_id = customer.id
      AND wallet_row.tenant_id = customer.tenant_id
      AND wallet_row.company_code = customer.company_code
    ORDER BY wallet_row.id
    LIMIT 1
  ) AS wallet ON TRUE
  LEFT JOIN LATERAL (
    SELECT
      COUNT(*) AS transaction_count,
      COALESCE(SUM(transaction_row.amount) FILTER (
        WHERE LOWER(COALESCE(NULLIF(transaction_row.type, ''), transaction_row.entry_type, '')) = 'credit'
      ), 0) AS credit_total,
      COALESCE(SUM(transaction_row.amount) FILTER (
        WHERE LOWER(COALESCE(NULLIF(transaction_row.type, ''), transaction_row.entry_type, '')) = 'debit'
      ), 0) AS debit_total,
      MAX(transaction_row.created_at) AS last_transaction_at
    FROM public.wallet_transactions AS transaction_row
    WHERE transaction_row.user_id = customer.id
      AND transaction_row.tenant_id = customer.tenant_id
      AND transaction_row.company_code = customer.company_code
      AND LOWER(COALESCE(transaction_row.status, 'posted')) NOT IN ('void', 'voided', 'cancelled', 'reversed')
  ) AS ledger ON TRUE
  WHERE account_link.user_id = p_user_id
    AND account_link.tenant_id = p_tenant_id
    AND account_link.company_code = p_company_code
    AND customer.is_active IS DISTINCT FROM FALSE
    AND login.last_sign_in_at IS NOT NULL;

  IF v_profile IS NULL THEN
    RAISE EXCEPTION 'Linked active customer was not found'
      USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(
    JSONB_AGG(
      JSONB_BUILD_OBJECT(
        'created_at', order_row.created_at,
        'order_number', COALESCE(order_row.order_number, order_row.order_no, order_row.order_id_str, order_row.id::TEXT),
        'amount', COALESCE(order_row.total_amount, order_row.total, 0),
        'payment_status', COALESCE(order_row.payment_status, 'Unknown'),
        'order_status', COALESCE(order_row.order_status, order_row.status, 'Unknown')
      )
      ORDER BY order_row.created_at DESC
    ),
    '[]'::JSONB
  )
  INTO v_orders
  FROM (
    SELECT order_row.*
    FROM public.orders AS order_row
    WHERE order_row.user_id = p_user_id
      AND order_row.tenant_id = p_tenant_id
      AND order_row.company_code = p_company_code
      AND order_row.is_deleted IS DISTINCT FROM TRUE
    ORDER BY order_row.created_at DESC
    LIMIT 100
  ) AS order_row;

  SELECT COALESCE(
    JSONB_AGG(
      JSONB_BUILD_OBJECT(
        'created_at', transaction_row.created_at,
        'type', COALESCE(NULLIF(transaction_row.type, ''), NULLIF(transaction_row.entry_type, ''), 'unknown'),
        'amount', transaction_row.amount,
        'balance_after', transaction_row.closing_balance,
        'reason', COALESCE(NULLIF(transaction_row.reason, ''), transaction_row.narration),
        'reference', COALESCE(transaction_row.reference_number, transaction_row.reference_id::TEXT)
      )
      ORDER BY transaction_row.created_at DESC
    ),
    '[]'::JSONB
  )
  INTO v_wallet_transactions
  FROM (
    SELECT transaction_row.*
    FROM public.wallet_transactions AS transaction_row
    WHERE transaction_row.user_id = p_user_id
      AND transaction_row.tenant_id = p_tenant_id
      AND transaction_row.company_code = p_company_code
    ORDER BY transaction_row.created_at DESC
    LIMIT 100
  ) AS transaction_row;

  SELECT COALESCE(
    JSONB_AGG(
      JSONB_BUILD_OBJECT('month', spending.month_start, 'amount', spending.amount)
      ORDER BY spending.month_start
    ),
    '[]'::JSONB
  )
  INTO v_spending_trend
  FROM (
    SELECT
      months.month_start::DATE AS month_start,
      COALESCE(SUM(COALESCE(order_row.total_amount, order_row.total, 0)), 0)::NUMERIC AS amount
    FROM generate_series(
      DATE_TRUNC('month', NOW()) - ((p_months - 1) || ' months')::INTERVAL,
      DATE_TRUNC('month', NOW()),
      INTERVAL '1 month'
    ) AS months(month_start)
    LEFT JOIN public.orders AS order_row
      ON DATE_TRUNC('month', order_row.created_at) = months.month_start
     AND order_row.user_id = p_user_id
     AND order_row.tenant_id = p_tenant_id
     AND order_row.company_code = p_company_code
     AND order_row.is_deleted IS DISTINCT FROM TRUE
     AND LOWER(COALESCE(order_row.order_status, order_row.status, '')) = 'delivered'
    GROUP BY months.month_start
  ) AS spending;

  RETURN v_profile || JSONB_BUILD_OBJECT(
    'orders', v_orders,
    'wallet_transactions', v_wallet_transactions,
    'spending_trend', v_spending_trend
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_wallet_customer_profile(BIGINT, BIGINT, TEXT, INTEGER)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_wallet_customer_profile(BIGINT, BIGINT, TEXT, INTEGER)
  TO authenticated;

COMMIT;
