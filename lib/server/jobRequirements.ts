import { createAdminClient } from '@/lib/supabase/admin'
import { fetchJobsPaged, isAdzunaConfigured } from '@/lib/server/adzuna'
import { suggestRoleSearchVariantsWithLlm } from '@/lib/server/jobSearchQueryLlm'
import {
  aggregateRequirements,
  extractRequirementsFromText
} from '@/lib/requirements/extractor'
import type {
  AggregatedRequirement,
  ExtractedRequirement,
  RequirementEvidence,
  RequirementEvidenceSource,
  RequirementType
} from '@/lib/requirements/types'
import { enrichLowConfidenceRequirementsWithLlm } from '@/lib/server/requirementsLlmNormalizer'

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

export interface RecommendedJobPosting {
  id: string
  title: string
  company: string
  location: string
  description: string
  sourceUrl: string
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
  llmNormalizedCount: number
  baselineOnly: boolean
  fetchedAt: string | null
}

const DEFAULT_TTL_HOURS = 72
const COUNTRY_ALIAS_MAP: Record<string, string> = {
  ca: 'ca',
  canada: 'ca',
  us: 'us',
  usa: 'us',
  unitedstates: 'us',
  gb: 'gb',
  uk: 'gb',
  unitedkingdom: 'gb',
  greatbritain: 'gb',
  england: 'gb'
}
const CANADA_LOCATION_SIGNALS = [
  'canada',
  'ontario',
  'quebec',
  'british columbia',
  'alberta',
  'saskatchewan',
  'manitoba',
  'new brunswick',
  'nova scotia',
  'newfoundland',
  'prince edward',
  'pei',
  'yukon',
  'nunavut',
  'northwest territories',
  'toronto',
  'ottawa',
  'montreal',
  'vancouver',
  'calgary',
  'edmonton',
  'winnipeg',
  'hamilton',
  'kitchener',
  'waterloo',
  'mississauga',
  'brampton',
  'surrey',
  'halifax',
  'regina',
  'saskatoon',
  'victoria'
]

function evidenceSourcePriority(source: RequirementEvidenceSource) {
  if (source === 'user_posting') return 3
  if (source === 'adzuna') return 2
  return 1
}

