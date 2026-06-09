import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  generateCareerMapPlannerAnalysis,
  type CareerPlannerAnalysis
} from '@/lib/server/careerMapPlanner'
import {
  OCCUPATION_RESOLUTION_THRESHOLD,
  isWithinCareerProgression,
  resolveOccupation,
  type ResolvedOccupation
} from '@/lib/occupations/resolveOccupation'
import {
  inferRoleFamilyConstraintFromCanonical,
  resolveCanonicalRoleIntent
} from '@/lib/occupations/canonicalRoleRegistry'
import { consumeRateLimit, getClientIp, toRateLimitHeaders } from '@/lib/server/rateLimit'
import type { CareerSwitchPlannerInput } from '@/lib/planner/types'
import {
  consumeUsageForSuccessfulRun,
  getAnonymousUsageSummary,
  getAuthenticatedUserFromRequest,
  getUsageSummaryForUser,
  hashToolInput,
  recordToolRun,
  type UsageSummary
} from '@/lib/server/toolUsage'
import { generateTransitionPlan } from '@/lib/transition/generatePlan'
import {
  getCachedOrGenerateTransitionEnhancement,
  type TransitionPlanCacheMeta,
  type TransitionPlanScripts,
  type TransitionStructuredPlan
} from '@/lib/server/transitionPlanEnhancer'
import {
  getPlannerSourceEnrichment,
  type PlannerSourceEnrichment
} from '@/lib/server/plannerSourceEnrichment'
import {
  applyTransitionPriorsToReport,
  getTransitionPriorContext,
  persistPlannerGenerationSnapshot
} from '@/lib/server/plannerLearning'
import type { PlannerReportSource, TransitionModeReport } from '@/lib/transition/types'

export const dynamic = 'force-dynamic'

const REPORT_CACHE_TTL_HOURS = Number.parseInt(
  process.env.PLANNER_REPORT_CACHE_TTL_HOURS?.trim() || '168',
  10
)
const GENERATION_CACHE_TTL_HOURS = Number.parseInt(
  process.env.PLANNER_GENERATION_CACHE_TTL_HOURS?.trim() || '72',
  10
)
// v2: hardened requirement extraction — company-age phrases ("over 100 years",
// "Founded 50 years ago") no longer leak in as "Demonstrate N years of
// experience" requirements. Bumping invalidates pre-fix cached reports.
const GENERATION_CACHE_SCHEMA_VERSION =
  process.env.PLANNER_GENERATION_CACHE_VERSION?.trim() || 'v2'

export async function GET(request: NextRequest) {
  try {
    const planOverride = request.nextUrl.searchParams.get('plan')?.trim().toLowerCase() ?? null
    const usesOverrideRaw = request.nextUrl.searchParams.get('uses')?.trim() ?? null
    const usesOverride =
      usesOverrideRaw && /^\d+$/.test(usesOverrideRaw) ? Number.parseInt(usesOverrideRaw, 10) : null

    if (planOverride === 'free' || planOverride === 'pro' || planOverride === 'lifetime') {
      const isUnlimited = planOverride === 'pro' || planOverride === 'lifetime'
      const limit = 3
      const used =
        isUnlimited || usesOverride === null ? 0 : Math.max(0, limit - Math.min(limit, usesOverride))
      return NextResponse.json({
        plan: planOverride,
        isUnlimited,
        canUse: isUnlimited || (usesOverride ?? 0) > 0,
        used,
        limit,
        usesRemaining: isUnlimited ? null : Math.max(0, usesOverride ?? 0),
        byTool: {},
      })
    }

    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json(getAnonymousUsageSummary())
    }

    const summary = await getUsageSummaryForUser(user)
    return NextResponse.json(summary)
  } catch (error) {
    console.error('[career-switch-planner] usage_check_failed', error)
    return NextResponse.json({ error: 'Failed to check tool usage' }, { status: 500 })
  }
}

function isLocalhostDevRequest(request: Request) {
  if (process.env.NODE_ENV === 'production') return false
  const hostHeader = request.headers.get('host')?.trim().toLowerCase() ?? ''
  const host = hostHeader.split(':')[0]
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '0.0.0.0' ||
    host === '::1' ||
    host === '[::1]'
  )
}

function localDevUnlimitedUsageSummary(): UsageSummary {
  return {
    plan: 'pro',
    isUnlimited: true,
    canUse: true,
    used: 0,
    limit: 3,
    usesRemaining: null,
    byTool: {}
  }
}

function asString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function asNullableString(value: unknown) {
  const normalized = asString(value)
  return normalized || null
}

function asStringArray(value: unknown) {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)
}

function uniqueNormalizedStrings(values: string[], limit = 12) {
  const seen = new Set<string>()
  const output: string[] = []
  for (const value of values) {
    const trimmed = value.trim()
    if (!trimmed) continue
    const key = trimmed
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    if (!key || seen.has(key)) continue
    seen.add(key)
    output.push(trimmed)
    if (output.length >= limit) break
  }
  return output
}

function isConcreteCertificationRequirement(value: string) {
  if (!value) return false
  const normalized = value.toLowerCase()
  const hasSignal = /\b(certif|licen[cs]e|registration|exam|permit|clearance|accredit|cpr|bls|acls|whmis|loto|first aid|safety|board|designation)\b/.test(
    normalized
  )
  if (!hasSignal) return false
  if (
    /confirm regional licensing and certification requirements before applying/.test(normalized) ||
    /obtain required certification with active status/.test(normalized) ||
    /required certification/.test(normalized)
  ) {
    return false
  }
  return true
}

const PROVINCE_LABELS: Record<string, string> = {
  ON: 'Ontario',
  BC: 'British Columbia',
  AB: 'Alberta',
  SK: 'Saskatchewan',
  MB: 'Manitoba',
  QC: 'Quebec',
  NB: 'New Brunswick',
  NS: 'Nova Scotia',
  PE: 'Prince Edward Island',
  NL: 'Newfoundland and Labrador',
  YT: 'Yukon',
  NT: 'Northwest Territories',
  NU: 'Nunavut'
}

function locationFromWorkRegion(workRegion: string) {
  const normalized = workRegion.trim().toUpperCase()
  if (PROVINCE_LABELS[normalized]) {
    return `${PROVINCE_LABELS[normalized]}, Canada`
  }
  return 'Canada'
}

function normalizeInput(input: Partial<CareerSwitchPlannerInput> & Record<string, unknown>) {
  const currentRoleText = asString(input.currentRoleText)
  const targetRoleText = asString(input.targetRoleText)
  const recommendMode = Boolean(
    typeof input.recommendMode === 'boolean' ? input.recommendMode : input.notSureMode
  )
  const skills = asStringArray(input.skills)
  const experienceText = asString(input.experienceText)
  const educationLevel = asString(input.educationLevel)
  const workRegion = asString(input.workRegion)
  const locationText = asString(input.locationText)
  const timelineBucket = asString(input.timelineBucket)
  const incomeTarget = asString(input.incomeTarget)
  const userPostingText = asString(input.userPostingText)
  const useMarketEvidence =
    typeof input.useMarketEvidence === 'boolean' ? input.useMarketEvidence : true
  const planVersion = asNullableString(input.planVersion)
  const inputVersion = asNullableString(input.inputVersion)

  const currentRole = currentRoleText || asString(input.currentRole)
  const targetRole = recommendMode ? '' : targetRoleText || asString(input.targetRole)
  const normalizedExperience = [experienceText, skills.length > 0 ? `Skills: ${skills.join(', ')}` : '']
    .filter(Boolean)
    .join('\n')

  return {
    currentRole,
    targetRole,
    notSureMode: recommendMode,
    experienceText: normalizedExperience,
    location: locationText || asString(input.location) || locationFromWorkRegion(workRegion),
    locationText,
    timeline: asString(input.timeline) || timelineBucket,
    education: asString(input.education) || educationLevel,
    incomeTarget,
    userPostingText,
    useMarketEvidence,
    currentRoleOccupationId: asNullableString(input.currentRoleOccupationId),
    targetRoleOccupationId: recommendMode ? null : asNullableString(input.targetRoleOccupationId),
    currentRoleText,
    targetRoleText: recommendMode ? '' : targetRoleText,
    recommendMode,
    skills,
    educationLevel,
    workRegion,
    timelineBucket,
    planVersion,
    inputVersion
  }
}

