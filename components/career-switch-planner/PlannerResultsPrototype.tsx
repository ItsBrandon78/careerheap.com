'use client'

import { useMemo, useState } from 'react'
import { Icon } from '@/components/ui/Icon'
import { Src, WhyThis } from '@/components/ui/Src'
import { useT } from '@/lib/i18n/LocaleProvider'
import type {
  PlannerDashboardV3Model,
  PlannerDashboardTask,
  DashboardFallbackValue,
  SourceType
} from '@/lib/planner/v3Dashboard'

/**
 * Prototype-styled planner results (ResultsCommand/Extras/Plan.jsx) rendered
 * entirely from the real `PlannerDashboardV3Model` — same data the wired
 * `PlannerDashboardV3` consumes. No invented data: every metric shows its
 * source label / Estimate badge straight from the model.
 *
 * Props mirror the call site in CareerSwitchPlannerClient so the swap is a
 * one-line component name change. Unused props are accepted and ignored.
 */
export interface PlannerResultsPrototypeProps {
  model: PlannerDashboardV3Model
  hasDraftChanges?: boolean
  isGuestPreview?: boolean
  faqItems?: Array<{ question: string; answer: string }>
  relatedTools?: unknown
  resumeToolkitDraft?: string
  emailToolkitDraft?: string
  callToolkitDraft?: string
  outreachTracker?: {
    sent: string
    replies: string
    positiveReplies: string
    nextFollowUpDate: string
  }
  onEditInputs: () => void
  onRegenerate: () => void
  onStartNewPlan?: () => void
  onSelectAlternativeRole?: (title: string) => void
  onResumeToolkitDraftChange?: (value: string) => void
  onEmailToolkitDraftChange?: (value: string) => void
  onCallToolkitDraftChange?: (value: string) => void
  onOutreachTrackerChange?: (
    key: 'sent' | 'replies' | 'positiveReplies' | 'nextFollowUpDate',
    value: string
  ) => void
  onExportPlan: () => void
  onDownloadPdf?: () => void
  onSavePlan: () => void
  savePlanLabel?: string
  progressStorageKey?: string | null
  allowLocalProgressFallback?: boolean
  initialProgressState?: {
    checkedTaskIds?: Record<string, boolean>
    expandedPhaseIds?: string[]
    completedTrainingIds?: Record<string, boolean>
  } | null
  onProgressStateChange?: (state: {
    checkedTaskIds: Record<string, boolean>
    expandedPhaseIds: string[]
    completedTrainingIds: Record<string, boolean>
    updatedAt: string
  }) => void
}

function parseScore(value: string): number | null {
  const match = value.match(/\d{1,3}/)
  if (!match) return null
  const n = Number.parseInt(match[0], 10)
  return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : null
}

function badgeClass(badge?: string) {
  if (badge === 'Estimate') return 'bg-warning-light text-warning'
  if (badge === 'Needs data' || badge === 'Add your info') return 'bg-bg-secondary text-text-secondary'
  return 'bg-success-light text-success'
}

function sourceTypeBadge(sourceType?: SourceType) {
  if (sourceType === 'estimate') return { label: 'Estimate', cls: 'bg-warning-light text-warning' }
  if (sourceType === 'derived') return { label: 'Derived', cls: 'bg-bg-secondary text-text-secondary' }
  return { label: 'Verified', cls: 'bg-success-light text-success' }
}

function SectionHead({
  num,
  eyebrow,
  title,
  sub
}: {
  num: string
  eyebrow: string
  title: string
  sub?: string
}) {
  return (
    <div className="flex items-start gap-4">
      <span className="mt-1 shrink-0 rounded-md bg-accent-light px-2.5 py-1.5 text-[13px] font-bold text-accent">
        {num}
      </span>
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="mt-2 text-[22px] font-bold md:text-[30px]">{title}</h2>
        {sub && <p className="mt-2.5 max-w-[680px] text-[15.5px] leading-[1.6] text-text-secondary">{sub}</p>}
      </div>
    </div>
  )
}

function ReadinessRing({ value }: { value: number }) {
  const r = 34
  const c = 2 * Math.PI * r
  const off = c * (1 - value / 100)
  return (
    <div className="relative h-[84px] w-[84px] shrink-0">
      <svg width="84" height="84" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="42" cy="42" r={r} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="7" />
        <circle
          cx="42"
          cy="42"
          r={r}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={off}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[22px] font-bold leading-none text-white">{value}</span>
        <span className="mt-0.5 text-[9.5px] font-semibold tracking-[0.5px] text-text-on-dark-muted">/ 100</span>
      </div>
    </div>
  )
}

function MatchBar({ value, color = 'var(--color-accent)' }: { value: number; color?: string }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-pill bg-border-light">
      <div className="h-full rounded-pill" style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }} />
    </div>
  )
}

