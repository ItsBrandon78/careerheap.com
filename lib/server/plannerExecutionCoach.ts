import type { RequirementType } from '@/lib/requirements/types'

export type ExecutionRoleFamily =
  | 'trades'
  | 'tech'
  | 'healthcare'
  | 'business'
  | 'creative'
  | 'entrepreneurship'
  | 'general'

export type ExecutionBlockerClass = 'legal_certification' | 'skill' | 'experience'
export type ExecutionRequiredFor = 'apply' | 'compete'
export type ExecutionUrgency = 'immediate' | 'near_term' | 'long_horizon'

export interface ExecutionContextRequirement {
  normalized_key: string
  label: string
  type: RequirementType
  blockerClass: ExecutionBlockerClass
  requiredFor: ExecutionRequiredFor
  urgency: ExecutionUrgency
  howToGet: string
  timeEstimate: string
  evidenceQuote: string[]
}

export interface ExecutionStandStrength {
  summary: string
  resumeSignal: string
  countsToward: string[]
}

export interface ExecutionStandGap {
  normalized_key: string
  label: string
  blockerClass: ExecutionBlockerClass
  reason: string
}

export interface ExecutionTransferCandidate {
  resumeSignal: string
  countsToward: string[]
}

export interface ExecutionCoachingContext {
  roleTitle: string
  location: string
  roleFamily: ExecutionRoleFamily
  baselineOnly: boolean
  resumeSignals: string[]
  strengths: ExecutionStandStrength[]
  missingMandatory: ExecutionStandGap[]
  competitiveDisadvantages: ExecutionStandGap[]
  requirements: ExecutionContextRequirement[]
  requiredToApplyKeys: string[]
  requiredToCompeteKeys: string[]
  monthRequirementKeys: {
    month1: string[]
    month2: string[]
    month3: string[]
  }
  transferCandidates: ExecutionTransferCandidate[]
}

export interface ExecutionPlanAction {
  id: string
  task: string
  volumeTarget: string
  learningTarget: string
  proofTarget: string
  weeklyTime: string
  linkedRequirements: string[]
}

export interface ExecutionMonthPlan {
  label: string
  weeklyTimeInvestment: string
  actions: ExecutionPlanAction[]
}

export interface ExecutionBlockerItem {
  normalized_key: string
  label: string
  blockerClass: ExecutionBlockerClass
  whyItMatters: string
  howToClose: string
  timeEstimate: string
  evidenceQuote: string[]
}

export interface ExecutionTransferTranslation {
  fromResume: string
  toTargetRole: string
  countsToward: string[]
}

export interface ExecutionStrategy {
  whereYouStandNow: {
    strengths: ExecutionStandStrength[]
    missingMandatoryRequirements: ExecutionStandGap[]
    competitiveDisadvantages: ExecutionStandGap[]
  }
  realBlockers: {
    requiredToApply: ExecutionBlockerItem[]
    requiredToCompete: ExecutionBlockerItem[]
  }
  transferableEdge: {
    translations: ExecutionTransferTranslation[]
  }
  plan90Day: {
    month1: ExecutionMonthPlan
    month2: ExecutionMonthPlan
    month3: ExecutionMonthPlan
  }
  probabilityRealityCheck: {
    difficulty: string
    whatIncreasesOdds: string[]
    commonFailureModes: string[]
  }
  behavioralExecution: {
    minimumWeeklyEffort: string
    consistencyLooksLike: string[]
    whatNotToDo: string[]
  }
}

const MONTH_MIN_ACTIONS = 5
const TRANSLATION_MIN_ITEMS = 3
const ACTION_VERB_PATTERN =
  /^(book|complete|call|email|visit|apply|practice|build|create|assemble|install|document|run|ship|publish|rewrite|tailor|record|follow up|schedule|verify|prepare|deliver|execute|lead|maintain|troubleshoot|inspect|test|design|prototype|draft|submit|update|track)\b/i
const BANNED_GENERIC_PHRASE_PATTERN =
  /\b(develop skills|gain experience|improve communication|improve leadership|improve teamwork|work on soft skills|network more)\b/i
const SCORE_LIKE_PATTERN = /%|\b\d+\s*\/\s*100\b|\bmatch score\b|\bconfidence score\b/i
const MODEL_DEFAULT = 'gpt-4.1-mini'

