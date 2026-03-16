import type { CareerPathwayProfile } from '@/lib/career-pathway/schema'
import type { CareerPathType } from '@/lib/transition/types'
import { getCareerPathwayProfile } from '@/lib/server/careerPathwayProfiles'
import { createAdminClient } from '@/lib/supabase/admin'

type SourceType = 'verified' | 'estimate' | 'derived'

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

type CertificationCard = {
  name: string
  provider: string
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

type EntryRoleSuggestion = {
  title: string
  sourceUrl?: string | null
  sourceLabel: string
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
  certificationCards: CertificationCard[]
  wageFallback: WageFallback | null
  tradeFacts?: TradeFacts | null
  entryRoles: EntryRoleSuggestion[]
  sourcePath: {
    training: 'table' | 'curated_profile' | 'web_search' | 'none'
    wage: 'table' | 'curated_profile' | 'web_search' | 'none'
    entryRoles: 'table' | 'curated_profile' | 'web_search' | 'none'
    certifications: 'table' | 'curated_profile' | 'web_search' | 'none'
  }
  cache: {
    hit: boolean
    expiresAt: string | null
  }
}

type EnrichmentArgs = {
  report: {
    careerPathwayProfile?: CareerPathwayProfile | null
    targetRequirements?: {
      certifications?: string[] | null
      hardGates?: string[] | null
    } | null
    transitionReport?: {
      marketSnapshot?: {
        topRequirements?: Array<{ label?: string | null }> | null
      } | null
      mustHaves?: Array<{ label?: string | null }> | null
    } | null
    transitionStructuredPlan?: {
      required_certifications?: string[] | null
      requiredCertifications?: string[] | null
    } | null
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
  canonicalRoleKey?: string | null
  careerPathType?: CareerPathType | null
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
const THIN_COVERAGE_TTL_HOURS = Number.parseInt(
  process.env.PLANNER_SOURCE_ENRICHMENT_THIN_TTL_HOURS?.trim() || '6',
  10
)
const ENRICHMENT_CACHE_SCHEMA_VERSION = 'v4-certification-enrichment-expanded'
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

function normalizeCachedEnrichment(payload: Partial<PlannerSourceEnrichment> | null | undefined): PlannerSourceEnrichment {
  return {
    trainingCards: Array.isArray(payload?.trainingCards) ? payload.trainingCards : [],
    certificationCards: Array.isArray(payload?.certificationCards) ? payload.certificationCards : [],
    wageFallback: payload?.wageFallback ?? null,
    tradeFacts: payload?.tradeFacts ?? null,
    entryRoles: Array.isArray(payload?.entryRoles)
      ? payload.entryRoles
          .filter(
            (item): item is EntryRoleSuggestion =>
              Boolean(item) && typeof item === 'object' && typeof (item as { title?: unknown }).title === 'string'
          )
          .slice(0, 3)
      : [],
    sourcePath: {
      training: payload?.sourcePath?.training ?? 'none',
      wage: payload?.sourcePath?.wage ?? 'none',
      entryRoles: payload?.sourcePath?.entryRoles ?? 'none',
      certifications: payload?.sourcePath?.certifications ?? 'none'
    },
    cache: {
      hit: Boolean(payload?.cache?.hit),
      expiresAt: payload?.cache?.expiresAt ?? null
    }
  }
}

function hasThinCoverage(enrichment: PlannerSourceEnrichment) {
  const noTraining = !Array.isArray(enrichment.trainingCards) || enrichment.trainingCards.length === 0
  const noCertifications =
    !Array.isArray(enrichment.certificationCards) || enrichment.certificationCards.length === 0
  const noEntryRoles = !Array.isArray(enrichment.entryRoles) || enrichment.entryRoles.length === 0
  const sourceNone =
    enrichment.sourcePath.training === 'none' &&
    enrichment.sourcePath.certifications === 'none' &&
    enrichment.sourcePath.entryRoles === 'none'

  return noTraining && noCertifications && noEntryRoles && sourceNone
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

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    const compactError = errorText.replace(/\s+/g, ' ').slice(0, 240)
    console.warn('[planner-source-enrichment] web_search_failed', {
      status: response.status,
      schemaName: args.schemaName,
      detail: compactError || 'no_error_body'
    })
    return null
  }
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

const ENTRY_ROLE_PATTERNS: Array<{ pattern: RegExp; title: string }> = [
  { pattern: /\bindustrial maintenance helper\b/i, title: 'Industrial Maintenance Helper' },
  { pattern: /\belectrical labourer\b|\belectrical laborer\b/i, title: 'Electrical Labourer' },
  { pattern: /\belectrical helper\b/i, title: 'Electrical Helper' },
  { pattern: /\bmaintenance technician\b/i, title: 'Maintenance Technician' },
  { pattern: /\bmaintenance helper\b/i, title: 'Maintenance Helper' },
  { pattern: /\bmaintenance assistant\b/i, title: 'Maintenance Assistant' },
  { pattern: /\bautomation technician assistant\b/i, title: 'Automation Technician Assistant' },
  { pattern: /\bpre[- ]apprentice\b/i, title: 'Pre-Apprentice' },
  { pattern: /\bapprentice[- ]entry\b/i, title: 'Apprentice Entry Role' },
  { pattern: /\bhelper\b/i, title: 'Helper' },
  { pattern: /\blabourer\b|\blaborer\b/i, title: 'Labourer' }
]

function uniqueCertificationCards(items: CertificationCard[]) {
  const seen = new Set<string>()
  const output: CertificationCard[] = []
  for (const item of items) {
    const key = cleanText(String(item.name ?? ''))
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
    if (!key || seen.has(key)) continue
    seen.add(key)
    output.push({
      name: cleanText(item.name),
      provider: cleanText(item.provider || 'Official requirement source'),
      sourceUrl: item.sourceUrl ?? null,
      sourceLabel: cleanText(item.sourceLabel || 'Official source'),
      sourceType: item.sourceType
    })
  }
  return output
}

function deriveCertificationCardsFromProfile(profile: CareerPathwayProfile | null): CertificationCard[] {
  if (!profile) return []

  const starterBundle = Array.isArray(profile.requirements?.starter_cert_bundle)
    ? profile.requirements.starter_cert_bundle
    : []

  const starterItems: CertificationCard[] = starterBundle
    .map((item) => ({
      name: cleanText(String(item?.name ?? '')),
      provider: cleanText(String(item?.provider ?? 'Official requirement source')),
      sourceUrl: item?.source_url ?? null,
      sourceLabel: cleanText(String(item?.source_title ?? 'Career pathway profile')),
      sourceType: 'verified' as const
    }))
    .filter((item) => item.name)

  const mustHave = Array.isArray(profile.requirements?.must_have) ? profile.requirements.must_have : []
  const mustHaveItems: CertificationCard[] = mustHave
    .filter((item) =>
      /certif|licen[cs]e|registration|exam|permit|accredit/i.test(String(item?.type ?? '')) ||
      /certif|licen[cs]e|registration|exam|permit|accredit/i.test(String(item?.name ?? ''))
    )
    .map((item) => {
      const record = item as Record<string, unknown>
      return {
        name: cleanText(String(record.name ?? '')),
        provider: cleanText(String(record.provider ?? 'Official requirement source')),
        sourceUrl: typeof record.source_url === 'string' ? record.source_url : null,
        sourceLabel: cleanText(String(record.source_title ?? 'Career pathway profile')),
        sourceType: 'verified' as const
      }
    })
    .filter((item) => item.name)

  return uniqueCertificationCards([...starterItems, ...mustHaveItems]).slice(0, 5)
}

const GENERIC_CERTIFICATION_LINES = [
  /confirm regional licensing and certification requirements before applying/i,
  /obtain required certification with active status/i,
  /required certification/i,
  /licensing and certification requirements/i
]

function isCertificationSignal(value: string) {
  return /\b(certif|licen[cs]e|registration|exam|permit|clearance|accredit|cpr|bls|acls|whmis|loto|first aid|safety|board|designation)\b/i.test(
    value
  )
}

function isGenericCertificationLine(value: string) {
  return GENERIC_CERTIFICATION_LINES.some((pattern) => pattern.test(value))
}

function certificationSignalNamesFromText(value: string) {
  const normalized = cleanText(value)
  if (!normalized) return []

  const signals: string[] = []
  const push = (item: string) => {
    const cleaned = cleanText(item)
    if (!cleaned) return
    if (signals.some((existing) => existing.toLowerCase() === cleaned.toLowerCase())) return
    signals.push(cleaned)
  }

  if (/\bwhmis\b/i.test(normalized)) push('WHMIS')
  if (/\bworking at heights?\b/i.test(normalized)) push('Working at Heights')
  if (/\b(first aid|standard first aid)\b/i.test(normalized)) push('Standard First Aid')
  if (/\bcpr\b/i.test(normalized)) push('CPR')
  if (/\bbls\b/i.test(normalized)) push('BLS')
  if (/\bacls\b/i.test(normalized)) push('ACLS')
  if (/\bnclex(?:-rn)?\b/i.test(normalized)) push('NCLEX-RN')
  if (/\bcpnre\b/i.test(normalized)) push('CPNRE')
  if (/\bred seal\b/i.test(normalized)) push('Red Seal certification')

  const tradeCodeMatch = normalized.match(/\b(\d{3}[a-z])\b/i)
  if (tradeCodeMatch?.[1]) push(`${tradeCodeMatch[1].toUpperCase()} trade certification`)

  const boardRegistrationMatch = normalized.match(/\b([a-z][a-z&/.\-\s]{2,70})\s+registration\b/i)
  if (boardRegistrationMatch?.[1]) {
    const body = cleanText(boardRegistrationMatch[1]).replace(/^with\s+/i, '')
    if (body && body.length < 60) push(`${body} registration`)
  }

  return signals.slice(0, 5)
}

function deriveCertificationCardsFromReport(report: EnrichmentArgs['report']) {
  const targetRequirements = report.targetRequirements ?? null
  const transitionReport = report.transitionReport ?? null
  const transitionStructuredPlan = report.transitionStructuredPlan ?? null
  const marketTopRequirements = Array.isArray(transitionReport?.marketSnapshot?.topRequirements)
    ? transitionReport.marketSnapshot.topRequirements
    : []
  const mustHaves = Array.isArray(transitionReport?.mustHaves) ? transitionReport.mustHaves : []
  const structuredPlanCertifications = [
    ...(Array.isArray(transitionStructuredPlan?.required_certifications)
      ? transitionStructuredPlan.required_certifications
      : []),
    ...(Array.isArray(transitionStructuredPlan?.requiredCertifications)
      ? transitionStructuredPlan.requiredCertifications
      : [])
  ]

  const candidates = uniqueCertificationCards(
    [
      ...(Array.isArray(targetRequirements?.certifications) ? targetRequirements.certifications : []).map((item) => ({
        name: cleanText(String(item ?? '')),
        provider: 'Employer evidence',
        sourceUrl: null,
        sourceLabel: 'Employer evidence',
        sourceType: 'derived' as const
      })),
      ...(Array.isArray(targetRequirements?.hardGates) ? targetRequirements.hardGates : []).map((item) => ({
        name: cleanText(String(item ?? '')),
        provider: 'Employer evidence',
        sourceUrl: null,
        sourceLabel: 'Employer evidence',
        sourceType: 'derived' as const
      })),
      ...marketTopRequirements.map((item) => ({
        name: cleanText(String(item?.label ?? '')),
        provider: 'Employer evidence',
        sourceUrl: null,
        sourceLabel: 'Employer evidence',
        sourceType: 'derived' as const
      })),
      ...mustHaves.map((item) => ({
        name: cleanText(String(item?.label ?? '')),
        provider: 'Employer evidence',
        sourceUrl: null,
        sourceLabel: 'Employer evidence',
        sourceType: 'derived' as const
      })),
      ...structuredPlanCertifications.map((item) => ({
        name: cleanText(String(item ?? '')),
        provider: 'Plan synthesis',
        sourceUrl: null,
        sourceLabel: 'Structured plan requirements',
        sourceType: 'derived' as const
      })),
      ...[
        ...(Array.isArray(targetRequirements?.certifications) ? targetRequirements.certifications : []),
        ...(Array.isArray(targetRequirements?.hardGates) ? targetRequirements.hardGates : []),
        ...marketTopRequirements.map((item) => String(item?.label ?? '')),
        ...mustHaves.map((item) => String(item?.label ?? '')),
        ...structuredPlanCertifications
      ]
        .flatMap((item) => certificationSignalNamesFromText(String(item ?? '')))
        .map((item) => ({
          name: item,
          provider: 'Requirement signal',
          sourceUrl: null,
          sourceLabel: 'Requirement signal extraction',
          sourceType: 'derived' as const
        }))
    ].filter((item) => item.name)
  )

  return candidates
    .filter((item) => isCertificationSignal(item.name) && !isGenericCertificationLine(item.name))
    .slice(0, 5)
}

function deriveEntryRolesFromProfile(profile: CareerPathwayProfile | null) {
  if (!profile || !Array.isArray(profile.entry_paths)) return []
  const searchText = profile.entry_paths
    .flatMap((entryPath) => (Array.isArray(entryPath?.steps) ? entryPath.steps : []))
    .map((step) => cleanText(String(step ?? '')))
    .join(' \n ')

  const sourceUrl =
    profile.resources?.job_search?.[0]?.url ??
    profile.resources?.official?.[0]?.url ??
    profile.resources?.training?.[0]?.url ??
    null
  const sourceLabel =
    profile.resources?.job_search?.[0]?.title ??
    profile.resources?.official?.[0]?.title ??
    profile.resources?.training?.[0]?.title ??
    'Career pathway profile'

  return ENTRY_ROLE_PATTERNS.filter((item) => item.pattern.test(searchText))
    .map((item) => ({
      title: item.title,
      sourceUrl,
      sourceLabel,
      sourceType: 'verified' as const
    }))
    .slice(0, 3)
}

async function callEntryRoleWebSearch(args: {
  targetRole: string
  province: string
}) {
  const result = await callResponsesWebSearchJson<{
    items: Array<{
      title: string
      sourceUrl: string
      sourceLabel: string
    }>
  }>({
    task: 'Find realistic entry-role job titles people use to enter this trade or role in the selected province.',
    schemaName: 'planner_entry_role_web_search',
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
              title: { type: 'string' },
              sourceUrl: { type: 'string' },
              sourceLabel: { type: 'string' }
            },
            required: ['title', 'sourceUrl', 'sourceLabel']
          }
        }
      },
      required: ['items']
    },
    input: {
      hard_rules: [
        'Prefer provincial apprenticeship pages, Job Bank, unions, regulators, or employer career pages.',
        'Return entry door job titles only, not generic advice sentences.',
        'Do not invent job titles. Every title must be supported by a source page.',
        'Do not use Reddit, forums, or blogs.'
      ],
      province: args.province,
      target_role: args.targetRole
    }
  })

  if (!result?.items?.length) return null
  return result.items
    .filter((item) => item.title && item.sourceUrl)
    .slice(0, 3)
    .map((item) => ({
      title: cleanText(item.title),
      sourceUrl: item.sourceUrl,
      sourceLabel: item.sourceLabel,
      sourceType: 'verified' as const
    }))
}

