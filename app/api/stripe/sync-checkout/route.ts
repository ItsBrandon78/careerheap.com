import { NextResponse } from 'next/server'
import { getAuthenticatedBillingUser } from '@/lib/server/billing'
import { syncCheckoutSessionById } from '@/lib/server/stripeWebhook'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedBillingUser()
    if (!user) {
      return NextResponse.json({ error: 'AUTH_REQUIRED' }, { status: 401 })
    }

    const body = (await request.json().catch(() => null)) as { sessionId?: unknown } | null
    const sessionId = typeof body?.sessionId === 'string' ? body.sessionId.trim() : ''
    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 })
    }

    await syncCheckoutSessionById({
      sessionId,
      userId: user.id,
      email: user.email ?? null
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Stripe checkout sync error:', error)
    const details = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === 'production'
            ? 'Failed to sync checkout session.'
            : `Failed to sync checkout session. ${details}`
      },
      { status: 400 }
    )
  }
}

