import { NextResponse } from 'next/server'
import { getAuthenticatedUserFromRequest } from '@/lib/server/toolUsage'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

const STAGES = new Set(['applied', 'interviewing', 'offer', 'rejected'])

function asString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ error: 'AUTH_REQUIRED' }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  const jobId = asString(body?.jobId)
  const jobTitle = asString(body?.jobTitle)
  const company = asString(body?.company)
  const stage = asString(body?.stage) || 'applied'
  const planId = asString(body?.planId) || null

  if (!jobId || !jobTitle || !STAGES.has(stage)) {
    return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 })
  }

  try {
    const admin = createAdminClient()
    const { error } = await admin.from('planner_job_outcomes').insert({
      user_id: user.id,
      plan_id: planId,
      job_id: jobId,
      job_title: jobTitle,
      company: company || 'Unknown company',
      stage,
      source: 'careerheap-planner'
    })
    if (error) {
      // Degrade gracefully when the table/env is missing (resilience guardrail).
      console.warn('planner outcome insert failed:', error.message)
      return NextResponse.json({ ok: false, persisted: false })
    }
    return NextResponse.json({ ok: true, persisted: true })
  } catch (error) {
    console.warn('planner outcome route error:', error)
    return NextResponse.json({ ok: false, persisted: false })
  }
}
