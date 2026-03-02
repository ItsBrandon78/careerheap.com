import { z } from 'zod'

const PROOF_BUILDER_DEFINITION =
  'Proof Builder = a small hands-on project + photo + 3 bullets describing what you did.'

const TransitionRouteSchema = z.object({
  title: z.string().min(1),
  reason: z.string().min(1),
  firstStep: z.string().min(1)
}).strict()

const TransitionPlanPhaseSchema = z.object({
  phase: z.string().min(1),
  weeks: z.string().min(1),
  tasks: z.array(z.string().min(1)).min(1),
  weeklyTargets: z.array(z.string().min(1)).min(1),
  timePerWeekHours: z.number().int().min(1).max(60)
}).strict()

const TransitionEarningStageSchema = z.object({
  stage: z.string().min(1),
  rangeLow: z.number().int().nonnegative(),
  rangeHigh: z.number().int().nonnegative(),
  unit: z.string().min(1)
}).strict()

const TransitionResourceSchema = z.object({
  label: z.string().min(1),
  url: z.string()
}).strict()

export const TransitionModeSchema = z.object({
  difficulty: z.object({
    score: z.number().min(0).max(10),
    label: z.enum(['Easy', 'Moderate', 'Hard', 'Very Hard']),
    why: z.array(z.string().min(1)).min(1)
  }).strict(),
  timeline: z.object({
    minMonths: z.number().int().min(1).max(60),
    maxMonths: z.number().int().min(1).max(60),
    assumptions: z.array(z.string().min(1)).min(1)
  }).strict(),
  routes: z.object({
    primary: TransitionRouteSchema,
    secondary: TransitionRouteSchema,
    contingency: TransitionRouteSchema
  }).strict(),
  plan90: z.array(TransitionPlanPhaseSchema).length(3),
  execution: z.object({
    dailyRoutine: z.array(z.string().min(1)).min(1),
    weeklyCadence: z.array(z.string().min(1)).min(1),
    outreachTemplates: z.object({
      call: z.string().min(1),
      email: z.string().min(1)
    }).strict()
  }).strict(),
  gaps: z.object({
    strengths: z.array(z.string().min(1)).min(1),
    missing: z.array(z.string().min(1)).min(1),
    first3Steps: z.array(z.string().min(1)).length(3)
  }).strict(),
  earnings: z.array(TransitionEarningStageSchema).length(4),
  reality: z.object({
    barriers: z.array(z.string().min(1)).length(3),
    mitigations: z.array(z.string().min(1)).length(3)
  }).strict(),
  resources: z.object({
    local: z.array(TransitionResourceSchema),
    online: z.array(TransitionResourceSchema),
    internal: z.array(TransitionResourceSchema).length(3)
  }).strict()
}).strict()

export type TransitionModeReport = z.infer<typeof TransitionModeSchema>

type PlannerReportSource = {
  compatibilitySnapshot: { score: number; topReasons: string[] }
  suggestedCareers: Array<{
    title: string
    score: number
    transitionTime: string
    regulated: boolean
    topReasons: string[]
    officialLinks?: Array<{ label: string; url: string }>
    salary: {
      native: {
        currency: 'USD' | 'CAD'
        low: number | null
        median: number | null
        high: number | null
        sourceName?: string
        asOfDate?: string
        region?: string
      } | null
      usd: { low: number | null; median: number | null; high: number | null } | null
      conversion?: { rate: number; asOfDate: string; source?: string } | null
    }
  }>
  executionStrategy?: {
    whereYouStandNow: {
      strengths: Array<{ summary: string }>
      missingMandatoryRequirements: Array<{ label: string; reason: string }>
      competitiveDisadvantages: Array<{ label: string; reason: string }>
    }
    realBlockers: {
      requiredToApply: Array<{ label: string; whyItMatters: string; howToClose: string; timeEstimate: string }>
      requiredToCompete: Array<{ label: string; whyItMatters: string; howToClose: string; timeEstimate: string }>
    }
    plan90Day: { month1: MonthPlanSource; month2: MonthPlanSource; month3: MonthPlanSource }
  }
  targetRequirements?: {
    education: string | null
    certifications: string[]
    hardGates: string[]
    employerSignals: string[]
    apprenticeshipHours: number | null
    examRequired: boolean | null
    regulated: boolean
    sources: Array<{ label: string; url: string }>
  }
  transitionReport?: { marketSnapshot: { role: string; location: string }; transferableStrengths: Array<{ strength: string }> }
  linksResources?: Array<{ label: string; url: string; type: 'official' | 'curated' }>
  marketEvidence?: { baselineOnly: boolean; postingsCount: number; query: { location: string } | null }
  bottleneck?: { title: string; why: string; nextAction: string; estimatedEffort: string } | null
}

type MonthPlanSource = {
  label: string
  weeklyTimeInvestment: string
  actions: Array<{ task: string; volumeTarget: string; proofTarget: string; weeklyTime: string }>
}

type TransitionTrack = 'electrician' | 'general'
type TransitionContext = {
  currentRole: string
  targetRole: string
  experienceText: string
  location: string
  education: string
  incomeTarget: string
  report: PlannerReportSource
}
type TradeCluster = { signals: string[]; quickWin: string; gap: string }

