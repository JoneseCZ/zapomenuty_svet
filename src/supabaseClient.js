import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://estnhncuxeusjvviphyn.supabase.co'
const supabaseAnonKey = 'sb_publishable_N7wayv8g4D3rSncbDkl1Aw_LxkxJJWJ'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)