'use client'

import { useState } from 'react'
import Link from 'next/link'
import Badge from '@/components/Badge'
import Button from '@/components/Button'
import Card from '@/components/Card'
import { Icon } from '@/components/ui/Icon'
import type { ProvinceCode } from '@/lib/client/provinceSession'
import {
  DetectedSectionsChips,
  DropzoneUpload,
  ParseProgress,
  ResumeExtractionReviewCard,
  RoleAutocomplete,
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

function roleMatchStrengthLabel(confidence: number) {
  if (confidence >= 0.9) return 'Exact'
  if (confidence >= 0.75) return 'Close'
  return 'Broad'
}

/* ---------- prototype intake chrome (app/Wizard.jsx) ---------- */

// Three-segment progress stepper: thin bars + labels, active/done in accent.
function Stepper({
  steps,
  activeStep,
  onSelect
}: {
  steps: Array<{ id: WizardStep; short: string }>
  activeStep: WizardStep
  onSelect: (step: WizardStep) => void
}) {
  return (
    <div style={{ display: 'flex', gap: 10, width: '100%' }}>
      {steps.map((step, i) => (
        <button
          key={step.id}
          type="button"
          onClick={() => onSelect(step.id)}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            textAlign: 'left'
          }}
        >
          <span
            style={{
              height: 6,
              borderRadius: 4,
              background: i <= activeStep ? 'var(--accent)' : 'var(--border)',
              transition: 'background .3s var(--ease)'
            }}
          />
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: i <= activeStep ? 'var(--accent)' : 'var(--text-tertiary)'
            }}
          >
            {step.short}
          </span>
        </button>
      ))}
    </div>
  )
}

// Pill chip selector (single-select) mirroring the prototype ChipSelect.
function ChipSelect({
  options,
  value,
  onChange
}: {
  options: ReadonlyArray<{ value: string; label: string }>
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={'chip' + (value === o.value ? ' chip-on' : '')}
          onClick={() => onChange(o.value)}
        >
          {value === o.value && <Icon name="check" size={14} />}
          {o.label}
        </button>
      ))}
    </div>
  )
}

function FieldBlock({
  label,
  help,
  children
}: {
  label: string
  help?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="label">{label}</label>
      {help ? (
        <p className="help" style={{ marginTop: -3, marginBottom: 12 }}>
          {help}
        </p>
      ) : null}
      {children}
    </div>
  )
}

interface PlannerIntakeWizardProps {
  activeWizardStep: WizardStep
  wizardSteps: Array<{ id: WizardStep; title: string; short: string; eyebrow: string; helper: string }>
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
  situation: string
  situationOptions: string[]
  interests: string
  userName: string
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
  onSetSituation: (value: string) => void
  onSetInterests: (value: string) => void
  onSetUserName: (value: string) => void
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
  targetRoleText,
  suggestedSkillSuggestions,
  situation,
  situationOptions,
  interests,
  userName,
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
  plannerState,
  generateButtonLabel,
  workRegionOptions,
  timelineOptions,
  educationOptions,
  incomeTargetOptions,
  onSetActiveWizardStep,
  onTargetRoleInputChange,
  onTargetRoleSuggestionSelect,
  onSetSituation,
  onSetInterests,
  onSetUserName,
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
  const [resumeOpen, setResumeOpen] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const resumeAttached = uploadState === 'success'
  const hasPostingText = userPostingText.trim().length > 0

  const canNext =
    activeWizardStep === 0
      ? Boolean(situation && educationLevel && workRegion)
      : activeWizardStep === 1
        ? skills.length >= 1 || experienceText.trim().length >= 20 || resumeAttached
        : true

