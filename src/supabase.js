import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Graceful handling instead of throwing errors that crash the app
let supabaseInstance = null

if (supabaseUrl && !supabaseUrl.includes('your-project-url') && 
    supabaseAnonKey && !supabaseAnonKey.includes('your-anon-key')) {
  try {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey)
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
        }) 
      }),
      range: () => ({ data: [], error: null })
    }),
    insert: () => ({ select: () => ({ data: [], error: null }) }),
    update: () => ({ eq: () => ({ select: () => ({ data: [], error: null }) }) }),
    delete: () => ({ eq: () => ({ error: null }) }),
    upsert: () => ({ select: () => ({ data: [], error: null }) })
  }),
  rpc: () => ({ data: null, error: null })
}

export const supabase = supabaseInstance || mockSupabase
