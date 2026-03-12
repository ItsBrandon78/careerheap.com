import type { CareerPathwayProfile } from '@/lib/career-pathway/schema'
import { getCareerPathwayProfile } from '@/lib/server/careerPathwayProfiles'
import { createAdminClient } from '@/lib/supabase/admin'

type SourceType = 'verified' | 'estimate'

type TrainingCard = {
  name: string
  provider: string
  length?: string | null
  cost?: string | null
  modality?: string | null
  sourceUrl?: string | null
  sourceLabel: string
  sourceType: SourceType
}

type WageFallback = {
  currency: 'CAD' | 'USD'
  low: number | null
  median: number | null
  high: number | null
  sourceName: string
  sourceUrl?: string | null
  asOfDate: string
  region?: string | null
  sourceType: SourceType
}

type TradeFacts = {
  tradeCode?: string | null
  totalHours?: number | null
  onTheJobHours?: number | null
  inSchoolHours?: number | null
  academicStandard?: string | null
  certifyingExam?: string | null
  classification?: string | null
  sourceLabel?: string | null
}

export type PlannerSourceEnrichment = {
  trainingCards: TrainingCard[]
  wageFallback: WageFallback | null
  tradeFacts?: TradeFacts | null
  sourcePath: {
    training: 'table' | 'curated_profile' | 'web_search' | 'none'
    wage: 'table' | 'curated_profile' | 'web_search' | 'none'
  }
  cache: {
    hit: boolean
    expiresAt: string | null
  }
}

type EnrichmentArgs = {
  report: {
    careerPathwayProfile?: CareerPathwayProfile | null
    suggestedCareers?: Array<{
      salary?: {
        native?: {
          currency?: 'CAD' | 'USD'
          low?: number | null
          median?: number | null
          high?: number | null
          sourceName?: string | null
          sourceUrl?: string | null
          asOfDate?: string | null
          region?: string | null
        } | null
      }
    }>
  }
  location: string
  currentRole?: string
  targetRole: string
}

async function getEffectiveProfile(args: EnrichmentArgs) {
  if (args.report.careerPathwayProfile) return args.report.careerPathwayProfile
  return getCareerPathwayProfile({
    targetRole: args.targetRole,
    region: args.location
  })
}

const MODEL_DEFAULT = 'gpt-4.1-mini'
const OFFICIAL_FETCH_TIMEOUT_MS = 9000
const CACHE_TTL_HOURS = Number.parseInt(process.env.PLANNER_SOURCE_ENRICHMENT_TTL_HOURS?.trim() || '168', 10)
const snippetCache = new Map<string, string>()
const enrichmentCache = new Map<string, PlannerSourceEnrichment>()

const PROVINCE_CODE_BY_NAME: Array<{ code: string; match: RegExp }> = [
  { code: 'ON', match: /\bontario\b/i },
  { code: 'BC', match: /\bbritish columbia\b/i },
  { code: 'AB', match: /\balberta\b/i },
  { code: 'SK', match: /\bsaskatchewan\b/i },
  { code: 'MB', match: /\bmanitoba\b/i },
  { code: 'QC', match: /\bquebec\b/i },
  { code: 'NB', match: /\bnew brunswick\b/i },
  { code: 'NS', match: /\bnova scotia\b/i },
  { code: 'PE', match: /\bprince edward island\b/i },
  { code: 'NL', match: /\bnewfoundland\b|\blabrador\b/i },
  { code: 'YT', match: /\byukon\b/i },
  { code: 'NT', match: /\bnorthwest territories\b/i },
  { code: 'NU', match: /\bnunavut\b/i }
]

function inferProvinceCode(locationText: string) {
  for (const candidate of PROVINCE_CODE_BY_NAME) {
    if (candidate.match.test(locationText)) return candidate.code
  }
  return null
}

