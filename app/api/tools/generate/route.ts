import { NextRequest, NextResponse } from 'next/server'
import {
  buildSummaryFromOverrides,
  consumeSummaryOverride,
  consumeUsageForSuccessfulRun,
  getAuthenticatedUserFromRequest,
  getUsageSummaryForUser,
  parsePlanOverride,
  parseUsesRemainingOverride
} from '@/lib/server/toolUsage'
import {
  generateCoverLetter,
  generateInterviewPrep,
  generateResumeAnalysis
} from '@/lib/server/toolGeneration'

export const maxDuration = 60

type GenerateBody = {
  tool?: string
  resumeText?: string
  targetRole?: string
  role?: string
  company?: string
  jobPosting?: string
  context?: string
  background?: string
}

const TOOL_SLUGS = new Set(['resume-analyzer', 'interview-prep', 'cover-letter'])

type ToolLocale = 'en' | 'fr'

function isPaidPlan(plan: string, isUnlimited: boolean) {
  return isUnlimited || plan === 'pro' || plan === 'lifetime'
}

function tx(locale: ToolLocale, en: string, fr: string) {
  return locale === 'fr' ? fr : en
}

async function runTool(tool: string, body: GenerateBody, locale: ToolLocale) {
  if (tool === 'resume-analyzer') {
    if (!body.resumeText || body.resumeText.trim().length < 30) {
      return { error: tx(locale, 'Paste at least a few lines of your résumé to analyze.', 'Collez au moins quelques lignes de votre CV à analyser.') }
    }
    return generateResumeAnalysis({ resumeText: body.resumeText, targetRole: body.targetRole, locale })
  }
  if (tool === 'interview-prep') {
    if (!body.role || !body.role.trim()) {
      return { error: tx(locale, 'Enter a target role to generate questions.', 'Entrez un rôle cible pour générer des questions.') }
    }
    return generateInterviewPrep({ role: body.role, context: body.context, locale })
  }
  if (tool === 'cover-letter') {
    if (!body.jobPosting || body.jobPosting.trim().length < 30) {
      return { error: tx(locale, 'Paste the job posting so we can tailor the letter.', "Collez l'offre d'emploi pour que nous adaptions la lettre.") }
    }
    return generateCoverLetter({
      role: body.role || '',
      company: body.company,
      jobPosting: body.jobPosting,
      background: body.background,
      locale
    })
  }
  return { error: tx(locale, 'Unknown tool.', 'Outil inconnu.') }
}

export async function POST(request: NextRequest) {
  let body: GenerateBody
  try {
    body = (await request.json()) as GenerateBody
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const tool = (body.tool || '').trim()
  if (!TOOL_SLUGS.has(tool)) {
    return NextResponse.json({ error: 'Unknown tool.' }, { status: 400 })
  }

  const locale: ToolLocale = request.cookies.get('careerheap_lang')?.value === 'fr' ? 'fr' : 'en'

  // QA plan override (?plan=pro&uses=…): generate without touching real usage.
  const planOverride = parsePlanOverride(request.nextUrl.searchParams.get('plan'))
  if (planOverride) {
    const usesOverride = parseUsesRemainingOverride(request.nextUrl.searchParams.get('uses'))
    const summary = buildSummaryFromOverrides({ plan: planOverride, usesRemaining: usesOverride })
    if (!summary.canUse) {
      return NextResponse.json(
        { error: 'LOCKED', message: 'Free usage limit reached.', usage: summary },
        { status: 402 }
      )
    }
    const outcome = await runTool(tool, body, locale)
    if ('error' in outcome) {
      return NextResponse.json({ error: outcome.error }, { status: 400 })
    }
    return NextResponse.json({
      result: outcome.result,
      source: outcome.source,
      usage: consumeSummaryOverride(summary),
      isPro: isPaidPlan(summary.plan, summary.isUnlimited)
    })
  }

  const user = await getAuthenticatedUserFromRequest(request)
  if (!user) {
    return NextResponse.json(
      { error: 'AUTH_REQUIRED', message: 'Sign in to use this tool.' },
      { status: 401 }
    )
  }

  try {
    const summary = await getUsageSummaryForUser(user)
    if (!summary.canUse) {
      return NextResponse.json(
        { error: 'LOCKED', message: 'Free usage limit reached.', usage: summary },
        { status: 402 }
      )
    }

    const outcome = await runTool(tool, body, locale)
    if ('error' in outcome) {
      return NextResponse.json({ error: outcome.error }, { status: 400 })
    }

    const { summary: nextSummary, locked } = await consumeUsageForSuccessfulRun({
      user,
      toolName: tool
    })
    if (locked) {
      return NextResponse.json(
        { error: 'LOCKED', message: 'Free usage limit reached.', usage: nextSummary },
        { status: 402 }
      )
    }

    return NextResponse.json({
      result: outcome.result,
      source: outcome.source,
      usage: nextSummary,
      isPro: isPaidPlan(nextSummary.plan, nextSummary.isUnlimited)
    })
  } catch (error) {
    console.error('Tool generation error:', error)
    return NextResponse.json({ error: 'Generation failed. Please try again.' }, { status: 500 })
  }
}
