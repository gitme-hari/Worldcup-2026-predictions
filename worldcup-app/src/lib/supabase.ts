import { createBrowserClient } from '@supabase/ssr'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createBrowserClient(url, anonKey)

export function createServerClient() {
  const { createClient } = require('@supabase/supabase-js')
  return createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}
