const SUPABASE_PUBLIC_KEY_ENV_NAMES = [
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY'
] as const

export function getSupabasePublicUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? ''
}

export function getSupabasePublicKey() {
  for (const name of SUPABASE_PUBLIC_KEY_ENV_NAMES) {
    const value = process.env[name]?.trim()
    if (value) {
      return value
    }
  }
  return ''
}

export function isSupabasePublicEnvConfigured() {
  return Boolean(getSupabasePublicUrl() && getSupabasePublicKey())
}