const ELECTRICIAN_TRADE_CLUSTERS: TradeCluster[] = [
  {
    signals: ['safety', 'sop', 'reliability'],
    quickWin: 'You already work in a hazard-aware environment, so checklist discipline and test-before-touch habits are trainable, not foreign.',
    gap: 'Learn electrical safety first: lockout/tagout, test-before-touch, and basic energized-work boundaries.'
  },
  {
    signals: ['pace', 'reliability', 'stamina'],
    quickWin: 'You are used to working fast with your hands under pressure, which translates well to careful tool handling and repetitive setup work.',
    gap: 'Get hands-on with core electrician tools: wire strippers, a multimeter, drills, ladders, and clean material handling.'
  },
  {
    signals: ['sop', 'leadership'],
    quickWin: 'Following prep sequences and station standards maps well to reading layouts, measurements, and install steps.',
    gap: 'Practice reading basic blueprints, panel schedules, device layouts, and measurement marks before interviews.'
  },
  {
    signals: ['stamina', 'pace', 'shift_work', 'teamwork'],
    quickWin: 'Long shifts, standing for hours, and moving fast in a team are already part of your baseline, which is real leverage for apprentice work.',
    gap: 'Adjust to ladders, weather, early starts, and carrying material without losing pace or attention to detail.'
  }
]

export function buildTransitionModeReport(input: {
  currentRole: string
  targetRole: string
  experienceText?: string
  location?: string
  education?: string
  incomeTarget?: string
  report: PlannerReportSource
}): TransitionModeReport {
  const context: TransitionContext = {
    currentRole: input.currentRole,
    targetRole: input.targetRole,
    experienceText: input.experienceText ?? '',
    location: input.location ?? '',
    education: input.education ?? '',
    incomeTarget: input.incomeTarget ?? '',
    report: input.report
  }
  const applyBlockers = context.report.executionStrategy?.realBlockers.requiredToApply ?? []
  const competeBlockers = context.report.executionStrategy?.realBlockers.requiredToCompete ?? []
  const track = detectTrack(context)
  const strengths = collectStrengths(context)
  const missing = collectMissingItems(context)
  const first3Steps = buildFirstThreeSteps(context, missing)
  const difficulty = buildDifficulty({
    compatibilityScore: context.report.compatibilitySnapshot.score,
    applyBlockerCount: applyBlockers.length,
    competeBlockerCount: competeBlockers.length,
    report: context.report,
    education: context.education,
    track
  })
  const timeline = buildTimeline({
    report: context.report,
    difficultyScore: difficulty.score,
    track,
    targetRole: context.targetRole
  })

  return TransitionModeSchema.parse({
    difficulty,
    timeline,
    routes: buildRoutes({
      currentRole: context.currentRole,
      targetRole: context.targetRole,
      report: context.report,
      first3Steps,
      track
    }),
    plan90: buildPlanPhases(context, first3Steps),
    execution: buildExecution({
      currentRole: context.currentRole,
      targetRole: context.targetRole,
      report: context.report,
      track
    }),
    gaps: {
      strengths: fillToLength(strengths, 3, `Your ${context.currentRole || 'current'} background already gives you usable leverage.`).slice(0, 4),
      missing: fillToLength(missing, 3, `You still need visible proof for ${context.targetRole || 'the target role'}.`).slice(0, 4),
      first3Steps
    },
    earnings: buildEarnings(context),
    reality: buildReality({ report: context.report, missingItems: missing, track }),
    resources: buildResources(context)
  })
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
}

function normalizeBulletKey(value: string) {
  return normalizeText(value).replace(/\b(a|an|the)\b/g, '').replace(/\s+/g, ' ').trim()
}

export function dedupeBullets(values: string[], max = 4) {
  const seen: string[] = []
  const output: string[] = []
  for (const value of values) {
    const trimmed = value.trim()
    if (!trimmed) continue
    const key = normalizeBulletKey(trimmed)
    if (!key) continue
    if (seen.some((item) => item === key || item.includes(key) || key.includes(item))) continue
    seen.push(key)
    output.push(trimmed)
    if (output.length >= max) break
  }
  return output
}

function fillToLength(values: string[], target: number, fallback: string) {
  const output = [...values]
  while (output.length < target) output.push(fallback)
  return output
}

function averageHours(value: string) {
  const matches = [...value.matchAll(/(\d+)/g)].map((match) => Number.parseInt(match[1], 10))
  if (matches.length === 0) return 8
  const average = matches.reduce((sum, item) => sum + item, 0) / matches.length
  return clamp(Math.round(average), 1, 40)
}

function parseTimelineRange(value: string) {
  const matches = [...value.matchAll(/(\d+)/g)].map((match) => Number.parseInt(match[1], 10))
  if (matches.length === 0) return null
  if (matches.length === 1) {
    const exact = clamp(matches[0], 1, 36)
    return { min: exact, max: exact }
  }
  const min = clamp(Math.min(...matches), 1, 36)
  const max = clamp(Math.max(...matches), min, 36)
  return { min, max }
}

