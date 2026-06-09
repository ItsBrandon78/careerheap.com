import type { PlannerResultView } from '@/lib/planner/types'

export type PlannerViewMode = 'intake' | 'dashboard'

export type FallbackBadge = 'Needs data' | 'Estimate' | 'Add your info'
export type SourceType = 'verified' | 'derived' | 'estimate'
type DashboardCareerPathType =
  | 'TRADES'
  | 'HEALTHCARE_LICENSED'
  | 'PROFESSIONAL_LICENSED'
  | 'TECH'
  | 'GENERAL'

export type PlannerPathwayWeightingType =
  | 'trades'
  | 'tech'
  | 'healthcare'
  | 'creative'
  | 'corporate_operations'

export type PlannerRouteType =
  | 'direct'
  | 'bridge-role'
  | 'certification-first'
  | 'education-first'
  | 'portfolio-first'

export interface DashboardFallbackValue<T> {
  value: T
  badge?: FallbackBadge
  sourceType?: SourceType
  sourceLabel?: string
  updatedAt?: string
}

export type PlannerTaskCategory = 'now' | 'next' | 'blocked'

export interface PlannerDashboardTask {
  id: string
  phaseId: string
  category: PlannerTaskCategory
  label: string
  checked: boolean
  weight: number
}

export interface PlannerDashboardPhaseProgress {
  id: string
  completed: boolean
  collapsed: boolean
  completionRatio: number
}

export interface PlannerDashboardRoadmapPhase {
  id: string
  title: string
  summary: string
  outcome: string
  actions: string[]
  resources: Array<{ label: string; url?: string }>
  links: Array<{ label: string; url: string }>
  expandedByDefault: boolean
}

export interface PlannerDashboardAlternative {
  occupationId: string
  title: string
  difficulty: string
  timeline: string
  salary: DashboardFallbackValue<string>
  reason: string
}

export interface PlannerDashboardV3Model {
  missingFields: string[]
  summaryStrip: {
    planScore: string
    planStatus: string
    confidenceTrend: string
    modelVersion: string
    dataFreshness: string
  }
  summaryBar: {
    currentRole: string
    targetRole: string
    location: string
    timeline: string
    skillsCount: number
    lastUpdated: string
  }
  pathwayWeighting: {
    type: PlannerPathwayWeightingType
    label: string
    emphasis: string[]
  }
  decision: {
    currentRole: string
    targetRole: string
    transitionVerdict: 'Strong' | 'Possible' | 'Stretch'
    fastestRoute: string
    estimatedTimeline: string
    biggestBlocker: string
    routeType: PlannerRouteType
  }
  actionWindow14: {
    thisWeek: string[]
    nextWeek: string[]
    proofToCollect: string[]
  }
  blockers: Array<{
    blocker: string
    whyItMatters: string
    howToFix: string
  }>
  strengths: Array<{
    advantage: string
    whyItMatters: string
  }>
  requirementsGaps: {
    mustHave: string[]
    niceToHave: string[]
    missingNow: string[]
  }
  skillsBuckets: {
    alreadyHave: string[]
    needSoon: string[]
    laterStage: string[]
  }
  certEducation: {
    required: string[]
    recommended: string[]
    optional: string[]
    effortSummary: string
  }
  resumeEvidence: {
    alreadyProves: string[]
    stillNeedsProof: string[]
    artifacts: string[]
  }
  adjacentEntryOptions: {
    fastestEntry: PlannerDashboardAlternative | null
    closestMatch: PlannerDashboardAlternative | null
    bestLongTermUpside: PlannerDashboardAlternative | null
  }
  longerTermRoadmap: {
    windows: Array<{
      label: string
      actions: string[]
    }>
  }
  hero: {
    title: string
    mappedPathLabel?: string
    insight: string
    scenarioModes: Array<{ label: string; active: boolean }>
    routeType: PlannerRouteType
    transitionVerdict: 'Strong' | 'Possible' | 'Stretch'
    fastestRoute: string
    biggestBlocker: string
    difficulty: DashboardFallbackValue<string>
    timeline: DashboardFallbackValue<string>
    probability: DashboardFallbackValue<string>
    trainingCost: DashboardFallbackValue<string>
    salaryPotential: DashboardFallbackValue<string>
  }
  difficultyBreakdown: {
    sourceType: SourceType
    sourceLabel: string
    items: Array<{ label: string; score: number }>
    explanation: string
    driverImpactRows: Array<{ label: string; weight: number; impactPoints: number }>
    primaryBarrier: string
    coreAdvantage: string
  }
  skillTransfer: {
    transferable: Array<{ label: string; progress: number }>
    required: Array<{ label: string; progress: number }>
    largestGap: string
    evidenceRequired: string[]
  }
  roadmap: {
    phases: PlannerDashboardRoadmapPhase[]
  }
  fastestPath: {
    headline: string
    routeType: PlannerRouteType
    bestEntryStrategy: string
    steps: Array<{ label: string; detail: string }>
    strongestPath: Array<{ label: string; detail: string }>
    tradeFacts: Array<{ label: string; value: string }>
  }
  training: {
    courses: Array<{
      id: string
      name: string
      provider: string
      priorityLabel: 'Get first' | 'Useful next' | 'Later-stage'
      length?: string | null
      cost?: string | null
      modality?: string | null
      nextStart?: string | null
      rating?: string | null
      aid?: string | null
      sourceUrl?: string | null
      sourceType: SourceType
      sourceLabel: string
    }>
    costStack: Array<DashboardFallbackValue<string> & { label: string }>
    tradeFacts: Array<{ label: string; value: string }>
  }
  resources: {
    cards: Array<{
      title: string
      url: string
      domain: string
      sourceLabel: string
    }>
  }
  marketSnapshot: {
    entryWage: DashboardFallbackValue<string>
    midCareerSalary: DashboardFallbackValue<string>
    topEarners: DashboardFallbackValue<string>
    localDemand: DashboardFallbackValue<string>
    hiringRequirements: DashboardFallbackValue<string>
    wageSourceLabel: string
    demandSourceLabel: string
  }
  marketProof: {
    summary: string
    postingsCount: number | null
    baselineOnlyWarning: string | null
    requirements: Array<{
      label: string
      frequency: string
      evidence: string
      source: string
    }>
  }
  outreach: {
    intro: string
  }
  realityCheck: {
    applicationsNeeded: DashboardFallbackValue<string>
    timeToOffer: DashboardFallbackValue<string>
    competitionLevel: DashboardFallbackValue<string>
    financialTradeoff: DashboardFallbackValue<string>
  }
  checklist: {
    immediate: string[]
    shortTerm: string[]
    longTerm: string[]
    progressPercent: number
    nowCompletionPercent: number
    nextCompletionPercent: number
    blockedCompletionPercent: number
    reminderBadges: string[]
  }
  alternatives: {
    cards: PlannerDashboardAlternative[]
    compareA: PlannerDashboardAlternative
    compareB: PlannerDashboardAlternative
  }
  insights: {
    welcomeBack: {
      title: string
      bodyLines: string[]
      recommendedAction: string
    }
    aiInsight: {
      summary: string
      trendLabel: string
      trendStartPercent: number
      trendEndPercent: number
      bars: number[]
    }
  }
  stickyPanel: {
    transition: string
    difficulty: string
    timeline: string
    nextSteps: string[]
    nextBestAction: string
    progressToOffer: number
  }
  progress: {
    tasks: PlannerDashboardTask[]
    phases: PlannerDashboardPhaseProgress[]
    weightedPercent: number
    updatedAt: string | null
  }
  methodology: {
    scoreSummary: string
    sourceLines: string[]
  }
}

interface DashboardMapperInput {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  report: any | null
  plannerResult: PlannerResultView | null
  currentRole: string
  targetRole: string
  locationText: string
  timelineBucket: string
  skillsCount: number
  lastGeneratedAt: string | null
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, Math.round(value)))
}

function percentToDifficulty(score: number) {
  const normalized = clampPercent(score)
  const difficulty = 10 - normalized / 10
  return `${difficulty.toFixed(1)} / 10`
}

function fallbackTimeline(timelineBucket: string) {
  if (timelineBucket === 'immediate') return '0-1 month'
  if (timelineBucket === '1-3 months') return '1-3 months'
  if (timelineBucket === '3-6 months') return '3-6 months'
  if (timelineBucket === '6-12+ months') return '6-12 months'
  return '3-6 months'
}

function toReadableDate(iso: string | null) {
  if (!iso) return 'Just now'
  const parsed = new Date(iso)
  if (Number.isNaN(parsed.getTime())) return 'Just now'
  return parsed.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}

function toReadableShortDate(iso: string | null) {
  if (!iso) return 'Updated now'
  const parsed = new Date(iso)
  if (Number.isNaN(parsed.getTime())) return 'Updated now'
  return `Updated ${parsed.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric'
  })}`
}

function sentenceCase(value: string) {
  const cleaned = cleanGeneratedLabel(value).trim()
  if (!cleaned) return ''
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
}

function toStableTrainingId(value: string, fallbackIndex = 0) {
  const normalized = cleanGeneratedLabel(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return normalized ? `training-${normalized}` : `training-item-${fallbackIndex + 1}`
}

function inferCareerPathTypeFromReport(
  report:
    | {
        transitionMode?: {
          careerPathType?: string | null
          templateKey?: string | null
        } | null
        targetRequirements?: {
          education?: string | null
          certifications?: string[] | null
          hardGates?: string[] | null
          employerSignals?: string[] | null
          apprenticeshipHours?: number | null
        } | null
        suggestedCareers?: Array<{ title?: string | null }> | null
        careerPathwayProfile?: {
          meta?: {
            pathway_type?: string | null
            codes?: {
              trade_code?: string | null
            } | null
          } | null
        } | null
      }
    | null
    | undefined
): DashboardCareerPathType {
  const explicit = report?.transitionMode?.careerPathType
  if (
    explicit === 'TRADES' ||
    explicit === 'HEALTHCARE_LICENSED' ||
    explicit === 'PROFESSIONAL_LICENSED' ||
    explicit === 'TECH' ||
    explicit === 'GENERAL'
  ) {
    return explicit
  }

  const templateKey = report?.transitionMode?.templateKey
  if (templateKey === 'regulated_trade') return 'TRADES'
  if (templateKey === 'portfolio_role') return 'TECH'
  if (templateKey === 'regulated_profession') {
    const regulatedText = cleanGeneratedLabel(
      [
        report?.suggestedCareers?.[0]?.title,
        report?.targetRequirements?.education,
        ...(Array.isArray(report?.targetRequirements?.certifications) ? report.targetRequirements.certifications : []),
        ...(Array.isArray(report?.targetRequirements?.hardGates) ? report.targetRequirements.hardGates : []),
        ...(Array.isArray(report?.targetRequirements?.employerSignals) ? report.targetRequirements.employerSignals : [])
      ]
        .filter(Boolean)
        .join(' ')
    ).toLowerCase()

    if (
      /\b(nurse|licensed practical nurse|registered practical nurse|registered nurse|lpn|rpn|rn|clinical|patient care|nursing|cpnre|nclex)\b/.test(
        regulatedText
      )
    ) {
      return 'HEALTHCARE_LICENSED'
    }

    return 'PROFESSIONAL_LICENSED'
  }

  if (
    report?.careerPathwayProfile?.meta?.pathway_type === 'trade_apprenticeship' ||
    Boolean(report?.careerPathwayProfile?.meta?.codes?.trade_code) ||
    Boolean(report?.targetRequirements?.apprenticeshipHours)
  ) {
    return 'TRADES'
  }

  return 'GENERAL'
}

const PATHWAY_KEYWORDS: Record<PlannerPathwayWeightingType, RegExp[]> = {
  trades: [
    /\b(apprentice|sponsor|trade|certifying exam|red seal|journeyperson|journeyman|site|safety|hours|whmis|working at heights)\b/i
  ],
  tech: [
    /\b(code|software|stack|api|data|analytics|cloud|qa|cyber|system|it|devops)\b/i
  ],
  healthcare: [
    /\b(health|clinical|patient|nurse|licensure|registration|placement|care|medical|cpnre|nclex)\b/i
  ],
  creative: [
    /\b(portfolio|case study|design|ux|ui|brand|visual|creative|content|copy|illustration)\b/i
  ],
  corporate_operations: [
    /\b(operations|coordinator|stakeholder|process|workflow|reporting|admin|project|customer success|business)\b/i
  ]
}

function inferPathwayWeightingType(
  careerPathType: DashboardCareerPathType,
  targetRole: string,
  templateKey?: string | null
): PlannerPathwayWeightingType {
  if (careerPathType === 'TRADES') return 'trades'
  if (careerPathType === 'HEALTHCARE_LICENSED') return 'healthcare'
  if (careerPathType === 'TECH') {
    const creativeSignals = PATHWAY_KEYWORDS.creative.some((pattern) => pattern.test(targetRole))
    if (creativeSignals || templateKey === 'portfolio_role') return 'creative'
    return 'tech'
  }
  const creativeSignals = PATHWAY_KEYWORDS.creative.some((pattern) => pattern.test(targetRole))
  if (creativeSignals) return 'creative'
  return 'corporate_operations'
}

function pathwayWeightingLabel(type: PlannerPathwayWeightingType) {
  if (type === 'trades') return 'Trades'
  if (type === 'tech') return 'Tech'
  if (type === 'healthcare') return 'Healthcare'
  if (type === 'creative') return 'Creative'
  return 'Corporate/Operations'
}

function pathwayWeightingEmphasis(type: PlannerPathwayWeightingType) {
  if (type === 'trades') {
    return ['Entry-door roles', 'Safety and certifications', 'Hands-on proof']
  }
  if (type === 'tech') {
    return ['Practical skills', 'Project evidence', 'Bridge-role targeting']
  }
  if (type === 'healthcare') {
    return ['Prerequisites and licensing', 'Education sequence', 'Timeline realism']
  }
  if (type === 'creative') {
    return ['Portfolio quality', 'Case-study proof', 'Client-ready artifacts']
  }
  return ['Title translation', 'Transferable outcomes', 'Execution cadence']
}

function scorePathwayRelevance(value: string, pathwayType: PlannerPathwayWeightingType) {
  const normalized = cleanGeneratedLabel(value)
  if (!normalized) return 0
  const familyPatterns = PATHWAY_KEYWORDS[pathwayType]
  const familyScore = familyPatterns.reduce((score, pattern) => score + (pattern.test(normalized) ? 2 : 0), 0)
  const genericSignals = /\b(required|must|apply|interview|experience|proof|resume|portfolio|certification|education)\b/i
  return familyScore + (genericSignals.test(normalized) ? 1 : 0)
}

function rankContentByPathway(
  items: string[],
  pathwayType: PlannerPathwayWeightingType,
  limit: number
) {
  return uniqueNormalizedStrings(items)
    .map((item, index) => ({
      item,
      index,
      score: scorePathwayRelevance(item, pathwayType)
    }))
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score
      return left.index - right.index
    })
    .map((entry) => entry.item)
    .slice(0, limit)
}

function parseTimelineMidpointMonths(value: string) {
  const matches = value.match(/\d+/g)
  if (!matches || matches.length === 0) return Number.POSITIVE_INFINITY
  if (matches.length === 1) return Number.parseInt(matches[0], 10)
  const first = Number.parseInt(matches[0], 10)
  const second = Number.parseInt(matches[1], 10)
  return Math.round((first + second) / 2)
}

function parseSalaryUpperBound(value: string) {
  const matches = value.match(/\$?(\d{2,3})(?:[kK]|,\d{3})?/g)
  if (!matches || matches.length === 0) return 0
  const parsed = matches.map((chunk) => {
    const digits = chunk.replace(/[^\d]/g, '')
    if (!digits) return 0
    const numeric = Number.parseInt(digits, 10)
    return /k/i.test(chunk) || numeric < 1000 ? numeric * 1000 : numeric
  })
  return Math.max(...parsed)
}

function classifyRouteType(args: {
  careerPathType: DashboardCareerPathType
  templateKey?: string | null
  primaryRouteTitle?: string | null
  primaryRouteReason?: string | null
  primaryRouteFirstStep?: string | null
}): PlannerRouteType {
  const routeText = cleanGeneratedLabel(
    [args.primaryRouteTitle, args.primaryRouteReason, args.primaryRouteFirstStep].filter(Boolean).join(' ')
  ).toLowerCase()

  if (/\b(portfolio|case study|github|work sample|prototype|demo)\b/.test(routeText)) {
    return 'portfolio-first'
  }
  if (/\b(education|degree|diploma|school|program|prerequisite|admission)\b/.test(routeText)) {
    return 'education-first'
  }
  if (/\b(cert|certificate|certification|license|licens|registration|exam|ticket)\b/.test(routeText)) {
    return 'certification-first'
  }
  if (/\b(bridge|helper|assistant|support|adjacent|entry role|entry-level|entry level)\b/.test(routeText)) {
    return 'bridge-role'
  }
  if (/\b(direct|lateral|straight)\b/.test(routeText)) {
    return 'direct'
  }

  if (args.templateKey === 'portfolio_role') return 'portfolio-first'
  if (args.templateKey === 'credentialed_role') return 'certification-first'
  if (args.templateKey === 'regulated_profession') {
    return args.careerPathType === 'HEALTHCARE_LICENSED' ? 'education-first' : 'certification-first'
  }
  if (args.templateKey === 'regulated_trade') return 'bridge-role'
  if (args.templateKey === 'experience_ladder_role') return 'direct'

  if (args.careerPathType === 'TRADES') return 'bridge-role'
  if (args.careerPathType === 'HEALTHCARE_LICENSED') return 'education-first'
  if (args.careerPathType === 'TECH') return 'portfolio-first'
  return 'bridge-role'
}

function routeTypeLabel(routeType: PlannerRouteType) {
  return routeType
}

function deriveTransitionVerdict(compatibilityScore: number): 'Strong' | 'Possible' | 'Stretch' {
  if (compatibilityScore >= 70) return 'Strong'
  if (compatibilityScore >= 45) return 'Possible'
  return 'Stretch'
}

function normalizeLocalDemandLabel(summaryLine: string | null | undefined, location: string) {
  const raw = typeof summaryLine === 'string' ? cleanGeneratedLabel(summaryLine.trim()) : ''
  if (!raw) return 'Unknown - needs data source'

  const postingsMatch = raw.match(/(\d+)\s+recent postings in\s+(.+?)(?:\.|$)/i)
  if (postingsMatch) {
    // Title-case the location so "ontario, canada" renders as "Ontario, Canada".
    const place = postingsMatch[2].trim().replace(/\b([a-z])/g, (m) => m.toUpperCase())
    return `Based on ${postingsMatch[1]} recent postings in ${place}.`
  }

  if (raw.length <= 72) return raw
  return `Based on current employer evidence in ${location || 'your region'}.`
}