function normalizeText(value: string | null | undefined) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function uniqueStrings(values: string[]) {
  const seen = new Set<string>()
  const output: string[] = []
  for (const value of values) {
    const trimmed = value.trim()
    if (!trimmed) continue
    const key = normalizeText(trimmed)
    if (!key || seen.has(key)) continue
    seen.add(key)
    output.push(trimmed)
  }
  return output
}

function clipText(value: string, limit = 220) {
  const trimmed = value.trim()
  if (trimmed.length <= limit) return trimmed
  return `${trimmed.slice(0, limit - 3).trimEnd()}...`
}

function isConfigured() {
  return Boolean(process.env.OPENAI_API_KEY?.trim())
}

function roleVolumeDefaults(roleFamily: ExecutionRoleFamily) {
  if (roleFamily === 'trades') {
    return {
      weeklyTime: '10-14 hours/week',
      applications: '8 targeted applications/week',
      outreach: '25 contractor outreach calls/week',
      learning: '4 hands-on practice sessions/week',
      proof: '1 verification artifact/week'
    }
  }
  if (roleFamily === 'tech') {
    return {
      weeklyTime: '12-16 hours/week',
      applications: '10 tailored applications/week',
      outreach: '12 targeted outreach messages/week',
      learning: '5 technical drills/week',
      proof: '1 shipped proof artifact/week'
    }
  }
  if (roleFamily === 'healthcare') {
    return {
      weeklyTime: '10-14 hours/week',
      applications: '8 role-specific applications/week',
      outreach: '10 employer follow-ups/week',
      learning: '4 competency refresh sessions/week',
      proof: '1 compliance-ready proof packet/week'
    }
  }
  if (roleFamily === 'creative') {
    return {
      weeklyTime: '10-14 hours/week',
      applications: '8 targeted applications/week',
      outreach: '10 portfolio outreach messages/week',
      learning: '4 craft practice sessions/week',
      proof: '1 portfolio piece/week'
    }
  }
  if (roleFamily === 'entrepreneurship') {
    return {
      weeklyTime: '12-18 hours/week',
      applications: '6 partner/client outreach threads/week',
      outreach: '15 customer discovery conversations/week',
      learning: '4 business model iterations/week',
      proof: '1 validated offer artifact/week'
    }
  }
  if (roleFamily === 'business') {
    return {
      weeklyTime: '10-14 hours/week',
      applications: '10 tailored applications/week',
      outreach: '12 hiring-manager outreach messages/week',
      learning: '4 role-simulation sessions/week',
      proof: '1 measurable case artifact/week'
    }
  }
  return {
    weeklyTime: '10-14 hours/week',
    applications: '10 targeted applications/week',
    outreach: '10 targeted outreach messages/week',
    learning: '4 role-specific practice sessions/week',
    proof: '1 measurable proof artifact/week'
  }
}

function cleanRequirementLabel(label: string) {
  return label.replace(/^obtain\s+/i, '').replace(/^complete\s+/i, '').trim()
}

function actionFromRequirement(
  requirement: ExecutionContextRequirement,
  id: string,
  weeklyTime: string
): ExecutionPlanAction {
  const cleanedLabel = cleanRequirementLabel(requirement.label)
  if (requirement.blockerClass === 'legal_certification') {
    if (requirement.urgency === 'long_horizon') {
      return {
        id,
        task: `Start the sponsorship and checkpoint plan for ${cleanedLabel}.`,
        volumeTarget: '2 checkpoint follow-ups/week',
        learningTarget: 'Review regulator requirements and sponsor pathway details',
        proofTarget: 'Publish a dated checkpoint log with next milestone',
        weeklyTime,
        linkedRequirements: [requirement.normalized_key]
      }
    }
    const confirmStyle = /^(confirm|verify|review)\b/i.test(cleanedLabel)
    const registerStyle = /^(register|registration)\b/i.test(cleanedLabel)
    const immediateTask = confirmStyle
      ? `Confirm and complete ${cleanedLabel.replace(/^(confirm|verify|review)\s+/i, '')}, then keep proof ready.`
      : registerStyle
        ? `Start and complete ${cleanedLabel}, then keep proof ready.`
        : `Book and complete ${cleanedLabel}, then keep active proof ready.`
    return {
      id,
      task: immediateTask,
      volumeTarget: '1 completion milestone/week',
      learningTarget: 'Review pass criteria and compliance rules',
      proofTarget: 'Save certificate or registration confirmation',
      weeklyTime,
      linkedRequirements: [requirement.normalized_key]
    }
  }

  if (requirement.blockerClass === 'experience') {
    return {
      id,
      task: `Build one role-mirrored task that proves ${cleanedLabel}.`,
      volumeTarget: '1 finished scenario/week',
      learningTarget: 'Rehearse the execution sequence until repeatable',
      proofTarget: 'Publish a short result log with measurable outcomes',
      weeklyTime,
      linkedRequirements: [requirement.normalized_key]
    }
  }

  return {
    id,
    task: /^(use)\b/i.test(cleanedLabel)
      ? `Practice with ${cleanedLabel.replace(/^use\s+/i, '')} in role-like workflows and record measurable outputs.`
      : `Practice ${cleanedLabel} in role-like workflows and record measurable outputs.`,
    volumeTarget: '3 focused practice sessions/week',
    learningTarget: 'Close one clearly defined sub-skill each week',
    proofTarget: 'Publish one artifact showing before/after quality',
    weeklyTime,
    linkedRequirements: [requirement.normalized_key]
  }
}

