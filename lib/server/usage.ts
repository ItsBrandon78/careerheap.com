import type { NextRequest } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { createClient } from '@/lib/supabase/server'
import { isSupabasePublicEnvConfigured } from '@/lib/supabase/publicEnv'
import {
  FREE_LIFETIME_LIMIT,
  getActorUsage,
  getUsageSummary,
  incrementActorUsage,
  parsePlan,
  parseUsageState,
  parseUsesOverride,
  serializeUsageState,
  type PlanType
} from '@/lib/server/usageState'

export const USAGE_STATE_COOKIE = 'ch_usage_state'
export const ANON_ID_COOKIE = 'ch_anon_id'

export interface UsageContext {
  actorId: string
  anonId: string | null
  shouldSetAnonCookie: boolean
  isUser: boolean
  plan: PlanType
  stateCookieValue: string | null
  usesOverride: number | null
}

function hasSupabaseEnv() {
  return isSupabasePublicEnvConfigured()
}

async function resolveSessionUserId() {
  if (!hasSupabaseEnv()) {
    return null
  }

  try {
    const supabase = await createClient()
    const {
      data: { session }
    } = await supabase.auth.getSession()
    return session?.user?.id ?? null
  } catch {
    return null
  }
}

async function resolveStoredPlan(userId: string | null) {
  if (!userId || !hasSupabaseEnv()) {
    return null
  }

  try {
    const supabase = await createClient()
    const { data } = await supabase.from('profiles').select('plan').eq('id', userId).single()
    return parsePlan(data?.plan) ?? null
  } catch {
    return null
  }
}

export async function resolveUsageContext(request: NextRequest): Promise<UsageContext> {
  const query = request.nextUrl.searchParams
  const queryPlan = parsePlan(query.get('plan'))
  const usesOverride = parseUsesOverride(query.get('uses'))

  const userId = await resolveSessionUserId()
  const profilePlan = await resolveStoredPlan(userId)
  const plan: PlanType = queryPlan ?? profilePlan ?? 'free'

  const anonIdFromCookie = request.cookies.get(ANON_ID_COOKIE)?.value ?? null
  const shouldCreateAnon = !userId && !anonIdFromCookie
  const anonId = !userId ? anonIdFromCookie ?? uuidv4() : null
  const actorId = userId ?? anonId ?? 'anonymous'

  return {
    actorId,
    anonId,
    shouldSetAnonCookie: Boolean(!userId && shouldCreateAnon && anonId),
    isUser: Boolean(userId),
    plan,
    stateCookieValue: request.cookies.get(USAGE_STATE_COOKIE)?.value ?? null,
    usesOverride
  }
}

export function getCurrentUsageSummary(context: UsageContext) {
  if (context.usesOverride !== null) {
    return getUsageSummary({
      plan: context.plan,
      usageTotal: Math.max(FREE_LIFETIME_LIMIT - context.usesOverride, 0)
    })
  }

  const state = parseUsageState(context.stateCookieValue ?? undefined)
  const usage = getActorUsage(state, context.actorId, context.isUser)
  return getUsageSummary({
    plan: context.plan,
    usageTotal: usage.total,
    byTool: usage.byTool
  })
}

export function consumeUsage(context: UsageContext, toolSlug: string) {
  if (context.usesOverride !== null) {
    const remainingBefore = Math.max(context.usesOverride, 0)
    const nextUsed = Math.min(FREE_LIFETIME_LIMIT, FREE_LIFETIME_LIMIT - remainingBefore + 1)
    return {
      summary: getUsageSummary({
        plan: context.plan,
        usageTotal: nextUsed
      }),
      serializedState: null
    }
  }

  const state = parseUsageState(context.stateCookieValue ?? undefined)
  const before = getActorUsage(state, context.actorId, context.isUser)
  const beforeSummary = getUsageSummary({
    plan: context.plan,
    usageTotal: before.total,
    byTool: before.byTool
  })

  if (!beforeSummary.canUse) {
    return {
      summary: beforeSummary,
      serializedState: serializeUsageState(state)
    }
  }

  const nextUsage = incrementActorUsage(state, context.actorId, toolSlug, context.isUser)
  return {
    summary: getUsageSummary({
      plan: context.plan,
      usageTotal: nextUsage.total,
      byTool: nextUsage.byTool
    }),
    serializedState: serializeUsageState(state)
  }
}
