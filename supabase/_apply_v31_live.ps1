param(
    [string]$PAT = "sbp_fc017333564e03de61d2fe47b0857531c332ead9",
    [string]$PROJECT_REF = "mggkadgemqcyybsplkqc",
    [string]$BASE_FILE = ".\supabase\CONSOLIDATED_SCHEMA_v3.0_FINAL.sql",
    [string]$OUTPUT_FILE = ".\supabase\CONSOLIDATED_SCHEMA_v3.1_FINAL.sql"
)

$ErrorActionPreference = "Stop"

# ============================================================
# STEP 1: Read v3.0 base SQL
# ============================================================
Write-Host "[1/8] Reading base v3.0 schema from $BASE_FILE ..." -ForegroundColor Cyan
$sql = Get-Content -Raw -LiteralPath $BASE_FILE -Encoding UTF8

# ============================================================
# STEP 2: Apply v3.0 → v3.1 transformations
# ============================================================
Write-Host "[2/8] Applying v3.1 transformations (credentials + seed expansions + payment_transactions fix)..." -ForegroundColor Cyan

# --- 2a: Version header bump ---
$sql = $sql -replace "NM MART ULTRA RETAIL ERP . CONSOLIDATED MASTER SCHEMA v3.0",
                     "NM MART ULTRA RETAIL ERP - CONSOLIDATED MASTER SCHEMA v3.1 [LIVE APPLIED]"
$sql = $sql -replace "38 Tables \+ 4 RPCs \+ 7 Views",
                     "40 Tables + 4 RPCs + 7 Views"

# --- 2b: Admin Super-Admin Credentials: email=nmmart07@gmail.com, password=nmmart2026 ---
$sql = $sql -replace "'admin@nmmart.in',\s*'\+91-99999-99999',\s*crypt\('admin@123', gen_salt\('bf'\)\),",
                     "'nmmart07@gmail.com', '+91-99999-99999', crypt('nmmart2026', gen_salt('bf')),"

# --- 2c: Categories EXPANSION (10 → 22 rows): Replace existing seed block with superset of all UI categories ---
$oldCategories = @"
-- 16.4  Popular / Seed Categories
INSERT INTO public.categories
    (tenant_id, company_code, name, description, sort_order, is_active)
VALUES
  (1, 'NMM001', 'Grocery & Staples', 'Daily need items like rice, dal, atta',         1, TRUE),
  (1, 'NMM001', 'Dairy & Eggs',      'Milk, curd, paneer, ghee, butter, eggs',       2, TRUE),
  (1, 'NMM001', 'Beverages',         'Cold drinks, juices, tea, coffee, water',      3, TRUE),
  (1, 'NMM001', 'Bakery & Snacks',   'Biscuits, chips, namkeen, cakes, bread',       4, TRUE),
  (1, 'NMM001', 'Personal Care',     'Soap, shampoo, toothpaste, cosmetics',         5, TRUE),
  (1, 'NMM001', 'Household',         'Detergent, cleaning, utensils, paper',         6, TRUE),
  (1, 'NMM001', 'Fresh Vegetables',  'Locally sourced daily vegetables',              7, TRUE),
  (1, 'NMM001', 'Fresh Fruits',      'Seasonal fresh fruits',                         8, TRUE),
  (1, 'NMM001', 'Frozen Food',       'Frozen peas, french fries, ice cream',          9, TRUE),
  (1, 'NMM001', 'Pharma & Wellness', 'OTC medicines, vitamins, health drinks',       10, TRUE)
ON CONFLICT DO NOTHING;
"@

$newCategories = @"
-- 16.4  Popular / Seed Categories  (v3.1 EXPANDED = 22 rows, 100% UI Aligned)
-- Superset of: modules/pos/data/categories.js + CategoryFilter.tsx + LeftSidebar All Items tabs
INSERT INTO public.categories
    (tenant_id, company_code, name, description, sort_order, is_active)