function validateInput(input: ReturnType<typeof normalizeInput>) {
  if (!input.currentRole && !input.experienceText && input.skills.length < 3) {
    return 'Add a current role, experience summary, or at least 3 skills.'
  }
  if (!input.recommendMode && !input.targetRole) {
    return 'Target role is required unless Not sure mode is enabled.'
  }
  if (!input.location) {
    return 'Location is required to generate employer-evidence requirements.'
  }
  return null
}

function regionFromWorkRegion(workRegion: string): 'CA' | undefined {
  const normalized = workRegion.trim().toUpperCase()
  if (PROVINCE_LABELS[normalized]) return 'CA'
  return 'CA'
}

function collectV3MissingFields(report: Record<string, unknown> | null) {
  if (!report) return ['report']

  const missing: string[] = []
  const asRecord = (value: unknown) =>
    value && typeof value === 'object' ? (value as Record<string, unknown>) : null

  const transitionMode = asRecord(report.transitionMode)
  const transitionDifficulty = asRecord(transitionMode?.difficulty)
  const transitionTimeline = asRecord(transitionMode?.timeline)
  const transitionRoadmapGuide = asRecord(transitionMode?.roadmapGuide)
  const transitionSections = asRecord(report.transitionSections)
  const roadmapPlan = asRecord(transitionSections?.roadmapPlan)
  const transitionReport = asRecord(report.transitionReport)
  const transitionPlan = asRecord(transitionReport?.plan30_60_90)
  const targetRequirements = asRecord(report.targetRequirements)
  const suggestedCareers = Array.isArray(report.suggestedCareers)
    ? (report.suggestedCareers as Array<Record<string, unknown>>)
    : []
  const firstCareer = suggestedCareers[0]
  const firstCareerSalary = asRecord(asRecord(firstCareer?.salary)?.native)

  if (typeof transitionDifficulty?.score !== 'number') missing.push('hero.difficulty')
  if (
    typeof transitionTimeline?.minMonths !== 'number' ||
    typeof transitionTimeline?.maxMonths !== 'number'
  ) {
    missing.push('hero.timeline')
  }
  if (typeof firstCareerSalary?.low !== 'number') missing.push('market.entry_wage')
  if (typeof firstCareerSalary?.high !== 'number') missing.push('market.top_earners')
  if (!Array.isArray(targetRequirements?.certifications)) missing.push('training.certifications')
  if (!Array.isArray(transitionRoadmapGuide?.phases)) missing.push('roadmap.phases')
  if (
    !Array.isArray(roadmapPlan?.fastestPathToApply) &&
    !Array.isArray(transitionPlan?.fastestPathToApply)
  ) {
    missing.push('fastest_path.steps')
  }

  return Array.from(new Set(missing)).sort()
}

function buildRoleResolutionPayload(inputValue: string, resolution: ResolvedOccupation) {
  return {
    input: inputValue,
    matched:
      resolution.occupationId && resolution.region
        ? {
            occupationId: resolution.occupationId,
            title: resolution.title,
            code: resolution.code,
            region: resolution.region,
            source: resolution.source,
            lastUpdated: resolution.lastUpdated ?? null,
            confidence: resolution.confidence,
            stage: resolution.stage ?? null,
            specialization: resolution.specialization ?? null,
            rawInputTitle: resolution.rawInputTitle,
            matchExplanation: resolution.matchExplanation ?? null
          }
        : null,
    suggestions: resolution.alternatives.map((item) => ({
      occupationId: item.occupationId,
      title: item.title,
      code: item.code,
      region: item.region,
      source: item.source,
      confidence: item.confidence
    })),
    matchExplanation: resolution.matchExplanation ?? null
  }
}

function buildRoleSelectionPayload(
  role: 'current' | 'target',
  inputValue: string,
  resolution: ResolvedOccupation
) {
  const alternatives = [
    resolution.occupationId
      ? {
          occupationId: resolution.occupationId,
          title: resolution.title,
          code: resolution.code,
          confidence: resolution.confidence,
          source: resolution.source,
          stage: resolution.stage ?? null,
          specialization: resolution.specialization ?? null
        }
      : null,
    ...resolution.alternatives.map((item) => ({
      occupationId: item.occupationId,
      title: item.title,
      code: item.code,
      confidence: item.confidence,
      source: item.source,
      stage: resolution.stage ?? null,
      specialization: resolution.specialization ?? null
    }))
  ]
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .filter((item, index, collection) =>
      collection.findIndex((candidate) => candidate.occupationId === item.occupationId) === index
    )
    .slice(0, 5)

  const nextBest = alternatives[1]
  const hasCloseAlternative =
    typeof nextBest?.confidence === 'number' &&
    resolution.confidence - nextBest.confidence <= 0.05

  return {
    error: 'ROLE_SELECTION_REQUIRED',
    role,
    input: inputValue,
    message: hasCloseAlternative
      ? 'Multiple close matches found. Please select the closest role.'
      : `Choose your closest role match for "${inputValue || 'this target'}".`,
    threshold: OCCUPATION_RESOLUTION_THRESHOLD,
    alternatives
  }
}

// Generic role words carry no topical signal, so they don't count as relevance.
const NON_TOPICAL_ROLE_TOKENS = new Set([
  'manager', 'managers', 'specialist', 'coordinator', 'officer', 'assistant',
  'associate', 'services', 'service', 'support', 'worker', 'workers',
  'representative', 'related', 'occupations', 'other', 'general'
])

function meaningfulRoleTokens(value: string): Set<string> {
  return new Set(
    value
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length >= 3 && !NON_TOPICAL_ROLE_TOKENS.has(token))
  )
}

// In the below-confidence ("unmapped") case, only offer suggestions that are
// either clearly strong or share a real topical token with what the user typed —
// so e.g. "IT Support" never surfaces "Managers in customer and personal services".
function isRelevantUnmappedSuggestion(inputValue: string, alt: { title: string; confidence?: number }) {
  if (typeof alt.confidence === 'number' && alt.confidence >= 0.55) return true
  const inputTokens = meaningfulRoleTokens(inputValue)
  if (inputTokens.size === 0) return false
  const titleTokens = meaningfulRoleTokens(alt.title)
  for (const token of inputTokens) {
    if (titleTokens.has(token)) return true
  }
  return false
}

function buildUnmappedRolePayload(
  role: 'current' | 'target',
  inputValue: string,
  resolution: ResolvedOccupation
) {
  const base = buildRoleSelectionPayload(role, inputValue, resolution)
  const relevantAlternatives = base.alternatives.filter((alt) =>
    isRelevantUnmappedSuggestion(inputValue, alt)
  )
  return {
    ...base,
    alternatives: relevantAlternatives,
    error: 'UNMAPPED_ROLE' as const,
    message:
      relevantAlternatives.length > 0
        ? `We couldn’t confidently map "${inputValue || 'this role'}" yet. ` +
          'Choose the closest match, or refine the role title with more specific wording.'
        : `We couldn’t confidently map "${inputValue || 'this role'}" to a known occupation. ` +
          'Try a more specific or common job title (for example, the official title from a job posting).'
  }
}

const OCCUPATION_AUTO_SELECT_CONFIDENCE = 0.67
const OCCUPATION_AUTO_SELECT_MARGIN = 0.05

function normalizeRoleText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function sanitizeGeneratedPlannerText(value: string) {
  if (!value) return value
  const trimmed = value.trim()
  if (/^https?:\/\//i.test(trimmed)) return value

  return value
    .replace(/\borcompletion\b/gi, 'or completion')
    .replace(/\bapplications applications\b/gi, 'applications')
    .replace(/\s+/g, ' ')
    .trim()
}

function sanitizePlannerReportNode<T>(value: T): T {
  if (typeof value === 'string') {
    return sanitizeGeneratedPlannerText(value) as T
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizePlannerReportNode(item)) as T
  }
  if (value && typeof value === 'object') {
    const inputRecord = value as Record<string, unknown>
    const outputRecord: Record<string, unknown> = {}
    for (const [key, child] of Object.entries(inputRecord)) {
      outputRecord[key] = sanitizePlannerReportNode(child)
    }
    return outputRecord as T
  }
  return value
}

function isExactLikeRoleMatch(inputValue: string, resolvedTitle: string) {
  const normalizedInput = normalizeRoleText(inputValue)
  const normalizedResolved = normalizeRoleText(resolvedTitle)
  if (!normalizedInput || !normalizedResolved) return false
  return (
    normalizedResolved === normalizedInput ||
    normalizedResolved.includes(normalizedInput) ||
    normalizedInput.includes(normalizedResolved)
  )
}

