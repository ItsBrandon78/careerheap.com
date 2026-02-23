import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export type BillingPlan = 'free' | 'pro' | 'lifetime'

export interface BillingProfile {
  id: string
  email: string | null
  plan: BillingPlan
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  stripe_subscription_status: string | null
  stripe_cancel_at_period_end: boolean
  stripe_current_period_end: string | null
  stripe_price_id: string | null
  lifetime_purchased_at: string | null
}

export interface BillingUser {
  id: string
  email: string | null
}

function normalizePlan(value: unknown): BillingPlan {
  if (value === 'pro' || value === 'lifetime') return value
  return 'free'
}

function normalizeProfile(data: Record<string, unknown>) {
  return {
    ...data,
    plan: normalizePlan(data.plan),
    stripe_cancel_at_period_end: data.stripe_cancel_at_period_end === true,
    stripe_current_period_end:
      typeof data.stripe_current_period_end === 'string'
        ? data.stripe_current_period_end
        : null,
    lifetime_purchased_at:
      typeof data.lifetime_purchased_at === 'string'
        ? data.lifetime_purchased_at
        : null
  } as BillingProfile
}

function isMissingColumnError(error: unknown) {
  if (!error || typeof error !== 'object') return false
  const maybeError = error as { code?: string; message?: string }
  const message = maybeError.message ?? ''
  return maybeError.code === 'PGRST204' || /column .* does not exist/i.test(message)
}

function stripOptionalSubscriptionFields(payload: Record<string, unknown>) {
  const next = { ...payload }
  delete next.stripe_cancel_at_period_end
  delete next.stripe_current_period_end
  return next
}

function hasSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
  return Boolean(url && anonKey)
}

export async function getAuthenticatedBillingUser(): Promise<BillingUser | null> {
  if (!hasSupabaseEnv()) {
    return null
  }

  try {
    const supabase = await createClient()
    const {
      data: { session }
    } = await supabase.auth.getSession()

    if (!session?.user?.id) {
      return null
    }

    return {
      id: session.user.id,
      email: session.user.email ?? null
    }
  } catch {
    return null
  }
}

export async function getBillingProfileByUserId(userId: string) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (error || !data) return null

  return normalizeProfile(data as Record<string, unknown>)
}

export async function ensureBillingProfile(user: BillingUser): Promise<BillingProfile> {
  const existing = await getBillingProfileByUserId(user.id)
  if (existing) return existing

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('profiles')
    .insert({
      id: user.id,
      email: user.email,
      plan: 'free'
    })
    .select('*')
    .single()

  if (error || !data) {
    const reason =
      error && typeof error === 'object' && 'message' in error
        ? String((error as { message?: string }).message ?? '')
        : ''
    throw new Error(
      reason ? `Unable to create billing profile (${reason})` : 'Unable to create billing profile'
    )
  }

  return normalizeProfile(data as Record<string, unknown>)
}

export async function updateBillingProfileByUserId(
  userId: string,
  payload: Record<string, unknown>
) {
  const admin = createAdminClient()
  let { error } = await admin.from('profiles').update(payload).eq('id', userId)
  if (error && isMissingColumnError(error)) {
    const fallbackPayload = stripOptionalSubscriptionFields(payload)
    if (Object.keys(fallbackPayload).length > 0) {
      const retry = await admin.from('profiles').update(fallbackPayload).eq('id', userId)
      error = retry.error
    }
  }
  if (error) {
    throw error
  }
}

export async function getBillingProfileByCustomerId(customerId: string) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('profiles')
    .select('*')
    .eq('stripe_customer_id', customerId)
    .maybeSingle()

  if (error || !data) return null
  return normalizeProfile(data as Record<string, unknown>)
}

export async function updateBillingProfileByCustomerId(
  customerId: string,
  payload: Record<string, unknown>
) {
  const admin = createAdminClient()
  let { error } = await admin
    .from('profiles')
    .update(payload)
    .eq('stripe_customer_id', customerId)
  if (error && isMissingColumnError(error)) {
    const fallbackPayload = stripOptionalSubscriptionFields(payload)
    if (Object.keys(fallbackPayload).length > 0) {
      const retry = await admin
        .from('profiles')
        .update(fallbackPayload)
        .eq('stripe_customer_id', customerId)
      error = retry.error
    }
  }

  if (error) {
    throw error
  }
}

export async function updateBillingProfileByEmail(
  email: string,
  payload: Record<string, unknown>
) {
  const admin = createAdminClient()
  let { error } = await admin.from('profiles').update(payload).eq('email', email)
  if (error && isMissingColumnError(error)) {
    const fallbackPayload = stripOptionalSubscriptionFields(payload)
    if (Object.keys(fallbackPayload).length > 0) {
      const retry = await admin.from('profiles').update(fallbackPayload).eq('email', email)
      error = retry.error
    }
  }
  if (error) {
    throw error
  }
}
