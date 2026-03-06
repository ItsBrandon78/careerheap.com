import type { PlannerResultView } from '@/lib/planner/types'

export type PlannerViewMode = 'intake' | 'dashboard'

export type FallbackBadge = 'Needs data' | 'Estimate' | 'Add your info'

export interface DashboardFallbackValue<T> {
  value: T
  badge?: FallbackBadge
}

export interface PlannerDashboardRoadmapPhase {
  id: string
  title: string
  summary: string
  actions: string[]
  resources: Array<{ label: string; url?: string }>
  links: Array<{ label: string; url: string }>
  expandedByDefault: boolean
}

export interface PlannerDashboardAlternative {
  occupationId: string
  title: string
  difficulty: string
  timeline: string
  salary: string
}

export interface PlannerDashboardV3Model {
  missingFields: string[]
  summaryStrip: {
    planScore: string
    planStatus: string
    confidenceTrend: string
    modelVersion: string
    dataFreshness: string
  }
  summaryBar: {
    currentRole: string
    targetRole: string
    location: string
    timeline: string
    skillsCount: number
    lastUpdated: string
  }
  hero: {
    title: string
    insight: string
    scenarioModes: Array<{ label: string; active: boolean }>
    difficulty: DashboardFallbackValue<string>
    timeline: DashboardFallbackValue<string>
    probability: DashboardFallbackValue<string>
    trainingCost: DashboardFallbackValue<string>
    salaryPotential: DashboardFallbackValue<string>
  }
  difficultyBreakdown: {
    items: Array<{ label: string; score: number }>
    explanation: string
    driverImpactRows: Array<{ label: string; weight: number; impactPoints: number }>
    primaryBarrier: string
    coreAdvantage: string
  }
  skillTransfer: {
    transferable: Array<{ label: string; progress: number }>
    required: Array<{ label: string; progress: number }>
    largestGap: string
    evidenceRequired: string[]
  }
  roadmap: {
    phases: PlannerDashboardRoadmapPhase[]
  }
  fastestPath: {
    steps: Array<{ label: string; detail: string }>
    strongestPath: Array<{ label: string; detail: string }>
  }
  training: {
    courses: Array<{ name: string; provider: string; length: string; cost: string }>
  }
  marketSnapshot: {
    entryWage: DashboardFallbackValue<string>
    midCareerSalary: DashboardFallbackValue<string>
    topEarners: DashboardFallbackValue<string>
    localDemand: DashboardFallbackValue<string>
    hiringRequirements: DashboardFallbackValue<string>
  }
  outreach: {
    intro: string
  }
  realityCheck: {
    applicationsNeeded: DashboardFallbackValue<string>
    timeToOffer: DashboardFallbackValue<string>
    competitionLevel: DashboardFallbackValue<string>
    financialTradeoff: DashboardFallbackValue<string>
  }
  checklist: {
    immediate: string[]
    shortTerm: string[]
    longTerm: string[]
    progressPercent: number
    nowCompletionPercent: number
    nextCompletionPercent: number
    blockedCompletionPercent: number
    reminderBadges: string[]
  }
  alternatives: {
    cards: PlannerDashboardAlternative[]
    compareA: PlannerDashboardAlternative
    compareB: PlannerDashboardAlternative
  }
  insights: {
    welcomeBack: {
      title: string
      bodyLines: string[]
      recommendedAction: string
    }
    aiInsight: {
      summary: string
      trendLabel: string
      trendStartPercent: number
      trendEndPercent: number
      bars: number[]
    }
  }
  stickyPanel: {
    transition: string
    difficulty: string
    timeline: string
    nextSteps: string[]
    nextBestAction: string
    progressToOffer: number
  }
}

interface DashboardMapperInput {
  report: any | null
  plannerResult: PlannerResultView | null
  currentRole: string
  targetRole: string
  locationText: string
  timelineBucket: string
  skillsCount: number
  lastGeneratedAt: string | null
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, Math.round(value)))
}

function percentToDifficulty(score: number) {
  const normalized = clampPercent(score)
  const difficulty = 10 - normalized / 10
  return `${difficulty.toFixed(1)} / 10`
}

