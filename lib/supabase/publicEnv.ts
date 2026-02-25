const SUPABASE_PUBLIC_KEY_ENV_NAMES = [
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY'
] as const

export function getSupabasePublicUrl() {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? ''
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1).trim()
  }
  return value
}

function normalizeEnvValue(value: string | undefined) {
  if (!value) return ''
  const trimmed = value.trim()
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim()
  }
  return trimmed
}

export function getSupabasePublicKey() {
  for (const name of SUPABASE_PUBLIC_KEY_ENV_NAMES) {
    const value = normalizeEnvValue(process.env[name])
    if (value) {
      return value
    }
  }
  return ''
}

export function getSupabasePublicEnvStatus() {
  const url = getSupabasePublicUrl()
  for (const name of SUPABASE_PUBLIC_KEY_ENV_NAMES) {
    const value = normalizeEnvValue(process.env[name])
    if (value) {
      return {
        hasUrl: Boolean(url),
        hasKey: true,
        keySource: name
      }
    }
  }

  return {
    hasUrl: Boolean(url),
    hasKey: false,
    keySource: null as string | null
  }
}

export function isSupabasePublicEnvConfigured() {
  return Boolean(getSupabasePublicUrl() && getSupabasePublicKey())
}
