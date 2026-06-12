import { NextResponse } from 'next/server'
import { fetchJobsPaged, isAdzunaConfigured } from '@/lib/server/adzuna'
import { aggregateRequirements, extractRequirementsFromText } from '@/lib/requirements/extractor'
import { scoreRequirementFit } from '@/lib/planner/jobFit'
import { rankScoredJobs } from '@/lib/planner/jobSearchRanking'
import { consumeRateLimit, getClientIp, toRateLimitHeaders } from '@/lib/server/rateLimit'
import type { ScoredJob } from '@/lib/planner/jobRecommendations'
import type { NormalizedProfileSignals } from '@/lib/planner/profileSignals'

export const dynamic = 'force-dynamic'

type SearchBody = {
  roles?: unknown
  location?: unknown
  country?: unknown
  profileSignals?: Partial<NormalizedProfileSignals>
}

function asString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function asRoles(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  const roles: string[] = []
  for (const entry of value) {
    const role = asString(entry)
    const key = role.toLowerCase()
    if (role.length >= 2 && !seen.has(key)) {
      seen.add(key)
      roles.push(role)
    }
  }
  return roles.slice(0, 3) // target + up to 2 bridge roles
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((entry): entry is string => typeof entry === 'string')
}

function normalizeSignals(input: Partial<NormalizedProfileSignals> | undefined): NormalizedProfileSignals {
  return {
    skills: asStringArray(input?.skills),
    certifications: asStringArray(input?.certifications),
    experienceSignals: asStringArray(input?.experienceSignals),
    rawLines: []
  }
}

export async function POST(request: Request) {
  const rateLimit = consumeRateLimit({
    namespace: 'jobs-search',
    identifier: getClientIp(request),
    max: 24,
    windowMs: 60_000
  })
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'RATE_LIMITED', configured: isAdzunaConfigured(), jobs: [] },
      { status: 429, headers: toRateLimitHeaders(rateLimit) }
    )
  }

  if (!isAdzunaConfigured()) {
    return NextResponse.json({ configured: false, jobs: [] }, { headers: toRateLimitHeaders(rateLimit) })
  }

  const body = (await request.json().catch(() => null)) as SearchBody | null
  const roles = asRoles(body?.roles)
  const location = asString(body?.location)
  const country = asString(body?.country) || undefined
  const signals = normalizeSignals(body?.profileSignals)

  if (roles.length === 0 || !location) {
    return NextResponse.json(
      { error: 'INVALID_INPUT', configured: true, jobs: [] },
      { status: 400, headers: toRateLimitHeaders(rateLimit) }
    )
  }

  try {
    const scored: ScoredJob[] = []
    for (const role of roles) {
      const postings = await fetchJobsPaged({ role, location, country, maxPages: 1 })
      for (const posting of postings) {
        if (!posting.title || !posting.sourceUrl) continue
        const requirements = posting.description
          ? aggregateRequirements(
              extractRequirementsFromText({ source: 'adzuna', text: posting.description })
            )
          : []
        scored.push({
          id: posting.providerJobId,
          title: posting.title,
          company: posting.company ?? 'Unknown company',
          location: posting.location ?? location,
          description: posting.description ?? '',
          sourceUrl: posting.sourceUrl,
          salaryMin: posting.salaryMin,
          salaryMax: posting.salaryMax,
          postedAt: posting.postedAt,
          matchedRole: role,
          fit: scoreRequirementFit(requirements, signals)
        })
      }
    }

    const jobs = rankScoredJobs(scored, roles[0])
    return NextResponse.json({ configured: true, jobs }, { headers: toRateLimitHeaders(rateLimit) })
  } catch (error) {
    console.error('jobs/search failed:', error)
    return NextResponse.json(
      { error: 'SEARCH_FAILED', configured: true, jobs: [] },
      { status: 502, headers: toRateLimitHeaders(rateLimit) }
    )
  }
}