function fallbackTimeline(timelineBucket: string) {
  if (timelineBucket === 'immediate') return '0-1 month'
  if (timelineBucket === '1-3 months') return '1-3 months'
  if (timelineBucket === '3-6 months') return '3-6 months'
  if (timelineBucket === '6-12+ months') return '6-12 months'
  return '3-6 months'
}

function toReadableDate(iso: string | null) {
  if (!iso) return 'Just now'
  const parsed = new Date(iso)
  if (Number.isNaN(parsed.getTime())) return 'Just now'
  return parsed.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}

function toReadableShortDate(iso: string | null) {
  if (!iso) return 'Updated now'
  const parsed = new Date(iso)
  if (Number.isNaN(parsed.getTime())) return 'Updated now'
  return `Updated ${parsed.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric'
  })}`
}

function estimateTrainingCost(report: any | null) {
  const certifications = Array.isArray(report?.targetRequirements?.certifications)
    ? report.targetRequirements.certifications.length
    : 0

  if (certifications >= 3) return '$2k-$6k'
  if (certifications >= 1) return '$1k-$4k'
  return '$1k-$4k'
}

function salaryRangeToLabel(low: number | null | undefined, high: number | null | undefined, currency: string) {
  if (typeof low !== 'number' || typeof high !== 'number' || !Number.isFinite(low) || !Number.isFinite(high)) {
    return null
  }
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0
  })
  return `${formatter.format(low)}-${formatter.format(high)}`
}

function pushIfMissing(missingFields: string[], path: string, isMissing: boolean) {
  if (isMissing) {
    missingFields.push(path)
  }
}

