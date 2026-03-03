import { normalizeBulletKey } from '@/lib/transition/dedupe'

export type NormalizedProfileSignals = {
  skills: string[]
  certifications: string[]
  experienceSignals: string[]
  rawLines: string[]
}

const KNOWN_CERTIFICATIONS = [
  'WHMIS',
  'First Aid',
  'First Aid/CPR',
  'CPR',
  'CSTS',
  'OSHA',
  'Working at Heights',
  'Driver’s License',
  "Driver's License",
  'Drivers License',
  'H2S',
  'BLS',
  'ACLS',
  'Food Handler',
  'Forklift'
] as const

const KNOWN_SKILL_PHRASES = [
  'mechanical aptitude',
  'mechanical troubleshooting',
  'teamwork',
  'team leadership',
  'leadership',
  'safety focused',
  'safety-first mindset',
  'reliability',
  'documentation',
  'problem solving',
  'customer communication',
  'shift work',
  'pace',
  'physical stamina',
  'time management',
  'inventory',
  'scheduling'
] as const

const LOCATION_LINE_PATTERN =
  /\b(?:toronto|ottawa|montreal|vancouver|calgary|edmonton|winnipeg|new york|los angeles|chicago|ontario|alberta|british columbia|quebec|texas|california|florida|canada|united states|usa|us)\b/i

const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i
const URL_PATTERN = /\b(?:https?:\/\/|www\.|linkedin\.com)\S*/i
const PHONE_PATTERN =
  /\b(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}\b/
const ADDRESS_PATTERN = /\b(?:street|st\.|avenue|ave\.|road|rd\.|drive|dr\.|boulevard|blvd\.|lane|ln\.)\b/i
const TITLE_CASE_NAME_PATTERN =
  /^(?:[A-Z][a-z]+(?:[A-Z][a-z]+)*)(?:\s+[A-Z][a-z]+(?:[A-Z][a-z]+)*){1,2}$/

function cleanWhitespace(value: string) {
  return value.trim().replace(/\s+/g, ' ')
}

function titleCase(value: string) {
  const cleaned = cleanWhitespace(value)
  if (!cleaned) return ''
  return cleaned
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')
}

function uniqueStrings(values: string[]) {
  const seen = new Set<string>()
  const output: string[] = []
  for (const value of values) {
    const cleaned = cleanWhitespace(value)
    if (!cleaned) continue
    const key = cleaned.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    output.push(cleaned)
  }
  return output
}

function knownDictionaryKey(value: string) {
  return normalizeBulletKey(value)
}

function preferredCertificationLabel(value: string) {
  const key = knownDictionaryKey(value.replace(/\s*\/\s*/g, '/'))
  const exact = KNOWN_CERTIFICATIONS.find((item) => knownDictionaryKey(item.replace(/\s*\/\s*/g, '/')) === key)
  if (exact) return exact.replace(/[’]/g, "'")
  return titleCase(value.replace(/\s*\/\s*/g, '/'))
}

function isKnownDictionaryValue(value: string) {
  const key = knownDictionaryKey(value)
  if (!key) return false
  return (
    KNOWN_CERTIFICATIONS.some((item) => knownDictionaryKey(item) === key) ||
    KNOWN_SKILL_PHRASES.some((item) => knownDictionaryKey(item) === key)
  )
}

function sanitizeLine(value: string) {
  return cleanWhitespace(value.replace(/[•\t]+/g, ' ').replace(/\s*[|/]\s*/g, ' / '))
}

export function isPersonalIdentifier(value: string) {
  const trimmed = sanitizeLine(value)
  if (!trimmed) return true
  if (trimmed.length < 3) return true
  if (isKnownDictionaryValue(trimmed)) return false
  if (EMAIL_PATTERN.test(trimmed) || URL_PATTERN.test(trimmed) || PHONE_PATTERN.test(trimmed)) return true
  if (ADDRESS_PATTERN.test(trimmed)) return true
  if (TITLE_CASE_NAME_PATTERN.test(trimmed)) return true
  if (LOCATION_LINE_PATTERN.test(trimmed) && trimmed.split(/\s+/).length <= 4) return true
  return false
}

