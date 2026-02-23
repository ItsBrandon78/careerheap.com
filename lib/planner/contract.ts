export const CAREER_MAP_SCORE_WEIGHTS = {
  skillOverlap: 40,
  experienceAdjacency: 25,
  educationFit: 10,
  certificationLicensingGap: 15,
  timelineFeasibility: 10
} as const

export const CAREER_MAP_FORBIDDEN_FILLER_PHRASES = [
  'reframed to highlight',
  'optimized for ats',
  'industry-standard salary is'
] as const

export const CAREER_MAP_REQUIRED_SECTIONS = [
  'resumeReframe',
  'compatibilitySnapshot',
  'suggestedCareers',
  'skillGaps',
  'roadmap',
  'linksResources'
] as const

export type CareerMapSourceTagType = 'from_resume' | 'from_form' | 'from_dataset'

export type CareerMapTimeline =
  | 'immediate'
  | '1_3_months'
  | '3_6_months'
  | '6_12_months'
  | '1_plus_year'

export interface CareerMapSourceTag {
  type: CareerMapSourceTagType
  refId: string
  sourceName?: string
  sourceDate?: string
  fieldPath?: string
}

export interface CareerMapResumeReframeItem {
  before: string
  after: string
  sourceTags: CareerMapSourceTag[]
}

export interface CareerMapCompatibilityReason {
  label: string
  detail: string
  sourceTags: CareerMapSourceTag[]
}

export interface CareerMapCompatibilitySnapshot {
  score: number
  band: 'strong' | 'moderate' | 'weak'
  topReasons: CareerMapCompatibilityReason[]
  scoreBreakdown: typeof CAREER_MAP_SCORE_WEIGHTS
  sourceTags: CareerMapSourceTag[]
}

export interface CareerMapSuggestedCareer {
  occupationId: string
  title: string
  matchScore: number
  whyFit: string
  wageSummary?: string
  sourceTags: CareerMapSourceTag[]
}

export interface CareerMapSkillGap {
  skillId: string
  skillName: string
  importanceWeight: number
  closureActions: string[]
  sourceTags: CareerMapSourceTag[]
}

export interface CareerMapRoadmapItem {
  id: string
  phase: CareerMapTimeline
  title: string
  summary: string
  estimatedHours: number
  difficulty: 'easy' | 'medium' | 'hard'
  proofOfWork: string
  sourceTags: CareerMapSourceTag[]
}

export interface CareerMapResourceLink {
  title: string
  url: string
  type: 'official' | 'curated'
  region: string
  sourceTags: CareerMapSourceTag[]
}

export interface CareerMapPlannerOutput {
  resumeReframe: {
    summary: string
    items: CareerMapResumeReframeItem[]
  }
  compatibilitySnapshot: CareerMapCompatibilitySnapshot
  suggestedCareers: CareerMapSuggestedCareer[]
  skillGaps: CareerMapSkillGap[]
  roadmap: CareerMapRoadmapItem[]
  linksResources: CareerMapResourceLink[]
}

export function getCareerMapScoreBand(score: number): 'strong' | 'moderate' | 'weak' {
  if (score >= 75) return 'strong'
  if (score >= 50) return 'moderate'
  return 'weak'
}

export function validateCareerMapScoreWeights(
  weights: Record<string, number> = CAREER_MAP_SCORE_WEIGHTS
): string[] {
  const errors: string[] = []
  const total = Object.values(weights).reduce((sum, value) => sum + value, 0)
  if (total !== 100) {
    errors.push(`Score weights must sum to 100, received ${total}.`)
  }
  for (const [key, value] of Object.entries(weights)) {
    if (!Number.isFinite(value) || value < 0) {
      errors.push(`Score weight "${key}" must be a non-negative finite number.`)
    }
  }
  return errors
}

function hasSourceTags(sourceTags: CareerMapSourceTag[]) {
  return Array.isArray(sourceTags) && sourceTags.length > 0
}

function validateSourceTags(section: string, sourceTags: CareerMapSourceTag[]): string[] {
  if (!hasSourceTags(sourceTags)) {
    return [`${section} is missing source tags.`]
  }

  const errors: string[] = []
  sourceTags.forEach((tag, index) => {
    if (!tag.refId?.trim()) {
      errors.push(`${section} source tag ${index + 1} is missing refId.`)
    }
    if (tag.type === 'from_dataset') {
      if (!tag.sourceName?.trim()) {
        errors.push(`${section} dataset source tag ${index + 1} is missing sourceName.`)
      }
      if (!tag.sourceDate?.trim()) {
        errors.push(`${section} dataset source tag ${index + 1} is missing sourceDate.`)
      }
    }
  })
  return errors
}

function containsForbiddenFiller(value: string) {
  const normalized = value.toLowerCase()
  return CAREER_MAP_FORBIDDEN_FILLER_PHRASES.some((phrase) => normalized.includes(phrase))
}

export function validateCareerMapOutput(output: CareerMapPlannerOutput): string[] {
  const errors: string[] = []

  errors.push(...validateCareerMapScoreWeights(output.compatibilitySnapshot.scoreBreakdown))

  if (!Number.isInteger(output.compatibilitySnapshot.score)) {
    errors.push('Compatibility snapshot score must be an integer.')
  }
  if (output.compatibilitySnapshot.score < 0 || output.compatibilitySnapshot.score > 100) {
    errors.push('Compatibility snapshot score must be between 0 and 100.')
  }

  output.resumeReframe.items.forEach((item, index) => {
    if (containsForbiddenFiller(item.after)) {
      errors.push(`Resume reframe item ${index + 1} includes forbidden filler phrasing.`)
    }
    errors.push(...validateSourceTags(`resumeReframe.items[${index}]`, item.sourceTags))
  })

  errors.push(
    ...validateSourceTags('compatibilitySnapshot', output.compatibilitySnapshot.sourceTags)
  )
  output.compatibilitySnapshot.topReasons.forEach((reason, index) => {
    errors.push(
      ...validateSourceTags(`compatibilitySnapshot.topReasons[${index}]`, reason.sourceTags)
    )
  })

  output.suggestedCareers.forEach((career, index) => {
    if (!career.occupationId.trim()) {
      errors.push(`Suggested career ${index + 1} is missing occupationId.`)
    }
    errors.push(...validateSourceTags(`suggestedCareers[${index}]`, career.sourceTags))
  })

  output.skillGaps.forEach((gap, index) => {
    errors.push(...validateSourceTags(`skillGaps[${index}]`, gap.sourceTags))
  })

  output.roadmap.forEach((item, index) => {
    if (item.estimatedHours <= 0) {
      errors.push(`Roadmap item ${index + 1} must include estimatedHours > 0.`)
    }
    errors.push(...validateSourceTags(`roadmap[${index}]`, item.sourceTags))
  })

  output.linksResources.forEach((resource, index) => {
    errors.push(...validateSourceTags(`linksResources[${index}]`, resource.sourceTags))
  })

  return errors
}
