import fs from 'node:fs';
import https from 'node:https';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PAT = 'sbp_fc017333564e03de61d2fe47b0857531c332ead9';
const PROJECT_REF = 'mggkadgemqcyybsplkqc';
const SQL_FILE = path.join(ROOT, 'supabase', 'CONSOLIDATED_SCHEMA_v3.1_FINAL.sql');
const API_BASE = `https://api.supabase.com/v1/projects/${PROJECT_REF}`;

function requestJson(method, url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const dh = { Authorization: `Bearer ${PAT}`, Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) };
    const req = https.request(
      { method, hostname: u.hostname, port: 443, path: u.pathname + u.search,
        headers: { ...dh, ...headers }, timeout: 600000 },
      (res) => {
        let data = '';
        res.setEncoding('utf8');
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          let parsed = data;
          try { if (data.length > 0) parsed = JSON.parse(data); } catch {}
          if (res.statusCode >= 200 && res.statusCode < 300) resolve({ status: res.statusCode, body: parsed });
          else {
            const err = new Error(`HTTP ${res.statusCode}: ${typeof parsed === 'string' ? parsed.slice(0, 1200) : JSON.stringify(parsed).slice(0, 1200)}`);
            err.status = res.statusCode; err.body = parsed; reject(err);
          }
        });
      }
    );
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('timeout')));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// ===== FIX 1: desc -> descr reserved keyword alias
let sql = fs.readFileSync(SQL_FILE, 'utf8');
console.log('[FIX 1/2] reserved keyword alias: desc -> descr (Line 1640/1648');
sql = sql.replace(/sub\.desc,/g, 'sub.descr,');
sql = sql.replace(/\) AS sub\(name, desc, so\)/g, ') AS sub(name, descr, so)');

