import Stripe from 'stripe'

export type CheckoutPlan = 'pro' | 'lifetime'
export type BillingCadence = 'monthly' | 'yearly'

let cachedStripeClient: Stripe | null = null

export function getStripeClient() {
  if (cachedStripeClient) {
    return cachedStripeClient
  }

  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) {
    throw new Error('Missing STRIPE_SECRET_KEY')
  }

  cachedStripeClient = new Stripe(secretKey)
  return cachedStripeClient
}

export function getPriceIdForPlan(plan: CheckoutPlan, cadence: BillingCadence = 'monthly') {
  if (plan === 'lifetime') {
    return process.env.STRIPE_PRICE_LIFETIME || null
  }

  if (cadence === 'yearly') {
    return (
      process.env.STRIPE_PRICE_PRO_YEARLY ||
      process.env.STRIPE_PRICE_YEARLY ||
      process.env.STRIPE_PRICE_PRO_ANNUAL ||
      null
    )
  }

  return (
    process.env.STRIPE_PRICE_PRO_MONTHLY ||
    process.env.STRIPE_PRICE_MONTHLY ||
    null
  )
}

export function getAppBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
}
