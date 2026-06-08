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
  PlannerDashboardAlternative,
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

function SectionCard({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={`!rounded-2xl !border-border-light bg-surface p-5 shadow-card md:p-6 ${className}`}>
      {children}
    </Card>
  );
}

export function toChecklistKey(...parts: Array<string | number | null | undefined>) {
  return parts
    .map((part) => String(part ?? '').trim().toLowerCase())
    .filter(Boolean)
    .join('::')
    .replace(/[^a-z0-9:]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function CardDoneToggle({
  cardId,
  checked,
  onToggleCard,
  label = 'Done',
}: {
  cardId: string;
  checked: boolean;
  onToggleCard: (cardId: string) => void;
  label?: string;
}) {
  return (
    <label
      className={`inline-flex cursor-pointer items-center gap-2 rounded-pill border px-2.5 py-1 text-[10px] font-bold transition ${
        checked
          ? 'border-success/35 bg-success/10 text-success'
          : 'border-border bg-surface text-text-secondary hover:border-accent/30'
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={() => onToggleCard(cardId)}
        className="h-3.5 w-3.5 rounded border-border text-accent focus:ring-accent"
      />
      {label}
    </label>
  );
}

function ChecklistRow({
  itemId,
  checked,
  onToggle,
  text,
  accent = false,
}: {
  itemId: string;
  checked: boolean;
  onToggle: (itemId: string) => void;
  text: string;
  accent?: boolean;
}) {
  return (
    <label
      className={`group flex cursor-pointer items-start gap-2.5 rounded-[10px] px-2 py-1.5 transition ${
        checked
          ? 'bg-success/10'
          : accent
            ? 'hover:bg-accent-light/50'
            : 'hover:bg-bg-secondary'
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={() => onToggle(itemId)}
        className={`mt-0.5 h-4 w-4 shrink-0 rounded border ${
          accent
            ? 'border-accent/35 text-accent focus:ring-accent'
            : 'border-border text-accent focus:ring-accent'
        }`}
      />
      <span
        className={`break-words text-[12px] font-semibold leading-[1.55] ${
          checked ? 'text-text-tertiary line-through' : 'text-text-secondary'
        }`}
      >
        {text}
      </span>
    </label>
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

function taskChipLabel(task: PlannerDashboardTask) {
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
  cardId,
  isCardChecked,
  onToggleCard,
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
  cardId: string;
  isCardChecked: boolean;
  onToggleCard: (cardId: string) => void;
}) {
  return (
    <SectionCard className="bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-light pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[11px] font-bold tracking-[0.45px] text-text-secondary">
            11. Longer-Term Roadmap Card
          </p>
          <Badge variant="info">Scan later</Badge>
        </div>
        <CardDoneToggle cardId={cardId} checked={isCardChecked} onToggleCard={onToggleCard} />
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
              className={`rounded-xl border px-[14px] py-3 transition ${
                statusLabel === 'Done'
                  ? 'border-success/35 bg-success/10'
                  : statusLabel === 'In progress'
                    ? 'border-accent/35 bg-accent-light/25'
                    : 'border-border-light bg-bg-secondary'
              }`}
            >
              <button
                type="button"
                aria-expanded={isExpanded}
                onClick={() => toggleRoadmapPhase(phase.id)}
                className="flex w-full items-center justify-between gap-2 text-left"
              >
                <p className="text-[14px] font-bold text-text-primary">{phase.title}</p>
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
                    {statusLabel} - {checkedCount}/{totalTasks}
                  </span>
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-pill border border-accent/25 bg-accent-light text-[10px] font-bold text-accent">
                    {isExpanded ? '-' : '+'}
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
                          className={`flex items-center justify-between gap-3 rounded-xl border p-3 transition ${meta.rowClass}`}
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
        Expand each phase for 30/60/90 and beyond. Completed phases collapse automatically and can always be reopened.
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






export function CertificationsEducationSection({
  model,
  trainingCards,
  completedTrainingIds,
  onToggleTrainingCard,
  cardId,
  isCardChecked,
  onToggleCard,
  isItemChecked,
  onToggleItem,
}: {
  model: PlannerDashboardV3Model
  trainingCards: ReturnType<typeof buildTrainingCards>
  completedTrainingIds: Record<string, boolean>
  onToggleTrainingCard: (trainingId: string) => void
  cardId: string
  isCardChecked: boolean
  onToggleCard: (cardId: string) => void
  isItemChecked: (itemId: string) => boolean
  onToggleItem: (itemId: string) => void
}) {
  const normalizeCertKey = (value: string) =>
    value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();

  const required = Array.from(
    new Set(model.certEducation.required.map((item) => item.trim()).filter(Boolean))
  );
  const requiredKeys = new Set(required.map(normalizeCertKey));

  const recommended = Array.from(
    new Set(model.certEducation.recommended.map((item) => item.trim()).filter(Boolean))
  ).filter((item) => !requiredKeys.has(normalizeCertKey(item)));
  const recommendedKeys = new Set(recommended.map(normalizeCertKey));

  const optional = Array.from(
    new Set(model.certEducation.optional.map((item) => item.trim()).filter(Boolean))
  ).filter((item) => {
    const key = normalizeCertKey(item);
    return !requiredKeys.has(key) && !recommendedKeys.has(key);
  });

  const certGroups = [
    { id: 'required', title: 'Required', items: required, className: 'border-accent/25 bg-accent-light/25' },
    { id: 'recommended', title: 'Recommended', items: recommended, className: 'border-border-light bg-bg-secondary/80' },
    { id: 'optional', title: 'Optional', items: optional, className: 'border-border-light bg-surface' },
  ].filter((group) => group.items.length > 0);

  return (
    <SectionCard className="bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-light pb-3">
        <p className="text-[11px] font-bold tracking-[0.45px] text-text-secondary">Training & Credentials</p>
        <CardDoneToggle cardId={cardId} checked={isCardChecked} onToggleCard={onToggleCard} />
      </div>
      <p className="mt-3 text-[12px] font-semibold text-text-secondary">{model.certEducation.effortSummary}</p>
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
      <div className={`mt-4 grid gap-3 ${certGroups.length >= 3 ? 'md:grid-cols-3' : certGroups.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-1'}`}>
        {certGroups.map((group) => (
          <div key={group.title} className={`rounded-xl border p-3 ${group.className}`}>
            <p className="text-[10px] font-bold uppercase tracking-[1.05px] text-text-primary">{group.title}</p>
            <ul className="mt-2 space-y-1.5 text-[12px] font-semibold leading-[1.65] text-text-secondary">
              {group.items.slice(0, 5).map((item, idx) => (
                <li key={`${group.title}-${idx}-${item}`} className="break-words">
                  <ChecklistRow
                    itemId={toChecklistKey('cert-education', group.id, idx, item)}
                    checked={isItemChecked(toChecklistKey('cert-education', group.id, idx, item))}
                    onToggle={onToggleItem}
                    text={item}
                    accent={group.id === 'required'}
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      {trainingCards.length > 0 ? (
        <details className="mt-4 rounded-xl border border-border-light bg-bg-secondary/60 p-3">
          <summary className="cursor-pointer text-[11px] font-bold uppercase tracking-[1.05px] text-accent">
            Provider details and completion
          </summary>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {trainingCards.map((card) => (
              <div
                key={card.id}
                className={`rounded-xl border p-3 text-left transition ${
                  completedTrainingIds[card.id]
                    ? 'border-success/35 bg-success/10'
                    : 'border-border-light bg-bg-secondary/80 hover:border-accent/30'
                }`}
              >
                <label className="flex cursor-pointer items-start gap-2.5">
                  <input
                    type="checkbox"
                    checked={Boolean(completedTrainingIds[card.id])}
                    onChange={() => onToggleTrainingCard(card.id)}
                    className="mt-0.5 h-4 w-4 rounded border-accent/35 text-accent focus:ring-accent"
                  />
                  <span>
                    <p className="text-[13px] font-bold text-text-primary">{card.name}</p>
                    <p className="mt-1 text-[11px] font-semibold text-text-secondary">{card.provider}</p>
                    <p className="mt-1 text-[11px] font-semibold text-text-tertiary">
                      {card.sourceType === 'verified' ? 'Official source' : card.sourceType === 'derived' ? 'Profile-derived source' : 'Estimated source'}
                    </p>
                    {card.sourceUrl ? (
                      <a
                        href={card.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-accent hover:underline"
                      >
                        Open source ↗
                      </a>
                    ) : (
                      <p className="mt-1 text-[11px] font-semibold text-warning">Source link pending</p>
                    )}
                    {card.cost ? <p className="mt-1 text-[11px] font-semibold text-text-tertiary">Cost: {card.cost}</p> : null}
                    <p className="mt-2 text-[10px] font-bold uppercase tracking-[1px] text-accent">
                      {completedTrainingIds[card.id] ? 'Completed' : 'Mark complete'}
                    </p>
                  </span>
                </label>
              </div>
            ))}
          </div>
        </details>
      ) : null}
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
  )
}





export function GuestPreviewLimitSection() {
  return (
    <SectionCard className="border-warning/25 bg-warning-light">
      <p className="text-[10px] font-bold uppercase tracking-[1.1px] text-warning">Preview Limit</p>
      <p className="mt-2 text-sm font-semibold text-text-secondary">
        Sections after{' '}
        <span className="font-semibold text-text-primary">
          3. Best Route Card
        </span>{' '}
        are locked on guest preview.
      </p>
      <p className="mt-2 text-sm font-semibold text-text-secondary">
        Sign in to unlock Blockers, Requirements, Skills, Certifications, Resume Evidence,
        Adjacent Entry Options, Salary/Market context, and the Longer-Term Roadmap.
      </p>
      <Link
        href="/login"
        className="mt-4 inline-flex rounded-xl border border-accent/20 bg-accent-light px-4 py-2 text-sm font-bold text-accent transition hover:border-accent/35"
      >
        Sign In to Unlock Full Report
      </Link>
    </SectionCard>
  );
}

export function AiSignalCard({ model }: { model: PlannerDashboardV3Model }) {
  const trendDelta = model.insights.aiInsight.trendEndPercent - model.insights.aiInsight.trendStartPercent;
  return (
    <SectionCard className="!rounded-xl !p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold tracking-[1px] text-accent">AI Signal</p>
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
          {trendDelta > 0 ? '+' : ''}
          {trendDelta}% in 30 days
        </p>
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
  const repliesCount = Number.parseInt(outreachTracker.replies || '0', 10)
  const safeRepliesCount = Number.isFinite(repliesCount) && repliesCount >= 0 ? repliesCount : 0
  const positiveCount = Number.parseInt(outreachTracker.positiveReplies || '0', 10)
  const safePositiveCount = Number.isFinite(positiveCount) && positiveCount >= 0 ? positiveCount : 0
  const hasOutreachActivity =
    safeSentCount > 0 ||
    safeRepliesCount > 0 ||
    safePositiveCount > 0 ||
    Boolean(outreachTracker.nextFollowUpDate)
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
              className={`flex min-h-[52px] items-center rounded-[10px] border border-border bg-bg-secondary px-4 ${
                safeValue === 0 ? 'text-text-tertiary' : accentClass
              }`}
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
              ?
            </button>
            <button
              type="button"
              aria-label={`Decrease ${label.toLowerCase()}`}
              className={numericStepperButtonClass}
              onClick={() => onChange(String(Math.max(0, safeValue - 1)))}
            >
              ?
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
        Manual outreach tracker plus editable scripts.
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
              {hasOutreachActivity ? `${safeSentCount}/${suggestedTargetCount || 0} sent` : 'No outreach logged yet'}
            </p>
          </div>
          <div className="mt-2 h-2 rounded-full bg-bg-secondary">
            <div
              className="h-2 rounded-full bg-accent transition-[width]"
              style={{ width: `${hasOutreachActivity ? outreachProgressPercent : 0}%` }}
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




export function TrustFaqSection({
  faqItems,
  methodology,
}: {
  faqItems: Array<{ question: string; answer: string }>;
  methodology: PlannerDashboardV3Model['methodology'];
}) {
  return (
    <SectionCard className="bg-surface">
      <p className="text-[11px] font-bold tracking-[0.45px] text-text-secondary">
        14. Trust, Methodology and FAQ
      </p>
      <div className="mt-4 rounded-xl border border-border-light bg-bg-secondary p-3">
        <p className="text-[10px] font-bold uppercase tracking-[1.05px] text-accent">How This Score Is Computed</p>
        <p className="mt-1 text-[11px] font-semibold leading-[1.7] text-text-secondary">
          {methodology.scoreSummary}
        </p>
        <details className="mt-2 rounded-[10px] border border-border-light bg-surface p-3">
          <summary className="cursor-pointer text-[11px] font-bold text-accent">
            See assumptions and source details
          </summary>
          <div className="mt-2 space-y-1">
            {methodology.sourceLines.map((line) => (
              <p key={line} className="text-[11px] font-bold text-text-secondary">
                {line}
              </p>
            ))}
          </div>
        </details>
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
      <p className="text-[11px] font-bold tracking-[0.45px] text-text-secondary">15. Related Tools</p>
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
  isItemChecked,
  onToggleItem,
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
  isItemChecked: (itemId: string) => boolean;
  onToggleItem: (itemId: string) => void;
  savePlanLabel: string;
  onRegenerate: () => void;
  onEditInputs: () => void;
  onStartNewPlan: () => void;
  onExportPlan: () => void;
  onDownloadPdf: () => void;
  onSavePlan: () => void;
}) {
  return (
    <SectionCard className="!rounded-2xl !p-4 md:!p-[18px]">
      <p id="planner-v3-sticky-panel" className="text-[10px] font-bold tracking-[1px] text-text-secondary">
        Execution
      </p>
      <p className="mt-2 text-[10px] font-bold uppercase tracking-[1.05px] text-text-tertiary">Return Loop</p>
      <p className="mt-1 text-base font-bold leading-[1.35] text-text-primary">{model.stickyPanel.transition}</p>
      <p className="mt-2 text-[13px] font-semibold text-text-secondary">
        Difficulty: {model.stickyPanel.difficulty}
      </p>
      <p className="text-[13px] font-semibold text-text-secondary">Timeline: {model.stickyPanel.timeline}</p>
      <div className="mt-3 rounded-[10px] border border-accent/25 bg-accent-light/45 p-[10px]">
        <p className="text-[10px] font-bold uppercase tracking-[1.05px] text-accent">Progress to First Offer</p>
        <div className="mt-2 h-2 rounded-pill bg-surface">
          <div className="h-2 rounded-pill bg-accent" style={{ width: `${liveProgressToOffer}%` }} />
        </div>
        <p className="mt-2 text-[11px] font-bold text-accent">
          {liveProgressToOffer}% complete. {lastTaskDeltaLabel ?? 'Weighted checklist progress updates instantly.'}
        </p>
      </div>
      <div className="mt-3 rounded-[10px] border border-success/20 bg-success/10 p-[10px]">
        <p className="text-[10px] font-bold uppercase tracking-[1.05px] text-success">Next Best Action</p>
        <p className="mt-1 text-[12px] font-semibold text-success">{nextBestAction}</p>
      </div>
      <div className="mt-3 rounded-[10px] border border-border-light bg-bg-secondary/80 p-[10px]">
        <p className="text-[13px] font-bold text-text-primary">Next Steps</p>
        <ul className="mt-2 space-y-1.5 text-[12px] font-semibold leading-[1.7] text-text-secondary">
          {stickyNextSteps.map((item, idx) => {
            const itemId = toChecklistKey('sticky-next-steps', idx, item);
            return (
              <li key={`${item}-${idx}`}>
                <ChecklistRow
                  itemId={itemId}
                  checked={isItemChecked(itemId)}
                  onToggle={onToggleItem}
                  text={item}
                  accent
                />
              </li>
            );
          })}
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

export function CollapsibleSection({
  title,
  subtitle,
  defaultOpen = false,
  children,
}: {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card className="overflow-hidden p-0 shadow-card">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition hover:bg-bg-secondary md:px-6"
      >
        <div className="min-w-0">
          <p className="text-[15px] font-bold text-text-primary">{title}</p>
          {subtitle ? (
            <p className="mt-0.5 text-[12px] font-medium text-text-secondary">{subtitle}</p>
          ) : null}
        </div>
        <span
          aria-hidden
          className={`flex h-7 w-7 items-center justify-center rounded-full border border-border-light bg-surface text-[11px] font-bold text-text-secondary transition ${open ? 'rotate-180' : ''}`}
        >
          ?
        </span>
      </button>
      {open ? <div className="border-t border-border-light px-5 py-5 md:px-6">{children}</div> : null}
    </Card>
  );
}

function FocusCard({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-4 shadow-card sm:p-5 md:p-6">
      <div className="mb-3.5 md:mb-4">
        <h2 className="text-[18px] font-bold leading-[1.25] text-text-primary md:text-[20px]">{title}</h2>
        {hint ? (
          <p className="mt-1 text-[12.5px] leading-[1.55] text-text-secondary md:text-[13px]">{hint}</p>
        ) : null}
      </div>
      {children}
    </Card>
  );
}

function FocusCheckRow({
  text,
  checked,
  onToggle,
  itemId,
  index,
}: {
  text: string;
  checked: boolean;
  onToggle: (id: string) => void;
  itemId: string;
  index?: number;
}) {
  return (
    <label
      htmlFor={itemId}
      className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3.5 py-3 transition hover:border-accent/40 hover:bg-accent-light/30 ${checked ? 'border-success/30 bg-success/5' : 'border-border-light bg-bg-secondary'}`}
    >
      <input
        id={itemId}
        type="checkbox"
        checked={checked}
        onChange={() => onToggle(itemId)}
        className="mt-0.5 h-4 w-4 rounded border-border"
      />
      <div className="min-w-0 flex-1">
        {typeof index === 'number' ? (
          <span className="mr-1.5 text-[13px] font-bold text-accent">{index + 1}.</span>
        ) : null}
        <span
          className={`text-[13.5px] leading-[1.55] ${checked ? 'text-text-tertiary line-through' : 'text-text-primary'}`}
        >
          {text}
        </span>
      </div>
    </label>
  );
}

export function PathForwardCard({
  model,
  primaryScenarioSteps,
  cardId,
  isCardChecked,
  onToggleCard,
  onSelectAlternativeRole,
}: {
  model: PlannerDashboardV3Model;
  primaryScenarioSteps: PlannerDashboardV3Model['fastestPath']['steps'];
  cardId: string;
  isCardChecked: boolean;
  onToggleCard: (cardId: string) => void;
  onSelectAlternativeRole?: (title: string) => void;
}) {
  const steps =
    primaryScenarioSteps.length > 0
      ? primaryScenarioSteps
      : model.fastestPath.steps.length > 0
        ? model.fastestPath.steps
        : model.fastestPath.strongestPath;
  const route = model.hero.fastestRoute || model.decision.fastestRoute;

  return (
    <FocusCard
      title="Your path forward"
      hint={`Here's how to move from ${model.decision.currentRole} to ${model.decision.targetRole}. Short, doable steps — not a lecture.`}
    >
      {route ? (
        <div className="mb-4 rounded-lg border border-accent/25 bg-accent-light/40 px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-[1.05px] text-accent">
            Route
          </p>
          <p className="mt-1 text-sm font-semibold leading-[1.45] text-text-primary">{route}</p>
        </div>
      ) : null}

      <ol className="space-y-2.5">
        {steps.slice(0, 5).map((step, idx) => (
          <li
            key={`${step.label}-${idx}`}
            className="flex items-start gap-3 rounded-lg border border-border-light bg-bg-secondary px-3.5 py-3"
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-white">
              {idx + 1}
            </span>
            <div className="min-w-0">
              <p className="text-[14px] font-semibold leading-[1.4] text-text-primary">
                {step.label}
              </p>
              {step.detail ? (
                <p className="mt-1 text-[12.5px] leading-[1.55] text-text-secondary">
                  {step.detail}
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ol>

      <BackupPaths
        model={model}
        onSelectAlternativeRole={onSelectAlternativeRole}
      />

      <div className="mt-4 flex items-center justify-end">
        <label className="flex cursor-pointer items-center gap-1.5 text-[12px] font-semibold text-text-secondary">
          <input
            type="checkbox"
            checked={isCardChecked}
            onChange={() => onToggleCard(cardId)}
            className="h-3.5 w-3.5 rounded border-border"
          />
          Mark section reviewed
        </label>
      </div>
    </FocusCard>
  );
}

function BackupPaths({
  model,
  onSelectAlternativeRole,
}: {
  model: PlannerDashboardV3Model;
  onSelectAlternativeRole?: (title: string) => void;
}) {
  const { fastestEntry, closestMatch, bestLongTermUpside } = model.adjacentEntryOptions;
  const targetKey = (model.decision.targetRole || '').trim().toLowerCase();
  const rawOptions: Array<{ label: string; option: typeof fastestEntry }> = [
    { label: 'Fastest way in', option: fastestEntry },
    { label: 'Closest match', option: closestMatch },
    { label: 'Long-term upside', option: bestLongTermUpside },
  ];
  const seenTitles = new Set<string>();
  if (targetKey) seenTitles.add(targetKey);
  const options = rawOptions.filter((entry) => {
    if (!entry.option) return false;
    const key = entry.option.title.trim().toLowerCase();
    if (!key || seenTitles.has(key)) return false;
    seenTitles.add(key);
    return true;
  });

  if (options.length === 0) return null;

  return (
    <div className="mt-5 border-t border-border-light pt-4">
      <p className="mb-2 text-[11px] font-bold uppercase tracking-[1.05px] text-text-tertiary">
        If this path stalls, try one of these
      </p>
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {options.map((entry) => {
          const option = entry.option!;
          const body = (
            <>
              <p className="text-[10px] font-bold uppercase tracking-[1px] text-accent">
                {entry.label}
              </p>
              <p className="mt-1 text-[13px] font-bold leading-[1.35] text-text-primary">
                {option.title}
              </p>
              <p className="mt-1 text-[11.5px] font-medium text-text-secondary">
                {option.difficulty} · {option.timeline}
              </p>
              {option.reason ? (
                <p className="mt-1.5 text-[12px] leading-[1.5] text-text-secondary">
                  {option.reason}
                </p>
              ) : null}
            </>
          );

          if (onSelectAlternativeRole) {
            return (
              <button
                key={entry.label}
                type="button"
                onClick={() => onSelectAlternativeRole(option.title)}
                className="rounded-xl border border-border-light bg-bg-secondary p-3 text-left transition hover:border-accent/40 hover:bg-accent-light/30"
              >
                {body}
              </button>
            );
          }
          return (
            <div
              key={entry.label}
              className="rounded-xl border border-border-light bg-bg-secondary p-3"
            >
              {body}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function StartHereCard({
  model,
  cardId,
  isCardChecked,
  onToggleCard,
  isItemChecked,
  onToggleItem,
}: {
  model: PlannerDashboardV3Model;
  cardId: string;
  isCardChecked: boolean;
  onToggleCard: (cardId: string) => void;
  isItemChecked: (itemId: string) => boolean;
  onToggleItem: (itemId: string) => void;
}) {
  const targetRole = model.decision.targetRole?.trim();
  const fastestEntry = model.adjacentEntryOptions.fastestEntry?.title?.trim();
  const firstCredential =
    model.certEducation.required[0]?.trim() || model.certEducation.recommended[0]?.trim() || '';
  const thisWeek =
    model.actionWindow14.thisWeek.length > 0 ? model.actionWindow14.thisWeek : model.checklist.immediate;
  const proofToCollect =
    model.actionWindow14.proofToCollect.length > 0
      ? model.actionWindow14.proofToCollect
      : model.resumeEvidence.stillNeedsProof;

  const items: string[] = [
    targetRole ? `Line up first outreach for ${targetRole}` : '',
    fastestEntry && targetRole && fastestEntry.toLowerCase() !== targetRole.toLowerCase()
      ? `Consider a faster bridge role: ${fastestEntry}`
      : '',
    firstCredential ? `Sign up for: ${firstCredential}` : '',
    ...thisWeek.slice(0, 3),
  ];

  const deduped = Array.from(new Set(items.filter(Boolean))).slice(0, 5);
  const proofItems = Array.from(new Set(proofToCollect.filter(Boolean))).slice(0, 3);

  if (deduped.length === 0 && proofItems.length === 0) return null;

  return (
    <FocusCard
      title="What to do first (next 7–14 days)"
      hint="Concrete moves you can make this week. Pick one, finish it, then come back."
    >
      <ul className="space-y-2.5">
        {deduped.map((item, idx) => {
          const itemId = toChecklistKey('start-here', idx, item);
          return (
            <li key={itemId}>
              <FocusCheckRow
                text={item}
                checked={isItemChecked(itemId)}
                onToggle={onToggleItem}
                itemId={itemId}
                index={idx}
              />
            </li>
          );
        })}
      </ul>

      {proofItems.length > 0 ? (
        <div className="mt-5 rounded-lg border border-accent/20 bg-accent-light/30 p-4">
          <p className="text-[11px] font-bold uppercase tracking-[1.05px] text-accent">
            Proof to collect this week
          </p>
          <ul className="mt-2 space-y-1.5">
            {proofItems.map((item, idx) => (
              <li
                key={`${item}-${idx}`}
                className="flex gap-2 text-[13px] leading-[1.55] text-text-secondary"
              >
                <span className="text-accent">·</span>
                <span className="min-w-0 break-words">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-4 flex items-center justify-end">
        <label className="flex cursor-pointer items-center gap-1.5 text-[12px] font-semibold text-text-secondary">
          <input
            type="checkbox"
            checked={isCardChecked}
            onChange={() => onToggleCard(cardId)}
            className="h-3.5 w-3.5 rounded border-border"
          />
          Done for now
        </label>
      </div>
    </FocusCard>
  );
}

export function StandOutCard({
  model,
  signals,
  cardId,
  isCardChecked,
  onToggleCard,
  isItemChecked,
  onToggleItem,
}: {
  model: PlannerDashboardV3Model;
  signals: string[];
  cardId: string;
  isCardChecked: boolean;
  onToggleCard: (cardId: string) => void;
  isItemChecked: (itemId: string) => boolean;
  onToggleItem: (itemId: string) => void;
}) {
  const advantages = model.strengths.slice(0, 2);

  if (signals.length === 0 && advantages.length === 0) return null;

  return (
    <FocusCard
      title="Ways to stand out"
      hint="Proof and positioning that make employers trust you faster."
    >
      <div className="space-y-4">
        {signals.length > 0 ? (
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[1.05px] text-text-tertiary">
              Experience signals employers look for
            </p>
            <ul className="space-y-2">
              {signals.map((item, idx) => {
                const itemId = toChecklistKey('stand-out', 'signal', idx, item);
                return (
                  <li key={itemId}>
                    <FocusCheckRow
                      text={item}
                      checked={isItemChecked(itemId)}
                      onToggle={onToggleItem}
                      itemId={itemId}
                    />
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        {advantages.length > 0 ? (
          <div className="rounded-lg border border-success/25 bg-success/5 p-4">
            <p className="text-[11px] font-bold uppercase tracking-[1.05px] text-success">
              What you already bring
            </p>
            <ul className="mt-2 space-y-1.5">
              {advantages.map((advantage, idx) => (
                <li
                  key={`${advantage.advantage}-${idx}`}
                  className="text-[13px] font-medium leading-[1.55] text-text-primary"
                >
                  <span className="mr-1.5 text-success">-</span>
                  {advantage.advantage}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <div className="mt-4 flex items-center justify-end">
        <label className="flex cursor-pointer items-center gap-1.5 text-[12px] font-semibold text-text-secondary">
          <input
            type="checkbox"
            checked={isCardChecked}
            onChange={() => onToggleCard(cardId)}
            className="h-3.5 w-3.5 rounded border-border"
          />
          Section reviewed
        </label>
      </div>
    </FocusCard>
  );
}

export function SkillsToBuildCard({
  model,
  cardId,
  isCardChecked,
  onToggleCard,
  isItemChecked,
  onToggleItem,
}: {
  model: PlannerDashboardV3Model;
  cardId: string;
  isCardChecked: boolean;
  onToggleCard: (cardId: string) => void;
  isItemChecked: (itemId: string) => boolean;
  onToggleItem: (itemId: string) => void;
}) {
  const focus = Array.from(
    new Set(
      [
        ...model.skillsBuckets.needSoon,
        ...model.requirementsGaps.missingNow,
      ].map((item) => item.trim()).filter(Boolean)
    )
  ).slice(0, 4);

  const alreadyHave = model.skillsBuckets.alreadyHave.slice(0, 3);

  if (focus.length === 0 && alreadyHave.length === 0) return null;

  return (
    <FocusCard
      title="Skills to build"
      hint="Focus on these — they'll make the biggest difference in getting hired. Skip the rest for now."
    >
      {focus.length > 0 ? (
        <ul className="space-y-2">
          {focus.map((item, idx) => {
            const itemId = toChecklistKey('skills-focus', idx, item);
            return (
              <li key={itemId}>
                <FocusCheckRow
                  text={item}
                  checked={isItemChecked(itemId)}
                  onToggle={onToggleItem}
                  itemId={itemId}
                  index={idx}
                />
              </li>
            );
          })}
        </ul>
      ) : null}

      {alreadyHave.length > 0 ? (
        <div className="mt-4 rounded-lg border border-success/25 bg-success/5 p-3.5">
          <p className="text-[11px] font-bold uppercase tracking-[1.05px] text-success">
            You've already got
          </p>
          <p className="mt-1.5 text-[13px] leading-[1.55] text-text-primary">
            {alreadyHave.join(' · ')}
          </p>
        </div>
      ) : null}

      <div className="mt-4 flex items-center justify-end">
        <label className="flex cursor-pointer items-center gap-1.5 text-[12px] font-semibold text-text-secondary">
          <input
            type="checkbox"
            checked={isCardChecked}
            onChange={() => onToggleCard(cardId)}
            className="h-3.5 w-3.5 rounded border-border"
          />
          Section reviewed
        </label>
      </div>
    </FocusCard>
  );
}

export function TimelineCard({
  model,
  roadmapPhases,
  phaseStats,
  checkedTaskIds,
  toggleRoadmapPhase,
  toggleChecklistTask,
  nowCompletion,
  nextCompletion,
  blockedTasks,
  cardId,
  isCardChecked,
  onToggleCard,
}: {
  model: PlannerDashboardV3Model;
  roadmapPhases: PlannerDashboardRoadmapPhase[];
  phaseStats: Map<string, PhaseStateView>;
  checkedTaskIds: Record<string, boolean>;
  toggleRoadmapPhase: (phaseId: string) => void;
  toggleChecklistTask: (taskId: string) => void;
  nowCompletion: number;
  nextCompletion: number;
  blockedTasks: PlannerDashboardTask[];
  cardId: string;
  isCardChecked: boolean;
  onToggleCard: (cardId: string) => void;
}) {
  const windows =
    model.longerTermRoadmap.windows.length > 0
      ? model.longerTermRoadmap.windows
      : model.roadmap.phases.map((phase) => ({
          label: phase.title,
          actions: phase.actions.slice(0, 3),
        }));

  const estimate = (model.decision.estimatedTimeline || model.hero.timeline.value || '').trim();
  const rawDemandLine = (model.marketSnapshot.localDemand?.value || '').trim();
  const rawHiringLine = (model.marketSnapshot.hiringRequirements?.value || '').trim();
  const demandLine = rawDemandLine && !/unavailable/i.test(rawDemandLine) ? rawDemandLine : '';
  const hiringLine = rawHiringLine && !/unavailable/i.test(rawHiringLine) ? rawHiringLine : '';

  const payProgression = [
    { label: 'Entry', value: model.marketSnapshot.entryWage?.value },
    { label: 'Mid-career', value: model.marketSnapshot.midCareerSalary?.value },
    { label: 'Top earners', value: model.marketSnapshot.topEarners?.value },
  ].filter((entry) => entry.value && !/unavailable/i.test(entry.value));

  return (
    <FocusCard
      title="Timeline"
      hint={
        estimate
          ? `Realistic pace for this switch. Most people in your situation take ${estimate} — longer if you stop, shorter if you pick up momentum early.`
          : undefined
      }
    >
      {payProgression.length > 0 ? (
        <div className="mb-4 rounded-lg border border-border-light bg-bg-secondary p-4">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-text-tertiary">
            Money reality
          </p>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {payProgression.map((entry) => (
              <div key={entry.label}>
                <p className="text-[11px] font-semibold text-text-tertiary">{entry.label}</p>
                <p className="text-[13px] font-bold text-text-primary">{entry.value}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {demandLine || hiringLine ? (
        <div className="mb-4 rounded-lg border border-border-light bg-bg-secondary p-4">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-text-tertiary">Hiring environment</p>
          {demandLine ? (
            <p className="mt-1.5 text-[13px] leading-[1.55] text-text-primary">{demandLine}</p>
          ) : null}
          {hiringLine && hiringLine.toLowerCase() !== demandLine.toLowerCase() ? (
            <p className="mt-1 text-[12px] font-medium leading-[1.55] text-text-secondary">{hiringLine}</p>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-3">
        {windows.slice(0, 3).map((window, idx) => {
          const phase = roadmapPhases[idx] ?? null;
          const phaseState = phase ? phaseStats.get(phase.id) : null;
          const isExpanded = phaseState?.isExpanded ?? false;
          const totalTasks = phaseState?.totalCount ?? 0;
          const checkedCount = phaseState?.checkedCount ?? 0;
          const statusLabel = phaseState?.statusLabel ?? 'Quick view';
          const tasks = phaseState?.tasks ?? [];

          return (
            <article
              key={`${window.label}-${idx}`}
              className={`rounded-lg border p-4 transition ${
                statusLabel === 'Done'
                  ? 'border-success/35 bg-success/10'
                  : statusLabel === 'In progress'
                    ? 'border-accent/35 bg-accent-light/20'
                    : 'border-border-light bg-bg-secondary'
              }`}
            >
              <button
                type="button"
                aria-expanded={phase ? isExpanded : false}
                onClick={() => (phase ? toggleRoadmapPhase(phase.id) : null)}
                className="flex w-full items-center justify-between gap-2 text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-white">
                    {idx + 1}
                  </span>
                  <p className="text-[13px] font-bold text-text-primary">{window.label}</p>
                </div>
                {phase ? (
                  <span className="rounded-pill border border-border px-2 py-0.5 text-[10px] font-bold text-text-secondary">
                    {statusLabel} · {checkedCount}/{totalTasks}
                  </span>
                ) : null}
              </button>

              {!isExpanded ? (
                <ul className="mt-2 space-y-1.5">
                  {window.actions.slice(0, 3).map((action, actionIdx) => (
                    <li
                      key={`${window.label}-${actionIdx}-${action}`}
                      className="flex gap-2 text-[13px] leading-[1.55] text-text-secondary"
                    >
                      <span className="text-accent">·</span>
                      <span className="min-w-0 break-words">{action}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="mt-2.5 space-y-2">
                  {tasks.length > 0 ? (
                    tasks.slice(0, 4).map((task) => (
                      <label key={task.id} className="flex items-start gap-2.5 rounded-md border border-border-light bg-bg-secondary/80 p-2.5">
                        <input
                          type="checkbox"
                          checked={Boolean(checkedTaskIds[task.id])}
                          onChange={() => toggleChecklistTask(task.id)}
                          className="mt-0.5 h-4 w-4 rounded border-border text-accent focus:ring-accent"
                        />
                        <span
                          className={`text-[12px] leading-[1.5] ${
                            checkedTaskIds[task.id] ? 'text-text-tertiary line-through' : 'text-text-primary'
                          }`}
                        >
                          {task.label}
                        </span>
                      </label>
                    ))
                  ) : (
                    <p className="text-[12px] text-text-secondary">No execution tasks captured for this window yet.</p>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>

      <div className="mt-3 rounded-lg border border-border-light bg-bg-secondary px-3 py-2.5">
        <p className="text-[11px] font-semibold text-text-secondary">
          Execution summary: Now {nowCompletion}% · Next {nextCompletion}% · Needs attention{' '}
          {blockedTasks.filter((task) => !checkedTaskIds[task.id]).length}
        </p>
      </div>

      <div className="mt-4 flex items-center justify-end">
        <label className="flex cursor-pointer items-center gap-1.5 text-[12px] font-semibold text-text-secondary">
          <input
            type="checkbox"
            checked={isCardChecked}
            onChange={() => onToggleCard(cardId)}
            className="h-3.5 w-3.5 rounded border-border"
          />
          Section reviewed
        </label>
      </div>
    </FocusCard>
  );
}

export function LiveMarketProofCard({
  model,
  cardId,
  isCardChecked,
  onToggleCard,
}: {
  model: PlannerDashboardV3Model;
  cardId: string;
  isCardChecked: boolean;
  onToggleCard: (cardId: string) => void;
}) {
  const evidenceRows = model.marketProof.requirements.slice(0, 3);

  return (
    <FocusCard
      title="Live market proof"
      hint="Concrete signals from recent postings in your selected market, so your plan stays tied to real employer language."
    >
      <div className="rounded-lg border border-border-light bg-bg-secondary p-4">
        <p className="text-[12px] font-semibold uppercase tracking-wide text-text-tertiary">Market snapshot</p>
        <p className="mt-1.5 text-[13px] leading-[1.55] text-text-primary">{model.marketProof.summary}</p>
        {typeof model.marketProof.postingsCount === 'number' ? (
          <p className="mt-1 text-[12px] font-semibold text-text-secondary">
            Evidence set: {model.marketProof.postingsCount} posting
            {model.marketProof.postingsCount === 1 ? '' : 's'}
          </p>
        ) : null}
      </div>

      {model.marketProof.baselineOnlyWarning ? (
        <div className="mt-3 rounded-lg border border-warning/30 bg-warning-light/45 p-3.5">
          <p className="text-[11px] font-bold uppercase tracking-[1.05px] text-warning">Data note</p>
          <p className="mt-1 text-[12.5px] leading-[1.55] text-text-secondary">
            {model.marketProof.baselineOnlyWarning}
          </p>
        </div>
      ) : null}

      {evidenceRows.length > 0 ? (
        <div className="mt-4 space-y-2.5">
          {evidenceRows.map((item, idx) => (
            <div key={`${item.label}-${idx}`} className="rounded-lg border border-border-light bg-bg-secondary p-3.5">
              <div className="flex items-start justify-between gap-3">
                <p className="text-[13px] font-bold leading-[1.35] text-text-primary">{item.label}</p>
                <span className="rounded-pill border border-accent/20 bg-accent-light px-2 py-0.5 text-[10px] font-bold text-accent">
                  {item.frequency}
                </span>
              </div>
              <p className="mt-2 text-[12px] leading-[1.55] text-text-secondary">{item.evidence}</p>
              <p className="mt-1 text-[10.5px] font-semibold uppercase tracking-[0.9px] text-text-tertiary">
                Source: {item.source}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-lg border border-border-light bg-bg-secondary p-3.5">
          <p className="text-[12px] leading-[1.55] text-text-secondary">
            No requirement excerpts were captured yet. Regenerate with market evidence turned on or add a target posting.
          </p>
        </div>
      )}

      <div className="mt-4 flex items-center justify-end">
        <label className="flex cursor-pointer items-center gap-1.5 text-[12px] font-semibold text-text-secondary">
          <input
            type="checkbox"
            checked={isCardChecked}
            onChange={() => onToggleCard(cardId)}
            className="h-3.5 w-3.5 rounded border-border"
          />
          Section reviewed
        </label>
      </div>
    </FocusCard>
  );
}




