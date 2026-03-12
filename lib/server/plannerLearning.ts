import { createAdminClient } from '@/lib/supabase/admin'

type ProgressState = {
  checkedTaskIds?: Record<string, boolean>
  expandedPhaseIds?: string[]
  completedTrainingIds?: Record<string, boolean>
  outreachTracker?: {
    sent?: string
    replies?: string
    positiveReplies?: string
    nextFollowUpDate?: string
  }
  updatedAt?: string
}

type AnalyticsTask = {
  id: string
  label: string
  phaseId: string
}

type GenerationSnapshotArgs = {
  reportId: string
  userId: string
  input: {
    currentRole?: string
    targetRole?: string
    location?: string
    locationText?: string
    timeline?: string
    timelineBucket?: string
    workRegion?: string
    currentRoleText?: string
    targetRoleText?: string
  }
  report: Record<string, unknown>
  sourceEnrichment?: {
    sourcePath?: {
      training?: string
      wage?: string
    }
  } | null
}

type ProgressEventArgs = {
  reportId: string
  userId: string
  progress: ProgressState
}

type TransitionPriorContext = {
  sampleSize: number
  commonFirstTasks: string[]
  commonBlockers: string[]
  commonTrainingItems: string[]
  suggestedWeeklyOutreachTarget: number | null
  sourceCoverage: {
    trainingCuratedRate: number
    trainingWebRate: number
    wageTableRate: number
    wageWebRate: number
  }
} | null

type AggregationKey = {
  targetRoleKey: string
  provinceCode: string
  currentRoleCluster: string
}

type AggregationBucket = {
  key: AggregationKey
  reports: number
  firstTaskCounts: Map<string, number>
  blockerCounts: Map<string, number>
  trainingCounts: Map<string, number>
  outreachTargets: number[]
  trainingCuratedHits: number
  trainingWebHits: number
  wageTableHits: number
  wageWebHits: number
}

const PROVINCE_CODE_BY_NAME: Array<{ code: string; match: RegExp }> = [
  { code: 'ON', match: /\bontario\b/i },
  { code: 'BC', match: /\bbritish columbia\b/i },
  { code: 'AB', match: /\balberta\b/i },
  { code: 'SK', match: /\bsaskatchewan\b/i },
  { code: 'MB', match: /\bmanitoba\b/i },
  { code: 'QC', match: /\bquebec\b/i },
  { code: 'NB', match: /\bnew brunswick\b/i },
  { code: 'NS', match: /\bnova scotia\b/i },
  { code: 'PE', match: /\bprince edward island\b/i },
  { code: 'NL', match: /\bnewfoundland\b|\blabrador\b/i },
  { code: 'YT', match: /\byukon\b/i },
  { code: 'NT', match: /\bnorthwest territories\b/i },
  { code: 'NU', match: /\bnunavut\b/i }
]

