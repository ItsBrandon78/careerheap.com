import { createBrowserClient } from '@supabase/ssr'
import { getSupabasePublicKey, getSupabasePublicUrl, isSupabasePublicEnvConfigured } from '@/lib/supabase/publicEnv'

export function isSupabaseConfigured() {
  return isSupabasePublicEnvConfigured()
}

export function createClient() {
  const url = getSupabasePublicUrl()
  const anonKey = getSupabasePublicKey()

  if (!url || !anonKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL and/or public key env (NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)'
    )
  }

  return createBrowserClient(url, anonKey)
}