async function callCertificationWebSearch(args: {
  targetRole: string
  province: string
  careerPathType?: CareerPathType | null
}) {
  const result = await callResponsesWebSearchJson<{
    items: Array<{
      name: string
      provider: string
      sourceUrl: string
      sourceLabel: string
    }>
  }>({
    task: 'Find role-relevant certifications or licensing checkpoints for this target role and province from official sources.',
    schemaName: 'planner_certification_web_search',
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        items: {
          type: 'array',
          maxItems: 5,
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              name: { type: 'string' },
              provider: { type: 'string' },
              sourceUrl: { type: 'string' },
              sourceLabel: { type: 'string' }
            },
            required: ['name', 'provider', 'sourceUrl', 'sourceLabel']
          }
        }
      },
      required: ['items']
    },
    input: {
      hard_rules: [
        'Prefer official provincial government, regulator, licensing body, apprenticeship authority, or official college/training pages.',
        'Do not invent certifications, providers, or links.',
        'Do not use Reddit, forums, or blogs.',
        'Return concise certification/checkpoint names only.'
      ],
      province: args.province,
      target_role: args.targetRole,
      career_path_type: args.careerPathType ?? 'GENERAL'
    }
  })

  if (!result?.items?.length) return null
  return uniqueCertificationCards(
    result.items
      .filter((item) => item.name && item.sourceUrl)
      .map((item) => ({
        name: cleanText(item.name),
        provider: cleanText(item.provider || 'Official requirement source'),
        sourceUrl: item.sourceUrl,
        sourceLabel: cleanText(item.sourceLabel || 'Official source'),
        sourceType: 'verified' as const
      }))
  ).slice(0, 5)
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

