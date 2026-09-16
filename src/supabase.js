import { createClient } from '@supabase/supabase-js'

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const realtimeEnabled = import.meta.env.VITE_SUPABASE_REALTIME_ENABLED !== 'false'

let supabaseInstance = null

// Lenient validation: accept any non-empty string that doesn't look like a placeholder
const hasValidUrl = supabaseUrl && String(supabaseUrl).trim().length > 0 &&
  !String(supabaseUrl).toLowerCase().includes('your-project') &&
  !String(supabaseUrl).toLowerCase().includes('example') &&
  !String(supabaseUrl).toLowerCase().includes('replace')

const hasValidKey = supabaseAnonKey && String(supabaseAnonKey).trim().length > 0 &&
  !String(supabaseAnonKey).toLowerCase().includes('your-anon') &&
  !String(supabaseAnonKey).toLowerCase().includes('example') &&
  !String(supabaseAnonKey).toLowerCase().includes('replace')

if (hasValidUrl && hasValidKey) {
  try {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
          flowType: 'pkce',
          storage: typeof window !== 'undefined' ? window.localStorage : undefined
        },
        realtime: {
          enabled: realtimeEnabled
        },
        global: {
          fetch: (...args) => fetch(...args)
        }
      });

    console.log('%c✅ [Supabase Init] LIVE client created — REAL database connection ACTIVE', 'color:#10b981;font-weight:bold')
    console.log('   URL :', supabaseUrl)
    console.log('   Key :', (supabaseAnonKey || '').slice(0, 12) + '...')
    console.log('   Realtime:', realtimeEnabled ? 'ENABLED' : 'disabled')
  } catch (error) {
    console.error('❌ [Supabase Init] FATAL — createClient threw:', error.message)
    if (import.meta.env.DEV) console.error('❌ [Supabase Init] Full error:', error)
    // VITE_USE_MOCK=false par bhi mock mat lo — crash-through behaviour taaki user ko pata chale
  }
} else {
  // VITE_USE_MOCK explicit false hai to mock mat chalao, console pe dikhao ki missing hai
  console.error('❌ [Supabase Init] Credentials MISSING or INVALID. WILL NOT fall back to mock.')
  console.error('   VITE_SUPABASE_URL :', supabaseUrl ? `set (len=${String(supabaseUrl).length})` : 'NOT SET')
  console.error('   VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? `set (len=${String(supabaseAnonKey).length})` : 'NOT SET')
}

// --- Final Export Guard ---
// Agar VITE_USE_MOCK=false hai aur real client nahi bana, to "explosive" client banao
// jo har operation pe clear error throw kare — taaki silent failure na ho aur user
// ko turant pata chale ki Supabase connect nahi ho pa raha.
const createExplosiveClient = (reason) => new Proxy({}, {
  get(_target, prop) {
    if (prop === 'auth' || prop === 'storage' || prop === 'from' || prop === 'channel' || prop === 'rpc' || prop === 'removeChannel') {
      if (prop === 'from' || prop === 'channel' || prop === 'rpc' || prop === 'removeChannel') {
        return () => {
          throw new Error(`[Supabase DISCONNECTED] ${reason}. Fix .env credentials first.`);
        };
      }
      return new Proxy({}, {
        get(_a, method) {
          return () => {
            throw new Error(`[Supabase DISCONNECTED] ${reason}. Fix .env credentials first (called auth.${String(method)}).`);
          };
        }
      });
    }
    return undefined;
  }
});

let finalClient;
const finalIsMock = false;

if (supabaseInstance) {
  finalClient = supabaseInstance;
} else {
  const reason = !hasValidUrl ? 'VITE_SUPABASE_URL missing/placeholder'
    : !hasValidKey ? 'VITE_SUPABASE_ANON_KEY missing/placeholder'
    : 'createClient() threw during init (check console above)';
  finalClient = createExplosiveClient(reason);
  console.error(`%c🔥 [Supabase Init] LIVE mode requested but FALLBACK BLOCKED (${reason}). No DB calls will succeed until this is fixed.`,
    'background:#7f1d1d;color:#fecaca;font-weight:bold;padding:4px 8px;border-radius:4px');
}

console.log('%c🔍 [Supabase Final State]', 'font-weight:bold',
  finalIsMock ? 'isMockClient=TRUE (offline mode)' : 'isMockClient=FALSE (LIVE Supabase mode)');

export const supabase = finalClient
export const isSupabaseMock = finalIsMock
