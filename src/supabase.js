import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Graceful handling instead of throwing errors that crash the app
let supabaseInstance = null
let isMockClient = true

if (supabaseUrl && !supabaseUrl.includes('your-project-url') && 
    supabaseAnonKey && !supabaseAnonKey.includes('your-anon-key')) {
  try {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey)
    isMockClient = false
    console.log('✅ Supabase client initialized successfully')
  } catch (error) {
    console.warn('⚠️ Failed to initialize Supabase client:', error.message)
  }
} else {
  console.warn('⚠️ Supabase credentials missing or invalid in .env file')
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
