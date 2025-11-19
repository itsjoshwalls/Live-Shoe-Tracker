import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export function hasSupabaseEnv(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey)
}

// Export a client or a proxy that throws a friendly error when used without envs.
export const supabase = ((): any => {
  if (supabaseUrl && supabaseAnonKey) {
    return createClient(supabaseUrl, supabaseAnonKey)
  }
  const message = 'Missing Supabase environment variables: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local'
  return new Proxy({}, {
    get() {
      throw new Error(message)
    }
  }) as any
})()
