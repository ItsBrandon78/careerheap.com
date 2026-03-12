'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Badge from '@/components/Badge';
import Button from '@/components/Button';
import Card from '@/components/Card';
import FAQAccordion from '@/components/FAQAccordion';
import ToolCard from '@/components/ToolCard';
import { ToolGlyph } from '@/components/Icons';
import type {
  DashboardFallbackValue,
  PlannerDashboardRoadmapPhase,
  PlannerDashboardTask,
  PlannerDashboardV3Model,
  PlannerTaskCategory,
} from '@/lib/planner/v3Dashboard';

interface RelatedTool {
  slug: string;
  title: string;
  description: string;
  icon: 'resume' | 'interview' | 'cover' | 'job' | 'planner';
  isActive?: boolean;
}

export function SectionCard({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <Card className={`!rounded-2xl !border-border-light p-6 shadow-card ${className}`}>{children}</Card>;
}

export function FallbackTag({ value }: { value: DashboardFallbackValue<string> }) {
  if (!value.badge) return null;
  const variant =
    value.badge === 'Needs data' ? 'warning' : value.badge === 'Estimate' ? 'info' : 'default';
  return <Badge variant={variant}>{value.badge}</Badge>;
}

function shortenMarketCardValue(label: string, value: string) {
  if (label === 'Local Demand') {
    const cleaned = value.trim();
    const postingsMatch = cleaned.match(/based on\s+(\d+)\s+recent postings/i);
    if (postingsMatch) return `${postingsMatch[1]} postings`;
    return cleaned.length > 24 ? `${cleaned.split(/\s+/).slice(0, 3).join(' ')}...` : cleaned;
  }

  if (label !== 'Typical Hiring Requirements') return value;
  const cleaned = value.trim();
  if (cleaned.length <= 42) return cleaned;

  const recurringMatch = cleaned.match(/^(.+?)\s+recur(?:s)? most often\.?$/i);
  if (recurringMatch) {
    const core = recurringMatch[1].trim();
    if (/\blicens/i.test(core) && /\bcert/i.test(core)) return 'Licensing + certification';
    if (/\bsafety/i.test(core)) return 'Safety requirements';
    if (/\bexperience/i.test(core)) return 'Experience requirements';
    const shortenedCore = core.split(/\s+/).slice(0, 4).join(' ');
    return `${shortenedCore}...`;
  }

  const mostCommonMatch = cleaned.match(/^Most common signal:\s+(.+?)\.?$/i);
  if (mostCommonMatch) {
    const core = mostCommonMatch[1].trim();
    if (/\blicens/i.test(core) && /\bcert/i.test(core)) return 'Licensing + certification';
    if (/\bsafety/i.test(core)) return 'Safety requirements';
    if (/\bexperience/i.test(core)) return 'Experience requirements';
    const shortenedCore = core.split(/\s+/).slice(0, 4).join(' ');
    return `${shortenedCore}...`;
  }

  if (/\blicens/i.test(cleaned) && /\bcert/i.test(cleaned)) return 'Licensing + certification';
  if (/\bsafety/i.test(cleaned)) return 'Safety requirements';
  if (/\bexperience/i.test(cleaned)) return 'Experience requirements';

  const words = cleaned.split(/\s+/);
  const shortened = words.slice(0, 4).join(' ');
  return `${shortened}...`;
}

export function TopSummaryStrip({
  planScore,
  welcomeLine,
  recommendedAction,
  confidenceTrend,
  lastTaskDeltaLabel,
  dataFreshness,
}: {
  planScore: string;
  welcomeLine: string;
  recommendedAction: string;
  confidenceTrend: string;
  lastTaskDeltaLabel: string | null;
  dataFreshness: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface px-[14px] py-3 shadow-card">
      <div className="grid gap-[10px] md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.7fr)_minmax(0,0.9fr)_minmax(0,0.9fr)]">
        <div className="min-w-0">
          <p className="text-[11px] font-bold tracking-[0.2px] text-text-tertiary">Plan Score</p>
          <p className="mt-1 break-words text-sm font-bold text-text-primary">{planScore}</p>
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-bold tracking-[0.2px] text-text-tertiary">Welcome Back</p>
          <p className="mt-1 break-words text-sm font-bold text-text-primary">{welcomeLine}</p>
          <p className="mt-1 break-words text-[12px] font-medium text-text-secondary">
            Recommended action: {recommendedAction}
          </p>
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-bold tracking-[0.2px] text-text-tertiary">
            Confidence Trend (30D)
          </p>
          <p className="mt-1 break-words text-sm font-bold text-success">{confidenceTrend}</p>
          {lastTaskDeltaLabel ? (
            <p className="mt-1 text-[12px] font-medium text-text-secondary">{lastTaskDeltaLabel}</p>
          ) : null}
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-bold tracking-[0.2px] text-text-tertiary">Data Freshness</p>
          <p className="mt-1 text-sm font-bold text-accent">{dataFreshness}</p>
          <p className="mt-1 text-[12px] font-medium text-text-secondary">
            Province-aware signals refreshed for this plan.
          </p>
        </div>
      </div>
    </div>
  );
}

function tenScale(score: number) {
  return `${(Math.max(0, Math.min(100, score)) / 10).toFixed(1)} / 10`;
}

export function MeterRow({
  label,
  score,
  positive = false,
}: {
  label: string;
  score: number;
  positive?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 flex-1 break-words text-sm font-semibold leading-[1.35] text-text-primary">
          {label}
        </p>
        <p className="shrink-0 text-xs font-semibold text-text-secondary">{tenScale(score)}</p>
      </div>
      <div className={`h-2 rounded-pill ${positive ? 'bg-success/15' : 'bg-bg-secondary'}`}>
        <div
          className={`h-2 rounded-pill ${positive ? 'bg-success' : 'bg-accent'}`}
          style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
        />
      </div>
    </div>
  );
}

export function DifficultySection({ model }: { model: PlannerDashboardV3Model }) {
  return (
    <SectionCard className="bg-bg-secondary">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[12px] font-bold tracking-[0.4px] text-text-secondary">
          2. Weighted Difficulty Drivers
        </p>
        <Badge variant={model.difficultyBreakdown.sourceType === 'estimate' ? 'info' : 'default'}>
          {model.difficultyBreakdown.sourceType === 'estimate' ? 'Estimated mix' : 'Derived mix'}
        </Badge>
      </div>
      <div className="mt-4 space-y-3">
        {model.difficultyBreakdown.items.map((item, idx) => (
          <MeterRow
            key={`${item.label}-${idx}`}
            label={item.label}
            score={item.score}
            positive={item.label === 'Market Demand'}
          />
        ))}
      </div>
      <div className="mt-4 rounded-xl border border-border-light bg-surface p-3">
        <p className="text-[12px] font-bold tracking-[0.4px] text-accent">Driver Weight Summary</p>
        <div className="mt-2 space-y-1 text-xs font-semibold text-text-secondary">
          {model.difficultyBreakdown.driverImpactRows.map((row, idx) => (
            <p key={`${row.label}-${idx}`}>
              {row.label} ({row.weight}%) -&gt; {row.impactPoints >= 0 ? '+' : ''}
              {row.impactPoints} pts
            </p>
          ))}
        </div>
        <p className="mt-2 text-xs font-semibold text-accent">
          {model.difficultyBreakdown.sourceLabel}. Net confidence score: {model.hero.probability.value}.
        </p>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-warning/35 bg-warning-light p-3">
          <p className="text-[12px] font-bold tracking-[0.4px] text-warning">Primary Barrier</p>
          <p className="mt-1 text-sm text-text-secondary">{model.difficultyBreakdown.primaryBarrier}</p>
        </div>
        <div className="rounded-xl border border-success/30 bg-success/10 p-3">
          <p className="text-[12px] font-bold tracking-[0.4px] text-success">Core Advantage</p>
          <p className="mt-1 text-sm text-text-secondary">{model.difficultyBreakdown.coreAdvantage}</p>
        </div>
      </div>
    </SectionCard>
  );
}

export function SkillsEvidenceSection({ model }: { model: PlannerDashboardV3Model }) {
  return (
    <SectionCard className="bg-bg-secondary">
      <p className="text-[12px] font-bold tracking-[0.4px] text-text-secondary">
        3. Skills and Evidence Requirements
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-border-light bg-surface p-[14px]">
          <p className="text-base font-bold text-text-primary">Transferable Strengths</p>
          <div className="mt-3 space-y-2">
            {model.skillTransfer.transferable.map((item, idx) => (
              <MeterRow key={`${item.label}-${idx}`} label={item.label} score={item.progress} />
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-border-light bg-surface p-[14px]">
          <p className="text-base font-bold text-text-primary">Skills Required for Target Career</p>
          <div className="mt-3 space-y-2">
            {model.skillTransfer.required.map((item, idx) => (
              <MeterRow key={`${item.label}-${idx}`} label={item.label} score={item.progress} />
            ))}
          </div>
        </div>
      </div>
      <div className="mt-3 rounded-xl border border-accent/25 bg-accent-light px-[14px] py-3 text-[13px] font-bold text-accent">
        Largest gap and required evidence: {model.skillTransfer.largestGap}
      </div>
      <div className="mt-3 rounded-xl border border-border-light bg-surface p-3">
        <p className="text-[12px] font-bold tracking-[0.4px] text-accent">
          Evidence Required Before Applying
        </p>
        <ul className="mt-2 space-y-1.5 text-[12px] font-semibold leading-[1.7] text-text-secondary">
          {model.skillTransfer.evidenceRequired.map((item, index) => (
            <li key={`${item}-${index}`} className="break-words">
              {index + 1}) {item}
            </li>
          ))}
        </ul>
      </div>
    </SectionCard>
  );
}

export function buildTrainingCards(
  courses: PlannerDashboardV3Model['training']['courses']
) {
  const iconKinds = ['book-open', 'shield', 'badge-check'] as const;
  return courses.slice(0, 3).map((course, index) => ({
    ...course,
    id: course.id,
    costLabel: course.cost?.toLowerCase().includes('tuition') || index === 0 ? 'Tuition' : 'Cost',
    iconKind: iconKinds[index] ?? iconKinds[iconKinds.length - 1],
  }));
}

export const TASK_CATEGORY_META: Record<
  PlannerTaskCategory,
  {
    suggestion: string;
    chipClass: string;
    rowClass: string;
    checkboxClass: string;
  }
> = {
  now: {
    suggestion: 'Now',
    chipClass: 'border-accent/30 bg-accent-light text-accent',
    rowClass: 'border-accent/25 bg-accent-light/40',
    checkboxClass: 'border-accent/35 text-accent focus:ring-accent',
  },
  next: {
    suggestion: 'Next',
    chipClass: 'border-border bg-surface text-text-secondary',
    rowClass: 'border-border-light bg-surface',
    checkboxClass: 'border-border text-accent focus:ring-accent',
  },
  blocked: {
    suggestion: 'Needs attention',
    chipClass: 'border-error/30 bg-error-light text-error',
    rowClass: 'border-error/25 bg-error-light/60',
    checkboxClass: 'border-error/40 text-error focus:ring-error',
  },
};

export function taskChipLabel(task: PlannerDashboardTask) {
  return `${TASK_CATEGORY_META[task.category].suggestion} +${task.weight}%`;
}

export interface PhaseStateView {
  tasks: PlannerDashboardTask[];
  checkedCount: number;
  totalCount: number;
  completed: boolean;
  completionPercent: number;
  statusLabel: string;
  isExpanded: boolean;
}

export function RoadmapSection({
  roadmapPhases,
  phaseStats,
  checkedTaskIds,
  toggleRoadmapPhase,
  toggleChecklistTask,
  nowCompletion,
  nowTasks,
  nextCompletion,
  blockedTasks,
}: {
  roadmapPhases: PlannerDashboardRoadmapPhase[];
  phaseStats: Map<string, PhaseStateView>;
  checkedTaskIds: Record<string, boolean>;
  toggleRoadmapPhase: (phaseId: string) => void;
  toggleChecklistTask: (taskId: string) => void;
  nowCompletion: number;
  nowTasks: PlannerDashboardTask[];
  nextCompletion: number;
  blockedTasks: PlannerDashboardTask[];
}) {
  return (
    <SectionCard className="bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[12px] font-bold tracking-[0.4px] text-text-secondary">
          4. Roadmap and Milestone Tracking (Expandable)
        </p>
        <Badge variant="info">Contextual Detail</Badge>
      </div>
      <div className="mt-4 space-y-[10px]">
        {roadmapPhases.map((phase) => {
          const phaseState = phaseStats.get(phase.id);
          const isExpanded = phaseState?.isExpanded ?? false;
          const totalTasks = phaseState?.totalCount ?? 0;
          const checkedCount = phaseState?.checkedCount ?? 0;
          const statusLabel = phaseState?.statusLabel ?? 'Quick view';
          const tasks = phaseState?.tasks ?? [];

          return (
            <article
              key={phase.id}
              className={`rounded-xl border px-[14px] py-3 ${
                statusLabel === 'Done'
                  ? 'border-success/35 bg-success/10'
                  : statusLabel === 'In progress'
                    ? 'border-accent/35 bg-accent-light/30'
                    : 'border-accent/30 bg-accent-light/20'
              }`}
            >
              <button
                type="button"
                aria-expanded={isExpanded}
                onClick={() => toggleRoadmapPhase(phase.id)}
                className="flex w-full items-center justify-between gap-2 text-left"
              >
                <p className="text-[14px] font-bold text-accent">{phase.title}</p>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-pill border px-2 py-0.5 text-[10px] font-bold ${
                      statusLabel === 'Done'
                        ? 'border-success/25 bg-success/10 text-success'
                        : statusLabel === 'In progress'
                          ? 'border-accent/25 bg-accent-light text-accent'
                          : 'border-border bg-surface text-text-secondary'
                    }`}
                  >
                    {statusLabel} Â· {checkedCount}/{totalTasks}
                  </span>
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-pill border border-accent/25 bg-accent-light text-[10px] font-bold text-accent">
                    {isExpanded ? '^' : 'v'}
                  </span>
                </div>
              </button>
              <p className="mt-2 text-[13px] font-semibold text-text-secondary">
                {isExpanded
                  ? totalTasks > 0
                    ? `${checkedCount} of ${totalTasks} weighted checkpoints complete. Finish this phase to auto-collapse it into Done.`
                    : phase.summary
                  : `${phase.summary}${statusLabel === 'Done' ? ' Reopen any time.' : ''}`}
              </p>
              <p className="mt-2 text-[12px] font-semibold text-text-tertiary">Outcome: {phase.outcome}</p>
              {isExpanded ? (
                <div className="mt-4 space-y-3">
                  <div className="space-y-2">
                    {tasks.map((task) => {
                      const checked = Boolean(checkedTaskIds[task.id]);
                      const meta = TASK_CATEGORY_META[task.category];

                      return (
                        <div
                          key={task.id}
                          className={`flex items-center justify-between gap-3 rounded-xl border p-3 ${meta.rowClass}`}
                        >
                          <label className="flex min-w-0 cursor-pointer items-start gap-3">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleChecklistTask(task.id)}
                              className={`mt-0.5 h-4 w-4 rounded ${meta.checkboxClass}`}
                            />
                            <span
                              className={`text-[12px] font-semibold leading-[1.55] ${
                                checked ? 'text-text-tertiary line-through' : 'text-text-primary'
                              }`}
                            >
                              {task.label}
                            </span>
                          </label>
                          <span
                            className={`shrink-0 rounded-pill border px-2 py-0.5 text-[10px] font-bold ${meta.chipClass}`}
                          >
                            {taskChipLabel(task)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-xl border border-border-light bg-bg-secondary p-3">
                      <p className="text-[11px] font-bold uppercase tracking-[1.2px] text-text-tertiary">
                        Resources
                      </p>
                      <ul className="mt-2 space-y-1.5 text-[12px] font-semibold leading-[1.7] text-text-secondary">
                        {(phase.resources.length > 0 ? phase.resources : [{ label: 'CareerHeap guidance notes' }]).map(
                          (item, resourceIdx) => (
                            <li key={`${phase.id}-resource-${resourceIdx}-${item.label}`} className="break-words">
                              {item.label}
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                    <div className="rounded-xl border border-border-light bg-bg-secondary p-3">
                      <p className="text-[11px] font-bold uppercase tracking-[1.2px] text-text-tertiary">
                        Links
                      </p>
                      <ul className="mt-2 space-y-1.5 text-[12px] font-semibold leading-[1.7] text-accent">
                        {phase.links.map((item, linkIdx) => (
                          <li key={`${phase.id}-link-${linkIdx}-${item.url}`} className="break-words">
                            <a href={item.url} target="_blank" rel="noreferrer">
                              {item.label}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
      <p className="mt-4 text-[12px] font-semibold text-text-secondary">
        Check tasks here first. Completed phases collapse automatically and can always be reopened.
      </p>
      <div className="mt-3 grid gap-[10px] md:grid-cols-3">
        <div className="rounded-[10px] border border-accent/25 bg-accent-light p-[10px]">
          <p className="text-[12px] font-bold text-accent">Now</p>
          <p className="mt-1.5 text-[14px] font-bold text-text-primary">{nowCompletion}% weighted complete</p>
          <p className="mt-1 text-[11px] font-semibold leading-[1.6] text-text-secondary">
            {Math.max(0, nowTasks.filter((task) => !checkedTaskIds[task.id]).length)} task left before the
            current phase can close.
          </p>
        </div>
        <div className="rounded-[10px] border border-border-light bg-bg-secondary p-[10px]">
          <p className="text-[12px] font-bold text-text-primary">Next</p>
          <p className="mt-1.5 text-[14px] font-bold text-text-primary">
            {nextCompletion > 0 ? `${nextCompletion}% weighted complete` : 'Queued next'}
          </p>
          <p className="mt-1 text-[11px] font-semibold leading-[1.6] text-text-secondary">
            Job Search opens once the training checkpoint and seat timing are locked.
          </p>
        </div>
        <div className="rounded-[10px] border border-error/25 bg-error-light p-[10px]">
          <p className="text-[12px] font-bold text-error">Needs attention</p>
          <p className="mt-1.5 text-[14px] font-bold text-error">
            {blockedTasks.filter((task) => !checkedTaskIds[task.id]).length} risk to clear
          </p>
          <p className="mt-1 text-[11px] font-semibold leading-[1.6] text-error">
            {blockedTasks.find((task) => !checkedTaskIds[task.id])?.label ||
              'No active attention items in this plan.'}
          </p>
        </div>
      </div>
    </SectionCard>
  );
}

export function FastestPathSection({
  model,
  primaryScenarioTitle,
  primaryScenarioSteps,
  secondaryScenarioTitle,
  secondaryScenarioSteps,
}: {
  model: PlannerDashboardV3Model;
  primaryScenarioTitle: string;
  primaryScenarioSteps: PlannerDashboardV3Model['fastestPath']['steps'];
  secondaryScenarioTitle: string;
  secondaryScenarioSteps: PlannerDashboardV3Model['fastestPath']['steps'];
}) {
  return (
    <SectionCard className="bg-surface">
      <p className="text-[12px] font-bold tracking-[0.4px] text-text-secondary">
        5. Fastest Path with Risk Controls
      </p>
      <p className="mt-2 text-[18px] font-bold text-text-primary">
        Shortest realistic route to first field entry
      </p>
      {model.fastestPath.tradeFacts.length > 0 ? (
        <div className="mt-3 grid gap-2 md:grid-cols-4">
          {model.fastestPath.tradeFacts.map((fact) => (
            <div key={`${fact.label}-${fact.value}`} className="rounded-[10px] border border-border-light bg-bg-secondary p-3">
              <p className="text-[11px] font-bold uppercase tracking-[1px] text-text-tertiary">{fact.label}</p>
              <p className="mt-1 text-[13px] font-bold text-text-primary">{fact.value}</p>
            </div>
          ))}
        </div>
      ) : null}
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-[10px] border border-accent/25 bg-accent-light p-3">
          <p className="text-[12px] font-bold tracking-[0.4px] text-accent">{primaryScenarioTitle}</p>
          <div className="mt-2 space-y-2">
            {primaryScenarioSteps.map((step, idx) => (
              <div
                key={`primary-${idx}-${step.label}-${step.detail}`}
                className="rounded-[10px] border border-accent/20 bg-surface px-[14px] py-3"
              >
                <p className="text-[13px] font-bold text-accent">{step.label}</p>
                <p className="mt-1 text-[12px] font-semibold text-text-secondary">{step.detail}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-[10px] border border-border-light bg-bg-secondary p-3">
          <p className="text-[12px] font-bold tracking-[0.4px] text-text-secondary">
            {secondaryScenarioTitle}
          </p>
          <div className="mt-2 space-y-2">
            {secondaryScenarioSteps.map((step, idx) => (
              <div
                key={`secondary-${idx}-${step.label}-${step.detail}`}
                className="rounded-[10px] border border-border-light bg-surface px-[14px] py-3"
              >
                <p className="text-[13px] font-bold text-text-primary">{step.label}</p>
                <p className="mt-1 text-[12px] font-semibold text-text-secondary">{step.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-[10px] border border-warning/35 bg-warning-light p-3">
          <p className="text-[12px] font-bold tracking-[0.4px] text-warning">Risk Flags</p>
          <ul className="mt-2 space-y-1 text-[11px] font-semibold leading-[1.7] text-text-secondary">
            <li>- No interview replies after {model.realityCheck.applicationsNeeded.value} applications</li>
            <li>- Time-to-offer trending past {model.realityCheck.timeToOffer.value}</li>
            <li>- Competition pressure: {model.realityCheck.competitionLevel.value}</li>
          </ul>
        </div>
        <div className="rounded-[10px] border border-success/30 bg-success/10 p-3">
          <p className="text-[12px] font-bold tracking-[0.4px] text-success">Fallback Branch</p>
          <p className="mt-2 text-[11px] font-semibold leading-[1.7] text-success">
            {model.fastestPath.strongestPath[0]?.detail ||
              'If delayed at Month 2, shift to helper roles while finishing certs.'}
          </p>
        </div>
      </div>
    </SectionCard>
  );
}

export function GuestPreviewLimitSection() {
  return (
    <SectionCard className="border-warning/25 bg-warning-light">
      <p className="text-xs font-semibold uppercase tracking-[1.1px] text-warning">Preview Limit</p>
      <p className="mt-2 text-sm text-text-secondary">
        Sections after{' '}
        <span className="font-semibold text-text-primary">
          4. Roadmap and Milestone Tracking (Expandable)
        </span>{' '}
        are locked on guest preview.
      </p>
      <p className="mt-2 text-sm text-text-secondary">
        Sign in to unlock Fastest Path, Training, Market Snapshot, Outreach Toolkit, Reality Check,
        Weekly Sprint Checklist, Alternative Paths, Action Panel, FAQ, and Related Tools.
      </p>
      <Link
        href="/login"
        className="mt-4 inline-flex rounded-xl border border-accent/20 bg-accent-light px-4 py-2 text-sm font-semibold text-accent"
      >
        Sign In to Unlock Full Report
      </Link>
    </SectionCard>
  );
}

export function AiSignalCard({ model }: { model: PlannerDashboardV3Model }) {
  return (
    <SectionCard className="!rounded-xl !p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-bold tracking-[0.4px] text-accent">AI Signal</p>
        <span className="rounded-pill border border-accent/20 bg-accent-light px-2 py-0.5 text-[10px] font-semibold text-accent">
          Supportive
        </span>
      </div>
      <p className="mt-2 text-[12px] font-medium leading-[1.55] text-text-secondary">
        {model.insights.aiInsight.summary}
      </p>
      <div className="mt-3 rounded-[10px] border border-border-light bg-bg-secondary p-[10px]">
        <p className="text-[12px] font-bold text-text-tertiary">Trend</p>
        <div className="mt-2 flex h-9 items-end gap-1">
          {model.insights.aiInsight.bars.map((h, idx) => (
            <div
              key={`${idx}`}
              className="w-3 rounded-sm bg-accent"
              style={{ height: `${Math.max(8, Math.min(36, h))}px`, opacity: 0.45 + idx * 0.09 }}
            />
          ))}
        </div>
        <p className="mt-2 text-[11px] font-bold text-accent">
          +{model.insights.aiInsight.trendEndPercent - model.insights.aiInsight.trendStartPercent}% in 30
          days
        </p>
      </div>
    </SectionCard>
  );
}

export function TrainingSection({
  model,
  trainingCards,
  completedTrainingIds,
  onToggleTrainingCard,
}: {
  model: PlannerDashboardV3Model;
  trainingCards: ReturnType<typeof buildTrainingCards>;
  completedTrainingIds: Record<string, boolean>;
  onToggleTrainingCard: (trainingId: string) => void;
}) {
  return (
    <SectionCard className="bg-surface">
      <p className="text-[12px] font-bold tracking-[0.4px] text-text-secondary">
        6. Training Options and Cost Stack
      </p>
      <p className="mt-2 text-[12px] font-medium text-text-secondary">
        Click a certification card once you&apos;ve earned it.
      </p>
      {model.training.tradeFacts.length > 0 ? (
        <div className="mt-3 grid gap-2 md:grid-cols-4">
          {model.training.tradeFacts.map((fact) => (
            <div key={`${fact.label}-${fact.value}`} className="rounded-[10px] border border-border-light bg-bg-secondary p-3">
              <p className="text-[11px] font-bold uppercase tracking-[1px] text-text-tertiary">{fact.label}</p>
              <p className="mt-1 text-[13px] font-bold text-text-primary">{fact.value}</p>
            </div>
          ))}
        </div>
      ) : null}
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {trainingCards.map((card, idx) => (
          <button
            key={`${card.name}-${card.provider}-${idx}`}
            type="button"
            onClick={() => onToggleTrainingCard(card.id)}
            aria-pressed={Boolean(completedTrainingIds[card.id])}
            className={`rounded-xl border p-[14px] text-left transition-colors ${
              completedTrainingIds[card.id]
                ? 'border-success/35 bg-success/10'
                : 'border-border-light bg-surface hover:border-accent/30 hover:bg-accent-light/20'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="inline-flex h-5 w-5 items-center justify-center text-accent">
                <ToolGlyph kind={card.iconKind} className="h-[18px] w-[18px]" />
              </div>
              {completedTrainingIds[card.id] ? (
                <span className="rounded-pill border border-success/35 bg-success/10 px-2 py-0.5 text-[10px] font-bold text-success">
                  Completed
                </span>
              ) : null}
            </div>
            <p className="mt-3 text-[14px] font-bold text-text-primary">{card.name}</p>
            <div className="mt-2 space-y-1 text-[12px] font-semibold leading-[1.7] text-text-secondary">
              <p>Provider: {card.provider}</p>
              {card.modality ? <p>Modality: {card.modality}</p> : null}
              {card.cost ? (
                <p>
                  {card.costLabel}: {card.cost}
                </p>
              ) : null}
              {card.length ? <p>Length: {card.length}</p> : null}
              {card.aid ? <p>Funding note: {card.aid}</p> : null}
              <p className="pt-1 text-[11px] text-text-tertiary">
                Source: {card.sourceLabel}
                {card.sourceType === 'estimate' ? ' (estimate)' : ''}
              </p>
            </div>
          </button>
        ))}
      </div>
      <div className="mt-4 rounded-[10px] border border-border-light bg-bg-secondary p-3">
        <p className="text-[12px] font-bold tracking-[0.4px] text-text-primary">Transition Cost Stack</p>
        <div className="mt-2 space-y-1 text-[11px] font-semibold leading-[1.7] text-text-secondary">
          {model.training.costStack.map((item) => (
            <p key={item.label}>
              {item.label}: {item.value}
              {item.badge ? ` (${item.badge.toLowerCase()})` : ''}
            </p>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}

export function MarketSnapshotSection({
  model,
}: {
  model: PlannerDashboardV3Model;
}) {
  const [expandedRequirementText, setExpandedRequirementText] = useState<string | null>(null);
  const marketCards = useMemo(
    () => [
      { label: 'Average Entry Wage', metric: model.marketSnapshot.entryWage },
      { label: 'Mid Career Salary', metric: model.marketSnapshot.midCareerSalary },
      { label: 'Top Earners', metric: model.marketSnapshot.topEarners },
      { label: 'Local Demand', metric: model.marketSnapshot.localDemand },
      { label: 'Typical Hiring Requirements', metric: model.marketSnapshot.hiringRequirements },
    ],
    [model.marketSnapshot]
  );

  return (
    <SectionCard className="bg-surface">
      <p className="text-[12px] font-bold tracking-[0.4px] text-text-secondary">
        7. Local Market Data (Source Stamped)
      </p>
      <div className="mt-4 grid gap-[10px] md:grid-cols-5">
        {marketCards.map((item, idx) => {
          const shortenedValue = shortenMarketCardValue(item.label, item.metric.value);
          const canExpand =
            item.label === 'Typical Hiring Requirements' && shortenedValue !== item.metric.value.trim();

          return (
          <div
            key={`${item.label}-${idx}`}
            className="rounded-[10px] border border-border-light bg-bg-secondary p-3"
          >
            <p className="min-h-[28px] text-[11px] font-bold uppercase tracking-[1.1px] text-text-tertiary">
              {item.label}
            </p>
            <div className="mt-1">
              {canExpand ? (
                <button
                  type="button"
                  title={item.metric.value}
                  aria-expanded={expandedRequirementText === item.metric.value}
                  aria-label={`Show full ${item.label.toLowerCase()} detail`}
                  onClick={() =>
                    setExpandedRequirementText((previous) =>
                      previous === item.metric.value ? null : item.metric.value
                    )
                  }
                  className={`w-full text-left break-words font-bold ${
                    item.label === 'Local Demand' || item.label === 'Typical Hiring Requirements'
                      ? 'text-[18px] leading-[1.1]'
                      : 'text-[21px] leading-[1.15]'
                  } ${
                    item.label === 'Local Demand' ? 'text-success' : 'text-text-primary'
                  }`}
                >
                  {shortenedValue}
                </button>
              ) : (
                <p
                  title={item.metric.value}
                  className={`break-words font-bold ${
                  item.label === 'Local Demand' || item.label === 'Typical Hiring Requirements'
                    ? 'text-[18px] leading-[1.1]'
                    : 'text-[21px] leading-[1.15]'
                } ${
                  item.label === 'Local Demand' ? 'text-success' : 'text-text-primary'
                }`}
                >
                  {shortenedValue}
                </p>
              )}
            </div>
            <div className="mt-2">
              <FallbackTag value={item.metric} />
            </div>
          </div>
          );
        })}
      </div>
      {expandedRequirementText ? (
        <div className="mt-3 rounded-[10px] border border-border-light bg-bg-secondary p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[1.1px] text-text-tertiary">
                Typical Hiring Requirements
              </p>
              <p className="mt-1 text-[13px] font-semibold leading-[1.65] text-text-primary">
                {expandedRequirementText}
              </p>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => setExpandedRequirementText(null)}>
              Close
            </Button>
          </div>
        </div>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="rounded-pill border border-accent/20 bg-accent-light px-[10px] py-1 text-[11px] font-bold text-accent">
          Wages: {model.marketSnapshot.wageSourceLabel}
        </span>
        <span className="rounded-pill border border-border px-[10px] py-1 text-[11px] font-bold text-text-secondary">
          Demand: {model.marketSnapshot.demandSourceLabel}
        </span>
        <span className="rounded-pill border border-border px-[10px] py-1 text-[11px] font-bold text-text-secondary">
          {model.summaryStrip.dataFreshness}
        </span>
      </div>
    </SectionCard>
  );
}

export function OutreachSection({
  readinessChecks,
  outreachTracker,
  suggestedOutreachTarget,
  resumeToolkitDraft,
  emailToolkitDraft,
  callToolkitDraft,
  onOutreachTrackerChange,
  onResumeToolkitDraftChange,
  onEmailToolkitDraftChange,
  onCallToolkitDraftChange,
}: {
  readinessChecks: Array<{ label: string; complete: boolean; helper: string }>;
  outreachTracker: {
    sent: string;
    replies: string;
    positiveReplies: string;
    nextFollowUpDate: string;
  };
  suggestedOutreachTarget: string;
  onOutreachTrackerChange: (
    key: 'sent' | 'replies' | 'positiveReplies' | 'nextFollowUpDate',
    value: string
  ) => void;
  resumeToolkitDraft: string;
  emailToolkitDraft: string;
  callToolkitDraft: string;
  onResumeToolkitDraftChange: (value: string) => void;
  onEmailToolkitDraftChange: (value: string) => void;
  onCallToolkitDraftChange: (value: string) => void;
}) {
  const numericStepperButtonClass =
    'inline-flex h-7 w-7 items-center justify-center rounded-[8px] border border-border bg-surface text-[11px] font-bold text-text-secondary transition hover:border-accent hover:text-accent'
  const suggestedTargetCount = (() => {
    const match = suggestedOutreachTarget.match(/\b(\d+)\b/)
    return match ? Number.parseInt(match[1], 10) : 0
  })()
  const sentCount = Number.parseInt(outreachTracker.sent || '0', 10)
  const safeSentCount = Number.isFinite(sentCount) && sentCount >= 0 ? sentCount : 0
  const outreachProgressPercent =
    suggestedTargetCount > 0 ? Math.min(100, Math.round((safeSentCount / suggestedTargetCount) * 100)) : 0

  const renderStepper = (
    label: string,
    value: string,
    accentClass: string,
    onChange: (next: string) => void
  ) => {
    const numericValue = Number.parseInt(value || '0', 10)
    const safeValue = Number.isFinite(numericValue) && numericValue >= 0 ? numericValue : 0

    return (
      <div className="rounded-[12px] border border-border-light bg-surface p-3">
        <p className="text-[10px] font-bold uppercase tracking-[1.05px] text-text-tertiary">{label}</p>
        <div className="mt-2 flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <div
              className={`flex min-h-[52px] items-center rounded-[10px] border border-border bg-bg-secondary px-4 ${accentClass}`}
            >
              <span className="text-[28px] font-bold leading-none tabular-nums">{safeValue}</span>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <button
              type="button"
              aria-label={`Increase ${label.toLowerCase()}`}
              className={numericStepperButtonClass}
              onClick={() => onChange(String(safeValue + 1))}
            >
              ↑
            </button>
            <button
              type="button"
              aria-label={`Decrease ${label.toLowerCase()}`}
              className={numericStepperButtonClass}
              onClick={() => onChange(String(Math.max(0, safeValue - 1)))}
            >
              ↓
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <SectionCard className="bg-surface">
      <p className="text-[12px] font-bold tracking-[0.4px] text-text-secondary">
        8. Outreach Toolkit and CRM
      </p>
      <p className="mt-2 text-[13px] font-semibold text-text-secondary">
        Templates plus live outreach tracking for response and follow-up quality.
      </p>
      <div className="mt-4 rounded-xl border border-border-light bg-bg-secondary p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[12px] font-bold tracking-[0.4px] text-accent">Ready to Apply Gate</p>
          <span className="rounded-pill border border-accent/20 bg-accent-light px-[10px] py-1 text-[11px] font-bold text-accent">
            {readinessChecks.filter((item) => item.complete).length}/{readinessChecks.length} ready
          </span>
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          {readinessChecks.map((item) => (
            <div
              key={item.label}
              className={`rounded-[10px] border p-3 ${
                item.complete ? 'border-success/30 bg-success/10' : 'border-warning/30 bg-warning-light'
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex h-5 w-5 items-center justify-center rounded-pill text-[11px] font-bold ${
                    item.complete ? 'bg-success text-text-on-dark' : 'bg-warning text-text-primary'
                  }`}
                >
                  {item.complete ? 'OK' : '!'}
                </span>
                <p className="text-[12px] font-bold text-text-primary">{item.label}</p>
              </div>
              <p className="mt-2 text-[11px] font-semibold leading-[1.6] text-text-secondary">
                {item.helper}
              </p>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 rounded-xl border border-border-light bg-bg-secondary p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[12px] font-bold tracking-[0.4px] text-accent">Outreach CRM</p>
            <p className="mt-1 text-[11px] font-semibold text-text-secondary">
              Manual tracker for real outreach activity and follow-up timing.
            </p>
          </div>
          <span className="rounded-pill border border-accent/20 bg-accent-light px-[10px] py-1 text-[11px] font-bold text-accent">
            Suggested this phase: {suggestedOutreachTarget}
          </span>
        </div>
        <div className="mt-3 rounded-[12px] border border-border-light bg-surface p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[10px] font-bold uppercase tracking-[1.05px] text-text-tertiary">
              Outreach Progress
            </p>
            <p className="text-[11px] font-bold text-text-secondary">
              {safeSentCount}/{suggestedTargetCount || 0} sent
            </p>
          </div>
          <div className="mt-2 h-2 rounded-full bg-bg-secondary">
            <div
              className="h-2 rounded-full bg-accent transition-[width]"
              style={{ width: `${outreachProgressPercent}%` }}
            />
          </div>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-4">
          {renderStepper('Sent', outreachTracker.sent, 'text-text-primary', (next) =>
            onOutreachTrackerChange('sent', next)
          )}
          {renderStepper('Replies', outreachTracker.replies, 'text-text-primary', (next) =>
            onOutreachTrackerChange('replies', next)
          )}
          {renderStepper('Positive Replies', outreachTracker.positiveReplies, 'text-success', (next) =>
            onOutreachTrackerChange('positiveReplies', next)
          )}
          <div className="rounded-[12px] border border-border-light bg-surface p-3">
            <p className="text-[10px] font-bold uppercase tracking-[1.05px] text-text-tertiary">Next Follow-up</p>
            <input
              type="date"
              value={outreachTracker.nextFollowUpDate}
              onChange={(event) => onOutreachTrackerChange('nextFollowUpDate', event.target.value)}
              className="mt-2 min-h-[52px] w-full rounded-[10px] border border-border bg-bg-secondary px-3 py-2 text-sm font-bold text-accent outline-none transition focus:border-accent"
            />
          </div>
        </div>
        <p className="mt-3 text-[11px] font-semibold text-text-secondary">
          Track your real outreach here. The planner will not infer replies or positive response rates for you.
        </p>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-border-light bg-bg-secondary p-[14px]">
          <p className="text-[11px] font-bold uppercase tracking-[1.1px] text-text-tertiary">Resume Prompt</p>
          <textarea
            value={resumeToolkitDraft}
            onChange={(event) => onResumeToolkitDraftChange(event.target.value)}
            placeholder="No prompt generated yet."
            className="mt-2 min-h-[180px] w-full resize-y rounded-[10px] border border-border bg-surface px-3 py-2 text-sm leading-[1.6] text-text-secondary outline-none transition focus:border-accent"
          />
        </div>
        <div className="rounded-xl border border-border-light bg-bg-secondary p-[14px]">
          <p className="text-[11px] font-bold uppercase tracking-[1.1px] text-text-tertiary">Email Template</p>
          <textarea
            value={emailToolkitDraft}
            onChange={(event) => onEmailToolkitDraftChange(event.target.value)}
            placeholder="No email generated yet."
            className="mt-2 min-h-[180px] w-full resize-y rounded-[10px] border border-border bg-surface px-3 py-2 text-sm leading-[1.6] text-text-secondary outline-none transition focus:border-accent"
          />
        </div>
        <div className="rounded-xl border border-border-light bg-bg-secondary p-[14px]">
          <p className="text-[11px] font-bold uppercase tracking-[1.1px] text-text-tertiary">Call Script</p>
          <textarea
            value={callToolkitDraft}
            onChange={(event) => onCallToolkitDraftChange(event.target.value)}
            placeholder="No call script generated yet."
            className="mt-2 min-h-[180px] w-full resize-y rounded-[10px] border border-border bg-surface px-3 py-2 text-sm leading-[1.6] text-text-secondary outline-none transition focus:border-accent"
          />
        </div>
      </div>
    </SectionCard>
  );
}

export function RealityCheckSection({ model }: { model: PlannerDashboardV3Model }) {
  return (
    <SectionCard className="border-error/30 bg-surface">
      <p className="text-[12px] font-bold tracking-[0.4px] text-error">9. Reality Check</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {[ 
          { label: 'Typical applications to first offer', metric: model.realityCheck.applicationsNeeded },
          { label: 'Typical time to first offer', metric: model.realityCheck.timeToOffer },
          { label: 'Competition level', metric: model.realityCheck.competitionLevel },
          { label: 'Financial tradeoff window', metric: model.realityCheck.financialTradeoff },
        ].map((item, idx) => (
          <div
            key={`${item.label}-${idx}`}
            className="rounded-[10px] border border-error/25 bg-error-light p-3"
          >
            <p className="text-[12px] font-bold tracking-[0.4px] text-error">{item.label}</p>
            <p className="mt-2 break-words text-[22px] font-bold leading-[1.15] text-error">
              {item.metric.value}
            </p>
            {item.metric.sourceLabel ? (
              <p className="mt-2 text-[11px] font-semibold leading-[1.5] text-text-secondary">
                {item.metric.sourceLabel}
                {item.metric.badge ? ` (${item.metric.badge.toLowerCase()})` : ''}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

export function ProgressDashboardSection({
  model,
  nowCompletion,
  nowTasks,
  nextCompletion,
  nextTasks,
  blockedTasks,
  checkedTaskIds,
}: {
  model: PlannerDashboardV3Model;
  nowCompletion: number;
  nowTasks: PlannerDashboardTask[];
  nextCompletion: number;
  nextTasks: PlannerDashboardTask[];
  blockedTasks: PlannerDashboardTask[];
  checkedTaskIds: Record<string, boolean>;
}) {
  return (
    <SectionCard className="bg-bg-secondary">
      <p className="text-[12px] font-bold tracking-[0.4px] text-text-secondary">10. Progress Dashboard</p>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {[
          {
            title: 'Do this now',
            metric: `${nowCompletion}% weighted complete`,
            body:
              nowTasks.filter((task) => checkedTaskIds[task.id]).length > 0
                ? `${nowTasks.filter((task) => checkedTaskIds[task.id]).length} of ${nowTasks.length} high-value checkpoints are done.`
                : 'No high-value checkpoints completed yet.',
            nudge:
              nowTasks.find((task) => !checkedTaskIds[task.id])?.label ||
              'Current high-value work is complete.',
            accentClass: 'text-accent',
          },
          {
            title: 'Queue this next',
            metric: nextCompletion > 0 ? `${nextCompletion}% weighted complete` : 'Queued next',
            body:
              nextTasks.filter((task) => !checkedTaskIds[task.id]).length > 0
                ? 'Job Search remains queued behind the final training checkpoint.'
                : 'Next-stage checkpoints are now fully lined up.',
            nudge:
              nextTasks.find((task) => !checkedTaskIds[task.id])?.label ||
              'Next-stage work is already unblocked.',
            accentClass: 'text-text-primary',
          },
          {
            title: 'Hold for now',
            metric: `${blockedTasks.filter((task) => !checkedTaskIds[task.id]).length} risk to clear`,
            body:
              blockedTasks.find((task) => !checkedTaskIds[task.id])?.label ||
              'No active attention items remain in the current loop.',
            nudge:
              blockedTasks.find((task) => !checkedTaskIds[task.id])
                ? 'Clear this and the weighted score moves immediately.'
                : 'Risk is currently contained.',
            accentClass: 'text-error',
          },
        ].map((card) => (
          <div
            key={card.title}
            className="rounded-[10px] border border-border-light bg-surface p-3"
          >
            <p className="text-sm font-bold text-text-primary">{card.title}</p>
            <p className={`mt-2 text-base font-bold ${card.accentClass}`}>{card.metric}</p>
            <p className="mt-2 text-[12px] font-semibold leading-[1.6] text-text-secondary">
              {card.body}
            </p>
            <p className="mt-2 text-[11px] font-bold text-text-tertiary">Next nudge: {card.nudge}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {model.checklist.reminderBadges.map((badge, idx) => (
          <span
            key={`${badge}-${idx}`}
            className={`rounded-pill border px-[10px] py-1 text-[11px] font-bold ${
              idx === 0
                ? 'border-accent/20 bg-accent-light text-accent'
                : idx === 2
                  ? 'border-success/20 bg-success/10 text-success'
                  : 'border-border bg-surface text-text-secondary'
            }`}
          >
            {badge}
          </span>
        ))}
      </div>
    </SectionCard>
  );
}

export function AlternativesSection({
  model,
  onSelectAlternativeRole,
}: {
  model: PlannerDashboardV3Model;
  onSelectAlternativeRole: (title: string) => void;
}) {
  return (
    <SectionCard className="bg-bg-secondary">
      <p className="text-[12px] font-bold tracking-[0.4px] text-text-secondary">
        11. Alternative Career Paths
      </p>
      <p className="mt-2 text-[12px] font-semibold text-text-secondary">
        Selecting a path regenerates this planner for that role.
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {model.alternatives.cards.slice(0, 3).map((item, idx) => (
          <button
            key={`${item.occupationId}-${idx}`}
            type="button"
            onClick={() => onSelectAlternativeRole(item.title)}
            className={`rounded-[10px] border p-3 text-left transition ${
              idx === 0 ? 'border-accent/30 bg-accent-light' : 'border-border-light bg-surface hover:border-accent/30'
            }`}
          >
            <p className="mt-2 text-[14px] font-bold text-text-primary">{item.title}</p>
            <p className="mt-2 text-[11px] font-semibold text-text-tertiary">Difficulty: {item.difficulty}</p>
            <p className="mt-1 text-[11px] font-semibold text-text-tertiary">Timeline: {item.timeline}</p>
            <p className="mt-1 break-words text-[11px] font-semibold text-text-tertiary">
              Salary: {item.salary.value}
            </p>
            <p className="mt-2 text-[11px] font-semibold leading-[1.6] text-text-secondary">
              {item.reason}
            </p>
            <p className="mt-3 text-[11px] font-bold text-accent">Generate this path</p>
          </button>
        ))}
      </div>
    </SectionCard>
  );
}

export function TrustFaqSection({
  faqItems,
  methodology,
}: {
  faqItems: Array<{ question: string; answer: string }>;
  methodology: PlannerDashboardV3Model['methodology'];
}) {
  return (
    <SectionCard className="bg-surface">
      <p className="text-[12px] font-bold tracking-[0.4px] text-text-secondary">
        13. Trust, Methodology and FAQ
      </p>
      <div className="mt-4 rounded-xl border border-border-light bg-bg-secondary p-3">
        <p className="text-[12px] font-bold tracking-[0.4px] text-accent">How This Score Is Computed</p>
        <p className="mt-1 text-[11px] font-semibold leading-[1.7] text-text-secondary">
          {methodology.scoreSummary}
        </p>
        <div className="mt-2 space-y-1">
          {methodology.sourceLines.map((line) => (
            <p key={line} className="text-[11px] font-bold text-text-secondary">
              {line}
            </p>
          ))}
        </div>
      </div>
      <FAQAccordion items={faqItems} className="mt-4" />
    </SectionCard>
  );
}

export function RelatedToolsSection({
  relatedTools,
}: {
  relatedTools: RelatedTool[];
}) {
  return (
    <SectionCard className="bg-bg-secondary">
      <p className="text-[12px] font-bold tracking-[0.4px] text-text-secondary">14. Related Tools</p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="rounded-pill border border-accent/20 bg-accent-light px-[10px] py-1 text-[11px] font-bold text-accent">
          Resume Analyzer
        </span>
        <span className="text-[12px] font-bold text-text-tertiary">-&gt;</span>
        <span className="rounded-pill border border-accent/20 bg-accent-light px-[10px] py-1 text-[11px] font-bold text-accent">
          Outreach Toolkit
        </span>
        <span className="text-[12px] font-bold text-text-tertiary">-&gt;</span>
        <span className="rounded-pill border border-accent/20 bg-accent-light px-[10px] py-1 text-[11px] font-bold text-accent">
          Interview Prep
        </span>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {relatedTools.map((tool) => (
          <ToolCard key={tool.slug} {...tool} />
        ))}
      </div>
    </SectionCard>
  );
}

export function StickyExecutionPanel({
  model,
  liveProgressToOffer,
  lastTaskDeltaLabel,
  nextBestAction,
  stickyNextSteps,
  savePlanLabel,
  onRegenerate,
  onEditInputs,
  onStartNewPlan,
  onExportPlan,
  onDownloadPdf,
  onSavePlan,
}: {
  model: PlannerDashboardV3Model;
  liveProgressToOffer: number;
  lastTaskDeltaLabel: string | null;
  nextBestAction: string;
  stickyNextSteps: string[];
  savePlanLabel: string;
  onRegenerate: () => void;
  onEditInputs: () => void;
  onStartNewPlan: () => void;
  onExportPlan: () => void;
  onDownloadPdf: () => void;
  onSavePlan: () => void;
}) {
  return (
    <SectionCard className="!rounded-2xl !p-[18px]">
      <p id="planner-v3-sticky-panel" className="text-[11px] font-bold tracking-[0.4px] text-text-secondary">
        Execution
      </p>
      <p className="mt-2 text-[12px] font-bold text-text-tertiary">Return Loop</p>
      <p className="mt-1 text-base font-bold leading-[1.35] text-text-primary">{model.stickyPanel.transition}</p>
      <p className="mt-2 text-[13px] font-semibold text-text-secondary">
        Difficulty: {model.stickyPanel.difficulty}
      </p>
      <p className="text-[13px] font-semibold text-text-secondary">Timeline: {model.stickyPanel.timeline}</p>
      <div className="mt-3 rounded-[10px] border border-accent/25 bg-accent-light p-[10px]">
        <p className="text-[12px] font-bold tracking-[0.4px] text-accent">Progress to First Offer</p>
        <div className="mt-2 h-2 rounded-pill bg-surface">
          <div className="h-2 rounded-pill bg-accent" style={{ width: `${liveProgressToOffer}%` }} />
        </div>
        <p className="mt-2 text-[11px] font-bold text-accent">
          {liveProgressToOffer}% complete. {lastTaskDeltaLabel ?? 'Weighted checklist progress updates instantly.'}
        </p>
      </div>
      <div className="mt-3 rounded-[10px] border border-success/20 bg-success/10 p-[10px]">
        <p className="text-[12px] font-bold tracking-[0.4px] text-success">Next Best Action</p>
        <p className="mt-1 text-[11px] font-semibold text-success">{nextBestAction}</p>
      </div>
      <div className="mt-3 rounded-[10px] border border-border-light bg-bg-secondary p-[10px]">
        <p className="text-[13px] font-bold text-text-primary">Next Steps</p>
        <ul className="mt-2 space-y-1.5 text-[12px] font-semibold leading-[1.7] text-text-secondary">
          {stickyNextSteps.map((item, idx) => (
            <li key={`${item}-${idx}`}>[ ] {item}</li>
          ))}
        </ul>
      </div>
      <div className="mt-4 rounded-[10px] border border-border-light bg-bg-secondary p-3">
        <p className="text-[11px] font-bold tracking-[0.4px] text-text-tertiary">Plan Controls</p>
        <div className="mt-2 space-y-2">
          <Button size="sm" className="w-full" onClick={onRegenerate}>
            Regenerate with Changes
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button size="sm" variant="outline" onClick={onEditInputs}>
              Edit Inputs
            </Button>
            <Button size="sm" variant="ghost" onClick={onStartNewPlan}>
              Start New Plan
            </Button>
          </div>
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <Button size="sm" className="w-full" onClick={onExportPlan}>
          Export Plan
        </Button>
        <Button size="sm" variant="secondary" className="w-full" onClick={onDownloadPdf}>
          Download PDF
        </Button>
        <Button size="sm" variant="outline" className="w-full" onClick={onSavePlan}>
          {savePlanLabel}
        </Button>
      </div>
    </SectionCard>
  );
}

