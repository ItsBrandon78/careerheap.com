import { NextResponse } from 'next/server'
import { generateCareerSwitchPlannerResult } from '@/lib/planner/generator'
import type { CareerSwitchPlannerInput } from '@/lib/planner/types'
import {
  consumeUsageForSuccessfulRun,
  getAuthenticatedUserFromRequest,
  getUsageSummaryForUser,
  hashToolInput,
  recordToolRun
} from '@/lib/server/toolUsage'

export const dynamic = 'force-dynamic'

function normalizeInput(input: Partial<CareerSwitchPlannerInput>) {
  return {
    currentRole: (input.currentRole ?? '').trim(),
    targetRole: (input.targetRole ?? '').trim(),
    notSureMode: Boolean(input.notSureMode),
    experienceText: (input.experienceText ?? '').trim(),
    location: (input.location ?? '').trim(),
    timeline: (input.timeline ?? '').trim(),
    education: (input.education ?? '').trim()
  }
}

function validateInput(input: ReturnType<typeof normalizeInput>) {
  if (!input.currentRole) {
    return 'Current role is required.'
  }
  if (!input.notSureMode && !input.targetRole) {
    return 'Target role is required unless Not sure mode is enabled.'
  }
  if (input.experienceText.length < 40) {
    return 'Experience text must be at least 40 characters.'
  }
  return null
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

    const result = generateCareerSwitchPlannerResult(input)
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

    return NextResponse.json({
      ...result,
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
