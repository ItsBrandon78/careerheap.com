import { NextRequest, NextResponse } from 'next/server'
import { searchSkills } from '@/lib/server/careerData'
import { consumeRateLimit, getClientIp, toRateLimitHeaders } from '@/lib/server/rateLimit'

export const dynamic = 'force-dynamic'

function parseLimit(value: string | null) {
  if (!value) return undefined
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed)) return undefined
  return parsed
}

export async function GET(request: NextRequest) {
  try {
    const rateLimit = consumeRateLimit({
      namespace: 'skills-search',
      identifier: getClientIp(request),
      max: 120,
      windowMs: 60_000
    })
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'RATE_LIMITED',
          message: 'Too many skill searches. Please wait and try again.'
        },
        {
          status: 429,
          headers: toRateLimitHeaders(rateLimit)
        }
      )
    }

    const params = request.nextUrl.searchParams
    const q = params.get('q') ?? ''
    const limit = parseLimit(params.get('limit'))
    const result = await searchSkills({ query: q, limit })

    return NextResponse.json(result, {
      headers: toRateLimitHeaders(rateLimit)
    })
  } catch (error) {
    console.error('Career map skills query failed:', error)
    return NextResponse.json(
      {
        error: 'QUERY_FAILED',
        message: 'Unable to query skills right now.'
      },
      { status: 500 }
    )
  }
}

