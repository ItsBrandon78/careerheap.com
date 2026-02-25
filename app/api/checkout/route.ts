import { NextResponse } from 'next/server'
import {
  ensureBillingProfile,
  getAuthenticatedBillingUser,
  updateBillingProfileByUserId
} from '@/lib/server/billing'
import { resolveEntitledPlan } from '@/lib/server/billingEntitlements'
import { assertRequiredEnv, getMissingStripeEnv } from '@/lib/server/envValidation'
import { getAppBaseUrl, getPriceIdForPlan, getStripeClient, type BillingCadence } from '@/lib/server/stripe'

export const dynamic = 'force-dynamic'

type LegacyProductId = 'pro_monthly' | 'lifetime_one_time'

function toPlan(value: unknown) {
  if (value === 'lifetime' || value === 'lifetime_one_time') return 'lifetime' as const
  return 'pro' as const
}

function toCadence(value: unknown): BillingCadence {
  if (value === 'yearly' || value === 'pro_yearly') return 'yearly'
  return 'monthly'
}

export async function POST(request: Request) {
  try {
    assertRequiredEnv(getMissingStripeEnv(), 'Stripe')

    const user = await getAuthenticatedBillingUser()
    if (!user) {
      return NextResponse.json({ error: 'AUTH_REQUIRED' }, { status: 401 })
    }

    const body = (await request.json().catch(() => null)) as
      | { plan?: string; productId?: LegacyProductId; cadence?: string }
      | null

    const plan = toPlan(body?.plan ?? body?.productId ?? 'pro')
    const cadence = toCadence(body?.cadence ?? body?.productId)
    const stripe = getStripeClient()
    const priceId = getPriceIdForPlan(plan, cadence)

    if (!priceId) {
      return NextResponse.json({ error: 'Price not configured' }, { status: 500 })
    }

    const profile = await ensureBillingProfile(user)
    const entitledPlan = resolveEntitledPlan({
      plan: profile.plan,
      stripeSubscriptionStatus: profile.stripe_subscription_status
    })
    if (entitledPlan === 'lifetime') {
      return NextResponse.json({ error: 'Lifetime plan is already active for this account.' }, { status: 409 })
    }
    if (entitledPlan === 'pro' && plan === 'pro') {
      return NextResponse.json({ error: 'Pro subscription is already active for this account.' }, { status: 409 })
    }
    let customerId = profile.stripe_customer_id

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: { userId: user.id }
      })
      customerId = customer.id
      await updateBillingProfileByUserId(user.id, { stripe_customer_id: customer.id })
    }

    const baseUrl = getAppBaseUrl()
    const session = await stripe.checkout.sessions.create({
      mode: plan === 'lifetime' ? 'payment' : 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/checkout?plan=${plan}`,
      metadata: {
        userId: user.id,
        plan,
        priceId,
        cadence
      },
      client_reference_id: user.id
    })

    return NextResponse.json({
      url: session.url,
      sessionUrl: session.url
    })
  } catch (error) {
    console.error('Legacy checkout route error:', error)
    const details = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === 'production'
            ? 'Failed to create checkout session'
            : `Failed to create checkout session: ${details}`
      },
      { status: 500 }
    )
  }
}
