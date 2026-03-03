import process from 'node:process'
import {
  OCCUPATION_RESOLUTION_THRESHOLD,
  resolveOccupation,
  type OccupationResolutionSeed
} from '../lib/occupations/resolveOccupation'
import { generateTransitionPlan } from '../lib/transition/generatePlan'
import { selectPlanTemplate } from '../lib/transition/selectTemplate'
import {
  TransitionModeSchema,
  type OccupationResolutionSummary,
  type OccupationTemplateProfile,
  type PlannerReportSource,
  type PlanTemplateKey,
  type TransitionRelationship
} from '../lib/transition/types'

type ValidationCase = {
  label: string
  currentRole: string
  targetRole: string
  region: 'CA' | 'US'
  location: string
  expectedTargetCode: string
  expectedStage: string | null
  expectedTemplate: PlanTemplateKey
  report: PlannerReportSource
}

const OCCUPATION_INDEX: OccupationResolutionSeed[] = [
  {
    id: 'ca-chef',
    title: 'Chefs and Head Cooks',
    region: 'CA',
    source: 'noc',
    codes: { noc: '62200', aliases: ['Sous Chef', 'Head Chef'] }
  },
  {
    id: 'us-chef',
    title: 'Chefs and Head Cooks',
    region: 'US',
    source: 'onet',
    codes: { soc: '35-1011', aliases: ['Sous Chef', 'Head Chef'] }
  },
  {
    id: 'ca-electrician',
    title: 'Electricians (except industrial and power system)',
    region: 'CA',
    source: 'noc',
    codes: { noc: '72200', aliases: ['Electrician', 'Electrician Apprentice'] }
  },
  {
    id: 'us-electrician',
    title: 'Electricians',
    region: 'US',
    source: 'onet',
    codes: { soc: '47-2111', aliases: ['Electrician', 'Apprentice Electrician'] }
  },
  {
    id: 'us-hvac',
    title: 'Heating, Air Conditioning, and Refrigeration Mechanics and Installers',
    region: 'US',
    source: 'onet',
    codes: { soc: '49-9021', aliases: ['HVAC Technician', 'HVAC Installer'] }
  },
  {
    id: 'us-warehouse',
    title: 'Laborers and Freight, Stock, and Material Movers, Hand',
    region: 'US',
    source: 'onet',
    codes: { soc: '53-7062', aliases: ['Warehouse Associate'] }
  },
  {
    id: 'us-admin',
    title: 'Administrative Assistants',
    region: 'US',
    source: 'internal',
    codes: { code: 'admin-assistant', aliases: ['Admin Assistant'] }
  },
  {
    id: 'us-hr',
    title: 'Human Resources Specialists',
    region: 'US',
    source: 'onet',
    codes: { soc: '13-1071', aliases: ['HR Coordinator'] }
  },
  {
    id: 'us-retail',
    title: 'Retail Salespersons',
    region: 'US',
    source: 'onet',
    codes: { soc: '41-2031', aliases: ['Retail Associate'] }
  },
  {
    id: 'us-ux',
    title: 'UX Designers',
    region: 'US',
    source: 'internal',
    codes: { code: 'ux-designer', aliases: ['User Experience Designer', 'UX Designer'] }
  },
  {
    id: 'us-analyst',
    title: 'Analysts',
    region: 'US',
    source: 'internal',
    codes: { code: 'analyst', aliases: ['Junior Analyst'] }
  },
  {
    id: 'us-data-scientist',
    title: 'Data Scientists',
    region: 'US',
    source: 'onet',
    codes: { soc: '15-2051', aliases: ['Data Scientist'] }
  },
  {
    id: 'us-teacher',
    title: 'Teachers',
    region: 'US',
    source: 'internal',
    codes: { code: 'teacher', aliases: ['Teacher'] }
  },
  {
    id: 'us-nurse',
    title: 'Registered Nurses',
    region: 'US',
    source: 'onet',
    codes: { soc: '29-1141', aliases: ['Nurse'] }
  }
]

function makeSalary(
  currency: 'USD' | 'CAD',
  low: number,
  median: number,
  high: number
) {
  return {
    native: {
      currency,
      low,
      median,
      high,
      sourceName: 'Validation Mock',
      asOfDate: '2026-03-02',
      region: currency === 'CAD' ? 'Canada' : 'United States'
    },
    usd: currency === 'USD' ? { low, median, high } : null,
    conversion: null
  }
}

