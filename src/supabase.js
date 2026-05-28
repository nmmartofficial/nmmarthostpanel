import { createClient } from '@supabase/supabase-js'

// NM App ke liye correct Supabase credentials!
const supabaseUrl = 'https://pqmgfxntxhnvknrvdyub.supabase.co'
const supabaseAnonKey = 'sb_publishable_z251RLg-OLDByiBi4ch5uQ_Xez66ygH'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
