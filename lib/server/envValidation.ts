const coreRequiredEnv = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY'
] as const

const stripeCheckoutRequiredEnv = [
  'STRIPE_SECRET_KEY',
  'STRIPE_PRICE_PRO_MONTHLY',
  'STRIPE_PRICE_LIFETIME'
] as const

const stripePortalRequiredEnv = ['STRIPE_SECRET_KEY'] as const

const stripeWebhookRequiredEnv = [
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET'
] as const

const sanityRequiredEnv = [
  'SANITY_PROJECT_ID',
  'SANITY_DATASET'
] as const

function missingVars(vars: readonly string[]) {
  return vars.filter((key) => !process.env[key] || process.env[key]?.trim().length === 0)
}

export function getMissingCoreEnv() {
  return missingVars(coreRequiredEnv)
}

export function getMissingStripeEnv() {
  return missingVars(stripeCheckoutRequiredEnv)
}

export function getMissingStripePortalEnv() {
  return missingVars(stripePortalRequiredEnv)
}

export function getMissingStripeWebhookEnv() {
  return missingVars(stripeWebhookRequiredEnv)
}

export function getMissingSanityEnv() {
  return missingVars(sanityRequiredEnv)
}

export function assertRequiredEnv(vars: string[], label: string) {
  if (vars.length === 0) return
  throw new Error(`Missing ${label} env vars: ${vars.join(', ')}`)
}

let reported = false

export function reportMissingEnvInDev() {
  if (process.env.NODE_ENV === 'production' || reported) {
    return
  }

  const missing = {
    core: getMissingCoreEnv(),
    stripeCheckout: getMissingStripeEnv(),
    stripePortal: getMissingStripePortalEnv(),
    stripeWebhook: getMissingStripeWebhookEnv(),
    sanity: getMissingSanityEnv()
  }

  if (
    missing.core.length === 0 &&
    missing.stripeCheckout.length === 0 &&
    missing.stripePortal.length === 0 &&
    missing.stripeWebhook.length === 0 &&
    missing.sanity.length === 0
  ) {
    reported = true
    return
  }

  reported = true
  console.warn('[env-check] Missing environment variables', missing)
}
