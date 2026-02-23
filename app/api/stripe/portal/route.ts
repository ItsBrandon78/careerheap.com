import { NextResponse } from 'next/server'
import { ensureBillingProfile, getAuthenticatedBillingUser } from '@/lib/server/billing'
import { resolveEntitledPlan } from '@/lib/server/billingEntitlements'
import { assertRequiredEnv, getMissingStripePortalEnv } from '@/lib/server/envValidation'
import { getAppBaseUrl, getStripeClient } from '@/lib/server/stripe'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    assertRequiredEnv(getMissingStripePortalEnv(), 'Stripe portal')

    const user = await getAuthenticatedBillingUser()
    if (!user) {
      return NextResponse.json({ error: 'AUTH_REQUIRED' }, { status: 401 })
    }

    const profile = await ensureBillingProfile(user)
    const entitledPlan = resolveEntitledPlan({
      plan: profile.plan,
      stripeSubscriptionStatus: profile.stripe_subscription_status
    })

    if (entitledPlan === 'free') {
      return NextResponse.json(
        { error: 'Billing portal is available for paid plans only.' },
        { status: 400 }
      )
    }

    if (!profile.stripe_customer_id) {
      return NextResponse.json({ error: 'Missing Stripe customer record.' }, { status: 400 })
    }

    const stripe = getStripeClient()
    const portal = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url:
        process.env.STRIPE_PORTAL_RETURN_URL || `${getAppBaseUrl()}/account?tab=billing`
    })

    return NextResponse.json({ url: portal.url })
  } catch (error) {
    console.error('Stripe portal error:', error)
    const details = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === 'production'
            ? 'Failed to create billing portal session.'
            : `Failed to create billing portal session. ${details}`
      },
      { status: 500 }
    )
  }
}
