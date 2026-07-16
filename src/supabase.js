import { createClient } from '@supabase/supabase-js'

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const useMock = import.meta.env.VITE_USE_MOCK === 'true'

// Graceful handling instead of throwing errors that crash the app
let supabaseInstance = null
let isMockClient = false

// Validate credentials
const hasValidUrl = supabaseUrl && supabaseUrl.length > 10 && !supabaseUrl.includes('your-project-url')
const hasValidKey = supabaseAnonKey && supabaseAnonKey.length > 30 && !supabaseAnonKey.includes('your-anon-key')

if (useMock) {
  isMockClient = true
  if (import.meta.env.DEV) console.warn('⚠️ [Supabase Init] Using MOCK client (VITE_USE_MOCK=true)')
} else if (hasValidUrl && hasValidKey) {
  try {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true
        },
        realtime: {
          enabled: false
        }
      });
    
    if (import.meta.env.DEV) console.log('✅ [Supabase Init] Client created successfully')
  } catch (error) {
    console.error('❌ [Supabase Init] Failed to create client:', error.message)
    if (import.meta.env.DEV) console.error('❌ [Supabase Init] Full error:', error)
  }
} else {
  isMockClient = true
  if (import.meta.env.DEV) {
    console.warn('⚠️ [Supabase Init] Using MOCK client (missing/invalid credentials)')
    console.warn('⚠️ [Supabase Init] Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env to use real Supabase')
  }
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
      if (tableName === 'admin_users' && builder._eq?.column === 'email') {
        return {
          data: {
            id: 'mock-user-id',
            email: builder._eq.value,
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

if (import.meta.env.DEV) console.log('🔍 [Supabase] isMockClient:', isMockClient)
export const supabase = supabaseInstance || mockSupabase
export const isSupabaseMock = isMockClient
