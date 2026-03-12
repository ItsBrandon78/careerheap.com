'use client'

import { type ComponentProps, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Badge from '@/components/Badge'
import Button from '@/components/Button'
import Card from '@/components/Card'
import {
  ToolHero
} from '@/components/career-switch-planner/CareerSwitchPlannerComponents'
import PlannerIntakeWizard from '@/components/career-switch-planner/PlannerIntakeWizard'
import PlannerDashboardV3 from '@/components/career-switch-planner/PlannerDashboardV3'
import {
  careerSwitchFaqs,
  careerSwitchMoreTools
} from '@/lib/planner/content'
import { extractProfileSignals, isPersonalIdentifier } from '@/lib/planner/profileSignals'
import { buildRecommendedTargetSections } from '@/lib/planner/recommendedTargets'
import {
  type CareerSwitchPlannerResult,
  toPlannerResultView,
  type PlannerResultView
} from '@/lib/planner/types'
import { buildPlannerDashboardV3Model, type PlannerViewMode } from '@/lib/planner/v3Dashboard'
import {
  dedupeBullets as sharedDedupeBullets
} from '@/lib/transition/dedupe'
import { useToolUsage, type ToolUsageResult } from '@/lib/hooks/useToolUsage'
import { useAuth } from '@/lib/auth/context'
import {
  CANADA_PROVINCES,
  DEFAULT_PROVINCE,
  getStoredProvince,
  toProvinceLocation,
  type ProvinceCode
} from '@/lib/client/provinceSession'
import { getSupabaseAuthHeaders } from '@/lib/supabase/authHeaders'

type PlannerState = 'idle' | 'loading' | 'results'
type UploadState = 'idle' | 'parsing' | 'success' | 'error'
type OcrCapabilityMode = 'native' | 'fallback' | 'unavailable'
type OcrCapabilityStatus = 'idle' | 'loading' | 'ready' | 'error'
type WizardStep = 0 | 1 | 2
type LegacyWorkRegionValue = 'us' | 'ca' | 'remote-us' | 'remote-ca' | 'either'
type WorkRegionValue = ProvinceCode | LegacyWorkRegionValue
type TimelineBucketValue = 'immediate' | '1-3 months' | '3-6 months' | '6-12+ months'
type EducationLevelValue =
  | 'No formal degree'
  | 'High school'
  | 'Trade certification'
  | 'Apprenticeship'
  | "Associate's"
  | "Bachelor's"
  | "Master's"
  | 'Doctorate'
  | 'Self-taught / portfolio-based'
type IncomeTargetValue =
  | 'Under $50k'
  | '$50-75k'
  | '$75-100k'
  | '$100k+'
  | '$150k+'
  | 'Not sure'

type ResumeOcrCapabilities = {
  available: boolean
  mode: OcrCapabilityMode
  hasPdftoppm: boolean
  hasTesseractCli: boolean
  hasTesseractJs: boolean
  maxPages: number
  timeoutMs: number
}

type RoleResolutionMatch = {
  input: string
  matched: {
    occupationId: string
    title: string
    code: string
    region: 'CA' | 'US'
    source?: string | null
    lastUpdated?: string | null
    confidence: number
    stage?: string | null
    specialization?: string | null
    rawInputTitle: string
  } | null
  suggestions: Array<{
    occupationId: string
    title: string
    code: string
    region: 'CA' | 'US'
    source?: string | null
    confidence: number
  }>
}

type RoleSelectionPrompt = {
  role: 'current' | 'target'
  input: string
  message?: string
  alternatives: Array<{
    occupationId: string
    title: string
    code: string
    confidence: number
    source?: string | null
    stage?: string | null
    specialization?: string | null
  }>
}

type PlannerFormDraft = {
  currentRoleText: string
  targetRoleText: string
  currentRoleOccupationId: string | null
  targetRoleOccupationId: string | null
  recommendMode: boolean
  skills: string[]
  experienceText: string
  userPostingText: string
  useMarketEvidence: boolean
  educationLevel: EducationLevelValue
  workRegion: WorkRegionValue
  locationText: string
  timelineBucket: TimelineBucketValue
  incomeTarget: IncomeTargetValue
}

type PlannerReportPayload = {
  compatibilitySnapshot: {
    score: number
    band: 'strong' | 'moderate' | 'weak'
    breakdown: {
      skill_overlap: number
      experience_similarity: number
      education_alignment: number
      certification_gap: number
      timeline_feasibility: number
    }
    topReasons: string[]
  }
  suggestedCareers: Array<{
    occupationId: string
    title: string
    score: number
    breakdown: {
      skill_overlap: number
      experience_similarity: number
      education_alignment: number
      certification_gap: number
      timeline_feasibility: number
    }
    difficulty: 'easy' | 'moderate' | 'hard'
    transitionTime: string
    regulated: boolean
    officialLinks?: Array<{ label: string; url: string }>
    salary: {
      usd: { low: number | null; median: number | null; high: number | null } | null
      native: {
        currency: 'USD' | 'CAD'
        low: number | null
        median: number | null
        high: number | null
        sourceName: string
        sourceUrl?: string | null
        asOfDate: string
        region?: string
      } | null
      conversion: { rate: number; asOfDate: string; source?: string } | null
    }
    topReasons: string[]
  }>
  skillGaps: Array<{
    skillId: string
    skillName: string
    weight: number
    difficulty: 'easy' | 'medium' | 'hard'
    gapLevel: 'met' | 'partial' | 'missing'
    frequency: number
    howToClose: string[]
    evidence: Array<{
      source: 'adzuna' | 'user_posting' | 'onet'
      quote: string
      postingId?: string
      confidence: number
    }>
    evidenceLabel: string
  }>
  roadmap: Array<{
    id: string
    phase: 'immediate' | '1_3_months' | '3_6_months' | '6_12_months' | '1_plus_year'
    title: string
    time_estimate_hours: number
    difficulty: 'easy' | 'medium' | 'hard'
    why_it_matters: string
    action: string
  }>
  resumeReframe: Array<{ before: string; after: string }>
  linksResources?: Array<{ label: string; url: string; type: 'official' | 'curated' }>
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
  transitionSections?: {
    mandatoryGateRequirements: Array<{
      id: string
      label: string
      status: 'met' | 'missing'
      gapLevel: 'met' | 'partial' | 'missing'
      frequency: number
      howToGet: string
      estimatedTime: string
      evidenceLabel: string
      evidence: Array<{
        source: 'adzuna' | 'user_posting' | 'onet'
        quote: string
        postingId?: string
        confidence: number
      }>
    }>
    coreHardSkills: Array<{
      id: string
      label: string
      gapLevel: 'met' | 'partial' | 'missing'
      frequency: number
      howToLearn: string
      evidenceLabel: string
      evidence: Array<{
        source: 'adzuna' | 'user_posting' | 'onet'
        quote: string
        postingId?: string
        confidence: number
      }>
    }>
    toolsPlatforms: Array<{
      id: string
      label: string
      gapLevel: 'met' | 'partial' | 'missing'
      frequency: number
      quickProject: string
      evidenceLabel: string
      evidence: Array<{
        source: 'adzuna' | 'user_posting' | 'onet'
        quote: string
        postingId?: string
        confidence: number
      }>
    }>
    experienceSignals: Array<{
      id: string
      label: string
      gapLevel: 'met' | 'partial' | 'missing'
      frequency: number
      howToBuild: string
      evidenceLabel: string
      evidence: Array<{
        source: 'adzuna' | 'user_posting' | 'onet'
        quote: string
        postingId?: string
        confidence: number
      }>
    }>
    transferableStrengths: Array<{
      id: string
      label: string
      requirement: string
      source: 'experience_text' | 'skills'
    }>
    roadmapPlan: {
      zeroToTwoWeeks: Array<{ id: string; action: string; tiedRequirement: string }>
      oneToThreeMonths: Array<{ id: string; action: string; tiedRequirement: string }>
      threeToTwelveMonths: Array<{ id: string; action: string; tiedRequirement: string }>
      fastestPathToApply: string[]
      strongCandidatePath: string[]
    }
  }
  transitionReport?: {
    marketSnapshot: {
      role: string
      location: string
      summaryLine: string
      topRequirements: Array<{
        id: string
        normalized_key: string
        label: string
        frequency_count: number
        frequency_percent: number | null
        evidenceQuote: Array<{
          source: 'adzuna' | 'user_posting' | 'onet'
          quote: string
          postingId?: string
          confidence: number
        }>
      }>
      topTools: Array<{
        id: string
        normalized_key: string
        label: string
        frequency_count: number
        frequency_percent: number | null
        evidenceQuote: Array<{
          source: 'adzuna' | 'user_posting' | 'onet'
          quote: string
          postingId?: string
          confidence: number
        }>
      }>
      gateBlockers: Array<{
        id: string
        normalized_key: string
        label: string
        frequency_count: number
        frequency_percent: number | null
        evidenceQuote: Array<{
          source: 'adzuna' | 'user_posting' | 'onet'
          quote: string
          postingId?: string
          confidence: number
        }>
      }>
    }
    mustHaves: Array<{
      id: string
      normalized_key: string
      label: string
      frequency_count: number
      frequency_percent: number | null
      evidenceQuote: Array<{
        source: 'adzuna' | 'user_posting' | 'onet'
        quote: string
        postingId?: string
        confidence: number
      }>
      status: 'met' | 'missing'
      howToGet: string
      timeEstimate: string
    }>
    niceToHaves: Array<{
      id: string
      normalized_key: string
      label: string
      frequency_count: number
      frequency_percent: number | null
      evidenceQuote: Array<{
        source: 'adzuna' | 'user_posting' | 'onet'
        quote: string
        postingId?: string
        confidence: number
      }>
      gapLevel: 'met' | 'partial' | 'missing'
      howToLearn: string
    }>
    coreTasks: Array<{
      id: string
      normalized_key: string
      label: string
      task: string
      frequency_count: number
      frequency_percent: number | null
      evidenceQuote: Array<{
        source: 'adzuna' | 'user_posting' | 'onet'
        quote: string
        postingId?: string
        confidence: number
      }>
      gapLevel: 'met' | 'partial' | 'missing'
    }>
    toolsPlatformsEquipment: Array<{
      id: string
      normalized_key: string
      label: string
      tool: string
      frequency_count: number
      frequency_percent: number | null
      evidenceQuote: Array<{
        source: 'adzuna' | 'user_posting' | 'onet'
        quote: string
        postingId?: string
        confidence: number
      }>
      gapLevel: 'met' | 'partial' | 'missing'
      quickPractice: string
    }>
    transferableStrengths: Array<{
      id: string
      strength: string
      source: 'experience_text' | 'skills'
      countsToward: Array<{ normalized_key: string; label: string }>
    }>
    plan30_60_90: {
      days30: Array<{
        id: string
        goal: string
        actions: string[]
        linkedRequirements: string[]
      }>
      days60: Array<{
        id: string
        goal: string
        actions: string[]
        linkedRequirements: string[]
      }>
      days90: Array<{
        id: string
        goal: string
        actions: string[]
        linkedRequirements: string[]
      }>
      fastestPathToApply: Array<{
        id: string
        goal: string
        actions: string[]
        linkedRequirements: string[]
      }>
      strongCandidatePath: Array<{
        id: string
        goal: string
        actions: string[]
        linkedRequirements: string[]
      }>
    }
    evidenceTransparency: {
      employerPostings: {
        source: 'adzuna_cached'
        count: number
        lastUpdated: string | null
        usedCache: boolean
      }
      userProvidedPosting: {
        included: boolean
      }
      baselineOnet: {
        included: boolean
      }
      baselineOnlyWarning: string | null
    }
  }
  executionStrategy?: {
    whereYouStandNow: {
      strengths: Array<{
        summary: string
        resumeSignal: string
        countsToward: string[]
      }>
      missingMandatoryRequirements: Array<{
        normalized_key: string
        label: string
        blockerClass: 'legal_certification' | 'skill' | 'experience'
        reason: string
      }>
      competitiveDisadvantages: Array<{
        normalized_key: string
        label: string
        blockerClass: 'legal_certification' | 'skill' | 'experience'
        reason: string
      }>
    }
    realBlockers: {
      requiredToApply: Array<{
        normalized_key: string
        label: string
        blockerClass: 'legal_certification' | 'skill' | 'experience'
        whyItMatters: string
        howToClose: string
        timeEstimate: string
        evidenceQuote: string[]
      }>
      requiredToCompete: Array<{
        normalized_key: string
        label: string
        blockerClass: 'legal_certification' | 'skill' | 'experience'
        whyItMatters: string
        howToClose: string
        timeEstimate: string
        evidenceQuote: string[]
      }>
    }
    transferableEdge: {
      translations: Array<{
        fromResume: string
        toTargetRole: string
        countsToward: string[]
      }>
    }
    plan90Day: {
      month1: {
        label: string
        weeklyTimeInvestment: string
        actions: Array<{
          id: string
          task: string
          volumeTarget: string
          learningTarget: string
          proofTarget: string
          weeklyTime: string
          linkedRequirements: string[]
        }>
      }
      month2: {
        label: string
        weeklyTimeInvestment: string
        actions: Array<{
          id: string
          task: string
          volumeTarget: string
          learningTarget: string
          proofTarget: string
          weeklyTime: string
          linkedRequirements: string[]
        }>
      }
      month3: {
        label: string
        weeklyTimeInvestment: string
        actions: Array<{
          id: string
          task: string
          volumeTarget: string
          learningTarget: string
          proofTarget: string
          weeklyTime: string
          linkedRequirements: string[]
        }>
      }
    }
    probabilityRealityCheck: {
      difficulty: string
      whatIncreasesOdds: string[]
      commonFailureModes: string[]
    }
    behavioralExecution: {
      minimumWeeklyEffort: string
      consistencyLooksLike: string[]
      whatNotToDo: string[]
    }
  }
  transitionMode?: {
    definitions?: Record<string, string>
    difficulty: {
      score: number
      label: 'Easy' | 'Moderate' | 'Hard' | 'Very Hard'
      why: string[]
    }
    timeline: {
      minMonths: number
      maxMonths: number
      assumptions: string[]
    }
    routes: {
      primary: { title: string; reason: string; firstStep: string }
      secondary: { title: string; reason: string; firstStep: string }
      contingency: { title: string; reason: string; firstStep: string }
    }
    roadmapGuide?: {
      phases: Array<{
        label: string
        focus: string
        steps: Array<{
          title: string
          whyItMatters: string
          timeRange: string
          costRange: string
          prereqs: string[]
          proofChecklist: string[]
        }>
      }>
      next7Days: string[]
    }
    plan90: Array<{
      phase: string
      weeks: string
      tasks: string[]
      weeklyTargets: string[]
      timePerWeekHours: number
    }>
    execution: {
      dailyRoutine: string[]
      weeklyCadence: string[]
      outreachTemplates: {
        call: string
        email: string
      }
    }
    gaps: {
      strengths: string[]
      missing: string[]
      first3Steps: string[]
    }
    earnings: Array<{
      stage: string
      rangeLow: number
      rangeHigh: number
      unit: string
    }>
    reality: {
      barriers: string[]
      mitigations: string[]
    }
    resources: {
      local: Array<{ label: string; url: string }>
      online: Array<{ label: string; url: string }>
      internal: Array<{ label: string; url: string }>
    }
  }
  transitionStructuredPlan?: {
    summary: string
    compatibility_level: 'Low' | 'Medium' | 'High'
    timeline_estimate: string
    required_certifications: string[]
    required_experience: string[]
    action_steps: string[]
    salary_projection: string
    narrative_sections: {
      intro: string
      skills_you_build: Array<{
        title: string
        summary: string
        bullets: string[]
      }>
      credentials_you_need: Array<{
        title: string
        summary: string
        bullets: string[]
      }>
      soft_skills_that_matter: string[]
      why_this_path_can_pay_off: string[]
      start_from_zero: string[]
    }
  }
  transitionPlanScripts?: {
    call: string
    email: string
    source: 'gpt' | 'deterministic'
  }
  transitionPlanCacheMeta?: {
    version: string
    generatedAt: string
    region: string
    experienceLevelBucket: string
    cacheHit: boolean
  }
  previewLimited?: boolean
  marketEvidence?: {
    enabled: boolean
    used: boolean
    baselineOnly: boolean
    usedCache: boolean
    postingsCount: number
    llmNormalizedCount: number
    fetchedAt: string | null
    query: { role: string; location: string; country: string } | null
    sourcePriority: Array<'user_posting' | 'adzuna' | 'onet'>
  }
  bottleneck?: {
    title: string
    why: string
    nextAction: string
    estimatedEffort: string
  } | null
  roleResolution?: {
    current: RoleResolutionMatch
    target: RoleResolutionMatch | null
  }
  dataTransparency: {
    inputsUsed: string[]
    datasetsUsed: string[]
    fxRateUsed: string | null
  }
  v3Diagnostics?: {
    missingFields: string[]
    generatedAt: string
  }
  careerPathwayProfile?: {
    meta: {
      title: string
      slug: string
      jurisdiction: { country: string; region?: string | null }
      codes: { noc_2021?: string | null; trade_code?: string | null }
      teer?: number | null
      pathway_type?: string
    }
    timeline?: {
      time_to_full_qualification?: {
        min_months?: number
        max_months?: number
      }
    }
  } | null
}

type ResumeStructuredSnapshot = {
  certifications: string[]
}

type SubmittedPlannerSnapshot = {
  currentRole: string
  targetRole: string
  currentRoleInput: string
  targetRoleInput: string
  recommendMode: boolean
  timelineBucket: TimelineBucketValue
}

type PlannerLoopProgressState = {
  checkedTaskIds: Record<string, boolean>
  expandedPhaseIds: string[]
  completedTrainingIds: Record<string, boolean>
  outreachTracker: {
    sent: string
    replies: string
    positiveReplies: string
    nextFollowUpDate: string
  }
  updatedAt?: string | null
}

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024
const ACCEPTED_EXTENSIONS = ['pdf', 'docx']
const FREE_LIMIT = 3
const WIZARD_STEPS: Array<{
  id: WizardStep
  title: string
  eyebrow: string
  helper: string
}> = [
  {
    id: 0,
    title: 'Roles',
    eyebrow: 'Step 1 of 3',
    helper: 'Set the direction before we build the plan.'
  },
  {
    id: 1,
    title: 'Background',
    eyebrow: 'Step 2 of 3',
    helper: 'Add the strongest signals from your resume, skills, and experience.'
  },
  {
    id: 2,
    title: 'Constraints',
    eyebrow: 'Step 3 of 3',
    helper: 'Set province, timing, and market evidence before generating.'
  }
]
const PLANNER_LOADING_STAGES = ['Parsing profile', 'Matching roles', 'Building plan', 'Finalizing']
const FALLBACK_SKILL_SUGGESTIONS = [
  'Stakeholder management',
  'Electrical safety',
  'Project coordination',
  'Troubleshooting',
  'Customer communication',
  'Process improvement',
  'Data analysis',
  'SQL',
  'Scheduling',
  'Documentation'
]

const WORK_REGION_OPTIONS: Array<{ value: WorkRegionValue; label: string }> = CANADA_PROVINCES.map(
  (province) => ({
    value: province.code,
    label: province.label
  })
)

const TIMELINE_OPTIONS: Array<{ value: TimelineBucketValue; label: string }> = [
  { value: 'immediate', label: 'Immediate (0-30 days)' },
  { value: '1-3 months', label: '1-3 months' },
  { value: '3-6 months', label: '3-6 months' },
  { value: '6-12+ months', label: '6-12+ months' }
]

const EDUCATION_OPTIONS: Array<{ value: EducationLevelValue; label: string }> = [
  { value: 'No formal degree', label: 'No formal degree' },
  { value: 'High school', label: 'High school' },
  { value: 'Trade certification', label: 'Trade certification' },
  { value: 'Apprenticeship', label: 'Apprenticeship' },
  { value: "Associate's", label: "Associate's" },
  { value: "Bachelor's", label: "Bachelor's" },
  { value: "Master's", label: "Master's" },
  { value: 'Doctorate', label: 'Doctorate' },
  { value: 'Self-taught / portfolio-based', label: 'Self-taught / portfolio-based' }
]

const INCOME_TARGET_OPTIONS: Array<{ value: IncomeTargetValue; label: string }> = [
  { value: 'Under $50k', label: 'Under $50k' },
  { value: '$50-75k', label: '$50-75k' },
  { value: '$75-100k', label: '$75-100k' },
  { value: '$100k+', label: '$100k+' },
  { value: '$150k+', label: '$150k+' },
  { value: 'Not sure', label: 'Not sure' }
]

const GAP_LABEL_OVERRIDES: Record<string, string> = {
  'active listening': 'Site communication and instruction accuracy',
  speaking: 'Clear verbal communication on the job',
  'reading comprehension': 'Reading work orders and safety documents',
  'critical thinking': 'Troubleshooting and decision quality',
  'social perceptiveness': 'Crew awareness and collaboration',
  'judgment and decision making': 'On-the-job decision quality',
  monitoring: 'Quality and safety checks',
  coordination: 'Task and crew coordination',
  writing: 'Clear handoff and documentation notes'
}

function mapSkillGapLabel(value: string) {
  const key = value.trim().toLowerCase()
  return GAP_LABEL_OVERRIDES[key] ?? value
}

function joinReadableList(values: string[]) {
  if (values.length === 0) return ''
  if (values.length === 1) return values[0]
  if (values.length === 2) return `${values[0]} and ${values[1]}`
  return `${values.slice(0, -1).join(', ')}, and ${values[values.length - 1]}`
}

function cleanRoadmapLabel(value: string) {
  return value
    .replace(/\s+/g, ' ')
    .replace(/\bjob description\b/gi, '')
    .replace(/\bbefore applying\b/gi, '')
    .replace(/\s+,/g, ',')
    .trim()
    .replace(/[.;:,]+$/g, '')
}

function normalizeRoadmapBullets(values: string[], max = 4) {
  return sharedDedupeBullets(
    values
      .map((value) => cleanRoadmapLabel(mapSkillGapLabel(value)))
      .filter(Boolean),
    max
  )
}

function buildResumeTalkingPoints(input: {
  targetRole: string
  certifications: string[]
  quickWins: string[]
  firstSteps: string[]
  commonSkills: string[]
}) {
  const targetLabel = input.targetRole.trim() || 'the target role'

  return normalizeRoadmapBullets([
    input.certifications.length > 0
      ? `Lead with the tickets you already hold: ${joinReadableList(input.certifications.slice(0, 3))}.`
      : '',
    input.quickWins[0]
      ? `Translate your strongest overlap into ${targetLabel} language: ${input.quickWins[0]}.`
      : '',
    input.commonSkills.length > 0
      ? `Add one line showing how you are building ${joinReadableList(input.commonSkills.slice(0, 2))}.`
      : '',
    input.firstSteps[0]
      ? `Replace a generic objective with a concrete next-step signal: ${input.firstSteps[0]}.`
      : '',
    'Use short, measurable statements that prove safety, reliability, learning speed, or hands-on readiness.'
  ])
}

function normalizeDraftField(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLowerCase()
}

function buildPlannerDraftSignature(
  draft: PlannerFormDraft,
  explicitCertifications: string[] = []
) {
  return JSON.stringify({
    currentRoleText: normalizeDraftField(draft.currentRoleText),
    targetRoleText: normalizeDraftField(draft.targetRoleText),
    currentRoleOccupationId: draft.currentRoleOccupationId ?? '',
    targetRoleOccupationId: draft.targetRoleOccupationId ?? '',
    recommendMode: draft.recommendMode,
    skills: draft.skills.map(normalizeDraftField).filter(Boolean).sort(),
    certifications: explicitCertifications
      .map(normalizeDraftField)
      .filter(Boolean)
      .sort(),
    experienceText: normalizeDraftField(draft.experienceText),
    userPostingText: normalizeDraftField(draft.userPostingText),
    useMarketEvidence: draft.useMarketEvidence,
    educationLevel: draft.educationLevel,
    workRegion: draft.workRegion,
    locationText: normalizeDraftField(draft.locationText),
    timelineBucket: draft.timelineBucket,
    incomeTarget: draft.incomeTarget
  })
}

function normalizeRecommendedRoleWhy(values: string[]) {
  return sharedDedupeBullets(
    values.map((value) => value.replace(/\.$/, '')),
    2
  ).map((item) => (/[.!?]$/.test(item) ? item : `${item}.`))
}

function buildRecommendedRoleSections(
  careers: PlannerReportPayload['suggestedCareers'],
  currentRoleInput: string,
  currentRoleCode?: string | null,
  targetRoleInput?: string | null,
  targetRoleCode?: string | null,
  currentAlternatives?: Array<{ title: string; code?: string | null }>
) {
  return buildRecommendedTargetSections({
    careers: careers.map((career) => ({
      occupationId: career.occupationId,
      title: career.title,
      score: career.score,
      difficulty: career.difficulty,
      transitionTime: career.transitionTime,
      regulated: career.regulated,
      topReasons: normalizeRecommendedRoleWhy([
        ...(career.topReasons.slice(0, 2).length > 0
          ? career.topReasons.slice(0, 2)
          : [`Your ${currentRoleInput || 'current'} background overlaps with this path.`]),
        career.regulated
          ? 'This path has formal gates, so plan the entry sequence early.'
          : 'This path can usually start with targeted applications and proof.'
      ]),
      salary: career.salary
    })),
    currentRoleInput,
    currentRoleCode,
    targetRoleInput,
    targetRoleCode,
    currentAlternatives
  })
}

function scrollToSection(id: string) {
  const node = document.getElementById(id)
  if (!node) return
  node.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function mergeUniqueCaseInsensitive(base: string[], incoming: string[]) {
  const next = [...base]
  const seen = new Set(base.map((value) => value.toLowerCase()))
  for (const value of incoming) {
    const trimmed = value.trim()
    if (!trimmed) continue
    const key = trimmed.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    next.push(trimmed)
  }
  return next
}

function isProvinceWorkRegion(value: string): value is ProvinceCode {
  return CANADA_PROVINCES.some((province) => province.code === value)
}

function normalizeWorkRegionToProvince(
  value: WorkRegionValue | string,
  fallback: ProvinceCode = DEFAULT_PROVINCE
): ProvinceCode {
  const normalized = value.trim().toUpperCase()
  if (isProvinceWorkRegion(normalized)) {
    return normalized
  }
  return fallback
}

function toAutocompleteRegion(): 'CA' {
  return 'CA'
}

function normalizeRoleSuggestionKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\b([a-z]{4,})s\b/g, '$1')
}

