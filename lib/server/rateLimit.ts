type RateLimitEntry = {
  count: number
  resetAt: number
}

type RateLimitBucket = {
  max: number
  remaining: number
  resetAt: number
  allowed: boolean
}

const buckets = new Map<string, RateLimitEntry>()

function nowMs() {
  return Date.now()
}

function sanitizeIdentifier(value: string | null | undefined) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .slice(0, 200)
}

export function getClientIp(request: Request) {
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    const first = forwardedFor.split(',')[0]?.trim()
    if (first) return first
  }

  const realIp = request.headers.get('x-real-ip')
  if (realIp?.trim()) return realIp.trim()

  const cfIp = request.headers.get('cf-connecting-ip')
  if (cfIp?.trim()) return cfIp.trim()

  return 'unknown'
}

export function consumeRateLimit(options: {
  namespace: string
  identifier: string
  max: number
  windowMs: number
}): RateLimitBucket {
  const namespace = sanitizeIdentifier(options.namespace) || 'default'
  const identifier = sanitizeIdentifier(options.identifier) || 'unknown'
  const max = Math.max(1, Math.trunc(options.max))
  const windowMs = Math.max(1_000, Math.trunc(options.windowMs))
  const key = `${namespace}:${identifier}`
  const now = nowMs()

  const current = buckets.get(key)
  if (!current || current.resetAt <= now) {
    const entry: RateLimitEntry = {
      count: 1,
      resetAt: now + windowMs
    }
    buckets.set(key, entry)
    return {
      max,
      remaining: Math.max(0, max - 1),
      resetAt: entry.resetAt,
      allowed: true
    }
  }

  if (current.count >= max) {
    return {
      max,
      remaining: 0,
      resetAt: current.resetAt,
      allowed: false
    }
  }

  current.count += 1
  buckets.set(key, current)

  return {
    max,
    remaining: Math.max(0, max - current.count),
    resetAt: current.resetAt,
    allowed: true
  }
}

export function toRateLimitHeaders(bucket: RateLimitBucket) {
  return {
    'X-RateLimit-Limit': String(bucket.max),
    'X-RateLimit-Remaining': String(bucket.remaining),
    'X-RateLimit-Reset': String(Math.ceil(bucket.resetAt / 1_000))
  }
}

