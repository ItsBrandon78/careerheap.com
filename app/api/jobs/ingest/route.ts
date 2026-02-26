import { NextResponse } from 'next/server'
import {
  ensureEvidenceRequirements,
  isMarketEvidenceConfigured
} from '@/lib/server/jobRequirements'
import { getAuthenticatedUserFromRequest } from '@/lib/server/toolUsage'
import { consumeRateLimit, getClientIp, toRateLimitHeaders } from '@/lib/server/rateLimit'

export const dynamic = 'force-dynamic'

function asString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

export async function POST(request: Request) {
  try {
    const rateLimit = consumeRateLimit({
      namespace: 'jobs-ingest',
      identifier: getClientIp(request),
      max: 24,
      windowMs: 60_000
    })
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'RATE_LIMITED',
          message: 'Too many ingestion requests. Please wait and try again.'
        },
        {
          status: 429,
          headers: toRateLimitHeaders(rateLimit)
        }
      )
    }

    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json(
        { error: 'AUTH_REQUIRED', message: 'Sign in to ingest employer evidence.' },
        { status: 401, headers: toRateLimitHeaders(rateLimit) }
      )
    }

    const body = (await request.json().catch(() => null)) as
      | {
          role?: string
          location?: string
          country?: string
          useAdzuna?: boolean
          userPostingText?: string
          forceRefresh?: boolean
        }
      | null

    const role = asString(body?.role)
    const location = asString(body?.location)
    const country = asString(body?.country) || undefined
    const userPostingText = asString(body?.userPostingText)
    const useAdzuna = body?.useAdzuna !== false
    const forceRefresh = Boolean(body?.forceRefresh)

    if (!role || !location) {
      return NextResponse.json(
        {
          error: 'INVALID_INPUT',
          message: 'role and location are required.'
        },
        { status: 400, headers: toRateLimitHeaders(rateLimit) }
      )
    }

    const result = await ensureEvidenceRequirements({
      role,
      location,
      country,
      useMarketEvidence: useAdzuna,
      userPostingText,
      forceRefresh
    })

    return NextResponse.json(
      {
        query: result.query,
        queryId: result.queryId,
        usedAdzuna: result.usedAdzuna,
        marketConfigured: isMarketEvidenceConfigured(),
        usedCache: result.usedCache,
        postingsCount: result.postingsCount,
        llmNormalizedCount: result.llmNormalizedCount,
        fetchedAt: result.fetchedAt,
        baselineOnly: result.baselineOnly,
        counts: {
          marketRequirements: result.marketRequirements.length,
          userPostingRequirements: result.userPostingRequirements.length
        },
        requirements: {
          market: result.marketRequirements,
          userPosting: result.userPostingRequirements
        }
      },
      {
        headers: toRateLimitHeaders(rateLimit)
      }
    )
  } catch (error) {
    console.error('Job requirements ingest failed:', error)
    return NextResponse.json(
      {
        error: 'INGEST_FAILED',
        message: 'Unable to ingest job requirements right now.'
      },
      { status: 500 }
    )
  }
}