function fallbackLinkedKeys(preferred: string[], allMissing: string[]) {
  const uniquePreferred = uniqueStrings(preferred).filter((key) => allMissing.includes(key))
  if (uniquePreferred.length > 0) return uniquePreferred
  return allMissing.slice(0, 1)
}

function ensureActionMinimum(options: {
  actions: ExecutionPlanAction[]
  month: 'month1' | 'month2' | 'month3'
  roleFamily: ExecutionRoleFamily
  allMissingKeys: string[]
  preferredKeys: string[]
}) {
  const volume = roleVolumeDefaults(options.roleFamily)
  const linked = fallbackLinkedKeys(options.preferredKeys, options.allMissingKeys)
  const output = [...options.actions]

  const sharedActions: Record<'month1' | 'month2' | 'month3', ExecutionPlanAction[]> = {
    month1: [
      {
        id: 'month1-applications',
        task: 'Apply to a focused short-list and track response patterns daily.',
        volumeTarget: volume.applications,
        learningTarget: 'Tighten role-specific positioning in every application',
        proofTarget: 'Keep an application tracker with response outcomes',
        weeklyTime: volume.weeklyTime,
        linkedRequirements: linked
      },
      {
        id: 'month1-outreach',
        task: 'Run direct outreach to hiring contacts instead of waiting on portals.',
        volumeTarget: volume.outreach,
        learningTarget: 'Refine a concise call or message opener',
        proofTarget: 'Store outreach logs and follow-up outcomes',
        weeklyTime: volume.weeklyTime,
        linkedRequirements: linked
      },
      {
        id: 'month1-resume',
        task: 'Rewrite resume bullets so each one proves a target-role task with outcomes.',
        volumeTarget: '5 bullet rewrites/week',
        learningTarget: 'Use target-role terminology from employer requirements',
        proofTarget: 'Maintain before/after bullet versions in a tracker',
        weeklyTime: volume.weeklyTime,
        linkedRequirements: linked
      }
    ],
    month2: [
      {
        id: 'month2-proof',
        task: 'Build portfolio or work-sample evidence aligned to live hiring signals.',
        volumeTarget: volume.proof,
        learningTarget: volume.learning,
        proofTarget: 'Publish one interview-ready artifact each week',
        weeklyTime: volume.weeklyTime,
        linkedRequirements: linked
      },
      {
        id: 'month2-interview',
        task: 'Run structured interview drills using your new proof artifacts.',
        volumeTarget: '3 mock interview sessions/week',
        learningTarget: 'Improve clarity on task, action, and measurable result',
        proofTarget: 'Keep a story bank with role-specific examples',
        weeklyTime: volume.weeklyTime,
        linkedRequirements: linked
      },
      {
        id: 'month2-followup',
        task: 'Follow up on every active application until you get a clear outcome.',
        volumeTarget: '15 follow-ups/week',
        learningTarget: 'Sharpen concise follow-up messaging',
        proofTarget: 'Track conversion from follow-up to interview',
        weeklyTime: volume.weeklyTime,
        linkedRequirements: linked
      }
    ],
    month3: [
      {
        id: 'month3-conversion',
        task: 'Convert interview traction into an offer or sponsorship checkpoint.',
        volumeTarget: '5 active interview threads/week',
        learningTarget: 'Practice objection handling for remaining gaps',
        proofTarget: 'Maintain a conversion board from interview to decision',
        weeklyTime: volume.weeklyTime,
        linkedRequirements: linked
      },
      {
        id: 'month3-negotiation',
        task: 'Prepare decision-ready responses for offers, trial projects, or sponsor discussions.',
        volumeTarget: '2 decision simulations/week',
        learningTarget: 'Rehearse role fit narrative with hard evidence',
        proofTarget: 'Keep a checklist for offer and onboarding readiness',
        weeklyTime: volume.weeklyTime,
        linkedRequirements: linked
      },
      {
        id: 'month3-pipeline',
        task: 'Keep the pipeline active until the transition is fully locked in.',
        volumeTarget: volume.applications,
        learningTarget: 'Continue improving weak interview moments',
        proofTarget: 'Weekly pipeline report with stage-by-stage counts',
        weeklyTime: volume.weeklyTime,
        linkedRequirements: linked
      }
    ]
  }

  for (const action of sharedActions[options.month]) {
    if (output.length >= MONTH_MIN_ACTIONS) break
    output.push(action)
  }

  while (output.length < MONTH_MIN_ACTIONS) {
    output.push({
      id: `${options.month}-repeat-${output.length + 1}`,
      task: 'Execute another requirement-linked practice cycle and document the result.',
      volumeTarget: '1 additional cycle/week',
      learningTarget: 'Close one visible execution weakness',
      proofTarget: 'Add one dated entry to your proof tracker',
      weeklyTime: volume.weeklyTime,
      linkedRequirements: linked
    })
  }

  return output.slice(0, 7)
}

