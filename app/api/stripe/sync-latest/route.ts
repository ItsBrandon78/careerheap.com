import { NextResponse } from 'next/server'
import { getAuthenticatedBillingUser, getBillingProfileByUserId } from '@/lib/server/billing'
import { getStripeClient } from '@/lib/server/stripe'
import { applyCheckoutSessionCompleted } from '@/lib/server/stripeWebhook'

export const dynamic = 'force-dynamic'

function canApplySessionToUser(options: {
  sessionUserId: string | null
  sessionEmail: string | null
  userId: string
  userEmail: string | null
}) {
  if (options.sessionUserId) {
    return options.sessionUserId === options.userId
  }

  if (options.sessionEmail && options.userEmail) {
    return options.sessionEmail.toLowerCase() === options.userEmail.toLowerCase()
  }

  return false
}

export async function POST() {
  try {
    const user = await getAuthenticatedBillingUser()
    if (!user) {
      return NextResponse.json({ error: 'AUTH_REQUIRED' }, { status: 401 })
    }

    const profile = await getBillingProfileByUserId(user.id)
    if (!profile?.stripe_customer_id) {
      return NextResponse.json({ error: 'No Stripe customer found for account.' }, { status: 400 })
    }

    const stripe = getStripeClient()
    const list = await stripe.checkout.sessions.list({
      customer: profile.stripe_customer_id,
      limit: 20
    })

    for (const session of list.data) {
      if (session.status !== 'complete') continue
      if (session.mode === 'payment') {
        const paymentStatus = session.payment_status
        if (paymentStatus !== 'paid' && paymentStatus !== 'no_payment_required') {
          continue
        }
      }

      const sessionUserId =
        session.metadata?.userId ??
        (typeof session.client_reference_id === 'string'
          ? session.client_reference_id
          : null)
      const sessionEmail = session.customer_details?.email ?? session.customer_email ?? null

      if (
        !canApplySessionToUser({
          sessionUserId,
          sessionEmail,
          userId: user.id,
          userEmail: user.email ?? null
        })
      ) {
        continue
      }

      await applyCheckoutSessionCompleted(session)
      return NextResponse.json({ ok: true, sessionId: session.id })
    }

    return NextResponse.json({ error: 'No completed checkout session found.' }, { status: 404 })
  } catch (error) {
    console.error('Stripe latest-sync error:', error)
    const details = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === 'production'
            ? 'Failed to sync latest checkout.'
            : `Failed to sync latest checkout. ${details}`
      },
      { status: 400 }
    )
  }
}

