import type { BillingPlan } from '@/lib/server/billing'

export type StripeSubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'incomplete'
  | 'incomplete_expired'
  | 'paused'
  | null

export interface BillingEntitlementState {
  plan: BillingPlan
  stripeSubscriptionStatus: string | null
}

const ACTIVE_PRO_STATUSES = new Set(['trialing', 'active', 'past_due'])

function normalizeSubscriptionStatus(status: string | null): StripeSubscriptionStatus {
  if (
    status === 'trialing' ||
    status === 'active' ||
    status === 'past_due' ||
    status === 'canceled' ||
    status === 'unpaid' ||
    status === 'incomplete' ||
    status === 'incomplete_expired' ||
    status === 'paused'
  ) {
    return status
  }
  return null
}

export function isEntitledToProByStatus(status: string | null) {
  const normalized = normalizeSubscriptionStatus(status)
  return normalized ? ACTIVE_PRO_STATUSES.has(normalized) : false
}

export function resolveEntitledPlan(state: BillingEntitlementState): BillingPlan {
  if (state.plan === 'lifetime') {
    return 'lifetime'
  }

  if (isEntitledToProByStatus(state.stripeSubscriptionStatus)) {
    return 'pro'
  }

  return 'free'
}
