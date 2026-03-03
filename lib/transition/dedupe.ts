function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function normalizeBulletKey(value: string) {
  return normalizeText(value)
    .replace(/\b(a|an|the)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenize(value: string) {
  return normalizeText(value).split(' ').filter(Boolean)
}

export function dedupeBullets(
  values: string[],
  max = 4,
  transform?: (value: string) => string
) {
  const seen: string[] = []
  const output: string[] = []

  for (const value of values) {
    const candidate = (transform ? transform(value) : value).trim()
    if (!candidate) continue
    const key = normalizeBulletKey(candidate)
    if (!key) continue
    if (seen.some((item) => item === key || item.includes(key) || key.includes(item))) continue
    seen.push(key)
    output.push(candidate)
    if (output.length >= max) break
  }

  return output
}

export function compressSimilarBullets(
  values: string[],
  max = 4,
  transform?: (value: string) => string
) {
  const output: string[] = []
  const keys: string[] = []

  for (const value of values) {
    const candidate = (transform ? transform(value) : value).trim()
    if (!candidate) continue
    const nextKey = normalizeBulletKey(candidate)
    if (!nextKey) continue

    const nextTokens = new Set(tokenize(nextKey))
    const isNearDuplicate = keys.some((existing) => {
      const existingTokens = new Set(tokenize(existing))
      let overlap = 0
      for (const token of nextTokens) {
        if (existingTokens.has(token)) overlap += 1
      }
      const ratio =
        nextTokens.size === 0 ? 0 : overlap / Math.max(1, Math.min(existingTokens.size, nextTokens.size))
      return ratio >= 0.75
    })

    if (isNearDuplicate) continue
    keys.push(nextKey)
    output.push(candidate)
    if (output.length >= max) break
  }

  return output
}

export function excludeExistingBullets(
  values: string[],
  exclusions: string[],
  max = 4,
  transform?: (value: string) => string
) {
  const exclusionKeys = new Set(exclusions.map((item) => normalizeBulletKey(transform ? transform(item) : item)))
  const filtered = values.filter((item) => !exclusionKeys.has(normalizeBulletKey(transform ? transform(item) : item)))
  return dedupeBullets(filtered, max, transform)
}
