'use client'

import { useState } from 'react'
import Link from 'next/link'
import Badge from '@/components/Badge'
import Button from '@/components/Button'
import Card from '@/components/Card'
import { Icon } from '@/components/ui/Icon'
import { useT } from '@/lib/i18n/LocaleProvider'
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
  const t = useT()
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
          {resumeAttached
            ? t('Résumé attached — details added below', 'CV joint — détails ajoutés ci-dessous')
            : t('Have a résumé? Autofill in seconds', 'Vous avez un CV? Remplissage automatique en quelques secondes')}
        </p>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
          {resumeAttached
            ? t('You can still edit anything we detected.', 'Vous pouvez encore modifier tout ce que nous avons détecté.')
            : isProUser
              ? t('We detect your skills and experience so you don’t retype them.', 'Nous détectons vos compétences et votre expérience pour éviter de tout retaper.')
              : t('Résumé autofill is a Pro feature — or add your skills by hand below.', 'Le remplissage automatique du CV est une fonction Pro — ou ajoutez vos compétences à la main ci-dessous.')}
        </p>
      </div>
      <button
        type="button"
        className={'btn btn-sm ' + (resumeAttached ? 'btn-outline' : 'btn-primary')}
        onClick={() => setResumeOpen(true)}
      >
        {resumeAttached ? (
          t('Re-upload', 'Téléverser à nouveau')
        ) : (
          <>
            <Icon name="download" size={15} /> {t('Upload résumé', 'Téléverser un CV')}
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
            <FieldBlock label={t('What best describes you right now?', 'Qu’est-ce qui vous décrit le mieux en ce moment?')}>
              <ChipSelect
                options={situationOptions.map((o) => ({ value: o, label: o }))}
                value={situation}
                onChange={onSetSituation}
              />
            </FieldBlock>
            <FieldBlock label={t('Highest education', 'Plus haut niveau de scolarité')}>
              <ChipSelect
                options={educationOptions.map((o) => ({ value: o.value, label: o.label }))}
                value={educationLevel}
                onChange={(value) => onSetEducationLevel(value as EducationLevelValue)}
              />
            </FieldBlock>
            <FieldBlock label={t('Where do you want to work?', 'Où voulez-vous travailler?')}>
              <ChipSelect
                options={workRegionOptions.map((o) => ({ value: o.value, label: o.label }))}
                value={workRegion}
                onChange={(value) => onSetWorkRegion(value as WorkRegionValue)}
              />
            </FieldBlock>
            <FieldBlock
              label={t('City (optional)', 'Ville (optionnel)')}
              help={t('Sharpens wages and local demand. Type your city, or use a custom one.', 'Précise les salaires et la demande locale. Tapez votre ville ou utilisez-en une personnalisée.')}
            >
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
                  placeholder={t('e.g. Toronto, ON', 'p. ex. Toronto, ON')}
                />
              </div>
            </FieldBlock>
            <FieldBlock
              label={t("A role you're aiming for? (optional)", 'Un rôle que vous visez? (optionnel)')}
              help={t("If you have one in mind, type it — otherwise we'll suggest matches.", 'Si vous en avez un en tête, tapez-le — sinon, nous suggérerons des correspondances.')}
            >
              <RoleAutocomplete
                id="target-role"
                label=""
                value={targetRoleText}
                placeholder={t('e.g. Junior Data Analyst', 'p. ex. Analyste de données junior')}
                region={roleAutocompleteRegion}
                onChange={onTargetRoleInputChange}
                onSuggestionSelect={onTargetRoleSuggestionSelect}
              />
            </FieldBlock>
            <FieldBlock
              label={t('What are you drawn to? (optional)', 'Qu’est-ce qui vous attire? (optionnel)')}
              help={t("A sentence is plenty — interests, subjects you liked, the kind of day you'd enjoy.", 'Une phrase suffit — intérêts, matières que vous aimiez, le genre de journée qui vous plairait.')}
            >
              <textarea
                className="field"
                rows={3}
                style={{ resize: 'vertical' }}
                value={interests}
                onChange={(event) => onSetInterests(event.target.value)}
                placeholder={t("e.g. I like solving puzzles, working with data, and I'm comfortable talking to people…", 'p. ex. J’aime résoudre des casse-têtes, travailler avec des données, et je suis à l’aise pour parler aux gens…')}
              />
            </FieldBlock>
          </div>
        ) : null}

        {/* STEP 2 — Skills */}
        {activeWizardStep === 1 ? (
          <div className="card" style={{ marginTop: 28, padding: 'clamp(22px, 4vw, 34px)', display: 'flex', flexDirection: 'column', gap: 28 }}>
            <FieldBlock
              label={t('Skills you already have', 'Les compétences que vous avez déjà')}
              help={t("Add anything — even 'reliable' or 'good with customers'. We'll translate them into role-relevant strengths.", 'Ajoutez n’importe quoi — même « fiable » ou « bon avec la clientèle ». Nous les traduirons en forces pertinentes pour le rôle.')}
            >
              <SkillsChipsInput
                id="skills-input"
                label=""
                skills={skills}
                suggestions={suggestedSkillSuggestions}
                suggestionEndpoint="/api/career-map/skills"
                placeholder={t('Type a skill and press Enter, or paste from your resume.', 'Tapez une compétence et appuyez sur Entrée, ou collez depuis votre CV.')}
                helperText=""
                onChange={onSkillsChange}
              />
            </FieldBlock>
            <FieldBlock
              label={t('Any experience so far? (optional)', 'Une expérience jusqu’à présent? (optionnel)')}
              help={t('Jobs, volunteering, school projects, clubs — all of it counts toward a real first role.', 'Emplois, bénévolat, projets scolaires, clubs — tout cela compte pour un vrai premier rôle.')}
            >
              <textarea
                className="field"
                rows={4}
                style={{ resize: 'vertical', minHeight: 110, lineHeight: 1.7 }}
                value={experienceText}
                onChange={(event) => onExperienceTextChange(event.target.value)}
                placeholder={t('e.g. Part-time retail for two years, treasurer of a club, one class project…', 'p. ex. Commerce de détail à temps partiel pendant deux ans, trésorier d’un club, un projet de classe…')}
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
                {t(
                  'Zero experience is a starting line, not a wall. Most first roles are won with proof-of-work, not years. Your plan will build that proof.',
                  'Zéro expérience est une ligne de départ, pas un mur. La plupart des premiers rôles s’obtiennent grâce à des preuves de travail, pas à des années. Votre plan bâtira cette preuve.'
                )}
              </p>
            </div>
          </div>
        ) : null}

        {/* STEP 3 — Goal */}
        {activeWizardStep === 2 ? (
          <div className="card" style={{ marginTop: 28, padding: 'clamp(22px, 4vw, 34px)', display: 'flex', flexDirection: 'column', gap: 28 }}>
            <FieldBlock label={t('How soon do you want to land a role?', 'Dans combien de temps voulez-vous décrocher un rôle?')}>
              <ChipSelect
                options={timelineOptions.map((o) => ({ value: o.value, label: o.label }))}
                value={timelineBucket}
                onChange={(value) => onSetTimelineBucket(value as TimelineBucketValue)}
              />
            </FieldBlock>
            <FieldBlock
              label={t("Income you're hoping for", 'Le revenu que vous espérez')}
              help={t('We use this to keep matches realistic — never to gatekeep. Honest ranges only.', 'Nous l’utilisons pour garder des correspondances réalistes — jamais pour exclure. Des fourchettes honnêtes seulement.')}
            >
              <ChipSelect
                options={incomeTargetOptions.map((o) => ({ value: o.value, label: o.label }))}
                value={incomeTarget}
                onChange={(value) => onSetIncomeTarget(value as IncomeTargetValue)}
              />
            </FieldBlock>
            <FieldBlock label={t('Your name (optional)', 'Votre nom (optionnel)')} help={t('Just to make the plan feel like yours.', 'Juste pour que le plan vous ressemble.')}>
              <input
                className="field"
                style={{ maxWidth: 320 }}
                value={userName}
                onChange={(event) => onSetUserName(event.target.value)}
                placeholder={t('First name', 'Prénom')}
              />
            </FieldBlock>

            {/* Advanced: employer evidence (wired, optional) */}
            <div className="rounded-xl border border-border-light bg-bg-secondary p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-semibold text-text-primary">{t('Employer evidence (optional)', 'Preuves d’employeur (optionnel)')}</p>
                {marketEvidenceAvailable ? (
                  <Toggle checked={useMarketEvidence} onChange={onSetUseMarketEvidence} label={t('Use market evidence (beta)', 'Utiliser les données du marché (bêta)')} />
                ) : (
                  <Badge variant="warning">{t('Market evidence unavailable', 'Données du marché indisponibles')}</Badge>
                )}
              </div>
              <button
                type="button"
                className="mt-1 text-sm font-semibold text-accent hover:text-accent-hover"
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                onClick={() => setShowAdvanced((prev) => !prev)}
              >
                {showAdvanced ? t('Hide details', 'Masquer les détails') : t('Paste a target job posting', 'Coller une offre d’emploi cible')}
              </button>
              {showAdvanced ? (
                <label className="mt-3 flex flex-col gap-1.5">
                  <span className="text-[13px] font-semibold text-text-primary">{t('Paste target job posting (optional)', 'Coller l’offre d’emploi cible (optionnel)')}</span>
                  <textarea
                    rows={5}
                    value={userPostingText}
                    onChange={(event) => onSetUserPostingText(event.target.value)}
                    placeholder={t('Paste full requirements section from a posting.', 'Collez la section complète des exigences d’une offre.')}
                    className="field"
                    style={{ resize: 'vertical', lineHeight: 1.6 }}
                  />
                  <span className="help">
                    {hasPostingText
                      ? t('We will prioritize direct requirement matching in this run.', 'Nous prioriserons la correspondance directe des exigences pour cette génération.')
                      : t('Leave blank to use live market evidence and your inputs.', 'Laissez vide pour utiliser les données du marché en temps réel et vos saisies.')}
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
          {t(
            'Resume detections are waiting for review. Open the upload to apply them to your skills.',
            'Des détections de CV attendent votre révision. Ouvrez le téléversement pour les appliquer à vos compétences.'
          )}
        </p>
      ) : null}
      {hasDraftChanges ? (
        <p className="mt-4 rounded-md border border-accent/20 bg-accent-light px-3 py-2 text-sm text-text-secondary">
          {t(
            'You have updated the form since the last run. The report below is still showing your previous plan until you generate again.',
            'Vous avez modifié le formulaire depuis la dernière génération. Le rapport ci-dessous montre encore votre plan précédent jusqu’à la prochaine génération.'
          )}
        </p>
      ) : null}
      {inputError ? (
        <p className="mt-4 rounded-md border border-error bg-error-light px-3 py-2 text-sm text-error">{inputError}</p>
      ) : null}
      {roleSelectionPrompt ? (
        <Card className="mt-4 p-4">
          <p className="text-sm font-semibold text-text-primary">
            {t(
              `Choose your closest match for the ${roleSelectionPrompt.role} role`,
              `Choisissez la correspondance la plus proche pour le rôle ${roleSelectionPrompt.role === 'current' ? 'actuel' : 'cible'}`
            )}
          </p>
          <p className="mt-1 text-xs text-text-secondary">
            {roleSelectionPrompt.message ||
              t(
                `We found multiple close matches for "${roleSelectionPrompt.input || 'your entry'}". Pick the closest occupation so the plan stays on the right pathway.`,
                `Nous avons trouvé plusieurs correspondances proches pour « ${roleSelectionPrompt.input || 'votre saisie'} ». Choisissez la profession la plus proche pour que le plan reste sur la bonne voie.`
              )}
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
              <Icon name="arrowLeft" size={16} /> {activeWizardStep === 0 ? t('Back', 'Retour') : t('Previous', 'Précédent')}
            </button>
          ) : null}
          {hasAnyDraftInput ? (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={onStartNewPlan}
              disabled={plannerState === 'loading'}
            >
              {t('Start New Plan', 'Nouveau plan')}
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
              {t('Continue', 'Continuer')} <Icon name="arrow" size={16} />
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
                <p className="text-sm font-semibold text-text-primary">{t('Resume Upload (Pro)', 'Téléversement de CV (Pro)')}</p>
                <p className="mt-1 text-xs text-text-tertiary">{t('We detect skills, certifications, and experience.', 'Nous détectons les compétences, certifications et l’expérience.')}</p>
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
                  {t(
                    'Résumé autofill is a Pro feature. Upgrade to upload a PDF/DOCX and auto-fill your background, or close this and add your skills by hand.',
                    'Le remplissage automatique du CV est une fonction Pro. Passez à Pro pour téléverser un PDF/DOCX et remplir automatiquement votre parcours, ou fermez ceci et ajoutez vos compétences à la main.'
                  )}
                </p>
                <div className="mt-3 flex gap-2">
                  <Link href="/pricing">
                    <button type="button" className="btn btn-primary btn-sm">
                      {t('Upgrade to unlock upload', 'Passer à Pro pour le téléversement')}
                    </button>
                  </Link>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => setResumeOpen(false)}>
                    {t('Add skills manually', 'Ajouter des compétences à la main')}
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
                    {uploadError || t('Upload a DOCX or searchable PDF, then try again.', 'Téléversez un DOCX ou un PDF interrogeable, puis réessayez.')}
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
                      {t('Parsed text was added to your experience.', 'Le texte analysé a été ajouté à votre expérience.')}
                      {uploadStats ? t(` Characters extracted: ${uploadStats.meaningfulChars}.`, ` Caractères extraits : ${uploadStats.meaningfulChars}.`) : ''}
                    </p>
                    <DetectedSectionsChips detected={detectedSections} />
                    {hasPendingResumeReview ? (
                      <div className="rounded-md border border-border-light bg-surface p-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">
                            {t('Detections ready', 'Détections prêtes')}
                          </p>
                          <button
                            type="button"
                            className="text-xs font-semibold text-accent hover:text-accent-hover"
                            onClick={() => onSetResumeReviewExpanded(!resumeReviewExpanded)}
                          >
                            {resumeReviewExpanded ? t('Hide review', 'Masquer la révision') : t('Review details', 'Voir les détails')}
                          </button>
                        </div>
                        <p className="mt-1 text-xs leading-normal text-text-secondary">
                          {t(
                            `${pendingResumeSkills.length} skills, ${pendingResumeCertifications.length} certifications${pendingResumeRoleCandidate ? ', and 1 role candidate' : ''} detected.`,
                            `${pendingResumeSkills.length} compétences, ${pendingResumeCertifications.length} certifications${pendingResumeRoleCandidate ? ', et 1 rôle candidat' : ''} détectés.`
                          )}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <Button
                            size="sm"
                            onClick={() => {
                              onApplyDetectedResumeData()
                              setResumeOpen(false)
                            }}
                          >
                            {t('Apply detected data', 'Appliquer les données détectées')}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={onDismissDetectedResumeData}>
                            {t('Dismiss', 'Ignorer')}
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
