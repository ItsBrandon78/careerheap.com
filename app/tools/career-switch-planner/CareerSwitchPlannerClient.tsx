'use client'

import { type ComponentProps, type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import Badge from '@/components/Badge'
import Button from '@/components/Button'
import Card from '@/components/Card'
import ToolCard from '@/components/ToolCard'
import {
  ToolHero
} from '@/components/career-switch-planner/CareerSwitchPlannerComponents'
import PlannerIntakeWizard from '@/components/career-switch-planner/PlannerIntakeWizard'
import PlannerDashboardV3 from '@/components/career-switch-planner/PlannerDashboardV3'
import {
  careerSwitchFaqs,
  careerSwitchMoreTools
} from '@/lib/planner/content'
import {
  findExampleScenarioByIds,
  pickRandomExampleScenarios,
  type PlannerExampleScenario,
  PLANNER_EXAMPLE_SCENARIOS
} from '@/lib/planner/exampleScenarios'
import {
  buildPlannerJobRecommendationCards,
  type PlannerJobRecommendationCard,
  type PlannerJobRecommendationInput
} from '@/lib/planner/jobRecommendations'
import { extractProfileSignals, isPersonalIdentifier } from '@/lib/planner/profileSignals'
import { buildRecommendedTargetSections } from '@/lib/planner/recommendedTargets'
import {
  type CareerSwitchPlannerResult,
  toPlannerResultView,
  type PlannerResultView
} from '@/lib/planner/types'
import { buildPlannerDashboardV3Model, type PlannerViewMode } from '@/lib/planner/v3Dashboard'
import {
  dedupeBullets as sharedDedupeBullets,
  excludeExistingBullets,
  normalizeBulletKey
} from '@/lib/transition/dedupe'
import {
  scoreToLabel,
  shouldShowSimilarRoles,
  taxonomySourceLabel,
  type RoleConfidenceLabel
} from '@/lib/planner/roleNormalization'
import { useToolUsage, type ToolUsageResult } from '@/lib/hooks/useToolUsage'
import { useAuth } from '@/lib/auth/context'
import {
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
type RoadmapTabKey = '0-30' | '30-90' | '3-12'
type DashboardRoadmapItem = {
  title: string
  detail: string
  bullets: string[]
}
type DashboardRoadmapTab = {
  key: RoadmapTabKey
  label: string
  summary: string
  items: DashboardRoadmapItem[]
}
type MissingHiringRequirement = {
  key: string
  kind: 'education' | 'credential'
  title: string
  detail: string
  link: { label: string; url: string } | null
}
type BlockerFix = {
  issue: string
  fix: string
}
type WorkRegionValue = 'us' | 'ca' | 'remote-us' | 'remote-ca' | 'either'
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

type JobRecommendationStatus = 'idle' | 'loading' | 'success' | 'empty' | 'error'

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

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024
const ACCEPTED_EXTENSIONS = ['pdf', 'docx']
const FREE_LIMIT = 3
const EXAMPLE_CARD_COUNT = 3
const EXAMPLE_OPTIONS_STORAGE_KEY = 'career-switch-planner-example-options'
const EXAMPLE_SELECTED_STORAGE_KEY = 'career-switch-planner-selected-example'
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
    helper: 'Add location, timing, and market preferences before generating.'
  }
]
const PLANNER_LOADING_STAGES = ['Parsing profile', 'Matching roles', 'Building plan', 'Finalizing']
const ROADMAP_TABS: Array<{ key: RoadmapTabKey; label: string; summary: string }> = [
  { key: '0-30', label: '0-30 Days', summary: 'Immediate traction and first proof.' },
  { key: '30-90', label: '30-90 Days', summary: 'Stack consistency and market validation.' },
  { key: '3-12', label: '3-12 Months', summary: 'Compounding proof, leverage, and readiness.' }
]
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

const WORK_REGION_OPTIONS: Array<{ value: WorkRegionValue; label: string }> = [
  { value: 'ca', label: 'Canada (default)' },
  { value: 'remote-ca', label: 'Remote (Canada)' },
  { value: 'either', label: 'Open to either (Canada/US)' },
  { value: 'us', label: 'United States (optional)' },
  { value: 'remote-us', label: 'Remote (US)' }
]

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

const FRIENDLY_DATASET_NAMES: Record<string, string> = {
  occupations: 'Occupation profiles',
  occupation_skills: 'Skills graph',
  occupation_requirements: 'Education and requirement profiles',
  occupation_wages: 'Regional wage data',
  trade_requirements: 'Official trade requirements',
  fx_rates: 'FX rates',
  job_queries: 'Employer query cache',
  job_postings: 'Employer posting snapshots',
  job_requirements: 'Employer requirements index',
  user_posting: 'User-provided posting evidence',
  onet_baseline: 'Baseline (O*NET)'
}

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

function evidenceChipClass(label: string) {
  if (label.startsWith('User posting')) {
    return 'border-success/30 bg-success/10 text-success'
  }
  if (label.startsWith('Employer evidence')) {
    return 'border-accent/30 bg-accent/10 text-accent'
  }
  return 'border-warning/30 bg-warning-light text-warning'
}

function gapLevelLabel(level: 'met' | 'partial' | 'missing') {
  if (level === 'met') return 'Met'
  if (level === 'partial') return 'Partial'
  return 'Missing'
}

function evidenceSourceCount(
  evidence: Array<{ source: 'adzuna' | 'user_posting' | 'onet'; quote: string; postingId?: string; confidence: number }>
) {
  return new Set(evidence.map((item) => item.source)).size
}

function evidenceConfidenceLabel(
  evidence: Array<{ source: 'adzuna' | 'user_posting' | 'onet'; quote: string; postingId?: string; confidence: number }>
) {
  if (!evidence.length) return null
  const average =
    evidence.reduce((sum, item) => sum + (Number.isFinite(item.confidence) ? item.confidence : 0), 0) /
    evidence.length
  return `${Math.round(Math.max(0, Math.min(1, average)) * 100)}% confidence`
}

function frequencyPercentLabel(value: number | null | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'N/A'
  return `${Math.round(value)}%`
}

function roleConfidenceClass(label: RoleConfidenceLabel) {
  if (label === 'Exact') return 'border-success/30 bg-success/10 text-success'
  if (label === 'Close') return 'border-accent/30 bg-accent/10 text-accent'
  if (label === 'Broad') return 'border-warning/30 bg-warning-light text-warning'
  return 'border-warning/40 bg-warning-light text-warning'
}