function guessDifficulty(context: ExecutionCoachingContext) {
  const applyCount = context.requiredToApplyKeys.length
  const longHorizonApply = context.requirements.filter(
    (item) => item.requiredFor === 'apply' && item.urgency === 'long_horizon'
  ).length
  if (applyCount >= 5 || longHorizonApply >= 1) {
    return 'This is a hard transition right now, but it is realistic if you execute a strict weekly plan.'
  }
  if (applyCount >= 3) {
    return 'This is a moderate transition: achievable in 90 days if you close blockers in order.'
  }
  return 'This is a realistic transition path if you maintain weekly execution discipline.'
}

function buildFallbackTranslations(context: ExecutionCoachingContext) {
  const output: ExecutionTransferTranslation[] = []
  const fallbackRequirementLabels = context.requirements.map((item) => item.label)
  const candidates =
    context.transferCandidates.length > 0
      ? context.transferCandidates
      : context.resumeSignals.slice(0, 6).map((line) => ({
          resumeSignal: line,
          countsToward: fallbackRequirementLabels.slice(0, 2)
        }))

  for (const candidate of candidates) {
    if (output.length >= 6) break
    const countsToward = uniqueStrings(candidate.countsToward).slice(0, 3)
    if (countsToward.length === 0) continue
    output.push({
      fromResume: clipText(candidate.resumeSignal, 180),
      toTargetRole: `Apply this as ${countsToward[0].toLowerCase()} work in ${context.roleTitle} settings, then quantify the outcome.`,
      countsToward
    })
  }

  if (output.length >= TRANSLATION_MIN_ITEMS) return output

  for (const line of context.resumeSignals) {
    if (output.length >= TRANSLATION_MIN_ITEMS) break
    if (output.some((item) => normalizeText(item.fromResume) === normalizeText(line))) continue
    const countsToward =
      output[0]?.countsToward ??
      context.requirements.slice(0, 2).map((item) => item.label)
    output.push({
      fromResume: clipText(line, 180),
      toTargetRole: `Translate this into ${context.roleTitle} language with explicit scope, tool, and measurable result.`,
      countsToward
    })
  }

  return output.slice(0, 6)
}

function ensureStandStrengths(context: ExecutionCoachingContext) {
  if (context.strengths.length >= 3) return context.strengths.slice(0, 8)
  const output = [...context.strengths]
  for (const line of context.resumeSignals) {
    if (output.length >= 3) break
    output.push({
      summary: `This background signal supports transition readiness for ${context.roleTitle}.`,
      resumeSignal: clipText(line, 180),
      countsToward: context.requirements.slice(0, 2).map((item) => item.label)
    })
  }
  return output.slice(0, 8)
}