function detectTrack(input: Pick<TransitionContext, 'targetRole' | 'report'>): TransitionTrack {
  const candidate = input.report.suggestedCareers[0]?.title || input.targetRole || input.report.transitionReport?.marketSnapshot.role || ''
  return /\belectricians?\b/.test(normalizeText(candidate)) ? 'electrician' : 'general'
}

function inferStage(targetRole: string) {
  const normalized = normalizeText(targetRole)
  if (/\bhelper\b/.test(normalized)) return 'helper'
  if (/\bapprentice\b/.test(normalized)) return 'apprentice'
  if (/\blicensed\b|\bjourneyman\b|\bjourneyperson\b/.test(normalized)) return 'licensed'
  return null
}

function looksLikeOntario(location: string) {
  return /\bontario\b|\btoronto\b|\bottawa\b|\bhamilton\b|\bmississauga\b/.test(normalizeText(location))
}

function looksLikeCanada(location: string, report: PlannerReportSource) {
  return looksLikeOntario(location) || /\bcanada\b/.test(normalizeText(location)) || report.suggestedCareers[0]?.salary.native?.currency === 'CAD'
}

function inferBackgroundSignals(context: TransitionContext) {
  const text = normalizeText([
    context.currentRole,
    context.experienceText,
    ...(context.report.executionStrategy?.whereYouStandNow.strengths ?? []).map((item) => item.summary),
    ...(context.report.transitionReport?.transferableStrengths ?? []).map((item) => item.strength)
  ].join(' '))
  const signals = new Set<string>()
  if (/\bchef\b|\bcook\b|\bkitchen\b|\bsous chef\b/.test(text)) ['pace', 'stamina', 'teamwork', 'shift_work', 'sop', 'reliability'].forEach((item) => signals.add(item))
  if (/\blead\b|\bmanage\b|\btrain\b|\bsupervis/.test(text)) signals.add('leadership')
  if (/\bsafety\b|\bsafe\b|\bosha\b|\bwhmis\b/.test(text)) signals.add('safety')
  if (/\bchecklist\b|\bstandard\b|\bsop\b|\bprocedure\b|\bprotocol\b/.test(text)) signals.add('sop')
  if (/\bteam\b|\bcrew\b|\bservice\b/.test(text)) signals.add('teamwork')
  if (/\bshift\b|\bovernight\b|\bweekend\b|\bearly\b/.test(text)) signals.add('shift_work')
  if (/\bfast\b|\bhigh volume\b|\bbusy\b/.test(text)) signals.add('pace')
  if (/\blift\b|\bstand\b|\bphysical\b|\bmanual\b/.test(text)) signals.add('stamina')
  if (/\breliable\b|\bdependable\b|\battendance\b/.test(text)) signals.add('reliability')
  return signals
}

function collectStrengths(context: TransitionContext) {
  if (detectTrack(context) === 'electrician') {
    const signals = inferBackgroundSignals(context)
    const clusterWins = dedupeBullets(
      ELECTRICIAN_TRADE_CLUSTERS
        .filter((cluster) => cluster.signals.some((signal) => signals.has(signal)))
        .map((cluster) => cluster.quickWin),
      4
    )
    return fillToLength(clusterWins, 3, 'Reliable weekly effort and fast-shift discipline are real leverage for helper or apprentice entry.').slice(0, 4)
  }

  return dedupeBullets([
    ...(context.report.executionStrategy?.whereYouStandNow.strengths ?? []).map((item) => item.summary),
    ...(context.report.transitionReport?.transferableStrengths ?? []).map((item) => `Transferable strength: ${item.strength}`),
    ...context.report.compatibilitySnapshot.topReasons
  ], 4)
}

function collectMissingItems(context: TransitionContext) {
  if (detectTrack(context) === 'electrician') {
    const stage = inferStage(context.targetRole)
    const canada = looksLikeCanada(context.location, context.report)
    return dedupeBullets([
      'Build electrical theory basics: voltage, current, resistance, circuits, and Ohm\'s law.',
      'Practice with core tools and test gear: wire strippers, multimeter, drills, ladders, and clean cable handling.',
      'Learn to read simple blueprints, schematics, and measurements before interviews.',
      `Pathway step: secure a contractor or sponsor, register the ${stage === 'helper' ? 'helper' : 'apprentice'} pathway, and understand how hours are logged toward licensing.`,
      canada
        ? 'Common in many Canadian job sites: WHMIS, Working at Heights, and First Aid/CPR. Specific requirements vary by province and employer.'
        : 'Often required by employers: OSHA-style safety orientation or First Aid/CPR. Exact requirements vary by state and employer.',
      'Expect some classroom or trade-school instruction plus hours-on-site before you reach licensed pay.'
    ], 4)
  }

  return dedupeBullets([
    ...(context.report.executionStrategy?.whereYouStandNow.missingMandatoryRequirements ?? []).map((item) => `${item.label}: ${item.reason}`),
    ...(context.report.executionStrategy?.whereYouStandNow.competitiveDisadvantages ?? []).map((item) => `${item.label}: ${item.reason}`),
    ...(context.report.targetRequirements?.hardGates ?? []).map((item) => `Apply gate: ${item}`)
  ], 4)
}

