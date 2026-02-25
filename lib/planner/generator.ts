import type {
  CareerSwitchPlannerInput,
  CareerSwitchPlannerResult,
  GapDifficulty,
  PlannerRecommendedRole,
  PlannerSkillGap
} from '@/lib/planner/types'

interface RoleProfile {
  label: string
  transferable: string[]
  targetSkills: string[]
  recommendations: PlannerRecommendedRole[]
}

const ROLE_PROFILES: Array<{ keywords: string[]; profile: RoleProfile }> = [
  {
    keywords: ['customer success', 'support', 'account manager'],
    profile: {
      label: 'Customer Success',
      transferable: [
        'Stakeholder communication',
        'Retention strategy',
        'Issue prioritization',
        'Cross-functional collaboration',
        'Customer journey analysis'
      ],
      targetSkills: [
        'Roadmap influence',
        'Business case writing',
        'SQL and product analytics basics',
        'Executive storytelling'
      ],
      recommendations: [
        {
          title: 'Product Operations Manager',
          match: 84,
          reason: 'Strong overlap in process ownership, customer insights, and operational execution.'
        },
        {
          title: 'Implementation Manager',
          match: 80,
          reason: 'Your onboarding and adoption experience maps directly to implementation milestones.'
        },
        {
          title: 'Program Manager',
          match: 77,
          reason: 'Cross-team communication and structured execution are already in your background.'
        }
      ]
    }
  },
  {
    keywords: ['operations', 'ops', 'program manager', 'project manager'],
    profile: {
      label: 'Operations',
      transferable: [
        'Process design',
        'KPI reporting',
        'Project planning',
        'Risk management',
        'Stakeholder alignment'
      ],
      targetSkills: [
        'Strategic prioritization',
        'Tooling automation',
        'Executive communication',
        'Financial impact framing'
      ],
      recommendations: [
        {
          title: 'Product Operations Manager',
          match: 82,
          reason: 'You already operate at the intersection of process, metrics, and cross-team delivery.'
        },
        {
          title: 'Business Operations Analyst',
          match: 78,
          reason: 'Your KPI and operational cadence experience translates well to business analytics.'
        },
        {
          title: 'Chief of Staff Associate',
          match: 74,
          reason: 'Your coordination and execution background is valuable for executive initiatives.'
        }
      ]
    }
  },
  {
    keywords: ['sales', 'account executive', 'business development'],
    profile: {
      label: 'Sales',
      transferable: [
        'Discovery and qualification',
        'Pipeline management',
        'Negotiation',
        'Outcome-focused communication',
        'Territory planning'
      ],
      targetSkills: [
        'Revenue analytics',
        'Enterprise procurement process depth',
        'Cross-functional deal strategy',
        'Forecast discipline'
      ],
      recommendations: [
        {
          title: 'Revenue Operations Analyst',
          match: 80,
          reason: 'Your sales process knowledge is a strong base for RevOps workflow optimization.'
        },
        {
          title: 'Customer Success Manager',
          match: 77,
          reason: 'Your stakeholder management and outcome orientation map well to post-sale growth.'
        },
        {
          title: 'Partnerships Manager',
          match: 75,
          reason: 'Negotiation and relationship building transfer well to partner-led growth roles.'
        }
      ]
    }
  }
]

const DEFAULT_PROFILE: RoleProfile = {
  label: 'Generalist',
  transferable: [
    'Communication',
    'Collaboration',
    'Problem solving',
    'Ownership',
    'Execution discipline'
  ],
  targetSkills: [
    'Role-specific tooling depth',
    'Impact storytelling',
    'Portfolio evidence',
    'Interview strategy'
  ],
  recommendations: [
    {
      title: 'Program Manager',
      match: 76,
      reason: 'Broad execution skills and cross-team coordination are strong foundations for program work.'
    },
    {
      title: 'Operations Manager',
      match: 74,
      reason: 'Process and execution skills can transfer into operational ownership quickly.'
    },
    {
      title: 'Business Analyst',
      match: 72,
      reason: 'Structured problem solving and communication support analytical transition paths.'
    }
  ]
}

const SKILL_LIBRARY = [
  'SQL',
  'Dashboarding',
  'CRM',
  'Stakeholder management',
  'Project management',
  'Roadmap planning',
  'Process improvement',
  'Experimentation',
  'Interviewing',
  'Documentation',
  'Cross-functional leadership'
]

function normalize(value: string) {
  return value.trim().toLowerCase()
}

function getProfile(roleText: string): RoleProfile {
  const haystack = normalize(roleText)
  for (const entry of ROLE_PROFILES) {
    if (entry.keywords.some((keyword) => haystack.includes(keyword))) {
      return entry.profile
    }
  }
  return DEFAULT_PROFILE
}

function detectSkills(experienceText: string) {
  const haystack = normalize(experienceText)
  return SKILL_LIBRARY.filter((skill) => haystack.includes(normalize(skill)))
}

function inferDifficulty(index: number): GapDifficulty {
  if (index === 0) return 'easy'
  if (index === 1) return 'medium'
  return 'hard'
}

