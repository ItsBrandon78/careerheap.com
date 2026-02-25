import { createAdminClient } from '@/lib/supabase/admin'
import { fetchJobsPaged, isAdzunaConfigured } from '@/lib/server/adzuna'
import {
  aggregateRequirements,
  extractRequirementsFromPostings,
  extractRequirementsFromText
} from '@/lib/requirements/extractor'
import type {
  AggregatedRequirement,
  RequirementEvidence,
  RequirementEvidenceSource,
  RequirementType
} from '@/lib/requirements/types'

interface JobQueryRow {
  id: string
  role: string
  location: string
  country: string
  last_fetched_at: string | null
  fetch_status: 'idle' | 'fetching' | 'success' | 'error'
  error: string | null
}

interface JobPostingRow {
  provider: string
  provider_job_id: string
  description: string | null
}

interface JobRequirementRow {
  type: RequirementType
  label: string
  normalized_key: string
  evidence: unknown
  frequency: number
}

export interface EnsureRequirementOptions {
  role: string
  location: string
  country?: string
  useMarketEvidence?: boolean
  userPostingText?: string
  forceRefresh?: boolean
}

export interface EnsureRequirementResult {
  queryId: string | null
  query: {
    role: string
    location: string
    country: string
  }
  marketRequirements: AggregatedRequirement[]
  userPostingRequirements: AggregatedRequirement[]
  usedAdzuna: boolean
  usedCache: boolean
  postingsCount: number
  baselineOnly: boolean
  fetchedAt: string | null
}

const DEFAULT_TTL_HOURS = 72

function normalizeLookup(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

function ttlMs() {
  const raw = Number.parseInt(process.env.REQUIREMENTS_TTL_HOURS ?? '', 10)
  const hours = Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_TTL_HOURS
  return hours * 60 * 60 * 1000
}

function toEvidenceArray(value: unknown): RequirementEvidence[] {
  if (!Array.isArray(value)) return []
  const output: RequirementEvidence[] = []
  for (const row of value) {
    if (!row || typeof row !== 'object') continue
    const item = row as Record<string, unknown>
    const source = String(item.source ?? '').trim() as RequirementEvidenceSource
    if (source !== 'adzuna' && source !== 'user_posting' && source !== 'onet') continue
    const quote = String(item.quote ?? '').trim()
    if (!quote) continue
    const confidence = Number(item.confidence)
    output.push({
      source,
      quote,
      postingId: typeof item.postingId === 'string' ? item.postingId : undefined,
      confidence: Number.isFinite(confidence) ? confidence : 0.5
    })
  }
  return output
}

function mergeAggregatedRequirements(rows: AggregatedRequirement[]) {
  const map = new Map<string, AggregatedRequirement>()
  for (const row of rows) {
    const key = `${row.type}:${row.normalizedKey}`
    const existing = map.get(key)
    if (!existing) {
      map.set(key, {
        ...row,
        evidence: [...row.evidence]
      })
      continue
    }

    existing.frequency += row.frequency
    for (const evidence of row.evidence) {
      const composite = `${evidence.source}:${evidence.quote}:${evidence.postingId ?? ''}`
      const alreadyIncluded = existing.evidence.some(
        (candidate) =>
          `${candidate.source}:${candidate.quote}:${candidate.postingId ?? ''}` === composite
      )
      if (!alreadyIncluded && existing.evidence.length < 8) {
        existing.evidence.push(evidence)
      }
    }

    // Prefer higher-confidence evidence labels when choosing display label.
    const existingBestConfidence = Math.max(...existing.evidence.map((item) => item.confidence))
    const incomingBestConfidence = Math.max(...row.evidence.map((item) => item.confidence))
    if (incomingBestConfidence > existingBestConfidence) {
      existing.label = row.label
    }
  }

  return [...map.values()].sort((left, right) => {
    if (right.frequency !== left.frequency) return right.frequency - left.frequency
    if (left.type !== right.type) return left.type.localeCompare(right.type)
    return left.label.localeCompare(right.label)
  })
}

async function findOrCreateQuery(options: { role: string; location: string; country: string }) {
  const admin = createAdminClient()
  const role = normalizeLookup(options.role)
  const location = normalizeLookup(options.location)
  const country = normalizeLookup(options.country)

  const { data: existing, error: existingError } = await admin
    .from('job_queries')
    .select('id,role,location,country,last_fetched_at,fetch_status,error')
    .eq('role', role)
    .eq('location', location)
    .eq('country', country)
    .maybeSingle()

  if (existingError) throw existingError
  if (existing) return existing as JobQueryRow

  const { data: inserted, error: insertError } = await admin
    .from('job_queries')
    .insert({
      role,
      location,
      country,
      fetch_status: 'idle'
    })
    .select('id,role,location,country,last_fetched_at,fetch_status,error')
    .single()

  if (insertError) throw insertError
  return inserted as JobQueryRow
}

async function getStoredRequirements(queryId: string) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('job_requirements')
    .select('type,label,normalized_key,evidence,frequency')
    .eq('query_id', queryId)

  if (error) throw error

  return ((data ?? []) as JobRequirementRow[])
    .map(
      (row) =>
        ({
          type: row.type,
          label: row.label,
          normalizedKey: row.normalized_key,
          frequency: Math.max(1, Number(row.frequency) || 1),
          evidence: toEvidenceArray(row.evidence)
        }) satisfies AggregatedRequirement
    )
    .filter((row) => row.evidence.length > 0)
}

