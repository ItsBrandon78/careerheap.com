import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import type { TransitionModeReport } from '@/lib/transition/types'

const CACHE_VERSION = 'transition-plan-v3'
const MODEL_DEFAULT = 'gpt-4.1-mini'

export const TransitionStructuredPlanSchema = z
  .object({
    summary: z.string().min(1),
    compatibility_level: z.enum(['Low', 'Medium', 'High']),
    timeline_estimate: z.string().min(1),
    required_certifications: z.array(z.string().min(1)).max(8),
    required_experience: z.array(z.string().min(1)).max(8),
    action_steps: z.array(z.string().min(1)).max(6),
    salary_projection: z.string().min(1)
  })
  .strict()

const TransitionPlanEnhancementSchema = z
  .object({
    summary: z.string().min(1),
    compatibility_level: z.enum(['Low', 'Medium', 'High']),
    timeline_estimate: z.string().min(1),
    required_certifications: z.array(z.string().min(1)).max(8),
    required_experience: z.array(z.string().min(1)).max(8),
    action_steps: z.array(z.string().min(1)).max(6),
    salary_projection: z.string().min(1),
    scripts: z
      .object({
        call: z.string().min(1),
        email: z.string().min(1)
      })
      .strict()
  })
  .strict()

export type TransitionStructuredPlan = z.infer<typeof TransitionStructuredPlanSchema>

export type TransitionPlanScripts = {
  call: string
  email: string
  source: 'gpt' | 'deterministic'
}

export type TransitionPlanCacheMeta = {
  version: string
  generatedAt: string
  region: string
  experienceLevelBucket: string
  cacheHit: boolean
}

type EnhancementInput = {
  currentRole: string
  targetRole: string
  region: string
  location: string
  experienceText: string
  transitionMode: TransitionModeReport
  report: {
    targetRequirements?: {
      certifications: string[]
      employerSignals: string[]
    }
    suggestedCareers?: Array<{
      salary?: {
        native?: {
          currency: 'USD' | 'CAD'
          low: number | null
          high: number | null
        } | null
      }
    }>
  }
}

type CachedEnhancementRow = {
  output_payload?: unknown
  transition_structured_plan?: unknown
  transition_plan_scripts?: unknown
  transition_plan_cache_meta?: unknown
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
}

function uniqueStrings(values: string[], max?: number) {
  const seen = new Set<string>()
  const output: string[] = []
  for (const value of values) {
    const trimmed = value.trim()
    if (!trimmed) continue
    const key = normalizeText(trimmed)
    if (!key || seen.has(key)) continue
    seen.add(key)
    output.push(trimmed)
    if (typeof max === 'number' && output.length >= max) break
  }
  return output
}

function isConfigured() {
  return Boolean(process.env.OPENAI_API_KEY?.trim())
}

export function inferExperienceLevelBucket(experienceText: string) {
  const normalized = normalizeText(experienceText)
  const years = [...normalized.matchAll(/(\d+)\s*(?:year|yr)/g)].map((match) =>
    Number.parseInt(match[1], 10)
  )
  const highestYears = years.length > 0 ? Math.max(...years) : 0
  if (highestYears >= 5) return 'experienced'
  if (highestYears >= 2) return 'mid'
  if (normalized.length >= 240) return 'developing'
  return 'entry'
}

function timelineEstimate(transitionMode: TransitionModeReport) {
  return `${transitionMode.timeline.minMonths}-${transitionMode.timeline.maxMonths} months`
}

function compatibilityLevel(transitionMode: TransitionModeReport) {
  if (transitionMode.difficulty.score <= 3.5) return 'High' as const
  if (transitionMode.difficulty.score <= 6.4) return 'Medium' as const
  return 'Low' as const
}

function salaryProjection(input: EnhancementInput) {
  const first = input.transitionMode.earnings[0]
  const last = input.transitionMode.earnings[input.transitionMode.earnings.length - 1]
  return `${first.stage}: ${first.rangeLow}-${first.rangeHigh} ${first.unit}; ${last.stage}: ${last.rangeLow}-${last.rangeHigh} ${last.unit}`
}

