import { BUILT_IN_CAREER_PATHWAY_PROFILES } from '@/lib/career-pathway/examples'
import {
  CareerPathwayProfileSchema,
  type CareerPathwayProfile
} from '@/lib/career-pathway/schema'
import { createAdminClient } from '@/lib/supabase/admin'

type LookupArgs = {
  occupationId?: string | null
  targetRole?: string | null
  region?: string | null
  tradeCode?: string | null
  nocCode?: string | null
  onetSocCode?: string | null
}

type CareerRoleRow = {
  id: string
  occupation_id: string | null
  slug: string
  title: string
  trade_code: string | null
  noc_2021_code: string | null
  onet_soc_code: string | null
  jurisdiction_country: string | null
  jurisdiction_region: string | null
}

const REGION_ALIASES: Array<{ code: string; patterns: string[] }> = [
  { code: 'ON', patterns: ['ontario'] },
  { code: 'BC', patterns: ['british columbia'] },
  { code: 'AB', patterns: ['alberta'] },
  { code: 'SK', patterns: ['saskatchewan'] },
  { code: 'MB', patterns: ['manitoba'] },
  { code: 'QC', patterns: ['quebec'] },
  { code: 'NB', patterns: ['new brunswick'] },
  { code: 'NS', patterns: ['nova scotia'] },
  { code: 'PE', patterns: ['prince edward island'] },
  { code: 'NL', patterns: ['newfoundland', 'labrador'] },
  { code: 'YT', patterns: ['yukon'] },
  { code: 'NT', patterns: ['northwest territories'] },
  { code: 'NU', patterns: ['nunavut'] }
]

function normalizeText(value: string | null | undefined) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function similarity(left: string, right: string) {
  const a = normalizeText(left)
  const b = normalizeText(right)
  if (!a || !b) return 0
  if (a === b) return 1

  const aTokens = new Set(a.split(' ').filter(Boolean))
  const bTokens = new Set(b.split(' ').filter(Boolean))
  let overlap = 0
  aTokens.forEach((token) => {
    if (bTokens.has(token)) overlap += 1
  })

  return overlap / Math.max(aTokens.size, bTokens.size, 1)
}

function extractProvinceCode(region: string | null | undefined) {
  const normalized = ` ${normalizeText(region)} `
  for (const candidate of REGION_ALIASES) {
    if (candidate.patterns.some((pattern) => normalized.includes(pattern))) {
      return candidate.code
    }
  }
  return null
}

function scoreRoleMatch(row: CareerRoleRow, args: LookupArgs) {
  let score = 0
  if (args.occupationId && row.occupation_id === args.occupationId) score += 100
  if (args.tradeCode && row.trade_code && normalizeText(row.trade_code) === normalizeText(args.tradeCode)) {
    score += 90
  }
  if (
    args.nocCode &&
    row.noc_2021_code &&
    normalizeText(row.noc_2021_code) === normalizeText(args.nocCode)
  ) {
    score += 80
  }
  if (
    args.onetSocCode &&
    row.onet_soc_code &&
    normalizeText(row.onet_soc_code) === normalizeText(args.onetSocCode)
  ) {
    score += 70
  }

  const titleSimilarity = Math.max(
    similarity(args.targetRole ?? '', row.title),
    similarity(args.targetRole ?? '', row.slug)
  )
  score += Math.round(titleSimilarity * 50)

  if (args.region) {
    const normalizedRegion = normalizeText(args.region)
    if (
      normalizeText(row.jurisdiction_country) === normalizedRegion ||
      normalizeText(row.jurisdiction_region) === normalizedRegion
    ) {
      score += 10
    }
  }

  return score
}

function matchBuiltInProfile(args: LookupArgs) {
  const target = normalizeText(args.targetRole)
  const region = normalizeText(args.region)
  const requestedProvince = extractProvinceCode(args.region)
  const tradeCode = normalizeText(args.tradeCode)
  const nocCode = normalizeText(args.nocCode)
  const onet = normalizeText(args.onetSocCode)

  const ranked = BUILT_IN_CAREER_PATHWAY_PROFILES.map((profile) => {
    if (
      requestedProvince &&
      normalizeText(profile.meta.jurisdiction.region) !== normalizeText(requestedProvince)
    ) {
      return { profile, score: 0 }
    }

    let score = 0
    let matchedByCode = false

    if (
      tradeCode &&
      normalizeText(profile.meta.codes.trade_code) === tradeCode
    ) {
      score += 100
      matchedByCode = true
    }

    if (
      nocCode &&
      normalizeText(profile.meta.codes.noc_2021) === nocCode
    ) {
      score += 90
      matchedByCode = true
    }

    if (
      onet &&
      normalizeText(profile.meta.codes.onet_soc) === onet
    ) {
      score += 70
      matchedByCode = true
    }

    const titleSimilarity = Math.max(
      similarity(target, profile.meta.title),
      similarity(target, profile.meta.slug)
    )
    if (titleSimilarity >= 0.45) {
      score += Math.round(titleSimilarity * 60)
    } else if (!matchedByCode) {
      return { profile, score: 0 }
    }

    if (
      region &&
      (region === 'ca' ||
        region === 'canada' ||
        normalizeText(profile.meta.jurisdiction.region) === region ||
        Boolean(requestedProvince && normalizeText(profile.meta.jurisdiction.region) === normalizeText(requestedProvince)))
    ) {
      score += 10
    }

    return { profile, score }
  })
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score)

  return ranked[0]?.profile ?? null
}

async function fetchProfileFromDb(args: LookupArgs): Promise<CareerPathwayProfile | null> {
  try {
    const admin = createAdminClient()
    const { data: roleRows, error: rolesError } = await admin
      .from('career_roles')
      .select(
        'id, occupation_id, slug, title, trade_code, noc_2021_code, onet_soc_code, jurisdiction_country, jurisdiction_region'
      )
      .limit(100)

    if (rolesError) return null

    const ranked = ((roleRows ?? []) as CareerRoleRow[])
      .map((row) => ({ row, score: scoreRoleMatch(row, args) }))
      .filter((item) => item.score > 0)
      .sort((left, right) => right.score - left.score)

    const winner = ranked[0]?.row
    if (!winner) return null

    const { data: versionRow, error: versionError } = await admin
      .from('career_role_versions')
      .select('profile_json, version')
      .eq('role_id', winner.id)
      .eq('status', 'published')
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (versionError || !versionRow?.profile_json) return null

    return CareerPathwayProfileSchema.parse(versionRow.profile_json)
  } catch {
    return null
  }
}

export async function getCareerPathwayProfile(
  args: LookupArgs
): Promise<CareerPathwayProfile | null> {
  const databaseProfile = await fetchProfileFromDb(args)
  if (databaseProfile) return databaseProfile
  return matchBuiltInProfile(args)
}
