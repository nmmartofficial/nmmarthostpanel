import { createClient } from '@supabase/supabase-js'

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

console.log('🔍 [Supabase Init] Checking credentials...')
console.log('🔍 [Supabase Init] URL:', supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : '(undefined)')
console.log('🔍 [Supabase Init] Key:', supabaseAnonKey ? `${supabaseAnonKey.substring(0, 10)}...` : '(undefined)')

// Helper function to redact sensitive keys (for safe console logging)
const redactKey = (key) => {
  if (!key) return '(not set)'
  if (key.length <= 8) return key
  return `${key.substring(0, 5)}...${key.substring(key.length - 3)}`
}

// Graceful handling instead of throwing errors that crash the app
let supabaseInstance = null
let isMockClient = true

// Validate credentials
const hasValidUrl = supabaseUrl && supabaseUrl.length > 10 && !supabaseUrl.includes('your-project-url')
const hasValidKey = supabaseAnonKey && supabaseAnonKey.length > 10 && !supabaseAnonKey.includes('your-anon-key')

console.log('🔍 [Supabase Init] URL valid:', hasValidUrl)
console.log('🔍 [Supabase Init] Key valid:', hasValidKey)

if (hasValidUrl && hasValidKey) {
  try {
    console.log(`🚀 [Supabase Init] Creating client with URL: ${redactKey(supabaseUrl)}`)
    console.log(`🔑 [Supabase Init] Using key: ${redactKey(supabaseAnonKey)}`)
    
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    })
    
    isMockClient = false
    console.log('✅ [Supabase] Client initialized successfully!')
    console.log('✅ [Supabase] Mock mode:', isMockClient)
  } catch (error) {
    console.error('❌ [Supabase Init] Failed to create client:', error.message)
    console.error('❌ [Supabase Init] Full error:', error)
  }
} else {
  console.warn('⚠️ [Supabase Init] Using MOCK client because credentials are missing or invalid!')
  console.warn('⚠️ [Supabase Init] Please check your .env file has correct VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY!')
}

// Create a mock client if real one isn't available
const mockSupabase = {
  from: () => ({
    select: () => ({ 
      eq: () => ({ 
        order: () => ({ 
          range: () => ({ 
            data: [], 
            error: null 
          }) 
        }),
        single: () => ({ data: null, error: null })
      }),
      or: () => ({
        eq: () => ({
          order: () => ({
            range: () => ({ data: [], error: null })
          }),
          single: () => ({ data: null, error: null })
        })
      }),
      order: () => ({ 
        range: () => ({ 
          data: [], 
          error: null 
        }) 
      }),
      range: () => ({ data: [], error: null })
    }),
    insert: () => ({ select: () => ({ data: [], error: null }) }),
    update: () => ({ eq: () => ({ select: () => ({ data: [], error: null }) }) }),
    delete: () => ({ eq: () => ({ error: null }) }),
    upsert: () => ({ select: () => ({ data: [], error: null }) })
  }),
  storage: {
    from: () => ({
      upload: () => Promise.resolve({ data: { path: 'mock-path' }, error: null }),
      getPublicUrl: () => ({ data: { publicUrl: 'https://via.placeholder.com/800x400?text=Banner' } })
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
      const fallbackPin = import.meta.env.VITE_ADMIN_SECURITY_PIN || '1234'
      return { data: params.input_pin === fallbackPin, error: null }
    }
    return { data: null, error: null }
  }
}

export const supabase = supabaseInstance || mockSupabase
export const isSupabaseMock = isMockClient
