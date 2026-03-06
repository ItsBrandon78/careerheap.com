import { createAdminClient } from '@/lib/supabase/admin'

const DEFAULT_LIMIT = 6
const MAX_LIMIT = 20
export const ROLE_MATCH_THRESHOLD = 0.72
const MIN_ROLE_SUGGESTION_CONFIDENCE = 0.18
const ROLE_STOP_TOKENS = new Set(['and', 'or', 'of', 'the', 'except', 'system'])

type OccupationRow = {
  id: string
  title: string
  region: 'CA' | 'US'
  codes: Record<string, unknown> | null
  source: string | null
  last_updated: string | null
}

type OccupationSearchIndexRow = OccupationRow & {
  aliases: string[]
}

type OccupationWageRow = {
  occupation_id: string
  region: string
  wage_low: number | null
  wage_median: number | null
  wage_high: number | null
  currency: 'CAD' | 'USD'
  source: string
  last_updated: string
}

type SkillRow = {
  id: string
  name: string
  aliases: unknown
}

type SkillSearchIndexRow = {
  id: string
  name: string
  aliases: string[]
}

export interface SearchOccupationsOptions {
  query?: string
  region?: 'CA' | 'US'
  wageRegion?: string
  limit?: number
}

export interface SearchSkillsOptions {
  query?: string
  limit?: number
}

export type RoleMatchType =
  | 'title_exact'
  | 'alias_exact'
  | 'title_contains'
  | 'alias_contains'
  | 'token_overlap'
  | 'fuzzy'
  | 'fallback'

export interface OccupationRoleSuggestion {
  occupationId: string
  title: string
  region: 'CA' | 'US'
  codes: Record<string, unknown>
  source: string | null
  lastUpdated: string | null
  confidence: number
  matchedBy: RoleMatchType
}

export interface OccupationRoleMatch extends OccupationRoleSuggestion {
  input: string
}

type ResolverSource = 'O*NET' | 'NOC' | 'internal'

export interface ResolvedOccupationAlternative {
  occupationId: string
  title: string
  code: string
  region: 'CA' | 'US'
  source: ResolverSource
  confidence: number
  matchedBy: RoleMatchType
  lastUpdated: string | null
}

export interface ResolvedOccupation {
  resolved: boolean
  occupationId: string | null
  title: string
  code: string
  region: 'CA' | 'US' | null
  source: ResolverSource
  confidence: number
  matchedBy: RoleMatchType
  alternatives: ResolvedOccupationAlternative[]
  stage?: 'helper' | 'apprentice' | 'licensed' | null
  lastUpdated?: string | null
}

interface OccupationSearchResult {
  query: {
    q: string
    region: 'CA' | 'US' | null
    wageRegion: string | null
    limit: number
  }
  count: number
  bestMatch: OccupationRoleMatch | null
  items: Array<
    OccupationRoleSuggestion & {
      wage: {
        region: string
        low: number | null
        median: number | null
        high: number | null
        currency: 'CAD' | 'USD'
        source: string
        lastUpdated: string
      } | null
    }
  >
}

type CachedIndex = {
  key: string
  createdAt: number
  rows: OccupationSearchIndexRow[]
}

type CachedSkillIndex = {
  createdAt: number
  rows: SkillSearchIndexRow[]
}

const SEARCH_INDEX_TTL_MS = 5 * 60 * 1000
const searchIndexCache = new Map<string, CachedIndex>()
let skillIndexCache: CachedSkillIndex | null = null

function clampLimit(limit?: number) {
  if (!Number.isFinite(limit)) return DEFAULT_LIMIT
  return Math.max(1, Math.min(MAX_LIMIT, Math.trunc(limit as number)))
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
    .replace(/\bapprent\.\b/g, 'apprentice')
    .replace(/\belec\b/g, 'electric')
    .replace(/\belectricians\b/g, 'electrician')
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

function toAliases(codes: Record<string, unknown> | null) {
  const aliases = codes?.aliases
  if (!Array.isArray(aliases)) return []
  return aliases
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)
}

function asStringArray(value: unknown) {
  if (!value) return []
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean)
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return []
    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => (typeof item === 'string' ? item.trim() : ''))
          .filter(Boolean)
      }
    } catch {
      return [trimmed]
    }
  }

  return []
}