function buildDifficulty(input: {
  compatibilityScore: number
  applyBlockerCount: number
  competeBlockerCount: number
  report: PlannerReportSource
  education?: string
  track: TransitionTrack
}) {
  const licensingBarrier = Math.min(3, input.report.targetRequirements?.certifications.length ?? 0) * 0.8 + (input.report.targetRequirements?.regulated ? 1.1 : 0) + (input.report.targetRequirements?.examRequired ? 0.8 : 0)
  const targetEducation = input.report.targetRequirements?.education ?? ''
  const degreeSignal = /\b(bachelor|master|doctor|associate|degree)\b/i
  const educationBarrier = degreeSignal.test(targetEducation) && !degreeSignal.test(input.education ?? '') ? 1.7 : targetEducation ? 0.6 : 0
  const experienceBarrier = Math.min(3.4, input.applyBlockerCount * 1.05 + input.competeBlockerCount * 0.4)
  const marketFriction = input.report.marketEvidence?.baselineOnly ? 1.2 : (input.report.marketEvidence?.postingsCount ?? 0) < 5 ? 0.8 : 0.35
  const transferabilityPenalty = input.track === 'electrician' ? clamp((68 - input.compatibilityScore) / 18, 0.2, 2.8) : clamp((72 - input.compatibilityScore) / 16, 0, 2.8)
  const score = Number(clamp(Math.round((1.15 + licensingBarrier + educationBarrier + experienceBarrier + marketFriction + transferabilityPenalty) * 10) / 10, 0.8, 9.8).toFixed(1))
  const label: TransitionModeReport['difficulty']['label'] = score >= 7.6 ? 'Very Hard' : score >= 5.9 ? 'Hard' : score >= 3.6 ? 'Moderate' : 'Easy'
  const why = dedupeBullets([
    input.applyBlockerCount > 0 ? `${input.applyBlockerCount} immediate apply blocker${input.applyBlockerCount === 1 ? '' : 's'} need attention before broad outreach scales.` : 'You can start outreach now while you close the first proof gaps in parallel.',
    licensingBarrier > 1 ? 'Licensing, registration, or apprenticeship steps add real friction to the path.' : 'There is no heavy licensing wall blocking the first move.',
    input.track === 'electrician' ? 'Transferable work ethic is real, but the trade still expects theory, tools, and pathway knowledge to show up fast.' : 'Your transferability is usable, but employer proof still matters more than intent.'
  ], 3)
  return { score, label, why }
}

function buildTimeline(input: { report: PlannerReportSource; difficultyScore: number; track: TransitionTrack; targetRole: string }) {
  const primaryCareer = input.report.suggestedCareers[0] ?? null
  const fromCareer = primaryCareer ? parseTimelineRange(primaryCareer.transitionTime) : null
  const applyBlockers = input.report.executionStrategy?.realBlockers.requiredToApply.length ?? 0
  const certificationCount = input.report.targetRequirements?.certifications.length ?? 0
  const stage = inferStage(input.targetRole)
  let minMonths = fromCareer?.min ?? Math.max(1, Math.round(input.difficultyScore))
  let maxMonths = fromCareer?.max ?? Math.max(minMonths + 1, Math.round(input.difficultyScore + 2))
  if (input.track === 'electrician') {
    minMonths = Math.max(minMonths, stage === 'helper' ? 2 : 3)
    maxMonths = Math.max(maxMonths, stage === 'licensed' ? 9 : 6)
  }
  if (certificationCount > 0) { minMonths += 1; maxMonths += Math.min(3, certificationCount) }
  if (input.report.targetRequirements?.examRequired) maxMonths += 2
  if ((input.report.targetRequirements?.apprenticeshipHours ?? 0) > 0) { minMonths += input.track === 'electrician' ? 0 : 2; maxMonths += input.track === 'electrician' ? 2 : 4 }
  if (applyBlockers >= 3) maxMonths += 1
  minMonths = clamp(minMonths, 1, 36)
  maxMonths = clamp(Math.max(minMonths, maxMonths), minMonths, 36)
  const assumptions = dedupeBullets([
    input.track === 'electrician' ? 'You start helper or apprentice outreach in week 1 while you build safety and theory proof.' : certificationCount > 0 ? 'You start credential or registration work in the first two weeks.' : 'You start targeted applications immediately.',
    'You maintain measured weekly output instead of stop-start bursts.',
    input.report.marketEvidence?.baselineOnly ? 'You validate local demand manually through calls, agencies, unions, and direct contractor outreach.' : 'You use live employer demand to prioritize the first route.'
  ], 3)
  return { minMonths, maxMonths, assumptions }
}

