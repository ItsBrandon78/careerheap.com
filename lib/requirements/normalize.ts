import type { RequirementType } from '@/lib/requirements/types'

const VAGUE_TERMS = new Set([
  'mechanical',
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
  return /^(build|create|deliver|design|develop|execute|install|inspect|maintain|manage|operate|perform|prepare|run|support|troubleshoot|use|verify|obtain|complete|demonstrate|ship|document|analyze|coordinate)\b/i.test(
    value
  )
}

function expandSingleTokenLabel(token: string, type: RequirementType) {
  const normalized = normalizeRequirementKey(token)
  if (!normalized) return null
  if (type === 'gate') return `Obtain ${token} certification or licensing proof`
  if (type === 'tool') return `Use ${token} ${TOOL_CONTEXT_SUFFIX}`
  if (type === 'experience_signal') return `Demonstrate measurable ${token} experience in prior work`
  if (type === 'soft_signal') return `Demonstrate ${token} through documented collaboration outcomes`
  return `Perform ${token} tasks ${HARD_SKILL_CONTEXT_SUFFIX}`
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

  if (isSingleToken(stripped)) {
    if (isVagueRequirementLabel(stripped) && type !== 'tool') return null
    return expandSingleTokenLabel(stripped, type)
  }

  if (isVagueRequirementLabel(stripped)) return null

  if (startsWithVerbPhrase(stripped)) return stripped

  if (type === 'gate') return `Obtain ${stripped}`
  if (type === 'tool') return `Use ${stripped} ${TOOL_CONTEXT_SUFFIX}`
  if (type === 'experience_signal') return `Demonstrate ${stripped} with measurable outcomes`
  if (type === 'soft_signal') {
    return `Demonstrate ${stripped} during cross-functional execution`
  }
  return `Perform ${stripped} ${HARD_SKILL_CONTEXT_SUFFIX}`
}
