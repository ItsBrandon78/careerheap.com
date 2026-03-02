import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  generateCareerMapPlannerAnalysis,
  type CareerPlannerAnalysis
} from '@/lib/server/careerMapPlanner'
import {
  resolveOccupation,
  ROLE_MATCH_THRESHOLD,
  type ResolvedOccupation
} from '@/lib/server/careerData'
import { consumeRateLimit, getClientIp, toRateLimitHeaders } from '@/lib/server/rateLimit'
import type { CareerSwitchPlannerInput } from '@/lib/planner/types'
import {
  consumeUsageForSuccessfulRun,
  getAuthenticatedUserFromRequest,
  getUsageSummaryForUser,
  hashToolInput,
  recordToolRun
} from '@/lib/server/toolUsage'
import { buildTransitionModeReport } from '@/lib/server/transitionMode'

export const dynamic = 'force-dynamic'

function asString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function asNullableString(value: unknown) {
  const normalized = asString(value)
  return normalized || null
}

function asStringArray(value: unknown) {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)
}

function locationFromWorkRegion(workRegion: string) {
  if (workRegion === 'ca' || workRegion === 'remote-ca') return 'Canada'
  if (workRegion === 'remote-us') return 'Remote (US)'
  if (workRegion === 'either') return 'Open to either (US/CA)'
  return 'United States'
}

function normalizeInput(input: Partial<CareerSwitchPlannerInput> & Record<string, unknown>) {
  const currentRoleText = asString(input.currentRoleText)
  const targetRoleText = asString(input.targetRoleText)
  const recommendMode = Boolean(
    typeof input.recommendMode === 'boolean' ? input.recommendMode : input.notSureMode
  )
  const skills = asStringArray(input.skills)
  const experienceText = asString(input.experienceText)
  const educationLevel = asString(input.educationLevel)
  const workRegion = asString(input.workRegion)
  const locationText = asString(input.locationText)
  const timelineBucket = asString(input.timelineBucket)
  const incomeTarget = asString(input.incomeTarget)
  const userPostingText = asString(input.userPostingText)
  const useMarketEvidence =
    typeof input.useMarketEvidence === 'boolean' ? input.useMarketEvidence : true

  const currentRole = currentRoleText || asString(input.currentRole)
  const targetRole = recommendMode ? '' : targetRoleText || asString(input.targetRole)
  const normalizedExperience = [experienceText, skills.length > 0 ? `Skills: ${skills.join(', ')}` : '']
    .filter(Boolean)
    .join('\n')

  return {
    currentRole,
    targetRole,
    notSureMode: recommendMode,
    experienceText: normalizedExperience,
    location: locationText || asString(input.location) || locationFromWorkRegion(workRegion),
    locationText,
    timeline: asString(input.timeline) || timelineBucket,
    education: asString(input.education) || educationLevel,
    incomeTarget,
    userPostingText,
    useMarketEvidence,
    currentRoleOccupationId: asNullableString(input.currentRoleOccupationId),
    targetRoleOccupationId: recommendMode ? null : asNullableString(input.targetRoleOccupationId),
    currentRoleText,
    targetRoleText: recommendMode ? '' : targetRoleText,
    recommendMode,
    skills,
    educationLevel,
    workRegion,
    timelineBucket
  }
}

function validateInput(input: ReturnType<typeof normalizeInput>) {
  if (!input.currentRole && !input.experienceText && input.skills.length < 3) {
    return 'Add a current role, experience summary, or at least 3 skills.'
  }
  if (!input.recommendMode && !input.targetRole) {
    return 'Target role is required unless Not sure mode is enabled.'
  }
  if (!input.location) {
    return 'Location is required to generate employer-evidence requirements.'
  }
  return null
}

function regionFromWorkRegion(workRegion: string): 'CA' | 'US' | undefined {
  if (workRegion === 'ca' || workRegion === 'remote-ca') return 'CA'
  if (workRegion === 'us' || workRegion === 'remote-us') return 'US'
  return undefined
}

function buildRoleResolutionPayload(inputValue: string, resolution: ResolvedOccupation) {
  return {
    input: inputValue,
    matched:
      resolution.resolved && resolution.occupationId && resolution.region
        ? {
            occupationId: resolution.occupationId,
            title: resolution.title,
            region: resolution.region,
            source: resolution.source,
            lastUpdated: resolution.lastUpdated ?? null,
            confidence: resolution.confidence,
            matchedBy: resolution.matchedBy
          }
        : null,
    suggestions: resolution.alternatives.map((item) => ({
      occupationId: item.occupationId,
      title: item.title,
      region: item.region,
      source: item.source,
      lastUpdated: item.lastUpdated,
      confidence: item.confidence,
      matchedBy: item.matchedBy
    }))
  }
}