function buildRoutes(input: { currentRole: string; targetRole: string; report: PlannerReportSource; first3Steps: string[]; track: TransitionTrack }) {
  const primaryCareer = input.report.suggestedCareers[0]?.title || input.targetRole || 'your target role'
  const firstApplyBlocker = input.report.executionStrategy?.realBlockers.requiredToApply[0]
  const regulated = Boolean(input.report.targetRequirements?.regulated)
  const hasGate = Boolean(firstApplyBlocker) || (input.report.targetRequirements?.certifications.length ?? 0) > 0
  if (input.track === 'electrician') {
    return {
      primary: {
        title: 'Helper or apprentice entry route',
        reason: `Your fastest lane into ${primaryCareer} is to get in front of contractors offering helper or apprentice starts, then prove reliability and safety habits immediately.`,
        firstStep: 'Build a shortlist of 15 electrical contractors and send direct outreach asking about helper or apprentice openings.'
      },
      secondary: {
        title: 'Pre-apprenticeship proof route',
        reason: 'If direct replies are thin, spend 2-4 weeks building theory, tool familiarity, and one visible proof project so your outreach sounds credible.',
        firstStep: firstApplyBlocker?.howToClose || input.first3Steps[0]
      },
      contingency: {
        title: regulated ? 'Union hall / apprenticeship office route' : 'Temp labor / contractor bridge route',
        reason: 'If contractor outreach stalls, use formal intake channels or site-labor bridge roles to get around the no-experience objection.',
        firstStep: 'Contact the local apprenticeship authority or union intake desk and confirm the next registration or intake step.'
      }
    }
  }
  return {
    primary: hasGate ? {
      title: regulated ? 'Credential-first entry route' : 'Gate-clearing entry route',
      reason: `Your fastest path into ${primaryCareer} is to clear the highest-friction gate first, then push direct applications with proof in hand.`,
      firstStep: firstApplyBlocker?.howToClose || input.first3Steps[0]
    } : {
      title: 'Direct application route',
      reason: `You have enough overlap to start applying for ${primaryCareer} now if you pair each application with hard proof and direct outreach.`,
      firstStep: input.first3Steps[0]
    },
    secondary: {
      title: 'Adjacent-role bridge route',
      reason: `Use roles adjacent to ${primaryCareer} to shorten the transition while you keep building proof for the full move.`,
      firstStep: `Target adjacent openings that reuse your ${input.currentRole || 'current'} experience and submit tailored applications this week.`
    },
    contingency: {
      title: 'Agency / temp / contract route',
      reason: 'If direct conversion stalls, use staffing channels to get relevant experience, references, and faster interview volume.',
      firstStep: `Build a shortlist of 5 agencies, contractors, or placement partners tied to ${primaryCareer} and contact them directly.`
    }
  }
}

function buildPlanPhases(context: TransitionContext, first3Steps: string[]) {
  if (detectTrack(context) === 'electrician') {
    const helperLabel = inferStage(context.targetRole) === 'helper' ? 'helper' : 'helper or apprentice'
    return [
      {
        phase: 'Weeks 1-2',
        weeks: '1-2',
        tasks: dedupeBullets([
          'Build a list of 15 electrical contractors, union locals, and apprenticeship offices in your area.',
          `Send 15 contractor outreach messages asking about ${helperLabel} openings and next intake steps.`,
          'Create one Proof Builder project: wire a simple practice board, take photos, and write 3 bullets explaining safety, measurement, and what you tested.',
          'Apply to 10 helper roles, apprentice openings, or pre-apprenticeship programs.'
        ], 4),
        weeklyTargets: ['15 outreach messages', '10 applications', `Proof Builder (1x/week): ${PROOF_BUILDER_DEFINITION}`, '4-6 focused hours on theory and tool practice'],
        timePerWeekHours: 8
      },
      {
        phase: 'Weeks 3-6',
        weeks: '3-6',
        tasks: dedupeBullets([
          'Follow up on 15 applications or outreach threads every week until each one gets a yes, no, or next step.',
          'Practice multimeter basics, safe tool handling, and ladder habits twice per week.',
          'Build one new Proof Builder each week focused on circuits, switches, receptacles, or clean measurement.',
          'Contact 5 staffing firms or site-labor crews that place entry-level electrical workers.'
        ], 4),
        weeklyTargets: ['15 follow-ups', '5 new direct outreach touches', '1 Proof Builder per week', '2 practical study sessions per week'],
        timePerWeekHours: 10
      },
      {
        phase: 'Weeks 7-12',
        weeks: '7-12',
        tasks: dedupeBullets([
          'Apply to 10 more targeted roles each week using updated proof and follow-up notes.',
          'Ask every warm contact for a site visit, working interview, shadow day, or referral.',
          'Confirm apprenticeship registration steps, sponsor requirements, and how hours are recorded in your region.',
          'Keep one Proof Builder going each week until you land a stable entry point.'
        ], 4),
        weeklyTargets: ['10 targeted applications', '5 live conversations with contractors, agencies, or training contacts', '1 apprenticeship pathway checkpoint', '1 Proof Builder per week'],
        timePerWeekHours: 10
      }
    ] satisfies TransitionModeReport['plan90']
  }

  const month1 = context.report.executionStrategy?.plan90Day.month1
  const month2 = context.report.executionStrategy?.plan90Day.month2
  const month3 = context.report.executionStrategy?.plan90Day.month3
  if (!month1 || !month2 || !month3) {
    return [
      { phase: 'Weeks 1-2', weeks: '1-2', tasks: first3Steps, weeklyTargets: ['5 targeted applications', '10 direct outreach touches', `Proof Builder (1x/week): ${PROOF_BUILDER_DEFINITION}`], timePerWeekHours: 8 },
      { phase: 'Weeks 3-6', weeks: '3-6', tasks: ['Tighten positioning based on employer responses and keep applications moving.', 'Turn one missing requirement into visible proof each week.', 'Push follow-ups until every lead reaches a clear outcome.'], weeklyTargets: ['8 targeted applications', '12 follow-ups', '1 credential checkpoint'], timePerWeekHours: 10 },
      { phase: 'Weeks 7-12', weeks: '7-12', tasks: ['Convert interviews into offers, placements, or apprenticeship checkpoints.', 'Keep the pipeline full until you land a stable transition outcome.', 'Close the highest-risk remaining gap before it becomes a final-round objection.'], weeklyTargets: ['5 active interview threads', '8 new applications', '1 offer-readiness review'], timePerWeekHours: 10 }
    ] satisfies TransitionModeReport['plan90']
  }
  return [
    toPlanPhase('Weeks 1-2', '1-2', month1, context.targetRole),
    toPlanPhase('Weeks 3-6', '3-6', month2, context.targetRole),
    toPlanPhase('Weeks 7-12', '7-12', month3, context.targetRole)
  ] satisfies TransitionModeReport['plan90']
}