function normalizeRoleKey(value: string) {
  return cleanText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function deriveRoleCluster(value: string | undefined) {
  const normalized = normalizeRoleKey(value ?? '')
  if (!normalized) return 'all'
  if (/\b(chef|cook|kitchen|restaurant|hospitality|server|bartender)\b/.test(normalized)) return 'hospitality'
  if (/\b(electric|plumb|hvac|weld|millwright|mechanic|trade|construction|carpent)\b/.test(normalized)) return 'trades'
  if (/\b(nurse|doctor|therap|chiropract|care|medical|clinical|patient)\b/.test(normalized)) return 'healthcare'
  if (/\b(dispatch|warehouse|forklift|ship|receiv|logistics|supply)\b/.test(normalized)) return 'logistics'
  if (/\b(admin|office|coordinator|operations|assistant|scheduler)\b/.test(normalized)) return 'office'
  if (/\b(developer|engineer|data|analyst|ux|designer|software|it)\b/.test(normalized)) return 'tech'
  if (/\b(teacher|education|tutor|instructor|coach)\b/.test(normalized)) return 'education'
  return 'general'
}

function roleKeySimilarity(left: string, right: string) {
  const a = new Set(normalizeRoleKey(left).split(' ').filter(Boolean))
  const b = new Set(normalizeRoleKey(right).split(' ').filter(Boolean))
  if (a.size === 0 || b.size === 0) return 0
  let overlap = 0
  a.forEach((token) => {
    if (b.has(token)) overlap += 1
  })
  return overlap / Math.max(a.size, b.size, 1)
}

function providerNameFromUrl(url: string) {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./i, '')
    const parts = hostname.split('.')
    const base = parts.length >= 2 ? parts[0] : hostname
    return base.replace(/-/g, ' ').replace(/\b\w/g, (match) => match.toUpperCase())
  } catch {
    return 'Official provider listing'
  }
}

function cleanText(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

function toSnippet(html: string) {
  return cleanText(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&#39;|&apos;/gi, "'")
      .replace(/&quot;/gi, '"')
  ).slice(0, 12000)
}

async function fetchOfficialSnippet(url: string) {
  if (snippetCache.has(url)) return snippetCache.get(url) ?? ''
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), OFFICIAL_FETCH_TIMEOUT_MS)
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'CareerHeap Planner Source Enrichment'
      },
      cache: 'no-store'
    })
    if (!response.ok) return ''
    const html = await response.text()
    const snippet = toSnippet(html)
    snippetCache.set(url, snippet)
    return snippet
  } catch {
    return ''
  } finally {
    clearTimeout(timeout)
  }
}

async function callTrainingExtractionLlm(args: {
  targetRole: string
  province: string
  links: Array<{ title: string; url: string }>
  profile: CareerPathwayProfile
}) {
  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!apiKey || args.links.length === 0) return null

  const pages = (
    await Promise.all(
      args.links.slice(0, 3).map(async (link) => ({
        title: link.title,
        url: link.url,
        content: await fetchOfficialSnippet(link.url)
      }))
    )
  ).filter((item) => item.content)

  if (pages.length === 0) return null

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: process.env.OPENAI_PLANNER_SOURCE_MODEL?.trim() || MODEL_DEFAULT,
      temperature: 0.1,
      messages: [
        {
          role: 'system',
          content:
            'Extract structured training or school options from official source text only. Never invent provider names, cost, duration, modality, or dates. Return null for any field not clearly stated.'
        },
        {
          role: 'user',
          content: JSON.stringify({
            task: 'Extract up to 3 official training/provider records relevant to the selected target role and province.',
            target_role: args.targetRole,
            province: args.province,
            profile_title: args.profile.meta.title,
            source_pages: pages
          })
        }
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'planner_training_extraction',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              items: {
                type: 'array',
                maxItems: 3,
                items: {
                  type: 'object',
                  additionalProperties: false,
                  properties: {
                    name: { type: 'string' },
                    provider: { type: 'string' },
                    length: { type: ['string', 'null'] },
                    cost: { type: ['string', 'null'] },
                    modality: { type: ['string', 'null'] },
                    sourceUrl: { type: 'string' },
                    sourceLabel: { type: 'string' }
                  },
                  required: ['name', 'provider', 'length', 'cost', 'modality', 'sourceUrl', 'sourceLabel']
                }
              }
            },
            required: ['items']
          }
        }
      }
    })
  })

  if (!response.ok) return null
  const payload = await response.json()
  const content = payload?.choices?.[0]?.message?.content
  if (typeof content !== 'string') return null

  try {
    const parsed = JSON.parse(content) as { items?: TrainingCard[] }
    if (!Array.isArray(parsed.items)) return null
    return parsed.items
      .map((item) => ({
        ...item,
        sourceType: 'verified' as const
      }))
      .filter((item) => item.name && item.provider && item.sourceUrl)
      .slice(0, 3)
  } catch {
    return null
  }
}

