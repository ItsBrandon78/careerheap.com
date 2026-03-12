'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Badge from '@/components/Badge'
import Button from '@/components/Button'
import Card from '@/components/Card'
import type { ProvinceCode } from '@/lib/client/provinceSession'
import {
  DetectedSectionsChips,
  DropzoneUpload,
  ParseProgress,
  ResumeExtractionReviewCard,
  RoleAutocomplete,
  SelectField,
  SkillsChipsInput,
  Toggle
} from '@/components/career-switch-planner/CareerSwitchPlannerComponents'

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

// Single-switch compact polish for Step 2. Set to false to fully revert.
const COMPACT_STEP2_POLISH = true

interface RoleSelectionPrompt {
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

interface PlannerIntakeWizardProps {
  activeWizardStep: WizardStep
  wizardSteps: Array<{ id: WizardStep; title: string; eyebrow: string; helper: string }>
  roleAutocompleteRegion: 'US' | 'CA' | 'either'
  currentRoleText: string
  targetRoleText: string
  showSuggestedTargets: boolean
  assistiveSuggestedTargets: Array<{
    title: string
    difficulty: string
    transitionTime: string
    why: string[]
  }>
  suggestedSkillSuggestions: string[]
  skills: string[]
  experienceText: string
  educationLevel: EducationLevelValue
  workRegion: WorkRegionValue
  timelineBucket: TimelineBucketValue
  incomeTarget: IncomeTargetValue
  locationText: string
  userPostingText: string
  useMarketEvidence: boolean
  marketEvidenceAvailable: boolean
  isProUser: boolean
  ocrBadge: { variant: 'default' | 'success' | 'warning' | 'error' | 'info'; label: string; detail?: string }
  uploadState: 'idle' | 'parsing' | 'success' | 'error'
  uploadProgress: number
  uploadWarning: string
  uploadError: string
  uploadStats: { meaningfulChars: number } | null
  detectedSections: { experience: boolean; skills: boolean; education: boolean }
  pendingResumeSkills: string[]
  pendingResumeCertifications: string[]
  pendingResumeRoleCandidate: string | null
  resumeReviewExpanded: boolean
  hasPendingResumeReview: boolean
  hasMinimumRequiredInput: boolean
  hasDraftChanges: boolean
  hasAnyDraftInput: boolean
  inputError: string
  roleSelectionPrompt: RoleSelectionPrompt | null
  canGoBackWizard: boolean
  canGoNextWizard: boolean
  plannerState: 'idle' | 'loading' | 'results'
  generateButtonLabel: string
  workRegionOptions: Array<{ value: WorkRegionValue; label: string }>
  timelineOptions: Array<{ value: TimelineBucketValue; label: string }>
  educationOptions: Array<{ value: EducationLevelValue; label: string }>
  incomeTargetOptions: Array<{ value: IncomeTargetValue; label: string }>
  onSetActiveWizardStep: (step: WizardStep) => void
  onCurrentRoleInputChange: (value: string) => void
  onTargetRoleInputChange: (value: string) => void
  onCurrentRoleSuggestionSelect: (suggestion: {
    occupationId: string
    title: string
    confidence?: number
    matchedBy?: string
  }) => void
  onTargetRoleSuggestionSelect: (suggestion: {
    occupationId: string
    title: string
    confidence?: number
    matchedBy?: string
  }) => void
  onToggleSuggestedTargets: () => void
  onShuffleSuggestedTargets: () => void
  onSelectSuggestedTarget: (title: string) => void
  onSkillsChange: (skills: string[]) => void
  onExperienceTextChange: (value: string) => void
  onParseFile: (file: File | null) => void
  onApplyDetectedResumeData: () => void
  onDismissDetectedResumeData: () => void
  onSetResumeReviewExpanded: (value: boolean) => void
  onRemovePendingResumeSkill: (value: string) => void
  onRemovePendingResumeCertification: (value: string) => void
  onSetEducationLevel: (value: EducationLevelValue) => void
  onSetWorkRegion: (value: WorkRegionValue) => void
  onSetTimelineBucket: (value: TimelineBucketValue) => void
  onSetIncomeTarget: (value: IncomeTargetValue) => void
  onSetLocationText: (value: string) => void
  onSetUseMarketEvidence: (value: boolean) => void
  onSetUserPostingText: (value: string) => void
  onResolveRoleSelection: (selection: {
    role: 'current' | 'target'
    occupationId: string
    title: string
    confidence: number
    stage?: string | null
    specialization?: string | null
  }) => void
  onBack: () => void
  onNext: () => void
  onStartNewPlan: () => void
  onGenerate: () => void
}

export function PlannerIntakeWizard({
  activeWizardStep,
  wizardSteps,
  roleAutocompleteRegion,
  currentRoleText,
  targetRoleText,
  showSuggestedTargets,
  assistiveSuggestedTargets,
  suggestedSkillSuggestions,
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
  ocrBadge,
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
  workRegionOptions,
  timelineOptions,
  educationOptions,
  incomeTargetOptions,
  onSetActiveWizardStep,
  onCurrentRoleInputChange,
  onTargetRoleInputChange,
  onCurrentRoleSuggestionSelect,
  onTargetRoleSuggestionSelect,
  onToggleSuggestedTargets,
  onShuffleSuggestedTargets,
  onSelectSuggestedTarget,
  onSkillsChange,
  onExperienceTextChange,
  onParseFile,
  onApplyDetectedResumeData,
  onDismissDetectedResumeData,
  onSetResumeReviewExpanded,
  onRemovePendingResumeSkill,
  onRemovePendingResumeCertification,
  onSetEducationLevel,
  onSetWorkRegion,
  onSetTimelineBucket,
  onSetIncomeTarget,
  onSetLocationText,
  onSetUseMarketEvidence,
  onSetUserPostingText,
  onResolveRoleSelection,
  onBack,
  onNext,
  onStartNewPlan,
  onGenerate
}: PlannerIntakeWizardProps) {
  const activeWizardMeta = wizardSteps[activeWizardStep]
  const [showEmployerEvidenceDetails, setShowEmployerEvidenceDetails] = useState(false)
  const stepTwoComplete =
    skills.length >= 3 || experienceText.trim().length >= 40 || uploadState === 'success'
  const hasLocation =
    locationText.trim().length > 0 || workRegionOptions.some((option) => option.value === workRegion)
  const hasPostingText = userPostingText.trim().length > 0
  const canGenerateFromStepThree = hasMinimumRequiredInput && hasLocation
  const selectedProvinceLabel =
    workRegionOptions.find((option) => option.value === workRegion)?.label || 'Selected province'
  const resolvedLocationLabel = locationText.trim() || `${selectedProvinceLabel}, Canada`
  const nonFinalStepHelperText = hasDraftChanges
    ? 'Current report stays visible until you regenerate.'
    : COMPACT_STEP2_POLISH
      ? 'Generate unlocks on Step 3 after constraints review.'
      : 'The final generate button appears after you review constraints.'
  const finalStepHelperText = hasDraftChanges
    ? 'Current report stays visible until you regenerate.'
    : COMPACT_STEP2_POLISH
      ? 'Review constraints, then generate.'
      : 'The final generate button appears after you review constraints.'

  useEffect(() => {
    if (hasPostingText) {
      setShowEmployerEvidenceDetails(true)
    }
  }, [hasPostingText])

  const handleNextClick = () => {
    onNext()
    if (activeWizardStep === 1 && typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }
  const handleGenerateClick = () => {
    onGenerate()
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return (
    <Card className="border border-border-light p-6 md:p-8">
      <div className="space-y-4 pb-24 md:pb-8">
        <div className="rounded-2xl border border-border-light bg-bg-secondary p-4 shadow-card md:p-5 lg:sticky lg:top-3 lg:z-20 lg:backdrop-blur-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">
                {activeWizardMeta.eyebrow}
              </p>
              <h2 className="mt-2 text-xl font-bold text-text-primary md:text-2xl">{activeWizardMeta.title}</h2>
              <p className="mt-2 max-w-[54ch] text-sm leading-[1.7] text-text-secondary">
                {activeWizardMeta.helper}
              </p>
            </div>
            <Badge variant="default">
              {activeWizardStep + 1} / {wizardSteps.length}
            </Badge>
          </div>
          <div className="mt-4">
            <div className="h-2 rounded-pill bg-surface">
              <div
                className="h-full rounded-pill bg-accent transition-all duration-300"
                style={{ width: `${((activeWizardStep + 1) / wizardSteps.length) * 100}%` }}
              />
            </div>
            <div className="mt-3 grid gap-2 md:grid-cols-3">
              {wizardSteps.map((step) => (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => onSetActiveWizardStep(step.id)}
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
                onChange={onCurrentRoleInputChange}
                onSuggestionSelect={onCurrentRoleSuggestionSelect}
              />
              <RoleAutocomplete
                id="target-role"
                label="Target Role"
                value={targetRoleText}
                placeholder="Type your target role"
                region={roleAutocompleteRegion}
                onChange={onTargetRoleInputChange}
                onSuggestionSelect={onTargetRoleSuggestionSelect}
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="ghost" size="sm" onClick={onToggleSuggestedTargets}>
                {showSuggestedTargets ? 'Hide suggested targets' : 'Show suggested targets'}
              </Button>
              {showSuggestedTargets ? (
                <Button variant="outline" size="sm" onClick={onShuffleSuggestedTargets}>
                  Shuffle
                </Button>
              ) : null}
              <p className="text-xs text-text-secondary">
                Not sure what to aim for? Pick a suggestion below. Your plan runs after the final step.
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
                    onClick={() => onSelectSuggestedTarget(role.title)}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-text-primary">{role.title}</p>
                      <span className="rounded-pill border border-border px-2 py-0.5 text-[11px] text-text-tertiary">
                        {role.difficulty} | {role.transitionTime}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-text-secondary">
                      {role.why[0] ?? 'Suggested from your current role.'}
                    </p>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {activeWizardStep === 1 ? (
          <div className={`planner-animate-in ${COMPACT_STEP2_POLISH ? 'space-y-3' : 'space-y-4'}`}>
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base font-bold text-text-primary">Background details</h2>
                {stepTwoComplete ? <Badge variant="success">Step 2 complete</Badge> : null}
              </div>
              <p className="text-sm text-text-secondary">
                Add your strongest, measurable signals to improve targeting and roadmap quality.
              </p>
            </div>

            <div
              className={`rounded-2xl border border-border-light bg-bg-secondary shadow-card ${
                COMPACT_STEP2_POLISH ? 'p-3' : 'p-4'
              }`}
            >
              <div className={`grid ${COMPACT_STEP2_POLISH ? 'gap-3' : 'gap-4'}`}>
                <div
                  className={`rounded-xl border border-border bg-surface shadow-card ${
                    COMPACT_STEP2_POLISH ? 'space-y-2.5 p-3' : 'space-y-3 p-4'
                  }`}
                >
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">
                      Core profile signals
                    </p>
                    <p className="mt-1 text-xs text-text-secondary">
                      Skills and quantified outcomes are weighted most heavily in planner confidence.
                    </p>
                  </div>
                  <p
                    className={`rounded-md border border-border-light bg-bg-secondary px-3 text-xs leading-[1.6] text-text-secondary ${
                      COMPACT_STEP2_POLISH ? 'py-1.5' : 'py-2'
                    }`}
                  >
                    Tip: add 8-15 role-relevant skills first, then include 2-4 measurable accomplishments.
                  </p>

                  <SkillsChipsInput
                    id="skills-input"
                    label="Skills"
                    skills={skills}
                    suggestions={suggestedSkillSuggestions}
                    suggestionEndpoint="/api/career-map/skills"
                    placeholder="Type skills or paste from your resume (comma or line separated)."
                    helperText="Type to search from our skills dataset, or paste skills/resume text. Custom skills are allowed."
                    onChange={onSkillsChange}
                  />

                  <label
                    className={`flex flex-col gap-1.5 rounded-xl border border-border-light bg-bg-secondary ${
                      COMPACT_STEP2_POLISH ? 'p-2.5' : 'p-3'
                    }`}
                  >
                    <span className="text-[13px] font-semibold text-text-primary">
                      Add measurable accomplishments (optional)
                    </span>
                    <textarea
                      rows={5}
                      value={experienceText}
                      onChange={(event) => onExperienceTextChange(event.target.value)}
                      placeholder="Example: Led onboarding for 12 teammates, reduced ramp time by 18%, and improved retention by 14%."
                      className={`w-full resize-y overflow-x-hidden rounded-md border border-border-light bg-surface p-3 text-sm leading-[1.75] text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none ${
                        COMPACT_STEP2_POLISH ? 'min-h-[120px]' : 'min-h-[144px]'
                      }`}
                    />
                    <span className="text-xs text-text-tertiary">
                      Numbers help (team size, $ impact, time saved, % improved).
                    </span>
                  </label>
                </div>

                <div
                  className={`rounded-xl border border-border bg-surface shadow-card ${
                    COMPACT_STEP2_POLISH ? 'space-y-2.5 p-3' : 'space-y-3 p-4'
                  }`}
                >
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">
                      Resume and credential signals
                    </p>
                    <p className="mt-1 text-xs text-text-secondary">
                      Upload and education inputs improve requirement matching and section-level confidence.
                    </p>
                  </div>

                  <div
                    className={`rounded-xl border border-border-light bg-surface shadow-card ${
                      COMPACT_STEP2_POLISH ? 'p-3' : 'p-4'
                    }`}
                  >
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
                          <DropzoneUpload onFileSelected={onParseFile} />
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
                            {hasPendingResumeReview ? (
                              <div
                                className={`rounded-md border border-border-light bg-surface ${
                                  COMPACT_STEP2_POLISH ? 'p-2.5' : 'p-3'
                                }`}
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">
                                    Resume detections ready
                                  </p>
                                  <button
                                    type="button"
                                    className="text-xs font-semibold text-accent hover:text-accent-hover"
                                    onClick={() => onSetResumeReviewExpanded(!resumeReviewExpanded)}
                                  >
                                    {resumeReviewExpanded ? 'Hide review' : 'Review details'}
                                  </button>
                                </div>
                                <p
                                  className={`mt-1 text-text-secondary ${
                                    COMPACT_STEP2_POLISH ? 'text-xs leading-[1.5]' : 'text-sm'
                                  }`}
                                >
                                  {pendingResumeSkills.length} skills,{' '}
                                  {pendingResumeCertifications.length} certifications
                                  {pendingResumeRoleCandidate ? ', and 1 role candidate' : ''} detected.
                                </p>
                                <div
                                  className={`flex flex-wrap ${
                                    COMPACT_STEP2_POLISH ? 'mt-2 gap-1.5' : 'mt-3 gap-2'
                                  }`}
                                >
                                  <Button size="sm" onClick={onApplyDetectedResumeData}>
                                    Apply detected data
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={onDismissDetectedResumeData}>
                                    Dismiss
                                  </Button>
                                </div>
                              </div>
                            ) : null}
                            {resumeReviewExpanded && hasPendingResumeReview ? (
                              <ResumeExtractionReviewCard
                                detectedRole={pendingResumeRoleCandidate}
                                skills={pendingResumeSkills}
                                certifications={pendingResumeCertifications}
                                onRemoveSkill={onRemovePendingResumeSkill}
                                onRemoveCertification={onRemovePendingResumeCertification}
                                onApply={onApplyDetectedResumeData}
                                onDismiss={onDismissDetectedResumeData}
                              />
                            ) : null}
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
                    onChange={(value) => onSetEducationLevel(value as EducationLevelValue)}
                    options={educationOptions}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {activeWizardStep === 2 ? (
          <div className="planner-animate-in space-y-2.5">
            <div className="space-y-1.5">
              <h2 className="text-base font-bold text-text-primary">Constraints and evidence</h2>
              <p className="text-sm leading-[1.65] text-text-secondary">
                Confirm your constraints, then generate the plan.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <div className="inline-flex items-center gap-2 rounded-pill border border-border-light bg-bg-secondary px-3 py-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-[1.1px] text-text-tertiary">Required</span>
                <span className={`text-sm font-semibold ${canGenerateFromStepThree ? 'text-success' : 'text-warning'}`}>
                  {canGenerateFromStepThree ? 'Ready' : 'Needs location'}
                </span>
              </div>
              <div className="inline-flex items-center gap-2 rounded-pill border border-border-light bg-bg-secondary px-3 py-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-[1.1px] text-text-tertiary">Timeline</span>
                <span className="text-sm font-semibold text-text-primary">{timelineBucket}</span>
              </div>
              <div className="inline-flex items-center gap-2 rounded-pill border border-border-light bg-bg-secondary px-3 py-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-[1.1px] text-text-tertiary">Evidence</span>
                <span className="text-sm font-semibold text-text-primary">
                  {hasPostingText ? 'Posting attached' : useMarketEvidence ? 'Live market evidence' : 'Manual only'}
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-border-light bg-surface p-4 shadow-card">
              <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">Required for generation</p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <SelectField
                  id="planner-timeline"
                  label="Timeline"
                  value={timelineBucket}
                  onChange={(value) => onSetTimelineBucket(value as TimelineBucketValue)}
                  options={timelineOptions}
                />
                <SelectField
                  id="planner-work-region"
                  label="Province"
                  value={workRegion}
                  onChange={(value) => onSetWorkRegion(value as WorkRegionValue)}
                  options={workRegionOptions}
                />
              </div>
              <p className="mt-2 text-xs leading-[1.55] text-text-tertiary">
                Location is derived from province for matching: {resolvedLocationLabel}.
              </p>
            </div>

            <div className="rounded-2xl border border-border-light bg-bg-secondary p-4 shadow-card">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-semibold text-text-primary">Employer Evidence (optional)</p>
                {marketEvidenceAvailable ? (
                  <Toggle
                    checked={useMarketEvidence}
                    onChange={onSetUseMarketEvidence}
                    label="Use market evidence (beta)"
                  />
                ) : (
                  <Badge variant="warning">Market evidence unavailable</Badge>
                )}
              </div>
              <p className="mt-2 text-xs leading-[1.6] text-text-tertiary">
                {hasPostingText
                  ? 'Posting text added. We will prioritize direct requirement matching in this run.'
                  : 'No posting text added. We will use market evidence and your inputs to infer requirements.'}
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-1 px-0 text-accent hover:bg-transparent hover:text-accent-hover"
                onClick={() => setShowEmployerEvidenceDetails((prev) => !prev)}
              >
                {showEmployerEvidenceDetails ? 'Hide details' : 'Show details'}
              </Button>
              {showEmployerEvidenceDetails ? (
                <>
                  <p className="mt-3 text-xs leading-[1.6] text-text-tertiary">
                    Paste a target posting for highest-fidelity requirements. If you leave this blank,
                    market evidence searches live postings for your target role and location.
                  </p>
                  <label className="mt-3 flex flex-col gap-1.5">
                    <span className="text-[13px] font-semibold text-text-primary">
                      Paste target job posting (optional)
                    </span>
                    <textarea
                      rows={5}
                      value={userPostingText}
                      onChange={(event) => onSetUserPostingText(event.target.value)}
                      placeholder="Paste full requirements section from a posting."
                      className="w-full rounded-md border border-border bg-surface p-3 text-sm leading-[1.6] text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none"
                    />
                  </label>
                </>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      {!hasMinimumRequiredInput ? (
        <p className="mt-4 rounded-md border border-warning/25 bg-warning-light px-3 py-2 text-sm text-text-secondary">
          Add either a current role, an experience summary, or at least 3 skills to enable generation.
        </p>
      ) : null}
      {hasPendingResumeReview ? (
        <p className="mt-4 rounded-md border border-warning/25 bg-warning-light px-3 py-2 text-sm text-text-secondary">
          Resume detections are waiting for review. Apply them if you want them included in scoring.
        </p>
      ) : null}
      {hasDraftChanges ? (
        <p className="mt-4 rounded-md border border-accent/20 bg-accent-light px-3 py-2 text-sm text-text-secondary">
          You have updated the form since the last run. The report below is still showing your previous plan until you generate again.
        </p>
      ) : null}
      {inputError ? (
        <p className="mt-4 rounded-md border border-error bg-error-light px-3 py-2 text-sm text-error">{inputError}</p>
      ) : null}
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
                onClick={() =>
                  onResolveRoleSelection({
                    role: roleSelectionPrompt.role,
                    occupationId: option.occupationId,
                    title: option.title,
                    confidence: option.confidence,
                    stage: option.stage,
                    specialization: option.specialization
                  })
                }
              >
                <span>
                  {option.title}
                  {option.stage ? (
                    <span className="ml-2 text-xs text-text-tertiary">
                      ({option.stage}
                      {option.specialization ? ` | ${option.specialization}` : ''})
                    </span>
                  ) : null}
                </span>
                <span className="text-xs text-text-tertiary">{option.confidence.toFixed(2)}</span>
              </button>
            ))}
          </div>
        </Card>
      ) : null}

      <div className="sticky bottom-2 z-30 mt-2 md:static md:bottom-auto">
        {activeWizardStep === 2 ? (
          <div className="space-y-2">
            <p className="text-center text-xs text-text-tertiary">{finalStepHelperText}</p>
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border-light bg-bg-secondary px-3 py-3 shadow-card md:px-4">
              <div className="flex flex-wrap items-center gap-2">
                {canGoBackWizard ? (
                  <Button variant="ghost" onClick={onBack}>
                    Back
                  </Button>
                ) : null}
                {hasAnyDraftInput ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-border-light text-text-secondary hover:border-border hover:bg-surface hover:text-text-primary"
                    onClick={onStartNewPlan}
                    disabled={plannerState === 'loading'}
                  >
                    Start New Plan
                  </Button>
                ) : null}
              </div>
              <div className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="w-full sm:w-auto"
                  onClick={handleGenerateClick}
                  isLoading={plannerState === 'loading'}
                  disabled={plannerState === 'loading'}
                >
                  {generateButtonLabel}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 rounded-xl border border-border-light bg-bg-secondary px-3 py-3 shadow-card md:grid-cols-[auto_1fr_auto] md:items-center md:px-4">
            <div className="flex flex-wrap items-center gap-2">
              {canGoBackWizard ? (
                <Button variant="ghost" onClick={onBack}>
                  Back
                </Button>
              ) : null}
              {hasAnyDraftInput ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-border-light text-text-secondary hover:border-border hover:bg-surface hover:text-text-primary"
                  onClick={onStartNewPlan}
                  disabled={plannerState === 'loading'}
                >
                  Start New Plan
                </Button>
              ) : null}
            </div>
            <p className="text-center text-xs text-text-tertiary">{nonFinalStepHelperText}</p>
            <div className="flex justify-start md:justify-end">
              {canGoNextWizard ? (
                <Button onClick={handleNextClick}>
                  Next
                </Button>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}

export default PlannerIntakeWizard