function normalizeRequirementTheme(value: string) {
  const cleaned = cleanGeneratedLabel(value)
    .replace(/\b(required|required for the role|required to apply|required to compete)\b/gi, '')
    .replace(/\b(employer evidence|market evidence)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
  return cleaned
}

function toCompactRequirementTheme(value: string) {
  const normalized = normalizeRequirementTheme(value).toLowerCase()
  if (!normalized) return ''
  if (/\b(licen|certif|registration|regulator|exam)\b/.test(normalized)) return 'Licensing + certification'
  if (/\b(clinical|placement|patient care|care)\b/.test(normalized)) return 'Clinical readiness'
  if (/\b(portfolio|case study|github|project)\b/.test(normalized)) return 'Portfolio + proof'
  if (/\b(apprentice|hours|journey|red seal|trade)\b/.test(normalized)) return 'Trade pathway steps'

  const tokens = normalized
    .split(/\s+/)
    .filter((token) => token.length > 2)
    .slice(0, 3)
  if (tokens.length === 0) return ''
  return tokens
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ')
}

function buildHiringRequirementsSummary(
  items: Array<{ label?: string }> | undefined,
  count: number
) {
  if (!Array.isArray(items) || items.length === 0 || count === 0) {
    return 'Add target posting or market evidence to surface requirement frequency'
  }

  const themes = uniqueNormalizedStrings(
    items
      .map((item) => toCompactRequirementTheme(String(item?.label ?? '')))
      .filter(Boolean)
  ).slice(0, 2)

  if (themes.length === 0) {
    return `${count} recurring hiring signals identified`
  }

  if (themes.length === 1) {
    return themes[0]
  }

  return `${themes[0]} + ${themes[1]}`
}

type StarterCertificationCandidate = {
  name: string
  sourceLabel: string
  sourceType: SourceType
  sourceUrl?: string | null
  provider: string
  cost?: string | null
}

const STARTER_CERTIFICATION_PATTERNS: Array<{
  pattern: RegExp
  name: string
}> = [
  { pattern: /\bwhmis\b/i, name: 'WHMIS' },
  { pattern: /\bworking at heights?\b/i, name: 'Working at Heights' },
  { pattern: /\b(first aid|standard first aid)\b/i, name: 'Standard First Aid' },
  { pattern: /\bcpr\b/i, name: 'CPR' },
  { pattern: /\bworker health and safety awareness\b/i, name: 'Worker Health and Safety Awareness' },
  { pattern: /\bfall protection\b/i, name: 'Fall Protection' },
  { pattern: /\b(lockout\s*tagout|loto)\b/i, name: 'Lockout Tagout (LOTO)' },
  { pattern: /\bconfined space\b/i, name: 'Confined Space Entry' },
  { pattern: /\b(elevated work platform|boom lift|scissor lift)\b/i, name: 'Elevated Work Platform' },
  { pattern: /\bcsts\b/i, name: 'CSTS' }
]

function collectStarterCertifications(args: {
  hardGates: string[]
  certifications: string[]
  marketRequirementLabels: string[]
  profileMustHave: Array<{ name?: string; details?: string }>
  profileNiceToHave: Array<{ name?: string; details?: string }>
  profileStarterBundle?: Array<{
    name?: string
    details?: string
    source_title?: string
    source_url?: string
    provider?: string
  }>
  sourceUrl?: string | null
}) {
  const extractCostHintFromText = (value: string | null | undefined) => {
    if (!value) return null
    const matches = [...value.matchAll(/\$([\d.]+)\s*([kK])?/g)]
    if (matches.length === 0) return null
    const numbers = matches
      .map((match) => {
        const raw = Number(match[1])
        if (!Number.isFinite(raw)) return null
        return match[2] ? raw * 1000 : raw
      })
      .filter((item): item is number => item !== null)
    if (numbers.length === 0) return null
    const min = Math.min(...numbers)
    const max = Math.max(...numbers)
    return formatCurrencyRange(min, max, 'CAD').replace(/^CA\$/i, '$')
  }

  const seen = new Set<string>()
  const output: StarterCertificationCandidate[] = []

  const starterBundle = Array.isArray(args.profileStarterBundle) ? args.profileStarterBundle : []
  for (const item of starterBundle) {
    const name = cleanGeneratedLabel(String(item?.name ?? '')).trim()
    if (!name) continue
    const key = name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    output.push({
      name,
      sourceLabel: cleanGeneratedLabel(String(item?.source_title ?? '')).trim() || 'Career pathway profile',
      sourceType: 'verified',
      sourceUrl: item?.source_url ?? args.sourceUrl ?? null,
      provider: cleanGeneratedLabel(String(item?.provider ?? '')).trim() || 'Official requirement source',
      cost: extractCostHintFromText(String(item?.details ?? '').trim())
    })
  }

  const rawSources: Array<{ text: string; sourceLabel: string; sourceType: SourceType }> = [
    ...args.hardGates.map((text) => ({
      text,
      sourceLabel: 'Target requirements',
      sourceType: 'verified' as const
    })),
    ...args.certifications.map((text) => ({
      text,
      sourceLabel: 'Target requirements',
      sourceType: 'verified' as const
    })),
    ...args.marketRequirementLabels.map((text) => ({
      text,
      sourceLabel: 'Employer evidence',
      sourceType: 'verified' as const
    })),
    ...args.profileMustHave.map((item) => ({
      text: `${String(item?.name ?? '')} ${String(item?.details ?? '')}`.trim(),
      sourceLabel: 'Career pathway profile',
      sourceType: 'verified' as const
    })),
    ...args.profileNiceToHave.map((item) => ({
      text: `${String(item?.name ?? '')} ${String(item?.details ?? '')}`.trim(),
      sourceLabel: 'Career pathway profile',
      sourceType: 'verified' as const
    }))
  ].filter((item) => item.text)

  for (const source of rawSources) {
    const normalizedSource = cleanGeneratedLabel(source.text)
    for (const candidate of STARTER_CERTIFICATION_PATTERNS) {
      if (!candidate.pattern.test(normalizedSource)) continue
      const key = candidate.name.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      output.push({
        name: candidate.name,
        sourceLabel: source.sourceLabel,
        sourceType: source.sourceType,
        sourceUrl: args.sourceUrl ?? null,
        provider: source.sourceLabel === 'Employer evidence' ? 'Employer evidence' : 'Official requirement source',
        cost: null
      })
    }
  }

  return output.slice(0, 3)
}

function isGenericTrainingCardName(value: string) {
  const normalized = cleanGeneratedLabel(value).toLowerCase()
  return /\b(curriculum|hours structure|pathway|requirements?|registration|official source|levels?)\b/.test(
    normalized
  )
}

function normalizeRoadmapActions(items: string[]) {
  if (items.length === 0) return ['No detailed actions captured yet.']
  return items.slice(0, 4)
}

function isLockedOrPlaceholderRoadmapAction(value: string) {
  const normalized = value.trim().toLowerCase()
  if (!normalized || normalized === '.' || normalized === '-' || normalized === 'â€¢') return true
  return /\b(upgrade to pro|unlock the full weekly action sequence|weekly action sequence)\b/.test(normalized)
}

function buildTimelineWindows(args: {
  windows: Array<{ label: string; actions: string[]; fallback: string[] }>
  pathwayWeightingType: PlannerPathwayWeightingType
}) {
  return args.windows.map((window) => {
    const rankedPrimary = rankContentByPathway(
      window.actions.filter((item) => !isLockedOrPlaceholderRoadmapAction(item)),
      args.pathwayWeightingType,
      3
    )
    const rankedFallback = rankContentByPathway(
      window.fallback.filter((item) => !isLockedOrPlaceholderRoadmapAction(item)),
      args.pathwayWeightingType,
      3
    )
    return {
      label: window.label,
      actions: rankedPrimary.length > 0 ? rankedPrimary : rankedFallback
    }
  })
}
function uniqueNormalizedStrings(values: string[]) {
  const seen = new Set<string>()
  const output: string[] = []
  for (const value of values) {
    const trimmed = value.trim()
    if (!trimmed) continue
    const key = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim()
    if (!key || seen.has(key)) continue
    seen.add(key)
    output.push(trimmed)
  }
  return output
}

function normalizedLabelKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim()
}

function removeOverlappingItems(source: string[], comparison: string[]) {
  const comparisonSet = new Set(comparison.map((item) => normalizedLabelKey(item)).filter(Boolean))
  return source.filter((item) => !comparisonSet.has(normalizedLabelKey(item)))
}

function toPracticalBlockerWhy({
  whyItMatters,
  roleTargetDisplay
}: {
  whyItMatters: string
  roleTargetDisplay: string
}) {
  const base = sanitizePlannerCopy(whyItMatters, 'GENERAL').trim()
  if (base.length >= 36 && /\b(hiring|screen|interview|shortlist|application|employer)\b/i.test(base)) {
    return base
  }
  return `Hiring teams screen this early for ${roleTargetDisplay}. Missing it usually reduces interview callbacks.`
}

function toPracticalBlockerFix({
  blocker,
  howToFix,
  pathwayWeightingType
}: {
  blocker: string
  howToFix: string
  pathwayWeightingType: PlannerPathwayWeightingType
}) {
  const normalizedBlocker = blocker.toLowerCase()
  const cleanedFix = sanitizePlannerCopy(howToFix, 'GENERAL').trim()
  const hasConcreteSignal =
    /\b(apply|book|complete|submit|build|create|document|add|rewrite|contact|call|email|register|schedule)\b/i.test(
      cleanedFix
    ) && cleanedFix.length >= 24

  if (hasConcreteSignal) return cleanedFix

  if (/\b(cert|certification|license|licen|registration|exam|ticket|safety)\b/.test(normalizedBlocker)) {
    return `Book this requirement now, complete it within 7-14 days, and add completion proof to your resume before your next applications.`
  }
  if (/\b(proof|portfolio|project|artifact|experience|sample)\b/.test(normalizedBlocker)) {
    return `Create one role-relevant work sample this week and attach it to resume bullets so employers can verify readiness.`
  }
  if (/\b(resume|application|interview|outreach)\b/.test(normalizedBlocker)) {
    return `Rewrite the top three application bullets for this requirement and send a targeted application batch this week.`
  }
  if (pathwayWeightingType === 'trades') {
    return `Complete one hands-on readiness step and one employer outreach step this week, then track both in your checklist.`
  }
  if (pathwayWeightingType === 'tech' || pathwayWeightingType === 'creative') {
    return `Build and publish one proof artifact, then apply to a focused batch of entry roles aligned to that evidence.`
  }
  return `Define one concrete action and one proof artifact for this blocker, then complete both in the next 14 days.`
}

function cleanGeneratedLabel(value: string) {
  return value
    .replace(/^skill already listed:\s*/i, '')
    .replace(/^credential:\s*/i, '')
    .replace(/\bproof builder\b/gi, 'readiness example')
    .replace(/\bproof artifact\b/gi, 'verification item')
    .replace(/\bproof project\b/gi, 'practical work sample')
    .replace(/\bproof\b/gi, 'readiness example')
    .replace(/\borcompletion\b/gi, 'or completion')
    .replace(/\bapplications applications\b/gi, 'applications')
    .replace(/\s+/g, ' ')
    .trim()
}

function sanitizePlannerCopy(value: string, careerPathType: DashboardCareerPathType) {
  const cleaned = cleanGeneratedLabel(value)
  if (careerPathType === 'TRADES') return cleaned

  return cleaned
    .replace(/\bunion apprenticeship\b/gi, 'entry pathway')
    .replace(/\bapprenticeship\b/gi, careerPathType === 'HEALTHCARE_LICENSED' ? 'training pathway' : 'entry pathway')
    .replace(/\b(sponsor-ready|sponsor)\s+employer(s)?\b/gi, 'target employer$2')
    .replace(/\bskilled trades ontario\b/gi, 'provincial regulator')
    .replace(/\bcertificate of qualification\b/gi, 'required licensing exam')
    .replace(/\bred seal\b/gi, 'required licensing exam')
    .replace(/\bjourneyperson\b|\bjourneyman\b/gi, 'fully qualified professional')
    .replace(/\btrade certification\b/gi, 'required certification')
    .replace(/\s+/g, ' ')
    .trim()
}

// Guard for short, user-facing claim phrases (strength advantages / why-it-matters).
// Rejects leaked posting prose and implausible experience numbers (e.g. "60 years
// of experience"), returning the safe fallback instead of shipping garbage.
function sanitizeShortClaim(value: string, fallback: string): string {
  const cleaned = (value || '').replace(/\s+/g, ' ').trim()
  if (!cleaned) return fallback
  const lower = cleaned.toLowerCase()
  const implausibleYears = /\b(\d{3,}|[3-9]\d)\s*\+?\s*years?\b/.test(lower) // >= 30 years
  const postingProse =
    /\b(we have provided|we provide|we offer|benefit programs?|our team|you will receive|supplemental)\b/.test(lower)
  const tooLong = cleaned.length > 180 || cleaned.split(/\s+/).length > 28
  if (implausibleYears || postingProse || tooLong) return fallback
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
}

// Sentence-case a label's first letter without disturbing acronyms in the rest
// (e.g. "analyze data" -> "Analyze data", "SQL reporting" stays "SQL reporting").
function capitalizeFirst(value: string): string {
  const v = (value || '').trim()
  if (!v) return v
  return v.charAt(0).toUpperCase() + v.slice(1)
}

// Skill-gap / transferable labels occasionally pick up leaked job-posting prose
// ("Create value at TC Transcontinental, we've got it made…") or implausible
// numbers. Keep concise, real skill phrases; otherwise fall back to a generic.
function sanitizeSkillLabel(value: string, fallback: string): string {
  const cleaned = (value || '').replace(/\s+/g, ' ').trim()
  if (!cleaned) return fallback
  const lower = cleaned.toLowerCase()
  const postingProse =
    /\b(we['’]ve|we have|we are|we['’]re|our team|join (us|our)|got it made|benefit programs?|supplemental|apply now|equal opportunity)\b/.test(
      lower
    )
  const implausibleYears = /\b(\d{3,}|[3-9]\d)\s*\+?\s*years?\b/.test(lower)
  const tooLong = cleaned.length > 160 || cleaned.split(/\s+/).length > 22
  if (postingProse || implausibleYears || tooLong) return fallback
  return capitalizeFirst(cleaned)
}

function inferPhaseOutcome(title: string, summary: string, actions: string[]) {
  const normalized = `${title} ${summary} ${actions.join(' ')}`.toLowerCase()
  if (/\b(cert|credential|course|license|licen|training|safety|exam)\b/.test(normalized)) {
    return 'Required training is underway and one role-relevant readiness example is ready.'
  }
  if (/\b(interview|outreach|apply|job search|follow-up|employer)\b/.test(normalized)) {
    return 'You have active employer conversations and a repeatable application rhythm.'
  }
  if (/\b(onboard|entry|field|first 30|60|90)\b/.test(normalized)) {
    return 'You have entered the field and know the first performance checkpoints.'
  }
  return 'You have enough verified progress and clarity to unlock the next phase.'
}

function toRoleDisplay(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .map((token) => {
      if (!token) return token
      if (/^[A-Z0-9/()+-]+$/.test(token)) return token
      const normalized = token.toLowerCase()
      return normalized.charAt(0).toUpperCase() + normalized.slice(1)
    })
    .join(' ')
}

function toCanonicalRoleDisplay(value: string) {
  const normalized = value.trim().toLowerCase()
  if (normalized === 'apprentice electrician') return 'Electrician (309A)'
  if (normalized === 'electrician construction and maintenance') return 'Electrician (309A)'
  if (normalized === 'industrial electrician') return 'Industrial Electrician (442A)'
  if (normalized === 'apprentice plumber' || normalized === 'plumber') return 'Plumber (306A)'
  if (normalized === 'general carpenter' || normalized === 'carpenter') return 'General Carpenter (403A)'
  return toRoleDisplay(value)
}

type TradeTargetStage = 'entry' | 'apprentice' | 'licensed' | 'general'

function inferTradeTargetStage(value: string): TradeTargetStage {
  const normalized = cleanGeneratedLabel(value).toLowerCase()
  if (/(journeyperson|journeyman|licensed|red seal|master)/.test(normalized)) return 'licensed'
  if (/(pre-apprentice|helper|labourer|laborer|entry[\s-]?level)/.test(normalized)) return 'entry'
  if (/apprentice/.test(normalized)) return 'apprentice'
  return 'general'
}

function buildMappedTradePathLabel(args: {
  profile: NonNullable<DashboardMapperInput['report']>['careerPathwayProfile'] | null | undefined
  fallbackCanonicalRole: string
  fallbackTradeCode?: string | null
}) {
  const tradeCode = cleanGeneratedLabel(
    String(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((args.profile as any)?.meta?.codes?.trade_code as string | null | undefined) ??
        args.fallbackTradeCode ??
        ''
    )
  )
    .trim()
    .toUpperCase()
  const fallback = tradeCode
    ? `${args.fallbackCanonicalRole.replace(/\s+\([^)]+\)$/g, '').trim()} (${tradeCode})`
    : args.fallbackCanonicalRole
  const rawTitle = cleanGeneratedLabel(
    String(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((args.profile as any)?.meta?.title as string | null | undefined) ?? ''
    )
  )
    .replace(/\s*-\s*(Ontario|Canada)\s*$/i, '')
    .trim()

  if (!rawTitle) return fallback

  const multiParenMatch = rawTitle.match(/^(.+?)\s+\(([^)]+)\)\s+\(([^)]+)\)$/)
  if (multiParenMatch) {
    const code = multiParenMatch[3].trim().toUpperCase()
    if (code) return `${multiParenMatch[1].trim()} (${code})`
  }

  const singleParenMatch = rawTitle.match(/^(.+?)\s+\(([^)]+)\)$/)
  if (singleParenMatch) {
    const code = singleParenMatch[2].trim().toUpperCase()
    if (/^\d+[A-Z]?$/i.test(code)) return `${singleParenMatch[1].trim()} (${code})`
  }

  if (tradeCode && !rawTitle.includes(`(${tradeCode})`)) {
    return `${rawTitle} (${tradeCode})`
  }

  return rawTitle
}

function formatListForSentence(values: string[]) {
  if (values.length === 0) return ''
  if (values.length === 1) return values[0]
  if (values.length === 2) return `${values[0]} or ${values[1]}`
  return `${values.slice(0, -1).join(', ')}, or ${values[values.length - 1]}`
}

function buildEntryBridgeAction(args: {
  isTradeApprenticeship: boolean
  whoHires: string[]
  entryRoles: string[]
  targetDisplayRole: string
}) {
  if (args.isTradeApprenticeship) {
    if (args.entryRoles.length > 0) {
      return `Bridge through entry roles such as ${formatListForSentence(args.entryRoles.slice(0, 3))}.`
    }
    if (args.whoHires.length > 0) {
      return `Bridge through helper or apprentice-entry work with ${formatListForSentence(
        args.whoHires.slice(0, 3)
      )}.`
    }
    return `Bridge through helper or apprentice-entry work before aiming for the full ${args.targetDisplayRole} pathway.`
  }

  return `Bridge through adjacent entry-level work before aiming for the full ${args.targetDisplayRole} role.`
}

