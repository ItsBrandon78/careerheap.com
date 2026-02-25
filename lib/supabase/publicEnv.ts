export function getSupabasePublicUrl() {
  const value = normalizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL)
  return value
}

function getSupabasePublicKeyCandidates() {
  return [
    {
      name: 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
      value: normalizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
    },
    {
      name: 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY',
      value: normalizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY)
    },
    {
      name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      value: normalizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    }
  ] as const
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
  for (const candidate of getSupabasePublicKeyCandidates()) {
    const value = candidate.value
    if (value) {
      return value
    }
  }
  return ''
}

export function getSupabasePublicEnvStatus() {
  const url = getSupabasePublicUrl()
  for (const candidate of getSupabasePublicKeyCandidates()) {
    const value = candidate.value
    if (value) {
      return {
        hasUrl: Boolean(url),
        hasKey: true,
        keySource: candidate.name
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
