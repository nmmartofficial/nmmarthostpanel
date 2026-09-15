-- =====================================================================
-- NM MART ULTRA RETAIL ERP
-- Migration 0203 — RPC Function B-3: adjust_wallet_atomic
-- ---------------------------------------------------------------------
-- Purpose : Atomic (ALL or NOTHING) Wallet Credit/Debit + Log.
--           Guarantees:
--             (a) wallet_master.balance is always consistent
--             (b) wallet_transactions row is always inserted or nothing
--             (c) cannot overdraw past zero (debit)
-- Call    : SELECT public.adjust_wallet_atomic(
--               p_user_id    := 123,
--               p_amount     := 99.50,   -- + for credit, - for debit
--               p_type       := 'credit', -- 'credit' | 'debit'
--               p_reason     := 'Order #123 cashback'
--           );
-- =====================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.adjust_wallet_atomic(
    p_user_id   BIGINT,
    p_amount    NUMERIC,
    p_type      TEXT,
    p_reason    TEXT
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
    IF p_user_id IS NULL OR p_amount IS NULL OR p_type IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Normalize sign according to p_type
    p_amount   := ABS(p_amount);
    v_signed_amt := CASE WHEN LOWER(p_type) = 'debit' THEN -p_amount ELSE p_amount END;

    -- 1. Resolve wallet_row (or CREATE one atomically if missing)
    SELECT id, balance INTO v_wallet_id, v_old_bal
    FROM public.wallet_master
    WHERE (user_id = p_user_id OR customer_id = p_user_id)
      AND (tenant_id = v_tenant_id OR v_tenant_id IS NULL)
    ORDER BY id LIMIT 1
    FOR UPDATE;

    IF NOT FOUND THEN
        INSERT INTO public.wallet_master
            (user_id, customer_id, balance, is_active, tenant_id, company_code, created_at, updated_at)
        VALUES
            (p_user_id, p_user_id, 0, TRUE, v_tenant_id, SUBSTRING(v_company FROM 1 FOR 16), NOW(), NOW())
        RETURNING id, balance INTO v_wallet_id, v_old_bal;
    END IF;

    v_new_bal := COALESCE(v_old_bal, 0) + v_signed_amt;

    -- Overdraw guard (debit case)
    IF LOWER(p_type) = 'debit' AND v_new_bal < 0 THEN
        RAISE EXCEPTION 'Wallet overdraw denied: old=%, amount=%, new=%', v_old_bal, v_signed_amt, v_new_bal;
    END IF;

    -- 2. Update balance
    UPDATE public.wallet_master
    SET balance     = v_new_bal,
        updated_at  = NOW()
    WHERE id = v_wallet_id;

    -- 3. Insert transaction log (single row per call = 1 atomic operation)
    INSERT INTO public.wallet_transactions
        (wallet_id, user_id, amount, type, reason, reference_id,
         created_at, updated_at, tenant_id, company_code)
    VALUES
        (v_wallet_id, p_user_id, p_amount, LOWER(p_type), p_reason, NULL,
         NOW(), NOW(),
         v_tenant_id, SUBSTRING(v_company FROM 1 FOR 16));

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;

ALTER FUNCTION public.adjust_wallet_atomic(BIGINT, NUMERIC, TEXT, TEXT) DISABLE ROW LEVEL SECURITY;
GRANT EXECUTE ON FUNCTION public.adjust_wallet_atomic(BIGINT, NUMERIC, TEXT, TEXT) TO anon, authenticated, service_role;

COMMIT;
