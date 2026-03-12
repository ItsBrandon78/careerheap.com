import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  getAuthenticatedUserFromRequest,
  getUsageSummaryForUser
} from '@/lib/server/toolUsage'
import { persistPlannerProgressEvent } from '@/lib/server/plannerLearning'

type PlannerLoopProgressPayload = {
  checkedTaskIds?: Record<string, boolean>
  expandedPhaseIds?: string[]
  completedTrainingIds?: Record<string, boolean>
  outreachTracker?: {
    sent?: string
    replies?: string
    positiveReplies?: string
    nextFollowUpDate?: string
  }
  updatedAt?: string
}

function normalizeProgressPayload(value: unknown): PlannerLoopProgressPayload {
  const raw = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  const checkedTaskIds =
    raw.checkedTaskIds && typeof raw.checkedTaskIds === 'object'
      ? Object.fromEntries(
          Object.entries(raw.checkedTaskIds as Record<string, unknown>).map(([key, checked]) => [
            key,
            Boolean(checked)
          ])
        )
      : {}
  const expandedPhaseIds = Array.isArray(raw.expandedPhaseIds)
    ? raw.expandedPhaseIds.filter((item): item is string => typeof item === 'string')
    : []
  const completedTrainingIds =
    raw.completedTrainingIds && typeof raw.completedTrainingIds === 'object'
      ? Object.fromEntries(
          Object.entries(raw.completedTrainingIds as Record<string, unknown>).map(([key, checked]) => [
            key,
            Boolean(checked)
          ])
        )
      : {}
  const outreachTracker =
    raw.outreachTracker && typeof raw.outreachTracker === 'object'
      ? (raw.outreachTracker as Record<string, unknown>)
      : {}

  return {
    checkedTaskIds,
    expandedPhaseIds,
    completedTrainingIds,
    outreachTracker: {
      sent: typeof outreachTracker.sent === 'string' ? outreachTracker.sent : '',
      replies: typeof outreachTracker.replies === 'string' ? outreachTracker.replies : '',
      positiveReplies:
        typeof outreachTracker.positiveReplies === 'string' ? outreachTracker.positiveReplies : '',
      nextFollowUpDate:
        typeof outreachTracker.nextFollowUpDate === 'string' ? outreachTracker.nextFollowUpDate : ''
    },
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : new Date().toISOString()
  }
}

async function requirePaidAuthenticatedUser(request: NextRequest | Request) {
  const user = await getAuthenticatedUserFromRequest(request)
  if (!user) {
    return { error: NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 }), user: null }
  }
  const usage = await getUsageSummaryForUser(user)
  if (!(usage.plan === 'pro' || usage.plan === 'lifetime')) {
    return { error: NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 }), user: null }
  }
  return { error: null, user }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePaidAuthenticatedUser(request)
    if (auth.error) return auth.error

    const reportId = request.nextUrl.searchParams.get('reportId')?.trim()
    if (!reportId) {
      return NextResponse.json({ error: 'REPORT_ID_REQUIRED' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('career_map_report_progress')
      .select('progress_state, updated_at')
      .eq('report_id', reportId)
      .eq('user_id', auth.user.id)
      .maybeSingle()

    if (error) {
      throw error
    }

    return NextResponse.json({
      progress: data?.progress_state ?? null,
      updatedAt: data?.updated_at ?? null
    })
  } catch (error) {
    console.error('Planner progress GET error:', error)
    return NextResponse.json({ error: 'FAILED_TO_LOAD_PROGRESS' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePaidAuthenticatedUser(request)
    if (auth.error) return auth.error

    const payload = (await request.json()) as {
      reportId?: string
      progress?: PlannerLoopProgressPayload
    }
    const reportId = typeof payload.reportId === 'string' ? payload.reportId.trim() : ''
    if (!reportId) {
      return NextResponse.json({ error: 'REPORT_ID_REQUIRED' }, { status: 400 })
    }

    const progress = normalizeProgressPayload(payload.progress)
    const admin = createAdminClient()
    const { error } = await admin.from('career_map_report_progress').upsert(
      {
        report_id: reportId,
        user_id: auth.user.id,
        progress_state: progress,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'report_id' }
    )

    if (error) {
      throw error
    }

    await persistPlannerProgressEvent({
      reportId,
      userId: auth.user.id,
      progress
    }).catch((eventError) => {
      console.warn('[career-switch-planner] progress_event_failed', {
        reportId,
        message: eventError instanceof Error ? eventError.message : String(eventError)
      })
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Planner progress POST error:', error)
    return NextResponse.json({ error: 'FAILED_TO_SAVE_PROGRESS' }, { status: 500 })
  }
}