function blockersFromKeys(
  context: ExecutionCoachingContext,
  keys: string[]
): ExecutionBlockerItem[] {
  const requirementByKey = new Map(
    context.requirements.map((item) => [item.normalized_key, item] as const)
  )
  return keys
    .map((key) => requirementByKey.get(key))
    .filter((item): item is ExecutionContextRequirement => Boolean(item))
    .slice(0, 10)
    .map((item) => ({
      normalized_key: item.normalized_key,
      label: item.label,
      blockerClass: item.blockerClass,
      whyItMatters:
        item.requiredFor === 'apply'
          ? 'This is a direct apply gate in current hiring signals.'
          : 'This increases shortlist and interview competitiveness.',
      howToClose: item.howToGet,
      timeEstimate: item.timeEstimate,
      evidenceQuote: item.evidenceQuote.slice(0, 2)
    }))
}

function monthPlanFromKeys(options: {
  context: ExecutionCoachingContext
  month: 'month1' | 'month2' | 'month3'
  label: string
  weeklyTime: string
  keys: string[]
}) {
  const requirementByKey = new Map(
    options.context.requirements.map((item) => [item.normalized_key, item] as const)
  )
  const seededActions: ExecutionPlanAction[] = []
  let counter = 1
  for (const key of options.keys) {
    const requirement = requirementByKey.get(key)
    if (!requirement) continue
    seededActions.push(actionFromRequirement(requirement, `${options.month}-${counter}`, options.weeklyTime))
    counter += 1
    if (seededActions.length >= MONTH_MIN_ACTIONS) break
  }

  const actions = ensureActionMinimum({
    actions: seededActions,
    month: options.month,
    roleFamily: options.context.roleFamily,
    allMissingKeys: options.context.requirements.map((item) => item.normalized_key),
    preferredKeys: options.keys
  })

  return {
    label: options.label,
    weeklyTimeInvestment: options.weeklyTime,
    actions
  } satisfies ExecutionMonthPlan
}

export function buildDeterministicExecutionStrategy(
  context: ExecutionCoachingContext
): ExecutionStrategy {
  const volume = roleVolumeDefaults(context.roleFamily)
  const month1 = monthPlanFromKeys({
    context,
    month: 'month1',
    label: 'Month 1: Foundations',
    weeklyTime: volume.weeklyTime,
    keys: context.monthRequirementKeys.month1
  })
  const month2 = monthPlanFromKeys({
    context,
    month: 'month2',
    label: 'Month 2: Positioning',
    weeklyTime: volume.weeklyTime,
    keys: context.monthRequirementKeys.month2
  })
  const month3 = monthPlanFromKeys({
    context,
    month: 'month3',
    label: 'Month 3: Conversion',
    weeklyTime: volume.weeklyTime,
    keys: context.monthRequirementKeys.month3
  })

  const requiredToApply = blockersFromKeys(context, context.requiredToApplyKeys)
  const requiredToCompete = blockersFromKeys(context, context.requiredToCompeteKeys)
  const strengths = ensureStandStrengths(context)
  const translations = buildFallbackTranslations(context)

  return {
    whereYouStandNow: {
      strengths,
      missingMandatoryRequirements: context.missingMandatory.slice(0, 8),
      competitiveDisadvantages: context.competitiveDisadvantages.slice(0, 8)
    },
    realBlockers: {
      requiredToApply,
      requiredToCompete
    },
    transferableEdge: {
      translations
    },
    plan90Day: {
      month1,
      month2,
      month3
    },
    probabilityRealityCheck: {
      difficulty: guessDifficulty(context),
      whatIncreasesOdds: [
        `Close apply blockers first, then run ${volume.applications}.`,
        `Execute ${volume.outreach} and follow up until each lead has an outcome.`,
        `Publish ${volume.proof} so interviews focus on evidence, not claims.`
      ],
      commonFailureModes: [
        'Applying passively through portals with no direct outreach.',
        'Spending time on low-impact learning without proof artifacts.',
        'Skipping follow-up after first contact or first rejection.'
      ]
    },
    behavioralExecution: {
      minimumWeeklyEffort: `${volume.weeklyTime} for 12 consecutive weeks.`,
      consistencyLooksLike: [
        'Block execution time on your calendar before discretionary tasks.',
        'Track applications, outreach, and proof artifacts every weekday.',
        'Review blockers weekly and adjust next-week actions immediately.'
      ],
      whatNotToDo: [
        'Do not wait for perfect readiness before contacting employers.',
        'Do not submit untailored applications with generic resume bullets.',
        'Do not stop outreach after one rejection or one no-response week.'
      ]
    }
  }
}

