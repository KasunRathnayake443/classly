import { createClient } from '@supabase/supabase-js'

// These come from your .env file (see README)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables.\n' +
    'Create a .env file in the project root with:\n' +
    '  VITE_SUPABASE_URL=your_project_url\n' +
    '  VITE_SUPABASE_ANON_KEY=your_anon_key'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
