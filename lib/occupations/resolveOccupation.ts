import { createAdminClient } from '@/lib/supabase/admin'

export const OCCUPATION_RESOLUTION_THRESHOLD = 0.72

type RegionCode = 'CA' | 'US'
type ResolverSource = 'O*NET' | 'NOC' | 'internal'

type OccupationRow = {
  id: string
  title: string
  region: RegionCode
  codes: Record<string, unknown> | null
  source: string | null
  last_updated: string | null
}

type OccupationIndexRow = OccupationRow & {
  aliases: string[]
}

type CachedIndex = {
  createdAt: number
  rows: OccupationIndexRow[]
}

type StageRule = {
  stage: string
  pattern: RegExp
}

export interface ResolvedOccupationAlternative {
  occupationId: string
  title: string
  code: string
  confidence: number
  source: ResolverSource
  region: RegionCode
}

export interface ResolvedOccupation {
  resolved: boolean
  occupationId: string | null
  title: string
  code: string
  source: ResolverSource
  confidence: number
  alternatives: ResolvedOccupationAlternative[]
  specialization?: string | null
  stage?: string | null
  rawInputTitle: string
  region?: RegionCode | null
  lastUpdated?: string | null
}

export type OccupationResolutionSeed = {
  id: string
  title: string
  region: RegionCode
  codes?: Record<string, unknown> | null
  source?: string | null
  last_updated?: string | null
}

export type ResolveOccupationContext = {
  region?: RegionCode
  preferredOccupationId?: string | null
  providedIndex?: OccupationResolutionSeed[]
}

const INDEX_TTL_MS = 5 * 60 * 1000
const indexCache = new Map<string, CachedIndex>()
const STAGE_RULES: StageRule[] = [
  { stage: 'pre_apprentice', pattern: /\bpre[\s-]?apprentice\b/ },
  { stage: 'helper', pattern: /\bhelper\b|\btrainee\b/ },
  { stage: 'apprentice', pattern: /\bapprentice\b|\bapprenticeship\b/ },
  { stage: 'intern', pattern: /\bintern\b|\bco[- ]?op\b/ },
  { stage: 'junior', pattern: /\bjunior\b|\bjr\b/ },
  { stage: 'associate', pattern: /\bassociate\b/ },
  { stage: 'senior', pattern: /\bsenior\b|\bsr\b/ },
  { stage: 'lead', pattern: /\blead\b|\bprincipal\b/ },
  { stage: 'manager', pattern: /\bmanager\b|\bsupervisor\b/ },
  { stage: 'director', pattern: /\bdirector\b|\bhead of\b/ },
  { stage: 'licensed', pattern: /\blicensed\b|\bjourneyman\b|\bjourneyperson\b/ }
]
const STAGE_WORDS = new Set(
  STAGE_RULES.flatMap((rule) => rule.stage.split(/[_\s-]+/)).concat([
    'apprenticeship',
    'journey',
    'person'
  ])
)
const STOP_WORDS = new Set([
  'and',
  'of',
  'the',
  'for',
  'to',
  'with',
  'in',
  'level',
  'specialist'
])
const RESOLVER_FAMILY_KEYWORDS: Record<string, string[]> = {
  regulated_trade: [
    'electrician',
    'hvac',
    'technician',
    'plumber',
    'carpenter',
    'welder',
    'mechanic',
    'installer',
    'pipefitter',
    'sheet',
    'millwright'
  ],
  regulated_profession: [
    'nurse',
    'teacher',
    'therapist',
    'pharmacist',
    'social',
    'counselor',
    'physician',
    'dentist'
  ],
  portfolio_role: ['designer', 'developer', 'engineer', 'writer', 'creative', 'artist'],
  credentialed_role: ['analyst', 'scientist', 'security', 'accountant', 'administrator'],
  experience_ladder_role: ['coordinator', 'manager', 'lead', 'director', 'assistant', 'operations', 'hr']
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function normalizeRoleText(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/&/g, ' and ')
    .replace(/[\u2018\u2019']/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
}

function tokenizeRoleText(value: string) {
  return normalizeRoleText(value)
    .split(/\s+/)
    .map((token) => {
      if (token.length > 4 && token.endsWith('ies')) return `${token.slice(0, -3)}y`
      if (token.length > 3 && token.endsWith('s')) return token.slice(0, -1)
      return token
    })
    .filter(Boolean)
}

function compactRoleText(value: string) {
  return normalizeRoleText(value).replace(/\s+/g, '')
}

function asAliases(value: Record<string, unknown> | null) {
  const aliases = value?.aliases
  if (!Array.isArray(aliases)) return []
  return aliases
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)
}

function toIndexRows(rows: OccupationResolutionSeed[]) {
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    region: row.region,
    codes: row.codes ?? null,
    source: row.source ?? null,
    last_updated: row.last_updated ?? null,
    aliases: asAliases(row.codes ?? null)
  }))
}

