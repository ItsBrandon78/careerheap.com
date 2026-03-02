import { z } from 'zod'

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
  url: z.string().min(1)
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
  compatibilitySnapshot: {
    score: number
    topReasons: string[]
  }
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
      } | null
      usd: {
        low: number | null
        median: number | null
        high: number | null
      } | null
    }
  }>
  executionStrategy?: {
    whereYouStandNow: {
      strengths: Array<{ summary: string }>
      missingMandatoryRequirements: Array<{ label: string; reason: string }>
      competitiveDisadvantages: Array<{ label: string; reason: string }>
    }
    realBlockers: {
      requiredToApply: Array<{
        label: string
        whyItMatters: string
        howToClose: string
        timeEstimate: string
      }>
      requiredToCompete: Array<{
        label: string
        whyItMatters: string
        howToClose: string
        timeEstimate: string
      }>
    }
    transferableEdge: {
      translations: Array<{
        fromResume: string
        toTargetRole: string
      }>
    }
    plan90Day: {
      month1: MonthPlanSource
      month2: MonthPlanSource
      month3: MonthPlanSource
    }
    probabilityRealityCheck: {
      difficulty: string
      whatIncreasesOdds: string[]
      commonFailureModes: string[]
    }
    behavioralExecution: {
      minimumWeeklyEffort: string
      consistencyLooksLike: string[]
      whatNotToDo: string[]
    }
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
  transitionReport?: {
    marketSnapshot: {
      role: string
      location: string
    }
    transferableStrengths: Array<{
      strength: string
    }>
  }
  linksResources?: Array<{
    label: string
    url: string
    type: 'official' | 'curated'
  }>
  marketEvidence?: {
    baselineOnly: boolean
    postingsCount: number
    query: {
      location: string
    } | null
  }
  bottleneck?: {
    title: string
    why: string
    nextAction: string
    estimatedEffort: string
  } | null
}

type MonthPlanSource = {
  label: string
  weeklyTimeInvestment: string
  actions: Array<{
    task: string
    volumeTarget: string
    proofTarget: string
    weeklyTime: string
  }>
}

