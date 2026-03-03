import { z } from 'zod'

export type PlanTemplateKey =
  | 'regulated_trade'
  | 'regulated_profession'
  | 'credentialed_role'
  | 'portfolio_role'
  | 'experience_ladder_role'
  | 'general_role'

export const TransitionRouteSchema = z
  .object({
    title: z.string().min(1),
    reason: z.string().min(1),
    firstStep: z.string().min(1)
  })
  .strict()

export const TransitionPlanPhaseSchema = z
  .object({
    phase: z.string().min(1),
    weeks: z.string().min(1),
    tasks: z.array(z.string().min(1)).min(1),
    weeklyTargets: z.array(z.string().min(1)).min(1),
    timePerWeekHours: z.number().int().min(1).max(60)
  })
  .strict()

export const TransitionRoadmapGuideStepSchema = z
  .object({
    title: z.string().min(1),
    whyItMatters: z.string().min(1),
    timeRange: z.string().min(1),
    costRange: z.string().min(1),
    prereqs: z.array(z.string().min(1)),
    proofChecklist: z.array(z.string().min(1)).min(1)
  })
  .strict()

export const TransitionRoadmapGuidePhaseSchema = z
  .object({
    label: z.string().min(1),
    focus: z.string().min(1),
    steps: z.array(TransitionRoadmapGuideStepSchema).min(1)
  })
  .strict()

export const TransitionEarningStageSchema = z
  .object({
    stage: z.string().min(1),
    rangeLow: z.number().int().nonnegative(),
    rangeHigh: z.number().int().nonnegative(),
    unit: z.string().min(1)
  })
  .strict()

export const TransitionResourceSchema = z
  .object({
    label: z.string().min(1),
    url: z.string()
  })
  .strict()

export const TransitionDefinitionsSchema = z.record(z.string(), z.string())

export const TransitionModeSchema = z
  .object({
    definitions: TransitionDefinitionsSchema.optional(),
    difficulty: z
      .object({
        score: z.number().min(0).max(10),
        label: z.enum(['Easy', 'Moderate', 'Hard', 'Very Hard']),
        why: z.array(z.string().min(1)).min(1)
      })
      .strict(),
    timeline: z
      .object({
        minMonths: z.number().int().min(1).max(60),
        maxMonths: z.number().int().min(1).max(60),
        assumptions: z.array(z.string().min(1)).min(1)
      })
      .strict(),
    routes: z
      .object({
        primary: TransitionRouteSchema,
        secondary: TransitionRouteSchema,
        contingency: TransitionRouteSchema
      })
      .strict(),
    roadmapGuide: z
      .object({
        phases: z.array(TransitionRoadmapGuidePhaseSchema).length(3),
        next7Days: z.array(z.string().min(1)).min(3).max(7)
      })
      .strict()
      .optional(),
    plan90: z.array(TransitionPlanPhaseSchema).length(3),
    execution: z
      .object({
        dailyRoutine: z.array(z.string().min(1)).min(1),
        weeklyCadence: z.array(z.string().min(1)).min(1),
        outreachTemplates: z
          .object({
            call: z.string().min(1),
            email: z.string().min(1)
          })
          .strict()
      })
      .strict(),
    gaps: z
      .object({
        strengths: z.array(z.string().min(1)).min(1),
        missing: z.array(z.string().min(1)).min(1),
        first3Steps: z.array(z.string().min(1)).length(3)
      })
      .strict(),
    earnings: z.array(TransitionEarningStageSchema).length(4),
    reality: z
      .object({
        barriers: z.array(z.string().min(1)).length(3),
        mitigations: z.array(z.string().min(1)).length(3)
      })
      .strict(),
    resources: z
      .object({
        local: z.array(TransitionResourceSchema),
        online: z.array(TransitionResourceSchema),
        internal: z.array(TransitionResourceSchema).length(3)
      })
      .strict()
  })
  .strict()

export type TransitionModeReport = z.infer<typeof TransitionModeSchema>

export type TransitionRoute = z.infer<typeof TransitionRouteSchema>
export type TransitionPlanPhase = z.infer<typeof TransitionPlanPhaseSchema>
export type TransitionRoadmapGuideStep = z.infer<typeof TransitionRoadmapGuideStepSchema>
export type TransitionRoadmapGuidePhase = z.infer<typeof TransitionRoadmapGuidePhaseSchema>
export type TransitionEarningStage = z.infer<typeof TransitionEarningStageSchema>
export type TransitionResource = z.infer<typeof TransitionResourceSchema>