async function getPostingRows(queryId: string) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('job_postings')
    .select('provider,provider_job_id,description')
    .eq('query_id', queryId)

  if (error) throw error
  return (data ?? []) as JobPostingRow[]
}

export function isMarketEvidenceConfigured() {
  return isAdzunaConfigured()
}

async function persistExtractedRequirements(queryId: string, requirements: AggregatedRequirement[]) {
  const admin = createAdminClient()
  await admin.from('job_requirements').delete().eq('query_id', queryId)
  if (requirements.length === 0) return

  const { error } = await admin.from('job_requirements').insert(
    requirements.map((item) => ({
      query_id: queryId,
      type: item.type,
      label: item.label,
      normalized_key: item.normalizedKey,
      evidence: item.evidence,
      frequency: Math.max(1, item.frequency)
    }))
  )

  if (error) throw error
}

function isFresh(lastFetchedAt: string | null) {
  if (!lastFetchedAt) return false
  const timestamp = Date.parse(lastFetchedAt)
  if (!Number.isFinite(timestamp)) return false
  return Date.now() - timestamp <= ttlMs()
}

async function writeRunRecord(options: {
  queryId: string
  startedAt: string
  postingsCount: number
  requirementsCount: number
  status: 'success' | 'error'
  error?: string
}) {
  const admin = createAdminClient()
  await admin.from('requirement_runs').insert({
    query_id: options.queryId,
    started_at: options.startedAt,
    finished_at: new Date().toISOString(),
    postings_count: options.postingsCount,
    requirements_count: options.requirementsCount,
    model: 'heuristic-v1',
    status: options.status,
    error: options.error ?? null
  })
}