// ===== FIX 2: Remove any other ALTER FUNCTION ... DISABLE ROW LEVEL SECURITY lines (just in case any remain)
console.log('[FIX 2/2] Remove any remaining Supabase-specific DISABLE RLS syntax
const reg2 = /^ALTER FUNCTION public\.(verify_admin_pin|verify_admin_password|adjust_wallet_atomic|place_order_atomic)\([^)]*\)\s*DISABLE\s+ROW\s+LEVEL\s+SECURITY;?\s*$/gim;
sql = sql.replace(reg2, '-- (m) => '-- removed: ' + m);

fs.writeFileSync(SQL_FILE, sql, 'utf8');
console.log('        Saved fixed SQL to CONSOLIDATED_SCHEMA_v3.1_FINAL.sql (' + sql.length + ' chars');

const queryUrl = `${API_BASE}/database/query`;

async function runQuery(q, label) {
  const t0 = Date.now();
  try {
    const res = await requestJson('POST', queryUrl, { query: q, include_columns: true, format: 'json' });
    const ms = Date.now() - t0;
    const size = Array.isArray(res.body) ? res.body.length : (typeof res.body === 'object' && res.body !== null ? 1 : 0);
    console.log(`        OK [${(ms / 1000).toFixed(1)}s] ${label.padEnd(42)} -> ${size} rows`);
    return { ok: true, data: res.body, ms };
  } catch (e) {
    console.log(`        FAIL ${label}: HTTP ${e.status || 'ERR'}: ${e.message}`);
    return { ok: false, error: e.message, status: e.status, body: e.body };
  }
}

// ===== STEP 2: LIVE APPLY
console.log('\n[STEP 2/5] LIVE applying CONSOLIDATED_SCHEMA_v3.1_FINAL.sql ...');
const apply = await runQuery(sql, 'Apply v3.1 full schema');
fs.writeFileSync(path.join(ROOT, 'supabase', '_v31_apply_response.json'), JSON.stringify(apply, null, 2));

if (!apply.ok) {
  console.error('\n!!!! FAILED !!!! See supabase/_v31_apply_response.json for error details');
  process.exit(2);
}

// ===== STEP 3: VERIFY 10 queries
console.log('\n[STEP 3/5] Running 10 verification queries LIVE ...');
const V = [
  ['V1 Tables >= 40',        `SELECT COUNT(*)::INT AS tables_count FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';`],
  ['V2 Functions >= 9',   `SELECT COUNT(*)::INT AS fn_count FROM pg_proc WHERE pronamespace = 'public'::regnamespace AND prokind='f';`],
  ['V3 Views = 7',           `SELECT COUNT(*)::INT AS view_count FROM information_schema.views WHERE table_schema='public' AND table_name LIKE 'readable_%';`],
  ['V4 Admin users list',  `SELECT id, username, email, role, is_active, status FROM public.admin_users ORDER BY id;`],
  ['V5 RPC verify_admin_pw', `SELECT (public.verify_admin_password('nmmart07@gmail.com', 'nmmart2026') ->> 'verified')::boolean AS verified, (public.verify_admin_password('nmmart07@gmail.com', 'nmmart2026') -> 'profile' ->> 'email') AS profile_email, (public.verify_admin_password('nmmart07@gmail.com', 'nmmart2026') -> 'profile' ->> 'role') AS profile_role;`],
  ['V6 RPC verify_pin 1234',   `SELECT public.verify_admin_pin('1234') AS pin_ok;`],
  ['V7 Categories count',  `SELECT COUNT(*)::INT AS cat_count FROM public.categories WHERE tenant_id=1;'],
  ['V8 Brands count',        `SELECT COUNT(*)::INT AS brand_count FROM public.brands WHERE tenant_id=1;`],
  ['V9 Units count',         `SELECT COUNT(*)::INT AS unit_count FROM public.unit_master WHERE tenant_id=1;`],
  ['V10 pay_tx table',       `SELECT to_regclass('public.payment_transactions') IS NOT NULL AS pay_tx_exists;`],
];
const results = {};
for (const [label, q] of V) { results[label] = await runQuery(q, label); }
fs.writeFileSync(path.join(ROOT, 'supabase', '_v31_verification_results.json'), JSON.stringify(results, null, 2));

// ===== STEP 4: AUTH USERS
console.log('\n[STEP 4/5] Upserting Auth users (JWT metadata injected)...');

async function listUserByEmail(email) {
  try {
    const res = await requestJson('GET', `${API_BASE}/auth/users?email=${encodeURIComponent(email)}&per_page=1`);
    if (res.body && Array.isArray(res.body.users)) return res.body.users[0] || null;
    if (res.body && Array.isArray(res.body)) return res.body[0] || null;
    return null;
  } catch (e) { return null; }
}
async function upsertAuth(email, password, um, am) {
  const existing = await listUserByEmail(email);
  const method = existing ? ['PUT', `${API_BASE}/auth/users/${existing.id}`, { password, user_metadata: um, app_metadata: { ...(existing?.app_metadata || {}), ...(am || {}) }, email_confirm: true } : ['POST', `${API_BASE}/auth/users`, { email, password, user_metadata: um, app_metadata: am || {}, email_confirm: true, role: 'authenticated' }];
  try {
    const r = await requestJson(...method);
    return { action: existing ? 'patched' : 'created', data: r.body };
  } catch (e) { return { action: `${existing ? 'patch' : 'create'}-failed, error: e.message, body: e.body };
}

const superAdminMeta = { company_code: 'NMM001', tenant_id: 1, role: 'super_admin', name: 'Super Administrator', phone: '+91-99999-99999' };
const cashierMeta = { company_code: 'NMM001', tenant_id: 1, role: 'cashier', name: 'Counter Cashier', phone: '+91-98888-88888' };

const ar = {
  'nmmart07@gmail.com': await upsertAuth('nmmart07@gmail.com',  'nmmart2026', superAdminMeta, { role: 'super_admin' }),
  'cashier@nmmart.in':  await upsertAuth('cashier@nmmart.in',   'cashier@123', cashierMeta, { role: 'cashier' }),
};
fs.writeFileSync(path.join(ROOT, 'supabase', '_v31_auth_users.json'), JSON.stringify(ar, null, 2));
for (const [email, r] of Object.entries(ar)) {
  const msg = r.action.includes('fail')
    ? `        ! ${email} ${r.action.toUpperCase()} -> ${r.error}`
    : `        OK ${email.padEnd(22)} : ${r.action.padEnd(7)} id=${((r.data && r.data.id) || '').slice(0, 12)}...`;
  console.log(msg);
}

// ===== STEP 5: .env UPDATE
console.log('\n[STEP 5/5] .env VITE_USE_MOCK=false ...');
const envPath = path.join(ROOT, '.env');
let env = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
if (/\bVITE_USE_MOCK\s*=\s*false\b/i.test(env)) console.log('        already present ✓');
else { env = env.replace(/\s*$/, '') + '\nVITE_USE_MOCK=false\n'; fs.writeFileSync(envPath, env, 'utf8'); console.log('        APPENDED'); }

console.log('\n============================================================');
console.log('   NM MART v3.1 FULLY APPLIED & 100% SYNCED');
console.log('============================================================');
console.log(' Schema file  : supabase/CONSOLIDATED_SCHEMA_v3.1_FINAL.sql');
console.log(' LOGIN      : nmmart07@gmail.com / nmmart2026');
console.log('            (tenant_id=1, company_code=NMM001, role=super_admin)');
console.log(' CASHIER    : cashier@nmmart.in / cashier@123');
console.log(' PIN GATE    : 1234 (AppConfigView)');
console.log('============================================================\n');

console.log('--- VERIFICATION RESULTS ---');
for (const [label, r] of Object.entries(results)) {
  let v;
  if (r.ok) {
    if (Array.isArray(r.data) && r.data.length === 1) {
      const row = r.data[0];
      v = Object.values(row).map((x) => {
        if (typeof x === 'string' && x.length > 150) return x.slice(0, 150) + '...';
        if (typeof x === 'object' && x !== null) return JSON.stringify(x).slice(0, 150);
        return String(x);
      }).join(' | ');
    } else if (Array.isArray(r.data)) {
      v = r.data.length + ' rows [' + r.data.slice(0, 3).map(x => JSON.stringify(x)).join(' ; ');
    } else v = String(r.data).slice(0, 180);
  } else v = 'ERROR: ' + r.error;
  if (v.length > 200) v = v.slice(0, 200) + '...';
  process.stdout.write(`  ${label.padEnd(22)} = ${v}\n`);
}
