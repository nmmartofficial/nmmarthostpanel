# NM MART Retail Admin Panel & Supabase Backend Sync - Product Requirements Document

## Overview
- **Summary**: Live Supabase database (project: mggkadgemqcyybsplkqc) par CONSOLIDATED_SCHEMA_v3.1_FINAL.sql apply karna, missing `verify_admin_password` RPC function ko fix karna, seeded super-admin user ko correct bcrypt hash ke saath set karna, aur 5 verification queries run karke confirm karna ki sab kuch sahi se kaam kar raha hai.
- **Purpose**: Admin login currently fail ho raha hai kyunki `public.verify_admin_password(text, text)` function live DB me missing hai (Error 42883). Full schema apply karne se 40 tables + 9 functions + RLS + seeds sab ek saath sync ho jayenge.
- **Target Users**: NM MART Super Admin (nmmart07@gmail.com) aur Retail ERP Admin Panel users.

## Goals
1. Live DB me `public.verify_admin_password(text, text)` RPC function (JSONB return type) available ho aur admin auth flawlessly work kare.
2. Live public schema me exactly 40 tables + 9 functions hon (CONSOLIDATED_SCHEMA_v3.1 ke according).
3. Seeded Super Admin user: `nmmart07@gmail.com` / `nmmart2026` — bcrypt hash se stored ho aur RPC se verified ho.
4. Frontend LoginView + AuthContext fallback RPC flow se successful login ho paaye.

## Non-Goals
1. Supabase Auth (auth.users table) ke JWT flow ko modify nahi karna (sirf admin table fallback RPC fix).
2. New features ya UI changes nahi karna — sirf DB schema + seed sync.
3. Data migration of existing live records nahi karna (schema file me DROP SCHEMA CASCADE hai → clean slate).
4. RLS policy logic ko redesign nahi karna — schema file me jo hai wohi apply.

## Background & Context
- **Current Live State**: public schema me 37 tables hain, target 40 + 9 functions.
- **Error 42883**: function public.verify_admin_password(text, text) does not exist. Frontend AuthContext.jsx line 442 par is RPC ko fallback auth ke liye call kiya jaata hai.
- **Schema mismatch**: Migration file `migrations/functions/0202__verify_admin_password.sql` BOOLEAN return karta hai, lekin frontend JSONB `{verified: true, profile: {...}}` expect karta hai. CONSOLIDATED_SCHEMA_v3.1_FINAL.sql me FIXED JSONB version hai (line 1131-1176).
- **db-admin script**: `scripts/db-admin.mjs` direct Supabase Management REST API (api.supabase.com/v1/projects/<ref>/database/query) ke through SQL execute karta hai. .env me `SUPABASE_ACCESS_TOKEN=sbp_fc017333564e03de61d2fe47b0857531c332ead9` configured hai.
- **Seed admin user (v3.1 line 1691)**: `crypt('nmmart2026', gen_salt('bf'))` se password hash generate hota hai, email `nmmart07@gmail.com`, role `super_admin`.

## Functional Requirements
- **FR-1**: `node scripts/db-admin.mjs file supabase/CONSOLIDATED_SCHEMA_v3.1_FINAL.sql` live Supabase project (mggkadgemqcyybsplkqc) par successfully execute ho.
- **FR-2**: Execution ke baad `public.verify_admin_password(p_username_or_email TEXT, p_password TEXT)` function exist kare aur JSONB return kare.
- **FR-3**: `public.admin_users` table me ek active row exist kare jisme: `email='nmmart07@gmail.com'`, `username='superadmin'`, `role='super_admin'`, `password_hash` crypt('nmmart2026', ...) ka bcrypt hash ho.
- **FR-4**: `SELECT public.verify_admin_password('nmmart07@gmail.com', 'nmmart2026')` call karne par `{"verified": true, "profile": {...}}` JSONB result aaye.
- **FR-5**: Schema apply hone ke baad 5 verification queries execute ho aur unke expected results match kare.

## Non-Functional Requirements
- **NFR-1**: Schema apply karne se pehle `.env` credentials verified hone chahiye (token valid hai).
- **NFR-2**: Har verification query ka output console me clearly visible hona chahiye (debugging ke liye).
- **NFR-3**: Sab execution steps db-admin.mjs ke through hone chahiye — koi direct SQL Editor manual paste nahi.
- **NFR-4**: Schema file me BEGIN...COMMIT transaction block hai, isliye full apply atomic hona chahiye.

## Constraints
- **Technical (DESTRUCTIVE)**: CONSOLIDATED_SCHEMA_v3.1_FINAL.sql ki line 4 me `DROP SCHEMA IF EXISTS public CASCADE;` hai — iska matlab live DB ka existing public schema POORE TARAH DELETE ho jayega phir se recreate hoga. Ye INTENTIONAL hai (clean slate guarantee) but user aware hona chahiye.
- **Technical**: v3.1 ke baad RLS policies enable hongi (file line 14xx me), SECURITY DEFINER functions execute permissions already GRANT ki hui hain.
- **Technical**: db-admin.mjs 1 request me poora SQL file bhejta hai → long query timeouts ka risk hai (but v3.1 file ~1800 lines, Supabase Management API typically handle kar leti hai).
- **Dependencies**: `.env` me `SUPABASE_ACCESS_TOKEN` valid aur non-expired hona chahiye (project `mggkadgemqcyybsplkqc` ke liye).
- **Dependencies**: Node.js runtime + `node-fetch`/native fetch available hona chahiye (db-admin.mjs uses native `fetch`).

