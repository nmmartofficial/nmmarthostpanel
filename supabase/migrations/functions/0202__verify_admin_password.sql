-- =====================================================================
-- NM MART ULTRA RETAIL ERP
-- Migration 0202 — RPC Function B-1: verify_admin_password
-- ---------------------------------------------------------------------
-- Purpose : Server-side admin credential verification (Login fallback)
--           (Used when Supabase Auth JWT flow is unavailable, or
--            explicit re-auth is needed for destructive actions)
-- Uses    : pgcrypto.crypt() — password stored as crypt(.., gen_salt('bf'))
-- Call    : SELECT public.verify_admin_password('username/email', 'plain');
-- =====================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.verify_admin_password(
    p_username_or_email TEXT,
    p_password          TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_row       RECORD;
    v_ok        BOOLEAN;
BEGIN
    IF p_username_or_email IS NULL OR p_password IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Match by username (case-insensitive) or email (case-insensitive)
    SELECT * INTO v_row
    FROM public.admin_users
    WHERE is_active = TRUE
      AND ( LOWER(username) = LOWER(TRIM(p_username_or_email))
         OR LOWER(email)    = LOWER(TRIM(p_username_or_email)) )
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    IF v_row.password_hash IS NULL OR LENGTH(v_row.password_hash) = 0 THEN
        RETURN FALSE;
    END IF;

    -- pgcrypto crypt() comparison (auto-detects algo from hash prefix)
    BEGIN
        v_ok := (v_row.password_hash = public.crypt(p_password, v_row.password_hash));
    EXCEPTION WHEN OTHERS THEN
        v_ok := FALSE;
    END;

    RETURN v_ok;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

ALTER FUNCTION public.verify_admin_password(TEXT, TEXT) DISABLE ROW LEVEL SECURITY;
GRANT EXECUTE ON FUNCTION public.verify_admin_password(TEXT, TEXT) TO anon, authenticated, service_role;

COMMIT;
