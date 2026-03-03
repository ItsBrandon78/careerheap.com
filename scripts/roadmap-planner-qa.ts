import process from 'node:process'
import {
  generateCareerMapPlannerAnalysis,
  type CareerPlannerAnalysis,
  type CareerPlannerInput
} from '../lib/server/careerMapPlanner'
import {
  resolveOccupation,
  type ResolvedOccupation
} from '../lib/occupations/resolveOccupation'
import { generateTransitionPlan } from '../lib/transition/generatePlan'
import { TransitionModeSchema } from '../lib/transition/types'

type PersonaId = 'minimal' | 'rich' | 'nontraditional'
type TargetFamily =
  | 'regulated_healthcare'
  | 'executive'
  | 'technology'
  | 'construction'
  | 'engineering'

type ScenarioCase = {
  id: string
  targetJob: string
  persona: PersonaId
  currentRole: string
  skills: string[]
  experienceText: string
  education: string
  timeline: string
  incomeTarget: string
  location: string
}

type QaIssue = {
  severity: 'Critical' | 'High' | 'Medium' | 'Low'
  message: string
  rootCause: 'data' | 'prompt' | 'ui' | 'parsing' | 'logic'
  proposedFix: string
  acceptanceCriteria: string
}

type ScenarioRunResult = {
  scenario: ScenarioCase
  currentResolution: ResolvedOccupation
  targetResolution: ResolvedOccupation
  analysis: CareerPlannerAnalysis
  transitionPlan: ReturnType<typeof generateTransitionPlan>
  issues: QaIssue[]
}

const CANADA_2026_TOP_JOBS = [
  'Orthodontist',
  'Anesthesiologist',
  'Psychiatrist',
  'Surgeon',
  'Cardiologist',
  'Physician (Family or General Practice)',
  'Chief Marketing Officer',
  'Software Engineering Manager',
  'Vice President',
  'Director of Information Technology',
  'Enterprise Architect',
  'Corporate Controller',
  'Software Architect',
  'Pharmacist',
  'Data Scientist',
  'Product Manager',
  'Cybersecurity Analyst',
  'Sales Director',
  'Construction Manager',
  'Mechanical Engineer'
] as const

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function targetFamilyForJob(job: string): TargetFamily {
  if (
    /\b(orthodontist|anesthesiologist|psychiatrist|surgeon|cardiologist|physician|pharmacist)\b/i.test(
      job
    )
  ) {
    return 'regulated_healthcare'
  }
  if (
    /\b(chief marketing officer|vice president|director of information technology|corporate controller|sales director)\b/i.test(
      job
    )
  ) {
    return 'executive'
  }
  if (/\b(software|data scientist|product manager|cybersecurity|enterprise architect)\b/i.test(job)) {
    return 'technology'
  }
  if (/\bconstruction manager\b/i.test(job)) return 'construction'
  return 'engineering'
}