function extractCertificationName(value: string) {
  const cleaned = cleanGeneratedLabel(value).trim()
  for (const candidate of STARTER_CERTIFICATION_PATTERNS) {
    if (candidate.pattern.test(cleaned)) return candidate.name
  }
  return cleaned
}

function actionifyRequirement(args: {
  value: string
  targetDisplayRole: string
  locationText: string
  careerPathType: DashboardCareerPathType
  isTradeApprenticeship: boolean
  whoHires: string[]
  entryRoles: string[]
}) {
  const cleaned = sanitizePlannerCopy(args.value, args.careerPathType).trim()
  if (!cleaned) return ''
  const normalized = cleaned.toLowerCase()

  if (/(experience|years? of .*experience|role-relevant experience)/.test(normalized)) {
    return buildEntryBridgeAction({
      isTradeApprenticeship: args.isTradeApprenticeship,
      whoHires: args.whoHires,
      entryRoles: args.entryRoles,
      targetDisplayRole: args.targetDisplayRole
    })
  }

  if (/(register|apprenticeship agreement|training agreement|skilled trades ontario)/.test(normalized)) {
    if (args.isTradeApprenticeship) {
      return `Secure sponsorship and register the apprenticeship pathway in ${
        args.locationText || 'your province'
      }.`
    }
    return args.careerPathType === 'HEALTHCARE_LICENSED'
      ? `Confirm registration steps with the provincial nursing or healthcare regulator in ${
          args.locationText || 'your province'
        }.`
      : `Confirm required registration steps with the relevant regulator in ${
          args.locationText || 'your province'
        }.`
  }

  if (/(certificate of qualification|red seal|certifying exam|qualification exam|\bexam\b)/.test(normalized)) {
    if (args.isTradeApprenticeship) {
      return 'Plan for the Certificate of Qualification / Red Seal exam after the required hours and school levels are complete.'
    }
    return args.careerPathType === 'HEALTHCARE_LICENSED'
      ? 'Prepare for the required licensing exam and final regulator registration step.'
      : 'Prepare for the required certification or licensing exam before broad applications.'
  }

  if (/(hours|on-the-job|in-school|school levels|curriculum)/.test(normalized)) {
    return args.isTradeApprenticeship
      ? 'Confirm the on-the-job hour target and in-school training levels before you commit to the pathway.'
      : args.careerPathType === 'HEALTHCARE_LICENSED'
        ? `Confirm clinical placement hours and supervised training requirements before applying broadly to ${args.targetDisplayRole} roles.`
      : `Confirm the required training sequence before you apply broadly to ${args.targetDisplayRole} roles.`
  }

  if (/(license|licensing|certification requirements|regional licensing)/.test(normalized)) {
    return `Confirm licensing and certification requirements in ${args.locationText || 'your province'} before applying broadly.`
  }

  if (
    /(whmis|working at heights|first aid|cpr|worker health and safety awareness|fall protection|lockout|loto|confined space|elevated work platform|csts)/.test(
      normalized
    )
  ) {
    return `Complete ${extractCertificationName(cleaned)} if it appears in target employer requirements.`
  }

  if (/(plc|controls|wiring|motor|hydraulic|pneumat|automation|maintenance)/.test(normalized)) {
    return `Build supervised exposure to ${cleaned.toLowerCase()} through starter training or adjacent entry work.`
  }

  return sentenceCase(sanitizePlannerCopy(cleaned, args.careerPathType))
}

function summarizeGapAction(args: {
  gapLabel: string
  targetDisplayRole: string
  locationText: string
  careerPathType: DashboardCareerPathType
  isTradeApprenticeship: boolean
  whoHires: string[]
  entryRoles: string[]
}) {
  return actionifyRequirement({
    value: args.gapLabel,
    targetDisplayRole: args.targetDisplayRole,
    locationText: args.locationText,
    careerPathType: args.careerPathType,
    isTradeApprenticeship: args.isTradeApprenticeship,
    whoHires: args.whoHires,
    entryRoles: args.entryRoles
  })
}

function buildTradeEvidenceFallback(args: {
  locationText: string
  whoHires: string[]
  entryRoles: string[]
  apprenticeshipHours?: number | null
}) {
  const provinceText = args.locationText?.trim() || 'Ontario'
  const employerTargets =
    args.whoHires.length > 0 ? formatListForSentence(args.whoHires.slice(0, 3)) : 'sponsor-ready trade employers'
  const entryTargets =
    args.entryRoles.length > 0
      ? formatListForSentence(args.entryRoles.slice(0, 3))
      : 'helper, labourer, or apprentice-entry openings'

  return [
    `Target ${entryTargets} with ${employerTargets}.`,
    `Secure sponsorship and register the apprenticeship pathway in ${provinceText}.`,
    'Complete the starter safety certifications employers screen for first.',
    args.apprenticeshipHours && Number.isFinite(args.apprenticeshipHours)
      ? `Plan for ${formatHours(args.apprenticeshipHours)} of apprenticeship training and in-school levels.`
      : 'Plan for the apprenticeship work-and-school rotation before qualification.'
  ]
}

function formatHours(value: number | null | undefined) {
  if (!value || !Number.isFinite(value)) return null
  return `${value.toLocaleString()} hours`
}

function formatQualificationWindow(profile: DashboardMapperInput['report']['careerPathwayProfile'] | null | undefined) {
  const minMonths = profile?.timeline?.time_to_full_qualification?.min_months
  const maxMonths = profile?.timeline?.time_to_full_qualification?.max_months
  if (
    typeof minMonths !== 'number' ||
    typeof maxMonths !== 'number' ||
    !Number.isFinite(minMonths) ||
    !Number.isFinite(maxMonths)
  ) {
    return null
  }

  const minYears = minMonths / 12
  const maxYears = maxMonths / 12
  if (Math.abs(minYears - Math.round(minYears)) < 0.01 && Math.abs(maxYears - Math.round(maxYears)) < 0.01) {
    return formatUnitRange(Math.round(minYears), Math.round(maxYears), 'year')
  }

  return formatUnitRange(minMonths, maxMonths, 'month')
}

// Render a numeric range, collapsing equal bounds ("12-12 months" -> "12 months")
// and pluralizing the single-value case correctly.
function formatUnitRange(min: number, max: number, unit: 'month' | 'year') {
  const lo = Math.min(min, max)
  const hi = Math.max(min, max)
  if (lo === hi) return `${lo} ${unit}${lo === 1 ? '' : 's'}`
  return `${lo}-${hi} ${unit}s`
}

function trainingPriorityLabel(args: {
  name: string
  sourceType: SourceType
  fromStarterBundle: boolean
  employableWindow: string | null
}) {
  const normalized = cleanGeneratedLabel(args.name).toLowerCase()
  if (args.fromStarterBundle) return 'Get first' as const
  if (/(whmis|working at heights|first aid|cpr|worker health and safety awareness|fall protection|lockout|loto|confined space|elevated work platform|csts)/.test(normalized)) {
    return 'Get first' as const
  }
  if (/(school|level|curriculum|apprenticeship|qualification|red seal|certificate of qualification|journey|journeyperson|exam)/.test(normalized)) {
    return 'Later-stage' as const
  }
  if (args.sourceType === 'estimate' && !args.employableWindow) return 'Later-stage' as const
  return 'Useful next' as const
}

function buildResourcesCards(args: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  report: any | null
  pathwayProfile: DashboardMapperInput['report']['careerPathwayProfile'] | null | undefined
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  trainingCourses: Array<any>
}) {
  const cards: Array<{ title: string; url: string; domain: string; sourceLabel: string }> = []
  const seen = new Set<string>()

  const pushCard = (title: string, url: string | null | undefined, sourceLabel: string) => {
    const cleanUrl = typeof url === 'string' ? url.trim() : ''
    if (!cleanUrl || seen.has(cleanUrl)) return
    seen.add(cleanUrl)
    cards.push({
      title: cleanGeneratedLabel(title) || 'Resource',
      url: cleanUrl,
      domain: providerNameFromUrl(cleanUrl),
      sourceLabel
    })
  }

  const reportLinks = Array.isArray(args.report?.linksResources) ? args.report.linksResources : []
  reportLinks.forEach((link: { label?: string; url?: string; type?: string }) => {
    pushCard(link?.label ?? 'Resource', link?.url ?? null, link?.type === 'official' ? 'Official pathway source' : 'Curated pathway source')
  })

  const profileOfficial = Array.isArray(args.pathwayProfile?.resources?.official)
    ? args.pathwayProfile.resources.official
    : []
  profileOfficial.forEach((link: { title?: string; url?: string }) => {
    pushCard(link?.title ?? 'Official pathway guidance', link?.url ?? null, 'Official pathway source')
  })

  const profileTraining = Array.isArray(args.pathwayProfile?.resources?.training)
    ? args.pathwayProfile.resources.training
    : []
  profileTraining.forEach((link: { title?: string; url?: string }) => {
    pushCard(link?.title ?? 'Training directory', link?.url ?? null, 'Training source')
  })

  const profileJobSearch = Array.isArray(args.pathwayProfile?.resources?.job_search)
    ? args.pathwayProfile.resources.job_search
    : []
  profileJobSearch.forEach((link: { title?: string; url?: string }) => {
    pushCard(link?.title ?? 'Job search source', link?.url ?? null, 'Employer or market source')
  })

  args.trainingCourses.forEach((course: { name?: string; sourceUrl?: string | null; sourceLabel?: string }) => {
    pushCard(course?.name ?? 'Training source', course?.sourceUrl ?? null, course?.sourceLabel ?? 'Training source')
  })

  return cards.slice(0, 3)
}

function salaryRangeToLabel(low: number | null | undefined, high: number | null | undefined, currency: string) {
  if (typeof low !== 'number' || typeof high !== 'number' || !Number.isFinite(low) || !Number.isFinite(high)) {
    return null
  }
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0
  })
  const normLow = normalizeHourlyCompensation(low)
  const normHigh = normalizeHourlyCompensation(high)
  const lowLabel = formatter.format(normLow).replace(/^CA\$/i, '$')
  const highLabel = formatter.format(normHigh).replace(/^CA\$/i, '$')
  // Collapse equal (or inverted) bounds so we never render "$67-$67/hr".
  if (Math.round(normLow) >= Math.round(normHigh)) return `${lowLabel}/hr`
  return `${lowLabel}-${highLabel}/hr`
}

function hourlyValueToLabel(value: number | null | undefined, currency: string) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0
  })
  return `${formatter.format(normalizeHourlyCompensation(value)).replace(/^CA\$/i, '$')}/hr`
}

function formatCurrencyRange(min: number, max: number, currency: string) {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0
  })
  return `${formatter.format(min)}-${formatter.format(max)}`
}

function normalizeHourlyCompensation(value: number) {
  if (!Number.isFinite(value)) return value
  return value > 250 ? Number((value / 2080).toFixed(1)) : value
}

const PROVINCE_CODE_BY_NAME: Array<{ code: string; match: RegExp }> = [
  { code: 'ON', match: /\bontario\b/i },
  { code: 'BC', match: /\bbritish columbia\b/i },
  { code: 'AB', match: /\balberta\b/i },
  { code: 'SK', match: /\bsaskatchewan\b/i },
  { code: 'MB', match: /\bmanitoba\b/i },
  { code: 'QC', match: /\bquebec\b/i },
  { code: 'NB', match: /\bnew brunswick\b/i },
  { code: 'NS', match: /\bnova scotia\b/i },
  { code: 'PE', match: /\bprince edward island\b/i },
  { code: 'NL', match: /\bnewfoundland\b|\blabrador\b/i },
  { code: 'YT', match: /\byukon\b/i },
  { code: 'NT', match: /\bnorthwest territories\b/i },
  { code: 'NU', match: /\bnunavut\b/i }
]

function inferProvinceCode(locationText: string) {
  for (const candidate of PROVINCE_CODE_BY_NAME) {
    if (candidate.match.test(locationText)) return candidate.code
  }
  return null
}

function providerNameFromUrl(url: string) {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./i, '')
    const parts = hostname.split('.')
    const base = parts.length >= 2 ? parts[0] : hostname
    return base.replace(/-/g, ' ').replace(/\b\w/g, (match) => match.toUpperCase())
  } catch {
    return 'Official provider listing'
  }
}

function buildTradeFastestPath(args: {
  profile: NonNullable<DashboardMapperInput['report']>['careerPathwayProfile']
  targetDisplayRole: string
  locationText: string
  examRequired: boolean
  apprenticeshipHours: number | null
  stage: TradeTargetStage
  entryRoles: string[]
}) {
  const entryPath = Array.isArray(args.profile?.entry_paths) ? args.profile.entry_paths[0] : null
  const timelinePhases = Array.isArray(args.profile?.timeline?.phases) ? args.profile.timeline.phases : []
  const mustHave = Array.isArray(args.profile?.requirements?.must_have)
    ? args.profile.requirements.must_have
    : []
  const niceToHave = Array.isArray(args.profile?.requirements?.nice_to_have)
    ? args.profile.requirements.nice_to_have
    : []
  const whoHires = Array.isArray(args.profile?.snapshot?.who_hires)
    ? args.profile.snapshot.who_hires.filter(Boolean)
    : []
  const entrySteps = (entryPath?.steps ?? []).map((step: string) => sentenceCase(step)).filter(Boolean)
  const apprenticeshipLoopPhase = timelinePhases.find((phase: { phase: string }) =>
    /(training|apprenticeship|school)/i.test(String(phase.phase ?? ''))
  )
  const qualificationPhase = timelinePhases.find((phase: { phase: string }) =>
    /(credential|qualification|exam|cert)/i.test(String(phase.phase ?? ''))
  )
  const startPhase = timelinePhases.find((phase: { phase: string }) => /(start|entry|sponsor)/i.test(String(phase.phase ?? '')))
  const startMilestones = Array.isArray(startPhase?.milestones) ? startPhase.milestones : []
  const sponsorStep =
    entrySteps.find((step: string) => /(sponsor|contractor|union shop|employer)/i.test(step)) ||
    (whoHires.length > 0
      ? `Target sponsor-ready employers such as ${whoHires.slice(0, 3).join(', ')}.`
      : `Secure an employer willing to sponsor your ${args.targetDisplayRole} entry path.`)
  const registrationDetail =
    entrySteps.find((step: string) => /(register|agreement|skilled trades ontario|training agreement)/i.test(step)) ||
    mustHave
      .map((item: { details?: string; name?: string }) => sentenceCase(String(item?.details || item?.name || '')))
      .find((step: string) => /(skilled trades ontario|register|training agreement|apprenticeship)/i.test(step)) ||
    `Register the apprenticeship pathway in ${args.locationText || 'your province'} once sponsorship is secured.`
  const loopDetail =
    entrySteps.find((step: string) => /(hour|on-the-job|school|in-school|level)/i.test(step)) ||
    apprenticeshipLoopPhase?.milestones
      ?.map((item: { done_when?: string; title?: string }) => sentenceCase(item.done_when || item.title || ''))
      .filter(Boolean)
      .slice(0, 2)
      .join(' ') ||
    (args.apprenticeshipHours
      ? `Accumulate ${args.apprenticeshipHours.toLocaleString()} apprenticeship hours while completing each required in-school training level.`
      : 'Accumulate on-the-job hours while completing each in-school training level.')
  const qualificationDetail =
    qualificationPhase?.milestones?.[0]
      ? sentenceCase(qualificationPhase.milestones[0].done_when || qualificationPhase.milestones[0].title)
      : args.examRequired
        ? 'Write the Certificate of Qualification / Red Seal exam after the required hours and school levels are complete.'
        : 'Complete the final qualification milestone once your apprenticeship hours and school levels are complete.'
  const entryRouteDetail =
    startMilestones
      .map((item: { done_when?: string; title?: string }) => sentenceCase(item.done_when || item.title || ''))
      .find((detail: string) => /(helper|apprentice|entry|offer)/i.test(detail)) ||
    (args.entryRoles.length > 0
      ? `Start by targeting entry roles such as ${formatListForSentence(args.entryRoles.slice(0, 3))}.`
      : whoHires.length > 0
      ? `Start by targeting apprentice-entry roles with ${whoHires.slice(0, 3).join(', ')}.`
      : `Start by targeting apprentice-entry employers for ${args.targetDisplayRole} in ${args.locationText || 'your province'}.`)

  const fastestSteps = [
    { label: 'Entry Route', detail: entryRouteDetail },
    { label: 'Sponsorship', detail: sponsorStep },
    { label: 'Registration', detail: registrationDetail },
    { label: 'Apprenticeship Loop', detail: loopDetail }
  ]

  const requirementNames = mustHave
    .map((item: { name: string }) => sentenceCase(item.name))
    .filter(Boolean)
  const supportNames = niceToHave
    .map((item: { name: string }) => sentenceCase(item.name))
    .filter(Boolean)

  const strongestSteps: Array<{ label: string; detail: string }> = []

  if (supportNames.length > 0) {
    strongestSteps.push({
      label: 'Starter Certifications',
      detail: `Complete the common entry credentials employers ask for first: ${supportNames
        .slice(0, 2)
        .join('; ')}.`
    })
  }

  if (whoHires.length > 0) {
    strongestSteps.push({
      label: 'Sponsor-Ready Employers',
      detail: `Focus first on sponsor-ready employers such as ${whoHires.slice(0, 3).join(', ')}.`
    })
  }

  if (requirementNames.length > 0 || registrationDetail) {
    strongestSteps.push({
      label: 'Registration Requirements',
      detail:
        requirementNames.length > 0
          ? `Confirm the formal apprenticeship requirements for ${args.targetDisplayRole} in ${
              args.locationText || 'your province'
            }: ${requirementNames.slice(0, 2).join('; ')}.`
          : registrationDetail
    })
  }

  if (apprenticeshipLoopPhase?.milestones?.length || args.apprenticeshipHours) {
    strongestSteps.push({
      label: 'Hours And School',
      detail: loopDetail
    })
  }

  if (args.examRequired || qualificationPhase?.milestones?.length) {
    strongestSteps.push({
      label: 'Qualification',
      detail: qualificationDetail
    })
  }

  const headline =
    args.stage === 'licensed'
      ? 'Ontario trade qualification path'
      : args.stage === 'apprentice'
        ? 'Ontario apprenticeship path from sponsorship to qualification'
        : 'Ontario trade entry path'

  return {
    headline,
    fastestSteps: fastestSteps.slice(0, 4),
    strongestSteps: strongestSteps.slice(0, 4)
  }
}

