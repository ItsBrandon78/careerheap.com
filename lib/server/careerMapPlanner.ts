import { createAdminClient } from '@/lib/supabase/admin'
import { CAREER_MAP_SCORE_WEIGHTS } from '@/lib/planner/contract'
import {
  ensureEvidenceRequirements,
  isMarketEvidenceConfigured
} from '@/lib/server/jobRequirements'
import { toTaskLevelLabel } from '@/lib/requirements/normalize'
import type {
  AggregatedRequirement,
  RequirementEvidence,
  RequirementType
} from '@/lib/requirements/types'

type CountryCode = 'US' | 'CA'
type TimelineBucket = 'immediate' | '1_3_months' | '3_6_months' | '6_12_months' | '1_plus_year'

interface SkillRow {
  id: string
  name: string
  aliases: unknown
}

interface OccupationRow {
  id: string
  title: string
  region: CountryCode
  codes: Record<string, unknown> | null
  source: string | null
  last_updated: string | null
}

interface OccupationSkillRow {
  occupation_id: string
  skill_id: string
  weight: number
}

interface OccupationRequirementRow {
  occupation_id: string
  education: string | null
  certs_licenses: unknown
  notes: string | null
}

interface OccupationWageRow {
  occupation_id: string
  region: string
  wage_low: number | null
  wage_median: number | null
  wage_high: number | null
  currency: 'USD' | 'CAD'
  source: string
  source_url: string | null
  last_updated: string
}

interface TradeRequirementRow {
  occupation_id: string | null
  trade_code: string
  province: string
  hours: number | null
  exam_required: boolean
  official_links: unknown
  source: string
  source_url: string | null
  notes: string | null
}

interface FxRateRow {
  base_currency: 'USD'
  quote_currency: 'CAD'
  rate: number
  source: string
  as_of_date: string
}

export interface CareerPlannerInput {
  userId: string
  currentRole: string
  targetRole?: string
  notSureMode: boolean
  skills?: string[]
  experienceText: string
  location?: string
  timeline?: string
  education?: string
  incomeTarget?: string
  userPostingText?: string
  useMarketEvidence?: boolean
}

export interface MatchBreakdown {
  skill_overlap: number
  experience_similarity: number
  education_alignment: number
  certification_gap: number
  timeline_feasibility: number
}

interface RankedMatch {
  occupationId: string
  title: string
  region: CountryCode
  score: number
  roleProximity: number
  skillOverlapRatio: number
  breakdown: MatchBreakdown
  topReasons: string[]
  missingSkills: Array<{ skillId: string; skillName: string; weight: number }>
  matchedSkills: string[]
  wage: OccupationWageRow | null
  regulated: boolean
  requiredEducation: string | null
  certsLicenses: string[]
  requirementNotes: string | null
  tradeRequirement: {
    tradeCode: string
    province: string
    hours: number | null
    examRequired: boolean
    notes: string | null
    source: string
    sourceUrl: string | null
  } | null
  transitionMonths: number
  officialLinks: Array<{ label: string; url: string }>
  contextKeywordHits: number
}

export interface CareerPlannerAnalysis {
  report: {
    compatibilitySnapshot: {
      score: number
      band: 'strong' | 'moderate' | 'weak'
      breakdown: MatchBreakdown
      topReasons: string[]
    }
    suggestedCareers: Array<{
      occupationId: string
      title: string
      score: number
      breakdown: MatchBreakdown
      salary: {
        usd: { low: number | null; median: number | null; high: number | null } | null
        native: {
          currency: 'USD' | 'CAD'
          low: number | null
          median: number | null
          high: number | null
          sourceName: string
          sourceUrl: string | null
          asOfDate: string
          region: string
        } | null
        conversion: { rate: number; source: string; asOfDate: string } | null
      }
      difficulty: 'easy' | 'moderate' | 'hard'
      transitionTime: string
      regulated: boolean
      officialLinks: Array<{ label: string; url: string }>
      topReasons: string[]
    }>
    skillGaps: Array<{
      skillId: string
      skillName: string
      weight: number
      difficulty: 'easy' | 'medium' | 'hard'
      gapLevel: 'met' | 'partial' | 'missing'
      frequency: number
      howToClose: string[]
      evidence: RequirementEvidence[]
      evidenceLabel: string
    }>
    roadmap: Array<{
      id: string
      phase: TimelineBucket
      title: string
      time_estimate_hours: number
      difficulty: 'easy' | 'medium' | 'hard'
      why_it_matters: string
      action: string
    }>
    resumeReframe: Array<{ before: string; after: string }>
    linksResources: Array<{ label: string; url: string; type: 'official' | 'curated' }>
    targetRequirements: {
      education: string | null
      certifications: string[]
      hardGates: string[]
      employerSignals: string[]
      apprenticeshipHours: number | null
      examRequired: boolean | null
      regulated: boolean
      sources: Array<{ label: string; url: string }>
    }
    transitionSections: {
      mandatoryGateRequirements: Array<{
        id: string
        label: string
        status: 'met' | 'missing'
        gapLevel: 'met' | 'partial' | 'missing'
        frequency: number
        howToGet: string
        estimatedTime: string
        evidenceLabel: string
        evidence: RequirementEvidence[]
      }>
      coreHardSkills: Array<{
        id: string
        label: string
        gapLevel: 'met' | 'partial' | 'missing'
        frequency: number
        howToLearn: string
        evidenceLabel: string
        evidence: RequirementEvidence[]
      }>
      toolsPlatforms: Array<{
        id: string
        label: string
        gapLevel: 'met' | 'partial' | 'missing'
        frequency: number
        quickProject: string
        evidenceLabel: string
        evidence: RequirementEvidence[]
      }>
      experienceSignals: Array<{
        id: string
        label: string
        gapLevel: 'met' | 'partial' | 'missing'
        frequency: number
        howToBuild: string
        evidenceLabel: string
        evidence: RequirementEvidence[]
      }>
      transferableStrengths: Array<{
        id: string
        label: string
        requirement: string
        source: 'experience_text' | 'skills'
      }>
      roadmapPlan: {
        zeroToTwoWeeks: Array<{
          id: string
          action: string
          tiedRequirement: string
        }>
        oneToThreeMonths: Array<{
          id: string
          action: string
          tiedRequirement: string
        }>
        threeToTwelveMonths: Array<{
          id: string
          action: string
          tiedRequirement: string
        }>
        fastestPathToApply: string[]
        strongCandidatePath: string[]
      }
    }
    marketEvidence: {
      enabled: boolean
      used: boolean
      baselineOnly: boolean
      usedCache: boolean
      postingsCount: number
      llmNormalizedCount: number
      fetchedAt: string | null
      query: { role: string; location: string; country: string } | null
      sourcePriority: Array<'user_posting' | 'adzuna' | 'onet'>
    }
    bottleneck: {
      title: string
      why: string
      nextAction: string
      estimatedEffort: string
    } | null
    dataTransparency: {
      inputsUsed: string[]
      datasetsUsed: string[]
      fxRateUsed: string | null
    }
  }
  legacy: {
    score: number
    explanation: string
    transferableSkills: string[]
    skillGaps: Array<{ title: string; detail: string; difficulty: 'easy' | 'medium' | 'hard' }>
    roadmap: { '30': string[]; '60': string[]; '90': string[] }
    resumeReframes: Array<{ before: string; after: string }>
    recommendedRoles: Array<{ title: string; match: number; reason: string }>
  }
  scoringSnapshot: { total_score: number; breakdown: MatchBreakdown; top_occupation_id: string | null }
}

const ACTIVE_OCCUPATION_LIMIT = 2500
const SEEDED_OCCUPATION_LIMIT = 300
const GENERIC_OCCUPATION_TOKENS = new Set([
  'and',
  'related',
  'service',
  'services',
  'worker',
  'workers',
  'occupation',
  'occupations',
  'manager',
  'managers',
  'supervisor',
  'supervisors',
  'other',
  'general'
])