const ROLE_TOKEN_STOPWORDS = new Set([
  'and',
  'or',
  'the',
  'of',
  'for',
  'to',
  'in',
  'with',
  'other',
  'related',
  'services',
  'occupations',
  'professionals'
])

function roleTokens(value: string) {
  return normalizeRoleText(value)
    .split(' ')
    .map((token) => token.trim())
    .filter((token) => token.length >= 2 && !ROLE_TOKEN_STOPWORDS.has(token))
}

function hasStrongRoleLexicalAlignment(inputValue: string, resolvedTitle: string) {
  const inputTokens = roleTokens(inputValue)
  const resolvedTokens = roleTokens(resolvedTitle)
  if (inputTokens.length === 0 || resolvedTokens.length === 0) return false

  const resolvedSet = new Set(resolvedTokens)
  const overlap = inputTokens.filter((token) => resolvedSet.has(token)).length

  // Require meaningful overlap so generic broad matches do not auto-select.
  return overlap >= Math.max(1, Math.ceil(inputTokens.length * 0.5))
}

function matchesCanonicalConstraint(inputValue: string, candidateTitle: string) {
  const canonicalConstraint = inferRoleFamilyConstraintFromCanonical(inputValue, 0.62)
  if (!canonicalConstraint) return true

  const normalizedTitle = normalizeRoleText(candidateTitle)
  if (
    canonicalConstraint.blockedKeywords?.some((keyword) =>
      normalizedTitle.includes(normalizeRoleText(keyword))
    )
  ) {
    return false
  }

  const matches = canonicalConstraint.allowedKeywords.filter((keyword) =>
    normalizedTitle.includes(normalizeRoleText(keyword))
  ).length

  return matches >= (canonicalConstraint.minKeywordMatches ?? 1)
}

function promoteExactLikeAlternative(
  resolution: ResolvedOccupation,
  inputValue: string
): ResolvedOccupation {
  const exactLikeAlternatives = resolution.alternatives
    .filter((item) => isExactLikeRoleMatch(inputValue, item.title))
    .sort((left, right) => {
      if (right.confidence !== left.confidence) return right.confidence - left.confidence
      return left.title.length - right.title.length
    })
  const promoted = exactLikeAlternatives[0]
  if (!promoted) return resolution
  if (promoted.confidence + 0.08 < resolution.confidence) return resolution

  const shouldResolve =
    promoted.confidence >= OCCUPATION_RESOLUTION_THRESHOLD ||
    promoted.confidence >= OCCUPATION_RESOLUTION_THRESHOLD - 0.04

  return {
    ...resolution,
    resolved: resolution.resolved || shouldResolve,
    occupationId: promoted.occupationId,
    title: promoted.title,
    code: promoted.code,
    source: promoted.source,
    confidence: promoted.confidence,
    region: promoted.region
  }
}

function promoteCanonicalAlternative(
  resolution: ResolvedOccupation,
  inputValue: string
): ResolvedOccupation {
  const canonicalIntent = resolveCanonicalRoleIntent(inputValue, 0.66)
  if (!canonicalIntent) return resolution

  const candidates = [
    {
      kind: 'primary' as const,
      title: resolution.title,
      confidence: resolution.confidence,
      occupationId: resolution.occupationId,
      code: resolution.code,
      source: resolution.source,
      region: resolution.region ?? null
    },
    ...resolution.alternatives.map((item) => ({
      kind: 'alternative' as const,
      title: item.title,
      confidence: item.confidence,
      occupationId: item.occupationId,
      code: item.code,
      source: item.source,
      region: item.region
    }))
  ]
    .filter((item) => Boolean(item.occupationId))
    .filter((item) => matchesCanonicalConstraint(inputValue, item.title))
    .sort((left, right) => right.confidence - left.confidence)

  const top = candidates[0]
  if (!top || top.kind === 'primary') return resolution

  const primaryMatchesCanonical = matchesCanonicalConstraint(inputValue, resolution.title)
  const next = candidates[1]
  const hasSafeLead = !next || top.confidence - next.confidence >= 0.04
  if (
    top.confidence < OCCUPATION_RESOLUTION_THRESHOLD - 0.12 ||
    (!hasSafeLead && primaryMatchesCanonical)
  ) {
    return resolution
  }

  return {
    ...resolution,
    resolved: top.confidence >= OCCUPATION_RESOLUTION_THRESHOLD,
    occupationId: top.occupationId!,
    title: top.title,
    code: top.code,
    source: top.source,
    confidence: top.confidence,
    region: top.region,
    alternatives: resolution.alternatives.filter((item) => item.occupationId !== top.occupationId)
  }
}

function canDeterministicallySelectRole(
  resolution: ResolvedOccupation,
  inputValue: string
) {
  if (resolution.resolved) return true
  if (!resolution.occupationId) return false

  const exactLikeMatch = isExactLikeRoleMatch(inputValue, resolution.title)
  if (exactLikeMatch && resolution.confidence >= OCCUPATION_RESOLUTION_THRESHOLD - 0.04) {
    return true
  }

  const lexicalAlignment = hasStrongRoleLexicalAlignment(inputValue, resolution.title)
  if (!lexicalAlignment && resolution.confidence < 0.8) {
    return false
  }

  const canonicalIntent = resolveCanonicalRoleIntent(inputValue, 0.66)
  if (
    canonicalIntent &&
    canonicalIntent.confidence >= 0.74 &&
    matchesCanonicalConstraint(inputValue, resolution.title) &&
    resolution.confidence >= OCCUPATION_RESOLUTION_THRESHOLD - 0.12
  ) {
    return true
  }

  if (canonicalIntent && canonicalIntent.confidence >= 0.9) {
    const closeCandidates = [
      { title: resolution.title, confidence: resolution.confidence },
      ...resolution.alternatives
        .filter((candidate) => candidate.confidence >= resolution.confidence - 0.05)
        .map((candidate) => ({ title: candidate.title, confidence: candidate.confidence }))
    ]
    const allCloseCandidatesWithinFamily =
      closeCandidates.length > 0 &&
      closeCandidates.every((candidate) =>
        matchesCanonicalConstraint(inputValue, candidate.title)
      )

    if (
      allCloseCandidatesWithinFamily &&
      resolution.confidence >= OCCUPATION_RESOLUTION_THRESHOLD - 0.14
    ) {
      return true
    }
  }

  if (resolution.confidence < OCCUPATION_AUTO_SELECT_CONFIDENCE) return false

  const nextBest = resolution.alternatives[0]
  if (!nextBest) return true
  if (resolution.confidence - nextBest.confidence <= 0.05) return false
  if (nextBest.code && nextBest.code === resolution.code) return true

  return resolution.confidence - nextBest.confidence >= OCCUPATION_AUTO_SELECT_MARGIN
}

function shouldReturnUnmappedRole(
  resolution: ResolvedOccupation,
  inputValue: string
) {
  if (!inputValue.trim()) return false
  if (resolution.resolved) return false
  if (!resolution.occupationId && resolution.alternatives.length === 0) return false
  if (!resolution.occupationId) return true

  if (
    isExactLikeRoleMatch(inputValue, resolution.title) ||
    resolution.alternatives.some((candidate) =>
      isExactLikeRoleMatch(inputValue, candidate.title)
    )
  ) {
    return false
  }

  const canonicalIntent = resolveCanonicalRoleIntent(inputValue)
  if (canonicalIntent && canonicalIntent.confidence >= 0.66) {
    const hasCanonicalCandidate =
      matchesCanonicalConstraint(inputValue, resolution.title) ||
      resolution.alternatives.some((candidate) =>
        matchesCanonicalConstraint(inputValue, candidate.title)
      )
    if (!hasCanonicalCandidate) return true
  }

  if (resolution.confidence >= OCCUPATION_RESOLUTION_THRESHOLD - 0.04) return false
  if (hasStrongRoleLexicalAlignment(inputValue, resolution.title)) return false

  const hasStrongAlternative = resolution.alternatives.some(
    (candidate) =>
      candidate.confidence >= 0.62 &&
      hasStrongRoleLexicalAlignment(inputValue, candidate.title)
  )
  if (hasStrongAlternative) return false

  return resolution.confidence < 0.62
}