function formatRegionLabel(region: string, location: string) {
  const trimmedLocation = location.trim()
  if (trimmedLocation) return trimmedLocation

  const normalized = normalizeText(region)
  if (normalized === 'ca' || normalized === 'canada' || normalized === 'remote ca') return 'Canada'
  if (normalized === 'us' || normalized === 'usa' || normalized === 'united states' || normalized === 'remote us') {
    return 'the United States'
  }
  if (normalized === 'either') return 'the United States or Canada'
  return region.trim() || 'your area'
}

function deterministicScripts(input: EnhancementInput) {
  return buildProfessionalScripts(input)

  const route = input.transitionMode.routes.primary.title
  const firstStep = input.transitionMode.routes.primary.firstStep
  const targetTitle = input.targetRole

  return {
    call: [
      `Hi, I'm moving from ${input.currentRole} into ${targetTitle} in ${input.region}.`,
      `I'm following the ${route.toLowerCase()} route and already started ${firstStep.toLowerCase()}.`,
      'I wanted to ask what entry-level candidates usually need in their first 30 days to get taken seriously.'
    ].join(' '),
    email: [
      `Subject: Entry path into ${targetTitle}`,
      '',
      `Hi, I’m transitioning from ${input.currentRole} into ${targetTitle} in ${input.region}.`,
      `I’m following the ${route.toLowerCase()} route and have already started ${firstStep.toLowerCase()}.`,
      'If you can share what makes an entry-level candidate credible in your hiring process, I would appreciate it.',
      '',
      'Best,',
      'Your Name'
    ].join('\n'),
    source: 'deterministic'
  } satisfies TransitionPlanScripts
}

function buildProfessionalScripts(input: EnhancementInput) {
  const route = input.transitionMode.routes.primary.title
  const firstStep = input.transitionMode.routes.primary.firstStep
  const targetTitle = input.targetRole.trim() || 'this role'
  const currentTitle = input.currentRole.trim() || 'my current role'
  const regionLabel = formatRegionLabel(input.region, input.location)

  return {
    call: [
      `Hi, this is [Your Name]. I'm transitioning from ${currentTitle} into ${targetTitle} and I'm calling about entry-level openings in ${regionLabel}.`,
      `I'm following the ${route.toLowerCase()} path and I have already started ${firstStep.toLowerCase()}.`,
      'Are you hiring helpers, trainees, or apprentices right now?',
      'If not, could you tell me what skills, tickets, or first-step experience you expect before you speak with someone new?',
      'If it is easier, I am happy to follow up by email or continue by phone.'
    ].join(' '),
    email: [
      `Subject: Entry path into ${targetTitle}`,
      '',
      'Hello,',
      '',
      `I'm transitioning from ${currentTitle} into ${targetTitle} and mapping the right entry path in ${regionLabel}.`,
      `I'm following the ${route.toLowerCase()} route and I have already started ${firstStep.toLowerCase()}.`,
      'Are you currently hiring entry-level candidates, helpers, trainees, or apprentices?',
      'If you are not hiring today, I would still appreciate two quick pointers on the skills, tickets, or first-step experience you expect before you take a first conversation.',
      'If it helps, I can follow up by email or schedule a short call whenever it is convenient.',
      '',
      'Thank you,',
      'Your Name'
    ].join('\n'),
    source: 'deterministic'
  } satisfies TransitionPlanScripts
}

function deterministicPlan(input: EnhancementInput) {
  const targetRequirements = input.report.targetRequirements
  const requiredExperience = uniqueStrings([
    ...input.transitionMode.gaps.missing.slice(0, 3),
    ...(targetRequirements?.employerSignals ?? []).slice(0, 2)
  ], 4)

  return TransitionStructuredPlanSchema.parse({
    summary:
      compatibilityLevel(input.transitionMode) === 'Low'
        ? `You are not ready to compete for ${input.targetRole} yet, but the path is workable if you close the first blockers in order.`
        : `You have enough overlap to move toward ${input.targetRole} if you execute the next steps consistently.`,
    compatibility_level: compatibilityLevel(input.transitionMode),
    timeline_estimate: timelineEstimate(input.transitionMode),
    required_certifications: uniqueStrings(targetRequirements?.certifications ?? [], 6),
    required_experience: requiredExperience,
    action_steps: uniqueStrings(input.transitionMode.gaps.first3Steps, 3),
    salary_projection: salaryProjection(input)
  })
}