## Assumptions
1. User ne live DB wipe hone ki explicit permission di hai (CONSOLIDATED_SCHEMA apply = clean slate).
2. SUPABASE_ACCESS_TOKEN abhi bhi valid hai (expired nahi hua).
3. Supabase project `mggkadgemqcyybsplkqc` currently active hai, paused nahi hai.
4. CONSOLIDATED_SCHEMA_v3.1_FINAL.sql me koi syntax error nahi hai (phle se validated hai v3.0 ke comparison me).
5. Frontend code me `supabase.rpc('verify_admin_password', {p_username_or_email, p_password})` ka call correct hai — modification ki zarurat nahi.

## Acceptance Criteria

### AC-1: Schema Execution Success
- **Type**: `rule`
- **Given**: .env me valid SUPABASE_ACCESS_TOKEN aur project id hai, db-admin.mjs script exist karti hai
- **When**: `node scripts/db-admin.mjs file supabase/CONSOLIDATED_SCHEMA_v3.1_FINAL.sql` run kiya jata hai
- **Then**: Script exit code 0 ke saath complete ho aur console me "✅ Success! File executed cleanly." message aaye
- **Pass Condition**: No process.exit(1), no SQL execution error logs
- **Evidence**: db-admin.mjs run ka terminal output (stdout + stderr captured)

### AC-2: Table Count = 40
- **Type**: `rule`
- **Given**: Schema successfully applied ho chuka hai
- **When**: Query run kare: `SELECT count(*) AS table_count FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' AND table_name NOT IN ('schema_migrations','pg_stat_statements');`
- **Then**: Result me table_count = 40 aaye
- **Pass Condition**: table_count === 40
- **Evidence**: db-admin.mjs query command ka JSON output

### AC-3: Function Count = 9
- **Type**: `rule`
- **Given**: Schema successfully applied ho chuka hai
- **When**: Query run kare: `SELECT count(*) AS func_count FROM pg_proc WHERE pronamespace = 'public'::regnamespace AND proname IN ('set_current_timestamp_updated_at','inject_tenant_context_on_insert','install_inject_tenant_triggers_on_all','current_company_code','matches_company_scope','verify_admin_pin','verify_admin_password','adjust_wallet_atomic','place_order_atomic');`
- **Then**: Result me func_count = 9 aaye
- **Pass Condition**: func_count === 9
- **Evidence**: db-admin.mjs query command ka JSON output

### AC-4: verify_admin_password returns verified=true with profile
- **Type**: `rule`
- **Given**: Schema applied hai aur admin_users me seeded row present hai
- **When**: Query run kare: `SELECT (public.verify_admin_password('nmmart07@gmail.com', 'nmmart2026') ->> 'verified')::boolean AS verified, (public.verify_admin_password('nmmart07@gmail.com', 'nmmart2026') -> 'profile' ->> 'email') AS profile_email, (public.verify_admin_password('nmmart07@gmail.com', 'nmmart2026') -> 'profile' ->> 'role') AS profile_role;`
- **Then**: verified=true, profile_email='nmmart07@gmail.com', profile_role='super_admin'
- **Pass Condition**: All 3 values match expected
- **Evidence**: db-admin.mjs query command ka JSON output

### AC-5: Seeded Admin User Exists with Correct Columns
- **Type**: `rule`
- **Given**: Schema applied hai
- **When**: Query run kare: `SELECT id, username, email, role, is_active, status, company_code FROM public.admin_users WHERE LOWER(email)='nmmart07@gmail.com' AND LOWER(username)='superadmin';`
- **Then**: 1 row return ho jisme role='super_admin', is_active=true, status='active', company_code='NMM001'
- **Pass Condition**: Exactly 1 row with all 4 columns matching expected values
- **Evidence**: db-admin.mjs query command ka JSON output

### AC-6: verify_admin_password Function Signature Correct (JSONB not BOOLEAN)
- **Type**: `rule`
- **Given**: Schema applied hai
- **When**: Query run kare: `SELECT pg_get_functiondef(oid) AS func_def FROM pg_proc WHERE proname='verify_admin_password' AND pronargs=2;`
- **Then**: func_def me `RETURNS jsonb` shamil ho (BOOLEAN ke bajaye)
- **Pass Condition**: func_def contains "RETURNS jsonb" AND contains "SECURITY DEFINER"
- **Evidence**: db-admin.mjs query command ka JSON output

## Open Questions
- [ ] Kya live DB ke existing data ka backup lene ki zarurat hai? (User ne explicitly CONSOLIDATED apply kaha hai → likely NO, but confirm karna better)
- [ ] Kya Supabase Auth (auth.users table) me bhi `nmmart07@gmail.com` ke liye user create karna hai? (User ke requirements me sirf admin_users table + RPC mention hai → AuthContext pehle Supabase Auth try karta hai phir RPC fallback. Agar auth.users me user nahi hoga to direct RPC se login ho jayega, jo bhi chal jayega.)