function RoleNormalizationCard({
  heading,
  resolution
}: {
  heading: string
  resolution: RoleResolutionMatch
}) {
  const matched = resolution.matched
  const confidenceLabel = scoreToLabel(matched?.confidence ?? 0)
  const showSimilar = shouldShowSimilarRoles(confidenceLabel) || (resolution.suggestions.length > 0 && confidenceLabel !== 'Exact')
  const similarRoles = resolution.suggestions
    .filter((item) => item.occupationId !== matched?.occupationId)
    .slice(0, 3)
  const sourceLabel = taxonomySourceLabel({
    source: matched?.source ?? null,
    region: matched?.region ?? null
  })
  const resolvedMeta = [matched?.stage, matched?.specialization]
    .filter((item): item is string => Boolean(item && item.trim()))
    .join(' | ')

  return (
    <div className="rounded-md border border-border-light p-3">
      <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">{heading}</p>
      <div className="mt-2 space-y-2">
        <p className="text-sm text-text-secondary">You entered: {resolution.input || 'Not provided'}</p>
        <div className="flex flex-wrap items-center gap-2 text-sm text-text-primary">
          <span>
            Standardized as:{' '}
            <span className="font-semibold text-text-primary">
              {matched?.title || 'Not resolved'}
            </span>
          </span>
          <span className="rounded-pill border border-border px-2 py-0.5 text-[11px] text-text-tertiary">
            {sourceLabel}
          </span>
          <span
            className={`rounded-pill border px-2 py-0.5 text-[11px] font-medium ${roleConfidenceClass(confidenceLabel)}`}
          >
            {confidenceLabel}
          </span>
        </div>
        {resolvedMeta ? (
          <p className="text-xs text-text-tertiary">Stage / specialization: {resolvedMeta}</p>
        ) : null}
        {matched ? (
          <p className="text-xs text-text-secondary">
            Choose a different match if wrong.
          </p>
        ) : null}
        {showSimilar && similarRoles.length > 0 ? (
          <p className="text-xs text-text-tertiary">
            Similar roles: {similarRoles.map((item) => item.title).join(' | ')}
          </p>
        ) : null}
        {confidenceLabel === 'Unclear' ? (
          <p className="text-xs text-text-secondary">
            Want to be more specific? Try adding specialization (e.g., &#34;Residential electrician apprentice&#34;).
          </p>
        ) : null}
      </div>
    </div>
  )
}

function ReportSection({
  title,
  count,
  defaultOpen = false,
  children
}: {
  title: string
  count: number
  defaultOpen?: boolean
  children: ReactNode
}) {
  return (
    <details open={defaultOpen} className="rounded-md border border-border-light bg-bg-secondary p-3">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-semibold text-text-primary">
        <span>{title}</span>
        <span className="text-xs font-medium text-text-tertiary">
          {count} item{count === 1 ? '' : 's'}
        </span>
      </summary>
      <div className="mt-3 space-y-2">{children}</div>
    </details>
  )
}

function difficultyToneClasses(label: 'Easy' | 'Moderate' | 'Hard' | 'Very Hard') {
  if (label === 'Easy') return 'border-success/30 bg-success/10 text-success'
  if (label === 'Moderate') return 'border-accent/30 bg-accent/10 text-accent'
  if (label === 'Hard') return 'border-warning/30 bg-warning-light text-warning'
  return 'border-error/30 bg-error-light text-error'
}

function routeToneClasses(kind: 'primary' | 'secondary' | 'contingency') {
  if (kind === 'primary') return 'border-success/30 bg-success/10'
  if (kind === 'secondary') return 'border-warning/30 bg-warning-light'
  return 'border-error/25 bg-error-light'
}

function formatMoneyRange(low: number, high: number, unit: string, annualize = false) {
  const isHourly = unit.toLowerCase().includes('/hour')
  const showAnnualized = annualize && isHourly
  const displayLow = showAnnualized ? low * 2080 : low
  const displayHigh = showAnnualized ? high * 2080 : high
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: unit.startsWith('CAD') ? 'CAD' : 'USD',
    maximumFractionDigits: 0
  })
  const suffix = showAnnualized ? ' / year est.' : isHourly ? ' / hr' : unit.toLowerCase().includes('/year') ? ' / yr' : ''
  return `${formatter.format(displayLow)} - ${formatter.format(displayHigh)}${suffix}`
}