async function fetchCachedEnhancement(input: {
  currentRole: string
  targetRole: string
  region: string
  experienceLevelBucket: string
}) {
  const admin = createAdminClient()

  try {
    const runQuery = async (columns: string) =>
      admin
        .from('career_map_reports')
        .select(columns)
        .eq('current_role', input.currentRole)
        .eq('target_role', input.targetRole)
        .order('created_at', { ascending: false })
        .limit(25)

    const modern = await runQuery(
      'output_payload, transition_structured_plan, transition_plan_scripts, transition_plan_cache_meta'
    )
    const rows = modern.error
      ? ((await runQuery('output_payload')).data ?? []) as CachedEnhancementRow[]
      : ((modern.data ?? []) as CachedEnhancementRow[])

    if (modern.error && rows.length === 0) return null

    for (const row of rows) {
      const payload =
        row?.output_payload && typeof row.output_payload === 'object'
          ? (row.output_payload as Record<string, unknown>)
          : null
      const cacheMetaSource =
        row?.transition_plan_cache_meta ??
        (payload ? payload.transitionPlanCacheMeta : undefined)
      const planSource =
        row?.transition_structured_plan ??
        (payload ? payload.transitionStructuredPlan : undefined)
      const scriptsSource =
        row?.transition_plan_scripts ??
        (payload ? payload.transitionPlanScripts : undefined)

      if (!cacheMetaSource || typeof cacheMetaSource !== 'object') continue
      if (!scriptsSource || typeof scriptsSource !== 'object') continue

      const cacheMeta = cacheMetaSource as Partial<TransitionPlanCacheMeta>
      const scripts = scriptsSource as Partial<TransitionPlanScripts>
      if (typeof cacheMeta.generatedAt !== 'string') continue
      if (typeof cacheMeta.region !== 'string') continue
      if (typeof cacheMeta.experienceLevelBucket !== 'string') continue
      if (typeof scripts.call !== 'string' || typeof scripts.email !== 'string') continue
      if (cacheMeta.version !== CACHE_VERSION) continue
      if (normalizeText(cacheMeta.region) !== normalizeText(input.region)) continue
      if (cacheMeta.experienceLevelBucket !== input.experienceLevelBucket) continue

      const parsedPlan = TransitionStructuredPlanSchema.safeParse(planSource)
      if (!parsedPlan.success) continue
      return {
        plan: parsedPlan.data,
        scripts: {
          call: scripts.call,
          email: scripts.email,
          source: scripts.source === 'gpt' ? 'gpt' : 'deterministic'
        } satisfies TransitionPlanScripts,
        cacheMeta: {
          version: CACHE_VERSION,
          generatedAt: cacheMeta.generatedAt,
          region: cacheMeta.region,
          experienceLevelBucket: cacheMeta.experienceLevelBucket,
          cacheHit: true
        } satisfies TransitionPlanCacheMeta
      }
    }
  } catch {
    return null
  }

  return null
}