function buildScenario(targetJob: string, persona: PersonaId): ScenarioCase {
  const family = targetFamilyForJob(targetJob)

  if (persona === 'minimal') {
    const currentRole =
      family === 'regulated_healthcare'
        ? 'Customer Service Representative'
        : family === 'executive'
          ? 'Operations Coordinator'
          : family === 'technology'
            ? 'IT Support Specialist'
            : family === 'construction'
              ? 'Warehouse Associate'
              : 'Assembler'

    return {
      id: `${slugify(targetJob)}-minimal`,
      targetJob,
      persona,
      currentRole,
      skills: [],
      experienceText: '',
      education: 'High school',
      timeline: '6-12+ months',
      incomeTarget: 'Not sure',
      location: 'Canada'
    }
  }

  if (persona === 'rich') {
    if (family === 'regulated_healthcare') {
      return {
        id: `${slugify(targetJob)}-rich`,
        targetJob,
        persona,
        currentRole: targetJob === 'Pharmacist' ? 'Pharmacy Assistant' : 'Medical Office Assistant',
        skills: ['Documentation', 'Client communication', 'Process discipline', 'Scheduling'],
        experienceText:
          'Supported patient-facing operations, maintained accurate records, coordinated schedules, and handled documentation in a regulated environment.',
        education: targetJob === 'Pharmacist' ? "Bachelor's" : "Associate's",
        timeline: '6-12+ months',
        incomeTarget: '$100k+',
        location: 'Canada'
      }
    }

    if (family === 'executive') {
      const currentRole =
        targetJob === 'Chief Marketing Officer'
          ? 'Marketing Manager'
          : targetJob === 'Corporate Controller'
            ? 'Senior Accountant'
            : targetJob === 'Sales Director'
              ? 'Sales Manager'
              : 'IT Manager'

      return {
        id: `${slugify(targetJob)}-rich`,
        targetJob,
        persona,
        currentRole,
        skills: ['Leadership', 'Budget ownership', 'Stakeholder communication', 'Process improvement'],
        experienceText:
          'Led cross-functional initiatives, managed operating budgets, improved team performance, and reported results to senior stakeholders.',
        education: "Bachelor's",
        timeline: '3-6 months',
        incomeTarget: '$150k+',
        location: 'Canada'
      }
    }

    if (family === 'technology') {
      const currentRole =
        targetJob === 'Data Scientist'
          ? 'Data Analyst'
          : targetJob === 'Cybersecurity Analyst'
            ? 'Systems Administrator'
            : targetJob === 'Product Manager'
              ? 'Business Analyst'
              : 'Senior Software Developer'

      return {
        id: `${slugify(targetJob)}-rich`,
        targetJob,
        persona,
        currentRole,
        skills: ['SQL', 'Stakeholder communication', 'Documentation', 'Problem solving'],
        experienceText:
          'Built production dashboards, translated business requirements into technical work, and shipped improvements with engineering teams.',
        education: "Bachelor's",
        timeline: '3-6 months',
        incomeTarget: '$100k+',
        location: 'Canada'
      }
    }

    if (family === 'construction') {
      return {
        id: `${slugify(targetJob)}-rich`,
        targetJob,
        persona,
        currentRole: 'Site Supervisor',
        skills: ['Scheduling', 'Safety', 'Team coordination', 'Documentation'],
        experienceText:
          'Coordinated subcontractors, tracked site safety, kept schedules moving, and handled change orders on active projects.',
        education: 'Trade certification',
        timeline: '3-6 months',
        incomeTarget: '$100k+',
        location: 'Canada'
      }
    }

    return {
      id: `${slugify(targetJob)}-rich`,
      targetJob,
      persona,
      currentRole: 'Mechanical Technologist',
      skills: ['CAD', 'Troubleshooting', 'Documentation', 'Process discipline'],
      experienceText:
        'Supported design revisions, maintained technical documentation, and worked with engineers to troubleshoot mechanical issues.',
      education: "Bachelor's",
      timeline: '3-6 months',
      incomeTarget: '$100k+',
      location: 'Canada'
    }
  }

  const currentRole =
    family === 'technology'
      ? 'Teacher'
      : family === 'executive'
        ? 'Restaurant Manager'
        : family === 'regulated_healthcare'
          ? 'Line Cook'
          : family === 'construction'
            ? 'Landscaper'
            : 'Warehouse Associate'

  return {
    id: `${slugify(targetJob)}-nontraditional`,
    targetJob,
    persona,
    currentRole,
    skills: ['Reliability', 'Teamwork', 'Stamina'],
    experienceText:
      'Coming from a non-traditional background, needs a clear path, wants timeline clarity, and can only move forward with low upfront cost.',
    education: 'High school',
    timeline: '6-12+ months',
    incomeTarget: '$100k+',
    location: 'Canada'
  }
}

function buildMatrix() {
  return CANADA_2026_TOP_JOBS.flatMap((job) => [
    buildScenario(job, 'minimal'),
    buildScenario(job, 'rich'),
    buildScenario(job, 'nontraditional')
  ])
}

function buildFallbackResolution(title: string, region: 'CA' | 'US' = 'CA'): ResolvedOccupation {
  return {
    resolved: true,
    occupationId: `${region.toLowerCase()}-${slugify(title)}`,
    title,
    code: `${region.toLowerCase()}-${slugify(title)}`,
    source: 'internal',
    confidence: 0.82,
    alternatives: [],
    specialization: null,
    stage: null,
    rawInputTitle: title,
    region,
    lastUpdated: null
  }
}

