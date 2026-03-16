import './loadEnvLocal'
import process from 'node:process'
import {
  OCCUPATION_RESOLUTION_THRESHOLD,
  resolveOccupation,
  type OccupationResolutionSeed
} from '../lib/occupations/resolveOccupation'
import { buildPlannerDashboardV3Model } from '../lib/planner/v3Dashboard'
import { generateTransitionPlan } from '../lib/transition/generatePlan'
import {
  TransitionModeSchema,
  type OccupationResolutionSummary,
  type PlannerReportSource,
  type TransitionRelationship
} from '../lib/transition/types'

type CareerPathType =
  | 'TRADES'
  | 'HEALTHCARE_LICENSED'
  | 'PROFESSIONAL_LICENSED'
  | 'TECH'
  | 'GENERAL'

type AuditCase = {
  label: string
  currentRole: string
  targetRole: string
  location: string
  region: 'CA'
  expectedTargetCode: string
  expectedStage: string | null
  expectedCareerPathType: CareerPathType
  expectedTemplate:
    | 'regulated_trade'
    | 'regulated_profession'
    | 'credentialed_role'
    | 'portfolio_role'
    | 'experience_ladder_role'
    | 'general_role'
  report: PlannerReportSource
  requirePhrases?: string[]
  forbidTradePhrases?: boolean
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
}

function makeSalary(low: number, median: number, high: number) {
  return {
    native: {
      currency: 'CAD' as const,
      low,
      median,
      high,
      sourceName: 'QA Fixture',
      asOfDate: '2026-03-13',
      region: 'Ontario'
    },
    usd: null,
    conversion: null
  }
}

