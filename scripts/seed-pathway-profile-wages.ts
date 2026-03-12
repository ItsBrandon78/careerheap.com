import './loadEnvLocal'
import { BUILT_IN_CAREER_PATHWAY_PROFILES } from '@/lib/career-pathway/examples'
import { createAdminClient } from '@/lib/supabase/admin'

type OccupationRow = {
  id: string
  title: string
  codes: Record<string, unknown> | null
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

function sourceUrlFromProfile(profile: (typeof BUILT_IN_CAREER_PATHWAY_PROFILES)[number]) {
  return (
    profile.resources.job_search.find((item) => /job bank|wage/i.test(item.title))?.url ??
    profile.resources.official[0]?.url ??
    profile.resources.job_search[0]?.url ??
    null
  )
}

async function main() {
  const admin = createAdminClient()
  const { data, error } = await admin.from('occupations').select('id,title,codes')
  if (error) throw error

  const occupations = (data ?? []) as OccupationRow[]

  const wageRows: Array<Record<string, unknown>> = []
  for (const profile of BUILT_IN_CAREER_PATHWAY_PROFILES) {
    if (!Array.isArray(profile.wages_by_province) || profile.wages_by_province.length === 0) continue

    const match = occupations
      .map((occupation) => {
        let score = 0
        if (
          profile.meta.codes.trade_code &&
          occupationCode(occupation, 'trade_code') === normalizeText(profile.meta.codes.trade_code)
        ) score += 100
        if (
          profile.meta.codes.noc_2021 &&
          occupationCode(occupation, 'noc_code') === normalizeText(profile.meta.codes.noc_2021)
        ) score += 90
        score += Math.round(
          Math.max(similarity(profile.meta.title, occupation.title), similarity(profile.meta.slug, occupation.title)) *
            50
        )
        return { occupation, score }
      })
      .filter((item) => item.score > 0)
      .sort((left, right) => right.score - left.score)[0]?.occupation

    if (!match) continue

    for (const row of profile.wages_by_province) {
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
        source: row.source,
        source_name: row.source,
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

  console.log(JSON.stringify({ ok: true, wageRowsUpserted: wageRows.length }, null, 2))
}

main().catch((error) => {
  console.error('[seed-pathway-profile-wages] failed')
  console.error(error instanceof Error ? error.stack ?? error.message : error)
  process.exitCode = 1
})
