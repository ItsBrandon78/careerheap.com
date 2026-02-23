import type Stripe from 'stripe'
import { NextRequest, NextResponse } from 'next/server'
import {
  getBillingProfileByCustomerId,
  updateBillingProfileByCustomerId,
  updateBillingProfileByEmail,
  updateBillingProfileByUserId
} from '@/lib/server/billing'
import { isEntitledToProByStatus, resolveEntitledPlan } from '@/lib/server/billingEntitlements'
import { assertRequiredEnv, getMissingStripeWebhookEnv } from '@/lib/server/envValidation'
import { getStripeClient } from '@/lib/server/stripe'

interface ProfileLookup {
  userId?: string | null
  customerId?: string | null
  email?: string | null
}

async function applyProfileUpdate(
  lookup: ProfileLookup,
  payload: Record<string, unknown>
) {
  if (lookup.userId) {
    await updateBillingProfileByUserId(lookup.userId, payload)
    return
  }

  if (lookup.customerId) {
    await updateBillingProfileByCustomerId(lookup.customerId, payload)
    return
  }

  if (lookup.email) {
    await updateBillingProfileByEmail(lookup.email, payload)
  }
}

function getSessionLookup(session: Stripe.Checkout.Session): ProfileLookup {
  return {
    userId:
      session.metadata?.userId ??
      (typeof session.client_reference_id === 'string'
        ? session.client_reference_id
        : null),
    customerId: typeof session.customer === 'string' ? session.customer : null,
    email: session.customer_details?.email ?? session.customer_email ?? null
  }
}

function getCheckoutPlan(session: Stripe.Checkout.Session) {
  if (session.metadata?.plan === 'lifetime' || session.mode === 'payment') return 'lifetime'
  return 'pro'
}

function toIsoFromUnix(value: number | null | undefined) {
  if (!value || !Number.isFinite(value)) return null
  return new Date(value * 1000).toISOString()
}

export function buildSubscriptionProfilePayload(options: {
  existingPlan: 'free' | 'pro' | 'lifetime'
  subscription: Stripe.Subscription
}) {
  const { existingPlan, subscription } = options
  const status = subscription.status ?? null
  const subscriptionItem = subscription.items.data[0]
  const payload: Record<string, unknown> = {
    stripe_subscription_id: subscription.id,
    stripe_subscription_status: status,
    stripe_price_id: subscriptionItem?.price?.id ?? null,
    stripe_cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
    stripe_current_period_end: toIsoFromUnix(subscriptionItem?.current_period_end)
  }

  const nextPlan =
    existingPlan === 'lifetime'
      ? 'lifetime'
      : resolveEntitledPlan({
          plan: existingPlan,
          stripeSubscriptionStatus: status
        })
  payload.plan = nextPlan

  return payload
}

export async function applyCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const plan = getCheckoutPlan(session)
  const payload: Record<string, unknown> = {
    plan,
    stripe_customer_id: typeof session.customer === 'string' ? session.customer : null,
    stripe_price_id: session.metadata?.priceId ?? null
  }

  if (plan === 'lifetime') {
    payload.stripe_subscription_status = 'active'
    payload.lifetime_purchased_at = new Date().toISOString()
    payload.stripe_subscription_id = null
    payload.stripe_cancel_at_period_end = false
    payload.stripe_current_period_end = null
  } else {
    payload.stripe_subscription_id =
      typeof session.subscription === 'string' ? session.subscription : null
    payload.stripe_subscription_status = 'active'
  }

  await applyProfileUpdate(getSessionLookup(session), payload)
}