const BASELINE_SOFT_SKILLS = new Set([
  'active listening',
  'speaking',
  'reading comprehension',
  'critical thinking',
  'social perceptiveness',
  'judgment and decision making',
  'complex problem solving',
  'time management',
  'monitoring',
  'coordination',
  'writing'
])
const MIN_RECOMMENDATION_SCORE = 32
const MIN_TARGETED_ROLE_PROXIMITY = 0.16
const MIN_TARGETED_SKILL_OVERLAP = 0.08
const MIN_DISCOVERY_ROLE_PROXIMITY = 0.11
const MIN_DISCOVERY_SKILL_OVERLAP = 0.06

function normalizeText(value: string | null | undefined) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[\u2019']/g, "'")
    .replace(/\bc\+\+\b/g, ' c plus plus ')
    .replace(/\bc#\b/g, ' c sharp ')
    .replace(/\bf#\b/g, ' f sharp ')
    .replace(/\bcompti\b/g, ' comptia ')
    .replace(/\.net/g, ' dot net ')
    .replace(/\+/g, ' plus ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function compactText(value: string | null | undefined) {
  return normalizeText(value).replace(/\s+/g, '')
}

function tokenize(value: string) {
  const normalized = normalizeText(value)
  if (!normalized) return []
  return normalized
    .split(' ')
    .map((token) => {
      if (token.endsWith('ies') && token.length > 4) return `${token.slice(0, -3)}y`
      if (token.endsWith('es') && token.length > 4 && /(ches|shes|sses|xes|zes)$/.test(token)) {
        return token.slice(0, -2)
      }
      if (token.endsWith('s') && token.length > 3) return token.slice(0, -1)
      return token
    })
    .filter(Boolean)
}

function similarity(a: string, b: string) {
  const left = new Set(tokenize(a))
  const right = new Set(tokenize(b))
  if (!left.size || !right.size) return 0
  let shared = 0
  for (const token of left) {
    if (right.has(token)) shared += 1
  }
  return shared / new Set([...left, ...right]).size
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function containsNormalizedTerm(haystack: string, term: string) {
  const normalizedTerm = normalizeText(term)
  if (normalizedTerm.length < 3) return false
  const normalizedHaystack = normalizeText(haystack)
  const pattern = `\\b${escapeRegExp(normalizedTerm).replace(/\s+/g, '\\s+')}\\b`
  if (new RegExp(pattern).test(normalizedHaystack)) return true

  const compactTerm = compactText(normalizedTerm)
  if (compactTerm.length >= 4 && compactText(haystack).includes(compactTerm)) return true

  const normalizedNoSingleLetters = normalizedTerm
    .split(' ')
    .filter((token) => token.length > 1)
    .join(' ')
  if (!normalizedNoSingleLetters) return false
  return new RegExp(`\\b${escapeRegExp(normalizedNoSingleLetters).replace(/\s+/g, '\\s+')}\\b`).test(normalizedHaystack)
}

function matchesExplicitSkill(explicitSkills: string[], term: string) {
  const normalizedTerm = normalizeText(term)
  if (!normalizedTerm) return false

  return explicitSkills.some((skill) => {
    const normalizedSkill = normalizeText(skill)
    if (!normalizedSkill) return false
    if (containsNormalizedTerm(normalizedSkill, normalizedTerm)) return true
    if (containsNormalizedTerm(normalizedTerm, normalizedSkill)) return true
    return similarity(normalizedSkill, normalizedTerm) >= 0.6
  })
}

function toRounded(value: number, decimals = 1) {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function inferCountry(location: string | undefined): CountryCode {
  const text = normalizeText(location)
  if (/canada|ontario|quebec|alberta|british columbia|manitoba|saskatchewan|nova scotia|new brunswick|newfoundland|yukon|nunavut/.test(text)) {
    return 'CA'
  }
  return 'US'
}

function parseTimeline(value: string | undefined): TimelineBucket {
  const text = normalizeText(value)
  if (text.includes('immediate') || text.includes('0 30')) return 'immediate'
  if (text.includes('3 6') || text.includes('90')) return '3_6_months'
  if (text.includes('6 12')) return '6_12_months'
  if (text.includes('1+') || text.includes('12+')) return '1_plus_year'
  return '1_3_months'
}

function timelineMonths(bucket: TimelineBucket) {
  if (bucket === 'immediate') return 1
  if (bucket === '1_3_months') return 3
  if (bucket === '3_6_months') return 6
  if (bucket === '6_12_months') return 12
  return 18
}

function educationScore(value: string | null | undefined) {
  const text = normalizeText(value)
  if (!text) return 2
  if (text.includes('doctor') || text.includes('phd')) return 6
  if (text.includes('master')) return 5
  if (text.includes('bachelor')) return 4
  if (text.includes('associate') || text.includes('diploma') || text.includes('college')) return 3
  if (text.includes('certificate') || text.includes('apprentice')) return 2
  if (text.includes('high school') || text.includes('secondary')) return 1
  return 2
}

function asArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item ?? '').trim()).filter(Boolean)
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return []
    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) return parsed.map((item) => String(item ?? '').trim()).filter(Boolean)
    } catch {
      return [trimmed]
    }
  }
  return []
}

function byKey<T>(rows: T[], selector: (row: T) => string) {
  const grouped = new Map<string, T[]>()
  for (const row of rows) {
    const key = selector(row)
    const list = grouped.get(key) ?? []
    list.push(row)
    grouped.set(key, list)
  }
  return grouped
}

function extractMetric(text: string) {
  return text.match(/\b\d+%|\$\d[\d,]*|\b\d{2,}\b/)?.[0] ?? null
}

function band(score: number): 'strong' | 'moderate' | 'weak' {
  if (score >= 75) return 'strong'
  if (score >= 50) return 'moderate'
  return 'weak'
}

function transitionTime(months: number) {
  if (months <= 1) return '0-30 days'
  if (months <= 3) return '1-3 months'
  if (months <= 6) return '3-6 months'
  if (months <= 12) return '6-12 months'
  return '12+ months'
}

function difficulty(score: number): 'easy' | 'moderate' | 'hard' {
  if (score >= 80) return 'easy'
  if (score >= 60) return 'moderate'
  return 'hard'
}

function phaseRoadmap(options: {
  bucket: TimelineBucket
  roleTitle: string
  primaryGap: string
  secondaryGap: string
  regulated: boolean
  primaryCredential: string | null
  apprenticeshipHours: number | null
  examRequired: boolean | null
  topEmployerSignal: string | null
}) {
  const {
    bucket,
    roleTitle,
    primaryGap,
    secondaryGap,
    regulated,
    primaryCredential,
    apprenticeshipHours,
    examRequired,
    topEmployerSignal
  } = options
  const items: CareerPlannerAnalysis['report']['roadmap'] = []
  const isGatedPath = Boolean(
    regulated || primaryCredential || apprenticeshipHours || examRequired
  )

  if (bucket === 'immediate') {
    if (isGatedPath) {
      const licensingTarget =
        primaryCredential ??
        (apprenticeshipHours
          ? 'the apprenticeship registration path'
          : examRequired
            ? 'the required exam path'
            : 'the required licensing path')
      items.push({
        id: 'immediate-1',
        phase: 'immediate',
        title: 'Confirm licensing and entry requirements',
        time_estimate_hours: 6,
        difficulty: 'medium',
        why_it_matters: `${roleTitle} is gated by formal entry requirements in most regions.`,
        action: `Confirm ${licensingTarget} requirements for your location, start registration, and save proof of progress in your transition tracker.`
      })
    } else {
      items.push({
        id: 'immediate-1',
        phase: 'immediate',
        title: 'Apply with a focused shortlist',
        time_estimate_hours: 8,
        difficulty: 'easy',
        why_it_matters: `Early applications validate market response for ${roleTitle}.`,
        action: 'Submit 10 role-specific applications and track callbacks in a simple tracker artifact.'
      })
    }

    items.push({
      id: 'immediate-2',
      phase: 'immediate',
      title: 'Close one blocker skill',
      time_estimate_hours: 10,
      difficulty: 'medium',
      why_it_matters: `${primaryGap} appears in top-matched role requirements.`,
      action: `Complete one practical task proving ${primaryGap} for ${roleTitle}, then publish a shareable proof-of-work artifact with measurable outcomes.`
    })

    if (topEmployerSignal) {
      items.push({
        id: 'immediate-3',
        phase: 'immediate',
        title: 'Prove one hiring signal',
        time_estimate_hours: 6,
        difficulty: 'medium',
        why_it_matters: 'Targeted evidence improves shortlist and interview conversion.',
        action: `Create one project, case note, or work sample that directly demonstrates: ${topEmployerSignal}.`
      })
    }

    return items
  }

  if (isGatedPath) {
    const apprenticeshipNote = apprenticeshipHours
      ? ` and log progress against ${apprenticeshipHours.toLocaleString()} apprenticeship hours`
      : ''
    const examNote = examRequired ? ' and schedule your required exam checkpoint' : ''
    items.push({
      id: 'phase-gate',
      phase: bucket,
      title: 'Complete credential checkpoint',
      time_estimate_hours: bucket === '1_3_months' ? 14 : bucket === '3_6_months' ? 24 : 40,
      difficulty: 'hard',
      why_it_matters: 'Entry into this role depends on formal credential progress.',
      action: `Advance ${primaryCredential ?? 'the required licensing/certification path'}${apprenticeshipNote}${examNote}.`
    })
  }

  items.push({
    id: 'phase-1',
    phase: bucket,
    title: 'Build role evidence',
    time_estimate_hours: bucket === '1_3_months' ? 18 : bucket === '3_6_months' ? 30 : 60,
    difficulty: bucket === '1_3_months' ? 'medium' : 'hard',
    why_it_matters: 'Hiring confidence increases when artifacts prove skill transfer.',
    action: `Create two portfolio artifacts demonstrating ${primaryGap} in real-world ${roleTitle} scenarios.`
  })
  items.push({
    id: 'phase-2',
    phase: bucket,
    title: 'Strengthen interview readiness',
    time_estimate_hours: 12,
    difficulty: 'medium',
    why_it_matters: `${secondaryGap} improves interview conversion.`,
    action: 'Run five structured mock interviews and produce a concise interview story bank artifact.'
  })
  return items
}

