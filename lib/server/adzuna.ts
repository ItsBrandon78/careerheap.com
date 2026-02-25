export interface AdzunaFetchOptions {
  role: string
  location: string
  country?: string
  page?: number
  resultsPerPage?: number
}

export interface AdzunaJob {
  provider: 'adzuna'
  providerJobId: string
  title: string | null
  company: string | null
  location: string | null
  description: string | null
  category: string | null
  salaryMin: number | null
  salaryMax: number | null
  contractType: string | null
  postedAt: string | null
  sourceUrl: string | null
  raw: Record<string, unknown>
}

export interface AdzunaSearchResult {
  jobs: AdzunaJob[]
  page: number
  count: number
}

function asPositiveInt(input: string | undefined, fallback: number) {
  const parsed = Number.parseInt(input ?? '', 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return parsed
}

function adzunaConfig() {
  return {
    appId: process.env.ADZUNA_APP_ID?.trim() ?? '',
    appKey: process.env.ADZUNA_APP_KEY?.trim() ?? '',
    country: (process.env.ADZUNA_COUNTRY?.trim().toLowerCase() || 'ca'),
    resultsPerPage: asPositiveInt(process.env.ADZUNA_RESULTS_PER_PAGE, 50)
  }
}

export function isAdzunaConfigured() {
  const config = adzunaConfig()
  return Boolean(config.appId && config.appKey)
}

function normalizeJob(input: unknown): AdzunaJob | null {
  if (!input || typeof input !== 'object') return null
  const row = input as Record<string, unknown>
  const providerJobIdRaw = row.id ?? row.adref ?? row.redirect_url
  if (!providerJobIdRaw) return null

  const providerJobId = String(providerJobIdRaw).trim()
  if (!providerJobId) return null

  const company =
    row.company && typeof row.company === 'object'
      ? String((row.company as Record<string, unknown>).display_name ?? '').trim() || null
      : null
  const location =
    row.location && typeof row.location === 'object'
      ? String((row.location as Record<string, unknown>).display_name ?? '').trim() || null
      : null
  const category =
    row.category && typeof row.category === 'object'
      ? String((row.category as Record<string, unknown>).label ?? '').trim() || null
      : null

  const salaryMin = Number(row.salary_min)
  const salaryMax = Number(row.salary_max)

  return {
    provider: 'adzuna',
    providerJobId,
    title: typeof row.title === 'string' ? row.title.trim() || null : null,
    company,
    location,
    description: typeof row.description === 'string' ? row.description.trim() || null : null,
    category,
    salaryMin: Number.isFinite(salaryMin) ? salaryMin : null,
    salaryMax: Number.isFinite(salaryMax) ? salaryMax : null,
    contractType: typeof row.contract_type === 'string' ? row.contract_type.trim() || null : null,
    postedAt: typeof row.created === 'string' ? row.created : null,
    sourceUrl: typeof row.redirect_url === 'string' ? row.redirect_url : null,
    raw: row
  }
}

export async function fetchJobs(options: AdzunaFetchOptions): Promise<AdzunaSearchResult> {
  const config = adzunaConfig()
  if (!config.appId || !config.appKey) {
    throw new Error('Adzuna credentials are not configured.')
  }

  const country = (options.country ?? config.country).toLowerCase()
  const page = Math.max(1, options.page ?? 1)
  const resultsPerPage = Math.max(1, Math.min(100, options.resultsPerPage ?? config.resultsPerPage))

  const params = new URLSearchParams({
    app_id: config.appId,
    app_key: config.appKey,
    what: options.role.trim(),
    where: options.location.trim(),
    results_per_page: String(resultsPerPage),
    content_type: 'application/json'
  })

  const url = `https://api.adzuna.com/v1/api/jobs/${country}/search/${page}?${params.toString()}`
  const response = await fetch(url, {
    method: 'GET',
    cache: 'no-store',
    headers: {
      Accept: 'application/json'
    }
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`Adzuna request failed (${response.status}): ${body.slice(0, 240)}`)
  }

  const data = (await response.json()) as { results?: unknown[]; count?: number }
  const jobs = Array.isArray(data.results)
    ? data.results.map((row) => normalizeJob(row)).filter((row): row is AdzunaJob => Boolean(row))
    : []

  return {
    jobs,
    page,
    count: Number.isFinite(Number(data.count)) ? Number(data.count) : jobs.length
  }
}

export async function fetchJobsPaged(options: {
  role: string
  location: string
  country?: string
  maxPages?: number
  resultsPerPage?: number
}) {
  const maxPages = Math.max(1, Math.min(5, options.maxPages ?? 2))
  const all: AdzunaJob[] = []

  for (let page = 1; page <= maxPages; page += 1) {
    const result = await fetchJobs({
      role: options.role,
      location: options.location,
      country: options.country,
      page,
      resultsPerPage: options.resultsPerPage
    })
    all.push(...result.jobs)
    if (result.jobs.length === 0) break
  }

  return all
}