export async function syncCheckoutSessionById(options: {
  sessionId: string
  userId: string
  email?: string | null
}) {
  const stripe = getStripeClient()
  const session = await stripe.checkout.sessions.retrieve(options.sessionId)
  const lookup = getSessionLookup(session)

  if (lookup.userId && lookup.userId !== options.userId) {
    throw new Error('Checkout session is not owned by the authenticated user')
  }

  if (!lookup.userId && lookup.email && options.email) {
    if (lookup.email.toLowerCase() !== options.email.toLowerCase()) {
      throw new Error('Checkout session email does not match authenticated user')
    }
  }

  if (session.status !== 'complete') {
    throw new Error('Checkout session is not complete yet')
  }

  if (session.mode === 'payment') {
    const paymentStatus = session.payment_status
    if (paymentStatus !== 'paid' && paymentStatus !== 'no_payment_required') {
      throw new Error('Checkout payment is not settled yet')
    }
  }

  await applyCheckoutSessionCompleted(session)
  return session
}

export async function handleStripeWebhook(request: NextRequest) {
  try {
    assertRequiredEnv(getMissingStripeWebhookEnv(), 'Stripe webhook')

    const stripe = getStripeClient()
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    if (!webhookSecret) {
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
    }

    const signature = request.headers.get('stripe-signature')
    if (!signature) {
      return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
    }

    const body = await request.text()
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret)

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      await applyCheckoutSessionCompleted(session)
    }

    if (
      event.type === 'customer.subscription.created' ||
      event.type === 'customer.subscription.updated'
    ) {
      const subscription = event.data.object
      const customerId =
        typeof subscription.customer === 'string' ? subscription.customer : null
      if (customerId) {
        const profile = await getBillingProfileByCustomerId(customerId)
        const existingPlan = profile?.plan ?? 'free'
        const payload = buildSubscriptionProfilePayload({
          existingPlan,
          subscription
        })
        await updateBillingProfileByCustomerId(customerId, payload)
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object
      const customerId =
        typeof subscription.customer === 'string' ? subscription.customer : null

      if (customerId) {
        const profile = await getBillingProfileByCustomerId(customerId)
        const existingPlan = profile?.plan ?? 'free'
        const payload: Record<string, unknown> = {
          stripe_subscription_id: null,
          stripe_subscription_status: 'canceled',
          stripe_cancel_at_period_end: false,
          stripe_current_period_end: toIsoFromUnix(subscription.ended_at)
        }
        payload.plan = existingPlan === 'lifetime' ? 'lifetime' : 'free'
        await updateBillingProfileByCustomerId(customerId, payload)
      }
    }

    if (event.type === 'invoice.payment_succeeded') {
      const invoice = event.data.object
      const customerId =
        typeof invoice.customer === 'string' ? invoice.customer : null
      if (customerId) {
        const profile = await getBillingProfileByCustomerId(customerId)
        if (profile && profile.plan !== 'lifetime') {
          const nextPlan = isEntitledToProByStatus('active') ? 'pro' : 'free'
          await updateBillingProfileByCustomerId(customerId, {
            plan: nextPlan,
            stripe_subscription_status: 'active'
          })
        }
      }
    }

    if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object
      const customerId =
        typeof invoice.customer === 'string' ? invoice.customer : null
      if (customerId) {
        const profile = await getBillingProfileByCustomerId(customerId)
        const payload: Record<string, unknown> = {
          stripe_subscription_status: 'past_due'
        }
        if (profile && profile.plan !== 'lifetime') {
          payload.plan = 'pro'
        }
        await updateBillingProfileByCustomerId(customerId, payload)
      }
    }

    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object
      if (paymentIntent.metadata?.plan === 'lifetime') {
        const customerId =
          typeof paymentIntent.customer === 'string'
            ? paymentIntent.customer
            : null
        const userId = paymentIntent.metadata?.userId ?? null

        await applyProfileUpdate(
          { userId, customerId },
          {
            plan: 'lifetime',
            stripe_customer_id: customerId,
            stripe_subscription_id: null,
            stripe_subscription_status: 'active',
            stripe_cancel_at_period_end: false,
            stripe_current_period_end: null,
            lifetime_purchased_at: new Date().toISOString()
          }
        )
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Stripe webhook error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 400 })
  }
}
