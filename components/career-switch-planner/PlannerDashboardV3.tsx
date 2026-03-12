'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PlannerCommandCenter from '@/components/career-switch-planner/PlannerCommandCenter'
import {
  AlternativesSection,
  AiSignalCard,
  buildTrainingCards,
  DifficultySection,
  FastestPathSection,
  GuestPreviewLimitSection,
  MarketSnapshotSection,
  OutreachSection,
  ProgressDashboardSection,
  RelatedToolsSection,
  RoadmapSection,
  RealityCheckSection,
  SkillsEvidenceSection,
  StickyExecutionPanel,
  TopSummaryStrip,
  TrainingSection,
  TrustFaqSection,
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
    () => {
      const persistedPhaseDefaults = model.progress.phases
        .filter((phase) => !phase.collapsed)
        .map((phase) => phase.id);

      return persistedPhaseDefaults.length > 0
        ? persistedPhaseDefaults
        : roadmapPhases.filter((phase) => phase.expandedByDefault).map((phase) => phase.id);
    },
    [model.progress.phases, roadmapPhases]
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
  const [lastTaskDelta, setLastTaskDelta] = useState<number | null>(null);
  const [hasHydratedProgressState, setHasHydratedProgressState] = useState(false);

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

  const toggleRoadmapPhase = (phaseId: string) => {
    setExpandedPhaseIds((previous) =>
      previous.includes(phaseId)
        ? previous.filter((item) => item !== phaseId)
        : [...previous, phaseId]
    );
  };

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
  const liveProgressToOffer =
    checklistImpactTotal + totalTrainingWeight > 0
      ? clampPercent(
          ((checklistImpactDone + completedTrainingWeight) / (checklistImpactTotal + totalTrainingWeight)) * 100
        )
      : 0;
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
  const lastTaskDeltaLabel =
    lastTaskDelta === null
      ? null
      : `${lastTaskDelta > 0 ? '+' : ''}${lastTaskDelta}% from the latest task.`;
  const topStripWelcomeLine =
    completedTaskCount > 0 || Object.keys(completedTrainingIds).length > 0
      ? `${liveProgressToOffer}% progress with ${completedTaskCount}/${totalTaskCount} roadmap tasks complete and ${Object.keys(completedTrainingIds).length}/${trainingCards.length} certifications tracked.`
      : `${liveProgressToOffer}% progress. Start the first roadmap checkpoint to build momentum.`;
  const topStripRecommendedAction = scenarioLeadAction ?? model.insights.welcomeBack.recommendedAction;

  return (
    <div className="space-y-[18px]">
      <TopSummaryStrip
        planScore={model.summaryStrip.planScore}
        welcomeLine={topStripWelcomeLine}
        recommendedAction={topStripRecommendedAction}
        confidenceTrend={model.summaryStrip.confidenceTrend}
        lastTaskDeltaLabel={lastTaskDeltaLabel}
        dataFreshness={model.summaryStrip.dataFreshness}
      />

      {hasDraftChanges ? (
        <div className="rounded-md border border-warning/25 bg-warning-light px-3 py-2 text-sm text-text-secondary">
          This report is from previous inputs.
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-[18px]">
          <PlannerCommandCenter
            hero={model.hero}
            selectedScenario={selectedScenario}
            onSelectScenario={setSelectedScenario}
          />

          <DifficultySection model={model} />

          <SkillsEvidenceSection model={model} />

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
          />

          {isGuestPreview ? (
            <GuestPreviewLimitSection />
          ) : (
            <>
              <FastestPathSection
                model={model}
                primaryScenarioTitle={primaryScenarioTitle}
                primaryScenarioSteps={primaryScenarioSteps}
                secondaryScenarioTitle={secondaryScenarioTitle}
                secondaryScenarioSteps={secondaryScenarioSteps}
              />
              <TrainingSection
                model={model}
                trainingCards={trainingCards}
                completedTrainingIds={completedTrainingIds}
                onToggleTrainingCard={toggleTrainingCard}
              />
              <MarketSnapshotSection model={model} />
              <OutreachSection
                readinessChecks={readinessChecks}
                outreachTracker={outreachTracker}
                suggestedOutreachTarget={
                  `${Math.max(10, Math.round(liveProgressToOffer * 0.45) + 8)} targeted outreach messages`
                }
                resumeToolkitDraft={resumeToolkitDraft}
                emailToolkitDraft={emailToolkitDraft}
                callToolkitDraft={callToolkitDraft}
                onOutreachTrackerChange={onOutreachTrackerChange}
                onResumeToolkitDraftChange={onResumeToolkitDraftChange}
                onEmailToolkitDraftChange={onEmailToolkitDraftChange}
                onCallToolkitDraftChange={onCallToolkitDraftChange}
              />
              <RealityCheckSection model={model} />
              <ProgressDashboardSection
                model={model}
                nowCompletion={nowCompletion}
                nowTasks={nowTasks}
                nextCompletion={nextCompletion}
                nextTasks={nextTasks}
                blockedTasks={blockedTasks}
                checkedTaskIds={checkedTaskIds}
              />
              <AlternativesSection model={model} onSelectAlternativeRole={onSelectAlternativeRole} />
              <TrustFaqSection faqItems={faqItems} methodology={model.methodology} />
              <RelatedToolsSection relatedTools={relatedTools} />
            </>
          )}
        </div>

        {!isGuestPreview ? (
          <div className="space-y-[14px] xl:sticky xl:top-4 xl:self-start">
            <AiSignalCard model={model} />
            <StickyExecutionPanel
              model={model}
              liveProgressToOffer={liveProgressToOffer}
              lastTaskDeltaLabel={lastTaskDeltaLabel}
              nextBestAction={scenarioLeadAction}
              stickyNextSteps={stickyNextSteps.length > 0 ? stickyNextSteps : model.stickyPanel.nextSteps}
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