function parseCostRange(value: string | null | undefined) {
  if (!value) return null
  const matches = [...value.matchAll(/\$([\d.]+)\s*([kK])?/g)]
  if (matches.length === 0) return null
  const numbers = matches
    .map((match) => {
      const raw = Number(match[1])
      if (!Number.isFinite(raw)) return null
      return match[2] ? raw * 1000 : raw
    })
    .filter((value): value is number => value !== null)

  if (numbers.length === 0) return null
  const min = Math.min(...numbers)
  const max = Math.max(...numbers)
  return { min, max }
}

function pushIfMissing(missingFields: string[], path: string, isMissing: boolean) {
  if (isMissing) {
    missingFields.push(path)
  }
}

function toTaskId(phaseId: string, label: string, index: number) {
  const slug = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)

  return `${phaseId}-${index}-${slug || 'task'}`
}

const TASK_CATEGORY_META: Record<PlannerTaskCategory, { weight: number }> = {
  now: { weight: 6 },
  next: { weight: 4 },
  blocked: { weight: 3 }
}

function categoryForTaskIndex(index: number): PlannerTaskCategory {
  if (index === 0) return 'now'
  if (index === 1) return 'next'
  return 'blocked'
}

export function buildPlannerDashboardV3Model(input: DashboardMapperInput): PlannerDashboardV3Model {
  const missingFields: string[] = []
  if (!input.report) {
    missingFields.push('report')
  }

  const roleCurrentRaw = input.currentRole.trim() || 'Current role'
  const roleTargetRaw =
    input.targetRole.trim() || input.report?.suggestedCareers?.[0]?.title || 'Target role'
  const roleCurrent = toRoleDisplay(roleCurrentRaw)
  const roleTargetDisplay = toRoleDisplay(roleTargetRaw)
  const roleTargetCanonical = toCanonicalRoleDisplay(roleTargetRaw)
  const tradeTargetStage = inferTradeTargetStage(roleTargetRaw)
  const transitionLabel = `${roleCurrent} -> ${roleTargetDisplay}`

  const compatibilityScore =
    typeof input.report?.compatibilitySnapshot?.score === 'number'
      ? clampPercent(input.report.compatibilitySnapshot.score)
      : clampPercent(input.plannerResult?.score ?? 50)

  pushIfMissing(
    missingFields,
    'hero.difficulty',
    typeof input.report?.transitionMode?.difficulty?.score !== 'number'
  )
  pushIfMissing(
    missingFields,
    'hero.timeline',
    typeof input.report?.transitionMode?.timeline?.minMonths !== 'number' ||
      typeof input.report?.transitionMode?.timeline?.maxMonths !== 'number'
  )

  const difficultyLabel =
    typeof input.report?.transitionMode?.difficulty?.score === 'number'
      ? `${input.report.transitionMode.difficulty.score.toFixed(1)} / 10`
      : percentToDifficulty(compatibilityScore)

  const timelineLabel =
    typeof input.report?.transitionMode?.timeline?.minMonths === 'number' &&
    typeof input.report?.transitionMode?.timeline?.maxMonths === 'number'
      ? formatUnitRange(
          input.report.transitionMode.timeline.minMonths,
          input.report.transitionMode.timeline.maxMonths,
          'month'
        )
      : fallbackTimeline(input.timelineBucket)

  const primaryCareer = input.report?.suggestedCareers?.[0]
  const nativeSalary = primaryCareer?.salary?.native
  const pathwayProfile = input.report?.careerPathwayProfile
  const selectedProvince = inferProvinceCode(input.locationText)
  const pathwayProvinceWage =
    Array.isArray(pathwayProfile?.wages_by_province) && selectedProvince
      ? pathwayProfile.wages_by_province.find(
          (item: { province?: string | null }) => String(item?.province ?? '').toUpperCase() === selectedProvince
        ) ?? null
      : null
  const effectiveWageSource = nativeSalary
    ? {
        currency: nativeSalary.currency,
        low: nativeSalary.low,
        median: nativeSalary.median,
        high: nativeSalary.high,
        sourceName: nativeSalary.sourceName,
        asOfDate: nativeSalary.asOfDate
      }
    : pathwayProvinceWage
      ? {
          currency: 'CAD',
          low: pathwayProvinceWage.low_hourly_cad,
          median: pathwayProvinceWage.median_hourly_cad,
          high: pathwayProvinceWage.high_hourly_cad,
          sourceName: pathwayProvinceWage.source,
          asOfDate: pathwayProfile?.meta?.last_verified ?? input.lastGeneratedAt ?? undefined
        }
      : null
  const salaryCurrency = effectiveWageSource?.currency === 'CAD' ? 'CAD' : 'USD'
  // Hero "starting salary" is the entry band (low–median), never the full low–high
  // range — $high is the top-earner figure, not what a beginner starts at.
  const salaryPotential = salaryRangeToLabel(effectiveWageSource?.low, effectiveWageSource?.median, salaryCurrency)
  const entryWage = salaryRangeToLabel(effectiveWageSource?.low, effectiveWageSource?.median, salaryCurrency)
  // Mid-career is a distinct band (median–high), not just the median repeated.
  const midWage =
    salaryRangeToLabel(effectiveWageSource?.median, effectiveWageSource?.high, salaryCurrency) ??
    hourlyValueToLabel(effectiveWageSource?.median, salaryCurrency)
  const topEarners = hourlyValueToLabel(effectiveWageSource?.high, salaryCurrency)

  pushIfMissing(missingFields, 'market.entry_wage', !entryWage)
  pushIfMissing(missingFields, 'market.mid_salary', !midWage)
  pushIfMissing(missingFields, 'market.top_earners', !topEarners)

  const difficultyBreakdownSource = input.report?.compatibilitySnapshot?.breakdown
  const hasDifficultyBreakdownSource = Boolean(difficultyBreakdownSource)
  const difficultyItems = [
    {
      label: 'Skill Gap',
      score: clampPercent(
        (typeof difficultyBreakdownSource?.skill_overlap === 'number'
          ? difficultyBreakdownSource.skill_overlap * 2.85
          : compatibilityScore) as number
      )
    },
    {
      label: 'Education Gap',
      score: clampPercent(
        (typeof difficultyBreakdownSource?.education_alignment === 'number'
          ? difficultyBreakdownSource.education_alignment * 5
          : compatibilityScore - 8) as number
      )
    },
    {
      label: 'Hiring Barrier',
      score: clampPercent(
        (typeof difficultyBreakdownSource?.certification_gap === 'number'
          ? difficultyBreakdownSource.certification_gap * 5
          : compatibilityScore - 12) as number
      )
    },
    {
      label: 'Market Demand',
      score: clampPercent(
        (typeof difficultyBreakdownSource?.timeline_feasibility === 'number'
          ? difficultyBreakdownSource.timeline_feasibility * 6.6
          : compatibilityScore - 5) as number
      )
    },
    {
      label: 'Experience Requirement',
      score: clampPercent(
        (typeof difficultyBreakdownSource?.experience_similarity === 'number'
          ? difficultyBreakdownSource.experience_similarity * 5
          : compatibilityScore - 10) as number
      )
    }
  ]

  pushIfMissing(missingFields, 'difficulty.breakdown', !difficultyBreakdownSource)

  const transferableStrengths =
    (input.report?.transitionSections?.transferableStrengths as Array<{ label?: string }> | undefined)
      ?.map((item) => cleanGeneratedLabel(String(item.label ?? '').trim()))
      .filter(Boolean)
      .filter((label) => label.length >= 3)
      .slice(0, 8) ?? []

  const skillGaps =
    (input.report?.skillGaps as Array<{ skillName?: string; gapLevel?: string }> | undefined)
      ?.map((item) => ({
        label: cleanGeneratedLabel(String(item.skillName ?? '').trim()),
        progress: item.gapLevel === 'met' ? 85 : item.gapLevel === 'partial' ? 55 : 25
      }))
      .filter((item) => item.label.length > 0)
      .slice(0, 8) ?? []

  pushIfMissing(missingFields, 'skills.transferable', transferableStrengths.length === 0)
  pushIfMissing(missingFields, 'skills.required', skillGaps.length === 0)

  const transferable =
    uniqueNormalizedStrings(transferableStrengths).length > 0
      ? uniqueNormalizedStrings(transferableStrengths).slice(0, 5).map((label, index) => ({
          label: sanitizeSkillLabel(label, 'Relevant transferable strength'),
          progress: 78 - index * 8
        }))
      : [
          { label: 'Operational reliability', progress: 72 },
          { label: 'Safety discipline', progress: 68 },
          { label: 'Team coordination', progress: 64 }
        ]

  const required =
    skillGaps.length > 0
      ? uniqueNormalizedStrings(skillGaps.map((item) => item.label)).slice(0, 5).map((label, index) => ({
          label: sanitizeSkillLabel(label, 'Role-relevant technical skill'),
          progress: skillGaps.find((item) => item.label === label)?.progress ?? Math.max(25, 55 - index * 10)
        }))
        : [
          { label: 'Role-specific technical fundamentals', progress: 30 },
          { label: 'Credential-aligned safety evidence', progress: 35 },
          { label: 'Employer-ready work samples', progress: 40 }
        ]

  const careerPathType = inferCareerPathTypeFromReport(input.report)

  const roadmapFromGuide = Array.isArray(input.report?.transitionMode?.roadmapGuide?.phases)
    ? input.report.transitionMode.roadmapGuide.phases
    : []

  const roadmapPhases: PlannerDashboardRoadmapPhase[] =
    roadmapFromGuide.length > 0
      ? roadmapFromGuide.slice(0, 4).map((
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          phase: any,
          index: number
        ) => ({
          id: `phase-${index + 1}`,
          title: phase.label || `Phase ${index + 1}`,
          summary: phase.focus || 'Focused transition workstream.',
          outcome: inferPhaseOutcome(
            phase.label || `Phase ${index + 1}`,
            phase.focus || 'Focused transition workstream.',
            Array.isArray(phase.steps)
              ? phase.steps
                  .map((step: unknown) =>
                    typeof step === 'object' && step !== null && 'title' in step
                      ? String((step as { title?: unknown }).title ?? '').trim()
                      : ''
                  )
                  .filter(Boolean)
                  .slice(0, 4)
              : []
          ),
          actions: Array.isArray(phase.steps)
            ? phase.steps
                .map((
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  step: any
                ) => cleanGeneratedLabel(String(step?.title ?? '').trim()))
                .filter(Boolean)
                .slice(0, 4)
            : [],
          resources:
            index === 1
              ? [
                  { label: 'Province training directory' },
                  { label: 'Funding eligibility guide' }
                ]
              : [{ label: 'Role requirement summary' }],
          links:
            index === 2
              ? [{ label: 'Job Bank', url: 'https://www.jobbank.gc.ca' }]
              : [{ label: 'Provincial pathways', url: 'https://www.ontario.ca' }],
          expandedByDefault: index === 1
        }))
      : [
          {
            id: 'phase-1',
            title: 'Phase 1 - Preparation',
            summary: 'Define role positioning and application story.',
            outcome: 'You have target employers, a sharper resume angle, and a weekly outreach target.',
            actions: ['Clarify target employers', 'Refine resume angle', 'Set weekly outreach targets'],
            resources: [{ label: 'Resume framework checklist' }],
            links: [{ label: 'CareerHeap planner guide', url: '/tools/career-switch-planner' }],
            expandedByDefault: false
          },
          {
            id: 'phase-2',
            title: 'Phase 2 - Training',
            summary: 'Close immediate skill and credential gaps.',
            outcome: 'You have the first credential moving and one role-relevant readiness example prepared.',
            actions: ['Complete required safety credential', 'Start foundations course', 'Build one practical work sample'],
            resources: [{ label: 'Local provider directory' }, { label: 'Funding options list' }],
            links: [{ label: 'Job Bank', url: 'https://www.jobbank.gc.ca' }],
            expandedByDefault: true
          },
          {
            id: 'phase-3',
            title: 'Phase 3 - Job Search',
            summary: 'Convert readiness into interviews.',
            outcome: 'You have a repeatable outreach loop, interview stories, and active follow-ups.',
            actions: ['Send targeted outreach weekly', 'Track follow-ups in CRM', 'Run interview drills'],
            resources: [{ label: 'Outreach script library' }],
            links: [{ label: 'LinkedIn Jobs', url: 'https://www.linkedin.com/jobs' }],
            expandedByDefault: true
          },
          {
            id: 'phase-4',
            title: 'Phase 4 - Entry Into Field',
            summary: 'Stabilize in role and hit onboarding checkpoints.',
            outcome: 'You have clear 30/60/90 goals and measurable outcomes from the first months.',
            actions: ['Complete 30/60/90 review goals', 'Document measurable outcomes'],
            resources: [{ label: 'Onboarding checklist' }],
            links: [{ label: 'Career growth plan', url: '/tools/career-switch-planner' }],
            expandedByDefault: false
          }
        ]

  pushIfMissing(missingFields, 'roadmap.phases', roadmapFromGuide.length === 0)

  const sourceTradeFacts =
    input.report?.sourceEnrichment &&
    typeof input.report.sourceEnrichment === 'object' &&
    input.report.sourceEnrichment.tradeFacts &&
    typeof input.report.sourceEnrichment.tradeFacts === 'object'
      ? (input.report.sourceEnrichment.tradeFacts as {
          tradeCode?: string | null
          totalHours?: number | null
          onTheJobHours?: number | null
          inSchoolHours?: number | null
          academicStandard?: string | null
          certifyingExam?: string | null
          classification?: string | null
          sourceLabel?: string | null
        })
      : null
  const apprenticeshipHours =
    input.report?.targetRequirements?.apprenticeshipHours ??
    sourceTradeFacts?.totalHours ??
    null
  const onTheJobHours = sourceTradeFacts?.onTheJobHours ?? null
  const inSchoolHours = sourceTradeFacts?.inSchoolHours ?? null
  const examRequired =
    typeof input.report?.targetRequirements?.examRequired === 'boolean'
      ? input.report.targetRequirements.examRequired
      : /^yes$/i.test(String(sourceTradeFacts?.certifyingExam ?? ''))
  const mappedTradePathLabel = careerPathType === 'TRADES' && pathwayProfile
    ? buildMappedTradePathLabel({
        profile: pathwayProfile,
        fallbackCanonicalRole: roleTargetCanonical,
        fallbackTradeCode: sourceTradeFacts?.tradeCode
      })
    : null

  const fastestPathSource =
    (input.report?.transitionSections?.roadmapPlan?.fastestPathToApply as string[] | undefined) ??
    (input.report?.transitionReport?.plan30_60_90?.fastestPathToApply as Array<{ goal?: string }> | undefined)
      ?.map((item) => String(item.goal ?? '').trim())

  const isTradeApprenticeship =
    careerPathType === 'TRADES' &&
    (
      pathwayProfile?.meta?.pathway_type === 'trade_apprenticeship' ||
      Boolean(
        (pathwayProfile?.meta?.codes?.trade_code as string | null | undefined) ??
          sourceTradeFacts?.tradeCode ??
          input.report?.targetRequirements?.apprenticeshipHours
      )
    )

  const certificationNames = uniqueNormalizedStrings(
    ((input.report?.targetRequirements?.certifications as string[] | undefined) ?? [])
      .map((item) => sanitizePlannerCopy(String(item ?? ''), careerPathType))
      .filter(Boolean)
  ).slice(0, 3)
  const hardGateCourseNames = uniqueNormalizedStrings(
    ((input.report?.targetRequirements?.hardGates as string[] | undefined) ?? [])
      .map((item) => sanitizePlannerCopy(String(item ?? ''), careerPathType))
      .filter((item) => /\b(cert|license|licen|registration|safety|exam|cpr|whmis|csts)\b/i.test(item))
  ).slice(0, 3)
  const sourceCertificationNames = uniqueNormalizedStrings(
    (Array.isArray(input.report?.sourceEnrichment?.certificationCards)
      ? input.report.sourceEnrichment.certificationCards
      : []
    )
      .map((item: { name?: string }) => sanitizePlannerCopy(String(item?.name ?? ''), careerPathType))
      .filter(Boolean)
  ).slice(0, 3)
  const trainingNames = uniqueNormalizedStrings([
    ...certificationNames,
    ...hardGateCourseNames,
    ...sourceCertificationNames
  ]).slice(0, 3)
  const enrichedTrainingCards =
    Array.isArray(input.report?.sourceEnrichment?.trainingCards)
      ? input.report.sourceEnrichment.trainingCards
      : []
  const enrichedCertificationCards =
    Array.isArray(input.report?.sourceEnrichment?.certificationCards)
      ? input.report.sourceEnrichment.certificationCards
      : []
  const filteredEnrichedTrainingCards = enrichedTrainingCards
    .map((card: {
      name?: string
      provider?: string
      length?: string | null
      cost?: string | null
      modality?: string | null
      sourceUrl?: string | null
      sourceLabel?: string
      sourceType?: SourceType
    }) => ({
      name: sanitizePlannerCopy(String(card?.name ?? '').trim(), careerPathType),
      provider: String(card?.provider ?? 'Official provider listing').trim(),
      length: card?.length ?? null,
      cost: card?.cost ?? null,
      modality: card?.modality ?? null,
      sourceUrl: card?.sourceUrl ?? null,
      sourceType: card?.sourceType ?? 'verified',
      sourceLabel: String(card?.sourceLabel ?? 'Official source').trim()
    }))
    .filter((card: { name: string }) => !isGenericTrainingCardName(card.name))
  const normalizedCertificationCards = enrichedCertificationCards
    .map((card: {
      name?: string
      provider?: string
      sourceUrl?: string | null
      sourceLabel?: string
      sourceType?: SourceType
    }) => ({
      name: sanitizePlannerCopy(String(card?.name ?? '').trim(), careerPathType),
      provider: String(card?.provider ?? 'Official requirement source').trim(),
      sourceUrl: card?.sourceUrl ?? null,
      sourceType: card?.sourceType ?? 'verified',
      sourceLabel: String(card?.sourceLabel ?? 'Official source').trim()
    }))
    .filter((card: { name: string }) => card.name.length > 0)
  const profileTrainingLinks = Array.isArray(pathwayProfile?.resources?.training)
    ? pathwayProfile.resources.training
    : []
  const profileOfficialLinks = Array.isArray(pathwayProfile?.resources?.official)
    ? pathwayProfile.resources.official
    : []
  const whoHires = Array.isArray(pathwayProfile?.snapshot?.who_hires)
    ? pathwayProfile.snapshot.who_hires.filter(Boolean).map((item: string) => sentenceCase(item))
    : []
  const employableWindow =
    pathwayProfile?.timeline?.time_to_employable?.min_weeks && pathwayProfile?.timeline?.time_to_employable?.max_weeks
      ? `${pathwayProfile.timeline.time_to_employable.min_weeks}-${pathwayProfile.timeline.time_to_employable.max_weeks} weeks`
      : null
  const enrichedEntryRoles = Array.isArray(input.report?.sourceEnrichment?.entryRoles)
    ? input.report.sourceEnrichment.entryRoles
        .map((item: { title?: string }) => cleanGeneratedLabel(String(item?.title ?? '')))
        .filter(Boolean)
    : []
  const profileEntryRoles = Array.isArray(pathwayProfile?.entry_paths)
    ? pathwayProfile.entry_paths
        .flatMap((entryPath: { steps?: string[] }) => (Array.isArray(entryPath?.steps) ? entryPath.steps : []))
        .map((step: string) => cleanGeneratedLabel(String(step ?? '')))
        .filter((step: string) => /\b(helper|labourer|laborer|pre-apprentice|maintenance|assistant|apprentice)\b/i.test(step))
        .map((step: string) =>
          sentenceCase(
            step
              .replace(/\b(get hired by|target|apply to|secure|start with)\b/gi, '')
              .replace(/\b(a|an|the)\b/gi, ' ')
              .replace(/\s+/g, ' ')
              .trim()
          )
        )
        .filter(Boolean)
    : []
  const entryRoles =
    careerPathType === 'TRADES'
      ? uniqueNormalizedStrings([...enrichedEntryRoles, ...profileEntryRoles]).slice(0, 3)
      : []
  const marketSnapshot = input.report?.transitionReport?.marketSnapshot
  const evidenceTransparency = input.report?.transitionReport?.evidenceTransparency
  const fullQualificationWindow = formatQualificationWindow(pathwayProfile)
  const tradeFacts =
    careerPathType === 'TRADES'
      ? [
          employableWindow ? { label: 'First Field Entry', value: employableWindow } : null,
          fullQualificationWindow ? { label: 'Full Qualification', value: fullQualificationWindow } : null,
          apprenticeshipHours ? { label: 'Total Apprenticeship', value: formatHours(apprenticeshipHours) ?? '' } : null,
          examRequired ? { label: 'Certifying Exam', value: 'Required in Ontario' } : null,
          sourceTradeFacts?.academicStandard
            ? { label: 'Academic Standard', value: sourceTradeFacts.academicStandard }
            : onTheJobHours || inSchoolHours
              ? {
                  label: 'Hours Mix',
                  value: [formatHours(onTheJobHours), formatHours(inSchoolHours)].filter(Boolean).join(' on-site / ')
                }
              : null
        ].filter((item): item is { label: string; value: string } => Boolean(item)).slice(0, 4)
      : []
  const tradeFastestPath =
    isTradeApprenticeship && pathwayProfile
      ? buildTradeFastestPath({
          profile: pathwayProfile,
          targetDisplayRole: roleTargetDisplay,
          locationText: input.locationText || 'your province',
          examRequired,
          apprenticeshipHours,
          stage: tradeTargetStage,
          entryRoles
        })
      : null

  const fastestPath =
    tradeFastestPath && tradeFastestPath.fastestSteps.length > 0
      ? tradeFastestPath.fastestSteps
      : Array.isArray(fastestPathSource) && fastestPathSource.length > 0
        ? fastestPathSource.slice(0, 4).map((item, index) => ({
            label: `Month ${index + 1}`,
            detail: sanitizePlannerCopy(item, careerPathType)
          }))
        : careerPathType === 'TRADES'
          ? [
              { label: 'Month 1', detail: 'Complete baseline credential and contact 20 target employers.' },
              { label: 'Month 2', detail: 'Enroll in core technical foundations course.' },
              { label: 'Month 3-4', detail: 'Secure apprenticeship or entry-track sponsorship.' }
            ]
          : [
              { label: 'Month 1', detail: 'Confirm top requirements and tailor your resume to the target role.' },
              { label: 'Month 2', detail: 'Complete one role-relevant learning milestone and publish one concrete work example.' },
              { label: 'Month 3-4', detail: 'Run targeted applications and follow-ups until interview activity is steady.' }
            ]

  pushIfMissing(missingFields, 'fastest_path.steps', !fastestPathSource || fastestPathSource.length === 0)
  const starterCertifications = collectStarterCertifications({
    hardGates: ((input.report?.targetRequirements?.hardGates as string[] | undefined) ?? []).map((item) =>
      cleanGeneratedLabel(String(item ?? ''))
    ),
    certifications: certificationNames,
    marketRequirementLabels: Array.isArray(marketSnapshot?.topRequirements)
      ? marketSnapshot.topRequirements
          .map((item: { label?: string }) => cleanGeneratedLabel(String(item?.label ?? '')))
          .filter(Boolean)
      : [],
    profileMustHave: Array.isArray(pathwayProfile?.requirements?.must_have)
      ? pathwayProfile.requirements.must_have
      : [],
    profileNiceToHave: Array.isArray(pathwayProfile?.requirements?.nice_to_have)
      ? pathwayProfile.requirements.nice_to_have
      : [],
    profileStarterBundle: Array.isArray(pathwayProfile?.requirements?.starter_cert_bundle)
      ? pathwayProfile.requirements.starter_cert_bundle
      : [],
    sourceUrl: profileOfficialLinks[0]?.url ?? null
  })
  const certificationLinkCandidates = [
    ...normalizedCertificationCards
      .filter((card: { sourceUrl?: string | null }) => Boolean(card.sourceUrl))
      .map((card: { name: string; sourceLabel: string; sourceUrl?: string | null }) => ({
        label: `${card.name} ${card.sourceLabel}`,
        url: card.sourceUrl as string
      })),
    ...profileOfficialLinks
      .filter((item: { url?: string }) => Boolean(item?.url))
      .map((item: { title?: string; url?: string }) => ({
        label: cleanGeneratedLabel(String(item?.title ?? '')).trim(),
        url: String(item?.url ?? '')
      }))
  ]
  const certTokens = (value: string) => {
    const normalized = cleanGeneratedLabel(value)
      .toLowerCase()
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    const tokens = new Set<string>()
    if (normalized) tokens.add(normalized)
    if (/\bwhmis\b/i.test(value)) tokens.add('whmis')
    if (/\bworking at heights?\b/i.test(value)) tokens.add('working at heights')
    if (/\b(worker health|health and safety awareness|4 step|four step)\b/i.test(value)) {
      tokens.add('worker health and safety awareness')
    }
    if (/\bfirst aid\b/i.test(value)) tokens.add('first aid')
    if (/\bcpr\b/i.test(value)) tokens.add('cpr')
    return Array.from(tokens)
  }
  const resolveCertificationSourceUrl = (name: string) => {
    const targetTokens = certTokens(name)
    for (const targetToken of targetTokens) {
      for (const candidate of certificationLinkCandidates) {
        const candidateTokens = certTokens(candidate.label)
        if (candidateTokens.some((token) => token === targetToken || token.includes(targetToken) || targetToken.includes(token))) {
          return candidate.url
        }
      }
    }
    return profileOfficialLinks[0]?.url ?? null
  }
  const starterCertificationsWithBackfill = (() => {
    if (starterCertifications.length >= 3) {
      return starterCertifications.slice(0, 3).map((item) => ({
        ...item,
        sourceUrl: item.sourceUrl ?? resolveCertificationSourceUrl(item.name)
      }))
    }
    if (normalizedCertificationCards.length === 0) {
      return starterCertifications.slice(0, 3).map((item) => ({
        ...item,
        sourceUrl: item.sourceUrl ?? resolveCertificationSourceUrl(item.name)
      }))
    }

    const seen = new Set(
      starterCertifications.map((item) =>
        cleanGeneratedLabel(item.name).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
      )
    )
    const merged = [...starterCertifications]
    for (const card of normalizedCertificationCards) {
      if (merged.length >= 3) break
      const key = cleanGeneratedLabel(card.name).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
      if (!key || seen.has(key)) continue
      seen.add(key)
      merged.push({
        name: card.name,
        sourceLabel: card.sourceLabel,
        sourceType: card.sourceType,
        sourceUrl: card.sourceUrl ?? resolveCertificationSourceUrl(card.name),
        provider: card.provider,
        cost: null
      })
    }
    return merged.slice(0, 3).map((item) => ({
      ...item,
      sourceUrl: item.sourceUrl ?? resolveCertificationSourceUrl(item.name)
    }))
  })()
  const normalizedMatcherKey = (value: string) =>
    cleanGeneratedLabel(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim()
  const resolveTrainingCardCost = (name: string) => {
    const target = normalizedMatcherKey(name)
    if (!target || filteredEnrichedTrainingCards.length === 0) return null
    for (const card of filteredEnrichedTrainingCards) {
      const candidate = normalizedMatcherKey(card.name)
      if (!candidate) continue
      if (candidate === target || candidate.includes(target) || target.includes(candidate)) {
        return card.cost ?? null
      }
    }
    return null
  }
  const rawTrainingCourses: PlannerDashboardV3Model['training']['courses'] =
    starterCertificationsWithBackfill.length > 0
      ? starterCertificationsWithBackfill.map((item, index) => ({
          id: toStableTrainingId(item.name, index),
          name: item.name,
          provider: item.provider,
          priorityLabel: 'Get first' as const,
          length: null,
          cost: item.cost ?? resolveTrainingCardCost(item.name),
          modality: null,
          sourceUrl: item.sourceUrl ?? null,
          sourceType: item.sourceType,
          sourceLabel: item.sourceLabel
        }))
      : filteredEnrichedTrainingCards.length > 0
      ? filteredEnrichedTrainingCards.slice(0, 3).map((card: {
          name: string
          provider: string
          length?: string | null
          cost?: string | null
          modality?: string | null
          nextStart?: string | null
          rating?: string | null
          aid?: string | null
          sourceUrl?: string | null
          sourceType: SourceType
          sourceLabel: string
        }, index: number) => ({
          ...card,
          id: toStableTrainingId(card.name, index),
          priorityLabel: trainingPriorityLabel({
            name: card.name,
            sourceType: card.sourceType,
            fromStarterBundle: false,
            employableWindow
          })
        }))
      : normalizedCertificationCards.length > 0
      ? normalizedCertificationCards.slice(0, 3).map((card: {
          name: string
          provider: string
          sourceUrl?: string | null
          sourceType: SourceType
          sourceLabel: string
        }, index: number) => ({
          id: toStableTrainingId(card.name, index),
          name: card.name,
          provider: card.provider,
          priorityLabel: trainingPriorityLabel({
            name: card.name,
            sourceType: card.sourceType,
            fromStarterBundle: false,
            employableWindow
          }),
          length: null,
          cost: null,
          modality: null,
          sourceUrl: card.sourceUrl ?? null,
          sourceType: card.sourceType,
          sourceLabel: card.sourceLabel
        }))
      : profileTrainingLinks.length > 0
      ? profileTrainingLinks.slice(0, 3).map((link: { title?: string; url?: string }, index: number) => ({
          id: toStableTrainingId(
            cleanGeneratedLabel(String(link?.title ?? '').trim()) || trainingNames[index] || `Training option ${index + 1}`,
            index
          ),
          name: cleanGeneratedLabel(String(link?.title ?? '').trim()) || trainingNames[index] || `Training option ${index + 1}`,
          provider: link?.url ? providerNameFromUrl(String(link.url)) : 'Official provider listing',
          priorityLabel: trainingPriorityLabel({
            name: cleanGeneratedLabel(String(link?.title ?? '').trim()) || trainingNames[index] || `Training option ${index + 1}`,
            sourceType: 'verified',
            fromStarterBundle: false,
            employableWindow
          }),
          length: index === 0 ? employableWindow : null,
          cost: null,
          sourceUrl: link?.url ?? null,
          sourceType: 'verified' as const,
          sourceLabel: link?.title ? `Official source: ${link.title}` : 'Career pathway profile'
        }))
      : trainingNames.length > 0
        ? trainingNames.map((name, index) => ({
            id: toStableTrainingId(name, index),
            name,
            provider:
              profileOfficialLinks[index]?.url
                ? providerNameFromUrl(String(profileOfficialLinks[index].url))
                : index === 0
                  ? 'Province-approved provider directory'
                  : 'Confirm with local provider',
            priorityLabel: trainingPriorityLabel({
              name,
              sourceType: index === 0 ? 'derived' : 'estimate',
              fromStarterBundle: false,
              employableWindow
            }),
            length: /\b(cpr|first aid|whmis|csts)\b/i.test(name) ? '1-5 days' : null,
            cost: /\b(cpr|first aid|whmis|csts)\b/i.test(name) ? '$120-$300' : null,
            sourceUrl: profileOfficialLinks[index]?.url ?? null,
            sourceType: index === 0 ? ('derived' as const) : ('estimate' as const),
            sourceLabel:
              profileOfficialLinks[index]?.title
                ? `Official source: ${profileOfficialLinks[index].title}`
                : index === 0
                  ? 'Target requirements + provider lookup needed'
                  : 'Target requirements'
          }))
        : [
            {
              id: toStableTrainingId('Confirm regional licensing and certification requirements', 0),
              name: 'Confirm regional licensing and certification requirements',
              provider: 'Province regulator or approved provider directory',
              priorityLabel: 'Useful next' as const,
              length: null,
              cost: null,
              sourceType: 'estimate' as const,
              sourceLabel: 'Target requirements'
            }
          ]

  const trainingCostFallbackByName = (name: string) => {
    const normalized = cleanGeneratedLabel(name).toLowerCase()
    if (/\bwhmis\b/.test(normalized)) return '$20-$80'
    if (/\bworking at heights?\b|\bfall protection\b/.test(normalized)) return '$120-$250'
    if (/\bworker health and safety awareness\b|\bhealth and safety awareness\b/.test(normalized)) {
      return '$0-$60'
    }
    if (/\b(first aid|cpr)\b/.test(normalized)) return '$120-$300'
    if (/\b(csts)\b/.test(normalized)) return '$0-$120'
    if (/\bconfined space\b|\blockout\s*tagout\b|\bloto\b|\belevated work platform\b|\bboom lift\b|\bscissor lift\b/.test(normalized)) {
      return '$150-$500'
    }
    return null
  }

  const isPlaceholderSourceLabel = (value: string) =>
    /\b(official requirement source|target requirements|training source)\b/i.test(value.trim())

  const trainingCourses = rawTrainingCourses.map((course) => {
    const sourceUrl = course.sourceUrl ?? null
    const providerFromUrl = sourceUrl ? providerNameFromUrl(sourceUrl) : null
    const hasGenericProvider = !course.provider || /\b(official requirement source|confirm with local provider|official provider listing)\b/i.test(course.provider)
    const provider = hasGenericProvider && providerFromUrl ? providerFromUrl : course.provider || 'Official provider listing'
    const sourceLabel =
      isPlaceholderSourceLabel(course.sourceLabel) && providerFromUrl
        ? `Official source: ${providerFromUrl}`
        : course.sourceLabel

    return {
      ...course,
      provider,
      sourceLabel,
      sourceType: sourceUrl ? (course.sourceType === 'estimate' ? 'derived' : course.sourceType) : course.sourceType,
      cost: course.cost ?? trainingCostFallbackByName(course.name)
    }
  })

  pushIfMissing(missingFields, 'training.certifications', trainingNames.length === 0)

  const localDemandLabel = normalizeLocalDemandLabel(marketSnapshot?.summaryLine, input.locationText)
  const postingsCountFromSummary = (() => {
    const raw = String(marketSnapshot?.summaryLine ?? '')
    const match = raw.match(/based on\s+(\d+)\s+recent postings/i)
    if (!match) return null
    const parsed = Number(match[1])
    return Number.isFinite(parsed) ? parsed : null
  })()
  const postingsCountFromEvidence =
    typeof evidenceTransparency?.employerPostings?.count === 'number' &&
    Number.isFinite(evidenceTransparency.employerPostings.count)
      ? evidenceTransparency.employerPostings.count
      : null
  const marketTopRequirements = Array.isArray(marketSnapshot?.topRequirements) ? marketSnapshot.topRequirements : []
  const marketProofRequirementsFromTop = marketTopRequirements
    .slice(0, 3)
    .map((item: {
      label?: string
      frequency_count?: number
      frequency_percent?: number | null
      evidenceQuote?: Array<{
        source?: 'adzuna' | 'user_posting' | 'onet'
        quote?: string
      }>
    }) => {
      const firstEvidence = Array.isArray(item.evidenceQuote) ? item.evidenceQuote[0] : null
      const evidenceText = cleanGeneratedLabel(String(firstEvidence?.quote ?? '')).trim()
      const sourceLabel =
        firstEvidence?.source === 'user_posting'
          ? 'Your posting'
          : firstEvidence?.source === 'adzuna'
            ? 'Live postings'
            : 'Baseline dataset'
      const frequency =
        typeof item.frequency_percent === 'number' && Number.isFinite(item.frequency_percent)
          ? `${Math.max(1, Math.round(item.frequency_percent))}% of postings`
          : typeof item.frequency_count === 'number' && Number.isFinite(item.frequency_count)
            ? `${Math.max(1, Math.round(item.frequency_count))} postings`
            : 'Employer signal'

      return {
        label: cleanGeneratedLabel(String(item.label ?? '')).trim() || 'Employer requirement',
        frequency,
        evidence: evidenceText || 'Evidence quote unavailable.',
        source: sourceLabel
      }
    })

  const marketProofRequirementsFromTransitions = [
    ...(((input.report?.transitionSections?.mandatoryGateRequirements as Array<{
      label?: string
      frequency?: number
      evidence?: Array<{ source?: 'adzuna' | 'user_posting' | 'onet'; quote?: string }>
      evidenceLabel?: string
    }> | undefined) ?? [])),
    ...(((input.report?.transitionSections?.coreHardSkills as Array<{
      label?: string
      frequency?: number
      evidence?: Array<{ source?: 'adzuna' | 'user_posting' | 'onet'; quote?: string }>
      evidenceLabel?: string
    }> | undefined) ?? []))
  ]
    .slice(0, 6)
    .map((item) => {
      const firstEvidence = Array.isArray(item.evidence) ? item.evidence[0] : null
      const evidenceText = cleanGeneratedLabel(String(firstEvidence?.quote ?? '')).trim()
      const sourceLabel =
        firstEvidence?.source === 'user_posting'
          ? 'Your posting'
          : firstEvidence?.source === 'adzuna'
            ? 'Live postings'
            : 'Baseline dataset'
      const frequency =
        typeof item.frequency === 'number' && Number.isFinite(item.frequency)
          ? `${Math.max(1, Math.round(item.frequency))} postings`
          : 'Requirement signal'
      return {
        label: cleanGeneratedLabel(String(item.label ?? '')).trim() || 'Employer requirement',
        frequency,
        evidence: evidenceText || cleanGeneratedLabel(String(item.evidenceLabel ?? '')).trim() || 'Evidence summary unavailable.',
        source: sourceLabel
      }
    })
    .filter((item) => item.label)

  const marketProofRequirementsFromTargets = uniqueNormalizedStrings([
    ...(((input.report?.targetRequirements?.hardGates as string[] | undefined) ?? [])),
    ...(((input.report?.targetRequirements?.certifications as string[] | undefined) ?? [])),
    ...(((input.report?.targetRequirements?.employerSignals as string[] | undefined) ?? []))
  ])
    .slice(0, 3)
    .map((label) => ({
      label: cleanGeneratedLabel(label).trim(),
      frequency: 'Target requirement',
      evidence: 'Derived from your target role requirement profile.',
      source: 'Target requirements'
    }))

  const marketProofRequirements = (
    marketProofRequirementsFromTop.length > 0
      ? marketProofRequirementsFromTop
      : marketProofRequirementsFromTransitions.length > 0
        ? marketProofRequirementsFromTransitions
        : marketProofRequirementsFromTargets
  ).slice(0, 3)

  pushIfMissing(missingFields, 'market.local_demand', !marketSnapshot?.summaryLine)

  const hiringReqCount = Array.isArray(marketSnapshot?.topRequirements)
    ? marketSnapshot.topRequirements.length
    : 0
  const hiringRequirementsSummary = buildHiringRequirementsSummary(
    Array.isArray(marketSnapshot?.topRequirements) ? marketSnapshot.topRequirements : undefined,
    hiringReqCount
  )

  pushIfMissing(missingFields, 'market.hiring_requirements', hiringReqCount === 0)

  const reality = input.report?.transitionMode?.reality
  const probabilityRealityCheck = input.report?.executionStrategy?.probabilityRealityCheck

  pushIfMissing(missingFields, 'reality.barriers', !Array.isArray(reality?.barriers) || reality.barriers.length === 0)

  const checklistImmediate =
    (input.report?.transitionSections?.roadmapPlan?.zeroToTwoWeeks as Array<{ action?: string }> | undefined)
      ?.map((item) => String(item.action ?? '').trim())
      .map((item) => sanitizePlannerCopy(item, careerPathType))
      .filter(Boolean)
      .slice(0, 4) ?? []
  const checklistShortTerm =
    (input.report?.transitionSections?.roadmapPlan?.oneToThreeMonths as Array<{ action?: string }> | undefined)
      ?.map((item) => String(item.action ?? '').trim())
      .map((item) => sanitizePlannerCopy(item, careerPathType))
      .filter(Boolean)
      .slice(0, 4) ?? []
  const checklistLongTerm =
    (input.report?.transitionSections?.roadmapPlan?.threeToTwelveMonths as Array<{ action?: string }> | undefined)
      ?.map((item) => String(item.action ?? '').trim())
      .map((item) => sanitizePlannerCopy(item, careerPathType))
      .filter(Boolean)
      .slice(0, 4) ?? []

  const nowFallback = ['Finalize resume positioning', 'Apply to 10 targeted roles', 'Complete one credential milestone']
  const shortFallback = ['Run weekly outreach cadence', 'Build two practical work samples', 'Track interviews and feedback']
  const longFallback = ['Stabilize in role with 30/60/90 milestones', 'Build next-level specialization plan']

  const displayRoadmapPhases = isTradeApprenticeship
    ? roadmapPhases.map((phase, index) => {
        if (index === 0) {
          return {
            ...phase,
            title: 'Entry And Sponsorship',
            summary: entryRoles.length > 0
              ? `Target ${formatListForSentence(entryRoles)} and secure a sponsor-ready employer.`
              : 'Target entry doors and secure a sponsor-ready employer.',
            outcome: 'You know your entry doors, your first employers, and the sponsorship path.'
          }
        }
        if (index === 1) {
          return {
            ...phase,
            title: 'Registration And School Planning',
            summary: 'Register the apprenticeship path and confirm your first in-school training blocks.',
            outcome: 'Your apprenticeship registration and first school requirements are clear.'
          }
        }
        if (index === 2) {
          return {
            ...phase,
            title: 'Hours And School Loop',
            summary: apprenticeshipHours
              ? `Accumulate ${formatHours(apprenticeshipHours) ?? 'apprenticeship hours'} while progressing through school levels.`
              : 'Accumulate apprenticeship hours while progressing through school levels.',
            outcome: 'You are progressing through the work-and-school loop that leads to qualification.'
          }
        }
        return {
          ...phase,
          title: 'Qualification Milestone',
          summary: examRequired
            ? 'Finish the required hours and prepare for the Certificate of Qualification / Red Seal exam.'
            : 'Finish the required hours and complete the final qualification milestone.',
          outcome: 'You are positioned for the final qualification step and long-run journeyperson wages.'
        }
      })
    : roadmapPhases.map((phase) => ({
        ...phase,
        title: sanitizePlannerCopy(phase.title, careerPathType),
        summary: sanitizePlannerCopy(phase.summary, careerPathType),
        outcome: sanitizePlannerCopy(phase.outcome, careerPathType),
        actions: phase.actions.map((action) => sanitizePlannerCopy(action, careerPathType)),
        resources: phase.resources.map((resource) => ({
          ...resource,
          label: sanitizePlannerCopy(resource.label, careerPathType)
        }))
      }))

  const roadmapTasks: PlannerDashboardTask[] = displayRoadmapPhases.flatMap((phase) =>
    normalizeRoadmapActions(phase.actions)
      .slice(0, 3)
      .map((label, actionIndex) => {
        const category = categoryForTaskIndex(actionIndex)

        return {
          id: toTaskId(phase.id, label, actionIndex),
          phaseId: phase.id,
          category,
          label: sanitizePlannerCopy(label, careerPathType),
          checked: false,
          weight: TASK_CATEGORY_META[category].weight
        }
      })
  )

  const phaseProgress: PlannerDashboardPhaseProgress[] = displayRoadmapPhases.map((phase) => {
    const phaseTasks = roadmapTasks.filter((task) => task.phaseId === phase.id)
    const completionRatio =
      phaseTasks.length > 0
        ? phaseTasks.filter((task) => task.checked).length / phaseTasks.length
        : 0

    return {
      id: phase.id,
      completed: completionRatio === 1,
      collapsed: completionRatio === 1 ? true : !phase.expandedByDefault,
      completionRatio
    }
  })

  const roadmapWeightTotal = roadmapTasks.reduce((sum, task) => sum + task.weight, 0)
  const roadmapWeightDone = roadmapTasks.reduce(
    (sum, task) => sum + (task.checked ? task.weight : 0),
    0
  )
  const weightedPercent =
    roadmapWeightTotal > 0 ? clampPercent((roadmapWeightDone / roadmapWeightTotal) * 100) : 0

  const alternatives =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (input.report?.suggestedCareers as Array<any> | undefined)
      ?.slice(0, 4)
      .map((item) => ({
        occupationId: String(item.occupationId ?? item.title ?? 'alt-role'),
        title: sanitizePlannerCopy(String(item.title ?? 'Alternative role'), careerPathType),
        difficulty: String(item.difficulty ?? 'moderate'),
        timeline: String(item.transitionTime ?? '3-9 months'),
        salary: {
          value:
            salaryRangeToLabel(item?.salary?.native?.low, item?.salary?.native?.high, item?.salary?.native?.currency || 'USD') ||
            'Regional estimate unavailable',
          badge:
            typeof item?.salary?.native?.low === 'number' && typeof item?.salary?.native?.high === 'number'
              ? undefined
              : ('Estimate' as const),
          sourceType:
            typeof item?.salary?.native?.low === 'number' && typeof item?.salary?.native?.high === 'number'
              ? ('verified' as const)
              : ('estimate' as const),
          sourceLabel: item?.salary?.native?.sourceName || 'Regional estimate',
          updatedAt: item?.salary?.native?.asOfDate || undefined
        },
        reason: sanitizePlannerCopy(
          String(item?.topReasons?.[0] ?? 'Alternative route with a different risk and timeline profile.'),
          careerPathType
        )
      })) ?? []
  const targetRoleKey = normalizedLabelKey(roleTargetDisplay)
  const uniqueAlternatives = (() => {
    const seen = new Set<string>()
    const output: PlannerDashboardAlternative[] = []
    for (const option of alternatives) {
      const key = normalizedLabelKey(option.title)
      if (!key || key === targetRoleKey || seen.has(key)) continue
      seen.add(key)
      output.push(option)
    }
    return output
  })()

  pushIfMissing(missingFields, 'alternatives.cards', alternatives.length === 0)

  const driverImpactRows = [
    { label: 'Skill Gap', weight: 35, score: difficultyItems[0]?.score ?? compatibilityScore },
    { label: 'Education Gap', weight: 20, score: difficultyItems[1]?.score ?? compatibilityScore },
    { label: 'Hiring Barrier', weight: 20, score: difficultyItems[2]?.score ?? compatibilityScore },
    { label: 'Market Demand', weight: 15, score: difficultyItems[3]?.score ?? compatibilityScore },
    { label: 'Experience Requirement', weight: 10, score: difficultyItems[4]?.score ?? compatibilityScore }
  ].map((item) => ({
    label: item.label,
    weight: item.weight,
    impactPoints: Math.round(((item.score - 50) / 50) * item.weight)
  }))

  const strongestPathSource =
    (input.report?.transitionSections?.roadmapPlan?.strongCandidatePath as string[] | undefined)?.filter(Boolean) ??
    []
  const strongestPath =
    tradeFastestPath && tradeFastestPath.strongestSteps.length > 0
      ? tradeFastestPath.strongestSteps
      : strongestPathSource.length > 0
        ? strongestPathSource.slice(0, 4).map((item, index) => ({
            label: `Month ${index + 1}`,
            detail: sanitizePlannerCopy(item, careerPathType)
          }))
        : careerPathType === 'TRADES'
          ? [
              { label: 'Month 1', detail: 'Stack certifications and publish one credible readiness example.' },
              { label: 'Month 2', detail: 'Refine resume narrative to apprenticeship job language and outcomes.' },
              { label: 'Month 3-4', detail: 'Push high-frequency outreach and convert active leads to interviews.' }
            ]
          : [
              { label: 'Month 1', detail: 'Strengthen your resume with measurable role-relevant outcomes.' },
              { label: 'Month 2', detail: 'Build depth in the top missing skill and collect one manager-ready reference.' },
              { label: 'Month 3-4', detail: 'Increase outreach quality and convert warm leads into interviews.' }
            ]



  const evidenceRequiredSource = [
    ...(Array.isArray(input.report?.targetRequirements?.hardGates) ? input.report.targetRequirements.hardGates : []),
    ...(Array.isArray(input.report?.targetRequirements?.certifications)
      ? input.report.targetRequirements.certifications
      : []),
    ...(Array.isArray(pathwayProfile?.requirements?.must_have)
      ? pathwayProfile.requirements.must_have.flatMap((item: { name?: string; details?: string }) => [
          item?.name ?? '',
          item?.details ?? ''
        ])
      : []),
    ...(Array.isArray(input.report?.transitionReport?.marketSnapshot?.topRequirements)
      ? input.report.transitionReport.marketSnapshot.topRequirements
          .slice(0, 3)
          .map((item: { label?: string }) => item?.label ?? '')
      : [])
  ]
    .map((item) => sanitizePlannerCopy(String(item ?? '').trim(), careerPathType))
    .filter(Boolean)
    .slice(0, 6)
  const evidenceRequired =
    uniqueNormalizedStrings(evidenceRequiredSource).length > 0
      ? uniqueNormalizedStrings(evidenceRequiredSource)
          .map((item) =>
            actionifyRequirement({
              value: item,
              targetDisplayRole: roleTargetDisplay,
              locationText: input.locationText,
              careerPathType,
              isTradeApprenticeship,
              whoHires,
              entryRoles
            })
          )
          .filter(Boolean)
          .slice(0, 4)
      : isTradeApprenticeship
        ? buildTradeEvidenceFallback({
            locationText: input.locationText,
            whoHires,
            entryRoles,
            apprenticeshipHours: input.report?.targetRequirements?.apprenticeshipHours
          }).slice(0, 4)
        : displayRoadmapPhases
            .flatMap((phase) => phase.actions)
            .map((item) =>
              actionifyRequirement({
                value: item,
                targetDisplayRole: roleTargetDisplay,
                locationText: input.locationText,
                careerPathType,
                isTradeApprenticeship,
                whoHires,
                entryRoles
              })
            )
            .filter(Boolean)
            .slice(0, 4)

  const fallbackCardsByPath: Record<DashboardCareerPathType, PlannerDashboardAlternative[]> = {
    TRADES: [
      { occupationId: 'hvac-tech', title: 'HVAC Technician', difficulty: 'moderate', timeline: '4-9 months', salary: { value: 'Regional estimate unavailable', badge: 'Estimate' as const, sourceType: 'estimate', sourceLabel: 'Regional estimate' }, reason: 'Lower-friction regulated trade route with similar hands-on expectations.' },
      { occupationId: 'construction-supervisor', title: 'Construction Supervisor', difficulty: 'moderate', timeline: '6-12 months', salary: { value: 'Regional estimate unavailable', badge: 'Estimate' as const, sourceType: 'estimate', sourceLabel: 'Regional estimate' }, reason: 'Leverages coordination and field discipline if you already lead reliably.' },
      { occupationId: 'millwright', title: 'Industrial Mechanic (Millwright)', difficulty: 'hard', timeline: '6-12 months', salary: { value: 'Regional estimate unavailable', badge: 'Estimate' as const, sourceType: 'estimate', sourceLabel: 'Regional estimate' }, reason: 'Adjacent technical pathway with strong demand in industrial settings.' },
      { occupationId: 'maintenance-technician', title: 'Maintenance Technician', difficulty: 'moderate', timeline: '4-8 months', salary: { value: 'Regional estimate unavailable', badge: 'Estimate' as const, sourceType: 'estimate', sourceLabel: 'Regional estimate' }, reason: 'Bridge role that builds relevant troubleshooting and preventive maintenance evidence.' }
    ],
    HEALTHCARE_LICENSED: [
      { occupationId: 'personal-support-worker', title: 'Personal Support Worker', difficulty: 'moderate', timeline: '3-8 months', salary: { value: 'Regional estimate unavailable', badge: 'Estimate' as const, sourceType: 'estimate', sourceLabel: 'Regional estimate' }, reason: 'Builds direct care exposure while moving through healthcare prerequisites.' },
      { occupationId: 'medical-office-assistant', title: 'Medical Office Assistant', difficulty: 'moderate', timeline: '3-6 months', salary: { value: 'Regional estimate unavailable', badge: 'Estimate' as const, sourceType: 'estimate', sourceLabel: 'Regional estimate' }, reason: 'Lower-friction bridge into regulated healthcare environments.' },
      { occupationId: 'pharmacy-technician', title: 'Pharmacy Technician', difficulty: 'hard', timeline: '6-12 months', salary: { value: 'Regional estimate unavailable', badge: 'Estimate' as const, sourceType: 'estimate', sourceLabel: 'Regional estimate' }, reason: 'Alternative regulated healthcare route with clear credential sequencing.' },
      { occupationId: 'healthcare-unit-clerk', title: 'Healthcare Unit Clerk', difficulty: 'moderate', timeline: '3-7 months', salary: { value: 'Regional estimate unavailable', badge: 'Estimate' as const, sourceType: 'estimate', sourceLabel: 'Regional estimate' }, reason: 'Entry route that strengthens healthcare workflow and documentation experience.' }
    ],
    PROFESSIONAL_LICENSED: [
      { occupationId: 'bookkeeper', title: 'Bookkeeper', difficulty: 'moderate', timeline: '3-6 months', salary: { value: 'Regional estimate unavailable', badge: 'Estimate' as const, sourceType: 'estimate', sourceLabel: 'Regional estimate' }, reason: 'Bridge role that builds direct exposure to core professional workflows.' },
      { occupationId: 'operations-coordinator', title: 'Operations Coordinator', difficulty: 'moderate', timeline: '3-8 months', salary: { value: 'Regional estimate unavailable', badge: 'Estimate' as const, sourceType: 'estimate', sourceLabel: 'Regional estimate' }, reason: 'Faster route if your current strengths are process and stakeholder coordination.' },
      { occupationId: 'compliance-analyst', title: 'Compliance Analyst', difficulty: 'hard', timeline: '6-12 months', salary: { value: 'Regional estimate unavailable', badge: 'Estimate' as const, sourceType: 'estimate', sourceLabel: 'Regional estimate' }, reason: 'Adjacent path when licensing or regulatory requirements are central.' },
      { occupationId: 'project-coordinator', title: 'Project Coordinator', difficulty: 'moderate', timeline: '3-8 months', salary: { value: 'Regional estimate unavailable', badge: 'Estimate' as const, sourceType: 'estimate', sourceLabel: 'Regional estimate' }, reason: 'Structured coordination role that builds transferable planning and reporting credibility.' }
    ],
    TECH: [
      { occupationId: 'qa-analyst', title: 'QA Analyst', difficulty: 'moderate', timeline: '3-8 months', salary: { value: 'Regional estimate unavailable', badge: 'Estimate' as const, sourceType: 'estimate', sourceLabel: 'Regional estimate' }, reason: 'Strong bridge into technical teams with lower initial barrier than full software roles.' },
      { occupationId: 'support-analyst', title: 'IT Support Analyst', difficulty: 'moderate', timeline: '2-6 months', salary: { value: 'Regional estimate unavailable', badge: 'Estimate' as const, sourceType: 'estimate', sourceLabel: 'Regional estimate' }, reason: 'Builds systems and troubleshooting evidence that converts into broader tech paths.' },
      { occupationId: 'data-analyst', title: 'Junior Data Analyst', difficulty: 'hard', timeline: '4-10 months', salary: { value: 'Regional estimate unavailable', badge: 'Estimate' as const, sourceType: 'estimate', sourceLabel: 'Regional estimate' }, reason: 'Alternative analytical route with transferable reporting and tooling overlap.' },
      { occupationId: 'business-systems-analyst', title: 'Business Systems Analyst', difficulty: 'hard', timeline: '5-10 months', salary: { value: 'Regional estimate unavailable', badge: 'Estimate' as const, sourceType: 'estimate', sourceLabel: 'Regional estimate' }, reason: 'Good bridge when you combine process experience with technical system fluency.' }
    ],
    GENERAL: [
      { occupationId: 'operations-coordinator', title: 'Operations Coordinator', difficulty: 'moderate', timeline: '3-8 months', salary: { value: 'Regional estimate unavailable', badge: 'Estimate' as const, sourceType: 'estimate', sourceLabel: 'Regional estimate' }, reason: 'Uses process discipline and communication strengths in structured teams.' },
      { occupationId: 'customer-success', title: 'Customer Success Specialist', difficulty: 'moderate', timeline: '2-6 months', salary: { value: 'Regional estimate unavailable', badge: 'Estimate' as const, sourceType: 'estimate', sourceLabel: 'Regional estimate' }, reason: 'Leverages client communication and retention-oriented experience.' },
      { occupationId: 'logistics-coordinator', title: 'Logistics Coordinator', difficulty: 'moderate', timeline: '3-6 months', salary: { value: 'Regional estimate unavailable', badge: 'Estimate' as const, sourceType: 'estimate', sourceLabel: 'Regional estimate' }, reason: 'Practical bridge role with clear hiring channels and measurable workflows.' },
      { occupationId: 'administrative-assistant', title: 'Administrative Assistant', difficulty: 'moderate', timeline: '1-4 months', salary: { value: 'Regional estimate unavailable', badge: 'Estimate' as const, sourceType: 'estimate', sourceLabel: 'Regional estimate' }, reason: 'Reliable short-run bridge role while building targeted evidence for your next move.' }
    ]
  }
  const fallbackCards: PlannerDashboardAlternative[] = fallbackCardsByPath[careerPathType] ?? fallbackCardsByPath.GENERAL
  const alternativeCards = uniqueAlternatives.length > 0 ? uniqueAlternatives : fallbackCards
  const compareA = alternativeCards[0] ?? fallbackCards[0]
  const compareB = alternativeCards[1] ?? fallbackCards[1]

  const trendStartPercent = clampPercent(Math.max(35, compatibilityScore - 6))
  const trendEndPercent = clampPercent(compatibilityScore)
  const trendBars = [44, 52, 58, 66, 72, 78]

  const missingFallbackFields = Array.from(new Set(missingFields)).sort()
  const parsedTrainingCostRanges = trainingCourses
    .map((course) => parseCostRange(course.cost))
    .filter((range): range is { min: number; max: number } => Boolean(range))
  const sourcedTrainingRange =
    parsedTrainingCostRanges.length > 0
      ? {
          min: parsedTrainingCostRanges.reduce((sum, range) => sum + range.min, 0),
          max: parsedTrainingCostRanges.reduce((sum, range) => sum + range.max, 0)
        }
      : null
  const hasOntarioExamFee = isTradeApprenticeship && selectedProvince === 'ON' && examRequired
  const trainingCostStack: PlannerDashboardV3Model['training']['costStack'] = []

  if (sourcedTrainingRange) {
    trainingCostStack.push({
      label: 'Starter certifications and training',
      value: formatCurrencyRange(sourcedTrainingRange.min, sourcedTrainingRange.max, 'CAD').replace(/^CA\$/i, '$'),
      sourceType: 'verified',
      sourceLabel: 'Summed from sourced training cards'
    })
  } else {
    trainingCostStack.push({
      label: 'Starter certifications and training',
      value: 'Confirm with provider',
      badge: 'Needs data',
      sourceType: 'estimate',
      sourceLabel: 'No provider pricing is attached to this pathway yet'
    })
  }

  if (hasOntarioExamFee) {
    trainingCostStack.push({
      label: 'Certifying exam fee',
      value: '$150 + HST',
      sourceType: 'verified',
      sourceLabel: 'Skilled Trades Ontario certifying exam fee'
    })
  }

  const heroTrainingCost = sourcedTrainingRange
    ? formatCurrencyRange(
        sourcedTrainingRange.min + (hasOntarioExamFee ? 150 : 0),
        sourcedTrainingRange.max + (hasOntarioExamFee ? 150 : 0),
        'CAD'
      ).replace(/^CA\$/i, '$')
    : hasOntarioExamFee
      ? '$150+'
      : 'Confirm with provider'
  const heroTrainingCostSourceType: SourceType = sourcedTrainingRange || hasOntarioExamFee ? 'verified' : 'estimate'
  const resourceCards = buildResourcesCards({
    report: input.report,
    pathwayProfile,
    trainingCourses
  })
  const pathwayWeightingType = inferPathwayWeightingType(
    careerPathType,
    roleTargetDisplay,
    input.report?.transitionMode?.templateKey
  )
  const pathwayEmphasis = pathwayWeightingEmphasis(pathwayWeightingType)
  const transitionVerdict = deriveTransitionVerdict(compatibilityScore)
  const primaryRoute = input.report?.transitionMode?.routes?.primary
  const routeType = classifyRouteType({
    careerPathType,
    templateKey: input.report?.transitionMode?.templateKey,
    primaryRouteTitle: primaryRoute?.title,
    primaryRouteReason: primaryRoute?.reason,
    primaryRouteFirstStep: primaryRoute?.firstStep
  })
  const fastestRoute =
    sanitizePlannerCopy(
      String(
        primaryRoute?.title ||
          primaryRoute?.firstStep ||
          fastestPath[0]?.detail ||
          'Use the closest entry role as your bridge route'
      ),
      careerPathType
    ) || 'Use the closest entry role as your bridge route'
  const biggestBlocker =
    sanitizePlannerCopy(
      String(
        input.report?.executionStrategy?.realBlockers?.requiredToApply?.[0]?.label ||
          input.report?.bottleneck?.title ||
          required[0]?.label ||
          input.report?.transitionMode?.gaps?.missing?.[0] ||
          'Missing role-specific proof'
      ),
      careerPathType
    ) || 'Missing role-specific proof'

  const normalizeKey = (value: string) =>
    cleanGeneratedLabel(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim()

  const month1PlanActions =
    ((input.report?.executionStrategy?.plan90Day?.month1?.actions as Array<{ task?: string }> | undefined) ?? [])
      .map((item) => sanitizePlannerCopy(String(item.task ?? ''), careerPathType))
      .filter(Boolean)
      .filter((item) => !isLockedOrPlaceholderRoadmapAction(item))
  const month2PlanActions =
    ((input.report?.executionStrategy?.plan90Day?.month2?.actions as Array<{ task?: string }> | undefined) ?? [])
      .map((item) => sanitizePlannerCopy(String(item.task ?? ''), careerPathType))
      .filter(Boolean)
      .filter((item) => !isLockedOrPlaceholderRoadmapAction(item))
  const month3PlanActions =
    ((input.report?.executionStrategy?.plan90Day?.month3?.actions as Array<{ task?: string }> | undefined) ?? [])
      .map((item) => sanitizePlannerCopy(String(item.task ?? ''), careerPathType))
      .filter(Boolean)
      .filter((item) => !isLockedOrPlaceholderRoadmapAction(item))

  const actionThisWeekCandidates = [
    ...(checklistImmediate.length > 0 ? checklistImmediate : nowFallback),
    ...((input.report?.transitionMode?.roadmapGuide?.next7Days as string[] | undefined) ?? []),
    ...((input.report?.transitionMode?.gaps?.first3Steps as string[] | undefined) ?? []),
    ...month1PlanActions
  ].map((item) => sanitizePlannerCopy(item, careerPathType))

  const actionNextWeekCandidates = [
    ...(checklistShortTerm.length > 0 ? checklistShortTerm : shortFallback),
    ...fastestPath.map((step) => step.detail),
    ...month2PlanActions
  ].map((item) => sanitizePlannerCopy(item, careerPathType))

  const proofTargets = (
    ((input.report?.executionStrategy?.plan90Day?.month1?.actions as Array<{ proofTarget?: string }> | undefined) ?? [])
      .concat(
        ((input.report?.executionStrategy?.plan90Day?.month2?.actions as Array<{ proofTarget?: string }> | undefined) ??
          []).slice(0, 2)
      )
      .map((item) => String(item.proofTarget ?? '').trim())
      .filter(Boolean) as string[]
  )

  const proofToCollectCandidates = [
    ...proofTargets,
    ...evidenceRequired,
    ...((input.report?.targetRequirements?.employerSignals as string[] | undefined) ?? [])
  ].map((item) => sanitizePlannerCopy(item, careerPathType))

  const transferableStrengthMap = new Map<string, string>()
  for (const item of (input.report?.transitionSections?.transferableStrengths as Array<{
    label?: string
    requirement?: string
  }> | undefined) ?? []) {
    const label = sanitizePlannerCopy(String(item?.label ?? ''), careerPathType)
    const requirement = sanitizePlannerCopy(String(item?.requirement ?? ''), careerPathType)
    if (!label || !requirement) continue
    transferableStrengthMap.set(normalizeKey(label), requirement)
  }
  for (const item of (input.report?.executionStrategy?.whereYouStandNow?.strengths as Array<{
    summary?: string
    countsToward?: string[]
  }> | undefined) ?? []) {
    const summary = sanitizePlannerCopy(String(item?.summary ?? ''), careerPathType)
    const countsToward = (Array.isArray(item?.countsToward) ? item.countsToward : [])
      .map((entry) => sanitizePlannerCopy(String(entry ?? ''), careerPathType))
      .filter(Boolean)
      .slice(0, 2)
      .join(' and ')
    if (!summary || !countsToward) continue
    transferableStrengthMap.set(normalizeKey(summary), countsToward)
  }

  const weightedStrengthLabels = rankContentByPathway(
    [
      ...transferable.map((item) => item.label),
      ...((input.report?.transitionMode?.gaps?.strengths as string[] | undefined) ?? [])
    ].map((item) => sanitizePlannerCopy(item, careerPathType)),
    pathwayWeightingType,
    5
  )
  const weightedStrengths = weightedStrengthLabels.map((label) => ({
    label,
    why:
      transferableStrengthMap.get(normalizeKey(label)) ||
      `Directly supports employer signals for ${roleTargetDisplay}.`
  }))

  const blockerCandidates = [
    ...(
      (input.report?.executionStrategy?.realBlockers?.requiredToApply as Array<{
        label?: string
        whyItMatters?: string
        howToClose?: string
      }> | undefined) ?? []
    ).map((item) => ({
      blocker: sanitizePlannerCopy(String(item?.label ?? ''), careerPathType),
      whyItMatters: sanitizePlannerCopy(String(item?.whyItMatters ?? ''), careerPathType),
      howToFix: sanitizePlannerCopy(String(item?.howToClose ?? ''), careerPathType)
    })),
    ...(
      (input.report?.executionStrategy?.realBlockers?.requiredToCompete as Array<{
        label?: string
        whyItMatters?: string
        howToClose?: string
      }> | undefined) ?? []
    ).map((item) => ({
      blocker: sanitizePlannerCopy(String(item?.label ?? ''), careerPathType),
      whyItMatters: sanitizePlannerCopy(String(item?.whyItMatters ?? ''), careerPathType),
      howToFix: sanitizePlannerCopy(String(item?.howToClose ?? ''), careerPathType)
    })),
    ...required.map((item) => ({
      blocker: sanitizePlannerCopy(item.label, careerPathType),
      whyItMatters: `Hiring teams screen this before moving candidates forward in ${roleTargetDisplay}.`,
      howToFix:
        evidenceRequired.find((entry) => normalizeKey(entry).includes(normalizeKey(item.label))) ||
        `Build one concrete readiness example for ${item.label}.`
    }))
  ].filter((item) => item.blocker && item.whyItMatters && item.howToFix)

  const weightedBlockers = blockerCandidates
    .map((item, index) => ({
      ...item,
      index,
      score: scorePathwayRelevance(`${item.blocker} ${item.whyItMatters} ${item.howToFix}`, pathwayWeightingType)
    }))
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score
      return left.index - right.index
    })
    .slice(0, 4)
    .map(({ blocker, whyItMatters, howToFix }) => ({
      blocker,
      whyItMatters: toPracticalBlockerWhy({ whyItMatters, roleTargetDisplay }),
      howToFix: toPracticalBlockerFix({ blocker, howToFix, pathwayWeightingType })
    }))

  const mustHaveRaw = uniqueNormalizedStrings(
    [
      input.report?.targetRequirements?.education
        ? `Education baseline: ${sanitizePlannerCopy(input.report.targetRequirements.education, careerPathType)}`
        : '',
      ...((input.report?.targetRequirements?.certifications as string[] | undefined) ?? []),
      ...((input.report?.targetRequirements?.hardGates as string[] | undefined) ?? []),
      ...(
        (input.report?.transitionSections?.mandatoryGateRequirements as Array<{ label?: string }> | undefined) ?? []
      ).map((item) => String(item?.label ?? ''))
    ]
      .map((item) => sanitizePlannerCopy(String(item ?? ''), careerPathType))
      .filter(Boolean)
  )

  const niceToHaveRaw = uniqueNormalizedStrings(
    [
      ...((input.report?.transitionReport?.niceToHaves as Array<{ label?: string }> | undefined) ?? []).map((item) =>
        String(item?.label ?? '')
      ),
      ...(
        (input.report?.transitionSections?.coreHardSkills as Array<{ label?: string; gapLevel?: string }> | undefined) ??
        []
      )
        .filter((item) => item?.gapLevel !== 'missing')
        .map((item) => String(item?.label ?? ''))
    ]
      .map((item) => sanitizePlannerCopy(item, careerPathType))
      .filter(Boolean)
  )

  const missingNowRaw = uniqueNormalizedStrings(
    [
      ...(
        (input.report?.transitionSections?.mandatoryGateRequirements as Array<{
          label?: string
          gapLevel?: 'met' | 'partial' | 'missing'
        }> | undefined) ?? []
      )
        .filter((item) => item?.gapLevel !== 'met')
        .map((item) => String(item?.label ?? '')),
      ...required.filter((item) => item.progress < 60).map((item) => item.label),
      ...((input.report?.transitionMode?.gaps?.missing as string[] | undefined) ?? [])
    ]
      .map((item) => sanitizePlannerCopy(item, careerPathType))
      .filter(Boolean)
  )

  const skillsAlreadyHaveRaw = uniqueNormalizedStrings(
    [
      ...transferable.map((item) => item.label),
      ...((input.report?.transitionMode?.gaps?.strengths as string[] | undefined) ?? [])
    ].map((item) => sanitizePlannerCopy(item, careerPathType))
  )
  const skillsNeedSoonRaw = uniqueNormalizedStrings(
    [
      ...required.map((item) => item.label),
      ...(
        (input.report?.transitionSections?.coreHardSkills as Array<{ label?: string; gapLevel?: string }> | undefined) ??
        []
      )
        .filter((item) => item?.gapLevel !== 'met')
        .map((item) => String(item?.label ?? ''))
    ].map((item) => sanitizePlannerCopy(item, careerPathType))
  )
  const skillsLaterRaw = uniqueNormalizedStrings(
    [
      ...strongestPath.map((item) => item.detail),
      ...(checklistLongTerm.length > 0 ? checklistLongTerm : longFallback)
    ].map((item) => sanitizePlannerCopy(item, careerPathType))
  )

  const rankedMustHave = rankContentByPathway(mustHaveRaw, pathwayWeightingType, 5)
  const rankedNiceToHave = rankContentByPathway(niceToHaveRaw, pathwayWeightingType, 5)
  const rankedMissingNow = rankContentByPathway(missingNowRaw, pathwayWeightingType, 5)

  const rankedSkillsAlreadyHaveBase = rankContentByPathway(skillsAlreadyHaveRaw, pathwayWeightingType, 7)
  const rankedSkillsNeedSoonBase = rankContentByPathway(skillsNeedSoonRaw, pathwayWeightingType, 7)
  const rankedSkillsLaterBase = rankContentByPathway(skillsLaterRaw, pathwayWeightingType, 7)

  const rankedSkillsAlreadyHave = removeOverlappingItems(rankedSkillsAlreadyHaveBase, rankedMissingNow).slice(0, 5)
  let rankedSkillsNeedSoon = removeOverlappingItems(rankedSkillsNeedSoonBase, [
    ...rankedMustHave,
    ...rankedMissingNow
  ]).slice(0, 5)
  if (rankedSkillsNeedSoon.length === 0) {
    rankedSkillsNeedSoon = rankedSkillsNeedSoonBase.slice(0, 5)
  }
  let rankedSkillsLater = removeOverlappingItems(rankedSkillsLaterBase, [
    ...rankedSkillsNeedSoon,
    ...rankedMissingNow
  ]).slice(0, 5)
  if (rankedSkillsLater.length === 0) {
    rankedSkillsLater = rankedSkillsLaterBase.slice(0, 5)
  }

  const certRequiredRaw = uniqueNormalizedStrings(
    [
      input.report?.targetRequirements?.education
        ? `Education: ${sanitizePlannerCopy(input.report.targetRequirements.education, careerPathType)}`
        : '',
      ...((input.report?.targetRequirements?.certifications as string[] | undefined) ?? []),
      ...((input.report?.targetRequirements?.hardGates as string[] | undefined) ?? [])
    ]
      .map((item) => sanitizePlannerCopy(item, careerPathType))
      .filter(Boolean)
  )
  const certRecommendedRaw = uniqueNormalizedStrings(
    trainingCourses
      .filter((course) => course.priorityLabel !== 'Later-stage')
      .map((course) => sanitizePlannerCopy(course.name, careerPathType))
  )
  const certOptionalRaw = uniqueNormalizedStrings(
    [
      ...trainingCourses
        .filter((course) => course.priorityLabel === 'Later-stage')
        .map((course) => sanitizePlannerCopy(course.name, careerPathType)),
      ...((input.report?.transitionReport?.niceToHaves as Array<{ label?: string }> | undefined) ?? []).map((item) =>
        sanitizePlannerCopy(String(item?.label ?? ''), careerPathType)
      )
    ].filter(Boolean)
  )

  const resumeSignalRows = (
    (input.report?.executionStrategy?.whereYouStandNow?.strengths as Array<{
      summary?: string
      resumeSignal?: string
    }> | undefined) ?? []
  )
    .flatMap((item) => [item?.resumeSignal, item?.summary])
    .map((item) => sanitizePlannerCopy(String(item ?? ''), careerPathType))
    .filter(Boolean)

  const resumeEvidenceAlready = rankContentByPathway(
    resumeSignalRows.length > 0 ? resumeSignalRows : transferable.map((item) => item.label),
    pathwayWeightingType,
    4
  )
  const resumeEvidenceMissingBase = rankContentByPathway(
    [...evidenceRequired, ...missingNowRaw],
    pathwayWeightingType,
    6
  )
  let resumeEvidenceMissing = removeOverlappingItems(resumeEvidenceMissingBase, [
    ...rankedMissingNow,
    ...rankedSkillsNeedSoon
  ]).slice(0, 4)
  if (resumeEvidenceMissing.length === 0) {
    resumeEvidenceMissing = resumeEvidenceMissingBase.slice(0, 4)
  }
  const resumeArtifactsRaw = uniqueNormalizedStrings([
    ...proofTargets,
    ...resumeEvidenceMissing.map((item) => `Resume bullet + artifact for: ${item}`)
  ])

  const sortedByFastest = [...alternativeCards].sort(
    (left, right) => parseTimelineMidpointMonths(left.timeline) - parseTimelineMidpointMonths(right.timeline)
  )
  const sortedByUpside = [...alternativeCards].sort(
    (left, right) => parseSalaryUpperBound(right.salary.value) - parseSalaryUpperBound(left.salary.value)
  )
  const usedAdjacentTitles = new Set<string>()
  const pickAdjacent = (candidates: PlannerDashboardAlternative[]) => {
    for (const candidate of candidates) {
      const key = normalizedLabelKey(candidate.title)
      if (!key || usedAdjacentTitles.has(key)) continue
      usedAdjacentTitles.add(key)
      return candidate
    }
    return null
  }
  const adjacentFastest = pickAdjacent(sortedByFastest)
  const adjacentClosest = pickAdjacent(alternativeCards)
  const adjacentUpside = pickAdjacent(sortedByUpside)

  const longerTermRoadmapWindows = buildTimelineWindows({
    windows: [
    {
      label: '30 Days',
      actions: month1PlanActions,
      fallback: (checklistImmediate.length > 0 ? checklistImmediate : nowFallback).map((item) =>
        sanitizePlannerCopy(item, careerPathType)
      )
    },
    {
      label: '60 Days',
      actions: month2PlanActions,
      fallback: (checklistShortTerm.length > 0 ? checklistShortTerm : shortFallback).map((item) =>
        sanitizePlannerCopy(item, careerPathType)
      )
    },
    {
      label: '90 Days+',
      actions: month3PlanActions,
      fallback: (checklistLongTerm.length > 0 ? checklistLongTerm : longFallback).map((item) =>
        sanitizePlannerCopy(item, careerPathType)
      )
    }
    ],
    pathwayWeightingType
  })

  return {
    missingFields: missingFallbackFields,
    summaryStrip: {
      planScore: `${compatibilityScore} / 100`,
      // Plain, non-alarming readiness bands (no confusing "Week 2"/"Recovery" framing).
      planStatus:
        compatibilityScore >= 80
          ? 'Strong starting point'
          : compatibilityScore >= 65
            ? 'Solid foundation'
            : compatibilityScore >= 45
              ? 'Promising — gaps to close'
              : 'Early — plan builds it up',
      confidenceTrend: `${trendEndPercent - trendStartPercent >= 0 ? '+' : ''}${trendEndPercent - trendStartPercent} pts`,
      modelVersion: 'Career Graph v2.3',
      dataFreshness: toReadableShortDate(input.lastGeneratedAt)
    },
    summaryBar: {
      currentRole: roleCurrent,
      targetRole: roleTargetDisplay,
      location: input.locationText.trim() || 'Not set',
      timeline: input.timelineBucket,
      skillsCount: input.skillsCount,
      lastUpdated: toReadableDate(input.lastGeneratedAt)
    },
    pathwayWeighting: {
      type: pathwayWeightingType,
      label: pathwayWeightingLabel(pathwayWeightingType),
      emphasis: pathwayEmphasis
    },
    decision: {
      currentRole: roleCurrent,
      targetRole: roleTargetDisplay,
      transitionVerdict: transitionVerdict,
      fastestRoute,
      estimatedTimeline: timelineLabel,
      biggestBlocker,
      routeType
    },
    actionWindow14: {
      thisWeek: rankContentByPathway(actionThisWeekCandidates, pathwayWeightingType, 4),
      nextWeek: rankContentByPathway(actionNextWeekCandidates, pathwayWeightingType, 4),
      proofToCollect: rankContentByPathway(proofToCollectCandidates, pathwayWeightingType, 4)
    },
    blockers: weightedBlockers,
    strengths: weightedStrengths.map((item) => ({
      advantage: sanitizeShortClaim(item.label, 'Relevant transferable strength'),
      whyItMatters: sanitizeShortClaim(item.why, `Directly supports employer signals for ${roleTargetDisplay}.`)
    })),
    requirementsGaps: {
      mustHave: rankedMustHave,
      niceToHave: rankedNiceToHave,
      missingNow: rankedMissingNow
    },
    skillsBuckets: {
      alreadyHave: rankedSkillsAlreadyHave,
      needSoon: rankedSkillsNeedSoon,
      laterStage: rankedSkillsLater
    },
    certEducation: {
      required: rankContentByPathway(certRequiredRaw, pathwayWeightingType, 5),
      recommended: rankContentByPathway(certRecommendedRaw, pathwayWeightingType, 5),
      optional: rankContentByPathway(certOptionalRaw, pathwayWeightingType, 5),
      effortSummary:
        routeType === 'education-first'
          ? `Education gate is the pacing factor. Use ${timelineLabel} as the realistic planning window.`
          : routeType === 'certification-first'
            ? `Certification sequencing drives speed. Use ${timelineLabel} as your practical estimate.`
            : `Sequence these requirements inside a ${timelineLabel} execution plan.`
    },
    resumeEvidence: {
      alreadyProves: resumeEvidenceAlready,
      stillNeedsProof: resumeEvidenceMissing,
      artifacts: rankContentByPathway(resumeArtifactsRaw, pathwayWeightingType, 4)
    },
    adjacentEntryOptions: {
      fastestEntry: adjacentFastest,
      closestMatch: adjacentClosest,
      bestLongTermUpside: adjacentUpside
    },
    longerTermRoadmap: {
      windows: longerTermRoadmapWindows
    },
    hero: {
      title: transitionLabel,
      mappedPathLabel:
        mappedTradePathLabel &&
        cleanGeneratedLabel(mappedTradePathLabel).toLowerCase() !== cleanGeneratedLabel(roleTargetDisplay).toLowerCase()
          ? `Mapped to Ontario pathway: ${mappedTradePathLabel}`
          : undefined,
      insight:
        sanitizePlannerCopy(input.report?.transitionStructuredPlan?.summary || '', careerPathType) ||
        'A realistic switch with strong upside. Your highest-leverage moves are completing credentials quickly and maintaining weekly outreach consistency.',
      scenarioModes: [
        { label: 'Fastest', active: true },
        { label: 'Balanced', active: false },
        { label: 'Low Risk', active: false }
      ],
      routeType,
      transitionVerdict,
      fastestRoute,
      biggestBlocker,
      difficulty: {
        value: difficultyLabel,
        badge: missingFallbackFields.includes('hero.difficulty') ? 'Estimate' : undefined,
        sourceType: missingFallbackFields.includes('hero.difficulty') ? 'estimate' : 'derived',
        sourceLabel: 'Planner compatibility model'
      },
      timeline: {
        value: timelineLabel,
        badge: missingFallbackFields.includes('hero.timeline') ? 'Estimate' : undefined,
        sourceType: missingFallbackFields.includes('hero.timeline') ? 'estimate' : 'derived',
        sourceLabel: isTradeApprenticeship
          ? `Time to first field entry${fullQualificationWindow ? `; full qualification typically ${fullQualificationWindow}` : ''}`
          : missingFallbackFields.includes('hero.timeline')
            ? 'Timeline bucket estimate'
            : 'Transition roadmap and requirements'
      },
      probability: {
        value: `${clampPercent(compatibilityScore)}%`,
        sourceType: 'derived',
        sourceLabel: 'Planner compatibility model'
      },
      trainingCost: {
        value: heroTrainingCost,
        badge:
          heroTrainingCostSourceType === 'estimate'
            ? 'Needs data'
            : sourcedTrainingRange
              ? undefined
              : 'Estimate',
        sourceType: heroTrainingCostSourceType,
        sourceLabel:
          sourcedTrainingRange
            ? 'Summed from sourced training cards'
            : hasOntarioExamFee
              ? 'Skilled Trades Ontario certifying exam fee only'
              : 'Confirm provider pricing for this pathway'
      },
      salaryPotential: {
        value: salaryPotential || 'Province wage data unavailable',
        badge: !salaryPotential ? 'Estimate' : undefined,
        sourceType: salaryPotential ? 'verified' : 'estimate',
        sourceLabel: effectiveWageSource?.sourceName?.trim() || 'Regional wage estimate',
        updatedAt: effectiveWageSource?.asOfDate || undefined
      }
    },
    difficultyBreakdown: {
      sourceType: hasDifficultyBreakdownSource ? 'derived' : 'estimate',
      sourceLabel: hasDifficultyBreakdownSource
        ? 'Compatibility breakdown from planner scoring'
        : 'Estimated from overall compatibility score',
      items: difficultyItems,
      explanation:
        sanitizePlannerCopy(input.report?.transitionMode?.difficulty?.why?.[0] || '', careerPathType) ||
        'Biggest barrier is proving role-specific readiness quickly; biggest advantage is transferable execution discipline.',
      driverImpactRows,
      primaryBarrier:
        summarizeGapAction({
          gapLabel: required[0]?.label || 'Technical theory and certification sequencing are the slowest moving constraints.',
          targetDisplayRole: roleTargetDisplay,
          locationText: input.locationText,
          careerPathType,
          isTradeApprenticeship,
          whoHires,
          entryRoles
        }),
      coreAdvantage:
        sanitizePlannerCopy(transferable[0]?.label || '', careerPathType) ||
        'Operational reliability and shift discipline map well to employer expectations.'
    },
    skillTransfer: {
      transferable,
      required,
      largestGap:
        summarizeGapAction({
          gapLabel: required[0]?.label || 'Role-specific technical evidence',
          targetDisplayRole: roleTargetDisplay,
          locationText: input.locationText,
          careerPathType,
          isTradeApprenticeship,
          whoHires,
          entryRoles
        }) || 'Role-specific technical evidence',
      evidenceRequired
    },
    roadmap: {
      phases: displayRoadmapPhases
    },
    fastestPath: {
      headline: tradeFastestPath?.headline || 'Shortest realistic route to first field entry',
      routeType: routeTypeLabel(routeType),
      bestEntryStrategy:
        sanitizePlannerCopy(
          String(
            primaryRoute?.firstStep ||
              input.report?.bottleneck?.nextAction ||
              fastestPath[0]?.detail ||
              'Target the most realistic entry lane and prove readiness with concrete artifacts.'
          ),
          careerPathType
        ) || 'Target the most realistic entry lane and prove readiness with concrete artifacts.',
      steps: fastestPath,
      strongestPath,
      tradeFacts
    },
    training: {
      courses: trainingCourses,
      costStack: trainingCostStack,
      tradeFacts
    },
    resources: {
      cards: resourceCards
    },
    marketSnapshot: {
      entryWage: {
        value: entryWage || 'Province wage data unavailable',
        badge: !entryWage ? 'Estimate' : undefined,
        sourceType: entryWage ? 'verified' : 'estimate',
        sourceLabel: effectiveWageSource?.sourceName?.trim() || 'Regional wage estimate',
        updatedAt: effectiveWageSource?.asOfDate || undefined
      },
      midCareerSalary: {
        value: midWage || 'Province wage data unavailable',
        badge: !midWage ? 'Estimate' : undefined,
        sourceType: midWage ? 'verified' : 'estimate',
        sourceLabel: effectiveWageSource?.sourceName?.trim() || 'Regional wage estimate',
        updatedAt: effectiveWageSource?.asOfDate || undefined
      },
      topEarners: {
        value: topEarners || 'Province wage data unavailable',
        badge: !topEarners ? 'Estimate' : undefined,
        sourceType: topEarners ? 'verified' : 'estimate',
        sourceLabel: effectiveWageSource?.sourceName?.trim() || 'Regional wage estimate',
        updatedAt: effectiveWageSource?.asOfDate || undefined
      },
      localDemand: {
        value: localDemandLabel,
        badge: !marketSnapshot?.summaryLine ? 'Needs data' : undefined,
        sourceType: marketSnapshot?.summaryLine ? 'verified' : 'estimate',
        sourceLabel: marketSnapshot?.summaryLine ? 'Employer evidence' : 'Needs stronger source coverage',
        updatedAt: input.lastGeneratedAt || undefined
      },
      hiringRequirements: {
        value: hiringRequirementsSummary,
        badge: hiringReqCount > 0 ? undefined : 'Add your info',
        sourceType: hiringReqCount > 0 ? 'verified' : 'estimate',
        sourceLabel: hiringReqCount > 0 ? 'Employer evidence' : 'Needs stronger source coverage'
      },
      wageSourceLabel:
        effectiveWageSource?.sourceName?.trim() ||
        (entryWage || midWage || topEarners ? 'Regional wage dataset' : 'Regional estimate'),
      demandSourceLabel:
        marketSnapshot?.summaryLine || hiringReqCount > 0
          ? isTradeApprenticeship
            ? tradeTargetStage === 'apprentice'
              ? 'Employer evidence across apprentice-entry and trade-family roles'
              : 'Employer evidence across trade-family roles'
            : 'Employer evidence'
          : 'Needs stronger source coverage'
    },
    marketProof: {
      summary:
        cleanGeneratedLabel(String(marketSnapshot?.summaryLine ?? '')).trim() ||
        (marketProofRequirements.length > 0
          ? `Using available requirement signals for ${roleTargetDisplay}. Add a target posting to strengthen live evidence.`
          : `Market evidence is still building for ${roleTargetDisplay}.`),
      postingsCount: postingsCountFromEvidence ?? postingsCountFromSummary,
      baselineOnlyWarning:
        typeof evidenceTransparency?.baselineOnlyWarning === 'string'
          ? cleanGeneratedLabel(evidenceTransparency.baselineOnlyWarning).trim() || null
          : null,
      requirements: marketProofRequirements
    },
    outreach: {
      intro: 'Use concise, evidence-based messaging tied to real employer requirements.'
    },
    realityCheck: {
      applicationsNeeded: {
        value: `${Math.max(12, Math.round((100 - compatibilityScore) / 3) + 18)} applications`,
        badge: 'Estimate',
        sourceType: 'estimate',
        sourceLabel: 'Planner estimate from competition and timeline'
      },
      timeToOffer: {
        value: timelineLabel,
        badge: missingFallbackFields.includes('hero.timeline') ? 'Estimate' : undefined,
        sourceType: missingFallbackFields.includes('hero.timeline') ? 'estimate' : 'derived',
        sourceLabel: isTradeApprenticeship
          ? `Time to first field entry${fullQualificationWindow ? `; full qualification typically ${fullQualificationWindow}` : ''}`
          : missingFallbackFields.includes('hero.timeline')
            ? 'Timeline bucket estimate'
            : 'Transition roadmap and requirements'
      },
      competitionLevel: {
        value:
          probabilityRealityCheck?.difficulty ||
          (compatibilityScore >= 70 ? 'Moderate' : compatibilityScore >= 50 ? 'Moderate-High' : 'High'),
        badge: !probabilityRealityCheck?.difficulty ? 'Estimate' : undefined,
        sourceType: probabilityRealityCheck?.difficulty ? 'derived' : 'estimate',
        sourceLabel: probabilityRealityCheck?.difficulty ? 'Execution strategy assessment' : 'Planner estimate'
      },
      financialTradeoff: {
        value:
          sanitizePlannerCopy(reality?.barriers?.[0] || '', careerPathType) ||
          'Short-term income tradeoff may be required while you build entry evidence.',
        badge: !reality?.barriers?.[0] ? 'Estimate' : undefined,
        sourceType: reality?.barriers?.[0] ? 'derived' : 'estimate',
        sourceLabel: reality?.barriers?.[0] ? 'Transition reality analysis' : 'Planner estimate'
      }
    },
    checklist: {
      immediate: checklistImmediate.length > 0 ? checklistImmediate : nowFallback,
      shortTerm: checklistShortTerm.length > 0 ? checklistShortTerm : shortFallback,
      longTerm: checklistLongTerm.length > 0 ? checklistLongTerm : longFallback,
      progressPercent: weightedPercent,
      nowCompletionPercent: clampPercent(
        (() => {
          const nowTasks = roadmapTasks.filter((task) => task.category === 'now')
          if (nowTasks.length === 0) return 0
          return (nowTasks.filter((task) => task.checked).length / nowTasks.length) * 100
        })()
      ),
      nextCompletionPercent: clampPercent(
        (() => {
          const nextTasks = roadmapTasks.filter((task) => task.category === 'next')
          if (nextTasks.length === 0) return 0
          return (nextTasks.filter((task) => task.checked).length / nextTasks.length) * 100
        })()
      ),
      blockedCompletionPercent: clampPercent(
        (() => {
          const blockedTasks = roadmapTasks.filter((task) => task.category === 'blocked')
          if (blockedTasks.length === 0) return 0
          return (blockedTasks.filter((task) => task.checked).length / blockedTasks.length) * 100
        })()
      ),
      reminderBadges: ['Reminders: On', 'Review every Friday', 'Streak: 2 weeks']
    },
    alternatives: {
      cards: alternativeCards,
      compareA,
      compareB
    },
    insights: {
      welcomeBack: {
        title: 'Welcome back.',
        bodyLines: [
          `Your planner progress is currently ${weightedPercent}% complete.`,
          'Use the roadmap to close the next weighted checkpoint.'
        ],
        recommendedAction:
          input.report?.bottleneck?.nextAction || 'Complete the next role-relevant checkpoint and log the outcome.'
      },
      aiInsight: {
        summary:
          'Confidence is rising as you complete credentials. Biggest risk: credential delay. Biggest advantage: operational reliability and team discipline.',
        trendLabel: 'Confidence Trend',
        trendStartPercent,
        trendEndPercent,
        bars: trendBars
      }
    },
    stickyPanel: {
      transition: transitionLabel,
      difficulty: difficultyLabel,
      timeline: timelineLabel,
      nextSteps: roadmapTasks.filter((task) => !task.checked).map((task) => task.label).slice(0, 4),
      nextBestAction:
        sanitizePlannerCopy(
          input.report?.bottleneck?.nextAction ||
            input.report?.transitionMode?.gaps?.first3Steps?.[0] ||
            '',
          careerPathType
        ) ||
        'Follow up with 5 warm employers this week and log outcomes.',
      progressToOffer: weightedPercent
    },
    progress: {
      tasks: roadmapTasks,
      phases: phaseProgress,
      weightedPercent,
      updatedAt: input.lastGeneratedAt
    },
    methodology: {
      scoreSummary:
        'This planner combines compatibility scoring, employer evidence, target requirements, and timeline constraints into a decision-support estimate.',
      sourceLines: [
        `Difficulty and probability: ${hasDifficultyBreakdownSource ? 'planner compatibility breakdown' : 'derived planner estimate'}`,
        `Wages: ${effectiveWageSource?.sourceName?.trim() || 'regional wage estimate'}`,
        `Demand and hiring requirements: ${
          marketSnapshot?.summaryLine || hiringReqCount > 0
            ? isTradeApprenticeship
              ? tradeTargetStage === 'apprentice'
                ? 'employer evidence across apprentice-entry and trade-family roles'
                : 'employer evidence across trade-family roles'
              : 'employer evidence'
            : 'limited source coverage'
        }`,
        `Training recommendations: ${
          trainingCourses.some((course) => course.sourceType === 'verified')
            ? 'official or provider-backed training sources'
            : trainingCourses.some((course) => course.sourceType === 'derived')
              ? 'target requirements with provider confirmation needed'
              : 'estimated from target requirements'
        }`
      ]
    }
  }
}