function inferRegionFromLocation(location?: string) {
  const normalized = normalizeRoleText(location ?? '')
  if (
    /\bcanada\b|\bontario\b|\btoronto\b|\bottawa\b|\bont\b|\bqc\b|\bquebec\b|\bcalgary\b|\bmontreal\b/.test(
      normalized
    )
  ) {
    return 'CA' as const
  }
  if (normalized) {
    return 'US' as const
  }
  return undefined
}

function normalizeSource(row: OccupationRow): ResolverSource {
  const source = String(row.source ?? '').toLowerCase()
  if (source.includes('onet') || row.region === 'US') return 'O*NET'
  if (source.includes('noc') || row.region === 'CA') return 'NOC'
  return 'internal'
}

function extractOccupationCode(row: OccupationRow) {
  const codes: Record<string, unknown> = row.codes ?? {}
  const candidates = [
    codes['soc'],
    codes['soc_code'],
    codes['onet_code'],
    codes['onet_soc'],
    codes['noc'],
    codes['noc_code'],
    codes['code']
  ]
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim()
    }
  }
  return row.id
}

function extractStage(inputTitle: string) {
  const normalized = normalizeRoleText(inputTitle)
  const match = STAGE_RULES.find((rule) => rule.pattern.test(normalized))
  if (!match) return null
  if (match.stage === 'pre_apprentice') return 'helper'
  return match.stage
}

function stripStageModifiers(inputTitle: string) {
  let stripped = normalizeRoleText(inputTitle)
  for (const rule of STAGE_RULES) {
    stripped = stripped.replace(rule.pattern, ' ')
  }
  return stripped.replace(/\s+/g, ' ').trim()
}

function extractSpecialization(inputTitle: string, canonicalTitle: string) {
  const rawTokens = tokenizeRoleText(inputTitle)
  const canonicalTokens = new Set(tokenizeRoleText(canonicalTitle))
  const remaining = rawTokens.filter(
    (token) => !canonicalTokens.has(token) && !STAGE_WORDS.has(token) && !STOP_WORDS.has(token)
  )
  if (remaining.length === 0) return null
  return remaining.slice(0, 2).join(' ')
}

function diceCoefficient(left: string, right: string) {
  if (!left || !right) return 0
  if (left === right) return 1
  if (left.length < 2 || right.length < 2) return 0

  const leftBigrams = new Map<string, number>()
  for (let index = 0; index < left.length - 1; index += 1) {
    const gram = left.slice(index, index + 2)
    leftBigrams.set(gram, (leftBigrams.get(gram) ?? 0) + 1)
  }

  let overlap = 0
  for (let index = 0; index < right.length - 1; index += 1) {
    const gram = right.slice(index, index + 2)
    const count = leftBigrams.get(gram) ?? 0
    if (count > 0) {
      overlap += 1
      leftBigrams.set(gram, count - 1)
    }
  }

  return (2 * overlap) / (left.length + right.length - 2)
}

function tokenOverlapRatio(left: string[], right: string[]) {
  if (left.length === 0 || right.length === 0) return 0
  const rightSet = new Set(right)
  let shared = 0
  for (const token of left) {
    if (rightSet.has(token)) shared += 1
  }
  return shared / left.length
}

function containsStageInTitle(title: string) {
  const normalized = normalizeRoleText(title)
  return STAGE_RULES.some((rule) => rule.pattern.test(normalized))
}