function FallbackStat({
  icon,
  label,
  fallback
}: {
  icon: string
  label: string
  fallback: DashboardFallbackValue<string>
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.06] p-5">
      <div className="flex items-start justify-between">
        <span className="text-[#7ea0ff]">
          <Icon name={icon} size={20} />
        </span>
        {fallback.badge && (
          <span className={`rounded-pill px-2 py-0.5 text-[10.5px] font-semibold ${badgeClass(fallback.badge)}`}>
            {fallback.badge}
          </span>
        )}
      </div>
      <p className="mt-3 text-[12px] font-semibold uppercase tracking-[0.4px] text-text-on-dark-muted">{label}</p>
      <p className="mt-1 text-[22px] font-bold text-white">{fallback.value}</p>
      {fallback.sourceLabel && (
        <p className="mt-1 text-[11px] text-text-on-dark-muted">{fallback.sourceLabel}</p>
      )}
    </div>
  )
}

/* ---------- Roadmap with progress ---------- */
function RoadmapSection({
  model,
  checked,
  onToggle
}: {
  model: PlannerDashboardV3Model
  checked: Record<string, boolean>
  onToggle: (id: string) => void
}) {
  const t = useT()
  const phases = model.roadmap.phases.slice(0, 4)
  const tasks = model.progress.tasks
  const allCount = tasks.length
  const doneCount = tasks.filter((task) => checked[task.id]).length
  const pct = allCount > 0 ? Math.round((doneCount / allCount) * 100) : 0

  return (
    <section id="planner-roadmap" className="mx-auto max-w-content px-4 pt-16">
      <SectionHead
        num="05"
        eyebrow={t('Your roadmap', 'Votre feuille de route')}
        title={t('The week-by-week way in', 'Le chemin, semaine par semaine')}
        sub={t('Paced to your timeline. Check items off as you go — your progress saves automatically.', 'Rythmé selon votre échéancier. Cochez les éléments au fur et à mesure — votre progression est sauvegardée automatiquement.')}
      />

      {allCount > 0 && (
        <div className="mt-7 flex flex-wrap items-center gap-5 rounded-lg border border-border-light bg-surface p-5 shadow-card">
          <div className="min-w-[240px] flex-1">
            <div className="mb-2 flex justify-between">
              <span className="text-[13.5px] font-semibold">{t('Plan progress', 'Progression du plan')}</span>
              <span className="text-[13.5px] font-bold text-accent">
                {t(`${doneCount} / ${allCount} done`, `${doneCount} / ${allCount} terminés`)}
              </span>
            </div>
            <MatchBar value={pct} />
          </div>
          <span className="rounded-pill bg-accent-light px-3.5 py-2 text-[13px] font-semibold text-accent">
            {pct === 0
              ? t('Start anywhere — even one box counts', 'Commencez n’importe où — même une case compte')
              : pct === 100
                ? t("You're ready to apply 🎯", 'Vous êtes prêt à postuler 🎯')
                : t(`${pct}% there — keep going`, `${pct}% du chemin — continuez`)}
          </span>
        </div>
      )}

      <div className="mt-5 flex flex-col gap-4.5">
        {phases.map((phase, pi) => {
          const phaseTasks = tasks.filter((t) => t.phaseId === phase.id)
          const fallbackActions = phase.actions
          const pDone = phaseTasks.filter((t) => checked[t.id]).length
          return (
            <div key={phase.id} className="overflow-hidden rounded-lg border border-border-light bg-surface shadow-card">
              <div className="flex items-center gap-4 border-b border-border-light bg-bg-primary px-5 py-4.5">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-accent text-[15px] font-bold text-white">
                  {phaseTasks.length > 0 && pDone === phaseTasks.length ? (
                    <Icon name="check" size={20} stroke={3} />
                  ) : (
                    pi + 1
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-[17px] font-bold">{phase.title}</h3>
                  {phase.summary && <p className="mt-1 text-[13.5px] text-text-secondary">{phase.summary}</p>}
                </div>
                {phaseTasks.length > 0 && (
                  <span className="shrink-0 text-[12.5px] font-bold text-text-tertiary">
                    {pDone}/{phaseTasks.length}
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-2.5 p-3.5">
                {phaseTasks.length > 0
                  ? phaseTasks.map((t) => (
                      <TaskRow key={t.id} task={t} checked={!!checked[t.id]} onToggle={() => onToggle(t.id)} />
                    ))
                  : fallbackActions.map((a, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 rounded-md border border-border-light bg-surface px-4 py-3.5 text-[14.5px] leading-[1.5] text-text-primary"
                      >
                        <span className="mt-0.5 shrink-0 text-accent">
                          <Icon name="arrow" size={15} />
                        </span>
                        {a}
                      </div>
                    ))}
                {phase.outcome && (
                  <p className="px-1 pt-1 text-[12.5px] italic text-text-tertiary">Outcome: {phase.outcome}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function TaskRow({
  task,
  checked,
  onToggle
}: {
  task: PlannerDashboardTask
  checked: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex items-start gap-3 rounded-md border px-4 py-3.5 text-left transition-colors ${
        checked ? 'border-transparent bg-success-light' : 'border-border-light bg-surface'
      }`}
    >
      <span
        className={`mt-0.5 grid h-[22px] w-[22px] shrink-0 place-items-center rounded-md border-2 ${
          checked ? 'border-success bg-success' : 'border-border bg-transparent'
        }`}
      >
        {checked && <Icon name="check" size={14} stroke={3} className="text-white" />}
      </span>
      <span
        className={`text-[14.5px] leading-[1.5] ${
          checked ? 'text-text-secondary line-through opacity-65' : 'text-text-primary'
        }`}
      >
        {task.label}
      </span>
    </button>
  )
}

/* ---------- Outreach engine (CRM tracker + templates) ---------- */
function OutreachSection({
  intro,
  tracker,
  onTrackerChange,
  templates
}: {
  intro: string
  tracker: { sent: string; replies: string; positiveReplies: string; nextFollowUpDate: string }
  onTrackerChange: (
    key: 'sent' | 'replies' | 'positiveReplies' | 'nextFollowUpDate',
    value: string
  ) => void
  templates: { email: string; resume: string; call: string }
}) {
  const t = useT()
  const [tab, setTab] = useState<'email' | 'resume' | 'call'>('email')
  const [copied, setCopied] = useState(false)
  const tabs: Array<['email' | 'resume' | 'call', string]> = [
    ['email', t('Intro email', 'Courriel d’introduction')],
    ['resume', t('Résumé bullet', 'Puce de CV')],
    ['call', t('Follow-up', 'Relance')]
  ]
  const text = tab === 'email' ? templates.email : tab === 'resume' ? templates.resume : templates.call
  const metrics: Array<['sent' | 'replies' | 'positiveReplies', string, string]> = [
    ['sent', t('Messages sent', 'Messages envoyés'), 'var(--color-accent)'],
    ['replies', t('Replies', 'Réponses'), 'var(--color-accent-secondary)'],
    ['positiveReplies', t('Positive replies', 'Réponses positives'), 'var(--color-success)']
  ]
  const bump = (key: 'sent' | 'replies' | 'positiveReplies', delta: number) => {
    const current = Number.parseInt(tracker[key] || '0', 10) || 0
    onTrackerChange(key, String(Math.max(0, current + delta)))
  }
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <section className="mx-auto max-w-content px-4 pt-16">
      <SectionHead num="09" eyebrow={t('Outreach engine', 'Moteur de prospection')} title={t('Turn the plan into conversations', 'Transformez le plan en conversations')} sub={intro || t('Track your applications and send messages that get replies. You log these yourself — nothing is invented.', 'Suivez vos candidatures et envoyez des messages qui obtiennent des réponses. Vous les consignez vous-même — rien n’est inventé.')} />
      <div className="mt-7 grid gap-4 md:grid-cols-[1fr_1.3fr]">
        {/* tracker */}
        <div className="rounded-lg border border-border-light bg-surface p-5.5 shadow-card">
          <p className="text-[13px] font-bold uppercase tracking-[0.4px] text-text-secondary">{t('Your outreach', 'Votre prospection')}</p>
          <div className="mt-4 flex flex-col gap-3">
            {metrics.map(([key, label, color]) => (
              <div key={key} className="flex items-center gap-3">
                <p className="flex-1 text-[13.5px] font-semibold">{label}</p>
                <div className="flex items-center gap-2">
                  <button onClick={() => bump(key, -1)} className="grid h-7 w-7 place-items-center rounded-md border border-border text-text-secondary hover:border-accent">
                    <Icon name="x" size={13} />
                  </button>
                  <span className="min-w-[26px] text-center text-[19px] font-bold" style={{ color }}>
                    {Number.parseInt(tracker[key] || '0', 10) || 0}
                  </span>
                  <button onClick={() => bump(key, 1)} className="grid h-7 w-7 place-items-center rounded-md border border-border text-text-secondary hover:border-accent">
                    <Icon name="plus" size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-md bg-bg-secondary px-3.5 py-3 text-[12.5px] leading-[1.55] text-text-secondary">
            {t('You log these yourself — CareerHeap never invents outreach results. Aim for 3 new messages a week.', 'Vous les consignez vous-même — CareerHeap n’invente jamais de résultats de prospection. Visez 3 nouveaux messages par semaine.')}
          </div>
        </div>

        {/* templates */}
        <div className="rounded-lg border border-border-light bg-surface p-5.5 shadow-card">
          <div className="mb-3.5 flex flex-wrap gap-2">
            {tabs.map(([key, label]) => (
              <button
                key={key}
                onClick={() => {
                  setTab(key)
                  setCopied(false)
                }}
                className={`rounded-pill px-3.5 py-2 text-[13px] font-medium ${
                  tab === key ? 'bg-accent text-white' : 'border border-border bg-surface text-text-secondary hover:border-accent hover:text-accent'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="min-h-[140px] whitespace-pre-wrap rounded-md border border-border-light bg-bg-primary p-4 text-[13.5px] leading-[1.65] text-text-secondary">
            {text || t('Generate your plan to populate outreach templates tailored to your target role.', 'Générez votre plan pour remplir des modèles de prospection adaptés à votre rôle cible.')}
          </div>
          <button
            onClick={copy}
            disabled={!text}
            className="mt-3.5 inline-flex items-center gap-1.5 rounded-md bg-accent px-3.5 py-2 text-[13.5px] font-semibold text-white shadow-button hover:bg-accent-hover disabled:opacity-50"
          >
            <Icon name={copied ? 'check' : 'plus'} size={15} /> {copied ? t('Copied to clipboard', 'Copié dans le presse-papiers') : t('Copy template', 'Copier le modèle')}
          </button>
        </div>
      </div>
    </section>
  )
}

export function PlannerResultsPrototype(props: PlannerResultsPrototypeProps) {
  const t = useT()
  const { model, onEditInputs, onRegenerate, onExportPlan, onSavePlan, savePlanLabel = t('Save plan', 'Enregistrer le plan') } = props

  const score = useMemo(() => parseScore(model.summaryStrip.planScore), [model.summaryStrip.planScore])

  // Roadmap progress: seed from server/local initial state, emit on change.
  const [checked, setChecked] = useState<Record<string, boolean>>(() => {
    const seed = props.initialProgressState?.checkedTaskIds
    if (seed && Object.keys(seed).length > 0) return { ...seed }
    const out: Record<string, boolean> = {}
    for (const task of model.progress.tasks) if (task.checked) out[task.id] = true
    return out
  })

  // Re-sync local check state when server/local progress hydrates (initialProgressState
  // arrives async). React's "store previous prop in state" pattern — adjust during render.
  const seedSignature = JSON.stringify(props.initialProgressState?.checkedTaskIds ?? null)
  const [seenSeedSignature, setSeenSeedSignature] = useState(seedSignature)
  if (seedSignature !== seenSeedSignature) {
    setSeenSeedSignature(seedSignature)
    const seed = props.initialProgressState?.checkedTaskIds
    if (seed && Object.keys(seed).length > 0) setChecked({ ...seed })
  }

  const toggleTask = (id: string) => {
    // Compute next state from the current render's `checked` and notify the
    // parent from THIS event handler. The previous version called
    // onProgressStateChange (a parent setState) inside the setChecked updater,
    // which React runs during render — triggering "Cannot update a component
    // while rendering a different component". Updaters must stay pure.
    const next = { ...checked, [id]: !checked[id] }
    setChecked(next)
    props.onProgressStateChange?.({
      checkedTaskIds: next,
      expandedPhaseIds: props.initialProgressState?.expandedPhaseIds ?? [],
      completedTrainingIds: props.initialProgressState?.completedTrainingIds ?? {},
      updatedAt: new Date().toISOString()
    })
  }

  const skillsToBuildCount = model.skillTransfer.required.length
  const heroStats: Array<{ icon: string; label: string; fallback: DashboardFallbackValue<string> }> = [
    { icon: 'clock', label: t('Time to first role', 'Délai jusqu’au premier rôle'), fallback: model.hero.timeline },
    { icon: 'chart', label: t('Starting salary', 'Salaire de départ'), fallback: model.hero.salaryPotential },
    {
      icon: 'layers',
      label: t('Skills to build', 'Compétences à acquérir'),
      fallback: {
        value: skillsToBuildCount > 0 ? String(skillsToBuildCount) : '—',
        sourceLabel: t('From your skill gaps', 'D’après vos écarts de compétences')
      }
    }
  ]

  const requiredSkills = model.skillTransfer.required.slice(0, 6)

  return (
    <div className="pb-24">
      {/* action bar */}
      <div className="sticky top-0 z-30 border-b border-border-light bg-bg-primary/90 backdrop-blur">
        <div className="mx-auto flex max-w-content items-center justify-between gap-4 px-4 py-3">
          <span className="text-[13px] font-semibold text-text-tertiary">{model.summaryStrip.dataFreshness}</span>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={onEditInputs} className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-[13.5px] font-semibold text-text-secondary hover:bg-bg-secondary">
              <Icon name="refresh" size={15} /> {t('Edit inputs', 'Modifier les saisies')}
            </button>
            <button onClick={onExportPlan} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-2 text-[13.5px] font-semibold text-text-secondary hover:border-accent hover:text-accent">
              <Icon name="download" size={15} /> {t('Export', 'Exporter')}
            </button>
            <button onClick={onSavePlan} className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-2 text-[13.5px] font-semibold text-white shadow-button hover:bg-accent-hover">
              <Icon name="check" size={15} /> {savePlanLabel}
            </button>
          </div>
        </div>
      </div>

      {/* COMMAND CENTER (hero) */}
      <section className="relative overflow-hidden bg-bg-dark text-white">
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 88% -30%, rgba(36,93,255,0.45), transparent 48%), radial-gradient(circle at -5% 130%, rgba(14,165,164,0.28), transparent 42%)'
          }}
        />
        <div className="relative mx-auto max-w-content px-4 py-12">
          <span className="inline-flex items-center gap-1.5 rounded-pill bg-[color:var(--color-accent-secondary)]/20 px-3 py-1 text-[12px] font-semibold text-[#5fdedc]">
            <Icon name="sparkle" size={13} fill /> {t('Your strongest match', 'Votre meilleure correspondance')} · {model.hero.transitionVerdict}
          </span>
          <h1 className="mt-4 text-[28px] font-bold md:text-[40px]">{model.hero.title}</h1>
          <p className="mt-3 max-w-[620px] text-[17px] leading-[1.6] text-text-on-dark-muted">{model.hero.insight}</p>

          <div className="mt-8 grid gap-3.5 md:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center gap-4.5 rounded-lg border border-white/10 bg-white/[0.06] p-5">
              {score !== null && <ReadinessRing value={score} />}
              <div>
                <p className="text-[12px] font-semibold tracking-[0.4px] text-text-on-dark-muted">{t('STARTING STRENGTH', 'FORCE DE DÉPART')}</p>
                <p className="mt-0.5 text-[19px] font-bold text-white">{model.summaryStrip.planStatus}</p>
                <p className="mt-1 text-[12.5px] text-text-on-dark-muted">{t('for', 'pour')} {model.summaryBar.targetRole}</p>
              </div>
            </div>
            {heroStats.map((s) => (
              <FallbackStat key={s.label} icon={s.icon} label={s.label} fallback={s.fallback} />
            ))}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {model.methodology.sourceLines.slice(0, 4).map((line) => (
              <Src key={line}>{line}</Src>
            ))}
          </div>
        </div>
      </section>

      {/* SCORE BREAKDOWN */}
      {model.difficultyBreakdown.driverImpactRows.length > 0 && (
        <section className="mx-auto max-w-content px-4 pt-10">
          <div className="overflow-hidden rounded-lg border border-border-light bg-surface shadow-card">
            <div className="flex items-center gap-3.5 px-6 py-5">
              <span className="grid h-11 w-11 place-items-center rounded-md bg-accent-light text-accent">
                <Icon name="graph" size={22} />
              </span>
              <div>
                <h2 className="text-[18px] font-bold">
                  {score !== null ? t(`Why a ${score}? `, `Pourquoi ${score}? `) : ''}{t('Your compatibility, broken down', 'Votre compatibilité, décomposée')}
                </h2>
                <p className="mt-0.5 text-[13.5px] text-text-secondary">{model.difficultyBreakdown.explanation}</p>
              </div>
            </div>
            <div className="flex flex-col gap-4 px-6 pb-6">
              {model.difficultyBreakdown.driverImpactRows.map((row) => {
                const pct = row.weight > 0 ? Math.round((row.impactPoints / row.weight) * 100) : 0
                return (
                  <div key={row.label}>
                    <div className="mb-1.5 flex items-baseline justify-between">
                      <span className="text-[14.5px] font-semibold">
                        {row.label}{' '}
                        <span className="text-[12.5px] font-medium text-text-tertiary">· weight {row.weight}</span>
                      </span>
                      <span className="text-[13.5px] font-bold text-accent">
                        {row.impactPoints}
                        <span className="font-medium text-text-tertiary">/{row.weight}</span>
                      </span>
                    </div>
                    <MatchBar value={pct} color={pct >= 85 ? 'var(--color-success)' : 'var(--color-accent)'} />
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* SUGGESTED / ADJACENT ROLES */}
      {model.alternatives.cards.length > 0 && (
        <section className="mx-auto max-w-content px-4 pt-16">
          <SectionHead
            num="01"
            eyebrow={t('Adjacent options', 'Options adjacentes')}
            title={t('Real roles you can reach from here', 'De vrais rôles à votre portée')}
            sub={t('Ranked by fit from your occupation + skills graph — honest matches, not flattery.', 'Classés par adéquation à partir de votre graphe de profession et de compétences — des correspondances honnêtes, pas de la flatterie.')}
          />
          <div className="mt-7 flex flex-col gap-4">
            {model.alternatives.cards.slice(0, 5).map((c) => (
              <div key={c.occupationId} className="rounded-lg border border-border-light bg-surface p-5.5 shadow-card">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-[18px] font-bold">{c.title}</h3>
                    <div className="mt-1.5 flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1 rounded-pill bg-bg-secondary px-2.5 py-1 text-[11px] font-semibold text-text-secondary">
                        <Icon name="clock" size={12} /> {c.timeline}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-pill bg-bg-secondary px-2.5 py-1 text-[11px] font-semibold text-text-secondary">
                        <Icon name="chart" size={12} /> {c.salary.value}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-pill bg-bg-secondary px-2.5 py-1 text-[11px] font-semibold text-text-secondary">
                        <Icon name="trending" size={12} /> {c.difficulty}
                      </span>
                    </div>
                  </div>
                  {props.onSelectAlternativeRole && (
                    <button
                      onClick={() => props.onSelectAlternativeRole?.(c.title)}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-2 text-[13px] font-semibold text-text-secondary hover:border-accent hover:text-accent"
                    >
                      <Icon name="target" size={14} /> {t('Make this my focus', 'En faire mon objectif')}
                    </button>
                  )}
                </div>
                {c.reason && <p className="mt-3 text-[14px] leading-[1.55] text-text-secondary">{c.reason}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* START HERE */}
      {(model.actionWindow14.thisWeek.length > 0 || model.actionWindow14.proofToCollect.length > 0) && (
        <section className="mx-auto max-w-content px-4 pt-16">
          <SectionHead
            num="02"
            eyebrow={t('Start here', 'Commencez ici')}
            title={t('What to do first — your next 7 days', 'Quoi faire d’abord — vos 7 prochains jours')}
            sub={t('The whole plan is below, but momentum beats perfection. Pick one, finish it, come back.', 'Tout le plan est ci-dessous, mais l’élan vaut mieux que la perfection. Choisissez-en un, terminez-le, revenez.')}
          />
          <div className="mt-7 grid gap-4 md:grid-cols-[1.5fr_1fr]">
            <div className="rounded-lg border border-border-light bg-surface p-5.5 shadow-card">
              <p className="text-[13px] font-bold uppercase tracking-[0.4px] text-accent">{t('Do this week', 'À faire cette semaine')}</p>
              <ul className="mt-3.5 flex flex-col gap-2.5">
                {model.actionWindow14.thisWeek.map((a, i) => (
                  <li key={i} className="flex items-start gap-3 rounded-md border border-border-light bg-surface px-3.5 py-3 text-[14.5px] leading-[1.5]">
                    <span className="mt-0.5 shrink-0 text-accent"><Icon name="arrow" size={15} /></span>
                    {a}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-lg border border-border-light bg-[color:var(--color-accent)]/[0.04] p-5.5">
              <div className="flex items-center gap-2">
                <Icon name="flag" size={17} className="text-accent" />
                <p className="text-[13px] font-bold uppercase tracking-[0.4px] text-accent">{t('Proof to collect', 'Preuves à rassembler')}</p>
              </div>
              <ul className="mt-3.5 flex flex-col gap-3">
                {model.actionWindow14.proofToCollect.map((p, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-[14px] leading-[1.5] text-text-secondary">
                    <span className="shrink-0 text-[color:var(--color-accent-secondary)]"><Icon name="checkCircle" size={16} /></span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      {/* SKILL GAPS */}
      {requiredSkills.length > 0 && (
        <section className="mx-auto max-w-content px-4 pt-16">
          <SectionHead
            num="03"
            eyebrow={t('Skill gaps', 'Écarts de compétences')}
            title={t('The things that actually get you hired', 'Ce qui vous fait vraiment embaucher')}
            sub={t('Not everything — just what moves the needle for this role.', 'Pas tout — seulement ce qui fait une différence pour ce rôle.')}
          />
          <div className="mt-7 flex flex-col gap-3">
            {requiredSkills.map((g) => (
              <div key={g.label} className="rounded-lg border border-border-light bg-surface p-5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-[16px] font-bold">{g.label}</h3>
                  <span className="text-[12px] font-bold text-text-tertiary">{g.progress}%</span>
                </div>
                <div className="mt-3 max-w-[320px]">
                  <MatchBar value={g.progress} />
                </div>
              </div>
            ))}
          </div>
          {model.skillTransfer.largestGap && (
            <WhyThis label="How these gaps were chosen">{model.skillTransfer.largestGap}</WhyThis>
          )}
        </section>
      )}

      {/* STAND OUT */}
      {model.strengths.length > 0 && (
        <section className="mx-auto max-w-content px-4 pt-16">
          <SectionHead num="04" eyebrow={t('Your edge', 'Votre avantage')} title={t('Ways you already stand out', 'Ce qui vous démarque déjà')} />
          <div className="mt-7 grid gap-4 md:grid-cols-3">
            {model.strengths.slice(0, 3).map((s, i) => (
              <div key={i} className="rounded-lg border border-border-light bg-surface p-6 shadow-card">
                <span className="grid h-[42px] w-[42px] place-items-center rounded-md bg-[color:var(--color-accent-secondary)]/10 text-[#0a7f7e]">
                  <Icon name="star" size={20} fill />
                </span>
                <h3 className="mt-4 text-[16.5px] font-bold">{s.advantage}</h3>
                {s.whyItMatters && <p className="mt-2 text-[14px] leading-[1.65] text-text-secondary">{s.whyItMatters}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ROADMAP */}
      <RoadmapSection model={model} checked={checked} onToggle={toggleTask} />

      {/* TRAINING */}
      {model.training.courses.length > 0 && (
        <section className="mx-auto max-w-content px-4 pt-16">
          <SectionHead num="06" eyebrow={t('Training', 'Formation')} title={t('What to learn first', 'Quoi apprendre en premier')} sub={t('Ordered so a beginner always knows the next click. Only real provider, cost, length, and format shown.', 'Ordonné pour qu’un débutant connaisse toujours la prochaine étape. Seuls le vrai fournisseur, le coût, la durée et le format sont indiqués.')} />
          <div className="mt-7 grid gap-3.5 md:grid-cols-2">
            {model.training.courses.map((t) => {
              const tag = sourceTypeBadge(t.sourceType)
              return (
                <div key={t.id} className="flex flex-col rounded-lg border border-border-light bg-surface p-5">
                  <div className="flex items-start justify-between gap-2.5">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-accent-light text-accent">
                      <Icon name="book" size={20} />
                    </span>
                    <div className="flex gap-1.5">
                      <span className="rounded-pill bg-accent-light px-2 py-0.5 text-[10.5px] font-semibold text-accent">{t.priorityLabel}</span>
                      <span className={`rounded-pill px-2 py-0.5 text-[10.5px] font-semibold ${tag.cls}`}>{tag.label}</span>
                    </div>
                  </div>
                  <h3 className="mt-3.5 text-[16px] font-bold">{t.name}</h3>
                  <p className="mt-1 text-[13px] text-text-tertiary">{t.provider}</p>
                  <div className="mt-3.5 flex flex-wrap gap-3.5 text-[12.5px] text-text-secondary">
                    {t.length && <span className="inline-flex items-center gap-1.5"><Icon name="clock" size={13} /> {t.length}</span>}
                    {t.cost && <span className="inline-flex items-center gap-1.5"><Icon name="chart" size={13} /> {t.cost}</span>}
                    {t.modality && <span className="inline-flex items-center gap-1.5"><Icon name="compass" size={13} /> {t.modality}</span>}
                  </div>
                  {t.sourceLabel && <div className="mt-3"><Src>{t.sourceLabel}</Src></div>}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* CERTIFICATIONS */}
      {(model.certEducation.required.length > 0 || model.certEducation.recommended.length > 0) && (
        <section className="mx-auto max-w-content px-4 pt-16">
          <SectionHead num="07" eyebrow={t('Certifications & education', 'Certifications et formation')} title={t('What you actually need on paper', 'Ce qu’il vous faut vraiment sur papier')} sub={model.certEducation.effortSummary} />
          <div className="mt-7 grid gap-4 md:grid-cols-2">
            {model.certEducation.required.length > 0 && (
              <div className="rounded-lg border border-border-light bg-surface p-5.5 shadow-card">
                <p className="text-[13px] font-bold uppercase tracking-[0.4px] text-warning">{t('Required', 'Requis')}</p>
                <ul className="mt-3.5 flex flex-col gap-2.5">
                  {model.certEducation.required.map((c, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-[14px] leading-[1.5] text-text-secondary">
                      <span className="mt-0.5 shrink-0 text-warning"><Icon name="lock" size={15} /></span>{c}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {model.certEducation.recommended.length > 0 && (
              <div className="rounded-lg border border-border-light bg-surface p-5.5 shadow-card">
                <p className="text-[13px] font-bold uppercase tracking-[0.4px] text-accent">{t('Recommended (not required)', 'Recommandé (non requis)')}</p>
                <ul className="mt-3.5 flex flex-col gap-2.5">
                  {model.certEducation.recommended.map((c, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-[14px] leading-[1.5] text-text-secondary">
                      <span className="mt-0.5 shrink-0 text-[color:var(--color-accent-secondary)]"><Icon name="award" size={15} /></span>{c}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      {/* MARKET */}
      <section className="mx-auto max-w-content px-4 pt-16">
        <SectionHead num="08" eyebrow={t('Market reality', 'Réalité du marché')} title={t('What the market actually looks like', 'À quoi le marché ressemble vraiment')} sub={t('One concrete number per card, each labeled by how we know it. Estimates are never dressed up as facts.', 'Un chiffre concret par carte, chacun étiqueté selon notre source. Les estimations ne sont jamais présentées comme des faits.')} />
        <div className="mt-7 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {([
            ['chart', t('Entry wage', 'Salaire d’entrée'), model.marketSnapshot.entryWage, model.marketSnapshot.wageSourceLabel],
            ['trending', t('Mid-career', 'Mi-carrière'), model.marketSnapshot.midCareerSalary, model.marketSnapshot.wageSourceLabel],
            ['award', t('Top earners', 'Hauts salaires'), model.marketSnapshot.topEarners, model.marketSnapshot.wageSourceLabel],
            ['users', t('Local demand', 'Demande locale'), model.marketSnapshot.localDemand, model.marketSnapshot.demandSourceLabel]
          ] as Array<[string, string, DashboardFallbackValue<string>, string]>).map(([icon, label, fb, srcLabel]) => (
            <div key={label} className="rounded-lg border border-border-light bg-surface p-5 shadow-card">
              <div className="flex items-start justify-between">
                <span className="text-accent"><Icon name={icon} size={20} /></span>
                {fb.badge && <span className={`rounded-pill px-2 py-0.5 text-[10.5px] font-semibold ${badgeClass(fb.badge)}`}>{fb.badge}</span>}
              </div>
              <p className="mt-3.5 text-[12px] font-semibold uppercase tracking-[0.3px] text-text-tertiary">{label}</p>
              <p className="mt-1 text-[22px] font-bold">{fb.value}</p>
              {(fb.sourceLabel || srcLabel) && <div className="mt-3"><Src>{fb.sourceLabel || srcLabel}</Src></div>}
            </div>
          ))}
        </div>
      </section>

      {/* OUTREACH */}
      {props.outreachTracker && props.onOutreachTrackerChange && (
        <OutreachSection
          intro={model.outreach.intro}
          tracker={props.outreachTracker}
          onTrackerChange={props.onOutreachTrackerChange}
          templates={{
            email: props.emailToolkitDraft ?? '',
            resume: props.resumeToolkitDraft ?? '',
            call: props.callToolkitDraft ?? ''
          }}
        />
      )}

      {/* TRUST FOOTER */}
      <section className="mt-16 border-t border-border-light bg-bg-secondary">
        <div className="mx-auto max-w-content px-4 py-14">
          <div className="grid gap-8 md:grid-cols-2">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-pill bg-[color:var(--color-accent-secondary)]/10 px-3 py-1 text-[12px] font-semibold text-[#0a7f7e]">
                <Icon name="shield" size={13} /> Full transparency
              </span>
              <h2 className="mt-3.5 text-[24px] font-bold">{t('Where this plan came from', 'D’où vient ce plan')}</h2>
              <p className="mt-2.5 max-w-[460px] text-[15px] leading-[1.6] text-text-secondary">{model.methodology.scoreSummary}</p>
            </div>
            <div className="rounded-lg border border-border-light bg-surface p-5">
              <p className="text-[12.5px] font-bold uppercase tracking-[0.4px] text-[color:var(--color-accent-secondary)]">{t('Datasets used', 'Jeux de données utilisés')}</p>
              <ul className="mt-3 flex flex-col gap-2.5">
                {model.methodology.sourceLines.map((x) => (
                  <li key={x} className="flex gap-2 text-[13px] text-text-secondary">
                    <Icon name="database" size={14} className="mt-0.5 shrink-0 text-[color:var(--color-accent-secondary)]" /> {x}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
            <button onClick={onRegenerate} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-4 py-2.5 text-[14px] font-semibold text-text-secondary hover:border-accent hover:text-accent">
              <Icon name="refresh" size={16} /> {t('Regenerate', 'Régénérer')}
            </button>
            <p className="text-[12.5px] text-text-tertiary">© {new Date().getFullYear()} CareerHeap · {t('No data invented · Unknowns labeled, never guessed.', 'Aucune donnée inventée · Les inconnues sont étiquetées, jamais devinées.')}</p>
          </div>
        </div>
      </section>

      {/* STICKY NEXT ACTION */}
      {model.stickyPanel.nextBestAction && (
        <div className="fixed bottom-4 left-1/2 z-40 w-[calc(100%-32px)] max-w-[720px] -translate-x-1/2">
          <div className="flex items-center gap-3.5 rounded-lg border border-border bg-surface px-4 py-3 shadow-panel">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-accent-light text-accent">
              <Icon name="zap" size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.4px] text-accent">{t('Your next action', 'Votre prochaine action')}</p>
              <p className="truncate text-[14px] font-semibold">{model.stickyPanel.nextBestAction}</p>
            </div>
            <a
              href="#planner-roadmap"
              className="shrink-0 rounded-md bg-accent px-3 py-2 text-[13.5px] font-semibold text-white shadow-button hover:bg-accent-hover"
            >
              {t('Open roadmap', 'Ouvrir la feuille de route')}
            </a>
          </div>
        </div>
      )}
    </div>
  )
}

export default PlannerResultsPrototype
