import type { CareerPathType, OccupationTemplateProfile, PlanTemplateKey } from '@/lib/transition/types'
import { inferCanonicalCareerPathTypeFromTitle } from '@/lib/occupations/canonicalRoleRegistry'

const TRADE_KEYWORDS = [
  'electric',
  'hvac',
  'plumb',
  'carpent',
  'weld',
  'machinist',
  'cook',
  'industrial mechanic',
  'millwright',
  'refrigeration',
  'pipefitter',
  'sheet metal',
  'boilermaker',
  'ironworker',
  'powerline',
  'heavy equipment',
  'truck and coach'
]
const HEALTHCARE_KEYWORDS = [
  'nurse',
  'licensed practical nurse',
  'registered practical nurse',
  'registered nurse',
  'lpn',
  'rpn',
  'rn',
  'patient',
  'clinical',
  'hospital',
  'medical',
  'dental hygienist',
  'dental assistant',
  'paramedic',
  'pharmacy technician',
  'occupational therapist',
  'physiotherapist',
  'respiratory therapist',
  'medical laboratory',
  'diagnostic imaging',
  'sonograph'
]
const PROFESSION_KEYWORDS = [
  'lawyer',
  'attorney',
  'accountant',
  'cpa',
  'teacher',
  'architect',
  'engineer',
  'nurse',
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
const TECH_KEYWORDS = [
  'software',
  'developer',
  'engineer',
  'programmer',
  'network administrator',
  'network and web technician',
  'information systems',
  'systems specialist',
  'user experience',
  'ux designer',
  'ui designer',
  'web designer',
  'data',
  'cyber',
  'cloud',
  'devops',
  'it support',
  'systems administrator',
  'qa'
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
const PROFESSIONAL_IDENTITY_KEYWORDS = [
  'accountant',
  'cpa',
  'lawyer',
  'attorney',
  'law clerk',
  'paralegal',
  'social worker',
  'financial advisor',
  'teacher',
  'architect'
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

function hasHealthcareLicensedSignals(profile: OccupationTemplateProfile) {
  const combined = normalizeText(
    [profile.title, ...profile.certifications, ...profile.hardGates, ...profile.employerSignals].join(' ')
  )
  const education = normalizeText(profile.education)

  return (
    !hasTradeSignals(profile) &&
    (
      profile.regulated ||
      profile.examRequired === true ||
      includesAny(combined, HEALTHCARE_KEYWORDS) ||
      /\b(cpnre|nclex|clinical placement|clinical hours|provincial nursing body|college of nurses|patient care)\b/.test(
        combined
      )
    ) &&
    (
      /\b(diploma|nursing|health|clinical|care)\b/.test(education) ||
      profile.certifications.length > 0 ||
      profile.hardGates.length > 0 ||
      includesAny(combined, HEALTHCARE_KEYWORDS)
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

function hasTechSignals(profile: OccupationTemplateProfile) {
  const combined = normalizeText(
    [profile.title, ...profile.certifications, ...profile.hardGates, ...profile.employerSignals].join(' ')
  )

  return !profile.regulated && includesAny(combined, TECH_KEYWORDS)
}

function classifyCareerIdentity(profile: OccupationTemplateProfile): CareerPathType {
  const identity = normalizeText(`${profile.title} ${profile.code} ${profile.stage ?? ''}`)
  const normalizedCode = String(profile.code ?? '')
    .trim()
    .replace(/\s+/g, '')
    .toUpperCase()
  const hasTradeCode = /^\d{3}[A-Z]$/.test(normalizedCode)

  if (
    hasTradeCode ||
    includesAny(identity, TRADE_KEYWORDS) ||
    /\bapprentice\b|\bjourneyperson\b|\bred seal\b|\bcertificate of qualification\b/.test(identity)
  ) {
    return 'TRADES'
  }

  if (includesAny(identity, HEALTHCARE_KEYWORDS) || /\b(cpnre|nclex)\b/.test(identity)) {
    return 'HEALTHCARE_LICENSED'
  }

  if (includesAny(identity, TECH_KEYWORDS) || /\b(devops|qa analyst|cybersecurity)\b/.test(identity)) {
    return 'TECH'
  }

  if (includesAny(identity, PROFESSIONAL_IDENTITY_KEYWORDS)) {
    return 'PROFESSIONAL_LICENSED'
  }

  return 'GENERAL'
}

function classifyCareerPathBySignals(profile: OccupationTemplateProfile): CareerPathType {
  if (hasTradeSignals(profile)) return 'TRADES'
  if (hasHealthcareLicensedSignals(profile)) return 'HEALTHCARE_LICENSED'
  if (hasRegulatedProfessionSignals(profile)) return 'PROFESSIONAL_LICENSED'
  if (hasTechSignals(profile) || hasPortfolioSignals(profile)) return 'TECH'
  return 'GENERAL'
}

function applyCareerPathGuardrails(
  profile: OccupationTemplateProfile,
  inferredPath: CareerPathType
): CareerPathType {
  const identityPath = classifyCareerIdentity(profile)
  const title = normalizeText(profile.title)
  const tradeLikeTitle =
    includesAny(title, TRADE_KEYWORDS) ||
    /\b(apprentice|journeyperson|journeyman|red seal|electric|plumb|millwright|hvac|carpent|welder|machinist|cook|pipefitter)\b/.test(
      title
    )
  const healthcareLikeTitle =
    includesAny(title, HEALTHCARE_KEYWORDS) ||
    /\b(nurse|dental|pharmacy|clinical|patient|medical|paramedic|therap)\b/.test(title)
  const techLikeTitle =
    includesAny(title, TECH_KEYWORDS) ||
    /\b(software|developer|engineer|network|devops|cyber|data|ux|ui|web)\b/.test(title)
  const professionalLikeTitle = includesAny(title, PROFESSIONAL_IDENTITY_KEYWORDS)

  if (identityPath === 'TRADES') return 'TRADES'
  if (identityPath === 'HEALTHCARE_LICENSED') return 'HEALTHCARE_LICENSED'
  if (identityPath === 'TECH') {
    if (
      inferredPath === 'TRADES' ||
      inferredPath === 'HEALTHCARE_LICENSED' ||
      inferredPath === 'PROFESSIONAL_LICENSED'
    ) {
      return 'TECH'
    }
    return inferredPath
  }
  if (identityPath === 'PROFESSIONAL_LICENSED') return 'PROFESSIONAL_LICENSED'

  // Generic titles should not drift into a specialized path unless the title itself
  // has clear family identity anchors.
  if (identityPath === 'GENERAL') {
    if (inferredPath === 'TRADES' && tradeLikeTitle) return 'TRADES'
    if (inferredPath === 'HEALTHCARE_LICENSED' && healthcareLikeTitle) return 'HEALTHCARE_LICENSED'
    if (inferredPath === 'TECH' && techLikeTitle) return 'TECH'
    if (inferredPath === 'PROFESSIONAL_LICENSED' && professionalLikeTitle) {
      return 'PROFESSIONAL_LICENSED'
    }
    return 'GENERAL'
  }

  return inferredPath
}

export function classifyCareerPath(
  occupationProfile: OccupationTemplateProfile,
  _location?: string,
  stage?: string | null
): CareerPathType {
  const profile = {
    ...occupationProfile,
    stage: stage ?? occupationProfile.stage ?? null
  }
  const canonicalPath = inferCanonicalCareerPathTypeFromTitle(profile.title)
  if (canonicalPath) {
    return applyCareerPathGuardrails(profile, canonicalPath)
  }
  const inferredPath = classifyCareerPathBySignals(profile)
  return applyCareerPathGuardrails(profile, inferredPath)
}

export function selectPlanRoute(
  occupationProfile: OccupationTemplateProfile,
  location?: string,
  stage?: string | null
): { careerPathType: CareerPathType; templateKey: PlanTemplateKey } {
  const profile = {
    ...occupationProfile,
    stage: stage ?? occupationProfile.stage ?? null
  }
  const title = normalizeText(profile.title)
  const careerPathType = classifyCareerPath(profile, location, stage)

  if (careerPathType === 'TRADES') {
    return { careerPathType, templateKey: 'regulated_trade' }
  }

  if (careerPathType === 'HEALTHCARE_LICENSED') {
    return { careerPathType, templateKey: 'regulated_profession' }
  }

  if (careerPathType === 'PROFESSIONAL_LICENSED') {
    return { careerPathType, templateKey: 'regulated_profession' }
  }

  if (careerPathType === 'TECH') {
    if (hasPortfolioSignals(profile)) {
      return { careerPathType, templateKey: 'portfolio_role' }
    }
    if (hasCredentialSignals(profile)) {
      return { careerPathType, templateKey: 'credentialed_role' }
    }
    return { careerPathType, templateKey: 'general_role' }
  }

  if (
    profile.relationship === 'within_career_progression' ||
    includesAny(title, EXPERIENCE_LADDER_KEYWORDS)
  ) {
    return { careerPathType, templateKey: 'experience_ladder_role' }
  }

  return { careerPathType, templateKey: 'general_role' }
}

export function selectPlanTemplate(
  occupationProfile: OccupationTemplateProfile,
  location?: string,
  stage?: string | null
): PlanTemplateKey {
  return selectPlanRoute(occupationProfile, location, stage).templateKey
}