export function buildTransitionModeReport(input: {
  currentRole: string
  targetRole: string
  education?: string
  incomeTarget?: string
  report: PlannerReportSource
}): TransitionModeReport {
  const primaryCareer = input.report.suggestedCareers[0] ?? null
  const applyBlockers = input.report.executionStrategy?.realBlockers.requiredToApply ?? []
  const competeBlockers = input.report.executionStrategy?.realBlockers.requiredToCompete ?? []
  const strengthSummaries = collectStrengths(input.report)
  const missingItems = collectMissingItems(input.report)
  const first3Steps = buildFirstThreeSteps(input.report, missingItems)
  const difficulty = buildDifficulty({
    compatibilityScore: input.report.compatibilitySnapshot.score,
    applyBlockerCount: applyBlockers.length,
    competeBlockerCount: competeBlockers.length,
    report: input.report,
    education: input.education
  })
  const timeline = buildTimeline({
    report: input.report,
    difficultyScore: difficulty.score
  })

  const output = {
    difficulty,
    timeline,
    routes: buildRoutes({
      currentRole: input.currentRole,
      targetRole: input.targetRole,
      report: input.report,
      first3Steps
    }),
    plan90: buildPlanPhases(input.report, first3Steps),
    execution: buildExecution({
      currentRole: input.currentRole,
      targetRole: input.targetRole,
      report: input.report,
      first3Steps
    }),
    gaps: {
      strengths: fillToLength(strengthSummaries, 3, `Your ${input.currentRole || 'current'} background already carries useful transition leverage.`).slice(0, 3),
      missing: fillToLength(missingItems, 3, `You still need visible proof that you can perform in ${input.targetRole || 'the target role'}.`).slice(0, 3),
      first3Steps
    },
    earnings: buildEarnings({
      report: input.report,
      incomeTarget: input.incomeTarget
    }),
    reality: buildReality({
      report: input.report,
      missingItems
    }),
    resources: buildResources(input.report)
  }

  return TransitionModeSchema.parse(output)
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function dedupeStrings(values: string[]) {
  const seen = new Set<string>()
  const output: string[] = []
  for (const value of values) {
    const trimmed = value.trim()
    if (!trimmed) continue
    const key = trimmed.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    output.push(trimmed)
  }
  return output
}

function fillToLength(values: string[], target: number, fallback: string) {
  const output = [...values]
  while (output.length < target) {
    output.push(fallback)
  }
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

function collectStrengths(report: PlannerReportSource) {
  const strengthSources = [
    ...(report.executionStrategy?.whereYouStandNow.strengths ?? []).map((item) => item.summary),
    ...(report.transitionReport?.transferableStrengths ?? []).map((item) => `Transferable strength: ${item.strength}`),
    ...report.compatibilitySnapshot.topReasons
  ]
  return dedupeStrings(strengthSources).slice(0, 5)
}

function collectMissingItems(report: PlannerReportSource) {
  const items = [
    ...(report.executionStrategy?.whereYouStandNow.missingMandatoryRequirements ?? []).map(
      (item) => `${item.label}: ${item.reason}`
    ),
    ...(report.executionStrategy?.whereYouStandNow.competitiveDisadvantages ?? []).map(
      (item) => `${item.label}: ${item.reason}`
    ),
    ...(report.targetRequirements?.hardGates ?? []).map((item) => `Apply gate: ${item}`)
  ]
  return dedupeStrings(items).slice(0, 6)
}

function buildDifficulty(input: {
  compatibilityScore: number
  applyBlockerCount: number
  competeBlockerCount: number
  report: PlannerReportSource
  education?: string
}) {
  const licensingBarrier =
    Math.min(3, input.report.targetRequirements?.certifications.length ?? 0) * 0.8 +
    (input.report.targetRequirements?.regulated ? 1.2 : 0) +
    (input.report.targetRequirements?.examRequired ? 0.8 : 0)
  const targetEducation = input.report.targetRequirements?.education ?? ''
  const userEducation = input.education ?? ''
  const degreeSignal = /\b(bachelor|master|doctor|associate|degree)\b/i
  const educationBarrier =
    degreeSignal.test(targetEducation) && !degreeSignal.test(userEducation)
      ? 1.7
      : targetEducation
        ? 0.6
        : 0
  const experienceBarrier = Math.min(3.2, input.applyBlockerCount * 1.1 + input.competeBlockerCount * 0.35)
  const marketFriction =
    input.report.marketEvidence?.baselineOnly
      ? 1.4
      : (input.report.marketEvidence?.postingsCount ?? 0) < 5
        ? 0.9
        : 0.35
  const transferabilityPenalty = clamp((72 - input.compatibilityScore) / 16, 0, 2.8)
  const rawScore = 1.1 + licensingBarrier + educationBarrier + experienceBarrier + marketFriction + transferabilityPenalty
  const score = Number(clamp(Math.round(rawScore * 10) / 10, 0.8, 9.8).toFixed(1))

  let label: TransitionModeReport['difficulty']['label'] = 'Easy'
  if (score >= 7.6) {
    label = 'Very Hard'
  } else if (score >= 5.9) {
    label = 'Hard'
  } else if (score >= 3.6) {
    label = 'Moderate'
  }

  const why = dedupeStrings([
    input.applyBlockerCount > 0
      ? `${input.applyBlockerCount} immediate apply blocker${input.applyBlockerCount === 1 ? '' : 's'} need to be cleared before broad outreach scales.`
      : 'There are no hard apply blockers stopping you from starting the search now.',
    licensingBarrier > 1
      ? 'Licensing or certification gates raise the activation cost of this transition.'
      : 'There is no major licensing wall slowing the first move.',
    input.report.marketEvidence?.baselineOnly
      ? 'The market view is using baseline data, so you should validate demand with direct outreach in your region.'
      : 'Live market evidence is available, so you can prioritize what employers are hiring for now.'
  ]).slice(0, 3)

  return { score, label, why }
}

function buildTimeline(input: {
  report: PlannerReportSource
  difficultyScore: number
}) {
  const primaryCareer = input.report.suggestedCareers[0] ?? null
  const fromCareer = primaryCareer ? parseTimelineRange(primaryCareer.transitionTime) : null
  const applyBlockers = input.report.executionStrategy?.realBlockers.requiredToApply.length ?? 0
  const certificationCount = input.report.targetRequirements?.certifications.length ?? 0

  let minMonths = fromCareer?.min ?? Math.max(1, Math.round(input.difficultyScore))
  let maxMonths = fromCareer?.max ?? Math.max(minMonths + 1, Math.round(input.difficultyScore + 2))

  if (certificationCount > 0) {
    minMonths += 1
    maxMonths += Math.min(3, certificationCount)
  }
  if (input.report.targetRequirements?.examRequired) {
    maxMonths += 2
  }
  if ((input.report.targetRequirements?.apprenticeshipHours ?? 0) > 0) {
    minMonths += 2
    maxMonths += 4
  }
  if (applyBlockers >= 3) {
    maxMonths += 1
  }

  minMonths = clamp(minMonths, 1, 36)
  maxMonths = clamp(Math.max(minMonths, maxMonths), minMonths, 36)

  const assumptions = dedupeStrings([
    certificationCount > 0
      ? 'You start credential or registration work in the first two weeks.'
      : 'You start targeted applications immediately.',
    'You maintain weekly output instead of sporadic bursts.',
    input.report.marketEvidence?.baselineOnly
      ? 'You validate the local market manually through calls, agencies, and direct employer outreach.'
      : 'You use live employer demand to prioritize the first route.'
  ]).slice(0, 3)

  return {
    minMonths,
    maxMonths,
    assumptions
  }
}

function buildRoutes(input: {
  currentRole: string
  targetRole: string
  report: PlannerReportSource
  first3Steps: string[]
}) {
  const primaryCareer = input.report.suggestedCareers[0]?.title || input.targetRole || 'your target role'
  const firstApplyBlocker = input.report.executionStrategy?.realBlockers.requiredToApply[0]
  const regulated = Boolean(input.report.targetRequirements?.regulated)
  const hasGate = Boolean(firstApplyBlocker) || (input.report.targetRequirements?.certifications.length ?? 0) > 0

  const primary = hasGate
    ? {
        title: regulated ? 'Credential-first entry route' : 'Gate-clearing entry route',
        reason: `Your fastest path into ${primaryCareer} is to clear the highest-friction gate first, then push direct applications with proof in hand.`,
        firstStep: firstApplyBlocker?.howToClose || input.first3Steps[0]
      }
    : {
        title: 'Direct application route',
        reason: `You have enough overlap to start applying for ${primaryCareer} now if you pair each application with hard proof and direct outreach.`,
        firstStep: input.first3Steps[0]
      }

  const secondary = {
    title: 'Adjacent-role bridge route',
    reason: `Use roles adjacent to ${primaryCareer} to shorten the transition while you keep building proof for the full move.`,
    firstStep: `Target adjacent openings that reuse your ${input.currentRole || 'current'} experience and submit tailored applications this week.`
  }

  const contingency = {
    title: 'Agency / temp / contract route',
    reason: 'If direct conversion stalls, use staffing channels to get relevant experience, references, and faster interview volume.',
    firstStep: `Build a shortlist of 5 agencies, contractors, or placement partners tied to ${primaryCareer} and contact them directly.`
  }

  return { primary, secondary, contingency }
}

function buildPlanPhases(report: PlannerReportSource, first3Steps: string[]) {
  const month1 = report.executionStrategy?.plan90Day.month1
  const month2 = report.executionStrategy?.plan90Day.month2
  const month3 = report.executionStrategy?.plan90Day.month3

  if (!month1 || !month2 || !month3) {
    return [
      {
        phase: 'Weeks 1-2',
        weeks: '1-2',
        tasks: first3Steps,
        weeklyTargets: ['5 targeted applications', '10 direct outreach touches', '1 proof artifact'],
        timePerWeekHours: 8
      },
      {
        phase: 'Weeks 3-6',
        weeks: '3-6',
        tasks: [
          'Tighten positioning based on employer responses and keep applications moving.',
          'Turn one missing requirement into visible proof each week.',
          'Push follow-ups until every lead reaches a clear outcome.'
        ],
        weeklyTargets: ['8 targeted applications', '12 follow-ups', '1 credential checkpoint'],
        timePerWeekHours: 10
      },
      {
        phase: 'Weeks 7-12',
        weeks: '7-12',
        tasks: [
          'Convert interviews into offers, placements, or apprenticeship checkpoints.',
          'Keep the pipeline full until you land a stable transition outcome.',
          'Close the highest-risk remaining gap before it becomes a final-round objection.'
        ],
        weeklyTargets: ['5 active interview threads', '8 new applications', '1 offer-readiness review'],
        timePerWeekHours: 10
      }
    ] satisfies TransitionModeReport['plan90']
  }

  return [
    toPlanPhase('Weeks 1-2', '1-2', month1),
    toPlanPhase('Weeks 3-6', '3-6', month2),
    toPlanPhase('Weeks 7-12', '7-12', month3)
  ] satisfies TransitionModeReport['plan90']
}

function toPlanPhase(phase: string, weeks: string, month: MonthPlanSource) {
  const actions = month.actions.slice(0, 4)
  const tasks = actions.map((action) => action.task)
  const weeklyTargets = dedupeStrings([
    ...actions.map((action) => action.volumeTarget),
    ...actions.map((action) => action.proofTarget)
  ]).slice(0, 4)

  return {
    phase,
    weeks,
    tasks: fillToLength(tasks, 3, 'Keep the transition pipeline active and document measurable proof every week.').slice(0, 4),
    weeklyTargets: fillToLength(weeklyTargets, 2, '1 documented checkpoint each week').slice(0, 4),
    timePerWeekHours: averageHours(month.weeklyTimeInvestment)
  }
}

function buildExecution(input: {
  currentRole: string
  targetRole: string
  report: PlannerReportSource
  first3Steps: string[]
}) {
  const month1 = input.report.executionStrategy?.plan90Day.month1
  const dailyRoutine = [
    '15 minutes: review every live application, follow-up, and interview thread.',
    '15 minutes: send 2 direct outreach touches to employers, agencies, or contractors.',
    '15 minutes: complete one blocker-closing task tied to the top gap.'
  ]
  const weeklyCadence = dedupeStrings([
    month1?.actions[0]?.volumeTarget || '8 targeted applications',
    month1?.actions[1]?.volumeTarget || '10 direct outreach touches',
    '1 proof artifact or credential checkpoint',
    '1 tracker review and pipeline rebalance'
  ]).slice(0, 4)
  const targetRole = input.report.suggestedCareers[0]?.title || input.targetRole || 'the target role'

  return {
    dailyRoutine,
    weeklyCadence,
    outreachTemplates: {
      call: `Hi, I am transitioning from ${input.currentRole || 'my current role'} into ${targetRole}. I already have relevant experience, I am actively closing the remaining gaps, and I can show concrete proof of work. Who is the right person to speak with about current openings or near-term hiring needs?`,
      email: [
        `Subject: ${targetRole} transition candidate with proof of work`,
        '',
        `Hi, I am moving from ${input.currentRole || 'my current role'} into ${targetRole}.`,
        `I am reaching out directly because I already bring relevant experience and I am executing a focused 90-day transition plan.`,
        `This week I can share specific proof of work, explain how my background maps to your role needs, and move quickly on next steps.`,
        `If there is an opening, contract need, or upcoming hiring window, I would like to speak with the right contact.`,
        '',
        `Best,`,
        'Your Name'
      ].join('\n')
    }
  }
}

function buildFirstThreeSteps(report: PlannerReportSource, missingItems: string[]) {
  const month1Actions = report.executionStrategy?.plan90Day.month1.actions ?? []
  const steps = dedupeStrings([
    ...month1Actions.map((action) => action.task),
    report.bottleneck?.nextAction ?? '',
    ...missingItems.map((item) => item.split(':')[0] ?? item)
  ])

  return fillToLength(
    steps.slice(0, 3),
    3,
    'Move one blocker from unknown to scheduled this week.'
  ).slice(0, 3)
}

function buildEarnings(input: {
  report: PlannerReportSource
  incomeTarget?: string
}) {
  const primaryCareer = input.report.suggestedCareers[0] ?? null
  const nativeSalary = primaryCareer?.salary.native
  const usdSalary = primaryCareer?.salary.usd
  const currency = nativeSalary?.currency ?? 'USD'
  const unit = `${currency}/year`

  let low = nativeSalary?.low ?? usdSalary?.low ?? null
  let high = nativeSalary?.high ?? usdSalary?.high ?? null
  let median = nativeSalary?.median ?? usdSalary?.median ?? null

  if (low === null || high === null) {
    const inferred = inferIncomeRange(input.incomeTarget)
    low = low ?? inferred.low
    high = high ?? inferred.high
    median = median ?? Math.round((low + high) / 2)
  }

  const safeLow = Math.max(20_000, Math.round(low ?? 45_000))
  const safeHigh = Math.max(safeLow + 5_000, Math.round(high ?? 65_000))
  const safeMedian = clamp(Math.round(median ?? (safeLow + safeHigh) / 2), safeLow, safeHigh)

  return [
    {
      stage: 'Year 1',
      rangeLow: Math.round(safeLow * 0.85),
      rangeHigh: Math.round(safeMedian * 0.92),
      unit
    },
    {
      stage: 'Year 2',
      rangeLow: Math.round(safeLow * 0.95),
      rangeHigh: Math.round(safeMedian),
      unit
    },
    {
      stage: 'Year 3',
      rangeLow: Math.round(safeMedian),
      rangeHigh: Math.round(safeHigh * 0.95),
      unit
    },
    {
      stage: 'Fully Qualified',
      rangeLow: Math.round(safeMedian),
      rangeHigh: Math.round(safeHigh),
      unit
    }
  ] satisfies TransitionModeReport['earnings']
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

function buildReality(input: {
  report: PlannerReportSource
  missingItems: string[]
}) {
  const blockers = input.report.executionStrategy?.realBlockers.requiredToApply ?? []
  const barriers = fillToLength(dedupeStrings([
    blockers[0]?.whyItMatters || input.report.bottleneck?.why || 'This transition still has one high-friction gate that can stall momentum.',
    input.missingItems[0] || 'Your current profile does not yet prove the target role end-to-end.',
    input.report.marketEvidence?.baselineOnly
      ? 'You do not have validated local demand yet, so passive applying is riskier.'
      : 'If response rates stay low, your positioning or channel mix needs to change fast.'
  ]).slice(0, 3), 3, 'Execution stalls when the weekly plan is not measured.').slice(0, 3)

  const mitigations = fillToLength(dedupeStrings([
    blockers[0]?.howToClose || input.report.bottleneck?.nextAction || 'Schedule the top blocker immediately and assign a dated deadline.',
    'Use direct outreach, agencies, and follow-ups instead of relying on portals alone.',
    'Ship one proof artifact every week so interviews focus on evidence, not potential.'
  ]).slice(0, 3), 3, 'Review the pipeline weekly and cut low-yield activity.').slice(0, 3)

  return { barriers, mitigations }
}

function buildResources(report: PlannerReportSource) {
  const local = dedupeResources([
    ...(report.targetRequirements?.sources ?? []),
    ...((report.suggestedCareers[0]?.officialLinks ?? []).map((item) => ({
      label: item.label,
      url: item.url
    })))
  ]).slice(0, 4)

  const online = dedupeResources(
    (report.linksResources ?? []).map((item) => ({
      label: item.label,
      url: item.url
    }))
  ).slice(0, 6)

  const internal = [
    { label: 'CareerHeap Blog', url: '/blog' },
    { label: 'Career Tools', url: '/tools' },
    { label: 'Run This Plan Again', url: '/tools/career-switch-planner' }
  ] satisfies TransitionModeReport['resources']['internal']

  return {
    local,
    online,
    internal
  }
}

function dedupeResources(values: Array<{ label: string; url: string }>) {
  const seen = new Set<string>()
  const output: Array<{ label: string; url: string }> = []
  for (const value of values) {
    const label = value.label.trim()
    const url = value.url.trim()
    if (!label || !url) continue
    const key = `${label.toLowerCase()}|${url.toLowerCase()}`
    if (seen.has(key)) continue
    seen.add(key)
    output.push({ label, url })
  }
  return output
}