function makeReport(input: {
  title: string
  occupationId: string
  regulated: boolean
  transitionTime: string
  wages: [number, number, number]
  education: string | null
  certifications?: string[]
  hardGates?: string[]
  employerSignals?: string[]
  apprenticeshipHours?: number | null
  examRequired?: boolean | null
  transferableStrengths?: string[]
}) : PlannerReportSource {
  return {
    compatibilitySnapshot: {
      score: 63,
      topReasons: ['Background overlap is enough to start a focused transition plan.']
    },
    suggestedCareers: [
      {
        occupationId: input.occupationId,
        title: input.title,
        score: 76,
        transitionTime: input.transitionTime,
        regulated: input.regulated,
        topReasons: ['QA routing fixture'],
        officialLinks: [],
        salary: makeSalary(input.wages[0], input.wages[1], input.wages[2])
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
      mandatoryGateRequirements: (input.hardGates ?? []).map((label) => ({
        label,
        gapLevel: 'missing' as const,
        howToGet: 'QA fixture'
      })),
      coreHardSkills: [
        {
          label: 'Role-specific skill fit',
          gapLevel: 'missing' as const,
          howToLearn: 'QA fixture'
        }
      ],
      toolsPlatforms: [],
      experienceSignals: [
        {
          label: 'Target-role proof',
          gapLevel: 'missing' as const,
          howToBuild: 'QA fixture'
        }
      ],
      transferableStrengths: (input.transferableStrengths ?? []).map((label) => ({
        label,
        requirement: 'QA fixture',
        source: 'skills' as const
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
        location: 'Ontario, Canada',
        summaryLine: 'Based on 100 recent postings in Ontario, Canada.'
      },
      transferableStrengths: (input.transferableStrengths ?? []).map((strength) => ({ strength }))
    },
    linksResources: [],
    marketEvidence: {
      baselineOnly: false,
      postingsCount: 100,
      query: { location: 'Ontario, Canada' }
    }
  }
}

const OCCUPATION_INDEX: OccupationResolutionSeed[] = [
  { id: 'ca-cashier', title: 'Cashiers', region: 'CA', source: 'noc', codes: { noc: '65100', aliases: ['Cashier', 'Cashiers'] } },
  { id: 'ca-retail', title: 'Retail Salespersons', region: 'CA', source: 'noc', codes: { noc: '64100', aliases: ['Retail Associate', 'Retail Sales Associate'] } },
  { id: 'ca-warehouse', title: 'Material Handlers', region: 'CA', source: 'noc', codes: { noc: '75101', aliases: ['Warehouse Associate'] } },
  { id: 'ca-production', title: 'Production Operators', region: 'CA', source: 'internal', codes: { code: 'production-operator', aliases: ['Production Operator'] } },
  { id: 'ca-admin', title: 'Administrative Assistants', region: 'CA', source: 'noc', codes: { noc: '13110', aliases: ['Admin Assistant', 'Administrative Assistant'] } },
  { id: 'ca-teacher', title: 'Teachers', region: 'CA', source: 'internal', codes: { code: 'teacher', aliases: ['Teacher'] } },
  { id: 'ca-customer-service', title: 'Customer Service Representatives', region: 'CA', source: 'noc', codes: { noc: '64409', aliases: ['Customer Service Representative'] } },
  { id: 'ca-help-desk', title: 'User support technicians', region: 'CA', source: 'noc', codes: { noc: '22221', aliases: ['Help Desk Analyst'] } },
  { id: 'ca-junior-analyst', title: 'Business Systems Specialists', region: 'CA', source: 'noc', codes: { noc: '21222', aliases: ['Junior Analyst'] } },
  { id: 'ca-electrician', title: 'Electricians (except industrial and power system)', region: 'CA', source: 'noc', codes: { noc: '72200', aliases: ['Electrician', 'Apprentice Electrician'] } },
  { id: 'ca-millwright', title: 'Industrial mechanics and millwrights', region: 'CA', source: 'noc', codes: { noc: '72400', aliases: ['Millwright'] } },
  { id: 'ca-plumber', title: 'Plumbers', region: 'CA', source: 'noc', codes: { noc: '72300', aliases: ['Plumber', 'Apprentice Plumber'] } },
  { id: 'ca-hvac', title: 'Heating, refrigeration and air conditioning mechanics', region: 'CA', source: 'noc', codes: { noc: '72402', aliases: ['HVAC Technician'] } },
  { id: 'ca-carpenter', title: 'Carpenters', region: 'CA', source: 'noc', codes: { noc: '72310', aliases: ['Carpenter'] } },
  { id: 'ca-lpn', title: 'Licensed practical nurses', region: 'CA', source: 'noc', codes: { noc: '32101', aliases: ['Licensed Practical Nurse', 'LPN', 'Registered Practical Nurse', 'RPN'] } },
  { id: 'ca-rn', title: 'Registered nurses and registered psychiatric nurses', region: 'CA', source: 'noc', codes: { noc: '31301', aliases: ['Registered Nurse', 'Nurse', 'RN'] } },
  { id: 'ca-dental-hygienist', title: 'Dental hygienists and dental therapists', region: 'CA', source: 'noc', codes: { noc: '32111', aliases: ['Dental Hygienist'] } },
  { id: 'ca-pharmacy-tech', title: 'Pharmacy technicians', region: 'CA', source: 'noc', codes: { noc: '32124', aliases: ['Pharmacy Technician'] } },
  { id: 'ca-accountant', title: 'Professional occupations in business management consulting', region: 'CA', source: 'internal', codes: { code: 'accountant', aliases: ['Accountant'] } },
  { id: 'ca-social-worker', title: 'Social workers', region: 'CA', source: 'noc', codes: { noc: '41300', aliases: ['Social Worker'] } },
  { id: 'ca-lawyer', title: 'Lawyers and Quebec notaries', region: 'CA', source: 'noc', codes: { noc: '41101', aliases: ['Lawyer'] } },
  { id: 'ca-software-developer', title: 'Software developers and programmers', region: 'CA', source: 'noc', codes: { noc: '21232', aliases: ['Software Developer'] } },
  { id: 'ca-ux-designer', title: 'Graphic designers and illustrators', region: 'CA', source: 'internal', codes: { code: 'ux-designer', aliases: ['UX Designer'] } },
  { id: 'ca-data-scientist', title: 'Data scientists', region: 'CA', source: 'noc', codes: { noc: '21211', aliases: ['Data Scientist'] } },
  { id: 'ca-cybersecurity', title: 'Cybersecurity specialists', region: 'CA', source: 'internal', codes: { code: 'cybersecurity-analyst', aliases: ['Cybersecurity Analyst'] } },
  { id: 'ca-operations-coordinator', title: 'Operations coordinators', region: 'CA', source: 'internal', codes: { code: 'operations-coordinator', aliases: ['Operations Coordinator'] } },
  { id: 'ca-hr-coordinator', title: 'Human resources professionals', region: 'CA', source: 'noc', codes: { noc: '11200', aliases: ['HR Coordinator'] } },
  { id: 'ca-customer-success-manager', title: 'Customer success managers', region: 'CA', source: 'internal', codes: { code: 'customer-success-manager', aliases: ['Customer Success Manager'] } },
  { id: 'ca-receptionist', title: 'Receptionists', region: 'CA', source: 'noc', codes: { noc: '14101', aliases: ['Receptionist'] } }
]

const CASES: AuditCase[] = [
  {
    label: '1) Cashier -> Licensed Practical Nurse',
    currentRole: 'Cashier',
    targetRole: 'Licensed Practical Nurse',
    location: 'Ontario, Canada',
    region: 'CA',
    expectedTargetCode: '32101',
    expectedStage: null,
    expectedCareerPathType: 'HEALTHCARE_LICENSED',
    expectedTemplate: 'regulated_profession',
    report: makeReport({
      title: 'Licensed practical nurses',
      occupationId: 'ca-lpn',
      regulated: true,
      transitionTime: '12-24 months',
      wages: [25, 31, 38],
      education: 'Practical nursing diploma',
      certifications: ['CPNRE'],
      hardGates: ['Clinical placements', 'Provincial registration'],
      employerSignals: ['Patient care', 'Medication administration'],
      examRequired: true,
      transferableStrengths: ['Customer care', 'Shift reliability']
    }),
    requirePhrases: ['clinical', 'licens', 'registration'],
    forbidTradePhrases: true
  },
  {
    label: '2) Retail Associate -> Registered Nurse',
    currentRole: 'Retail Associate',
    targetRole: 'Registered Nurse',
    location: 'Ontario, Canada',
    region: 'CA',
    expectedTargetCode: '31301',
    expectedStage: null,
    expectedCareerPathType: 'HEALTHCARE_LICENSED',
    expectedTemplate: 'regulated_profession',
    report: makeReport({
      title: 'Registered nurses and registered psychiatric nurses',
      occupationId: 'ca-rn',
      regulated: true,
      transitionTime: '24-48 months',
      wages: [30, 40, 52],
      education: 'Bachelor of nursing',
      certifications: ['NCLEX-RN'],
      hardGates: ['Clinical placements', 'Provincial registration'],
      employerSignals: ['Patient assessment', 'Clinical teamwork'],
      examRequired: true,
      transferableStrengths: ['Customer communication', 'Calm under pressure']
    }),
    requirePhrases: ['clinical', 'registration', 'program'],
    forbidTradePhrases: true
  },
  {
    label: '3) Cashier -> Dental Hygienist',
    currentRole: 'Cashier',
    targetRole: 'Dental Hygienist',
    location: 'Ontario, Canada',
    region: 'CA',
    expectedTargetCode: '32111',
    expectedStage: null,
    expectedCareerPathType: 'HEALTHCARE_LICENSED',
    expectedTemplate: 'regulated_profession',
    report: makeReport({
      title: 'Dental hygienists and dental therapists',
      occupationId: 'ca-dental-hygienist',
      regulated: true,
      transitionTime: '18-30 months',
      wages: [30, 37, 48],
      education: 'Dental hygiene diploma',
      certifications: ['Provincial registration'],
      hardGates: ['Clinical placements'],
      employerSignals: ['Patient care', 'Infection control'],
      examRequired: true,
      transferableStrengths: ['Client communication', 'Reliability']
    }),
    requirePhrases: ['clinical', 'registration'],
    forbidTradePhrases: true
  },
  {
    label: '4) Pharmacy Assistant -> Pharmacy Technician',
    currentRole: 'Cashier',
    targetRole: 'Pharmacy Technician',
    location: 'Ontario, Canada',
    region: 'CA',
    expectedTargetCode: '32124',
    expectedStage: null,
    expectedCareerPathType: 'HEALTHCARE_LICENSED',
    expectedTemplate: 'regulated_profession',
    report: makeReport({
      title: 'Pharmacy technicians',
      occupationId: 'ca-pharmacy-tech',
      regulated: true,
      transitionTime: '12-24 months',
      wages: [23, 28, 34],
      education: 'Pharmacy technician diploma',
      certifications: ['PEBC exam'],
      hardGates: ['Provincial registration'],
      employerSignals: ['Medication handling', 'Patient safety'],
      examRequired: true,
      transferableStrengths: ['Accuracy', 'Customer support']
    }),
    requirePhrases: ['licens', 'registration', 'program'],
    forbidTradePhrases: true
  },
  {
    label: '5) Warehouse Associate -> Apprentice Electrician',
    currentRole: 'Warehouse Associate',
    targetRole: 'Apprentice Electrician',
    location: 'Ontario, Canada',
    region: 'CA',
    expectedTargetCode: '72200',
    expectedStage: 'apprentice',
    expectedCareerPathType: 'TRADES',
    expectedTemplate: 'regulated_trade',
    report: makeReport({
      title: 'Electricians (except industrial and power system)',
      occupationId: 'ca-electrician',
      regulated: true,
      transitionTime: '3-6 months',
      wages: [22, 32, 48],
      education: 'High school',
      certifications: ['WHMIS', 'Working at Heights'],
      hardGates: ['Apprenticeship registration'],
      employerSignals: ['Safety awareness', 'Blueprint reading'],
      apprenticeshipHours: 9000,
      examRequired: true,
      transferableStrengths: ['Safe material handling', 'Shift reliability']
    }),
    requirePhrases: ['sponsor', 'apprenticeship', 'register']
  },
  {
    label: '6) Production Operator -> Millwright',
    currentRole: 'Production Operator',
    targetRole: 'Millwright',
    location: 'Ontario, Canada',
    region: 'CA',
    expectedTargetCode: '72400',
    expectedStage: null,
    expectedCareerPathType: 'TRADES',
    expectedTemplate: 'regulated_trade',
    report: makeReport({
      title: 'Industrial mechanics and millwrights',
      occupationId: 'ca-millwright',
      regulated: true,
      transitionTime: '3-9 months',
      wages: [26, 38, 52],
      education: 'High school',
      certifications: ['Lockout Tagout'],
      hardGates: ['Apprenticeship sponsor'],
      employerSignals: ['Mechanical maintenance', 'Safety awareness'],
      apprenticeshipHours: 8000,
      examRequired: true,
      transferableStrengths: ['Factory environment familiarity', 'Machine awareness']
    }),
    requirePhrases: ['apprenticeship', 'hours', 'register']
  },
  {
    label: '7) Cashier -> Apprentice Plumber',
    currentRole: 'Cashier',
    targetRole: 'Apprentice Plumber',
    location: 'Ontario, Canada',
    region: 'CA',
    expectedTargetCode: '72300',
    expectedStage: 'apprentice',
    expectedCareerPathType: 'TRADES',
    expectedTemplate: 'regulated_trade',
    report: makeReport({
      title: 'Plumbers',
      occupationId: 'ca-plumber',
      regulated: true,
      transitionTime: '3-9 months',
      wages: [24, 34, 46],
      education: 'High school',
      certifications: ['WHMIS'],
      hardGates: ['Apprenticeship registration'],
      employerSignals: ['Safety awareness', 'Jobsite reliability'],
      apprenticeshipHours: 9000,
      examRequired: true,
      transferableStrengths: ['Customer communication', 'Stamina']
    }),
    requirePhrases: ['sponsor', 'apprenticeship', 'register']
  },
  {
    label: '8) Warehouse Associate -> HVAC Technician',
    currentRole: 'Warehouse Associate',
    targetRole: 'HVAC Technician',
    location: 'Ontario, Canada',
    region: 'CA',
    expectedTargetCode: '72402',
    expectedStage: null,
    expectedCareerPathType: 'TRADES',
    expectedTemplate: 'regulated_trade',
    report: makeReport({
      title: 'Heating, refrigeration and air conditioning mechanics',
      occupationId: 'ca-hvac',
      regulated: true,
      transitionTime: '3-9 months',
      wages: [25, 35, 48],
      education: 'High school',
      certifications: ['WHMIS'],
      hardGates: ['Field training'],
      employerSignals: ['Troubleshooting', 'Customer communication'],
      apprenticeshipHours: 8000,
      examRequired: false,
      transferableStrengths: ['Material handling', 'Shift reliability']
    }),
    requirePhrases: ['apprenticeship', 'hours']
  },
  {
    label: '9) Cashier -> Carpenter',
    currentRole: 'Cashier',
    targetRole: 'Carpenter',
    location: 'Ontario, Canada',
    region: 'CA',
    expectedTargetCode: '72310',
    expectedStage: null,
    expectedCareerPathType: 'TRADES',
    expectedTemplate: 'regulated_trade',
    report: makeReport({
      title: 'Carpenters',
      occupationId: 'ca-carpenter',
      regulated: true,
      transitionTime: '3-9 months',
      wages: [22, 31, 42],
      education: 'High school',
      certifications: ['Working at Heights'],
      hardGates: ['Employer sponsor'],
      employerSignals: ['Jobsite safety', 'Measurement'],
      apprenticeshipHours: 7200,
      examRequired: true,
      transferableStrengths: ['Customer service', 'Shift stamina']
    }),
    requirePhrases: ['sponsor', 'apprenticeship', 'register']
  },
  {
    label: '10) Admin Assistant -> Accountant',
    currentRole: 'Admin Assistant',
    targetRole: 'Accountant',
    location: 'Ontario, Canada',
    region: 'CA',
    expectedTargetCode: 'accountant',
    expectedStage: null,
    expectedCareerPathType: 'PROFESSIONAL_LICENSED',
    expectedTemplate: 'regulated_profession',
    report: makeReport({
      title: 'Accountants',
      occupationId: 'ca-accountant',
      regulated: true,
      transitionTime: '12-24 months',
      wages: [28, 38, 55],
      education: "Bachelor's degree in accounting",
      certifications: ['CPA'],
      hardGates: ['Provincial CPA requirements'],
      employerSignals: ['Financial reporting', 'Ethics'],
      examRequired: true,
      transferableStrengths: ['Documentation', 'Spreadsheet accuracy']
    }),
    requirePhrases: ['licens', 'registration', 'program'],
    forbidTradePhrases: true
  },
  {
    label: '11) Teacher -> Social Worker',
    currentRole: 'Teacher',
    targetRole: 'Social Worker',
    location: 'Ontario, Canada',
    region: 'CA',
    expectedTargetCode: '41300',
    expectedStage: null,
    expectedCareerPathType: 'PROFESSIONAL_LICENSED',
    expectedTemplate: 'regulated_profession',
    report: makeReport({
      title: 'Social workers',
      occupationId: 'ca-social-worker',
      regulated: true,
      transitionTime: '12-24 months',
      wages: [29, 38, 47],
      education: 'Bachelor of social work',
      certifications: ['Provincial registration'],
      hardGates: ['Registration with regulator'],
      employerSignals: ['Case management', 'Client support'],
      examRequired: false,
      transferableStrengths: ['Care coordination', 'Calm communication']
    }),
    requirePhrases: ['registration', 'program'],
    forbidTradePhrases: true
  },
  {
    label: '12) Retail Associate -> Lawyer',
    currentRole: 'Retail Associate',
    targetRole: 'Lawyer',
    location: 'Ontario, Canada',
    region: 'CA',
    expectedTargetCode: '41101',
    expectedStage: null,
    expectedCareerPathType: 'PROFESSIONAL_LICENSED',
    expectedTemplate: 'regulated_profession',
    report: makeReport({
      title: 'Lawyers and Quebec notaries',
      occupationId: 'ca-lawyer',
      regulated: true,
      transitionTime: '36-60 months',
      wages: [35, 60, 120],
      education: 'Law degree',
      certifications: ['Bar licensing'],
      hardGates: ['Law degree', 'Bar admission'],
      employerSignals: ['Legal writing', 'Case analysis'],
      examRequired: true,
      transferableStrengths: ['Client communication', 'Persuasion']
    }),
    requirePhrases: ['licens', 'registration', 'program'],
    forbidTradePhrases: true
  },
  {
    label: '13) Customer Service Representative -> Software Developer',
    currentRole: 'Customer Service Representative',
    targetRole: 'Software Developer',
    location: 'Ontario, Canada',
    region: 'CA',
    expectedTargetCode: '21232',
    expectedStage: null,
    expectedCareerPathType: 'TECH',
    expectedTemplate: 'portfolio_role',
    report: makeReport({
      title: 'Software developers and programmers',
      occupationId: 'ca-software-developer',
      regulated: false,
      transitionTime: '3-9 months',
      wages: [30, 45, 65],
      education: 'Self-taught / portfolio-based',
      certifications: [],
      hardGates: [],
      employerSignals: ['Portfolio', 'Github', 'Projects'],
      examRequired: false,
      transferableStrengths: ['Problem solving', 'Customer empathy']
    }),
    requirePhrases: ['portfolio', 'sample'],
    forbidTradePhrases: true
  },
  {
    label: '14) Retail Associate -> UX Designer',
    currentRole: 'Retail Associate',
    targetRole: 'UX Designer',
    location: 'Ontario, Canada',
    region: 'CA',
    expectedTargetCode: 'ux-designer',
    expectedStage: null,
    expectedCareerPathType: 'TECH',
    expectedTemplate: 'portfolio_role',
    report: makeReport({
      title: 'UX Designers',
      occupationId: 'ca-ux-designer',
      regulated: false,
      transitionTime: '3-8 months',
      wages: [28, 40, 58],
      education: 'Portfolio-based',
      employerSignals: ['Portfolio', 'Case studies', 'User research'],
      transferableStrengths: ['Customer observation', 'Interviewing users']
    }),
    requirePhrases: ['portfolio', 'sample'],
    forbidTradePhrases: true
  },
  {
    label: '15) Junior Analyst -> Data Scientist',
    currentRole: 'Junior Analyst',
    targetRole: 'Data Scientist',
    location: 'Ontario, Canada',
    region: 'CA',
    expectedTargetCode: '21211',
    expectedStage: null,
    expectedCareerPathType: 'TECH',
    expectedTemplate: 'credentialed_role',
    report: makeReport({
      title: 'Data scientists',
      occupationId: 'ca-data-scientist',
      regulated: false,
      transitionTime: '3-8 months',
      wages: [36, 50, 72],
      education: "Bachelor's degree",
      certifications: ['Python certificate'],
      employerSignals: ['Modeling', 'SQL', 'Experiment design'],
      transferableStrengths: ['Reporting', 'Analysis']
    }),
    requirePhrases: ['credential', 'practice'],
    forbidTradePhrases: true
  },
  {
    label: '16) Help Desk Analyst -> Cybersecurity Analyst',
    currentRole: 'Help Desk Analyst',
    targetRole: 'Cybersecurity Analyst',
    location: 'Ontario, Canada',
    region: 'CA',
    expectedTargetCode: 'cybersecurity-analyst',
    expectedStage: null,
    expectedCareerPathType: 'TECH',
    expectedTemplate: 'credentialed_role',
    report: makeReport({
      title: 'Cybersecurity specialists',
      occupationId: 'ca-cybersecurity',
      regulated: false,
      transitionTime: '3-9 months',
      wages: [34, 47, 68],
      education: "Bachelor's degree",
      certifications: ['Security+'],
      employerSignals: ['Security monitoring', 'Incident response'],
      transferableStrengths: ['Systems troubleshooting', 'User support']
    }),
    requirePhrases: ['credential', 'practice'],
    forbidTradePhrases: true
  },
  {
    label: '17) Customer Service Representative -> Operations Coordinator',
    currentRole: 'Customer Service Representative',
    targetRole: 'Operations Coordinator',
    location: 'Ontario, Canada',
    region: 'CA',
    expectedTargetCode: 'operations-coordinator',
    expectedStage: null,
    expectedCareerPathType: 'GENERAL',
    expectedTemplate: 'experience_ladder_role',
    report: makeReport({
      title: 'Operations coordinators',
      occupationId: 'ca-operations-coordinator',
      regulated: false,
      transitionTime: '1-4 months',
      wages: [24, 31, 40],
      education: 'High school',
      employerSignals: ['Scheduling', 'Coordination', 'Workflow management'],
      transferableStrengths: ['Customer communication', 'Task coordination']
    }),
    forbidTradePhrases: true
  },
  {
    label: '18) Admin Assistant -> HR Coordinator',
    currentRole: 'Admin Assistant',
    targetRole: 'HR Coordinator',
    location: 'Ontario, Canada',
    region: 'CA',
    expectedTargetCode: '11200',
    expectedStage: null,
    expectedCareerPathType: 'GENERAL',
    expectedTemplate: 'experience_ladder_role',
    report: makeReport({
      title: 'Human resources professionals',
      occupationId: 'ca-hr-coordinator',
      regulated: false,
      transitionTime: '1-4 months',
      wages: [25, 33, 42],
      education: "Bachelor's degree",
      employerSignals: ['Documentation', 'Interview scheduling', 'Employee communication'],
      transferableStrengths: ['Confidentiality', 'Documentation']
    }),
    forbidTradePhrases: true
  },
  {
    label: '19) Cashier -> Customer Success Manager',
    currentRole: 'Cashier',
    targetRole: 'Customer Success Manager',
    location: 'Ontario, Canada',
    region: 'CA',
    expectedTargetCode: 'customer-success-manager',
    expectedStage: null,
    expectedCareerPathType: 'GENERAL',
    expectedTemplate: 'experience_ladder_role',
    report: makeReport({
      title: 'Customer success managers',
      occupationId: 'ca-customer-success-manager',
      regulated: false,
      transitionTime: '2-6 months',
      wages: [28, 38, 52],
      education: 'High school',
      employerSignals: ['Account support', 'Retention', 'Client communication'],
      transferableStrengths: ['Customer communication', 'Upsell awareness']
    }),
    forbidTradePhrases: true
  },
  {
    label: '20) Cashier -> Receptionist',
    currentRole: 'Cashier',
    targetRole: 'Receptionist',
    location: 'Ontario, Canada',
    region: 'CA',
    expectedTargetCode: '14101',
    expectedStage: null,
    expectedCareerPathType: 'GENERAL',
    expectedTemplate: 'general_role',
    report: makeReport({
      title: 'Receptionists',
      occupationId: 'ca-receptionist',
      regulated: false,
      transitionTime: '1-3 months',
      wages: [20, 24, 30],
      education: 'High school',
      employerSignals: ['Phone etiquette', 'Scheduling', 'Front-desk coordination'],
      transferableStrengths: ['Customer support', 'Cash handling']
    }),
    forbidTradePhrases: true
  }
]

function flattenPlanText(plan: ReturnType<typeof generateTransitionPlan>) {
  return normalizeText(
    [
      plan.routes.primary.title,
      plan.routes.primary.reason,
      plan.routes.primary.firstStep,
      plan.routes.secondary.title,
      plan.routes.secondary.reason,
      plan.routes.secondary.firstStep,
      plan.routes.contingency.title,
      plan.routes.contingency.reason,
      plan.routes.contingency.firstStep,
      ...plan.plan90.flatMap((phase) => [phase.phase, ...phase.tasks, ...phase.weeklyTargets]),
      ...plan.gaps.missing,
      ...plan.gaps.first3Steps,
      ...plan.reality.barriers,
      ...plan.reality.mitigations
    ]
      .filter(Boolean)
      .join(' ')
  )
}

function hasTradeLeakage(text: string) {
  return /\b(apprenticeship|apprentice|red seal|certificate of qualification|journeyperson|sponsor employer|union lane|skilled trades ontario)\b/.test(
    text
  )
}

function buildSummary(targetResolution: Awaited<ReturnType<typeof resolveOccupation>>): OccupationResolutionSummary {
  return {
    title: targetResolution.title,
    code: targetResolution.code,
    source: targetResolution.source,
    confidence: targetResolution.confidence,
    stage: targetResolution.stage ?? null,
    specialization: targetResolution.specialization ?? null,
    rawInputTitle: targetResolution.rawInputTitle,
    region: targetResolution.region ?? null
  }
}

async function runCase(testCase: AuditCase) {
  const currentResolution = await resolveOccupation(testCase.currentRole, testCase.location, {
    region: testCase.region,
    providedIndex: OCCUPATION_INDEX
  })
  const targetResolution = await resolveOccupation(testCase.targetRole, testCase.location, {
    region: testCase.region,
    providedIndex: OCCUPATION_INDEX
  })

  assert(Boolean(targetResolution.occupationId), `${testCase.label}: target did not resolve`)
  assert(
    targetResolution.confidence >= OCCUPATION_RESOLUTION_THRESHOLD,
    `${testCase.label}: target confidence ${targetResolution.confidence} below threshold`
  )
  assert(
    targetResolution.code === testCase.expectedTargetCode,
    `${testCase.label}: expected code ${testCase.expectedTargetCode}, got ${targetResolution.code}`
  )
  assert(
    (targetResolution.stage ?? null) === testCase.expectedStage,
    `${testCase.label}: expected stage ${testCase.expectedStage}, got ${targetResolution.stage ?? null}`
  )

  const targetSummary = buildSummary(targetResolution)
  const currentSummary = currentResolution.occupationId ? buildSummary(currentResolution) : null

  const plan = generateTransitionPlan({
    currentRole: testCase.currentRole,
    targetRole: testCase.targetRole,
    experienceText: `${testCase.currentRole} background with measurable weekly work output.`,
    location: testCase.location,
    education: testCase.report.targetRequirements?.education ?? '',
    incomeTarget: '$50-75k',
    report: testCase.report,
    currentResolution: currentSummary,
    targetResolution: targetSummary
  })

  TransitionModeSchema.parse(plan)
  assert(
    plan.careerPathType === testCase.expectedCareerPathType,
    `${testCase.label}: expected path type ${testCase.expectedCareerPathType}, got ${plan.careerPathType}`
  )
  assert(
    plan.templateKey === testCase.expectedTemplate,
    `${testCase.label}: expected template ${testCase.expectedTemplate}, got ${plan.templateKey}`
  )

  const planText = flattenPlanText(plan)
  if (testCase.requirePhrases) {
    for (const phrase of testCase.requirePhrases) {
      assert(planText.includes(phrase.toLowerCase()), `${testCase.label}: missing required phrase ${phrase}`)
    }
  }
  if (testCase.forbidTradePhrases) {
    assert(!hasTradeLeakage(planText), `${testCase.label}: trade leakage detected`)
  }

  const dashboard = buildPlannerDashboardV3Model({
    report: {
      ...testCase.report,
      transitionMode: plan
    },
    plannerResult: null,
    currentRole: testCase.currentRole,
    targetRole: testCase.targetRole,
    locationText: testCase.location,
    timelineBucket: '1-3 months',
    skillsCount: 2,
    lastGeneratedAt: null
  })

  if (testCase.expectedCareerPathType !== 'TRADES') {
    assert(!dashboard.hero.mappedPathLabel, `${testCase.label}: unexpected mapped trade label in dashboard`)
    assert(dashboard.training.tradeFacts.length === 0, `${testCase.label}: unexpected trade facts in dashboard`)
  }

  console.log(
    [
      'PASS',
      testCase.label,
      `code=${targetResolution.code}`,
      `stage=${targetResolution.stage ?? 'none'}`,
      `type=${plan.careerPathType}`,
      `template=${plan.templateKey}`
    ].join(' | ')
  )
}

async function main() {
  for (const testCase of CASES) {
    await runCase(testCase)
  }

  console.log(`Validated ${CASES.length} planner routing cases across trades, healthcare, professional, tech, and general paths.`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
