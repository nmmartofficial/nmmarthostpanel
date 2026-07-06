import { createClient } from '@supabase/supabase-js'

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (import.meta.env.DEV) {
  console.log('🔍 [Supabase Init] ========== Starting Supabase Init ==========')
  console.log('🔍 [Supabase Init] Full URL:', supabaseUrl)
  console.log('🔍 [Supabase Init] Key length:', supabaseAnonKey ? supabaseAnonKey.length : 0)
  console.log('🔍 [Supabase Init] Key masked prefix:', supabaseAnonKey ? supabaseAnonKey.substring(0, 6) + '***' : '(undefined)')
} else {
  console.log('🔍 [Supabase Init] Starting (production mode)')
}

// Graceful handling instead of throwing errors that crash the app
let supabaseInstance = null
let isMockClient = true

// Validate credentials
const hasValidUrl = supabaseUrl && supabaseUrl.length > 10 && !supabaseUrl.includes('your-project-url')
const hasValidKey = supabaseAnonKey && supabaseAnonKey.length > 30 && !supabaseAnonKey.includes('your-anon-key')

if (import.meta.env.DEV) {
  console.log('🔍 [Supabase Init] URL valid:', hasValidUrl)
  console.log('🔍 [Supabase Init] Key valid:', hasValidKey)
} else {
  console.log('🔍 [Supabase Init] Credentials check complete')
}

if (hasValidUrl && hasValidKey) {
  try {
    if (import.meta.env.DEV) console.log('🚀 [Supabase Init] Creating real Supabase client')

    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    })
    
    isMockClient = false
    if (import.meta.env.DEV) {
      console.log('✅ [Supabase] Client initialized successfully!')
      console.log('✅ [Supabase] Mock mode:', isMockClient)
    }
  } catch (error) {
    console.error('❌ [Supabase Init] Failed to create client:', error.message)
    if (import.meta.env.DEV) console.error('❌ [Supabase Init] Full error:', error)
  }
} else {
  console.warn('⚠️ [Supabase Init] Using MOCK client because credentials are missing or invalid!')
  if (import.meta.env.DEV) {
    console.warn('⚠️ [Supabase Init] - URL valid?', hasValidUrl)
    console.warn('⚠️ [Supabase Init] - Key valid?', hasValidKey)
    console.warn('⚠️ [Supabase Init] Please get your REAL anon key from Supabase Dashboard!')
  } else {
    console.warn('⚠️ [Supabase Init] Missing/invalid Supabase credentials (production)')
  }
}

// Helper to create a chainable mock query builder
const createMockQueryBuilder = () => {
  const builder = {
    eq: () => builder,
    or: () => builder,
    order: () => builder,
    range: () => builder,
    select: () => builder,
    single: () => ({ data: null, error: null }),
    then: (resolve) => resolve({ data: [], error: null })
  };
  
  // Make it thenable so it can be awaited
  return new Proxy(builder, {
    get(target, prop) {
      if (prop === 'then') {
        return (resolve) => resolve({ data: [], error: null });
      }
      if (typeof target[prop] === 'function') {
        return (...args) => {
          console.log(`[Mock Supabase] Called ${prop} with args:`, args);
          return target[prop](...args);
        };
      }
      return target[prop];
    }
  });
};

// Create a mock client if real one isn't available
const mockSupabase = {
  from: () => ({
    select: () => createMockQueryBuilder(),
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
  rpc: (fnName, params) => {
    if (fnName === 'verify_admin_pin' && params?.input_pin) {
      // Only allow a default weak fallback in development for convenience.
      const fallbackPin = import.meta.env.VITE_ADMIN_SECURITY_PIN ?? (import.meta.env.DEV ? '1234' : null)
      return { data: fallbackPin ? params.input_pin === fallbackPin : false, error: null }
    }
    return { data: null, error: null }
  }
}

export const supabase = supabaseInstance || mockSupabase
export const isSupabaseMock = isMockClient