function scoreOccupationCandidate(queryTitle: string, row: OccupationIndexRow, stage: string | null) {
  const normalizedQuery = normalizeRoleText(queryTitle)
  const queryTokens = tokenizeRoleText(queryTitle)
  const titleNorm = normalizeRoleText(row.title)
  const titleTokens = tokenizeRoleText(row.title)
  const titleCompact = compactRoleText(row.title)
  const queryCompact = compactRoleText(queryTitle)
  const aliasNorm = row.aliases.map((alias) => normalizeRoleText(alias))

  if (!normalizedQuery) return 0

  let score = 0
  if (titleNorm === normalizedQuery) score = 1
  if (aliasNorm.some((alias) => alias === normalizedQuery)) score = Math.max(score, 0.98)

  if (titleNorm.includes(normalizedQuery) || normalizedQuery.includes(titleNorm)) {
    score = Math.max(score, 0.82 + tokenOverlapRatio(queryTokens, titleTokens) * 0.1)
  }
  if (
    aliasNorm.some(
      (alias) => alias.includes(normalizedQuery) || normalizedQuery.includes(alias)
    )
  ) {
    score = Math.max(score, 0.79 + tokenOverlapRatio(queryTokens, titleTokens) * 0.08)
  }

  const overlap = tokenOverlapRatio(queryTokens, titleTokens)
  if (overlap > 0) {
    score = Math.max(score, Math.min(0.45 + overlap * 0.4, 0.84))
  }

  const fuzzy = diceCoefficient(queryCompact, titleCompact)
  if (fuzzy > 0.35) {
    score = Math.max(score, Math.min(0.2 + fuzzy * 0.55, 0.78))
  }

  if (stage && containsStageInTitle(row.title)) {
    score -= 0.08
  }
  if (!stage && containsStageInTitle(row.title)) {
    score -= 0.16
  }

  return Number(clamp(score, 0, 1).toFixed(3))
}

function isLikelyFamilyMatch(queryTitle: string, candidateTitle: string) {
  const queryTokens = tokenizeRoleText(queryTitle)
  const candidateTokens = tokenizeRoleText(candidateTitle)
  const normalizedCandidate = normalizeRoleText(candidateTitle)
  const matchedFamily = Object.values(RESOLVER_FAMILY_KEYWORDS).find((keywords) =>
    keywords.some((keyword) => queryTokens.includes(keyword))
  )
  if (!matchedFamily) return true
  return matchedFamily.some((keyword) => {
    if (candidateTokens.includes(keyword) || normalizedCandidate.includes(keyword)) {
      return true
    }
    if (keyword === 'hr' && /\bhuman resource/.test(normalizedCandidate)) {
      return true
    }
    if (keyword === 'ux' && /\buser experience\b/.test(normalizedCandidate)) {
      return true
    }
    return false
  })
}

function hasMeaningfulStageDifference(left: string | null | undefined, right: string | null | undefined) {
  return normalizeRoleText(left ?? '') !== normalizeRoleText(right ?? '')
}

export function haveMeaningfullyDifferentRoleInputs(left: string, right: string) {
  const normalize = (value: string) =>
    tokenizeRoleText(value).filter((token) => !STOP_WORDS.has(token) && !STAGE_WORDS.has(token))
  const leftTokens = normalize(left)
  const rightTokens = normalize(right)
  if (leftTokens.length === 0 || rightTokens.length === 0) return normalizeRoleText(left) !== normalizeRoleText(right)
  return leftTokens.join(' ') !== rightTokens.join(' ')
}

async function loadOccupationIndex(region?: RegionCode) {
  const cacheKey = region ?? 'ALL'
  const cached = indexCache.get(cacheKey)
  if (cached && Date.now() - cached.createdAt < INDEX_TTL_MS) {
    return cached.rows
  }

  const supabase = createAdminClient()
  let query = supabase
    .from('occupations')
    .select('id,title,region,codes,source,last_updated')
    .order('title', { ascending: true })
    .limit(5000)

  if (region) {
    query = query.eq('region', region)
  }

  const { data, error } = await query
  if (error) throw error

  const rows = ((data ?? []) as OccupationRow[]).map((row) => ({
    ...row,
    aliases: asAliases(row.codes)
  }))

  indexCache.set(cacheKey, {
    createdAt: Date.now(),
    rows
  })

  return rows
}

async function loadOccupationById(occupationId: string) {
  const normalizedId = occupationId.trim()
  if (!normalizedId) return null

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('occupations')
    .select('id,title,region,codes,source,last_updated')
    .eq('id', normalizedId)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  const row = data as OccupationRow
  return {
    ...row,
    aliases: asAliases(row.codes)
  } satisfies OccupationIndexRow
}