async function resolveEntryRoles(args: EnrichmentArgs) {
  if (args.careerPathType && args.careerPathType !== 'TRADES') {
    return { items: [], sourcePath: 'none' as const }
  }

  const profile = await getEffectiveProfile(args)
  const province = inferProvinceCode(args.location) ?? profile?.meta.jurisdiction.region ?? 'CA'
  const profileEntryRoles = deriveEntryRolesFromProfile(profile)
  if (profileEntryRoles.length > 0) {
    return { items: profileEntryRoles, sourcePath: 'curated_profile' as const }
  }

  const webSearchItems = await callEntryRoleWebSearch({
    targetRole: args.targetRole,
    province
  })
  return {
    items: webSearchItems ?? [],
    sourcePath: webSearchItems && webSearchItems.length > 0 ? ('web_search' as const) : ('none' as const)
  }
}

async function resolveCertificationCards(args: EnrichmentArgs) {
  const reportDerivedCards = deriveCertificationCardsFromReport(args.report)
  const profile = await getEffectiveProfile(args)
  const province = inferProvinceCode(args.location) ?? profile?.meta.jurisdiction.region ?? 'CA'
  const existingCertifications = uniqueCertificationCards([
    ...reportDerivedCards,
    ...(Array.isArray(args.report?.targetRequirements?.certifications)
      ? args.report.targetRequirements.certifications
          .map((item) => cleanText(String(item ?? '')))
          .filter((item) => item && isCertificationSignal(item) && !isGenericCertificationLine(item))
          .map((name) => ({
            name,
            provider: 'Target requirement source',
            sourceUrl: null,
            sourceLabel: 'Employer or requirement evidence',
            sourceType: 'derived' as const
          }))
      : [])
  ])
  const profileCards = deriveCertificationCardsFromProfile(profile)
  const mergedBaseCards = uniqueCertificationCards([
    ...existingCertifications,
    ...profileCards
  ])

  if (mergedBaseCards.length >= 3) {
    return {
      items: mergedBaseCards.slice(0, 5),
      sourcePath:
        existingCertifications.length > 0
          ? ('table' as const)
          : profileCards.length > 0
            ? ('curated_profile' as const)
            : ('none' as const)
    }
  }

  const webSearchCards = await callCertificationWebSearch({
    targetRole: args.targetRole,
    province,
    careerPathType: args.careerPathType
  })

  if (webSearchCards && webSearchCards.length > 0) {
    return {
      items: uniqueCertificationCards([
        ...mergedBaseCards,
        ...webSearchCards
      ]).slice(0, 5),
      sourcePath: 'web_search' as const
    }
  }

  return {
    items: mergedBaseCards.slice(0, 5),
    sourcePath:
      existingCertifications.length > 0
        ? ('table' as const)
        : profileCards.length > 0
          ? ('curated_profile' as const)
          : ('none' as const)
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

function cacheExpiresAt(isThinCoverage = false) {
  const expires = new Date()
  const ttlHours = isThinCoverage
    ? (Number.isFinite(THIN_COVERAGE_TTL_HOURS) ? THIN_COVERAGE_TTL_HOURS : 6)
    : (Number.isFinite(CACHE_TTL_HOURS) ? CACHE_TTL_HOURS : 168)
  expires.setHours(expires.getHours() + ttlHours)
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
        const payload = normalizeCachedEnrichment(roleCache.data.enrichment_payload as Partial<PlannerSourceEnrichment>)
        if (hasThinCoverage(payload)) {
          return null
        }
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
    const canonicalRoleKey = args.canonicalRoleKey?.trim().toLowerCase() || ''
    const roleCacheCandidates = canonicalRoleKey
      ? await admin
          .from('planner_role_enrichment_cache')
          .select('target_role_key,target_role,enrichment_payload,expires_at,current_role_cluster')
          .eq('province_code', provinceCode)
          .eq('target_role_key', canonicalRoleKey)
          .in('current_role_cluster', [currentRoleCluster, 'all'])
          .order('expires_at', { ascending: false })
          .limit(30)
      : await admin
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
        const payload = normalizeCachedEnrichment(winner.row.enrichment_payload as Partial<PlannerSourceEnrichment>)
        if (hasThinCoverage(payload)) {
          return null
        }
        return {
          ...payload,
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

    const payload = normalizeCachedEnrichment(legacyCache.data.enrichment_payload as Partial<PlannerSourceEnrichment>)
    if (hasThinCoverage(payload)) {
      return null
    }
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

  const payload = normalizeCachedEnrichment(cached)
  if (hasThinCoverage(payload)) {
    enrichmentCache.delete(cacheKey)
    return null
  }

  return {
    ...payload,
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
          ...enrichment.certificationCards.map((card) => card.sourceUrl).filter(Boolean),
          enrichment.wageFallback?.sourceUrl ?? null,
          ...enrichment.entryRoles.map((item) => item.sourceUrl).filter(Boolean)
        ].filter((value): value is string => Boolean(value))
      )
    )
    const provinceCode = inferProvinceCode(args.location) ?? 'CA'
    const targetRoleKey = args.canonicalRoleKey?.trim().toLowerCase() || normalizeRoleKey(args.targetRole)
    const currentRoleCluster = deriveRoleCluster(args.currentRole)
    const expiresAt = enrichment.cache.expiresAt ?? cacheExpiresAt(hasThinCoverage(enrichment))

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
  const effectiveTargetRoleKey =
    args.canonicalRoleKey?.trim().toLowerCase() ||
    normalizeRoleKey(args.targetRole) ||
    profile?.meta.slug ||
    'no-profile'
  const cacheKey = [
    ENRICHMENT_CACHE_SCHEMA_VERSION,
    effectiveTargetRoleKey,
    inferProvinceCode(args.location) ?? 'CA',
    deriveRoleCluster(args.currentRole),
    args.careerPathType ?? 'GENERAL',
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
  const resolvedCertifications = await resolveCertificationCards(args)
  const resolvedEntryRoles = await resolveEntryRoles(args)
  const wageFallback = await resolveWageFallback(args)

  const enrichment: PlannerSourceEnrichment = {
    trainingCards: resolvedTraining.items,
    certificationCards: resolvedCertifications.items,
    wageFallback,
    entryRoles: resolvedEntryRoles.items,
    sourcePath: {
      training: resolvedTraining.sourcePath,
      wage: inferWageSourcePath(args, profile, wageFallback),
      entryRoles: resolvedEntryRoles.sourcePath,
      certifications: resolvedCertifications.sourcePath
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
