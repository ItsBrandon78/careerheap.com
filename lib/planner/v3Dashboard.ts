import type { PlannerResultView } from '@/lib/planner/types'

export type PlannerViewMode = 'intake' | 'dashboard'

export type FallbackBadge = 'Needs data' | 'Estimate' | 'Add your info'
export type SourceType = 'verified' | 'derived' | 'estimate'

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
  hero: {
    title: string
    insight: string
    scenarioModes: Array<{ label: string; active: boolean }>
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
    steps: Array<{ label: string; detail: string }>
    strongestPath: Array<{ label: string; detail: string }>
    tradeFacts: Array<{ label: string; value: string }>
  }
  training: {
    courses: Array<{
      id: string
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
    }>
    costStack: Array<DashboardFallbackValue<string> & { label: string }>
    tradeFacts: Array<{ label: string; value: string }>
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

function stepLabelFromTradeText(value: string, index: number) {
  const normalized = cleanGeneratedLabel(value).toLowerCase()
  if (/(helper|labourer|laborer|pre-apprentice|entry)/.test(normalized)) return 'Entry Route'
  if (/(sponsor|contractor|union shop|employer)/.test(normalized)) return 'Sponsorship'
  if (/(register|agreement|skilled trades ontario|apprenticeship agreement)/.test(normalized)) {
    return 'Registration'
  }
  if (/(hour|on-the-job|school|in-school|level)/.test(normalized)) return 'Apprenticeship Loop'
  if (/(exam|certificate of qualification|red seal|qualification)/.test(normalized)) return 'Qualification'
  return `Step ${index + 1}`
}

function normalizeLocalDemandLabel(summaryLine: string | null | undefined, location: string) {
  const raw = typeof summaryLine === 'string' ? cleanGeneratedLabel(summaryLine.trim()) : ''
  if (!raw) return 'Unknown - needs data source'

  const postingsMatch = raw.match(/(\d+)\s+recent postings in\s+(.+?)(?:\.|$)/i)
  if (postingsMatch) {
    return `Based on ${postingsMatch[1]} recent postings in ${postingsMatch[2].trim()}.`
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

function buildHiringRequirementsSummary(
  items: Array<{ label?: string }> | undefined,
  count: number
) {
  if (!Array.isArray(items) || items.length === 0 || count === 0) {
    return 'Add target posting or market evidence to surface requirement frequency'
  }

  const themes = uniqueNormalizedStrings(
    items
      .map((item) => normalizeRequirementTheme(String(item?.label ?? '')))
      .filter(Boolean)
  ).slice(0, 2)

  if (themes.length === 0) {
    return `${count} recurring hiring signals identified`
  }

  if (themes.length === 1) {
    return `Most common signal: ${themes[0]}`
  }

  return `${themes[0]} and ${themes[1]} recur most often`
}

type StarterCertificationCandidate = {
  name: string
  sourceLabel: string
  sourceType: SourceType
  sourceUrl?: string | null
  provider: string
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
      provider: cleanGeneratedLabel(String(item?.provider ?? '')).trim() || 'Official requirement source'
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
        provider: source.sourceLabel === 'Employer evidence' ? 'Employer evidence' : 'Official requirement source'
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

function cleanGeneratedLabel(value: string) {
  return value
    .replace(/^skill already listed:\s*/i, '')
    .replace(/^credential:\s*/i, '')
    .replace(/\bproof builder\b/gi, 'readiness example')
    .replace(/\bproof artifact\b/gi, 'verification item')
    .replace(/\bproof project\b/gi, 'practical work sample')
    .replace(/\bproof\b/gi, 'readiness example')
    .replace(/\s+/g, ' ')
    .trim()
}

function sourceBadgeForType(sourceType: SourceType): FallbackBadge | undefined {
  if (sourceType === 'estimate') return 'Estimate'
  return undefined
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
  const normalized = value.trim().toLowerCase()
  if (normalized === 'apprentice electrician') return 'Electrician (309A)'
  if (normalized === 'electrician construction and maintenance') return 'Electrician (309A)'
  if (normalized === 'industrial electrician') return 'Industrial Electrician (442A)'
  if (normalized === 'apprentice plumber' || normalized === 'plumber') return 'Plumber (306A)'
  if (normalized === 'general carpenter' || normalized === 'carpenter') return 'General Carpenter (403A)'
  return value
    .trim()
    .split(/\s+/)
    .map((token) => {
      if (!token) return token
      if (/^[A-Z0-9/+-]+$/.test(token)) return token
      const normalized = token.toLowerCase()
      return normalized.charAt(0).toUpperCase() + normalized.slice(1)
    })
    .join(' ')
}

function formatHours(value: number | null | undefined) {
  if (!value || !Number.isFinite(value)) return null
  return `${value.toLocaleString()} hours`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function estimateTrainingCost(report: any | null) {
  const certifications = Array.isArray(report?.targetRequirements?.certifications)
    ? report.targetRequirements.certifications.length
    : 0

  if (certifications >= 3) return '$2k-$6k'
  if (certifications >= 1) return '$1k-$4k'
  return '$1k-$4k'
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
  const lowLabel = formatter.format(normalizeHourlyCompensation(low)).replace(/^CA\$/i, '$')
  const highLabel = formatter.format(normalizeHourlyCompensation(high)).replace(/^CA\$/i, '$')
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
  targetRole: string
  locationText: string
  examRequired: boolean
  apprenticeshipHours: number | null
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

  const fastestSteps = (entryPath?.steps ?? [])
    .slice(0, 4)
    .map((step: string, index: number) => ({
      label: stepLabelFromTradeText(step, index),
      detail: sentenceCase(step)
    }))

  const requirementNames = mustHave
    .map((item: { name: string }) => sentenceCase(item.name))
    .filter(Boolean)
  const supportNames = niceToHave
    .map((item: { name: string }) => sentenceCase(item.name))
    .filter(Boolean)
  const apprenticeshipLoopPhase = timelinePhases.find((phase: { phase: string }) =>
    /(training|apprenticeship|school)/i.test(String(phase.phase ?? ''))
  )
  const qualificationPhase = timelinePhases.find((phase: { phase: string }) =>
    /(credential|qualification|exam|cert)/i.test(String(phase.phase ?? ''))
  )

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
      label: 'Target Employers',
      detail: `Focus first on sponsor-ready employers such as ${whoHires.slice(0, 3).join(', ')}.`
    })
  }

  if (requirementNames.length > 0) {
    strongestSteps.push({
      label: 'Program Requirements',
      detail: `Confirm the formal apprenticeship requirements for ${args.targetRole} in ${
        args.locationText || 'your province'
      }: ${requirementNames.slice(0, 2).join('; ')}.`
    })
  }

  if (apprenticeshipLoopPhase?.milestones?.length) {
    strongestSteps.push({
      label: 'Hours And School',
      detail: apprenticeshipLoopPhase.milestones
        .slice(0, 2)
        .map((item: { done_when: string; title: string }) => sentenceCase(item.done_when || item.title))
        .join(' ')
    })
  } else if (args.apprenticeshipHours) {
    strongestSteps.push({
      label: 'Hours And School',
      detail: `Track progress toward ${args.apprenticeshipHours.toLocaleString()} apprenticeship hours and complete each required in-school training level.`
    })
  }

  if (args.examRequired) {
    strongestSteps.push({
      label: 'Qualification',
      detail: qualificationPhase?.milestones?.[0]
        ? sentenceCase(qualificationPhase.milestones[0].done_when || qualificationPhase.milestones[0].title)
        : 'Prepare for the Certificate of Qualification / Red Seal exam once your hours and school levels are complete.'
    })
  }

  return {
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
  const roleTarget = toRoleDisplay(roleTargetRaw)
  const transitionLabel = `${roleCurrent} -> ${roleTarget}`

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
      ? `${input.report.transitionMode.timeline.minMonths}-${input.report.transitionMode.timeline.maxMonths} months`
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
  const salaryPotential = salaryRangeToLabel(effectiveWageSource?.low, effectiveWageSource?.high, salaryCurrency)
  const entryWage = salaryRangeToLabel(effectiveWageSource?.low, effectiveWageSource?.median, salaryCurrency)
  const midWage = hourlyValueToLabel(effectiveWageSource?.median, salaryCurrency)
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
          label,
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
          label,
          progress: skillGaps.find((item) => item.label === label)?.progress ?? Math.max(25, 55 - index * 10)
        }))
      : [
          { label: 'Role-specific technical fundamentals', progress: 30 },
          { label: 'Credential-aligned safety evidence', progress: 35 },
          { label: 'Employer-ready work samples', progress: 40 }
        ]

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

  const fastestPathSource =
    (input.report?.transitionSections?.roadmapPlan?.fastestPathToApply as string[] | undefined) ??
    (input.report?.transitionReport?.plan30_60_90?.fastestPathToApply as Array<{ goal?: string }> | undefined)
      ?.map((item) => String(item.goal ?? '').trim())

  const isTradeApprenticeship =
    pathwayProfile?.meta?.pathway_type === 'trade_apprenticeship' ||
    Boolean(
      (pathwayProfile?.meta?.codes?.trade_code as string | null | undefined) ??
        sourceTradeFacts?.tradeCode ??
        input.report?.targetRequirements?.apprenticeshipHours
    )

  const tradeFastestPath =
    isTradeApprenticeship && pathwayProfile
      ? buildTradeFastestPath({
          profile: pathwayProfile,
          targetRole: roleTarget,
          locationText: input.locationText || 'your province',
          examRequired,
          apprenticeshipHours
        })
      : null

  const fastestPath =
    tradeFastestPath && tradeFastestPath.fastestSteps.length > 0
      ? tradeFastestPath.fastestSteps
      : Array.isArray(fastestPathSource) && fastestPathSource.length > 0
        ? fastestPathSource.slice(0, 4).map((item, index) => ({
            label: `Month ${index + 1}`,
            detail: item
          }))
        : [
            { label: 'Month 1', detail: 'Complete baseline credential and contact 20 target employers.' },
            { label: 'Month 2', detail: 'Enroll in core technical foundations course.' },
            { label: 'Month 3-4', detail: 'Secure apprenticeship or entry-track sponsorship.' }
          ]

  pushIfMissing(missingFields, 'fastest_path.steps', !fastestPathSource || fastestPathSource.length === 0)

  const certificationNames = uniqueNormalizedStrings(
    ((input.report?.targetRequirements?.certifications as string[] | undefined) ?? [])
      .map((item) => cleanGeneratedLabel(String(item ?? '')))
      .filter(Boolean)
  ).slice(0, 3)
  const hardGateCourseNames = uniqueNormalizedStrings(
    ((input.report?.targetRequirements?.hardGates as string[] | undefined) ?? [])
      .map((item) => cleanGeneratedLabel(String(item ?? '')))
      .filter((item) => /\b(cert|license|licen|registration|safety|exam|cpr|whmis|csts)\b/i.test(item))
  ).slice(0, 3)
  const trainingNames = uniqueNormalizedStrings([...certificationNames, ...hardGateCourseNames]).slice(0, 3)
  const enrichedTrainingCards =
    Array.isArray(input.report?.sourceEnrichment?.trainingCards)
      ? input.report.sourceEnrichment.trainingCards
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
      name: cleanGeneratedLabel(String(card?.name ?? '').trim()),
      provider: String(card?.provider ?? 'Official provider listing').trim(),
      length: card?.length ?? null,
      cost: card?.cost ?? null,
      modality: card?.modality ?? null,
      sourceUrl: card?.sourceUrl ?? null,
      sourceType: card?.sourceType ?? 'verified',
      sourceLabel: String(card?.sourceLabel ?? 'Official source').trim()
    }))
    .filter((card: { name: string }) => !isGenericTrainingCardName(card.name))
  const profileTrainingLinks = Array.isArray(pathwayProfile?.resources?.training)
    ? pathwayProfile.resources.training
    : []
  const profileOfficialLinks = Array.isArray(pathwayProfile?.resources?.official)
    ? pathwayProfile.resources.official
    : []
  const marketSnapshot = input.report?.transitionReport?.marketSnapshot
  const tradeFacts = [
    apprenticeshipHours ? { label: 'Total Apprenticeship', value: formatHours(apprenticeshipHours) ?? '' } : null,
    onTheJobHours ? { label: 'On-the-job', value: formatHours(onTheJobHours) ?? '' } : null,
    inSchoolHours ? { label: 'In-school', value: formatHours(inSchoolHours) ?? '' } : null,
    examRequired ? { label: 'Certifying Exam', value: 'Required in Ontario' } : null,
    sourceTradeFacts?.academicStandard
      ? { label: 'Academic Standard', value: sourceTradeFacts.academicStandard }
      : null
  ].filter((item): item is { label: string; value: string } => Boolean(item)).slice(0, 4)
  const employableWindow =
    pathwayProfile?.timeline?.time_to_employable?.min_weeks && pathwayProfile?.timeline?.time_to_employable?.max_weeks
      ? `${pathwayProfile.timeline.time_to_employable.min_weeks}-${pathwayProfile.timeline.time_to_employable.max_weeks} weeks`
      : null
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
  const trainingCourses: PlannerDashboardV3Model['training']['courses'] =
    starterCertifications.length > 0
      ? starterCertifications.map((item, index) => ({
          id: toStableTrainingId(item.name, index),
          name: item.name,
          provider: item.provider,
          length: null,
          cost: null,
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
          id: toStableTrainingId(card.name, index)
        }))
      : profileTrainingLinks.length > 0
      ? profileTrainingLinks.slice(0, 3).map((link: { title?: string; url?: string }, index: number) => ({
          id: toStableTrainingId(
            cleanGeneratedLabel(String(link?.title ?? '').trim()) || trainingNames[index] || `Training option ${index + 1}`,
            index
          ),
          name: cleanGeneratedLabel(String(link?.title ?? '').trim()) || trainingNames[index] || `Training option ${index + 1}`,
          provider: link?.url ? providerNameFromUrl(String(link.url)) : 'Official provider listing',
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
              length: null,
              cost: null,
              sourceType: 'estimate' as const,
              sourceLabel: 'Target requirements'
            }
          ]

  pushIfMissing(missingFields, 'training.certifications', trainingNames.length === 0)

  const localDemandLabel = normalizeLocalDemandLabel(marketSnapshot?.summaryLine, input.locationText)

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
      .filter(Boolean)
      .slice(0, 4) ?? []
  const checklistShortTerm =
    (input.report?.transitionSections?.roadmapPlan?.oneToThreeMonths as Array<{ action?: string }> | undefined)
      ?.map((item) => String(item.action ?? '').trim())
      .filter(Boolean)
      .slice(0, 4) ?? []
  const checklistLongTerm =
    (input.report?.transitionSections?.roadmapPlan?.threeToTwelveMonths as Array<{ action?: string }> | undefined)
      ?.map((item) => String(item.action ?? '').trim())
      .filter(Boolean)
      .slice(0, 4) ?? []

  const nowFallback = ['Finalize resume positioning', 'Apply to 10 targeted roles', 'Complete one credential milestone']
  const shortFallback = ['Run weekly outreach cadence', 'Build two practical work samples', 'Track interviews and feedback']
  const longFallback = ['Stabilize in role with 30/60/90 milestones', 'Build next-level specialization plan']

  const roadmapTasks: PlannerDashboardTask[] = roadmapPhases.flatMap((phase) =>
    normalizeRoadmapActions(phase.actions)
      .slice(0, 3)
      .map((label, actionIndex) => {
        const category = categoryForTaskIndex(actionIndex)

        return {
          id: toTaskId(phase.id, label, actionIndex),
          phaseId: phase.id,
          category,
          label: cleanGeneratedLabel(label),
          checked: false,
          weight: TASK_CATEGORY_META[category].weight
        }
      })
  )

  const phaseProgress: PlannerDashboardPhaseProgress[] = roadmapPhases.map((phase) => {
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
        title: String(item.title ?? 'Alternative role'),
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
        reason: String(item?.topReasons?.[0] ?? 'Alternative route with a different risk and timeline profile.')
      })) ?? []

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

  const evidenceRequiredSource = [
    ...(Array.isArray(input.report?.targetRequirements?.hardGates) ? input.report.targetRequirements.hardGates : []),
    ...(Array.isArray(input.report?.targetRequirements?.certifications)
      ? input.report.targetRequirements.certifications
      : [])
    ,
    ...(Array.isArray(input.report?.transitionReport?.marketSnapshot?.topRequirements)
      ? input.report.transitionReport.marketSnapshot.topRequirements
          .slice(0, 3)
          .map((item: { label?: string }) => item?.label ?? '')
      : [])
  ]
    .map((item) => cleanGeneratedLabel(String(item ?? '').trim()))
    .filter(Boolean)
    .slice(0, 6)
  const evidenceRequired =
    uniqueNormalizedStrings(evidenceRequiredSource).length > 0
      ? uniqueNormalizedStrings(evidenceRequiredSource).slice(0, 4)
      : [
          'Safety certification status confirmed',
          'One practical work sample tied to the target role',
          'Resume version tailored to role language',
          'Two references prepared for employer calls'
        ]

  const strongestPathSource =
    (input.report?.transitionSections?.roadmapPlan?.strongCandidatePath as string[] | undefined)?.filter(Boolean) ??
    []
  const strongestPath =
    tradeFastestPath && tradeFastestPath.strongestSteps.length > 0
      ? tradeFastestPath.strongestSteps
      : strongestPathSource.length > 0
        ? strongestPathSource.slice(0, 4).map((item, index) => ({
            label: `Month ${index + 1}`,
            detail: cleanGeneratedLabel(item)
          }))
        : [
            { label: 'Month 1', detail: 'Stack certifications and publish one credible readiness example.' },
            { label: 'Month 2', detail: 'Refine resume narrative to apprenticeship job language and outcomes.' },
            { label: 'Month 3-4', detail: 'Push high-frequency outreach and convert active leads to interviews.' }
          ]

  const fallbackCards: PlannerDashboardAlternative[] = [
    { occupationId: 'hvac-tech', title: 'HVAC Technician', difficulty: 'moderate', timeline: '4-9 months', salary: { value: 'Regional estimate unavailable', badge: 'Estimate' as const, sourceType: 'estimate', sourceLabel: 'Regional estimate' }, reason: 'Lower barrier regulated-trade route with similar hands-on expectations.' },
    { occupationId: 'construction-supervisor', title: 'Construction Supervisor', difficulty: 'moderate', timeline: '6-12 months', salary: { value: 'Regional estimate unavailable', badge: 'Estimate' as const, sourceType: 'estimate', sourceLabel: 'Regional estimate' }, reason: 'Uses coordination and site discipline if you already lead reliably.' },
    { occupationId: 'operations-manager', title: 'Operations Manager', difficulty: 'hard', timeline: '6-12 months', salary: { value: 'Regional estimate unavailable', badge: 'Estimate' as const, sourceType: 'estimate', sourceLabel: 'Regional estimate' }, reason: 'Stronger fit if your experience is more process and team leadership than trade entry.' },
    { occupationId: 'logistics-coordinator', title: 'Logistics Coordinator', difficulty: 'moderate', timeline: '3-6 months', salary: { value: 'Regional estimate unavailable', badge: 'Estimate' as const, sourceType: 'estimate', sourceLabel: 'Regional estimate' }, reason: 'Faster transition if you need a lower-friction bridge role first.' }
  ]
  const alternativeCards = alternatives.length > 0 ? alternatives : fallbackCards
  const compareA = alternativeCards[0] ?? fallbackCards[0]
  const compareB = alternativeCards[1] ?? fallbackCards[1]

  const trendStartPercent = clampPercent(Math.max(35, compatibilityScore - 6))
  const trendEndPercent = clampPercent(compatibilityScore)
  const trendBars = [44, 52, 58, 66, 72, 78]

  const missingFallbackFields = Array.from(new Set(missingFields)).sort()
  const parsedTrainingCostRanges = trainingCourses
    .map((course) => parseCostRange(course.cost))
    .filter((range): range is { min: number; max: number } => Boolean(range))

  return {
    missingFields: missingFallbackFields,
    summaryStrip: {
      planScore: `${compatibilityScore} / 100`,
      planStatus:
        compatibilityScore >= 70 ? 'On Track (Week 2)' : compatibilityScore >= 55 ? 'At Risk (Week 2)' : 'Recovery Plan',
      confidenceTrend: `${trendEndPercent - trendStartPercent >= 0 ? '+' : ''}${trendEndPercent - trendStartPercent} pts`,
      modelVersion: 'Career Graph v2.3',
      dataFreshness: toReadableShortDate(input.lastGeneratedAt)
    },
    summaryBar: {
      currentRole: roleCurrent,
      targetRole: roleTarget,
      location: input.locationText.trim() || 'Not set',
      timeline: input.timelineBucket,
      skillsCount: input.skillsCount,
      lastUpdated: toReadableDate(input.lastGeneratedAt)
    },
    hero: {
      title: transitionLabel,
      insight:
        input.report?.transitionStructuredPlan?.summary ||
        'A realistic switch with strong upside. Your highest-leverage moves are completing credentials quickly and maintaining weekly outreach consistency.',
      scenarioModes: [
        { label: 'Fastest', active: true },
        { label: 'Balanced', active: false },
        { label: 'Low Risk', active: false }
      ],
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
        sourceLabel: missingFallbackFields.includes('hero.timeline')
          ? 'Timeline bucket estimate'
          : 'Transition roadmap and requirements'
      },
      probability: {
        value: `${clampPercent(compatibilityScore)}%`,
        sourceType: 'derived',
        sourceLabel: 'Planner compatibility model'
      },
      trainingCost: {
        value: estimateTrainingCost(input.report),
        badge: sourceBadgeForType('estimate'),
        sourceType: 'estimate',
        sourceLabel:
          profileTrainingLinks.length > 0
            ? 'Official training source coverage is partial; totals remain estimated'
            : trainingNames.length > 0
              ? 'Training requirement estimate'
              : 'Certification count estimate'
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
        input.report?.transitionMode?.difficulty?.why?.[0] ||
        'Biggest barrier is proving role-specific readiness quickly; biggest advantage is transferable execution discipline.',
      driverImpactRows,
      primaryBarrier:
        required[0]?.label || 'Technical theory and certification sequencing are the slowest moving constraints.',
      coreAdvantage:
        transferable[0]?.label || 'Operational reliability and shift discipline map well to employer expectations.'
    },
    skillTransfer: {
      transferable,
      required,
      largestGap: required[0]?.label || 'Role-specific technical evidence',
      evidenceRequired
    },
    roadmap: {
      phases: roadmapPhases
    },
    fastestPath: {
      steps: fastestPath,
      strongestPath,
      tradeFacts
    },
    training: {
      courses: trainingCourses,
      costStack: [
        {
          label: 'Training',
          value: parsedTrainingCostRanges.length > 0
            ? formatCurrencyRange(
                parsedTrainingCostRanges.reduce((sum, range) => sum + range.min, 0),
                parsedTrainingCostRanges.reduce((sum, range) => sum + range.max, 0),
                'CAD'
              )
            : estimateTrainingCost(input.report),
          badge: 'Estimate',
          sourceType: 'estimate',
          sourceLabel: 'Training card totals'
        },
        {
          label: 'Tools and PPE',
          value: '$250-$750',
          badge: 'Estimate',
          sourceType: 'estimate',
          sourceLabel: 'Trade starter-cost estimate'
        },
        {
          label: 'Exam and admin fees',
          value: '$75-$250',
          badge: 'Estimate',
          sourceType: 'estimate',
          sourceLabel: 'Province fee estimate'
        }
      ],
      tradeFacts
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
          ? 'Employer evidence'
          : 'Needs stronger source coverage'
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
        sourceLabel: missingFallbackFields.includes('hero.timeline')
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
        value: reality?.barriers?.[0] || 'Short-term income tradeoff may be required while you build entry evidence.',
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
        input.report?.bottleneck?.nextAction ||
        input.report?.transitionMode?.gaps?.first3Steps?.[0] ||
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
          marketSnapshot?.summaryLine || hiringReqCount > 0 ? 'employer evidence' : 'limited source coverage'
        }`,
        `Training recommendations: ${
          profileTrainingLinks.length > 0
            ? 'official training links with provider confirmation still needed'
            : trainingNames.length > 0
              ? 'target requirements with provider confirmation needed'
              : 'estimated from target requirements'
        }`
      ]
    }
  }
}