const NON_TRADES_SCRIPT_REWRITES: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /\bapprenticeship\b/gi, replacement: 'training pathway' },
  { pattern: /\bapprentice\b/gi, replacement: 'entry-level candidate' },
  { pattern: /\bred\s*seal\b/gi, replacement: 'licensing requirements' },
  { pattern: /\bcertificate of qualification\b/gi, replacement: 'licensing exam' },
  { pattern: /\bjourneyperson\b/gi, replacement: 'fully licensed professional' },
  { pattern: /\bjourneyman\b/gi, replacement: 'fully licensed professional' },
  { pattern: /\bunion intake\b/gi, replacement: 'hiring intake' },
  { pattern: /\bemployer sponsor\b/gi, replacement: 'hiring manager' },
  { pattern: /\btrade school\b/gi, replacement: 'training program' }
]

function sanitizeTransitionScriptsForCareerPath(
  scripts: { call: string; email: string; source: 'gpt' | 'deterministic' } | null,
  careerPathType: string | null | undefined
) {
  if (!scripts) return scripts
  if (careerPathType === 'TRADES') return scripts

  const clean = (value: string) =>
    NON_TRADES_SCRIPT_REWRITES.reduce(
      (output, rewrite) => output.replace(rewrite.pattern, rewrite.replacement),
      value
    )
      .replace(/\s+/g, ' ')
      .trim()

  return {
    ...scripts,
    call: clean(scripts.call),
    email: clean(scripts.email)
  }
}

function compatibilityLevelFromDifficultyScore(
  difficultyScore: number
): TransitionStructuredPlan['compatibility_level'] {
  if (difficultyScore <= 4.5) return 'High'
  if (difficultyScore <= 7.5) return 'Medium'
  return 'Low'
}

function buildTransitionEnhancementFallback(args: {
  currentRole: string
  targetRole: string
  region: string
  transitionMode: TransitionModeReport
}) {
  const { currentRole, targetRole, region, transitionMode } = args
  const nowIso = new Date().toISOString()

  const timelineEstimate =
    transitionMode.timeline.minMonths === transitionMode.timeline.maxMonths
      ? `${transitionMode.timeline.minMonths} months`
      : `${transitionMode.timeline.minMonths}-${transitionMode.timeline.maxMonths} months`
  const finalEarning = transitionMode.earnings[transitionMode.earnings.length - 1]
  const salaryProjection = `${finalEarning.rangeLow}-${finalEarning.rangeHigh} ${finalEarning.unit}`
  const missing = transitionMode.gaps.missing.slice(0, 4)
  const strengths = transitionMode.gaps.strengths.slice(0, 4)
  const firstSteps = transitionMode.gaps.first3Steps.slice(0, 3)
  const startFromZero = (
    transitionMode.roadmapGuide?.next7Days?.slice(0, 4).filter(Boolean) ?? firstSteps
  ).slice(0, 4)
  const routeSteps = [
    transitionMode.routes.primary.firstStep,
    transitionMode.routes.secondary.firstStep,
    transitionMode.routes.contingency.firstStep
  ]
    .filter(Boolean)
    .slice(0, 4)

  const plan: TransitionStructuredPlan = {
    summary: `This transition from ${currentRole} to ${targetRole} is achievable with consistent weekly execution and role-specific proof.`,
    compatibility_level: compatibilityLevelFromDifficultyScore(transitionMode.difficulty.score),
    timeline_estimate: timelineEstimate,
    required_certifications: routeSteps.length > 0 ? routeSteps : ['Confirm role requirements for your province'],
    required_experience: missing.length > 0 ? missing : ['Build role-relevant experience signals'],
    action_steps: firstSteps.length > 0 ? firstSteps : ['Start with one concrete requirement this week'],
    salary_projection: `Expected range at progression: ${salaryProjection}`,
    narrative_sections: {
      intro: `You are moving toward ${targetRole} in ${region}. Prioritize requirement fit, then execution rhythm.`,
      skills_you_build: [
        {
          title: 'Core capability build',
          summary: `Build the top role-aligned capabilities required for ${targetRole}.`,
          bullets:
            missing.length > 0 ? missing.slice(0, 3) : ['Develop role-specific technical fundamentals']
        }
      ],
      credentials_you_need: [
        {
          title: 'Requirement checkpoints',
          summary: 'Confirm and complete the highest-leverage qualification checkpoints first.',
          bullets: routeSteps.length > 0 ? routeSteps : ['Validate province-specific requirements']
        }
      ],
      soft_skills_that_matter:
        strengths.length > 0 ? strengths : ['Reliability', 'Communication', 'Follow-through'],
      why_this_path_can_pay_off: [
        `Timeline estimate: ${timelineEstimate}.`,
        `Compensation can progress toward ${salaryProjection}.`
      ],
      start_from_zero:
        startFromZero.length > 0 ? startFromZero : ['Complete one requirement and one outreach step this week']
    }
  }

  const scripts: TransitionPlanScripts = {
    call:
      transitionMode.execution.outreachTemplates.call ||
      `Hi, I'm transitioning from ${currentRole} to ${targetRole}. I'd value your advice on the next practical step.`,
    email:
      transitionMode.execution.outreachTemplates.email ||
      `Subject: Transitioning to ${targetRole}\n\nHi, I am moving from ${currentRole} to ${targetRole} and would appreciate guidance on the strongest next step.`,
    source: 'deterministic'
  }

  const cacheMeta: TransitionPlanCacheMeta = {
    version: 'transition-plan-route-fallback-v1',
    generatedAt: nowIso,
    region,
    experienceLevelBucket: 'unknown',
    cacheHit: false
  }

  return { plan, scripts, cacheMeta }
}

function applyFreeTierOutputLimits(report: CareerPlannerAnalysis['report']) {
  const limitedReport: CareerPlannerAnalysis['report'] = {
    ...report,
    roadmap: report.roadmap.slice(0, 1),
    resumeReframe: []
  }

  const strategy = report.executionStrategy
  const monthPlan = strategy.plan90Day

  const firstLinkedFromMonth = (month: typeof monthPlan.month2) => {
    const firstAction = month.actions[0]
    const linked = Array.isArray(firstAction?.linkedRequirements)
      ? (firstAction.linkedRequirements as string[])
      : []
    return linked.length > 0 ? linked.slice(0, 2) : []
  }

  const condensedMonth = (
    month: typeof monthPlan.month2,
    monthId: 'month2' | 'month3'
  ) => ({
    ...month,
    actions: [
      {
        id: `${monthId}-free-summary`,
        task: 'Upgrade to Pro to unlock the full weekly action sequence for this month.',
        volumeTarget: 'Locked on Free plan',
        learningTarget: 'Full sequencing available on Pro',
        proofTarget: 'Full proof checklist available on Pro',
        weeklyTime: month.weeklyTimeInvestment,
        linkedRequirements: firstLinkedFromMonth(month)
      }
    ]
  })

  limitedReport.executionStrategy = {
    ...strategy,
    plan90Day: {
      ...monthPlan,
      month1: monthPlan.month1,
      month2: condensedMonth(monthPlan.month2, 'month2'),
      month3: condensedMonth(monthPlan.month3, 'month3')
    }
  }

  return limitedReport
}

function applyGuestPreviewOutputLimits(report: CareerPlannerAnalysis['report']) {
  return {
    ...report,
    resumeReframe: [],
    linksResources: [],
    transitionStructuredPlan: null,
    transitionPlanScripts: null,
    transitionPlanCacheMeta: null,
    executionStrategy: {
      ...report.executionStrategy,
      whereYouStandNow: {
        strengths: [],
        missingMandatoryRequirements: [],
        competitiveDisadvantages: []
      },
      realBlockers: {
        requiredToApply: [],
        requiredToCompete: []
      },
      transferableEdge: {
        translations: []
      },
      plan90Day: {
        ...report.executionStrategy.plan90Day,
        month1: { ...report.executionStrategy.plan90Day.month1, actions: [] },
        month2: { ...report.executionStrategy.plan90Day.month2, actions: [] },
        month3: { ...report.executionStrategy.plan90Day.month3, actions: [] }
      },
      probabilityRealityCheck: {
        difficulty: 'Sign in to unlock',
        whatIncreasesOdds: [],
        commonFailureModes: []
      },
      behavioralExecution: {
        minimumWeeklyEffort: 'Sign in to unlock',
        consistencyLooksLike: [],
        whatNotToDo: []
      }
    }
  } as CareerPlannerAnalysis['report']
}

