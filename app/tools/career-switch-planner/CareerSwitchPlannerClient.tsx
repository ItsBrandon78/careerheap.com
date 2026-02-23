'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import Badge from '@/components/Badge'
import Button from '@/components/Button'
import Card from '@/components/Card'
import ToolCard from '@/components/ToolCard'
import {
  DetectedSectionsChips,
  DropzoneUpload,
  ExtractedTextArea,
  FAQAccordion,
  GapsList,
  InputCard,
  LockedPanel,
  ParseProgress,
  PrimaryButton,
  ReframeList,
  RoadmapSteps,
  RoleInput,
  RoleRecommendationCard,
  ScoreCard,
  SegmentedTabs,
  SelectField,
  SkillsChips,
  Toggle,
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
type InputTab = 'paste' | 'upload'
type UploadState = 'idle' | 'parsing' | 'success' | 'error'

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024
const ACCEPTED_EXTENSIONS = ['pdf', 'docx']
const FREE_LIMIT = 3

function usageLabel(
  usage: ToolUsageResult | null,
  previewLocked: boolean,
  planFallback: 'free' | 'pro' | 'lifetime'
) {
  if (previewLocked) return 'Locked Preview'
  if (planFallback === 'lifetime') return 'Lifetime Access'
  if (planFallback === 'pro') return 'Unlimited Pro'
  if (usage?.isUnlimited) return usage.plan === 'lifetime' ? 'Lifetime Access' : 'Unlimited Pro'
  return `${usage?.usesRemaining ?? FREE_LIMIT} Free Uses Left`
}

export default function CareerSwitchPlannerPage() {
  const searchParams = useSearchParams()
  const { getUsage } = useToolUsage()
  const { user, plan } = useAuth()

  const [plannerState, setPlannerState] = useState<PlannerState>('idle')
  const [activeTab, setActiveTab] = useState<InputTab>('paste')
  const [currentRole, setCurrentRole] = useState('')
  const [targetRole, setTargetRole] = useState('')
  const [notSureMode, setNotSureMode] = useState(false)
  const [pasteExperience, setPasteExperience] = useState('')
  const [extractedResumeText, setExtractedResumeText] = useState('')
  const [inputError, setInputError] = useState('')
  const [plannerResult, setPlannerResult] = useState<PlannerResultView | null>(null)
  const [uploadState, setUploadState] = useState<UploadState>('idle')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadError, setUploadError] = useState('')
  const [uploadWarning, setUploadWarning] = useState('')
  const [uploadStats, setUploadStats] = useState<{ meaningfulChars: number } | null>(null)
  const [location, setLocation] = useState('Remote (US)')
  const [timeline, setTimeline] = useState('30/60/90')
  const [education, setEducation] = useState("Bachelor's")
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

  const experienceInput = activeTab === 'upload' ? extractedResumeText.trim() : pasteExperience.trim()

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

      const response = await fetch('/api/resume/parse', {
        method: 'POST',
        body: formData
      })

      const data = (await response.json()) as {
        ok?: boolean
        source?: 'docx' | 'pdf' | 'pdf-ocr'
        error?: string
        text?: string
        detected?: { experience: boolean; skills: boolean; education: boolean }
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
      setExtractedResumeText(data.text)
      setDetectedSections(data.detected)
      setUploadWarning(
        data.warning ??
          (data.source === 'pdf-ocr'
            ? 'Scanned PDF detected - OCR used (may take a few seconds).'
            : '')
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

  const handleGeneratePlan = async () => {
    if (isLocked || isUsageLoading) {
      return
    }

    if (!user) {
      setInputError('Sign in to generate and save your plan.')
      return
    }

    if (activeTab === 'upload' && !isProUser) {
      setUploadError('Pro feature: Upload your resume to autofill. Use Paste Experience or upgrade.')
      setUploadState('error')
      return
    }

    if (!currentRole.trim()) {
      setInputError('Add your current role before generating a plan.')
      return
    }

    if (!notSureMode && !targetRole.trim()) {
      setInputError('Add your target role or enable Not sure mode.')
      return
    }

    if (experienceInput.length < 40) {
      setInputError('Add at least a short summary of your experience to generate a useful plan.')
      return
    }

    setInputError('')
    setPlannerState('loading')

    try {
      const response = await fetch('/api/tools/career-switch-planner', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(await getSupabaseAuthHeaders())
        },
        body: JSON.stringify({
          currentRole: currentRole.trim(),
          targetRole: targetRole.trim(),
          notSureMode,
          experienceText: experienceInput,
          location,
          timeline,
          education
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
    setCurrentRole('Customer Success Specialist')
    setTargetRole('Product Operations Manager')
    setPasteExperience(
      '5 years in customer operations. Led onboarding for 12 new teammates, improved retention by 14%, and built KPI dashboards for cross-functional teams.'
    )
    setNotSureMode(false)
    setInputError('')
  }

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
          See how your skills transfer - and get a step-by-step plan.
        </p>
        <p className="text-[13px] text-text-tertiary">
          Sign in to generate plans and enforce usage limits.
        </p>
      </ToolHero>

      <section className="px-4 py-16 lg:px-[340px]">
        <InputCard>
          <div className="grid gap-4 md:grid-cols-2">
            <RoleInput
              id="current-role"
              label="Current Role"
              value={currentRole}
              placeholder="e.g., Customer Success Specialist"
              onChange={setCurrentRole}
            />
            <RoleInput
              id="target-role"
              label="Target Role"
              value={targetRole}
              placeholder={notSureMode ? 'Not sure mode enabled' : 'e.g., Product Manager'}
              onChange={setTargetRole}
            />
          </div>

          <div className="mt-4">
            <Toggle
              checked={notSureMode}
              onChange={setNotSureMode}
              label="Not sure - recommend roles for me"
            />
          </div>

          <div className="mt-4">
            <SegmentedTabs activeTab={activeTab} onChange={setActiveTab} uploadLocked={!isProUser} />
          </div>

          <div className="mt-4 space-y-3">
            {activeTab === 'paste' ? (
              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-text-primary">Experience</span>
                <textarea
                  rows={7}
                  value={pasteExperience}
                  onChange={(event) => setPasteExperience(event.target.value)}
                  placeholder="Example: 5 years in operations, managed onboarding for 12 teammates, built KPI dashboards, improved retention by 14%..."
                  className="w-full rounded-md border border-border bg-bg-secondary p-4 text-sm leading-[1.6] text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none"
                />
              </label>
            ) : !isProUser ? (
              <div className="rounded-md border border-warning/25 bg-warning-light p-4">
                <p className="text-sm font-semibold text-text-primary">
                  Pro feature: Upload your resume to autofill
                </p>
                <p className="mt-1 text-sm text-text-secondary">
                  Upgrade to upload PDF/DOCX. You can still use Paste Experience for free.
                </p>
                <div className="mt-3 flex flex-wrap gap-3">
                  <Link href="/pricing">
                    <Button variant="primary">Upgrade</Button>
                  </Link>
                  <Button variant="outline" onClick={() => setActiveTab('paste')}>
                    Use Paste Experience
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 rounded-md border border-border bg-bg-secondary p-4">
                <DropzoneUpload onFileSelected={parseFile} />
                <p className="text-sm text-text-secondary">
                  We&apos;ll extract your resume text so you don&apos;t have to type.
                </p>
                <p className="text-xs text-text-tertiary">PDF/DOCX - Max 10MB</p>

                {uploadState === 'parsing' && <ParseProgress progress={uploadProgress} />}

                {uploadState === 'success' && (
                  <>
                    {uploadWarning ? (
                      <div className="rounded-md border border-warning/25 bg-warning-light p-3">
                        <p className="text-sm font-semibold text-text-primary">
                          Text extracted with a warning
                        </p>
                        <p className="mt-1 text-sm text-text-secondary">{uploadWarning}</p>
                        {uploadStats ? (
                          <p className="mt-1 text-xs text-text-tertiary">
                            Extracted characters: {uploadStats.meaningfulChars}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                    <ExtractedTextArea
                      value={extractedResumeText}
                      onChange={setExtractedResumeText}
                    />
                    <div>
                      <p className="mb-2 text-xs font-semibold text-text-secondary">Detected sections</p>
                      <DetectedSectionsChips detected={detectedSections} />
                    </div>
                  </>
                )}

                {uploadState === 'error' && (
                  <div className="rounded-md border border-error bg-error-light p-4">
                    <p className="text-sm font-semibold text-error">We couldn&apos;t parse that file.</p>
                    <p className="mt-1 text-sm text-text-secondary">
                      {uploadError ||
                        'Upload a DOCX file or paste your experience instead to continue.'}
                    </p>
                    <p className="mt-2 text-xs text-text-tertiary">
                      Tip: if this is a scanned PDF, re-export as searchable PDF or upload DOCX.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <SelectField
              id="planner-location"
              label="Location"
              value={location}
              onChange={setLocation}
              options={[
                { value: 'Remote (US)', label: 'Remote (US)' },
                { value: 'New York, NY', label: 'New York, NY' },
                { value: 'San Francisco, CA', label: 'San Francisco, CA' }
              ]}
            />
            <SelectField
              id="planner-timeline"
              label="Timeline"
              value={timeline}
              onChange={setTimeline}
              options={[
                { value: '30/60/90', label: '30/60/90' },
                { value: '30 days', label: '30 days' },
                { value: '60 days', label: '60 days' },
                { value: '90 days', label: '90 days' }
              ]}
            />
            <SelectField
              id="planner-education"
              label="Education Level"
              value={education}
              onChange={setEducation}
              options={[
                { value: "Bachelor's", label: "Bachelor's" },
                { value: 'Associate', label: 'Associate' },
                { value: "Master's", label: "Master's" },
                { value: 'Self-taught', label: 'Self-taught' }
              ]}
            />
          </div>

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
              disabled={isUsageLoading || plannerState === 'loading' || !user}
            >
              {user ? 'Generate My Plan' : 'Sign In to Generate'}
            </PrimaryButton>
            <Button variant="outline" onClick={handleUseExample} className="md:flex-1">
              Use Example
            </Button>
          </div>

          <p className="mt-3 text-[13px] text-text-tertiary">
            Your data is used only to generate this report.
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
          <h2 className="text-2xl font-bold text-text-primary">Compatibility Report + Roadmap</h2>

          {isLocked ? (
            <div className="mt-5 space-y-4">
              <LockedPanel />
              <Card className="space-y-3 p-5 opacity-65">
                <p className="text-xs font-semibold uppercase tracking-[1.2px] text-text-tertiary">
                  What is locked
                </p>
                <div className="h-20 rounded-md border border-border bg-bg-secondary blur-[1px]" />
                <div className="h-20 rounded-md border border-border bg-bg-secondary blur-[1px]" />
                <div className="h-20 rounded-md border border-border bg-bg-secondary blur-[1px]" />
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
              <ScoreCard result={plannerResult} notSureMode={notSureMode} targetRole={targetRole} />
              <SkillsChips skills={plannerResult.transferableSkills} />
              <GapsList gaps={plannerResult.skillGaps} />
              <RoadmapSteps roadmap={plannerResult.roadmap} />
              <ReframeList items={plannerResult.reframes} />

              {notSureMode && plannerResult.recommendations.length > 0 && (
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
