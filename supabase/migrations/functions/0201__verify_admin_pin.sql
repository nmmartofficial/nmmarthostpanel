-- =====================================================================
-- NM MART ULTRA RETAIL ERP
-- Migration 0201 — RPC Function B-2: verify_admin_pin
-- ---------------------------------------------------------------------
-- Purpose : Server-side verify Global App Security PIN
--           (Unlocks Settings, Config, Delete-Dangerous ops)
-- Call    : SELECT public.verify_admin_pin('MySecurePin123');
--           Or via supabase.rpc('verify_admin_pin', {pin: '...'})
-- Dev Note: PIN value lives in TWO places for fallback:
--           (a) PostgreSQL GUC : current_setting('app.admin_security_pin', true)
--           (b) Fallback      : app_config row WHERE key='admin_security_pin'
-- =====================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.verify_admin_pin(p_pin TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_guc_pin   TEXT;
    v_db_pin    TEXT;
    v_match     BOOLEAN;
BEGIN
    IF p_pin IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Source A : GUC (faster, preferred. Can be set via ALTER ROLE / SET / app)
    BEGIN
        v_guc_pin := current_setting('app.admin_security_pin', true);
    EXCEPTION WHEN OTHERS THEN v_guc_pin := NULL; END;

    -- Source B : app_config table fallback
    BEGIN
        SELECT value::TEXT INTO v_db_pin
        FROM public.app_config
        WHERE key = 'admin_security_pin'
        LIMIT 1;
    EXCEPTION WHEN OTHERS THEN v_db_pin := NULL; END;

    -- Match if EITHER source matches (constant-time best-effort compare)
    v_match := FALSE;
    IF v_guc_pin IS NOT NULL AND LENGTH(v_guc_pin) > 0 THEN
        v_match := v_match OR (v_guc_pin = p_pin);
    END IF;
    IF v_db_pin IS NOT NULL AND LENGTH(v_db_pin) > 0 THEN
        v_match := v_match OR (v_db_pin = p_pin);
    END IF;

    RETURN v_match;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

ALTER FUNCTION public.verify_admin_pin(p_pin TEXT) DISABLE ROW LEVEL SECURITY;
GRANT EXECUTE ON FUNCTION public.verify_admin_pin(TEXT) TO anon, authenticated, service_role;

COMMIT;
