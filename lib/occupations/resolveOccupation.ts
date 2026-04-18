import { createAdminClient } from '@/lib/supabase/admin'
import { inferRoleFamilyConstraintFromCanonical } from '@/lib/occupations/canonicalRoleRegistry'

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

export interface RoleMatchExplanation {
  titleSimilarity: number
  skillOverlap: number
  industryMatch: number
  experienceMatch: number
  trainingOverlap: number
  rejectedCandidates: string[]
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
  matchExplanation?: RoleMatchExplanation
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
  skills?: string[]
  experienceText?: string
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
const GENERIC_ROLE_TOKENS = new Set([
  'assistant',
  'associate',
  'coordinator',
  'director',
  'lead',
  'manager',
  'officer',
  'operator',
  'representative',
  'specialist',
  'supervisor',
  'technician',
  'worker',
  'administrator',
  'admin',
  'clerk'
])
const RESOLVER_FAMILY_KEYWORDS: Record<string, string[]> = {
  regulated_trade: [
    'electrician',
    'hvac',
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
    'pharmacy',
    'social',
    'counselor',
    'physician',
    'dentist'
  ],
  portfolio_role: ['designer', 'developer', 'engineer', 'writer', 'creative', 'artist'],
  credentialed_role: ['analyst', 'scientist', 'security', 'accountant', 'administrator'],
  experience_ladder_role: ['coordinator', 'manager', 'lead', 'director', 'assistant', 'operations', 'hr']
}
type RoleFamilyConstraint = {
  id: string
  patterns: RegExp[]
  allowedKeywords: string[]
  blockedKeywords?: string[]
  minKeywordMatches?: number
  source?: 'canonical' | 'legacy'
}

const ROLE_FAMILY_CONSTRAINTS: RoleFamilyConstraint[] = [
  {
    id: 'ux_designer',
    patterns: [/\bux\b/, /\buser experience\b/, /\bui\b/, /\binteraction\b/, /\bproduct designer\b/, /\bweb designer\b/],
    allowedKeywords: [
      'ux',
      'ui',
      'user experience',
      'interaction',
      'product design',
      'web design',
      'digital design',
      'graphic design'
    ],
    blockedKeywords: ['computer engineer', 'electrical engineer', 'mechanical engineer'],
    minKeywordMatches: 1
  },
  {
    id: 'customer_success_manager',
    patterns: [/\bcustomer success\b/, /\bclient success\b/, /\bcx manager\b/, /\bcustomer experience manager\b/],
    allowedKeywords: [
      'customer success',
      'client success',
      'customer experience',
      'customer service manager',
      'customer service representatives',
      'customer information services',
      'customer and information services representatives',
      'managers in customer and personal services',
      'saas',
      'customer support lead',
      'client relationship'
    ],
    blockedKeywords: [
      'financial service',
      'financial services',
      'bank',
      'banking',
      'credit',
      'loan',
      'insurance',
      'branch'
    ],
    minKeywordMatches: 1
  },
  {
    id: 'operations_coordinator',
    patterns: [
      /\boperations coordinator\b/,
      /\boperations analyst\b/,
      /\bproject coordinator\b/,
      /\blogistics coordinator\b/,
      /\badministrative operations\b/
    ],
    allowedKeywords: [
      'operations coordinator',
      'operations analyst',
      'project coordinator',
      'project support',
      'logistics',
      'administrative operations',
      'program coordinator',
      'supply chain'
    ],
    blockedKeywords: [
      'facility maintenance',
      'building operations',
      'property operations',
      'construction manager',
      'construction managers'
    ],
    minKeywordMatches: 1
  },
  {
    id: 'healthcare_nurse',
    patterns: [/\bregistered nurse\b/, /\blicensed practical nurse\b/, /\bpractical nurse\b/, /\brn\b/, /\brpn\b/, /\blpn\b/],
    allowedKeywords: [
      'registered nurse',
      'practical nurse',
      'nurse',
      'clinical',
      'patient care',
      'hospital',
      'healthcare'
    ],
    blockedKeywords: ['facility maintenance', 'trades', 'electrician', 'plumber'],
    minKeywordMatches: 1
  },
  {
    id: 'healthcare_dental_hygienist',
    patterns: [/\bdental hygienist\b/, /\bhygienist\b/],
    allowedKeywords: [
      'dental hygienist',
      'dental',
      'oral health',
      'periodontal',
      'hygiene'
    ],
    blockedKeywords: ['nursing supervisor', 'electrician', 'trades', 'facility maintenance'],
    minKeywordMatches: 1
  },
  {
    id: 'healthcare_pharmacy_technician',
    patterns: [/\bpharmacy technician\b/, /\bpharmacy tech\b/],
    allowedKeywords: ['pharmacy technician', 'pharmacy', 'dispensary', 'medication', 'healthcare'],
    blockedKeywords: ['financial service', 'trades', 'electrician', 'facility maintenance'],
    minKeywordMatches: 1
  },
  {
    id: 'hr_family',
    patterns: [/\bhuman resources?\b/, /\bhr\b/, /\brecruit(ment|er)?\b/, /\btalent\b/],
    allowedKeywords: ['human resources', 'hr', 'recruit', 'talent', 'people operations', 'personnel'],
    blockedKeywords: ['nursing', 'facility maintenance', 'electrician', 'trades'],
    minKeywordMatches: 1
  },
  {
    id: 'accounting_family',
    patterns: [/\baccountant\b/, /\bbookkeeper\b/, /\bbook keeping\b/, /\bcpa\b/],
    allowedKeywords: ['accountant', 'bookkeeper', 'accounting', 'payroll', 'accounts payable', 'accounts receivable'],
    blockedKeywords: ['electrician', 'trades', 'nursing', 'facility maintenance'],
    minKeywordMatches: 1
  },
  {
    id: 'tech_software_family',
    patterns: [/\bsoftware developer\b/, /\bsoftware engineer\b/, /\bweb developer\b/, /\bfrontend\b/, /\bbackend\b/],
    allowedKeywords: ['software developer', 'software engineer', 'web developer', 'frontend', 'backend', 'full stack'],
    blockedKeywords: ['computer engineer except software', 'facility maintenance', 'trades'],
    minKeywordMatches: 1
  },
  {
    id: 'tech_data_family',
    patterns: [/\bdata scientist\b/, /\bdata analyst\b/, /\bmachine learning\b/, /\bai engineer\b/],
    allowedKeywords: ['data scientist', 'data analyst', 'machine learning', 'business intelligence', 'analytics'],
    blockedKeywords: ['facility maintenance', 'trades', 'nursing'],
    minKeywordMatches: 1
  },
  {
    id: 'tech_cyber_family',
    patterns: [/\bcybersecurity\b/, /\bsecurity analyst\b/, /\bsoc analyst\b/],
    allowedKeywords: ['cybersecurity', 'security analyst', 'soc analyst', 'information security', 'security operations'],
    blockedKeywords: ['facility maintenance', 'trades', 'nursing'],
    minKeywordMatches: 1
  }
]

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

function extractAnchorTokens(inputTitle: string) {
  return Array.from(
    new Set(
      tokenizeRoleText(inputTitle).filter(
        (token) => !STOP_WORDS.has(token) && !STAGE_WORDS.has(token) && !GENERIC_ROLE_TOKENS.has(token)
      )
    )
  )
}

function candidateMatchesAnchorToken(anchor: string, candidateTexts: string[]) {
  return candidateTexts.some((text) => {
    const tokens = tokenizeRoleText(text)
    if (tokens.includes(anchor) || text.includes(anchor)) return true
    if (anchor === 'hr') return /\bhuman resources?\b/.test(text)
    if (anchor === 'ux') return /\buser experience\b/.test(text)
    if (anchor === 'practical') return /\blicensed practical nurse\b|\bpractical nurse\b/.test(text)
    if (anchor === 'rn') return /\bregistered nurse\b/.test(text)
    if (anchor === 'qa') return /\bquality assurance\b/.test(text)
    return false
  })
}

function hasRoleAnchorMatch(queryTitle: string, row: OccupationIndexRow) {
  const anchors = extractAnchorTokens(queryTitle)
  if (anchors.length === 0) return true
  const candidateTexts = [normalizeRoleText(row.title), ...row.aliases.map((alias) => normalizeRoleText(alias))]
  return anchors.some((anchor) => candidateMatchesAnchorToken(anchor, candidateTexts))
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

function inferRoleFamilyConstraint(queryTitle: string) {
  const canonicalConstraint = inferRoleFamilyConstraintFromCanonical(queryTitle)
  if (canonicalConstraint) {
    return {
      id: canonicalConstraint.id,
      patterns: [],
      allowedKeywords: canonicalConstraint.allowedKeywords,
      blockedKeywords: canonicalConstraint.blockedKeywords,
      minKeywordMatches: canonicalConstraint.minKeywordMatches,
      source: 'canonical' as const
    } satisfies RoleFamilyConstraint
  }

  const normalized = normalizeRoleText(queryTitle)
  const matched = ROLE_FAMILY_CONSTRAINTS.find((constraint) =>
    constraint.patterns.some((pattern) => pattern.test(normalized))
  )

  return matched
    ? {
        ...matched,
        source: 'legacy' as const
      }
    : null
}

function countKeywordMatches(text: string, keywords: string[]) {
  return keywords.filter((keyword) => text.includes(keyword)).length
}

function passesRoleFamilyConstraint(
  constraint: RoleFamilyConstraint | null,
  row: OccupationIndexRow
) {
  if (!constraint) return true
  const candidateText = normalizeRoleText(`${row.title} ${row.aliases.join(' ')}`)
  const blocked = constraint.blockedKeywords?.some((keyword) => candidateText.includes(keyword)) ?? false
  if (blocked) return false
  const matches = countKeywordMatches(candidateText, constraint.allowedKeywords)
  return matches >= (constraint.minKeywordMatches ?? 1)
}

function meaningfulRoleTokens(value: string) {
  return tokenizeRoleText(value).filter(
    (token) => !STOP_WORDS.has(token) && !STAGE_WORDS.has(token)
  )
}

function hasStrongLexicalRoleAlignment(queryTitle: string, candidateTitle: string) {
  const queryTokens = meaningfulRoleTokens(queryTitle)
  const candidateTokens = meaningfulRoleTokens(candidateTitle)
  if (queryTokens.length === 0 || candidateTokens.length === 0) return false
  const candidateSet = new Set(candidateTokens)
  const overlap = queryTokens.filter((token) => candidateSet.has(token)).length
  const requiredOverlap = Math.max(1, Math.ceil(queryTokens.length * 0.6))
  return overlap >= requiredOverlap
}

function fallbackCandidatesWhenConstraintMisses(
  queryTitle: string,
  scored: Array<{ row: OccupationIndexRow; confidence: number }>
) {
  const lexicalMatches = scored.filter(
    (item) =>
      hasStrongLexicalRoleAlignment(queryTitle, item.row.title) ||
      item.row.aliases.some((alias) => hasStrongLexicalRoleAlignment(queryTitle, alias))
  )
  if (lexicalMatches.length > 0) return lexicalMatches

  return scored.filter(
    (item) =>
      item.confidence >= OCCUPATION_RESOLUTION_THRESHOLD - 0.08 &&
      hasRoleAnchorMatch(queryTitle, item.row)
  )
}

function tokenPrefixOverlapRatio(left: string[], right: string[]) {
  if (left.length === 0 || right.length === 0) return 0
  let shared = 0
  for (const queryToken of left) {
    if (
      right.some(
        (candidateToken) =>
          candidateToken === queryToken ||
          candidateToken.startsWith(queryToken) ||
          queryToken.startsWith(candidateToken)
      )
    ) {
      shared += 1
    }
  }
  return shared / left.length
}

function countMeaningfulExtraTokens(queryTokens: string[], candidateTokens: string[]) {
  const querySet = new Set(queryTokens)
  return candidateTokens.filter(
    (token) => !STOP_WORDS.has(token) && !GENERIC_ROLE_TOKENS.has(token) && !querySet.has(token)
  ).length
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
  const prefixOverlap = tokenPrefixOverlapRatio(queryTokens, titleTokens)
  const extraTokens = countMeaningfulExtraTokens(queryTokens, titleTokens)

  if (!normalizedQuery) return 0

  let score = 0
  if (titleNorm === normalizedQuery) score = 1
  if (aliasNorm.some((alias) => alias === normalizedQuery)) score = Math.max(score, 0.98)

  if (titleNorm.includes(normalizedQuery) || normalizedQuery.includes(titleNorm)) {
    score = Math.max(score, 0.82 + Math.max(tokenOverlapRatio(queryTokens, titleTokens), prefixOverlap) * 0.14)
  }
  if (
    aliasNorm.some(
      (alias) => alias.includes(normalizedQuery) || normalizedQuery.includes(alias)
    )
  ) {
    score = Math.max(score, 0.79 + Math.max(tokenOverlapRatio(queryTokens, titleTokens), prefixOverlap) * 0.12)
  }

  const overlap = tokenOverlapRatio(queryTokens, titleTokens)
  if (overlap > 0) {
    score = Math.max(score, Math.min(0.45 + overlap * 0.4 - extraTokens * 0.04, 0.84))
  }
  if (prefixOverlap > 0) {
    score = Math.max(score, Math.min(0.5 + prefixOverlap * 0.36 - extraTokens * 0.03, 0.9))
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
  if (extraTokens >= 3) {
    score -= Math.min(0.18, extraTokens * 0.04)
  }

  return Number(clamp(score, 0, 1).toFixed(3))
}

function isLikelyFamilyMatch(queryTitle: string, candidateTitle: string) {
  const queryTokens = tokenizeRoleText(queryTitle)
  const candidateTokens = tokenizeRoleText(candidateTitle)
  const normalizedCandidate = normalizeRoleText(candidateTitle)
  const genericFamilyTokens = new Set([
    'assistant',
    'associate',
    'manager',
    'coordinator',
    'specialist',
    'supervisor',
    'analyst',
    'technician'
  ])

  const matchedFamilies = Object.values(RESOLVER_FAMILY_KEYWORDS).filter((keywords) =>
    keywords.some((keyword) => queryTokens.includes(keyword) && !genericFamilyTokens.has(keyword))
  )
  if (matchedFamilies.length === 0) return true

  return matchedFamilies.some((keywords) =>
    keywords.some((keyword) => {
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
  )
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

  let supabase: ReturnType<typeof createAdminClient>
  try {
    supabase = createAdminClient()
  } catch (error) {
    console.error('[resolveOccupation] failed to create Supabase admin client:',
      error instanceof Error ? error.message : String(error)
    )
    throw error
  }

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
    console.warn('[resolveOccupation] occupation index load failed, using empty index:', error.message)
    indexCache.set(cacheKey, { createdAt: Date.now(), rows: [] })
    return []
  }

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

  let supabase: ReturnType<typeof createAdminClient>
  try {
    supabase = createAdminClient()
  } catch (error) {
    console.error('[resolveOccupation] failed to create Supabase admin client:',
      error instanceof Error ? error.message : String(error)
    )
    throw error
  }

  const { data, error } = await supabase
    .from('occupations')
    .select('id,title,region,codes,source,last_updated')
    .eq('id', normalizedId)
    .maybeSingle()

  if (error) {
    console.warn('[resolveOccupation] loadOccupationById failed:', error.message)
    return null
  }
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
  return next.confidence >= chosenConfidence - 0.05 && next.confidence >= OCCUPATION_RESOLUTION_THRESHOLD - 0.05
}

function chooseCanonicalRow(
  ranked: Array<{ row: OccupationIndexRow; confidence: number }>,
  stage: string | null,
  baseQuery: string
) {
  if (!stage) return ranked[0] ?? null
  if (!['pre_apprentice', 'helper', 'apprentice', 'intern', 'junior', 'associate'].includes(stage)) {
    return ranked[0] ?? null
  }

  const canonical = ranked.find(
    (item) =>
      !containsStageInTitle(item.row.title) &&
      tokenOverlapRatio(tokenizeRoleText(baseQuery), tokenizeRoleText(item.row.title)) >= 0.5
  )

  return canonical ?? ranked[0] ?? null
}

function normalizeContextSignals(context: ResolveOccupationContext) {
  const profileText = [context.experienceText ?? '', ...(context.skills ?? [])].join(' ')
  return Array.from(
    new Set(
      tokenizeRoleText(profileText).filter(
        (token) =>
          token.length >= 3 &&
          !STOP_WORDS.has(token) &&
          !STAGE_WORDS.has(token) &&
          !GENERIC_ROLE_TOKENS.has(token)
      )
    )
  )
}

function buildRoleMatchExplanation(
  queryTitle: string,
  chosen: { row: OccupationIndexRow; confidence: number },
  context: ResolveOccupationContext,
  rejectedCandidates: string[],
  constraint: RoleFamilyConstraint | null
): RoleMatchExplanation {
  const stage = extractStage(queryTitle)
  const components = computeMatchComponents(queryTitle, chosen.row, context, constraint, stage)

  return {
    titleSimilarity: Number(components.titleSimilarity.toFixed(3)),
    skillOverlap: Number(components.skillOverlap.toFixed(3)),
    industryMatch: Number(components.industryMatch.toFixed(3)),
    experienceMatch: Number(clamp(components.experienceMatch, 0, 1).toFixed(3)),
    trainingOverlap: Number(clamp(components.trainingOverlap, 0, 1).toFixed(3)),
    rejectedCandidates: rejectedCandidates.slice(0, 8)
  }
}

function computeMatchComponents(
  queryTitle: string,
  row: OccupationIndexRow,
  context: ResolveOccupationContext,
  constraint: RoleFamilyConstraint | null,
  stage: string | null
) {
  const queryTokens = tokenizeRoleText(queryTitle)
  const candidateTokens = tokenizeRoleText(`${row.title} ${row.aliases.join(' ')}`)
  const titleSimilarity = clamp(tokenPrefixOverlapRatio(queryTokens, candidateTokens), 0, 1)
  const profileTokens = normalizeContextSignals(context)
  const skillOverlap =
    profileTokens.length > 0 ? clamp(tokenOverlapRatio(profileTokens, candidateTokens), 0, 1) : 0
  const industryMatch = constraint
    ? passesRoleFamilyConstraint(constraint, row)
      ? 1
      : 0
    : isLikelyFamilyMatch(queryTitle, row.title)
      ? 0.9
      : 0.35
  const candidateHasStage = containsStageInTitle(row.title)
  const experienceMatch =
    !stage && !candidateHasStage ? 1 : stage && candidateHasStage ? 0.88 : stage && !candidateHasStage ? 0.75 : 0.62
  const trainingSignalTokens = ['license', 'certification', 'registration', 'exam', 'apprentice', 'clinical']
  const queryTrainingSignals = trainingSignalTokens.filter((token) => queryTokens.includes(token))
  const trainingOverlap =
    queryTrainingSignals.length === 0
      ? 0
      : queryTrainingSignals.filter((token) => candidateTokens.includes(token)).length /
        queryTrainingSignals.length

  return {
    titleSimilarity,
    skillOverlap,
    industryMatch,
    experienceMatch,
    trainingOverlap
  }
}

function blendedConfidence(
  baseConfidence: number,
  queryTitle: string,
  row: OccupationIndexRow,
  context: ResolveOccupationContext,
  constraint: RoleFamilyConstraint | null,
  stage: string | null
) {
  const components = computeMatchComponents(queryTitle, row, context, constraint, stage)
  const skillWeight = normalizeContextSignals(context).length > 0 ? 0.08 : 0
  const trainingWeight = /\b(certif|license|registration|exam|apprentice|clinical)\b/.test(
    normalizeRoleText(queryTitle)
  )
    ? 0.08
    : 0
  const dynamicBaseWeight = 1 - (0.16 + 0.1 + skillWeight + trainingWeight)

  const adjusted =
    baseConfidence * dynamicBaseWeight +
    components.industryMatch * 0.16 +
    components.experienceMatch * 0.1 +
    components.titleSimilarity * 0.06 +
    components.skillOverlap * skillWeight +
    components.trainingOverlap * trainingWeight

  return Number(clamp(adjusted, 0, 1).toFixed(3))
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
  const familyConstraint = inferRoleFamilyConstraint(baseQuery)
  const rejectedByConstraint: string[] = []

  const scored = index
    .map((row) => ({
      row,
      confidence: blendedConfidence(
        scoreOccupationCandidate(baseQuery, row, stage),
        baseQuery,
        row,
        context,
        familyConstraint,
        stage
      )
    }))
    .filter((item) => item.confidence > 0)
    .filter((item) => hasRoleAnchorMatch(baseQuery, item.row))
    .filter((item) => isLikelyFamilyMatch(baseQuery, item.row.title))

  const constrained =
    familyConstraint
      ? scored.filter((item) => {
          const passes = passesRoleFamilyConstraint(familyConstraint, item.row)
          if (!passes) rejectedByConstraint.push(item.row.title)
          return passes
        })
      : scored

  const effectiveCandidates =
    familyConstraint && constrained.length === 0 && familyConstraint.source === 'canonical'
      ? fallbackCandidatesWhenConstraintMisses(baseQuery, scored)
      : familyConstraint && constrained.length > 0
        ? constrained
        : scored

  const ranked = effectiveCandidates.sort((left, right) => {
      if (right.confidence !== left.confidence) return right.confidence - left.confidence
      return left.row.title.localeCompare(right.row.title)
    })

  let chosen = explicit
    ? {
        row: explicit,
        confidence: 1
      }
    : chooseCanonicalRow(ranked, stage, baseQuery)

  if (!chosen && scored.length > 0) {
    const scoredRanked = [...scored].sort((left, right) => {
      if (right.confidence !== left.confidence) return right.confidence - left.confidence
      return left.row.title.localeCompare(right.row.title)
    })
    chosen = scoredRanked[0] ?? null
  }

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
      lastUpdated: null,
      matchExplanation: {
        titleSimilarity: 0,
        skillOverlap: 0,
        industryMatch: 0,
        experienceMatch: 0,
        trainingOverlap: 0,
        rejectedCandidates: rejectedByConstraint.slice(0, 8)
      }
    }
  }

  const alternativePool = ranked.length > 0 ? ranked : [...scored].sort((left, right) => {
    if (right.confidence !== left.confidence) return right.confidence - left.confidence
    return left.row.title.localeCompare(right.row.title)
  })
  const alternatives = buildAlternatives(alternativePool, chosen.row.id)
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
    lastUpdated: chosen.row.last_updated,
    matchExplanation: buildRoleMatchExplanation(baseQuery, chosen, context, rejectedByConstraint, familyConstraint)
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
