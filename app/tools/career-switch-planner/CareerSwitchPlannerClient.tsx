'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import Badge from '@/components/Badge'
import Button from '@/components/Button'
import Card from '@/components/Card'
import ToolCard from '@/components/ToolCard'
import {
  BridgePlanPhases,
  CompatibilityBreakdownAccordion,
  DetectedSectionsChips,
  DropzoneUpload,
  FAQAccordion,
  GapsList,
  HaveNowCard,
  InputCard,
  LockedPanel,
  NeedNextCard,
  ParseProgress,
  PrimaryButton,
  ReframeList,
  ResumeExtractionReviewCard,
  ResourcesCard,
  RoadmapSteps,
  RoleAutocomplete,
  RoleRecommendationCard,
  ScoreCard,
  SelectField,
  SkillsChipsInput,
  SkillsChips,
  Toggle,
  TransitionOverviewCard,
  ToolHero
} from '@/components/career-switch-planner/CareerSwitchPlannerComponents'
import {
  careerSwitchFaqs,
  careerSwitchMoreTools
} from '@/lib/planner/content'
import {
  type CareerSwitchPlannerResult,
  toPlannerResultView,
  type PlannerResultView
} from '@/lib/planner/types'
import { useToolUsage, type ToolUsageResult } from '@/lib/hooks/useToolUsage'
import { useAuth } from '@/lib/auth/context'
import { getSupabaseAuthHeaders } from '@/lib/supabase/authHeaders'

type PlannerState = 'idle' | 'loading' | 'results'
type UploadState = 'idle' | 'parsing' | 'success' | 'error'
type OcrCapabilityMode = 'native' | 'fallback' | 'unavailable'
type OcrCapabilityStatus = 'idle' | 'loading' | 'ready' | 'error'
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
    region: 'CA' | 'US'
    confidence: number
    matchedBy: string
  } | null
  suggestions: Array<{
    occupationId: string
    title: string
    region: 'CA' | 'US'
    confidence: number
    matchedBy: string
  }>
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
    howToClose: string[]
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
// TODO: replace with /api/career-map/skills once a skills autocomplete endpoint is available.
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
  fx_rates: 'FX rates'
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

const REQUIRED_GAP_PATTERN =
  /\b(license|licence|cert|certificate|registration|apprentice|journey|red seal|coq|osha|whmis|csts|first aid|cpr|code|compliance|safety)\b/i

