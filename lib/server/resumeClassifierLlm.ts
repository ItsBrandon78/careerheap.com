import { z } from 'zod'
import { extractProfileSignals } from '@/lib/planner/profileSignals'

const ResumeClassificationSchema = z
  .object({
    skills: z.array(z.string().min(1)).max(24),
    certifications: z.array(z.string().min(1)).max(16),
    soft_skills: z.array(z.string().min(1)).max(16),
    experience_highlights: z.array(z.string().min(1)).max(12)
  })
  .strict()

export type ResumeClassification = z.infer<typeof ResumeClassificationSchema>

const MODEL_DEFAULT = 'gpt-4.1-mini'

const SOFT_SKILL_HINTS = [
  'motivated',
  'eager',
  'reliable',
  'dependable',
  'mechanically inclined',
  'hardworking',
  'adaptable',
  'detail-oriented',
  'quick learner',
  'self-starter',
  'physically capable',
  'organized'
]

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s/+&-]/g, ' ').replace(/\s+/g, ' ').trim()
}

function uniqueStrings(values: string[], max?: number) {
  const seen = new Set<string>()
  const output: string[] = []
  for (const value of values) {
    const trimmed = value.trim().replace(/\s+/g, ' ')
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

function buildDeterministicClassification(input: {
  text: string
  heuristicSkills: string[]
  heuristicCertifications: string[]
  heuristicBullets: string[]
}): ResumeClassification {
  const profile = extractProfileSignals({
    experienceText: input.text,
    explicitSkills: input.heuristicSkills,
    explicitCertifications: input.heuristicCertifications
  })

  const softSkills = uniqueStrings(
    [
      ...SOFT_SKILL_HINTS.filter((item) => normalizeText(input.text).includes(item)),
      ...input.heuristicSkills.filter((item) =>
        SOFT_SKILL_HINTS.some((hint) => normalizeText(item).includes(hint))
      )
    ].map((item) => item.replace(/\b\w/g, (match) => match.toUpperCase())),
    10
  )

  const technicalSkills = uniqueStrings(
    [
      ...profile.skills,
      ...input.heuristicSkills.filter(
        (item) => !softSkills.some((softSkill) => normalizeText(softSkill) === normalizeText(item))
      )
    ],
    16
  )

  const experienceHighlights = uniqueStrings(
    [...profile.experienceSignals, ...input.heuristicBullets],
    8
  )

  return ResumeClassificationSchema.parse({
    skills: technicalSkills,
    certifications: uniqueStrings(profile.certifications, 10),
    soft_skills: softSkills,
    experience_highlights: experienceHighlights
  })
}

function sanitizeModelOutput(value: ResumeClassification, fallback: ResumeClassification) {
  const normalized = ResumeClassificationSchema.parse(value)
  const certificationKeys = new Set(normalized.certifications.map((item) => normalizeText(item)))
  const softSkillKeys = new Set(normalized.soft_skills.map((item) => normalizeText(item)))

  return ResumeClassificationSchema.parse({
    skills: uniqueStrings(
      normalized.skills.filter((item) => {
        const key = normalizeText(item)
        return key && !certificationKeys.has(key)
      }),
      16
    ),
    certifications: uniqueStrings(
      normalized.certifications.filter((item) => {
        const key = normalizeText(item)
        return key && !softSkillKeys.has(key)
      }),
      10
    ),
    soft_skills: uniqueStrings(
      normalized.soft_skills.filter((item) => {
        const key = normalizeText(item)
        return key && !certificationKeys.has(key)
      }),
      10
    ),
    experience_highlights: uniqueStrings(
      normalized.experience_highlights.length > 0
        ? normalized.experience_highlights
        : fallback.experience_highlights,
      8
    )
  })
}

async function classifyWithLlm(input: {
  text: string
  fallback: ResumeClassification
}) {
  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!apiKey) return null

  const model = process.env.OPENAI_RESUME_PARSE_MODEL?.trim() || MODEL_DEFAULT
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      messages: [
        {
          role: 'system',
          content:
            'You classify resume text into strict categories. Certifications are formal credentials only. Soft traits never belong in certifications. If uncertain, classify as skill.'
        },
        {
          role: 'user',
          content: JSON.stringify({
            task: 'Classify the resume text into structured categories.',
            hard_rules: [
              'Certifications must only include formal credentials, licenses, tickets, diplomas, or official training.',
              'Traits like motivated, eager, mechanically inclined, dependable, and physically capable are soft_skills, not certifications.',
              'skills should be technical, functional, or task-relevant abilities.',
              'If uncertain, place the item in skills instead of certifications.',
              'Use short bullet-like strings, not sentences, for skills/certifications/soft_skills.',
              'Use short, concrete evidence lines for experience_highlights.'
            ],
            resume_text: input.text.slice(0, 8_000),
            fallback_guess: input.fallback
          })
        }
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'resume_classification',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              skills: {
                type: 'array',
                items: { type: 'string' },
                maxItems: 24
              },
              certifications: {
                type: 'array',
                items: { type: 'string' },
                maxItems: 16
              },
              soft_skills: {
                type: 'array',
                items: { type: 'string' },
                maxItems: 16
              },
              experience_highlights: {
                type: 'array',
                items: { type: 'string' },
                maxItems: 12
              }
            },
            required: ['skills', 'certifications', 'soft_skills', 'experience_highlights']
          }
        }
      }
    }),
    signal: AbortSignal.timeout(12_000)
  })

  if (!response.ok) return null

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>
  }
  const content = data.choices?.[0]?.message?.content
  if (!content || typeof content !== 'string') return null

  try {
    const parsed = JSON.parse(content) as ResumeClassification
    return sanitizeModelOutput(parsed, input.fallback)
  } catch {
    return null
  }
}

export async function classifyResumeSignals(input: {
  text: string
  heuristicSkills: string[]
  heuristicCertifications: string[]
  heuristicBullets: string[]
}) {
  const fallback = buildDeterministicClassification(input)
  if (!isConfigured()) {
    return {
      classification: fallback,
      source: 'heuristic' as const
    }
  }

  try {
    const llm = await classifyWithLlm({
      text: input.text,
      fallback
    })
    if (!llm) {
      return {
        classification: fallback,
        source: 'heuristic' as const
      }
    }
    return {
      classification: llm,
      source: 'gpt' as const
    }
  } catch {
    return {
      classification: fallback,
      source: 'heuristic' as const
    }
  }
}
