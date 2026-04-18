'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Action14DaySection,
  AdjacentEntryOptionsSection,
  AiSignalCard,
  BestRouteSection,
  BlockersSection,
  buildTrainingCards,
  CertificationsEducationSection,
  CollapsibleSection,
  DecisionHeader,
  GuestPreviewLimitSection,
  RequirementsGapsSection,
  RelatedToolsSection,
  ResumeEvidenceSection,
  RoadmapSection,
  SalaryMarketSection,
  SkillsBucketsSection,
  StickyExecutionPanel,
  TrustFaqSection,
  toChecklistKey,
} from '@/components/career-switch-planner/PlannerDashboardSections'
import type {
  PlannerDashboardTask,
  PlannerDashboardV3Model,
} from '@/lib/planner/v3Dashboard';

interface PlannerDashboardV3Props {
  model: PlannerDashboardV3Model;
  hasDraftChanges: boolean;
  isGuestPreview: boolean;
  faqItems: Array<{ question: string; answer: string }>;
  relatedTools: Array<{
    slug: string;
    title: string;
    description: string;
    icon: 'resume' | 'interview' | 'cover' | 'job' | 'planner';
    isActive?: boolean;
  }>;
  resumeToolkitDraft: string;
  emailToolkitDraft: string;
  callToolkitDraft: string;
  outreachTracker: {
    sent: string;
    replies: string;
    positiveReplies: string;
    nextFollowUpDate: string;
  };
  onEditInputs: () => void;
  onRegenerate: () => void;
  onStartNewPlan: () => void;
  onSelectAlternativeRole: (title: string) => void;
  onResumeToolkitDraftChange: (value: string) => void;
  onEmailToolkitDraftChange: (value: string) => void;
  onCallToolkitDraftChange: (value: string) => void;
  onOutreachTrackerChange: (
    key: 'sent' | 'replies' | 'positiveReplies' | 'nextFollowUpDate',
    value: string
  ) => void;
  onExportPlan: () => void;
  onDownloadPdf: () => void;
  onSavePlan: () => void;
  savePlanLabel?: string;
  progressStorageKey?: string | null;
  allowLocalProgressFallback?: boolean;
  initialProgressState?: {
    checkedTaskIds?: Record<string, boolean>;
    expandedPhaseIds?: string[];
    completedTrainingIds?: Record<string, boolean>;
  } | null;
  onProgressStateChange?: (state: {
    checkedTaskIds: Record<string, boolean>;
    expandedPhaseIds: string[];
    completedTrainingIds: Record<string, boolean>;
    updatedAt: string;
  }) => void;
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function taskMatches(task: PlannerDashboardTask, pattern: RegExp) {
  return pattern.test(task.label.toLowerCase());
}

function deriveSuggestedOutreachTarget(
  phase:
    | PlannerDashboardV3Model['roadmap']['phases'][number]
    | null,
  tasks: PlannerDashboardTask[]
) {
  if (!phase) return '8 targeted outreach messages'

  const phaseText = [phase.title, phase.summary, phase.outcome, ...tasks.map((task) => task.label)]
    .join(' ')
    .toLowerCase()

  const explicitTargetMatch = phaseText.match(
    /\b(\d{1,2})\s+(targeted outreach messages|sponsor-ready employers|outreach check-ins)\b/
  )
  if (explicitTargetMatch) {
    return `${explicitTargetMatch[1]} ${explicitTargetMatch[2]}`
  }

  if (/\b(job search|outreach|follow[- ]?up|application|apply|interview)\b/.test(phaseText)) {
    return '20 targeted outreach messages'
  }

  if (/\b(sponsor|registration|entry route|entry and sponsorship|helper|labourer|laborer|contractor|employer)\b/.test(phaseText)) {
    return '10 sponsor-ready employers'
  }

  if (/\b(training|school|credential|qualification|exam|certif|hours|apprenticeship loop)\b/.test(phaseText)) {
    return '5 outreach check-ins'
  }

  return '8 targeted outreach messages'
}

const ACTIONABLE_CARD_IDS = {
  hero: 'card-hero-summary',
  action14: 'card-14-day-action',
  bestRoute: 'card-best-route',
  blockers: 'card-blockers',
  requirements: 'card-requirements-gaps',
  skills: 'card-skills',
  certifications: 'card-certifications-education',
  resumeEvidence: 'card-resume-evidence',
  adjacent: 'card-adjacent-entry-options',
  salaryMarket: 'card-salary-market',
  roadmap: 'card-longer-term-roadmap',
} as const

export function PlannerDashboardV3({
  model,
  hasDraftChanges,
  isGuestPreview,
  faqItems,
  relatedTools,
  resumeToolkitDraft,
  emailToolkitDraft,
  callToolkitDraft,
  outreachTracker,
  onEditInputs,
  onRegenerate,
  onStartNewPlan,
  onSelectAlternativeRole,
  onResumeToolkitDraftChange,
  onEmailToolkitDraftChange,
  onCallToolkitDraftChange,
  onOutreachTrackerChange,
  onExportPlan,
  onDownloadPdf,
  onSavePlan,
  savePlanLabel = 'Save Plan',
  progressStorageKey,
  allowLocalProgressFallback = false,
  initialProgressState,
  onProgressStateChange,
}: PlannerDashboardV3Props) {
  const scenarioLabels = useMemo(
    () => model.hero.scenarioModes.map((mode) => mode.label),
    [model.hero.scenarioModes]
  );
  const [selectedScenario, setSelectedScenario] = useState<string>(scenarioLabels[0] ?? 'Fastest');
  const roadmapPhases = useMemo(() => model.roadmap.phases.slice(0, 4), [model.roadmap.phases]);
  const roadmapTasks = useMemo(() => model.progress.tasks, [model.progress.tasks]);
  const roadmapTaskMap = useMemo(
    () => new Map(roadmapTasks.map((task) => [task.id, task])),
    [roadmapTasks]
  );
  const phaseTaskMap = useMemo(
    () =>
      new Map(
        roadmapPhases.map((phase) => [
          phase.id,
          roadmapTasks.filter((task) => task.phaseId === phase.id),
        ])
      ),
    [roadmapPhases, roadmapTasks]
  );
  const defaultExpandedPhaseIds = useMemo(
    () => roadmapPhases.map((phase) => phase.id),
    [roadmapPhases]
  );
  const defaultCheckedTaskIds = useMemo(
    () =>
      Object.fromEntries(roadmapTasks.map((task) => [task.id, task.checked])),
    [roadmapTasks]
  );
  const roadmapTaskIds = useMemo(() => roadmapTasks.map((task) => task.id), [roadmapTasks]);
  const roadmapPhaseIds = useMemo(() => roadmapPhases.map((phase) => phase.id), [roadmapPhases]);
  const trainingCourseIds = useMemo(
    () => model.training.courses.map((course) => course.id),
    [model.training.courses]
  );
  const action14ThisWeek = useMemo(
    () =>
      model.actionWindow14.thisWeek.length > 0
        ? model.actionWindow14.thisWeek.slice(0, 4)
        : model.checklist.immediate.slice(0, 4),
    [model.actionWindow14.thisWeek, model.checklist.immediate]
  );
  const action14NextWeek = useMemo(
    () =>
      model.actionWindow14.nextWeek.length > 0
        ? model.actionWindow14.nextWeek.slice(0, 4)
        : model.checklist.shortTerm.slice(0, 4),
    [model.actionWindow14.nextWeek, model.checklist.shortTerm]
  );
  const action14Proof = useMemo(
    () =>
      model.actionWindow14.proofToCollect.length > 0
        ? model.actionWindow14.proofToCollect.slice(0, 4)
        : model.resumeEvidence.stillNeedsProof.slice(0, 4),
    [model.actionWindow14.proofToCollect, model.resumeEvidence.stillNeedsProof]
  );
  const bestRouteSequence = useMemo(() => model.fastestPath.steps.slice(0, 4), [model.fastestPath.steps]);
  const actionableCardIds = useMemo(
    () => [
      ACTIONABLE_CARD_IDS.hero,
      ACTIONABLE_CARD_IDS.action14,
      ACTIONABLE_CARD_IDS.bestRoute,
      ACTIONABLE_CARD_IDS.blockers,
      ACTIONABLE_CARD_IDS.requirements,
      ACTIONABLE_CARD_IDS.skills,
      ACTIONABLE_CARD_IDS.certifications,
      ACTIONABLE_CARD_IDS.resumeEvidence,
      ACTIONABLE_CARD_IDS.adjacent,
      ACTIONABLE_CARD_IDS.salaryMarket,
      ACTIONABLE_CARD_IDS.roadmap,
    ],
    []
  );
  const actionableItemIds = useMemo(() => {
    const ids: string[] = [];

    action14ThisWeek.forEach((item, idx) => ids.push(toChecklistKey('action-14-day', 'this-week', idx, item)));
    action14NextWeek.forEach((item, idx) => ids.push(toChecklistKey('action-14-day', 'next-week', idx, item)));
    action14Proof.forEach((item, idx) => ids.push(toChecklistKey('action-14-day', 'proof-to-collect', idx, item)));
    ids.push(
      toChecklistKey(
        'action-priority',
        'apply-first',
        model.adjacentEntryOptions.fastestEntry?.title || model.decision.targetRole
      ),
      toChecklistKey(
        'action-priority',
        'first-credential',
        model.certEducation.required[0] || model.certEducation.recommended[0] || 'Confirm required entry credential'
      ),
      toChecklistKey(
        'action-priority',
        'first-proof',
        action14Proof[0] || model.resumeEvidence.stillNeedsProof[0] || 'Collect one role-relevant proof artifact'
      )
    );

    ids.push(toChecklistKey('best-route', 'entry-strategy', model.fastestPath.bestEntryStrategy));
    bestRouteSequence.forEach((step, idx) =>
      ids.push(toChecklistKey('best-route', 'sequence', idx, step.label, step.detail))
    );

    model.blockers.slice(0, 4).forEach((item, idx) =>
      ids.push(toChecklistKey('blockers', idx, item.blocker))
    );
    model.requirementsGaps.mustHave.slice(0, 5).forEach((item, idx) =>
      ids.push(toChecklistKey('requirements-gaps', 'must-have', idx, item))
    );
    model.requirementsGaps.niceToHave.slice(0, 5).forEach((item, idx) =>
      ids.push(toChecklistKey('requirements-gaps', 'nice-to-have', idx, item))
    );
    model.requirementsGaps.missingNow.slice(0, 5).forEach((item, idx) =>
      ids.push(toChecklistKey('requirements-gaps', 'missing-right-now', idx, item))
    );
    model.skillsBuckets.alreadyHave.slice(0, 5).forEach((item, idx) =>
      ids.push(toChecklistKey('skills-buckets', 'already-have', idx, item))
    );
    model.skillsBuckets.needSoon.slice(0, 5).forEach((item, idx) =>
      ids.push(toChecklistKey('skills-buckets', 'need-soon', idx, item))
    );
    model.skillsBuckets.laterStage.slice(0, 5).forEach((item, idx) =>
      ids.push(toChecklistKey('skills-buckets', 'later-stage', idx, item))
    );
    model.certEducation.required.slice(0, 5).forEach((item, idx) =>
      ids.push(toChecklistKey('cert-education', 'required', idx, item))
    );
    model.certEducation.recommended.slice(0, 5).forEach((item, idx) =>
      ids.push(toChecklistKey('cert-education', 'recommended', idx, item))
    );
    model.certEducation.optional.slice(0, 5).forEach((item, idx) =>
      ids.push(toChecklistKey('cert-education', 'optional', idx, item))
    );
    model.resumeEvidence.alreadyProves.slice(0, 4).forEach((item, idx) =>
      ids.push(toChecklistKey('resume-evidence', 'already-proves', idx, item))
    );
    model.resumeEvidence.stillNeedsProof.slice(0, 4).forEach((item, idx) =>
      ids.push(toChecklistKey('resume-evidence', 'still-needs-proof', idx, item))
    );
    model.resumeEvidence.artifacts.slice(0, 4).forEach((item, idx) =>
      ids.push(toChecklistKey('resume-evidence', 'artifacts-to-add', idx, item))
    );

    ids.push(
      toChecklistKey('adjacent-entry-options', 'fastest-entry', model.adjacentEntryOptions.fastestEntry?.title),
      toChecklistKey('adjacent-entry-options', 'closest-match', model.adjacentEntryOptions.closestMatch?.title),
      toChecklistKey(
        'adjacent-entry-options',
        'best-long-term-upside',
        model.adjacentEntryOptions.bestLongTermUpside?.title
      )
    );

    ['Entry pay', 'Long-term pay', 'Market demand', 'Hiring environment'].forEach((label) =>
      ids.push(toChecklistKey('salary-market', label))
    );

    return Array.from(new Set(ids.filter(Boolean)));
  }, [
    action14NextWeek,
    action14Proof,
    action14ThisWeek,
    bestRouteSequence,
    model.adjacentEntryOptions.bestLongTermUpside?.title,
    model.adjacentEntryOptions.closestMatch?.title,
    model.adjacentEntryOptions.fastestEntry?.title,
    model.blockers,
    model.certEducation,
    model.decision.targetRole,
    model.fastestPath.bestEntryStrategy,
    model.requirementsGaps.missingNow,
    model.requirementsGaps.mustHave,
    model.requirementsGaps.niceToHave,
    model.resumeEvidence.alreadyProves,
    model.resumeEvidence.artifacts,
    model.resumeEvidence.stillNeedsProof,
    model.skillsBuckets.alreadyHave,
    model.skillsBuckets.laterStage,
    model.skillsBuckets.needSoon,
  ]);
  const defaultCheckedCardIds = useMemo(
    () => Object.fromEntries(actionableCardIds.map((cardId) => [cardId, false])),
    [actionableCardIds]
  );
  const defaultCheckedItemIds = useMemo(
    () => Object.fromEntries(actionableItemIds.map((itemId) => [itemId, false])),
    [actionableItemIds]
  );
  const actionableCardIdsSignature = actionableCardIds.join('|');
  const actionableItemIdsSignature = actionableItemIds.join('|');
  const actionChecklistStorageKey = useMemo(
    () =>
      `${progressStorageKey ?? 'planner-action-checklist'}:${toChecklistKey(
        model.summaryBar.currentRole,
        model.summaryBar.targetRole,
        model.summaryBar.timeline,
        model.summaryBar.location
      )}`,
    [
      model.summaryBar.currentRole,
      model.summaryBar.location,
      model.summaryBar.targetRole,
      model.summaryBar.timeline,
      progressStorageKey,
    ]
  );
  const defaultExpandedPhaseIdsSignature = defaultExpandedPhaseIds.join('|');
  const defaultCheckedTaskIdsSignature = roadmapTasks
    .map((task) => `${task.id}:${task.checked ? '1' : '0'}`)
    .join('|');
  const roadmapTaskIdsSignature = roadmapTaskIds.join('|');
  const roadmapPhaseIdsSignature = roadmapPhaseIds.join('|');
  const trainingCourseIdsSignature = trainingCourseIds.join('|');
  const initialProgressStateSignature = JSON.stringify(initialProgressState ?? null);
  const hydrationSnapshotRef = useRef({
    defaultCheckedTaskIds,
    defaultExpandedPhaseIds,
    initialProgressState,
    roadmapPhaseIds,
    roadmapTaskIds,
    trainingCourseIds,
  });
  hydrationSnapshotRef.current = {
    defaultCheckedTaskIds,
    defaultExpandedPhaseIds,
    initialProgressState,
    roadmapPhaseIds,
    roadmapTaskIds,
    trainingCourseIds,
  };
  const [expandedPhaseIds, setExpandedPhaseIds] = useState<string[]>(defaultExpandedPhaseIds);
  const [checkedTaskIds, setCheckedTaskIds] =
    useState<Record<string, boolean>>(defaultCheckedTaskIds);
  const [completedTrainingIds, setCompletedTrainingIds] = useState<Record<string, boolean>>({});
  const [checkedCardIds, setCheckedCardIds] =
    useState<Record<string, boolean>>(defaultCheckedCardIds);
  const [checkedItemIds, setCheckedItemIds] =
    useState<Record<string, boolean>>(defaultCheckedItemIds);
  const [lastTaskDelta, setLastTaskDelta] = useState<number | null>(null);
  const [hasHydratedProgressState, setHasHydratedProgressState] = useState(false);
  const [hasHydratedActionChecklist, setHasHydratedActionChecklist] = useState(false);

  useEffect(() => {
    if (scenarioLabels.length === 0) return;
    if (!scenarioLabels.includes(selectedScenario)) {
      setSelectedScenario(scenarioLabels[0]);
    }
  }, [scenarioLabels, selectedScenario]);

  useEffect(() => {
    const {
      defaultCheckedTaskIds,
      defaultExpandedPhaseIds,
      initialProgressState,
      roadmapPhaseIds,
      roadmapTaskIds,
      trainingCourseIds,
    } = hydrationSnapshotRef.current;

    setExpandedPhaseIds(defaultExpandedPhaseIds);
    setCheckedTaskIds(defaultCheckedTaskIds);
    setCompletedTrainingIds({});
    setLastTaskDelta(null);
    setHasHydratedProgressState(false);

    if (initialProgressState) {
      if (initialProgressState.checkedTaskIds) {
        const taskIds = new Set(roadmapTaskIds);
        const nextCheckedTaskIds = { ...defaultCheckedTaskIds };
        for (const [taskId, checked] of Object.entries(initialProgressState.checkedTaskIds)) {
          if (taskIds.has(taskId)) nextCheckedTaskIds[taskId] = Boolean(checked);
        }
        setCheckedTaskIds(nextCheckedTaskIds);
      }

      if (Array.isArray(initialProgressState.expandedPhaseIds)) {
        const phaseIds = new Set(roadmapPhaseIds);
        setExpandedPhaseIds(initialProgressState.expandedPhaseIds.filter((phaseId) => phaseIds.has(phaseId)));
      }

      if (initialProgressState.completedTrainingIds) {
        const trainingIds = new Set(trainingCourseIds);
        const nextCompletedTrainingIds: Record<string, boolean> = {};
        for (const [trainingId, checked] of Object.entries(initialProgressState.completedTrainingIds)) {
          if (trainingIds.has(trainingId) && checked) nextCompletedTrainingIds[trainingId] = true;
        }
        setCompletedTrainingIds(nextCompletedTrainingIds);
      }

      setHasHydratedProgressState(true);
      return;
    }

    if (!allowLocalProgressFallback || !progressStorageKey || typeof window === 'undefined') {
      setHasHydratedProgressState(true);
      return;
    }

    try {
      const raw = window.localStorage.getItem(progressStorageKey);
      if (!raw) {
        setHasHydratedProgressState(true);
        return;
      }

      const parsed = JSON.parse(raw) as {
        checkedTaskIds?: Record<string, boolean>;
        expandedPhaseIds?: string[];
        completedTrainingIds?: Record<string, boolean>;
      };

      if (parsed.checkedTaskIds) {
        const taskIds = new Set(roadmapTaskIds);
        const nextCheckedTaskIds = { ...defaultCheckedTaskIds };
        for (const [taskId, checked] of Object.entries(parsed.checkedTaskIds)) {
          if (taskIds.has(taskId)) nextCheckedTaskIds[taskId] = Boolean(checked);
        }
        setCheckedTaskIds(nextCheckedTaskIds);
      }

      if (Array.isArray(parsed.expandedPhaseIds)) {
        const phaseIds = new Set(roadmapPhaseIds);
        setExpandedPhaseIds(parsed.expandedPhaseIds.filter((phaseId) => phaseIds.has(phaseId)));
      }

      if (parsed.completedTrainingIds) {
        const trainingIds = new Set(trainingCourseIds);
        const nextCompletedTrainingIds: Record<string, boolean> = {};
        for (const [trainingId, checked] of Object.entries(parsed.completedTrainingIds)) {
          if (trainingIds.has(trainingId) && checked) nextCompletedTrainingIds[trainingId] = true;
        }
        setCompletedTrainingIds(nextCompletedTrainingIds);
      }
    } catch {
      // ignore corrupted local progress state
    } finally {
      setHasHydratedProgressState(true);
    }
  }, [
    allowLocalProgressFallback,
    defaultCheckedTaskIdsSignature,
    defaultExpandedPhaseIdsSignature,
    initialProgressStateSignature,
    progressStorageKey,
    roadmapPhaseIdsSignature,
    roadmapTaskIdsSignature,
    trainingCourseIdsSignature,
  ]);

  useEffect(() => {
    if (!hasHydratedProgressState || !allowLocalProgressFallback || !progressStorageKey || typeof window === 'undefined') return;

    try {
      window.localStorage.setItem(
        progressStorageKey,
        JSON.stringify({
          checkedTaskIds,
          expandedPhaseIds,
          completedTrainingIds,
          updatedAt: new Date().toISOString(),
        })
      );
    } catch {
      // ignore storage failures
    }
  }, [
    checkedTaskIds,
    expandedPhaseIds,
    completedTrainingIds,
    hasHydratedProgressState,
    allowLocalProgressFallback,
    progressStorageKey,
  ]);

  useEffect(() => {
    if (!hasHydratedProgressState || !onProgressStateChange) return;
    onProgressStateChange({
      checkedTaskIds,
      expandedPhaseIds,
      completedTrainingIds,
      updatedAt: new Date().toISOString()
    });
  }, [checkedTaskIds, expandedPhaseIds, completedTrainingIds, hasHydratedProgressState, onProgressStateChange]);

  useEffect(() => {
    setCheckedCardIds(defaultCheckedCardIds);
    setCheckedItemIds(defaultCheckedItemIds);
    setHasHydratedActionChecklist(false);

    if (typeof window === 'undefined') {
      setHasHydratedActionChecklist(true);
      return;
    }

    try {
      const raw = window.localStorage.getItem(actionChecklistStorageKey);
      if (!raw) {
        setHasHydratedActionChecklist(true);
        return;
      }

      const parsed = JSON.parse(raw) as {
        checkedCardIds?: Record<string, boolean>;
        checkedItemIds?: Record<string, boolean>;
      };

      if (parsed.checkedCardIds) {
        const nextCheckedCardIds = { ...defaultCheckedCardIds };
        const cardIds = new Set(actionableCardIds);
        for (const [cardId, checked] of Object.entries(parsed.checkedCardIds)) {
          if ((cardIds as Set<string>).has(cardId)) (nextCheckedCardIds as Record<string, boolean>)[cardId] = Boolean(checked);
        }
        setCheckedCardIds(nextCheckedCardIds);
      }

      if (parsed.checkedItemIds) {
        const nextCheckedItemIds = { ...defaultCheckedItemIds };
        const itemIds = new Set(actionableItemIds);
        for (const [itemId, checked] of Object.entries(parsed.checkedItemIds)) {
          if (itemIds.has(itemId)) nextCheckedItemIds[itemId] = Boolean(checked);
        }
        setCheckedItemIds(nextCheckedItemIds);
      }
    } catch {
      // ignore corrupted action checklist state
    } finally {
      setHasHydratedActionChecklist(true);
    }
  }, [
    actionChecklistStorageKey,
    actionableCardIds,
    actionableCardIdsSignature,
    actionableItemIds,
    actionableItemIdsSignature,
    defaultCheckedCardIds,
    defaultCheckedItemIds,
  ]);

  useEffect(() => {
    if (!hasHydratedActionChecklist || typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(
        actionChecklistStorageKey,
        JSON.stringify({
          checkedCardIds,
          checkedItemIds,
          updatedAt: new Date().toISOString(),
        })
      );
    } catch {
      // ignore action checklist persistence failures
    }
  }, [actionChecklistStorageKey, checkedCardIds, checkedItemIds, hasHydratedActionChecklist]);

  const toggleRoadmapPhase = (phaseId: string) => {
    setExpandedPhaseIds((previous) =>
      previous.includes(phaseId)
      ? previous.filter((item) => item !== phaseId)
      : [...previous, phaseId]
    );
  };

  const toggleCardChecklist = useCallback((cardId: string) => {
    setCheckedCardIds((previous) => ({
      ...previous,
      [cardId]: !previous[cardId],
    }));
  }, []);

  const toggleItemChecklist = useCallback((itemId: string) => {
    setCheckedItemIds((previous) => ({
      ...previous,
      [itemId]: !previous[itemId],
    }));
  }, []);

  const trainingCards = buildTrainingCards(model.training.courses);
  const toggleTrainingCard = (trainingId: string) => {
    setCompletedTrainingIds((previous) => {
      const nextCheckedValue = !previous[trainingId];
      const next = {
        ...previous,
        [trainingId]: nextCheckedValue,
      };
      if (!nextCheckedValue) delete next[trainingId];
      setLastTaskDelta(nextCheckedValue ? 2 : -2);
      return next;
    });
  };
  const toggleChecklistTask = (taskId: string) => {
    const task = roadmapTaskMap.get(taskId);
    if (!task) return;

    setCheckedTaskIds((previous) => {
      const nextCheckedValue = !previous[taskId];
      const next = {
        ...previous,
        [taskId]: nextCheckedValue,
      };

      const phaseTasks = phaseTaskMap.get(task.phaseId) ?? [];
      const wasComplete =
        phaseTasks.length > 0 && phaseTasks.every((phaseTask) => Boolean(previous[phaseTask.id]));
      const isComplete =
        phaseTasks.length > 0 && phaseTasks.every((phaseTask) => Boolean(next[phaseTask.id]));

      if (!wasComplete && isComplete) {
        setExpandedPhaseIds((previousExpanded) =>
          previousExpanded.filter((phaseId) => phaseId !== task.phaseId)
        );
      }

      setLastTaskDelta(nextCheckedValue ? task.weight : -task.weight);
      return next;
    });
  };

  const completionForTasks = useCallback((tasks: PlannerDashboardTask[]) => {
    if (tasks.length === 0) return 0;
    const totalWeight = tasks.reduce((sum, task) => sum + task.weight, 0);
    const checkedWeight = tasks.reduce(
      (sum, task) => sum + (checkedTaskIds[task.id] ? task.weight : 0),
      0
    );
    return totalWeight > 0 ? Math.round((checkedWeight / totalWeight) * 100) : 0;
  }, [checkedTaskIds]);

  const nowTasks = useMemo(
    () => roadmapTasks.filter((task) => task.category === 'now'),
    [roadmapTasks]
  );
  const nextTasks = useMemo(
    () => roadmapTasks.filter((task) => task.category === 'next'),
    [roadmapTasks]
  );
  const blockedTasks = useMemo(
    () => roadmapTasks.filter((task) => task.category === 'blocked'),
    [roadmapTasks]
  );
  const nowCompletion = completionForTasks(nowTasks);
  const nextCompletion = completionForTasks(nextTasks);
  const completedTaskCount = useMemo(
    () => roadmapTasks.filter((task) => checkedTaskIds[task.id]).length,
    [checkedTaskIds, roadmapTasks]
  );
  const totalTaskCount = roadmapTasks.length;
  const completedCardCount = useMemo(
    () => actionableCardIds.filter((cardId) => Boolean(checkedCardIds[cardId])).length,
    [actionableCardIds, checkedCardIds]
  );
  const completedActionItemCount = useMemo(
    () => actionableItemIds.filter((itemId) => Boolean(checkedItemIds[itemId])).length,
    [actionableItemIds, checkedItemIds]
  );
  const totalActionChecklistCount = actionableCardIds.length + actionableItemIds.length;
  const actionableChecklistPercent =
    totalActionChecklistCount > 0
      ? clampPercent(((completedCardCount + completedActionItemCount) / totalActionChecklistCount) * 100)
      : 0;
  const checklistImpactTotal = roadmapTasks.reduce((sum, task) => sum + task.weight, 0);
  const checklistImpactDone = roadmapTasks.reduce(
    (sum, task) => sum + (checkedTaskIds[task.id] ? task.weight : 0),
    0
  );
  const totalTrainingWeight = trainingCards.length * 2;
  const completedTrainingWeight = trainingCards.reduce(
    (sum, card) => sum + (completedTrainingIds[card.id] ? 2 : 0),
    0
  );
  const roadmapExecutionPercent =
    checklistImpactTotal + totalTrainingWeight > 0
      ? clampPercent(
          ((checklistImpactDone + completedTrainingWeight) / (checklistImpactTotal + totalTrainingWeight)) * 100
        )
      : 0;
  const liveProgressToOffer = clampPercent(roadmapExecutionPercent * 0.7 + actionableChecklistPercent * 0.3);
  const stickyNextSteps = roadmapTasks
    .filter((task) => !checkedTaskIds[task.id])
    .map((task) => task.label)
    .slice(0, 4);
  if (stickyNextSteps.length < 4) {
    trainingCards
      .filter((card) => !completedTrainingIds[card.id])
      .map((card) => `Complete ${card.name}`)
      .slice(0, 4 - stickyNextSteps.length)
      .forEach((item) => stickyNextSteps.push(item));
  }
  const selectedScenarioKey = selectedScenario.toLowerCase();
  const primaryScenarioSteps =
    selectedScenarioKey === 'low risk' ? model.fastestPath.strongestPath : model.fastestPath.steps;
  const secondaryScenarioSteps =
    selectedScenarioKey === 'fastest' ? model.fastestPath.strongestPath : model.fastestPath.steps;
  const primaryScenarioTitle =
    selectedScenarioKey === 'fastest'
      ? 'Fastest Path to Apply'
      : selectedScenarioKey === 'low risk'
        ? 'Lower-Risk Path'
        : 'Balanced Path';
  const secondaryScenarioTitle =
    selectedScenarioKey === 'fastest' ? 'Strong Candidate Path' : 'Fastest Route';
  const scenarioLeadAction =
    selectedScenarioKey === 'low risk'
      ? blockedTasks.find((task) => !checkedTaskIds[task.id])?.label ||
        model.fastestPath.strongestPath[0]?.detail ||
        model.stickyPanel.nextBestAction
      : selectedScenarioKey === 'balanced'
        ? model.fastestPath.strongestPath[0]?.detail ||
          stickyNextSteps[0] ||
          model.stickyPanel.nextBestAction
        : stickyNextSteps[0] || model.stickyPanel.nextBestAction;
  const readinessChecks = useMemo(
    () => [
      {
        label: 'Resume evidence ready',
        complete:
          roadmapTasks.some(
            (task) =>
              checkedTaskIds[task.id] &&
              taskMatches(task, /\b(resume|proof|project|artifact|portfolio|story)\b/)
          ) || liveProgressToOffer >= 35,
        helper: 'Show role-fit evidence before broad outreach.'
      },
      {
        label: 'Required credential started',
        complete: roadmapTasks.some(
          (task) =>
            checkedTaskIds[task.id] &&
            taskMatches(task, /\b(cert|credential|course|training|license|licen|exam|whmis|cpr|safety)\b/)
        ) || Object.keys(completedTrainingIds).length > 0,
        helper: 'Training and license motion reduces employer hesitation.'
      },
      {
        label: 'Target employers shortlisted',
        complete: roadmapTasks.some(
          (task) =>
            checkedTaskIds[task.id] &&
            taskMatches(task, /\b(employer|outreach|application|contractor|follow-up|job search)\b/)
        ),
        helper: 'You are ready to outreach once a shortlist exists.'
      }
    ],
    [checkedTaskIds, completedTrainingIds, liveProgressToOffer, roadmapTasks]
  );
  const phaseStats = useMemo(
    () =>
      new Map(
        roadmapPhases.map((phase) => {
          const tasks = phaseTaskMap.get(phase.id) ?? [];
          const checkedCount = tasks.filter((task) => checkedTaskIds[task.id]).length;
          const totalCount = tasks.length;
          const completed = totalCount > 0 && checkedCount === totalCount;
          const isExpanded = expandedPhaseIds.includes(phase.id);

          return [
            phase.id,
            {
              tasks,
              checkedCount,
              totalCount,
              completed,
              completionPercent: completionForTasks(tasks),
              statusLabel: completed ? 'Done' : isExpanded ? 'In progress' : 'Quick view',
              isExpanded,
            },
          ];
        })
      ),
    [checkedTaskIds, completionForTasks, expandedPhaseIds, phaseTaskMap, roadmapPhases]
  );
  const activeRoadmapPhase =
    roadmapPhases.find((phase) => {
      const phaseState = phaseStats.get(phase.id)
      return phaseState && !phaseState.completed
    }) ??
    roadmapPhases[roadmapPhases.length - 1] ??
    null
  const suggestedOutreachTarget = useMemo(
    () =>
      deriveSuggestedOutreachTarget(
        activeRoadmapPhase,
        activeRoadmapPhase ? phaseStats.get(activeRoadmapPhase.id)?.tasks ?? [] : []
      ),
    [activeRoadmapPhase, phaseStats]
  )
  const lastTaskDeltaLabel =
    lastTaskDelta === null
      ? null
      : `${lastTaskDelta > 0 ? '+' : ''}${lastTaskDelta}% from the latest task.`;
  return (
    <div className="space-y-4 md:space-y-5">
      {hasDraftChanges ? (
        <div className="rounded-md border border-warning/25 bg-warning-light px-3 py-2 text-sm text-text-secondary">
          This report is from previous inputs.
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-4 md:space-y-5">
          <DecisionHeader
            model={model}
            heroCardChecked={Boolean(checkedCardIds[ACTIONABLE_CARD_IDS.hero])}
            onToggleHeroCard={() => toggleCardChecklist(ACTIONABLE_CARD_IDS.hero)}
          />

          <Action14DaySection
            model={model}
            cardId={ACTIONABLE_CARD_IDS.action14}
            isCardChecked={Boolean(checkedCardIds[ACTIONABLE_CARD_IDS.action14])}
            onToggleCard={toggleCardChecklist}
            isItemChecked={(itemId) => Boolean(checkedItemIds[itemId])}
            onToggleItem={toggleItemChecklist}
          />

          <BestRouteSection
            model={model}
            primaryScenarioSteps={primaryScenarioSteps}
            cardId={ACTIONABLE_CARD_IDS.bestRoute}
            isCardChecked={Boolean(checkedCardIds[ACTIONABLE_CARD_IDS.bestRoute])}
            onToggleCard={toggleCardChecklist}
            isItemChecked={(itemId) => Boolean(checkedItemIds[itemId])}
            onToggleItem={toggleItemChecklist}
          />

          {isGuestPreview ? (
            <GuestPreviewLimitSection />
          ) : (
            <>
              <BlockersSection
                model={model}
                cardId={ACTIONABLE_CARD_IDS.blockers}
                isCardChecked={Boolean(checkedCardIds[ACTIONABLE_CARD_IDS.blockers])}
                onToggleCard={toggleCardChecklist}
                isItemChecked={(itemId) => Boolean(checkedItemIds[itemId])}
                onToggleItem={toggleItemChecklist}
              />

              <AdjacentEntryOptionsSection
                model={model}
                onSelectAlternativeRole={onSelectAlternativeRole}
                cardId={ACTIONABLE_CARD_IDS.adjacent}
                isCardChecked={Boolean(checkedCardIds[ACTIONABLE_CARD_IDS.adjacent])}
                onToggleCard={toggleCardChecklist}
                isItemChecked={(itemId) => Boolean(checkedItemIds[itemId])}
                onToggleItem={toggleItemChecklist}
              />

              <SalaryMarketSection
                model={model}
                cardId={ACTIONABLE_CARD_IDS.salaryMarket}
                isCardChecked={Boolean(checkedCardIds[ACTIONABLE_CARD_IDS.salaryMarket])}
                onToggleCard={toggleCardChecklist}
                isItemChecked={(itemId) => Boolean(checkedItemIds[itemId])}
                onToggleItem={toggleItemChecklist}
              />

              <CollapsibleSection
                title="Gaps to close"
                subtitle="Requirements, skills, certifications, and resume evidence — expand to drill in."
              >
                <div className="space-y-4">
                  <RequirementsGapsSection
                    model={model}
                    cardId={ACTIONABLE_CARD_IDS.requirements}
                    isCardChecked={Boolean(checkedCardIds[ACTIONABLE_CARD_IDS.requirements])}
                    onToggleCard={toggleCardChecklist}
                    isItemChecked={(itemId) => Boolean(checkedItemIds[itemId])}
                    onToggleItem={toggleItemChecklist}
                  />
                  <SkillsBucketsSection
                    model={model}
                    cardId={ACTIONABLE_CARD_IDS.skills}
                    isCardChecked={Boolean(checkedCardIds[ACTIONABLE_CARD_IDS.skills])}
                    onToggleCard={toggleCardChecklist}
                    isItemChecked={(itemId) => Boolean(checkedItemIds[itemId])}
                    onToggleItem={toggleItemChecklist}
                  />
                  <CertificationsEducationSection
                    model={model}
                    trainingCards={trainingCards}
                    completedTrainingIds={completedTrainingIds}
                    onToggleTrainingCard={toggleTrainingCard}
                    cardId={ACTIONABLE_CARD_IDS.certifications}
                    isCardChecked={Boolean(checkedCardIds[ACTIONABLE_CARD_IDS.certifications])}
                    onToggleCard={toggleCardChecklist}
                    isItemChecked={(itemId) => Boolean(checkedItemIds[itemId])}
                    onToggleItem={toggleItemChecklist}
                  />
                  <ResumeEvidenceSection
                    model={model}
                    cardId={ACTIONABLE_CARD_IDS.resumeEvidence}
                    isCardChecked={Boolean(checkedCardIds[ACTIONABLE_CARD_IDS.resumeEvidence])}
                    onToggleCard={toggleCardChecklist}
                    isItemChecked={(itemId) => Boolean(checkedItemIds[itemId])}
                    onToggleItem={toggleItemChecklist}
                  />
                </div>
              </CollapsibleSection>

              <CollapsibleSection
                title="Longer-term roadmap"
                subtitle="0–30, 30–90, and 3–12 month checkpoints."
              >
                <RoadmapSection
                  roadmapPhases={roadmapPhases}
                  phaseStats={phaseStats}
                  checkedTaskIds={checkedTaskIds}
                  toggleRoadmapPhase={toggleRoadmapPhase}
                  toggleChecklistTask={toggleChecklistTask}
                  nowCompletion={nowCompletion}
                  nowTasks={nowTasks}
                  nextCompletion={nextCompletion}
                  blockedTasks={blockedTasks}
                  cardId={ACTIONABLE_CARD_IDS.roadmap}
                  isCardChecked={Boolean(checkedCardIds[ACTIONABLE_CARD_IDS.roadmap])}
                  onToggleCard={toggleCardChecklist}
                />
              </CollapsibleSection>

              <TrustFaqSection faqItems={faqItems} methodology={model.methodology} />
              <RelatedToolsSection relatedTools={relatedTools} />
            </>
          )}
        </div>

        {!isGuestPreview ? (
          <div className="space-y-4 xl:sticky xl:top-4 xl:self-start">
            <AiSignalCard model={model} />
            <StickyExecutionPanel
              model={model}
              liveProgressToOffer={liveProgressToOffer}
              lastTaskDeltaLabel={lastTaskDeltaLabel}
              nextBestAction={scenarioLeadAction}
              stickyNextSteps={stickyNextSteps.length > 0 ? stickyNextSteps : model.stickyPanel.nextSteps}
              isItemChecked={(itemId) => Boolean(checkedItemIds[itemId])}
              onToggleItem={toggleItemChecklist}
              savePlanLabel={savePlanLabel}
              onRegenerate={onRegenerate}
              onEditInputs={onEditInputs}
              onStartNewPlan={onStartNewPlan}
              onExportPlan={onExportPlan}
              onDownloadPdf={onDownloadPdf}
              onSavePlan={onSavePlan}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default PlannerDashboardV3;
