import { normalizeBulletKey } from '@/lib/transition/dedupe'
import type { AggregatedRequirement } from '@/lib/requirements/types'
import type { NormalizedProfileSignals } from '@/lib/planner/profileSignals'
import type { JobFit, JobFitFactor, JobFitTier } from '@/lib/planner/jobRecommendations'

const STRONG_THRESHOLD = 0.7
const STRETCH_THRESHOLD = 0.4
const MAX_FACTORS = 3

// Filler tokens common to task-phrased requirement labels and generic experience
// lines. Excluded from matching so a real skill/cert token must do the work,
// not words like "before applying" or "role workflows".
const GENERIC_TOKENS = new Set([
  'role', 'roles', 'work', 'works', 'working', 'workflow', 'workflows', 'relevant',
  'required', 'before', 'applying', 'apply', 'obtain', 'complete', 'maintain',
  'demonstrate', 'experience', 'ability', 'status', 'active', 'valid', 'current',
  'across', 'deliver', 'support', 'using', 'within', 'entry', 'level', 'team', 'teams'
])

function distinctiveTokens(value: string): string[] {
  return normalizeBulletKey(value)
    .split(' ')
    .filter((token) => token.length >= 3 && !GENERIC_TOKENS.has(token))
}

function userTokens(signals: NormalizedProfileSignals): Set<string> {
  const tokens = new Set<string>()
  const collect = (value: string) => {
    for (const token of distinctiveTokens(value)) tokens.add(token)
  }
  signals.skills.forEach(collect)
  signals.certifications.forEach(collect)
  signals.experienceSignals.forEach(collect)
  return tokens
}

function requirementIsMet(requirement: AggregatedRequirement, tokens: Set<string>): boolean {
  // A requirement is met when any distinctive user skill/cert token appears in
  // it, so verbose labels like "Obtain WHMIS certification before applying" are
  // satisfied by the user's "WHMIS".
  for (const token of distinctiveTokens(requirement.label)) {
    if (tokens.has(token)) return true
  }
  return false
}

export function scoreRequirementFit(
  requirements: AggregatedRequirement[],
  signals: NormalizedProfileSignals
): JobFit {
  const tokens = userTokens(signals)
  const matched: JobFitFactor[] = []
  const missing: JobFitFactor[] = []
  let weightedMet = 0
  let weightedTotal = 0
  let hasMissingGate = false

  for (const requirement of requirements) {
    const weight = Math.max(1, requirement.frequency_count || requirement.frequency || 1)
    weightedTotal += weight
    if (requirementIsMet(requirement, tokens)) {
      weightedMet += weight
      matched.push({ label: requirement.label, frequency: weight })
    } else {
      if (requirement.type === 'gate') hasMissingGate = true
      missing.push({ label: requirement.label, frequency: weight })
    }
  }

  matched.sort((a, b) => b.frequency - a.frequency)
  missing.sort((a, b) => b.frequency - a.frequency)

  const ratio = weightedTotal === 0 ? 0 : weightedMet / weightedTotal
  let tier: JobFitTier = 'reach'
  if (ratio >= STRONG_THRESHOLD && !hasMissingGate) tier = 'strong'
  else if (ratio >= STRETCH_THRESHOLD) tier = 'stretch'

  return {
    tier,
    metCount: matched.length,
    totalCount: requirements.length,
    matched: matched.slice(0, MAX_FACTORS),
    missing: missing.slice(0, MAX_FACTORS)
  }
}
