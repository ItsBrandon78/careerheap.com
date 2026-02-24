import { createAdminClient } from '@/lib/supabase/admin'

const DEFAULT_LIMIT = 6
const MAX_LIMIT = 20

type OccupationRow = {
  id: string
  title: string
  region: 'CA' | 'US'
  codes: Record<string, unknown> | null
  source: string | null
  last_updated: string | null
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

export interface SearchOccupationsOptions {
  query?: string
  region?: 'CA' | 'US'
  wageRegion?: string
  limit?: number
}

function clampLimit(limit?: number) {
  if (!Number.isFinite(limit)) return DEFAULT_LIMIT
  return Math.max(1, Math.min(MAX_LIMIT, Math.trunc(limit as number)))
}

function toLikePattern(value: string) {
  const escaped = value.replace(/[\\%_]/g, (match) => `\\${match}`)
  return `%${escaped}%`
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
  const supabase = createAdminClient()
  const normalizedQuery = (options.query ?? '').trim()
  const limit = clampLimit(options.limit)

  let occupationsQuery = supabase
    .from('occupations')
    .select('id,title,region,codes,source,last_updated')
    .order('title', { ascending: true })
    .limit(limit)

  if (options.region) {
    occupationsQuery = occupationsQuery.eq('region', options.region)
  }

  if (normalizedQuery.length > 0) {
    occupationsQuery = occupationsQuery.ilike('title', toLikePattern(normalizedQuery))
  }

  const { data: occupations, error: occupationsError } = await occupationsQuery
  if (occupationsError) {
    throw occupationsError
  }

  const typedOccupations = (occupations ?? []) as OccupationRow[]
  const occupationIds = typedOccupations.map((row) => row.id)

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

  const items = typedOccupations.map((occupation) => {
    const wages = wagesByOccupationId.get(occupation.id) ?? []
    const selectedWage = pickBestWage(wages, occupation.region, options.wageRegion)

    return {
      occupationId: occupation.id,
      title: occupation.title,
      region: occupation.region,
      codes: occupation.codes ?? {},
      source: occupation.source,
      lastUpdated: occupation.last_updated,
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
    items
  }
}
