import { createHash } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { resolveEntitledPlan } from '@/lib/server/billingEntitlements'

export type PlanType = 'free' | 'pro' | 'lifetime'

export interface UsageSummary {
  plan: PlanType
  isUnlimited: boolean
  canUse: boolean
  used: number
  limit: number
  usesRemaining: number | null
  byTool: Record<string, number>
}

export interface AuthenticatedUser {
  id: string
  email: string | null
}

type ToolRunStatus = 'success' | 'locked' | 'failed'

const FREE_LIFETIME_LIMIT = 3

interface ProfileRow {
  id: string
  email: string | null
  plan: string | null
  free_uses_used: number | null
  stripe_subscription_status: string | null
}

function normalizePlan(value: unknown): PlanType {
  if (value === 'pro' || value === 'lifetime') return value
  return 'free'
}

function hasSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
  return Boolean(url && anonKey)
}

export function parsePlanOverride(value: string | null): PlanType | null {
  if (value === 'free' || value === 'pro' || value === 'lifetime') {
    return value
  }
  return null
}

export function parseUsesRemainingOverride(value: string | null): number | null {
  if (value === null || value === '') return null
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return null
  const rounded = Math.floor(parsed)
  if (rounded < 0 || rounded > FREE_LIFETIME_LIMIT) return null
  return rounded
}

export function getFreeUsageLimit() {
  return FREE_LIFETIME_LIMIT
}

export function getAnonymousUsageSummary(): UsageSummary {
  return {
    plan: 'free',
    isUnlimited: false,
    canUse: true,
    used: 0,
    limit: FREE_LIFETIME_LIMIT,
    usesRemaining: FREE_LIFETIME_LIMIT,
    byTool: {}
  }
}

function buildUsageSummary(options: {
  plan: PlanType
  used: number
  byTool: Record<string, number>
}): UsageSummary {
  const { plan, used, byTool } = options
  const isUnlimited = plan === 'pro' || plan === 'lifetime'
  const safeUsed = Math.max(0, Math.floor(used))
  const constrainedUsed = isUnlimited
    ? safeUsed
    : Math.min(FREE_LIFETIME_LIMIT, safeUsed)

  return {
    plan,
    isUnlimited,
    canUse: isUnlimited ? true : constrainedUsed < FREE_LIFETIME_LIMIT,
    used: constrainedUsed,
    limit: FREE_LIFETIME_LIMIT,
    usesRemaining: isUnlimited
      ? null
      : Math.max(FREE_LIFETIME_LIMIT - constrainedUsed, 0),
    byTool
  }
}

export function buildSummaryFromOverrides(options: {
  plan: PlanType
  usesRemaining: number | null
}) {
  const { plan, usesRemaining } = options
  if (plan === 'pro' || plan === 'lifetime') {
    return buildUsageSummary({
      plan,
      used: 0,
      byTool: {}
    })
  }

  const remaining = usesRemaining ?? FREE_LIFETIME_LIMIT
  const used = Math.max(0, FREE_LIFETIME_LIMIT - remaining)
  return buildUsageSummary({
    plan: 'free',
    used,
    byTool: {}
  })
}

export function consumeSummaryOverride(summary: UsageSummary) {
  if (summary.isUnlimited) {
    return summary
  }

  const nextUsed = Math.min(FREE_LIFETIME_LIMIT, summary.used + 1)
  return buildUsageSummary({
    plan: 'free',
    used: nextUsed,
    byTool: summary.byTool
  })
}

export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  return getAuthenticatedUserFromRequest()
}

export async function getAuthenticatedUserFromRequest(
  request?: Request
): Promise<AuthenticatedUser | null> {
  const bearer = request?.headers?.get('authorization') ?? request?.headers?.get('Authorization')
  const token = bearer?.toLowerCase().startsWith('bearer ')
    ? bearer.slice('bearer '.length).trim()
    : null

  if (token) {
    try {
      const admin = createAdminClient()
      const {
        data: { user },
        error
      } = await admin.auth.getUser(token)

      if (!error && user?.id) {
        return {
          id: user.id,
          email: user.email ?? null
        }
      }
    } catch {
      // Fall through to cookie/session auth.
    }
  }

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

async function ensureProfile(user: AuthenticatedUser): Promise<ProfileRow> {
  const admin = createAdminClient()
  const { data: existing, error } = await admin
    .from('profiles')
    .select('id,email,plan,free_uses_used,stripe_subscription_status')
    .eq('id', user.id)
    .maybeSingle()

  if (!error && existing) {
    return existing as ProfileRow
  }

  const { data: created, error: insertError } = await admin
    .from('profiles')
    .insert({
      id: user.id,
      email: user.email,
      plan: 'free',
      free_uses_used: 0
    })
    .select('id,email,plan,free_uses_used,stripe_subscription_status')
    .single()

  if (insertError || !created) {
    throw new Error('Unable to resolve profile for usage enforcement')
  }

  return created as ProfileRow
}

async function getByToolCounts(userId: string) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('tool_runs')
    .select('tool_name')
    .eq('user_id', userId)
    .eq('status', 'success')

  if (error || !Array.isArray(data)) {
    return {}
  }

  const counts: Record<string, number> = {}
  for (const row of data) {
    const toolName = row.tool_name
    if (!toolName || typeof toolName !== 'string') continue
    counts[toolName] = (counts[toolName] ?? 0) + 1
  }
  return counts
}

