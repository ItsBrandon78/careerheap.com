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
  const tradeCode = normalizeText(args.tradeCode)
  const nocCode = normalizeText(args.nocCode)

  return (
    BUILT_IN_CAREER_PATHWAY_PROFILES.find((profile) => {
      const title = normalizeText(profile.meta.title)
      return (
        (tradeCode && normalizeText(profile.meta.codes.trade_code) === tradeCode) ||
        (nocCode && normalizeText(profile.meta.codes.noc_2021) === nocCode) ||
        (target.includes('electrician') &&
          title.includes('electrician') &&
          (!region || region.includes('canada') || region.includes('ontario') || region === 'ca'))
      )
    }) ?? null
  )
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
