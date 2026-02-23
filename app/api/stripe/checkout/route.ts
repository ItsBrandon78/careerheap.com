import { NextResponse } from 'next/server'
import {
  ensureBillingProfile,
  getAuthenticatedBillingUser,
  updateBillingProfileByUserId
} from '@/lib/server/billing'
import { resolveEntitledPlan } from '@/lib/server/billingEntitlements'
import { assertRequiredEnv, getMissingStripeEnv } from '@/lib/server/envValidation'
import {
  getAppBaseUrl,
  getPriceIdForPlan,
  getStripeClient,
  type BillingCadence,
  type CheckoutPlan
} from '@/lib/server/stripe'

export const dynamic = 'force-dynamic'

function parsePlan(value: unknown): CheckoutPlan | null {
  if (value === 'pro' || value === 'lifetime') return value
  return null
}

function parseCadence(value: unknown): BillingCadence {
  if (value === 'yearly') return 'yearly'
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
      | { plan?: unknown; cadence?: unknown }
      | null
    const plan = parsePlan(body?.plan)
    if (!plan) {
      return NextResponse.json({ error: 'Invalid plan. Use "pro" or "lifetime".' }, { status: 400 })
    }
    const cadence = parseCadence(body?.cadence)

    const stripe = getStripeClient()
    const priceId = getPriceIdForPlan(plan, cadence)
    if (!priceId) {
      return NextResponse.json(
        { error: `Stripe price is not configured for ${plan} (${cadence}).` },
        { status: 500 }
      )
    }

    const profile = await ensureBillingProfile(user)
    const entitledPlan = resolveEntitledPlan({
      plan: profile.plan,
      stripeSubscriptionStatus: profile.stripe_subscription_status
    })
    if (entitledPlan === 'lifetime') {
      return NextResponse.json(
        { error: 'Lifetime plan is already active for this account.' },
        { status: 409 }
      )
    }

    if (entitledPlan === 'pro' && plan === 'pro') {
      return NextResponse.json(
        { error: 'Pro subscription is already active for this account.' },
        { status: 409 }
      )
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
      client_reference_id: user.id,
      allow_promotion_codes: true
    })

    if (!session.url) {
      return NextResponse.json({ error: 'Checkout session URL unavailable.' }, { status: 500 })
    }

    return NextResponse.json({ sessionUrl: session.url })
  } catch (error) {
    console.error('Stripe checkout error:', error)
    const details = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === 'production'
            ? 'Failed to create checkout session.'
            : `Failed to create checkout session. ${details}`
      },
      { status: 500 }
    )
  }
}