function extractResponseText(payload: unknown) {
  if (payload && typeof payload === 'object') {
    const direct = (payload as { output_text?: unknown }).output_text
    if (typeof direct === 'string' && direct.trim()) return direct

    const output = (payload as { output?: unknown }).output
    if (Array.isArray(output)) {
      for (const item of output) {
        const content = item && typeof item === 'object' ? (item as { content?: unknown }).content : null
        if (!Array.isArray(content)) continue
        for (const part of content) {
          const text = part && typeof part === 'object' ? (part as { text?: unknown }).text : null
          if (typeof text === 'string' && text.trim()) return text
        }
      }
    }
  }
  return null
}

async function callResponsesWebSearchJson<T>(args: {
  task: string
  schemaName: string
  schema: Record<string, unknown>
  input: Record<string, unknown>
}) {
  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!apiKey) return null

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: process.env.OPENAI_PLANNER_SOURCE_MODEL?.trim() || MODEL_DEFAULT,
      tools: [{ type: 'web_search' }],
      input: JSON.stringify({
        task: args.task,
        ...args.input
      }),
      text: {
        format: {
          type: 'json_schema',
          name: args.schemaName,
          strict: true,
          schema: args.schema
        }
      }
    })
  })

  if (!response.ok) return null
  const payload = await response.json()
  const text = extractResponseText(payload)
  if (!text) return null

  try {
    return JSON.parse(text) as T
  } catch {
    return null
  }
}

async function callTrainingWebSearch(args: {
  targetRole: string
  province: string
}) {
  const result = await callResponsesWebSearchJson<{
    items: Array<{
      name: string
      provider: string
      length: string | null
      cost: string | null
      modality: string | null
      sourceUrl: string
      sourceLabel: string
    }>
  }>({
    task: 'Find official or provider-backed training options relevant to this target role and province.',
    schemaName: 'planner_training_web_search',
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        items: {
          type: 'array',
          maxItems: 3,
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              name: { type: 'string' },
              provider: { type: 'string' },
              length: { type: ['string', 'null'] },
              cost: { type: ['string', 'null'] },
              modality: { type: ['string', 'null'] },
              sourceUrl: { type: 'string' },
              sourceLabel: { type: 'string' }
            },
            required: ['name', 'provider', 'length', 'cost', 'modality', 'sourceUrl', 'sourceLabel']
          }
        }
      },
      required: ['items']
    },
    input: {
      hard_rules: [
        'Prefer official provincial government, regulator, apprenticeship, college, or certified provider pages.',
        'Do not invent provider names, tuition, or duration.',
        'Return null for any field not clearly found on a source page.',
        'Only include records with a real sourceUrl.'
      ],
      province: args.province,
      target_role: args.targetRole
    }
  })

  if (!result?.items?.length) return null
  return result.items
    .filter((item) => item.name && item.provider && item.sourceUrl)
    .slice(0, 3)
    .map((item) => ({
      ...item,
      sourceType: 'verified' as const
    }))
}