function buildLegacyFromReport(report: CareerPlannerAnalysis['report']) {
  const transferableSkills = Array.isArray(report.transitionSections?.transferableStrengths)
    ? report.transitionSections.transferableStrengths
        .map((item) => asString(item?.label))
        .filter(Boolean)
        .slice(0, 10)
    : []
  const roadmapItems = Array.isArray((report as Record<string, unknown>).roadmap)
    ? ((report as Record<string, unknown>).roadmap as Array<Record<string, unknown>>)
    : []
  const roadmapToText = (item: Record<string, unknown>) =>
    asString(item.goal) || asString(item.title) || asString(item.action)

  return {
    score: report.compatibilitySnapshot.score,
    explanation: report.compatibilitySnapshot.topReasons.join(' '),
    transferableSkills,
    skillGaps: report.skillGaps.map((gap) => ({
      title: gap.skillName,
      detail: gap.howToClose[0] ?? `Build ${gap.skillName} through role-relevant practice.`,
      difficulty: gap.difficulty
    })),
    roadmap: {
      '30': roadmapItems.slice(0, 1).map(roadmapToText).filter(Boolean),
      '60': roadmapItems.slice(1, 2).map(roadmapToText).filter(Boolean),
      '90': roadmapItems.slice(2, 3).map(roadmapToText).filter(Boolean)
    },
    resumeReframes: report.resumeReframe,
    recommendedRoles: report.suggestedCareers.map((career) => ({
      title: career.title,
      match: career.score,
      reason: career.topReasons[0] ?? 'Strong compatibility.'
    }))
  }
}

function isCacheFresh(createdAt: string | null | undefined) {
  if (!createdAt) return false
  const ts = new Date(createdAt).getTime()
  if (Number.isNaN(ts)) return false
  const ttlHours = Number.isFinite(REPORT_CACHE_TTL_HOURS) ? REPORT_CACHE_TTL_HOURS : 168
  const ttlMs = Math.max(1, ttlHours) * 60 * 60 * 1000
  return Date.now() - ts <= ttlMs
}

function asPlannerReportSource(value: unknown): PlannerReportSource | null {
  if (!value || typeof value !== 'object') return null
  const report = value as Partial<PlannerReportSource>
  if (!report.compatibilitySnapshot || !report.transitionSections || !report.suggestedCareers) {
    return null
  }
  return report as PlannerReportSource
}

type PlannerGenerationCacheMode = 'auth_free' | 'auth_paid' | 'guest_preview' | 'dev_local'

type PlannerGenerationCachePayload = {
  legacy: Record<string, unknown>
  report: Record<string, unknown>
  scoring: Record<string, unknown> | null
  previewLimited: boolean
}

type StageFailure = {
  stage: string
  message: string
}

function stageFailureMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

async function runStageWithFallback<T>(args: {
  stage: string
  execute: () => Promise<T>
  fallback: () => Promise<T> | T
  failures: StageFailure[]
}) {
  try {
    return await args.execute()
  } catch (error) {
    const message = stageFailureMessage(error)
    args.failures.push({ stage: args.stage, message })
    console.warn('[career-switch-planner] stage_fallback', {
      stage: args.stage,
      message
    })
    return await args.fallback()
  }
}

function generationCacheModeForRequest(args: {
  userPlan: UsageSummary['plan'] | null
  isGuestPreview: boolean
  localUnsignedBypass: boolean
}): PlannerGenerationCacheMode {
  if (args.localUnsignedBypass) return 'dev_local'
  if (args.isGuestPreview) return 'guest_preview'
  if (args.userPlan === 'free') return 'auth_free'
  return 'auth_paid'
}

function buildGenerationCacheKey(inputHash: string, mode: PlannerGenerationCacheMode) {
  return [
    'planner-generation',
    GENERATION_CACHE_SCHEMA_VERSION,
    mode,
    inputHash
  ].join('::')
}

function generationCacheExpiresAt() {
  const ttlHours = Number.isFinite(GENERATION_CACHE_TTL_HOURS)
    ? Math.max(1, GENERATION_CACHE_TTL_HOURS)
    : 72
  const expires = new Date()
  expires.setHours(expires.getHours() + ttlHours)
  return expires.toISOString()
}

function asPlannerGenerationCachePayload(value: unknown): PlannerGenerationCachePayload | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  if (!record.legacy || typeof record.legacy !== 'object') return null
  if (!record.report || typeof record.report !== 'object') return null
  if (typeof record.previewLimited !== 'boolean') return null
  return {
    legacy: record.legacy as Record<string, unknown>,
    report: record.report as Record<string, unknown>,
    scoring:
      record.scoring && typeof record.scoring === 'object'
        ? (record.scoring as Record<string, unknown>)
        : null,
    previewLimited: record.previewLimited
  }
}

function emptySourceEnrichment(): PlannerSourceEnrichment {
  return {
    trainingCards: [],
    certificationCards: [],
    wageFallback: null,
    entryRoles: [],
    sourcePath: {
      training: 'none',
      wage: 'none',
      entryRoles: 'none',
      certifications: 'none'
    },
    cache: {
      hit: false,
      expiresAt: null
    }
  }
}

function collectPlaceholderSignals(report: Record<string, unknown>) {
  const matched = new Set<string>()
  const patterns = [
    /confirm with provider/gi,
    /local approved provider/gi,
    /estimate pending data/gi,
    /needs data/gi,
    /source:\s*target requirements \(estimate\)/gi
  ]

  const walk = (node: unknown) => {
    if (typeof node === 'string') {
      const value = node.trim()
      for (const pattern of patterns) {
        if (pattern.test(value)) matched.add(pattern.source)
      }
      return
    }
    if (Array.isArray(node)) {
      for (const item of node) walk(item)
      return
    }
    if (node && typeof node === 'object') {
      for (const value of Object.values(node as Record<string, unknown>)) {
        walk(value)
      }
    }
  }

  walk(report)
  return Array.from(matched)
}

async function fetchCachedPlannerReportByInputHash(args: {
  userId: string
  inputHash: string
}): Promise<{ reportId: string; report: PlannerReportSource } | null> {
  const admin = createAdminClient()

  try {
    const modern = await admin
      .from('career_map_reports')
      .select('id, output_payload, created_at')
      .eq('user_id', args.userId)
      .eq('input_hash', args.inputHash)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!modern.error && modern.data) {
      if (!isCacheFresh(modern.data.created_at)) return null
      const report = asPlannerReportSource(modern.data.output_payload)
      if (!report) return null
      return { reportId: modern.data.id, report }
    }
  } catch {
    // Fall through to no-cache path.
  }

  return null
}

async function fetchReportIdByInputHash(args: {
  userId: string
  inputHash: string
}): Promise<string | null> {
  const admin = createAdminClient()
  try {
    const row = await admin
      .from('career_map_reports')
      .select('id, created_at')
      .eq('user_id', args.userId)
      .eq('input_hash', args.inputHash)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (row.error || !row.data?.id) return null
    return row.data.id
  } catch {
    return null
  }
}

async function readGenerationCache(cacheKey: string) {
  const admin = createAdminClient()
  try {
    const cached = await admin
      .from('planner_generation_cache')
      .select('response_payload, expires_at')
      .eq('cache_key', cacheKey)
      .maybeSingle()
    if (cached.error || !cached.data?.response_payload || !cached.data?.expires_at) return null

    const expiresAt = new Date(cached.data.expires_at)
    if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) return null

    return asPlannerGenerationCachePayload(cached.data.response_payload)
  } catch {
    return null
  }
}

async function writeGenerationCache(args: {
  cacheKey: string
  inputHash: string
  mode: PlannerGenerationCacheMode
  input: ReturnType<typeof normalizeInput>
  responsePayload: PlannerGenerationCachePayload
}) {
  const admin = createAdminClient()
  try {
    await admin.from('planner_generation_cache').upsert(
      {
        cache_key: args.cacheKey,
        input_hash: args.inputHash,
        cache_version: GENERATION_CACHE_SCHEMA_VERSION,
        cache_mode: args.mode,
        normalized_input: args.input,
        response_payload: args.responsePayload,
        expires_at: generationCacheExpiresAt(),
        updated_at: new Date().toISOString()
      },
      { onConflict: 'cache_key' }
    )
  } catch {
    // keep runtime behavior safe if cache table is unavailable
  }
}