function legacyRoadmap(roadmap: CareerPlannerAnalysis['report']['roadmap']) {
  return {
    '30': roadmap.slice(0, 1).map((item) => item.action),
    '60': roadmap.slice(0, 1).map((item) => item.why_it_matters),
    '90': roadmap.slice(1, 2).map((item) => item.action)
  }
}

function officialLinks(value: unknown) {
  if (!Array.isArray(value)) return []
  return value
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null
      const item = entry as Record<string, unknown>
      const url = String(item.url ?? '').trim()
      if (!url) return null
      const label = String(item.label ?? 'Official link').trim() || 'Official link'
      return { label, url }
    })
    .filter((entry): entry is { label: string; url: string } => Boolean(entry))
}

function uniqueStrings(values: string[]) {
  const seen = new Set<string>()
  const output: string[] = []
  for (const value of values) {
    const trimmed = value.trim()
    if (!trimmed) continue
    const key = normalizeText(trimmed)
    if (!key || seen.has(key)) continue
    seen.add(key)
    output.push(trimmed)
  }
  return output
}

function splitRequirementSentences(text: string | null | undefined) {
  if (!text) return []
  return text
    .split(/[.;]\s+/)
    .map((segment) => segment.trim())
    .filter((segment) => segment.length >= 24)
}

function pickHardGates(options: {
  certsLicenses: string[]
  notes: string | null
  regulated: boolean
  tradeRequirement: RankedMatch['tradeRequirement']
}) {
  const gates: string[] = []
  const noteSegments = splitRequirementSentences(options.notes)
  for (const segment of noteSegments) {
    const normalized = normalizeText(segment)
    if (
      /compulsory|required|licen|certif|red seal|interprovincial|exam|apprenticeship/.test(
        normalized
      )
    ) {
      gates.push(segment)
    }
  }

  for (const cert of options.certsLicenses) {
    if (
      /compulsory|required|licen|certif|red seal|interprovincial|exam|apprenticeship/.test(
        normalizeText(cert)
      )
    ) {
      gates.push(cert)
    }
  }

  if (options.tradeRequirement?.hours) {
    gates.push(
      `Typical apprenticeship requirement: ${options.tradeRequirement.hours.toLocaleString()} hours in ${options.tradeRequirement.province}.`
    )
  }

  if (options.tradeRequirement?.examRequired) {
    gates.push(
      `Certification exam is required in ${options.tradeRequirement.province} for trade code ${options.tradeRequirement.tradeCode}.`
    )
  }

  if (options.regulated && gates.length === 0) {
    gates.push('This path is regulated and usually requires a licensing/certification checkpoint.')
  }

  return uniqueStrings(gates).slice(0, 6)
}

function pickEmployerSignals(options: {
  notes: string | null
  topReasons: string[]
  matchedSkills: string[]
  missingSkills: Array<{ skillName: string }>
}) {
  const notes = splitRequirementSentences(options.notes)
  const noteSignals = notes.filter((segment) => {
    const normalized = normalizeText(segment)
    return /top tasks|ability|experience|work|install|inspect|maintain|troubleshoot|safety/.test(
      normalized
    )
  })

  const skillSignals = options.matchedSkills.slice(0, 3).map((skill) =>
    `Hiring teams usually expect proof you can apply ${skill} in real projects.`
  )
  const gapSignals = options.missingSkills.slice(0, 2).map((gap) =>
    `You should show evidence for ${gap.skillName} before interviews.`
  )

  return uniqueStrings([...noteSignals, ...skillSignals, ...gapSignals, ...options.topReasons]).slice(
    0,
    6
  )
}

function sourcePriority(source: RequirementEvidence['source']) {
  if (source === 'user_posting') return 3
  if (source === 'adzuna') return 2
  return 1
}

function requirementEvidenceLabel(requirement: AggregatedRequirement) {
  const hasUserPosting = requirement.evidence.some((item) => item.source === 'user_posting')
  if (hasUserPosting) return 'User posting'
  const hasMarket = requirement.evidence.some((item) => item.source === 'adzuna')
  if (hasMarket) return `Employer evidence (Adzuna) - freq ${requirement.frequency}`
  return 'Baseline (O*NET)'
}

function toBaselineRequirement(options: {
  type: RequirementType
  label: string
  quote: string
  frequency?: number
}) {
  const taskLabel = toTaskLevelLabel(options.label, options.type)
  if (!taskLabel) return null
  return {
    type: options.type,
    label: taskLabel,
    normalizedKey: normalizeText(taskLabel),
    frequency: Math.max(1, options.frequency ?? 1),
    evidence: [
      {
        source: 'onet' as const,
        quote: options.quote.trim().slice(0, 220),
        confidence: 0.62
      }
    ]
  } satisfies AggregatedRequirement
}

function mergeRequirementsWithPriority(groups: AggregatedRequirement[][]) {
  const map = new Map<
    string,
    AggregatedRequirement & { bestSourcePriority: number; bestSourceLabel: string }
  >()

  for (const group of groups) {
    for (const item of group) {
      const key = `${item.type}:${item.normalizedKey}`
      const itemBestSource = item.evidence
        .map((evidence) => sourcePriority(evidence.source))
        .sort((a, b) => b - a)[0] ?? 0
      const existing = map.get(key)
      if (!existing) {
        map.set(key, {
          ...item,
          evidence: [...item.evidence],
          bestSourcePriority: itemBestSource,
          bestSourceLabel: item.label
        })
        continue
      }

      existing.frequency += item.frequency
      if (itemBestSource > existing.bestSourcePriority) {
        existing.label = item.label
        existing.bestSourcePriority = itemBestSource
        existing.bestSourceLabel = item.label
      }

      for (const evidence of item.evidence) {
        const keyEvidence = `${evidence.source}:${evidence.quote}:${evidence.postingId ?? ''}`
        const alreadyIncluded = existing.evidence.some(
          (entry) =>
            `${entry.source}:${entry.quote}:${entry.postingId ?? ''}` === keyEvidence
        )
        if (!alreadyIncluded && existing.evidence.length < 8) {
          existing.evidence.push(evidence)
        }
      }
    }
  }

  return [...map.values()]
    .map((row) => ({
      type: row.type,
      label: row.label,
      normalizedKey: row.normalizedKey,
      frequency: row.frequency,
      evidence: row.evidence
    }))
    .sort((left, right) => {
      const rightPriority = Math.max(...right.evidence.map((item) => sourcePriority(item.source)))
      const leftPriority = Math.max(...left.evidence.map((item) => sourcePriority(item.source)))
      if (rightPriority !== leftPriority) return rightPriority - leftPriority
      if (right.frequency !== left.frequency) return right.frequency - left.frequency
      return left.label.localeCompare(right.label)
    })
}