function cleanText(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

export function normalizeRoleKey(value: string) {
  return cleanText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function inferProvinceCode(locationText: string) {
  const normalized = cleanText(locationText)
  for (const candidate of PROVINCE_CODE_BY_NAME) {
    if (candidate.match.test(normalized)) return candidate.code
  }
  return 'CA'
}

export function deriveRoleCluster(value: string) {
  const normalized = normalizeRoleKey(value)
  if (!normalized) return 'general'
  if (/\b(chef|cook|kitchen|restaurant|hospitality|server|bartender)\b/.test(normalized)) return 'hospitality'
  if (/\b(electric|plumb|hvac|weld|millwright|mechanic|trade|construction|carpent)\b/.test(normalized)) return 'trades'
  if (/\b(nurse|doctor|therap|chiropract|care|medical|clinical|patient)\b/.test(normalized)) return 'healthcare'
  if (/\b(dispatch|warehouse|forklift|ship|receiv|logistics|supply)\b/.test(normalized)) return 'logistics'
  if (/\b(admin|office|coordinator|operations|assistant|scheduler)\b/.test(normalized)) return 'office'
  if (/\b(developer|engineer|data|analyst|ux|designer|software|it)\b/.test(normalized)) return 'tech'
  if (/\b(teacher|education|tutor|instructor|coach)\b/.test(normalized)) return 'education'
  return 'general'
}

function uniqueStrings(values: string[]) {
  const seen = new Set<string>()
  const output: string[] = []
  for (const value of values) {
    const cleaned = cleanText(value)
    const key = normalizeRoleKey(cleaned)
    if (!cleaned || !key || seen.has(key)) continue
    seen.add(key)
    output.push(cleaned)
  }
  return output
}

function toStableTrainingId(value: string, fallbackIndex = 0) {
  const normalized = cleanText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return normalized ? `training-${normalized}` : `training-item-${fallbackIndex + 1}`
}

function parseNumericString(value: string | undefined) {
  if (!value) return null
  const digits = value.replace(/[^\d]/g, '')
  if (!digits) return null
  const parsed = Number.parseInt(digits, 10)
  return Number.isFinite(parsed) ? parsed : null
}

function topItems(map: Map<string, number>, limit = 3) {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([label]) => label)
}

function averageRounded(values: number[]) {
  if (values.length === 0) return null
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
}

function toArrayOfRecords(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    : []
}

function extractTaskCatalog(report: Record<string, unknown>) {
  const roadmapPlan =
    report.transitionSections &&
    typeof report.transitionSections === 'object' &&
    (report.transitionSections as Record<string, unknown>).roadmapPlan &&
    typeof (report.transitionSections as Record<string, unknown>).roadmapPlan === 'object'
      ? ((report.transitionSections as Record<string, unknown>).roadmapPlan as Record<string, unknown>)
      : null

  const phaseSources: Array<{ phaseId: string; items: Array<Record<string, unknown>> }> = [
    { phaseId: 'phase-1', items: toArrayOfRecords(roadmapPlan?.zeroToTwoWeeks) },
    { phaseId: 'phase-2', items: toArrayOfRecords(roadmapPlan?.oneToThreeMonths) },
    { phaseId: 'phase-3', items: toArrayOfRecords(roadmapPlan?.threeToTwelveMonths) }
  ]

  return phaseSources.flatMap(({ phaseId, items }) =>
    items
      .map((item, index) => {
        const label = cleanText(String(item.action ?? ''))
        if (!label) return null
        return {
          id: `${phaseId}:${index}:${normalizeRoleKey(label)}`,
          label,
          phaseId
        }
      })
      .filter((item): item is AnalyticsTask => Boolean(item))
  )
}

function extractBlockers(report: Record<string, unknown>) {
  const executionStrategy =
    report.executionStrategy && typeof report.executionStrategy === 'object'
      ? (report.executionStrategy as Record<string, unknown>)
      : null
  const probabilityRealityCheck =
    executionStrategy?.probabilityRealityCheck &&
    typeof executionStrategy.probabilityRealityCheck === 'object'
      ? (executionStrategy.probabilityRealityCheck as Record<string, unknown>)
      : null

  const blockers = Array.isArray(probabilityRealityCheck?.commonFailureModes)
    ? probabilityRealityCheck.commonFailureModes.map((item) => cleanText(String(item ?? '')))
    : []

  return uniqueStrings(blockers).slice(0, 6)
}

function extractTrainingTitles(report: Record<string, unknown>) {
  const sourceEnrichment =
    report.sourceEnrichment && typeof report.sourceEnrichment === 'object'
      ? (report.sourceEnrichment as Record<string, unknown>)
      : null
  const trainingCards = toArrayOfRecords(sourceEnrichment?.trainingCards).map((item) =>
    cleanText(String(item.name ?? ''))
  )
  const targetRequirements =
    report.targetRequirements && typeof report.targetRequirements === 'object'
      ? (report.targetRequirements as Record<string, unknown>)
      : null
  const certifications = Array.isArray(targetRequirements?.certifications)
    ? targetRequirements.certifications.map((item) => cleanText(String(item ?? '')))
    : []

  return uniqueStrings([...trainingCards, ...certifications]).slice(0, 6)
}

function extractCompletedTrainingLabels(args: {
  trainingTitles: string[]
  progressState: Record<string, unknown> | undefined
}) {
  const completedTrainingIds =
    args.progressState?.completedTrainingIds && typeof args.progressState.completedTrainingIds === 'object'
      ? (args.progressState.completedTrainingIds as Record<string, unknown>)
      : {}

  if (Object.keys(completedTrainingIds).length === 0 || args.trainingTitles.length === 0) return []

  const trainingIdToLabel = new Map(
    args.trainingTitles.map((title, index) => [toStableTrainingId(title, index), title] as const)
  )

  return uniqueStrings(
    Object.entries(completedTrainingIds)
      .filter(([, checked]) => Boolean(checked))
      .map(([trainingId]) => trainingIdToLabel.get(trainingId) ?? '')
      .filter(Boolean)
  )
}

function extractSuggestedOutreachTarget(report: Record<string, unknown>) {
  const transitionSections =
    report.transitionSections && typeof report.transitionSections === 'object'
      ? (report.transitionSections as Record<string, unknown>)
      : null
  const roadmapPlan =
    transitionSections?.roadmapPlan && typeof transitionSections.roadmapPlan === 'object'
      ? (transitionSections.roadmapPlan as Record<string, unknown>)
      : null
  const strongestPath = Array.isArray(roadmapPlan?.strongCandidatePath)
    ? roadmapPlan.strongCandidatePath.map((item) => cleanText(String(item ?? '')))
    : []
  const immediate = toArrayOfRecords(roadmapPlan?.zeroToTwoWeeks).map((item) =>
    cleanText(String(item.action ?? ''))
  )
  const candidates = [...strongestPath, ...immediate].slice(0, 6)

  for (const candidate of candidates) {
    const match = candidate.match(/(\d{1,3})\s+(?:targeted\s+)?(?:outreach|messages|applications|contacts)/i)
    if (match) {
      const parsed = Number.parseInt(match[1], 10)
      if (Number.isFinite(parsed)) return parsed
    }
  }

  return null
}

function buildAnalyticsPayload(args: GenerationSnapshotArgs) {
  const report = args.report
  const score =
    report.compatibilitySnapshot &&
    typeof report.compatibilitySnapshot === 'object' &&
    typeof (report.compatibilitySnapshot as Record<string, unknown>).score === 'number'
      ? Number((report.compatibilitySnapshot as Record<string, unknown>).score)
      : null

  return {
    sourceCoverage: {
      profileSlug:
        report.careerPathwayProfile &&
        typeof report.careerPathwayProfile === 'object' &&
        (report.careerPathwayProfile as Record<string, unknown>).meta &&
        typeof (report.careerPathwayProfile as Record<string, unknown>).meta === 'object' &&
        typeof ((report.careerPathwayProfile as Record<string, unknown>).meta as Record<string, unknown>).slug === 'string'
          ? (((report.careerPathwayProfile as Record<string, unknown>).meta as Record<string, unknown>).slug as string)
          : null,
      trainingSourcePath: args.sourceEnrichment?.sourcePath?.training ?? 'none',
      wageSourcePath: args.sourceEnrichment?.sourcePath?.wage ?? 'none'
    },
    taskCatalog: extractTaskCatalog(report),
    blockers: extractBlockers(report),
    trainingTitles: extractTrainingTitles(report),
    suggestedOutreachTarget: extractSuggestedOutreachTarget(report),
    suggestedCareerTitles: Array.isArray(report.suggestedCareers)
      ? report.suggestedCareers
          .slice(0, 3)
          .map((item) =>
            item && typeof item === 'object' ? cleanText(String((item as Record<string, unknown>).title ?? '')) : ''
          )
          .filter(Boolean)
      : [],
    generatedScore: score
  }
}

export async function persistPlannerGenerationSnapshot(args: GenerationSnapshotArgs) {
  const admin = createAdminClient()
  const currentRole = args.input.currentRole || args.input.currentRoleText || 'career transition'
  const targetRole = args.input.targetRole || args.input.targetRoleText || 'general target'
  const location = args.input.location || args.input.locationText || args.input.workRegion || 'Canada'
  const analyticsPayload = buildAnalyticsPayload(args)

  const { error } = await admin.from('career_map_report_analytics').upsert(
    {
      report_id: args.reportId,
      user_id: args.userId,
      current_role_key: normalizeRoleKey(currentRole),
      target_role_key: normalizeRoleKey(targetRole),
      current_role_cluster: deriveRoleCluster(currentRole),
      province_code: inferProvinceCode(location),
      timeline_bucket: args.input.timelineBucket || args.input.timeline || null,
      generated_score: analyticsPayload.generatedScore,
      analytics_payload: analyticsPayload,
      updated_at: new Date().toISOString()
    },
    { onConflict: 'report_id' }
  )

  if (error) throw error
}

export async function persistPlannerProgressEvent(args: ProgressEventArgs) {
  const admin = createAdminClient()
  const checkedCount = Object.values(args.progress.checkedTaskIds ?? {}).filter(Boolean).length
  const completedTrainingCount = Object.values(args.progress.completedTrainingIds ?? {}).filter(Boolean).length
  const outreach = args.progress.outreachTracker ?? {}
  const eventPayload = {
    checkedTaskIds: args.progress.checkedTaskIds ?? {},
    checkedCount,
    expandedPhaseIds: args.progress.expandedPhaseIds ?? [],
    completedTrainingIds: args.progress.completedTrainingIds ?? {},
    completedTrainingCount,
    outreachTracker: {
      sent: outreach.sent ?? '',
      replies: outreach.replies ?? '',
      positiveReplies: outreach.positiveReplies ?? '',
      nextFollowUpDate: outreach.nextFollowUpDate ?? ''
    },
    outreachCounts: {
      sent: parseNumericString(outreach.sent),
      replies: parseNumericString(outreach.replies),
      positiveReplies: parseNumericString(outreach.positiveReplies)
    },
    updatedAt: args.progress.updatedAt ?? new Date().toISOString()
  }

  const { error } = await admin.from('career_map_progress_events').insert({
    report_id: args.reportId,
    user_id: args.userId,
    event_type: 'progress_saved',
    event_payload: eventPayload
  })

  if (error) throw error
}

function addCount(map: Map<string, number>, values: string[]) {
  for (const value of values) {
    const cleaned = cleanText(value)
    if (!cleaned) continue
    map.set(cleaned, (map.get(cleaned) ?? 0) + 1)
  }
}

function getBucket(buckets: Map<string, AggregationBucket>, key: AggregationKey) {
  const compound = `${key.targetRoleKey}|${key.provinceCode}|${key.currentRoleCluster}`
  const existing = buckets.get(compound)
  if (existing) return existing
  const created: AggregationBucket = {
    key,
    reports: 0,
    firstTaskCounts: new Map<string, number>(),
    blockerCounts: new Map<string, number>(),
    trainingCounts: new Map<string, number>(),
    outreachTargets: [],
    trainingCuratedHits: 0,
    trainingWebHits: 0,
    wageTableHits: 0,
    wageWebHits: 0
  }
  buckets.set(compound, created)
  return created
}

function coerceAnalyticsPayload(value: unknown) {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

export async function aggregateTransitionPriors() {
  const admin = createAdminClient()
  const [analyticsResult, progressResult] = await Promise.all([
    admin
      .from('career_map_report_analytics')
      .select('report_id,current_role_key,target_role_key,current_role_cluster,province_code,analytics_payload'),
    admin.from('career_map_report_progress').select('report_id,progress_state')
  ])

  if (analyticsResult.error) throw analyticsResult.error
  if (progressResult.error) throw progressResult.error

  const progressByReport = new Map<string, Record<string, unknown>>()
  for (const row of progressResult.data ?? []) {
    if (typeof row.report_id !== 'string') continue
    progressByReport.set(
      row.report_id,
      row.progress_state && typeof row.progress_state === 'object'
        ? (row.progress_state as Record<string, unknown>)
        : {}
    )
  }

  const buckets = new Map<string, AggregationBucket>()

  for (const row of analyticsResult.data ?? []) {
    const analytics = coerceAnalyticsPayload(row.analytics_payload)
    const progressState = progressByReport.get(String(row.report_id ?? ''))
    const keyBase: AggregationKey = {
      targetRoleKey: String(row.target_role_key ?? ''),
      provinceCode: String(row.province_code ?? 'CA'),
      currentRoleCluster: String(row.current_role_cluster ?? 'general')
    }
    const taskCatalog = toArrayOfRecords(analytics.taskCatalog).map((item) => ({
      id: String(item.id ?? ''),
      label: cleanText(String(item.label ?? '')),
      phaseId: String(item.phaseId ?? '')
    }))
    const checkedMap =
      progressState?.checkedTaskIds && typeof progressState.checkedTaskIds === 'object'
        ? (progressState.checkedTaskIds as Record<string, unknown>)
        : {}
    const completedLabels = taskCatalog
      .filter((task) => Boolean(checkedMap[task.id]))
      .map((task) => task.label)
      .slice(0, 3)
    const blockers = Array.isArray(analytics.blockers)
      ? analytics.blockers.map((item) => cleanText(String(item ?? ''))).filter(Boolean)
      : []
    const trainingTitles = Array.isArray(analytics.trainingTitles)
      ? analytics.trainingTitles.map((item) => cleanText(String(item ?? ''))).filter(Boolean)
      : []
    const completedTrainingLabels = extractCompletedTrainingLabels({
      trainingTitles,
      progressState
    })
    const outreachTarget =
      typeof analytics.suggestedOutreachTarget === 'number'
        ? analytics.suggestedOutreachTarget
        : null
    const sourceCoverage =
      analytics.sourceCoverage && typeof analytics.sourceCoverage === 'object'
        ? (analytics.sourceCoverage as Record<string, unknown>)
        : {}

    for (const currentRoleCluster of [keyBase.currentRoleCluster, 'all']) {
      const bucket = getBucket(buckets, { ...keyBase, currentRoleCluster })
      bucket.reports += 1
      addCount(bucket.firstTaskCounts, completedLabels)
      addCount(bucket.blockerCounts, blockers)
      addCount(bucket.trainingCounts, trainingTitles)
      addCount(bucket.trainingCounts, completedTrainingLabels)
      addCount(bucket.trainingCounts, completedTrainingLabels)
      if (typeof outreachTarget === 'number') bucket.outreachTargets.push(outreachTarget)
      if (sourceCoverage.trainingSourcePath === 'curated_profile') bucket.trainingCuratedHits += 1
      if (sourceCoverage.trainingSourcePath === 'web_search') bucket.trainingWebHits += 1
      if (sourceCoverage.wageSourcePath === 'table') bucket.wageTableHits += 1
      if (sourceCoverage.wageSourcePath === 'web_search') bucket.wageWebHits += 1
    }
  }

  const rows = [...buckets.values()].map((bucket) => ({
    target_role_key: bucket.key.targetRoleKey,
    province_code: bucket.key.provinceCode,
    current_role_cluster: bucket.key.currentRoleCluster,
    sample_size: bucket.reports,
    priors_payload: {
      commonFirstTasks: topItems(bucket.firstTaskCounts, 3),
      commonBlockers: topItems(bucket.blockerCounts, 3),
      commonTrainingItems: topItems(bucket.trainingCounts, 3),
      suggestedWeeklyOutreachTarget: averageRounded(bucket.outreachTargets),
      sourceCoverage: {
        trainingCuratedRate:
          bucket.reports > 0 ? Number((bucket.trainingCuratedHits / bucket.reports).toFixed(2)) : 0,
        trainingWebRate:
          bucket.reports > 0 ? Number((bucket.trainingWebHits / bucket.reports).toFixed(2)) : 0,
        wageTableRate:
          bucket.reports > 0 ? Number((bucket.wageTableHits / bucket.reports).toFixed(2)) : 0,
        wageWebRate:
          bucket.reports > 0 ? Number((bucket.wageWebHits / bucket.reports).toFixed(2)) : 0
      }
    },
    refreshed_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }))

  if (rows.length === 0) {
    return { groupsProcessed: 0 }
  }

  const { error } = await admin.from('career_map_transition_priors').upsert(rows, {
    onConflict: 'target_role_key,province_code,current_role_cluster'
  })
  if (error) throw error

  return { groupsProcessed: rows.length }
}

export async function getTransitionPriorContext(args: {
  currentRole: string
  targetRole: string
  location: string
}): Promise<TransitionPriorContext> {
  const admin = createAdminClient()
  const targetRoleKey = normalizeRoleKey(args.targetRole)
  if (!targetRoleKey) return null

  const provinceCode = inferProvinceCode(args.location)
  const currentRoleCluster = deriveRoleCluster(args.currentRole)
  const clusterCandidates = [currentRoleCluster, 'all']

  const { data, error } = await admin
    .from('career_map_transition_priors')
    .select('sample_size,priors_payload,current_role_cluster')
    .eq('target_role_key', targetRoleKey)
    .eq('province_code', provinceCode)
    .in('current_role_cluster', clusterCandidates)
    .order('sample_size', { ascending: false })
    .limit(2)

  if (error) throw error
  if (!Array.isArray(data) || data.length === 0) return null

  const exact = data.find((row) => row.current_role_cluster === currentRoleCluster)
  const selected = exact ?? data[0]
  const payload = coerceAnalyticsPayload(selected?.priors_payload)

  return {
    sampleSize: typeof selected?.sample_size === 'number' ? selected.sample_size : 0,
    commonFirstTasks: Array.isArray(payload.commonFirstTasks)
      ? payload.commonFirstTasks.map((item) => cleanText(String(item ?? ''))).filter(Boolean)
      : [],
    commonBlockers: Array.isArray(payload.commonBlockers)
      ? payload.commonBlockers.map((item) => cleanText(String(item ?? ''))).filter(Boolean)
      : [],
    commonTrainingItems: Array.isArray(payload.commonTrainingItems)
      ? payload.commonTrainingItems.map((item) => cleanText(String(item ?? ''))).filter(Boolean)
      : [],
    suggestedWeeklyOutreachTarget:
      typeof payload.suggestedWeeklyOutreachTarget === 'number'
        ? payload.suggestedWeeklyOutreachTarget
        : null,
    sourceCoverage:
      payload.sourceCoverage && typeof payload.sourceCoverage === 'object'
        ? {
            trainingCuratedRate: Number((payload.sourceCoverage as Record<string, unknown>).trainingCuratedRate ?? 0),
            trainingWebRate: Number((payload.sourceCoverage as Record<string, unknown>).trainingWebRate ?? 0),
            wageTableRate: Number((payload.sourceCoverage as Record<string, unknown>).wageTableRate ?? 0),
            wageWebRate: Number((payload.sourceCoverage as Record<string, unknown>).wageWebRate ?? 0)
          }
        : {
            trainingCuratedRate: 0,
            trainingWebRate: 0,
            wageTableRate: 0,
            wageWebRate: 0
          }
  }
}

function mergeStringArray(values: string[], additions: string[], limit = 4) {
  return uniqueStrings([...additions, ...values]).slice(0, limit)
}

export function applyTransitionPriorsToReport(
  report: Record<string, unknown>,
  priors: TransitionPriorContext
) {
  if (!priors || priors.sampleSize < 3) return report

  const nextReport: Record<string, unknown> = { ...report }
  const transitionSections =
    nextReport.transitionSections && typeof nextReport.transitionSections === 'object'
      ? { ...(nextReport.transitionSections as Record<string, unknown>) }
      : null
  const roadmapPlan =
    transitionSections?.roadmapPlan && typeof transitionSections.roadmapPlan === 'object'
      ? { ...(transitionSections.roadmapPlan as Record<string, unknown>) }
      : null
  const executionStrategy =
    nextReport.executionStrategy && typeof nextReport.executionStrategy === 'object'
      ? { ...(nextReport.executionStrategy as Record<string, unknown>) }
      : null

  if (roadmapPlan) {
    const zeroToTwoWeeks = toArrayOfRecords(roadmapPlan.zeroToTwoWeeks)
    const existingImmediate = zeroToTwoWeeks
      .map((item) => cleanText(String(item.action ?? '')))
      .filter(Boolean)
    const mergedImmediate = mergeStringArray(existingImmediate, priors.commonFirstTasks, 4)
    roadmapPlan.zeroToTwoWeeks = mergedImmediate.map((action) => ({ action }))

    const strongestPath = Array.isArray(roadmapPlan.strongCandidatePath)
      ? roadmapPlan.strongCandidatePath.map((item) => cleanText(String(item ?? ''))).filter(Boolean)
      : []
    roadmapPlan.strongCandidatePath = mergeStringArray(
      strongestPath,
      priors.commonFirstTasks,
      4
    )

    transitionSections!.roadmapPlan = roadmapPlan
    nextReport.transitionSections = transitionSections
  }

  if (executionStrategy) {
    const plan90Day =
      executionStrategy.plan90Day && typeof executionStrategy.plan90Day === 'object'
        ? { ...(executionStrategy.plan90Day as Record<string, unknown>) }
        : null
    if (plan90Day?.month1 && typeof plan90Day.month1 === 'object') {
      const month1 = { ...(plan90Day.month1 as Record<string, unknown>) }
      const month1Actions = Array.isArray(month1.actions)
        ? month1.actions.map((item) => cleanText(String(item ?? ''))).filter(Boolean)
        : []
      month1.actions = mergeStringArray(month1Actions, priors.commonFirstTasks, 5)
      plan90Day.month1 = month1
      executionStrategy.plan90Day = plan90Day
    }

    const probabilityRealityCheck =
      executionStrategy.probabilityRealityCheck &&
      typeof executionStrategy.probabilityRealityCheck === 'object'
        ? { ...(executionStrategy.probabilityRealityCheck as Record<string, unknown>) }
        : null
    if (probabilityRealityCheck) {
      const commonFailureModes = Array.isArray(probabilityRealityCheck.commonFailureModes)
        ? probabilityRealityCheck.commonFailureModes.map((item) => cleanText(String(item ?? ''))).filter(Boolean)
        : []
      probabilityRealityCheck.commonFailureModes = mergeStringArray(
        commonFailureModes,
        priors.commonBlockers,
        4
      )
      executionStrategy.probabilityRealityCheck = probabilityRealityCheck
    }

    nextReport.executionStrategy = executionStrategy
  }

  nextReport.learningPriorContext = {
    sampleSize: priors.sampleSize,
    commonFirstTasks: priors.commonFirstTasks,
    commonBlockers: priors.commonBlockers,
    commonTrainingItems: priors.commonTrainingItems,
    suggestedWeeklyOutreachTarget: priors.suggestedWeeklyOutreachTarget,
    sourceCoverage: priors.sourceCoverage
  }

  return nextReport
}