async function persistReport(userId: string, payload: {
  input: ReturnType<typeof normalizeInput>
  inputHash?: string
  score: number
  scoringSnapshot: unknown
  report: unknown
}): Promise<string | null> {
  const admin = createAdminClient()
  const reportRecord =
    payload.report && typeof payload.report === 'object'
      ? (payload.report as Record<string, unknown>)
      : null
  const careerMapInsert = {
    user_id: userId,
    current_role: payload.input.currentRole || 'Career transition',
    target_role: payload.input.targetRole || null,
    input_hash: payload.inputHash ?? null,
    input_payload: payload.input,
    normalized_input: payload.input,
    output_payload: payload.report,
    score: payload.score
  }

  try {
    await admin.from('reports').insert({
      user_id: userId,
      input_snapshot: payload.input,
      scoring_snapshot: payload.scoringSnapshot,
      generated_report: payload.report
    })
  } catch {
    // ignore if table is unavailable in older schema
  }

  try {
    const { data, error } = await admin.from('career_map_reports').insert({
      ...careerMapInsert,
      transition_structured_plan:
        reportRecord?.transitionStructuredPlan &&
        typeof reportRecord.transitionStructuredPlan === 'object'
          ? reportRecord.transitionStructuredPlan
          : null,
      transition_plan_scripts:
        reportRecord?.transitionPlanScripts &&
        typeof reportRecord.transitionPlanScripts === 'object'
          ? reportRecord.transitionPlanScripts
          : null,
      transition_plan_cache_meta:
        reportRecord?.transitionPlanCacheMeta &&
        typeof reportRecord.transitionPlanCacheMeta === 'object'
          ? reportRecord.transitionPlanCacheMeta
          : null
    }).select('id').single()

    if (!error) {
      return typeof data?.id === 'string' ? data.id : null
    }

    if (error) {
      const legacy = await admin.from('career_map_reports').insert(careerMapInsert)
      if (legacy.error) throw legacy.error
    }
  } catch {
    // ignore if table is unavailable in older schema
  }
  return null
}

