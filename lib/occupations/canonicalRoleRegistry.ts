import type { CareerPathType } from '@/lib/transition/types'

export type CanonicalRoleFamilyConstraint = {
  id: string
  allowedKeywords: string[]
  blockedKeywords?: string[]
  minKeywordMatches?: number
}

type CanonicalRoleDefinition = {
  key: string
  displayTitle: string
  careerPathType: CareerPathType
  aliases: string[]
  constraint: CanonicalRoleFamilyConstraint
}

export type CanonicalRoleMatch = {
  key: string
  displayTitle: string
  careerPathType: CareerPathType
  confidence: number
  constraint: CanonicalRoleFamilyConstraint
}

const CANONICAL_ROLE_DEFINITIONS: CanonicalRoleDefinition[] = [
  {
    key: 'ux_designer',
    displayTitle: 'UX Designer',
    careerPathType: 'TECH',
    aliases: ['ux designer', 'ui designer', 'user experience designer', 'interaction designer', 'product designer', 'web designer'],
    constraint: {
      id: 'ux_designer',
      allowedKeywords: ['ux', 'ui', 'user experience', 'interaction', 'product design', 'web design', 'digital design', 'graphic design'],
      blockedKeywords: ['computer engineer', 'electrical engineer', 'mechanical engineer'],
      minKeywordMatches: 1
    }
  },
  {
    key: 'it_support',
    displayTitle: 'IT Support / Help Desk Technician',
    careerPathType: 'TECH',
    aliases: [
      'it support',
      'i t support',
      'it support analyst',
      'it support technician',
      'help desk',
      'help desk technician',
      'help desk analyst',
      'service desk',
      'service desk analyst',
      'desktop support',
      'desktop support technician',
      'technical support',
      'technical support analyst',
      'technical support specialist',
      'user support',
      'user support technician',
      'computer technician',
      'pc technician'
    ],
    constraint: {
      id: 'it_support',
      allowedKeywords: [
        'user support',
        'help desk',
        'service desk',
        'desktop support',
        'technical support',
        'it support',
        'information technology',
        'computer technician',
        'computer network',
        'systems support',
        'support technician',
        'technicians'
      ],
      // IT support is an entry/technician family — keep it out of senior management
      // and unrelated "customer/personal services" manager occupations.
      blockedKeywords: ['manager', 'managers', 'director', 'executive', 'personal services'],
      minKeywordMatches: 1
    }
  },
  {
    key: 'customer_success_manager',
    displayTitle: 'Customer Success Manager',
    careerPathType: 'GENERAL',
    aliases: [
      'customer success manager',
      'client success manager',
      'customer experience manager',
      'saas support lead'
    ],
    constraint: {
      id: 'customer_success_manager',
      allowedKeywords: [
        'customer success',
        'client success',
        'customer experience',
        'customer support lead',
        'customer service representatives',
        'customer information services',
        'customer and information services representatives',
        'managers in customer and personal services',
        'saas'
      ],
      blockedKeywords: [
        'financial service',
        'financial services',
        'bank',
        'banking',
        'credit',
        'loan',
        'insurance',
        'branch'
      ],
      minKeywordMatches: 1
    }
  },
  {
    key: 'operations_coordinator',
    displayTitle: 'Operations Coordinator',
    careerPathType: 'GENERAL',
    aliases: ['operations coordinator', 'operations analyst', 'project coordinator', 'logistics coordinator', 'administrative operations'],
    constraint: {
      id: 'operations_coordinator',
      allowedKeywords: ['operations coordinator', 'operations analyst', 'project coordinator', 'logistics', 'supply chain', 'program coordinator', 'administrative operations'],
      blockedKeywords: [
        'facility maintenance',
        'building operations',
        'property operations',
        'construction manager',
        'construction managers'
      ],
      minKeywordMatches: 1
    }
  },
  {
    key: 'project_coordinator',
    displayTitle: 'Project Coordinator',
    careerPathType: 'GENERAL',
    aliases: ['project coordinator', 'program coordinator', 'project support', 'project administrator'],
    constraint: {
      id: 'project_coordinator',
      allowedKeywords: ['project coordinator', 'program coordinator', 'project support', 'project administrator', 'timeline', 'coordination'],
      blockedKeywords: [
        'facility maintenance',
        'construction manager',
        'construction managers',
        'trades'
      ],
      minKeywordMatches: 1
    }
  },
  {
    key: 'administrative_assistant',
    displayTitle: 'Administrative Assistant',
    careerPathType: 'GENERAL',
    aliases: ['administrative assistant', 'office assistant', 'admin assistant', 'executive assistant'],
    constraint: {
      id: 'administrative_assistant',
      allowedKeywords: ['administrative', 'office assistant', 'admin assistant', 'executive assistant', 'office administration'],
      blockedKeywords: ['trades', 'electrician', 'plumber'],
      minKeywordMatches: 1
    }
  },
  {
    key: 'accountant',
    displayTitle: 'Accountant',
    careerPathType: 'PROFESSIONAL_LICENSED',
    aliases: ['accountant', 'chartered professional accountant', 'cpa'],
    constraint: {
      id: 'accountant_family',
      allowedKeywords: ['accountant', 'accounting', 'cpa', 'financial reporting', 'audit'],
      blockedKeywords: ['trades', 'nursing'],
      minKeywordMatches: 1
    }
  },
  {
    key: 'bookkeeper',
    displayTitle: 'Bookkeeper',
    careerPathType: 'GENERAL',
    aliases: ['bookkeeper', 'book keeping', 'accounts clerk', 'accounts payable clerk'],
    constraint: {
      id: 'bookkeeper_family',
      allowedKeywords: ['bookkeeper', 'bookkeeping', 'accounts payable', 'accounts receivable', 'payroll'],
      blockedKeywords: ['trades', 'nursing'],
      minKeywordMatches: 1
    }
  },
  {
    key: 'hr_manager',
    displayTitle: 'Human Resources Manager',
    careerPathType: 'GENERAL',
    aliases: ['hr manager', 'human resources manager', 'talent manager', 'people operations manager', 'recruitment manager'],
    constraint: {
      id: 'hr_family',
      allowedKeywords: ['human resources', 'hr', 'recruit', 'talent', 'people operations', 'personnel'],
      blockedKeywords: ['nursing', 'trades', 'electrician'],
      minKeywordMatches: 1
    }
  },
  {
    key: 'software_developer',
    displayTitle: 'Software Developer',
    careerPathType: 'TECH',
    aliases: ['software developer', 'software engineer', 'web developer', 'frontend developer', 'backend developer', 'full stack developer'],
    constraint: {
      id: 'tech_software_family',
      allowedKeywords: ['software developer', 'software engineer', 'web developer', 'frontend', 'backend', 'full stack'],
      blockedKeywords: ['facility maintenance', 'trades'],
      minKeywordMatches: 1
    }
  },
  {
    key: 'data_scientist',
    displayTitle: 'Data Scientist',
    careerPathType: 'TECH',
    aliases: ['data scientist', 'data analyst', 'machine learning engineer', 'business intelligence analyst'],
    constraint: {
      id: 'tech_data_family',
      allowedKeywords: ['data scientist', 'data analyst', 'machine learning', 'analytics', 'business intelligence'],
      blockedKeywords: ['facility maintenance', 'trades', 'nursing'],
      minKeywordMatches: 1
    }
  },
  {
    key: 'cybersecurity_analyst',
    displayTitle: 'Cybersecurity Analyst',
    careerPathType: 'TECH',
    aliases: ['cybersecurity analyst', 'security analyst', 'soc analyst', 'information security analyst'],
    constraint: {
      id: 'tech_cyber_family',
      allowedKeywords: ['cybersecurity', 'security analyst', 'soc analyst', 'information security', 'security operations'],
      blockedKeywords: ['facility maintenance', 'trades', 'nursing'],
      minKeywordMatches: 1
    }
  },
  {
    key: 'electrician',
    displayTitle: 'Electrician',
    careerPathType: 'TRADES',
    aliases: ['electrician', 'apprentice electrician', 'construction electrician', 'industrial electrician', 'electrical apprentice'],
    constraint: {
      id: 'trade_electrician',
      allowedKeywords: ['electrician', 'electrical', 'apprentice', 'construction electrician', 'industrial electrician'],
      blockedKeywords: ['nurse', 'dental', 'pharmacy'],
      minKeywordMatches: 1
    }
  },
  {
    key: 'plumber',
    displayTitle: 'Plumber',
    careerPathType: 'TRADES',
    aliases: ['plumber', 'plumbing apprentice', 'plumbing technician'],
    constraint: {
      id: 'trade_plumber',
      allowedKeywords: ['plumber', 'plumbing', 'pipefitter', 'apprentice'],
      blockedKeywords: ['nurse', 'dental', 'pharmacy'],
      minKeywordMatches: 1
    }
  },
  {
    key: 'hvac_technician',
    displayTitle: 'HVAC Technician',
    careerPathType: 'TRADES',
    aliases: ['hvac technician', 'hvac mechanic', 'refrigeration and air conditioning mechanic', 'refrigeration mechanic'],
    constraint: {
      id: 'trade_hvac',
      allowedKeywords: ['hvac', 'refrigeration', 'air conditioning', 'mechanic', 'apprentice'],
      blockedKeywords: ['nurse', 'dental', 'pharmacy'],
      minKeywordMatches: 1
    }
  },
  {
    key: 'carpenter',
    displayTitle: 'Carpenter',
    careerPathType: 'TRADES',
    aliases: ['carpenter', 'carpentry apprentice', 'construction carpenter'],
    constraint: {
      id: 'trade_carpenter',
      allowedKeywords: ['carpenter', 'carpentry', 'construction', 'apprentice'],
      blockedKeywords: ['nurse', 'dental', 'pharmacy'],
      minKeywordMatches: 1
    }
  },
  {
    key: 'millwright',
    displayTitle: 'Millwright',
    careerPathType: 'TRADES',
    aliases: ['millwright', 'industrial mechanic', 'industrial millwright'],
    constraint: {
      id: 'trade_millwright',
      allowedKeywords: ['millwright', 'industrial mechanic', 'industrial maintenance', 'apprentice'],
      blockedKeywords: ['nurse', 'dental', 'pharmacy'],
      minKeywordMatches: 1
    }
  },
  {
    key: 'registered_nurse',
    displayTitle: 'Registered Nurse',
    careerPathType: 'HEALTHCARE_LICENSED',
    aliases: ['registered nurse', 'rn', 'registered psychiatric nurse'],
    constraint: {
      id: 'healthcare_nurse',
      allowedKeywords: ['registered nurse', 'nurse', 'clinical', 'patient care', 'healthcare', 'hospital'],
      blockedKeywords: ['trades', 'electrician', 'plumber'],
      minKeywordMatches: 1
    }
  },
  {
    key: 'licensed_practical_nurse',
    displayTitle: 'Licensed Practical Nurse',
    careerPathType: 'HEALTHCARE_LICENSED',
    aliases: ['licensed practical nurse', 'practical nurse', 'lpn', 'rpn'],
    constraint: {
      id: 'healthcare_lpn',
      allowedKeywords: ['licensed practical nurse', 'practical nurse', 'lpn', 'rpn', 'nurse', 'clinical'],
      blockedKeywords: ['trades', 'electrician', 'plumber'],
      minKeywordMatches: 1
    }
  },
  {
    key: 'dental_hygienist',
    displayTitle: 'Dental Hygienist',
    careerPathType: 'HEALTHCARE_LICENSED',
    aliases: ['dental hygienist', 'oral hygienist'],
    constraint: {
      id: 'healthcare_dental_hygienist',
      allowedKeywords: ['dental hygienist', 'dental', 'oral health', 'periodontal', 'hygiene'],
      blockedKeywords: ['nursing supervisor', 'trades', 'electrician', 'facility maintenance'],
      minKeywordMatches: 1
    }
  },
  {
    key: 'pharmacy_technician',
    displayTitle: 'Pharmacy Technician',
    careerPathType: 'HEALTHCARE_LICENSED',
    aliases: ['pharmacy technician', 'pharmacy tech', 'dispensing technician'],
    constraint: {
      id: 'healthcare_pharmacy_technician',
      allowedKeywords: ['pharmacy technician', 'pharmacy', 'dispensary', 'medication', 'healthcare'],
      blockedKeywords: ['financial service', 'trades', 'electrician', 'facility maintenance'],
      minKeywordMatches: 1
    }
  }
]

