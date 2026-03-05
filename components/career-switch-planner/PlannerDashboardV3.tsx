'use client'

import Badge from '@/components/Badge'
import Button from '@/components/Button'
import Card from '@/components/Card'
import FAQAccordion from '@/components/FAQAccordion'
import ToolCard from '@/components/ToolCard'
import type { DashboardFallbackValue, PlannerDashboardV3Model } from '@/lib/planner/v3Dashboard'

interface PlannerDashboardV3Props {
  model: PlannerDashboardV3Model
  hasDraftChanges: boolean
  isGuestPreview: boolean
  faqItems: Array<{ question: string; answer: string }>
  relatedTools: Array<{
    slug: string
    title: string
    description: string
    icon: 'resume' | 'interview' | 'cover' | 'job' | 'planner'
    isActive?: boolean
  }>
  resumeToolkitDraft: string
  emailToolkitDraft: string
  callToolkitDraft: string
  onEditInputs: () => void
  onRegenerate: () => void
  onStartNewPlan: () => void
  onSelectAlternativeRole: (title: string) => void
  onCopyEmail: () => void
  onCopyResumePrompt: () => void
  onDownloadTemplate: () => void
  onExportPlan: () => void
  onDownloadPdf: () => void
  onSavePlan: () => void
}

function FallbackTag({ value }: { value: DashboardFallbackValue<string> }) {
  if (!value.badge) return null
  const variant = value.badge === 'Needs data' ? 'warning' : value.badge === 'Estimate' ? 'info' : 'default'
  return <Badge variant={variant}>{value.badge}</Badge>
}

function tenScale(score: number) {
  return `${(Math.max(0, Math.min(100, score)) / 10).toFixed(1)} / 10`
}

function MeterRow({ label, score, positive = false }: { label: string; score: number; positive?: boolean }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-text-primary">{label}</p>
        <p className="text-xs font-semibold text-text-secondary">{tenScale(score)}</p>
      </div>
      <div className={`h-2 rounded-pill ${positive ? 'bg-success/15' : 'bg-bg-secondary'}`}>
        <div className={`h-2 rounded-pill ${positive ? 'bg-success' : 'bg-accent'}`} style={{ width: `${Math.max(0, Math.min(100, score))}%` }} />
      </div>
    </div>
  )
}

function SectionCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <Card className={`border border-border-light p-5 ${className}`}>{children}</Card>
}

function ChecklistCol({
  title,
  items,
  completion,
  accent = false
}: {
  title: string
  items: string[]
  completion: number
  accent?: boolean
}) {
  return (
    <div className={`rounded-lg border p-4 ${accent ? 'border-accent/25 bg-accent-light' : 'border-border-light bg-bg-secondary'}`}>
      <p className="text-sm font-semibold text-text-primary">{title}</p>
      <ul className="mt-3 space-y-2 text-sm text-text-secondary">
        {items.map((item) => (
          <li key={`${title}-${item}`} className="break-words">[ ] {item}</li>
        ))}
      </ul>
      <p className={`mt-3 text-xs font-semibold ${accent ? 'text-accent' : 'text-text-tertiary'}`}>Completion: {completion}%</p>
    </div>
  )
}

