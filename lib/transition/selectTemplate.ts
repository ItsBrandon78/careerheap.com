import type { OccupationTemplateProfile, PlanTemplateKey } from '@/lib/transition/types'

const TRADE_KEYWORDS = [
  'electric',
  'hvac',
  'plumb',
  'carpent',
  'weld',
  'mechanic',
  'installer',
  'millwright',
  'refrigeration',
  'pipefitter',
  'sheet metal'
]
const PROFESSION_KEYWORDS = [
  'nurse',
  'teacher',
  'therapist',
  'pharmac',
  'social worker',
  'physician',
  'doctor',
  'medical',
  'clinical',
  'dentist',
  'orthodont',
  'anesthesi',
  'psychiat',
  'surgeon',
  'cardiolog',
  'counselor',
  'midwife',
  'dental hygienist'
]
const PORTFOLIO_KEYWORDS = [
  'designer',
  'developer',
  'software',
  'ux',
  'ui',
  'product design',
  'graphic',
  'writer',
  'creative'
]
const EXPERIENCE_LADDER_KEYWORDS = [
  'coordinator',
  'manager',
  'director',
  'assistant',
  'specialist',
  'operations',
  'hr',
  'administrator'
]

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
}

function includesAny(value: string, patterns: string[]) {
  return patterns.some((pattern) => value.includes(pattern))
}

function hasTradeSignals(profile: OccupationTemplateProfile) {
  const combined = normalizeText(
    [
      profile.title,
      ...profile.certifications,
      ...profile.hardGates,
      ...profile.employerSignals
    ].join(' ')
  )
  const stage = normalizeText(profile.stage ?? '')

  return (
    stage === 'helper' ||
    stage === 'apprentice' ||
    stage === 'licensed' ||
    profile.apprenticeshipHours !== null ||
    includesAny(combined, TRADE_KEYWORDS) ||
    /\bapprentice\b|\bunion\b|\bjourneyperson\b|\bred seal\b|\bcertificate of qualification\b|\bcoq\b/.test(
      combined
    )
  )
}

function hasRegulatedProfessionSignals(profile: OccupationTemplateProfile) {
  const combined = normalizeText(
    [profile.title, ...profile.certifications, ...profile.hardGates, ...profile.employerSignals].join(' ')
  )
  const education = normalizeText(profile.education)
  return (
    !hasTradeSignals(profile) &&
    (
      profile.regulated ||
      profile.examRequired === true ||
      includesAny(combined, PROFESSION_KEYWORDS) ||
      /\bboard\b|\blicense\b|\blicensure\b|\bregistration\b|\bregulated profession\b|\bcredential recognition\b/.test(
        combined
      )
    ) && (
      /\bbachelor\b|\bmaster\b|\bdegree\b|\bdoctorate\b|\bmedical degree\b/.test(education) ||
      profile.certifications.length > 0 ||
      profile.hardGates.length > 0 ||
      includesAny(combined, PROFESSION_KEYWORDS)
    )
  )
}

function hasPortfolioSignals(profile: OccupationTemplateProfile) {
  const combined = normalizeText(
    [profile.title, ...profile.employerSignals, ...profile.hardGates].join(' ')
  )
  return (
    !profile.regulated &&
    (includesAny(combined, PORTFOLIO_KEYWORDS) ||
      /\bportfolio\b|\bcase study\b|\bgithub\b|\bprototype\b|\bwork sample\b/.test(combined))
  )
}

function hasCredentialSignals(profile: OccupationTemplateProfile) {
  const combined = normalizeText(
    [profile.title, ...profile.certifications, ...profile.hardGates].join(' ')
  )
  return (
    !profile.regulated &&
    profile.certifications.length > 0 &&
    !hasTradeSignals(profile) &&
    (/\bcertificate\b|\bcertif\b|\baws\b|\bazure\b|\bgcp\b|\bsecurity\b|\banalyst\b|\bscientist\b|\bdata\b/.test(
      combined
    ) ||
      profile.hardGates.length > 0)
  )
}

export function selectPlanTemplate(
  occupationProfile: OccupationTemplateProfile,
  _location?: string,
  stage?: string | null
): PlanTemplateKey {
  const profile = {
    ...occupationProfile,
    stage: stage ?? occupationProfile.stage ?? null
  }
  const title = normalizeText(profile.title)

  if (hasTradeSignals(profile)) {
    return 'regulated_trade'
  }

  if (hasRegulatedProfessionSignals(profile)) {
    return 'regulated_profession'
  }

  if (hasPortfolioSignals(profile)) {
    return 'portfolio_role'
  }

  if (hasCredentialSignals(profile)) {
    return 'credentialed_role'
  }

  if (
    profile.relationship === 'within_career_progression' ||
    includesAny(title, EXPERIENCE_LADDER_KEYWORDS)
  ) {
    return 'experience_ladder_role'
  }

  return 'general_role'
}