function normalizePlanTask(task: string, targetRole: string) {
  const trimmed = task.trim()
  if (!trimmed) return ''
  const lower = normalizeText(trimmed)
  if (lower.includes('cycle/week') || lower.includes('proof')) {
    return `Run 1 Proof Builder this week for ${targetRole || 'the target role'}: ${PROOF_BUILDER_DEFINITION}`
  }
  return trimmed.replace(/\b1 additional cycle\/week\b/gi, '1 Proof Builder this week')
}

function toPlanPhase(phase: string, weeks: string, month: MonthPlanSource, targetRole: string) {
  const actions = month.actions.slice(0, 4)
  const tasks = actions.map((action) => normalizePlanTask(action.task, targetRole)).filter(Boolean)
  const weeklyTargets = dedupeBullets([
    ...actions.map((action) => action.volumeTarget),
    ...actions.map((action) => action.proofTarget),
    PROOF_BUILDER_DEFINITION
  ], 4)
  return {
    phase,
    weeks,
    tasks: fillToLength(tasks, 3, 'Keep the transition pipeline active and publish one clear proof checkpoint every week.').slice(0, 4),
    weeklyTargets: fillToLength(weeklyTargets, 2, '1 documented checkpoint each week').slice(0, 4),
    timePerWeekHours: averageHours(month.weeklyTimeInvestment)
  }
}

function buildExecution(input: { currentRole: string; targetRole: string; report: PlannerReportSource; track: TransitionTrack }) {
  const targetRole = input.report.suggestedCareers[0]?.title || input.targetRole || 'the target role'
  if (input.track === 'electrician') {
    return {
      dailyRoutine: [
        '15 minutes: review every live application, follow-up, and contractor reply.',
        '15 minutes: send 2 direct outreach touches to contractors, unions, staffing firms, or apprenticeship contacts.',
        '15 minutes: move one blocker forward with theory study, tool practice, or a Proof Builder checkpoint.'
      ],
      weeklyCadence: ['15 contractor outreach messages', '10 targeted helper or apprentice applications', '15 follow-ups', `Proof Builder (1x/week): ${PROOF_BUILDER_DEFINITION}`],
      outreachTemplates: {
        call: `Hi, I am moving from ${input.currentRole || 'my current role'} into ${targetRole}. I am looking for a helper or apprentice start, not a perfect fit on day one. I already work fast, follow safety rules, and show up reliably. I am building trade-specific proof now. Who is the right person to speak with about entry-level openings, apprenticeships, or upcoming hires?`,
        email: [
          `Subject: Entry-level ${targetRole} candidate ready for helper or apprentice work`,
          '',
          `Hi, I am transitioning from ${input.currentRole || 'my current role'} into ${targetRole}.`,
          'I am reaching out directly because I am looking for a helper or apprentice start and I am already building practical proof each week.',
          'I can share a short proof project, explain how my background translates to site work, and move quickly if you have an opening or upcoming intake.',
          'If there is a helper role, apprentice opening, or the right person to speak with, I would appreciate the direction.',
          '',
          'Best,',
          'Your Name'
        ].join('\n')
      }
    }
  }

  const month1 = input.report.executionStrategy?.plan90Day.month1
  return {
    dailyRoutine: [
      '15 minutes: review every live application, follow-up, and interview thread.',
      '15 minutes: send 2 direct outreach touches to employers, agencies, or contractors.',
      '15 minutes: complete one blocker-closing task tied to the top gap.'
    ],
    weeklyCadence: dedupeBullets([
      month1?.actions[0]?.volumeTarget || '8 targeted applications',
      month1?.actions[1]?.volumeTarget || '10 direct outreach touches',
      `Proof Builder (1x/week): ${PROOF_BUILDER_DEFINITION}`,
      '1 tracker review and pipeline rebalance'
    ], 4),
    outreachTemplates: {
      call: `Hi, I am transitioning from ${input.currentRole || 'my current role'} into ${targetRole}. I already have relevant experience, I am actively closing the remaining gaps, and I can show concrete proof of work. Who is the right person to speak with about current openings or near-term hiring needs?`,
      email: [
        `Subject: ${targetRole} transition candidate with proof of work`,
        '',
        `Hi, I am moving from ${input.currentRole || 'my current role'} into ${targetRole}.`,
        'I am reaching out directly because I already bring relevant experience and I am executing a focused 90-day transition plan.',
        'This week I can share specific proof of work, explain how my background maps to your role needs, and move quickly on next steps.',
        'If there is an opening, contract need, or upcoming hiring window, I would like to speak with the right contact.',
        '',
        'Best,',
        'Your Name'
      ].join('\n')
    }
  }
}