async function callWageWebSearch(args: {
  targetRole: string
  province: string
}) {
  const result = await callResponsesWebSearchJson<{
    wage: {
      currency: 'CAD' | 'USD'
      low: number | null
      median: number | null
      high: number | null
      sourceName: string
      sourceUrl: string
      sourceType: SourceType
    } | null
  }>({
    task: 'Find a defensible wage range for this target role and province.',
    schemaName: 'planner_wage_web_search',
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        wage: {
          type: ['object', 'null'],
          additionalProperties: false,
          properties: {
            currency: { type: 'string', enum: ['CAD', 'USD'] },
            low: { type: ['number', 'null'] },
            median: { type: ['number', 'null'] },
            high: { type: ['number', 'null'] },
            sourceName: { type: 'string' },
            sourceUrl: { type: 'string' },
            sourceType: { type: 'string', enum: ['verified', 'estimate'] }
          },
          required: ['currency', 'low', 'median', 'high', 'sourceName', 'sourceUrl', 'sourceType']
        }
      },
      required: ['wage']
    },
    input: {
      hard_rules: [
        'Prefer Job Bank, provincial government, regulator, or official apprenticeship wage sources.',
        'If only a reputable external wage source exists, mark sourceType as estimate.',
        'Wage values should be hourly if possible.',
        'Do not invent numbers. Return null wage if no credible source is found.'
      ],
      province: args.province,
      target_role: args.targetRole
    }
  })

  return result?.wage ?? null
}

function deterministicTrainingFallback(profile: CareerPathwayProfile) {
  const links = profile.resources.training.slice(0, 3)
  const employableWindow =
    profile.timeline.time_to_employable?.min_weeks && profile.timeline.time_to_employable?.max_weeks
      ? `${profile.timeline.time_to_employable.min_weeks}-${profile.timeline.time_to_employable.max_weeks} weeks to first employable milestone`
      : null

  return links.map((link, index) => ({
    name: link.title,
    provider: providerNameFromUrl(link.url),
    length: index === 0 ? employableWindow : null,
    cost: null,
    modality: null,
    sourceUrl: link.url,
    sourceLabel: `Official source: ${link.title}`,
    sourceType: 'verified' as const
  }))
}

async function resolveTrainingCards(args: EnrichmentArgs) {
  const profile = await getEffectiveProfile(args)
  const province = inferProvinceCode(args.location) ?? profile?.meta.jurisdiction.region ?? 'CA'
  if (profile) {
    const trainingLinks = Array.isArray(profile.resources?.training) ? profile.resources.training : []
    if (trainingLinks.length > 0) {
      const llmItems = await callTrainingExtractionLlm({
        targetRole: args.targetRole,
        province,
        links: trainingLinks.slice(0, 3),
        profile
      })
      if (llmItems && llmItems.length > 0) {
        return { items: llmItems, sourcePath: 'curated_profile' as const }
      }
      return { items: deterministicTrainingFallback(profile), sourcePath: 'curated_profile' as const }
    }
  }

  const webSearchItems = await callTrainingWebSearch({
    targetRole: args.targetRole,
    province
  })
  return {
    items: webSearchItems ?? [],
    sourcePath: webSearchItems && webSearchItems.length > 0 ? ('web_search' as const) : ('none' as const)
  }
}

async function resolveWageFallback(args: EnrichmentArgs): Promise<WageFallback | null> {
  const existingNative = args.report.suggestedCareers?.[0]?.salary?.native
  if (existingNative?.low || existingNative?.median || existingNative?.high) {
    return {
      currency: existingNative.currency ?? 'CAD',
      low: existingNative.low ?? null,
      median: existingNative.median ?? null,
      high: existingNative.high ?? null,
      sourceName: existingNative.sourceName ?? 'occupation_wages',
      sourceUrl: existingNative.sourceUrl ?? null,
      asOfDate: existingNative.asOfDate ?? new Date().toISOString(),
      region: existingNative.region ?? inferProvinceCode(args.location) ?? 'CA',
      sourceType: 'verified'
    }
  }

  const profile = await getEffectiveProfile(args)
  const selectedProvince = inferProvinceCode(args.location)
  if (profile) {
    const profileRow =
      (Array.isArray(profile.wages_by_province) && selectedProvince
        ? profile.wages_by_province.find((item) => item.province.toUpperCase() === selectedProvince)
        : null) ??
      profile.wages_by_province?.[0] ??
      null

    if (profileRow) {
      const jobSearchLink =
        profile.resources?.job_search?.find((item) => /wage|job bank/i.test(item.title)) ??
        profile.resources?.job_search?.[0] ??
        null

      return {
        currency: 'CAD',
        low: profileRow.low_hourly_cad,
        median: profileRow.median_hourly_cad,
        high: profileRow.high_hourly_cad,
        sourceName: profileRow.source,
        sourceUrl: jobSearchLink?.url ?? null,
        asOfDate: profile.meta.last_verified,
        region: profileRow.province,
        sourceType: 'verified'
      }
    }
  }

  const webSearchWage = await callWageWebSearch({
    targetRole: args.targetRole,
    province: selectedProvince ?? 'CA'
  })
  if (!webSearchWage) return null

  return {
    currency: webSearchWage.currency,
    low: webSearchWage.low,
    median: webSearchWage.median,
    high: webSearchWage.high,
    sourceName: webSearchWage.sourceName,
    sourceUrl: webSearchWage.sourceUrl,
    asOfDate: new Date().toISOString(),
    region: selectedProvince ?? 'CA',
    sourceType: webSearchWage.sourceType
  }
}

