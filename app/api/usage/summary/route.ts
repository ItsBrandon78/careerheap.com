import { NextRequest, NextResponse } from 'next/server'
import { ANON_ID_COOKIE, getCurrentUsageSummary, resolveUsageContext } from '@/lib/server/usage'

export async function GET(request: NextRequest) {
  try {
    const context = await resolveUsageContext(request)
    const summary = getCurrentUsageSummary(context)
    const response = NextResponse.json(summary)

    if (context.shouldSetAnonCookie && context.anonId) {
      response.cookies.set(ANON_ID_COOKIE, context.anonId, {
        maxAge: 60 * 60 * 24 * 365,
        httpOnly: false,
        sameSite: 'lax',
        path: '/'
      })
    }

    return response
  } catch (error) {
    console.error('Usage summary error:', error)
    return NextResponse.json({ error: 'Failed to fetch usage summary' }, { status: 500 })
  }
}