function containsBannedPhrase(value: string) {
  return BANNED_GENERIC_PHRASE_PATTERN.test(value)
}

function hasScoreLikeText(value: string) {
  return SCORE_LIKE_PATTERN.test(value)
}

export function validateExecutionStrategy(options: {
  strategy: ExecutionStrategy
  allowedRequirementKeys: string[]
}) {
  const errors: string[] = []
  const { strategy } = options
  const allowed = new Set(options.allowedRequirementKeys.map((key) => normalizeText(key)))

  if (strategy.transferableEdge.translations.length < TRANSLATION_MIN_ITEMS) {
    errors.push('transferableEdge.translations must include at least 3 items.')
  }

  const monthEntries: Array<{ key: 'month1' | 'month2' | 'month3'; plan: ExecutionMonthPlan }> = [
    { key: 'month1', plan: strategy.plan90Day.month1 },
    { key: 'month2', plan: strategy.plan90Day.month2 },
    { key: 'month3', plan: strategy.plan90Day.month3 }
  ]

  for (const month of monthEntries) {
    if (month.plan.actions.length < MONTH_MIN_ACTIONS) {
      errors.push(`${month.key} must include at least ${MONTH_MIN_ACTIONS} actions.`)
    }
    for (const action of month.plan.actions) {
      if (!ACTION_VERB_PATTERN.test(action.task)) {
        errors.push(`${month.key} action "${action.id}" must start with an execution verb.`)
      }
      if (containsBannedPhrase(action.task)) {
        errors.push(`${month.key} action "${action.id}" includes banned generic phrasing.`)
      }
      if (hasScoreLikeText(action.task)) {
        errors.push(`${month.key} action "${action.id}" includes score-like text.`)
      }
      if (!Array.isArray(action.linkedRequirements) || action.linkedRequirements.length === 0) {
        errors.push(`${month.key} action "${action.id}" must link to at least one requirement.`)
      } else if (allowed.size > 0) {
        const invalidKeys = action.linkedRequirements.filter(
          (key) => !allowed.has(normalizeText(key))
        )
        if (invalidKeys.length > 0) {
          errors.push(`${month.key} action "${action.id}" links unknown requirements: ${invalidKeys.join(', ')}`)
        }
      }
    }
  }

  const flattenedText = JSON.stringify(strategy)
  if (hasScoreLikeText(flattenedText)) {
    errors.push('Execution strategy must not include percentages or score-like text.')
  }

  const phraseChecks = [
    strategy.probabilityRealityCheck.difficulty,
    ...strategy.probabilityRealityCheck.whatIncreasesOdds,
    ...strategy.probabilityRealityCheck.commonFailureModes,
    strategy.behavioralExecution.minimumWeeklyEffort,
    ...strategy.behavioralExecution.consistencyLooksLike,
    ...strategy.behavioralExecution.whatNotToDo,
    ...strategy.transferableEdge.translations.map((item) => item.toTargetRole)
  ]
  for (const phrase of phraseChecks) {
    if (containsBannedPhrase(phrase)) {
      errors.push('Execution strategy includes banned generic phrasing.')
      break
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

function parseExecutionStrategy(value: unknown): ExecutionStrategy | null {
  if (!value || typeof value !== 'object') return null
  const candidate = value as ExecutionStrategy
  if (!candidate.whereYouStandNow || !candidate.realBlockers || !candidate.plan90Day) return null
  return candidate
}

async function callExecutionCoachLlm(
  context: ExecutionCoachingContext
): Promise<ExecutionStrategy | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!apiKey) return null

  const model = process.env.OPENAI_EXECUTION_STRATEGY_MODEL?.trim() || MODEL_DEFAULT
  const payload = {
    model,
    temperature: 0.2,
    messages: [
      {
        role: 'system',
        content:
          'You are an execution-focused career coach. Produce concise, decisive, measurable actions grounded in provided evidence. No percentages or match scores.'
      },
      {
        role: 'user',
        content: JSON.stringify({
          task: 'Generate a 90-day execution strategy from the provided context.',
          hard_rules: [
            'Use only provided context. Do not invent credentials or requirements.',
            'No percentages and no numeric match scores anywhere.',
            'No vague advice like develop skills, gain experience, improve communication.',
            'Every plan action must be concrete, measurable, and start with an action verb.',
            'Every plan action must link to at least one requirement key from linked_requirements_catalog.',
            'Provide at least 5 actions in each month.',
            'Provide at least 3 resume-to-role translations.',
            'Use decisive coaching tone.'
          ],
          context: {
            role_title: context.roleTitle,
            location: context.location,
            role_family: context.roleFamily,
            baseline_only: context.baselineOnly,
            resume_signals: context.resumeSignals.slice(0, 12),
            strengths: context.strengths.slice(0, 8),
            missing_mandatory: context.missingMandatory.slice(0, 8),
            competitive_disadvantages: context.competitiveDisadvantages.slice(0, 8),
            requirements: context.requirements.slice(0, 20),
            required_to_apply_keys: context.requiredToApplyKeys.slice(0, 10),
            required_to_compete_keys: context.requiredToCompeteKeys.slice(0, 10),
            month_requirement_keys: context.monthRequirementKeys,
            transfer_candidates: context.transferCandidates.slice(0, 8),
            linked_requirements_catalog: context.requirements.map((item) => item.normalized_key)
          }
        })
      }
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'execution_strategy',
        strict: true,
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            whereYouStandNow: {
              type: 'object',
              additionalProperties: false,
              properties: {
                strengths: {
                  type: 'array',
                  items: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                      summary: { type: 'string' },
                      resumeSignal: { type: 'string' },
                      countsToward: { type: 'array', items: { type: 'string' } }
                    },
                    required: ['summary', 'resumeSignal', 'countsToward']
                  }
                },
                missingMandatoryRequirements: {
                  type: 'array',
                  items: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                      normalized_key: { type: 'string' },
                      label: { type: 'string' },
                      blockerClass: {
                        type: 'string',
                        enum: ['legal_certification', 'skill', 'experience']
                      },
                      reason: { type: 'string' }
                    },
                    required: ['normalized_key', 'label', 'blockerClass', 'reason']
                  }
                },
                competitiveDisadvantages: {
                  type: 'array',
                  items: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                      normalized_key: { type: 'string' },
                      label: { type: 'string' },
                      blockerClass: {
                        type: 'string',
                        enum: ['legal_certification', 'skill', 'experience']
                      },
                      reason: { type: 'string' }
                    },
                    required: ['normalized_key', 'label', 'blockerClass', 'reason']
                  }
                }
              },
              required: ['strengths', 'missingMandatoryRequirements', 'competitiveDisadvantages']
            },
            realBlockers: {
              type: 'object',
              additionalProperties: false,
              properties: {
                requiredToApply: {
                  type: 'array',
                  items: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                      normalized_key: { type: 'string' },
                      label: { type: 'string' },
                      blockerClass: {
                        type: 'string',
                        enum: ['legal_certification', 'skill', 'experience']
                      },
                      whyItMatters: { type: 'string' },
                      howToClose: { type: 'string' },
                      timeEstimate: { type: 'string' },
                      evidenceQuote: { type: 'array', items: { type: 'string' } }
                    },
                    required: [
                      'normalized_key',
                      'label',
                      'blockerClass',
                      'whyItMatters',
                      'howToClose',
                      'timeEstimate',
                      'evidenceQuote'
                    ]
                  }
                },
                requiredToCompete: {
                  type: 'array',
                  items: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                      normalized_key: { type: 'string' },
                      label: { type: 'string' },
                      blockerClass: {
                        type: 'string',
                        enum: ['legal_certification', 'skill', 'experience']
                      },
                      whyItMatters: { type: 'string' },
                      howToClose: { type: 'string' },
                      timeEstimate: { type: 'string' },
                      evidenceQuote: { type: 'array', items: { type: 'string' } }
                    },
                    required: [
                      'normalized_key',
                      'label',
                      'blockerClass',
                      'whyItMatters',
                      'howToClose',
                      'timeEstimate',
                      'evidenceQuote'
                    ]
                  }
                }
              },
              required: ['requiredToApply', 'requiredToCompete']
            },
            transferableEdge: {
              type: 'object',
              additionalProperties: false,
              properties: {
                translations: {
                  type: 'array',
                  items: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                      fromResume: { type: 'string' },
                      toTargetRole: { type: 'string' },
                      countsToward: { type: 'array', items: { type: 'string' } }
                    },
                    required: ['fromResume', 'toTargetRole', 'countsToward']
                  }
                }
              },
              required: ['translations']
            },
            plan90Day: {
              type: 'object',
              additionalProperties: false,
              properties: {
                month1: { $ref: '#/$defs/month_plan' },
                month2: { $ref: '#/$defs/month_plan' },
                month3: { $ref: '#/$defs/month_plan' }
              },
              required: ['month1', 'month2', 'month3']
            },
            probabilityRealityCheck: {
              type: 'object',
              additionalProperties: false,
              properties: {
                difficulty: { type: 'string' },
                whatIncreasesOdds: { type: 'array', items: { type: 'string' } },
                commonFailureModes: { type: 'array', items: { type: 'string' } }
              },
              required: ['difficulty', 'whatIncreasesOdds', 'commonFailureModes']
            },
            behavioralExecution: {
              type: 'object',
              additionalProperties: false,
              properties: {
                minimumWeeklyEffort: { type: 'string' },
                consistencyLooksLike: { type: 'array', items: { type: 'string' } },
                whatNotToDo: { type: 'array', items: { type: 'string' } }
              },
              required: ['minimumWeeklyEffort', 'consistencyLooksLike', 'whatNotToDo']
            }
          },
          required: [
            'whereYouStandNow',
            'realBlockers',
            'transferableEdge',
            'plan90Day',
            'probabilityRealityCheck',
            'behavioralExecution'
          ],
          $defs: {
            plan_action: {
              type: 'object',
              additionalProperties: false,
              properties: {
                id: { type: 'string' },
                task: { type: 'string' },
                volumeTarget: { type: 'string' },
                learningTarget: { type: 'string' },
                proofTarget: { type: 'string' },
                weeklyTime: { type: 'string' },
                linkedRequirements: { type: 'array', items: { type: 'string' } }
              },
              required: [
                'id',
                'task',
                'volumeTarget',
                'learningTarget',
                'proofTarget',
                'weeklyTime',
                'linkedRequirements'
              ]
            },
            month_plan: {
              type: 'object',
              additionalProperties: false,
              properties: {
                label: { type: 'string' },
                weeklyTimeInvestment: { type: 'string' },
                actions: {
                  type: 'array',
                  items: { $ref: '#/$defs/plan_action' }
                }
              },
              required: ['label', 'weeklyTimeInvestment', 'actions']
            }
          }
        }
      }
    }
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(20_000)
  })

  if (!response.ok) return null
  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>
  }
  const content = data.choices?.[0]?.message?.content
  if (!content || typeof content !== 'string') return null

  try {
    const parsed = JSON.parse(content) as unknown
    return parseExecutionStrategy(parsed)
  } catch {
    return null
  }
}