function buildFirstThreeSteps(context: TransitionContext, missingItems: string[]) {
  if (detectTrack(context) === 'electrician') {
    return [
      'Build a target list of 15 contractors, apprenticeship offices, or union contacts.',
      'Complete 1 Proof Builder this week and save photos plus 3 bullets.',
      'Send 15 contractor outreach messages and apply to 10 helper or apprentice openings.'
    ]
  }
  const month1Actions = context.report.executionStrategy?.plan90Day.month1.actions ?? []
  const steps = dedupeBullets([
    ...month1Actions.map((action) => normalizePlanTask(action.task, context.targetRole)),
    context.report.bottleneck?.nextAction ?? '',
    ...missingItems.map((item) => item.split(':')[0] ?? item)
  ], 3)
  return fillToLength(steps.slice(0, 3), 3, 'Move one blocker from unknown to scheduled this week.').slice(0, 3)
}

function normalizeWageToHourly(value: number | null) {
  if (value === null) return null
  return Number((value > 250 ? value / 2080 : value).toFixed(1))
}

function inferIncomeRange(value: string | undefined) {
  const normalized = String(value ?? '').trim().toLowerCase()
  if (normalized === '$150k+') return { low: 150_000, high: 190_000 }
  if (normalized === '$100k+') return { low: 100_000, high: 140_000 }
  if (normalized === '$75-100k') return { low: 75_000, high: 100_000 }
  if (normalized === '$50-75k') return { low: 50_000, high: 75_000 }
  if (normalized === 'under $50k') return { low: 38_000, high: 50_000 }
  return { low: 45_000, high: 65_000 }
}

function buildElectricianEarnings(context: TransitionContext) {
  const native = context.report.suggestedCareers[0]?.salary.native
  if (looksLikeCanada(context.location, context.report)) {
    return [
      { stage: 'Year 1', rangeLow: 22, rangeHigh: 28, unit: 'CAD/hour' },
      { stage: 'Year 2', rangeLow: 28, rangeHigh: 38, unit: 'CAD/hour' },
      { stage: 'Year 3', rangeLow: 34, rangeHigh: 45, unit: 'CAD/hour' },
      { stage: 'Fully Qualified', rangeLow: 40, rangeHigh: 55, unit: 'CAD/hour' }
    ] satisfies TransitionModeReport['earnings']
  }
  const currency = native?.currency ?? 'USD'
  const low = Math.max(currency === 'CAD' ? 22 : 18, normalizeWageToHourly(native?.low ?? context.report.suggestedCareers[0]?.salary.usd?.low ?? null) ?? (currency === 'CAD' ? 22 : 18))
  const high = Math.max(currency === 'CAD' ? 42 : 34, normalizeWageToHourly(native?.high ?? context.report.suggestedCareers[0]?.salary.usd?.high ?? null) ?? (currency === 'CAD' ? 42 : 34))
  return [
    { stage: 'Year 1', rangeLow: Math.round(low), rangeHigh: Math.round(Math.max(low + 4, low + (high - low) * 0.35)), unit: `${currency}/hour` },
    { stage: 'Year 2', rangeLow: Math.round(Math.max(low + 3, low * 1.08)), rangeHigh: Math.round(Math.max(low + 8, low + (high - low) * 0.65)), unit: `${currency}/hour` },
    { stage: 'Year 3', rangeLow: Math.round(Math.max(low + 6, low + (high - low) * 0.45)), rangeHigh: Math.round(Math.max(low + 12, high * 0.92)), unit: `${currency}/hour` },
    { stage: 'Fully Qualified', rangeLow: Math.round(Math.max(low + 10, high * 0.78)), rangeHigh: Math.round(high), unit: `${currency}/hour` }
  ] satisfies TransitionModeReport['earnings']
}