function roleSuggestionConfidenceToDifficulty(confidence?: number) {
  const score = typeof confidence === 'number' ? confidence : 0
  if (score >= 0.85) return 'easy'
  if (score >= 0.72) return 'moderate'
  return 'hard'
}

function roleSuggestionConfidenceToTimeline(confidence?: number) {
  const score = typeof confidence === 'number' ? confidence : 0
  if (score >= 0.85) return '1-3 months'
  if (score >= 0.72) return '3-6 months'
  return '6-12 months'
}

function toReadableMatchReason(matchedBy?: string) {
  if (!matchedBy) return 'role similarity'
  return matchedBy.replace(/_/g, ' ')
}

function usageLabel(
  usage: ToolUsageResult | null,
  previewLocked: boolean,
  planFallback: 'free' | 'pro' | 'lifetime'
) {
  if (previewLocked) return 'Locked Preview'
  if (planFallback === 'lifetime') return 'Lifetime Access'
  if (planFallback === 'pro') return 'Unlimited Pro'
  if (usage?.isUnlimited) return usage.plan === 'lifetime' ? 'Lifetime Access' : 'Unlimited Pro'
  if (typeof usage?.usesRemaining === 'number') {
    return `${usage.usesRemaining} Free Uses Remaining`
  }
  return `${FREE_LIMIT} Free Uses Total`
}

