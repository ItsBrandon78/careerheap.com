import { createAdminClient } from '@/lib/supabase/admin'

interface SkillRow {
  id: string
  name: string
  aliases: unknown
}

interface OccupationRow {
  id: string
  title: string
  region: 'US' | 'CA'
}

function normalizeText(value: string | null | undefined) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/\bc\+\+\b/g, ' c plus plus ')
    .replace(/\bc#\b/g, ' c sharp ')
    .replace(/\bf#\b/g, ' f sharp ')
    .replace(/\bcompti\b/g, ' comptia ')
    .replace(/\.net/g, ' dot net ')
    .replace(/\+/g, ' plus ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function compactText(value: string | null | undefined) {
  return normalizeText(value).replace(/\s+/g, '')
}

function tokenize(value: string) {
  const normalized = normalizeText(value)
  if (!normalized) return []
  return normalized
    .split(' ')
    .map((token) => {
      if (token.endsWith('ies') && token.length > 4) return `${token.slice(0, -3)}y`
      if (token.endsWith('es') && token.length > 4 && /(ches|shes|sses|xes|zes)$/.test(token)) {
        return token.slice(0, -2)
      }
      if (token.endsWith('s') && token.length > 3) return token.slice(0, -1)
      return token
    })
    .filter(Boolean)
}

function similarity(a: string, b: string) {
  const left = new Set(tokenize(a))
  const right = new Set(tokenize(b))
  if (!left.size || !right.size) return 0
  let shared = 0
  for (const token of left) {
    if (right.has(token)) shared += 1
  }
  return shared / new Set([...left, ...right]).size
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function containsNormalizedTerm(haystack: string, term: string) {
  const normalizedTerm = normalizeText(term)
  if (normalizedTerm.length < 3) return false
  const normalizedHaystack = normalizeText(haystack)
  const pattern = `\\b${escapeRegExp(normalizedTerm).replace(/\s+/g, '\\s+')}\\b`
  if (new RegExp(pattern).test(normalizedHaystack)) return true

  const compactTerm = compactText(normalizedTerm)
  if (compactTerm.length >= 4 && compactText(haystack).includes(compactTerm)) return true

  const normalizedNoSingleLetters = normalizedTerm
    .split(' ')
    .filter((token) => token.length > 1)
    .join(' ')
  if (!normalizedNoSingleLetters) return false
  if (new RegExp(`\\b${escapeRegExp(normalizedNoSingleLetters).replace(/\s+/g, '\\s+')}\\b`).test(normalizedHaystack)) {
    return true
  }

  return false
}

const CERTIFICATION_LINE_PATTERN =
  /\b(certification|certificate|certified|licensed|licence|license|red seal|journeyperson|coq|comp\s*tia|whmis|csts|osha|first aid|cpr|ccna|cissp|aws certified|azure|gcp|pmp|itil)\b/i

const CERTIFICATION_MENTIONS = [
  /\bcomp\s*tia\s*(?:a\+|a plus|security\+|security plus|network\+|network plus|cysa\+|cysa plus|casp\+|casp plus|pentest\+|pentest plus)\b/gi,
  /\baws certified [a-z0-9 +\-]+\b/gi,
  /\bazure [a-z0-9 +\-]*certif[a-z]*\b/gi,
  /\bgcp [a-z0-9 +\-]*certif[a-z]*\b/gi,
  /\bcissp\b/gi,
  /\bccna\b/gi,
  /\bpmp\b/gi,
  /\bitil\b/gi,
  /\bcsts(?:\s*\d{4})?\b/gi,
  /\bwhmis\b/gi,
  /\bosha(?:\s*\d+)?\b/gi,
  /\bfirst aid(?:\/cpr)?\b/gi,
  /\bcpr\b/gi,
  /\bred seal\b/gi,
  /\bjourneyperson\b/gi,
  /\bcertificate of qualification\b/gi,
  /\bcoq\b/gi
]

function titleCaseLoose(value: string) {
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((word) => {
      if (word.length <= 3 && /^[A-Z0-9+/-]+$/.test(word)) return word
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    })
    .join(' ')
}

function dedupePreserveOrder(values: string[]) {
  const seen = new Set<string>()
  const output: string[] = []
  for (const value of values) {
    const trimmed = value.trim()
    if (!trimmed) continue
    const key = normalizeText(trimmed)
    if (!key || seen.has(key)) continue
    seen.add(key)
    output.push(trimmed)
  }
  return output
}

function extractCertifications(lines: string[], text: string) {
  const fromLines = lines.flatMap((line) => {
    if (!CERTIFICATION_LINE_PATTERN.test(line)) return []
    const cleaned = line
      .replace(/^[-*•]\s*/, '')
      .replace(/^(certifications?|licenses?|licences?)\s*:\s*/i, '')
      .replace(/\b(certified in|certification in|licensed in)\b/gi, '')
      .trim()
    if (!cleaned) return []
    return cleaned
      .split(/,|;|\band\b|\bwith\b/gi)
      .map((part) => part.trim())
      .filter((part) => part.length >= 2 && part.length <= 72 && /[a-z]/i.test(part))
      .map((part) => titleCaseLoose(part))
  })

  const fromPatterns = CERTIFICATION_MENTIONS.flatMap((pattern) => {
    const matches = text.match(pattern) ?? []
    return matches.map((entry) => titleCaseLoose(entry))
  })

  return dedupePreserveOrder([...fromLines, ...fromPatterns]).slice(0, 12)
}

function asArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item ?? '').trim()).filter(Boolean)
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return []
    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) return parsed.map((item) => String(item ?? '').trim()).filter(Boolean)
    } catch {
      return [trimmed]
    }
  }
  return []
}

