import './loadEnvLocal'
import { BUILT_IN_CAREER_PATHWAY_PROFILES } from '@/lib/career-pathway/examples'
import { CareerPathwayProfileSchema, type CareerPathwayProfile } from '@/lib/career-pathway/schema'
import { createAdminClient } from '@/lib/supabase/admin'

type OccupationRow = {
  id: string
  title: string
  codes: Record<string, unknown> | null
}

type CareerRoleRow = {
  id: string
  occupation_id: string | null
  slug: string
  title: string
  trade_code: string | null
  noc_2021_code: string | null
}

type CareerRoleVersionRow = {
  role_id: string
  version: number
  profile_json: unknown
}

type ProfileSeedCandidate = {
  source: 'built_in' | 'published_profile'
  occupationId: string | null
  title: string
  slug: string
  tradeCode: string | null
  nocCode: string | null
  profile: CareerPathwayProfile
}

function normalizeText(value: string | null | undefined) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function similarity(left: string, right: string) {
  const a = new Set(normalizeText(left).split(' ').filter(Boolean))
  const b = new Set(normalizeText(right).split(' ').filter(Boolean))
  if (a.size === 0 || b.size === 0) return 0
  let overlap = 0
  a.forEach((token) => {
    if (b.has(token)) overlap += 1
  })
  return overlap / Math.max(a.size, b.size, 1)
}

function occupationCode(row: OccupationRow, key: string) {
  const codes = row.codes && typeof row.codes === 'object' ? row.codes : null
  const aliases =
    key === 'noc_code'
      ? ['noc_code', 'noc_2021', 'noc_2021_code']
      : key === 'trade_code'
        ? ['trade_code']
        : [key]
  const value = aliases
    .map((alias) => (codes && typeof codes[alias] === 'string' ? (codes[alias] as string) : null))
    .find(Boolean)
  return value ? normalizeText(value) : null
}

function regionToWageRowRegion(province: string) {
  return province.toUpperCase()
}

function sourceUrlFromProfile(profile: CareerPathwayProfile) {
  return (
    profile.resources.job_search.find((item) => /job bank|wage/i.test(item.title))?.url ??
    profile.resources.official[0]?.url ??
    profile.resources.job_search[0]?.url ??
    null
  )
}

function collectBuiltInProfileCandidates(): ProfileSeedCandidate[] {
  return BUILT_IN_CAREER_PATHWAY_PROFILES
    .filter((profile) => Array.isArray(profile.wages_by_province) && profile.wages_by_province.length > 0)
    .map((profile) => ({
      source: 'built_in' as const,
      occupationId: null,
      title: profile.meta.title,
      slug: profile.meta.slug,
      tradeCode: profile.meta.codes.trade_code ?? null,
      nocCode: profile.meta.codes.noc_2021 ?? null,
      profile,
    }))
}

async function collectPublishedProfileCandidates(
  admin: ReturnType<typeof createAdminClient>
): Promise<ProfileSeedCandidate[]> {
  const [{ data: roleRows, error: rolesError }, { data: versionRows, error: versionError }] =
    await Promise.all([
      admin.from('career_roles').select('id,occupation_id,slug,title,trade_code,noc_2021_code'),
      admin
        .from('career_role_versions')
        .select('role_id,version,profile_json')
        .eq('status', 'published')
        .order('version', { ascending: false }),
    ])

  if (rolesError) throw rolesError
  if (versionError) throw versionError

  const latestVersionByRole = new Map<string, CareerRoleVersionRow>()
  for (const row of (versionRows ?? []) as CareerRoleVersionRow[]) {
    if (!latestVersionByRole.has(row.role_id)) latestVersionByRole.set(row.role_id, row)
  }

  const candidates: ProfileSeedCandidate[] = []
  for (const role of (roleRows ?? []) as CareerRoleRow[]) {
    const latestVersion = latestVersionByRole.get(role.id)
    if (!latestVersion?.profile_json) continue

    let profile: CareerPathwayProfile
    try {
      profile = CareerPathwayProfileSchema.parse(latestVersion.profile_json)
    } catch {
      continue
    }

    if (!Array.isArray(profile.wages_by_province) || profile.wages_by_province.length === 0) continue

    candidates.push({
      source: 'published_profile',
      occupationId: role.occupation_id,
      title: role.title,
      slug: role.slug,
      tradeCode: role.trade_code,
      nocCode: role.noc_2021_code,
      profile,
    })
  }

  return candidates
}

function resolveOccupationMatch(candidate: ProfileSeedCandidate, occupations: OccupationRow[]) {
  if (candidate.occupationId) {
    const exactOccupation = occupations.find((occupation) => occupation.id === candidate.occupationId)
    if (exactOccupation) return exactOccupation
  }

  return occupations
    .map((occupation) => {
      let score = 0
      const tradeCode = candidate.tradeCode ?? candidate.profile.meta.codes.trade_code ?? null
      const nocCode = candidate.nocCode ?? candidate.profile.meta.codes.noc_2021 ?? null

      if (tradeCode && occupationCode(occupation, 'trade_code') === normalizeText(tradeCode)) score += 100
      if (nocCode && occupationCode(occupation, 'noc_code') === normalizeText(nocCode)) score += 90
      score += Math.round(
        Math.max(
          similarity(candidate.title, occupation.title),
          similarity(candidate.slug, occupation.title),
          similarity(candidate.profile.meta.title, occupation.title),
          similarity(candidate.profile.meta.slug, occupation.title)
        ) * 50
      )

      return { occupation, score }
    })
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score)[0]?.occupation
}

async function main() {
  const admin = createAdminClient()
  const { data, error } = await admin.from('occupations').select('id,title,codes')
  if (error) throw error

  const occupations = (data ?? []) as OccupationRow[]
  const profileCandidates = [
    ...collectBuiltInProfileCandidates(),
    ...(await collectPublishedProfileCandidates(admin))
  ]

  const wageRows: Array<Record<string, unknown>> = []
  const sourceCounts = {
    built_in: 0,
    published_profile: 0
  }
  for (const candidate of profileCandidates) {
    const { profile } = candidate
    const match = resolveOccupationMatch(candidate, occupations)
    if (!match) continue
    const provinceWages = profile.wages_by_province ?? []
    if (provinceWages.length === 0) continue
    sourceCounts[candidate.source] += 1

    for (const row of provinceWages) {
      wageRows.push({
        occupation_id: match.id,
        region: regionToWageRowRegion(row.province),
        country: 'CA',
        wage_low: row.low_hourly_cad,
        wage_median: row.median_hourly_cad,
        wage_high: row.high_hourly_cad,
        low: row.low_hourly_cad,
        median: row.median_hourly_cad,
        high: row.high_hourly_cad,
        currency: 'CAD',
        source: row.source || profile.meta.title,
        source_name: row.source || profile.meta.title,
        source_url: sourceUrlFromProfile(profile),
        last_updated: profile.meta.last_verified,
        as_of_date: profile.meta.last_verified
      })
    }
  }

  const { error: upsertError } = await admin
    .from('occupation_wages')
    .upsert(wageRows, { onConflict: 'occupation_id,region,source,last_updated' })
  if (upsertError) throw upsertError

  console.log(
    JSON.stringify(
      {
        ok: true,
        wageRowsUpserted: wageRows.length,
        builtInProfilesSeeded: sourceCounts.built_in,
        publishedProfilesSeeded: sourceCounts.published_profile
      },
      null,
      2
    )
  )
}

main().catch((error) => {
  console.error('[seed-pathway-profile-wages] failed')
  console.error(error instanceof Error ? error.stack ?? error.message : error)
  process.exitCode = 1
})