function mapSkillGapLabel(value: string) {
  const key = value.trim().toLowerCase()
  return GAP_LABEL_OVERRIDES[key] ?? value
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

function timelineLabel(value: TimelineBucketValue) {
  if (value === 'immediate') return 'Immediate (0-30 days)'
  if (value === '1-3 months') return '1-3 months'
  if (value === '3-6 months') return '3-6 months'
  return '6-12+ months'
}

function entryFeasibilityLabel(score: number) {
  if (score >= 70) return 'Entry achievable'
  if (score >= 45) return 'Possible with focused prep'
  return 'Long-run transition'
}

function transitionSummary(options: {
  currentRole: string
  targetRole: string
  matchedSkills: string[]
  missingSkills: string[]
}) {
  const matched = options.matchedSkills.slice(0, 2).join(', ')
  const missing = options.missingSkills.slice(0, 2).join(', ')
  if (matched && missing) {
    return `This is a bigger transition, but achievable with focused prep. Your strengths in ${matched} are transferable; close ${missing} next to move toward ${options.targetRole}.`
  }
  if (matched) {
    return `This transition is realistic with focused execution. Build on ${matched} and follow the bridge plan to move from ${options.currentRole} toward ${options.targetRole}.`
  }
  if (missing) {
    return `This is a stretch but achievable with focused prep. Prioritize ${missing} first, then follow the phased steps to build entry readiness for ${options.targetRole}.`
  }
  return `This is a bigger transition that needs structured prep. Use the bridge plan to build evidence and close priority gaps for ${options.targetRole}.`
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

type BridgePhaseView = {
  id: string
  title: string
  subtitle: string
  steps: Array<{ id: string; action: string; estimate?: string; resource?: { label: string; url: string } | null }>
}

function buildBridgePhases(options: {
  timeline: TimelineBucketValue
  roadmap: Array<{
    id: string
    title: string
    action: string
    why_it_matters: string
    time_estimate_hours: number
  }>
  resources: Array<{ label: string; url: string }>
}) {
  const baseByTimeline: Record<TimelineBucketValue, Array<{ id: string; title: string; subtitle: string }>> = {
    immediate: [
      { id: 'immediate', title: 'Immediate (0-30): Positioning + outreach + entry steps', subtitle: 'Start with entry actions and proof of readiness.' },
      { id: 'one-to-three', title: '1-3 months: Foundations + applications + interviews', subtitle: 'Build interview readiness and practical evidence.' },
      { id: 'three-to-six', title: '3-6 months: Credentialing + portfolio/proof + placement', subtitle: 'Close higher-weight gaps and convert to offers.' }
    ],
    '1-3 months': [
      { id: 'one-to-three', title: '1-3 months: Foundations + applications + interviews', subtitle: 'Build core readiness and tighten positioning.' },
      { id: 'three-to-six', title: '3-6 months: Credentialing + portfolio/proof + placement', subtitle: 'Turn skill closure into interview conversion.' },
      { id: 'six-plus', title: '6-12+ months: Formal track + milestones', subtitle: 'Execute longer qualification milestones if needed.' }
    ],
    '3-6 months': [
      { id: 'three-to-six', title: '3-6 months: Credentialing + portfolio/proof + placement', subtitle: 'Focus on high-impact gaps and formal requirements.' },
      { id: 'six-plus', title: '6-12+ months: Formal track + milestones', subtitle: 'Track certification and placement milestones.' }
    ],
    '6-12+ months': [
      { id: 'six-plus', title: '6-12+ months: Formal training/apprenticeship path + milestones', subtitle: 'Prioritize certification pathway and durable outcomes.' }
    ]
  }

  const phaseTemplates = baseByTimeline[options.timeline]
  const phases: BridgePhaseView[] = phaseTemplates.map((template) => ({
    ...template,
    steps: []
  }))

  options.roadmap.forEach((item, index) => {
    const phaseIndex = Math.min(index, phases.length - 1)
    const resource = options.resources[index] ?? null
    phases[phaseIndex].steps.push({
      id: item.id,
      action: item.action || item.title || item.why_it_matters,
      estimate: Number.isFinite(item.time_estimate_hours) && item.time_estimate_hours > 0
        ? `${item.time_estimate_hours}h estimate`
        : undefined,
      resource
    })
  })

  return phases
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

export default function CareerSwitchPlannerPage() {
  const searchParams = useSearchParams()
  const { getUsage } = useToolUsage()
  const { user, plan } = useAuth()

  const [plannerState, setPlannerState] = useState<PlannerState>('idle')
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
  const [recommendMode, setRecommendMode] = useState(false)
  const [skills, setSkills] = useState<string[]>([])
  const [experienceText, setExperienceText] = useState('')
  const [inputError, setInputError] = useState('')
  const [plannerResult, setPlannerResult] = useState<PlannerResultView | null>(null)
  const [plannerReport, setPlannerReport] = useState<PlannerReportPayload | null>(null)
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
  const [timelineBucket, setTimelineBucket] = useState<TimelineBucketValue>('1-3 months')
  const [educationLevel, setEducationLevel] = useState<EducationLevelValue>("Bachelor's")
  const [incomeTarget, setIncomeTarget] = useState<IncomeTargetValue>('Not sure')
  const [detectedSections, setDetectedSections] = useState({
    experience: false,
    skills: false,
    education: false
  })
  const [usage, setUsage] = useState<ToolUsageResult | null>(null)
  const [isUsageLoading, setIsUsageLoading] = useState(true)

  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
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
          skills?: Array<{ id?: string; name?: string; confidence?: number }>
          certifications?: string[]
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
            .map((item) => (typeof item?.name === 'string' ? item.name.trim() : ''))
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
    if (currentRoleSelectedMatch && value.trim() !== currentRoleSelectedMatch.title) {
      setCurrentRoleSelectedMatch(null)
    }
  }

  const handleTargetRoleInputChange = (value: string) => {
    setTargetRoleText(value)
    if (targetRoleSelectedMatch && value.trim() !== targetRoleSelectedMatch.title) {
      setTargetRoleSelectedMatch(null)
    }
  }

  const handleGeneratePlan = async () => {
    if (isLocked || isUsageLoading) {
      return
    }

    if (!user) {
      setInputError('Sign in to generate and save your plan.')
      return
    }

    if (!hasMinimumRequiredInput) {
      setInputError('Add a current role, an experience summary, or at least 3 skills to continue.')
      return
    }

    if (!recommendMode && !targetRoleText.trim()) {
      setInputError('Add your target role or enable Not sure mode.')
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

      const normalizedExperience = [
        experienceText.trim(),
        skills.length > 0 ? `Skills: ${skills.join(', ')}` : '',
        resumeStructuredSnapshot.certifications.length > 0
          ? `Certifications: ${resumeStructuredSnapshot.certifications.join(', ')}`
          : ''
      ]
        .filter(Boolean)
        .join('\n')
      const confirmedSkills = mergeUniqueCaseInsensitive(skills, resumeStructuredSnapshot.certifications)
      const currentRoleFallback =
        currentRoleText.trim() || (confirmedSkills.length > 0 ? `${confirmedSkills[0]} specialist` : 'Career transition')
      const targetRoleValue = recommendMode ? '' : targetRoleText.trim()

      const response = await fetch('/api/tools/career-switch-planner', {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify({
          currentRoleText: currentRoleText.trim(),
          targetRoleText: recommendMode ? null : targetRoleValue,
          currentRoleOccupationId: currentRoleSelectedMatch?.occupationId ?? null,
          targetRoleOccupationId:
            recommendMode ? null : targetRoleSelectedMatch?.occupationId ?? null,
          recommendMode,
          skills: confirmedSkills,
          experienceText: normalizedExperience,
          educationLevel,
          workRegion,
          timelineBucket,
          incomeTarget,
          currentRole: currentRoleFallback,
          targetRole: targetRoleValue,
          notSureMode: recommendMode,
          location: toLocationFromWorkRegion(workRegion),
          timeline: timelineBucket,
          education: educationLevel
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
      const resolvedCurrentRole =
        data?.report?.roleResolution?.current?.matched?.title ??
        currentRoleText.trim() ||
        currentRoleFallback
      const resolvedTargetRole = recommendMode
        ? ''
        : data?.report?.roleResolution?.target?.matched?.title ?? targetRoleValue
      setLastSubmittedSnapshot({
        currentRole: resolvedCurrentRole,
        targetRole: resolvedTargetRole,
        currentRoleInput: currentRoleText.trim() || currentRoleFallback,
        targetRoleInput: targetRoleValue,
        recommendMode,
        timelineBucket
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

  const handleUseExample = () => {
    setCurrentRoleText('Customer Success Specialist')
    setTargetRoleText('Product Operations Manager')
    setCurrentRoleSelectedMatch(null)
    setTargetRoleSelectedMatch(null)
    setExperienceText(
      '5 years in customer operations. Led onboarding for 12 new teammates, improved retention by 14%, and built KPI dashboards for cross-functional teams.'
    )
    setSkills(['Stakeholder management', 'Process improvement', 'SQL'])
    setRecommendMode(false)
    setWorkRegion('ca')
    setTimelineBucket('1-3 months')
    setEducationLevel("Bachelor's")
    setIncomeTarget('$75-100k')
    dismissDetectedResumeData()
    setInputError('')
  }

  const primaryCareer = plannerReport?.suggestedCareers?.[0] ?? null
  const transitionMatchedSkills = plannerResult?.strongestAreas ?? []
  const transitionMissingSkills = (plannerReport?.skillGaps ?? []).map((gap) => gap.skillName)
  const transitionSummaryText = transitionSummary({
    currentRole: lastSubmittedSnapshot?.currentRole || currentRoleText || 'Current role',
    targetRole: lastSubmittedSnapshot?.targetRole || targetRoleText || 'Target role',
    matchedSkills: transitionMatchedSkills,
    missingSkills: transitionMissingSkills
  })
  const transitionSalaryText = (() => {
    if (!primaryCareer?.salary?.usd) return 'Salary: Not available for selected region'
    const usd = primaryCareer.salary.usd
    const format = (value: number | null) =>
      typeof value === 'number' ? `$${Math.round(value).toLocaleString()}` : null
    const low = format(usd.low)
    const high = format(usd.high)
    const median = format(usd.median)
    if (low && high) return `Salary: ${low} - ${high} (USD)`
    if (median) return `Salary: ~${median} (USD)`
    return 'Salary: Not available for selected region'
  })()
  const transitionNativeSalary = (() => {
    const native = primaryCareer?.salary?.native
    if (!native) return null
    const median =
      typeof native.median === 'number' ? `$${Math.round(native.median).toLocaleString()}` : 'Not available'
    return `Native (${native.currency}) median: ${median} | Source: ${native.sourceName} (${native.asOfDate})`
  })()
  const timelineForResults = timelineLabel(lastSubmittedSnapshot?.timelineBucket ?? timelineBucket)
  const transitionNeedNextItems = (() => {
    const hasCertificationPressure =
      (plannerReport?.compatibilitySnapshot.breakdown.certification_gap ?? 15) < 10
    const items = (plannerReport?.skillGaps ?? [])
      .slice(0, 7)
      .map((gap) => ({
        title: mapSkillGapLabel(gap.skillName),
        why: gap.howToClose[0] ?? 'This gap appears in high-weight requirements for the path.',
        level: (REQUIRED_GAP_PATTERN.test(gap.skillName) ? 'Required' : 'Recommended') as 'Required' | 'Recommended'
      }))
    if (primaryCareer?.regulated) {
      items.unshift({
        title: 'Licensing or certification pathway',
        why: 'Regulated roles require official registration or exam progress for entry and advancement.',
        level: 'Required'
      })
    }
    if (hasCertificationPressure && !items.some((item) => item.level === 'Required')) {
      items.unshift({
        title: 'Certification or licensing evidence',
        why: 'This path expects certification or licensing signals; add one verified credential to improve feasibility.',
        level: 'Required'
      })
    }
    return items
  })()
  const transitionResourceLinks = dedupeLinks([
    ...((primaryCareer?.officialLinks ?? []).filter((link) => link?.url && link?.label)),
    ...((plannerReport?.linksResources ?? [])
      .filter((link) => link.type === 'official' && link.url && link.label)
      .map((link) => ({ label: link.label, url: link.url })))
  ]).slice(0, 8)
  const transitionBridgePhases = buildBridgePhases({
    timeline: lastSubmittedSnapshot?.timelineBucket ?? timelineBucket,
    roadmap: plannerReport?.roadmap ?? [],
    resources: transitionResourceLinks
  })
  const currentRoleResolution = plannerReport?.roleResolution?.current ?? null
  const targetRoleResolution = plannerReport?.roleResolution?.target ?? null
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

  return (
    <>
      <ToolHero>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Badge className="gap-1.5">{usageLabel(usage, previewLocked, plan)}</Badge>
          <Badge className="gap-1.5">Resume Upload (Pro)</Badge>
        </div>
        <h1 className="text-[34px] font-bold leading-tight text-text-primary md:text-[40px]">
          Career Switch Planner
        </h1>
        <p className="max-w-[680px] text-base leading-[1.6] text-text-secondary md:text-lg">
          Structured inputs, deterministic scoring, and real wage data for US and Canada.
        </p>
        <p className="text-[13px] text-text-tertiary">
          Free includes 3 lifetime analyses total.
        </p>
        <p className="text-[13px] text-text-tertiary">
          Pro includes unlimited analyses, resume parsing, full roadmap depth, and resume reframe output.
        </p>
      </ToolHero>

      <section className="px-4 py-16 lg:px-[340px]">
        <InputCard>
          <div className="space-y-6">
            <div className="space-y-3">
              <h2 className="text-base font-bold text-text-primary">1) Starting Point</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <RoleAutocomplete
                  id="current-role"
                  label="Current Role"
                  value={currentRoleText}
                  placeholder="Type your current role"
                  region={roleAutocompleteRegion}
                  onChange={handleCurrentRoleInputChange}
                  onSuggestionSelect={(suggestion) => {
                    setCurrentRoleSelectedMatch({
                      occupationId: suggestion.occupationId,
                      title: suggestion.title,
                      confidence: suggestion.confidence ?? 0,
                      matchedBy: suggestion.matchedBy ?? 'fallback'
                    })
                  }}
                />
                <RoleAutocomplete
                  id="target-role"
                  label="Target Role"
                  value={targetRoleText}
                  placeholder={
                    recommendMode ? 'Disabled while recommendation mode is on' : 'Type your target role'
                  }
                  region={roleAutocompleteRegion}
                  disabled={recommendMode}
                  helperText={
                    recommendMode
                      ? 'Recommendation mode is enabled. We will rank top roles for you.'
                      : undefined
                  }
                  onChange={handleTargetRoleInputChange}
                  onSuggestionSelect={(suggestion) => {
                    setTargetRoleSelectedMatch({
                      occupationId: suggestion.occupationId,
                      title: suggestion.title,
                      confidence: suggestion.confidence ?? 0,
                      matchedBy: suggestion.matchedBy ?? 'fallback'
                    })
                  }}
                />
              </div>
              <Toggle
                checked={recommendMode}
                onChange={(next) => {
                  setRecommendMode(next)
                  if (next) {
                    setTargetRoleText('')
                    setTargetRoleSelectedMatch(null)
                  }
                }}
                label="Not sure - recommend roles for me"
              />
              {recommendMode ? (
                <p className="text-xs text-text-secondary">
                  Target role is optional in this mode. Output will include ranked role recommendations.
                </p>
              ) : null}
            </div>

            <div className="h-px w-full bg-border" />

            <div className="space-y-3">
              <h2 className="text-base font-bold text-text-primary">2) Background</h2>
              <SkillsChipsInput
                id="skills-input"
                label="Skills"
                skills={skills}
                suggestions={FALLBACK_SKILL_SUGGESTIONS}
                placeholder="Start typing (e.g., stakeholder management, electrical safety)"
                helperText="Autocomplete uses a local starter list for now. Custom skills are allowed."
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

            <div className="h-px w-full bg-border" />

            <div className="space-y-3">
              <h2 className="text-base font-bold text-text-primary">3) Constraints</h2>
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
            </div>
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

          <div className="mt-5 flex flex-col gap-3 md:flex-row">
            <PrimaryButton
              onClick={handleGeneratePlan}
              isLoading={plannerState === 'loading'}
              className="md:flex-1"
              disabled={
                isUsageLoading ||
                plannerState === 'loading' ||
                !user ||
                !hasMinimumRequiredInput ||
                (!recommendMode && !targetRoleText.trim())
              }
            >
              {user ? 'Generate My Data-Backed Plan' : 'Sign In to Generate'}
            </PrimaryButton>
            <Button variant="outline" onClick={handleUseExample} className="md:flex-1">
              Use Example
            </Button>
          </div>

          <p className="mt-3 text-[13px] text-text-tertiary">
            We use your inputs + real occupational and wage datasets to generate this report.
          </p>
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
                Add your role details and experience to generate a compatibility report.
              </p>
              <p className="mt-2 text-sm text-text-secondary">
                Use Paste Experience for a quick run, or Upload Resume (Pro) to auto-extract text.
              </p>
            </Card>
          ) : plannerState === 'loading' ? (
            <div className="mt-5 space-y-3">
              {[0, 1, 2, 3, 4].map((index) => (
                <div key={index} className="h-24 animate-pulse rounded-lg border border-border bg-bg-secondary" />
              ))}
            </div>
          ) : plannerResult ? (
            <div className="mt-5 space-y-3">
              {(currentRoleResolution || targetRoleResolution) ? (
                <Card className="p-5">
                  <h3 className="text-base font-bold text-text-primary">Role Match</h3>
                  {currentRoleResolution ? (
                    <div className="mt-3 rounded-md border border-border-light bg-bg-secondary p-3">
                      <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">
                        Current role
                      </p>
                      <p className="mt-1 text-sm text-text-secondary">
                        You entered: {currentRoleResolution.input || 'Not provided'}
                      </p>
                      {currentRoleResolution.matched ? (
                        <p className="mt-1 text-sm text-text-primary">
                          Matched to: {currentRoleResolution.matched.title}{' '}
                          <span className="text-text-tertiary">
                            ({Math.round(currentRoleResolution.matched.confidence * 100)}%)
                          </span>
                        </p>
                      ) : (
                        <p className="mt-1 text-sm text-warning">
                          No exact match. We used the closest role context from your input.
                        </p>
                      )}
                    </div>
                  ) : null}
                  {targetRoleResolution ? (
                    <div className="mt-3 rounded-md border border-border-light bg-bg-secondary p-3">
                      <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">
                        Target role
                      </p>
                      <p className="mt-1 text-sm text-text-secondary">
                        You entered: {targetRoleResolution.input || 'Not provided'}
                      </p>
                      {targetRoleResolution.matched ? (
                        <p className="mt-1 text-sm text-text-primary">
                          Matched to: {targetRoleResolution.matched.title}{' '}
                          <span className="text-text-tertiary">
                            ({Math.round(targetRoleResolution.matched.confidence * 100)}%)
                          </span>
                        </p>
                      ) : (
                        <p className="mt-1 text-sm text-warning">
                          No exact match. Select one of the closest options and regenerate.
                        </p>
                      )}
                      {targetRoleResolution.suggestions.length > 0 ? (
                        <p className="mt-2 text-xs text-text-tertiary">
                          Closest: {targetRoleResolution.suggestions.slice(0, 3).map((item) => item.title).join(' | ')}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </Card>
              ) : null}
              {plannerReport?.targetRequirements ? (
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
              {plannerReport?.bottleneck ? (
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
                  <TransitionOverviewCard
                    currentRole={lastSubmittedSnapshot?.currentRole || currentRoleText || 'Current role'}
                    targetRole={lastSubmittedSnapshot?.targetRole || targetRoleText || 'Target role'}
                    entryFeasibility={entryFeasibilityLabel(plannerReport?.compatibilitySnapshot.score ?? plannerResult.score)}
                    difficulty={primaryCareer?.difficulty ?? 'moderate'}
                    timeline={timelineForResults}
                    salary={transitionSalaryText}
                    nativeSalary={transitionNativeSalary}
                    summary={transitionSummaryText}
                  />

                  {skills.length < 3 && uploadState !== 'success' ? (
                    <Card className="p-5">
                      <p className="text-sm text-text-secondary">
                        Add a resume or at least 3 skills to get a detailed bridge plan.
                      </p>
                    </Card>
                  ) : null}

                  <HaveNowCard
                    certifications={resumeStructuredSnapshot.certifications}
                    matchedSkills={transitionMatchedSkills}
                  />

                  <NeedNextCard items={transitionNeedNextItems} />

                  <BridgePlanPhases
                    phases={transitionBridgePhases}
                    emptyMessage="Add skills or resume to generate a full plan."
                  />

                  <ResourcesCard
                    links={transitionResourceLinks}
                    regulated={Boolean(primaryCareer?.regulated)}
                  />

                  <CompatibilityBreakdownAccordion
                    score={plannerReport?.compatibilitySnapshot.score ?? plannerResult.score}
                    breakdown={plannerReport?.compatibilitySnapshot.breakdown ?? {
                      skill_overlap: 0,
                      experience_similarity: 0,
                      education_alignment: 0,
                      certification_gap: 0,
                      timeline_feasibility: 0
                    }}
                  />

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

              {plannerReport ? (
                <Card className="p-5">
                  <h3 className="text-base font-bold text-text-primary">Data Transparency</h3>
                  <p className="mt-2 text-sm text-text-secondary">
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
                </Card>
              ) : null}

              {!isTransitionMode && recommendMode && plannerResult.recommendations.length > 0 && (
                <Card className="p-5">
                  <h3 className="text-lg font-bold text-text-primary">Suggested Alternative Careers</h3>
                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    {plannerResult.recommendations.map((recommendation) => (
                      <RoleRecommendationCard
                        key={recommendation.title}
                        recommendation={recommendation}
                      />
                    ))}
                  </div>
                </Card>
              )}
            </div>
          ) : null}
        </div>
      </section>

      <section className="px-4 py-16 lg:px-[340px]">
        <div className="mx-auto w-full max-w-tool">
          <h2 className="text-center text-2xl font-bold text-text-primary">Frequently Asked Questions</h2>
          <FAQAccordion items={careerSwitchFaqs} className="mt-8" />
        </div>
      </section>

      <section className="bg-bg-secondary px-4 py-16 lg:px-[170px]">
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
  )
}