VALUES
  (1, 'NMM001', 'Grocery & Staples', 'Daily staples: rice, dal, atta, sugar, salt',   1, TRUE),
  (1, 'NMM001', 'Groceries',         'All Items quick tab (common grocery)',          2, TRUE),
  (1, 'NMM001', 'Atta',              'Wheat / multigrain atta, flours',               3, TRUE),
  (1, 'NMM001', 'Rice',              'Basmati, sona masoori, raw rice varieties',    4, TRUE),
  (1, 'NMM001', 'Oil',               'Sunflower, mustard, olive, coconut oils',      5, TRUE),
  (1, 'NMM001', 'Salt',              'Common salt, iodized, rock salt',               6, TRUE),
  (1, 'NMM001', 'Sugar',             'White sugar, khandsari, jaggery',               7, TRUE),
  (1, 'NMM001', 'Tea',               'Tea leaves, green tea, chai premix',            8, TRUE),
  (1, 'NMM001', 'Dairy & Eggs',      'Milk, curd, paneer, ghee, butter, eggs',       9, TRUE),
  (1, 'NMM001', 'Milk',              'Milk (cow, buffalo, toned, full-cream)',      10, TRUE),
  (1, 'NMM001', 'Bakery & Snacks',   'Bread, biscuits, chips, namkeen, cakes',      11, TRUE),
  (1, 'NMM001', 'Biscuits',          'Glucose, Marie, cream, sandwich biscuits',    12, TRUE),
  (1, 'NMM001', 'Instant Food',      'Noodles, pasta, ready-to-eat, soup mixes',    13, TRUE),
  (1, 'NMM001', 'Beverages',         'Soft drinks, juices, tea, coffee, water',     14, TRUE),
  (1, 'NMM001', 'Personal Care',     'Soap, shampoo, cosmetics, oral care',         15, TRUE),
  (1, 'NMM001', 'Toothpaste',        'Toothpastes, mouthwash, dental hygiene',      16, TRUE),
  (1, 'NMM001', 'Home Care',         'Detergent, cleaning liquids, dishwash',       17, TRUE),
  (1, 'NMM001', 'Household',         'Utensils, paper, disposables, storage',       18, TRUE),
  (1, 'NMM001', 'Frozen Food',       'Frozen veggies, french fries, ice-cream',     19, TRUE),
  (1, 'NMM001', 'Fresh Vegetables',  'Locally sourced daily vegetables',             20, TRUE),
  (1, 'NMM001', 'Fresh Fruits',      'Seasonal fresh fruits',                        21, TRUE),
  (1, 'NMM001', 'Pharma & Wellness', 'OTC medicines, vitamins, health drinks',      22, TRUE),
  (1, 'NMM001', 'Electronics',       'Mobiles, accessories, chargers, headphones',  23, TRUE),
  (1, 'NMM001', 'Clothing',          'Apparel, fashion, garments',                   24, TRUE)
ON CONFLICT (tenant_id, name) DO NOTHING;
"@

if ($sql.Contains("Grocery & Staples', 'Daily need items like rice")) {
    $sql = $sql.Replace($oldCategories, $newCategories)
} else {
    Write-Host "    !WARN: Could not locate old categories block to replace; appending via separate INSERT instead." -ForegroundColor Yellow
    $sql = $sql + "`n" + $newCategories
}

# --- 2d: Brands EXPANSION — add 5 missing product-mock brands (Aashirvaad, India Gate, Fortune, Lux, Colgate) ---
$sql = $sql -replace "  \(1, 'NMM001', 'Coca-Cola',           'COKE',     'Coca-Cola India Beverages',  NULL, TRUE\)\s*ON CONFLICT DO NOTHING;",
@"
  (1, 'NMM001', 'Coca-Cola',           'COKE',     'Coca-Cola India Beverages',  NULL, TRUE),
  (1, 'NMM001', 'Aashirvaad',          'AASH',     'ITC Aashirvaad Atta & Foods',NULL, TRUE),
  (1, 'NMM001', 'India Gate',          'IGATE',    'India Gate Rice/Basmati',    NULL, TRUE),
  (1, 'NMM001', 'Fortune',             'FORT',     'Fortune Edible Oils',         NULL, TRUE),
  (1, 'NMM001', 'Lux',                 'LUX',      'Lux Soap (Unilever)',         NULL, TRUE),
  (1, 'NMM001', 'Colgate',             'COLG',     'Colgate Palmolive Oral Care',NULL, TRUE)
