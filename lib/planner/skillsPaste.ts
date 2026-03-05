const BULLET_PREFIX_REGEX = /^\s*(?:[\u2022\u2023\u25E6\u2043\u2219\-*]+|\d{1,3}[.)])\s*/u
const QUOTE_EDGE_REGEX = /^[`"'“”‘’]+|[`"'“”‘’]+$/gu

export interface ExtractSkillsFromPasteOptions {
  text: string
  skillIndex: Map<string, string>
  maxCandidates?: number
  exactScanThreshold?: number
}

function stripEdgeDecorators(value: string) {
  return value.replace(QUOTE_EDGE_REGEX, '').replace(/^[,;:|/\\]+|[,;:|/\\]+$/g, '')
}

function looksLikeNoise(value: string) {
  if (!value) return true
  if (/@/.test(value)) return true
  if (/(https?:\/\/|www\.)/i.test(value)) return true
  if (/\d{7,}/.test(value)) return true
  return false
}

export function normalizeSkill(input: string) {
  const normalizedWhitespace = input.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim()
  if (!normalizedWhitespace) return ''

  const withoutPrefix = normalizedWhitespace.replace(BULLET_PREFIX_REGEX, '')
  const cleaned = stripEdgeDecorators(withoutPrefix).trim()
  return cleaned
}

export function normalizeSkillKey(input: string) {
  const normalized = normalizeSkill(input).toLowerCase()
  if (!normalized) return ''

  return normalized
    .replace(/[(){}\[\]]/g, ' ')
    .replace(/[^a-z0-9+#]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function splitPastedText(text: string) {
  const prepared = text
    .replace(/\r/g, '\n')
    .replace(/[•·▪●◦]/g, '\n')
    .replace(/\t/g, '\n')
    .replace(/\s+\|\s+/g, '\n')

  return prepared
    .split(/[\n,;]+|\/+/g)
    .map((token) => normalizeSkill(token))
    .filter((token) => token.length >= 2 && token.length <= 60)
    .filter((token) => !looksLikeNoise(token))
}

function splitPrimaryPastedText(text: string) {
  const prepared = text
    .replace(/\r/g, '\n')
    .replace(/[•·▪●◦]/g, '\n')
    .replace(/\t/g, '\n')
    .replace(/\s+\|\s+/g, '\n')

  return prepared
    .split(/[\n,;]+/g)
    .map((token) => normalizeSkill(token))
    .filter((token) => token.length >= 2 && token.length <= 120)
    .filter((token) => !looksLikeNoise(token))
}

export function isLargeBlock(text: string) {
  const length = text.trim().length
  if (length === 0) return false
  const lineCount = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0).length

  return length > 300 || lineCount > 8
}

export function buildSkillIndex(skillsDataset: Array<string | { name?: string | null }>) {
  const index = new Map<string, string>()

  for (const entry of skillsDataset) {
    const rawName = typeof entry === 'string' ? entry : entry.name ?? ''
    const cleaned = normalizeSkill(rawName)
    const key = normalizeSkillKey(cleaned)
    if (!cleaned || !key || index.has(key)) continue
    index.set(key, cleaned)
  }

  return index
}

export function matchTokenToSkill(token: string, skillIndex: Map<string, string>) {
  const cleaned = normalizeSkill(token)
  if (!cleaned || looksLikeNoise(cleaned)) return null

  const key = normalizeSkillKey(cleaned)
  if (!key) return null

  const canonicalMatch = skillIndex.get(key)
  if (canonicalMatch) {
    return canonicalMatch
  }

  const wordCount = key.split(' ').filter(Boolean).length
  if (wordCount === 0 || wordCount > 6) return null
  if (/[.!?]/.test(cleaned)) return null

  return cleaned
}

export function extractSkillsFromPastedText({
  text,
  skillIndex,
  maxCandidates = 40,
  exactScanThreshold = 4000
}: ExtractSkillsFromPasteOptions) {
  const largeBlock = isLargeBlock(text)
  const deduped = new Map<string, string>()

  const pushCandidate = (value: string) => {
    const cleaned = normalizeSkill(value)
    const key = normalizeSkillKey(cleaned)
    if (!cleaned || !key || deduped.has(key)) return
    deduped.set(key, cleaned)
  }

  if (largeBlock && skillIndex.size > 0 && skillIndex.size <= exactScanThreshold) {
    const searchableText = ` ${text.toLowerCase().replace(/[^a-z0-9+#]+/gi, ' ')} `
    for (const [key, canonical] of skillIndex.entries()) {
      if (searchableText.includes(` ${key} `)) {
        pushCandidate(canonical)
        if (deduped.size >= maxCandidates) break
      }
    }
  }

  const tokens = splitPrimaryPastedText(text)
  const tokenCap = largeBlock ? 250 : 120
  for (const token of tokens.slice(0, tokenCap)) {
    const matched = matchTokenToSkill(token, skillIndex)
    if (matched) {
      pushCandidate(matched)
      if (deduped.size >= maxCandidates) break
      continue
    }

    if (token.includes('/')) {
      const slashSplitMatches = token
        .split(/\/+/g)
        .map((part) => normalizeSkill(part))
        .filter((part) => part.length >= 2 && part.length <= 60)
      for (const part of slashSplitMatches) {
        const splitMatch = matchTokenToSkill(part, skillIndex)
        if (!splitMatch) continue
        pushCandidate(splitMatch)
        if (deduped.size >= maxCandidates) break
      }
    }

    if (deduped.size >= maxCandidates) break
  }

  return {
    skills: Array.from(deduped.values()).slice(0, maxCandidates),
    requiresReview: largeBlock
  }
}
