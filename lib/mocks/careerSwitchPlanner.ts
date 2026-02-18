export type GapDifficulty = 'easy' | 'medium' | 'hard'

export interface SkillGapItem {
  title: string
  detail: string
  difficulty: GapDifficulty
}

export interface RoadmapWindow {
  window: '30 Days' | '60 Days' | '90 Days'
  steps: string[]
}

export interface ResumeReframeItem {
  before: string
  after: string
}

export interface RoleRecommendation {
  title: string
  match: number
  reason: string
}

export interface PlannerResult {
  score: number
  summary: string
  strongestAreas: string[]
  transferableSkills: string[]
  skillGaps: SkillGapItem[]
  roadmap: RoadmapWindow[]
  reframes: ResumeReframeItem[]
  recommendations: RoleRecommendation[]
}

export interface PlannerRequestContext {
  currentRole: string
  targetRole: string
  notSureMode: boolean
}

const baseResult: PlannerResult = {
  score: 82,
  summary:
    'Strong transfer potential. Your operational and cross-functional background maps well to strategic execution roles.',
  strongestAreas: ['Process Optimization', 'Stakeholder Communication', 'KPI Analysis'],
  transferableSkills: [
    'Cross-functional leadership',
    'SOP creation',
    'Data reporting',
    'Project coordination',
    'Customer-facing communication',
    'Team onboarding'
  ],
  skillGaps: [
    {
      title: 'Role-specific portfolio storytelling',
      detail: 'Show your outcomes in the language of your target function.',
      difficulty: 'easy'
    },
    {
      title: 'Domain-specific tooling depth',
      detail: 'Build confidence with the most common tools used in your target role.',
      difficulty: 'medium'
    },
    {
      title: 'Strategic framing in interviews',
      detail: 'Move from task-level examples to business impact narratives.',
      difficulty: 'hard'
    }
  ],
  roadmap: [
    {
      window: '30 Days',
      steps: [
        'Rewrite top 5 resume bullets using target-role terminology.',
        'Complete one foundational certification or course module.',
        'Refresh LinkedIn headline and summary with transition narrative.'
      ]
    },
    {
      window: '60 Days',
      steps: [
        'Build 2 portfolio artifacts from past projects with measurable outcomes.',
        'Run 5 informational interviews with people in your target role.',
        'Practice structured STAR responses focused on business impact.'
      ]
    },
    {
      window: '90 Days',
      steps: [
        'Apply to a focused list of high-fit roles with tailored applications.',
        'Track interview feedback and iterate resume + stories weekly.',
        'Expand referrals in your target domain.'
      ]
    }
  ],
  reframes: [
    {
      before: 'Managed onboarding for new hires.',
      after:
        'Designed and scaled onboarding workflows that reduced time-to-productivity by 22%.'
    },
    {
      before: 'Worked with multiple teams to deliver projects.',
      after:
        'Led cross-functional execution across Product, Ops, and CX to deliver initiatives on schedule.'
    },
    {
      before: 'Improved reporting process.',
      after:
        'Built KPI dashboards that improved decision speed and increased retention by 14%.'
    }
  ],
  recommendations: [
    {
      title: 'Product Operations Manager',
      match: 84,
      reason: 'Strong overlap in execution rigor, process ownership, and KPI-driven decisions.'
    },
    {
      title: 'Customer Success Manager',
      match: 79,
      reason: 'Your communication and problem-resolution background maps well to account outcomes.'
    },
    {
      title: 'Program Manager',
      match: 76,
      reason: 'Cross-functional coordination and delivery tracking are directly transferable.'
    }
  ]
}

export const careerSwitchFaqs = [
  {
    question: 'How many free plans can I generate?',
    answer:
      'Free includes 3 total lifetime reports across all tools. Upgrade for unlimited reports and premium inputs.'
  },
  {
    question: 'Can I upload my resume instead of typing?',
    answer:
      'Resume upload is available on Pro and Lifetime. Free users can paste experience manually.'
  },
  {
    question: 'What does "Not sure" mode do?',
    answer:
      'Not sure mode suggests adjacent career paths based on your background, then builds a practical roadmap.'
  },
  {
    question: 'Is my resume text stored?',
    answer:
      'No. Uploaded or pasted text is only used to generate this report and is not saved as a permanent profile.'
  }
]

export const careerSwitchMoreTools = [
  {
    slug: 'resume-analyzer',
    title: 'Resume Analyzer',
    description: 'Get instant ATS-style feedback and rewrite suggestions for your resume.',
    icon: 'resume' as const,
    isActive: true
  },
  {
    slug: 'interview-prep',
    title: 'Interview Q&A Prep',
    description: 'Generate role-specific interview questions and polished answer frameworks.',
    icon: 'interview' as const,
    isActive: true
  },
  {
    slug: 'cover-letter',
    title: 'Cover Letter Writer',
    description: 'Create tailored cover letters in seconds for each job you apply to.',
    icon: 'cover' as const,
    isActive: true
  }
]

export function getCareerSwitchPlannerMockResult(
  context: PlannerRequestContext
): PlannerResult {
  const currentRole = context.currentRole.trim() || 'your current role'
  const targetRole = context.targetRole.trim() || 'your target role'

  const scoreDelta = context.notSureMode ? -2 : 0
  const score = Math.max(0, Math.min(100, baseResult.score + scoreDelta))

  return {
    ...baseResult,
    score,
    summary: context.notSureMode
      ? `Based on your background in ${currentRole}, you show strong transfer potential into several adjacent roles.`
      : `Your profile shows strong transfer potential from ${currentRole} into ${targetRole}.`,
    recommendations: context.notSureMode
      ? baseResult.recommendations
      : []
  }
}