function buildTransitionChannelPriorities(routeTitle: string, routeReason: string) {
  const text = `${routeTitle} ${routeReason}`.toLowerCase()

  if (/\bapprentice\b|\btrade\b|\bunion\b|\bsponsor\b/.test(text)) {
    return [
      'Direct employer outreach: ask who handles helper, trainee, or apprenticeship intake.',
      'Targeted applications: focus on entry routes that match the real pathway, not generic volume.',
      'Pathway contacts: use unions, training authorities, and intake offices early if they matter.',
      'Bridge work: use agency or adjacent site work only if it clearly creates experience or contacts.'
    ]
  }

  if (/\blicens\b|\bboard\b|\beducation\b|\bsupervised\b/.test(text)) {
    return [
      'Licensing and admissions: move one formal requirement forward every week.',
      'Practitioner outreach: use short conversations to confirm the right sequence before you spend money.',
      'Adjacent support roles: stay close to the field while credentials are in motion.',
      'Applications: do not push volume until the first formal gate is actually moving.'
    ]
  }

  if (/\bportfolio\b|\bcase study\b|\bwork sample\b/.test(text)) {
    return [
      'Proof first: ship small work samples quickly instead of waiting for one perfect project.',
      'Feedback loops: use practitioner feedback to tighten the next sample fast.',
      'Targeted applications: apply where your current portfolio genuinely fits.',
      'Warm outreach: ask for feedback and referrals, not just job status.'
    ]
  }

  if (/\bcredential\b|\bcertificate\b|\blab\b/.test(text)) {
    return [
      'Learning path: keep one focused credential or study plan moving every week.',
      'Practice: pair study with simple hands-on proof, not theory alone.',
      'Targeted outreach: ask what proof matters most at the entry point.',
      'Applications: start once the first proof is ready, then keep follow-ups measured.'
    ]
  }

  if (/\boutcome\b|\bprogression\b|\bnext step\b/.test(text)) {
    return [
      'Positioning: lead with measurable wins that already match the next level.',
      'Referrals: use managers, peers, and recruiters to shorten the jump.',
      'Targeted applications: focus on scope fit, not title alone.',
      'Internal leverage: use stretch work or cross-functional reps if external response is thin.'
    ]
  }

  return [
    'Targeted applications: focus on roles that actually match your current evidence.',
    'Direct outreach: use short, specific messages instead of relying only on portals.',
    'Proof actions: turn the top gap into one concrete example you can talk through.',
    'Weekly review: keep only the channels that create real conversations.'
  ]
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

function buildDashboardRoadmapTabs(input: {
  plannerReport: PlannerReportPayload | null
  transitionModeReport: NonNullable<PlannerReportPayload['transitionMode']> | null
  targetRole: string
  location: string
}) {
  const { plannerReport, transitionModeReport, targetRole, location } = input
  if (!plannerReport || !transitionModeReport) return [] as DashboardRoadmapTab[]

  if (transitionModeReport.roadmapGuide?.phases?.length === 3) {
    return transitionModeReport.roadmapGuide.phases.map((phase, index) => ({
      key: ROADMAP_TABS[index]?.key ?? '0-30',
      label: phase.label,
      summary: phase.focus,
      items: phase.steps.map((step) => ({
        title: step.title,
        detail: step.whyItMatters,
        bullets: normalizeRoadmapBullets([
          `Time: ${step.timeRange}.`,
          `Cost: ${step.costRange}.`,
          step.prereqs.length > 0 ? `Prereqs: ${joinReadableList(step.prereqs.slice(0, 3))}.` : '',
          ...step.proofChecklist.slice(0, 2)
        ], 5)
      }))
    }))
  }

  const targetLabel =
    targetRole.trim() || plannerReport.transitionReport?.marketSnapshot.role || 'this role'
  const locationLabel =
    plannerReport.transitionReport?.marketSnapshot.location || location.trim() || 'your area'
  const targetRequirements = plannerReport.targetRequirements
  const transitionSections = plannerReport.transitionSections
  const marketSnapshot = plannerReport.transitionReport?.marketSnapshot
  const commonSkills = normalizeRoadmapBullets([
    ...(marketSnapshot?.topRequirements ?? []).map((item) => item.label),
    ...(transitionSections?.coreHardSkills ?? []).map((item) => item.label)
  ])
  const commonTools = normalizeRoadmapBullets([
    ...(marketSnapshot?.topTools ?? []).map((item) => item.label),
    ...(transitionSections?.toolsPlatforms ?? []).map((item) => item.label)
  ])
  const entryTickets = normalizeRoadmapBullets([
    ...(targetRequirements?.certifications ?? []),
    ...(targetRequirements?.hardGates ?? [])
  ])
  const employerSignals = normalizeRoadmapBullets([
    ...(targetRequirements?.employerSignals ?? []),
    ...(transitionSections?.experienceSignals ?? []).map((item) => item.label)
  ])
  const firstSteps = normalizeRoadmapBullets(transitionModeReport.gaps.first3Steps)
  const phaseThreeTargets = normalizeRoadmapBullets([
    ...(transitionModeReport.plan90[2]?.weeklyTargets ?? []),
    ...(transitionSections?.roadmapPlan.strongCandidatePath ?? [])
  ])
  const channelPriorities = normalizeRoadmapBullets(
    buildTransitionChannelPriorities(
      transitionModeReport.routes.primary.title,
      transitionModeReport.routes.primary.reason
    ),
    3
  )
  const earningsSummary = transitionModeReport.earnings

  return [
    {
      key: '0-30',
      label: '0-30 Days',
      summary: ROADMAP_TABS[0].summary,
      items: [
        {
          title: `Confirm what ${targetLabel} employers expect first`,
          detail: `Start with real requirements in ${locationLabel} before you spend money or spray applications.`,
          bullets: normalizeRoadmapBullets([
            commonSkills.length > 0
              ? `Verify the top skills first: ${joinReadableList(commonSkills.slice(0, 3))}.`
              : '',
            commonTools.length > 0
              ? `Check the common tools, workflow, or job tasks: ${joinReadableList(commonTools.slice(0, 3))}.`
              : '',
            targetRequirements?.education
              ? `Baseline education: ${targetRequirements.education}.`
              : '',
            plannerReport.marketEvidence?.baselineOnly
              ? 'Live market data is thin, so confirm the local sequence by speaking with real employers this week.'
              : ''
          ])
        },
        {
          title: 'Lock in the real entry requirements',
          detail: 'Get clear on the gates, tickets, and formal steps that make you look job-ready.',
          bullets: normalizeRoadmapBullets([
            entryTickets.length > 0
              ? `Priority tickets or gates: ${joinReadableList(entryTickets.slice(0, 4))}.`
              : '',
            typeof targetRequirements?.apprenticeshipHours === 'number'
              ? `Formal hour target to plan around: about ${targetRequirements.apprenticeshipHours.toLocaleString()} supervised hours.`
              : '',
            typeof targetRequirements?.examRequired === 'boolean'
              ? targetRequirements.examRequired
                ? 'Plan for an exam or qualification step later in the path.'
                : 'This path does not show a mandatory exam in the current data.'
              : '',
            transitionModeReport.routes.primary.firstStep
              ? `Immediate move: ${transitionModeReport.routes.primary.firstStep}.`
              : ''
          ])
        },
        {
          title: 'Start direct outreach with a hiring question',
          detail: 'Use early conversations to validate the entry route, not just the title.',
          bullets: normalizeRoadmapBullets([
            `Ask whether they are hiring for helper, trainee, apprentice, or entry-level starts in ${locationLabel}.`,
            'Ask what a serious beginner needs in the first 30 days to get taken seriously.',
            'Ask whether they prefer a follow-up by phone or email and who handles hiring.'
          ])
        }
      ]
    },
    {
      key: '30-90',
      label: '30-90 Days',
      summary: ROADMAP_TABS[1].summary,
      items: [
        {
          title: 'Build the core skills employers mention most',
          detail: 'Focus on the requirements that show up across postings and role evidence.',
          bullets: normalizeRoadmapBullets([
            ...commonSkills.slice(0, 4).map((item) => `Spend weekly time on ${item}.`),
            ...(firstSteps.length === 0 ? ['Keep one measurable learning block moving every week.'] : [])
          ])
        },
        {
          title: 'Practice the tools, workflow, and safe habits',
          detail: 'Turn theory into hands-on familiarity you can describe clearly in interviews.',
          bullets: normalizeRoadmapBullets([
            ...commonTools.slice(0, 3).map((item) => `Get hands-on repetition with ${item}.`),
            ...((transitionSections?.toolsPlatforms ?? [])
              .slice(0, 2)
              .map((item) => item.quickProject)),
            ...(commonTools.length === 0 ? ['Use a small practice project, shadow day, or lab session to build confidence.'] : [])
          ])
        },
        {
          title: 'Create proof that employers can trust',
          detail: 'Package your progress into proof, references, and a better first conversation.',
          bullets: normalizeRoadmapBullets([
            ...firstSteps.slice(0, 3),
            ...employerSignals.slice(0, 2).map((item) => `Show one concrete example tied to ${item}.`)
          ])
        }
      ]
    },
    {
      key: '3-12',
      label: '3-12 Months',
      summary: ROADMAP_TABS[2].summary,
      items: [
        {
          title: targetRequirements?.regulated ? 'Track formal progression and required hours' : 'Build durable experience and stronger proof',
          detail: targetRequirements?.regulated
            ? 'Stay disciplined with the formal sequence so you do not lose time later.'
            : 'Turn early proof into a track record employers can trust.',
          bullets: normalizeRoadmapBullets([
            typeof targetRequirements?.apprenticeshipHours === 'number'
              ? `Track hours, schooling blocks, and supervisor sign-off against the ${targetRequirements.apprenticeshipHours.toLocaleString()} hour path.`
              : '',
            typeof targetRequirements?.examRequired === 'boolean' && targetRequirements.examRequired
              ? 'Keep the exam or qualification step visible so your study and field work line up.'
              : '',
            ...phaseThreeTargets.slice(0, 3)
          ])
        },
        {
          title: 'Keep building paid-ready evidence',
          detail: 'The goal is not generic activity. The goal is proof that maps to real hiring decisions.',
          bullets: normalizeRoadmapBullets([
            ...employerSignals.slice(0, 3).map((item) => `Collect examples that prove ${item}.`),
            ...channelPriorities.slice(0, 2)
          ])
        },
        {
          title: 'Move toward stronger pay and better lanes',
          detail: 'Once the base path is moving, use your proof to reach better-paying versions of the role.',
          bullets: normalizeRoadmapBullets([
            earningsSummary.length > 0
              ? `Early stage pay in the current data: ${earningsSummary[0].stage} at ${earningsSummary[0].rangeLow}-${earningsSummary[0].rangeHigh} ${earningsSummary[0].unit}.`
              : '',
            earningsSummary.length > 1
              ? `Later upside: ${earningsSummary[earningsSummary.length - 1].stage} at ${earningsSummary[earningsSummary.length - 1].rangeLow}-${earningsSummary[earningsSummary.length - 1].rangeHigh} ${earningsSummary[earningsSummary.length - 1].unit}.`
              : '',
            'Use better evidence, better referrals, and the right specialization to reach the higher end of the range.'
          ])
        }
      ]
    }
  ]
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

function educationLevelRank(value: EducationLevelValue) {
  switch (value) {
    case 'No formal degree':
      return 0
    case 'High school':
      return 1
    case 'Trade certification':
      return 2
    case 'Apprenticeship':
      return 3
    case "Associate's":
      return 4
    case "Bachelor's":
      return 5
    case "Master's":
      return 6
    case 'Doctorate':
      return 7
    case 'Self-taught / portfolio-based':
      return 0
    default:
      return 0
  }
}

function inferRequiredEducationRank(value: string) {
  const normalized = value.toLowerCase()
  if (/(doctorate|phd|md|doctor\b)/.test(normalized)) return 7
  if (/(master|mba)/.test(normalized)) return 6
  if (/(bachelor|undergraduate|university degree|college degree)/.test(normalized)) return 5
  if (/(associate|two-year)/.test(normalized)) return 4
  if (/(apprenticeship)/.test(normalized)) return 3
  if (/(trade school|trade certificate|trade certification|certificate program|certificate|certification|diploma)/.test(normalized)) {
    return 2
  }
  if (/(high school|ged|grade 12|secondary school)/.test(normalized)) return 1
  return null
}

function userLikelyMeetsEducationBaseline(
  currentEducationLevel: EducationLevelValue,
  requiredEducation: string
) {
  const requiredRank = inferRequiredEducationRank(requiredEducation)
  if (requiredRank === null) return false
  return educationLevelRank(currentEducationLevel) >= requiredRank
}

function isEducationRequirement(value: string) {
  return /\b(high school|ged|grade 12|secondary school|diploma|degree|associate|bachelor|master|doctorate|phd|apprenticeship)\b/i.test(
    value
  )
}

function isCredentialRequirement(value: string) {
  return /\b(cert|certificate|certification|license|licence|licensed|permit|registration|registered|ticket|training|first aid|cpr|whmis|osha|csts|working at heights|driver'?s license|red seal|qualification|exam)\b/i.test(
    value
  )
}

function findBestRequirementLink(
  requirement: string,
  links: Array<{ label: string; url: string }>
) {
  if (!requirement.trim() || links.length === 0) return null
  const requirementKey = normalizeBulletKey(requirement)
  const exactMatch = links.find((link) => {
    const linkKey = normalizeBulletKey(link.label)
    return linkKey.includes(requirementKey) || requirementKey.includes(linkKey)
  })
  if (exactMatch) return exactMatch

  const ignoredTokens = new Set([
    'required',
    'preferred',
    'entry',
    'level',
    'baseline',
    'formal',
    'training',
    'education'
  ])
  const requirementTokens = requirementKey
    .split(' ')
    .map((token) => token.trim())
    .filter((token) => token.length > 2 && !ignoredTokens.has(token))

  let bestMatch: { link: { label: string; url: string }; score: number } | null = null
  for (const link of links) {
    const linkKey = normalizeBulletKey(link.label)
    const score = requirementTokens.filter((token) => linkKey.includes(token)).length
    if (score === 0) continue
    if (!bestMatch || score > bestMatch.score) {
      bestMatch = { link, score }
    }
  }

  return bestMatch?.link ?? null
}

function buildMissingHiringRequirements(input: {
  targetRequirements?: PlannerReportPayload['targetRequirements']
  transitionReport: PlannerReportPayload['transitionReport'] | null
  currentCertifications: string[]
  educationLevel: EducationLevelValue
  resourceLinks: Array<{ label: string; url: string }>
}) {
  const { targetRequirements, transitionReport, currentCertifications, educationLevel, resourceLinks } = input
  if (!targetRequirements && !transitionReport) return [] as MissingHiringRequirement[]

  const output: MissingHiringRequirement[] = []
  const seen = new Set<string>()
  const heldCertificationKeys = new Set(
    currentCertifications.map((item) => normalizeBulletKey(item)).filter(Boolean)
  )
  const missingMustHaves = (transitionReport?.mustHaves ?? []).filter((item) => item.status === 'missing')

  const pushRequirement = (
    kind: MissingHiringRequirement['kind'],
    title: string,
    detail: string,
    fallbackLookup?: string
  ) => {
    const key = `${kind}:${normalizeBulletKey(title)}`
    if (!title.trim() || seen.has(key)) return
    seen.add(key)
    const link =
      findBestRequirementLink(title, resourceLinks) ??
      (fallbackLookup ? findBestRequirementLink(fallbackLookup, resourceLinks) : null)
    output.push({
      key,
      kind,
      title: title.trim(),
      detail: detail.trim(),
      link
    })
  }

  if (targetRequirements?.education) {
    const likelyMet = userLikelyMeetsEducationBaseline(educationLevel, targetRequirements.education)
    if (!likelyMet) {
      const matchingEducationMustHave = missingMustHaves.find((item) =>
        isEducationRequirement(item.label)
      )
      pushRequirement(
        'education',
        targetRequirements.education,
        matchingEducationMustHave?.howToGet ||
          'Most employers treat this as a baseline screen before they interview.',
        matchingEducationMustHave?.label
      )
    }
  }

  for (const item of targetRequirements?.certifications ?? []) {
    if (heldCertificationKeys.has(normalizeBulletKey(item))) continue
    const matchingMustHave = missingMustHaves.find((mustHave) => {
      const mustHaveKey = normalizeBulletKey(mustHave.label)
      const itemKey = normalizeBulletKey(item)
      return mustHaveKey.includes(itemKey) || itemKey.includes(mustHaveKey)
    })
    pushRequirement(
      'credential',
      item,
      matchingMustHave?.howToGet ||
        'Most employers treat this as an early screen or job-ready requirement.',
      matchingMustHave?.label
    )
  }

  for (const item of targetRequirements?.hardGates ?? []) {
    if (!isCredentialRequirement(item) && !isEducationRequirement(item)) continue
    if (heldCertificationKeys.has(normalizeBulletKey(item))) continue
    const matchingMustHave = missingMustHaves.find((mustHave) => {
      const mustHaveKey = normalizeBulletKey(mustHave.label)
      const itemKey = normalizeBulletKey(item)
      return mustHaveKey.includes(itemKey) || itemKey.includes(mustHaveKey)
    })
    pushRequirement(
      isEducationRequirement(item) ? 'education' : 'credential',
      item,
      matchingMustHave?.howToGet ||
        'This shows up as a hard gate in the current market data, so close it early.',
      matchingMustHave?.label
    )
  }

  for (const item of missingMustHaves) {
    if (!isCredentialRequirement(item.label) && !isEducationRequirement(item.label)) continue
    if (heldCertificationKeys.has(normalizeBulletKey(item.label))) continue
    pushRequirement(
      isEducationRequirement(item.label) ? 'education' : 'credential',
      item.label,
      item.howToGet || 'Employers keep mentioning this as a real entry filter.',
      item.label
    )
  }

  return output.slice(0, 5)
}

function buildDraftFromExample(example: PlannerExampleScenario): PlannerFormDraft {
  return {
    currentRoleText: example.currentRole,
    targetRoleText: example.targetRole,
    currentRoleOccupationId: null,
    targetRoleOccupationId: null,
    recommendMode: false,
    skills: example.skills,
    experienceText: example.experienceText,
    userPostingText: '',
    useMarketEvidence: true,
    educationLevel: example.educationLevel,
    workRegion: example.workRegion,
    locationText: example.locationText,
    timelineBucket: example.timelineBucket,
    incomeTarget: example.incomeTarget
  }
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

function buildJobRecommendationCards(
  jobs: PlannerJobRecommendationInput[],
  targetRole: string,
  location: string,
  signals: string[] = []
) {
  return buildPlannerJobRecommendationCards(jobs, targetRole, location, signals)
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

function toLocationFromWorkRegion(value: WorkRegionValue) {
  if (value === 'ca') return 'Canada'
  if (value === 'remote-us') return 'Remote (US)'
  if (value === 'remote-ca') return 'Remote (Canada)'
  if (value === 'either') return 'Open to either (Canada/US)'
  return 'United States'
}

function toAutocompleteRegion(value: WorkRegionValue): 'US' | 'CA' | 'either' {
  if (value === 'ca' || value === 'remote-ca') return 'CA'
  if (value === 'us' || value === 'remote-us') return 'US'
  return 'either'
}

function dedupeLinks(links: Array<{ label: string; url: string }>) {
  const seen = new Set<string>()
  const output: Array<{ label: string; url: string }> = []
  for (const link of links) {
    const key = `${link.label}|${link.url}`
    if (seen.has(key)) continue
    seen.add(key)
    output.push(link)
  }
  return output
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
  const [isGuestPreview, setIsGuestPreview] = useState(false)
  const [activeWizardStep, setActiveWizardStep] = useState<WizardStep>(0)
  const [activeRoadmapTab, setActiveRoadmapTab] = useState<RoadmapTabKey>('0-30')
  const [loadingStageIndex, setLoadingStageIndex] = useState(0)
  const [outreachToolkitOpen, setOutreachToolkitOpen] = useState(false)
  const [copiedToolkitSection, setCopiedToolkitSection] = useState<string | null>(null)
  const [isPrintMode, setIsPrintMode] = useState(false)
  const [resumeToolkitDraft, setResumeToolkitDraft] = useState('')
  const [callToolkitDraft, setCallToolkitDraft] = useState('')
  const [emailToolkitDraft, setEmailToolkitDraft] = useState('')
  const [exampleOptions, setExampleOptions] = useState<PlannerExampleScenario[]>([])
  const [selectedExampleId, setSelectedExampleId] = useState<string | null>(null)
  const [currentRoleText, setCurrentRoleText] = useState('')
  const [targetRoleText, setTargetRoleText] = useState('')
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
  const [showSuggestedTargets, setShowSuggestedTargets] = useState(false)
  const [suggestedTargetShuffle, setSuggestedTargetShuffle] = useState(0)
  const [skills, setSkills] = useState<string[]>([])
  const [experienceText, setExperienceText] = useState('')
  const [inputError, setInputError] = useState('')
  const [plannerResult, setPlannerResult] = useState<PlannerResultView | null>(null)
  const [plannerReport, setPlannerReport] = useState<PlannerReportPayload | null>(null)
  const [jobRecommendationStatus, setJobRecommendationStatus] = useState<JobRecommendationStatus>('idle')
  const [jobRecommendationItems, setJobRecommendationItems] = useState<PlannerJobRecommendationCard[]>([])
  const [jobRecommendationMessage, setJobRecommendationMessage] = useState('')
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
  const [workRegion, setWorkRegion] = useState<WorkRegionValue>('ca')
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
  const [earningsView, setEarningsView] = useState<'base' | 'annual'>('base')

  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const plannerStageTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const copyResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastJobRecommendationKeyRef = useRef('')
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
      if (copyResetTimerRef.current) {
        clearTimeout(copyResetTimerRef.current)
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

  useEffect(() => {
    const handleBeforePrint = () => setIsPrintMode(true)
    const handleAfterPrint = () => setIsPrintMode(false)

    window.addEventListener('beforeprint', handleBeforePrint)
    window.addEventListener('afterprint', handleAfterPrint)

    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint)
      window.removeEventListener('afterprint', handleAfterPrint)
    }
  }, [])

  useEffect(() => {
    try {
      const storedIds = typeof window !== 'undefined'
        ? window.localStorage.getItem(EXAMPLE_OPTIONS_STORAGE_KEY)
        : null
      const storedSelectedId = typeof window !== 'undefined'
        ? window.localStorage.getItem(EXAMPLE_SELECTED_STORAGE_KEY)
        : null
      const parsedIds = storedIds ? JSON.parse(storedIds) : null
      const restoredExamples = Array.isArray(parsedIds)
        ? findExampleScenarioByIds(parsedIds.filter((item) => typeof item === 'string'))
        : []

      if (restoredExamples.length === EXAMPLE_CARD_COUNT) {
        setExampleOptions(restoredExamples)
      } else {
        setExampleOptions(pickRandomExampleScenarios(EXAMPLE_CARD_COUNT))
      }

      if (
        storedSelectedId &&
        PLANNER_EXAMPLE_SCENARIOS.some((item) => item.id === storedSelectedId)
      ) {
        setSelectedExampleId(storedSelectedId)
      }
    } catch {
      setExampleOptions(pickRandomExampleScenarios(EXAMPLE_CARD_COUNT))
    }
  }, [])

  const hasPaidPlan = plan === 'pro' || plan === 'lifetime'
  const isProUser =
    proPreview || hasPaidPlan || usage?.plan === 'pro' || usage?.plan === 'lifetime'
  const isLocked = previewLocked || (!hasPaidPlan && (usage ? !usage.canUse : false))
  const hasMinimumRequiredInput =
    currentRoleText.trim().length > 0 || experienceText.trim().length > 0 || skills.length >= 3
  const roleAutocompleteRegion = toAutocompleteRegion(workRegion)
  const isTransitionMode = Boolean(
    lastSubmittedSnapshot?.targetRole && !lastSubmittedSnapshot?.recommendMode
  )

  useEffect(() => {
    const nextProvince = getStoredProvince()
    setSelectedProvince(nextProvince)
    setWorkRegion((current) =>
      current === 'us' || current === 'remote-us' ? current : 'ca'
    )
    if (!locationTouched) {
      setLocationText(toProvinceLocation(nextProvince))
    }

    const handleProvinceChange = (event: Event) => {
      const next = (event as CustomEvent<string>).detail
      if (typeof next !== 'string') return
      const normalized = (next.trim().toUpperCase() || DEFAULT_PROVINCE) as ProvinceCode
      setSelectedProvince(normalized)
      setWorkRegion((current) =>
        current === 'us' || current === 'remote-us' ? current : 'ca'
      )
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
      setLocationText(
        workRegion === 'ca'
          ? toProvinceLocation(selectedProvince)
          : toLocationFromWorkRegion(workRegion)
      )
    }
  }, [locationTouched, selectedProvince, workRegion])

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
      if (roleAutocompleteRegion === 'US' || roleAutocompleteRegion === 'CA') {
        formData.append('regionHint', roleAutocompleteRegion)
      }
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
    setIsPrintMode(true)
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        window.print()
      })
    })
  }

  const handleCopyToolkitSection = async (key: string, value: string) => {
    if (!value.trim() || typeof navigator === 'undefined' || !navigator.clipboard) return

    try {
      await navigator.clipboard.writeText(value)
      setCopiedToolkitSection(key)
      if (copyResetTimerRef.current) {
        clearTimeout(copyResetTimerRef.current)
      }
      copyResetTimerRef.current = setTimeout(() => {
        setCopiedToolkitSection(null)
      }, 1800)
    } catch {
      // ignore clipboard failures
    }
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
      setInputError('Add your target location to generate market evidence.')
      return
    }

    setInputError('')
    setPlannerReport(null)
    setOutreachToolkitOpen(false)
    setCopiedToolkitSection(null)
    setActiveRoadmapTab('0-30')
    setJobRecommendationStatus('idle')
    setJobRecommendationItems([])
    setJobRecommendationMessage('')
    lastJobRecommendationKeyRef.current = ''
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
      setIsGuestPreview(Boolean(data?.previewLimited || data?.report?.previewLimited || !user))
      setRoleSelectionPrompt(null)
      setEarningsView('base')
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

  const shuffleExampleOptions = () => {
    const nextExamples = pickRandomExampleScenarios(EXAMPLE_CARD_COUNT)
    setSelectedExampleId(null)
    setExampleOptions(nextExamples)
    try {
      window.localStorage.removeItem(EXAMPLE_SELECTED_STORAGE_KEY)
      window.localStorage.setItem(
        EXAMPLE_OPTIONS_STORAGE_KEY,
        JSON.stringify(nextExamples.map((item) => item.id))
      )
    } catch {
      // ignore local storage write failures
    }
  }

  const handleStartNewPlan = () => {
    setCurrentRoleText('')
    setTargetRoleText('')
    setCurrentRoleSelectedMatch(null)
    setTargetRoleSelectedMatch(null)
    setShowSuggestedTargets(false)
    setSkills([])
    setExperienceText('')
    setUserPostingText('')
    setInputError('')
    setPlannerResult(null)
    setPlannerReport(null)
    setIsGuestPreview(false)
    setPlannerState('idle')
    setViewMode('intake')
    setIsEditDrawerOpen(false)
    setLastGeneratedAt(null)
    setActiveWizardStep(0)
    setActiveRoadmapTab('0-30')
    setOutreachToolkitOpen(false)
    setCopiedToolkitSection(null)
    setResumeToolkitDraft('')
    setCallToolkitDraft('')
    setEmailToolkitDraft('')
    setJobRecommendationStatus('idle')
    setJobRecommendationItems([])
    setJobRecommendationMessage('')
    lastJobRecommendationKeyRef.current = ''
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
    setSelectedExampleId(null)

    try {
      window.localStorage.removeItem(EXAMPLE_SELECTED_STORAGE_KEY)
    } catch {
      // ignore local storage failures
    }
  }

  const handleGenerateExampleOptions = () => {
    shuffleExampleOptions()
  }

  const applyExampleScenario = async (example: PlannerExampleScenario) => {
    const draft = buildDraftFromExample(example)
    setSelectedExampleId(example.id)
    setCurrentRoleText(draft.currentRoleText)
    setTargetRoleText(draft.targetRoleText)
    setCurrentRoleSelectedMatch(null)
    setTargetRoleSelectedMatch(null)
    setExperienceText(draft.experienceText)
    setSkills(draft.skills)
    setWorkRegion(draft.workRegion)
    setLocationText(draft.locationText)
    setLocationTouched(true)
    setTimelineBucket(draft.timelineBucket)
    setEducationLevel(draft.educationLevel)
    setIncomeTarget(draft.incomeTarget)
    setUserPostingText(draft.userPostingText)
    setUseMarketEvidence(marketEvidenceAvailable && draft.useMarketEvidence)
    dismissDetectedResumeData()
    setRoleSelectionPrompt(null)
    setInputError('')
    try {
      window.localStorage.setItem(EXAMPLE_SELECTED_STORAGE_KEY, example.id)
      window.localStorage.setItem(
        EXAMPLE_OPTIONS_STORAGE_KEY,
        JSON.stringify(exampleOptions.length > 0 ? exampleOptions.map((item) => item.id) : [example.id])
      )
    } catch {
      // ignore local storage write failures
    }
    await handleGeneratePlan({
      ...draft,
      useMarketEvidence: marketEvidenceAvailable && draft.useMarketEvidence
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

  const handleFetchJobRecommendations = async (options?: { forceRefresh?: boolean }) => {
    const role = (targetRoleText.trim() || primaryCareer?.title || lastSubmittedSnapshot?.targetRole || '').trim()
    const location = locationText.trim() || plannerReport?.transitionReport?.marketSnapshot.location || ''

    if (!role || !location || !user) {
      setJobRecommendationStatus('empty')
      setJobRecommendationItems([])
      setJobRecommendationMessage('Add a target role and location to pull live job matches.')
      return
    }

    setJobRecommendationStatus('loading')
    setJobRecommendationMessage('')

    try {
      const authHeaders = await getSupabaseAuthHeaders()
      const requestHeaders: Record<string, string> = {
        'Content-Type': 'application/json'
      }
      if (typeof authHeaders.Authorization === 'string') {
        requestHeaders.Authorization = authHeaders.Authorization
      }

      const response = await fetch('/api/jobs/ingest', {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify({
          role,
          location,
          country: workRegion === 'ca' || workRegion === 'remote-ca' ? 'ca' : 'us',
          useAdzuna: useMarketEvidence,
          userPostingText: userPostingText.trim(),
          forceRefresh: Boolean(options?.forceRefresh)
        })
      })

      const data = (await response.json().catch(() => null)) as
        | {
            error?: string
            message?: string
            jobs?: Array<{
              id?: string
              title?: string
              company?: string
              location?: string
              description?: string
              sourceUrl?: string
            }>
            postingsCount?: number
            baselineOnly?: boolean
          }
        | null

      if (!response.ok) {
        throw new Error(data?.message || 'Unable to load job recommendations right now.')
      }

      const jobs = Array.isArray(data?.jobs)
        ? data.jobs
            .map((item) => {
              const candidate = item as Record<string, unknown>
              return {
                id: typeof candidate.id === 'string' ? candidate.id : '',
                title: typeof candidate.title === 'string' ? candidate.title : '',
                company: typeof candidate.company === 'string' ? candidate.company : 'Unknown company',
                location: typeof candidate.location === 'string' ? candidate.location : location,
                description: typeof candidate.description === 'string' ? candidate.description : '',
                sourceUrl: typeof candidate.sourceUrl === 'string' ? candidate.sourceUrl : ''
              }
            })
            .filter((item) => item.id && item.title)
        : []

      if (jobs.length === 0) {
        setJobRecommendationStatus('empty')
        setJobRecommendationItems([])
        setJobRecommendationMessage(
          data?.baselineOnly
            ? 'Live job data is thin right now. Try refreshing, widening the location, or pasting a specific posting.'
            : 'No job matches came back yet. Try a broader title, a nearby city, or refresh the search.'
        )
        return
      }

      const cards = buildJobRecommendationCards(
        jobs,
        role,
        location,
        plannerReport?.targetRequirements?.employerSignals ?? []
      )
      setJobRecommendationItems(cards)
      setJobRecommendationStatus('success')
      setJobRecommendationMessage('')
    } catch (error) {
      setJobRecommendationStatus('error')
      setJobRecommendationItems([])
      setJobRecommendationMessage(
        error instanceof Error ? error.message : 'Unable to load job recommendations right now.'
      )
    }
  }

  const handleUseJobRecommendation = async (job: PlannerJobRecommendationCard) => {
    setUserPostingText(job.description)
    await handleGeneratePlan({
      userPostingText: job.description,
      targetRoleText: targetRoleText.trim() || job.title
    })
  }

  const primaryCareer = plannerReport?.suggestedCareers?.[0] ?? null
  const transitionResourceLinks = dedupeLinks([
    ...((primaryCareer?.officialLinks ?? []).filter((link) => link?.url && link?.label)),
    ...((plannerReport?.targetRequirements?.sources ?? []).filter((link) => link?.url && link?.label)),
    ...((plannerReport?.linksResources ?? [])
      .filter((link) => link.type === 'official' && link.url && link.label)
      .map((link) => ({ label: link.label, url: link.url })))
  ]).slice(0, 8)
  const transitionReport = plannerReport?.transitionReport ?? null
  const executionStrategy = plannerReport?.executionStrategy ?? null
  const transitionModeReport = plannerReport?.transitionMode ?? null
  const transitionStructuredPlan = plannerReport?.transitionStructuredPlan ?? null
  const transitionPlanScripts = plannerReport?.transitionPlanScripts ?? null
  const transitionPlanCacheMeta = plannerReport?.transitionPlanCacheMeta ?? null
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
  const primaryRouteTitle = transitionModeReport
    ? transitionModeReport.routes.primary.title
        .replace(/^Primary route:\s*/i, '')
        .replace(/^Primary:\s*/i, '')
        .trim()
    : ''
  const secondaryRouteTitle = transitionModeReport
    ? transitionModeReport.routes.secondary.title
        .replace(/^Secondary route:\s*/i, '')
        .replace(/^Secondary:\s*/i, '')
        .trim()
    : ''
  const contingencyRouteTitle = transitionModeReport
    ? transitionModeReport.routes.contingency.title
        .replace(/^Contingency route:\s*/i, '')
        .replace(/^Contingency:\s*/i, '')
        .trim()
    : ''
  const beforeHireRequirements =
    transitionStructuredPlan?.narrative_sections?.credentials_you_need?.[0]?.bullets?.slice(0, 3) ??
    transitionStructuredPlan?.required_certifications?.slice(0, 3) ??
    []
  const next7DayActions =
    transitionModeReport?.roadmapGuide?.next7Days?.slice(0, 3) ??
    transitionModeReport?.gaps.first3Steps?.slice(0, 3) ??
    []
  const transitionQuickWins = transitionModeReport
    ? sharedDedupeBullets(
        transitionModeReport.gaps.strengths.filter((item) => !isPersonalIdentifier(item)),
        4
      )
    : []
  const transitionPrimaryGaps = transitionModeReport
    ? sharedDedupeBullets(
        transitionModeReport.gaps.missing.filter((item) => !isPersonalIdentifier(item)),
        4
      )
    : []
  const transitionSkillMapStrengths = transitionModeReport
    ? excludeExistingBullets(
        transitionModeReport.gaps.strengths.filter((item) => !isPersonalIdentifier(item)),
        transitionQuickWins,
        4
      )
    : []
  const transitionSkillMapMissing = transitionModeReport
    ? excludeExistingBullets(
        transitionModeReport.gaps.missing.filter((item) => !isPersonalIdentifier(item)),
        transitionPrimaryGaps,
        4
      )
    : []
  const currentProfileSignals = extractProfileSignals({
    experienceText,
    explicitSkills: skills,
    explicitCertifications: resumeStructuredSnapshot.certifications
  })
  const missingHiringRequirements = buildMissingHiringRequirements({
    targetRequirements: plannerReport?.targetRequirements,
    transitionReport,
    currentCertifications: currentProfileSignals.certifications,
    educationLevel,
    resourceLinks: transitionResourceLinks
  })
  const proofBuilderDefinition = transitionModeReport?.definitions?.proofBuilder ?? null
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
  const transitionChannelPriorities = transitionModeReport
    ? buildTransitionChannelPriorities(
        transitionModeReport.routes.primary.title,
        transitionModeReport.routes.primary.reason
      )
    : []
  const employerRedFlags = executionStrategy
    ? sharedDedupeBullets(
        executionStrategy.whereYouStandNow.competitiveDisadvantages
          .map((item) => item.reason || item.label)
          .filter(Boolean),
        4
      )
    : []
  const criticalGapDetails = executionStrategy
    ? sharedDedupeBullets(
        executionStrategy.whereYouStandNow.missingMandatoryRequirements
          .map((item) => item.reason || item.label)
          .filter(Boolean),
        4
      )
    : []
  const mergedBlockerFixes: BlockerFix[] = (() => {
    const pairs: BlockerFix[] = []
    const seen = new Set<string>()
    const mitigations = transitionModeReport?.reality.mitigations ?? []

    const pushPair = (issue: string, fix: string) => {
      const normalizedIssue = normalizeBulletKey(issue)
      if (!normalizedIssue || seen.has(normalizedIssue)) return
      seen.add(normalizedIssue)
      pairs.push({
        issue: issue.trim(),
        fix: fix.trim()
      })
    }

    for (const item of missingHiringRequirements) {
      pushPair(item.title, item.detail || 'Close this requirement early to avoid getting filtered out.')
    }

    criticalGapDetails.forEach((issue, index) => {
      pushPair(
        issue,
        mitigations[index] ||
          transitionPrimaryGaps[index] ||
          'Turn this into one concrete weekly action with visible proof.'
      )
    })

    employerRedFlags.forEach((issue, index) => {
      pushPair(
        issue,
        mitigations[index] || 'Adjust your channel mix and tighten positioning based on real employer feedback.'
      )
    })

    if (pairs.length === 0) {
      transitionPrimaryGaps.slice(0, 4).forEach((issue, index) => {
        pushPair(
          issue,
          mitigations[index] || 'Schedule one concrete step this week and save proof that it moved.'
        )
      })
    }

    return pairs.slice(0, 4)
  })()
  const roadmapTabs = buildDashboardRoadmapTabs({
    plannerReport,
    transitionModeReport,
    targetRole: targetRoleText.trim() || lastSubmittedSnapshot?.targetRoleInput || '',
    location: locationText.trim()
  })
  const activeRoadmap = roadmapTabs.find((item) => item.key === activeRoadmapTab) ?? roadmapTabs[0] ?? null
  const activeWizardMeta = WIZARD_STEPS[activeWizardStep]
  const canGoBackWizard = activeWizardStep > 0
  const canGoNextWizard = activeWizardStep < WIZARD_STEPS.length - 1
  const recommendedRoleSections = plannerReport
    ? buildRecommendedRoleSections(
        plannerReport.suggestedCareers,
        currentRoleText.trim() || lastSubmittedSnapshot?.currentRoleInput || '',
        currentRoleResolution?.matched?.occupationId ?? currentRoleSelectedMatch?.occupationId ?? null,
        targetRoleText.trim() || lastSubmittedSnapshot?.targetRoleInput || '',
        targetRoleResolution?.matched?.occupationId ?? targetRoleSelectedMatch?.occupationId ?? null,
        currentRoleResolution?.suggestions.map((item) => ({ title: item.title, code: item.code })) ?? []
      )
    : []
  const assistiveSuggestedTargetSections = buildRecommendedRoleSections(
    plannerReport?.suggestedCareers ?? [],
    currentRoleText.trim() || lastSubmittedSnapshot?.currentRoleInput || '',
    currentRoleResolution?.matched?.occupationId ?? currentRoleSelectedMatch?.occupationId ?? null,
    targetRoleText.trim() || lastSubmittedSnapshot?.targetRoleInput || '',
    targetRoleResolution?.matched?.occupationId ?? targetRoleSelectedMatch?.occupationId ?? null,
    currentRoleResolution?.suggestions.map((item) => ({ title: item.title, code: item.code })) ?? []
  )
  const assistiveSuggestedTargetPool = assistiveSuggestedTargetSections.flatMap((section) => section.roles)
  const assistiveSuggestedTargets =
    assistiveSuggestedTargetPool.length <= 8
      ? assistiveSuggestedTargetPool
      : [
          ...assistiveSuggestedTargetPool.slice(
            suggestedTargetShuffle % assistiveSuggestedTargetPool.length
          ),
          ...assistiveSuggestedTargetPool.slice(
            0,
            suggestedTargetShuffle % assistiveSuggestedTargetPool.length
          )
        ].slice(0, 8)
  const canAnnualizeEarnings = transitionModeReport?.earnings.some((stage) =>
    stage.unit.toLowerCase().includes('/hour')
  ) ?? false
  const fullQualificationTimeline =
    plannerReport?.careerPathwayProfile?.timeline?.time_to_full_qualification
  const fullQualificationNote =
    typeof fullQualificationTimeline?.min_months === 'number' &&
    typeof fullQualificationTimeline?.max_months === 'number'
      ? `Full qualification is typically ${fullQualificationTimeline.min_months}-${fullQualificationTimeline.max_months} months.`
      : null
  const weeklyPriorities = (plannerReport?.transitionSections?.roadmapPlan.zeroToTwoWeeks ?? []).slice(0, 2)
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
  const generateButtonLabel = user
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
  useEffect(() => {
    if (v3DashboardModel.missingFields.length === 0) return
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[career-switch-planner] missing_v3_fields', v3DashboardModel.missingFields)
    }
  }, [v3DashboardModel.missingFields])
  const friendlyDatasetNames = (plannerReport?.dataTransparency.datasetsUsed ?? [])
    .map((dataset) => FRIENDLY_DATASET_NAMES[dataset] ?? dataset.replaceAll('_', ' '))
  const wageSourceDateSummary = Array.from(
    new Set(
      (plannerReport?.suggestedCareers ?? [])
        .map((career) =>
          career.salary.native?.sourceName && career.salary.native?.asOfDate
            ? `${career.salary.native.sourceName} (${career.salary.native.asOfDate})`
            : null
        )
        .filter((item): item is string => Boolean(item))
    )
  )
  const generatedResumeToolkitText = outreachResumeBullets.map((item) => `- ${item}`).join('\n')
  const generatedCallToolkitText =
    transitionPlanScripts?.call ?? transitionModeReport?.execution.outreachTemplates.call ?? ''
  const generatedEmailToolkitText =
    transitionPlanScripts?.email ?? transitionModeReport?.execution.outreachTemplates.email ?? ''
  const isToolkitExpanded = outreachToolkitOpen || isPrintMode
  const renderMissingHiringRequirementsCard = (className: string) => {
    if (missingHiringRequirements.length === 0) return null

    return (
      <div className={className}>
        <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">
          Still likely missing
        </p>
        <p className="mt-2 text-sm font-semibold text-text-primary">
          Education or credentials most employers screen for first
        </p>
        <p className="mt-1 text-sm text-text-secondary">
          Close these early so you do not get filtered out before a real conversation.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {missingHiringRequirements.map((item) => (
            <div
              key={item.key}
              className="rounded-xl border border-border-light bg-surface p-3"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[1.1px] text-text-tertiary">
                {item.kind === 'education' ? 'Education baseline' : 'Required credential'}
              </p>
              <p className="mt-1 text-sm font-semibold text-text-primary">{item.title}</p>
              <p className="mt-1 text-xs leading-[1.6] text-text-secondary">{item.detail}</p>
              {item.link ? (
                <a
                  href={item.link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex text-xs font-semibold text-accent hover:text-accent/80"
                >
                  Where to get it
                </a>
              ) : null}
            </div>
          ))}
        </div>
        {!missingHiringRequirements.some((item) => item.link) && transitionResourceLinks.length > 0 ? (
          <div className="mt-4">
            <p className="text-[11px] font-semibold uppercase tracking-[1.1px] text-text-tertiary">
              Official sources
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {transitionResourceLinks.slice(0, 3).map((link) => (
                <a
                  key={`missing-requirement-link-${link.label}-${link.url}`}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-pill border border-border-light bg-surface px-3 py-1 text-xs font-medium text-text-primary hover:border-accent/20 hover:text-accent"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    )
  }

  useEffect(() => {
    if (!user || !isTransitionMode) return
    const role = (targetRoleText.trim() || primaryCareer?.title || lastSubmittedSnapshot?.targetRole || '').trim()
    const location = (locationText.trim() || plannerReport?.transitionReport?.marketSnapshot.location || '').trim()
    if (!role || !location) return

    const requestKey = `${role}|${location}`
    if (lastJobRecommendationKeyRef.current === requestKey) return
    lastJobRecommendationKeyRef.current = requestKey
    void handleFetchJobRecommendations()
  }, [
    user,
    isTransitionMode,
    targetRoleText,
    primaryCareer?.title,
    lastSubmittedSnapshot?.targetRole,
    locationText,
    plannerReport?.transitionReport?.marketSnapshot.location
  ])

  useEffect(() => {
    if (!transitionModeReport) return
    setActiveRoadmapTab('0-30')
  }, [transitionModeReport])

  useEffect(() => {
    setResumeToolkitDraft(generatedResumeToolkitText)
    setCallToolkitDraft(generatedCallToolkitText)
    setEmailToolkitDraft(generatedEmailToolkitText)
  }, [generatedResumeToolkitText, generatedCallToolkitText, generatedEmailToolkitText])

  const handleDownloadOutreachTemplate = () => {
    const payload = [
      'Career Switch Planner Outreach Toolkit',
      '',
      'Resume prompt:',
      resumeToolkitDraft || '-',
      '',
      'Email template:',
      emailToolkitDraft || '-',
      '',
      'Call script:',
      callToolkitDraft || '-'
    ].join('\n')

    const blob = new Blob([payload], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'career-switch-planner-toolkit.txt'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const handleSavePlanSnapshot = () => {
    try {
      window.localStorage.setItem(
        'career-switch-planner-v3-last-plan',
        JSON.stringify({
          generatedAt: lastGeneratedAt,
          currentRole: heroCurrentRoleLabel,
          targetRole: heroTargetRoleLabel,
          locationText,
          timelineBucket
        })
      )
    } catch {
      // ignore storage failures
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
      advanceWizardAfterRoleSelection(currentRoleText, suggestion.title)
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
    onSetWorkRegion: setWorkRegion,
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
    ? 'max-w-wide'
    : useWidePlannerShell
      ? 'max-w-content'
      : 'max-w-tool'

  return (
    <>
      <ToolHero className="print-hidden pb-12 pt-16">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Badge className="gap-1.5">{usageLabel(usage, previewLocked, plan)}</Badge>
          <Badge className="gap-1.5">Province-aware</Badge>
          <Badge className="gap-1.5">Resume Upload (Pro)</Badge>
        </div>
        <h1 className="max-w-[760px] text-[40px] font-bold leading-tight text-text-primary md:text-[48px]">
          Career Switch Planner
        </h1>
        <p className="max-w-[720px] text-base leading-[1.7] text-text-secondary md:text-lg">
          Build a structured Canadian transition roadmap with clearer timelines, province-aware context, and practical weekly next steps.
        </p>
      </ToolHero>

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
                faqItems={careerSwitchFaqs}
                relatedTools={careerSwitchMoreTools}
                resumeToolkitDraft={resumeToolkitDraft}
                emailToolkitDraft={emailToolkitDraft}
                callToolkitDraft={callToolkitDraft}
                onEditInputs={() => setIsEditDrawerOpen(true)}
                onRegenerate={() => void handleGeneratePlan()}
                onStartNewPlan={handleStartNewPlan}
                onSelectAlternativeRole={(title) =>
                void handlePlanRecommendedRole(title, { autoGenerate: true, nextStep: 2 })
              }
              onCopyEmail={() => void handleCopyToolkitSection('email', emailToolkitDraft)}
              onCopyResumePrompt={() =>
                void handleCopyToolkitSection('resume', resumeToolkitDraft)
              }
              onDownloadTemplate={handleDownloadOutreachTemplate}
              onExportPlan={handlePrintReport}
              onDownloadPdf={handlePrintReport}
              onSavePlan={handleSavePlanSnapshot}
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