function buildRoleSelectionPayload(
  role: 'current' | 'target',
  inputValue: string,
  resolution: ResolvedOccupation
) {
  return {
    error: 'ROLE_SELECTION_REQUIRED',
    role,
    input: inputValue,
    message: `Choose the closest ${role} role match before generating your transition plan.`,
    threshold: ROLE_MATCH_THRESHOLD,
    alternatives: resolution.alternatives.map((item) => ({
      occupationId: item.occupationId,
      title: item.title,
      confidence: item.confidence,
      source: item.source,
      stage: resolution.stage ?? null
    }))
  }
}

function applyFreeTierOutputLimits(report: CareerPlannerAnalysis['report']) {
  const limitedReport: CareerPlannerAnalysis['report'] = {
    ...report,
    roadmap: report.roadmap.slice(0, 1),
    resumeReframe: []
  }

  const strategy = report.executionStrategy
  const monthPlan = strategy.plan90Day

  const firstLinkedFromMonth = (month: typeof monthPlan.month2) => {
    const firstAction = month.actions[0]
    const linked = Array.isArray(firstAction?.linkedRequirements)
      ? (firstAction.linkedRequirements as string[])
      : []
    return linked.length > 0 ? linked.slice(0, 2) : []
  }

  const condensedMonth = (
    month: typeof monthPlan.month2,
    monthId: 'month2' | 'month3'
  ) => ({
    ...month,
    actions: [
      {
        id: `${monthId}-free-summary`,
        task: 'Upgrade to Pro to unlock the full weekly action sequence for this month.',
        volumeTarget: 'Locked on Free plan',
        learningTarget: 'Full sequencing available on Pro',
        proofTarget: 'Full proof checklist available on Pro',
        weeklyTime: month.weeklyTimeInvestment,
        linkedRequirements: firstLinkedFromMonth(month)
      }
    ]
  })

  limitedReport.executionStrategy = {
    ...strategy,
    plan90Day: {
      ...monthPlan,
      month1: monthPlan.month1,
      month2: condensedMonth(monthPlan.month2, 'month2'),
      month3: condensedMonth(monthPlan.month3, 'month3')
    }
  }

  return limitedReport
}

async function persistReport(userId: string, payload: {
  input: ReturnType<typeof normalizeInput>
  score: number
  scoringSnapshot: unknown
  report: unknown
}) {
  const admin = createAdminClient()

  try {
    await admin.from('reports').insert({
      user_id: userId,
      input_snapshot: payload.input,
      scoring_snapshot: payload.scoringSnapshot,
      generated_report: payload.report
    })
  } catch {
    // ignore if table is unavailable in older schema
  }

  try {
    await admin.from('career_map_reports').insert({
      user_id: userId,
      current_role: payload.input.currentRole || 'Career transition',
      target_role: payload.input.targetRole || null,
      input_payload: payload.input,
      normalized_input: payload.input,
      output_payload: payload.report,
      score: payload.score
    })
  } catch {
    // ignore if table is unavailable in older schema
  }
}