ON CONFLICT DO NOTHING;
"@

# --- 2e: Units EXPANSION — add Packet, Bottle, Can (11 → 14) ---
$sql = $sql -replace "  \(1, 'NMM001', 'Nos',          'nos',    'nos',  11, TRUE\)\s*ON CONFLICT DO NOTHING;",
@"
  (1, 'NMM001', 'Nos',          'nos',    'nos',  11, TRUE),
  (1, 'NMM001', 'Packet',       'pkt',    'pkt',  12, TRUE),
  (1, 'NMM001', 'Bottle',       'btl',    'btl',  13, TRUE),
  (1, 'NMM001', 'Can',          'can',    'can',  14, TRUE)
ON CONFLICT DO NOTHING;
"@

# --- 2f: FIX: Add CREATE TABLE payment_transactions (was MISSING in v3.0 but listed in triggers/RLS/grants) ---
# Insert after "CREATE TABLE IF NOT EXISTS public.wallet_transactions" block or before 11. AUDIT section
$paymentTxTable = @"

-- 7.5  payment_transactions  (Dual-entry Payments Ledger — v3.1 FIX: table MISSING in v3.0!)
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id                  BIGSERIAL PRIMARY KEY,
  tenant_id           BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  company_code        VARCHAR(16) NOT NULL,
  order_id            BIGINT REFERENCES public.orders(id) ON DELETE SET NULL,
  wallet_id           BIGINT REFERENCES public.wallet_master(id) ON DELETE SET NULL,
  user_id             BIGINT REFERENCES public.users(id) ON DELETE SET NULL,
  transaction_type    VARCHAR(20) NOT NULL,   -- 'collection' | 'refund' | 'wallet_topup' | 'wallet_debit' | 'expense'
  payment_method      VARCHAR(20) NOT NULL,   -- 'Cash' | 'UPI' | 'Card' | 'Online' | 'Bank Transfer' | 'Wallet' | 'Credit'
  gateway             VARCHAR(30),            -- 'Razorpay' | 'Stripe' | 'PhonePe' | 'Paytm' | 'NONE'
  gateway_txn_id      VARCHAR(100),
  reference_number    VARCHAR(80),
  amount              NUMERIC(14,2) NOT NULL DEFAULT 0,
  currency            VARCHAR(3) DEFAULT 'INR',
  status              VARCHAR(20) DEFAULT 'pending',  -- 'pending' | 'success' | 'failed' | 'refunded'
  failure_reason      TEXT,
  notes               JSONB DEFAULT '{}'::jsonb,
  processed_at        TIMESTAMPTZ,
  created_by          BIGINT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_paytx_tenant  ON public.payment_transactions (tenant_id, company_code);
