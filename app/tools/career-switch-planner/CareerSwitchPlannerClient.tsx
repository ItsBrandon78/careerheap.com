'use client'

import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import Badge from '@/components/Badge'
import Button from '@/components/Button'
import Card from '@/components/Card'
import ToolCard from '@/components/ToolCard'
import {
  DetectedSectionsChips,
  DropzoneUpload,
  FAQAccordion,
  GapsList,
  InputCard,
  LockedPanel,
  ParseProgress,
  PrimaryButton,
  ReframeList,
  ResumeExtractionReviewCard,
  ResourcesCard,
  RoadmapSteps,
  RoleAutocomplete,
  ScoreCard,
  SelectField,
  SkillsChipsInput,
  SkillsChips,
  Toggle,
  ToolHero
} from '@/components/career-switch-planner/CareerSwitchPlannerComponents'
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
import { getSupabaseAuthHeaders } from '@/lib/supabase/authHeaders'

type PlannerState = 'idle' | 'loading' | 'results'
type UploadState = 'idle' | 'parsing' | 'success' | 'error'
type OcrCapabilityMode = 'native' | 'fallback' | 'unavailable'
type OcrCapabilityStatus = 'idle' | 'loading' | 'ready' | 'error'
type WizardStep = 0 | 1 | 2
type RoadmapTabKey = '0-30' | '30-90' | '3-12'
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
  { value: 'us', label: 'United States' },
  { value: 'ca', label: 'Canada' },
  { value: 'remote-us', label: 'Remote (US)' },
  { value: 'remote-ca', label: 'Remote (Canada)' },
  { value: 'either', label: 'Open to either (US/CA)' }
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
            Resolved to:{' '}
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
            {confidenceLabel} ({(matched?.confidence ?? 0).toFixed(2)})
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
  if (value === 'either') return 'Open to either (US/CA)'
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
  const [activeWizardStep, setActiveWizardStep] = useState<WizardStep>(0)
  const [activeRoadmapTab, setActiveRoadmapTab] = useState<RoadmapTabKey>('0-30')
  const [loadingStageIndex, setLoadingStageIndex] = useState(0)
  const [outreachToolkitOpen, setOutreachToolkitOpen] = useState(false)
  const [copiedToolkitSection, setCopiedToolkitSection] = useState<string | null>(null)
  const [isPrintMode, setIsPrintMode] = useState(false)
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
  const [resumeStructuredSnapshot, setResumeStructuredSnapshot] = useState<ResumeStructuredSnapshot>({
    certifications: []
  })
  const [pendingResumeSkills, setPendingResumeSkills] = useState<string[]>([])
  const [pendingResumeCertifications, setPendingResumeCertifications] = useState<string[]>([])
  const [pendingResumeRoleCandidate, setPendingResumeRoleCandidate] = useState<string | null>(null)
  const [uploadState, setUploadState] = useState<UploadState>('idle')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadError, setUploadError] = useState('')
  const [uploadWarning, setUploadWarning] = useState('')
  const [uploadStats, setUploadStats] = useState<{ meaningfulChars: number } | null>(null)
  const [ocrCapabilityStatus, setOcrCapabilityStatus] = useState<OcrCapabilityStatus>('idle')
  const [ocrCapabilities, setOcrCapabilities] = useState<ResumeOcrCapabilities | null>(null)
  const [workRegion, setWorkRegion] = useState<WorkRegionValue>('remote-us')
  const [locationText, setLocationText] = useState('Remote (US)')
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
    if (!locationTouched) {
      setLocationText(toLocationFromWorkRegion(workRegion))
    }
  }, [locationTouched, workRegion])

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
  }

  const dismissDetectedResumeData = () => {
    setPendingResumeSkills([])
    setPendingResumeCertifications([])
    setPendingResumeRoleCandidate(null)
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
    const hasDraftMinimumInput =
      draft.currentRoleText.trim().length > 0 ||
      draft.experienceText.trim().length > 0 ||
      draft.skills.length >= 3

    if (isLocked || isUsageLoading) {
      return
    }

    if (!user) {
      setInputError('Sign in to generate and save your plan.')
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

      if (response.status === 401 && data?.error === 'AUTH_REQUIRED') {
        setInputError(data.message || 'Sign in required before generating a plan.')
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
      setRoleSelectionPrompt(null)
      setEarningsView('base')
      const resolvedCurrentRole =
        data?.report?.roleResolution?.current?.matched?.title ??
        (draft.currentRoleText.trim() || currentRoleFallback)
      const resolvedTargetRole = draft.recommendMode
        ? ''
        : data?.report?.roleResolution?.target?.matched?.title ?? targetRoleValue
      setLastSubmittedSnapshot({
        currentRole: resolvedCurrentRole,
        targetRole: resolvedTargetRole,
        currentRoleInput: draft.currentRoleText.trim() || currentRoleFallback,
        targetRoleInput: targetRoleValue,
        recommendMode: draft.recommendMode,
        timelineBucket: draft.timelineBucket
      })
      setPlannerState('results')
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

  const handlePlanRecommendedRole = async (nextTargetRole: string) => {
    setShowSuggestedTargets(false)
    setTargetRoleText(nextTargetRole)
    setTargetRoleSelectedMatch(null)
    setRoleSelectionPrompt(null)
    setInputError('')
    await handleGeneratePlan({
      recommendMode: false,
      targetRoleText: nextTargetRole,
      targetRoleOccupationId: null
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
  const proofBuilderDefinition = transitionModeReport?.definitions?.proofBuilder ?? null
  const outreachResumeBullets = (
    plannerReport?.resumeReframe?.length
      ? plannerReport.resumeReframe
      : plannerResult?.reframes ?? []
  )
    .map((item) => item.after.trim())
    .filter(Boolean)
    .slice(0, 4)
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
  const currentRoleResolution = plannerReport?.roleResolution?.current ?? null
  const targetRoleResolution = plannerReport?.roleResolution?.target ?? null
  const currentProfileSignals = extractProfileSignals({
    experienceText,
    explicitSkills: skills,
    explicitCertifications: resumeStructuredSnapshot.certifications
  })
  const roadmapTabs = transitionModeReport
    ? [
        {
          key: '0-30' as const,
          label: '0-30 Days',
          summary: ROADMAP_TABS[0].summary,
          items:
            plannerReport?.transitionSections?.roadmapPlan.zeroToTwoWeeks.map((item) => ({
              title: item.action,
              detail: `Tied to ${item.tiedRequirement}`
            })) ??
            transitionModeReport.plan90[0]?.tasks.map((task) => ({
              title: task,
              detail: transitionModeReport.plan90[0]?.weeklyTargets[0] ?? 'Start with one measurable output.'
            })) ??
            []
        },
        {
          key: '30-90' as const,
          label: '30-90 Days',
          summary: ROADMAP_TABS[1].summary,
          items:
            plannerReport?.transitionSections?.roadmapPlan.oneToThreeMonths.map((item) => ({
              title: item.action,
              detail: `Tied to ${item.tiedRequirement}`
            })) ??
            transitionModeReport.plan90[1]?.tasks.map((task, index) => ({
              title: task,
              detail:
                transitionModeReport.plan90[1]?.weeklyTargets[index] ??
                transitionModeReport.plan90[1]?.weeklyTargets[0] ??
                'Keep weekly outputs consistent.'
            })) ??
            []
        },
        {
          key: '3-12' as const,
          label: '3-12 Months',
          summary: ROADMAP_TABS[2].summary,
          items:
            plannerReport?.transitionSections?.roadmapPlan.threeToTwelveMonths.map((item) => ({
              title: item.action,
              detail: `Tied to ${item.tiedRequirement}`
            })) ??
            [
              ...((plannerReport?.transitionSections?.roadmapPlan.strongCandidatePath ?? []).map((item) => ({
                title: item,
                detail: 'Build toward strong-candidate positioning.'
              })) ?? []),
              ...(transitionModeReport.plan90[2]?.tasks.map((task, index) => ({
                title: task,
                detail:
                  transitionModeReport.plan90[2]?.weeklyTargets[index] ??
                  transitionModeReport.plan90[2]?.weeklyTargets[0] ??
                  'Compound the strongest signal each week.'
              })) ?? [])
            ].slice(0, 5)
        }
      ]
    : []
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
  const weeklyPriorities = (plannerReport?.transitionSections?.roadmapPlan.zeroToTwoWeeks ?? []).slice(0, 2)
  const hasPlannerResults = plannerState === 'results' && Boolean(plannerResult)
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
  const isToolkitExpanded = outreachToolkitOpen || isPrintMode

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

  return (
    <>
      <ToolHero className="print-hidden">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Badge className="gap-1.5">{usageLabel(usage, previewLocked, plan)}</Badge>
          <Badge className="gap-1.5">Resume Upload (Pro)</Badge>
        </div>
        <h1 className="text-[34px] font-bold leading-tight text-text-primary md:text-[40px]">
          Career Switch Planner
        </h1>
        <p className="max-w-[680px] text-base leading-[1.6] text-text-secondary md:text-lg">
          Transition mode turns your background into a decisive execution plan with timelines, routes, and weekly outputs.
        </p>
        <p className="text-[13px] text-text-tertiary">
          Free includes 3 lifetime analyses total.
        </p>
        <p className="text-[13px] text-text-tertiary">
          Pro includes unlimited analyses, resume parsing, full roadmap depth, and resume reframe output.
        </p>
      </ToolHero>

      <section className="print-hidden px-4 py-16 lg:px-[340px]">
        <InputCard>
          <div className="space-y-5">
            <div className="rounded-2xl border border-border-light bg-bg-secondary p-4 md:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">
                    {activeWizardMeta.eyebrow}
                  </p>
                  <h2 className="mt-2 text-xl font-bold text-text-primary md:text-2xl">
                    {activeWizardMeta.title}
                  </h2>
                  <p className="mt-2 max-w-[54ch] text-sm leading-[1.7] text-text-secondary">
                    {activeWizardMeta.helper}
                  </p>
                </div>
                <Badge variant="default">{activeWizardStep + 1} / {WIZARD_STEPS.length}</Badge>
              </div>
              <div className="mt-4">
                <div className="h-2 rounded-pill bg-surface">
                  <div
                    className="h-full rounded-pill bg-accent transition-all duration-300"
                    style={{ width: `${((activeWizardStep + 1) / WIZARD_STEPS.length) * 100}%` }}
                  />
                </div>
                <div className="mt-3 grid gap-2 md:grid-cols-3">
                  {WIZARD_STEPS.map((step) => (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => setActiveWizardStep(step.id)}
                      className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                        activeWizardStep === step.id
                          ? 'border-accent bg-surface'
                          : 'border-border-light bg-surface/60 hover:border-accent/40'
                      }`}
                    >
                      <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">
                        {step.eyebrow}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-text-primary">{step.title}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {activeWizardStep === 0 ? (
              <div className="planner-animate-in space-y-3">
                <h2 className="text-base font-bold text-text-primary">Role setup</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <RoleAutocomplete
                  id="current-role"
                  label="Current Role"
                  value={currentRoleText}
                  placeholder="Type your current role"
                  region={roleAutocompleteRegion}
                  onChange={handleCurrentRoleInputChange}
                  onSuggestionSelect={(suggestion) => {
                    setRoleSelectionPrompt(null)
                    setCurrentRoleSelectedMatch({
                      occupationId: suggestion.occupationId,
                      title: suggestion.title,
                      confidence: suggestion.confidence ?? 0,
                      matchedBy: suggestion.matchedBy ?? 'fallback'
                    })
                    if (targetRoleText.trim()) {
                      void handleGeneratePlan({
                        currentRoleText: suggestion.title,
                        currentRoleOccupationId: suggestion.occupationId,
                        recommendMode: false
                      })
                    }
                  }}
                />
                <RoleAutocomplete
                  id="target-role"
                  label="Target Role"
                  value={targetRoleText}
                  placeholder="Type your target role"
                  region={roleAutocompleteRegion}
                  onChange={handleTargetRoleInputChange}
                  onSuggestionSelect={(suggestion) => {
                    setRoleSelectionPrompt(null)
                    setTargetRoleSelectedMatch({
                      occupationId: suggestion.occupationId,
                      title: suggestion.title,
                      confidence: suggestion.confidence ?? 0,
                      matchedBy: suggestion.matchedBy ?? 'fallback'
                    })
                    if (currentRoleText.trim()) {
                      void handleGeneratePlan({
                        targetRoleText: suggestion.title,
                        targetRoleOccupationId: suggestion.occupationId,
                        recommendMode: false
                      })
                    }
                  }}
                />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSuggestedTargets((previous) => !previous)}
                >
                  {showSuggestedTargets ? 'Hide suggested targets' : 'Show suggested targets'}
                </Button>
                {showSuggestedTargets ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSuggestedTargetShuffle((previous) => previous + 1)}
                  >
                    Shuffle
                  </Button>
                ) : null}
                <p className="text-xs text-text-secondary">
                  Not sure what to aim for? Pick a suggestion below.
                </p>
              </div>
              {showSuggestedTargets ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {assistiveSuggestedTargets.length === 0 ? (
                    <div className="rounded-lg border border-border-light bg-surface p-4 text-sm text-text-secondary md:col-span-2">
                      Add your current role first, then use suggestions to narrow the target.
                    </div>
                  ) : null}
                  {assistiveSuggestedTargets.map((role) => (
                    <button
                      key={`assistive-${role.title}`}
                      type="button"
                      className="rounded-lg border border-border-light bg-surface p-4 text-left transition hover:border-accent/40 hover:bg-bg-secondary"
                      onClick={() => void handlePlanRecommendedRole(role.title)}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-text-primary">{role.title}</p>
                        <span className="rounded-pill border border-border px-2 py-0.5 text-[11px] text-text-tertiary">
                          {role.difficulty} | {role.transitionTime}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-text-secondary">{role.why[0] ?? 'Suggested from your current role.'}</p>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            ) : null}

            {activeWizardStep === 1 ? (
              <div className="planner-animate-in space-y-3">
                <h2 className="text-base font-bold text-text-primary">Background details</h2>
              <SkillsChipsInput
                id="skills-input"
                label="Skills"
                skills={skills}
                suggestions={FALLBACK_SKILL_SUGGESTIONS}
                suggestionEndpoint="/api/career-map/skills"
                placeholder="Start typing (e.g., stakeholder management, electrical safety)"
                helperText="Autocomplete uses matched skills from our dataset. Custom skills are allowed."
                onChange={setSkills}
              />

              <label className="flex flex-col gap-1.5">
                <span className="text-[13px] font-semibold text-text-primary">
                  Add measurable accomplishments (optional)
                </span>
                <textarea
                  rows={6}
                  value={experienceText}
                  onChange={(event) => setExperienceText(event.target.value)}
                  placeholder="Example: Led onboarding for 12 teammates, reduced ramp time by 18%, and improved retention by 14%."
                  className="w-full rounded-md border border-border bg-bg-secondary p-3 text-sm leading-[1.6] text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none"
                />
                <span className="text-xs text-text-tertiary">
                  Numbers help (team size, $ impact, time saved, % improved).
                </span>
              </label>

              <div className="rounded-md border border-border bg-bg-secondary p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-text-primary">Resume Upload (Pro)</p>
                  <Badge variant={ocrBadge.variant}>{ocrBadge.label}</Badge>
                </div>
                {ocrBadge.detail ? (
                  <p className="mt-1 text-xs text-text-tertiary">{ocrBadge.detail}</p>
                ) : null}
                {!isProUser ? (
                  <>
                    <p className="mt-2 text-sm text-text-secondary">
                      Upgrade to upload PDF/DOCX and auto-fill your background.
                    </p>
                    <div className="mt-3">
                      <Link href="/pricing">
                        <Button variant="outline">Upgrade to unlock upload</Button>
                      </Link>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mt-3">
                      <DropzoneUpload onFileSelected={parseFile} />
                    </div>
                    {uploadState === 'parsing' ? (
                      <div className="mt-3">
                        <ParseProgress progress={uploadProgress} />
                      </div>
                    ) : null}
                    {uploadState === 'success' ? (
                      <div className="mt-3 space-y-2">
                        {uploadWarning ? (
                          <p className="rounded-md border border-warning/25 bg-warning-light px-3 py-2 text-sm text-text-secondary">
                            {uploadWarning}
                          </p>
                        ) : null}
                        <p className="text-xs text-text-tertiary">
                          Parsed text was inserted into your experience summary.
                          {uploadStats ? ` Characters extracted: ${uploadStats.meaningfulChars}.` : ''}
                        </p>
                        <DetectedSectionsChips detected={detectedSections} />
                        <ResumeExtractionReviewCard
                          detectedRole={pendingResumeRoleCandidate}
                          skills={pendingResumeSkills}
                          certifications={pendingResumeCertifications}
                          onRemoveSkill={(value) =>
                            setPendingResumeSkills((previous) => previous.filter((item) => item !== value))
                          }
                          onRemoveCertification={(value) =>
                            setPendingResumeCertifications((previous) => previous.filter((item) => item !== value))
                          }
                          onApply={applyDetectedResumeData}
                          onDismiss={dismissDetectedResumeData}
                        />
                      </div>
                    ) : null}
                    {uploadState === 'error' ? (
                      <p className="mt-3 rounded-md border border-error bg-error-light px-3 py-2 text-sm text-error">
                        {uploadError || 'Upload a DOCX or searchable PDF, then try again.'}
                      </p>
                    ) : null}
                  </>
                )}
              </div>

              <SelectField
                id="planner-education"
                label="Education Level"
                value={educationLevel}
                onChange={(value) => setEducationLevel(value as EducationLevelValue)}
                options={EDUCATION_OPTIONS}
              />
            </div>
            ) : null}

            {activeWizardStep === 2 ? (
              <div className="planner-animate-in space-y-3">
                <h2 className="text-base font-bold text-text-primary">Constraints and preferences</h2>
              <label className="flex flex-col gap-1.5">
                <span className="text-[13px] font-semibold text-text-primary">Target location</span>
                <input
                  type="text"
                  value={locationText}
                  onChange={(event) => {
                    setLocationTouched(true)
                    setLocationText(event.target.value)
                  }}
                  placeholder="City, region, or country (e.g., Toronto, ON)"
                  className="w-full rounded-md border border-border bg-bg-secondary px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none"
                />
                <span className="text-xs text-text-tertiary">
                  Required for market-demand matching and employer-evidence requirements.
                </span>
              </label>
              <div className="grid gap-3 md:grid-cols-3">
                <SelectField
                  id="planner-work-region"
                  label="Work Region"
                  value={workRegion}
                  onChange={(value) => setWorkRegion(value as WorkRegionValue)}
                  options={WORK_REGION_OPTIONS}
                />
                <SelectField
                  id="planner-timeline"
                  label="Timeline"
                  value={timelineBucket}
                  onChange={(value) => setTimelineBucket(value as TimelineBucketValue)}
                  options={TIMELINE_OPTIONS}
                />
                <SelectField
                  id="planner-income-target"
                  label="Income Target"
                  value={incomeTarget}
                  onChange={(value) => setIncomeTarget(value as IncomeTargetValue)}
                  options={INCOME_TARGET_OPTIONS}
                />
              </div>

              <div className="rounded-md border border-border bg-bg-secondary p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-text-primary">4) Employer Evidence</p>
                  {marketEvidenceAvailable ? (
                    <Toggle
                      checked={useMarketEvidence}
                      onChange={setUseMarketEvidence}
                      label="Use market evidence (beta)"
                    />
                  ) : (
                    <Badge variant="warning">Market evidence unavailable</Badge>
                  )}
                </div>
                <p className="mt-2 text-xs text-text-tertiary">
                  Paste a target posting for highest-fidelity requirements. If you leave this
                  blank, market evidence searches live postings for your target role and location,
                  then retries with close GPT search variants if direct matches are thin.
                </p>
                <label className="mt-3 flex flex-col gap-1.5">
                  <span className="text-[13px] font-semibold text-text-primary">
                    Paste target job posting (optional)
                  </span>
                  <textarea
                    rows={5}
                    value={userPostingText}
                    onChange={(event) => setUserPostingText(event.target.value)}
                    placeholder="Paste full requirements section from a posting."
                    className="w-full rounded-md border border-border bg-surface p-3 text-sm leading-[1.6] text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none"
                  />
                </label>
              </div>
            </div>
            ) : null}
          </div>

          {!hasMinimumRequiredInput ? (
            <p className="mt-4 rounded-md border border-warning/25 bg-warning-light px-3 py-2 text-sm text-text-secondary">
              Add either a current role, an experience summary, or at least 3 skills to enable generation.
            </p>
          ) : null}
          {(pendingResumeSkills.length > 0 || pendingResumeCertifications.length > 0 || pendingResumeRoleCandidate) ? (
            <p className="mt-4 rounded-md border border-warning/25 bg-warning-light px-3 py-2 text-sm text-text-secondary">
              Resume detections are waiting for review. Apply them if you want them included in scoring.
            </p>
          ) : null}
          {inputError && (
            <p className="mt-4 rounded-md border border-error bg-error-light px-3 py-2 text-sm text-error">
              {inputError}
            </p>
          )}
          {roleSelectionPrompt ? (
            <Card className="mt-4 p-4">
              <p className="text-sm font-semibold text-text-primary">
                Choose your closest match for the {roleSelectionPrompt.role} role
              </p>
              <p className="mt-1 text-xs text-text-secondary">
                {roleSelectionPrompt.message ||
                  `We found multiple close matches for "${roleSelectionPrompt.input || 'your entry'}". Pick the closest occupation so the plan stays on the right pathway.`}
              </p>
              <div className="mt-3 grid gap-2">
                {roleSelectionPrompt.alternatives.map((option) => (
                  <button
                    key={`${roleSelectionPrompt.role}-${option.occupationId}`}
                    type="button"
                    className="flex items-center justify-between rounded-md border border-border bg-bg-secondary px-3 py-2 text-left text-sm text-text-primary hover:border-accent hover:bg-surface"
                    onClick={() => {
                      const override =
                        roleSelectionPrompt.role === 'current'
                          ? {
                              currentRoleText: option.title,
                              currentRoleOccupationId: option.occupationId
                            }
                          : {
                              targetRoleText: option.title,
                              targetRoleOccupationId: option.occupationId
                            }
                      if (roleSelectionPrompt.role === 'current') {
                        setCurrentRoleText(option.title)
                        setCurrentRoleSelectedMatch({
                          occupationId: option.occupationId,
                          title: option.title,
                          confidence: option.confidence,
                          matchedBy: 'manual_selection'
                        })
                      } else {
                        setTargetRoleText(option.title)
                        setTargetRoleSelectedMatch({
                          occupationId: option.occupationId,
                          title: option.title,
                          confidence: option.confidence,
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
                    }}
                  >
                    <span>
                      {option.title}
                      {option.stage ? (
                        <span className="ml-2 text-xs text-text-tertiary">
                          ({option.stage}{option.specialization ? ` | ${option.specialization}` : ''})
                        </span>
                      ) : null}
                    </span>
                    <span className="text-xs text-text-tertiary">
                      {scoreToLabel(option.confidence)} ({option.confidence.toFixed(2)})
                    </span>
                  </button>
                ))}
              </div>
            </Card>
          ) : null}

          <div className="mt-5 flex flex-col gap-3 border-t border-border-light pt-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {canGoBackWizard ? (
                <Button
                  variant="ghost"
                  onClick={() => setActiveWizardStep((previous) => Math.max(0, previous - 1) as WizardStep)}
                >
                  Back
                </Button>
              ) : null}
              {canGoNextWizard ? (
                <Button
                  variant="outline"
                  onClick={() =>
                    setActiveWizardStep((previous) =>
                      Math.min(WIZARD_STEPS.length - 1, previous + 1) as WizardStep
                    )
                  }
                >
                  Next
                </Button>
              ) : null}
              <p className="text-xs text-text-tertiary">
                {activeWizardStep < 2
                  ? 'The final generate button appears after you review constraints.'
                  : 'We combine your inputs, employer evidence, and baseline occupation datasets to generate this report.'}
              </p>
            </div>
            {activeWizardStep === 2 ? (
              <PrimaryButton
                onClick={() => void handleGeneratePlan()}
                isLoading={plannerState === 'loading'}
                className="md:min-w-[280px]"
                disabled={
                  isUsageLoading ||
                  plannerState === 'loading' ||
                  !user ||
                  Boolean(roleSelectionPrompt) ||
                  !hasMinimumRequiredInput ||
                  !locationText.trim() ||
                  (!recommendMode && !targetRoleText.trim())
                }
              >
                {user ? 'Generate My Data-Backed Plan' : 'Sign In to Generate'}
              </PrimaryButton>
            ) : null}
          </div>

          {activeWizardStep === 0 && exampleOptions.length > 0 ? (
            <div className="mt-4 rounded-2xl border border-border-light bg-bg-secondary p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-text-primary">Try a guided example</p>
                  <p className="mt-1 text-xs text-text-secondary">
                    Load one of these sample transitions to see the full report immediately.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handleGenerateExampleOptions}>
                    Generate Example
                  </Button>
                  <Button variant="ghost" size="sm" onClick={shuffleExampleOptions}>
                    Shuffle examples
                  </Button>
                </div>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {exampleOptions.map((example) => (
                  <button
                    key={example.id}
                    type="button"
                    onClick={() => void applyExampleScenario(example)}
                    className={`rounded-xl border p-4 text-left transition-colors ${
                      selectedExampleId === example.id
                        ? 'border-accent bg-accent-light'
                        : 'border-border-light bg-surface hover:border-accent'
                    }`}
                  >
                    <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">
                      Example
                    </p>
                    <p className="mt-2 text-sm font-semibold text-text-primary">
                      {example.currentRole} to {example.targetRole}
                    </p>
                    <p className="mt-2 text-sm leading-[1.6] text-text-secondary">{example.summary}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {!user ? (
            <p className="mt-2 text-[13px] text-text-secondary">
              Sign in to run this tool.{' '}
              <Link href="/login" className="text-accent hover:text-accent-hover">
                Go to login
              </Link>
            </p>
          ) : null}
        </InputCard>
      </section>

      <section className="px-4 pb-16 lg:px-[340px]">
        <div className="mx-auto w-full max-w-tool">
          <div className="print-transition-report-root">
          <h2 className="text-2xl font-bold text-text-primary">
            {isTransitionMode ? 'Transition Report' : 'Discovery Report'}
          </h2>

          {isLocked ? (
            <div className="mt-5 space-y-4">
              <LockedPanel />
              <Card className="space-y-3 p-5">
                <p className="text-xs font-semibold uppercase tracking-[1.2px] text-text-tertiary">
                  What is locked
                </p>
                <ul className="space-y-2 text-sm text-text-secondary">
                  <li>- Resume reframe output</li>
                  <li>- Full roadmap detail</li>
                  <li>- PDF export (when enabled)</li>
                </ul>
              </Card>
            </div>
          ) : plannerState === 'idle' ? (
            <Card className="mt-5 p-5">
              <p className="text-base font-semibold text-text-primary">
                Add your role details and experience to generate your transition plan.
              </p>
              <p className="mt-2 text-sm text-text-secondary">
                Use Paste Experience for a quick run, or Upload Resume (Pro) to auto-extract text.
              </p>
            </Card>
          ) : plannerState === 'loading' ? (
            <Card className="mt-5 planner-animate-in p-5" aria-live="polite">
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
          ) : plannerResult && transitionModeReport ? (
            <div className="mt-5 space-y-5">
              {(currentRoleResolution || targetRoleResolution) ? (
                <Card className="hidden p-5">
                  <h3 className="text-base font-bold text-text-primary">Role Match</h3>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {currentRoleResolution ? (
                      <RoleNormalizationCard heading="Current role" resolution={currentRoleResolution} />
                    ) : null}
                    {targetRoleResolution ? (
                      <RoleNormalizationCard heading="Target role" resolution={targetRoleResolution} />
                    ) : null}
                  </div>
                </Card>
              ) : null}

              {plannerReport?.marketEvidence?.baselineOnly ? (
                <Card className="p-5">
                  <p className="text-sm font-semibold text-warning">
                    Market data is thin right now, so this plan is leaning on baseline occupation data.
                  </p>
                  <p className="mt-2 text-sm text-text-secondary">
                    Use the outreach and agency route early so you validate local demand before you overinvest in the wrong lane.
                  </p>
                </Card>
              ) : null}

              <div id="planner-report-anchor" className="space-y-6 planner-animate-in">
                <Card className="print-page-keep overflow-hidden border border-border-light bg-bg-secondary p-0 shadow-panel">
                  <div className="border-b border-border-light px-5 py-5 md:px-6 md:py-6">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="max-w-[70ch]">
                        <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">
                          Section A
                        </p>
                        <h3 className="mt-2 text-2xl font-bold leading-tight text-text-primary md:text-[32px]">
                          Your Transition: {lastSubmittedSnapshot?.currentRole || currentRoleText || 'Current role'} {'->'}{' '}
                          {lastSubmittedSnapshot?.targetRole || targetRoleText || 'Target role'}
                        </h3>
                        <p className="mt-3 max-w-[62ch] text-sm leading-[1.75] text-text-secondary md:text-base">
                          {transitionStructuredPlan?.summary ??
                            plannerReport?.transitionReport?.marketSnapshot.summaryLine ??
                            plannerResult.summary}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-border-light bg-surface px-5 py-4">
                        <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">
                          Transition difficulty
                        </p>
                        <div className="mt-2 flex items-end gap-2">
                          <span className="text-5xl font-bold leading-none text-text-primary">
                            {transitionModeReport.difficulty.score.toFixed(1)}
                          </span>
                          <span className="pb-1 text-sm font-semibold text-text-secondary">/ 10</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-5 flex flex-wrap gap-2">
                      {transitionStructuredPlan ? (
                        <span className="rounded-pill border border-border bg-surface px-3 py-1 text-xs font-semibold text-text-secondary">
                          {transitionStructuredPlan.compatibility_level} match
                        </span>
                      ) : null}
                      <span
                        className={`rounded-pill border px-3 py-1 text-xs font-semibold ${difficultyToneClasses(transitionModeReport.difficulty.label)}`}
                      >
                        {transitionModeReport.difficulty.label}
                      </span>
                      <span className="rounded-pill border border-border bg-surface px-3 py-1 text-xs font-semibold text-text-secondary">
                        {transitionStructuredPlan?.timeline_estimate ??
                          `${transitionModeReport.timeline.minMonths}-${transitionModeReport.timeline.maxMonths} months`}
                      </span>
                      {transitionPlanCacheMeta?.cacheHit ? (
                        <span className="rounded-pill border border-success/20 bg-success/10 px-3 py-1 text-xs font-semibold text-success">
                          Cached plan
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="grid gap-4 px-5 py-5 md:px-6 md:grid-cols-[minmax(0,1fr)_220px]">
                    <div className="grid gap-4 lg:grid-cols-3">
                      {([
                        ['primary', transitionModeReport.routes.primary],
                        ['secondary', transitionModeReport.routes.secondary],
                        ['contingency', transitionModeReport.routes.contingency]
                      ] as const).map(([kind, route]) => (
                        <div key={kind} className={`rounded-2xl border p-4 ${routeToneClasses(kind)}`}>
                          <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">
                            {kind === 'primary'
                              ? 'Primary route'
                              : kind === 'secondary'
                                ? 'Secondary route'
                                : 'Contingency route'}
                          </p>
                          <p className="mt-2 text-base font-semibold text-text-primary">{route.title}</p>
                          <p className="mt-2 text-sm leading-[1.7] text-text-secondary">{route.reason}</p>
                          <p className="mt-3 text-xs font-semibold text-text-primary">
                            First step: {route.firstStep}
                          </p>
                        </div>
                      ))}
                    </div>
                    <div className="rounded-2xl border border-border-light bg-surface p-4">
                      <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">
                        Primary actions
                      </p>
                      <div className="mt-3 flex flex-col gap-2">
                        <Button variant="outline" size="sm" onClick={handlePrintReport}>
                          Download PDF
                        </Button>
                        <Button size="sm" onClick={() => scrollToSection('transition-roadmap')}>
                          Start roadmap
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setOutreachToolkitOpen(true)
                            scrollToSection('transition-execution')
                          }}
                        >
                          Open toolkit
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>

                <div className="grid gap-5 lg:grid-cols-2">
                  <div className="space-y-4">
                    <Card className="print-page-keep border border-success/20 bg-success/10 p-5">
                      <p className="text-xs font-semibold uppercase tracking-[1.1px] text-success">
                        Section B | Transferable skills
                      </p>
                      <ul className="mt-3 space-y-2 text-sm leading-[1.7] text-text-secondary">
                        {transitionQuickWins.map((item) => (
                          <li key={`hero-win-${item}`} className="break-words">- {item}</li>
                        ))}
                      </ul>
                    </Card>
                    {currentProfileSignals.certifications.length > 0 ? (
                      <Card className="print-page-keep border border-accent/20 bg-bg-secondary p-5">
                        <p className="text-xs font-semibold uppercase tracking-[1.1px] text-accent">
                          Certifications detected
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {currentProfileSignals.certifications.map((item) => (
                            <span
                              key={`hero-cert-${item}`}
                              className="rounded-pill border border-accent/20 bg-surface px-3 py-1 text-xs font-medium text-text-primary"
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                      </Card>
                    ) : null}
                  </div>

                  <div className="space-y-4">
                    <Card className="print-page-keep border border-error/20 bg-error-light p-5">
                      <p className="text-xs font-semibold uppercase tracking-[1.1px] text-error">
                        Critical gaps
                      </p>
                      <ul className="mt-3 space-y-2 text-sm leading-[1.7] text-text-secondary">
                        {(criticalGapDetails.length > 0 ? criticalGapDetails : transitionPrimaryGaps).map((item) => (
                          <li key={`hero-gap-${item}`} className="break-words">- {item}</li>
                        ))}
                      </ul>
                    </Card>
                    <Card className="print-page-keep border border-warning/25 bg-warning-light p-5">
                      <p className="text-xs font-semibold uppercase tracking-[1.1px] text-warning">
                        Employer red flags
                      </p>
                      <ul className="mt-3 space-y-2 text-sm leading-[1.7] text-text-secondary">
                        {(employerRedFlags.length > 0
                          ? employerRedFlags
                          : transitionModeReport.reality.barriers).map((item) => (
                          <li key={`hero-flag-${item}`} className="break-words">- {item}</li>
                        ))}
                      </ul>
                    </Card>
                  </div>
                </div>

                <div id="transition-roadmap">
                  <Card className="print-page-keep p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">
                          Section C
                        </p>
                        <h3 className="mt-2 text-xl font-bold text-text-primary">Roadmap</h3>
                        <p className="mt-1 text-sm text-text-secondary">
                          One focused window at a time so the next move stays obvious.
                        </p>
                      </div>
                      <Badge variant="default">Tabs reduce noise</Badge>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {ROADMAP_TABS.map((tab) => (
                        <Button
                          key={tab.key}
                          variant={activeRoadmapTab === tab.key ? 'secondary' : 'ghost'}
                          size="sm"
                          onClick={() => setActiveRoadmapTab(tab.key)}
                        >
                          {tab.label}
                        </Button>
                      ))}
                    </div>
                    {activeRoadmap ? (
                      <div key={activeRoadmap.key} className="mt-4 planner-animate-in rounded-2xl border border-border-light bg-bg-secondary p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-text-primary">{activeRoadmap.label}</p>
                          <span className="text-xs text-text-tertiary">{activeRoadmap.summary}</span>
                        </div>
                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                          {activeRoadmap.items.slice(0, 4).map((item) => (
                            <div key={`${activeRoadmap.key}-${item.title}`} className="rounded-xl border border-border-light bg-surface p-4">
                              <p className="text-sm font-semibold text-text-primary">{item.title}</p>
                              <p className="mt-2 text-xs leading-[1.6] text-text-secondary">{item.detail}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </Card>
                </div>

                <div id="transition-execution">
                  <Card className="print-page-keep p-5">
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-3 text-left"
                      onClick={() => setOutreachToolkitOpen((previous) => !previous)}
                    >
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">
                          Section D
                        </p>
                        <h3 className="mt-2 text-xl font-bold text-text-primary">Employer Outreach Toolkit</h3>
                        <p className="mt-1 text-sm text-text-secondary">
                          Email, call script, and resume bullets in one employer-ready workspace.
                        </p>
                      </div>
                      <Badge variant="default">{isToolkitExpanded ? 'Expanded' : 'Collapsed'}</Badge>
                    </button>
                    {isToolkitExpanded ? (
                      <div className="mt-4 divide-y divide-border-light rounded-2xl border border-border-light bg-bg-secondary planner-animate-in">
                      <div className="p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">
                            Resume bullets
                          </p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              void handleCopyToolkitSection(
                                'resume',
                                outreachResumeBullets.map((item) => `- ${item}`).join('\n')
                              )
                            }
                          >
                            {copiedToolkitSection === 'resume' ? 'Copied' : 'Copy'}
                          </Button>
                        </div>
                        {outreachResumeBullets.length > 0 ? (
                          <ul className="mt-3 space-y-2 text-sm leading-[1.7] text-text-secondary">
                            {outreachResumeBullets.map((item) => (
                              <li key={`toolkit-resume-${item}`}>- {item}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-3 text-sm text-text-secondary">
                            Add more measurable achievements to generate stronger rewrite bullets.
                          </p>
                        )}
                      </div>
                      <div className="p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">
                            Call script
                          </p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              void handleCopyToolkitSection(
                                'call',
                                transitionPlanScripts?.call ?? transitionModeReport.execution.outreachTemplates.call
                              )
                            }
                          >
                            {copiedToolkitSection === 'call' ? 'Copied' : 'Copy'}
                          </Button>
                        </div>
                        <p className="mt-3 whitespace-pre-wrap text-sm leading-[1.7] text-text-secondary">
                          {transitionPlanScripts?.call ?? transitionModeReport.execution.outreachTemplates.call}
                        </p>
                      </div>
                      <div className="p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">
                            Email template
                          </p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              void handleCopyToolkitSection(
                                'email',
                                transitionPlanScripts?.email ?? transitionModeReport.execution.outreachTemplates.email
                              )
                            }
                          >
                            {copiedToolkitSection === 'email' ? 'Copied' : 'Copy'}
                          </Button>
                        </div>
                        <p className="mt-3 whitespace-pre-wrap text-sm leading-[1.7] text-text-secondary">
                          {transitionPlanScripts?.email ?? transitionModeReport.execution.outreachTemplates.email}
                        </p>
                      </div>
                    </div>
                  ) : (
                      <p className="mt-4 text-sm text-text-secondary">
                        Keep this collapsed until you need outreach copy, then open it when you are ready to contact employers.
                      </p>
                    )}
                  </Card>
                </div>

                <Card className="print-hidden p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">
                        Section E
                      </p>
                      <h3 className="mt-2 text-xl font-bold text-text-primary">Advanced Insights</h3>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => void handleGeneratePlan()}>
                      Regenerate plan
                    </Button>
                  </div>
                  <div className="mt-4 space-y-3">
                    <details className="rounded-2xl border border-border-light bg-bg-secondary p-4">
                      <summary className="cursor-pointer text-sm font-semibold text-text-primary">
                        Skill Gap Map
                      </summary>
                      <div className="mt-3 space-y-4">
                        {transitionSkillMapStrengths.length > 0 ? (
                          <div className="rounded-xl border border-success/20 bg-success/10 p-4">
                            <p className="text-xs font-semibold uppercase tracking-[1.1px] text-success">
                              Additional transferable strengths
                            </p>
                            <ul className="mt-3 space-y-2 text-sm leading-[1.7] text-text-secondary">
                              {transitionSkillMapStrengths.map((item) => (
                                <li key={`advanced-strength-${item}`}>- {item}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                        {transitionSkillMapMissing.length > 0 ? (
                          <div className="rounded-xl border border-error/20 bg-error-light p-4">
                            <p className="text-xs font-semibold uppercase tracking-[1.1px] text-error">
                              Additional gaps to close
                            </p>
                            <ul className="mt-3 space-y-2 text-sm leading-[1.7] text-text-secondary">
                              {transitionSkillMapMissing.map((item) => (
                                <li key={`advanced-gap-${item}`}>- {item}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                        <div className="rounded-xl border border-border-light bg-surface p-4">
                          <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">
                            First 3 required actions
                          </p>
                          <ul className="mt-3 space-y-2 text-sm leading-[1.7] text-text-secondary">
                            {transitionModeReport.gaps.first3Steps.map((item) => (
                              <li key={`advanced-step-${item}`}>- {item}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </details>

                    <details className="rounded-2xl border border-border-light bg-bg-secondary p-4">
                      <summary className="cursor-pointer text-sm font-semibold text-text-primary">
                        Reality Check
                      </summary>
                      <div className="mt-3 grid gap-4 md:grid-cols-2">
                        <div className="rounded-xl border border-warning/25 bg-warning-light p-4">
                          <p className="text-xs font-semibold uppercase tracking-[1.1px] text-warning">
                            Realistic barriers
                          </p>
                          <ul className="mt-3 space-y-2 text-sm leading-[1.7] text-text-secondary">
                            {transitionModeReport.reality.barriers.map((item) => (
                              <li key={`advanced-barrier-${item}`}>- {item}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="rounded-xl border border-success/20 bg-success/10 p-4">
                          <p className="text-xs font-semibold uppercase tracking-[1.1px] text-success">
                            Mitigation strategy
                          </p>
                          <ul className="mt-3 space-y-2 text-sm leading-[1.7] text-text-secondary">
                            {transitionModeReport.reality.mitigations.map((item) => (
                              <li key={`advanced-mitigation-${item}`}>- {item}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </details>

                    <details className="rounded-2xl border border-border-light bg-bg-secondary p-4">
                      <summary className="cursor-pointer text-sm font-semibold text-text-primary">
                        Deep diagnostics
                      </summary>
                      <div className="mt-3 space-y-4">
                        {(currentRoleResolution || targetRoleResolution) ? (
                          <div className="grid gap-3 md:grid-cols-2">
                            {currentRoleResolution ? (
                              <RoleNormalizationCard heading="Current role" resolution={currentRoleResolution} />
                            ) : null}
                            {targetRoleResolution ? (
                              <RoleNormalizationCard heading="Target role" resolution={targetRoleResolution} />
                            ) : null}
                          </div>
                        ) : null}
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="rounded-xl border border-border-light bg-surface p-4">
                            <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">
                              Earnings path
                            </p>
                            <div className="mt-3 space-y-2">
                              {transitionModeReport.earnings.map((stage) => (
                                <div key={`advanced-earnings-${stage.stage}`} className="flex items-center justify-between gap-3 text-sm">
                                  <span className="font-semibold text-text-primary">{stage.stage}</span>
                                  <span className="text-text-secondary">
                                    {formatMoneyRange(
                                      stage.rangeLow,
                                      stage.rangeHigh,
                                      stage.unit,
                                      earningsView === 'annual'
                                    )}
                                  </span>
                                </div>
                              ))}
                            </div>
                            {canAnnualizeEarnings ? (
                              <div className="mt-3 flex gap-2">
                                <Button
                                  variant={earningsView === 'base' ? 'secondary' : 'ghost'}
                                  size="sm"
                                  onClick={() => setEarningsView('base')}
                                >
                                  Hourly
                                </Button>
                                <Button
                                  variant={earningsView === 'annual' ? 'secondary' : 'ghost'}
                                  size="sm"
                                  onClick={() => setEarningsView('annual')}
                                >
                                  Yearly est.
                                </Button>
                              </div>
                            ) : null}
                          </div>
                          <div className="rounded-xl border border-border-light bg-surface p-4">
                            <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">
                              Resources
                            </p>
                            <div className="mt-3 space-y-3">
                              {([
                                ['Local', transitionModeReport.resources.local],
                                ['Online', transitionModeReport.resources.online],
                                ['Internal', transitionModeReport.resources.internal]
                              ] as const).map(([label, links]) => (
                                <div key={`advanced-resource-${label}`}>
                                  <p className="text-[11px] font-semibold uppercase tracking-[1.1px] text-text-tertiary">
                                    {label}
                                  </p>
                                  {links.length > 0 ? (
                                    <ul className="mt-2 space-y-1 text-sm text-text-secondary">
                                      {links.map((link) => (
                                        <li key={`${label}-${link.label}-${link.url}`}>
                                          {link.url ? (
                                            <Link href={link.url} className="text-accent hover:text-accent-hover">
                                              {link.label}
                                            </Link>
                                          ) : (
                                            <span>{link.label}</span>
                                          )}
                                        </li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <p className="mt-2 text-sm text-text-secondary">No resources added yet.</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="grid gap-4 md:grid-cols-3">
                          <div className="rounded-xl border border-border-light bg-surface p-4">
                            <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">
                              Simple breakdown
                            </p>
                            <ul className="mt-3 space-y-2 text-sm text-text-secondary">
                              <li>- We matched your current and target roles to the closest occupation pathway.</li>
                              <li>- We combined your background with occupation requirements, wages, and transition blockers.</li>
                              <li>- We turned that into a 90-day plan with measurable weekly outputs and outreach scripts.</li>
                            </ul>
                          </div>
                          <div className="rounded-xl border border-border-light bg-surface p-4">
                            <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">
                              Assumptions you can change
                            </p>
                            <ul className="mt-3 space-y-2 text-sm text-text-secondary">
                              <li>
                                - Location:{' '}
                                {plannerReport?.transitionReport?.marketSnapshot.location ||
                                  locationText.trim() ||
                                  'Not provided'}
                              </li>
                              <li>- Timeline target: {lastSubmittedSnapshot?.timelineBucket || timelineBucket}</li>
                              <li>- Market evidence: {useMarketEvidence ? 'On' : 'Off'}</li>
                            </ul>
                          </div>
                          <div className="rounded-xl border border-border-light bg-surface p-4">
                            <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">
                              Data used
                            </p>
                            <ul className="mt-3 space-y-2 text-sm text-text-secondary">
                              {(plannerReport?.dataTransparency.datasetsUsed ?? []).map((item) => (
                                <li key={`advanced-dataset-${item}`}>
                                  - {FRIENDLY_DATASET_NAMES[item] ?? item.replaceAll('_', ' ')}
                                </li>
                              ))}
                            </ul>
                            {plannerReport?.dataTransparency.fxRateUsed ? (
                              <p className="mt-3 text-xs text-text-tertiary">
                                FX rate: {plannerReport.dataTransparency.fxRateUsed}
                              </p>
                            ) : null}
                            {wageSourceDateSummary.length > 0 ? (
                              <p className="mt-2 text-xs text-text-tertiary">
                                Wage sources: {wageSourceDateSummary.join(', ')}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </details>
                  </div>
                </Card>
              </div>

              <Card className="hidden overflow-hidden p-0">
                <div className="bg-bg-secondary p-5 md:p-6">
                  <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
                    <div className="space-y-5">
                      <div className="flex flex-wrap items-center gap-3">
                        <Badge className="gap-1.5">Your Transition Plan</Badge>
                        {transitionStructuredPlan ? (
                          <span className="rounded-pill border border-border bg-surface px-3 py-1 text-xs font-semibold text-text-secondary">
                            {transitionStructuredPlan.compatibility_level} match
                          </span>
                        ) : null}
                        <span
                          className={`rounded-pill border px-3 py-1 text-xs font-semibold ${difficultyToneClasses(transitionModeReport.difficulty.label)}`}
                        >
                          {transitionModeReport.difficulty.label}
                        </span>
                        <span className="rounded-pill border border-border bg-surface px-3 py-1 text-xs font-semibold text-text-secondary">
                          {transitionStructuredPlan?.timeline_estimate ??
                            `${transitionModeReport.timeline.minMonths}-${transitionModeReport.timeline.maxMonths} months`}
                        </span>
                        {transitionPlanCacheMeta?.cacheHit ? (
                          <span className="rounded-pill border border-success/20 bg-success/10 px-3 py-1 text-xs font-semibold text-success">
                            Cached plan
                          </span>
                        ) : null}
                      </div>

                      {transitionStructuredPlan ? (
                        <div className="rounded-lg border border-border bg-surface p-5">
                          <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">
                            Compatibility summary
                          </p>
                          <p className="mt-3 text-sm leading-[1.6] text-text-secondary">
                            {transitionStructuredPlan.summary}
                          </p>
                          <div className="mt-4 grid gap-3 md:grid-cols-2">
                            {transitionStructuredPlan.required_certifications.length > 0 ? (
                              <div className="rounded-lg border border-border-light bg-bg-secondary p-4">
                                <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">
                                  Required certifications
                                </p>
                                <ul className="mt-2 space-y-1 text-sm text-text-secondary">
                                  {transitionStructuredPlan.required_certifications.map((item) => (
                                    <li key={`required-cert-${item}`}>- {item}</li>
                                  ))}
                                </ul>
                              </div>
                            ) : null}
                            {transitionStructuredPlan.required_experience.length > 0 ? (
                              <div className="rounded-lg border border-border-light bg-bg-secondary p-4">
                                <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">
                                  Experience requirements
                                </p>
                                <ul className="mt-2 space-y-1 text-sm text-text-secondary">
                                  {transitionStructuredPlan.required_experience.map((item) => (
                                    <li key={`required-exp-${item}`}>- {item}</li>
                                  ))}
                                </ul>
                              </div>
                            ) : null}
                          </div>
                          {transitionStructuredPlan.action_steps.length > 0 ? (
                            <div className="mt-4 rounded-lg border border-border-light bg-bg-secondary p-4">
                              <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">
                                Suggested first 3 actions
                              </p>
                              <ul className="mt-2 space-y-1 text-sm text-text-secondary">
                                {transitionStructuredPlan.action_steps.map((item) => (
                                  <li key={`summary-step-${item}`}>- {item}</li>
                                ))}
                              </ul>
                            </div>
                          ) : null}
                        </div>
                      ) : null}

                      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
                        <div className="rounded-lg border border-border bg-surface p-5">
                          <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">
                            Transition difficulty
                          </p>
                          <div className="mt-3 flex items-end gap-3">
                            <span className="text-5xl font-bold leading-none text-text-primary">
                              {transitionModeReport.difficulty.score.toFixed(1)}
                            </span>
                            <span className="pb-1 text-sm font-semibold text-text-secondary">/ 10</span>
                          </div>
                          <p className="mt-3 text-sm text-text-secondary">
                            Likely {transitionStructuredPlan?.timeline_estimate ??
                              `${transitionModeReport.timeline.minMonths}-${transitionModeReport.timeline.maxMonths} months`} if you execute weekly.
                          </p>
                          <p className="mt-3 text-sm font-semibold text-text-primary">
                            Primary entry strategy: {transitionModeReport.routes.primary.title}
                          </p>
                        </div>

                        <div className="rounded-lg border border-border bg-surface p-5">
                          <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">
                            CTA
                          </p>
                          <div className="mt-3 flex flex-col gap-2">
                            <Button variant="outline" size="sm" onClick={() => window.print()}>
                              Download PDF
                            </Button>
                            <Button size="sm" onClick={() => scrollToSection('transition-plan-phase-1')}>
                              Start Week 1
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => scrollToSection('transition-execution')}
                            >
                              Generate Outreach Script
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="rounded-lg border border-success/20 bg-success/10 p-5">
                          <p className="text-xs font-semibold uppercase tracking-[1.1px] text-success">
                            Quick wins
                          </p>
                          <ul className="mt-3 space-y-2 text-sm leading-[1.65] text-text-secondary">
                            {transitionQuickWins.map((item) => (
                              <li key={`quick-win-${item}`} className="break-words">- {item}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="rounded-lg border border-error/20 bg-error-light p-5">
                          <p className="text-xs font-semibold uppercase tracking-[1.1px] text-error">
                            Primary gaps
                          </p>
                          <ul className="mt-3 space-y-2 text-sm leading-[1.65] text-text-secondary">
                            {transitionPrimaryGaps.map((item) => (
                              <li key={`primary-gap-${item}`} className="break-words">- {item}</li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {currentProfileSignals.certifications.length > 0 ? (
                        <div className="rounded-lg border border-accent/20 bg-accent/10 p-5">
                          <p className="text-xs font-semibold uppercase tracking-[1.1px] text-accent">
                            Certifications &amp; Tickets
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {currentProfileSignals.certifications.map((item) => (
                              <span
                                key={`cert-ticket-${item}`}
                                className="rounded-pill border border-accent/20 bg-surface px-3 py-1 text-xs font-medium text-text-primary"
                              >
                                {item}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <div className="rounded-lg border border-border bg-surface p-5">
                      <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">
                        Why this is the score
                      </p>
                      <ul className="mt-3 space-y-2 text-sm leading-[1.65] text-text-secondary">
                        {transitionModeReport.difficulty.why.map((item) => (
                          <li key={`difficulty-why-${item}`} className="break-words">- {item}</li>
                        ))}
                      </ul>
                      <p className="mt-4 text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">
                        Timeline assumptions
                      </p>
                      <ul className="mt-3 space-y-2 text-sm leading-[1.65] text-text-secondary">
                        {transitionModeReport.timeline.assumptions.map((item) => (
                          <li key={`timeline-assumption-${item}`} className="break-words">- {item}</li>
                        ))}
                      </ul>
                      {transitionStructuredPlan?.salary_projection ? (
                        <>
                          <p className="mt-4 text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">
                            Salary projection
                          </p>
                          <p className="mt-2 text-sm text-text-secondary">
                            {transitionStructuredPlan.salary_projection}
                          </p>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="hidden space-y-4 p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-lg font-bold text-text-primary">Recommended Entry Strategy</h3>
                  <Badge variant="default">Decisive route selection</Badge>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  {([
                    ['primary', transitionModeReport.routes.primary],
                    ['secondary', transitionModeReport.routes.secondary],
                    ['contingency', transitionModeReport.routes.contingency]
                  ] as const).map(([kind, route]) => (
                    <div
                      key={kind}
                      className={`rounded-lg border p-4 ${routeToneClasses(kind)}`}
                    >
                      <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">
                        {kind === 'primary' ? 'Primary route' : kind === 'secondary' ? 'Secondary route' : 'If rejected'}
                      </p>
                      <p className="mt-2 text-base font-semibold text-text-primary">{route.title}</p>
                      <p className="mt-2 text-sm text-text-secondary">{route.reason}</p>
                      <p className="mt-3 text-xs font-semibold text-text-primary">First step: {route.firstStep}</p>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="hidden space-y-4 p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-lg font-bold text-text-primary">90-Day Plan</h3>
                  <Badge variant="default">Weekly outputs included</Badge>
                </div>
                {proofBuilderDefinition ? (
                  <details className="rounded-lg border border-border-light bg-bg-secondary p-4">
                    <summary className="cursor-pointer text-sm font-semibold text-text-primary">
                      What&apos;s Proof Builder?
                    </summary>
                    <p className="mt-2 text-sm text-text-secondary">{proofBuilderDefinition}</p>
                  </details>
                ) : null}
                {transitionModeReport.plan90.map((phase, index) => (
                  <div key={phase.phase} id={index === 0 ? 'transition-plan-phase-1' : undefined}>
                    <ReportSection
                      title={`${phase.phase} (${phase.weeks})`}
                      count={phase.tasks.length}
                      defaultOpen={index === 0}
                    >
                      <div className="rounded-md border border-border-light bg-surface p-3">
                        <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">
                          Tasks
                        </p>
                        <ul className="mt-2 space-y-2 text-sm text-text-secondary">
                          {phase.tasks.map((task) => (
                            <li key={`${phase.phase}-task-${task}`}>- {task}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="rounded-md border border-border-light bg-surface p-3">
                        <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">
                          Weekly output targets
                        </p>
                        <ul className="mt-2 space-y-2 text-sm text-text-secondary">
                          {phase.weeklyTargets.map((target) => (
                            <li key={`${phase.phase}-target-${target}`}>- {target}</li>
                          ))}
                        </ul>
                        <p className="mt-3 text-xs text-text-tertiary">
                          Time per week: {phase.timePerWeekHours} hours
                        </p>
                      </div>
                    </ReportSection>
                  </div>
                ))}
              </Card>

              <div className="hidden">
                <Card className="print-hidden space-y-4 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-lg font-bold text-text-primary">Job Search Execution Engine</h3>
                    <Badge variant="default">Daily 45-minute routine</Badge>
                  </div>
                  <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                    <div className="space-y-4">
                      <div className="rounded-lg border border-border-light bg-bg-secondary p-4">
                        <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">
                          Daily routine
                        </p>
                        <ul className="mt-3 space-y-2 text-sm text-text-secondary">
                          {transitionModeReport.execution.dailyRoutine.map((item) => (
                            <li key={`daily-routine-${item}`}>- {item}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="rounded-lg border border-border-light bg-bg-secondary p-4">
                        <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">
                          Weekly cadence
                        </p>
                        <ul className="mt-3 space-y-2 text-sm text-text-secondary">
                          {transitionModeReport.execution.weeklyCadence.map((item) => (
                            <li key={`weekly-cadence-${item}`}>- {item}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="rounded-lg border border-border-light bg-surface p-4">
                        <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">
                          Channel priorities
                        </p>
                        <ul className="mt-3 space-y-2 text-sm text-text-secondary">
                          {transitionChannelPriorities.map((item) => (
                            <li key={`channel-priority-${item}`}>- {item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="rounded-lg border border-border-light bg-surface p-4">
                        <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">
                          Call script
                        </p>
                        <p className="mt-3 whitespace-pre-wrap text-sm leading-[1.6] text-text-secondary">
                          {transitionPlanScripts?.call ?? transitionModeReport.execution.outreachTemplates.call}
                        </p>
                      </div>
                      <div className="rounded-lg border border-border-light bg-surface p-4">
                        <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">
                          Email template
                        </p>
                        <p className="mt-3 whitespace-pre-wrap text-sm leading-[1.6] text-text-secondary">
                          {transitionPlanScripts?.email ?? transitionModeReport.execution.outreachTemplates.email}
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>

              <div className="hidden grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
                <div className="space-y-5">
                  <Card className="space-y-4 p-5">
                    <h3 className="text-lg font-bold text-text-primary">Skill Gap Map</h3>
                    {transitionSkillMapStrengths.length > 0 || transitionSkillMapMissing.length > 0 ? (
                      <div className="grid gap-4 md:grid-cols-2">
                        {transitionSkillMapStrengths.length > 0 ? (
                          <div className="rounded-lg border border-success/20 bg-success/10 p-4">
                            <p className="text-xs font-semibold uppercase tracking-[1.1px] text-success">
                              Additional transferable strengths
                            </p>
                            <ul className="mt-3 space-y-2 text-sm text-text-secondary">
                              {transitionSkillMapStrengths.map((item) => (
                                <li key={`gap-strength-${item}`}>- {item}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                        {transitionSkillMapMissing.length > 0 ? (
                          <div className="rounded-lg border border-error/20 bg-error-light p-4">
                            <p className="text-xs font-semibold uppercase tracking-[1.1px] text-error">
                              Additional gaps to close
                            </p>
                            <ul className="mt-3 space-y-2 text-sm text-text-secondary">
                              {transitionSkillMapMissing.map((item) => (
                                <li key={`gap-missing-${item}`}>- {item}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <div className="rounded-lg border border-border-light bg-bg-secondary p-4">
                        <p className="text-sm text-text-secondary">
                          Quick wins and primary gaps are already summarized in the hero above, so this section focuses on the first required actions.
                        </p>
                      </div>
                    )}
                    <div className="rounded-lg border border-border-light bg-bg-secondary p-4">
                      <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">
                        First 3 required actions
                      </p>
                      <ul className="mt-3 space-y-2 text-sm leading-[1.65] text-text-secondary">
                        {transitionModeReport.gaps.first3Steps.map((item) => (
                          <li key={`first-step-${item}`} className="break-words">- {item}</li>
                        ))}
                      </ul>
                    </div>
                  </Card>

                  <Card className="space-y-4 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-lg font-bold text-text-primary">Earnings Path</h3>
                      {canAnnualizeEarnings ? (
                        <div className="flex items-center gap-2">
                          <Button
                            variant={earningsView === 'base' ? 'secondary' : 'ghost'}
                            size="sm"
                            onClick={() => setEarningsView('base')}
                          >
                            Hourly
                          </Button>
                          <Button
                            variant={earningsView === 'annual' ? 'secondary' : 'ghost'}
                            size="sm"
                            onClick={() => setEarningsView('annual')}
                          >
                            Yearly est.
                          </Button>
                        </div>
                      ) : null}
                    </div>
                    <div className="overflow-hidden rounded-lg border border-border-light">
                      <div className="grid grid-cols-[140px_minmax(0,1fr)] bg-bg-secondary px-4 py-3 text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">
                        <span>Stage</span>
                        <span>Range</span>
                      </div>
                      {transitionModeReport.earnings.map((stage) => (
                        <div
                          key={stage.stage}
                          className="grid grid-cols-[140px_minmax(0,1fr)] border-t border-border-light px-4 py-3 text-sm text-text-secondary"
                        >
                          <span className="font-semibold text-text-primary">{stage.stage}</span>
                          <span>
                            {formatMoneyRange(
                              stage.rangeLow,
                              stage.rangeHigh,
                              stage.unit,
                              earningsView === 'annual'
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-text-tertiary">
                      Ranges vary by region and union vs. non-union employers.
                    </p>
                  </Card>
                </div>

                <div className="space-y-5">
                  <Card className="space-y-4 p-5">
                    <h3 className="text-lg font-bold text-text-primary">Reality Check</h3>
                    <div className="rounded-lg border border-warning/25 bg-warning-light p-4">
                      <p className="text-xs font-semibold uppercase tracking-[1.1px] text-warning">
                        Realistic barriers
                      </p>
                      <ul className="mt-3 space-y-2 text-sm leading-[1.65] text-text-secondary">
                        {transitionModeReport.reality.barriers.map((item) => (
                          <li key={`barrier-${item}`} className="break-words">- {item}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="rounded-lg border border-success/20 bg-success/10 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[1.1px] text-success">
                        Mitigation strategy
                      </p>
                      <ul className="mt-3 space-y-2 text-sm leading-[1.65] text-text-secondary">
                        {transitionModeReport.reality.mitigations.map((item) => (
                          <li key={`mitigation-${item}`} className="break-words">- {item}</li>
                        ))}
                      </ul>
                    </div>
                  </Card>

                  <Card className="space-y-4 p-5">
                    <h3 className="text-lg font-bold text-text-primary">Resources</h3>
                    <div className="space-y-4">
                      {([
                        ['Local', transitionModeReport.resources.local],
                        ['Online', transitionModeReport.resources.online],
                        ['Internal', transitionModeReport.resources.internal]
                      ] as const).map(([label, links]) => (
                        <div key={label} className="rounded-lg border border-border-light bg-bg-secondary p-4">
                          <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">
                            {label}
                          </p>
                          {links.length > 0 ? (
                            <ul className="mt-3 space-y-2 text-sm text-text-secondary">
                              {links.map((link) => (
                                <li key={`${label}-${link.label}-${link.url}`}>
                                  {link.url ? (
                                    <Link href={link.url} className="text-accent hover:text-accent-hover">
                                      {link.label}
                                    </Link>
                                  ) : (
                                    <span>{link.label}</span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="mt-3 text-sm text-text-secondary">No resources added yet.</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>
              </div>

              <Card className="hidden space-y-4 p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-lg font-bold text-text-primary">How This Plan Was Built</h3>
                  <Button variant="ghost" size="sm" onClick={() => void handleGeneratePlan()}>
                    Regenerate plan
                  </Button>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-lg border border-border-light bg-bg-secondary p-4">
                    <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">
                      Simple breakdown
                    </p>
                    <ul className="mt-3 space-y-2 text-sm text-text-secondary">
                      <li>- We matched your current and target roles to the closest occupation pathway.</li>
                      <li>- We combined your background with occupation requirements, wages, and transition blockers.</li>
                      <li>- We turned that into a 90-day plan with measurable weekly outputs and outreach scripts.</li>
                    </ul>
                  </div>
                  <div className="rounded-lg border border-border-light bg-bg-secondary p-4">
                      <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">
                      Assumptions you can change
                    </p>
                    <ul className="mt-3 space-y-2 text-sm text-text-secondary">
                      <li>
                        - Location:{' '}
                        {plannerReport?.transitionReport?.marketSnapshot.location ||
                          locationText.trim() ||
                          'Not provided'}
                      </li>
                      <li>- Timeline target: {lastSubmittedSnapshot?.timelineBucket || timelineBucket}</li>
                      <li>- Market evidence: {useMarketEvidence ? 'On' : 'Off'}</li>
                    </ul>
                  </div>
                  <div className="rounded-lg border border-border-light bg-bg-secondary p-4">
                    <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">
                      Data used
                    </p>
                    <ul className="mt-3 space-y-2 text-sm text-text-secondary">
                      {(plannerReport?.dataTransparency.datasetsUsed ?? []).map((item) => (
                        <li key={`dataset-used-${item}`}>
                          - {FRIENDLY_DATASET_NAMES[item] ?? item.replaceAll('_', ' ')}
                        </li>
                      ))}
                    </ul>
                    {plannerReport?.dataTransparency.fxRateUsed ? (
                      <p className="mt-3 text-xs text-text-tertiary">
                        FX rate: {plannerReport.dataTransparency.fxRateUsed}
                      </p>
                    ) : null}
                  </div>
                </div>
                <details className="rounded-lg border border-border-light bg-bg-secondary p-4">
                  <summary className="cursor-pointer text-sm font-semibold text-text-primary">
                    Technical details
                  </summary>
                  <div className="mt-3 grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">
                        Input keys
                      </p>
                      <ul className="mt-2 space-y-2 text-sm text-text-secondary">
                        {(plannerReport?.dataTransparency.inputsUsed ?? []).map((item) => (
                          <li key={`input-used-${item}`}>- {item}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">
                        Timeline assumptions
                      </p>
                      <ul className="mt-2 space-y-2 text-sm text-text-secondary">
                        {transitionModeReport.timeline.assumptions.map((item) => (
                          <li key={`assumption-${item}`}>- {item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </details>
              </Card>
            </div>
          ) : plannerResult ? (
            <div className="mt-5 space-y-3">
              {(currentRoleResolution || targetRoleResolution) ? (
                <Card className="p-5">
                  <h3 className="text-base font-bold text-text-primary">Role Match</h3>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {currentRoleResolution ? (
                      <RoleNormalizationCard heading="Current role" resolution={currentRoleResolution} />
                    ) : null}
                    {targetRoleResolution ? (
                      <RoleNormalizationCard heading="Target role" resolution={targetRoleResolution} />
                    ) : null}
                  </div>
                </Card>
              ) : null}
              {plannerReport?.marketEvidence?.baselineOnly ? (
                <Card className="p-5">
                  <p className="text-sm font-semibold text-warning">
                    No employer evidence found; showing baseline only.
                  </p>
                  <p className="mt-2 text-sm text-text-secondary">
                    Add a pasted posting or enable market evidence to get live demand signals for
                    your location.
                  </p>
                </Card>
              ) : null}
              {executionStrategy ? (
                <Card className="print-hidden space-y-4 p-5">
                  <h3 className="text-base font-bold text-text-primary">Personalized execution strategy</h3>

                  <ReportSection title="1) Where You Stand Right Now" count={executionStrategy.whereYouStandNow.strengths.length} defaultOpen>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">Relevant strengths from your background</p>
                      <ul className="mt-2 space-y-2 text-sm text-text-secondary">
                        {executionStrategy.whereYouStandNow.strengths.map((item, index) => (
                          <li key={`stand-strength-${index}`} className="rounded-md border border-border-light bg-surface p-3">
                            <p className="font-medium text-text-primary">{item.summary}</p>
                            <p className="mt-1 text-xs text-text-tertiary">Signal: {item.resumeSignal}</p>
                            <p className="mt-1 text-xs text-text-tertiary">
                              Counts toward: {item.countsToward.join(' | ') || 'General transition readiness'}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">Missing mandatory requirements</p>
                        <ul className="mt-2 space-y-2 text-sm text-text-secondary">
                          {executionStrategy.whereYouStandNow.missingMandatoryRequirements.map((item) => (
                            <li key={`stand-missing-${item.normalized_key}`} className="rounded-md border border-border-light bg-surface p-3">
                              <p className="font-medium text-text-primary">{item.label}</p>
                              <p className="mt-1 text-xs text-text-tertiary">{item.reason}</p>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">Competitive disadvantages</p>
                        <ul className="mt-2 space-y-2 text-sm text-text-secondary">
                          {executionStrategy.whereYouStandNow.competitiveDisadvantages.map((item) => (
                            <li key={`stand-competitive-${item.normalized_key}`} className="rounded-md border border-border-light bg-surface p-3">
                              <p className="font-medium text-text-primary">{item.label}</p>
                              <p className="mt-1 text-xs text-text-tertiary">{item.reason}</p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </ReportSection>

                  <ReportSection
                    title="2) Real Blockers (Entry Requirements)"
                    count={
                      executionStrategy.realBlockers.requiredToApply.length +
                      executionStrategy.realBlockers.requiredToCompete.length
                    }
                  >
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">Required to apply</p>
                        <ul className="mt-2 space-y-2 text-sm text-text-secondary">
                          {executionStrategy.realBlockers.requiredToApply.map((item) => (
                            <li key={`apply-blocker-${item.normalized_key}`} className="rounded-md border border-border-light bg-surface p-3">
                              <p className="font-medium text-text-primary">{item.label}</p>
                              <p className="mt-1 text-xs text-text-tertiary">{item.whyItMatters}</p>
                              <p className="mt-1 text-xs text-text-secondary">
                                {item.howToClose} Time: {item.timeEstimate}.
                              </p>
                              {item.evidenceQuote.length > 0 ? (
                                <ul className="mt-2 space-y-1 text-xs text-text-tertiary">
                                  {item.evidenceQuote.map((quote) => (
                                    <li key={`apply-quote-${item.normalized_key}-${quote}`}>&quot;{quote}&quot;</li>
                                  ))}
                                </ul>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">Required to be competitive</p>
                        <ul className="mt-2 space-y-2 text-sm text-text-secondary">
                          {executionStrategy.realBlockers.requiredToCompete.map((item) => (
                            <li key={`compete-blocker-${item.normalized_key}`} className="rounded-md border border-border-light bg-surface p-3">
                              <p className="font-medium text-text-primary">{item.label}</p>
                              <p className="mt-1 text-xs text-text-tertiary">{item.whyItMatters}</p>
                              <p className="mt-1 text-xs text-text-secondary">
                                {item.howToClose} Time: {item.timeEstimate}.
                              </p>
                              {item.evidenceQuote.length > 0 ? (
                                <ul className="mt-2 space-y-1 text-xs text-text-tertiary">
                                  {item.evidenceQuote.map((quote) => (
                                    <li key={`compete-quote-${item.normalized_key}-${quote}`}>&quot;{quote}&quot;</li>
                                  ))}
                                </ul>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </ReportSection>

                  <ReportSection title="3) Your Transferable Edge" count={executionStrategy.transferableEdge.translations.length}>
                    <ul className="space-y-2 text-sm text-text-secondary">
                      {executionStrategy.transferableEdge.translations.map((item, index) => (
                        <li key={`translation-${index}`} className="rounded-md border border-border-light bg-surface p-3">
                          <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">From your resume</p>
                          <p className="mt-1">{item.fromResume}</p>
                          <p className="mt-2 text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">Target-role framing</p>
                          <p className="mt-1 font-medium text-text-primary">{item.toTargetRole}</p>
                          <p className="mt-2 text-xs text-text-tertiary">
                            Counts toward: {item.countsToward.join(' | ') || 'General transition readiness'}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </ReportSection>

                  <ReportSection
                    title="4) 90-Day Execution Plan"
                    count={
                      executionStrategy.plan90Day.month1.actions.length +
                      executionStrategy.plan90Day.month2.actions.length +
                      executionStrategy.plan90Day.month3.actions.length
                    }
                  >
                    <div className="grid gap-3 md:grid-cols-3">
                      {[executionStrategy.plan90Day.month1, executionStrategy.plan90Day.month2, executionStrategy.plan90Day.month3].map((month) => (
                        <div key={month.label} className="rounded-md border border-border-light bg-surface p-3">
                          <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">{month.label}</p>
                          <p className="mt-1 text-xs text-text-tertiary">Weekly time: {month.weeklyTimeInvestment}</p>
                          <ul className="mt-2 space-y-2 text-sm text-text-secondary">
                            {month.actions.map((action) => (
                              <li key={action.id} className="rounded-md border border-border-light bg-bg-secondary p-2">
                                <p className="font-medium text-text-primary">{action.task}</p>
                                <p className="mt-1 text-xs text-text-tertiary">
                                  Target: {action.volumeTarget} | Learning: {action.learningTarget}
                                </p>
                                <p className="text-xs text-text-tertiary">
                                  Proof: {action.proofTarget} | Time: {action.weeklyTime}
                                </p>
                                <p className="mt-1 text-xs text-text-tertiary">
                                  Linked requirements: {action.linkedRequirements.join(', ')}
                                </p>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </ReportSection>

                  <ReportSection title="5) Probability & Reality Check" count={executionStrategy.probabilityRealityCheck.whatIncreasesOdds.length}>
                    <p className="text-sm text-text-secondary">{executionStrategy.probabilityRealityCheck.difficulty}</p>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">What increases your odds</p>
                        <ul className="mt-2 space-y-1 text-sm text-text-secondary">
                          {executionStrategy.probabilityRealityCheck.whatIncreasesOdds.map((item, index) => (
                            <li key={`odds-${index}`}>- {item}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">Common failure modes</p>
                        <ul className="mt-2 space-y-1 text-sm text-text-secondary">
                          {executionStrategy.probabilityRealityCheck.commonFailureModes.map((item, index) => (
                            <li key={`failure-${index}`}>- {item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </ReportSection>

                  <ReportSection title="6) Behavioral Execution" count={executionStrategy.behavioralExecution.consistencyLooksLike.length}>
                    <p className="text-sm text-text-secondary">
                      <span className="font-semibold text-text-primary">Minimum weekly effort:</span>{' '}
                      {executionStrategy.behavioralExecution.minimumWeeklyEffort}
                    </p>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">What consistency looks like</p>
                        <ul className="mt-2 space-y-1 text-sm text-text-secondary">
                          {executionStrategy.behavioralExecution.consistencyLooksLike.map((item, index) => (
                            <li key={`consistency-${index}`}>- {item}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">What not to do</p>
                        <ul className="mt-2 space-y-1 text-sm text-text-secondary">
                          {executionStrategy.behavioralExecution.whatNotToDo.map((item, index) => (
                            <li key={`dont-${index}`}>- {item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </ReportSection>
                </Card>
              ) : transitionReport ? (
                <Card className="space-y-5 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-base font-bold text-text-primary">
                      What employers in {transitionReport.marketSnapshot.location || 'your region'} commonly ask for
                    </h3>
                    {transitionReport.evidenceTransparency.employerPostings.usedCache ? (
                      <Badge variant="default">Using cached market fingerprint</Badge>
                    ) : null}
                  </div>

                  <ReportSection
                    title="A) Market Snapshot"
                    count={transitionReport.marketSnapshot.topRequirements.length}
                    defaultOpen
                  >
                    <p className="text-sm text-text-secondary">{transitionReport.marketSnapshot.summaryLine}</p>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">
                        Top requirements
                      </p>
                      <ul className="mt-2 space-y-2 text-sm text-text-secondary">
                        {transitionReport.marketSnapshot.topRequirements.map((item) => (
                          <li key={item.id}>
                            <p className="font-medium text-text-primary">
                              {item.label} ({frequencyPercentLabel(item.frequency_percent)})
                            </p>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">
                        Top tools
                      </p>
                      <ul className="mt-2 space-y-1 text-sm text-text-secondary">
                        {transitionReport.marketSnapshot.topTools.map((item) => (
                          <li key={item.id}>
                            {item.label} ({frequencyPercentLabel(item.frequency_percent)})
                          </li>
                        ))}
                      </ul>
                    </div>
                    {transitionReport.marketSnapshot.gateBlockers.length > 0 ? (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">
                          Common credential/gate blockers
                        </p>
                        <ul className="mt-2 space-y-1 text-sm text-text-secondary">
                          {transitionReport.marketSnapshot.gateBlockers.map((item) => (
                            <li key={item.id}>
                              {item.label} ({frequencyPercentLabel(item.frequency_percent)})
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </ReportSection>

                  <ReportSection title="B) Must-Haves (Apply Gate)" count={transitionReport.mustHaves.length}>
                    {transitionReport.mustHaves.map((item) => (
                      <div key={item.id} className="rounded-md border border-border-light bg-surface p-3">
                        <p className="text-sm font-semibold text-text-primary">
                          {item.label} ({frequencyPercentLabel(item.frequency_percent)}) | {item.status}
                        </p>
                        <p className="mt-1 text-xs text-text-secondary">
                          {item.howToGet} Estimated time: {item.timeEstimate}.
                        </p>
                        {item.evidenceQuote.length > 0 ? (
                          <ul className="mt-2 space-y-1 text-xs text-text-tertiary">
                            {item.evidenceQuote.map((quote) => (
                              <li key={`${item.id}-${quote.source}-${quote.quote}`}>
                                &quot;{quote.quote}&quot;
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    ))}
                  </ReportSection>

                  <ReportSection title="C) Nice-to-Haves (Competitiveness Boosters)" count={transitionReport.niceToHaves.length}>
                    {transitionReport.niceToHaves.map((item) => (
                      <div key={item.id} className="rounded-md border border-border-light bg-surface p-3">
                        <p className="text-sm font-semibold text-text-primary">
                          {item.label} ({frequencyPercentLabel(item.frequency_percent)}) | {gapLevelLabel(item.gapLevel)}
                        </p>
                        <p className="mt-1 text-xs text-text-secondary">{item.howToLearn}</p>
                        {item.evidenceQuote.length > 0 ? (
                          <ul className="mt-2 space-y-1 text-xs text-text-tertiary">
                            {item.evidenceQuote.map((quote) => (
                              <li key={`${item.id}-${quote.source}-${quote.quote}`}>
                                &quot;{quote.quote}&quot;
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    ))}
                  </ReportSection>

                  <ReportSection title="D) Core Tasks You'll Be Expected To Do" count={transitionReport.coreTasks.length}>
                    {transitionReport.coreTasks.map((item) => (
                      <div key={item.id} className="rounded-md border border-border-light bg-surface p-3">
                        <p className="text-sm font-semibold text-text-primary">
                          {item.task} ({frequencyPercentLabel(item.frequency_percent)}) | {gapLevelLabel(item.gapLevel)}
                        </p>
                        {item.evidenceQuote.length > 0 ? (
                          <ul className="mt-2 space-y-1 text-xs text-text-tertiary">
                            {item.evidenceQuote.map((quote) => (
                              <li key={`${item.id}-${quote.source}-${quote.quote}`}>
                                &quot;{quote.quote}&quot;
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    ))}
                  </ReportSection>

                  <ReportSection title="E) Tools / Platforms / Equipment" count={transitionReport.toolsPlatformsEquipment.length}>
                    {transitionReport.toolsPlatformsEquipment.map((item) => (
                      <div key={item.id} className="rounded-md border border-border-light bg-surface p-3">
                        <p className="text-sm font-semibold text-text-primary">
                          {item.tool} ({frequencyPercentLabel(item.frequency_percent)}) | {gapLevelLabel(item.gapLevel)}
                        </p>
                        <p className="mt-1 text-xs text-text-secondary">{item.quickPractice}</p>
                        {item.evidenceQuote.length > 0 ? (
                          <ul className="mt-2 space-y-1 text-xs text-text-tertiary">
                            {item.evidenceQuote.map((quote) => (
                              <li key={`${item.id}-${quote.source}-${quote.quote}`}>
                                &quot;{quote.quote}&quot;
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    ))}
                  </ReportSection>

                  <ReportSection
                    title="F) Transferable Strengths (from your resume/background)"
                    count={transitionReport.transferableStrengths.filter((item) => !isPersonalIdentifier(item.strength)).length}
                  >
                    {transitionReport.transferableStrengths
                      .filter((item) => !isPersonalIdentifier(item.strength))
                      .map((item) => (
                      <div key={item.id} className="rounded-md border border-border-light bg-surface p-3 text-sm text-text-secondary">
                        <p className="font-semibold text-text-primary">{item.strength}</p>
                        <p className="mt-1 text-xs text-text-tertiary">
                          Counts toward:{' '}
                          {item.countsToward.length > 0
                            ? item.countsToward.map((target) => `${target.label} (${target.normalized_key})`).join(' | ')
                            : 'No direct mapping available'}
                        </p>
                      </div>
                    ))}
                  </ReportSection>

                  <ReportSection title="G) 30/60/90 Day Plan (roadmap)" count={transitionReport.plan30_60_90.days30.length + transitionReport.plan30_60_90.days60.length + transitionReport.plan30_60_90.days90.length}>
                    <div className="grid gap-3 md:grid-cols-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">30 days</p>
                        <ul className="mt-2 space-y-2 text-sm text-text-secondary">
                          {transitionReport.plan30_60_90.days30.map((step) => (
                            <li key={step.id}>
                              <p className="font-medium text-text-primary">{step.goal}</p>
                              <p className="text-xs text-text-tertiary">
                                Linked: {step.linkedRequirements.join(', ')}
                              </p>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">60 days</p>
                        <ul className="mt-2 space-y-2 text-sm text-text-secondary">
                          {transitionReport.plan30_60_90.days60.map((step) => (
                            <li key={step.id}>
                              <p className="font-medium text-text-primary">{step.goal}</p>
                              <p className="text-xs text-text-tertiary">
                                Linked: {step.linkedRequirements.join(', ')}
                              </p>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">90 days</p>
                        <ul className="mt-2 space-y-2 text-sm text-text-secondary">
                          {transitionReport.plan30_60_90.days90.map((step) => (
                            <li key={step.id}>
                              <p className="font-medium text-text-primary">{step.goal}</p>
                              <p className="text-xs text-text-tertiary">
                                Linked: {step.linkedRequirements.join(', ')}
                              </p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-md border border-border-light bg-bg-secondary p-3">
                        <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">Fastest path to apply</p>
                        <ul className="mt-2 space-y-2 text-sm text-text-secondary">
                          {transitionReport.plan30_60_90.fastestPathToApply.map((step) => (
                            <li key={step.id}>
                              <p className="font-medium text-text-primary">{step.goal}</p>
                              <p className="text-xs text-text-tertiary">Linked: {step.linkedRequirements.join(', ')}</p>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="rounded-md border border-border-light bg-bg-secondary p-3">
                        <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">Strong candidate path</p>
                        <ul className="mt-2 space-y-2 text-sm text-text-secondary">
                          {transitionReport.plan30_60_90.strongCandidatePath.map((step) => (
                            <li key={step.id}>
                              <p className="font-medium text-text-primary">{step.goal}</p>
                              <p className="text-xs text-text-tertiary">Linked: {step.linkedRequirements.join(', ')}</p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </ReportSection>

                  <ReportSection title="H) Evidence & Transparency Footer" count={3}>
                    <p className="text-sm text-text-secondary">
                      Employer postings (Adzuna cached): {transitionReport.evidenceTransparency.employerPostings.count} | Last updated:{' '}
                      {transitionReport.evidenceTransparency.employerPostings.lastUpdated ?? 'Not available'}
                    </p>
                    <p className="text-sm text-text-secondary">
                      User-provided posting included:{' '}
                      {transitionReport.evidenceTransparency.userProvidedPosting.included ? 'Yes' : 'No'}
                    </p>
                    <p className="text-sm text-text-secondary">
                      Baseline (O*NET) used:{' '}
                      {transitionReport.evidenceTransparency.baselineOnet.included ? 'Yes' : 'No'}
                    </p>
                    {transitionReport.evidenceTransparency.baselineOnlyWarning ? (
                      <p className="rounded-md border border-warning/25 bg-warning-light px-3 py-2 text-sm font-semibold text-warning">
                        {transitionReport.evidenceTransparency.baselineOnlyWarning}
                      </p>
                    ) : null}
                  </ReportSection>
                </Card>
              ) : plannerReport?.transitionSections ? (
                <Card className="space-y-5 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-base font-bold text-text-primary">
                      What employers in {(plannerReport.marketEvidence?.query?.location ?? locationText) || 'your region'} commonly ask for
                    </h3>
                    {plannerReport.marketEvidence?.usedCache ? (
                      <Badge variant="default">Using cached market fingerprint</Badge>
                    ) : null}
                  </div>

                  {weeklyPriorities.length > 0 ? (
                    <div className="rounded-md border border-border-light bg-bg-secondary p-3">
                      <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">
                        This week (top priorities)
                      </p>
                      <ul className="mt-2 space-y-2 text-sm text-text-secondary">
                        {weeklyPriorities.map((step) => (
                          <li key={step.id}>
                            <p>- {step.action}</p>
                            <p className="text-xs text-text-tertiary">Tied to: {step.tiedRequirement}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  <ReportSection
                    title="1) Mandatory Gate Requirements"
                    count={Math.min(plannerReport.transitionSections.mandatoryGateRequirements.length, 3)}
                    defaultOpen
                  >
                    {plannerReport.transitionSections.mandatoryGateRequirements.length > 0 ? (
                      <>
                        {plannerReport.transitionSections.mandatoryGateRequirements
                          .slice(0, 3)
                          .map((item) => {
                            const sourceCount = evidenceSourceCount(item.evidence)
                            const confidenceLabel = evidenceConfidenceLabel(item.evidence)
                            return (
                              <div
                                key={item.id}
                                className="rounded-md border border-border-light bg-surface p-3"
                              >
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-sm font-semibold text-text-primary">{item.label}</p>
                                  <span className="rounded-pill border border-border px-2 py-0.5 text-[11px] text-text-tertiary">
                                    {gapLevelLabel(item.gapLevel)}
                                  </span>
                                  <span
                                    className={`rounded-pill border px-2 py-0.5 text-[11px] ${evidenceChipClass(item.evidenceLabel)}`}
                                  >
                                    {item.evidenceLabel}
                                  </span>
                                  <span className="rounded-pill border border-border px-2 py-0.5 text-[11px] text-text-tertiary">
                                    {sourceCount} source{sourceCount === 1 ? '' : 's'}
                                  </span>
                                  {confidenceLabel ? (
                                    <span className="rounded-pill border border-border px-2 py-0.5 text-[11px] text-text-tertiary">
                                      {confidenceLabel}
                                    </span>
                                  ) : null}
                                </div>
                                <p className="mt-1 text-xs text-text-secondary">
                                  {item.howToGet} Estimated time: {item.estimatedTime}.
                                </p>
                              </div>
                            )
                          })}
                      </>
                    ) : (
                      <p className="text-sm text-text-secondary">No gate requirements identified.</p>
                    )}
                  </ReportSection>

                  <ReportSection
                    title="2) Core Hard Skills"
                    count={Math.min(plannerReport.transitionSections.coreHardSkills.length, 3)}
                  >
                    {plannerReport.transitionSections.coreHardSkills.length > 0 ? (
                      <>
                        {plannerReport.transitionSections.coreHardSkills.slice(0, 3).map((item) => {
                          const sourceCount = evidenceSourceCount(item.evidence)
                          const confidenceLabel = evidenceConfidenceLabel(item.evidence)
                          return (
                            <div key={item.id} className="rounded-md border border-border-light bg-surface p-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-semibold text-text-primary">{item.label}</p>
                                <span className="rounded-pill border border-border px-2 py-0.5 text-[11px] text-text-tertiary">
                                  {gapLevelLabel(item.gapLevel)}
                                </span>
                                <span
                                  className={`rounded-pill border px-2 py-0.5 text-[11px] ${evidenceChipClass(item.evidenceLabel)}`}
                                >
                                  {item.evidenceLabel}
                                </span>
                                <span className="rounded-pill border border-border px-2 py-0.5 text-[11px] text-text-tertiary">
                                  {sourceCount} source{sourceCount === 1 ? '' : 's'}
                                </span>
                                {confidenceLabel ? (
                                  <span className="rounded-pill border border-border px-2 py-0.5 text-[11px] text-text-tertiary">
                                    {confidenceLabel}
                                  </span>
                                ) : null}
                              </div>
                              <p className="mt-1 text-xs text-text-secondary">{item.howToLearn}</p>
                            </div>
                          )
                        })}
                      </>
                    ) : (
                      <p className="text-sm text-text-secondary">No hard-skill signals found.</p>
                    )}
                  </ReportSection>

                  <ReportSection
                    title="3) Tools / Platforms / Equipment"
                    count={Math.min(plannerReport.transitionSections.toolsPlatforms.length, 3)}
                  >
                    {plannerReport.transitionSections.toolsPlatforms.length > 0 ? (
                      <>
                        {plannerReport.transitionSections.toolsPlatforms.slice(0, 3).map((item) => {
                          const sourceCount = evidenceSourceCount(item.evidence)
                          const confidenceLabel = evidenceConfidenceLabel(item.evidence)
                          return (
                            <div key={item.id} className="rounded-md border border-border-light bg-surface p-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-semibold text-text-primary">{item.label}</p>
                                <span className="rounded-pill border border-border px-2 py-0.5 text-[11px] text-text-tertiary">
                                  {gapLevelLabel(item.gapLevel)}
                                </span>
                                <span
                                  className={`rounded-pill border px-2 py-0.5 text-[11px] ${evidenceChipClass(item.evidenceLabel)}`}
                                >
                                  {item.evidenceLabel}
                                </span>
                                <span className="rounded-pill border border-border px-2 py-0.5 text-[11px] text-text-tertiary">
                                  {sourceCount} source{sourceCount === 1 ? '' : 's'}
                                </span>
                                {confidenceLabel ? (
                                  <span className="rounded-pill border border-border px-2 py-0.5 text-[11px] text-text-tertiary">
                                    {confidenceLabel}
                                  </span>
                                ) : null}
                              </div>
                              <p className="mt-1 text-xs text-text-secondary">{item.quickProject}</p>
                            </div>
                          )
                        })}
                      </>
                    ) : (
                      <p className="text-sm text-text-secondary">No tool signals found.</p>
                    )}
                  </ReportSection>

                  <ReportSection
                    title="4) Experience Signals"
                    count={Math.min(plannerReport.transitionSections.experienceSignals.length, 3)}
                  >
                    {plannerReport.transitionSections.experienceSignals.length > 0 ? (
                      <>
                        {plannerReport.transitionSections.experienceSignals.slice(0, 3).map((item) => {
                          const sourceCount = evidenceSourceCount(item.evidence)
                          const confidenceLabel = evidenceConfidenceLabel(item.evidence)
                          return (
                            <div key={item.id} className="rounded-md border border-border-light bg-surface p-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-semibold text-text-primary">{item.label}</p>
                                <span className="rounded-pill border border-border px-2 py-0.5 text-[11px] text-text-tertiary">
                                  {gapLevelLabel(item.gapLevel)}
                                </span>
                                <span
                                  className={`rounded-pill border px-2 py-0.5 text-[11px] ${evidenceChipClass(item.evidenceLabel)}`}
                                >
                                  {item.evidenceLabel}
                                </span>
                                <span className="rounded-pill border border-border px-2 py-0.5 text-[11px] text-text-tertiary">
                                  {sourceCount} source{sourceCount === 1 ? '' : 's'}
                                </span>
                                {confidenceLabel ? (
                                  <span className="rounded-pill border border-border px-2 py-0.5 text-[11px] text-text-tertiary">
                                    {confidenceLabel}
                                  </span>
                                ) : null}
                              </div>
                              <p className="mt-1 text-xs text-text-secondary">{item.howToBuild}</p>
                            </div>
                          )
                        })}
                      </>
                    ) : (
                      <p className="text-sm text-text-secondary">No experience signals found.</p>
                    )}
                  </ReportSection>

                  <ReportSection
                    title="5) Transferable Strengths (from your inputs)"
                    count={Math.min(
                      plannerReport.transitionSections.transferableStrengths.filter(
                        (item) => !isPersonalIdentifier(item.label)
                      ).length,
                      3
                    )}
                  >
                    {plannerReport.transitionSections.transferableStrengths.filter(
                      (item) => !isPersonalIdentifier(item.label)
                    ).length > 0 ? (
                      <ul className="space-y-2">
                        {plannerReport.transitionSections.transferableStrengths
                          .filter((item) => !isPersonalIdentifier(item.label))
                          .slice(0, 3)
                          .map((item) => (
                          <li
                            key={item.id}
                            className="rounded-md border border-border-light bg-surface p-3 text-sm text-text-secondary"
                          >
                            <p className="font-semibold text-text-primary">{item.requirement}</p>
                            <p className="mt-1">{item.label}</p>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-text-secondary">
                        Add more measurable experience to increase mapped transferable strengths.
                      </p>
                    )}
                  </ReportSection>

                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-text-primary">6) Roadmap Plan</h4>
                    <div className="rounded-md border border-border-light bg-bg-secondary p-3">
                      <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">
                        Next 1-3 months
                      </p>
                      <ul className="mt-2 space-y-2 text-sm text-text-secondary">
                        {plannerReport.transitionSections.roadmapPlan.oneToThreeMonths.slice(0, 2).map((step) => (
                          <li key={step.id}>
                            - {step.action}
                            <p className="text-xs text-text-tertiary">Tied to: {step.tiedRequirement}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <details className="rounded-md border border-border-light bg-bg-secondary p-3">
                      <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">
                        View longer-horizon plan
                      </summary>
                      <div className="mt-3 space-y-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">
                            3-12 months
                          </p>
                          <ul className="mt-2 space-y-2 text-sm text-text-secondary">
                            {plannerReport.transitionSections.roadmapPlan.threeToTwelveMonths.slice(0, 3).map((step) => (
                              <li key={step.id}>
                                - {step.action}
                                <p className="text-xs text-text-tertiary">Tied to: {step.tiedRequirement}</p>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">
                              Fastest path to apply
                            </p>
                            <ul className="mt-2 space-y-1 text-sm text-text-secondary">
                              {plannerReport.transitionSections.roadmapPlan.fastestPathToApply.slice(0, 3).map((item) => (
                                <li key={item}>- {item}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">
                              Strong candidate path
                            </p>
                            <ul className="mt-2 space-y-1 text-sm text-text-secondary">
                              {plannerReport.transitionSections.roadmapPlan.strongCandidatePath.slice(0, 3).map((item) => (
                                <li key={item}>- {item}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    </details>
                  </div>
                </Card>
              ) : null}
              {plannerReport?.targetRequirements && !isTransitionMode ? (
                <Card className="p-5">
                  <h3 className="text-base font-bold text-text-primary">What This Job Requires</h3>
                  {plannerReport.targetRequirements.education ? (
                    <p className="mt-2 text-sm text-text-secondary">
                      <span className="font-semibold text-text-primary">Education:</span>{' '}
                      {plannerReport.targetRequirements.education}
                    </p>
                  ) : (
                    <p className="mt-2 text-sm text-text-secondary">
                      <span className="font-semibold text-text-primary">Education:</span> No formal
                      education baseline found in the dataset for this role.
                    </p>
                  )}
                  {plannerReport.targetRequirements.apprenticeshipHours ? (
                    <p className="mt-1 text-sm text-text-secondary">
                      <span className="font-semibold text-text-primary">Apprenticeship:</span>{' '}
                      {plannerReport.targetRequirements.apprenticeshipHours.toLocaleString()} hours
                      expected.
                    </p>
                  ) : null}
                  {typeof plannerReport.targetRequirements.examRequired === 'boolean' ? (
                    <p className="mt-1 text-sm text-text-secondary">
                      <span className="font-semibold text-text-primary">Exam requirement:</span>{' '}
                      {plannerReport.targetRequirements.examRequired ? 'Yes' : 'Not required'}
                    </p>
                  ) : null}
                  {plannerReport.targetRequirements.certifications.length > 0 ? (
                    <div className="mt-3">
                      <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">
                        Certifications / licenses
                      </p>
                      <ul className="mt-2 space-y-1 text-sm text-text-secondary">
                        {plannerReport.targetRequirements.certifications.slice(0, 4).map((item) => (
                          <li key={item}>- {item}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {plannerReport.targetRequirements.hardGates.length > 0 ? (
                    <div className="mt-3">
                      <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">
                        Hard gates
                      </p>
                      <ul className="mt-2 space-y-1 text-sm text-text-secondary">
                        {plannerReport.targetRequirements.hardGates.slice(0, 4).map((item) => (
                          <li key={item}>- {item}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {plannerReport.targetRequirements.employerSignals.length > 0 ? (
                    <div className="mt-3">
                      <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">
                        What hiring managers look for
                      </p>
                      <ul className="mt-2 space-y-1 text-sm text-text-secondary">
                        {plannerReport.targetRequirements.employerSignals.slice(0, 4).map((item) => (
                          <li key={item}>- {item}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </Card>
              ) : null}
              {plannerReport?.bottleneck && !isTransitionMode ? (
                <Card className="p-5">
                  <h3 className="text-base font-bold text-text-primary">#1 Bottleneck</h3>
                  <p className="mt-2 text-sm font-semibold text-warning">{plannerReport.bottleneck.title}</p>
                  <p className="mt-2 text-sm text-text-secondary">{plannerReport.bottleneck.why}</p>
                  <p className="mt-2 text-sm text-text-primary">
                    <span className="font-semibold">Next action:</span> {plannerReport.bottleneck.nextAction}
                  </p>
                  <p className="mt-1 text-xs text-text-tertiary">
                    Estimated effort: {plannerReport.bottleneck.estimatedEffort}
                  </p>
                </Card>
              ) : null}
              {isTransitionMode ? (
                <>
                  {skills.length < 3 && uploadState !== 'success' ? (
                    <Card className="p-5">
                      <p className="text-sm text-text-secondary">
                        Add a resume or at least 3 skills to get a detailed bridge plan.
                      </p>
                    </Card>
                  ) : null}

                  {transitionResourceLinks.length > 0 ? (
                    <ResourcesCard
                      links={transitionResourceLinks}
                      regulated={Boolean(primaryCareer?.regulated)}
                    />
                  ) : null}

                  <Card className="p-5">
                    <details>
                      <summary className="cursor-pointer text-base font-bold text-text-primary">
                        Optimize your resume for this path (Pro)
                      </summary>
                      <div className="mt-3">
                        {isProUser ? (
                          plannerReport?.resumeReframe?.length ? (
                            <ReframeList items={plannerReport.resumeReframe} />
                          ) : plannerResult.reframes.length > 0 ? (
                            <ReframeList items={plannerResult.reframes} />
                          ) : (
                            <p className="text-sm text-text-secondary">
                              Add more measurable achievements to generate resume optimization suggestions.
                            </p>
                          )
                        ) : (
                          <p className="text-sm text-text-secondary">
                            Upgrade to Pro to unlock resume rewrite suggestions tailored to this transition.
                          </p>
                        )}
                      </div>
                    </details>
                  </Card>
                </>
              ) : (
                <>
                  <ScoreCard result={plannerResult} notSureMode={recommendMode} targetRole={targetRoleText} />
                  {plannerReport ? (
                    <Card className="p-5">
                      <h3 className="text-base font-bold text-text-primary">Top Career Paths</h3>
                      {plannerReport.suggestedCareers.length > 0 ? (
                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                          {plannerReport.suggestedCareers.slice(0, 4).map((career) => {
                            const usdMedian = career.salary.usd?.median
                            const nativeMedian = career.salary.native?.median
                            const nativeCurrency = career.salary.native?.currency
                            return (
                              <div key={career.occupationId} className="rounded-md border border-border-light bg-bg-secondary p-3">
                                <div className="flex items-center justify-between gap-3">
                                  <p className="text-sm font-semibold text-text-primary">
                                    {career.title || 'Recommended occupation'}
                                  </p>
                                  <Badge>{career.score}/100</Badge>
                                </div>
                                <p className="mt-1 text-xs text-text-secondary">
                                  Difficulty: {career.difficulty} | Transition: {career.transitionTime}
                                </p>
                                {typeof usdMedian === 'number' ? (
                                  <p className="mt-2 text-sm text-text-primary">
                                    Median salary (USD): ${Math.round(usdMedian).toLocaleString()}
                                  </p>
                                ) : (
                                  <p className="mt-2 text-sm text-text-secondary">
                                    Not available for selected region
                                  </p>
                                )}
                                {career.salary.native ? (
                                  <p className="mt-1 text-xs text-text-tertiary">
                                    Native median ({nativeCurrency}):{' '}
                                    {typeof nativeMedian === 'number'
                                      ? `$${Math.round(nativeMedian).toLocaleString()}`
                                      : 'Not available'}
                                    {' | '}
                                    Source: {career.salary.native.sourceName} ({career.salary.native.asOfDate})
                                  </p>
                                ) : null}
                                {career.salary.conversion ? (
                                  <p className="text-xs text-text-tertiary">
                                    FX USD/CAD: {career.salary.conversion.rate} ({career.salary.conversion.asOfDate})
                                  </p>
                                ) : null}
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <p className="mt-3 text-sm text-text-secondary">
                          No ranked careers available for the selected region.
                        </p>
                      )}
                    </Card>
                  ) : null}
                  {plannerResult.transferableSkills.length > 0 ? (
                    <SkillsChips skills={plannerResult.transferableSkills} />
                  ) : null}
                  {plannerReport?.skillGaps?.length ? (
                    <GapsList
                      gaps={plannerReport.skillGaps.slice(0, 7).map((gap) => ({
                        title: mapSkillGapLabel(gap.skillName),
                        detail: gap.howToClose[0] ?? 'How to close this gap is not available yet.',
                        difficulty: gap.difficulty
                      }))}
                    />
                  ) : plannerResult.skillGaps.length > 0 ? (
                    <GapsList gaps={plannerResult.skillGaps} />
                  ) : null}
                  {plannerReport?.roadmap?.length ? (
                    <Card className="p-5">
                      <h3 className="text-base font-bold text-text-primary">Roadmap</h3>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        {plannerReport.roadmap.map((item) => (
                          <div key={item.id} className="rounded-md border border-border-light bg-bg-secondary p-3">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-sm font-semibold text-text-primary">{item.title}</p>
                              <Badge>{item.difficulty}</Badge>
                            </div>
                            <p className="mt-1 text-xs text-text-secondary">
                              {item.phase.replaceAll('_', ' ')} | {item.time_estimate_hours}h estimate
                            </p>
                            <p className="mt-2 text-sm text-text-secondary">{item.why_it_matters}</p>
                            <p className="mt-2 text-sm text-text-primary">Action: {item.action}</p>
                          </div>
                        ))}
                      </div>
                    </Card>
                  ) : plannerResult.roadmap.length > 0 ? (
                    <RoadmapSteps roadmap={plannerResult.roadmap} />
                  ) : null}
                  {plannerReport?.resumeReframe?.length ? (
                    <ReframeList items={plannerReport.resumeReframe} />
                  ) : plannerResult.reframes.length > 0 ? (
                    <ReframeList items={plannerResult.reframes} />
                  ) : null}
                </>
              )}

              {recommendedRoleSections.length > 0 ? (
                <Card className="print-hidden space-y-4 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-lg font-bold text-text-primary">Recommended Roles</h3>
                      <p className="mt-1 text-sm text-text-secondary">
                        These are grouped from your resolved role, your current signals, and the strongest nearby pathways.
                      </p>
                    </div>
                    {currentRoleResolution?.matched &&
                    currentRoleResolution.matched.confidence < 0.72 ? (
                      <Badge variant="default">Refine current role for tighter matches</Badge>
                    ) : null}
                  </div>
                  <div className="space-y-4">
                    {recommendedRoleSections.map((section) => (
                      <div key={section.title} className="rounded-lg border border-border-light bg-bg-secondary p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-base font-semibold text-text-primary">{section.title}</p>
                            <p className="mt-1 text-sm text-text-secondary">{section.description}</p>
                          </div>
                          <Badge variant="default">{section.roles.length} roles</Badge>
                        </div>
                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          {section.roles.map((role) => (
                            <div key={`${section.title}-${role.title}`} className="rounded-lg border border-border-light bg-surface p-4">
                              <p className="text-base font-semibold text-text-primary">{role.title}</p>
                              <ul className="mt-2 space-y-2 text-sm text-text-secondary">
                                {role.why.map((item) => (
                                  <li key={`${role.title}-${item}`}>- {item}</li>
                                ))}
                              </ul>
                              <p className="mt-3 text-xs text-text-tertiary">
                                Difficulty: {role.difficulty} | Timeline: {role.transitionTime}
                              </p>
                              <Button
                                variant="outline"
                                size="sm"
                                className="mt-3"
                                onClick={() => void handlePlanRecommendedRole(role.title)}
                              >
                                Plan this transition
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              ) : null}

              {plannerReport && isTransitionMode ? (
                <Card className="print-hidden space-y-4 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-lg font-bold text-text-primary">Job Recommendations</h3>
                      <p className="mt-1 text-sm text-text-secondary">
                        Live postings tied to your current target role and location.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void handleFetchJobRecommendations({ forceRefresh: true })}
                      disabled={jobRecommendationStatus === 'loading'}
                    >
                      {jobRecommendationStatus === 'loading' ? 'Refreshing...' : 'Refresh jobs'}
                    </Button>
                  </div>

                  {jobRecommendationStatus === 'loading' ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      {[0, 1, 2, 3].map((index) => (
                        <div key={index} className="h-28 animate-pulse rounded-lg border border-border-light bg-bg-secondary" />
                      ))}
                    </div>
                  ) : null}

                  {jobRecommendationStatus === 'error' ? (
                    <div className="rounded-lg border border-error/25 bg-error-light p-4">
                      <p className="text-sm text-error">{jobRecommendationMessage}</p>
                      <p className="mt-2 text-sm text-text-secondary">
                        Try refreshing, widening the location, or pasting a specific posting to tailor the plan.
                      </p>
                    </div>
                  ) : null}

                  {jobRecommendationStatus === 'empty' ? (
                    <div className="rounded-lg border border-border-light bg-bg-secondary p-4">
                      <p className="text-sm text-text-secondary">{jobRecommendationMessage}</p>
                    </div>
                  ) : null}

                  {jobRecommendationStatus === 'success' ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      {jobRecommendationItems.map((job) => (
                        <div key={job.id} className="rounded-lg border border-border-light bg-bg-secondary p-4">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <p className="text-base font-semibold text-text-primary">{job.title}</p>
                              <p className="mt-1 text-sm text-text-secondary">{job.company}</p>
                              <p className="mt-1 text-xs text-text-tertiary">{job.location}</p>
                            </div>
                            {job.sourceUrl ? (
                              <Link href={job.sourceUrl} className="text-xs font-medium text-accent hover:text-accent-hover">
                                View source
                              </Link>
                            ) : null}
                          </div>
                          <ul className="mt-3 space-y-2 text-sm text-text-secondary">
                            {job.reasons.map((item) => (
                              <li key={`${job.id}-${item}`}>- {item}</li>
                            ))}
                          </ul>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-3"
                            onClick={() => void handleUseJobRecommendation(job)}
                          >
                            Use this job to tailor plan
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </Card>
              ) : null}

              {plannerReport ? (
                <Card className="p-5">
                  <details>
                    <summary className="cursor-pointer text-base font-bold text-text-primary">
                      Data Transparency
                    </summary>
                    <div className="mt-2">
                      <p className="text-sm text-text-secondary">
                        Inputs used:{' '}
                        {plannerReport.dataTransparency.inputsUsed.length > 0
                          ? plannerReport.dataTransparency.inputsUsed.join(', ')
                          : 'Not available'}
                      </p>
                      <p className="mt-1 text-sm text-text-secondary">
                        Datasets used:{' '}
                        {friendlyDatasetNames.length > 0
                          ? friendlyDatasetNames.join(', ')
                          : 'Not available'}
                      </p>
                      {plannerReport.marketEvidence ? (
                        <p className="mt-1 text-sm text-text-secondary">
                          Market evidence:{' '}
                          {plannerReport.marketEvidence.baselineOnly
                            ? 'Baseline only'
                            : `${plannerReport.marketEvidence.postingsCount} postings analyzed${plannerReport.marketEvidence.usedCache ? ' (cached)' : ''}${(plannerReport.marketEvidence.llmNormalizedCount ?? 0) > 0 ? `, ${plannerReport.marketEvidence.llmNormalizedCount} GPT-normalized` : ''}`}
                        </p>
                      ) : null}
                      {wageSourceDateSummary.length > 0 ? (
                        <p className="mt-1 text-sm text-text-secondary">
                          Wage sources: {wageSourceDateSummary.join(', ')}
                        </p>
                      ) : null}
                      {plannerReport.dataTransparency.fxRateUsed ? (
                        <p className="mt-1 text-sm text-text-secondary">
                          FX rate: {plannerReport.dataTransparency.fxRateUsed}
                        </p>
                      ) : null}
                    </div>
                  </details>
                </Card>
              ) : null}
            </div>
          ) : null}
        </div>
        </div>
      </section>

      {!hasPlannerResults ? (
        <>
          <section className="print-hidden px-4 py-16 lg:px-[340px]">
            <div className="mx-auto w-full max-w-tool">
              <h2 className="text-center text-2xl font-bold text-text-primary">
                Frequently Asked Questions
              </h2>
              <FAQAccordion items={careerSwitchFaqs} className="mt-8" />
            </div>
          </section>

          <section className="print-hidden bg-bg-secondary px-4 py-16 lg:px-[170px]">
            <div className="mx-auto w-full max-w-content">
              <h2 className="text-center text-2xl font-bold text-text-primary">More Career Tools</h2>
              <div className="mt-8 grid gap-6 md:grid-cols-3">
                {careerSwitchMoreTools.map((tool) => (
                  <ToolCard
                    key={tool.slug}
                    slug={tool.slug}
                    title={tool.title}
                    description={tool.description}
                    icon={tool.icon}
                    isActive={tool.isActive}
                  />
                ))}
              </div>
              <div className="mt-8 text-center">
                <Link href="/tools" className="text-sm font-medium text-accent hover:text-accent-hover">
                  View all tools
                </Link>
              </div>
            </div>
          </section>
        </>
      ) : (
        <section className="print-hidden px-4 py-8 lg:px-[340px]">
          <div className="mx-auto w-full max-w-tool">
            <Card className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-text-secondary">Need help or want to try another tool?</p>
                <div className="flex items-center gap-3">
                  <Link href="/tools" className="text-sm font-medium text-accent hover:text-accent-hover">
                    More tools
                  </Link>
                  <Link href="/pricing" className="text-sm font-medium text-accent hover:text-accent-hover">
                    Pricing
                  </Link>
                </div>
              </div>
            </Card>
          </div>
        </section>
      )}
    </>
  )
}