export interface ResumeStructuredData {
  jobTitles: Array<{
    raw: string
    occupationId: string | null
    occupationTitle: string | null
    confidence: number
  }>
  dateRanges: string[]
  bullets: string[]
  skills: Array<{ id: string; name: string; confidence: number }>
  education: string[]
  certifications: string[]
  confidence: {
    titles: number
    skills: number
    education: number
    certifications: number
  }
}

function customSkillId(name: string) {
  const slug = normalizeText(name).replace(/\s+/g, '-').slice(0, 60)
  return `custom:${slug || 'resume-skill'}`
}

export async function extractStructuredResumeData(input: {
  text: string
  regionHint?: 'US' | 'CA'
}): Promise<ResumeStructuredData> {
  const admin = createAdminClient()
  const [skillsRes, occupationsRes] = await Promise.all([
    admin.from('skills').select('id,name,aliases').order('name', { ascending: true }),
    admin
      .from('occupations')
      .select('id,title,region')
      .eq('region', input.regionHint ?? 'US')
      .limit(1000)
  ])

  if (skillsRes.error) throw skillsRes.error
  if (occupationsRes.error) throw occupationsRes.error

  const skills = (skillsRes.data ?? []) as SkillRow[]
  const occupations = (occupationsRes.data ?? []) as OccupationRow[]
  const lines = input.text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  const bullets = lines
    .filter((line) => /^[-*•]/.test(line) || (line.length >= 35 && /\b(improved|led|built|managed|reduced|increased)\b/i.test(line)))
    .map((line) => line.replace(/^[-*•]\s*/, '').trim())
    .slice(0, 12)

  const dateRangePattern = /\b(?:19|20)\d{2}\s*(?:-|to|–)\s*(?:present|current|(?:19|20)\d{2})\b/gi
  const dateRanges = Array.from(new Set((input.text.match(dateRangePattern) ?? []).map((item) => item.trim()))).slice(0, 10)

  const titleCandidates = lines
    .filter((line) =>
      line.length <= 90 &&
      /\b(manager|engineer|specialist|analyst|technician|electrician|coordinator|operator|assistant|director|chef|cook|developer|programmer|designer|architect|mechanic|welder|nurse|plumber|carpenter|driver)\b/i.test(line)
    )
    .slice(0, 10)

  const mappedTitles = titleCandidates.map((raw) => {
    let best: { id: string; title: string; score: number } | null = null
    for (const occupation of occupations) {
      const score = similarity(raw, occupation.title)
      if (!best || score > best.score) {
        best = { id: occupation.id, title: occupation.title, score }
      }
    }
    return {
      raw,
      occupationId: best && best.score >= 0.25 ? best.id : null,
      occupationTitle: best && best.score >= 0.25 ? best.title : null,
      confidence: best ? Math.round(best.score * 100) / 100 : 0
    }
  })

  const certifications = extractCertifications(lines, input.text)
  const skillText = [input.text, certifications.join(' ')].filter(Boolean).join('\n')
  const mappedSkills = skills
    .map((skill) => {
      const terms = [skill.name, ...asArray(skill.aliases)].map((value) => normalizeText(value)).filter(Boolean)
      const found = terms.find((term) => containsNormalizedTerm(skillText, term))
      if (!found) return null
      const confidence = found === normalizeText(skill.name) ? 0.98 : 0.82
      return { id: skill.id, name: skill.name, confidence }
    })
    .filter((item): item is { id: string; name: string; confidence: number } => Boolean(item))
  const knownSkillNames = new Set(mappedSkills.map((item) => normalizeText(item.name)))
  const certificationAsSkills = certifications
    .filter((cert) => !knownSkillNames.has(normalizeText(cert)))
    .map((cert) => ({ id: customSkillId(cert), name: cert, confidence: 0.7 }))
  const combinedSkills = [...mappedSkills, ...certificationAsSkills].slice(0, 40)

  const education = lines
    .filter((line) => /\b(bachelor|master|phd|doctorate|diploma|college|university|school|degree|education)\b/i.test(line))
    .slice(0, 8)

  const titleConfidence = mappedTitles.length
    ? Math.round((mappedTitles.reduce((sum, item) => sum + item.confidence, 0) / mappedTitles.length) * 100) / 100
    : 0

  return {
    jobTitles: mappedTitles,
    dateRanges,
    bullets,
    skills: combinedSkills,
    education,
    certifications,
    confidence: {
      titles: titleConfidence,
      skills: combinedSkills.length > 0 ? 0.9 : 0,
      education: education.length > 0 ? 0.85 : 0,
      certifications: certifications.length > 0 ? 0.85 : 0
    }
  }
}