function buildAlternatives(
  ranked: Array<{ row: OccupationIndexRow; confidence: number }>,
  chosenId: string | null
) {
  return ranked
    .filter((item) => item.confidence > 0.18)
    .filter((item) => item.row.id !== chosenId)
    .slice(0, 5)
    .map((item) => ({
      occupationId: item.row.id,
      title: item.row.title,
      code: extractOccupationCode(item.row),
      confidence: item.confidence,
      source: normalizeSource(item.row),
      region: item.row.region
    }))
}

function hasMultipleCloseAlternatives(
  chosenConfidence: number,
  alternatives: ResolvedOccupationAlternative[]
) {
  const next = alternatives[0]
  if (!next) return false
  return next.confidence >= chosenConfidence - 0.04 && next.confidence >= OCCUPATION_RESOLUTION_THRESHOLD - 0.05
}

function chooseCanonicalRow(
  ranked: Array<{ row: OccupationIndexRow; confidence: number }>,
  stage: string | null,
  baseQuery: string
) {
  if (!stage) return ranked[0] ?? null

  const canonical = ranked.find(
    (item) =>
      !containsStageInTitle(item.row.title) &&
      tokenOverlapRatio(tokenizeRoleText(baseQuery), tokenizeRoleText(item.row.title)) >= 0.5
  )

  return canonical ?? ranked[0] ?? null
}

export async function resolveOccupation(
  inputTitle: string,
  location?: string,
  context: ResolveOccupationContext = {}
): Promise<ResolvedOccupation> {
  const rawInputTitle = inputTitle.trim()
  const inferredRegion = context.region ?? inferRegionFromLocation(location)
  const stage = extractStage(rawInputTitle)
  const baseQuery = stripStageModifiers(rawInputTitle) || rawInputTitle
  const providedIndex = context.providedIndex
    ? toIndexRows(
        context.providedIndex.filter((row) => !inferredRegion || row.region === inferredRegion)
      )
    : null

  const explicit = context.preferredOccupationId
    ? providedIndex?.find((row) => row.id === context.preferredOccupationId) ??
      (await loadOccupationById(context.preferredOccupationId))
    : null
  const index = providedIndex ??
    (explicit ? await loadOccupationIndex(explicit.region) : await loadOccupationIndex(inferredRegion))

  const ranked = index
    .map((row) => ({
      row,
      confidence: scoreOccupationCandidate(baseQuery, row, stage)
    }))
    .filter((item) => item.confidence > 0)
    .filter((item) => isLikelyFamilyMatch(baseQuery, item.row.title))
    .sort((left, right) => {
      if (right.confidence !== left.confidence) return right.confidence - left.confidence
      return left.row.title.localeCompare(right.row.title)
    })

  const chosen = explicit
    ? {
        row: explicit,
        confidence: 1
      }
    : chooseCanonicalRow(ranked, stage, baseQuery)

  if (!chosen) {
    return {
      resolved: false,
      occupationId: null,
      title: rawInputTitle,
      code: '',
      source: 'internal',
      confidence: 0,
      alternatives: [],
      specialization: null,
      stage,
      rawInputTitle,
      region: null,
      lastUpdated: null
    }
  }

  const alternatives = buildAlternatives(ranked, chosen.row.id)
  const resolved =
    chosen.confidence >= OCCUPATION_RESOLUTION_THRESHOLD &&
    !hasMultipleCloseAlternatives(chosen.confidence, alternatives)

  return {
    resolved,
    occupationId: chosen.row.id,
    title: chosen.row.title,
    code: extractOccupationCode(chosen.row),
    source: normalizeSource(chosen.row),
    confidence: Number(chosen.confidence.toFixed(3)),
    alternatives,
    specialization: extractSpecialization(rawInputTitle, chosen.row.title),
    stage,
    rawInputTitle,
    region: chosen.row.region,
    lastUpdated: chosen.row.last_updated
  }
}

export function isWithinCareerProgression(
  current: ResolvedOccupation | null,
  target: ResolvedOccupation | null
) {
  if (!current || !target) return false
  if (!current.code || !target.code) return false
  if (current.code !== target.code) return false
  if (!haveMeaningfullyDifferentRoleInputs(current.rawInputTitle, target.rawInputTitle)) {
    return false
  }
  return (
    hasMeaningfulStageDifference(current.stage, target.stage) ||
    normalizeRoleText(current.rawInputTitle) !== normalizeRoleText(target.rawInputTitle)
  )
}
