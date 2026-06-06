import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://cpipmysooynedtpreekt.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_bmVp0-jv3JLAZaIQpvhYwQ_E6JzdERh'

if (!supabaseUrl) {
  throw new Error('VITE_SUPABASE_URL is missing from environment variables!')
}
if (!supabaseAnonKey) {
  throw new Error('VITE_SUPABASE_ANON_KEY is missing from environment variables!')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