function toSkillAliases(aliases: unknown) {
  return asStringArray(aliases)
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

function tokenOverlapRatio(queryTokens: string[], candidateTokens: string[]) {
  if (queryTokens.length === 0 || candidateTokens.length === 0) return 0
  const candidateSet = new Set(candidateTokens)
  let shared = 0
  for (const token of queryTokens) {
    if (candidateSet.has(token)) shared += 1
  }
  return shared / queryTokens.length
}

function countMeaningfulExtraTokens(queryTokens: string[], candidateTokens: string[]) {
  const querySet = new Set(queryTokens)
  return candidateTokens.filter(
    (token) => !ROLE_STOP_TOKENS.has(token) && !querySet.has(token)
  ).length
}

function qualifierMismatchPenalty(queryTokens: string[], candidateTokens: string[]) {
  const querySet = new Set(queryTokens)
  const candidateSet = new Set(candidateTokens)

  let penalty = 0
  if (candidateSet.has('helper') && !querySet.has('helper')) penalty += 0.22
  if (candidateSet.has('apprentice') && !querySet.has('apprentice')) penalty += 0.14
  if (candidateSet.has('installer') && !querySet.has('installer')) penalty += 0.12
  if (candidateSet.has('repairer') && !querySet.has('repairer')) penalty += 0.08
  if (candidateSet.has('line') && !querySet.has('line')) penalty += 0.14
  if (
    candidateSet.has('power') &&
    candidateSet.has('line') &&
    !(querySet.has('power') && querySet.has('line'))
  ) {
    penalty += 0.12
  }

  return penalty
}

function pickBetterMatch<T extends string>(
  current: { confidence: number; matchedBy: T } | null,
  candidate: { confidence: number; matchedBy: T }
) {
  if (!current) return candidate
  if (candidate.confidence > current.confidence) return candidate
  return current
}

function scoreRoleCandidate(query: string, row: OccupationSearchIndexRow) {
  const normalizedQuery = normalizeRoleText(query)
  const compactQuery = compactRoleText(query)
  const queryTokens = tokenizeRoleText(query)
  const titleNorm = normalizeRoleText(row.title)
  const titleCompact = compactRoleText(row.title)
  const titleTokens = tokenizeRoleText(row.title)
  const aliasNorm = row.aliases.map((alias) => normalizeRoleText(alias))

  let best: { confidence: number; matchedBy: RoleMatchType } | null = null

  if (!normalizedQuery) {
    return {
      confidence: 0,
      matchedBy: 'fallback' as const
    }
  }

  if (titleNorm === normalizedQuery) {
    best = pickBetterMatch(best, { confidence: 1, matchedBy: 'title_exact' })
  }

  for (const alias of aliasNorm) {
    if (alias === normalizedQuery) {
      best = pickBetterMatch(best, { confidence: 0.99, matchedBy: 'alias_exact' })
    }
  }

  if (titleNorm.includes(normalizedQuery) || normalizedQuery.includes(titleNorm)) {
    const titleOverlap = tokenOverlapRatio(queryTokens, titleTokens)
    const extraTokens = countMeaningfulExtraTokens(queryTokens, titleTokens)
    const qualifierPenalty = qualifierMismatchPenalty(queryTokens, titleTokens)
    const baseScore = normalizedQuery.includes(titleNorm) ? 0.9 : 0.76
    best = pickBetterMatch(best, {
      confidence: clamp(
        baseScore + titleOverlap * 0.08 - extraTokens * 0.07 - qualifierPenalty,
        0.35,
        0.93
      ),
      matchedBy: 'title_contains'
    })
  }

  for (const alias of aliasNorm) {
    if (alias.includes(normalizedQuery) || normalizedQuery.includes(alias)) {
      const aliasTokens = tokenizeRoleText(alias)
      const aliasOverlap = tokenOverlapRatio(queryTokens, aliasTokens)
      const extraTokens = countMeaningfulExtraTokens(queryTokens, aliasTokens)
      const qualifierPenalty = qualifierMismatchPenalty(queryTokens, aliasTokens)
      const baseScore = normalizedQuery.includes(alias) ? 0.88 : 0.74
      best = pickBetterMatch(best, {
        confidence: clamp(
          baseScore + aliasOverlap * 0.08 - extraTokens * 0.06 - qualifierPenalty,
          0.34,
          0.9
        ),
        matchedBy: 'alias_contains'
      })
    }
  }

  const titleTokenOverlap = tokenOverlapRatio(queryTokens, titleTokens)
  if (titleTokenOverlap > 0) {
    best = pickBetterMatch(best, {
      confidence: Math.min(0.45 + titleTokenOverlap * 0.45, 0.84),
      matchedBy: 'token_overlap'
    })
  }

  for (const alias of row.aliases) {
    const aliasOverlap = tokenOverlapRatio(queryTokens, tokenizeRoleText(alias))
    if (aliasOverlap > 0) {
      best = pickBetterMatch(best, {
        confidence: Math.min(0.5 + aliasOverlap * 0.4, 0.9),
        matchedBy: 'token_overlap'
      })
    }
  }

  const titleFuzzy = diceCoefficient(compactQuery, titleCompact)
  if (titleFuzzy > 0.35) {
    best = pickBetterMatch(best, {
      confidence: Math.min(0.2 + titleFuzzy * 0.6, 0.78),
      matchedBy: 'fuzzy'
    })
  }

  for (const alias of row.aliases) {
    const aliasFuzzy = diceCoefficient(compactQuery, compactRoleText(alias))
    if (aliasFuzzy > 0.35) {
      best = pickBetterMatch(best, {
        confidence: Math.min(0.25 + aliasFuzzy * 0.62, 0.82),
        matchedBy: 'fuzzy'
      })
    }
  }

  if (!best) {
    return {
      confidence: 0,
      matchedBy: 'fallback' as const
    }
  }

  return best
}

async function getOccupationSearchIndex(region?: 'CA' | 'US') {
  const cacheKey = region ?? 'ALL'
  const cached = searchIndexCache.get(cacheKey)
  if (cached && Date.now() - cached.createdAt < SEARCH_INDEX_TTL_MS) {
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
  if (error) {
    throw error
  }

  const rows = ((data ?? []) as OccupationRow[]).map((row) => ({
    ...row,
    aliases: toAliases(row.codes)
  }))

  searchIndexCache.set(cacheKey, {
    key: cacheKey,
    createdAt: Date.now(),
    rows
  })

  return rows
}

export async function resolveOccupationInput(options: {
  input: string
  region?: 'CA' | 'US'
  limit?: number
}) {
  const normalizedInput = options.input.trim()
  const limit = clampLimit(options.limit)
  const index = await getOccupationSearchIndex(options.region)
  const special = pickSpecialOccupation(normalizedInput, index)
  const ranked = filterRankedAlternativesForInput(
    normalizedInput,
    rankOccupationCandidates(normalizedInput, index)
  )
  const limited = special
    ? [
        {
          row: special.row,
          confidence: special.confidence,
          matchedBy: special.matchedBy
        },
        ...ranked.filter((item) => item.row.id !== special.row.id)
      ].slice(0, limit)
    : ranked.slice(0, limit)
  const suggestions: OccupationRoleSuggestion[] = limited.map(({ row, confidence, matchedBy }) =>
    buildOccupationSuggestion(row, confidence, matchedBy)
  )

  const top = suggestions[0] ?? null
  const bestMatch =
    top && top.confidence >= ROLE_MATCH_THRESHOLD
      ? {
          ...top,
          input: normalizedInput
        }
      : null

  return {
    input: normalizedInput,
    bestMatch,
    suggestions
  }
}

export async function getOccupationById(occupationId: string) {
  const normalizedId = occupationId.trim()
  if (!normalizedId) return null

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('occupations')
    .select('id,title,region,codes,source,last_updated')
    .eq('id', normalizedId)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    return null
  }

  const row = data as OccupationRow
  return {
    ...row,
    aliases: toAliases(row.codes)
  } satisfies OccupationSearchIndexRow
}

function latestDateSortDesc(a: { last_updated: string }, b: { last_updated: string }) {
  return b.last_updated.localeCompare(a.last_updated)
}

function pickBestWage(
  wages: OccupationWageRow[],
  occupationRegion: 'CA' | 'US',
  preferredWageRegion?: string
) {
  if (wages.length === 0) return null
  const sorted = [...wages].sort(latestDateSortDesc)

  if (preferredWageRegion) {
    const exact = sorted.find((row) => row.region === preferredWageRegion)
    if (exact) return exact
  }

  const nationalRegion = occupationRegion === 'CA' ? 'CA-NAT' : 'US-NAT'
  const national = sorted.find((row) => row.region === nationalRegion)
  if (national) return national

  return sorted[0]
}

export async function searchOccupationsWithWages(options: SearchOccupationsOptions) {
  const normalizedQuery = (options.query ?? '').trim()
  const limit = clampLimit(options.limit)
  const resolution = await resolveOccupationInput({
    input: normalizedQuery,
    region: options.region,
    limit
  })
  const occupationIds = resolution.suggestions.map((row) => row.occupationId)
  const supabase = createAdminClient()

  let wagesByOccupationId = new Map<string, OccupationWageRow[]>()
  if (occupationIds.length > 0) {
    const { data: wageRows, error: wagesError } = await supabase
      .from('occupation_wages')
      .select('occupation_id,region,wage_low,wage_median,wage_high,currency,source,last_updated')
      .in('occupation_id', occupationIds)

    if (wagesError) {
      throw wagesError
    }

    const typedWages = (wageRows ?? []) as OccupationWageRow[]
    wagesByOccupationId = typedWages.reduce((map, wage) => {
      const existing = map.get(wage.occupation_id) ?? []
      existing.push(wage)
      map.set(wage.occupation_id, existing)
      return map
    }, new Map<string, OccupationWageRow[]>())
  }

  const items = resolution.suggestions.map((occupation) => {
    const wages = wagesByOccupationId.get(occupation.occupationId) ?? []
    const selectedWage = pickBestWage(wages, occupation.region, options.wageRegion)

    return {
      occupationId: occupation.occupationId,
      title: occupation.title,
      region: occupation.region,
      codes: occupation.codes,
      source: occupation.source,
      lastUpdated: occupation.lastUpdated,
      confidence: occupation.confidence,
      matchedBy: occupation.matchedBy,
      wage: selectedWage
        ? {
            region: selectedWage.region,
            low: selectedWage.wage_low,
            median: selectedWage.wage_median,
            high: selectedWage.wage_high,
            currency: selectedWage.currency,
            source: selectedWage.source,
            lastUpdated: selectedWage.last_updated
          }
        : null
    }
  })

  return {
    query: {
      q: normalizedQuery,
      region: options.region ?? null,
      wageRegion: options.wageRegion ?? null,
      limit
    },
    count: items.length,
    bestMatch: resolution.bestMatch,
    items
  } satisfies OccupationSearchResult
}

export type SkillMatchType =
  | 'name_exact'
  | 'alias_exact'
  | 'name_contains'
  | 'alias_contains'
  | 'token_overlap'
  | 'fuzzy'
  | 'fallback'

export interface SkillSuggestion {
  skillId: string
  name: string
  confidence: number
  matchedBy: SkillMatchType
}

export interface SkillSearchResult {
  query: {
    q: string
    limit: number
  }
  count: number
  items: SkillSuggestion[]
}

function normalizeSkillText(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/&/g, ' and ')
    .replace(/[\u2018\u2019']/g, '')
    .replace(/\bc\+\+\b/g, ' c plus plus ')
    .replace(/\bc#\b/g, ' c sharp ')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
}

function tokenizeSkillText(value: string) {
  return normalizeSkillText(value)
    .split(/\s+/)
    .map((token) => {
      if (token.length > 4 && token.endsWith('ies')) return `${token.slice(0, -3)}y`
      if (token.length > 3 && token.endsWith('s')) return token.slice(0, -1)
      return token
    })
    .filter(Boolean)
}

function compactSkillText(value: string) {
  return normalizeSkillText(value).replace(/\s+/g, '')
}

function scoreSkillCandidate(query: string, row: SkillSearchIndexRow) {
  const normalizedQuery = normalizeSkillText(query)
  if (!normalizedQuery) {
    return {
      confidence: 0,
      matchedBy: 'fallback' as const
    }
  }

  const compactQuery = compactSkillText(query)
  const queryTokens = tokenizeSkillText(query)
  const nameNorm = normalizeSkillText(row.name)
  const nameCompact = compactSkillText(row.name)
  const nameTokens = tokenizeSkillText(row.name)
  const aliasNorm = row.aliases.map((alias) => normalizeSkillText(alias))

  let best: { confidence: number; matchedBy: SkillMatchType } | null = null

  if (nameNorm === normalizedQuery) {
    best = { confidence: 1, matchedBy: 'name_exact' }
  }

  for (const alias of aliasNorm) {
    if (alias === normalizedQuery) {
      best = pickBetterMatch(best, { confidence: 0.98, matchedBy: 'alias_exact' })
    }
  }

  if (nameNorm.includes(normalizedQuery) || normalizedQuery.includes(nameNorm)) {
    best = pickBetterMatch(best, { confidence: 0.9, matchedBy: 'name_contains' })
  }

  for (const alias of aliasNorm) {
    if (alias.includes(normalizedQuery) || normalizedQuery.includes(alias)) {
      best = pickBetterMatch(best, { confidence: 0.86, matchedBy: 'alias_contains' })
    }
  }

  const nameTokenOverlap = tokenOverlapRatio(queryTokens, nameTokens)
  if (nameTokenOverlap > 0) {
    best = pickBetterMatch(best, {
      confidence: Math.min(0.42 + nameTokenOverlap * 0.46, 0.84),
      matchedBy: 'token_overlap'
    })
  }

  for (const alias of row.aliases) {
    const aliasTokenOverlap = tokenOverlapRatio(queryTokens, tokenizeSkillText(alias))
    if (aliasTokenOverlap > 0) {
      best = pickBetterMatch(best, {
        confidence: Math.min(0.46 + aliasTokenOverlap * 0.44, 0.88),
        matchedBy: 'token_overlap'
      })
    }
  }

  const nameFuzzy = diceCoefficient(compactQuery, nameCompact)
  if (nameFuzzy > 0.35) {
    best = pickBetterMatch(best, {
      confidence: Math.min(0.2 + nameFuzzy * 0.58, 0.76),
      matchedBy: 'fuzzy'
    })
  }

  for (const alias of row.aliases) {
    const aliasFuzzy = diceCoefficient(compactQuery, compactSkillText(alias))
    if (aliasFuzzy > 0.35) {
      best = pickBetterMatch(best, {
        confidence: Math.min(0.22 + aliasFuzzy * 0.6, 0.8),
        matchedBy: 'fuzzy'
      })
    }
  }

  if (!best) {
    return {
      confidence: 0,
      matchedBy: 'fallback' as const
    }
  }

  return best
}

async function getSkillSearchIndex() {
  if (skillIndexCache && Date.now() - skillIndexCache.createdAt < SEARCH_INDEX_TTL_MS) {
    return skillIndexCache.rows
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('skills')
    .select('id,name,aliases')
    .order('name', { ascending: true })
    .limit(4_000)

  if (error) {
    throw error
  }

  const rows = ((data ?? []) as SkillRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    aliases: toSkillAliases(row.aliases)
  }))

  skillIndexCache = {
    createdAt: Date.now(),
    rows
  }

  return rows
}

function normalizeResolverSource(row: OccupationRow): ResolverSource {
  const sourceText = String(row.source ?? '').toLowerCase()
  if (sourceText.includes('onet') || row.region === 'US') return 'O*NET'
  if (sourceText.includes('noc') || row.region === 'CA') return 'NOC'
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

function buildOccupationSuggestion(
  row: OccupationSearchIndexRow,
  confidence: number,
  matchedBy: RoleMatchType
): OccupationRoleSuggestion {
  return {
    occupationId: row.id,
    title: row.title,
    region: row.region,
    codes: row.codes ?? {},
    source: row.source,
    lastUpdated: row.last_updated,
    confidence,
    matchedBy
  }
}

function rankOccupationCandidates(input: string, index: OccupationSearchIndexRow[]) {
  const normalizedInput = input.trim()

  return index
    .map((row) => {
      const match = scoreRoleCandidate(normalizedInput, row)
      return {
        row,
        confidence: Number(match.confidence.toFixed(3)),
        matchedBy: match.matchedBy
      }
    })
    .filter((item) => item.confidence >= MIN_ROLE_SUGGESTION_CONFIDENCE)
    .sort((left, right) => {
      if (right.confidence !== left.confidence) {
        return right.confidence - left.confidence
      }
      return left.row.title.localeCompare(right.row.title)
    })
}

function inferRequestedStage(input: string): 'helper' | 'apprentice' | 'licensed' | null {
  const normalized = normalizeRoleText(input)
  if (/\bhelper\b/.test(normalized)) return 'helper'
  if (/\bapprentice\b/.test(normalized)) return 'apprentice'
  if (/\blicensed\b|\bjourneyman\b|\bjourneyperson\b/.test(normalized)) return 'licensed'
  return null
}

function isElectricianPathwayTitle(row: OccupationSearchIndexRow) {
  const title = normalizeRoleText(row.title)
  if (!/\belectricians?\b/.test(title)) return false
  if (/\bhelpers?\b/.test(title)) return false
  if (/\bpower\s+line\b/.test(title) || /\bpower-line\b/.test(title)) return false
  return true
}

function preferElectricianPathway(input: string, index: OccupationSearchIndexRow[]) {
  const normalized = normalizeRoleText(input)
  if (
    !/\belectrician\b/.test(normalized) ||
    /\bpower\s+line\b|\bpower-line\b|\blineman\b/.test(normalized)
  ) {
    return null
  }

  const stage = inferRequestedStage(normalized)
  const explicitlyAnchored =
    stage !== null || normalized === 'electrician' || /\belectric apprentice\b/.test(normalized)
  if (!explicitlyAnchored) {
    return null
  }

  const exact = index.find((row) => normalizeRoleText(row.title) === 'electrician')
  const target = exact ?? index
    .filter((row) => isElectricianPathwayTitle(row))
    .sort((left, right) => {
      const leftNorm = normalizeRoleText(left.title)
      const rightNorm = normalizeRoleText(right.title)
      const leftExact = leftNorm === 'electrician' ? 0 : 1
      const rightExact = rightNorm === 'electrician' ? 0 : 1
      if (leftExact !== rightExact) return leftExact - rightExact
      return left.title.localeCompare(right.title)
    })[0]

  if (!target) {
    return null
  }

  return {
    row: target,
    confidence: stage === 'helper' ? 0.96 : stage === 'apprentice' ? 0.98 : 0.99,
    matchedBy: 'alias_exact' as const,
    stage
  }
}

function preferSousChefPathway(input: string, index: OccupationSearchIndexRow[]) {
  const normalized = normalizeRoleText(input)
  if (!/\bsous chef\b/.test(normalized)) {
    return null
  }

  const target = index
    .filter((row) => {
      const title = normalizeRoleText(row.title)
      return /\bchef\b/.test(title) && (/\bhead\b/.test(title) || /\bcook\b/.test(title))
    })
    .sort((left, right) => left.title.localeCompare(right.title))[0]

  if (!target) {
    return null
  }

  return {
    row: target,
    confidence: 0.91,
    matchedBy: 'alias_exact' as const,
    stage: null
  }
}

function pickSpecialOccupation(input: string, index: OccupationSearchIndexRow[]) {
  return preferElectricianPathway(input, index) ?? preferSousChefPathway(input, index)
}

function filterRankedAlternativesForInput(
  input: string,
  ranked: Array<{
    row: OccupationSearchIndexRow
    confidence: number
    matchedBy: RoleMatchType
  }>
) {
  const normalized = normalizeRoleText(input)
  if (/\belectrician\b/.test(normalized)) {
    const electricianOnly = ranked.filter((item) =>
      /\belectric/.test(normalizeRoleText(item.row.title))
    )
    if (electricianOnly.length > 0) {
      return electricianOnly
    }
  }

  if (/\bsous chef\b/.test(normalized)) {
    const chefOnly = ranked.filter((item) => {
      const title = normalizeRoleText(item.row.title)
      return /\bchef\b/.test(title) || /\bcook\b/.test(title)
    })
    if (chefOnly.length > 0) {
      return chefOnly
    }
  }

  return ranked
}

export async function searchSkills(options: SearchSkillsOptions): Promise<SkillSearchResult> {
  const query = (options.query ?? '').trim()
  const limit = clampLimit(options.limit)
  const index = await getSkillSearchIndex()

  const scored = index
    .map((row) => {
      const match = scoreSkillCandidate(query, row)
      return {
        row,
        confidence: Number(match.confidence.toFixed(3)),
        matchedBy: match.matchedBy
      }
    })
    .filter((row) => row.confidence > 0)
    .sort((left, right) => {
      if (right.confidence !== left.confidence) {
        return right.confidence - left.confidence
      }
      return left.row.name.localeCompare(right.row.name)
    })
    .slice(0, limit)

  const items: SkillSuggestion[] = scored.map((item) => ({
    skillId: item.row.id,
    name: item.row.name,
    confidence: item.confidence,
    matchedBy: item.matchedBy
  }))

  return {
    query: {
      q: query,
      limit
    },
    count: items.length,
    items
  }
}