function inferWageSourcePath(
  args: EnrichmentArgs,
  profile: CareerPathwayProfile | null,
  wageFallback: WageFallback | null
) {
  const existingNative = args.report.suggestedCareers?.[0]?.salary?.native
  if (existingNative?.low || existingNative?.median || existingNative?.high) return 'table' as const
  if (wageFallback?.sourceUrl && profile) return 'curated_profile' as const
  if (wageFallback?.sourceUrl) return 'web_search' as const
  return 'none' as const
}

function cacheExpiresAt() {
  const expires = new Date()
  expires.setHours(expires.getHours() + (Number.isFinite(CACHE_TTL_HOURS) ? CACHE_TTL_HOURS : 168))
  return expires.toISOString()
}

async function readPersistentCache(cacheKey: string, args: EnrichmentArgs) {
  try {
    const admin = createAdminClient()
    const roleCache = await admin
      .from('planner_role_enrichment_cache')
      .select('enrichment_payload, expires_at')
      .eq('cache_key', cacheKey)
      .maybeSingle()

    if (!roleCache.error && roleCache.data?.enrichment_payload && roleCache.data?.expires_at) {
      const expiresAt = new Date(roleCache.data.expires_at)
      if (!Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() > Date.now()) {
        const payload = roleCache.data.enrichment_payload as PlannerSourceEnrichment
        return {
          ...payload,
          cache: {
            hit: true,
            expiresAt: roleCache.data.expires_at
          }
        } satisfies PlannerSourceEnrichment
      }
    }

    const provinceCode = inferProvinceCode(args.location) ?? 'CA'
    const currentRoleCluster = deriveRoleCluster(args.currentRole)
    const roleCacheCandidates = await admin
      .from('planner_role_enrichment_cache')
      .select('target_role_key,target_role,enrichment_payload,expires_at,current_role_cluster')
      .eq('province_code', provinceCode)
      .in('current_role_cluster', [currentRoleCluster, 'all'])
      .order('expires_at', { ascending: false })
      .limit(30)

    if (!roleCacheCandidates.error && Array.isArray(roleCacheCandidates.data) && roleCacheCandidates.data.length > 0) {
      const winner = roleCacheCandidates.data
        .map((row) => ({
          row,
          score: Math.max(
            roleKeySimilarity(args.targetRole, String(row.target_role ?? '')),
            roleKeySimilarity(args.targetRole, String(row.target_role_key ?? ''))
          )
        }))
        .filter((item) => {
          const expiresAt = new Date(String(item.row.expires_at ?? ''))
          return !Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() > Date.now() && item.score >= 0.55
        })
        .sort((left, right) => right.score - left.score)[0]

      if (winner?.row?.enrichment_payload) {
        return {
          ...(winner.row.enrichment_payload as PlannerSourceEnrichment),
          cache: {
            hit: true,
            expiresAt: String(winner.row.expires_at ?? null)
          }
        } satisfies PlannerSourceEnrichment
      }
    }

    const legacyCache = await admin
      .from('planner_source_enrichment_cache')
      .select('enrichment_payload, expires_at')
      .eq('cache_key', cacheKey)
      .maybeSingle()

    if (legacyCache.error || !legacyCache.data?.enrichment_payload || !legacyCache.data?.expires_at) return null
    const expiresAt = new Date(legacyCache.data.expires_at)
    if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) return null

    const payload = legacyCache.data.enrichment_payload as PlannerSourceEnrichment
    return {
      ...payload,
      cache: {
        hit: true,
        expiresAt: legacyCache.data.expires_at
      }
    } satisfies PlannerSourceEnrichment
  } catch {
    return null
  }
}

