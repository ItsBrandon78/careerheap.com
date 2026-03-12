import './loadEnvLocal'
import fs from 'node:fs/promises'
import path from 'node:path'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCareerPathwayProfile } from '@/lib/server/careerPathwayProfiles'

type QuickFactsRow = {
  trade_name: string
  trade_code: string
  certifying_exam: string
  classification: string
  red_seal_in_on: string
  academic_standard: string
  on_the_job_hours: number | null
  in_school_hours: number | null
  total_hours: number | null
  province: string
  source_name: string
  source_version: string
}

function normalizeRoleKey(value: string) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function buildCacheKey(targetRole: string, provinceCode: string) {
  return [normalizeRoleKey(targetRole), provinceCode, 'all', targetRole.trim().toLowerCase()].join('::')
}

function buildTrainingCard(row: QuickFactsRow, sourceUrl: string | null) {
  const hoursParts = [
    row.total_hours ? `${row.total_hours.toLocaleString()} total hours` : null,
    row.on_the_job_hours ? `${row.on_the_job_hours.toLocaleString()} on-the-job` : null,
    row.in_school_hours ? `${row.in_school_hours.toLocaleString()} in-school` : null
  ].filter(Boolean)

  return {
    name: `${row.trade_name} apprenticeship requirement`,
    provider:
      row.classification.toLowerCase() === 'compulsory'
        ? 'Skilled Trades Ontario + sponsoring employer'
        : 'Skilled Trades Ontario pathway',
    length: hoursParts.length > 0 ? hoursParts.join(' | ') : null,
    cost: null,
    modality: null,
    sourceUrl,
    sourceLabel: `${row.source_name} (${row.source_version})`,
    sourceType: 'verified' as const
  }
}

async function main() {
  const filePath = path.join(process.cwd(), 'data', 'ontario-trade-quick-facts-2026.json')
  const rows = JSON.parse(await fs.readFile(filePath, 'utf8')) as QuickFactsRow[]
  const admin = createAdminClient()

  const existingTradeRowsRes = await admin
    .from('trade_requirements')
    .select('trade_code,province,occupation_id,official_links,source_url')
    .eq('province', 'ON')

  if (existingTradeRowsRes.error) throw existingTradeRowsRes.error
  const existingTradeRows = new Map(
    (existingTradeRowsRes.data ?? []).map((item) => [`${item.trade_code}::${item.province}`, item])
  )

  const tradeUpserts = rows.map((row) => {
    const existing = existingTradeRows.get(`${row.trade_code}::ON`)
    const notesParts = [
      row.academic_standard ? `Academic standard: ${row.academic_standard}.` : null,
      row.certifying_exam ? `Certifying exam: ${row.certifying_exam}.` : null,
      row.red_seal_in_on ? `Red Seal in Ontario: ${row.red_seal_in_on}.` : null
    ].filter(Boolean)

    return {
      trade_code: row.trade_code,
      province: 'ON',
      occupation_id: existing?.occupation_id ?? null,
      hours: row.total_hours,
      levels: [],
      exam_required: /^yes/i.test(row.certifying_exam),
      official_links: existing?.official_links ?? [],
      notes: notesParts.join(' '),
      source: row.source_name,
      source_url: existing?.source_url ?? null,
      last_updated: '2026-02-01'
    }
  })

  const { error: tradeUpsertError } = await admin
    .from('trade_requirements')
    .upsert(tradeUpserts, { onConflict: 'trade_code,province' })
  if (tradeUpsertError) throw tradeUpsertError

  const cacheRows: Array<Record<string, unknown>> = []

  for (const row of rows) {
    const profile = await getCareerPathwayProfile({
      targetRole: row.trade_name,
      region: 'Ontario',
      tradeCode: row.trade_code
    })

    const aliases = new Set([row.trade_name])
    if (profile?.meta?.title) aliases.add(profile.meta.title)

    const sourceUrl =
      profile?.resources?.training?.[0]?.url ??
      profile?.resources?.official?.[0]?.url ??
      null

    const wageRow =
      profile?.wages_by_province?.find((item) => item.province.toUpperCase() === 'ON') ??
      profile?.wages_by_province?.[0] ??
      null

    for (const alias of aliases) {
      cacheRows.push({
        cache_key: buildCacheKey(alias, 'ON'),
        target_role_key: normalizeRoleKey(alias),
        province_code: 'ON',
        current_role_cluster: 'all',
        target_role: alias,
        source_current_role: null,
        profile_slug: profile?.meta?.slug ?? null,
        training_source_path: 'table',
        wage_source_path: wageRow ? 'curated_profile' : 'none',
        source_urls: Array.from(
          new Set(
            [sourceUrl, profile?.resources?.job_search?.[0]?.url ?? null].filter(
              (value): value is string => Boolean(value)
            )
          )
        ),
        enrichment_payload: {
          trainingCards: [buildTrainingCard(row, sourceUrl)],
          tradeFacts: {
            tradeCode: row.trade_code,
            totalHours: row.total_hours,
            onTheJobHours: row.on_the_job_hours,
            inSchoolHours: row.in_school_hours,
            academicStandard: row.academic_standard,
            certifyingExam: row.certifying_exam,
            classification: row.classification,
            sourceLabel: `${row.source_name} (${row.source_version})`
          },
          wageFallback: wageRow
            ? {
                currency: 'CAD',
                low: wageRow.low_hourly_cad,
                median: wageRow.median_hourly_cad,
                high: wageRow.high_hourly_cad,
                sourceName: wageRow.source,
                sourceUrl: profile?.resources?.job_search?.[0]?.url ?? null,
                asOfDate: profile?.meta?.last_verified ?? '2026-02-01',
                region: wageRow.province,
                sourceType: 'verified'
              }
            : null,
          sourcePath: {
            training: 'table',
            wage: wageRow ? 'curated_profile' : 'none'
          },
          cache: {
            hit: false,
            expiresAt: '2027-02-28T00:00:00.000Z'
          }
        },
        retrieved_at: new Date().toISOString(),
        expires_at: '2027-02-28T00:00:00.000Z',
        updated_at: new Date().toISOString()
      })
    }
  }

  const { error: cacheUpsertError } = await admin
    .from('planner_role_enrichment_cache')
    .upsert(cacheRows, { onConflict: 'cache_key' })

  if (cacheUpsertError) throw cacheUpsertError

  console.log(
    JSON.stringify(
      {
        ok: true,
        tradeRowsUpserted: tradeUpserts.length,
        roleCacheRowsUpserted: cacheRows.length
      },
      null,
      2
    )
  )
}

main().catch((error) => {
  console.error('[seed-ontario-trade-enrichment] failed')
  console.error(error instanceof Error ? error.stack ?? error.message : error)
  process.exitCode = 1
})
