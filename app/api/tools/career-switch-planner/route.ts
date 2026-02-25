import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateCareerMapPlannerAnalysis } from '@/lib/server/careerMapPlanner'
import { resolveOccupationInput } from '@/lib/server/careerData'
import type { CareerSwitchPlannerInput } from '@/lib/planner/types'
import {
  consumeUsageForSuccessfulRun,
  getAuthenticatedUserFromRequest,
  getUsageSummaryForUser,
  hashToolInput,
  recordToolRun
} from '@/lib/server/toolUsage'

export const dynamic = 'force-dynamic'

function asString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
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
  const timelineBucket = asString(input.timelineBucket)
  const incomeTarget = asString(input.incomeTarget)

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
    location: asString(input.location) || locationFromWorkRegion(workRegion),
    timeline: asString(input.timeline) || timelineBucket,
    education: asString(input.education) || educationLevel,
    incomeTarget,
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
  return null
}

function regionFromWorkRegion(workRegion: string): 'CA' | 'US' | undefined {
  if (workRegion === 'ca' || workRegion === 'remote-ca') return 'CA'
  if (workRegion === 'us' || workRegion === 'remote-us') return 'US'
  return undefined
}

function applyFreeTierOutputLimits<T extends { roadmap: unknown[]; resumeReframe: unknown[] }>(report: T) {
  return {
    ...report,
    roadmap: report.roadmap.slice(0, 1),
    resumeReframe: []
  }
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
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json(
        { error: 'AUTH_REQUIRED', message: 'Sign in to generate a career switch plan.' },
        { status: 401 }
      )
    }
    userIdForFailure = user.id

    const payload = (await request.json()) as Partial<CareerSwitchPlannerInput>
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
    const currentRoleResolution = await resolveOccupationInput({
      input: input.currentRoleText || input.currentRole,
      region: roleRegion,
      limit: 6
    })
    const targetRoleResolution =
      input.recommendMode || !input.targetRoleText
        ? null
        : await resolveOccupationInput({
            input: input.targetRoleText,
            region: roleRegion,
            limit: 6
          })

    const resolvedCurrentRoleTitle =
      currentRoleResolution.bestMatch?.title || input.currentRole || input.currentRoleText
    const resolvedTargetRoleTitle =
      input.recommendMode
        ? ''
        : targetRoleResolution?.bestMatch?.title || input.targetRole || input.targetRoleText

    const analysis = await generateCareerMapPlannerAnalysis({
      userId: user.id,
      currentRole: resolvedCurrentRoleTitle || 'Career transition',
      targetRole: resolvedTargetRoleTitle,
      notSureMode: input.notSureMode,
      skills: input.skills,
      experienceText: input.experienceText,
      location: input.location,
      timeline: input.timeline,
      education: input.education,
      incomeTarget: input.incomeTarget
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
    const reportWithResolution = {
      ...finalReport,
      roleResolution: {
        current: {
          input: input.currentRoleText || input.currentRole,
          matched: currentRoleResolution.bestMatch ?? null,
          suggestions: currentRoleResolution.suggestions
        },
        target: input.recommendMode
          ? null
          : {
              input: input.targetRoleText || input.targetRole,
              matched: targetRoleResolution?.bestMatch ?? null,
              suggestions: targetRoleResolution?.suggestions ?? []
            }
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
