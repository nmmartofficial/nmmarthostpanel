# NM MART Retail Admin Panel & Supabase Backend Sync - Implementation Plan

## Task 1: Validate Environment & Credentials
- **Status**: `pending`
- **Priority**: high
- **Depends On**: None
- **Description**:
  - .env file read karke verify karna ki SUPABASE_PROJECT_ID='mggkadgemqcyybsplkqc' aur SUPABASE_ACCESS_TOKEN set hain.
  - db-admin.mjs script ka syntax check karna (run with --help / no args usage output).
  - Ek small test query run karke confirm karna ki Supabase Management API reachable hai aur token valid hai: `SELECT 1 AS ping;`
- **Acceptance Criteria Addressed**: AC-1 (prerequisite)
- **Test Requirements**:
  - `rule` TR-1.1: `node scripts/db-admin.mjs query "SELECT 1 AS ping;"` run karne par result `[{"ping":1}]` aaye, exit code 0 ho. Evidence: terminal output capture.
- **Notes**: Agar ping fail ho to credentials ya network issue hai — block before proceeding.

## Task 2: Execute CONSOLIDATED_SCHEMA_v3.1_FINAL.sql on Live DB via db-admin
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - WARNING: File ke start me `DROP SCHEMA public CASCADE` hai — ye poora public schema wipe karega phir recreate karega. Ye intentional hai (clean slate).
  - Command: `node scripts/db-admin.mjs file supabase/CONSOLIDATED_SCHEMA_v3.1_FINAL.sql`
  - Command ka poora stdout + stderr capture karna (success ya error debugging ke liye).
  - Agar koi SQL error aaye to exact error message document karna.
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `rule` TR-2.1: Script exit code === 0 aur stdout me "✅ Success! File executed cleanly." message aaye. Evidence: raw terminal stdout+stderr.
  - `rule` TR-2.2: Capture ki gayi response me koi SQL error (code 42xxx ya 23xxx etc.) na ho. Evidence: same capture.
- **Notes**: File ~1800 lines hai — execution me 5-15 sec lag sakte hain, timeout wait karna.

## Task 3: Verify Table Count = 40
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 2
- **Description**:
  - Verification Query V1 run karo: `SELECT count(*) AS table_count FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' AND table_name NOT IN ('schema_migrations','pg_stat_statements','pg_buffercache');`
  - Result ko TR-3.1 ke against check karo.
- **Acceptance Criteria Addressed**: AC-2
- **Test Requirements**:
  - `rule` TR-3.1: Query result me table_count === 40. Evidence: `node scripts/db-admin.mjs query "<V1>"` ka JSON output.

## Task 4: Verify Function Count = 9
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 2
- **Description**:
  - Verification Query V2 run karo: 9 named functions ka count check karo (set_current_timestamp_updated_at, inject_tenant_context_on_insert, install_inject_tenant_triggers_on_all, current_company_code, matches_company_scope, verify_admin_pin, verify_admin_password, adjust_wallet_atomic, place_order_atomic).
- **Acceptance Criteria Addressed**: AC-3
- **Test Requirements**:
  - `rule` TR-4.1: Query result me func_count === 9. Evidence: `node scripts/db-admin.mjs query "<V2>"` ka JSON output.

## Task 5: Verify verify_admin_password Function Signature (JSONB return)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 2
- **Description**:
  - Verification Query V3: `SELECT pg_get_functiondef(oid) AS func_def FROM pg_proc WHERE proname='verify_admin_password' AND pronargs=2;`
  - Confirm karo ki return type JSONB hai, BOOLEAN nahi (purana migration 0202 galat tha, v3.1 me fix hai).
  - Confirm karo ki SECURITY DEFINER flag set hai.
- **Acceptance Criteria Addressed**: AC-6
- **Test Requirements**:
  - `rule` TR-5.1: func_def me "RETURNS jsonb" substring present ho. Evidence: query output.
  - `rule` TR-5.2: func_def me "SECURITY DEFINER" substring present ho. Evidence: same query output.

## Task 6: Verify Seeded Admin User Record Exists
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 2
- **Description**:
  - Verification Query V4 run karo: `SELECT id, username, email, role, is_active, status, company_code FROM public.admin_users WHERE LOWER(email)='nmmart07@gmail.com' AND LOWER(username)='superadmin';`
  - Check karo ki 1 row aaye aur columns match karein.
- **Acceptance Criteria Addressed**: AC-5
- **Test Requirements**:
  - `rule` TR-6.1: Result row count === 1. Evidence: query JSON output.
  - `rule` TR-6.2: Row me role='super_admin', is_active=true, status='active', company_code='NMM001'. Evidence: same query output.

## Task 7: Verify verify_admin_password RPC Returns JSONB with verified:true + profile
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 5, Task 6
- **Description**:
  - Verification Query V5 run karo: `SELECT (public.verify_admin_password('nmmart07@gmail.com', 'nmmart2026') ->> 'verified')::boolean AS verified, (public.verify_admin_password('nmmart07@gmail.com', 'nmmart2026') -> 'profile' ->> 'email') AS profile_email, (public.verify_admin_password('nmmart07@gmail.com', 'nmmart2026') -> 'profile' ->> 'role') AS profile_role, (public.verify_admin_password('nmmart07@gmail.com', 'nmmart2026') -> 'profile' ->> 'username') AS profile_username, (public.verify_admin_password('nmmart07@gmail.com', 'WRONGPASSWORD') ->> 'verified')::boolean AS wrong_verified;`
  - Check karo ki correct credentials ke saath verified=true + profile fields aaye, aur wrong password ke saath verified=false aaye.
- **Acceptance Criteria Addressed**: AC-4
- **Test Requirements**:
  - `rule` TR-7.1: verified === true, profile_email === 'nmmart07@gmail.com', profile_role === 'super_admin', profile_username === 'superadmin'. Evidence: query output.
  - `rule` TR-7.2: wrong_verified === false (negative test). Evidence: same query output.

## Task 8: Sanity Check — Frontend Auth Flow Logic
- **Status**: `pending`
- **Priority**: medium
- **Depends On**: Task 7
- **Description**:
  - Code-level static verification:
    - AuthContext.jsx L442: `supabase.rpc('verify_admin_password', {p_username_or_email: email, p_password: password})` — parameter names match v3.1 function signature.
    - AuthContext.jsx L455: `fbData.verified === true && fbData.profile` — ye JSONB structure ko access kar raha hai.
    - Confirm karo ki RPC ke parameter names `p_username_or_email` aur `p_password` hain (function definition ke according).
  - Dev server start karke browser me login page test karne ka suggestion user ko de (manual step, automation scope me nahi).
- **Acceptance Criteria Addressed**: AC-4 (indirect)
- **Test Requirements**:
  - `rule` TR-8.1: AuthContext me RPC call ke parameter names function definition se match karein. Evidence: AuthContext.jsx source + pg_get_functiondef output side-by-side.
  - `rubric` TR-8.2: Frontend auth flow robustness; scale 1-5; 1=broken fallback, 3=works but missing edge cases, 5=complete fallback+JWT+profile hydration; threshold >= 4. Evidence: manual code review of AuthContext.jsx L391-678.
- **Notes**: Actual browser login test user ko manual karna hoga (ya dev server start karke). Automated E2E scope me nahi.