export async function getUsageSummaryForUser(
  user: AuthenticatedUser,
  overrides?: { plan?: PlanType | null; usesRemaining?: number | null }
): Promise<UsageSummary> {
  const planOverride = overrides?.plan ?? null
  if (planOverride) {
    return buildSummaryFromOverrides({
      plan: planOverride,
      usesRemaining: overrides?.usesRemaining ?? null
    })
  }

  const profile = await ensureProfile(user)
  const plan = resolveEntitledPlan({
    plan: normalizePlan(profile.plan),
    stripeSubscriptionStatus: profile.stripe_subscription_status
  })
  const used = Number.isFinite(profile.free_uses_used)
    ? Math.max(Number(profile.free_uses_used), 0)
    : 0
  const byTool = await getByToolCounts(user.id)

  return buildUsageSummary({ plan, used, byTool })
}

export async function recordToolRun(options: {
  userId: string
  toolName: string
  status: ToolRunStatus
  inputHash?: string
}) {
  const admin = createAdminClient()
  await admin.from('tool_runs').insert({
    user_id: options.userId,
    tool_name: options.toolName,
    status: options.status,
    input_hash: options.inputHash ?? null
  })
}

export function hashToolInput(payload: unknown) {
  return createHash('sha256')
    .update(JSON.stringify(payload))
    .digest('hex')
    .slice(0, 40)
}

export async function consumeUsageForSuccessfulRun(options: {
  user: AuthenticatedUser
  toolName: string
  inputHash?: string
  overrides?: { plan?: PlanType | null; usesRemaining?: number | null }
}) {
  const { user, toolName, inputHash, overrides } = options
  const planOverride = overrides?.plan ?? null
  if (planOverride) {
    const summary = buildSummaryFromOverrides({
      plan: planOverride,
      usesRemaining: overrides?.usesRemaining ?? null
    })
    if (!summary.canUse) {
      return { summary, locked: true as const }
    }
    return { summary: consumeSummaryOverride(summary), locked: false as const }
  }

  const admin = createAdminClient()
  const profile = await ensureProfile(user)
  const plan = resolveEntitledPlan({
    plan: normalizePlan(profile.plan),
    stripeSubscriptionStatus: profile.stripe_subscription_status
  })

  if (plan === 'pro' || plan === 'lifetime') {
    await recordToolRun({ userId: user.id, toolName, status: 'success', inputHash })
    const summary = await getUsageSummaryForUser(user)
    return { summary, locked: false as const }
  }

  const currentUsed = Math.max(Number(profile.free_uses_used ?? 0), 0)
  if (currentUsed >= FREE_LIFETIME_LIMIT) {
    await recordToolRun({ userId: user.id, toolName, status: 'locked', inputHash })
    const summary = await getUsageSummaryForUser(user)
    return { summary, locked: true as const }
  }

  const { data: updatedProfile } = await admin
    .from('profiles')
    .update({
      free_uses_used: currentUsed + 1
    })
    .eq('id', user.id)
    .lt('free_uses_used', FREE_LIFETIME_LIMIT)
    .select('free_uses_used')
    .maybeSingle()

  if (!updatedProfile) {
    await recordToolRun({ userId: user.id, toolName, status: 'locked', inputHash })
    const summary = await getUsageSummaryForUser(user)
    return { summary, locked: true as const }
  }

  try {
    await recordToolRun({ userId: user.id, toolName, status: 'success', inputHash })
  } catch (error) {
    await admin
      .from('profiles')
      .update({ free_uses_used: Math.max(currentUsed, 0) })
      .eq('id', user.id)
    throw error
  }

  const summary = await getUsageSummaryForUser(user)
  return { summary, locked: false as const }
}