function matchKnownCertifications(text: string) {
  const normalizedText = text.toLowerCase()
  const matches = KNOWN_CERTIFICATIONS.filter((item) => {
    const normalizedItem = item.toLowerCase().replace(/[’']/g, "'")
    return normalizedText.includes(normalizedItem)
  }).map((item) => titleCase(item.replace(/[’]/g, "'")))

  const driverLicense =
    /\b(driver'?s?|drivers?)\s+licen[sc]e\b/i.test(text) || /\bg class\b/i.test(text)
      ? "Driver's License"
      : null

  return uniqueStrings([...matches, ...(driverLicense ? [driverLicense] : [])])
}

function extractTaggedValues(lines: string[], label: 'Skills' | 'Certifications') {
  const prefix = `${label.toLowerCase()}:`
  const collected: string[] = []
  for (const line of lines) {
    if (!line.toLowerCase().startsWith(prefix)) continue
    const rest = line.slice(prefix.length).trim()
    const items = rest
      .split(/[,;]\s*/)
      .map((item) => sanitizeLine(item))
      .filter(Boolean)
    collected.push(...items)
  }
  return collected
}

function normalizeSkill(value: string) {
  const cleaned = sanitizeLine(value)
  if (!cleaned || isPersonalIdentifier(cleaned)) return ''
  if (cleaned.length < 3) return ''
  return titleCase(cleaned)
}

function looksLikeExperienceSignal(value: string) {
  const cleaned = sanitizeLine(value)
  if (!cleaned || isPersonalIdentifier(cleaned)) return false
  if (cleaned.length < 10) return false
  if (/^(skills|certifications):/i.test(cleaned)) return false
  return /\b(led|managed|trained|reduced|improved|built|handled|coordinated|worked|support|maintained|served|supervised|ran)\b/i.test(
    cleaned
  ) || /\d/.test(cleaned)
}

function inferSkillsFromLines(lines: string[]) {
  const inferred: string[] = []

  for (const line of lines) {
    if (/^(skills|certifications):/i.test(line)) continue
    const normalized = line.toLowerCase()
    for (const phrase of KNOWN_SKILL_PHRASES) {
      if (normalized.includes(phrase)) {
        inferred.push(titleCase(phrase))
      }
    }
    if (/\bsafety\b/.test(normalized)) inferred.push('Safety Focused')
    if (/\bteam\b|\bcrew\b/.test(normalized)) inferred.push('Teamwork')
    if (/\bmanual\b|\blift\b|\bstand\b|\bphysical\b/.test(normalized)) inferred.push('Physical Stamina')
    if (/\btroubleshoot\b|\brepair\b|\bfix\b/.test(normalized)) inferred.push('Problem Solving')
    if (/\bshift\b/.test(normalized)) inferred.push('Shift Work')
  }

  return uniqueStrings(inferred)
}

export function extractProfileSignals(input: {
  experienceText?: string
  explicitSkills?: string[]
  explicitCertifications?: string[]
}) {
  const baseLines = uniqueStrings(
    (input.experienceText ?? '')
      .split(/\r?\n/)
      .map((line) => sanitizeLine(line))
      .filter((line) => line.length >= 3)
      .filter((line) => !isPersonalIdentifier(line))
  ).slice(0, 20)

  const taggedSkills = extractTaggedValues(baseLines, 'Skills')
  const taggedCertifications = extractTaggedValues(baseLines, 'Certifications')

  const hasCombinedFirstAidCpr = /first aid\s*\/\s*cpr/i.test(input.experienceText ?? '')

  const certifications = uniqueStrings([
    ...(input.explicitCertifications ?? []),
    ...taggedCertifications,
    ...baseLines.flatMap((line) => matchKnownCertifications(line))
  ])
    .map((item) => preferredCertificationLabel(item))
    .filter((item) => {
      if (!hasCombinedFirstAidCpr) return true
      return item !== 'First Aid' && item !== 'CPR'
    })
    .slice(0, 8)

  const skills = uniqueStrings([
    ...(input.explicitSkills ?? []),
    ...taggedSkills,
    ...inferSkillsFromLines(baseLines)
  ])
    .map((item) => normalizeSkill(item))
    .filter(Boolean)
    .filter((item) => !certifications.some((certification) => certification.toLowerCase() === item.toLowerCase()))
    .slice(0, 12)

  const experienceSignals = uniqueStrings(
    baseLines.filter((line) => looksLikeExperienceSignal(line))
  ).slice(0, 8)

  const rawLines = baseLines
    .filter((line) => !/^skills:/i.test(line) && !/^certifications:/i.test(line))
    .filter((line) => !certifications.some((item) => knownDictionaryKey(item) === knownDictionaryKey(line)))
    .filter((line) => !skills.some((item) => knownDictionaryKey(item) === knownDictionaryKey(line)))
    .slice(0, 12)

  return {
    skills,
    certifications,
    experienceSignals,
    rawLines
  } satisfies NormalizedProfileSignals
}