export async function POST(request: Request) {
  let userIdForFailure: string | null = null
  let inputHashForFailure: string | undefined

  try {
    const rateLimit = consumeRateLimit({
      namespace: 'planner-generate',
      identifier: getClientIp(request),
      max: 12,
      windowMs: 60_000
    })

    if (!rateLimit.allowed) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((rateLimit.resetAt - Date.now()) / 1_000)
      )
      return NextResponse.json(
        {
          error: 'RATE_LIMITED',
          message: 'Too many planner requests. Try again in about a minute.'
        },
        {
          status: 429,
          headers: {
            ...toRateLimitHeaders(rateLimit),
            'Retry-After': String(retryAfterSeconds)
          }
        }
      )
    }

    const user = await getAuthenticatedUserFromRequest(request)
    const localUnsignedBypass = isLocalhostDevRequest(request) && !user
    const isGuestPreview = !user && !localUnsignedBypass
    if (user) {
      userIdForFailure = user.id
    }

    const payload = (await request.json()) as Partial<CareerSwitchPlannerInput> & Record<string, unknown>
    const input = normalizeInput(payload)
    inputHashForFailure = hashToolInput(input)
    const validationError = validateInput(input)

    if (validationError && user) {
      await recordToolRun({
        userId: user.id,
        toolName: 'career-switch-planner',
        status: 'failed',
        inputHash: inputHashForFailure
      })
    }
    if (validationError) {
      return NextResponse.json({ error: 'INVALID_INPUT', message: validationError }, { status: 400 })
    }

    const usageBefore = user
      ? await getUsageSummaryForUser(user)
      : localUnsignedBypass
        ? localDevUnlimitedUsageSummary()
        : getAnonymousUsageSummary()
    const generationCacheMode = generationCacheModeForRequest({
      userPlan: user ? usageBefore.plan : null,
      isGuestPreview,
      localUnsignedBypass
    })
    const generationCacheKey =
      inputHashForFailure ? buildGenerationCacheKey(inputHashForFailure, generationCacheMode) : null

    if (user && !usageBefore.canUse) {
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

    if (user && inputHashForFailure) {
      const cached = await fetchCachedPlannerReportByInputHash({
        userId: user.id,
        inputHash: inputHashForFailure
      })

      if (cached) {
        const usageResult = await consumeUsageForSuccessfulRun({
          user,
          toolName: 'career-switch-planner',
          inputHash: inputHashForFailure
        })
        const { summary, locked } = usageResult
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

        const planLimitedReport =
          summary.plan === 'free'
            ? applyFreeTierOutputLimits(cached.report as CareerPlannerAnalysis['report'])
            : (cached.report as CareerPlannerAnalysis['report'])
        const finalCachedReport = sanitizePlannerReportNode(planLimitedReport)
        const placeholderSignals = collectPlaceholderSignals(
          finalCachedReport as unknown as Record<string, unknown>
        )

        const reportForResponse = {
          ...finalCachedReport,
          v3Diagnostics: {
            ...((finalCachedReport as unknown as Record<string, unknown>).v3Diagnostics &&
            typeof (finalCachedReport as unknown as Record<string, unknown>).v3Diagnostics === 'object'
              ? ((finalCachedReport as unknown as Record<string, unknown>).v3Diagnostics as Record<
                  string,
                  unknown
                >)
              : {}),
            cacheHit: true,
            cacheType: 'full_report_input_hash',
            generatedAt: new Date().toISOString(),
            placeholderSignals
          }
        }

        const baseLegacy = buildLegacyFromReport(reportForResponse as CareerPlannerAnalysis['report'])
        const legacy = summary.plan === 'free'
          ? {
              ...baseLegacy,
              roadmap: {
                '30': baseLegacy.roadmap['30'],
                '60': [],
                '90': []
              },
              resumeReframes: []
            }
          : baseLegacy

        return NextResponse.json({
          ...legacy,
          report: reportForResponse,
          reportId: cached.reportId,
          scoring: {
            total_score:
              typeof reportForResponse.compatibilitySnapshot?.score === 'number'
                ? reportForResponse.compatibilitySnapshot.score
                : null,
            breakdown:
              reportForResponse.compatibilitySnapshot?.breakdown && typeof reportForResponse.compatibilitySnapshot.breakdown === 'object'
                ? reportForResponse.compatibilitySnapshot.breakdown
                : null,
            top_occupation_id:
              Array.isArray(reportForResponse.suggestedCareers) && reportForResponse.suggestedCareers[0]
                ? (reportForResponse.suggestedCareers[0] as Record<string, unknown>).occupationId ?? null
                : null
          },
          usage: summary,
          previewLimited: false,
          cacheHit: true
        })
      }
    }

    if (generationCacheKey) {
      const sharedCached = await readGenerationCache(generationCacheKey)
      if (sharedCached) {
        const usageResult = user
          ? await consumeUsageForSuccessfulRun({
              user,
              toolName: 'career-switch-planner',
              inputHash: inputHashForFailure
            })
          : { summary: usageBefore, locked: false as const }
        const { summary, locked } = usageResult
        if (user && locked) {
          return NextResponse.json(
            {
              error: 'LOCKED',
              message: 'You have reached the free usage limit. Upgrade for unlimited access.',
              usage: summary
            },
            { status: 402 }
          )
        }

        const reportWithDiagnostics = sanitizePlannerReportNode({
          ...sharedCached.report,
          v3Diagnostics: {
            ...((sharedCached.report.v3Diagnostics &&
            typeof sharedCached.report.v3Diagnostics === 'object'
              ? (sharedCached.report.v3Diagnostics as Record<string, unknown>)
              : {}) as Record<string, unknown>),
            cacheHit: true,
            cacheType: 'shared_generation_cache',
            generatedAt: new Date().toISOString()
          }
        })

        let reportId: string | null = null
        if (user && inputHashForFailure) {
          reportId = await fetchReportIdByInputHash({
            userId: user.id,
            inputHash: inputHashForFailure
          })
          if (!reportId) {
            reportId = await persistReport(user.id, {
              input,
              inputHash: inputHashForFailure,
              score:
                typeof (reportWithDiagnostics as Record<string, unknown>).compatibilitySnapshot === 'object' &&
                typeof ((reportWithDiagnostics as Record<string, unknown>).compatibilitySnapshot as Record<string, unknown>).score === 'number'
                  ? Number(((reportWithDiagnostics as Record<string, unknown>).compatibilitySnapshot as Record<string, unknown>).score)
                  : 0,
              scoringSnapshot:
                sharedCached.scoring ?? {
                  total_score:
                    typeof (reportWithDiagnostics as Record<string, unknown>).compatibilitySnapshot === 'object' &&
                    typeof ((reportWithDiagnostics as Record<string, unknown>).compatibilitySnapshot as Record<string, unknown>).score === 'number'
                      ? Number(((reportWithDiagnostics as Record<string, unknown>).compatibilitySnapshot as Record<string, unknown>).score)
                      : 0,
                  breakdown: {},
                  top_occupation_id: null
                },
              report: reportWithDiagnostics
            })
          }
        }

        return NextResponse.json({
          ...sharedCached.legacy,
          report: reportWithDiagnostics,
          reportId,
          scoring: sharedCached.scoring,
          usage: summary,
          previewLimited: sharedCached.previewLimited,
          cacheHit: true
        })
      }
    }

    const roleRegion = regionFromWorkRegion(input.workRegion)
    const currentRoleInput = input.currentRoleText || input.currentRole
    const targetRoleInput = input.targetRoleText || input.targetRole
    const currentRoleResolution = await resolveOccupation(
      currentRoleInput,
      input.location,
      {
        region: roleRegion,
        preferredOccupationId: input.currentRoleOccupationId,
        skills: input.skills,
        experienceText: input.experienceText
      }
    )
    const normalizedCurrentRoleResolution = promoteCanonicalAlternative(
      promoteExactLikeAlternative(currentRoleResolution, currentRoleInput),
      currentRoleInput
    )
    const targetRoleResolution =
      input.recommendMode || !targetRoleInput
        ? null
        : await resolveOccupation(
            targetRoleInput,
            input.location,
            {
              region: roleRegion,
              preferredOccupationId: input.targetRoleOccupationId,
              skills: input.skills,
              experienceText: input.experienceText
            }
          )
    const normalizedTargetRoleResolution =
      targetRoleResolution
        ? promoteCanonicalAlternative(
            promoteExactLikeAlternative(targetRoleResolution, targetRoleInput),
            targetRoleInput
          )
        : null

    if (
      !input.recommendMode &&
      targetRoleInput &&
      !input.targetRoleOccupationId &&
      normalizedTargetRoleResolution &&
      shouldReturnUnmappedRole(normalizedTargetRoleResolution, targetRoleInput)
    ) {
      return NextResponse.json(
        buildUnmappedRolePayload('target', targetRoleInput, normalizedTargetRoleResolution),
        { status: 422 }
      )
    }

    if (
      !input.recommendMode &&
      targetRoleInput &&
      !input.targetRoleOccupationId &&
      normalizedTargetRoleResolution &&
      (!normalizedTargetRoleResolution.resolved || normalizedTargetRoleResolution.confidence < OCCUPATION_RESOLUTION_THRESHOLD) &&
      normalizedTargetRoleResolution.alternatives.length > 0 &&
      !canDeterministicallySelectRole(normalizedTargetRoleResolution, targetRoleInput)
    ) {
      return NextResponse.json(
        buildRoleSelectionPayload('target', targetRoleInput, normalizedTargetRoleResolution),
        { status: 409 }
      )
    }

    const withinCareerProgression = isWithinCareerProgression(
      normalizedCurrentRoleResolution,
      normalizedTargetRoleResolution
    )
    const resolvedCurrentRoleTitle = withinCareerProgression
      ? currentRoleInput || normalizedCurrentRoleResolution.title || input.currentRole || input.currentRoleText
      : normalizedCurrentRoleResolution.title || input.currentRole || input.currentRoleText
    const resolvedTargetRoleTitle =
      input.recommendMode
        ? ''
        : withinCareerProgression
          ? targetRoleInput || normalizedTargetRoleResolution?.title || input.targetRole || input.targetRoleText
          : normalizedTargetRoleResolution?.title || input.targetRole || input.targetRoleText

    const analysis = await generateCareerMapPlannerAnalysis({
      userId: user?.id ?? 'anonymous-preview',
      currentRole: resolvedCurrentRoleTitle || 'Career transition',
      targetRole: resolvedTargetRoleTitle,
      currentOccupationId: normalizedCurrentRoleResolution.occupationId,
      targetOccupationId: normalizedTargetRoleResolution?.occupationId ?? null,
      notSureMode: input.notSureMode,
      skills: input.skills,
      experienceText: input.experienceText,
      location: input.location,
      timeline: input.timeline,
      education: input.education,
      incomeTarget: input.incomeTarget,
      userPostingText: input.userPostingText,
      useMarketEvidence: input.useMarketEvidence
    })

    const usageResult = user
      ? await consumeUsageForSuccessfulRun({
          user,
          toolName: 'career-switch-planner',
          inputHash: inputHashForFailure
        })
      : { summary: getAnonymousUsageSummary(), locked: false as const }
    const { summary, locked } = usageResult

    if (user && locked) {
      return NextResponse.json(
        {
          error: 'LOCKED',
          message: 'You have reached the free usage limit. Upgrade for unlimited access.',
          usage: summary
        },
        { status: 402 }
      )
    }

    const planLimitedReport = summary.plan === 'free'
      ? applyFreeTierOutputLimits(analysis.report)
      : analysis.report
    const stageFailures: StageFailure[] = []
    const plannerTargetRole =
      resolvedTargetRoleTitle ||
      input.targetRole ||
      input.targetRoleText ||
      planLimitedReport.suggestedCareers[0]?.title ||
      'Career transition'
    const transitionPriors = await runStageWithFallback({
      stage: 'transition_priors',
      execute: () =>
        getTransitionPriorContext({
          currentRole:
            resolvedCurrentRoleTitle || input.currentRole || input.currentRoleText || 'Career transition',
          targetRole: plannerTargetRole,
          location: input.location || locationFromWorkRegion(input.workRegion) || 'Canada'
        }),
      fallback: () => null,
      failures: stageFailures
    })
    const priorAdjustedReport = applyTransitionPriorsToReport(
      planLimitedReport as unknown as Record<string, unknown>,
      transitionPriors
    ) as CareerPlannerAnalysis['report']
    const finalReport = isGuestPreview
      ? applyGuestPreviewOutputLimits(priorAdjustedReport)
      : priorAdjustedReport
    const transitionMode = generateTransitionPlan({
      currentRole: resolvedCurrentRoleTitle || input.currentRole || input.currentRoleText,
      targetRole: resolvedTargetRoleTitle || input.targetRole || input.targetRoleText,
      experienceText: input.experienceText,
      location: input.location,
      education: input.education || input.educationLevel,
      incomeTarget: input.incomeTarget,
      report: finalReport,
      currentResolution: normalizedCurrentRoleResolution.occupationId
        ? {
            title: normalizedCurrentRoleResolution.title,
            code: normalizedCurrentRoleResolution.code,
            source: normalizedCurrentRoleResolution.source,
            confidence: normalizedCurrentRoleResolution.confidence,
            stage: normalizedCurrentRoleResolution.stage ?? null,
            specialization: normalizedCurrentRoleResolution.specialization ?? null,
            rawInputTitle: normalizedCurrentRoleResolution.rawInputTitle,
            region: normalizedCurrentRoleResolution.region ?? null
          }
        : null,
      targetResolution: normalizedTargetRoleResolution?.occupationId
        ? {
            title: normalizedTargetRoleResolution.title,
            code: normalizedTargetRoleResolution.code,
            source: normalizedTargetRoleResolution.source,
            confidence: normalizedTargetRoleResolution.confidence,
            stage: normalizedTargetRoleResolution.stage ?? null,
            specialization: normalizedTargetRoleResolution.specialization ?? null,
            rawInputTitle: normalizedTargetRoleResolution.rawInputTitle,
            region: normalizedTargetRoleResolution.region ?? null
          }
        : null
    })
    const enhancementTargetRole =
      input.targetRole ||
      input.targetRoleText ||
      resolvedTargetRoleTitle ||
      finalReport.suggestedCareers[0]?.title ||
      transitionMode.routes.primary.title
    const transitionEnhancement = isGuestPreview
      ? {
          plan: null,
          scripts: null,
          cacheMeta: null
        }
      : await runStageWithFallback({
          stage: 'transition_enhancement',
          execute: () =>
            getCachedOrGenerateTransitionEnhancement({
              currentRole:
                input.currentRole || input.currentRoleText || resolvedCurrentRoleTitle || 'Career transition',
              targetRole: enhancementTargetRole,
              region: input.location || locationFromWorkRegion(input.workRegion) || 'Canada',
              location: input.location,
              experienceText: input.experienceText,
              transitionMode,
              report: finalReport
            }),
          fallback: () =>
            buildTransitionEnhancementFallback({
              currentRole:
                input.currentRole || input.currentRoleText || resolvedCurrentRoleTitle || 'Career transition',
              targetRole: enhancementTargetRole,
              region: input.location || locationFromWorkRegion(input.workRegion) || 'Canada',
              transitionMode
            }),
          failures: stageFailures
        })
    const sourceEnrichment = await runStageWithFallback({
      stage: 'source_enrichment',
      execute: () =>
        getPlannerSourceEnrichment({
          report: {
            ...finalReport,
            transitionStructuredPlan: transitionEnhancement.plan
          },
          location: input.location || locationFromWorkRegion(input.workRegion) || 'Canada',
          currentRole:
            resolvedCurrentRoleTitle || input.currentRole || input.currentRoleText || 'Career transition',
          targetRole: enhancementTargetRole,
          canonicalRoleKey:
            resolveCanonicalRoleIntent(
              targetRoleInput || enhancementTargetRole || resolvedTargetRoleTitle || ''
            )?.key ?? null,
          careerPathType: transitionMode.careerPathType
        }),
      fallback: () => emptySourceEnrichment(),
      failures: stageFailures
    })
    console.info('[career-switch-planner] source_enrichment', {
      targetRole: enhancementTargetRole,
      location: input.location || locationFromWorkRegion(input.workRegion) || 'Canada',
      careerPathType: transitionMode.careerPathType,
      profileSlug: finalReport.careerPathwayProfile?.meta.slug ?? null,
      trainingSourcePath: sourceEnrichment.sourcePath.training,
      wageSourcePath: sourceEnrichment.sourcePath.wage,
      entryRoleSourcePath: sourceEnrichment.sourcePath.entryRoles,
      certificationSourcePath: sourceEnrichment.sourcePath.certifications,
      cacheHit: sourceEnrichment.cache.hit,
      cacheExpiresAt: sourceEnrichment.cache.expiresAt
    })
    const wageFallback = sourceEnrichment.wageFallback
    const enrichedSuggestedCareers =
      wageFallback && Array.isArray(finalReport.suggestedCareers) && finalReport.suggestedCareers.length > 0
        ? finalReport.suggestedCareers.map((career, index) =>
            index === 0 && !(career.salary?.native?.low || career.salary?.native?.median || career.salary?.native?.high)
              ? {
                  ...career,
                  salary: {
                    ...career.salary,
                    native: {
                      currency: wageFallback.currency,
                      low: wageFallback.low,
                      median: wageFallback.median,
                      high: wageFallback.high,
                      sourceName: wageFallback.sourceName,
                      sourceUrl: wageFallback.sourceUrl ?? null,
                      asOfDate: wageFallback.asOfDate,
                      region: wageFallback.region ?? undefined
                    }
                  }
                }
              : career
          )
        : finalReport.suggestedCareers
    const existingTargetRequirements =
      finalReport.targetRequirements && typeof finalReport.targetRequirements === 'object'
        ? finalReport.targetRequirements
        : null
    const existingCertifications = uniqueNormalizedStrings(
      asStringArray(existingTargetRequirements?.certifications).filter(isConcreteCertificationRequirement)
    )
    const enrichedCertificationNames = uniqueNormalizedStrings(
      (Array.isArray(sourceEnrichment.certificationCards) ? sourceEnrichment.certificationCards : [])
        .map((item) => asString(item?.name))
        .filter(Boolean)
    )
    const mergedCertifications = uniqueNormalizedStrings([
      ...existingCertifications,
      ...enrichedCertificationNames
    ])

    const enrichedRequirementSources = uniqueNormalizedStrings([
      ...asStringArray(existingTargetRequirements?.sources),
      ...((Array.isArray(sourceEnrichment.certificationCards) ? sourceEnrichment.certificationCards : [])
        .map((item) => asString(item?.sourceLabel))
        .filter(Boolean))
    ])

    const enrichedReport = {
      ...finalReport,
      suggestedCareers: enrichedSuggestedCareers,
      targetRequirements: {
        ...(existingTargetRequirements ?? {}),
        certifications: mergedCertifications,
        sources: enrichedRequirementSources
      },
      sourceEnrichment
    }
    const v3MissingFields = collectV3MissingFields({
      ...enrichedReport,
      transitionMode
    } as Record<string, unknown>)
    if (v3MissingFields.length > 0) {
      console.warn('[career-switch-planner] missing_v3_fields', {
        missing_v3_fields: v3MissingFields
      })
    }
    const placeholderSignals = collectPlaceholderSignals(
      enrichedReport as unknown as Record<string, unknown>
    )
    if (placeholderSignals.length > 0) {
      console.warn('[career-switch-planner] placeholder_like_signals', {
        placeholder_signals: placeholderSignals
      })
    }
    const sanitizedTransitionScripts = sanitizeTransitionScriptsForCareerPath(
      transitionEnhancement.scripts,
      transitionMode.careerPathType
    )
    const reportWithResolutionRaw = {
      ...enrichedReport,
      transitionMode,
      transitionStructuredPlan: transitionEnhancement.plan,
      transitionPlanScripts: sanitizedTransitionScripts,
      transitionPlanCacheMeta: transitionEnhancement.cacheMeta,
      previewLimited: isGuestPreview,
      v3Diagnostics: {
        missingFields: v3MissingFields,
        placeholderSignals,
        stageFailures,
        role_match_explanation: {
          current: normalizedCurrentRoleResolution.matchExplanation ?? null,
          target: normalizedTargetRoleResolution?.matchExplanation ?? null
        },
        generatedAt: new Date().toISOString()
      },
      roleResolution: {
        current: buildRoleResolutionPayload(currentRoleInput, normalizedCurrentRoleResolution),
        target: input.recommendMode
          ? null
          : buildRoleResolutionPayload(targetRoleInput, normalizedTargetRoleResolution!)
      }
    }
    const reportWithResolution = sanitizePlannerReportNode(reportWithResolutionRaw)
    const finalLegacy = summary.plan === 'free'
      ? {
          ...analysis.legacy,
          roadmap: {
            '30': analysis.legacy.roadmap['30'].slice(0, 1),
            '60': [],
            '90': []
          },
          resumeReframes: []
        }
      : analysis.legacy
    const responsePayloadForCache: PlannerGenerationCachePayload = {
      legacy: finalLegacy as unknown as Record<string, unknown>,
      report: reportWithResolution as unknown as Record<string, unknown>,
      scoring: analysis.scoringSnapshot as unknown as Record<string, unknown>,
      previewLimited: isGuestPreview
    }

    let savedReportId: string | null = null
    if (user) {
      savedReportId = await persistReport(user.id, {
        input,
        inputHash: inputHashForFailure,
        score: reportWithResolution.compatibilitySnapshot.score,
        scoringSnapshot: analysis.scoringSnapshot,
        report: reportWithResolution
      })
      if (savedReportId) {
        await persistPlannerGenerationSnapshot({
          reportId: savedReportId,
          userId: user.id,
          input,
          report: reportWithResolution as unknown as Record<string, unknown>,
          sourceEnrichment
        }).catch((snapshotError) => {
          console.warn('[career-switch-planner] generation_snapshot_failed', {
            reportId: savedReportId,
            message: snapshotError instanceof Error ? snapshotError.message : String(snapshotError)
          })
        })
      }
    }
    if (generationCacheKey && inputHashForFailure) {
      await writeGenerationCache({
        cacheKey: generationCacheKey,
        inputHash: inputHashForFailure,
        mode: generationCacheMode,
        input,
        responsePayload: responsePayloadForCache
      })
    }

    return NextResponse.json({
      ...finalLegacy,
      report: reportWithResolution,
      reportId: savedReportId,
      scoring: analysis.scoringSnapshot,
      usage: summary,
      previewLimited: isGuestPreview
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
    const localDebug =
      isLocalhostDevRequest(request) && process.env.NODE_ENV !== 'production'
        ? {
            detail: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack ?? null : null
          }
        : null
    const message =
      error instanceof Error &&
      /Missing NEXT_PUBLIC_SUPABASE_URL and\/or SUPABASE_SECRET_KEY/.test(error.message)
        ? 'Career planner backend is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) in your environment.'
        : 'Unable to generate a plan right now.'
    return NextResponse.json(
      {
        error: 'GENERATION_FAILED',
        message,
        ...(localDebug ? { debug: localDebug } : {})
      },
      { status: 500 }
    )
  }
}
