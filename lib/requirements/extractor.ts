import {
  classifyRequirement,
  extractToolMentions,
  hasExperienceSignal,
  hasGateSignal
} from '@/lib/requirements/classify'
import {
  normalizeRequirementKey,
  normalizeWhitespace,
  toTaskLevelLabel
} from '@/lib/requirements/normalize'
import type {
  AggregatedRequirement,
  ExtractedRequirement,
  RequirementEvidence,
  RequirementEvidenceSource,
  RequirementType
} from '@/lib/requirements/types'

export interface RequirementSourceText {
  text: string
  source: RequirementEvidenceSource
  postingId?: string
}

export interface PostingRequirementInput {
  postingId: string
  description: string
}

const MAX_EVIDENCE_QUOTES = 5
const MAX_SEGMENTS_PER_TEXT = 120

const ACTION_VERB_PATTERN =
  /\b(build|create|deliver|design|develop|diagnose|document|execute|inspect|install|maintain|manage|operate|optimize|perform|plan|prepare|support|test|troubleshoot|verify|analyze|coordinate|lead)\b/i

const YEARS_PATTERN = /\b(\d+\+?\s*(?:years|yrs?|year))\b/i
const GATE_GENERIC_PATTERN =
  /\b(?:valid|current|active|required|mandatory|must have|must hold|needs?|need to hold|ability to obtain|able to obtain|obtain|maintain|possess)?\s*([a-z0-9+.#/&'()\- ]{2,70}?)\s+(certification|certificate|licen[cs]e|registration|clearance)\b/gi
const GENERIC_GATE_BASE_TOKENS = new Set([
  'a',
  'an',
  'all',
  'and',
  'appropriate',
  'applicable',
  'industry',
  'local',
  'mandatory',
  'minimum',
  'provincial',
  'relevant',
  'required',
  'role',
  'state',
  'the'
])
const NAMED_GATE_PATTERNS: Array<{ pattern: RegExp; name: (match: RegExpMatchArray) => string }> = [
  { pattern: /\bred seal\b/gi, name: () => 'Red Seal certification' },
  { pattern: /\bwhmis\b/gi, name: () => 'WHMIS certification' },
  { pattern: /\bcsts\b/gi, name: () => 'CSTS certification' },
  { pattern: /\bfirst aid\b/gi, name: () => 'First Aid certification' },
  { pattern: /\b(?:cpr\/bls|cpr|bls|acls)\b/gi, name: (match) => `${match[0].toUpperCase()} certification` },
  { pattern: /\bnclex(?:-rn)?\b/gi, name: (match) => `${match[0].toUpperCase()} pass status` },
  { pattern: /\bsecurity clearance\b/gi, name: () => 'security clearance' },
  { pattern: /\b(food handler|servsafe|haccp)\b/gi, name: (match) => `${match[1]} certification` },
  {
    pattern: /\b(class\s*[a-z0-9]+\s+driver(?:'s)?\s+licen[cs]e|driver(?:'s)?\s+licen[cs]e)\b/gi,
    name: (match) =>
      match[1]
        .replace(/\blicen[cs]e\b/i, 'license')
        .replace(/\bdriver(?:'s)?\b/i, "driver's")
  },
  { pattern: /\b(309a|442a)\b/gi, name: (match) => `${match[1].toUpperCase()} trade certification` },
  { pattern: /\b(pmp|cissp|cisa|cism|ceh|itil)\b/gi, name: (match) => `${match[1].toUpperCase()} certification` }
]

function splitSegments(input: string) {
  return input
    .split(/\r?\n|[.;]\s+/)
    .map((segment) =>
      segment
        .replace(/^[\s\-*\u2022]+/, '')
        .replace(/\s+/g, ' ')
        .trim()
    )
    .filter((segment) => segment.length >= 10 && segment.length <= 280)
    .slice(0, MAX_SEGMENTS_PER_TEXT)
}

function clipQuote(input: string) {
  const normalized = normalizeWhitespace(input)
  if (normalized.length <= 220) return normalized
  return `${normalized.slice(0, 217).trimEnd()}...`
}

function buildEvidence(options: {
  source: RequirementEvidenceSource
  quote: string
  postingId?: string
  confidence: number
}): RequirementEvidence {
  return {
    source: options.source,
    quote: clipQuote(options.quote),
    postingId: options.postingId,
    confidence: Number(options.confidence.toFixed(3))
  }
}

function yearsSignalLabel(segment: string) {
  const match = segment.match(YEARS_PATTERN)
  if (!match?.[1]) return null
  const roleContextMatch = segment.match(/\b(in|with|for)\s+([a-z0-9\s\-/,]{4,80})/i)
  const context = roleContextMatch?.[2]?.trim()
  if (context) {
    return `Demonstrate ${match[1]} of experience in ${context}`
  }
  return `Demonstrate ${match[1]} of role-relevant experience`
}

function normalizeGateSuffix(rawSuffix: string) {
  if (/certif|certificate/i.test(rawSuffix)) return 'certification'
  if (/licen[cs]e/i.test(rawSuffix)) return 'license'
  if (/registration/i.test(rawSuffix)) return 'registration'
  if (/clearance/i.test(rawSuffix)) return 'clearance'
  return rawSuffix.toLowerCase()
}

function gateDisplayName(raw: string) {
  const normalized = normalizeWhitespace(
    raw
      .replace(/^(?:valid|current|active|required|mandatory|must have|must hold|needs?|need to hold|ability to obtain|able to obtain|obtain|maintain|possess)\s+/i, '')
      .replace(/^[\s:;,.!?-]+|[\s:;,.!?-]+$/g, '')
  )
  if (!normalized) return null
  const tokens = normalizeRequirementKey(normalized).split(' ').filter(Boolean)
  if (tokens.length === 0 || tokens.length > 8) return null
  const meaningful = tokens.filter((token) => !GENERIC_GATE_BASE_TOKENS.has(token))
  if (meaningful.length === 0) return null
  return normalized
}

function pushUniqueRequirementLabel(output: string[], label: string) {
  const trimmed = normalizeWhitespace(label)
  if (!trimmed) return
  const key = normalizeRequirementKey(trimmed)
  if (!key) return
  const exists = output.some((item) => normalizeRequirementKey(item) === key)
  if (!exists) output.push(trimmed)
}

function extractNamedGateRequirements(segment: string) {
  const output: string[] = []

  for (const entry of NAMED_GATE_PATTERNS) {
    for (const match of segment.matchAll(entry.pattern)) {
      const name = gateDisplayName(entry.name(match))
      if (!name) continue
      pushUniqueRequirementLabel(output, `Obtain ${name} before applying`)
    }
  }

  for (const match of segment.matchAll(GATE_GENERIC_PATTERN)) {
    const base = gateDisplayName(match[1] ?? '')
    if (!base) continue
    const suffix = normalizeGateSuffix(match[2] ?? '')
    const combinedName = gateDisplayName(`${base} ${suffix}`)
    if (!combinedName) continue
    if (/registration/i.test(combinedName)) {
      pushUniqueRequirementLabel(output, `Complete ${combinedName} before role entry`)
      continue
    }
    if (/clearance/i.test(combinedName)) {
      pushUniqueRequirementLabel(output, `Obtain ${combinedName} for role eligibility`)
      continue
    }
    pushUniqueRequirementLabel(output, `Obtain ${combinedName} before applying`)
  }

  return output.slice(0, 3)
}

function gateLabels(segment: string) {
  const named = extractNamedGateRequirements(segment)
  if (named.length > 0) return named

  if (/security clearance/i.test(segment)) {
    return ['Obtain required security clearance for role eligibility']
  }
  if (/registration/i.test(segment)) {
    return ['Complete required registration before role entry']
  }
  if (/apprenticeship/i.test(segment)) {
    return ['Complete apprenticeship registration and hour tracking requirements']
  }
  if (/license|licence/i.test(segment)) {
    return ['Obtain required license before independent work']
  }
  if (/certif/i.test(segment)) {
    return ['Obtain required certification with active status']
  }
  const fallback = toTaskLevelLabel(segment, 'gate')
  return fallback ? [fallback] : []
}

function experienceSignalLabel(segment: string) {
  const years = yearsSignalLabel(segment)
  if (years) return years
  if (/portfolio|case study|work sample/i.test(segment)) {
    return 'Build portfolio evidence with measurable, role-specific outcomes'
  }
  if (/shipped|production/i.test(segment)) {
    return 'Demonstrate shipped production work and measurable impact'
  }
  if (/managed\s+\$|managed budget/i.test(segment)) {
    return 'Demonstrate ownership of budget targets with performance outcomes'
  }
  if (/clinical|rotation/i.test(segment)) {
    return 'Complete required clinical rotations and document supervised competencies'
  }
  return toTaskLevelLabel(segment, 'experience_signal')
}

function hardSkillLabel(segment: string) {
  if (!ACTION_VERB_PATTERN.test(segment)) return null
  return toTaskLevelLabel(segment, 'hard_skill')
}

function softSignalToTaskLabel(segment: string) {
  if (/communication|stakeholder/i.test(segment)) {
    return 'Communicate technical updates to stakeholders with clear action ownership'
  }
  if (/leadership|lead/i.test(segment)) {
    return 'Lead cross-functional execution with documented delivery outcomes'
  }
  if (/teamwork|collaboration/i.test(segment)) {
    return 'Collaborate across teams to deliver role-critical milestones on time'
  }
  return toTaskLevelLabel(segment, 'soft_signal')
}

function buildRequirement(options: {
  type: RequirementType
  rawLabel: string | null
  source: RequirementEvidenceSource
  quote: string
  postingId?: string
  confidence: number
}) {
  if (!options.rawLabel) return null
  const label = options.rawLabel.trim()
  if (!label) return null
  const normalizedKey = normalizeRequirementKey(label)
  if (!normalizedKey) return null

  return {
    type: options.type,
    label,
    normalizedKey,
    confidence: options.confidence,
    evidence: buildEvidence({
      source: options.source,
      quote: options.quote,
      postingId: options.postingId,
      confidence: options.confidence
    })
  } satisfies ExtractedRequirement
}

export function extractRequirementsFromText(sourceText: RequirementSourceText) {
  const segments = splitSegments(sourceText.text)
  const output: ExtractedRequirement[] = []
  const seen = new Set<string>()

  for (const segment of segments) {
    const tools = extractToolMentions(segment)
    for (const tool of tools) {
      const requirement = buildRequirement({
        type: 'tool',
        rawLabel: toTaskLevelLabel(tool, 'tool'),
        source: sourceText.source,
        quote: segment,
        postingId: sourceText.postingId,
        confidence: 0.86
      })
      if (requirement && !seen.has(`${requirement.type}:${requirement.normalizedKey}`)) {
        seen.add(`${requirement.type}:${requirement.normalizedKey}`)
        output.push(requirement)
      }
    }

    const classified = classifyRequirement(segment)

    if (hasGateSignal(segment) || classified === 'gate') {
      for (const gate of gateLabels(segment)) {
        const requirement = buildRequirement({
          type: 'gate',
          rawLabel: gate,
          source: sourceText.source,
          quote: segment,
          postingId: sourceText.postingId,
          confidence: 0.9
        })
        if (requirement && !seen.has(`${requirement.type}:${requirement.normalizedKey}`)) {
          seen.add(`${requirement.type}:${requirement.normalizedKey}`)
          output.push(requirement)
        }
      }
    }

    if (hasExperienceSignal(segment) || classified === 'experience_signal') {
      const requirement = buildRequirement({
        type: 'experience_signal',
        rawLabel: experienceSignalLabel(segment),
        source: sourceText.source,
        quote: segment,
        postingId: sourceText.postingId,
        confidence: 0.84
      })
      if (requirement && !seen.has(`${requirement.type}:${requirement.normalizedKey}`)) {
        seen.add(`${requirement.type}:${requirement.normalizedKey}`)
        output.push(requirement)
      }
    }

    const hard = buildRequirement({
      type: 'hard_skill',
      rawLabel: hardSkillLabel(segment),
      source: sourceText.source,
      quote: segment,
      postingId: sourceText.postingId,
      confidence: 0.8
    })
    if (hard && !seen.has(`${hard.type}:${hard.normalizedKey}`)) {
      seen.add(`${hard.type}:${hard.normalizedKey}`)
      output.push(hard)
    }

    if (classified === 'soft_signal') {
      const soft = buildRequirement({
        type: 'soft_signal',
        rawLabel: softSignalToTaskLabel(segment),
        source: sourceText.source,
        quote: segment,
        postingId: sourceText.postingId,
        confidence: 0.7
      })
      if (soft && !seen.has(`${soft.type}:${soft.normalizedKey}`)) {
        seen.add(`${soft.type}:${soft.normalizedKey}`)
        output.push(soft)
      }
    }
  }

  return output
}

export function aggregateRequirements(items: ExtractedRequirement[]) {
  const map = new Map<
    string,
    {
      type: RequirementType
      label: string
      normalizedKey: string
      frequency: number
      confidence: number
      postingIds: Set<string>
      evidence: RequirementEvidence[]
    }
  >()

  for (const item of items) {
    const key = `${item.type}:${item.normalizedKey}`
    const existing = map.get(key)
    if (!existing) {
      map.set(key, {
        type: item.type,
        label: item.label,
        normalizedKey: item.normalizedKey,
        frequency: item.evidence.postingId ? 1 : 1,
        confidence: item.confidence,
        postingIds: new Set(item.evidence.postingId ? [item.evidence.postingId] : []),
        evidence: [item.evidence]
      })
      continue
    }

    if (item.confidence > existing.confidence) {
      existing.confidence = item.confidence
      existing.label = item.label
    }

    if (item.evidence.postingId) {
      if (!existing.postingIds.has(item.evidence.postingId)) {
        existing.postingIds.add(item.evidence.postingId)
        existing.frequency += 1
      }
    } else {
      existing.frequency += 1
    }

    const evidenceKey = `${item.evidence.source}:${item.evidence.quote}:${item.evidence.postingId ?? ''}`
    const alreadyIncluded = existing.evidence.some(
      (entry) =>
        `${entry.source}:${entry.quote}:${entry.postingId ?? ''}` === evidenceKey
    )
    if (!alreadyIncluded && existing.evidence.length < MAX_EVIDENCE_QUOTES) {
      existing.evidence.push(item.evidence)
    }
  }

  return [...map.values()]
    .map(
      (row) =>
        ({
          type: row.type,
          label: row.label,
          normalizedKey: row.normalizedKey,
          frequency: row.frequency,
          evidence: row.evidence
        }) satisfies AggregatedRequirement
    )
    .sort((left, right) => {
      if (right.frequency !== left.frequency) return right.frequency - left.frequency
      if (left.type !== right.type) return left.type.localeCompare(right.type)
      return left.label.localeCompare(right.label)
    })
}

export function extractRequirementsFromPostings(
  postings: PostingRequirementInput[],
  source: RequirementEvidenceSource = 'adzuna'
) {
  const extracted = postings.flatMap((posting) =>
    extractRequirementsFromText({
      source,
      text: posting.description,
      postingId: posting.postingId
    })
  )

  return aggregateRequirements(extracted)
}

