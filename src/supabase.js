import { createClient } from '@supabase/supabase-js'

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const useMock = import.meta.env.VITE_USE_MOCK === 'true'
const realtimeEnabled = import.meta.env.VITE_SUPABASE_REALTIME_ENABLED !== 'false'

let supabaseInstance = null
let isMockClient = false

// Lenient validation: accept any non-empty string that doesn't look like a placeholder
const hasValidUrl = supabaseUrl && String(supabaseUrl).trim().length > 0 &&
  !String(supabaseUrl).toLowerCase().includes('your-project') &&
  !String(supabaseUrl).toLowerCase().includes('example') &&
  !String(supabaseUrl).toLowerCase().includes('replace')

const hasValidKey = supabaseAnonKey && String(supabaseAnonKey).trim().length > 0 &&
  !String(supabaseAnonKey).toLowerCase().includes('your-anon') &&
  !String(supabaseAnonKey).toLowerCase().includes('example') &&
  !String(supabaseAnonKey).toLowerCase().includes('replace')

if (useMock) {
  isMockClient = true
  console.warn('⚠️ [Supabase Init] VITE_USE_MOCK=true — using MOCK client (NO real DB connection)')
} else if (hasValidUrl && hasValidKey) {
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
    isMockClient = false
  }
} else {
  // VITE_USE_MOCK explicit false hai to mock mat chalao, console pe dikhao ki missing hai
  isMockClient = false
  console.error('❌ [Supabase Init] Credentials MISSING or INVALID. WILL NOT fall back to mock.')
  console.error('   VITE_SUPABASE_URL :', supabaseUrl ? `set (len=${String(supabaseUrl).length})` : 'NOT SET')
  console.error('   VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? `set (len=${String(supabaseAnonKey).length})` : 'NOT SET')
}

// Helper to create a chainable mock query builder
const createMockQueryBuilder = (tableName) => {
  const builder = {
    eq: (column, value) => {
      builder._eq = { column, value };
      return builder;
    },
    or: () => builder,
    order: () => builder,
    range: () => builder,
    select: () => builder,
    single: () => {
      if (tableName === 'admin_users' && (builder._eq?.column === 'email' || builder._eq?.column === 'username')) {
        return {
          data: {
            id: 'mock-user-id',
            username: builder._eq.value,
            email: builder._eq.value.includes('@') ? builder._eq.value : `${builder._eq.value}@example.com`,
            name: 'Demo User',
            role: 'super_admin',
            status: 'active',
            company_code: 'DEMO001'
          },
          error: null
        };
      }
      if (tableName === 'companies' && builder._eq?.column === 'company_code') {
        return {
          data: {
            id: 'mock-company-id',
            company_code: builder._eq.value,
            company_slug: 'demo-company',
            name: 'Demo Company',
            status: 'active'
          },
          error: null
        };
      }
      return { data: null, error: null };
    },
    then: (resolve) => resolve({ data: [], error: null })
  };
  
  return new Proxy(builder, {
    get(target, prop) {
      if (prop === 'then') {
        return (resolve) => resolve({ data: [], error: null });
      }
      if (typeof target[prop] === 'function') {
        return (...args) => target[prop](...args);
      }
      return target[prop];
    }
  });
};

// Create a mock client if real one isn't available
const mockSupabase = {
  from: (tableName) => ({
    select: () => createMockQueryBuilder(tableName),
    insert: () => ({ select: () => ({ data: [], error: null }) }),
    update: () => ({ eq: () => ({ select: () => ({ data: [], error: null }) }) }),
    delete: () => ({ eq: () => ({ error: null }) }),
    upsert: () => ({ select: () => ({ data: [], error: null }) })
  }),
  storage: {
    from: () => ({
      upload: () => Promise.resolve({ data: { path: 'mock-path' }, error: null }),
      getPublicUrl: () => ({ data: { publicUrl: null } })
    })
  },
  channel: () => ({
    on: () => ({
      subscribe: () => ({
        unsubscribe: () => {}
      })
    })
  }),
  rpc: () => {
    return { data: null, error: null }
  },
  auth: {
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    signOut: () => Promise.resolve({ error: null }),
    onAuthStateChange: (callback) => { 
      setTimeout(() => callback('SIGNED_OUT', null), 0);
      return { 
        data: { 
          subscription: { 
            unsubscribe: () => {} 
          } 
        } 
      }; 
    },
    signInWithPassword: (credentials) => Promise.resolve({ 
      data: { 
        user: { 
          id: 'mock-user-uuid',
          email: credentials.email,
          app_metadata: {},
          user_metadata: {},
          aud: 'authenticated',
          created_at: new Date().toISOString()
        }, 
        session: { 
          access_token: 'mock-access-token',
          token_type: 'bearer',
          expires_in: 3600,
          expires_at: Math.floor((Date.now() + 3600000) / 1000),
          refresh_token: 'mock-refresh-token',
          user: { 
            id: 'mock-user-uuid',
            email: credentials.email,
            app_metadata: {},
            user_metadata: {},
            aud: 'authenticated',
            created_at: new Date().toISOString()
          }
        } 
      }, 
      error: null 
    }),
    resetPasswordForEmail: () => Promise.resolve({ data: {}, error: null }),
    refreshSession: () => Promise.resolve({ 
      data: { 
        session: { 
          access_token: 'mock-new-token',
          expires_at: Math.floor((Date.now() + 3600000) / 1000)
        } 
      }, 
      error: null 
    })
  }
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
let finalIsMock = isMockClient;

if (supabaseInstance) {
  finalClient = supabaseInstance;
} else if (useMock) {
  finalClient = mockSupabase;
  finalIsMock = true;
} else {
  const reason = !hasValidUrl ? 'VITE_SUPABASE_URL missing/placeholder'
    : !hasValidKey ? 'VITE_SUPABASE_ANON_KEY missing/placeholder'
    : 'createClient() threw during init (check console above)';
  finalClient = createExplosiveClient(reason);
  finalIsMock = false;
  console.error(`%c🔥 [Supabase Init] LIVE mode requested but FALLBACK BLOCKED (${reason}). No DB calls will succeed until this is fixed.`,
    'background:#7f1d1d;color:#fecaca;font-weight:bold;padding:4px 8px;border-radius:4px');
}

console.log('%c🔍 [Supabase Final State]', 'font-weight:bold',
  finalIsMock ? 'isMockClient=TRUE (offline mode)' : 'isMockClient=FALSE (LIVE Supabase mode)');

export const supabase = finalClient
export const isSupabaseMock = finalIsMock
