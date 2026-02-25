const DEFAULT_PRODUCTION_SITE_URL = 'https://careerheap.com'

function normalizeBaseUrl(value: string | undefined) {
  if (!value) return ''
  const trimmed = value.trim().replace(/\/+$/, '')
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim().replace(/\/+$/, '')
  }
  return trimmed
}

function resolveBaseUrl() {
  const configured =
    normalizeBaseUrl(process.env.NEXT_PUBLIC_SITE_URL) ||
    normalizeBaseUrl(process.env.NEXT_PUBLIC_APP_URL)

  if (configured) return configured
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin
  }
  return DEFAULT_PRODUCTION_SITE_URL
}

export function getAuthCallbackUrl(options?: { next?: string }) {
  const url = new URL('/auth/callback', resolveBaseUrl())
  if (options?.next && options.next.startsWith('/')) {
    url.searchParams.set('next', options.next)
  }
  return url.toString()
}

