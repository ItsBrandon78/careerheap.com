import { NextRequest, NextResponse } from 'next/server'
import {
  buildSummaryFromOverrides,
  getAnonymousUsageSummary,
  getAuthenticatedUserFromRequest,
  getUsageSummaryForUser,
  parsePlanOverride,
  parseUsesRemainingOverride
} from '@/lib/server/toolUsage'

export async function GET(request: NextRequest) {
  try {
    const planOverride = parsePlanOverride(request.nextUrl.searchParams.get('plan'))
    const usesOverride = parseUsesRemainingOverride(request.nextUrl.searchParams.get('uses'))
    if (planOverride) {
      return NextResponse.json(
        buildSummaryFromOverrides({
          plan: planOverride,
          usesRemaining: usesOverride
        })
      )
    }

    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json(getAnonymousUsageSummary())
    }

    const summary = await getUsageSummaryForUser(user)
    return NextResponse.json(summary)
  } catch (error) {
    console.error('Usage summary error:', error)
    return NextResponse.json({ error: 'Failed to fetch usage summary' }, { status: 500 })
  }
}