function buildSkillGaps(targetSkills: string[], detectedSkills: string[]): PlannerSkillGap[] {
  const normalizedDetected = new Set(detectedSkills.map(normalize))
  const missing = targetSkills.filter((skill) => !normalizedDetected.has(normalize(skill)))

  return missing.slice(0, 3).map((skill, index) => ({
    title: skill,
    detail: `Build confidence in ${skill.toLowerCase()} to improve interview depth and first-90-day readiness.`,
    difficulty: inferDifficulty(index)
  }))
}

function findMetric(experienceText: string) {
  const metricMatch = experienceText.match(/\b\d+%|\$\d[\d,]*|\b\d+\+?\b/g)
  return metricMatch?.[0] ?? null
}

function pickFirstSentences(experienceText: string) {
  const chunks = experienceText
    .split(/\n|\. /)
    .map((part) => part.trim())
    .filter((part) => part.length >= 20)
  return chunks.slice(0, 3)
}

function buildReframes(
  experienceText: string,
  targetRole: string
): CareerSwitchPlannerResult['resumeReframes'] {
  const snippets = pickFirstSentences(experienceText)
  const metric = findMetric(experienceText)

  if (snippets.length === 0) {
    return [
      {
        before: 'Managed cross-team workstreams.',
        after: `Led cross-functional delivery for ${targetRole}, aligning execution to measurable business outcomes.`
      }
    ]
  }

  return snippets.map((snippet, index) => ({
    before: snippet.endsWith('.') ? snippet : `${snippet}.`,
    after:
      index === 0 && metric
        ? `${snippet.replace(/\.$/, '')}, driving measurable impact (${metric}) and clearer ownership.`
        : `${snippet.replace(/\.$/, '')}, reframed to highlight strategic impact and role-relevant outcomes.`
  }))
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function buildScore(input: CareerSwitchPlannerInput, detectedSkills: string[]) {
  const experienceLength = input.experienceText.trim().length
  const hasMetric = Boolean(findMetric(input.experienceText))
  const base = 62
  const skillBonus = Math.min(18, detectedSkills.length * 3)
  const metricBonus = hasMetric ? 8 : 0
  const detailBonus = experienceLength > 280 ? 6 : experienceLength > 140 ? 3 : 0
  const uncertaintyPenalty = input.notSureMode ? 2 : 0

  return clamp(base + skillBonus + metricBonus + detailBonus - uncertaintyPenalty, 45, 96)
}

function buildRoadmap(
  currentRole: string,
  targetRole: string,
  skillGaps: PlannerSkillGap[]
): CareerSwitchPlannerResult['roadmap'] {
  const topGap = skillGaps[0]?.title ?? 'role-specific depth'
  const secondGap = skillGaps[1]?.title ?? 'interview storytelling'

  return {
    '30': [
      `Translate 5 accomplishments from ${currentRole} into ${targetRole} language with measurable outcomes.`,
      `Close the first gap: complete practical exercises focused on ${topGap.toLowerCase()}.`,
      'Refresh your LinkedIn summary with a clear transition narrative and target keywords.'
    ],
    '60': [
      `Build 2 portfolio-ready case studies that demonstrate ${targetRole} execution standards.`,
      `Practice interview stories that connect your background to ${secondGap.toLowerCase()}.`,
      'Run at least 5 informational conversations with people already in your target path.'
    ],
    '90': [
      'Apply to a focused set of high-fit roles and track response rates by resume variant.',
      'Refine positioning weekly based on recruiter and interviewer feedback.',
      'Expand referral outreach and aim for warm introductions into target teams.'
    ]
  }
}

export function generateCareerSwitchPlannerResult(
  input: CareerSwitchPlannerInput
): CareerSwitchPlannerResult {
  const currentProfile = getProfile(input.currentRole)
  const effectiveTargetRole =
    input.notSureMode || !input.targetRole?.trim()
      ? currentProfile.recommendations[0]?.title ?? 'Career Transition Role'
      : input.targetRole.trim()
  const targetProfile = getProfile(effectiveTargetRole)

  const detectedSkills = detectSkills(input.experienceText)
  const transferableSkills = Array.from(
    new Set([...detectedSkills, ...currentProfile.transferable])
  ).slice(0, 8)
  const skillGaps = buildSkillGaps(targetProfile.targetSkills, transferableSkills)
  const score = buildScore(input, transferableSkills)

  const explanation = input.notSureMode
    ? `Your background in ${input.currentRole} shows strong transfer potential into adjacent roles. Focus on a structured transition plan and targeted proof of impact.`
    : `You have a credible path from ${input.currentRole} to ${effectiveTargetRole}. Your execution and communication strengths are clear, and focused gap-closing can raise competitiveness quickly.`

  return {
    score,
    explanation,
    transferableSkills,
    skillGaps,
    roadmap: buildRoadmap(input.currentRole, effectiveTargetRole, skillGaps),
    resumeReframes: buildReframes(input.experienceText, effectiveTargetRole),
    recommendedRoles: input.notSureMode ? currentProfile.recommendations : []
  }
}