export async function ensureEvidenceRequirements(
  options: EnsureRequirementOptions
): Promise<EnsureRequirementResult> {
  const role = options.role.trim()
  const location = options.location.trim()
  const country = (options.country ?? process.env.ADZUNA_COUNTRY ?? 'ca').trim().toLowerCase()
  const useMarketEvidence = options.useMarketEvidence !== false
  const userPostingText = options.userPostingText?.trim() ?? ''
  const userPostingRequirements =
    userPostingText.length > 20
      ? aggregateRequirements(
          extractRequirementsFromText({
            source: 'user_posting',
            text: userPostingText
          })
        )
      : []

  if (!role || !location) {
    return {
      queryId: null,
      query: { role, location, country },
      marketRequirements: [],
      userPostingRequirements,
      usedAdzuna: false,
      usedCache: false,
      postingsCount: 0,
      baselineOnly: userPostingRequirements.length === 0,
      fetchedAt: null
    }
  }

  const query = await findOrCreateQuery({ role, location, country })
  const currentRequirements = await getStoredRequirements(query.id)
  const canUseCache = !options.forceRefresh && isFresh(query.last_fetched_at)
  const marketConfigured = useMarketEvidence && isAdzunaConfigured()
  const shouldUseStored =
    currentRequirements.length > 0 && (canUseCache || !marketConfigured || !useMarketEvidence)

  if (shouldUseStored) {
    return {
      queryId: query.id,
      query: { role: query.role, location: query.location, country: query.country },
      marketRequirements: currentRequirements,
      userPostingRequirements,
      usedAdzuna: false,
      usedCache: canUseCache,
      postingsCount: 0,
      baselineOnly: currentRequirements.length === 0 && userPostingRequirements.length === 0,
      fetchedAt: query.last_fetched_at
    }
  }

  if (!marketConfigured) {
    return {
      queryId: query.id,
      query: { role: query.role, location: query.location, country: query.country },
      marketRequirements: currentRequirements,
      userPostingRequirements,
      usedAdzuna: false,
      usedCache: false,
      postingsCount: 0,
      baselineOnly: currentRequirements.length === 0 && userPostingRequirements.length === 0,
      fetchedAt: query.last_fetched_at
    }
  }

  const admin = createAdminClient()
  const startedAt = new Date().toISOString()

  await admin
    .from('job_queries')
    .update({ fetch_status: 'fetching', error: null })
    .eq('id', query.id)

  try {
    const postings = await fetchJobsPaged({
      role,
      location,
      country,
      maxPages: 2
    })

    if (postings.length > 0) {
      const { error: postingsError } = await admin.from('job_postings').upsert(
        postings.map((job) => ({
          provider: job.provider,
          provider_job_id: job.providerJobId,
          query_id: query.id,
          title: job.title,
          company: job.company,
          location: job.location,
          description: job.description,
          category: job.category,
          salary_min: job.salaryMin,
          salary_max: job.salaryMax,
          contract_type: job.contractType,
          posted_at: job.postedAt,
          source_url: job.sourceUrl,
          raw: job.raw
        })),
        { onConflict: 'provider,provider_job_id' }
      )
      if (postingsError) throw postingsError
    }

    const postingRows = await getPostingRows(query.id)
    const extractedMarket = extractRequirementsFromPostings(
      postingRows
        .filter((row) => typeof row.description === 'string' && row.description.trim().length > 0)
        .map((row) => ({
          postingId: `${row.provider}:${row.provider_job_id}`,
          description: row.description as string
        })),
      'adzuna'
    )
    const mergedMarket = mergeAggregatedRequirements(extractedMarket)

    if (mergedMarket.length > 0) {
      await persistExtractedRequirements(query.id, mergedMarket)
    }

    const finishedAt = new Date().toISOString()
    await admin
      .from('job_queries')
      .update({
        last_fetched_at: finishedAt,
        fetch_status: 'success',
        error: null
      })
      .eq('id', query.id)

    await writeRunRecord({
      queryId: query.id,
      startedAt,
      postingsCount: postingRows.length,
      requirementsCount: mergedMarket.length,
      status: 'success'
    })

    return {
      queryId: query.id,
      query: { role: query.role, location: query.location, country: query.country },
      marketRequirements: mergedMarket.length > 0 ? mergedMarket : currentRequirements,
      userPostingRequirements,
      usedAdzuna: true,
      usedCache: false,
      postingsCount: postingRows.length,
      baselineOnly:
        mergedMarket.length === 0 &&
        currentRequirements.length === 0 &&
        userPostingRequirements.length === 0,
      fetchedAt: finishedAt
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown ingestion failure'
    await admin
      .from('job_queries')
      .update({ fetch_status: 'error', error: message })
      .eq('id', query.id)

    await writeRunRecord({
      queryId: query.id,
      startedAt,
      postingsCount: 0,
      requirementsCount: 0,
      status: 'error',
      error: message
    })

    return {
      queryId: query.id,
      query: { role: query.role, location: query.location, country: query.country },
      marketRequirements: currentRequirements,
      userPostingRequirements,
      usedAdzuna: false,
      usedCache: false,
      postingsCount: 0,
      baselineOnly: currentRequirements.length === 0 && userPostingRequirements.length === 0,
      fetchedAt: query.last_fetched_at
    }
  }
}