export function buildPlannerDashboardV3Model(input: DashboardMapperInput): PlannerDashboardV3Model {
  const missingFields: string[] = []
  if (!input.report) {
    missingFields.push('report')
  }

  const roleCurrent = input.currentRole.trim() || 'Current role'
  const roleTarget = input.targetRole.trim() || input.report?.suggestedCareers?.[0]?.title || 'Target role'
  const transitionLabel = `${roleCurrent} to ${roleTarget}`

  const compatibilityScore =
    typeof input.report?.compatibilitySnapshot?.score === 'number'
      ? clampPercent(input.report.compatibilitySnapshot.score)
      : clampPercent(input.plannerResult?.score ?? 50)

  pushIfMissing(
    missingFields,
    'hero.difficulty',
    typeof input.report?.transitionMode?.difficulty?.score !== 'number'
  )
  pushIfMissing(
    missingFields,
    'hero.timeline',
    typeof input.report?.transitionMode?.timeline?.minMonths !== 'number' ||
      typeof input.report?.transitionMode?.timeline?.maxMonths !== 'number'
  )

  const difficultyLabel =
    typeof input.report?.transitionMode?.difficulty?.score === 'number'
      ? `${input.report.transitionMode.difficulty.score.toFixed(1)} / 10`
      : percentToDifficulty(compatibilityScore)

  const timelineLabel =
    typeof input.report?.transitionMode?.timeline?.minMonths === 'number' &&
    typeof input.report?.transitionMode?.timeline?.maxMonths === 'number'
      ? `${input.report.transitionMode.timeline.minMonths}-${input.report.transitionMode.timeline.maxMonths} months`
      : fallbackTimeline(input.timelineBucket)

  const primaryCareer = input.report?.suggestedCareers?.[0]
  const nativeSalary = primaryCareer?.salary?.native
  const salaryCurrency = nativeSalary?.currency === 'CAD' ? 'CAD' : 'USD'
  const salaryPotential = salaryRangeToLabel(nativeSalary?.low, nativeSalary?.high, salaryCurrency)
  const entryWage = salaryRangeToLabel(nativeSalary?.low, nativeSalary?.median, salaryCurrency)
  const midWage = salaryRangeToLabel(nativeSalary?.median, nativeSalary?.high, salaryCurrency)
  const topEarners = salaryRangeToLabel(nativeSalary?.high, nativeSalary?.high ? nativeSalary.high * 1.15 : null, salaryCurrency)

  pushIfMissing(missingFields, 'market.entry_wage', !entryWage)
  pushIfMissing(missingFields, 'market.mid_salary', !midWage)
  pushIfMissing(missingFields, 'market.top_earners', !topEarners)

  const difficultyBreakdownSource = input.report?.compatibilitySnapshot?.breakdown
  const difficultyItems = [
    {
      label: 'Skill Gap',
      score: clampPercent((difficultyBreakdownSource?.skill_overlap ?? compatibilityScore) as number)
    },
    {
      label: 'Education Gap',
      score: clampPercent((difficultyBreakdownSource?.education_alignment ?? compatibilityScore - 8) as number)
    },
    {
      label: 'Hiring Barrier',
      score: clampPercent((difficultyBreakdownSource?.certification_gap ?? compatibilityScore - 12) as number)
    },
    {
      label: 'Market Demand',
      score: clampPercent((difficultyBreakdownSource?.timeline_feasibility ?? compatibilityScore - 5) as number)
    },
    {
      label: 'Experience Requirement',
      score: clampPercent((difficultyBreakdownSource?.experience_similarity ?? compatibilityScore - 10) as number)
    }
  ]

  pushIfMissing(missingFields, 'difficulty.breakdown', !difficultyBreakdownSource)

  const transferableStrengths =
    (input.report?.transitionSections?.transferableStrengths as Array<{ label?: string }> | undefined)
      ?.map((item) => String(item.label ?? '').trim())
      .filter(Boolean)
      .slice(0, 5) ?? []

  const skillGaps =
    (input.report?.skillGaps as Array<{ skillName?: string; gapLevel?: string }> | undefined)
      ?.map((item) => ({
        label: String(item.skillName ?? '').trim(),
        progress: item.gapLevel === 'met' ? 85 : item.gapLevel === 'partial' ? 55 : 25
      }))
      .filter((item) => item.label.length > 0)
      .slice(0, 5) ?? []

  pushIfMissing(missingFields, 'skills.transferable', transferableStrengths.length === 0)
  pushIfMissing(missingFields, 'skills.required', skillGaps.length === 0)

  const transferable =
    transferableStrengths.length > 0
      ? transferableStrengths.map((label, index) => ({
          label,
          progress: 78 - index * 8
        }))
      : [
          { label: 'Operational reliability', progress: 72 },
          { label: 'Safety discipline', progress: 68 },
          { label: 'Team coordination', progress: 64 }
        ]

  const required =
    skillGaps.length > 0
      ? skillGaps
      : [
          { label: 'Role-specific technical fundamentals', progress: 30 },
          { label: 'Credential-aligned safety evidence', progress: 35 },
          { label: 'Employer-ready work samples', progress: 40 }
        ]

  const roadmapFromGuide = Array.isArray(input.report?.transitionMode?.roadmapGuide?.phases)
    ? input.report.transitionMode.roadmapGuide.phases
    : []

  const roadmapPhases: PlannerDashboardRoadmapPhase[] =
    roadmapFromGuide.length > 0
      ? roadmapFromGuide.slice(0, 4).map((phase: any, index: number) => ({
          id: `phase-${index + 1}`,
          title: phase.label || `Phase ${index + 1}`,
          summary: phase.focus || 'Focused transition workstream.',
          actions: Array.isArray(phase.steps)
            ? phase.steps
                .map((step: any) => String(step?.title ?? '').trim())
                .filter(Boolean)
                .slice(0, 4)
            : [],
          resources:
            index === 1
              ? [
                  { label: 'Training catalog' },
                  { label: 'Grant eligibility guide' }
                ]
              : [{ label: 'CareerHeap guidance notes' }],
          links:
            index === 2
              ? [{ label: 'Job Bank', url: 'https://www.jobbank.gc.ca' }]
              : [{ label: 'Provincial pathways', url: 'https://www.ontario.ca' }],
          expandedByDefault: index === 1
        }))
      : [
          {
            id: 'phase-1',
            title: 'Phase 1 - Preparation',
            summary: 'Define role positioning and application story.',
            actions: ['Clarify target employers', 'Refine resume angle', 'Set weekly outreach targets'],
            resources: [{ label: 'Resume framework checklist' }],
            links: [{ label: 'CareerHeap planner guide', url: '/tools/career-switch-planner' }],
            expandedByDefault: false
          },
          {
            id: 'phase-2',
            title: 'Phase 2 - Training',
            summary: 'Close immediate skill and credential gaps.',
            actions: ['Complete required safety credential', 'Start foundations course', 'Build one proof project'],
            resources: [{ label: 'Local provider directory' }, { label: 'Funding options list' }],
            links: [{ label: 'Job Bank', url: 'https://www.jobbank.gc.ca' }],
            expandedByDefault: true
          },
          {
            id: 'phase-3',
            title: 'Phase 3 - Job Search',
            summary: 'Convert readiness into interviews.',
            actions: ['Send targeted outreach weekly', 'Track follow-ups in CRM', 'Run interview drills'],
            resources: [{ label: 'Outreach script library' }],
            links: [{ label: 'LinkedIn Jobs', url: 'https://www.linkedin.com/jobs' }],
            expandedByDefault: true
          },
          {
            id: 'phase-4',
            title: 'Phase 4 - Entry Into Field',
            summary: 'Stabilize in role and hit onboarding checkpoints.',
            actions: ['Complete 30/60/90 review goals', 'Document measurable outcomes'],
            resources: [{ label: 'Onboarding checklist' }],
            links: [{ label: 'Career growth plan', url: '/tools/career-switch-planner' }],
            expandedByDefault: false
          }
        ]

  pushIfMissing(missingFields, 'roadmap.phases', roadmapFromGuide.length === 0)

  const fastestPathSource =
    (input.report?.transitionSections?.roadmapPlan?.fastestPathToApply as string[] | undefined) ??
    (input.report?.transitionReport?.plan30_60_90?.fastestPathToApply as Array<{ goal?: string }> | undefined)
      ?.map((item) => String(item.goal ?? '').trim())

  const fastestPath =
    Array.isArray(fastestPathSource) && fastestPathSource.length > 0
      ? fastestPathSource.slice(0, 4).map((item, index) => ({
          label: `Month ${index + 1}`,
          detail: item
        }))
      : [
          { label: 'Month 1', detail: 'Complete baseline credential and contact 20 target employers.' },
          { label: 'Month 2', detail: 'Enroll in core technical foundations course.' },
          { label: 'Month 3-4', detail: 'Secure apprenticeship or entry-track sponsorship.' }
        ]

  pushIfMissing(missingFields, 'fastest_path.steps', !fastestPathSource || fastestPathSource.length === 0)

  const certifications =
    (input.report?.targetRequirements?.certifications as string[] | undefined)?.filter(Boolean).slice(0, 3) ?? []
  const trainingCourses =
    certifications.length > 0
      ? certifications.map((name) => ({
          name,
          provider: 'Local approved provider',
          length: '4-8 weeks',
          cost: 'Confirm with provider'
        }))
      : [
          {
            name: 'Foundations course (recommended)',
            provider: 'Local approved provider',
            length: '6-10 weeks',
            cost: estimateTrainingCost(input.report)
          }
        ]

  pushIfMissing(missingFields, 'training.certifications', certifications.length === 0)

  const marketSnapshot = input.report?.transitionReport?.marketSnapshot
  const localDemandLabel =
    typeof marketSnapshot?.summaryLine === 'string' && marketSnapshot.summaryLine.trim().length > 0
      ? marketSnapshot.summaryLine
      : 'Unknown - needs data source'

  pushIfMissing(missingFields, 'market.local_demand', !marketSnapshot?.summaryLine)

  const hiringReqCount = Array.isArray(marketSnapshot?.topRequirements)
    ? marketSnapshot.topRequirements.length
    : 0

  pushIfMissing(missingFields, 'market.hiring_requirements', hiringReqCount === 0)

  const reality = input.report?.transitionMode?.reality
  const probabilityRealityCheck = input.report?.executionStrategy?.probabilityRealityCheck

  pushIfMissing(missingFields, 'reality.barriers', !Array.isArray(reality?.barriers) || reality.barriers.length === 0)

  const checklistImmediate =
    (input.report?.transitionSections?.roadmapPlan?.zeroToTwoWeeks as Array<{ action?: string }> | undefined)
      ?.map((item) => String(item.action ?? '').trim())
      .filter(Boolean)
      .slice(0, 4) ?? []
  const checklistShortTerm =
    (input.report?.transitionSections?.roadmapPlan?.oneToThreeMonths as Array<{ action?: string }> | undefined)
      ?.map((item) => String(item.action ?? '').trim())
      .filter(Boolean)
      .slice(0, 4) ?? []
  const checklistLongTerm =
    (input.report?.transitionSections?.roadmapPlan?.threeToTwelveMonths as Array<{ action?: string }> | undefined)
      ?.map((item) => String(item.action ?? '').trim())
      .filter(Boolean)
      .slice(0, 4) ?? []

  const nowFallback = ['Finalize resume positioning', 'Apply to 10 targeted roles', 'Complete one credential milestone']
  const shortFallback = ['Run weekly outreach cadence', 'Build two work-sample proofs', 'Track interviews and feedback']
  const longFallback = ['Stabilize in role with 30/60/90 milestones', 'Build next-level specialization plan']

  const alternatives =
    (input.report?.suggestedCareers as Array<any> | undefined)
      ?.slice(0, 4)
      .map((item) => ({
        occupationId: String(item.occupationId ?? item.title ?? 'alt-role'),
        title: String(item.title ?? 'Alternative role'),
        difficulty: String(item.difficulty ?? 'moderate'),
        timeline: String(item.transitionTime ?? '3-9 months'),
        salary:
          salaryRangeToLabel(item?.salary?.native?.low, item?.salary?.native?.high, item?.salary?.native?.currency || 'USD') ||
          'Estimate pending data'
      })) ?? []

  pushIfMissing(missingFields, 'alternatives.cards', alternatives.length === 0)

  const driverImpactRows = [
    { label: 'Skill Gap', weight: 35, score: difficultyItems[0]?.score ?? compatibilityScore },
    { label: 'Education Gap', weight: 20, score: difficultyItems[1]?.score ?? compatibilityScore },
    { label: 'Hiring Barrier', weight: 20, score: difficultyItems[2]?.score ?? compatibilityScore },
    { label: 'Market Demand', weight: 15, score: difficultyItems[3]?.score ?? compatibilityScore },
    { label: 'Experience Requirement', weight: 10, score: difficultyItems[4]?.score ?? compatibilityScore }
  ].map((item) => ({
    label: item.label,
    weight: item.weight,
    impactPoints: Math.round(((item.score - 50) / 50) * item.weight)
  }))

  const evidenceRequiredSource = [
    ...(Array.isArray(input.report?.targetRequirements?.hardGates) ? input.report.targetRequirements.hardGates : []),
    ...(Array.isArray(input.report?.targetRequirements?.certifications)
      ? input.report.targetRequirements.certifications.map((item: string) => `Credential: ${item}`)
      : [])
  ]
    .map((item) => String(item ?? '').trim())
    .filter(Boolean)
    .slice(0, 4)
  const evidenceRequired =
    evidenceRequiredSource.length > 0
      ? evidenceRequiredSource
      : [
          'Safety certification IDs uploaded',
          'One practical work-sample proof project',
          'Resume version tailored to role language',
          'Two references prepared for employer calls'
        ]

  const strongestPathSource =
    (input.report?.transitionSections?.roadmapPlan?.strongCandidatePath as string[] | undefined)?.filter(Boolean) ??
    []
  const strongestPath =
    strongestPathSource.length > 0
      ? strongestPathSource.slice(0, 4).map((item, index) => ({
          label: `Month ${index + 1}`,
          detail: item
        }))
      : [
          { label: 'Month 1', detail: 'Stack certifications and publish one credible proof project.' },
          { label: 'Month 2', detail: 'Refine resume narrative to apprenticeship job language and outcomes.' },
          { label: 'Month 3-4', detail: 'Push high-frequency outreach and convert warm leads to interviews.' }
        ]

  const fallbackCards: PlannerDashboardAlternative[] = [
    { occupationId: 'hvac-tech', title: 'HVAC Technician', difficulty: 'moderate', timeline: '4-9 months', salary: 'Estimate pending data' },
    { occupationId: 'construction-supervisor', title: 'Construction Supervisor', difficulty: 'moderate', timeline: '6-12 months', salary: 'Estimate pending data' },
    { occupationId: 'operations-manager', title: 'Operations Manager', difficulty: 'hard', timeline: '6-12 months', salary: 'Estimate pending data' },
    { occupationId: 'logistics-coordinator', title: 'Logistics Coordinator', difficulty: 'moderate', timeline: '3-6 months', salary: 'Estimate pending data' }
  ]
  const alternativeCards = alternatives.length > 0 ? alternatives : fallbackCards
  const compareA = alternativeCards[0] ?? fallbackCards[0]
  const compareB = alternativeCards[1] ?? fallbackCards[1]

  const trendStartPercent = clampPercent(Math.max(35, compatibilityScore - 6))
  const trendEndPercent = clampPercent(compatibilityScore)
  const trendBars = [44, 52, 58, 66, 72, 78]
  const progressPercent = clampPercent(Math.min(90, compatibilityScore * 0.6))

  const missingFallbackFields = Array.from(new Set(missingFields)).sort()

  return {
    missingFields: missingFallbackFields,
    summaryStrip: {
      planScore: `${compatibilityScore} / 100`,
      planStatus:
        compatibilityScore >= 70 ? 'On Track (Week 2)' : compatibilityScore >= 55 ? 'At Risk (Week 2)' : 'Recovery Plan',
      confidenceTrend: `${trendEndPercent - trendStartPercent >= 0 ? '+' : ''}${trendEndPercent - trendStartPercent} pts`,
      modelVersion: 'Career Graph v2.3',
      dataFreshness: toReadableShortDate(input.lastGeneratedAt)
    },
    summaryBar: {
      currentRole: roleCurrent,
      targetRole: roleTarget,
      location: input.locationText.trim() || 'Not set',
      timeline: input.timelineBucket,
      skillsCount: input.skillsCount,
      lastUpdated: toReadableDate(input.lastGeneratedAt)
    },
    hero: {
      title: transitionLabel,
      insight:
        input.report?.transitionStructuredPlan?.summary ||
        input.report?.transitionMode?.difficulty?.why?.[0] ||
        'This transition is achievable with focused execution and consistent weekly outputs.',
      scenarioModes: [
        { label: 'Fastest', active: true },
        { label: 'Balanced', active: false },
        { label: 'Low Risk', active: false }
      ],
      difficulty: {
        value: difficultyLabel,
        badge: missingFallbackFields.includes('hero.difficulty') ? 'Estimate' : undefined
      },
      timeline: {
        value: timelineLabel,
        badge: missingFallbackFields.includes('hero.timeline') ? 'Estimate' : undefined
      },
      probability: {
        value: `${clampPercent(compatibilityScore)}%`,
        badge: undefined
      },
      trainingCost: {
        value: estimateTrainingCost(input.report),
        badge: missingFallbackFields.includes('training.certifications') ? 'Estimate' : undefined
      },
      salaryPotential: {
        value: salaryPotential || 'Regional estimate',
        badge: !salaryPotential ? 'Estimate' : undefined
      }
    },
    difficultyBreakdown: {
      items: difficultyItems,
      explanation:
        input.report?.transitionMode?.difficulty?.why?.[0] ||
        'Biggest barrier is proving role-specific evidence quickly; biggest advantage is transferable execution discipline.',
      driverImpactRows,
      primaryBarrier:
        required[0]?.label || 'Technical theory and certification sequencing are the slowest moving constraints.',
      coreAdvantage:
        transferable[0]?.label || 'Operational reliability and shift discipline map well to employer expectations.'
    },
    skillTransfer: {
      transferable,
      required,
      largestGap: required[0]?.label || 'Role-specific technical evidence',
      evidenceRequired
    },
    roadmap: {
      phases: roadmapPhases
    },
    fastestPath: {
      steps: fastestPath,
      strongestPath
    },
    training: {
      courses: trainingCourses
    },
    marketSnapshot: {
      entryWage: {
        value: entryWage || 'Based on typical entry ranges in your region',
        badge: !entryWage ? 'Estimate' : undefined
      },
      midCareerSalary: {
        value: midWage || 'Based on typical mid-career ranges in your region',
        badge: !midWage ? 'Estimate' : undefined
      },
      topEarners: {
        value: topEarners || 'Based on upper-band regional estimates',
        badge: !topEarners ? 'Estimate' : undefined
      },
      localDemand: {
        value: localDemandLabel,
        badge: !marketSnapshot?.summaryLine ? 'Needs data' : undefined
      },
      hiringRequirements: {
        value:
          hiringReqCount > 0
            ? `${hiringReqCount} recurring requirement signals in employer evidence`
            : 'Add target posting or market evidence to surface requirement frequency',
        badge: hiringReqCount > 0 ? undefined : 'Add your info'
      }
    },
    outreach: {
      intro: 'Use concise, evidence-based messaging tied to real employer requirements.'
    },
    realityCheck: {
      applicationsNeeded: {
        value: `${Math.max(12, Math.round((100 - compatibilityScore) / 3) + 18)} applications`,
        badge: undefined
      },
      timeToOffer: {
        value: timelineLabel,
        badge: missingFallbackFields.includes('hero.timeline') ? 'Estimate' : undefined
      },
      competitionLevel: {
        value:
          probabilityRealityCheck?.difficulty ||
          (compatibilityScore >= 70 ? 'Moderate' : compatibilityScore >= 50 ? 'Moderate-High' : 'High'),
        badge: !probabilityRealityCheck?.difficulty ? 'Estimate' : undefined
      },
      financialTradeoff: {
        value: reality?.barriers?.[0] || 'Short-term income tradeoff may be required while you build entry evidence.',
        badge: !reality?.barriers?.[0] ? 'Estimate' : undefined
      }
    },
    checklist: {
      immediate: checklistImmediate.length > 0 ? checklistImmediate : nowFallback,
      shortTerm: checklistShortTerm.length > 0 ? checklistShortTerm : shortFallback,
      longTerm: checklistLongTerm.length > 0 ? checklistLongTerm : longFallback,
      progressPercent,
      nowCompletionPercent: clampPercent(Math.min(95, compatibilityScore * 0.48)),
      nextCompletionPercent: clampPercent(Math.min(80, compatibilityScore * 0.22)),
      blockedCompletionPercent: clampPercent(Math.min(45, compatibilityScore * 0.1)),
      reminderBadges: ['Reminders: On', 'Review every Friday', 'Streak: 2 weeks']
    },
    alternatives: {
      cards: alternativeCards,
      compareA,
      compareB
    },
    insights: {
      welcomeBack: {
        title: 'Welcome back.',
        bodyLines: [
          `Your transition progress improved to ${clampPercent(Math.min(95, compatibilityScore * 0.69))}% this week.`,
          'Two contractors opened your application.'
        ],
        recommendedAction:
          input.report?.bottleneck?.nextAction || 'Follow up with Mason Electrical.'
      },
      aiInsight: {
        summary:
          'Confidence is rising as you complete credentials. Biggest risk: credential delay. Biggest advantage: operational reliability and team discipline.',
        trendLabel: 'Confidence Trend',
        trendStartPercent,
        trendEndPercent,
        bars: trendBars
      }
    },
    stickyPanel: {
      transition: transitionLabel,
      difficulty: difficultyLabel,
      timeline: timelineLabel,
      nextSteps: (checklistImmediate.length > 0 ? checklistImmediate : nowFallback).slice(0, 4),
      nextBestAction:
        input.report?.bottleneck?.nextAction ||
        input.report?.transitionMode?.gaps?.first3Steps?.[0] ||
        'Follow up with 5 warm employers this week and log outcomes.',
      progressToOffer: clampPercent(compatibilityScore * 0.55)
    }
  }
}
