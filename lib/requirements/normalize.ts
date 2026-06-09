import type { RequirementType } from '@/lib/requirements/types'

const VAGUE_TERMS = new Set([
  'mechanical',
  'mechanics',
  'chemistry',
  'physics',
  'science',
  'mathematics',
  'math',
  'communication',
  'leadership',
  'teamwork',
  'organized',
  'organization',
  'detail oriented',
  'adaptable',
  'adaptability',
  'problem solving',
  'motivated',
  'reliable',
  'hardworking',
  'hard working'
])

const FILLER_PREFIXES = [
  /^must have\s+/i,
  /^must be able to\s+/i,
  /^ability to\s+/i,
  /^proven ability to\s+/i,
  /^experience with\s+/i,
  /^responsible for\s+/i,
  /^knowledge of\s+/i,
  /^strong\s+/i
]

const TOOL_CONTEXT_SUFFIX = 'in role-relevant workflows'
const HARD_SKILL_CONTEXT_SUFFIX = 'in production scenarios'

function trimPunctuation(value: string) {
  return value.replace(/^[\s:;,.!?-]+|[\s:;,.!?-]+$/g, '')
}

export function normalizeWhitespace(value: string) {
  return value
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

export function normalizeRequirementKey(value: string) {
  return normalizeWhitespace(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function stripFillerPrefix(value: string) {
  let output = value
  for (const pattern of FILLER_PREFIXES) {
    output = output.replace(pattern, '')
  }
  return output
}

function startsWithVerbPhrase(value: string) {
  return /^(build|create|deliver|design|develop|execute|install|inspect|maintain|manage|operate|perform|prepare|run|support|troubleshoot|use|verify|obtain|complete|demonstrate|ship|document|analyze|coordinate|apply|meet|register|submit|pass|attend|secure|earn|hold|provide)\b/i.test(
    value
  )
}

function hasImplausibleOrLeakedClaim(value: string) {
  const lower = value.toLowerCase()
  // 30+ years (or 3-digit) experience claims are implausible / garbled source text.
  if (/\b(\d{3,}|[3-9]\d)\s*\+?\s*years?\b/.test(lower)) return true
  // First-person / recruiting-posting prose that leaked into the requirement text.
  if (/\b(we['’]re|we are|we have|we['’]ve|our team|join (us|our|the|your)|apply now|equal opportunity)\b/.test(lower)) return true
  // Job-ad recruiting prose ("CareRx is seeking…", "looking for a…", "now hiring").
  if (/\b(is seeking|are seeking|seeking a|is looking for|are looking for|looking for a|is hiring|are hiring|now hiring|is currently|currently hiring|proudly supported|dedicated to)\b/.test(lower)) {
    return true
  }
  return false
}

// Convert a requirement label into a clean object phrase so it can be wrapped by
// an outer verb template without stacking verbs ("Start obtain X") or trailing
// boilerplate. e.g. "Obtain 309A trade certification before applying" ->
// "309A trade certification"; "Demonstrate X with measurable outcomes" -> "X".
export function toRequirementObjectPhrase(label: string) {
  let s = normalizeWhitespace(label)
  s = s.replace(
    /^(obtain|complete|register(?:\s+for)?|maintain|apply\s+(?:to|for)|apply|meet|submit|pass|attend|secure|earn|hold|provide|demonstrate|perform|use|build|create|deliver|design|develop|execute|install|inspect|operate|prepare|run|support|troubleshoot|verify|ship|document|analyze|coordinate|manage|learn(?:\s+the\s+basics\s+of)?|start|confirm|log)\s+/i,
    ''
  )
  s = s.replace(
    /\s+(before applying|before role entry|for role eligibility|with measurable outcomes|with active status|in role-relevant workflows|in short daily blocks)\s*\.?\s*$/i,
    ''
  )
  s = trimPunctuation(s).trim()
  if (!s) return normalizeWhitespace(label)
  return s.charAt(0).toLowerCase() + s.slice(1)
}

function hasExperienceSignalPhrase(value: string) {
  return /\b(\d+\+?\s*(years|yrs|year)|portfolio|project|ship(ped)?|clinical|rotation|managed|certif|license|apprentice)\b/i.test(
    value
  )
}

function expandSingleTokenLabel(token: string, type: RequirementType) {
  const normalized = normalizeRequirementKey(token)
  if (!normalized) return null
  if (type === 'gate') return startsWithVerbPhrase(token) ? token : `Obtain ${token}`
  if (type === 'tool') return `Use ${token} ${TOOL_CONTEXT_SUFFIX}`
  return null
}

function isSingleToken(value: string) {
  return normalizeRequirementKey(value).split(' ').filter(Boolean).length <= 1
}

export function isVagueRequirementLabel(value: string) {
  const normalized = normalizeRequirementKey(value)
  if (!normalized) return true
  if (VAGUE_TERMS.has(normalized)) return true
  if (normalized.length < 3) return true
  return false
}

export function toTaskLevelLabel(input: string, type: RequirementType) {
  const normalized = normalizeWhitespace(input)
  if (!normalized) return null

  const stripped = trimPunctuation(stripFillerPrefix(normalized))
  if (!stripped) return null

  // Reject leaked/garbled source text (implausible experience claims like
  // "30 years"/"50 years", or job-posting prose) so it never becomes a
  // requirement label such as "Demonstrate 50 years of experience…".
  if (hasImplausibleOrLeakedClaim(stripped)) return null

  if (isSingleToken(stripped)) {
    if (isVagueRequirementLabel(stripped) && type !== 'tool') return null
    return expandSingleTokenLabel(stripped, type)
  }

  if (isVagueRequirementLabel(stripped)) return null

  if (startsWithVerbPhrase(stripped)) return stripped

  if (type === 'hard_skill') return null
  if (type === 'soft_signal') return null
  if (type === 'experience_signal') {
    if (!hasExperienceSignalPhrase(stripped)) return null
    return `Demonstrate ${stripped} with measurable outcomes`
  }

  if (type === 'gate') return startsWithVerbPhrase(stripped) ? stripped : `Obtain ${stripped}`
  if (type === 'tool') return `Use ${stripped} ${TOOL_CONTEXT_SUFFIX}`
  return `Perform ${stripped} ${HARD_SKILL_CONTEXT_SUFFIX}`
}