  const handleNextClick = () => {
    onNext()
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }
  const handleGenerateClick = () => {
    onGenerate()
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const resumeBanner = activeWizardStep < 2 ? (
    <div
      style={{
        marginTop: 22,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '16px 18px',
        borderRadius: 'var(--r-lg)',
        border: '1px solid var(--accent)',
        background: 'linear-gradient(100deg, var(--accent-soft), var(--surface))',
        flexWrap: 'wrap'
      }}
    >
      <span
        style={{
          width: 42,
          height: 42,
          borderRadius: 11,
          background: 'var(--accent)',
          color: '#fff',
          display: 'grid',
          placeItems: 'center',
          flexShrink: 0
        }}
      >
        <Icon name="sparkle" size={20} fill />
      </span>
      <div style={{ flex: 1, minWidth: 200 }}>
        <p style={{ fontSize: 14.5, fontWeight: 700 }}>
          {resumeAttached ? 'Résumé attached — details added below' : 'Have a résumé? Autofill in seconds'}
        </p>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
          {resumeAttached
            ? 'You can still edit anything we detected.'
            : isProUser
              ? 'We detect your skills and experience so you don’t retype them.'
              : 'Résumé autofill is a Pro feature — or add your skills by hand below.'}
        </p>
      </div>
      <button
        type="button"
        className={'btn btn-sm ' + (resumeAttached ? 'btn-outline' : 'btn-primary')}
        onClick={() => setResumeOpen(true)}
      >
        {resumeAttached ? (
          'Re-upload'
        ) : (
          <>
            <Icon name="download" size={15} /> Upload résumé
          </>
        )}
      </button>
    </div>
  ) : null

  return (
    <div className="proto">
      <Stepper steps={wizardSteps} activeStep={activeWizardStep} onSelect={onSetActiveWizardStep} />

      <div key={activeWizardStep} className="anim-up" style={{ marginTop: 36 }}>
        <p className="eyebrow">{activeWizardMeta.eyebrow}</p>
        <h1 style={{ marginTop: 12, fontSize: 'clamp(26px,4vw,36px)', fontWeight: 800 }}>
          {activeWizardMeta.title}
        </h1>
        <p style={{ marginTop: 12, fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: 600 }}>
          {activeWizardMeta.helper}
        </p>

        {resumeBanner}

        {/* STEP 1 — About you */}
        {activeWizardStep === 0 ? (
          <div className="card" style={{ marginTop: 28, padding: 'clamp(22px, 4vw, 34px)', display: 'flex', flexDirection: 'column', gap: 28 }}>
            <FieldBlock label="What best describes you right now?">
              <ChipSelect
                options={situationOptions.map((o) => ({ value: o, label: o }))}
                value={situation}
                onChange={onSetSituation}
              />
            </FieldBlock>
            <FieldBlock label="Highest education">
              <ChipSelect
                options={educationOptions.map((o) => ({ value: o.value, label: o.label }))}
                value={educationLevel}
                onChange={(value) => onSetEducationLevel(value as EducationLevelValue)}
              />
            </FieldBlock>
            <FieldBlock label="Where do you want to work?">
              <ChipSelect
                options={workRegionOptions.map((o) => ({ value: o.value, label: o.label }))}
                value={workRegion}
                onChange={(value) => onSetWorkRegion(value as WorkRegionValue)}
              />
            </FieldBlock>
            <FieldBlock label="City (optional)" help="Sharpens wages and local demand. Type your city, or use a custom one.">
              <div style={{ position: 'relative' }}>
                <Icon
                  name="pin"
                  size={16}
                  style={{ position: 'absolute', left: 14, top: 14, color: 'var(--text-tertiary)' }}
                />
                <input
                  className="field"
                  style={{ paddingLeft: 40 }}
                  value={locationText}
                  onChange={(event) => onSetLocationText(event.target.value)}
                  placeholder="e.g. Toronto, ON"
                />
              </div>
            </FieldBlock>
            <FieldBlock
              label="A role you're aiming for? (optional)"
              help="If you have one in mind, type it — otherwise we'll suggest matches."
            >
              <RoleAutocomplete
                id="target-role"
                label=""
                value={targetRoleText}
                placeholder="e.g. Junior Data Analyst"
                region={roleAutocompleteRegion}
                onChange={onTargetRoleInputChange}
                onSuggestionSelect={onTargetRoleSuggestionSelect}
              />
            </FieldBlock>
            <FieldBlock
              label="What are you drawn to? (optional)"
              help="A sentence is plenty — interests, subjects you liked, the kind of day you'd enjoy."
            >
              <textarea
                className="field"
                rows={3}
                style={{ resize: 'vertical' }}
                value={interests}
                onChange={(event) => onSetInterests(event.target.value)}
                placeholder="e.g. I like solving puzzles, working with data, and I'm comfortable talking to people…"
              />
            </FieldBlock>
          </div>
        ) : null}

        {/* STEP 2 — Skills */}
        {activeWizardStep === 1 ? (
          <div className="card" style={{ marginTop: 28, padding: 'clamp(22px, 4vw, 34px)', display: 'flex', flexDirection: 'column', gap: 28 }}>
            <FieldBlock
              label="Skills you already have"
              help="Add anything — even 'reliable' or 'good with customers'. We'll translate them into role-relevant strengths."
            >
              <SkillsChipsInput
                id="skills-input"
                label=""
                skills={skills}
                suggestions={suggestedSkillSuggestions}
                suggestionEndpoint="/api/career-map/skills"
                placeholder="Type a skill and press Enter, or paste from your resume."
                helperText=""
                onChange={onSkillsChange}
              />
            </FieldBlock>
            <FieldBlock
              label="Any experience so far? (optional)"
              help="Jobs, volunteering, school projects, clubs — all of it counts toward a real first role."
            >
              <textarea
                className="field"
                rows={4}
                style={{ resize: 'vertical', minHeight: 110, lineHeight: 1.7 }}
                value={experienceText}
                onChange={(event) => onExperienceTextChange(event.target.value)}
                placeholder="e.g. Part-time retail for two years, treasurer of a club, one class project…"
              />
            </FieldBlock>
            <div
              style={{
                display: 'flex',
                gap: 10,
                alignItems: 'flex-start',
                padding: '14px 16px',
                background: 'var(--teal-light)',
                borderRadius: 'var(--r-md)'
              }}
            >
              <Icon name="lightbulb" size={18} style={{ color: '#0a7f7e', marginTop: 1 }} />
              <p style={{ fontSize: 13.5, color: '#0a6a69', lineHeight: 1.6 }}>
                <strong>Zero experience is a starting line, not a wall.</strong> Most first roles are won with
                proof-of-work, not years. Your plan will build that proof.
              </p>
            </div>
          </div>
        ) : null}

        {/* STEP 3 — Goal */}
        {activeWizardStep === 2 ? (
          <div className="card" style={{ marginTop: 28, padding: 'clamp(22px, 4vw, 34px)', display: 'flex', flexDirection: 'column', gap: 28 }}>
            <FieldBlock label="How soon do you want to land a role?">
              <ChipSelect
                options={timelineOptions.map((o) => ({ value: o.value, label: o.label }))}
                value={timelineBucket}
                onChange={(value) => onSetTimelineBucket(value as TimelineBucketValue)}
              />
            </FieldBlock>
            <FieldBlock
              label="Income you're hoping for"
              help="We use this to keep matches realistic — never to gatekeep. Honest ranges only."
            >
              <ChipSelect
                options={incomeTargetOptions.map((o) => ({ value: o.value, label: o.label }))}
                value={incomeTarget}
                onChange={(value) => onSetIncomeTarget(value as IncomeTargetValue)}
              />
            </FieldBlock>
            <FieldBlock label="Your name (optional)" help="Just to make the plan feel like yours.">
              <input
                className="field"
                style={{ maxWidth: 320 }}
                value={userName}
                onChange={(event) => onSetUserName(event.target.value)}
                placeholder="First name"
              />
            </FieldBlock>

            {/* Advanced: employer evidence (wired, optional) */}
            <div className="rounded-xl border border-border-light bg-bg-secondary p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-semibold text-text-primary">Employer evidence (optional)</p>
                {marketEvidenceAvailable ? (
                  <Toggle checked={useMarketEvidence} onChange={onSetUseMarketEvidence} label="Use market evidence (beta)" />
                ) : (
                  <Badge variant="warning">Market evidence unavailable</Badge>
                )}
              </div>
              <button
                type="button"
                className="mt-1 text-sm font-semibold text-accent hover:text-accent-hover"
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                onClick={() => setShowAdvanced((prev) => !prev)}
              >
                {showAdvanced ? 'Hide details' : 'Paste a target job posting'}
              </button>
              {showAdvanced ? (
                <label className="mt-3 flex flex-col gap-1.5">
                  <span className="text-[13px] font-semibold text-text-primary">Paste target job posting (optional)</span>
                  <textarea
                    rows={5}
                    value={userPostingText}
                    onChange={(event) => onSetUserPostingText(event.target.value)}
                    placeholder="Paste full requirements section from a posting."
                    className="field"
                    style={{ resize: 'vertical', lineHeight: 1.6 }}
                  />
                  <span className="help">
                    {hasPostingText
                      ? 'We will prioritize direct requirement matching in this run.'
                      : 'Leave blank to use live market evidence and your inputs.'}
                  </span>
                </label>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      {/* alerts */}
      {hasPendingResumeReview ? (
        <p className="mt-4 rounded-md border border-warning/25 bg-warning-light px-3 py-2 text-sm text-text-secondary">
          Resume detections are waiting for review. Open the upload to apply them to your skills.
        </p>
      ) : null}
      {hasDraftChanges ? (
        <p className="mt-4 rounded-md border border-accent/20 bg-accent-light px-3 py-2 text-sm text-text-secondary">
          You have updated the form since the last run. The report below is still showing your previous plan until you
          generate again.
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
                <span className="text-xs text-text-tertiary">{roleMatchStrengthLabel(option.confidence)}</span>
              </button>
            ))}
          </div>
        </Card>
      ) : null}

      {/* footer — prototype CTA bar */}
      <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {canGoBackWizard ? (
            <button type="button" className="btn btn-ghost" onClick={onBack}>
              <Icon name="arrowLeft" size={16} /> {activeWizardStep === 0 ? 'Back' : 'Previous'}
            </button>
          ) : null}
          {hasAnyDraftInput ? (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={onStartNewPlan}
              disabled={plannerState === 'loading'}
            >
              Start New Plan
            </button>
          ) : null}
        </div>
        <div>
          {activeWizardStep === 2 ? (
            <button
              type="button"
              className="btn btn-primary btn-lg"
              onClick={handleGenerateClick}
              disabled={plannerState === 'loading' || !hasMinimumRequiredInput}
            >
              <Icon name="sparkle" size={18} fill /> {generateButtonLabel}
            </button>
          ) : (
            <button type="button" className="btn btn-primary btn-lg" onClick={handleNextClick} disabled={!canNext}>
              Continue <Icon name="arrow" size={16} />
            </button>
          )}
        </div>
      </div>

      {/* résumé upload modal (Pro-gated), wired to /api/resume/parse */}
      {resumeOpen ? (
        <div
          onClick={() => setResumeOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 120,
            background: 'rgba(10,19,36,0.55)',
            backdropFilter: 'blur(4px)',
            display: 'grid',
            placeItems: 'center',
            padding: 20
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            className="anim-up"
            style={{
              width: '100%',
              maxWidth: 480,
              maxHeight: '85vh',
              overflowY: 'auto',
              background: 'var(--surface)',
              borderRadius: 'var(--r-xl)',
              boxShadow: 'var(--sh-panel)',
              padding: 24
            }}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-text-primary">Resume Upload (Pro)</p>
                <p className="mt-1 text-xs text-text-tertiary">We detect skills, certifications, and experience.</p>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ padding: 7 }}
                onClick={() => setResumeOpen(false)}
              >
                <Icon name="x" size={16} />
              </button>
            </div>

            <div className="mt-2">
              <Badge variant={ocrBadge.variant}>{ocrBadge.label}</Badge>
              {ocrBadge.detail ? <p className="mt-1 text-xs text-text-tertiary">{ocrBadge.detail}</p> : null}
            </div>

            {!isProUser ? (
              <div className="mt-4">
                <p className="text-sm text-text-secondary">
                  Résumé autofill is a Pro feature. Upgrade to upload a PDF/DOCX and auto-fill your background, or close
                  this and add your skills by hand.
                </p>
                <div className="mt-3 flex gap-2">
                  <Link href="/pricing">
                    <button type="button" className="btn btn-primary btn-sm">
                      Upgrade to unlock upload
                    </button>
                  </Link>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => setResumeOpen(false)}>
                    Add skills manually
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="mt-4">
                  <DropzoneUpload onFileSelected={onParseFile} />
                </div>
                {uploadState === 'parsing' ? (
                  <div className="mt-3">
                    <ParseProgress progress={uploadProgress} />
                  </div>
                ) : null}
                {uploadState === 'error' ? (
                  <p className="mt-3 rounded-md border border-error bg-error-light px-3 py-2 text-sm text-error">
                    {uploadError || 'Upload a DOCX or searchable PDF, then try again.'}
                  </p>
                ) : null}
                {uploadState === 'success' ? (
                  <div className="mt-3 space-y-2">
                    {uploadWarning ? (
                      <p className="rounded-md border border-warning/25 bg-warning-light px-3 py-2 text-xs text-text-secondary">
                        {uploadWarning}
                      </p>
                    ) : null}
                    <p className="text-xs text-text-tertiary">
                      Parsed text was added to your experience.
                      {uploadStats ? ` Characters extracted: ${uploadStats.meaningfulChars}.` : ''}
                    </p>
                    <DetectedSectionsChips detected={detectedSections} />
                    {hasPendingResumeReview ? (
                      <div className="rounded-md border border-border-light bg-surface p-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">
                            Detections ready
                          </p>
                          <button
                            type="button"
                            className="text-xs font-semibold text-accent hover:text-accent-hover"
                            onClick={() => onSetResumeReviewExpanded(!resumeReviewExpanded)}
                          >
                            {resumeReviewExpanded ? 'Hide review' : 'Review details'}
                          </button>
                        </div>
                        <p className="mt-1 text-xs leading-normal text-text-secondary">
                          {pendingResumeSkills.length} skills, {pendingResumeCertifications.length} certifications
                          {pendingResumeRoleCandidate ? ', and 1 role candidate' : ''} detected.
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <Button
                            size="sm"
                            onClick={() => {
                              onApplyDetectedResumeData()
                              setResumeOpen(false)
                            }}
                          >
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
                        onApply={() => {
                          onApplyDetectedResumeData()
                          setResumeOpen(false)
                        }}
                        onDismiss={onDismissDetectedResumeData}
                      />
                    ) : null}
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default PlannerIntakeWizard
