import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing Supabase environment variables. Copy .env.example to .env and fill in values.'
  )
}

let supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey)

/** Reset the Supabase client — use when the connection enters a bad state */
export function resetSupabaseClient() {
  supabase = createClient(supabaseUrl, supabaseKey)
}

export { supabase, supabaseUrl }
