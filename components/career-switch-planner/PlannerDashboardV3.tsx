'use client'

import Badge from '@/components/Badge'
import Button from '@/components/Button'
import Card from '@/components/Card'
import ToolCard from '@/components/ToolCard'
import FAQAccordion from '@/components/FAQAccordion'
import type { PlannerDashboardV3Model, DashboardFallbackValue } from '@/lib/planner/v3Dashboard'

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

function MeterRow({ label, score }: { label: string; score: number }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-text-primary">{label}</p>
        <p className="text-xs text-text-tertiary">{score}%</p>
      </div>
      <div className="h-2 rounded-pill bg-bg-secondary">
        <div className="h-2 rounded-pill bg-accent" style={{ width: `${Math.max(0, Math.min(100, score))}%` }} />
      </div>
    </div>
  )
}

function ChecklistColumn({
  title,
  items,
  tone
}: {
  title: string
  items: string[]
  tone: 'default' | 'success' | 'warning'
}) {
  const toneClass =
    tone === 'success'
      ? 'border-success/20 bg-success/10'
      : tone === 'warning'
        ? 'border-warning/25 bg-warning-light'
        : 'border-border-light bg-bg-secondary'

  return (
    <div className={`rounded-lg border p-4 ${toneClass}`}>
      <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">{title}</p>
      <ul className="mt-3 space-y-2 text-sm text-text-secondary">
        {items.map((item) => (
          <li key={`${title}-${item}`} className="break-words">
            [ ] {item}
          </li>
        ))}
      </ul>
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
      <Card className="border border-border-light bg-surface p-4 md:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">Input Summary</p>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-pill border border-border px-3 py-1 text-text-secondary">
                Current: {model.summaryBar.currentRole}
              </span>
              <span className="rounded-pill border border-border px-3 py-1 text-text-secondary">
                Target: {model.summaryBar.targetRole}
              </span>
              <span className="rounded-pill border border-border px-3 py-1 text-text-secondary">
                Location: {model.summaryBar.location}
              </span>
              <span className="rounded-pill border border-border px-3 py-1 text-text-secondary">
                Timeline: {model.summaryBar.timeline}
              </span>
              <span className="rounded-pill border border-border px-3 py-1 text-text-secondary">
                Skills: {model.summaryBar.skillsCount}
              </span>
            </div>
            <p className="text-xs text-text-tertiary">Last updated: {model.summaryBar.lastUpdated}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={onEditInputs}>
              Edit Inputs
            </Button>
            <Button size="sm" onClick={onRegenerate}>
              Regenerate with Changes
            </Button>
            <Button variant="ghost" size="sm" onClick={onStartNewPlan}>
              Start New Plan
            </Button>
          </div>
        </div>
        {hasDraftChanges ? (
          <div className="mt-4 rounded-md border border-warning/25 bg-warning-light px-3 py-2 text-sm text-text-secondary">
            This report is from previous inputs.
          </div>
        ) : null}
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-5">
          <Card className="p-5">
            <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">1. Transition Hero</p>
            <h2 className="mt-2 text-3xl font-bold text-text-primary md:text-[40px]">{model.hero.title}</h2>
            <p className="mt-3 max-w-[70ch] text-sm leading-[1.75] text-text-secondary">{model.hero.insight}</p>
            <div className="mt-5 grid gap-3 md:grid-cols-5">
              {[
                { label: 'Difficulty', metric: model.hero.difficulty },
                { label: 'Timeline', metric: model.hero.timeline },
                { label: 'Probability', metric: model.hero.probability },
                { label: 'Training Cost', metric: model.hero.trainingCost },
                { label: 'Salary Potential', metric: model.hero.salaryPotential }
              ].map((item) => (
                <div key={item.label} className="rounded-lg border border-border-light bg-bg-secondary p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[1.1px] text-text-tertiary">{item.label}</p>
                  <p className="mt-1 text-sm font-semibold text-text-primary break-words">{item.metric.value}</p>
                  <div className="mt-2">
                    <FallbackTag value={item.metric} />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">2. Transition Difficulty Breakdown</p>
            <div className="mt-4 space-y-3">
              {model.difficultyBreakdown.items.map((item) => (
                <MeterRow key={item.label} label={item.label} score={item.score} />
              ))}
            </div>
            <p className="mt-4 text-sm text-text-secondary">{model.difficultyBreakdown.explanation}</p>
          </Card>

          <div className="grid gap-5 md:grid-cols-2">
            <Card className="p-5">
              <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">3. Transferable Strengths</p>
              <div className="mt-4 space-y-3">
                {model.skillTransfer.transferable.map((item) => (
                  <MeterRow key={item.label} label={item.label} score={item.progress} />
                ))}
              </div>
            </Card>
            <Card className="p-5">
              <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">3. Skills Required for Target Career</p>
              <div className="mt-4 space-y-3">
                {model.skillTransfer.required.map((item) => (
                  <MeterRow key={item.label} label={item.label} score={item.progress} />
                ))}
              </div>
              <p className="mt-4 text-xs text-warning">Largest gap: {model.skillTransfer.largestGap}</p>
            </Card>
          </div>

          <Card className="p-5">
            <div id="planner-v3-roadmap" className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">4. Career Transition Roadmap</p>
              <Badge variant="info">Expandable</Badge>
            </div>
            <div className="mt-4 space-y-3">
              {model.roadmap.phases.map((phase) => (
                <details key={phase.id} open={phase.expandedByDefault} className="rounded-lg border border-border-light bg-bg-secondary p-4">
                  <summary className="cursor-pointer text-sm font-semibold text-text-primary">{phase.title}</summary>
                  <p className="mt-2 text-sm text-text-secondary">{phase.summary}</p>
                  <div className="mt-3 grid gap-4 lg:grid-cols-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">Detailed actions</p>
                      <ul className="mt-2 space-y-1.5 text-sm text-text-secondary">
                        {phase.actions.map((item) => (
                          <li key={`${phase.id}-${item}`} className="break-words">
                            - {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">Resources</p>
                      <ul className="mt-2 space-y-1.5 text-sm text-text-secondary">
                        {phase.resources.map((item) => (
                          <li key={`${phase.id}-resource-${item.label}`} className="break-words">- {item.label}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">Links</p>
                      <ul className="mt-2 space-y-1.5 text-sm text-accent">
                        {phase.links.map((item) => (
                          <li key={`${phase.id}-link-${item.url}`} className="break-words">
                            <a href={item.url} target="_blank" rel="noreferrer" className="hover:text-accent-hover">
                              {item.label}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </details>
              ))}
            </div>
          </Card>

          {isGuestPreview ? (
            <Card className="border border-warning/25 bg-warning-light p-5">
              <p className="text-xs font-semibold uppercase tracking-[1.1px] text-warning">Preview Limit</p>
              <p className="mt-2 text-sm text-text-secondary">
                Sections after <span className="font-semibold text-text-primary">4. Roadmap and Milestone Tracking</span> are locked on guest preview.
              </p>
              <p className="mt-2 text-sm text-text-secondary">
                Sign in to unlock Fastest Path, Training, Market Snapshot, Outreach Toolkit, Reality Check, Action Checklist, Alternative Paths, Sticky Action Panel, FAQ, and Related Tools.
              </p>
              <a
                href="/login"
                className="mt-4 inline-flex rounded-lg border border-accent/20 bg-accent-light px-4 py-2 text-sm font-semibold text-accent hover:text-accent-hover"
              >
                Sign In to Unlock Full Report
              </a>
            </Card>
          ) : (
            <>
              <Card className="p-5">
                <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">5. Fastest Path Strategy</p>
                <div className="mt-4 space-y-3">
                  {model.fastestPath.steps.map((step) => (
                    <div key={`${step.label}-${step.detail}`} className="rounded-lg border border-border-light bg-bg-secondary p-3">
                      <p className="text-sm font-semibold text-text-primary">{step.label}</p>
                      <p className="mt-1 text-sm text-text-secondary">{step.detail}</p>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-5">
                <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">6. Training & Certifications</p>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {model.training.courses.map((course) => (
                    <div key={`${course.name}-${course.provider}`} className="rounded-lg border border-border-light bg-bg-secondary p-4">
                      <p className="text-sm font-semibold text-text-primary">{course.name}</p>
                      <p className="mt-1 text-sm text-text-secondary">{course.provider}</p>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-text-tertiary">
                        <span className="rounded-pill border border-border px-2 py-1">{course.length}</span>
                        <span className="rounded-pill border border-border px-2 py-1">{course.cost}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-5">
                <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">7. Job Market Snapshot</p>
                <div className="mt-4 grid gap-3 md:grid-cols-5">
                  {[
                    { label: 'Average Entry Wage', metric: model.marketSnapshot.entryWage },
                    { label: 'Mid Career Salary', metric: model.marketSnapshot.midCareerSalary },
                    { label: 'Top Earners', metric: model.marketSnapshot.topEarners },
                    { label: 'Local Demand', metric: model.marketSnapshot.localDemand },
                    { label: 'Typical Hiring Requirements', metric: model.marketSnapshot.hiringRequirements }
                  ].map((item) => {
                    return (
                      <div key={item.label} className="rounded-lg border border-border-light bg-bg-secondary p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[1.1px] text-text-tertiary">{item.label}</p>
                        <p className="mt-2 text-sm font-semibold text-text-primary break-words">{item.metric.value}</p>
                        <div className="mt-2">
                          <FallbackTag value={item.metric} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Card>

              <Card className="p-5">
                <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">8. Employer Outreach Toolkit</p>
                <p className="mt-2 text-sm text-text-secondary">{model.outreach.intro}</p>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="rounded-lg border border-border-light bg-bg-secondary p-4">
                    <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">Resume prompt</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-text-secondary">{resumeToolkitDraft || 'No prompt generated yet.'}</p>
                  </div>
                  <div className="rounded-lg border border-border-light bg-bg-secondary p-4">
                    <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">Email template</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-text-secondary">{emailToolkitDraft || 'No email generated yet.'}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" onClick={onCopyEmail}>Copy Email</Button>
                  <Button size="sm" variant="outline" onClick={onCopyResumePrompt}>Copy Resume Prompt</Button>
                  <Button size="sm" variant="ghost" onClick={onDownloadTemplate}>Download Template</Button>
                </div>
              </Card>

              <Card className="border border-warning/25 bg-warning-light p-5">
                <p className="text-xs font-semibold uppercase tracking-[1.1px] text-warning">9. Reality Check</p>
                <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                  {[
                    { label: 'Applications needed', metric: model.realityCheck.applicationsNeeded },
                    { label: 'Time to first offer', metric: model.realityCheck.timeToOffer },
                    { label: 'Competition level', metric: model.realityCheck.competitionLevel },
                    { label: 'Financial tradeoff', metric: model.realityCheck.financialTradeoff }
                  ].map((item) => {
                    return (
                      <div key={item.label} className="rounded-lg border border-warning/25 bg-surface p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[1.1px] text-text-tertiary">{item.label}</p>
                        <p className="mt-2 text-sm text-text-secondary break-words">{item.metric.value}</p>
                        <div className="mt-2">
                          <FallbackTag value={item.metric} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Card>

              <Card className="p-5">
                <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">10. Action Checklist</p>
                <div className="mt-3 h-2 rounded-pill bg-bg-secondary">
                  <div className="h-2 rounded-pill bg-success" style={{ width: `${model.checklist.progressPercent}%` }} />
                </div>
                <p className="mt-2 text-xs text-text-tertiary">{model.checklist.progressPercent}% transition progress</p>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <ChecklistColumn title="Immediate" items={model.checklist.immediate} tone="success" />
                  <ChecklistColumn title="Short Term" items={model.checklist.shortTerm} tone="default" />
                  <ChecklistColumn title="Long Term" items={model.checklist.longTerm} tone="warning" />
                </div>
              </Card>

              <Card className="p-5">
                <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">11. Other Careers You Could Reach From Your Experience</p>
                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {model.alternatives.cards.map((item) => (
                    <button
                      key={item.occupationId}
                      type="button"
                      onClick={() => onSelectAlternativeRole(item.title)}
                      className="rounded-lg border border-border-light bg-bg-secondary p-4 text-left transition hover:border-accent/30"
                    >
                      <p className="text-sm font-semibold text-text-primary">{item.title}</p>
                      <p className="mt-2 text-xs text-text-tertiary">Difficulty: {item.difficulty}</p>
                      <p className="mt-1 text-xs text-text-tertiary">Timeline: {item.timeline}</p>
                      <p className="mt-1 text-xs text-text-tertiary break-words">Salary: {item.salary}</p>
                    </button>
                  ))}
                </div>
              </Card>

              <Card className="p-5">
                <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">13. Trust / FAQ</p>
                <FAQAccordion items={faqItems} className="mt-4" />
              </Card>

              <Card className="p-5">
                <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">14. Related Tools</p>
                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  {relatedTools.map((tool) => (
                    <ToolCard key={tool.slug} {...tool} />
                  ))}
                </div>
              </Card>
            </>
          )}
        </div>

        {!isGuestPreview ? (
          <div className="space-y-4 xl:sticky xl:top-4 xl:self-start">
          <Card className="p-5">
            <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">Insights</p>
            <div className="mt-3 rounded-lg border border-border-light bg-bg-secondary p-3">
              <p className="text-sm font-semibold text-text-primary">Welcome Back</p>
              <p className="mt-2 text-sm text-text-secondary">
                Your transition progress improved to {model.checklist.progressPercent}% this cycle.
              </p>
              <p className="mt-2 text-sm text-text-secondary">Recommended action: {model.stickyPanel.nextBestAction}</p>
            </div>
          </Card>

          <Card className="p-5">
            <p id="planner-v3-sticky-panel" className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">12. Sticky Action Panel</p>
            <p className="mt-2 text-xs text-text-tertiary">Your Transition</p>
            <p className="mt-1 text-lg font-bold text-text-primary">{model.stickyPanel.transition}</p>
            <p className="mt-2 text-sm text-text-secondary">Difficulty: {model.stickyPanel.difficulty}</p>
            <p className="text-sm text-text-secondary">Timeline: {model.stickyPanel.timeline}</p>

            <div className="mt-4 rounded-lg border border-accent/20 bg-accent-light p-3">
              <p className="text-xs font-semibold uppercase tracking-[1.1px] text-accent">Progress to first offer</p>
              <div className="mt-2 h-2 rounded-pill bg-surface">
                <div className="h-2 rounded-pill bg-accent" style={{ width: `${model.stickyPanel.progressToOffer}%` }} />
              </div>
              <p className="mt-2 text-xs text-accent">{model.stickyPanel.progressToOffer}% complete</p>
            </div>

            <div className="mt-3 rounded-lg border border-success/20 bg-success/10 p-3">
              <p className="text-xs font-semibold uppercase tracking-[1.1px] text-success">Next best action</p>
              <p className="mt-1 text-sm text-text-secondary">{model.stickyPanel.nextBestAction}</p>
            </div>

            <div className="mt-3 rounded-lg border border-border-light bg-bg-secondary p-3">
              <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">Next steps</p>
              <ul className="mt-2 space-y-1.5 text-sm text-text-secondary">
                {model.stickyPanel.nextSteps.map((item) => (
                  <li key={`sticky-step-${item}`} className="break-words">[ ] {item}</li>
                ))}
              </ul>
            </div>

            <div className="mt-4 flex flex-col gap-2">
              <Button size="sm" onClick={onExportPlan}>Export Plan</Button>
              <Button size="sm" variant="secondary" onClick={onDownloadPdf}>Download PDF</Button>
              <Button size="sm" variant="outline" onClick={onSavePlan}>Save Plan</Button>
            </div>
          </Card>

          {model.missingFields.length > 0 ? (
            <Card className="border border-warning/25 bg-warning-light p-4">
              <p className="text-xs font-semibold uppercase tracking-[1.1px] text-warning">Fallback diagnostics</p>
              <p className="mt-2 text-xs text-text-secondary break-words">
                missing_v3_fields: [{model.missingFields.join(', ')}]
              </p>
            </Card>
          ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default PlannerDashboardV3