const GENERIC_REQUIREMENT_TERMS = new Set([
  'mechanical',
  'mechanics',
  'chemistry',
  'physics',
  'science',
  'math',
  'mathematics',
  'communication',
  'leadership',
  'teamwork',
  'skills',
  'knowledge',
  'experience'
])

function hasActionVerb(value: string) {
  return /\b(build|create|deliver|design|develop|diagnose|document|execute|inspect|install|lead|maintain|manage|operate|optimize|perform|plan|prepare|run|support|test|troubleshoot|use|verify|analyze|coordinate|ship)\b/i.test(
    value
  )
}

function isTemplateRequirementLabel(value: string) {
  const normalized = normalizeText(value)
  if (!normalized) return true
  if (/^perform\s+.+\s+tasks\s+in\s+production\s+scenarios$/.test(normalized)) return true
  if (/^demonstrate measurable\s+.+\s+experience\s+in\s+prior\s+work$/.test(normalized)) return true
  if (/^demonstrate\s+.+\s+through\s+documented\s+collaboration\s+outcomes$/.test(normalized)) return true
  return false
}

function isActionableRequirement(requirement: AggregatedRequirement) {
  const normalized = normalizeText(requirement.label)
  if (!normalized) return false
  if (isTemplateRequirementLabel(normalized)) return false

  const tokens = tokenize(normalized).filter((token) => token.length >= 2)
  if (tokens.length < 2) return false

  const genericTokenCount = tokens.filter((token) => GENERIC_REQUIREMENT_TERMS.has(token)).length

  if (requirement.type === 'hard_skill') {
    if (!hasActionVerb(normalized)) return false
  }

  if (requirement.type === 'soft_signal') {
    if (!hasActionVerb(normalized)) return false
  }

  if (requirement.type === 'experience_signal') {
    if (
      !/\b(\d+\+?\s*(years|yrs|year)|portfolio|project|clinical|rotation|managed|shipped|production|outcomes?)\b/i.test(
        normalized
      ) &&
      !hasActionVerb(normalized)
    ) {
      return false
    }
  }

  if (genericTokenCount >= Math.min(2, tokens.length) && !hasActionVerb(normalized)) return false
  return true
}

function filterActionableRequirements(requirements: AggregatedRequirement[]) {
  return requirements.filter((requirement) => isActionableRequirement(requirement))
}

function hasNonBaselineEvidence(requirement: AggregatedRequirement) {
  return requirement.evidence.some((item) => item.source !== 'onet')
}

function baselineFallbackByMissingType(options: {
  evidenceRequirements: AggregatedRequirement[]
  baselineRequirements: AggregatedRequirement[]
}) {
  const evidenceTypes = new Set(options.evidenceRequirements.map((item) => item.type))
  return options.baselineRequirements.filter((item) => !evidenceTypes.has(item.type))
}

function inferRequirementGapLevel(options: {
  requirement: AggregatedRequirement
  experienceText: string
  skills: string[]
  currentRole: string
}) {
  const context = normalizeText(
    `${options.experienceText} ${options.currentRole} ${options.skills.join(' ')}`
  )
  const tokens = tokenize(options.requirement.normalizedKey).filter((token) => token.length >= 3)
  if (tokens.length === 0) return 'missing' as const

  if (options.requirement.type === 'gate') {
    const hasCredentialSignal =
      /\b(certif|license|licence|registered|registration|red seal|journey|apprentice|cpr|bls|acls)\b/.test(
        context
      )
    return hasCredentialSignal ? 'partial' : 'missing'
  }

  let hits = 0
  for (const token of tokens) {
    if (context.includes(token)) hits += 1
  }

  const ratio = hits / tokens.length
  if (ratio >= 0.65) return 'met' as const
  if (ratio >= 0.3) return 'partial' as const
  return 'missing' as const
}

function requirementHowToGet(requirement: AggregatedRequirement) {
  if (requirement.type === 'gate') {
    return 'Review regional regulator requirements, start application, and keep proof of status updates.'
  }
  if (requirement.type === 'tool') {
    return 'Practice with a scoped project that produces an artifact you can show in interviews.'
  }
  if (requirement.type === 'experience_signal') {
    return 'Build measurable evidence in a project or volunteer scope that mirrors target-role expectations.'
  }
  if (requirement.type === 'soft_signal') {
    return 'Document concrete examples with outcomes instead of generic claims.'
  }
  return 'Complete one role-specific task and publish measurable proof of the result.'
}

function requirementEstimatedTime(requirement: AggregatedRequirement) {
  if (requirement.type === 'gate') return '4-16 weeks (varies by region)'
  if (requirement.type === 'experience_signal') return '4-12 weeks'
  if (requirement.type === 'tool') return '1-4 weeks'
  return '2-8 weeks'
}

function requirementQuickProject(requirement: AggregatedRequirement) {
  if (requirement.type === 'tool') {
    return `Build a mini project that uses ${requirement.label.replace(/^Use\s+/i, '')} and publish a one-page walkthrough.`
  }
  return `Create one artifact proving ${requirement.label} with measurable outcomes.`
}

function findTransferableEvidence(options: {
  requirement: AggregatedRequirement
  skills: string[]
  experienceText: string
}) {
  const requirementTokens = tokenize(options.requirement.normalizedKey).filter(
    (token) => token.length >= 3
  )
  if (requirementTokens.length === 0) return null

  for (const skill of options.skills) {
    const normalizedSkill = normalizeText(skill)
    if (!normalizedSkill) continue
    if (requirementTokens.some((token) => normalizedSkill.includes(token))) {
      return {
        source: 'skills' as const,
        label: `Skill already listed: ${skill}`
      }
    }
  }

  const lines = options.experienceText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length >= 12)

  for (const line of lines) {
    const normalized = normalizeText(line)
    if (requirementTokens.some((token) => normalized.includes(token))) {
      return {
        source: 'experience_text' as const,
        label: line.length > 120 ? `${line.slice(0, 117)}...` : line
      }
    }
  }

  return null
}

function isBaselineSoftSkill(skillName: string) {
  return BASELINE_SOFT_SKILLS.has(normalizeText(skillName))
}

function prioritizeMissingSkills(
  items: Array<{ skillId: string; skillName: string; weight: number }>
) {
  return [...items].sort((a, b) => {
    const aBaseline = isBaselineSoftSkill(a.skillName) ? 1 : 0
    const bBaseline = isBaselineSoftSkill(b.skillName) ? 1 : 0
    if (aBaseline !== bBaseline) return aBaseline - bBaseline
    if (b.weight !== a.weight) return b.weight - a.weight
    return a.skillName.localeCompare(b.skillName)
  })
}

function isRelevantRecommendation(match: RankedMatch, notSureMode: boolean) {
  if (match.score < MIN_RECOMMENDATION_SCORE) return false
  if (notSureMode) {
    return (
      match.contextKeywordHits > 0 ||
      match.roleProximity >= MIN_DISCOVERY_ROLE_PROXIMITY ||
      match.skillOverlapRatio >= MIN_DISCOVERY_SKILL_OVERLAP
    )
  }
  return (
    match.roleProximity >= MIN_TARGETED_ROLE_PROXIMITY ||
    match.skillOverlapRatio >= MIN_TARGETED_SKILL_OVERLAP
  )
}

async function selectByIdsInChunks<T>(args: {
  supabase: ReturnType<typeof createAdminClient>
  table: string
  columns: string
  idColumn: string
  ids: string[]
  chunkSize: number
}) {
  const { supabase, table, columns, idColumn, ids, chunkSize } = args
  const rows: T[] = []
  for (let index = 0; index < ids.length; index += chunkSize) {
    const chunk = ids.slice(index, index + chunkSize)
    if (chunk.length === 0) continue
    const { data, error } = await supabase.from(table).select(columns).in(idColumn, chunk)
    if (error) throw error
    rows.push(...((data ?? []) as T[]))
  }
  return rows
}