export default function CareerSwitchPlannerPage({
  marketEvidenceAvailable = false
}: {
  marketEvidenceAvailable?: boolean
}) {
  const searchParams = useSearchParams()
  const { getUsage } = useToolUsage()
  const { user, plan } = useAuth()

  const [plannerState, setPlannerState] = useState<PlannerState>('idle')
  const [viewMode, setViewMode] = useState<PlannerViewMode>('intake')
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false)
  const [lastGeneratedAt, setLastGeneratedAt] = useState<string | null>(null)
  const [savedPlannerReportId, setSavedPlannerReportId] = useState<string | null>(null)
  const [plannerServerProgressState, setPlannerServerProgressState] = useState<PlannerLoopProgressState | null>(null)
  const [plannerServerProgressHydrated, setPlannerServerProgressHydrated] = useState(false)
  const [savePlanState, setSavePlanState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [isGuestPreview, setIsGuestPreview] = useState(false)
  const [activeWizardStep, setActiveWizardStep] = useState<WizardStep>(0)
  const [loadingStageIndex, setLoadingStageIndex] = useState(0)
  const [resumeToolkitDraft, setResumeToolkitDraft] = useState('')
  const [callToolkitDraft, setCallToolkitDraft] = useState('')
  const [emailToolkitDraft, setEmailToolkitDraft] = useState('')
  const [outreachTracker, setOutreachTracker] = useState({
    sent: '',
    replies: '',
    positiveReplies: '',
    nextFollowUpDate: ''
  })
  const [currentRoleText, setCurrentRoleText] = useState('')
  const [targetRoleText, setTargetRoleText] = useState('')
  const [targetRoleAssistiveSuggestions, setTargetRoleAssistiveSuggestions] = useState<
    Array<{
      title: string
      difficulty: string
      transitionTime: string
      why: string[]
    }>
  >([])
  const [currentRoleSelectedMatch, setCurrentRoleSelectedMatch] = useState<{
    occupationId: string
    title: string
    confidence: number
    matchedBy: string
  } | null>(null)
  const [targetRoleSelectedMatch, setTargetRoleSelectedMatch] = useState<{
    occupationId: string
    title: string
    confidence: number
    matchedBy: string
  } | null>(null)
  const recommendMode = false
  const [showSuggestedTargets, setShowSuggestedTargets] = useState(true)
  const [suggestedTargetShuffle, setSuggestedTargetShuffle] = useState(0)
  const [skills, setSkills] = useState<string[]>([])
  const [experienceText, setExperienceText] = useState('')
  const [inputError, setInputError] = useState('')
  const [plannerResult, setPlannerResult] = useState<PlannerResultView | null>(null)
  const [plannerReport, setPlannerReport] = useState<PlannerReportPayload | null>(null)
  const [plannerLoopProgressState, setPlannerLoopProgressState] = useState<{
    checkedTaskIds: Record<string, boolean>
    expandedPhaseIds: string[]
    completedTrainingIds: Record<string, boolean>
    updatedAt: string
  } | null>(null)
  const [roleSelectionPrompt, setRoleSelectionPrompt] = useState<RoleSelectionPrompt | null>(null)
  const [lastSubmittedSnapshot, setLastSubmittedSnapshot] = useState<SubmittedPlannerSnapshot | null>(null)
  const [lastSubmittedDraftSignature, setLastSubmittedDraftSignature] = useState<string | null>(null)
  const [resumeStructuredSnapshot, setResumeStructuredSnapshot] = useState<ResumeStructuredSnapshot>({
    certifications: []
  })
  const [pendingResumeSkills, setPendingResumeSkills] = useState<string[]>([])
  const [pendingResumeCertifications, setPendingResumeCertifications] = useState<string[]>([])
  const [pendingResumeRoleCandidate, setPendingResumeRoleCandidate] = useState<string | null>(null)
  const [resumeReviewExpanded, setResumeReviewExpanded] = useState(false)
  const [uploadState, setUploadState] = useState<UploadState>('idle')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadError, setUploadError] = useState('')
  const [uploadWarning, setUploadWarning] = useState('')
  const [uploadStats, setUploadStats] = useState<{ meaningfulChars: number } | null>(null)
  const [ocrCapabilityStatus, setOcrCapabilityStatus] = useState<OcrCapabilityStatus>('idle')
  const [ocrCapabilities, setOcrCapabilities] = useState<ResumeOcrCapabilities | null>(null)
  const [selectedProvince, setSelectedProvince] = useState<ProvinceCode>(DEFAULT_PROVINCE)
  const [workRegion, setWorkRegion] = useState<WorkRegionValue>(DEFAULT_PROVINCE)
  const [locationText, setLocationText] = useState(toProvinceLocation(DEFAULT_PROVINCE))
  const [locationTouched, setLocationTouched] = useState(false)
  const [timelineBucket, setTimelineBucket] = useState<TimelineBucketValue>('1-3 months')
  const [educationLevel, setEducationLevel] = useState<EducationLevelValue>("Bachelor's")
  const [incomeTarget, setIncomeTarget] = useState<IncomeTargetValue>('Not sure')
  const [userPostingText, setUserPostingText] = useState('')
  const [useMarketEvidence, setUseMarketEvidence] = useState(marketEvidenceAvailable)
  const [detectedSections, setDetectedSections] = useState({
    experience: false,
    skills: false,
    education: false
  })
  const [usage, setUsage] = useState<ToolUsageResult | null>(null)
  const [isUsageLoading, setIsUsageLoading] = useState(true)
  const [isLocalhostDev, setIsLocalhostDev] = useState(false)

  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const plannerStageTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const previewLocked = searchParams.get('locked') === '1'
  const proPreview = searchParams.get('propreview') === '1'
  const usageQuery = useMemo(() => {
    const qp = new URLSearchParams()
    const plan = searchParams.get('plan')
    const uses = searchParams.get('uses')
    if (plan) qp.set('plan', plan)
    if (uses) qp.set('uses', uses)
    return qp.toString()
  }, [searchParams])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const host = window.location.hostname.trim().toLowerCase()
    setIsLocalhostDev(
      host === 'localhost' ||
        host === '127.0.0.1' ||
        host === '0.0.0.0' ||
        host === '::1' ||
        host === '[::1]'
    )
  }, [])

  useEffect(() => {
    let active = true

    const loadUsage = async () => {
      setIsUsageLoading(true)
      const nextUsage = await getUsage('career-switch-planner', usageQuery)
      if (active && nextUsage) {
        setUsage(nextUsage)
      }
      if (active) {
        setIsUsageLoading(false)
      }
    }

    void loadUsage()
    return () => {
      active = false
    }
  }, [getUsage, usageQuery])

  useEffect(() => {
    return () => {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current)
      }
      if (plannerStageTimerRef.current) {
        clearInterval(plannerStageTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (plannerStageTimerRef.current) {
      clearInterval(plannerStageTimerRef.current)
      plannerStageTimerRef.current = null
    }

    if (plannerState !== 'loading') {
      setLoadingStageIndex(0)
      return
    }

    setLoadingStageIndex(0)
    plannerStageTimerRef.current = setInterval(() => {
      setLoadingStageIndex((previous) =>
        previous >= PLANNER_LOADING_STAGES.length - 1 ? previous : previous + 1
      )
    }, 850)

    return () => {
      if (plannerStageTimerRef.current) {
        clearInterval(plannerStageTimerRef.current)
        plannerStageTimerRef.current = null
      }
    }
  }, [plannerState])

  useEffect(() => {
    if (plannerState !== 'results' || !plannerResult) return

    const frame = window.requestAnimationFrame(() => {
      scrollToSection('planner-report-anchor')
    })

    return () => {
      window.cancelAnimationFrame(frame)
    }
  }, [plannerResult, plannerState])

  const localUnsignedBypass = isLocalhostDev && !user
  const effectivePlan = localUnsignedBypass ? 'pro' : plan
  const hasPaidPlan = effectivePlan === 'pro' || effectivePlan === 'lifetime'
  const isProUser =
    proPreview || hasPaidPlan || usage?.plan === 'pro' || usage?.plan === 'lifetime'
  const canPersistPlannerLoop = Boolean(
    user && (hasPaidPlan || usage?.plan === 'pro' || usage?.plan === 'lifetime')
  )
  const isLocked =
    previewLocked ||
    (!localUnsignedBypass && !hasPaidPlan && (usage ? !usage.canUse : false))
  const hasMinimumRequiredInput =
    currentRoleText.trim().length > 0 || experienceText.trim().length > 0 || skills.length >= 3
  const roleAutocompleteRegion = toAutocompleteRegion()

  useEffect(() => {
    const nextProvince = getStoredProvince()
    setSelectedProvince(nextProvince)
    setWorkRegion(nextProvince)
    if (!locationTouched) {
      setLocationText(toProvinceLocation(nextProvince))
    }

    const handleProvinceChange = (event: Event) => {
      const next = (event as CustomEvent<string>).detail
      if (typeof next !== 'string') return
      const normalized = (next.trim().toUpperCase() || DEFAULT_PROVINCE) as ProvinceCode
      setSelectedProvince(normalized)
      setWorkRegion(normalized)
      if (!locationTouched) {
        setLocationText(toProvinceLocation(normalized))
      }
    }

    window.addEventListener('careerheap:province-changed', handleProvinceChange)
    return () => {
      window.removeEventListener('careerheap:province-changed', handleProvinceChange)
    }
  }, [locationTouched])

  useEffect(() => {
    if (!locationTouched) {
      setLocationText(toProvinceLocation(selectedProvince))
    }
  }, [locationTouched, selectedProvince, workRegion])

  useEffect(() => {
    const query = targetRoleText.trim()
    if (query.length < 2) {
      setTargetRoleAssistiveSuggestions([])
      return
    }

    const controller = new AbortController()
    const searchParams = new URLSearchParams({ q: query, limit: '8' })
    searchParams.set('region', roleAutocompleteRegion)

    void fetch(`/api/career-map/occupations?${searchParams.toString()}`, {
      cache: 'no-store',
      signal: controller.signal
    })
      .then(async (response) => {
        const data = (await response.json().catch(() => null)) as
          | {
              items?: Array<{
                title?: string
                confidence?: number
                matchedBy?: string
              }>
            }
          | null

        if (!response.ok || !Array.isArray(data?.items)) {
          setTargetRoleAssistiveSuggestions([])
          return
        }

        const targetKey = normalizeRoleSuggestionKey(query)
        const currentKey = normalizeRoleSuggestionKey(currentRoleText)
        const seen = new Set<string>()
        const nextSuggestions = data.items
          .map((item) => {
            const title = typeof item.title === 'string' ? item.title.trim() : ''
            const key = normalizeRoleSuggestionKey(title)
            if (!title || !key || key === targetKey || key === currentKey || seen.has(key)) {
              return null
            }
            seen.add(key)
            return {
              title,
              difficulty: roleSuggestionConfidenceToDifficulty(item.confidence),
              transitionTime: roleSuggestionConfidenceToTimeline(item.confidence),
              why: [
                `Close to "${query}" based on ${toReadableMatchReason(item.matchedBy)} matching.`
              ]
            }
          })
          .filter((item): item is NonNullable<typeof item> => Boolean(item))
          .slice(0, 6)

        setTargetRoleAssistiveSuggestions(nextSuggestions)
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setTargetRoleAssistiveSuggestions([])
      })

    return () => {
      controller.abort()
    }
  }, [targetRoleText, currentRoleText, roleAutocompleteRegion])

  useEffect(() => {
    if (!isProUser) {
      setOcrCapabilityStatus('idle')
      setOcrCapabilities(null)
      return
    }
    if (ocrCapabilities) {
      setOcrCapabilityStatus('ready')
      return
    }

    let active = true
    const controller = new AbortController()
    const capabilityTimeout = setTimeout(() => {
      controller.abort()
    }, 6_000)
    setOcrCapabilityStatus('loading')

    void fetch('/api/resume/capabilities', { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        clearTimeout(capabilityTimeout)
        const data = (await response.json().catch(() => null)) as
          | { ok?: boolean; ocr?: ResumeOcrCapabilities }
          | null

        if (!active) return

        if (!response.ok || !data?.ok || !data.ocr) {
          setOcrCapabilities(null)
          setOcrCapabilityStatus('error')
          return
        }

        setOcrCapabilities(data.ocr)
        setOcrCapabilityStatus('ready')
      })
      .catch(() => {
        clearTimeout(capabilityTimeout)
        if (!active) return
        setOcrCapabilities(null)
        setOcrCapabilityStatus('error')
      })

    return () => {
      active = false
      clearTimeout(capabilityTimeout)
      controller.abort()
    }
  }, [isProUser, ocrCapabilities])

  const ocrBadge = useMemo(() => {
    if (!isProUser) {
      return {
        label: 'Pro required',
        variant: 'default' as const,
        detail: 'Resume upload and OCR checks are available on Pro and Lifetime plans.'
      }
    }

    if (ocrCapabilityStatus === 'loading') {
      return {
        label: 'Checking OCR...',
        variant: 'default' as const,
        detail: ''
      }
    }

    if (ocrCapabilityStatus === 'idle') {
      return {
        label: 'OCR status pending',
        variant: 'default' as const,
        detail: ''
      }
    }

    if (ocrCapabilityStatus === 'error' || !ocrCapabilities) {
      return {
        label: 'OCR status unavailable',
        variant: 'warning' as const,
        detail: 'OCR service unavailable - try again.'
      }
    }

    if (ocrCapabilities.mode === 'native') {
      return {
        label: 'OCR enabled',
        variant: 'success' as const,
        detail: `Scanned PDF support is active (up to ${ocrCapabilities.maxPages} pages).`
      }
    }

    if (ocrCapabilities.mode === 'fallback') {
      return {
        label: 'OCR enabled',
        variant: 'success' as const,
        detail:
          'Scanned PDF support is active. Processing may take a little longer on some files.'
      }
    }

    return {
      label: 'OCR limited',
      variant: 'warning' as const,
      detail: 'Scanned PDF extraction may fail. DOCX and text-based PDFs still work.'
    }
  }, [isProUser, ocrCapabilities, ocrCapabilityStatus])

  const parseFile = async (file: File | null) => {
    if (!file) {
      return
    }

    const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
    if (!ACCEPTED_EXTENSIONS.includes(extension)) {
      setUploadState('error')
      setUploadError('Please upload a PDF or DOCX file.')
      setUploadWarning('')
      setUploadStats(null)
      return
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setUploadState('error')
      setUploadError('File too large. Maximum size is 10MB.')
      setUploadWarning('')
      setUploadStats(null)
      return
    }

    setUploadError('')
    setUploadWarning('')
    setUploadStats(null)
    setUploadState('parsing')
    setUploadProgress(12)

    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current)
    }

    progressTimerRef.current = setInterval(() => {
      setUploadProgress((prev) => (prev >= 88 ? prev : prev + 7))
    }, 180)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('regionHint', roleAutocompleteRegion)
      const authHeaders = await getSupabaseAuthHeaders()
      const headers =
        typeof authHeaders.Authorization === 'string'
          ? { Authorization: authHeaders.Authorization }
          : undefined

      const response = await fetch('/api/resume/parse', {
        method: 'POST',
        headers,
        body: formData
      })

      const data = (await response.json()) as {
        ok?: boolean
        source?: 'docx' | 'pdf' | 'pdf-ocr'
        error?: string
        text?: string
        detected?: { experience: boolean; skills: boolean; education: boolean }
        structured?: {
          skills?: string[]
          certifications?: string[]
          soft_skills?: string[]
          experience_highlights?: string[]
          classificationSource?: 'heuristic' | 'gpt'
          jobTitles?: Array<{
            raw?: string
            occupationId?: string | null
            occupationTitle?: string | null
            confidence?: number
          }>
        }
        message?: string
        warning?: string | null
        stats?: { meaningfulChars?: number }
      }

      if (!response.ok || !data.ok || !data.text || !data.detected) {
        throw new Error(
          data.message || 'Unable to parse this file. Try a DOCX file or paste your experience.'
        )
      }

      setUploadProgress(100)
      setExperienceText(data.text)
      setDetectedSections(data.detected)
      const detectedCertifications = Array.isArray(data.structured?.certifications)
        ? data.structured.certifications
            .map((certification) => (typeof certification === 'string' ? certification.trim() : ''))
            .filter(Boolean)
            .slice(0, 8)
        : []
      const detectedSkills = Array.isArray(data.structured?.skills)
        ? data.structured.skills
            .map((item) => (typeof item === 'string' ? item.trim() : ''))
            .filter(Boolean)
            .slice(0, 12)
        : []
      setPendingResumeSkills(detectedSkills)
      setPendingResumeCertifications(detectedCertifications)
      if (Array.isArray(data.structured?.jobTitles)) {
        const topTitle = data.structured.jobTitles
          .map((title) => {
            const confidence = Number(title?.confidence ?? 0)
            const normalized = typeof title?.occupationTitle === 'string'
              ? title.occupationTitle.trim()
              : typeof title?.raw === 'string'
                ? title.raw.trim()
                : ''
            return { title: normalized, confidence }
          })
          .filter((item) => item.title.length > 0)
          .sort((a, b) => b.confidence - a.confidence)[0]
        setPendingResumeRoleCandidate(topTitle && topTitle.confidence >= 0.25 ? topTitle.title : null)
      } else {
        setPendingResumeRoleCandidate(null)
      }
      setUploadWarning(
        data.warning ??
          (data.source === 'pdf-ocr'
            ? 'Scanned PDF detected - OCR used (may take a few seconds).'
            : data.structured?.classificationSource === 'gpt'
              ? 'GPT sorted your resume into skills, certifications, and experience highlights. Review before applying.'
              : 'Review and apply detected skills/certifications before generating your plan.')
      )
      setUploadStats(
        typeof data.stats?.meaningfulChars === 'number'
          ? { meaningfulChars: data.stats.meaningfulChars }
          : null
      )
      setUploadState('success')
      setResumeReviewExpanded(false)
    } catch (error) {
      setUploadState('error')
      setUploadWarning('')
      setUploadStats(null)
      setUploadError(
        error instanceof Error
          ? error.message
          : 'This PDF looks scanned or protected. Upload a DOCX or paste your experience.'
      )
    } finally {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current)
      }
    }
  }

  const applyDetectedResumeData = () => {
    setSkills((previous) => mergeUniqueCaseInsensitive(previous, pendingResumeSkills))
    setResumeStructuredSnapshot((previous) => ({
      certifications: mergeUniqueCaseInsensitive(previous.certifications, pendingResumeCertifications)
    }))
    if (!currentRoleText.trim() && pendingResumeRoleCandidate) {
      setCurrentRoleText(pendingResumeRoleCandidate)
      setCurrentRoleSelectedMatch(null)
    }
    setPendingResumeSkills([])
    setPendingResumeCertifications([])
    setPendingResumeRoleCandidate(null)
    setResumeReviewExpanded(false)
  }

  const dismissDetectedResumeData = () => {
    setPendingResumeSkills([])
    setPendingResumeCertifications([])
    setPendingResumeRoleCandidate(null)
    setResumeReviewExpanded(false)
  }

  const handleCurrentRoleInputChange = (value: string) => {
    setCurrentRoleText(value)
    setRoleSelectionPrompt((previous) => (previous?.role === 'current' ? null : previous))
    if (currentRoleSelectedMatch && value.trim() !== currentRoleSelectedMatch.title) {
      setCurrentRoleSelectedMatch(null)
    }
  }

  const handleTargetRoleInputChange = (value: string) => {
    setTargetRoleText(value)
    setRoleSelectionPrompt((previous) => (previous?.role === 'target' ? null : previous))
    if (targetRoleSelectedMatch && value.trim() !== targetRoleSelectedMatch.title) {
      setTargetRoleSelectedMatch(null)
    }
  }

  const advanceWizardAfterRoleSelection = (nextCurrentRole: string, nextTargetRole: string) => {
    if (nextCurrentRole.trim() && nextTargetRole.trim()) {
      setActiveWizardStep(1)
      setInputError('')
    }
  }

  const handlePrintReport = () => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        window.print()
      })
    })
  }

  const handleExportPlan = () => {
    if (typeof window === 'undefined' || !plannerReport) return

    const exportPayload = {
      reportId: savedPlannerReportId,
      generatedAt: lastGeneratedAt,
      currentRole: heroCurrentRoleLabel,
      targetRole: heroTargetRoleLabel,
      locationText,
      timelineBucket,
      plannerResult,
      plannerReport,
      progress: plannerLoopProgressState
        ? {
            ...plannerLoopProgressState,
            outreachTracker
          }
        : null
    }

    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
      type: 'application/json;charset=utf-8'
    })
    const url = window.URL.createObjectURL(blob)
    const link = window.document.createElement('a')
    const safeCurrentRole = heroCurrentRoleLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    const safeTargetRole = heroTargetRoleLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    link.href = url
    link.download = `career-switch-plan-${safeCurrentRole}-to-${safeTargetRole}.json`
    window.document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  }

  const handleGeneratePlan = async (override?: Partial<PlannerFormDraft>) => {
    const draft: PlannerFormDraft = {
      currentRoleText,
      targetRoleText,
      currentRoleOccupationId: currentRoleSelectedMatch?.occupationId ?? null,
      targetRoleOccupationId: targetRoleSelectedMatch?.occupationId ?? null,
      recommendMode,
      skills,
      experienceText,
      userPostingText,
      useMarketEvidence,
      educationLevel,
      workRegion,
      locationText,
      timelineBucket,
      incomeTarget,
      ...override
    }
    const draftSignature = buildPlannerDraftSignature(
      draft,
      resumeStructuredSnapshot.certifications
    )
    const hasDraftMinimumInput =
      draft.currentRoleText.trim().length > 0 ||
      draft.experienceText.trim().length > 0 ||
      draft.skills.length >= 3

    if (isLocked || isUsageLoading) {
      return
    }

    if (!hasDraftMinimumInput) {
      setActiveWizardStep(1)
      setInputError('Add a current role, an experience summary, or at least 3 skills to continue.')
      return
    }

    if (!draft.recommendMode && !draft.targetRoleText.trim()) {
      setActiveWizardStep(0)
      setInputError('Add your target role or pick a suggestion below.')
      return
    }

    if (!draft.locationText.trim()) {
      setActiveWizardStep(2)
      setInputError('Select a province to generate market evidence.')
      return
    }

    setInputError('')
    setPlannerReport(null)
    setPlannerState('loading')

    try {
      const authHeaders = await getSupabaseAuthHeaders()
      const requestHeaders: Record<string, string> = {
        'Content-Type': 'application/json'
      }
      if (typeof authHeaders.Authorization === 'string') {
        requestHeaders.Authorization = authHeaders.Authorization
      }

      const normalizedProfile = extractProfileSignals({
        experienceText: draft.experienceText.trim(),
        explicitSkills: draft.skills,
        explicitCertifications: resumeStructuredSnapshot.certifications
      })
      const normalizedExperience = [
        ...normalizedProfile.rawLines.filter(
          (line) => !/^skills:/i.test(line) && !/^certifications:/i.test(line)
        ),
        normalizedProfile.skills.length > 0
          ? `Skills: ${normalizedProfile.skills.join(', ')}`
          : '',
        normalizedProfile.certifications.length > 0
          ? `Certifications: ${normalizedProfile.certifications.join(', ')}`
          : ''
      ]
        .filter(Boolean)
        .join('\n')
      const confirmedSkills = mergeUniqueCaseInsensitive(
        normalizedProfile.skills,
        normalizedProfile.certifications
      )
      const currentRoleFallback =
        draft.currentRoleText.trim() || (confirmedSkills.length > 0 ? `${confirmedSkills[0]} specialist` : 'Career transition')
      const targetRoleValue = draft.recommendMode ? '' : draft.targetRoleText.trim()

      const response = await fetch('/api/tools/career-switch-planner', {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify({
          currentRoleText: draft.currentRoleText.trim(),
          targetRoleText: draft.recommendMode ? null : targetRoleValue,
          currentRoleOccupationId: draft.currentRoleOccupationId,
          targetRoleOccupationId:
            draft.recommendMode ? null : draft.targetRoleOccupationId,
          recommendMode: draft.recommendMode,
          skills: confirmedSkills,
          experienceText: normalizedExperience,
          userPostingText: draft.userPostingText.trim(),
          useMarketEvidence: draft.useMarketEvidence,
          educationLevel: draft.educationLevel,
          workRegion: draft.workRegion,
          locationText: draft.locationText.trim(),
          timelineBucket: draft.timelineBucket,
          incomeTarget: draft.incomeTarget,
          currentRole: currentRoleFallback,
          targetRole: targetRoleValue,
          notSureMode: draft.recommendMode,
          location: draft.locationText.trim(),
          timeline: draft.timelineBucket,
          education: draft.educationLevel
        })
      })

      const data = (await response.json().catch(() => null)) as
        | {
            score?: number
            explanation?: string
            transferableSkills?: string[]
            skillGaps?: CareerSwitchPlannerResult['skillGaps']
            roadmap?: CareerSwitchPlannerResult['roadmap']
            resumeReframes?: CareerSwitchPlannerResult['resumeReframes']
            recommendedRoles?: CareerSwitchPlannerResult['recommendedRoles']
            report?: PlannerReportPayload
            reportId?: string | null
            usage?: ToolUsageResult
            previewLimited?: boolean
            error?: string
            role?: 'current' | 'target'
            input?: string
            alternatives?: Array<{
              occupationId?: string
              title?: string
              confidence?: number
              source?: string | null
              stage?: 'helper' | 'apprentice' | 'licensed' | null
            }>
            message?: string
          }
        | null

      if (response.status === 402 && data?.error === 'LOCKED') {
        if (data.usage) {
          setUsage(data.usage)
        }
        setPlannerState('idle')
        return
      }

      if (
        response.status === 409 &&
        data?.error === 'ROLE_SELECTION_REQUIRED' &&
        (data.role === 'current' || data.role === 'target') &&
        Array.isArray(data.alternatives)
      ) {
        const alternatives = data.alternatives
          .map((item) => {
            const candidate = item as Record<string, unknown>
            return {
              occupationId: typeof candidate.occupationId === 'string' ? candidate.occupationId : '',
              title: typeof candidate.title === 'string' ? candidate.title.trim() : '',
              code: typeof candidate.code === 'string' ? candidate.code : '',
              confidence: typeof candidate.confidence === 'number' ? candidate.confidence : 0,
              source: typeof candidate.source === 'string' ? candidate.source : null,
              stage: typeof candidate.stage === 'string' ? candidate.stage : null,
              specialization:
                typeof candidate.specialization === 'string' ? candidate.specialization : null
            }
          })
          .filter((item) => item.occupationId && item.title)

        if (alternatives.length > 0) {
          setRoleSelectionPrompt({
            role: data.role,
            input: typeof data.input === 'string' ? data.input : '',
            message: typeof data.message === 'string' ? data.message : undefined,
            alternatives
          })
          setActiveWizardStep(0)
          setInputError(data.message || 'Choose the closest role match before continuing.')
        } else {
          setActiveWizardStep(0)
          setInputError(data.message || 'Choose the closest role match before continuing.')
        }
        setPlannerState('idle')
        return
      }

      const plannerResultPayload =
        data &&
        typeof data.score === 'number' &&
        typeof data.explanation === 'string' &&
        Array.isArray(data.transferableSkills) &&
        Array.isArray(data.skillGaps) &&
        data.roadmap &&
        Array.isArray(data.resumeReframes) &&
        Array.isArray(data.recommendedRoles)
          ? ({
              score: data.score,
              explanation: data.explanation,
              transferableSkills: data.transferableSkills,
              skillGaps: data.skillGaps,
              roadmap: data.roadmap,
              resumeReframes: data.resumeReframes,
              recommendedRoles: data.recommendedRoles
            } as CareerSwitchPlannerResult)
          : null

      if (!response.ok || !plannerResultPayload) {
        throw new Error(data?.message || 'Unable to generate a plan right now.')
      }

      setPlannerResult(toPlannerResultView(plannerResultPayload))
      setPlannerReport(data?.report ?? null)
      setSavedPlannerReportId(typeof data?.reportId === 'string' ? data.reportId : null)
      setPlannerServerProgressState(null)
      setPlannerLoopProgressState(null)
      setIsGuestPreview(Boolean(data?.previewLimited || data?.report?.previewLimited || (!user && !localUnsignedBypass)))
      setRoleSelectionPrompt(null)
      const resolvedCurrentRole =
        data?.report?.roleResolution?.current?.matched?.rawInputTitle?.trim() ||
        draft.currentRoleText.trim() ||
        data?.report?.roleResolution?.current?.matched?.title ||
        currentRoleFallback
      const resolvedTargetRole = draft.recommendMode
        ? ''
        : data?.report?.roleResolution?.target?.matched?.rawInputTitle?.trim() ||
          targetRoleValue ||
          data?.report?.roleResolution?.target?.matched?.title ||
          ''
      setLastSubmittedSnapshot({
        currentRole: resolvedCurrentRole,
        targetRole: resolvedTargetRole,
        currentRoleInput: draft.currentRoleText.trim() || currentRoleFallback,
        targetRoleInput: targetRoleValue,
        recommendMode: draft.recommendMode,
        timelineBucket: draft.timelineBucket
      })
      setLastSubmittedDraftSignature(draftSignature)
      setPlannerState('results')
      setLastGeneratedAt(new Date().toISOString())
      setViewMode('dashboard')
      setIsEditDrawerOpen(false)
      if (data?.usage) {
        setUsage(data.usage)
      }
    } catch (error) {
      setInputError(
        error instanceof Error ? error.message : 'Unable to generate a plan right now.'
      )
      setPlannerState('idle')
    }
  }

  const handleStartNewPlan = () => {
    setCurrentRoleText('')
    setTargetRoleText('')
    setCurrentRoleSelectedMatch(null)
    setTargetRoleSelectedMatch(null)
    setShowSuggestedTargets(true)
    setSkills([])
    setExperienceText('')
    setUserPostingText('')
    setInputError('')
    setPlannerResult(null)
    setPlannerReport(null)
    setSavedPlannerReportId(null)
    setPlannerServerProgressState(null)
    setPlannerServerProgressHydrated(false)
    setPlannerLoopProgressState(null)
    setIsGuestPreview(false)
    setPlannerState('idle')
    setViewMode('intake')
    setIsEditDrawerOpen(false)
    setLastGeneratedAt(null)
    setActiveWizardStep(0)
    setResumeToolkitDraft('')
    setCallToolkitDraft('')
    setEmailToolkitDraft('')
    setOutreachTracker({
      sent: '',
      replies: '',
      positiveReplies: '',
      nextFollowUpDate: ''
    })
    setRoleSelectionPrompt(null)
    setLastSubmittedSnapshot(null)
    setLastSubmittedDraftSignature(null)
    setResumeStructuredSnapshot({ certifications: [] })
    setPendingResumeSkills([])
    setPendingResumeCertifications([])
    setPendingResumeRoleCandidate(null)
    setResumeReviewExpanded(false)
    setUploadState('idle')
    setUploadProgress(0)
    setUploadError('')
    setUploadWarning('')
    setUploadStats(null)
    setDetectedSections({
      experience: false,
      skills: false,
      education: false
    })
  }

  const handlePlanRecommendedRole = async (
    nextTargetRole: string,
    options?: { autoGenerate?: boolean; nextStep?: WizardStep }
  ) => {
    const shouldAutoGenerate = options?.autoGenerate ?? true

    setShowSuggestedTargets(false)
    setTargetRoleText(nextTargetRole)
    setTargetRoleSelectedMatch(null)
    setRoleSelectionPrompt(null)
    setInputError('')

    if (typeof options?.nextStep === 'number') {
      setActiveWizardStep(options.nextStep)
    } else if (!shouldAutoGenerate) {
      advanceWizardAfterRoleSelection(currentRoleText, nextTargetRole)
    }

    if (!shouldAutoGenerate) {
      return
    }

    await handleGeneratePlan({
      recommendMode: false,
      targetRoleText: nextTargetRole,
      targetRoleOccupationId: null
    })
  }

  const handleResolveRoleSelection = (selection: {
    role: 'current' | 'target'
    occupationId: string
    title: string
    confidence: number
    stage?: string | null
    specialization?: string | null
  }) => {
    const override =
      selection.role === 'current'
        ? {
            currentRoleText: selection.title,
            currentRoleOccupationId: selection.occupationId
          }
        : {
            targetRoleText: selection.title,
            targetRoleOccupationId: selection.occupationId
          }
    if (selection.role === 'current') {
      setCurrentRoleText(selection.title)
      setCurrentRoleSelectedMatch({
        occupationId: selection.occupationId,
        title: selection.title,
        confidence: selection.confidence,
        matchedBy: 'manual_selection'
      })
    } else {
      setTargetRoleText(selection.title)
      setTargetRoleSelectedMatch({
        occupationId: selection.occupationId,
        title: selection.title,
        confidence: selection.confidence,
        matchedBy: 'manual_selection'
      })
    }
    setRoleSelectionPrompt(null)
    setInputError('')
    setActiveWizardStep(0)
    void handleGeneratePlan({
      ...override,
      recommendMode: false
    })
  }

  const transitionModeReport = plannerReport?.transitionMode ?? null
  const transitionPlanScripts = plannerReport?.transitionPlanScripts ?? null
  const currentRoleResolution = plannerReport?.roleResolution?.current ?? null
  const targetRoleResolution = plannerReport?.roleResolution?.target ?? null
  const heroCurrentRoleLabel =
    lastSubmittedSnapshot?.currentRoleInput?.trim() ||
    currentRoleResolution?.matched?.rawInputTitle?.trim() ||
    lastSubmittedSnapshot?.currentRole?.trim() ||
    currentRoleText.trim() ||
    'Current role'
  const heroTargetRoleLabel =
    lastSubmittedSnapshot?.targetRoleInput?.trim() ||
    targetRoleResolution?.matched?.rawInputTitle?.trim() ||
    lastSubmittedSnapshot?.targetRole?.trim() ||
    targetRoleText.trim() ||
    'Target role'
  const transitionQuickWins = transitionModeReport
    ? sharedDedupeBullets(
        transitionModeReport.gaps.strengths.filter((item) => !isPersonalIdentifier(item)),
        4
      )
    : []
  const currentProfileSignals = extractProfileSignals({
    experienceText,
    explicitSkills: skills,
    explicitCertifications: resumeStructuredSnapshot.certifications
  })
  const resumeTalkingPointSkills = normalizeRoadmapBullets([
    ...(plannerReport?.transitionReport?.marketSnapshot.topRequirements ?? []).map((item) => item.label),
    ...(plannerReport?.transitionSections?.coreHardSkills ?? []).map((item) => item.label)
  ], 3)
  const outreachResumeBullets = buildResumeTalkingPoints({
    targetRole:
      targetRoleText.trim() ||
      lastSubmittedSnapshot?.targetRoleInput ||
      plannerReport?.transitionReport?.marketSnapshot.role ||
      '',
    certifications: currentProfileSignals.certifications,
    quickWins: transitionQuickWins,
    firstSteps: transitionModeReport?.gaps.first3Steps ?? [],
    commonSkills: resumeTalkingPointSkills
  })
  const canGoBackWizard = activeWizardStep > 0
  const canGoNextWizard = activeWizardStep < WIZARD_STEPS.length - 1
  const assistiveSuggestedTargetSections = buildRecommendedRoleSections(
    plannerReport?.suggestedCareers ?? [],
    currentRoleText.trim() || lastSubmittedSnapshot?.currentRoleInput || '',
    currentRoleResolution?.matched?.occupationId ?? currentRoleSelectedMatch?.occupationId ?? null,
    targetRoleText.trim() || lastSubmittedSnapshot?.targetRoleInput || '',
    targetRoleResolution?.matched?.occupationId ?? targetRoleSelectedMatch?.occupationId ?? null,
    currentRoleResolution?.suggestions.map((item) => ({ title: item.title, code: item.code })) ?? []
  )
  const closestSuggestedTargetPool =
    assistiveSuggestedTargetSections.find((section) => section.title === 'Closest matches')?.roles ?? []
  const assistiveSuggestedTargetPool =
    targetRoleAssistiveSuggestions.length > 0
      ? targetRoleAssistiveSuggestions
      : closestSuggestedTargetPool.length > 0
        ? closestSuggestedTargetPool
        : assistiveSuggestedTargetSections.flatMap((section) => section.roles)
  const assistiveSuggestedTargets =
    assistiveSuggestedTargetPool.length <= 2
      ? assistiveSuggestedTargetPool
      : [
          ...assistiveSuggestedTargetPool.slice(
            suggestedTargetShuffle % assistiveSuggestedTargetPool.length
          ),
          ...assistiveSuggestedTargetPool.slice(
            0,
            suggestedTargetShuffle % assistiveSuggestedTargetPool.length
          )
        ].slice(0, 2)
  const currentDraftSignature = buildPlannerDraftSignature(
    {
      currentRoleText,
      targetRoleText,
      currentRoleOccupationId: currentRoleSelectedMatch?.occupationId ?? null,
      targetRoleOccupationId: targetRoleSelectedMatch?.occupationId ?? null,
      recommendMode,
      skills,
      experienceText,
      userPostingText,
      useMarketEvidence,
      educationLevel,
      workRegion,
      locationText,
      timelineBucket,
      incomeTarget
    },
    resumeStructuredSnapshot.certifications
  )
  const hasPlannerResults = plannerState === 'results' && Boolean(plannerResult)
  const hasDraftChanges =
    hasPlannerResults &&
    Boolean(lastSubmittedDraftSignature) &&
    currentDraftSignature !== lastSubmittedDraftSignature
  const hasAnyDraftInput = Boolean(
    currentRoleText.trim() ||
      targetRoleText.trim() ||
      skills.length > 0 ||
      experienceText.trim() ||
      userPostingText.trim() ||
      pendingResumeSkills.length > 0 ||
      pendingResumeCertifications.length > 0 ||
      pendingResumeRoleCandidate
  )
  const hasPendingResumeReview = Boolean(
    pendingResumeSkills.length > 0 || pendingResumeCertifications.length > 0 || pendingResumeRoleCandidate
  )
  const generateButtonLabel = user || localUnsignedBypass
    ? hasDraftChanges
      ? 'Generate Updated Plan'
      : hasPlannerResults
        ? 'Generate Again'
        : 'Generate My Data-Backed Plan'
    : hasPlannerResults
      ? 'Regenerate Preview'
      : 'Generate Preview'
  const v3DashboardModel = useMemo(
    () =>
      buildPlannerDashboardV3Model({
        report: plannerReport,
        plannerResult,
        currentRole: heroCurrentRoleLabel,
        targetRole: heroTargetRoleLabel,
        locationText,
        timelineBucket,
        skillsCount: skills.length,
        lastGeneratedAt
      }),
    [
      plannerReport,
      plannerResult,
      heroCurrentRoleLabel,
      heroTargetRoleLabel,
      locationText,
      timelineBucket,
      skills.length,
      lastGeneratedAt
    ]
  )
  const plannerLoopStorageKey = useMemo(() => {
    if (!hasPlannerResults || !canPersistPlannerLoop || !user?.id) return null
    const signature = lastSubmittedDraftSignature || currentDraftSignature || 'draft'
    const generated = lastGeneratedAt || 'latest'
    return `career-switch-planner-v3-progress:${user.id}:${signature}:${generated}`
  }, [
    canPersistPlannerLoop,
    currentDraftSignature,
    hasPlannerResults,
    lastGeneratedAt,
    lastSubmittedDraftSignature,
    user?.id
  ])
  useEffect(() => {
    let cancelled = false

    async function hydrateServerProgress() {
      if (!canPersistPlannerLoop || !savedPlannerReportId) {
        setPlannerServerProgressState(null)
        setPlannerServerProgressHydrated(true)
        return
      }

      setPlannerServerProgressHydrated(false)
      try {
        const authHeaders = await getSupabaseAuthHeaders()
        const response = await fetch(
          `/api/tools/career-switch-planner/progress?reportId=${encodeURIComponent(savedPlannerReportId)}`,
          {
            method: 'GET',
            cache: 'no-store',
            headers: authHeaders
          }
        )
        const data = (await response.json().catch(() => null)) as
          | { progress?: PlannerLoopProgressState | null }
          | null

        if (cancelled) return
        const nextProgress = data?.progress && typeof data.progress === 'object' ? data.progress : null
        setPlannerServerProgressState(nextProgress)
        setPlannerLoopProgressState(
          nextProgress
            ? {
                checkedTaskIds: nextProgress.checkedTaskIds ?? {},
                expandedPhaseIds: nextProgress.expandedPhaseIds ?? [],
                completedTrainingIds: nextProgress.completedTrainingIds ?? {},
                updatedAt: nextProgress.updatedAt ?? new Date().toISOString()
              }
            : null
        )
        if (nextProgress?.outreachTracker) {
          setOutreachTracker({
            sent: nextProgress.outreachTracker.sent ?? '',
            replies: nextProgress.outreachTracker.replies ?? '',
            positiveReplies: nextProgress.outreachTracker.positiveReplies ?? '',
            nextFollowUpDate: nextProgress.outreachTracker.nextFollowUpDate ?? ''
          })
        }
      } catch {
        if (!cancelled) {
          setPlannerServerProgressState(null)
        }
      } finally {
        if (!cancelled) {
          setPlannerServerProgressHydrated(true)
        }
      }
    }

    void hydrateServerProgress()
    return () => {
      cancelled = true
    }
  }, [canPersistPlannerLoop, savedPlannerReportId])
  useEffect(() => {
    if (v3DashboardModel.missingFields.length === 0) return
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[career-switch-planner] missing_v3_fields', v3DashboardModel.missingFields)
    }
  }, [v3DashboardModel.missingFields])
  const generatedResumeToolkitText = outreachResumeBullets.map((item) => `- ${item}`).join('\n')
  const generatedCallToolkitText =
    transitionPlanScripts?.call ?? transitionModeReport?.execution.outreachTemplates.call ?? ''
  const generatedEmailToolkitText =
    transitionPlanScripts?.email ?? transitionModeReport?.execution.outreachTemplates.email ?? ''

  useEffect(() => {
    setResumeToolkitDraft(generatedResumeToolkitText)
    setCallToolkitDraft(generatedCallToolkitText)
    setEmailToolkitDraft(generatedEmailToolkitText)
  }, [generatedResumeToolkitText, generatedCallToolkitText, generatedEmailToolkitText])

  useEffect(() => {
    if (!canPersistPlannerLoop || !plannerLoopStorageKey || typeof window === 'undefined') {
      setOutreachTracker({
        sent: '',
        replies: '',
        positiveReplies: '',
        nextFollowUpDate: ''
      })
      return
    }

    if (plannerServerProgressState?.outreachTracker) {
      setOutreachTracker({
        sent: plannerServerProgressState.outreachTracker.sent ?? '',
        replies: plannerServerProgressState.outreachTracker.replies ?? '',
        positiveReplies: plannerServerProgressState.outreachTracker.positiveReplies ?? '',
        nextFollowUpDate: plannerServerProgressState.outreachTracker.nextFollowUpDate ?? ''
      })
      return
    }

    try {
      const raw = window.localStorage.getItem(`${plannerLoopStorageKey}:outreach`)
      if (!raw) {
        setOutreachTracker({
          sent: '',
          replies: '',
          positiveReplies: '',
          nextFollowUpDate: ''
        })
        return
      }

      const parsed = JSON.parse(raw) as Partial<typeof outreachTracker>
      setOutreachTracker({
        sent: typeof parsed.sent === 'string' ? parsed.sent : '',
        replies: typeof parsed.replies === 'string' ? parsed.replies : '',
        positiveReplies: typeof parsed.positiveReplies === 'string' ? parsed.positiveReplies : '',
        nextFollowUpDate: typeof parsed.nextFollowUpDate === 'string' ? parsed.nextFollowUpDate : ''
      })
    } catch {
      setOutreachTracker({
        sent: '',
        replies: '',
        positiveReplies: '',
        nextFollowUpDate: ''
      })
    }
  }, [canPersistPlannerLoop, plannerLoopStorageKey, plannerServerProgressState])

  useEffect(() => {
    if (!canPersistPlannerLoop || !plannerLoopStorageKey || typeof window === 'undefined') return
    try {
      window.localStorage.setItem(`${plannerLoopStorageKey}:outreach`, JSON.stringify(outreachTracker))
    } catch {
      // ignore storage failures
    }
  }, [canPersistPlannerLoop, outreachTracker, plannerLoopStorageKey])

  const handleOutreachTrackerChange = useCallback(
    (key: 'sent' | 'replies' | 'positiveReplies' | 'nextFollowUpDate', value: string) => {
      setOutreachTracker((previous) => ({
        ...previous,
        [key]: key === 'nextFollowUpDate' ? value : value.replace(/[^\d]/g, '')
      }))
    },
    []
  )

  useEffect(() => {
    if (!canPersistPlannerLoop || !savedPlannerReportId || !plannerServerProgressHydrated || !plannerLoopProgressState) {
      return
    }

    const timeout = window.setTimeout(async () => {
      try {
        const authHeaders = await getSupabaseAuthHeaders()
        await fetch('/api/tools/career-switch-planner/progress', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders
          },
          body: JSON.stringify({
            reportId: savedPlannerReportId,
            progress: {
              ...plannerLoopProgressState,
              outreachTracker
            }
          })
        })
      } catch {
        // ignore autosave failures
      }
    }, 600)

    return () => {
      window.clearTimeout(timeout)
    }
  }, [
    canPersistPlannerLoop,
    outreachTracker,
    plannerLoopProgressState,
    plannerServerProgressHydrated,
    savedPlannerReportId
  ])

  const handleSavePlanSnapshot = async () => {
    if (typeof window === 'undefined') return

    setSavePlanState('saving')
    try {
      const savedPlanEntry = {
        reportId: savedPlannerReportId,
        generatedAt: lastGeneratedAt,
        currentRole: heroCurrentRoleLabel,
        targetRole: heroTargetRoleLabel,
        locationText,
        timelineBucket,
        savedAt: new Date().toISOString(),
        previewLimited: isGuestPreview,
        plan: effectivePlan,
        progress: plannerLoopProgressState
          ? {
              ...plannerLoopProgressState,
              outreachTracker
            }
          : {
              checkedTaskIds: {},
              expandedPhaseIds: [],
              completedTrainingIds: {},
              outreachTracker,
              updatedAt: new Date().toISOString()
            },
        report:
          user && savedPlannerReportId
            ? null
            : {
                plannerResult,
                plannerReport
              }
      }

      window.localStorage.setItem(
        'career-switch-planner-v3-last-plan',
        JSON.stringify(savedPlanEntry)
      )

      const existingRaw = window.localStorage.getItem('career-switch-planner-v3-saved-plans')
      const existing = existingRaw ? (JSON.parse(existingRaw) as Array<Record<string, unknown>>) : []
      const saveKey = savedPlannerReportId || `${heroCurrentRoleLabel}:${heroTargetRoleLabel}:${lastGeneratedAt || 'latest'}`
      const filtered = existing.filter((item) => String(item.key ?? '') !== saveKey)
      filtered.unshift({
        key: saveKey,
        ...savedPlanEntry
      })
      window.localStorage.setItem(
        'career-switch-planner-v3-saved-plans',
        JSON.stringify(filtered.slice(0, 12))
      )

      if (canPersistPlannerLoop && plannerServerProgressHydrated && savedPlannerReportId) {
        const authHeaders = await getSupabaseAuthHeaders()
        const response = await fetch('/api/tools/career-switch-planner/progress', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders
          },
          body: JSON.stringify({
            reportId: savedPlannerReportId,
            progress: {
              ...(plannerLoopProgressState ?? {
                checkedTaskIds: {},
                expandedPhaseIds: [],
                completedTrainingIds: {},
                updatedAt: new Date().toISOString()
              }),
              outreachTracker
            }
          })
        })
        if (!response.ok) {
          throw new Error('Server progress save failed')
        }
      }

      setSavePlanState('saved')
      window.setTimeout(() => {
        setSavePlanState((previous) => (previous === 'saved' ? 'idle' : previous))
      }, 2000)
    } catch {
      setSavePlanState('error')
      window.setTimeout(() => {
        setSavePlanState((previous) => (previous === 'error' ? 'idle' : previous))
      }, 2500)
    }
  }

  const intakeWizardProps = {
    activeWizardStep,
    wizardSteps: WIZARD_STEPS,
    roleAutocompleteRegion,
    currentRoleText,
    targetRoleText,
    showSuggestedTargets,
    assistiveSuggestedTargets,
    suggestedSkillSuggestions: FALLBACK_SKILL_SUGGESTIONS,
    skills,
    experienceText,
    educationLevel,
    workRegion,
    timelineBucket,
    incomeTarget,
    locationText,
    userPostingText,
    useMarketEvidence,
    marketEvidenceAvailable,
    isProUser,
    ocrBadge: {
      variant: ocrBadge.variant,
      label: ocrBadge.label,
      detail: ocrBadge.detail
    },
    uploadState,
    uploadProgress,
    uploadWarning,
    uploadError,
    uploadStats,
    detectedSections,
    pendingResumeSkills,
    pendingResumeCertifications,
    pendingResumeRoleCandidate,
    resumeReviewExpanded,
    hasPendingResumeReview,
    hasMinimumRequiredInput,
    hasDraftChanges,
    hasAnyDraftInput,
    inputError,
    roleSelectionPrompt,
    canGoBackWizard,
    canGoNextWizard,
    plannerState,
    generateButtonLabel,
    workRegionOptions: WORK_REGION_OPTIONS,
    timelineOptions: TIMELINE_OPTIONS,
    educationOptions: EDUCATION_OPTIONS,
    incomeTargetOptions: INCOME_TARGET_OPTIONS,
    onSetActiveWizardStep: setActiveWizardStep,
    onCurrentRoleInputChange: handleCurrentRoleInputChange,
    onTargetRoleInputChange: handleTargetRoleInputChange,
    onCurrentRoleSuggestionSelect: (suggestion: {
      occupationId: string
      title: string
      confidence?: number
      matchedBy?: string
    }) => {
      setRoleSelectionPrompt(null)
      setCurrentRoleText(suggestion.title)
      setCurrentRoleSelectedMatch({
        occupationId: suggestion.occupationId,
        title: suggestion.title,
        confidence: suggestion.confidence ?? 0,
        matchedBy: suggestion.matchedBy ?? 'fallback'
      })
      advanceWizardAfterRoleSelection(suggestion.title, targetRoleText)
    },
    onTargetRoleSuggestionSelect: (suggestion: {
      occupationId: string
      title: string
      confidence?: number
      matchedBy?: string
    }) => {
      setRoleSelectionPrompt(null)
      setTargetRoleText(suggestion.title)
      setTargetRoleSelectedMatch({
        occupationId: suggestion.occupationId,
        title: suggestion.title,
        confidence: suggestion.confidence ?? 0,
        matchedBy: suggestion.matchedBy ?? 'fallback'
      })
    },
    onToggleSuggestedTargets: () => setShowSuggestedTargets((previous) => !previous),
    onShuffleSuggestedTargets: () => setSuggestedTargetShuffle((previous) => previous + 1),
    onSelectSuggestedTarget: (title: string) =>
      void handlePlanRecommendedRole(title, {
        autoGenerate: false,
        nextStep: currentRoleText.trim() ? 1 : 0
      }),
    onSkillsChange: setSkills,
    onExperienceTextChange: setExperienceText,
    onParseFile: (file: File | null) => {
      if (!file) return
      void parseFile(file)
    },
    onApplyDetectedResumeData: applyDetectedResumeData,
    onDismissDetectedResumeData: dismissDetectedResumeData,
    onSetResumeReviewExpanded: setResumeReviewExpanded,
    onRemovePendingResumeSkill: (value: string) =>
      setPendingResumeSkills((previous) => previous.filter((item) => item !== value)),
    onRemovePendingResumeCertification: (value: string) =>
      setPendingResumeCertifications((previous) => previous.filter((item) => item !== value)),
    onSetEducationLevel: setEducationLevel,
    onSetWorkRegion: (value: WorkRegionValue) => {
      const normalizedProvince = normalizeWorkRegionToProvince(value, selectedProvince)
      setWorkRegion(normalizedProvince)
      setSelectedProvince(normalizedProvince)
      if (!locationTouched) {
        setLocationText(toProvinceLocation(normalizedProvince))
      }
    },
    onSetTimelineBucket: setTimelineBucket,
    onSetIncomeTarget: setIncomeTarget,
    onSetLocationText: (value: string) => {
      setLocationTouched(true)
      setLocationText(value)
    },
    onSetUseMarketEvidence: setUseMarketEvidence,
    onSetUserPostingText: setUserPostingText,
    onResolveRoleSelection: handleResolveRoleSelection,
    onBack: () => setActiveWizardStep((previous) => Math.max(0, previous - 1) as WizardStep),
    onNext: () =>
      setActiveWizardStep((previous) =>
        Math.min(WIZARD_STEPS.length - 1, previous + 1) as WizardStep
      ),
    onStartNewPlan: handleStartNewPlan,
    onGenerate: () => void handleGeneratePlan()
  } satisfies ComponentProps<typeof PlannerIntakeWizard>

  const showDashboard = plannerState !== 'loading' && viewMode === 'dashboard' && hasPlannerResults
  const useWidePlannerShell = plannerState === 'loading' || showDashboard
  const plannerShellMaxWidthClass = showDashboard
    ? 'max-w-[1260px]'
    : useWidePlannerShell
      ? 'max-w-content'
      : 'max-w-tool'

  return (
    <>
      {!showDashboard ? (
        <ToolHero className="print-hidden pb-12 pt-16">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Badge className="gap-1 !px-2 !py-0.5 !text-[11px]">{usageLabel(usage, previewLocked, effectivePlan)}</Badge>
            <Badge className="gap-1 !border-border-light !bg-surface !px-2 !py-0.5 !text-[11px] !font-medium !text-text-tertiary">
              Province-aware
            </Badge>
            <Badge className="gap-1 !border-border-light !bg-surface !px-2 !py-0.5 !text-[11px] !font-medium !text-text-tertiary">
              Resume Upload (Pro)
            </Badge>
          </div>
          <h1 className="max-w-[760px] text-[40px] font-bold leading-tight text-text-primary md:text-[48px]">
            Career Switch Planner
          </h1>
          <p className="max-w-[720px] text-base leading-[1.7] text-text-secondary md:text-lg">
            Build a structured Canadian transition roadmap with clearer timelines, province-aware context, and practical weekly next steps.
          </p>
        </ToolHero>
      ) : null}

      <section
        className={`px-4 ${showDashboard ? 'bg-bg-secondary pb-20 pt-12' : 'pb-16 pt-8'} ${useWidePlannerShell ? 'lg:px-[170px]' : 'lg:px-[340px]'}`}
      >
        <div className={`mx-auto w-full ${plannerShellMaxWidthClass}`}>
          {plannerState === 'loading' ? (
            <Card className="planner-animate-in p-5" aria-live="polite">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">
                    Building your transition report
                  </p>
                  <h3 className="mt-2 text-lg font-bold text-text-primary">We are assembling the plan in stages</h3>
                  <p className="mt-2 max-w-[56ch] text-sm leading-[1.7] text-text-secondary">
                    Matching, scoring, and roadmap generation run in sequence so the report lands in one clean pass.
                  </p>
                </div>
                <Badge variant="default">
                  {Math.min(loadingStageIndex + 1, PLANNER_LOADING_STAGES.length)} / {PLANNER_LOADING_STAGES.length}
                </Badge>
              </div>
              <div className="mt-5 h-2 rounded-pill bg-surface">
                <div
                  className="h-full rounded-pill bg-accent transition-all duration-300"
                  style={{
                    width: `${(Math.min(loadingStageIndex + 1, PLANNER_LOADING_STAGES.length) / PLANNER_LOADING_STAGES.length) * 100}%`
                  }}
                />
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-4">
                {PLANNER_LOADING_STAGES.map((stage, index) => {
                  const isComplete = index < loadingStageIndex
                  const isActive = index === loadingStageIndex

                  return (
                    <div
                      key={stage}
                      className={`rounded-xl border p-4 transition-colors ${
                        isActive
                          ? 'border-accent bg-surface'
                          : isComplete
                            ? 'border-success/20 bg-success/10'
                            : 'border-border-light bg-bg-secondary'
                      }`}
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-[1.1px] text-text-tertiary">
                        Step {index + 1}
                      </p>
                      <p className="mt-2 text-sm font-semibold text-text-primary">{stage}</p>
                      <p className="mt-2 text-xs text-text-secondary">
                        {isActive ? 'In progress now.' : isComplete ? 'Completed.' : 'Queued next.'}
                      </p>
                    </div>
                  )
                })}
              </div>
            </Card>
          ) : showDashboard ? (
              <PlannerDashboardV3
                model={v3DashboardModel}
                hasDraftChanges={hasDraftChanges}
                isGuestPreview={isGuestPreview}
                progressStorageKey={plannerLoopStorageKey}
                allowLocalProgressFallback={
                  Boolean(canPersistPlannerLoop && plannerServerProgressHydrated && !plannerServerProgressState)
                }
                initialProgressState={
                  plannerServerProgressState
                    ? {
                        checkedTaskIds: plannerServerProgressState.checkedTaskIds ?? {},
                        expandedPhaseIds: plannerServerProgressState.expandedPhaseIds ?? [],
                        completedTrainingIds: plannerServerProgressState.completedTrainingIds ?? {}
                      }
                    : null
                }
                faqItems={careerSwitchFaqs}
                relatedTools={careerSwitchMoreTools}
                resumeToolkitDraft={resumeToolkitDraft}
                emailToolkitDraft={emailToolkitDraft}
                callToolkitDraft={callToolkitDraft}
                outreachTracker={outreachTracker}
                onEditInputs={() => setIsEditDrawerOpen(true)}
                onRegenerate={() => void handleGeneratePlan()}
                onStartNewPlan={handleStartNewPlan}
                onSelectAlternativeRole={(title) =>
                void handlePlanRecommendedRole(title, { autoGenerate: true, nextStep: 2 })
              }
              onResumeToolkitDraftChange={setResumeToolkitDraft}
              onEmailToolkitDraftChange={setEmailToolkitDraft}
              onCallToolkitDraftChange={setCallToolkitDraft}
              onOutreachTrackerChange={handleOutreachTrackerChange}
              onProgressStateChange={setPlannerLoopProgressState}
              onExportPlan={handleExportPlan}
              onDownloadPdf={handlePrintReport}
              onSavePlan={() => void handleSavePlanSnapshot()}
              savePlanLabel={
                savePlanState === 'saving'
                  ? 'Saving...'
                  : savePlanState === 'saved'
                    ? 'Saved'
                    : savePlanState === 'error'
                      ? 'Retry Save'
                      : 'Save Plan'
              }
            />
          ) : (
            <PlannerIntakeWizard {...intakeWizardProps} />
          )}
        </div>
      </section>

      {showDashboard && isEditDrawerOpen ? (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Close input editor"
            className="absolute inset-0 bg-primary/35"
            onClick={() => setIsEditDrawerOpen(false)}
          />
          <div className="absolute right-0 top-0 h-full w-full max-w-[920px] overflow-y-auto border-l border-border-light bg-surface p-4 shadow-panel">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-semibold text-text-primary">Edit Inputs</p>
              <Button variant="ghost" size="sm" onClick={() => setIsEditDrawerOpen(false)}>
                Close
              </Button>
            </div>
            <PlannerIntakeWizard {...intakeWizardProps} />
          </div>
        </div>
      ) : null}
    </>
  )
}
