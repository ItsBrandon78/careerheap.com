import { NextResponse } from 'next/server'
import { getAuthenticatedUserFromRequest, getUsageSummaryForUser } from '@/lib/server/toolUsage'
import { generateCoverLetter, generateResumeAnalysis } from '@/lib/server/toolGeneration'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

function asString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ error: 'AUTH_REQUIRED' }, { status: 401 })
  }

  const summary = await getUsageSummaryForUser(user)
  const isPaid = summary.isUnlimited || summary.plan === 'pro' || summary.plan === 'lifetime'
  if (!isPaid) {
    return NextResponse.json(
      { error: 'LOCKED', message: 'Tailored documents are a Pro feature.' },
      { status: 402 }
    )
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  const kind = asString(body?.kind)
  const role = asString(body?.role)
  const company = asString(body?.company)
  const jobPosting = asString(body?.jobPosting)
  const resumeText = asString(body?.resumeText)

  try {
    if (kind === 'cover-letter') {
      if (jobPosting.length < 30) {
        return NextResponse.json(
          { error: 'Add the job description so we can tailor the letter.' },
          { status: 400 }
        )
      }
      const outcome = await generateCoverLetter({
        role,
        company,
        jobPosting,
        background: resumeText,
        locale: 'en'
      })
      if ('error' in outcome) return NextResponse.json({ error: outcome.error }, { status: 400 })
      return NextResponse.json({ result: outcome.result, source: outcome.source })
    }

    if (kind === 'resume-guidance') {
      if (resumeText.length < 30) {
        return NextResponse.json(
          { error: 'Add your resume text to get tailoring guidance.' },
          { status: 400 }
        )
      }
      const outcome = await generateResumeAnalysis({ resumeText, targetRole: role, locale: 'en' })
      if ('error' in outcome) return NextResponse.json({ error: outcome.error }, { status: 400 })
      return NextResponse.json({ result: outcome.result, source: outcome.source })
    }

    return NextResponse.json({ error: 'Unknown tailoring kind.' }, { status: 400 })
  } catch (error) {
    console.error('planner tailor route error:', error)
    return NextResponse.json({ error: 'Generation failed. Please try again.' }, { status: 500 })
  }
}