function readMemoryCache(cacheKey: string) {
  const cached = enrichmentCache.get(cacheKey)
  if (!cached) return null

  const expiresAt = cached.cache.expiresAt ? new Date(cached.cache.expiresAt) : null
  if (!expiresAt || Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
    enrichmentCache.delete(cacheKey)
    return null
  }

  return {
    ...cached,
    cache: {
      hit: true,
      expiresAt: cached.cache.expiresAt
    }
  } satisfies PlannerSourceEnrichment
}

async function writePersistentCache(
  cacheKey: string,
  args: EnrichmentArgs,
  profile: CareerPathwayProfile | null,
  enrichment: PlannerSourceEnrichment
) {
  try {
    const admin = createAdminClient()
    const sourceUrls = Array.from(
      new Set(
        [
          ...enrichment.trainingCards.map((card) => card.sourceUrl).filter(Boolean),
          enrichment.wageFallback?.sourceUrl ?? null
        ].filter((value): value is string => Boolean(value))
      )
    )
    const provinceCode = inferProvinceCode(args.location) ?? 'CA'
    const targetRoleKey = normalizeRoleKey(args.targetRole)
    const currentRoleCluster = deriveRoleCluster(args.currentRole)
    const expiresAt = enrichment.cache.expiresAt ?? cacheExpiresAt()

    await admin.from('planner_role_enrichment_cache').upsert(
      {
        cache_key: cacheKey,
        target_role_key: targetRoleKey,
        province_code: provinceCode,
        current_role_cluster: currentRoleCluster,
        target_role: args.targetRole,
        source_current_role: args.currentRole ?? null,
        profile_slug: profile?.meta.slug ?? null,
        training_source_path: enrichment.sourcePath.training,
        wage_source_path: enrichment.sourcePath.wage,
        source_urls: sourceUrls,
        enrichment_payload: enrichment,
        retrieved_at: new Date().toISOString(),
        expires_at: expiresAt,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'cache_key' }
    )

    await admin.from('planner_source_enrichment_cache').upsert(
      {
        cache_key: cacheKey,
        target_role: args.targetRole,
        province: provinceCode,
        profile_slug: profile?.meta.slug ?? null,
        training_source_path: enrichment.sourcePath.training,
        wage_source_path: enrichment.sourcePath.wage,
        enrichment_payload: enrichment,
        expires_at: expiresAt,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'cache_key' }
    )
  } catch {
    // cache table may not exist yet; keep runtime behavior safe
  }
}

export async function getPlannerSourceEnrichment(args: EnrichmentArgs): Promise<PlannerSourceEnrichment> {
  const profile = await getEffectiveProfile(args)
  const cacheKey = [
    normalizeRoleKey(args.targetRole) || profile?.meta.slug || 'no-profile',
    inferProvinceCode(args.location) ?? 'CA',
    deriveRoleCluster(args.currentRole),
    args.targetRole.trim().toLowerCase()
  ].join('::')

  const memoryCache = readMemoryCache(cacheKey)
  if (memoryCache) return memoryCache

  const persistentCache = await readPersistentCache(cacheKey, args)
  if (persistentCache) {
    enrichmentCache.set(cacheKey, persistentCache)
    return persistentCache
  }

  const resolvedTraining = await resolveTrainingCards(args)
  const wageFallback = await resolveWageFallback(args)

  const enrichment: PlannerSourceEnrichment = {
    trainingCards: resolvedTraining.items,
    wageFallback,
    sourcePath: {
      training: resolvedTraining.sourcePath,
      wage: inferWageSourcePath(args, profile, wageFallback)
    },
    cache: {
      hit: false,
      expiresAt: cacheExpiresAt()
    }
  }

  enrichmentCache.set(cacheKey, enrichment)
  await writePersistentCache(cacheKey, args, profile, enrichment)
  return enrichment
}