export async function POST(request: Request) {
  let userIdForFailure: string | null = null
  let inputHashForFailure: string | undefined

  try {
    const rateLimit = consumeRateLimit({
      namespace: 'planner-generate',
      identifier: getClientIp(request),
      max: 12,
      windowMs: 60_000
    })

    if (!rateLimit.allowed) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((rateLimit.resetAt - Date.now()) / 1_000)
      )
      return NextResponse.json(
        {
          error: 'RATE_LIMITED',
          message: 'Too many planner requests. Try again in about a minute.'
        },
        {
          status: 429,
          headers: {
            ...toRateLimitHeaders(rateLimit),
            'Retry-After': String(retryAfterSeconds)
          }
        }
      )
    }

    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json(
        { error: 'AUTH_REQUIRED', message: 'Sign in to generate a career switch plan.' },
        { status: 401 }
      )
    }
    userIdForFailure = user.id

    const payload = (await request.json()) as Partial<CareerSwitchPlannerInput> & Record<string, unknown>
    const input = normalizeInput(payload)
    inputHashForFailure = hashToolInput(input)
    const validationError = validateInput(input)

    if (validationError) {
      await recordToolRun({
        userId: user.id,
        toolName: 'career-switch-planner',
        status: 'failed',
        inputHash: inputHashForFailure
      })
      return NextResponse.json({ error: 'INVALID_INPUT', message: validationError }, { status: 400 })
    }

    const usageBefore = await getUsageSummaryForUser(user)
    if (!usageBefore.canUse) {
      await recordToolRun({
        userId: user.id,
        toolName: 'career-switch-planner',
        status: 'locked',
        inputHash: inputHashForFailure
      })
      return NextResponse.json(
        {
          error: 'LOCKED',
          message: 'You have reached the free usage limit. Upgrade for unlimited access.',
          usage: usageBefore
        },
        { status: 402 }
      )
    }

    const roleRegion = regionFromWorkRegion(input.workRegion)
    const currentRoleInput = input.currentRoleText || input.currentRole
    const targetRoleInput = input.targetRoleText || input.targetRole
    const currentRoleResolution = await resolveOccupation({
      input: currentRoleInput,
      region: roleRegion,
      limit: 6,
      occupationId: input.currentRoleOccupationId
    })
    const targetRoleResolution =
      input.recommendMode || !input.targetRoleText
        ? null
        : await resolveOccupation({
            input: input.targetRoleText,
            region: roleRegion,
            limit: 6,
            occupationId: input.targetRoleOccupationId
          })

    if (
      currentRoleInput &&
      !input.currentRoleOccupationId &&
      (!currentRoleResolution.resolved || currentRoleResolution.confidence < ROLE_MATCH_THRESHOLD) &&
      currentRoleResolution.alternatives.length > 0
    ) {
      return NextResponse.json(
        buildRoleSelectionPayload('current', currentRoleInput, currentRoleResolution),
        { status: 409 }
      )
    }

    if (
      !input.recommendMode &&
      targetRoleInput &&
      !input.targetRoleOccupationId &&
      targetRoleResolution &&
      (!targetRoleResolution.resolved || targetRoleResolution.confidence < ROLE_MATCH_THRESHOLD) &&
      targetRoleResolution.alternatives.length > 0
    ) {
      return NextResponse.json(
        buildRoleSelectionPayload('target', targetRoleInput, targetRoleResolution),
        { status: 409 }
      )
    }

    const resolvedCurrentRoleTitle =
      currentRoleResolution.title || input.currentRole || input.currentRoleText
    const resolvedTargetRoleTitle =
      input.recommendMode
        ? ''
        : targetRoleResolution?.title || input.targetRole || input.targetRoleText

    const analysis = await generateCareerMapPlannerAnalysis({
      userId: user.id,
      currentRole: resolvedCurrentRoleTitle || 'Career transition',
      targetRole: resolvedTargetRoleTitle,
      currentOccupationId: currentRoleResolution.occupationId,
      targetOccupationId: targetRoleResolution?.occupationId ?? null,
      notSureMode: input.notSureMode,
      skills: input.skills,
      experienceText: input.experienceText,
      location: input.location,
      timeline: input.timeline,
      education: input.education,
      incomeTarget: input.incomeTarget,
      userPostingText: input.userPostingText,
      useMarketEvidence: input.useMarketEvidence
    })

    const { summary, locked } = await consumeUsageForSuccessfulRun({
      user,
      toolName: 'career-switch-planner',
      inputHash: inputHashForFailure
    })

    if (locked) {
      return NextResponse.json(
        {
          error: 'LOCKED',
          message: 'You have reached the free usage limit. Upgrade for unlimited access.',
          usage: summary
        },
        { status: 402 }
      )
    }

    const finalReport = summary.plan === 'free'
      ? applyFreeTierOutputLimits(analysis.report)
      : analysis.report
    const transitionMode = buildTransitionModeReport({
      currentRole: resolvedCurrentRoleTitle || input.currentRole || input.currentRoleText,
      targetRole: resolvedTargetRoleTitle || input.targetRole || input.targetRoleText,
      experienceText: input.experienceText,
      location: input.location,
      education: input.education || input.educationLevel,
      incomeTarget: input.incomeTarget,
      report: finalReport
    })
    const reportWithResolution = {
      ...finalReport,
      transitionMode,
      roleResolution: {
        current: buildRoleResolutionPayload(currentRoleInput, currentRoleResolution),
        target: input.recommendMode
          ? null
          : buildRoleResolutionPayload(targetRoleInput, targetRoleResolution!)
      }
    }
    const finalLegacy = summary.plan === 'free'
      ? {
          ...analysis.legacy,
          roadmap: {
            '30': analysis.legacy.roadmap['30'].slice(0, 1),
            '60': [],
            '90': []
          },
          resumeReframes: []
        }
      : analysis.legacy

    await persistReport(user.id, {
      input,
      score: reportWithResolution.compatibilitySnapshot.score,
      scoringSnapshot: analysis.scoringSnapshot,
      report: reportWithResolution
    })

    return NextResponse.json({
      ...finalLegacy,
      report: reportWithResolution,
      scoring: analysis.scoringSnapshot,
      usage: summary
    })
  } catch (error) {
    console.error('Career switch planner generation error:', error)
    if (userIdForFailure && inputHashForFailure) {
      await recordToolRun({
        userId: userIdForFailure,
        toolName: 'career-switch-planner',
        status: 'failed',
        inputHash: inputHashForFailure
      }).catch(() => null)
    }
    return NextResponse.json(
      { error: 'GENERATION_FAILED', message: 'Unable to generate a plan right now.' },
      { status: 500 }
    )
  }
}
