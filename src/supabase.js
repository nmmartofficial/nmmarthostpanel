import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || supabaseUrl.includes('your-project-url')) {
  throw new Error('VITE_SUPABASE_URL is missing or invalid in .env file!')
}
if (!supabaseAnonKey || supabaseAnonKey.includes('your-anon-key')) {
  throw new Error('VITE_SUPABASE_ANON_KEY is missing or invalid in .env file!')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
