import { NextRequest, NextResponse } from 'next/server'
import { ANON_ID_COOKIE, USAGE_STATE_COOKIE, consumeUsage, getCurrentUsageSummary, resolveUsageContext } from '@/lib/server/usage'

function applyUsageCookies(response: NextResponse, options: {
  anonId: string | null
  shouldSetAnonCookie: boolean
  serializedState: string | null
}) {
  const { anonId, shouldSetAnonCookie, serializedState } = options

  if (shouldSetAnonCookie && anonId) {
    response.cookies.set(ANON_ID_COOKIE, anonId, {
      maxAge: 60 * 60 * 24 * 365,
      httpOnly: false,
      sameSite: 'lax',
      path: '/'
    })
  }

  if (serializedState) {
    response.cookies.set(USAGE_STATE_COOKIE, serializedState, {
      maxAge: 60 * 60 * 24 * 365,
      httpOnly: false,
      sameSite: 'lax',
      path: '/'
    })
  }
}

export async function GET(request: NextRequest) {
  try {
    const context = await resolveUsageContext(request)
    const summary = getCurrentUsageSummary(context)
    const response = NextResponse.json(summary)

    applyUsageCookies(response, {
      anonId: context.anonId,
      shouldSetAnonCookie: context.shouldSetAnonCookie,
      serializedState: null
    })

    return response
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
    const context = await resolveUsageContext(request)
    const { summary, serializedState } = consumeUsage(context, slug)
    const response = NextResponse.json(summary)

    applyUsageCookies(response, {
      anonId: context.anonId,
      shouldSetAnonCookie: context.shouldSetAnonCookie,
      serializedState
    })

    return response
  } catch (error) {
    console.error('Tool usage consume error:', error)
    return NextResponse.json({ error: 'Failed to update tool usage' }, { status: 500 })
  }
}
