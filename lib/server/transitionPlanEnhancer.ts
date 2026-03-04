import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import type { PlannerReportSource, TransitionModeReport } from '@/lib/transition/types'

const CACHE_VERSION = 'transition-plan-v4'
const MODEL_DEFAULT = 'gpt-4.1-mini'

const TransitionNarrativeBucketSchema = z
  .object({
    title: z.string().min(1),
    summary: z.string().min(1),
    bullets: z.array(z.string().min(1)).min(1).max(6)
  })
  .strict()

const TransitionNarrativeSectionsSchema = z
  .object({
    intro: z.string().min(1),
    skills_you_build: z.array(TransitionNarrativeBucketSchema).min(1).max(4),
    credentials_you_need: z.array(TransitionNarrativeBucketSchema).min(1).max(4),
    soft_skills_that_matter: z.array(z.string().min(1)).min(1).max(6),
    why_this_path_can_pay_off: z.array(z.string().min(1)).min(1).max(5),
    start_from_zero: z.array(z.string().min(1)).min(1).max(6)
  })
  .strict()

export const TransitionStructuredPlanSchema = z
  .object({
    summary: z.string().min(1),
    compatibility_level: z.enum(['Low', 'Medium', 'High']),
    timeline_estimate: z.string().min(1),
    required_certifications: z.array(z.string().min(1)).max(8),
    required_experience: z.array(z.string().min(1)).max(8),
    action_steps: z.array(z.string().min(1)).max(6),
    salary_projection: z.string().min(1),
    narrative_sections: TransitionNarrativeSectionsSchema
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
    narrative_sections: TransitionNarrativeSectionsSchema,
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
  report: PlannerReportSource
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

function toSentence(value: string) {
  const trimmed = value.trim().replace(/\s+/g, ' ')
  if (!trimmed) return ''
  const capitalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
  return /[.!?]$/.test(capitalized) ? capitalized : `${capitalized}.`
}

function formatListItem(value: string) {
  const cleaned = value
    .replace(/^[\-\u2022]+\s*/, '')
    .replace(/\s+/g, ' ')
    .trim()
  return toSentence(cleaned)
}

function buildNarrativeSections(input: EnhancementInput) {
  const report = input.report
  const profile = report.careerPathwayProfile ?? null
  const targetRequirements = report.targetRequirements
  const transitionSections = report.transitionSections
  const profileTitle = profile?.meta.title ?? input.targetRole
  const regionLabel = formatRegionLabel(input.region, input.location)

  const hardSkills = uniqueStrings(
    [
      ...(profile?.skills.core ?? []),
      ...(transitionSections?.coreHardSkills ?? []).map((item) => item.label),
      ...(report.skillGaps ?? [])
        .filter((item) => item.gapLevel !== 'met')
        .map((item) => item.skillName)
    ]
      .map(formatListItem)
      .filter(Boolean),
    6
  )

  const toolsAndPhysical = uniqueStrings(
    [
      ...(profile?.skills.tools_tech ?? []),
      ...(profile?.requirements.tools_or_gear ?? []),
      ...(transitionSections?.toolsPlatforms ?? []).map((item) => item.label)
    ]
      .map(formatListItem)
      .filter(Boolean),
    6
  )

  const workHabits = uniqueStrings(
    [
      ...(profile?.skills.soft_skills ?? []),
      ...(targetRequirements?.employerSignals ?? []),
      ...(transitionSections?.experienceSignals ?? []).map((item) => item.label)
    ]
      .map(formatListItem)
      .filter(Boolean),
    6
  )

  const skillsYouBuild = [
    hardSkills.length > 0
      ? {
          title: 'Core job skills',
          summary: `These are the practical skills employers expect you to build as you move toward ${profileTitle} in ${regionLabel}.`,
          bullets: hardSkills
        }
      : null,
    toolsAndPhysical.length > 0
      ? {
          title: 'Tools and practical work',
          summary: 'This is the hands-on side of the role: tools, equipment, and the physical work pattern employers notice quickly.',
          bullets: toolsAndPhysical
        }
      : null,
    workHabits.length > 0
      ? {
          title: 'Work habits employers notice fast',
          summary: 'These are the habits that make an entry-level candidate easier to trust and easier to keep.',
          bullets: workHabits
        }
      : null
  ].filter(Boolean) as z.infer<typeof TransitionNarrativeBucketSchema>[]

  const beforeHired = uniqueStrings(
    [
      targetRequirements?.education ? formatListItem(targetRequirements.education) : '',
      ...(targetRequirements?.certifications ?? []),
      ...(profile?.requirements.nice_to_have ?? []).map((item) => item.name)
    ]
      .map(formatListItem)
      .filter(Boolean),
    6
  )

  const fullQualification = uniqueStrings(
    [
      ...(profile?.requirements.must_have ?? []).map((item) => item.name),
      ...(targetRequirements?.hardGates ?? []),
      targetRequirements?.apprenticeshipHours
        ? `About ${targetRequirements.apprenticeshipHours.toLocaleString()} apprenticeship hours`
        : '',
      targetRequirements?.examRequired
        ? profile?.meta.codes.trade_code
          ? `${profile.meta.codes.trade_code} qualifying or certifying exam`
          : 'A qualifying or licensing exam'
        : ''
    ]
      .map(formatListItem)
      .filter(Boolean),
    6
  )

  const credentialsYouNeed = [
    beforeHired.length > 0
      ? {
          title: 'Before you get hired',
          summary: 'These are the education or tickets employers often screen for first at the entry level.',
          bullets: beforeHired
        }
      : null,
    fullQualification.length > 0
      ? {
          title: 'What full qualification usually requires',
          summary:
            profile?.meta.regulated || targetRequirements?.regulated
              ? 'This is the longer qualification path. It can vary by province, regulator, or employer.'
              : 'This is the longer qualification path employers expect as you move beyond the entry point.',
          bullets: fullQualification
        }
      : null
  ].filter(Boolean) as z.infer<typeof TransitionNarrativeBucketSchema>[]

  const softSkillsThatMatter = uniqueStrings(
    [
      ...(profile?.skills.soft_skills ?? []),
      ...(targetRequirements?.employerSignals ?? [])
    ]
      .map(formatListItem)
      .filter(Boolean),
    5
  )

  const firstStage = input.transitionMode.earnings[0]
  const finalStage = input.transitionMode.earnings[input.transitionMode.earnings.length - 1]
  const payOffBullets = uniqueStrings(
    [
      `${firstStage.stage}: ${firstStage.rangeLow}-${firstStage.rangeHigh} ${firstStage.unit}`,
      `${finalStage.stage}: ${finalStage.rangeLow}-${finalStage.rangeHigh} ${finalStage.unit}`,
      profile?.wages.notes ||
        'Pay can rise meaningfully as your proof, qualification, and scope increase.',
      'Wages are averages, not guarantees, and can vary by province and employer.'
    ]
      .map(formatListItem)
      .filter(Boolean),
    4
  )

  const startFromZero = uniqueStrings(
    [
      ...input.transitionMode.gaps.first3Steps,
      input.transitionMode.routes.primary.firstStep,
      ...(profile?.entry_paths[0]?.steps ?? []).slice(0, 2)
    ]
      .map(formatListItem)
      .filter(Boolean),
    5
  )

  return TransitionNarrativeSectionsSchema.parse({
    intro:
      profile?.meta.regulated || targetRequirements?.regulated
        ? `Here is the realistic path into ${profileTitle} in ${regionLabel}. The goal is to separate the skills you build from the credentials employers or regulators actually screen for first.`
        : `Here is the practical path into ${profileTitle} in ${regionLabel}, grouped into the skills you build and the requirements employers screen for first.`,
    skills_you_build:
      skillsYouBuild.length > 0
        ? skillsYouBuild
        : [
            {
              title: 'Core job skills',
              summary: `These are the first practical skills you need to build for ${profileTitle}.`,
              bullets:
                uniqueStrings(
                  input.transitionMode.gaps.missing.map(formatListItem).filter(Boolean),
                  4
                ).length > 0
                  ? uniqueStrings(
                      input.transitionMode.gaps.missing.map(formatListItem).filter(Boolean),
                      4
                    )
                  : ['Build the first role-specific skill employers mention.']
            }
          ],
    credentials_you_need:
      credentialsYouNeed.length > 0
        ? credentialsYouNeed
        : [
            {
              title: 'What employers screen for first',
              summary: 'Start by confirming the real education, registration, or ticket requirements before you spend money.',
              bullets:
                uniqueStrings(
                  [
                    ...(targetRequirements?.certifications ?? []),
                    ...(targetRequirements?.hardGates ?? []),
                    targetRequirements?.education ?? ''
                  ]
                    .map(formatListItem)
                    .filter(Boolean),
                  4
                ).length > 0
                  ? uniqueStrings(
                      [
                        ...(targetRequirements?.certifications ?? []),
                        ...(targetRequirements?.hardGates ?? []),
                        targetRequirements?.education ?? ''
                      ]
                        .map(formatListItem)
                        .filter(Boolean),
                      4
                    )
                  : ['Confirm the exact entry requirement before you spend money.']
            }
          ],
    soft_skills_that_matter:
      softSkillsThatMatter.length > 0
        ? softSkillsThatMatter
        : uniqueStrings(
            ['Communication', 'Reliability', 'Attention to detail'].map(formatListItem),
            3
          ),
    why_this_path_can_pay_off:
      payOffBullets.length > 0
        ? payOffBullets
        : uniqueStrings(
            ['This path can pay off as your proof and qualification increase.'].map(formatListItem),
            1
          ),
    start_from_zero:
      startFromZero.length > 0
        ? startFromZero
        : uniqueStrings(
            ['Confirm the first real requirement before you spend money.'].map(formatListItem),
            1
          )
  })
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
  const primaryRouteSignal = `${transitionMode.routes.primary.title} ${transitionMode.routes.primary.firstStep}`.toLowerCase()
  const entryAnchored = /\b(helper|apprentice|trainee|intern|junior|entry)\b/.test(primaryRouteSignal)
  return entryAnchored
    ? `${transitionMode.timeline.minMonths}-${transitionMode.timeline.maxMonths} months to your first viable entry role`
    : `${transitionMode.timeline.minMonths}-${transitionMode.timeline.maxMonths} months`
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
  const narrativeSections = buildNarrativeSections(input)
  const requiredExperience = uniqueStrings([
    ...narrativeSections.skills_you_build.flatMap((item) => item.bullets).slice(0, 4),
    ...narrativeSections.soft_skills_that_matter.slice(0, 2)
  ], 4)
  const firstCredential =
    narrativeSections.credentials_you_need[0]?.bullets[0] ??
    targetRequirements?.hardGates[0] ??
    targetRequirements?.certifications[0] ??
    input.transitionMode.gaps.first3Steps[0]
  const firstAction = narrativeSections.start_from_zero[0] ?? input.transitionMode.gaps.first3Steps[0]

  return TransitionStructuredPlanSchema.parse({
    summary:
      compatibilityLevel(input.transitionMode) === 'Low'
        ? `You are not ready to compete for ${input.targetRole} yet, but the path is workable if you clear ${firstCredential.toLowerCase()} first and follow a tighter sequence.`
        : `The move into ${input.targetRole} is realistic if you start with ${firstCredential.toLowerCase()} and keep weekly momentum visible.`,
    compatibility_level: compatibilityLevel(input.transitionMode),
    timeline_estimate: timelineEstimate(input.transitionMode),
    required_certifications: uniqueStrings(
      narrativeSections.credentials_you_need.flatMap((item) => item.bullets),
      6
    ),
    required_experience: requiredExperience,
    action_steps: uniqueStrings([firstAction, ...input.transitionMode.gaps.first3Steps], 3),
    salary_projection: salaryProjection(input),
    narrative_sections: narrativeSections
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
              'Use the real data to explain what the role actually takes in plain language.',
              'Group the explanation into skills_you_build and credentials_you_need so the user can see the difference between what they learn and what employers screen for.',
              'If the target is a trade or regulated path, make the sequence concrete: what helps before hire, what full qualification requires, and what to do if starting from zero.',
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
              transition_sections: input.report.transitionSections ?? null,
              skill_gaps: input.report.skillGaps ?? null,
              curated_pathway_profile: input.report.careerPathwayProfile ?? null,
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
              narrative_sections: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  intro: { type: 'string' },
                  skills_you_build: {
                    type: 'array',
                    minItems: 1,
                    maxItems: 4,
                    items: {
                      type: 'object',
                      additionalProperties: false,
                      properties: {
                        title: { type: 'string' },
                        summary: { type: 'string' },
                        bullets: {
                          type: 'array',
                          minItems: 1,
                          maxItems: 6,
                          items: { type: 'string' }
                        }
                      },
                      required: ['title', 'summary', 'bullets']
                    }
                  },
                  credentials_you_need: {
                    type: 'array',
                    minItems: 1,
                    maxItems: 4,
                    items: {
                      type: 'object',
                      additionalProperties: false,
                      properties: {
                        title: { type: 'string' },
                        summary: { type: 'string' },
                        bullets: {
                          type: 'array',
                          minItems: 1,
                          maxItems: 6,
                          items: { type: 'string' }
                        }
                      },
                      required: ['title', 'summary', 'bullets']
                    }
                  },
                  soft_skills_that_matter: {
                    type: 'array',
                    minItems: 1,
                    maxItems: 6,
                    items: { type: 'string' }
                  },
                  why_this_path_can_pay_off: {
                    type: 'array',
                    minItems: 1,
                    maxItems: 5,
                    items: { type: 'string' }
                  },
                  start_from_zero: {
                    type: 'array',
                    minItems: 1,
                    maxItems: 6,
                    items: { type: 'string' }
                  }
                },
                required: [
                  'intro',
                  'skills_you_build',
                  'credentials_you_need',
                  'soft_skills_that_matter',
                  'why_this_path_can_pay_off',
                  'start_from_zero'
                ]
              },
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
              'narrative_sections',
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
        salary_projection: parsed.salary_projection,
        narrative_sections: TransitionNarrativeSectionsSchema.parse(parsed.narrative_sections)
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
