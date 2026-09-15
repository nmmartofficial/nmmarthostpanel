BEGIN;

-- ============================================================
-- HOTFIX: verify_admin_password - REMOVE public. prefix from crypt()
-- BUG: public.crypt(unknown, unknown) does NOT exist (42883)
-- FIX: use plain crypt() — pgcrypto extension is in search_path
-- ============================================================
CREATE OR REPLACE FUNCTION public.verify_admin_password(
  p_username_or_email TEXT, p_password TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_row RECORD; v_ok BOOLEAN; v_hash TEXT;
BEGIN
  IF p_username_or_email IS NULL OR p_password IS NULL THEN
    RETURN jsonb_build_object('verified', FALSE, 'profile', NULL, 'error', 'missing_inputs');
  END IF;
  SELECT * INTO v_row FROM public.admin_users
    WHERE is_active = TRUE
      AND ( LOWER(username) = LOWER(TRIM(p_username_or_email))
         OR LOWER(email)    = LOWER(TRIM(p_username_or_email)) )
    LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('verified', FALSE, 'profile', NULL, 'error', 'user_not_found');
  END IF;
  v_hash := v_row.password_hash;
  IF v_hash IS NULL OR LENGTH(v_hash) = 0 THEN
    RETURN jsonb_build_object('verified', FALSE, 'profile', NULL, 'error', 'no_password_set');
  END IF;
  -- HOTFIX: removed public. prefix on crypt() — pgcrypto is NOT in public schema
  BEGIN v_ok := (v_hash = crypt(p_password, v_hash));
  EXCEPTION WHEN OTHERS THEN v_ok := FALSE; END;
  IF NOT v_ok THEN
    RETURN jsonb_build_object('verified', FALSE, 'profile', NULL, 'error', 'wrong_password');
  END IF;
  RETURN jsonb_build_object(
    'verified', TRUE,
    'profile', jsonb_build_object(
      'id',           v_row.id,
      'username',     v_row.username,
      'email',        COALESCE(v_row.email, ''),
      'name',         COALESCE(v_row.name, v_row.username),
      'role',         COALESCE(v_row.role, 'cashier'),
      'company_code', v_row.company_code,
      'tenant_id',    v_row.tenant_id,
      'is_active',    v_row.is_active,
      'status',       COALESCE(v_row.status, 'active'),
      'permissions',  COALESCE(v_row.permissions, '{}'::jsonb)
    )
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
GRANT EXECUTE ON FUNCTION public.verify_admin_password(TEXT, TEXT) TO anon, authenticated, service_role;

COMMIT;
