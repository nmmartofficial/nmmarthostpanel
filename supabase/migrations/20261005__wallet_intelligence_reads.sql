BEGIN;

CREATE OR REPLACE FUNCTION public.admin_wallet_intelligence()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $function$
DECLARE
  v_result JSONB;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.admin_users AS admin_user
    WHERE admin_user.auth_user_id = auth.uid()
      AND admin_user.status = 'active'
      AND admin_user.role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'Only active super admins can view wallet intelligence'
      USING ERRCODE = '42501';
  END IF;

  WITH permitted_tenants AS (
    SELECT DISTINCT admin_user.tenant_id, admin_user.company_code
    FROM public.admin_users AS admin_user
    WHERE admin_user.auth_user_id = auth.uid()
      AND admin_user.status = 'active'
      AND admin_user.role = 'super_admin'
      AND admin_user.tenant_id IS NOT NULL
      AND admin_user.company_code IS NOT NULL
  ),
  customers AS (
    SELECT
      customer.id AS user_id,
      customer.tenant_id,
      customer.company_code,
      customer.name AS customer_name,
      customer.email AS customer_email,
      customer.phone AS customer_phone,
      customer.created_at,
      customer.is_active,
      login.last_sign_in_at
    FROM public.customer_auth_links AS account_link
    JOIN public.users AS customer
      ON customer.id = account_link.user_id
     AND customer.tenant_id = account_link.tenant_id
     AND customer.company_code = account_link.company_code
    JOIN auth.users AS login
      ON login.id = account_link.auth_user_id
     AND login.last_sign_in_at IS NOT NULL
    JOIN permitted_tenants AS permitted
      ON permitted.tenant_id = customer.tenant_id
     AND permitted.company_code = customer.company_code
    WHERE customer.is_active IS DISTINCT FROM FALSE
  ),
  order_metrics AS (
    SELECT
      order_row.user_id,
      order_row.tenant_id,
      order_row.company_code,
      COUNT(*) FILTER (
        WHERE LOWER(COALESCE(order_row.order_status, order_row.status, '')) = 'delivered'
      ) AS orders_count,
      COALESCE(SUM(COALESCE(order_row.total_amount, order_row.total, 0)) FILTER (
        WHERE LOWER(COALESCE(order_row.order_status, order_row.status, '')) = 'delivered'
      ), 0) AS lifetime_shopping,
      COALESCE(SUM(COALESCE(order_row.total_amount, order_row.total, 0)) FILTER (
        WHERE order_row.created_at >= NOW() - INTERVAL '30 days'
          AND LOWER(COALESCE(order_row.order_status, order_row.status, '')) = 'delivered'
      ), 0) AS spend_30d,
      COALESCE(SUM(COALESCE(order_row.total_amount, order_row.total, 0)) FILTER (
        WHERE order_row.created_at >= NOW() - INTERVAL '90 days'
          AND LOWER(COALESCE(order_row.order_status, order_row.status, '')) = 'delivered'
      ), 0) AS spend_90d,
      COALESCE(SUM(COALESCE(order_row.total_amount, order_row.total, 0)) FILTER (
        WHERE order_row.created_at >= NOW() - INTERVAL '6 months'
          AND LOWER(COALESCE(order_row.order_status, order_row.status, '')) = 'delivered'
      ), 0) AS spend_6m,
      COALESCE(SUM(COALESCE(order_row.total_amount, order_row.total, 0)) FILTER (
        WHERE order_row.created_at >= NOW() - INTERVAL '1 year'
          AND LOWER(COALESCE(order_row.order_status, order_row.status, '')) = 'delivered'
      ), 0) AS spend_1y,
      MAX(order_row.created_at) FILTER (
        WHERE LOWER(COALESCE(order_row.order_status, order_row.status, '')) = 'delivered'
      ) AS last_purchase
    FROM public.orders AS order_row
    JOIN customers AS customer
      ON customer.user_id = order_row.user_id
     AND customer.tenant_id = order_row.tenant_id
     AND customer.company_code = order_row.company_code
    WHERE order_row.is_deleted IS DISTINCT FROM TRUE
    GROUP BY order_row.user_id, order_row.tenant_id, order_row.company_code
  ),
  wallet_metrics AS (
    SELECT
      wallet_row.user_id,
      wallet_row.tenant_id,
      wallet_row.company_code,
      wallet_row.balance
    FROM public.wallet_master AS wallet_row
    JOIN customers AS customer
      ON customer.user_id = wallet_row.user_id
     AND customer.tenant_id = wallet_row.tenant_id
     AND customer.company_code = wallet_row.company_code
    WHERE wallet_row.id = (
        SELECT MIN(wallet_pick.id)
        FROM public.wallet_master AS wallet_pick
        WHERE wallet_pick.user_id = wallet_row.user_id
          AND wallet_pick.tenant_id = wallet_row.tenant_id
          AND wallet_pick.company_code = wallet_row.company_code
      )
  ),
  ledger_metrics AS (
    SELECT
      transaction_row.user_id,
      transaction_row.tenant_id,
      transaction_row.company_code,
      COUNT(*) AS transaction_count,
      MAX(transaction_row.created_at) AS last_transaction_at
    FROM public.wallet_transactions AS transaction_row
    JOIN customers AS customer
      ON customer.user_id = transaction_row.user_id
     AND customer.tenant_id = transaction_row.tenant_id
     AND customer.company_code = transaction_row.company_code
    WHERE LOWER(COALESCE(transaction_row.status, 'posted')) NOT IN ('void', 'voided', 'cancelled', 'reversed')
    GROUP BY transaction_row.user_id, transaction_row.tenant_id, transaction_row.company_code
  ),
  combined AS (
    SELECT
      customer.*,
      COALESCE(order_metrics.orders_count, 0)::BIGINT AS orders_count,
      COALESCE(order_metrics.lifetime_shopping, 0)::NUMERIC AS lifetime_shopping,
      COALESCE(order_metrics.spend_30d, 0)::NUMERIC AS spend_30d,
      COALESCE(order_metrics.spend_90d, 0)::NUMERIC AS spend_90d,
      COALESCE(order_metrics.spend_6m, 0)::NUMERIC AS spend_6m,
      COALESCE(order_metrics.spend_1y, 0)::NUMERIC AS spend_1y,
      order_metrics.last_purchase,
      COALESCE(wallet_metrics.balance, 0)::NUMERIC AS wallet_balance,
      COALESCE(ledger_metrics.transaction_count, 0)::BIGINT AS wallet_transaction_count,
      ledger_metrics.last_transaction_at,
      NULL::NUMERIC AS outstanding_credit
    FROM customers AS customer
    LEFT JOIN order_metrics
      ON order_metrics.user_id = customer.user_id
     AND order_metrics.tenant_id = customer.tenant_id
     AND order_metrics.company_code = customer.company_code
    LEFT JOIN wallet_metrics
      ON wallet_metrics.user_id = customer.user_id
     AND wallet_metrics.tenant_id = customer.tenant_id
     AND wallet_metrics.company_code = customer.company_code
    LEFT JOIN ledger_metrics
      ON ledger_metrics.user_id = customer.user_id
     AND ledger_metrics.tenant_id = customer.tenant_id
     AND ledger_metrics.company_code = customer.company_code
  ),
  scored AS (
    SELECT
      combined.*,
      CASE
        WHEN combined.orders_count = 0 OR combined.last_purchase IS NULL THEN 'inactive'
        WHEN combined.last_purchase >= NOW() - INTERVAL '30 days' THEN 'active'
        WHEN combined.last_purchase >= NOW() - INTERVAL '90 days' THEN 'low_activity'
        ELSE 'inactive'
      END AS activity_status,
      CASE
        WHEN combined.orders_count = 0 THEN 'new'
        WHEN combined.orders_count = 1 THEN 'new'
        ELSE 'regular'
      END AS customer_type
    FROM combined
  ),
  customer_json AS (
    SELECT COALESCE(
      JSONB_AGG(
        JSONB_BUILD_OBJECT(
          'user_id', scored.user_id,
          'tenant_id', scored.tenant_id,
          'company_code', scored.company_code,
          'customer_name', scored.customer_name,
          'customer_email', scored.customer_email,
          'customer_phone', scored.customer_phone,
          'customer_since', scored.created_at,
          'customer_status', CASE WHEN scored.is_active IS FALSE THEN 'Inactive' ELSE 'Active' END,
          'last_login_at', scored.last_sign_in_at,
          'orders_count', scored.orders_count,
          'lifetime_shopping', scored.lifetime_shopping,
          'spend_30d', scored.spend_30d,
          'spend_90d', scored.spend_90d,
          'spend_6m', scored.spend_6m,
          'spend_1y', scored.spend_1y,
          'average_order', CASE WHEN scored.orders_count = 0 THEN NULL ELSE scored.lifetime_shopping / scored.orders_count END,
          'last_purchase', scored.last_purchase,
          'wallet_balance', scored.wallet_balance,
          'outstanding_credit', scored.outstanding_credit,
          'wallet_transaction_count', scored.wallet_transaction_count,
          'last_transaction_at', scored.last_transaction_at,
          'payment_history', 'No History',
          'payment_history_ratio', NULL,
          'score', NULL,
          'activity_status', scored.activity_status,
          'customer_type', scored.customer_type,
          'recommendation', 'review',
          'recommendation_reason', 'No verified repayment ledger is available to assess outstanding credit.',
          'suggested_limit', NULL
        )
        ORDER BY scored.lifetime_shopping DESC, scored.customer_name, scored.user_id
      ),
      '[]'::JSONB
    ) AS customers
    FROM scored
  ),
  wallet_summary AS (
    SELECT COALESCE(SUM(wallet_balance), 0)::NUMERIC AS balance
    FROM scored
  ),
  shopping_summary AS (
    SELECT COALESCE(SUM(lifetime_shopping), 0)::NUMERIC AS shopping
    FROM scored
  )
  SELECT JSONB_BUILD_OBJECT(
    'customers', customer_json.customers,
    'summary', JSONB_BUILD_OBJECT(
      'total_customers', (SELECT COUNT(*) FROM scored),
      'active_customers', (SELECT COUNT(*) FROM scored WHERE activity_status = 'active'),
      'low_activity_customers', (SELECT COUNT(*) FROM scored WHERE activity_status = 'low_activity'),
      'inactive_customers', (SELECT COUNT(*) FROM scored WHERE activity_status = 'inactive'),
      'wallet_balance', (SELECT balance FROM wallet_summary),
      'outstanding_credit', NULL,
      'credit_eligible', NULL,
      'needs_review', (SELECT COUNT(*) FROM scored),
      'not_recommended', NULL,
      'shopping_value', (SELECT shopping FROM shopping_summary)
    )
  )
  INTO v_result
  FROM customer_json;

  RETURN COALESCE(v_result, JSONB_BUILD_OBJECT(
    'customers', '[]'::JSONB,
    'summary', JSONB_BUILD_OBJECT(
      'total_customers', 0,
      'active_customers', 0,
      'low_activity_customers', 0,
      'inactive_customers', 0,
      'wallet_balance', 0,
      'outstanding_credit', NULL,
      'credit_eligible', NULL,
      'needs_review', 0,
      'not_recommended', NULL,
      'shopping_value', 0
    )
  ));
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_wallet_customer_detail(
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
  v_order_history JSONB;
  v_wallet_history JSONB;
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
    RAISE EXCEPTION 'Not authorized to view this customer history'
      USING ERRCODE = '42501';
  END IF;

  IF p_user_id IS NULL OR p_months IS NULL OR p_months NOT IN (1, 3, 6, 12) OR NOT EXISTS (
    SELECT 1
    FROM public.customer_auth_links AS account_link
    JOIN public.users AS customer
      ON customer.id = account_link.user_id
     AND customer.tenant_id = account_link.tenant_id
     AND customer.company_code = account_link.company_code
    JOIN auth.users AS login
      ON login.id = account_link.auth_user_id
    WHERE account_link.user_id = p_user_id
      AND account_link.tenant_id = p_tenant_id
      AND account_link.company_code = p_company_code
      AND login.last_sign_in_at IS NOT NULL
      AND customer.is_active IS DISTINCT FROM FALSE
  ) THEN
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
  INTO v_order_history
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
  INTO v_wallet_history
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
      JSONB_BUILD_OBJECT('month', spending.month, 'amount', spending.amount)
      ORDER BY spending.month
    ),
    '[]'::JSONB
  )
  INTO v_spending_trend
  FROM (
    SELECT
      months.month_start::DATE AS month,
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

  RETURN JSONB_BUILD_OBJECT(
    'orders', v_order_history,
    'wallet_transactions', v_wallet_history,
    'spending_trend', v_spending_trend
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_wallet_intelligence() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_wallet_intelligence() TO authenticated;

REVOKE ALL ON FUNCTION public.admin_wallet_customer_detail(BIGINT, BIGINT, TEXT, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_wallet_customer_detail(BIGINT, BIGINT, TEXT, INTEGER) TO authenticated;

COMMIT;