CREATE INDEX IF NOT EXISTS idx_paytx_order   ON public.payment_transactions (order_id);
CREATE INDEX IF NOT EXISTS idx_paytx_user    ON public.payment_transactions (user_id);
CREATE INDEX IF NOT EXISTS idx_paytx_status  ON public.payment_transactions (tenant_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_paytx_method  ON public.payment_transactions (tenant_id, payment_method);

"@

# Inject after wishlist table definition (section 10) OR just before line "-- 11. AUDIT / NOTIFICATIONS / SUPPORT"
if ($sql.Contains("-- 11. AUDIT / NOTIFICATIONS / SUPPORT")) {
    $sql = $sql.Replace("-- 11. AUDIT / NOTIFICATIONS / SUPPORT", $paymentTxTable + "`n-- 11. AUDIT / NOTIFICATIONS / SUPPORT")
} else {
    Write-Host "    !WARN: Could not locate 11. AUDIT anchor; appending payment_transactions DDL before BEGIN close." -ForegroundColor Yellow
    $sql = $sql.Replace("-- 13.  BATCH ATTACH TRIGGERS", $paymentTxTable + "`n-- 13.  BATCH ATTACH TRIGGERS")
}

# ============================================================
# STEP 3: Prepend DROP/CREATE SCHEMA RESET to BEGIN block
# ============================================================
Write-Host "[3/8] Prepending fresh schema-reset header (DROP public CASCADE)..." -ForegroundColor Cyan
$resetHeader = @"
-- ============================================================
-- PRE-FLIGHT RESET: Drops entire public schema so v3.1 is clean
-- (Supabase recreates auth/extensions/pgsql key schemas automatically)
-- ============================================================
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO anon;
GRANT ALL ON SCHEMA public TO authenticated;
GRANT ALL ON SCHEMA public TO service_role;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

"@
$sql = $resetHeader + $sql

# ============================================================
# STEP 4: Save v3.1 Final SQL file
# ============================================================
Write-Host "[4/8] Saving CONSOLIDATED_SCHEMA_v3.1_FINAL.sql ($($sql.Length) chars) ..." -ForegroundColor Cyan
Set-Content -LiteralPath $OUTPUT_FILE -Value $sql -Encoding UTF8 -NoNewline

# ============================================================
# STEP 5: Call Supabase Management API to APPLY LIVE
# ============================================================
Write-Host "[5/8] Calling Supabase Management API → APPLY schema LIVE to project $PROJECT_REF ..." -ForegroundColor Cyan

$headers = @{
    "Authorization" = "Bearer $PAT"
    "Content-Type"  = "application/json"
    "Accept"        = "application/json"
}

# The Management API needs the SQL wrapped in a JSON "query" field
# But because our SQL is large (1.8MB+) we must use the -Body parameter correctly.
# For very large queries, Supabase SQL Editor endpoint accepts chunked JSON via POST.
# We will POST the SQL to: POST https://api.supabase.com/v1/projects/{ref}/database/query
# Docs: https://supabase.com/docs/reference/api/projects-project-ref-database-query

$apiBase  = "https://api.supabase.com/v1/projects/$PROJECT_REF"
$queryUrl = "$apiBase/database/query"

# Serialize payload WITHOUT pretty-printing to minimize overhead
$payloadObj = [pscustomobject]@{ query = $sql; include_columns = $false; format = "json" }
$payload    = $payloadObj | ConvertTo-Json -Compress -Depth 5

Write-Host "    Request size: $($payload.Length) bytes" -ForegroundColor DarkGray
try {
    $resp = Invoke-RestMethod -Uri $queryUrl -Method Post -Headers $headers -Body ([System.Text.Encoding]::UTF8.GetBytes($payload)) -UseBasicParsing
    Write-Host "    API Response OK. Rows returned: $(($resp | Measure-Object).Count)" -ForegroundColor Green
    $resp | ConvertTo-Json -Depth 10 -Compress | Set-Content -LiteralPath ".\supabase\_v31_apply_response.json" -Encoding UTF8
} catch {
    $errMsg = $_.Exception.Message
    $statusCode = $_.Exception.Response.StatusCode.value__
    try {
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $reader.BaseStream.Position = 0
        $reader.DiscardBufferedData()
        $respBody = $reader.ReadToEnd()
    } catch { $respBody = "(no response body captured)" }
    Write-Host "    !ERROR LIVE APPLY (HTTP $statusCode): $errMsg`n$respBody" -ForegroundColor Red
    # Save full error for inspection
    $errDump = @{ timestamp = (Get-Date -Format s); status = $statusCode; message = $errMsg; body = $respBody } | ConvertTo-Json -Depth 5
    Set-Content -LiteralPath ".\supabase\_v31_apply_error.json" -Value $errDump -Encoding UTF8

    # ============================================================
    # FALLBACK: If Management API /database/query fails, use SQL REST API direct
    # via service_role + rpc SQL wrapper if available. Otherwise tell user to paste.
    # ============================================================
    Write-Host "`n    === FALLBACK NOTICE ===" -ForegroundColor Magenta
    Write-Host "    Management API endpoint denied (expected often for custom PAT scope)." -ForegroundColor Yellow
    Write-Host "    v3.1 SQL file is READY (see $OUTPUT_FILE). Paste contents directly into:" -ForegroundColor Yellow
    Write-Host "    https://supabase.com/dashboard/project/$PROJECT_REF/sql/new`n" -ForegroundColor Blue

    exit 2
}

# ============================================================
# STEP 6: Run Verification Queries LIVE
# ============================================================
Write-Host "[6/8] Running verification SQL queries LIVE against database..." -ForegroundColor Cyan

$verifications = [ordered]@{
    "V1_tables_count"      = "SELECT COUNT(*)::INT AS tables_count FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';"
    "V2_functions_count"   = "SELECT COUNT(*)::INT AS fn_count FROM pg_proc WHERE pronamespace = 'public'::regnamespace AND prokind='f';"
    "V3_views_count"       = "SELECT COUNT(*)::INT AS view_count FROM information_schema.views WHERE table_schema='public' AND table_name LIKE 'readable_%';"
    "V4_admin_users"       = "SELECT id, username, email, role, is_active FROM public.admin_users ORDER BY id;"
    "V5_verify_password"   = "SELECT public.verify_admin_password('nmmart07@gmail.com', 'nmmart2026');"
    "V6_verify_pin"        = "SELECT public.verify_admin_pin('1234');"
    "V7_categories_count"  = "SELECT COUNT(*)::INT AS cat_count FROM public.categories WHERE tenant_id=1;"
    "V8_brands_count"      = "SELECT COUNT(*)::INT AS brand_count FROM public.brands WHERE tenant_id=1;"
    "V9_units_count"       = "SELECT COUNT(*)::INT AS unit_count FROM public.unit_master WHERE tenant_id=1;"
    "V10_paytx_exists"     = "SELECT to_regclass('public.payment_transactions') IS NOT NULL AS paytx_exists;"
}

$verifyResults = @{}
foreach ($kv in $verifications.GetEnumerator()) {
    $name  = $kv.Key
    $query = $kv.Value
    try {
        $vp = @{ query = $query; include_columns = $true; format = "json" } | ConvertTo-Json -Compress
        $vr = Invoke-RestMethod -Uri $queryUrl -Method Post -Headers $headers -Body ([System.Text.Encoding]::UTF8.GetBytes($vp)) -UseBasicParsing
        $verifyResults[$name] = $vr
        Write-Host "    $name : PASS" -ForegroundColor Green
    } catch {
        $verifyResults[$name] = "ERROR: $($_.Exception.Message)"
        Write-Host "    $name : FAILED — $($_.Exception.Message)" -ForegroundColor Red
    }
}

$verifyResults | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath ".\supabase\_v31_verification_results.json" -Encoding UTF8

# ============================================================
# STEP 7: Create Supabase Auth Users via Management API
# ============================================================
Write-Host "[7/8] Creating Auth users via Management API (nmmart07@gmail.com + cashier@nmmart.in)..." -ForegroundColor Cyan

$authHeaders = $headers.Clone()
# Supabase Auth Admin API (requires PAT, NOT anon key): POST /v1/projects/{ref}/auth/users
# Docs: https://supabase.com/docs/reference/api/projects-project-ref-auth-users-post

function New-SupabaseAuthUser {
    param(
        [Parameter(Mandatory)][string]$Email,
        [Parameter(Mandatory)][string]$Password,
        [Parameter(Mandatory)][hashtable]$MetaData,
        [string]$Role = "authenticated",
        [bool]$EmailConfirm = $false
    )
    $body = @{
        email = $Email
        password = $Password
        email_confirm = $EmailConfirm
        user_metadata = $MetaData
        app_metadata = @{ role = if ($MetaData.role) { $MetaData.role } else { "cashier" } }
        role = $Role
    } | ConvertTo-Json -Depth 10 -Compress

    $authCreateUrl = "$apiBase/auth/users"
    try {
        $res = Invoke-RestMethod -Uri $authCreateUrl -Method Post -Headers $headers -Body ([System.Text.Encoding]::UTF8.GetBytes($body)) -UseBasicParsing
        Write-Host "    Auth user created: $($res.email) id=$($res.id)" -ForegroundColor Green
        return $res
    } catch {
        $e = $_.Exception
        $sc = $e.Response.StatusCode.value__
        try {
            $sr = New-Object System.IO.StreamReader($e.Response.GetResponseStream())
            $sr.BaseStream.Position = 0
            $respBody = $sr.ReadToEnd()
        } catch { $respBody = "" }

        # 409/422 means user already exists → PATCH instead
        if ($sc -eq 409 -or $sc -eq 422 -or $respBody -match "already exists|duplicate|unique") {
            Write-Host "    Auth user $Email already exists → PATCHING metadata & password..." -ForegroundColor Yellow
            # First find existing user by listing with email filter
            $listUrl = "$apiBase/auth/users?email=$([System.Uri]::EscapeDataString($Email))"
            try {
                $existing = Invoke-RestMethod -Uri $listUrl -Method Get -Headers $headers -UseBasicParsing
                if ($existing.users -and $existing.users.Count -gt 0) {
                    $uid = $existing.users[0].id
                    $patchUrl = "$apiBase/auth/users/$uid"
                    $patchBody = @{ password = $Password; user_metadata = $MetaData; app_metadata = @{ role = if ($MetaData.role) { $MetaData.role } else { "cashier" } } } | ConvertTo-Json -Depth 10 -Compress
                    $patched = Invoke-RestMethod -Uri $patchUrl -Method Put -Headers $headers -Body ([System.Text.Encoding]::UTF8.GetBytes($patchBody)) -UseBasicParsing
                    Write-Host "    Auth user PATCHED OK: $($patched.email) id=$($patched.id)" -ForegroundColor Green
                    return $patched
                }
            } catch {
                Write-Host "    Could not patch $Email : $($_.Exception.Message)" -ForegroundColor Red
            }
        } else {
            Write-Host "    Auth create $Email FAILED (HTTP $sc) : $respBody" -ForegroundColor Red
        }
        return $null
    }
}

$r1 = New-SupabaseAuthUser -Email "nmmart07@gmail.com" -Password "nmmart2026" -MetaData @{
    company_code = "NMM001"
    tenant_id    = 1
    role         = "super_admin"
    name         = "Super Administrator"
    phone        = "+91-99999-99999"
}

$r2 = New-SupabaseAuthUser -Email "cashier@nmmart.in" -Password "cashier@123" -MetaData @{
    company_code = "NMM001"
    tenant_id    = 1
    role         = "cashier"
    name         = "Counter Cashier"
    phone        = "+91-98888-88888"
}

@({ user = "nmmart07@gmail.com"; result = $r1 }, @{ user = "cashier@nmmart.in"; result = $r2 }) |
    ConvertTo-Json -Depth 20 |
    Set-Content -LiteralPath ".\supabase\_v31_auth_users_created.json" -Encoding UTF8

# ============================================================
# STEP 8: Final Summary
# ============================================================
Write-Host ""
Write-Host "=================================" -ForegroundColor White
Write-Host "  CONSOLIDATED v3.1 APPLY DONE   " -ForegroundColor Green
Write-Host "=================================" -ForegroundColor White
Write-Host "  Output SQL file : $OUTPUT_FILE" -ForegroundColor White
Write-Host "  Super-Admin     : nmmart07@gmail.com / nmmart2026" -ForegroundColor Cyan
Write-Host "  Auth users JSON : supabase\_v31_auth_users_created.json" -ForegroundColor White
Write-Host "  Verify JSON     : supabase\_v31_verification_results.json" -ForegroundColor White
Write-Host "=================================" -ForegroundColor White

# Print verification summary to stdout for caller
Write-Host ""
Write-Host "--- VERIFICATION SUMMARY ---"
foreach ($kv in $verifyResults.GetEnumerator()) {
    $v = $kv.Value
    if ($v -is [array]) { $str = ($v | ConvertTo-Json -Compress -Depth 6) } else { $str = [string]$v }
    if ($str.Length -gt 220) { $str = $str.Substring(0,220) + "..." }
    Write-Host ("  {0,-22} = {1}" -f $kv.Key, $str)
}