function makeReport(input: {
  title: string
  occupationId: string
  regulated: boolean
  transitionTime: string
  currency: 'USD' | 'CAD'
  wages: [number, number, number]
  education: string | null
  certifications?: string[]
  hardGates?: string[]
  employerSignals?: string[]
  apprenticeshipHours?: number | null
  examRequired?: boolean | null
  mandatoryGateRequirements?: string[]
  coreHardSkills?: string[]
  toolsPlatforms?: string[]
  experienceSignals?: string[]
  transferableStrengths?: string[]
}): PlannerReportSource {
  return {
    compatibilitySnapshot: {
      score: 63,
      topReasons: ['The background shows real transferable work habits.']
    },
    suggestedCareers: [
      {
        occupationId: input.occupationId,
        title: input.title,
        score: 78,
        transitionTime: input.transitionTime,
        regulated: input.regulated,
        topReasons: ['Validation mock pathway'],
        officialLinks: [],
        salary: makeSalary(input.currency, input.wages[0], input.wages[1], input.wages[2])
      }
    ],
    targetRequirements: {
      education: input.education,
      certifications: input.certifications ?? [],
      hardGates: input.hardGates ?? [],
      employerSignals: input.employerSignals ?? [],
      apprenticeshipHours: input.apprenticeshipHours ?? null,
      examRequired: input.examRequired ?? null,
      regulated: input.regulated,
      sources: []
    },
    transitionSections: {
      mandatoryGateRequirements: (input.mandatoryGateRequirements ?? []).map((label, index) => ({
        label,
        gapLevel: 'missing' as const,
        howToGet: 'Validation placeholder'
      })),
      coreHardSkills: (input.coreHardSkills ?? []).map((label) => ({
        label,
        gapLevel: 'missing' as const,
        howToLearn: 'Validation placeholder'
      })),
      toolsPlatforms: (input.toolsPlatforms ?? []).map((label) => ({
        label,
        gapLevel: 'missing' as const,
        quickProject: 'Validation placeholder'
      })),
      experienceSignals: (input.experienceSignals ?? []).map((label) => ({
        label,
        gapLevel: 'missing' as const,
        howToBuild: 'Validation placeholder'
      })),
      transferableStrengths: (input.transferableStrengths ?? []).map((label) => ({
        label,
        requirement: 'Validation placeholder',
        source: 'experience_text' as const
      }))
    },
    executionStrategy: {
      whereYouStandNow: {
        strengths: (input.transferableStrengths ?? []).map((summary) => ({ summary })),
        missingMandatoryRequirements: [],
        competitiveDisadvantages: []
      },
      realBlockers: {
        requiredToApply: [],
        requiredToCompete: []
      }
    },
    transitionReport: {
      marketSnapshot: {
        role: input.title,
        location: 'Validation'
      },
      transferableStrengths: (input.transferableStrengths ?? []).map((strength) => ({ strength }))
    },
    linksResources: [],
    marketEvidence: {
      baselineOnly: false,
      postingsCount: 12,
      query: {
        location: 'Validation'
      }
    }
  }
}