export async function generateExecutionStrategyFromContext(
  context: ExecutionCoachingContext
): Promise<ExecutionStrategy> {
  const deterministic = buildDeterministicExecutionStrategy(context)
  const allowedRequirementKeys = context.requirements.map((item) => item.normalized_key)

  if (!isConfigured()) return deterministic

  const llmStrategy = await callExecutionCoachLlm(context)
  if (!llmStrategy) return deterministic

  const validation = validateExecutionStrategy({
    strategy: llmStrategy,
    allowedRequirementKeys
  })
  if (!validation.isValid) return deterministic
  return llmStrategy
}

export function buildEmptyExecutionStrategy(location: string): ExecutionStrategy {
  return {
    whereYouStandNow: {
      strengths: [],
      missingMandatoryRequirements: [],
      competitiveDisadvantages: []
    },
    realBlockers: {
      requiredToApply: [],
      requiredToCompete: []
    },
    transferableEdge: {
      translations: []
    },
    plan90Day: {
      month1: { label: 'Month 1: Foundations', weeklyTimeInvestment: '0-0 hours/week', actions: [] },
      month2: { label: 'Month 2: Positioning', weeklyTimeInvestment: '0-0 hours/week', actions: [] },
      month3: { label: 'Month 3: Conversion', weeklyTimeInvestment: '0-0 hours/week', actions: [] }
    },
    probabilityRealityCheck: {
      difficulty: `No evidence-backed transition strategy available for ${location || 'this location'} yet.`,
      whatIncreasesOdds: [],
      commonFailureModes: []
    },
    behavioralExecution: {
      minimumWeeklyEffort: 'No minimum available until blockers are identified.',
      consistencyLooksLike: [],
      whatNotToDo: []
    }
  }
}