async function resolveWithFallback(title: string, location: string) {
  try {
    return await resolveOccupation(title, location, {
      region: 'CA'
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (
      message.includes('Missing NEXT_PUBLIC_SUPABASE_URL') ||
      message.includes('SUPABASE_SECRET_KEY')
    ) {
      return buildFallbackResolution(title, 'CA')
    }
    throw error
  }
}

function normalizeSource(value: string) {
  const normalized = value.toLowerCase()
  if (normalized === 'onet') return 'O*NET' as const
  if (normalized === 'noc') return 'NOC' as const
  return 'internal' as const
}

function toResolutionSummary(resolution: ResolvedOccupation) {
  return {
    title: resolution.title,
    code: resolution.code,
    source: normalizeSource(resolution.source),
    confidence: resolution.confidence,
    stage: resolution.stage ?? null,
    specialization: resolution.specialization ?? null,
    rawInputTitle: resolution.rawInputTitle,
    region: resolution.region
  }
}

function fallbackBreakdown(baseScore: number) {
  return {
    skill_overlap: Math.max(15, Math.min(85, Math.round(baseScore - 8))),
    experience_similarity: Math.max(10, Math.min(80, Math.round(baseScore - 12))),
    education_alignment: Math.max(5, Math.min(90, Math.round(baseScore - 6))),
    certification_gap: Math.max(5, Math.min(95, Math.round(100 - baseScore))),
    timeline_feasibility: Math.max(10, Math.min(90, Math.round(baseScore - 10)))
  }
}

function buildFallbackAnalysis(
  scenario: ScenarioCase,
  targetResolution: ResolvedOccupation
): CareerPlannerAnalysis {
  const family = targetFamilyForJob(scenario.targetJob)
  const targetTitle = targetResolution.title || scenario.targetJob
  const regulated = family === 'regulated_healthcare'
  const baseScore =
    scenario.persona === 'rich'
      ? regulated
        ? 52
        : 68
      : scenario.persona === 'nontraditional'
        ? regulated
          ? 28
          : 44
        : regulated
          ? 24
          : 50
  const breakdown = fallbackBreakdown(baseScore)

  const education =
    family === 'regulated_healthcare'
      ? scenario.targetJob === 'Pharmacist'
        ? 'Pharmacy degree plus provincial licensure'
        : 'Medical degree, specialty training, and provincial licensure'
      : family === 'executive'
        ? "Bachelor's plus leadership track record"
        : family === 'technology'
          ? "Bachelor's or equivalent applied proof"
          : family === 'construction'
            ? 'Trade / project background plus site leadership experience'
            : "Bachelor's in a related engineering field"

  const certifications =
    family === 'regulated_healthcare'
      ? scenario.targetJob === 'Pharmacist'
        ? ['Provincial pharmacist licence']
        : ['Provincial physician / specialist licence']
      : family === 'technology'
        ? scenario.targetJob === 'Cybersecurity Analyst'
          ? ['Security certification (often preferred)']
          : []
        : []

  const hardGates =
    family === 'regulated_healthcare'
      ? scenario.targetJob === 'Pharmacist'
        ? ['Credential assessment if trained outside Canada', 'Registration with the provincial college']
        : [
            'Credential recognition if trained outside Canada',
            'Registration with the provincial medical regulator',
            'Specialty training / residency pathway'
          ]
      : family === 'construction'
        ? ['Employer track record managing cost, safety, and schedule']
        : family === 'executive'
          ? ['Documented ownership at the next scope level']
          : []

  const employerSignals =
    family === 'regulated_healthcare'
      ? ['Credential eligibility', 'Provincial readiness', 'Supervised clinical experience']
      : family === 'executive'
        ? ['P&L ownership', 'Cross-functional leadership', 'Executive communication']
        : family === 'technology'
          ? ['Applied proof', 'System design judgment', 'Stakeholder communication']
          : family === 'construction'
            ? ['Schedule control', 'Safety leadership', 'Subcontractor coordination']
            : ['Design software fluency', 'Technical calculations', 'Project documentation']

  const mustHaves = [...hardGates, ...certifications].slice(0, 4).map((label, index) => ({
    id: `${slugify(targetTitle)}-must-${index + 1}`,
    normalized_key: slugify(label),
    label,
    frequency_count: 6 - index,
    frequency_percent: 60 - index * 8,
    evidenceQuote: [],
    status: 'missing' as const,
    howToGet:
      family === 'regulated_healthcare'
        ? 'Verify the regulator sequence, confirm credential recognition, and map the first application checkpoint.'
        : 'Name the exact requirement, confirm the route to get it, and move the first checkpoint this week.',
    timeEstimate:
      family === 'regulated_healthcare' ? 'Varies by province and credential history' : '4-12 weeks'
  }))

  return {
    report: {
      compatibilitySnapshot: {
        score: baseScore,
        band: baseScore >= 70 ? 'strong' : baseScore >= 45 ? 'moderate' : 'weak',
        breakdown,
        topReasons: [
          regulated
            ? 'This is a regulated path with formal gates, so the path matters more than raw compatibility.'
            : 'The move is possible, but the roadmap needs to tighten around concrete employer proof.'
        ]
      },
      suggestedCareers: [
        {
          occupationId: targetResolution.occupationId || slugify(targetTitle),
          title: targetTitle,
          score: baseScore,
          breakdown,
          salary: {
            usd: null,
            native: {
              currency: 'CAD',
              low: regulated ? 90000 : family === 'executive' ? 120000 : 85000,
              median: regulated ? 180000 : family === 'executive' ? 170000 : 110000,
              high: regulated ? 320000 : family === 'executive' ? 240000 : 145000,
              sourceName: 'QA fallback fixture',
              sourceUrl: null,
              asOfDate: '2026-03-03',
              region: scenario.location
            },
            conversion: null
          },
          difficulty: regulated ? 'hard' : baseScore >= 65 ? 'moderate' : 'hard',
          transitionTime: regulated ? '12+ months' : scenario.timeline,
          regulated,
          officialLinks: [],
          topReasons: [
            `This plan is anchored to ${targetTitle} rather than a generic adjacent role.`,
            regulated
              ? 'The gating issue is licensure and eligibility, not just skill overlap.'
              : 'The gating issue is proof, scope fit, and employer confidence.'
          ]
        }
      ],
      skillGaps: employerSignals.slice(0, 3).map((item, index) => ({
        skillId: `${slugify(targetTitle)}-gap-${index + 1}`,
        skillName: item,
        weight: 1 - index * 0.1,
        difficulty: index === 0 ? 'hard' as const : 'medium' as const,
        gapLevel: 'missing' as const,
        frequency: 5 - index,
        howToClose: [
          `Make ${item} visible with one concrete proof example.`,
          'Use a weekly checkpoint so the gap is measurable.'
        ],
        evidence: [],
        evidenceLabel: 'QA fallback'
      })),
      roadmap: mustHaves.map((item, index) => ({
        id: `${slugify(targetTitle)}-roadmap-${index + 1}`,
        phase: index === 0 ? 'immediate' as const : index === 1 ? '1_3_months' as const : '3_6_months' as const,
        title: item.label,
        time_estimate_hours: 6 + index * 4,
        difficulty: index === 0 ? 'hard' as const : 'medium' as const,
        why_it_matters: 'This blocks the next step if you skip it.',
        action: item.howToGet
      })),
      resumeReframe: [],
      linksResources: [],
      targetRequirements: {
        education,
        certifications,
        hardGates,
        employerSignals,
        apprenticeshipHours: null,
        examRequired: regulated,
        regulated,
        sources: []
      },
      transitionSections: {
        mandatoryGateRequirements: mustHaves.map((item, index) => ({
          id: `${slugify(targetTitle)}-gate-${index + 1}`,
          label: item.label,
          status: 'missing' as const,
          gapLevel: 'missing' as const,
          frequency: 5 - index,
          howToGet: item.howToGet,
          estimatedTime: item.timeEstimate,
          evidenceLabel: 'QA fallback',
          evidence: []
        })),
        coreHardSkills: employerSignals.slice(0, 3).map((item, index) => ({
          id: `${slugify(targetTitle)}-skill-${index + 1}`,
          label: item,
          gapLevel: 'missing' as const,
          frequency: 5 - index,
          howToLearn: `Build one repeatable weekly block tied to ${item}.`,
          evidenceLabel: 'QA fallback',
          evidence: []
        })),
        toolsPlatforms: [],
        experienceSignals: [
          {
            id: `${slugify(targetTitle)}-proof-1`,
            label: regulated ? 'Supervised practice or eligibility proof' : 'Documented target-role proof',
            gapLevel: 'missing' as const,
            frequency: 5,
            howToBuild: 'Use weekly output to create visible evidence of readiness.',
            evidenceLabel: 'QA fallback',
            evidence: []
          }
        ],
        transferableStrengths: scenario.skills.slice(0, 3).map((skill, index) => ({
          id: `${slugify(targetTitle)}-strength-${index + 1}`,
          label: skill,
          requirement: employerSignals[0] || 'Role fit',
          source: 'skills' as const
        })),
        roadmapPlan: {
          zeroToTwoWeeks: mustHaves.slice(0, 2).map((item, index) => ({
            id: `${slugify(targetTitle)}-z2-${index + 1}`,
            action: `Start ${item.label.toLowerCase()} this week.`,
            tiedRequirement: item.label
          })),
          oneToThreeMonths: employerSignals.slice(0, 2).map((item, index) => ({
            id: `${slugify(targetTitle)}-m3-${index + 1}`,
            action: `Build one visible proof tied to ${item.toLowerCase()}.`,
            tiedRequirement: item
          })),
          threeToTwelveMonths: [
            {
              id: `${slugify(targetTitle)}-m12-1`,
              action: regulated
                ? 'Keep the regulated sequence moving until you reach the next eligibility checkpoint.'
                : 'Turn early proof into stronger applied results and better interviews.',
              tiedRequirement: regulated ? 'Formal eligibility' : 'Employer-ready proof'
            }
          ],
          fastestPathToApply: mustHaves.slice(0, 2).map((item) => item.label),
          strongCandidatePath: [...hardGates.slice(0, 2), ...employerSignals.slice(0, 1)]
        }
      },
      transitionReport: {
        marketSnapshot: {
          role: targetTitle,
          location: scenario.location,
          summaryLine: `QA fallback summary for ${targetTitle}.`,
          topRequirements: mustHaves.map((item) => ({
            id: item.id,
            normalized_key: item.normalized_key,
            label: item.label,
            frequency_count: item.frequency_count,
            frequency_percent: item.frequency_percent,
            evidenceQuote: []
          })),
          topTools: [],
          gateBlockers: mustHaves.map((item) => ({
            id: item.id,
            normalized_key: item.normalized_key,
            label: item.label,
            frequency_count: item.frequency_count,
            frequency_percent: item.frequency_percent,
            evidenceQuote: []
          }))
        },
        mustHaves,
        niceToHaves: employerSignals.slice(0, 2).map((item, index) => ({
          id: `${slugify(targetTitle)}-nice-${index + 1}`,
          normalized_key: slugify(item),
          label: item,
          frequency_count: 4 - index,
          frequency_percent: 42 - index * 6,
          evidenceQuote: [],
          gapLevel: 'missing' as const,
          howToLearn: `Use one visible weekly proof to improve ${item.toLowerCase()}.`
        })),
        coreTasks: employerSignals.slice(0, 2).map((item, index) => ({
          id: `${slugify(targetTitle)}-task-${index + 1}`,
          normalized_key: slugify(item),
          label: item,
          task: `Demonstrate ${item.toLowerCase()} in a way an employer can verify.`,
          frequency_count: 4 - index,
          frequency_percent: 40 - index * 5,
          evidenceQuote: [],
          gapLevel: 'missing' as const
        })),
        toolsPlatformsEquipment: [],
        transferableStrengths: scenario.skills.slice(0, 3).map((skill, index) => ({
          id: `${slugify(targetTitle)}-transfer-${index + 1}`,
          strength: skill,
          source: 'skills' as const,
          countsToward: [
            {
              normalized_key: slugify(employerSignals[0] || 'role fit'),
              label: employerSignals[0] || 'Role fit'
            }
          ]
        })),
        plan30_60_90: {
          days30: mustHaves.slice(0, 2).map((item, index) => ({
            id: `${slugify(targetTitle)}-d30-${index + 1}`,
            goal: item.label,
            actions: [item.howToGet],
            linkedRequirements: [item.label]
          })),
          days60: employerSignals.slice(0, 2).map((item, index) => ({
            id: `${slugify(targetTitle)}-d60-${index + 1}`,
            goal: item,
            actions: [`Build proof tied to ${item.toLowerCase()}.`],
            linkedRequirements: [item]
          })),
          days90: [
            {
              id: `${slugify(targetTitle)}-d90-1`,
              goal: regulated ? 'Eligibility checkpoint' : 'Applied proof checkpoint',
              actions: [
                regulated
                  ? 'Confirm you are moving through the right regulator sequence.'
                  : 'Use visible proof to improve response quality and scope.'
              ],
              linkedRequirements: [regulated ? 'Formal eligibility' : 'Applied proof']
            }
          ],
          fastestPathToApply: mustHaves.slice(0, 2).map((item, index) => ({
            id: `${slugify(targetTitle)}-fast-${index + 1}`,
            goal: item.label,
            actions: [item.howToGet],
            linkedRequirements: [item.label]
          })),
          strongCandidatePath: employerSignals.slice(0, 2).map((item, index) => ({
            id: `${slugify(targetTitle)}-strong-${index + 1}`,
            goal: item,
            actions: [`Build stronger evidence for ${item.toLowerCase()}.`],
            linkedRequirements: [item]
          }))
        },
        evidenceTransparency: {
          employerPostings: {
            source: 'adzuna_cached',
            count: 0,
            lastUpdated: null,
            usedCache: false
          },
          userProvidedPosting: {
            included: false
          },
          baselineOnet: {
            included: true
          },
          baselineOnlyWarning: 'QA fallback: no live employer evidence loaded in this environment.'
        }
      },
      executionStrategy: {
        whereYouStandNow: {
          strengths: scenario.skills.slice(0, 2).map((summary) => ({
            summary,
            resumeSignal: summary,
            countsToward: [employerSignals[0] || 'Role fit']
          })),
          missingMandatoryRequirements: mustHaves.slice(0, 2).map((item) => ({
            normalized_key: item.normalized_key,
            label: item.label,
            blockerClass: 'legal_certification' as const,
            reason: item.howToGet
          })),
          competitiveDisadvantages: employerSignals.slice(0, 2).map((item) => ({
            normalized_key: slugify(item),
            label: item,
            blockerClass: 'experience' as const,
            reason: `You still need visible proof tied to ${item.toLowerCase()}.`
          }))
        },
        realBlockers: {
          requiredToApply: mustHaves.slice(0, 2).map((item) => ({
            label: item.label,
            whyItMatters: 'This blocks your first credible application.',
            howToClose: item.howToGet,
            timeEstimate: item.timeEstimate
          })),
          requiredToCompete: employerSignals.slice(0, 2).map((item) => ({
            label: item,
            whyItMatters: 'This improves interview and hiring confidence.',
            howToClose: `Build proof tied to ${item.toLowerCase()}.`,
            timeEstimate: '2-8 weeks'
          }))
        }
      },
      marketEvidence: {
        enabled: false,
        used: false,
        baselineOnly: true,
        usedCache: false,
        postingsCount: 0,
        llmNormalizedCount: 0,
        fetchedAt: null,
        query: {
          role: targetTitle,
          location: scenario.location,
          country: 'CA'
        },
        sourcePriority: ['user_posting', 'adzuna', 'onet']
      },
      bottleneck: {
        title: mustHaves[0]?.label || 'Entry requirement clarity',
        why: mustHaves[0]?.howToGet || 'This is the first gate to make explicit.',
        nextAction: mustHaves[0]?.howToGet || 'Name the first real gate and move it this week.',
        estimatedEffort: regulated ? 'Varies by province and credential history' : '1-2 weeks'
      },
      dataTransparency: {
        inputsUsed: ['currentRole', 'targetRole', 'skills', 'experienceText', 'education'],
        datasetsUsed: ['qa_fallback_fixture'],
        fxRateUsed: null
      }
    },
    legacy: {
      score: baseScore,
      explanation: regulated
        ? 'This is a regulated path. The sequence matters more than the raw score.'
        : 'This move is possible if you tighten the next steps around proof and scope fit.',
      transferableSkills: scenario.skills.slice(0, 3),
      skillGaps: employerSignals.slice(0, 3).map((item) => ({
        title: item,
        detail: `Build visible proof tied to ${item.toLowerCase()}.`,
        difficulty: 'medium' as const
      })),
      roadmap: {
        '30': mustHaves.slice(0, 2).map((item) => item.howToGet),
        '60': employerSignals.slice(0, 2).map(
          (item) => `Build one concrete proof tied to ${item.toLowerCase()}.`
        ),
        '90': [
          regulated
            ? 'Keep the licensure / eligibility sequence moving.'
            : 'Turn early proof into stronger interview and job-ready evidence.'
        ]
      },
      resumeReframes: [],
      recommendedRoles: []
    },
    scoringSnapshot: {
      total_score: baseScore,
      breakdown,
      top_occupation_id: targetResolution.occupationId || slugify(targetTitle)
    }
  } as unknown as CareerPlannerAnalysis
}

function includesAny(value: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(value))
}

function planText(plan: ReturnType<typeof generateTransitionPlan>) {
  return JSON.stringify(plan).toLowerCase()
}

function extractIssues(result: {
  scenario: ScenarioCase
  analysis: CareerPlannerAnalysis
  transitionPlan: ReturnType<typeof generateTransitionPlan>
}) {
  const issues: QaIssue[] = []
  const { scenario, analysis, transitionPlan } = result
  const family = targetFamilyForJob(scenario.targetJob)
  const fullText = planText(transitionPlan)
  const firstPhase = transitionPlan.plan90[0]

  issues.push({
    severity: 'Critical',
    message: 'The roadmap schema has no cost estimate fields, so the user cannot judge budget fit.',
    rootCause: 'logic',
    proposedFix:
      'Add additive per-step metadata for costRange and a section-level budget summary; keep old UI rendering as fallback.',
    acceptanceCriteria:
      'Each roadmap step includes a labeled cost range (or "varies by province/employer"), and the UI renders it without breaking current sections.'
  })

  issues.push({
    severity: 'High',
    message: 'The roadmap schema has no explicit prerequisites field, so required gates are implied instead of listed cleanly.',
    rootCause: 'logic',
    proposedFix:
      'Add additive prereqs arrays to each roadmap step and map existing hard gates / must-haves into them.',
    acceptanceCriteria:
      'Every rendered roadmap step lists zero or more prerequisites in plain language.'
  })

  if (family === 'regulated_healthcare') {
    const hasProvinceDisclaimer = includesAny(fullText, [
      /\bprovince\b/,
      /\bprovincial\b/,
      /\bcanada\b/,
      /\bcredential recognition\b/,
      /\bregulated profession\b/
    ])
    if (!hasProvinceDisclaimer) {
      issues.push({
        severity: 'Critical',
        message:
          'Regulated healthcare output does not explicitly warn that licensing and credential recognition are province-dependent.',
        rootCause: 'data',
        proposedFix:
          'Inject a deterministic regulated-profession disclaimer into reality check and roadmap step 1 for all licensed healthcare roles.',
        acceptanceCriteria:
          'Orthodontist, anesthesiologist, psychiatrist, surgeon, cardiologist, physician, and pharmacist plans explicitly say the path is province-dependent and regulated.'
      })
    }

    const firstStepMentionsLicensure = includesAny(firstPhase.tasks.join(' ').toLowerCase(), [
      /\blicen/,
      /\bregistration\b/,
      /\bboard\b/,
      /\bcredential\b/,
      /\bexam\b/
    ])
    if (!firstStepMentionsLicensure) {
      issues.push({
        severity: 'High',
        message:
          'The first 30-day phase does not clearly start with licensure / credential recognition for a regulated profession.',
        rootCause: 'logic',
        proposedFix:
          'Bias the regulated-profession template so the first task is always education + licensing verification before skill-building.',
        acceptanceCriteria:
          'For regulated professions, the first roadmap phase begins with credential evaluation, province rules, and licensing sequence.'
      })
    }
  }

  const taskText = transitionPlan.plan90.flatMap((phase) => phase.tasks)
  const genericTaskCount = taskText.filter((task) =>
    includesAny(task.toLowerCase(), [
      /\bkeep one\b/,
      /\bbuild one\b/,
      /\bget hands-on\b/,
      /\bfocused learning path\b/,
      /\buse short measurable\b/
    ])
  ).length
  if (genericTaskCount >= 2) {
    issues.push({
      severity: 'Medium',
      message:
        'Multiple roadmap tasks still read as generic workflow advice rather than concrete target-specific actions.',
      rootCause: 'prompt',
      proposedFix:
        'Anchor plan tasks to the top 3 real target requirements, named credentials, and the resolved job title before generic fallbacks.',
      acceptanceCriteria:
        'At least 2 tasks in each phase mention a concrete requirement, credential, or work sample tied to the target job.'
    })
  }

  if (scenario.persona === 'nontraditional') {
    const hasEducationOrCredentialStep = includesAny(
      transitionPlan.gaps.first3Steps.join(' ').toLowerCase(),
      [/\beducat/, /\bdegree\b/, /\bcert/, /\blicen/, /\bexam\b/, /\bregistration\b/]
    )
    if (!hasEducationOrCredentialStep) {
      issues.push({
        severity: 'High',
        message:
          'The non-traditional persona does not get a clear early step that addresses missing education or credential gates.',
        rootCause: 'logic',
        proposedFix:
          'When the user education is below the role baseline, force the first3Steps list to include the exact gate and how to start it.',
        acceptanceCriteria:
          'Non-traditional users see a named education / credential step in the top 3 actions when the role requires it.'
      })
    }
  }

  if (scenario.persona === 'minimal' && family === 'regulated_healthcare' && transitionPlan.timeline.maxMonths <= 12) {
    issues.push({
      severity: 'High',
      message:
        'The minimal-info healthcare plan produces a timeline that looks too short for a from-scratch regulated transition.',
      rootCause: 'logic',
      proposedFix:
        'Add minimum floor timelines for heavily regulated professions when the user has no aligned education or resume evidence.',
      acceptanceCriteria:
        'Minimal-input plans for regulated healthcare roles show a longer, clearly caveated time-to-eligible range.'
    })
  }

  if (analysis.report.linksResources?.length === 0 && transitionPlan.resources.online.length === 0) {
    issues.push({
      severity: 'Low',
      message: 'The output has no external resource links, which weakens follow-through.',
      rootCause: 'data',
      proposedFix:
        'Backfill deterministic official-source placeholders when role-specific links are unavailable.',
      acceptanceCriteria:
        'Every plan shows at least one official or clearly-labeled starting-point resource.'
    })
  }

  return issues
}

async function runScenario(scenario: ScenarioCase): Promise<ScenarioRunResult> {
  const currentResolution = await resolveWithFallback(scenario.currentRole, scenario.location)
  const targetResolution = await resolveWithFallback(scenario.targetJob, scenario.location)

  const input: CareerPlannerInput = {
    userId: 'roadmap-qa',
    currentRole: scenario.currentRole,
    targetRole: scenario.targetJob,
    currentOccupationId: currentResolution.occupationId,
    targetOccupationId: targetResolution.occupationId,
    notSureMode: false,
    skills: scenario.skills,
    experienceText: scenario.experienceText,
    location: scenario.location,
    timeline: scenario.timeline,
    education: scenario.education,
    incomeTarget: scenario.incomeTarget,
    useMarketEvidence: false
  }

  let analysis: CareerPlannerAnalysis
  try {
    analysis = await generateCareerMapPlannerAnalysis(input)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (
      message.includes('Missing NEXT_PUBLIC_SUPABASE_URL') ||
      message.includes('SUPABASE_SECRET_KEY')
    ) {
      analysis = buildFallbackAnalysis(scenario, targetResolution)
    } else {
      throw error
    }
  }
  const transitionPlan = generateTransitionPlan({
    currentRole: scenario.currentRole,
    targetRole: scenario.targetJob,
    experienceText: scenario.experienceText,
    location: scenario.location,
    education: scenario.education,
    incomeTarget: scenario.incomeTarget,
    report: analysis.report,
    currentResolution: toResolutionSummary(currentResolution),
    targetResolution: toResolutionSummary(targetResolution)
  })
  TransitionModeSchema.parse(transitionPlan)

  return {
    scenario,
    currentResolution,
    targetResolution,
    analysis,
    transitionPlan,
    issues: extractIssues({ scenario, analysis, transitionPlan })
  }
}

function printScenario(result: ScenarioRunResult) {
  const topIssue = result.issues[0]
  const snapshot = {
    difficulty: `${result.transitionPlan.difficulty.score.toFixed(1)} (${result.transitionPlan.difficulty.label})`,
    timeline: `${result.transitionPlan.timeline.minMonths}-${result.transitionPlan.timeline.maxMonths} months`,
    primaryRoute: result.transitionPlan.routes.primary.title,
    firstPhaseTasks: result.transitionPlan.plan90[0].tasks,
    first3Steps: result.transitionPlan.gaps.first3Steps
  }

  console.log(`\n# ${result.scenario.id}`)
  console.log(
    JSON.stringify(
      {
        input: {
          currentRole: result.scenario.currentRole,
          targetJob: result.scenario.targetJob,
          persona: result.scenario.persona,
          education: result.scenario.education,
          timeline: result.scenario.timeline,
          location: result.scenario.location,
          skills: result.scenario.skills,
          experienceText: result.scenario.experienceText
        },
        resolution: {
          current: {
            title: result.currentResolution.title,
            confidence: result.currentResolution.confidence
          },
          target: {
            title: result.targetResolution.title,
            confidence: result.targetResolution.confidence
          }
        },
        output: snapshot,
        issues: result.issues,
        topIssue
      },
      null,
      2
    )
  )
}

async function main() {
  const matrix = buildMatrix()
  const limitArg = process.argv.find((arg) => arg.startsWith('--limit='))
  const limit = limitArg ? Number(limitArg.split('=')[1]) : 6
  const scenariosToRun = matrix.slice(0, Number.isFinite(limit) ? limit : 6)

  console.log(`Matrix size: ${matrix.length} scenarios (20 jobs x 3 personas).`)
  console.log(`Running first ${scenariosToRun.length} scenarios.`)

  for (const scenario of scenariosToRun) {
    try {
      const result = await runScenario(scenario)
      printScenario(result)
    } catch (error) {
      console.error(`\n# ${scenario.id}`)
      console.error(
        JSON.stringify(
          {
            input: scenario,
            error: error instanceof Error ? error.message : String(error)
          },
          null,
          2
        )
      )
    }
  }
}

void main()