function normalizeLookup(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

function normalizeCountryCode(value: string) {
  const normalized = normalizeLookup(value).replace(/[^a-z]/g, '')
  if (!normalized) return 'ca'
  const mapped = COUNTRY_ALIAS_MAP[normalized] ?? normalized.slice(0, 2)
  return mapped.length === 2 ? mapped : 'ca'
}

function shouldForceCanadaCountry(location: string, country: string) {
  if (country === 'ca') return false
  const normalizedLocation = normalizeLookup(location)
  if (!normalizedLocation) return false
  return CANADA_LOCATION_SIGNALS.some((signal) => normalizedLocation.includes(signal))
}

function ttlMs() {
  const raw = Number.parseInt(process.env.REQUIREMENTS_TTL_HOURS ?? '', 10)
  const hours = Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_TTL_HOURS
  return hours * 60 * 60 * 1000
}

function roleQueryVariants(role: string) {
  const cleaned = role.trim()
  if (!cleaned) return []
  const variants = [
    cleaned,
    cleaned.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim(),
    cleaned
      .replace(/\bexcept\b.*$/i, ' ')
      .replace(/\([^)]*\)/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  ]
  return [...new Set(variants.filter((item) => item.length >= 3))]
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

function pickEvidenceQuotes(evidence: RequirementEvidence[]) {
  const seen = new Set<string>()
  return [...evidence]
    .sort((left, right) => {
      const sourceDelta = evidenceSourcePriority(right.source) - evidenceSourcePriority(left.source)
      if (sourceDelta !== 0) return sourceDelta
      if (right.confidence !== left.confidence) return right.confidence - left.confidence
      if (left.quote !== right.quote) return left.quote.localeCompare(right.quote)
      return (left.postingId ?? '').localeCompare(right.postingId ?? '')
    })
    .filter((item) => {
      const key = `${item.source}:${item.quote}:${item.postingId ?? ''}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0, 2)
}

function withAggregatedCompatibility(
  row: Pick<AggregatedRequirement, 'type' | 'label' | 'normalizedKey' | 'frequency' | 'evidence'> & {
    frequencyPercent?: number | null
  }
) {
  const frequency = Math.max(1, Number(row.frequency) || 1)
  const normalizedKey = String(row.normalizedKey ?? '').trim()
  return {
    type: row.type,
    label: row.label,
    normalizedKey,
    normalized_key: normalizedKey,
    frequency,
    frequency_count: frequency,
    frequency_percent: row.frequencyPercent ?? null,
    evidence: row.evidence,
    evidence_quotes: pickEvidenceQuotes(row.evidence)
  } satisfies AggregatedRequirement
}

function withFrequencyPercent(requirements: AggregatedRequirement[], postingsCount: number) {
  return requirements.map((item) => {
    const hasAdzuna = item.evidence.some((entry) => entry.source === 'adzuna')
    const hasUserPosting = item.evidence.some((entry) => entry.source === 'user_posting')
    let frequencyPercent: number | null = null
    if (hasAdzuna && postingsCount > 0) {
      frequencyPercent = Math.min(100, Math.max(0, (item.frequency_count / postingsCount) * 100))
    } else if (!hasAdzuna && hasUserPosting) {
      frequencyPercent = 100
    }
    return withAggregatedCompatibility({
      type: item.type,
      label: item.label,
      normalizedKey: item.normalizedKey,
      frequency: item.frequency_count,
      evidence: item.evidence,
      frequencyPercent
    })
  })
}

function mergeAggregatedRequirements(rows: AggregatedRequirement[]) {
  const map = new Map<string, AggregatedRequirement>()
  for (const row of rows) {
    const key = `${row.type}:${row.normalizedKey}`
    const existing = map.get(key)
    if (!existing) {
      map.set(key, {
        ...withAggregatedCompatibility({
          type: row.type,
          label: row.label,
          normalizedKey: row.normalizedKey,
          frequency: row.frequency_count,
          evidence: [...row.evidence],
          frequencyPercent: row.frequency_percent
        }),
        evidence: [...row.evidence],
        evidence_quotes: [...row.evidence_quotes]
      })
      continue
    }

    existing.frequency += row.frequency_count
    existing.frequency_count += row.frequency_count
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

    existing.evidence_quotes = pickEvidenceQuotes(existing.evidence)
  }

  return [...map.values()].sort((left, right) => {
    if (right.frequency_count !== left.frequency_count) {
      return right.frequency_count - left.frequency_count
    }
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
    .map((row) =>
      withAggregatedCompatibility({
        type: row.type,
        label: row.label,
        normalizedKey: row.normalized_key,
        frequency: Math.max(1, Number(row.frequency) || 1),
        evidence: toEvidenceArray(row.evidence)
      })
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

async function getPostingCount(queryId: string) {
  const admin = createAdminClient()
  const { count, error } = await admin
    .from('job_postings')
    .select('id', { count: 'exact', head: true })
    .eq('query_id', queryId)
  if (error) throw error
  return Math.max(0, Number(count) || 0)
}

export function isMarketEvidenceConfigured() {
  return isAdzunaConfigured()
}

export async function listRecommendedJobPostings(queryId: string, limit = 6) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('job_postings')
    .select('provider,provider_job_id,title,company,location,description,source_url,posted_at')
    .eq('query_id', queryId)
    .order('posted_at', { ascending: false })
    .limit(limit)

  if (error) throw error

  return ((data ?? []) as Array<{
    provider: string
    provider_job_id: string
    title: string | null
    company: string | null
    location: string | null
    description: string | null
    source_url: string | null
  }>)
    .map((row) => ({
      id: `${row.provider}:${row.provider_job_id}`,
      title: row.title?.trim() || 'Untitled role',
      company: row.company?.trim() || 'Unknown company',
      location: row.location?.trim() || 'Location not provided',
      description: row.description?.trim() || '',
      sourceUrl: row.source_url?.trim() || ''
    }))
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
      frequency: Math.max(1, item.frequency_count)
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
  model: string
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
    model: options.model,
    status: options.status,
    error: options.error ?? null
  })
}

async function clearRecoveredQueryError(query: JobQueryRow) {
  if (query.fetch_status === 'success' && !query.error) return query.last_fetched_at
  const recoveredAt = query.last_fetched_at ?? new Date().toISOString()
  const admin = createAdminClient()
  await admin
    .from('job_queries')
    .update({
      fetch_status: 'success',
      error: null,
      last_fetched_at: recoveredAt
    })
    .eq('id', query.id)
  return recoveredAt
}

export async function ensureEvidenceRequirements(
  options: EnsureRequirementOptions
): Promise<EnsureRequirementResult> {
  const role = options.role.trim()
  const location = options.location.trim()
  const requestedCountry = normalizeCountryCode(options.country ?? process.env.ADZUNA_COUNTRY ?? 'ca')
  const country = shouldForceCanadaCountry(location, requestedCountry) ? 'ca' : requestedCountry
  const useMarketEvidence = options.useMarketEvidence !== false
  const userPostingText = options.userPostingText?.trim() ?? ''
  const rawUserPostingRequirements =
    userPostingText.length > 20
      ? aggregateRequirements(
          extractRequirementsFromText({
            source: 'user_posting',
            text: userPostingText
          })
        )
      : []
  const userPostingRequirements = withFrequencyPercent(rawUserPostingRequirements, 0)

  if (!role || !location) {
    return {
      queryId: null,
      query: { role, location, country },
      marketRequirements: [],
      userPostingRequirements,
      usedAdzuna: false,
      usedCache: false,
      postingsCount: 0,
      llmNormalizedCount: 0,
      baselineOnly: userPostingRequirements.length === 0,
      fetchedAt: null
    }
  }

  const query = await findOrCreateQuery({ role, location, country })
  const storedPostingsCount = await getPostingCount(query.id)
  const currentRequirements = withFrequencyPercent(
    await getStoredRequirements(query.id),
    storedPostingsCount
  )
  const canUseCache = !options.forceRefresh && isFresh(query.last_fetched_at)
  const marketConfigured = useMarketEvidence && isAdzunaConfigured()
  const shouldUseStored =
    currentRequirements.length > 0 && (canUseCache || !marketConfigured || !useMarketEvidence)

  if (shouldUseStored) {
    const recoveredFetchedAt =
      query.fetch_status !== 'success' || query.error ? await clearRecoveredQueryError(query) : null
    return {
      queryId: query.id,
      query: { role: query.role, location: query.location, country: query.country },
      marketRequirements: currentRequirements,
      userPostingRequirements,
      usedAdzuna: false,
      usedCache: canUseCache,
      postingsCount: storedPostingsCount,
      llmNormalizedCount: 0,
      baselineOnly: currentRequirements.length === 0 && userPostingRequirements.length === 0,
      fetchedAt: recoveredFetchedAt ?? query.last_fetched_at
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
      postingsCount: storedPostingsCount,
      llmNormalizedCount: 0,
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
    let postings = [] as Awaited<ReturnType<typeof fetchJobsPaged>>
    const baseVariants = roleQueryVariants(role)
    const attemptedVariants = new Set<string>()
    let usedAiQueryExpansion = false

    const fetchWithVariants = async (variants: string[]) => {
      for (const roleVariant of variants) {
        const key = roleVariant.toLowerCase()
        if (attemptedVariants.has(key)) continue
        attemptedVariants.add(key)
        postings = await fetchJobsPaged({
          role: roleVariant,
          location,
          country,
          maxPages: 2
        })
        if (postings.length > 0) return true
      }
      return false
    }

    await fetchWithVariants(baseVariants)

    if (postings.length === 0) {
      const aiVariants = await suggestRoleSearchVariantsWithLlm({
        role,
        location,
        country
      })
      if (aiVariants.length > 0) {
        usedAiQueryExpansion = true
        await fetchWithVariants(aiVariants)
      }
    }

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
    const postingInputs = postingRows
      .filter((row) => typeof row.description === 'string' && row.description.trim().length > 0)
      .map((row) => ({
        postingId: `${row.provider}:${row.provider_job_id}`,
        description: row.description as string
      }))

    const heuristicExtracted = postingInputs.flatMap((posting) =>
      extractRequirementsFromText({
        source: 'adzuna',
        text: posting.description,
        postingId: posting.postingId
      })
    )
    let llmExtracted: ExtractedRequirement[] = []
    try {
      llmExtracted = await enrichLowConfidenceRequirementsWithLlm({
        postings: postingInputs,
        heuristicExtracted
      })
    } catch {
      llmExtracted = []
    }
    const extractedMarket = aggregateRequirements([...heuristicExtracted, ...llmExtracted])
    const mergedMarket = mergeAggregatedRequirements(extractedMarket)
    const mergedMarketWithPercent = withFrequencyPercent(mergedMarket, postingRows.length)

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
      model:
        llmExtracted.length > 0
          ? usedAiQueryExpansion
            ? 'heuristic+gpt-v1+query-expansion'
            : 'heuristic+gpt-v1'
          : usedAiQueryExpansion
            ? 'heuristic-v1+query-expansion'
            : 'heuristic-v1',
      status: 'success'
    })

    return {
      queryId: query.id,
      query: { role: query.role, location: query.location, country: query.country },
      marketRequirements:
        mergedMarketWithPercent.length > 0 ? mergedMarketWithPercent : currentRequirements,
      userPostingRequirements,
      usedAdzuna: true,
      usedCache: false,
      postingsCount: postingRows.length,
      llmNormalizedCount: llmExtracted.length,
      baselineOnly:
        mergedMarketWithPercent.length === 0 &&
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
      model: 'heuristic-v1',
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
      postingsCount: storedPostingsCount,
      llmNormalizedCount: 0,
      baselineOnly: currentRequirements.length === 0 && userPostingRequirements.length === 0,
      fetchedAt: query.last_fetched_at
    }
  }
}