function buildEarnings(context: TransitionContext) {
  if (detectTrack(context) === 'electrician') return buildElectricianEarnings(context)
  const primaryCareer = context.report.suggestedCareers[0] ?? null
  const nativeSalary = primaryCareer?.salary.native
  const usdSalary = primaryCareer?.salary.usd
  const currency = nativeSalary?.currency ?? 'USD'
  let low = normalizeWageToHourly(nativeSalary?.low ?? usdSalary?.low ?? null)
  let high = normalizeWageToHourly(nativeSalary?.high ?? usdSalary?.high ?? null)
  let median = normalizeWageToHourly(nativeSalary?.median ?? usdSalary?.median ?? null)
  if (low === null || high === null) {
    const inferred = inferIncomeRange(context.incomeTarget)
    low = low ?? Number((inferred.low / 2080).toFixed(1))
    high = high ?? Number((inferred.high / 2080).toFixed(1))
    median = median ?? Number((((inferred.low + inferred.high) / 2) / 2080).toFixed(1))
  }
  const safeLow = Math.max(18, low ?? 22)
  const safeHigh = Math.max(safeLow + 4, high ?? 34)
  const safeMedian = clamp(median ?? (safeLow + safeHigh) / 2, safeLow, safeHigh)
  const unit = `${currency}/hour`
  return [
    { stage: 'Year 1', rangeLow: Math.round(safeLow * 0.9), rangeHigh: Math.round(safeMedian * 0.95), unit },
    { stage: 'Year 2', rangeLow: Math.round(safeLow), rangeHigh: Math.round(safeMedian), unit },
    { stage: 'Year 3', rangeLow: Math.round(safeMedian), rangeHigh: Math.round(safeHigh * 0.94), unit },
    { stage: 'Fully Qualified', rangeLow: Math.round(safeMedian), rangeHigh: Math.round(safeHigh), unit }
  ] satisfies TransitionModeReport['earnings']
}

function buildReality(input: { report: PlannerReportSource; missingItems: string[]; track: TransitionTrack }) {
  if (input.track === 'electrician') {
    return {
      barriers: fillToLength(dedupeBullets([
        'Entry-level trade hiring often moves through direct contractor relationships, not easy-to-find job boards.',
        'You may hear "come back with experience" unless you show basic safety, theory, and hands-on proof early.',
        'The schedule can be physically demanding, with early starts, weather, and repetitive jobsite routines.'
      ], 3), 3, 'This transition stalls when weekly output is not measured.').slice(0, 3),
      mitigations: fillToLength(dedupeBullets([
        'Use direct outreach, union intake, and staffing channels in parallel instead of relying on portals alone.',
        `Build 1 Proof Builder every week so employers see evidence, not just intent. ${PROOF_BUILDER_DEFINITION}`,
        'Treat safety basics, tool practice, and pathway research as week-1 work, not later work.'
      ], 3), 3, 'Review the pipeline weekly and cut low-yield activity.').slice(0, 3)
    }
  }
  const blockers = input.report.executionStrategy?.realBlockers.requiredToApply ?? []
  return {
    barriers: fillToLength(dedupeBullets([
      blockers[0]?.whyItMatters || input.report.bottleneck?.why || 'This transition still has one high-friction gate that can stall momentum.',
      input.missingItems[0] || 'Your current profile does not yet prove the target role end-to-end.',
      input.report.marketEvidence?.baselineOnly ? 'You do not have validated local demand yet, so passive applying is riskier.' : 'If response rates stay low, your positioning or channel mix needs to change fast.'
    ], 3), 3, 'Execution stalls when the weekly plan is not measured.').slice(0, 3),
    mitigations: fillToLength(dedupeBullets([
      blockers[0]?.howToClose || input.report.bottleneck?.nextAction || 'Schedule the top blocker immediately and assign a dated deadline.',
      'Use direct outreach, agencies, and follow-ups instead of relying on portals alone.',
      `Ship 1 Proof Builder every week so interviews focus on evidence, not potential. ${PROOF_BUILDER_DEFINITION}`
    ], 3), 3, 'Review the pipeline weekly and cut low-yield activity.').slice(0, 3)
  }
}

function buildResources(context: TransitionContext) {
  const local = dedupeResources([
    ...(context.report.targetRequirements?.sources ?? []),
    ...((context.report.suggestedCareers[0]?.officialLinks ?? []).map((item) => ({ label: item.label, url: item.url })))
  ], 4)
  const online = dedupeResources((context.report.linksResources ?? []).map((item) => ({ label: item.label, url: item.url })), 6)
  const fallbackLocal = detectTrack(context) === 'electrician' ? dedupeResources([
    { label: 'Local apprenticeship authority (province/state)', url: '' },
    { label: 'Union locals directory (if applicable)', url: '' }
  ], 2) : []
  const fallbackOnline = detectTrack(context) === 'electrician' ? dedupeResources([
    { label: 'Basic electrical theory course (generic)', url: '' }
  ], 1) : []
  const internal = [
    { label: 'CareerHeap Blog', url: '/blog' },
    { label: 'Career Tools', url: '/tools' },
    { label: 'Run This Plan Again', url: '/tools/career-switch-planner' }
  ] satisfies TransitionModeReport['resources']['internal']
  return { local: local.length > 0 ? local : fallbackLocal, online: online.length > 0 ? online : fallbackOnline, internal }
}

function dedupeResources(values: Array<{ label: string; url: string }>, max: number) {
  const seen = new Set<string>()
  const output: Array<{ label: string; url: string }> = []
  for (const value of values) {
    const label = value.label.trim()
    const url = value.url.trim()
    if (!label) continue
    const key = `${normalizeBulletKey(label)}|${url.toLowerCase()}`
    if (seen.has(key)) continue
    seen.add(key)
    output.push({ label, url })
    if (output.length >= max) break
  }
  return output
}