const VALIDATION_CASES: ValidationCase[] = [
  {
    label: '1) sous chef -> apprentice electrician',
    currentRole: 'sous chef',
    targetRole: 'apprentice electrician',
    region: 'CA',
    location: 'Toronto, Ontario, Canada',
    expectedTargetCode: '72200',
    expectedStage: 'apprentice',
    expectedTemplate: 'regulated_trade',
    report: makeReport({
      title: 'Electricians (except industrial and power system)',
      occupationId: 'ca-electrician',
      regulated: true,
      transitionTime: '3-6 months',
      currency: 'CAD',
      wages: [22, 32, 48],
      education: 'High school',
      certifications: ['Working at Heights', 'WHMIS'],
      hardGates: ['Apprenticeship registration'],
      employerSignals: ['Safety awareness', 'Blueprint reading'],
      apprenticeshipHours: 9000,
      examRequired: true,
      mandatoryGateRequirements: ['Apprenticeship sponsor'],
      coreHardSkills: ['Electrical theory basics'],
      toolsPlatforms: ['Multimeter'],
      experienceSignals: ['Reliable attendance'],
      transferableStrengths: ['Led fast kitchen teams', 'Followed food-safety SOPs']
    })
  },
  {
    label: '2) warehouse associate -> HVAC technician',
    currentRole: 'warehouse associate',
    targetRole: 'HVAC technician',
    region: 'US',
    location: 'Cleveland, Ohio, United States',
    expectedTargetCode: '49-9021',
    expectedStage: null,
    expectedTemplate: 'regulated_trade',
    report: makeReport({
      title: 'Heating, Air Conditioning, and Refrigeration Mechanics and Installers',
      occupationId: 'us-hvac',
      regulated: true,
      transitionTime: '3-9 months',
      currency: 'USD',
      wages: [20, 29, 40],
      education: 'High school',
      certifications: ['EPA 608'],
      hardGates: ['Apprenticeship or supervised field training'],
      employerSignals: ['Troubleshooting', 'Customer communication'],
      apprenticeshipHours: 4000,
      examRequired: false,
      mandatoryGateRequirements: ['EPA 608'],
      coreHardSkills: ['HVAC troubleshooting'],
      toolsPlatforms: ['Manifold gauges'],
      experienceSignals: ['Field readiness'],
      transferableStrengths: ['Safe material handling', 'Reliable shift attendance']
    })
  },
  {
    label: '3) admin assistant -> HR coordinator',
    currentRole: 'admin assistant',
    targetRole: 'HR coordinator',
    region: 'US',
    location: 'Chicago, Illinois, United States',
    expectedTargetCode: '13-1071',
    expectedStage: null,
    expectedTemplate: 'experience_ladder_role',
    report: makeReport({
      title: 'Human Resources Specialists',
      occupationId: 'us-hr',
      regulated: false,
      transitionTime: '1-4 months',
      currency: 'USD',
      wages: [24, 31, 40],
      education: "Bachelor's",
      employerSignals: ['Documentation accuracy', 'Interview scheduling', 'Employee communication'],
      coreHardSkills: ['HRIS familiarity'],
      experienceSignals: ['Confidentiality', 'Cross-team coordination'],
      transferableStrengths: ['Calendar management', 'Detailed records']
    })
  },
  {
    label: '4) retail associate -> UX designer',
    currentRole: 'retail associate',
    targetRole: 'UX designer',
    region: 'US',
    location: 'Austin, Texas, United States',
    expectedTargetCode: 'ux-designer',
    expectedStage: null,
    expectedTemplate: 'portfolio_role',
    report: makeReport({
      title: 'UX Designers',
      occupationId: 'us-ux',
      regulated: false,
      transitionTime: '2-6 months',
      currency: 'USD',
      wages: [28, 40, 58],
      education: 'Self-taught / portfolio-based',
      employerSignals: ['Portfolio', 'Case studies', 'User research'],
      coreHardSkills: ['Wireframing'],
      toolsPlatforms: ['Figma'],
      experienceSignals: ['Stakeholder communication'],
      transferableStrengths: ['Customer feedback', 'Sales floor observation']
    })
  },
  {
    label: '5) junior analyst -> data scientist',
    currentRole: 'junior analyst',
    targetRole: 'data scientist',
    region: 'US',
    location: 'New York, New York, United States',
    expectedTargetCode: '15-2051',
    expectedStage: null,
    expectedTemplate: 'credentialed_role',
    report: makeReport({
      title: 'Data Scientists',
      occupationId: 'us-data-scientist',
      regulated: false,
      transitionTime: '3-8 months',
      currency: 'USD',
      wages: [40, 58, 82],
      education: "Bachelor's",
      certifications: ['Python certificate'],
      employerSignals: ['Modeling', 'SQL', 'Experiment design'],
      coreHardSkills: ['Feature engineering'],
      toolsPlatforms: ['Python'],
      experienceSignals: ['Project communication'],
      transferableStrengths: ['Reporting', 'Spreadsheet analysis']
    })
  },
  {
    label: '6) teacher -> nurse',
    currentRole: 'teacher',
    targetRole: 'nurse',
    region: 'US',
    location: 'Atlanta, Georgia, United States',
    expectedTargetCode: '29-1141',
    expectedStage: null,
    expectedTemplate: 'regulated_profession',
    report: makeReport({
      title: 'Registered Nurses',
      occupationId: 'us-nurse',
      regulated: true,
      transitionTime: '12-24 months',
      currency: 'USD',
      wages: [33, 42, 55],
      education: "Associate's",
      certifications: ['NCLEX-RN'],
      hardGates: ['Board licensure'],
      employerSignals: ['Patient care', 'Documentation', 'Clinical teamwork'],
      examRequired: true,
      mandatoryGateRequirements: ['Clinical placement'],
      coreHardSkills: ['Patient assessment'],
      experienceSignals: ['Calm under pressure'],
      transferableStrengths: ['Classroom leadership', 'Clear communication']
    })
  }
]

