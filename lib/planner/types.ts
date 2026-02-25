export type GapDifficulty = 'easy' | 'medium' | 'hard'

export interface PlannerSkillGap {
  title: string
  detail: string
  difficulty: GapDifficulty
}

export interface PlannerRoadmap {
  '30': string[]
  '60': string[]
  '90': string[]
}

export interface PlannerResumeReframe {
  before: string
  after: string
}

export interface PlannerRecommendedRole {
  title: string
  match: number
  reason: string
}

export interface CareerSwitchPlannerInput {
  currentRoleText?: string
  targetRoleText?: string | null
  recommendMode?: boolean
  skills?: string[]
  educationLevel?: string
  workRegion?: string
  locationText?: string
  timelineBucket?: string
  incomeTarget?: string
  userPostingText?: string
  useMarketEvidence?: boolean
  currentRole: string
  targetRole?: string
  notSureMode: boolean
  experienceText: string
  location?: string
  timeline?: string
  education?: string
}

export interface CareerSwitchPlannerResult {
  score: number
  explanation: string
  transferableSkills: string[]
  skillGaps: PlannerSkillGap[]
  roadmap: PlannerRoadmap
  resumeReframes: PlannerResumeReframe[]
  recommendedRoles: PlannerRecommendedRole[]
}

export interface PlannerResultView {
  score: number
  summary: string
  strongestAreas: string[]
  transferableSkills: string[]
  skillGaps: PlannerSkillGap[]
  roadmap: Array<{
    window: '30 Days' | '60 Days' | '90 Days'
    steps: string[]
  }>
  reframes: PlannerResumeReframe[]
  recommendations: PlannerRecommendedRole[]
}

export function toPlannerResultView(
  result: CareerSwitchPlannerResult
): PlannerResultView {
  return {
    score: result.score,
    summary: result.explanation,
    strongestAreas: result.transferableSkills.slice(0, 3),
    transferableSkills: result.transferableSkills,
    skillGaps: result.skillGaps,
    roadmap: [
      { window: '30 Days', steps: result.roadmap['30'] },
      { window: '60 Days', steps: result.roadmap['60'] },
      { window: '90 Days', steps: result.roadmap['90'] }
    ],
    reframes: result.resumeReframes,
    recommendations: result.recommendedRoles
  }
}
