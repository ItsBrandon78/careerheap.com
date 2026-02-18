import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

type PlanType = 'free' | 'pro' | 'lifetime'

async function updatePlanByEmail({
  email,
  plan,
  stripeCustomerId
}: {
  email: string | null | undefined
  plan: PlanType
  stripeCustomerId?: string
}) {
  if (!email) return

  const { createAdminClient } = await import('@/lib/supabase/admin')
  const supabase = createAdminClient()

  const payload: { plan: PlanType; stripe_customer_id?: string } = { plan }
  if (stripeCustomerId) {
    payload.stripe_customer_id = stripeCustomerId
  }

  await supabase.from('profiles').update(payload).eq('email', email)
}

export async function POST(request: NextRequest) {
  try {
    const { default: Stripe } = await import('stripe')
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '')

    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
    }

    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    )

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      const email =
        session.customer_details?.email ??
        session.customer_email ??
        null
      const stripeCustomerId =
        typeof session.customer === 'string' ? session.customer : undefined
      const plan = session.metadata?.plan === 'lifetime' ? 'lifetime' : 'pro'

      await updatePlanByEmail({ email, plan, stripeCustomerId })
    }

    if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated') {
      const subscription = event.data.object
      if (subscription.status !== 'active' && subscription.status !== 'trialing') {
        return NextResponse.json({ received: true })
      }

      if (subscription.customer) {
        const customer = await stripe.customers.retrieve(subscription.customer as string)
        const email = customer && 'email' in customer ? customer.email : null
        await updatePlanByEmail({
          email,
          plan: 'pro',
          stripeCustomerId: typeof subscription.customer === 'string' ? subscription.customer : undefined
        })
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object
      if (subscription.customer) {
        const customer = await stripe.customers.retrieve(subscription.customer as string)
        const email = customer && 'email' in customer ? customer.email : null
        await updatePlanByEmail({ email, plan: 'free' })
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 400 })
  }
}