function buildProfile(
  targetResolution: OccupationResolutionSummary,
  relationship: TransitionRelationship,
  report: PlannerReportSource,
  targetRole: string
): OccupationTemplateProfile {
  return {
    title: targetResolution.title || report.suggestedCareers[0]?.title || targetRole,
    code: targetResolution.code,
    regulated: Boolean(report.targetRequirements?.regulated || report.suggestedCareers[0]?.regulated),
    education: report.targetRequirements?.education ?? '',
    certifications: report.targetRequirements?.certifications ?? [],
    hardGates: report.targetRequirements?.hardGates ?? [],
    employerSignals: report.targetRequirements?.employerSignals ?? [],
    apprenticeshipHours: report.targetRequirements?.apprenticeshipHours ?? null,
    examRequired: report.targetRequirements?.examRequired ?? null,
    stage: targetResolution.stage ?? null,
    region: targetResolution.region ?? null,
    relationship
  }
}

function normalizeKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message)
  }
}

function assertNoDuplicates(label: string, values: string[]) {
  const seen = new Set<string>()
  for (const value of values) {
    const key = normalizeKey(value)
    if (seen.has(key)) {
      throw new Error(`${label} contains duplicate bullet: ${value}`)
    }
    seen.add(key)
  }
}

async function runCase(testCase: ValidationCase) {
  const currentResolution = await resolveOccupation(testCase.currentRole, testCase.location, {
    region: testCase.region,
    providedIndex: OCCUPATION_INDEX
  })
  const targetResolution = await resolveOccupation(testCase.targetRole, testCase.location, {
    region: testCase.region,
    providedIndex: OCCUPATION_INDEX
  })

  assert(Boolean(targetResolution.occupationId), `${testCase.label}: target did not resolve.`)
  assert(
    targetResolution.confidence >= OCCUPATION_RESOLUTION_THRESHOLD,
    `${testCase.label}: target confidence ${targetResolution.confidence} is below threshold.`
  )
  assert(
    targetResolution.code === testCase.expectedTargetCode,
    `${testCase.label}: expected target code ${testCase.expectedTargetCode}, got ${targetResolution.code}.`
  )
  assert(
    (targetResolution.stage ?? null) === testCase.expectedStage,
    `${testCase.label}: expected stage ${testCase.expectedStage}, got ${targetResolution.stage ?? null}.`
  )

  const targetSummary: OccupationResolutionSummary = {
    title: targetResolution.title,
    code: targetResolution.code,
    source: targetResolution.source,
    confidence: targetResolution.confidence,
    stage: targetResolution.stage ?? null,
    specialization: targetResolution.specialization ?? null,
    rawInputTitle: targetResolution.rawInputTitle,
    region: targetResolution.region ?? null
  }

  const templateKey = selectPlanTemplate(
    buildProfile(targetSummary, 'career_switch', testCase.report, testCase.targetRole),
    testCase.location,
    targetSummary.stage ?? null
  )
  assert(
    templateKey === testCase.expectedTemplate,
    `${testCase.label}: expected template ${testCase.expectedTemplate}, got ${templateKey}.`
  )

  const plan = generateTransitionPlan({
    currentRole: testCase.currentRole,
    targetRole: testCase.targetRole,
    experienceText: `${testCase.currentRole} background with measurable weekly work.`,
    location: testCase.location,
    education: testCase.report.targetRequirements?.education ?? '',
    incomeTarget: '$50-75k',
    report: testCase.report,
    currentResolution: currentResolution.occupationId
      ? {
          title: currentResolution.title,
          code: currentResolution.code,
          source: currentResolution.source,
          confidence: currentResolution.confidence,
          stage: currentResolution.stage ?? null,
          specialization: currentResolution.specialization ?? null,
          rawInputTitle: currentResolution.rawInputTitle,
          region: currentResolution.region ?? null
        }
      : null,
    targetResolution: targetSummary
  })

  TransitionModeSchema.parse(plan)

  assert(
    plan.resources.local.length + plan.resources.online.length + plan.resources.internal.length > 0,
    `${testCase.label}: resources are empty.`
  )

  assertNoDuplicates(`${testCase.label} strengths`, plan.gaps.strengths)
  assertNoDuplicates(`${testCase.label} gaps`, plan.gaps.missing)
  assertNoDuplicates(`${testCase.label} barriers`, plan.reality.barriers)
  assertNoDuplicates(`${testCase.label} mitigations`, plan.reality.mitigations)

  console.log(
    `PASS ${testCase.label} | target=${targetResolution.title} | stage=${targetResolution.stage ?? 'none'} | template=${templateKey} | difficulty=${plan.difficulty.score.toFixed(1)}`
  )
}

async function main() {
  for (const testCase of VALIDATION_CASES) {
    await runCase(testCase)
  }

  console.log(
    `Validated ${VALIDATION_CASES.length} transition cases. Electrician is only one regulated_trade case; the same engine also passed HVAC, experience-ladder, portfolio, credentialed, and regulated-profession paths.`
  )
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