export function PlannerDashboardV3({
  model,
  hasDraftChanges,
  isGuestPreview,
  faqItems,
  relatedTools,
  resumeToolkitDraft,
  emailToolkitDraft,
  callToolkitDraft,
  onEditInputs,
  onRegenerate,
  onStartNewPlan,
  onSelectAlternativeRole,
  onCopyEmail,
  onCopyResumePrompt,
  onDownloadTemplate,
  onExportPlan,
  onDownloadPdf,
  onSavePlan
}: PlannerDashboardV3Props) {
  return (
    <div className="space-y-6">
      <SectionCard className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">Input Summary</p>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-pill border border-border px-3 py-1 text-text-secondary">Current: {model.summaryBar.currentRole}</span>
              <span className="rounded-pill border border-border px-3 py-1 text-text-secondary">Target: {model.summaryBar.targetRole}</span>
              <span className="rounded-pill border border-border px-3 py-1 text-text-secondary">Location: {model.summaryBar.location}</span>
              <span className="rounded-pill border border-border px-3 py-1 text-text-secondary">Timeline: {model.summaryBar.timeline}</span>
              <span className="rounded-pill border border-border px-3 py-1 text-text-secondary">Skills: {model.summaryBar.skillsCount}</span>
            </div>
            <p className="text-xs text-text-tertiary">Last updated: {model.summaryBar.lastUpdated}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={onEditInputs}>Edit Inputs</Button>
            <Button size="sm" onClick={onRegenerate}>Regenerate with Changes</Button>
            <Button variant="ghost" size="sm" onClick={onStartNewPlan}>Start New Plan</Button>
          </div>
        </div>
        {hasDraftChanges ? <div className="mt-4 rounded-md border border-warning/25 bg-warning-light px-3 py-2 text-sm text-text-secondary">This report is from previous inputs.</div> : null}
      </SectionCard>

      <div className="rounded-xl border border-border-light bg-surface p-3">
        <div className="grid gap-2 md:grid-cols-5">
          <div className="rounded-lg border border-border-light bg-surface p-3"><p className="text-[11px] font-semibold uppercase tracking-[1.1px] text-text-tertiary">Plan Score</p><p className="mt-1 text-sm font-bold text-text-primary">{model.summaryStrip.planScore}</p></div>
          <div className="rounded-lg border border-border-light bg-surface p-3"><p className="text-[11px] font-semibold uppercase tracking-[1.1px] text-text-tertiary">Plan Status</p><p className="mt-1 text-sm font-bold text-text-primary">{model.summaryStrip.planStatus}</p></div>
          <div className="rounded-lg border border-border-light bg-surface p-3"><p className="text-[11px] font-semibold uppercase tracking-[1.1px] text-text-tertiary">Confidence Trend (30D)</p><p className="mt-1 text-sm font-bold text-success">{model.summaryStrip.confidenceTrend}</p></div>
          <div className="rounded-lg border border-border-light bg-surface p-3"><p className="text-[11px] font-semibold uppercase tracking-[1.1px] text-text-tertiary">Model</p><p className="mt-1 text-sm font-bold text-text-primary">{model.summaryStrip.modelVersion}</p></div>
          <div className="rounded-lg border border-border-light bg-surface p-3"><p className="text-[11px] font-semibold uppercase tracking-[1.1px] text-text-tertiary">Data Freshness</p><p className="mt-1 text-sm font-bold text-accent">{model.summaryStrip.dataFreshness}</p></div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-5">
          <SectionCard className="bg-surface p-6">
            <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">1. Transition Hero (Command Center)</p>
            <div className="mt-3 flex flex-wrap gap-2">{model.hero.scenarioModes.map((m) => <span key={m.label} className={`rounded-pill border px-3 py-1 text-xs font-semibold ${m.active ? 'border-accent bg-accent text-text-on-dark' : 'border-border bg-surface text-text-secondary'}`}>{m.label}</span>)}</div>
            <h2 className="mt-4 text-3xl font-bold leading-[1.08] text-text-primary md:text-[40px]">{model.hero.title}</h2>
            <p className="mt-3 max-w-[80ch] text-sm leading-[1.7] text-text-secondary">{model.hero.insight}</p>
            <div className="mt-5 grid gap-2 md:grid-cols-5">
              {[{ label: 'Difficulty Score', metric: model.hero.difficulty, valueClass: 'text-text-primary' }, { label: 'Timeline', metric: model.hero.timeline, valueClass: 'text-text-primary' }, { label: 'Success Probability', metric: model.hero.probability, valueClass: 'text-success' }, { label: 'Training Cost', metric: model.hero.trainingCost, valueClass: 'text-text-primary' }, { label: 'Salary Potential', metric: model.hero.salaryPotential, valueClass: 'text-text-primary' }].map((item) => (
                <div key={item.label} className="rounded-lg border border-border bg-bg-secondary p-3"><p className="text-[11px] font-semibold uppercase tracking-[1.1px] text-text-tertiary">{item.label}</p><p className={`mt-2 text-xl font-bold ${item.valueClass}`}>{item.metric.value}</p><div className="mt-2"><FallbackTag value={item.metric} /></div></div>
              ))}
            </div>
          </SectionCard>

          <SectionCard className="bg-bg-secondary">
            <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">2. Transition Difficulty Breakdown</p>
            <div className="mt-4 space-y-3">{model.difficultyBreakdown.items.map((item) => <MeterRow key={item.label} label={item.label} score={item.score} positive={item.label === 'Market Demand'} />)}</div>
            <div className="mt-4 rounded-lg border border-border-light bg-surface p-3"><p className="text-xs font-semibold uppercase tracking-[1.1px] text-accent">Driver Impact Math</p><div className="mt-2 space-y-1 text-xs font-semibold text-text-secondary">{model.difficultyBreakdown.driverImpactRows.map((row) => <p key={row.label}>{row.label} ({row.weight}%) -&gt; {row.impactPoints >= 0 ? '+' : ''}{row.impactPoints} pts</p>)}</div></div>
            <div className="mt-3 grid gap-3 md:grid-cols-2"><div className="rounded-lg border border-warning/35 bg-warning-light p-3"><p className="text-xs font-semibold uppercase tracking-[1.1px] text-warning">Primary Barrier</p><p className="mt-1 text-sm text-text-secondary">{model.difficultyBreakdown.primaryBarrier}</p></div><div className="rounded-lg border border-success/30 bg-success/10 p-3"><p className="text-xs font-semibold uppercase tracking-[1.1px] text-success">Core Advantage</p><p className="mt-1 text-sm text-text-secondary">{model.difficultyBreakdown.coreAdvantage}</p></div></div>
          </SectionCard>

          <SectionCard className="bg-bg-secondary">
            <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">3. Skills and Evidence Requirements</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-border-light bg-surface p-4"><p className="text-sm font-semibold text-text-primary">Transferable Strengths</p><div className="mt-3 space-y-2">{model.skillTransfer.transferable.map((item) => <MeterRow key={item.label} label={item.label} score={item.progress} />)}</div></div>
              <div className="rounded-lg border border-border-light bg-surface p-4"><p className="text-sm font-semibold text-text-primary">Skills Required for Target Career</p><div className="mt-3 space-y-2">{model.skillTransfer.required.map((item) => <MeterRow key={item.label} label={item.label} score={item.progress} />)}</div></div>
            </div>
            <div className="mt-3 rounded-lg border border-accent/25 bg-accent-light px-3 py-2 text-sm font-semibold text-accent">Largest gaps and required proof: {model.skillTransfer.largestGap}</div>
            <div className="mt-3 rounded-lg border border-border-light bg-surface p-3"><p className="text-xs font-semibold uppercase tracking-[1.1px] text-accent">Evidence Required Before Applying</p><ul className="mt-2 space-y-1.5 text-sm text-text-secondary">{model.skillTransfer.evidenceRequired.map((item) => <li key={item} className="break-words">- {item}</li>)}</ul></div>
          </SectionCard>

          <SectionCard className="bg-surface">
            <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">4. Career Transition Roadmap</p><Badge variant="info">Contextual Detail</Badge></div>
            <div className="mt-4 space-y-3">{model.roadmap.phases.map((phase) => (<details key={phase.id} open={phase.expandedByDefault} className="rounded-lg border border-accent/25 bg-bg-secondary p-4"><summary className="cursor-pointer text-sm font-semibold text-accent">{phase.title}</summary><p className="mt-2 text-sm text-text-secondary">{phase.summary}</p><div className="mt-3 grid gap-3 md:grid-cols-3"><div><p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">Detailed actions</p><ul className="mt-2 space-y-1.5 text-sm text-text-secondary">{phase.actions.map((item) => <li key={item}>- {item}</li>)}</ul></div><div><p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">Resources</p><ul className="mt-2 space-y-1.5 text-sm text-text-secondary">{phase.resources.map((item) => <li key={item.label}>- {item.label}</li>)}</ul></div><div><p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">Links</p><ul className="mt-2 space-y-1.5 text-sm text-accent">{phase.links.map((item) => <li key={item.url}><a href={item.url} target="_blank" rel="noreferrer">{item.label}</a></li>)}</ul></div></div></details>))}</div>
          </SectionCard>

          {isGuestPreview ? (
            <SectionCard className="border-warning/25 bg-warning-light"><p className="text-xs font-semibold uppercase tracking-[1.1px] text-warning">Preview Limit</p><p className="mt-2 text-sm text-text-secondary">Sections after <span className="font-semibold text-text-primary">4. Career Transition Roadmap</span> are locked on guest preview.</p><p className="mt-2 text-sm text-text-secondary">Sign in to unlock Fastest Path, Training, Market Snapshot, Outreach Toolkit, Reality Check, Action Checklist, Alternative Paths, Sticky Action Panel, FAQ, and Related Tools.</p><a href="/login" className="mt-4 inline-flex rounded-lg border border-accent/20 bg-accent-light px-4 py-2 text-sm font-semibold text-accent">Sign In to Unlock Full Report</a></SectionCard>
          ) : (
            <>
              <SectionCard><p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">5. Fastest Path Strategy</p><div className="mt-4 grid gap-3 md:grid-cols-2"><div className="rounded-lg border border-accent/25 bg-accent-light p-3"><p className="text-xs font-semibold uppercase tracking-[1.1px] text-accent">Fastest Path to Apply</p><div className="mt-2 space-y-2">{model.fastestPath.steps.map((s) => <div key={`f-${s.label}-${s.detail}`} className="rounded-md border border-accent/20 bg-surface p-2"><p className="text-xs font-semibold text-accent">{s.label}</p><p className="mt-1 text-sm text-text-secondary">{s.detail}</p></div>)}</div></div><div className="rounded-lg border border-border-light bg-bg-secondary p-3"><p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">Strong Candidate Path</p><div className="mt-2 space-y-2">{model.fastestPath.strongestPath.map((s) => <div key={`s-${s.label}-${s.detail}`} className="rounded-md border border-border-light bg-surface p-2"><p className="text-xs font-semibold text-text-primary">{s.label}</p><p className="mt-1 text-sm text-text-secondary">{s.detail}</p></div>)}</div></div></div></SectionCard>
              <SectionCard><p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">6. Training & Certifications</p><div className="mt-4 grid gap-3 md:grid-cols-3">{model.training.courses.map((c) => <div key={`${c.name}-${c.provider}`} className="rounded-lg border border-border-light bg-bg-secondary p-4"><p className="text-sm font-semibold text-text-primary">{c.name}</p><p className="mt-1 text-sm text-text-secondary">{c.provider}</p><p className="mt-2 text-xs text-text-tertiary">Length: {c.length}</p><p className="text-xs text-text-tertiary">Estimated Cost: {c.cost}</p></div>)}</div></SectionCard>
              <SectionCard><p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">7. Job Market Snapshot</p><div className="mt-4 grid gap-3 md:grid-cols-5">{[{ label: 'Average Entry Wage', metric: model.marketSnapshot.entryWage }, { label: 'Mid Career Salary', metric: model.marketSnapshot.midCareerSalary }, { label: 'Top Earners', metric: model.marketSnapshot.topEarners }, { label: 'Local Demand', metric: model.marketSnapshot.localDemand }, { label: 'Typical Hiring Requirements', metric: model.marketSnapshot.hiringRequirements }].map((i) => <div key={i.label} className="rounded-lg border border-border-light bg-bg-secondary p-3"><p className="text-[11px] font-semibold uppercase tracking-[1.1px] text-text-tertiary">{i.label}</p><p className="mt-2 text-sm font-semibold text-text-primary break-words">{i.metric.value}</p><div className="mt-2"><FallbackTag value={i.metric} /></div></div>)}</div></SectionCard>
              <SectionCard><p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">8. Employer Outreach Toolkit</p><p className="mt-2 text-sm text-text-secondary">{model.outreach.intro}</p><div className="mt-4 grid gap-3 md:grid-cols-3"><div className="rounded-lg border border-border-light bg-bg-secondary p-4"><p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">Resume Prompt</p><p className="mt-2 whitespace-pre-wrap text-sm text-text-secondary">{resumeToolkitDraft || 'No prompt generated yet.'}</p></div><div className="rounded-lg border border-border-light bg-bg-secondary p-4"><p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">Email Template</p><p className="mt-2 whitespace-pre-wrap text-sm text-text-secondary">{emailToolkitDraft || 'No email generated yet.'}</p></div><div className="rounded-lg border border-border-light bg-bg-secondary p-4"><p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">Call Script</p><p className="mt-2 whitespace-pre-wrap text-sm text-text-secondary">{callToolkitDraft || 'No call script generated yet.'}</p></div></div><div className="mt-4 flex flex-wrap gap-2"><Button size="sm" onClick={onCopyEmail}>Copy Email</Button><Button size="sm" variant="outline" onClick={onCopyResumePrompt}>Copy Resume Prompt</Button><Button size="sm" variant="ghost" onClick={onDownloadTemplate}>Download Template</Button></div></SectionCard>
              <SectionCard className="border-warning/30"><p className="text-xs font-semibold uppercase tracking-[1.1px] text-warning">9. Reality Check</p><div className="mt-4 grid gap-3 md:grid-cols-2">{[{ label: 'Typical applications to first offer', metric: model.realityCheck.applicationsNeeded }, { label: 'Typical time to first offer', metric: model.realityCheck.timeToOffer }, { label: 'Competition level', metric: model.realityCheck.competitionLevel }, { label: 'Financial tradeoff window', metric: model.realityCheck.financialTradeoff }].map((i) => <div key={i.label} className="rounded-lg border border-warning/25 bg-warning-light p-3"><p className="text-xs font-semibold uppercase tracking-[1.1px] text-warning">{i.label}</p><p className="mt-2 text-base font-semibold text-text-secondary break-words">{i.metric.value}</p></div>)}</div></SectionCard>
              <SectionCard className="bg-bg-secondary"><p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">10. Action Checklist</p><div className="mt-4 grid gap-3 md:grid-cols-3"><ChecklistCol title="Now" items={model.checklist.immediate} completion={model.checklist.nowCompletionPercent} accent /><ChecklistCol title="Next" items={model.checklist.shortTerm} completion={model.checklist.nextCompletionPercent} /><ChecklistCol title="Blocked" items={model.checklist.longTerm} completion={model.checklist.blockedCompletionPercent} /></div><div className="mt-3 flex flex-wrap gap-2">{model.checklist.reminderBadges.map((b, idx) => <span key={b} className={`rounded-pill border px-3 py-1 text-xs font-semibold ${idx===0 ? 'border-accent/20 bg-accent-light text-accent' : idx===2 ? 'border-success/20 bg-success/10 text-success' : 'border-border bg-surface text-text-secondary'}`}>{b}</span>)}</div></SectionCard>
              <SectionCard className="bg-bg-secondary"><p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">11. Alternative Paths and Compare Mode</p><p className="mt-2 text-sm text-text-secondary">Compare two paths side by side before regenerating your roadmap.</p><div className="mt-4 grid gap-2 md:grid-cols-2"><div className="rounded-lg border border-accent/25 bg-accent-light p-3"><p className="text-xs font-semibold uppercase tracking-[1.1px] text-accent">Compare A - {model.alternatives.compareA.title}</p><p className="mt-1 text-xs text-text-secondary">Difficulty {model.alternatives.compareA.difficulty} | {model.alternatives.compareA.timeline} | {model.alternatives.compareA.salary}</p></div><div className="rounded-lg border border-border bg-surface p-3"><p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-primary">Compare B - {model.alternatives.compareB.title}</p><p className="mt-1 text-xs text-text-secondary">Difficulty {model.alternatives.compareB.difficulty} | {model.alternatives.compareB.timeline} | {model.alternatives.compareB.salary}</p></div></div><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">{model.alternatives.cards.map((item, idx) => <button key={item.occupationId} type="button" onClick={() => onSelectAlternativeRole(item.title)} className={`rounded-lg border p-4 text-left transition ${idx===0 ? 'border-accent/30 bg-accent-light' : 'border-border-light bg-surface hover:border-accent/30'}`}><div className="flex flex-wrap gap-1">{idx===0 ? <span className="rounded-pill border border-accent/20 bg-accent-light px-2 py-0.5 text-[10px] font-semibold text-accent">Selected Route</span> : null}{idx<=1 ? <span className="rounded-pill border border-accent/20 bg-accent-light px-2 py-0.5 text-[10px] font-semibold text-accent">In Compare</span> : null}</div><p className="mt-2 text-sm font-semibold text-text-primary">{item.title}</p><p className="mt-2 text-xs text-text-tertiary">Difficulty: {item.difficulty}</p><p className="mt-1 text-xs text-text-tertiary">Timeline: {item.timeline}</p><p className="mt-1 text-xs text-text-tertiary break-words">Salary: {item.salary}</p></button>)}</div></SectionCard>
              <SectionCard><p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">13. Trust / FAQ</p><FAQAccordion items={faqItems} className="mt-4" /></SectionCard>
              <SectionCard className="bg-bg-secondary"><p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">14. Related Tools</p><div className="mt-4 grid gap-4 md:grid-cols-3">{relatedTools.map((tool) => <ToolCard key={tool.slug} {...tool} />)}</div></SectionCard>
            </>
          )}
        </div>

        {!isGuestPreview ? (
          <div className="space-y-4 xl:sticky xl:top-4 xl:self-start">
            <div className="flex items-center gap-2"><p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">Insights</p><div className="h-px flex-1 bg-border" /></div>
            <SectionCard className="p-4"><span className="rounded-pill border border-accent/20 bg-accent-light px-2 py-0.5 text-[10px] font-semibold text-accent">Optional</span><p className="mt-3 text-base font-bold text-text-primary">{model.insights.welcomeBack.title}</p><div className="mt-2 space-y-1">{model.insights.welcomeBack.bodyLines.map((line) => <p key={line} className="text-sm text-text-secondary">{line}</p>)}</div><div className="mt-3 rounded-md border border-border-light bg-bg-secondary p-3"><p className="text-xs font-semibold uppercase tracking-[1.1px] text-accent">Recommended Action</p><p className="mt-1 text-sm font-semibold text-text-primary">{model.insights.welcomeBack.recommendedAction}</p></div></SectionCard>
            <SectionCard className="p-4"><p className="text-xs font-semibold uppercase tracking-[1.1px] text-accent">AI Insight</p><p className="mt-2 text-sm leading-[1.6] text-text-secondary">{model.insights.aiInsight.summary}</p><div className="mt-3 rounded-md border border-border-light bg-bg-secondary p-3"><p className="text-xs font-semibold text-text-tertiary">{model.insights.aiInsight.trendLabel}</p><div className="mt-2 flex h-9 items-end gap-1">{model.insights.aiInsight.bars.map((h, idx) => <div key={`${idx}`} className="w-3 rounded-sm bg-accent" style={{ height: `${Math.max(8, Math.min(36, h))}px`, opacity: 0.45 + idx * 0.09 }} />)}</div><p className="mt-2 text-xs font-semibold text-accent">{model.insights.aiInsight.trendStartPercent}% to {model.insights.aiInsight.trendEndPercent}% in last 30 days</p></div></SectionCard>
            <div className="flex items-center gap-2"><p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">Execution</p><div className="h-px flex-1 bg-border" /></div>
            <SectionCard className="p-4"><p id="planner-v3-sticky-panel" className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">12. Sticky Action Panel</p><p className="mt-2 text-xs text-text-tertiary">Your Transition</p><p className="mt-1 text-base font-bold text-text-primary">{model.stickyPanel.transition}</p><p className="mt-2 text-sm text-text-secondary">Difficulty: {model.stickyPanel.difficulty}</p><p className="text-sm text-text-secondary">Timeline: {model.stickyPanel.timeline}</p><div className="mt-3 rounded-lg border border-accent/25 bg-accent-light p-3"><p className="text-xs font-semibold uppercase tracking-[1.1px] text-accent">Progress to First Offer</p><div className="mt-2 h-2 rounded-pill bg-surface"><div className="h-2 rounded-pill bg-accent" style={{ width: `${model.stickyPanel.progressToOffer}%` }} /></div><p className="mt-2 text-xs font-semibold text-accent">{model.stickyPanel.progressToOffer}% complete based on tasks + pipeline signal</p></div><div className="mt-3 rounded-lg border border-success/20 bg-success/10 p-3"><p className="text-xs font-semibold uppercase tracking-[1.1px] text-success">Next Best Action</p><p className="mt-1 text-sm text-success">{model.stickyPanel.nextBestAction}</p></div><div className="mt-3 rounded-lg border border-border-light bg-bg-secondary p-3"><p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">Next Steps</p><ul className="mt-2 space-y-1.5 text-sm text-text-secondary">{model.stickyPanel.nextSteps.map((item) => <li key={item}>[ ] {item}</li>)}</ul></div><div className="mt-4 flex flex-col gap-2"><Button size="sm" onClick={onExportPlan}>Export Plan</Button><Button size="sm" variant="secondary" onClick={onDownloadPdf}>Download PDF</Button><Button size="sm" variant="outline" onClick={onSavePlan}>Save Plan</Button></div></SectionCard>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default PlannerDashboardV3
