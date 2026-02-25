const coreRequiredEnv = [
  'NEXT_PUBLIC_SUPABASE_URL'
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
  const missing = missingVars(coreRequiredEnv)
  const hasSupabaseAdminKey = Boolean(
    process.env.SUPABASE_SECRET_KEY?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  )
  const hasPublicSupabaseKey = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY?.trim()
  )

  if (!hasSupabaseAdminKey) {
    missing.push('SUPABASE_SECRET_KEY (legacy fallback: SUPABASE_SERVICE_ROLE_KEY)')
  }

  if (!hasPublicSupabaseKey) {
    missing.push(
      'NEXT_PUBLIC_SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)'
    )
  }

  return missing
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
