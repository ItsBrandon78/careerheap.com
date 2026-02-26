import { toTaskLevelLabel, normalizeRequirementKey, normalizeWhitespace } from '@/lib/requirements/normalize'
import type { ExtractedRequirement, RequirementType } from '@/lib/requirements/types'

interface PostingInput {
  postingId: string
  description: string
}

interface LlmRequirementCandidate {
  segmentId: string
  type: RequirementType
  label: string
  quote: string
  confidence: number
}

interface LlmResponseShape {
  requirements: LlmRequirementCandidate[]
}

interface RequirementSegment {
  segmentId: string
  postingId: string
  text: string
}

const MAX_SEGMENTS = 24
const MAX_REQUIREMENTS = 80
const MIN_SEGMENT_LENGTH = 24
const MAX_SEGMENT_LENGTH = 260
const MIN_HEURISTIC_CONFIDENCE = 0.81
const REQUIREMENT_CUE_PATTERN =
  /\b(requirements?|required|must|preferred|qualifications?|experience with|experience in|proficien|familiarity|license|licence|certif|clearance|registration|knowledge of|ability to)\b/i
const ALLOWED_TYPES: RequirementType[] = ['gate', 'hard_skill', 'tool', 'experience_signal', 'soft_signal']

function normalizeComparable(value: string) {
  return normalizeWhitespace(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function splitSegments(text: string) {
  return text
    .split(/\r?\n|[.;]\s+/)
    .map((segment) =>
      segment
        .replace(/^[\s\-*\u2022]+/, '')
        .replace(/\s+/g, ' ')
        .trim()
    )
    .filter(
      (segment) => segment.length >= MIN_SEGMENT_LENGTH && segment.length <= MAX_SEGMENT_LENGTH
    )
}

function buildSegments(postings: PostingInput[]) {
  const segments: RequirementSegment[] = []
  for (const posting of postings) {
    const parts = splitSegments(posting.description)
    for (let index = 0; index < parts.length; index += 1) {
      const text = parts[index]
      segments.push({
        segmentId: `${posting.postingId}:${index + 1}`,
        postingId: posting.postingId,
        text
      })
    }
  }
  return segments
}

function isAllowedType(value: unknown): value is RequirementType {
  return typeof value === 'string' && ALLOWED_TYPES.includes(value as RequirementType)
}

function clipQuote(value: string) {
  const normalized = normalizeWhitespace(value)
  if (normalized.length <= 220) return normalized
  return `${normalized.slice(0, 217).trimEnd()}...`
}

function includesComparableQuote(segmentText: string, quote: string) {
  const segmentNormalized = normalizeComparable(segmentText)
  const quoteNormalized = normalizeComparable(quote)
  if (!segmentNormalized || !quoteNormalized) return false
  return segmentNormalized.includes(quoteNormalized) || quoteNormalized.includes(segmentNormalized)
}

function toExtractedRequirement(
  candidate: LlmRequirementCandidate,
  segment: RequirementSegment
): ExtractedRequirement | null {
  if (!isAllowedType(candidate.type)) return null
  if (typeof candidate.label !== 'string' || typeof candidate.quote !== 'string') return null

  const safeLabel = toTaskLevelLabel(candidate.label, candidate.type)
  if (!safeLabel) return null

  if (!includesComparableQuote(segment.text, candidate.quote)) return null

  const normalizedKey = normalizeRequirementKey(safeLabel)
  if (!normalizedKey) return null

  const confidenceRaw = Number(candidate.confidence)
  const confidence = Number.isFinite(confidenceRaw)
    ? Math.max(0.4, Math.min(0.95, confidenceRaw))
    : 0.62

  return {
    type: candidate.type,
    label: safeLabel,
    normalizedKey,
    confidence,
    evidence: {
      source: 'adzuna',
      quote: clipQuote(candidate.quote),
      postingId: segment.postingId,
      confidence
    }
  }
}

function pickLowSignalSegments(options: {
  postings: PostingInput[]
  heuristicExtracted: ExtractedRequirement[]
}) {
  const allSegments = buildSegments(options.postings)
  const coverageByPosting = new Map<string, Array<{ quote: string; confidence: number }>>()

  for (const item of options.heuristicExtracted) {
    const postingId = item.evidence.postingId
    if (!postingId) continue
    const bucket = coverageByPosting.get(postingId) ?? []
    bucket.push({ quote: item.evidence.quote, confidence: item.confidence })
    coverageByPosting.set(postingId, bucket)
  }

  const candidateSegments = allSegments
    .filter((segment) => REQUIREMENT_CUE_PATTERN.test(segment.text))
    .map((segment) => {
      const extractedForPosting = coverageByPosting.get(segment.postingId) ?? []
      let maxCoverageConfidence = 0
      let covered = false
      for (const extracted of extractedForPosting) {
        if (!includesComparableQuote(segment.text, extracted.quote)) continue
        covered = true
        if (extracted.confidence > maxCoverageConfidence) {
          maxCoverageConfidence = extracted.confidence
        }
      }
      return {
        ...segment,
        covered,
        maxCoverageConfidence
      }
    })
    .filter((segment) => !segment.covered || segment.maxCoverageConfidence < MIN_HEURISTIC_CONFIDENCE)
    .slice(0, MAX_SEGMENTS)

  return candidateSegments
}

function isConfigured() {
  return Boolean(process.env.OPENAI_API_KEY?.trim())
}

async function callLlm(segments: RequirementSegment[]): Promise<LlmResponseShape | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!apiKey) return null

  const model = process.env.OPENAI_REQUIREMENTS_MODEL?.trim() || 'gpt-4.1-mini'
  const payload = {
    model,
    temperature: 0.1,
    messages: [
      {
        role: 'system',
        content:
          'You normalize employer requirements from job listing segments. Return only grounded requirements from provided text. Never invent credentials, tools, or requirements not explicitly present.'
      },
      {
        role: 'user',
        content: JSON.stringify({
          task: 'Extract specific, task-level requirements from each segment.',
          hard_rules: [
            'Use only provided segment text.',
            'Each output item must reference one segmentId.',
            'quote must be copied from that segment verbatim.',
            'label must be concrete and actionable (verb + object when possible).',
            'Prefer exact cert/license names when present (example: WHMIS, Red Seal, Class G driver license).',
            'Do not return vague labels like communication, leadership, mechanical.',
            `Return at most ${MAX_REQUIREMENTS} total requirements.`
          ],
          segments: segments.map((segment) => ({
            segmentId: segment.segmentId,
            postingId: segment.postingId,
            text: segment.text
          }))
        })
      }
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'normalized_requirements',
        strict: true,
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            requirements: {
              type: 'array',
              maxItems: MAX_REQUIREMENTS,
              items: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  segmentId: { type: 'string' },
                  type: {
                    type: 'string',
                    enum: ALLOWED_TYPES
                  },
                  label: { type: 'string' },
                  quote: { type: 'string' },
                  confidence: { type: 'number', minimum: 0, maximum: 1 }
                },
                required: ['segmentId', 'type', 'label', 'quote', 'confidence']
              }
            }
          },
          required: ['requirements']
        }
      }
    }
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(18_000)
  })

  if (!response.ok) return null
  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>
  }
  const content = data.choices?.[0]?.message?.content
  if (!content || typeof content !== 'string') return null

  try {
    const parsed = JSON.parse(content) as LlmResponseShape
    if (!parsed || !Array.isArray(parsed.requirements)) return null
    return parsed
  } catch {
    return null
  }
}

export async function enrichLowConfidenceRequirementsWithLlm(options: {
  postings: PostingInput[]
  heuristicExtracted: ExtractedRequirement[]
}) {
  if (!isConfigured()) return []
  const lowSignalSegments = pickLowSignalSegments(options)
  if (lowSignalSegments.length === 0) return []

  const llmResponse = await callLlm(lowSignalSegments)
  if (!llmResponse) return []

  const segmentMap = new Map(lowSignalSegments.map((segment) => [segment.segmentId, segment]))
  const output: ExtractedRequirement[] = []
  const seen = new Set<string>()

  for (const candidate of llmResponse.requirements) {
    const segment = segmentMap.get(candidate.segmentId)
    if (!segment) continue
    const extracted = toExtractedRequirement(candidate, segment)
    if (!extracted) continue
    const key = `${extracted.type}:${extracted.normalizedKey}:${extracted.evidence.postingId ?? ''}`
    if (seen.has(key)) continue
    seen.add(key)
    output.push(extracted)
  }

  return output
}