export type PlannerReportSource = {
  compatibilitySnapshot: {
    score: number
    topReasons: string[]
  }
  suggestedCareers: Array<{
    occupationId?: string
    title: string
    score: number
    transitionTime: string
    regulated: boolean
    topReasons: string[]
    officialLinks?: Array<{ label: string; url: string }>
    salary: {
      native: {
        currency: 'USD' | 'CAD'
        low: number | null
        median: number | null
        high: number | null
        sourceName?: string
        asOfDate?: string
        region?: string
      } | null
      usd: {
        low: number | null
        median: number | null
        high: number | null
      } | null
      conversion?: {
        rate: number
        asOfDate: string
        source?: string
      } | null
    }
  }>
  skillGaps?: Array<{
    skillName: string
    gapLevel?: 'met' | 'partial' | 'missing'
    howToClose: string[]
    difficulty?: 'easy' | 'medium' | 'hard'
  }>
  executionStrategy?: {
    whereYouStandNow: {
      strengths: Array<{ summary: string }>
      missingMandatoryRequirements: Array<{ label: string; reason: string }>
      competitiveDisadvantages: Array<{ label: string; reason: string }>
    }
    realBlockers: {
      requiredToApply: Array<{
        label: string
        whyItMatters: string
        howToClose: string
        timeEstimate: string
      }>
      requiredToCompete: Array<{
        label: string
        whyItMatters: string
        howToClose: string
        timeEstimate: string
      }>
    }
    plan90Day?: {
      month1: {
        label: string
        weeklyTimeInvestment: string
        actions: Array<{
          task: string
          volumeTarget: string
          proofTarget: string
          weeklyTime: string
          linkedRequirements?: string[]
        }>
      }
      month2: {
        label: string
        weeklyTimeInvestment: string
        actions: Array<{
          task: string
          volumeTarget: string
          proofTarget: string
          weeklyTime: string
          linkedRequirements?: string[]
        }>
      }
      month3: {
        label: string
        weeklyTimeInvestment: string
        actions: Array<{
          task: string
          volumeTarget: string
          proofTarget: string
          weeklyTime: string
          linkedRequirements?: string[]
        }>
      }
    }
  }
  transitionSections?: {
    mandatoryGateRequirements: Array<{
      label: string
      gapLevel: 'met' | 'partial' | 'missing'
      howToGet: string
    }>
    coreHardSkills: Array<{
      label: string
      gapLevel: 'met' | 'partial' | 'missing'
      howToLearn: string
    }>
    toolsPlatforms: Array<{
      label: string
      gapLevel: 'met' | 'partial' | 'missing'
      quickProject: string
    }>
    experienceSignals: Array<{
      label: string
      gapLevel: 'met' | 'partial' | 'missing'
      howToBuild: string
    }>
    transferableStrengths: Array<{
      label: string
      requirement: string
      source: 'experience_text' | 'skills'
    }>
  }
  targetRequirements?: {
    education: string | null
    certifications: string[]
    hardGates: string[]
    employerSignals: string[]
    apprenticeshipHours: number | null
    examRequired: boolean | null
    regulated: boolean
    sources: Array<{ label: string; url: string }>
  }
  transitionReport?: {
    marketSnapshot: {
      role: string
      location: string
      summaryLine?: string
    }
    transferableStrengths: Array<{ strength: string }>
  }
  linksResources?: Array<{
    label: string
    url: string
    type: 'official' | 'curated'
  }>
  marketEvidence?: {
    baselineOnly: boolean
    postingsCount: number
    query: {
      location: string
    } | null
  }
  bottleneck?: {
    title: string
    why: string
    nextAction: string
    estimatedEffort: string
  } | null
  dataTransparency?: {
    inputsUsed: string[]
    datasetsUsed: string[]
    fxRateUsed: string | null
  }
}

export type OccupationResolutionSummary = {
  title: string
  code: string
  source: 'O*NET' | 'NOC' | 'internal'
  confidence: number
  stage?: string | null
  specialization?: string | null
  rawInputTitle: string
  region?: 'CA' | 'US' | null
}

export type DerivedSignal = {
  label: string
  weight: number
  action: string
}

export type DerivedSignals = {
  transferableSignals: DerivedSignal[]
  missingSignals: DerivedSignal[]
  priorityActions: string[]
}

export type TransitionRelationship = 'career_switch' | 'within_career_progression'

export type TransitionPlanContext = {
  currentRole: string
  targetRole: string
  experienceText: string
  location: string
  education: string
  incomeTarget: string
  report: PlannerReportSource
  templateKey: PlanTemplateKey
  relationship: TransitionRelationship
  currentResolution: OccupationResolutionSummary | null
  targetResolution: OccupationResolutionSummary | null
  targetProfile: OccupationTemplateProfile
  signals: DerivedSignals
  proofBuilderTerm?: string | null
}

export type TemplateOutput = {
  definitions?: Record<string, string>
  routes: {
    primary: TransitionRoute
    secondary: TransitionRoute
    contingency: TransitionRoute
  }
  plan90: [TransitionPlanPhase, TransitionPlanPhase, TransitionPlanPhase]
  execution: {
    dailyRoutine: string[]
    weeklyCadence: string[]
    outreachTemplates: {
      call: string
      email: string
    }
  }
  resources?: {
    local: TransitionResource[]
    online: TransitionResource[]
  }
}

export type OccupationTemplateProfile = {
  title: string
  code: string
  regulated: boolean
  education: string
  certifications: string[]
  hardGates: string[]
  employerSignals: string[]
  apprenticeshipHours: number | null
  examRequired: boolean | null
  stage?: string | null
  region?: 'CA' | 'US' | null
  relationship?: TransitionRelationship
}