export async function generateCareerMapPlannerAnalysis(input: CareerPlannerInput): Promise<CareerPlannerAnalysis> {
  const supabase = createAdminClient()
  const country = inferCountry(input.location)
  const timeline = parseTimeline(input.timeline)
  const explicitSkills = Array.isArray(input.skills)
    ? input.skills.map((skill) => String(skill ?? '').trim()).filter(Boolean)
    : []

  const [{ data: skillsData, error: skillsError }, { data: fxData }] = await Promise.all([
    supabase.from('skills').select('id,name,aliases').order('name', { ascending: true }),
    supabase
      .from('fx_rates')
      .select('base_currency,quote_currency,rate,source,as_of_date')
      .eq('base_currency', 'USD')
      .eq('quote_currency', 'CAD')
      .order('as_of_date', { ascending: false })
      .limit(1)
      .maybeSingle()
  ])
  if (skillsError) throw skillsError
  const skills = (skillsData ?? []) as SkillRow[]
  const fxRate = (fxData ?? null) as FxRateRow | null

  const skillMatchText = `${input.currentRole} ${input.targetRole ?? ''} ${input.experienceText} ${input.education ?? ''} ${explicitSkills.join(' ')}`
  const userSkills = skills
    .map((skill) => {
      const terms = [skill.name, ...asArray(skill.aliases)].map((term) => normalizeText(term)).filter(Boolean)
      const found = terms.some(
        (term) => containsNormalizedTerm(skillMatchText, term) || matchesExplicitSkill(explicitSkills, term)
      )
      return found ? { id: skill.id, name: skill.name, confidence: 1 } : null
    })
    .filter((row): row is { id: string; name: string; confidence: number } => Boolean(row))
  const userSkillIds = new Set(userSkills.map((skill) => skill.id))

  const { data: occupationData, error: occupationError } = await supabase
    .from('occupations')
    .select('id,title,region,codes,source,last_updated')
    .eq('region', country)
    .limit(ACTIVE_OCCUPATION_LIMIT)
  if (occupationError) throw occupationError

  const occupations = (occupationData ?? []) as OccupationRow[]
  const seededOccupations = occupations
    .map((occupation) => {
      const currentRoleScore = similarity(input.currentRole, occupation.title)
      const targetRoleScore = similarity(input.targetRole ?? '', occupation.title)
      const seedScore = input.notSureMode
        ? currentRoleScore
        : clamp(targetRoleScore * 0.65 + currentRoleScore * 0.35, 0, 1)
      return { occupation, seedScore }
    })
    .sort((a, b) => (b.seedScore - a.seedScore) || a.occupation.title.localeCompare(b.occupation.title))
    .slice(0, SEEDED_OCCUPATION_LIMIT)
    .map((item) => item.occupation)
  const candidateIds = seededOccupations.map((row) => row.id)
  if (candidateIds.length === 0) {
    return {
      report: {
        compatibilitySnapshot: {
          score: 0,
          band: 'weak',
          breakdown: { skill_overlap: 0, experience_similarity: 0, education_alignment: 0, certification_gap: 0, timeline_feasibility: 0 },
          topReasons: ['No occupations available for the selected region.']
        },
        suggestedCareers: [],
        skillGaps: [],
        roadmap: [],
        resumeReframe: [],
        linksResources: [],
        targetRequirements: {
          education: null,
          certifications: [],
          hardGates: [],
          employerSignals: [],
          apprenticeshipHours: null,
          examRequired: null,
          regulated: false,
          sources: []
        },
        transitionSections: {
          mandatoryGateRequirements: [],
          coreHardSkills: [],
          toolsPlatforms: [],
          experienceSignals: [],
          transferableStrengths: [],
          roadmapPlan: {
            zeroToTwoWeeks: [],
            oneToThreeMonths: [],
            threeToTwelveMonths: [],
            fastestPathToApply: [],
            strongCandidatePath: []
          }
        },
        marketEvidence: {
          enabled: isMarketEvidenceConfigured(),
          used: false,
          baselineOnly: true,
          usedCache: false,
          postingsCount: 0,
          llmNormalizedCount: 0,
          fetchedAt: null,
          query: null,
          sourcePriority: ['user_posting', 'adzuna', 'onet']
        },
        bottleneck: null,
        dataTransparency: { inputsUsed: ['currentRole', 'experienceText'], datasetsUsed: [], fxRateUsed: null }
      },
      legacy: {
        score: 0,
        explanation: 'No occupations available.',
        transferableSkills: [],
        skillGaps: [],
        roadmap: { '30': [], '60': [], '90': [] },
        resumeReframes: [],
        recommendedRoles: []
      },
      scoringSnapshot: {
        total_score: 0,
        breakdown: { skill_overlap: 0, experience_similarity: 0, education_alignment: 0, certification_gap: 0, timeline_feasibility: 0 },
        top_occupation_id: null
      }
    }
  }

  const [occupationSkillsRows, requirementsRes, wageRows, tradesRes] = await Promise.all([
    selectByIdsInChunks<OccupationSkillRow>({
      supabase,
      table: 'occupation_skills',
      columns: 'occupation_id,skill_id,weight',
      idColumn: 'occupation_id',
      ids: candidateIds,
      chunkSize: 25
    }),
    supabase.from('occupation_requirements').select('occupation_id,education,certs_licenses,notes').in('occupation_id', candidateIds),
    selectByIdsInChunks<OccupationWageRow>({
      supabase,
      table: 'occupation_wages',
      columns: 'occupation_id,region,wage_low,wage_median,wage_high,currency,source,source_url,last_updated',
      idColumn: 'occupation_id',
      ids: candidateIds,
      chunkSize: 40
    }),
    supabase.from('trade_requirements').select('occupation_id,trade_code,province,hours,exam_required,official_links,source,source_url,notes').eq('province', 'ON')
  ])
  if (requirementsRes.error) throw requirementsRes.error
  if (tradesRes.error) throw tradesRes.error

  const occupationSkills = byKey(occupationSkillsRows, (row) => row.occupation_id)
  const requirements = new Map(((requirementsRes.data ?? []) as OccupationRequirementRow[]).map((row) => [row.occupation_id, row]))
  const wages = byKey(wageRows, (row) => row.occupation_id)
  const trades = (tradesRes.data ?? []) as TradeRequirementRow[]
  const skillNameById = new Map(skills.map((skill) => [skill.id, skill.name]))

  const rankedStrict: RankedMatch[] = []
  const rankedLoose: RankedMatch[] = []
  const userEducation = educationScore(input.education)
  const certificationEvidence = normalizeText(`${input.experienceText} ${explicitSkills.join(' ')}`)
  const userHasCert =
    /\b(certif|license|licence|journey|red seal|coq|comptia|csts|whmis|osha|first aid|cpr|ccna|cissp|pmp|itil|aws certified|azure|gcp)\b/.test(
      certificationEvidence
    )
  const experienceTokens = new Set(tokenize(input.experienceText))
  const contextKeywordTokens = new Set(
    tokenize(`${input.currentRole} ${input.experienceText}`).filter(
      (token) => token.length >= 4 && !GENERIC_OCCUPATION_TOKENS.has(token)
    )
  )
  for (const occupation of seededOccupations) {
    const edges = occupationSkills.get(occupation.id) ?? []
    if (!edges.length) continue
    const requirement = requirements.get(occupation.id) ?? null
    const requiredEducation = educationScore(`${requirement?.education ?? ''} ${requirement?.notes ?? ''}`)
    const educationAlignment = userEducation >= requiredEducation ? 1 : clamp(1 - (requiredEducation - userEducation) * 0.25, 0.2, 1)

    let dot = 0
    let occNorm = 0
    for (const edge of edges) {
      const weight = Number(edge.weight) || 0
      occNorm += weight ** 2
      if (userSkillIds.has(edge.skill_id)) dot += weight
    }
    const skillOverlap = occNorm > 0 ? clamp(dot / Math.sqrt(occNorm * Math.max(1, userSkills.length)), 0, 1) : 0

    const currentRoleSimilarity = similarity(input.currentRole, occupation.title)
    const targetRoleSimilarity = similarity(input.targetRole ?? '', occupation.title)
    const experienceSimilarity = input.notSureMode
      ? currentRoleSimilarity
      : clamp(targetRoleSimilarity * 0.65 + currentRoleSimilarity * 0.35, 0, 1)
    const roleProximity = Math.max(currentRoleSimilarity, targetRoleSimilarity)
    const occupationTokens = tokenize(occupation.title)
    const hasExperienceKeyword = occupationTokens.some(
      (token) =>
        token.length >= 4 &&
        !GENERIC_OCCUPATION_TOKENS.has(token) &&
        experienceTokens.has(token)
    )
    const contextKeywordHits = occupationTokens.filter(
      (token) =>
        token.length >= 4 &&
        !GENERIC_OCCUPATION_TOKENS.has(token) &&
        contextKeywordTokens.has(token)
    ).length

    const trade = trades.find((row) => row.occupation_id === occupation.id) ?? null
    const certRequired = Boolean(trade) || asArray(requirement?.certs_licenses).length > 0 || /license|certif|registration/.test(normalizeText(requirement?.notes))
    const certAlignment = certRequired ? (userHasCert ? 0.9 : 0.2) : 1

    const rawMissingSkills = edges
      .filter((edge) => !userSkillIds.has(edge.skill_id))
      .map((edge) => ({ skillId: edge.skill_id, skillName: skillNameById.get(edge.skill_id) ?? 'Unknown skill', weight: Number(edge.weight) || 0 }))
      .sort((a, b) => b.weight - a.weight)
    const prioritizedMissingSkills = prioritizeMissingSkills(rawMissingSkills).slice(0, 7)

    const estimatedMonths = Math.max(
      1,
      Math.round(rawMissingSkills.slice(0, 4).reduce((sum, item) => sum + item.weight * 4, 0) + (certRequired && !userHasCert ? 6 : 0))
    )
    const timelineScore = estimatedMonths <= timelineMonths(timeline)
      ? 1
      : clamp(1 - (estimatedMonths - timelineMonths(timeline)) / (timelineMonths(timeline) + 6), 0.05, 1)

    const breakdown: MatchBreakdown = {
      skill_overlap: toRounded(skillOverlap * CAREER_MAP_SCORE_WEIGHTS.skillOverlap, 1),
      experience_similarity: toRounded(experienceSimilarity * CAREER_MAP_SCORE_WEIGHTS.experienceAdjacency, 1),
      education_alignment: toRounded(educationAlignment * CAREER_MAP_SCORE_WEIGHTS.educationFit, 1),
      certification_gap: toRounded(certAlignment * CAREER_MAP_SCORE_WEIGHTS.certificationLicensingGap, 1),
      timeline_feasibility: toRounded(timelineScore * CAREER_MAP_SCORE_WEIGHTS.timelineFeasibility, 1)
    }
    const score = Math.round(
      breakdown.skill_overlap +
      breakdown.experience_similarity +
      breakdown.education_alignment +
      breakdown.certification_gap +
      breakdown.timeline_feasibility
    )

    const wageRows = wages.get(occupation.id) ?? []
    const wage = wageRows.find((row) => row.region === `${country}-NAT`) ?? wageRows[0] ?? null
    const topReasons = [
      skillOverlap >= 0.6 ? 'Strong weighted skill overlap with this occupation.' : `Largest gap is ${prioritizedMissingSkills[0]?.skillName ?? 'specialized skill depth'}.`,
      experienceSimilarity >= 0.55 ? 'Experience adjacency indicates a realistic transition path.' : 'Title similarity is moderate; transition is possible with focused positioning.',
      certRequired && !userHasCert ? 'Certification/licensing evidence is currently missing.' : 'Certification requirement is currently acceptable.'
    ]

    const rankedMatch: RankedMatch = {
      occupationId: occupation.id,
      title: occupation.title,
      region: occupation.region,
      score,
      roleProximity,
      skillOverlapRatio: skillOverlap,
      breakdown,
      topReasons,
      missingSkills: prioritizedMissingSkills,
      matchedSkills: edges.filter((edge) => userSkillIds.has(edge.skill_id)).map((edge) => skillNameById.get(edge.skill_id) ?? 'Unknown skill').slice(0, 8),
      wage,
      regulated: certRequired,
      requiredEducation: requirement?.education ?? null,
      certsLicenses: asArray(requirement?.certs_licenses),
      requirementNotes: requirement?.notes ?? null,
      tradeRequirement: trade
        ? {
            tradeCode: trade.trade_code,
            province: trade.province,
            hours: trade.hours,
            examRequired: trade.exam_required,
            notes: trade.notes,
            source: trade.source,
            sourceUrl: trade.source_url
          }
        : null,
      transitionMonths: estimatedMonths,
      officialLinks: [
        ...officialLinks(trade?.official_links),
        ...(trade?.source_url ? [{ label: `${trade.source} source`, url: trade.source_url }] : [])
      ].slice(0, 6),
      contextKeywordHits
    }

    rankedLoose.push(rankedMatch)
    const hasLexicalRelevance =
      Math.max(currentRoleSimilarity, targetRoleSimilarity, experienceSimilarity) >= 0.08
    const hasSkillSignal = skillOverlap >= 0.04
    const passesStrict = input.notSureMode
      ? hasLexicalRelevance || hasExperienceKeyword || (hasSkillSignal && roleProximity >= 0.05)
      : hasLexicalRelevance || hasSkillSignal
    if (passesStrict) {
      rankedStrict.push(rankedMatch)
    }
  }

  rankedStrict.sort((a, b) => (b.score - a.score) || a.title.localeCompare(b.title))
  rankedLoose.sort((a, b) => (b.score - a.score) || a.title.localeCompare(b.title))
  const strictIds = new Set(rankedStrict.map((candidate) => candidate.occupationId))
  let ranked: RankedMatch[]
  if (rankedStrict.length > 0) {
    const looseWithoutStrict = rankedLoose.filter((candidate) => !strictIds.has(candidate.occupationId))
    if (input.notSureMode) {
      const relevantLoose = looseWithoutStrict
        .filter((candidate) => candidate.contextKeywordHits > 0)
        .sort((a, b) => (b.contextKeywordHits - a.contextKeywordHits) || (b.score - a.score))
      const relevantIds = new Set(relevantLoose.map((candidate) => candidate.occupationId))
      ranked = [
        ...rankedStrict,
        ...relevantLoose,
        ...looseWithoutStrict.filter((candidate) => !relevantIds.has(candidate.occupationId))
      ]
    } else {
      ranked = [...rankedStrict, ...looseWithoutStrict]
    }
  } else {
    ranked = rankedLoose
  }
  const relevantRanked = ranked.filter((candidate) => isRelevantRecommendation(candidate, input.notSureMode))
  const top = (relevantRanked.length > 0 ? relevantRanked : ranked).slice(0, 6)
  const best = top[0] ?? null
  const roleHardGates = pickHardGates({
    certsLicenses: best?.certsLicenses ?? [],
    notes: best?.requirementNotes ?? best?.tradeRequirement?.notes ?? null,
    regulated: Boolean(best?.regulated),
    tradeRequirement: best?.tradeRequirement ?? null
  })
  const roleEmployerSignals = pickEmployerSignals({
    notes: best?.requirementNotes ?? best?.tradeRequirement?.notes ?? null,
    topReasons: best?.topReasons ?? [],
    matchedSkills: best?.matchedSkills ?? [],
    missingSkills: (best?.missingSkills ?? []).map((item) => ({ skillName: item.skillName }))
  })
  const primaryCredential = uniqueStrings(best?.certsLicenses ?? [])[0] ?? null
  const baselineRequirements = [
    ...roleHardGates.map((gate) =>
      toBaselineRequirement({
        type: 'gate',
        label: gate,
        quote: gate,
        frequency: 1
      })
    ),
    ...(best?.certsLicenses ?? []).map((certification) =>
      toBaselineRequirement({
        type: 'gate',
        label: certification,
        quote: certification,
        frequency: 1
      })
    ),
    ...(best?.missingSkills ?? []).map((gap) =>
      toBaselineRequirement({
        type: 'hard_skill',
        label: gap.skillName,
        quote: `${best?.title ?? 'Target role'} baseline requirement: ${gap.skillName}`,
        frequency: Math.max(1, Math.round(gap.weight * 10))
      })
    ),
    ...roleEmployerSignals.map((signal) =>
      toBaselineRequirement({
        type: 'experience_signal',
        label: signal,
        quote: signal,
        frequency: 1
      })
    )
  ].filter(Boolean) as AggregatedRequirement[]

  const evidenceRoleCandidate = (input.targetRole ?? '').trim()
  const evidenceRole = evidenceRoleCandidate || (best?.title ?? '')
  const evidenceLocation = input.location ?? ''
  const evidenceResult = await ensureEvidenceRequirements({
    role: evidenceRole,
    location: evidenceLocation,
    country: country.toLowerCase(),
    useMarketEvidence: input.useMarketEvidence !== false,
    userPostingText: input.userPostingText
  })

  const evidenceRequirements = filterActionableRequirements(
    mergeRequirementsWithPriority([
      evidenceResult.userPostingRequirements,
      evidenceResult.marketRequirements
    ])
  )
  const filteredBaselineRequirements = filterActionableRequirements(baselineRequirements)
  const baselineFallbackRequirements = baselineFallbackByMissingType({
    evidenceRequirements,
    baselineRequirements: filteredBaselineRequirements
  })
  const allRequirements = mergeRequirementsWithPriority([
    evidenceRequirements,
    baselineFallbackRequirements
  ])
  const hasEffectiveAdzunaEvidence = allRequirements.some((item) =>
    item.evidence.some((evidence) => evidence.source === 'adzuna')
  )
  const hasEffectiveUserPostingEvidence = allRequirements.some((item) =>
    item.evidence.some((evidence) => evidence.source === 'user_posting')
  )
  const hasEffectiveNonBaselineEvidence = allRequirements.some((item) =>
    hasNonBaselineEvidence(item)
  )
  const usesBaselineFallback = baselineFallbackRequirements.length > 0

  const gateRequirements = allRequirements.filter((item) => item.type === 'gate')
  const hardSkillRequirements = allRequirements.filter((item) => item.type === 'hard_skill')
  const toolRequirements = allRequirements.filter((item) => item.type === 'tool')
  const experienceRequirements = allRequirements.filter(
    (item) => item.type === 'experience_signal' || item.type === 'soft_signal'
  )

  const requirementGapRows = allRequirements.map((requirement) => ({
    requirement,
    gapLevel: inferRequirementGapLevel({
      requirement,
      experienceText: input.experienceText,
      skills: explicitSkills,
      currentRole: input.currentRole
    })
  }))
  const missingRequirements = requirementGapRows
    .filter((item) => item.gapLevel !== 'met')
    .sort((left, right) => {
      if (left.requirement.type === 'gate' && right.requirement.type !== 'gate') return -1
      if (left.requirement.type !== 'gate' && right.requirement.type === 'gate') return 1
      if (right.requirement.frequency !== left.requirement.frequency) {
        return right.requirement.frequency - left.requirement.frequency
      }
      return left.requirement.label.localeCompare(right.requirement.label)
    })

  const primaryGap =
    missingRequirements[0]?.requirement.label ??
    (best?.regulated ? 'licensing requirements' : 'role-specific project evidence')
  const secondaryGap =
    missingRequirements[1]?.requirement.label ??
    'interview-ready proof of measurable outcomes'
  const roadmap = phaseRoadmap({
    bucket: timeline,
    roleTitle: best?.title ?? 'target role',
    primaryGap,
    secondaryGap,
    regulated: Boolean(best?.regulated),
    primaryCredential,
    apprenticeshipHours: best?.tradeRequirement?.hours ?? null,
    examRequired:
      typeof best?.tradeRequirement?.examRequired === 'boolean'
        ? best.tradeRequirement.examRequired
        : null,
    topEmployerSignal: experienceRequirements[0]?.label ?? roleEmployerSignals[0] ?? null
  })
  const rawBullets = input.experienceText.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.length >= 20).slice(0, 4)
  const metric = extractMetric(input.experienceText)
  const resumeReframes = rawBullets.map((before, index) => ({
    before,
    after: `${before.replace(/\.$/, '')}, with ${index === 0 && metric ? `quantified impact (${metric})` : 'clearer measurable outcomes'} aligned to ${best?.title ?? 'target role'}.`
  }))

  const skillGaps = missingRequirements
    .filter((item) => item.requirement.type === 'hard_skill' || item.requirement.type === 'tool')
    .slice(0, 7)
    .map((item, index) => ({
      skillId: item.requirement.normalizedKey,
      skillName: item.requirement.label,
      weight: toRounded(Math.max(0.1, item.requirement.frequency / 10), 4),
      difficulty:
        item.requirement.type === 'tool'
          ? 'easy'
          : index <= 1
            ? 'easy'
            : index <= 3
              ? 'medium'
              : 'hard',
      gapLevel: item.gapLevel,
      frequency: item.requirement.frequency,
      evidence: item.requirement.evidence,
      evidenceLabel: requirementEvidenceLabel(item.requirement),
      howToClose: [
        `${best?.title ?? 'This role'} hiring evidence repeatedly expects: ${item.requirement.label}.`,
        `${requirementHowToGet(item.requirement)}${primaryCredential ? ` Include progress on ${primaryCredential}.` : ''}`
      ]
    })) as CareerPlannerAnalysis['report']['skillGaps']

  const mandatoryGateRequirements = gateRequirements.slice(0, 8).map((requirement) => {
    const gap = inferRequirementGapLevel({
      requirement,
      experienceText: input.experienceText,
      skills: explicitSkills,
      currentRole: input.currentRole
    })
    return {
      id: `gate-${requirement.normalizedKey}`,
      label: requirement.label,
      status: (gap === 'met' ? 'met' : 'missing') as 'met' | 'missing',
      gapLevel: gap,
      frequency: requirement.frequency,
      howToGet: requirementHowToGet(requirement),
      estimatedTime: requirementEstimatedTime(requirement),
      evidenceLabel: requirementEvidenceLabel(requirement),
      evidence: requirement.evidence
    }
  })

  const coreHardSkills = hardSkillRequirements.slice(0, 10).map((requirement) => {
    const gap = inferRequirementGapLevel({
      requirement,
      experienceText: input.experienceText,
      skills: explicitSkills,
      currentRole: input.currentRole
    })
    return {
      id: `hard-${requirement.normalizedKey}`,
      label: requirement.label,
      gapLevel: gap,
      frequency: requirement.frequency,
      howToLearn: requirementHowToGet(requirement),
      evidenceLabel: requirementEvidenceLabel(requirement),
      evidence: requirement.evidence
    }
  })

  const toolsPlatforms = toolRequirements.slice(0, 8).map((requirement) => {
    const gap = inferRequirementGapLevel({
      requirement,
      experienceText: input.experienceText,
      skills: explicitSkills,
      currentRole: input.currentRole
    })
    return {
      id: `tool-${requirement.normalizedKey}`,
      label: requirement.label,
      gapLevel: gap,
      frequency: requirement.frequency,
      quickProject: requirementQuickProject(requirement),
      evidenceLabel: requirementEvidenceLabel(requirement),
      evidence: requirement.evidence
    }
  })

  const experienceSignals = experienceRequirements.slice(0, 8).map((requirement) => {
    const gap = inferRequirementGapLevel({
      requirement,
      experienceText: input.experienceText,
      skills: explicitSkills,
      currentRole: input.currentRole
    })
    return {
      id: `exp-${requirement.normalizedKey}`,
      label: requirement.label,
      gapLevel: gap,
      frequency: requirement.frequency,
      howToBuild: requirementHowToGet(requirement),
      evidenceLabel: requirementEvidenceLabel(requirement),
      evidence: requirement.evidence
    }
  })

  const transferableStrengths = requirementGapRows
    .filter((item) => item.gapLevel !== 'missing')
    .slice(0, 8)
    .map((item) => {
      const evidence = findTransferableEvidence({
        requirement: item.requirement,
        skills: explicitSkills,
        experienceText: input.experienceText
      })
      if (!evidence) return null
      return {
        id: `strength-${item.requirement.normalizedKey}`,
        requirement: item.requirement.label,
        label: evidence.label,
        source: evidence.source
      }
    })
    .filter(
      (item): item is NonNullable<typeof item> =>
        Boolean(item)
    )

  const roadmapMissing = missingRequirements.slice(0, 9)
  const roadmapPlan = {
    zeroToTwoWeeks: roadmapMissing.slice(0, 3).map((item, index) => ({
      id: `r-0-2-${index + 1}`,
      action: `Start ${item.requirement.label.toLowerCase()} and publish one verification artifact.`,
      tiedRequirement: item.requirement.label
    })),
    oneToThreeMonths: roadmapMissing.slice(3, 6).map((item, index) => ({
      id: `r-1-3-${index + 1}`,
      action: `Build repeatable proof for ${item.requirement.label.toLowerCase()} with measurable outcomes.`,
      tiedRequirement: item.requirement.label
    })),
    threeToTwelveMonths: roadmapMissing.slice(6, 9).map((item, index) => ({
      id: `r-3-12-${index + 1}`,
      action: `Turn ${item.requirement.label.toLowerCase()} into durable credential or portfolio depth.`,
      tiedRequirement: item.requirement.label
    })),
    fastestPathToApply: roadmapMissing
      .slice(0, 3)
      .map((item) => `Close ${item.requirement.label.toLowerCase()} with one interview-ready artifact.`),
    strongCandidatePath: roadmapMissing
      .slice(0, 6)
      .map((item) => `Build depth in ${item.requirement.label.toLowerCase()} and attach measurable proof.`)
  }

  const targetRequirements: CareerPlannerAnalysis['report']['targetRequirements'] = {
    education: best?.requiredEducation ?? null,
    certifications: uniqueStrings(
      mandatoryGateRequirements
        .map((item) => item.label)
        .filter((item) => /certif|license|licence|registration|clearance|red seal/i.test(item))
    ).slice(0, 8),
    hardGates: mandatoryGateRequirements.map((item) => item.label).slice(0, 8),
    employerSignals: experienceSignals.map((item) => item.label).slice(0, 8),
    apprenticeshipHours: best?.tradeRequirement?.hours ?? null,
    examRequired:
      typeof best?.tradeRequirement?.examRequired === 'boolean'
        ? best.tradeRequirement.examRequired
        : null,
    regulated: Boolean(best?.regulated),
    sources: uniqueStrings([
      ...(best?.officialLinks ?? []).map((item) => `${item.label}|${item.url}`),
      ...(best?.tradeRequirement?.sourceUrl
        ? [`${best.tradeRequirement.source} source|${best.tradeRequirement.sourceUrl}`]
        : [])
    ])
      .map((value) => {
        const [label, url] = value.split('|')
        return { label, url }
      })
      .filter((item) => item.label && item.url)
      .slice(0, 6)
  }

  const bottleneck: CareerPlannerAnalysis['report']['bottleneck'] =
    missingRequirements[0]
      ? {
          title: missingRequirements[0].requirement.label,
          why: `${best?.title ?? 'Target role'} demand signals weight this requirement heavily.`,
          nextAction: `${
            primaryCredential
              ? `Start or verify ${primaryCredential} requirements, then `
              : ''
          }complete one scoped project proving ${missingRequirements[0].requirement.label} in 7-14 days and add the result to your resume.`,
          estimatedEffort: best
            ? best.transitionMonths <= 3
              ? '1-3 months'
              : transitionTime(best.transitionMonths)
            : transitionTime(timelineMonths(timeline))
        }
      : null

  const report: CareerPlannerAnalysis['report'] = {
    compatibilitySnapshot: {
      score: best?.score ?? 0,
      band: band(best?.score ?? 0),
      breakdown: best?.breakdown ?? { skill_overlap: 0, experience_similarity: 0, education_alignment: 0, certification_gap: 0, timeline_feasibility: 0 },
      topReasons: best?.topReasons ?? ['No compatibility reasons available.']
    },
    suggestedCareers: top.map((match) => {
      const native = match.wage
      const usd = !native
        ? null
        : native.currency === 'USD'
          ? { low: native.wage_low, median: native.wage_median, high: native.wage_high }
          : {
              low: fxRate ? toRounded((native.wage_low ?? 0) / fxRate.rate, 2) : null,
              median: fxRate ? toRounded((native.wage_median ?? 0) / fxRate.rate, 2) : null,
              high: fxRate ? toRounded((native.wage_high ?? 0) / fxRate.rate, 2) : null
            }
      return {
        occupationId: match.occupationId,
        title: match.title,
        score: match.score,
        breakdown: match.breakdown,
        salary: {
          usd,
          native: native
            ? {
                currency: native.currency,
                low: native.wage_low,
                median: native.wage_median,
                high: native.wage_high,
                sourceName: native.source,
                sourceUrl: native.source_url,
                asOfDate: native.last_updated,
                region: native.region
              }
            : null,
          conversion: native?.currency === 'CAD' && fxRate
            ? { rate: fxRate.rate, source: fxRate.source, asOfDate: fxRate.as_of_date }
            : null
        },
        difficulty: difficulty(match.score),
        transitionTime: transitionTime(match.transitionMonths),
        regulated: match.regulated,
        officialLinks: match.officialLinks,
        topReasons: match.topReasons
      }
    }),
    skillGaps,
    roadmap,
    resumeReframe: resumeReframes,
    linksResources: [
      ...(best?.officialLinks ?? []).map((link) => ({ ...link, type: 'official' as const })),
      ...(best?.wage?.source_url ? [{ label: `${best.wage.source} wage source`, url: best.wage.source_url, type: 'official' as const }] : [])
    ].slice(0, 8),
    targetRequirements,
    transitionSections: {
      mandatoryGateRequirements,
      coreHardSkills,
      toolsPlatforms,
      experienceSignals,
      transferableStrengths,
      roadmapPlan
    },
    marketEvidence: {
      enabled: isMarketEvidenceConfigured(),
      used: hasEffectiveNonBaselineEvidence,
      baselineOnly: !hasEffectiveNonBaselineEvidence,
      usedCache: hasEffectiveAdzunaEvidence ? evidenceResult.usedCache : false,
      postingsCount: hasEffectiveAdzunaEvidence ? evidenceResult.postingsCount : 0,
      llmNormalizedCount: hasEffectiveAdzunaEvidence ? evidenceResult.llmNormalizedCount : 0,
      fetchedAt: hasEffectiveAdzunaEvidence ? evidenceResult.fetchedAt : null,
      query:
        hasEffectiveAdzunaEvidence && evidenceResult.queryId
          ? evidenceResult.query
          : null,
      sourcePriority: ['user_posting', 'adzuna', 'onet']
    },
    bottleneck,
    dataTransparency: {
      inputsUsed: ['currentRole', 'targetRole', 'experienceText', 'skills', 'location', 'timeline', 'education'],
      datasetsUsed: uniqueStrings([
        'occupations',
        'occupation_skills',
        'occupation_requirements',
        'occupation_wages',
        'trade_requirements',
        ...(hasEffectiveAdzunaEvidence
          ? ['job_queries', 'job_postings', 'job_requirements']
          : []),
        ...(hasEffectiveUserPostingEvidence ? ['user_posting'] : []),
        ...(usesBaselineFallback ? ['onet_baseline'] : [])
      ]),
      fxRateUsed: fxRate ? `USD/CAD ${fxRate.rate} (${fxRate.as_of_date})` : null
    }
  }

  return {
    report,
    legacy: {
      score: report.compatibilitySnapshot.score,
      explanation: report.compatibilitySnapshot.topReasons.join(' '),
      transferableSkills: userSkills.map((skill) => skill.name).slice(0, 10),
      skillGaps: report.skillGaps.map((gap) => ({ title: gap.skillName, detail: gap.howToClose[0], difficulty: gap.difficulty })),
      roadmap: legacyRoadmap(report.roadmap),
      resumeReframes: report.resumeReframe,
      recommendedRoles: report.suggestedCareers.map((career) => ({ title: career.title, match: career.score, reason: career.topReasons[0] ?? 'Strong compatibility.' }))
    },
    scoringSnapshot: {
      total_score: report.compatibilitySnapshot.score,
      breakdown: report.compatibilitySnapshot.breakdown,
      top_occupation_id: best?.occupationId ?? null
    }
  }
}


