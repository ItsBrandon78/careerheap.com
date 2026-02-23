import { NextRequest, NextResponse } from 'next/server'
import {
  consumeSummaryOverride,
  buildSummaryFromOverrides,
  consumeUsageForSuccessfulRun,
  getAnonymousUsageSummary,
  getAuthenticatedUserFromRequest,
  getUsageSummaryForUser,
  parsePlanOverride,
  parseUsesRemainingOverride
} from '@/lib/server/toolUsage'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  void params

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
    console.error('Tool usage check error:', error)
    return NextResponse.json({ error: 'Failed to check tool usage' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const planOverride = parsePlanOverride(request.nextUrl.searchParams.get('plan'))
    const usesOverride = parseUsesRemainingOverride(request.nextUrl.searchParams.get('uses'))
    if (planOverride) {
      const summary = buildSummaryFromOverrides({
        plan: planOverride,
        usesRemaining: usesOverride
      })
      if (!summary.canUse) {
        return NextResponse.json(
          { error: 'LOCKED', message: 'Free usage limit reached.', usage: summary },
          { status: 402 }
        )
      }
      return NextResponse.json(consumeSummaryOverride(summary))
    }

    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json(
        { error: 'AUTH_REQUIRED', message: 'Sign in to use this tool.' },
        { status: 401 }
      )
    }

    const { summary, locked } = await consumeUsageForSuccessfulRun({
      user,
      toolName: slug
    })

    if (locked) {
      return NextResponse.json(
        { error: 'LOCKED', message: 'Free usage limit reached.', usage: summary },
        { status: 402 }
      )
    }

    return NextResponse.json(summary)
  } catch (error) {
    console.error('Tool usage consume error:', error)
    return NextResponse.json({ error: 'Failed to update tool usage' }, { status: 500 })
  }
}