function normalizeRoleText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenizeRoleText(value: string) {
  return normalizeRoleText(value).split(' ').filter(Boolean)
}

function tokenOverlapRatio(left: string[], right: string[]) {
  if (left.length === 0 || right.length === 0) return 0
  const rightSet = new Set(right)
  let shared = 0
  for (const token of left) {
    if (rightSet.has(token)) shared += 1
  }
  return shared / left.length
}

function scoreCanonicalRole(query: string, definition: CanonicalRoleDefinition) {
  const normalizedQuery = normalizeRoleText(query)
  if (!normalizedQuery) return 0

  let best = 0
  for (const alias of definition.aliases) {
    const normalizedAlias = normalizeRoleText(alias)
    if (!normalizedAlias) continue
    if (normalizedAlias === normalizedQuery) {
      best = Math.max(best, 1)
      continue
    }

    if (
      normalizedAlias.includes(normalizedQuery) ||
      normalizedQuery.includes(normalizedAlias)
    ) {
      best = Math.max(best, 0.92)
    }

    const queryTokens = tokenizeRoleText(normalizedQuery)
    const aliasTokens = tokenizeRoleText(normalizedAlias)
    const overlap = tokenOverlapRatio(queryTokens, aliasTokens)
    if (overlap > 0) {
      best = Math.max(best, Math.min(0.55 + overlap * 0.4, 0.89))
    }
  }

  return Number(best.toFixed(3))
}

export function resolveCanonicalRoleIntent(inputTitle: string, minConfidence = 0.58): CanonicalRoleMatch | null {
  const query = inputTitle.trim()
  if (!query) return null

  const ranked = CANONICAL_ROLE_DEFINITIONS
    .map((definition) => ({
      definition,
      confidence: scoreCanonicalRole(query, definition)
    }))
    .filter((item) => item.confidence >= minConfidence)
    .sort((left, right) => right.confidence - left.confidence)

  const top = ranked[0]
  if (!top) return null

  return {
    key: top.definition.key,
    displayTitle: top.definition.displayTitle,
    careerPathType: top.definition.careerPathType,
    confidence: top.confidence,
    constraint: top.definition.constraint
  }
}

export function inferRoleFamilyConstraintFromCanonical(
  inputTitle: string,
  minConfidence = 0.62
): CanonicalRoleFamilyConstraint | null {
  const match = resolveCanonicalRoleIntent(inputTitle, minConfidence)
  return match?.constraint ?? null
}

export function inferCanonicalCareerPathTypeFromTitle(
  inputTitle: string,
  minConfidence = 0.66
): CareerPathType | null {
  const match = resolveCanonicalRoleIntent(inputTitle, minConfidence)
  return match?.careerPathType ?? null
}