async function generateWithLlm(input: EnhancementInput & { fallbackPlan: TransitionStructuredPlan }) {
  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!apiKey) return null

  const model = process.env.OPENAI_TRANSITION_PLAN_MODEL?.trim() || MODEL_DEFAULT
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content:
            'You produce concise, authoritative transition-plan summaries and outreach scripts grounded in provided data only. Avoid fluff, desperation, or invented requirements.'
        },
        {
          role: 'user',
          content: JSON.stringify({
            task: 'Turn the structured transition data into a clearer modular summary and stronger outreach scripts.',
            hard_rules: [
              'Use only provided requirements, timelines, and salary ranges.',
              'If the user is not a strong match, explain the gap constructively and name the first 3 actions.',
              'Keep compatibility_level as Low, Medium, or High.',
              'Call script must sound like a short, professional phone opener.',
              'Email must sound like a professional apprenticeship, hiring, or entry-path inquiry.',
              'Use natural geography labels, never raw abbreviations like "ca" or "us".',
              'Ask whether they are hiring and offer a short follow-up by phone or email.',
              'Avoid casual phrasing such as "I am moving from X into Y in ca".',
              'Do not invent credentials, exams, or legal requirements.'
            ],
            input: {
              current_role: input.currentRole,
              target_role: input.targetRole,
              region: input.region,
              region_display: formatRegionLabel(input.region, input.location),
              location: input.location,
              experience_level_bucket: inferExperienceLevelBucket(input.experienceText),
              deterministic_plan: input.fallbackPlan,
              target_requirements: input.report.targetRequirements ?? null,
              transition_mode: {
                difficulty: input.transitionMode.difficulty,
                timeline: input.transitionMode.timeline,
                routes: input.transitionMode.routes,
                gaps: input.transitionMode.gaps,
                earnings: input.transitionMode.earnings
              }
            }
          })
        }
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'transition_plan_enhancement',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              summary: { type: 'string' },
              compatibility_level: { type: 'string', enum: ['Low', 'Medium', 'High'] },
              timeline_estimate: { type: 'string' },
              required_certifications: {
                type: 'array',
                items: { type: 'string' },
                maxItems: 8
              },
              required_experience: {
                type: 'array',
                items: { type: 'string' },
                maxItems: 8
              },
              action_steps: {
                type: 'array',
                items: { type: 'string' },
                maxItems: 6
              },
              salary_projection: { type: 'string' },
              scripts: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  call: { type: 'string' },
                  email: { type: 'string' }
                },
                required: ['call', 'email']
              }
            },
            required: [
              'summary',
              'compatibility_level',
              'timeline_estimate',
              'required_certifications',
              'required_experience',
              'action_steps',
              'salary_projection',
              'scripts'
            ]
          }
        }
      }
    }),
    signal: AbortSignal.timeout(18_000)
  })

  if (!response.ok) return null
  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>
  }
  const content = data.choices?.[0]?.message?.content
  if (!content || typeof content !== 'string') return null

  try {
    const parsed = TransitionPlanEnhancementSchema.parse(JSON.parse(content))
    return {
      plan: TransitionStructuredPlanSchema.parse({
        summary: parsed.summary,
        compatibility_level: parsed.compatibility_level,
        timeline_estimate: parsed.timeline_estimate,
        required_certifications: uniqueStrings(parsed.required_certifications, 6),
        required_experience: uniqueStrings(parsed.required_experience, 4),
        action_steps: uniqueStrings(parsed.action_steps, 3),
        salary_projection: parsed.salary_projection
      }),
      scripts: {
        call: parsed.scripts.call,
        email: parsed.scripts.email,
        source: 'gpt' as const
      }
    }
  } catch {
    return null
  }
}

export async function getCachedOrGenerateTransitionEnhancement(input: EnhancementInput) {
  const experienceLevelBucket = inferExperienceLevelBucket(input.experienceText)
  const cached = await fetchCachedEnhancement({
    currentRole: input.currentRole,
    targetRole: input.targetRole,
    region: input.region,
    experienceLevelBucket
  })
  if (cached) return cached

  const fallbackPlan = deterministicPlan(input)
  const fallbackScripts = deterministicScripts(input)
  const generatedAt = new Date().toISOString()
  const llm = isConfigured()
    ? await generateWithLlm({
        ...input,
        fallbackPlan
      }).catch(() => null)
    : null

  return {
    plan: llm?.plan ?? fallbackPlan,
    scripts: llm?.scripts ?? fallbackScripts,
    cacheMeta: {
      version: CACHE_VERSION,
      generatedAt,
      region: input.region,
      experienceLevelBucket,
      cacheHit: false
    } satisfies TransitionPlanCacheMeta
  }
}
