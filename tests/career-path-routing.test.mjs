import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function loadTranspiledTsModule(filePath) {
  const source = readFileSync(filePath, 'utf8')
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020
    },
    fileName: filePath
  }).outputText

  const cjsModule = { exports: {} }
  const context = vm.createContext({
    module: cjsModule,
    exports: cjsModule.exports,
    Intl,
    Date,
    require: (specifier) => {
      if (specifier === '@/lib/occupations/canonicalRoleRegistry') {
        return loadTranspiledTsModule(path.resolve(__dirname, '../lib/occupations/canonicalRoleRegistry.ts'))
      }
      throw new Error(`Unexpected require: ${specifier}`)
    }
  })
  vm.runInContext(transpiled, context)
  return cjsModule.exports
}

const selectTemplatePath = path.resolve(__dirname, '../lib/transition/selectTemplate.ts')
const mapperPath = path.resolve(__dirname, '../lib/planner/v3Dashboard.ts')

function makeProfile(overrides = {}) {
  return {
    title: 'Role',
    code: 'role-code',
    regulated: false,
    education: '',
    certifications: [],
    hardGates: [],
    employerSignals: [],
    apprenticeshipHours: null,
    examRequired: null,
    stage: null,
    region: 'CA',
    relationship: 'career_switch',
    ...overrides
  }
}

test('career path router classifies target roles into the correct pathway families', () => {
  const selectTemplateModule = loadTranspiledTsModule(selectTemplatePath)
  const { classifyCareerPath, selectPlanRoute } = selectTemplateModule

  const electrician = selectPlanRoute(
    makeProfile({
      title: 'Apprentice Electrician',
      certifications: ['Working at Heights'],
      apprenticeshipHours: 9000,
      stage: 'apprentice'
    })
  )
  assert.equal(electrician.careerPathType, 'TRADES')
  assert.equal(electrician.templateKey, 'regulated_trade')

  const millwright = selectPlanRoute(
    makeProfile({
      title: 'Millwright',
      apprenticeshipHours: 8000
    })
  )
  assert.equal(millwright.careerPathType, 'TRADES')
  assert.equal(millwright.templateKey, 'regulated_trade')

  const machinist = selectPlanRoute(
    makeProfile({
      title: 'Machinist',
      hardGates: ['Four-year apprenticeship pathway or equivalent workplace training'],
      employerSignals: ['Trade certification preferred']
    })
  )
  assert.equal(machinist.careerPathType, 'TRADES')
  assert.equal(machinist.templateKey, 'regulated_trade')

  const lpn = selectPlanRoute(
    makeProfile({
      title: 'Licensed Practical Nurse',
      regulated: true,
      education: 'Practical nursing diploma',
      hardGates: ['Clinical placements', 'Provincial registration'],
      examRequired: true
    })
  )
  assert.equal(lpn.careerPathType, 'HEALTHCARE_LICENSED')
  assert.equal(lpn.templateKey, 'regulated_profession')

  const accountant = selectPlanRoute(
    makeProfile({
      title: 'Accountant',
      regulated: true,
      education: 'Bachelor degree in accounting'
    })
  )
  assert.equal(accountant.careerPathType, 'PROFESSIONAL_LICENSED')
  assert.equal(accountant.templateKey, 'regulated_profession')

  const softwareDeveloper = selectPlanRoute(
    makeProfile({
      title: 'Software Developer',
      employerSignals: ['Portfolio projects', 'Github']
    })
  )
  assert.equal(classifyCareerPath(makeProfile({
    title: 'Software Developer',
    employerSignals: ['Portfolio projects', 'Github']
  })), 'TECH')
  assert.equal(softwareDeveloper.careerPathType, 'TECH')
  assert.equal(softwareDeveloper.templateKey, 'portfolio_role')

  const networkAdministrator = selectPlanRoute(
    makeProfile({
      title: 'Computer network and web technicians',
      certifications: ['Network+'],
      employerSignals: ['Troubleshooting network incidents']
    })
  )
  assert.equal(networkAdministrator.careerPathType, 'TECH')
})

test('planner routing guardrails hold for required pathway set', () => {
  const selectTemplateModule = loadTranspiledTsModule(selectTemplatePath)
  const { selectPlanRoute } = selectTemplateModule

  const dental = selectPlanRoute(
    makeProfile({
      title: 'Dental Hygienist',
      regulated: true,
      education: 'Dental hygiene diploma',
      hardGates: ['NDHCE exam', 'Provincial registration']
    })
  )
  assert.equal(dental.careerPathType, 'HEALTHCARE_LICENSED')
  assert.equal(dental.templateKey, 'regulated_profession')

  const rn = selectPlanRoute(
    makeProfile({
      title: 'Registered Nurse',
      regulated: true,
      education: 'Nursing degree',
      hardGates: ['NCLEX', 'Provincial registration']
    })
  )
  assert.equal(rn.careerPathType, 'HEALTHCARE_LICENSED')
  assert.equal(rn.templateKey, 'regulated_profession')

  const pharmacyTech = selectPlanRoute(
    makeProfile({
      title: 'Pharmacy Technician',
      regulated: true,
      education: 'Pharmacy technician diploma',
      hardGates: ['PEBC', 'Provincial registration']
    })
  )
  assert.equal(pharmacyTech.careerPathType, 'HEALTHCARE_LICENSED')
  assert.equal(pharmacyTech.templateKey, 'regulated_profession')

  const electrician = selectPlanRoute(
    makeProfile({
      title: 'Electrician',
      apprenticeshipHours: 9000,
      hardGates: ['Apprenticeship registration']
    })
  )
  assert.equal(electrician.careerPathType, 'TRADES')
  assert.equal(electrician.templateKey, 'regulated_trade')

  const ux = selectPlanRoute(
    makeProfile({
      title: 'UX Designer',
      employerSignals: ['Portfolio', 'Case studies']
    })
  )
  assert.equal(ux.careerPathType, 'TECH')
  assert.equal(ux.templateKey, 'portfolio_role')

  const customerSuccess = selectPlanRoute(
    makeProfile({
      title: 'Customer Success Manager',
      employerSignals: ['Account retention', 'Client expansion']
    })
  )
  assert.equal(customerSuccess.careerPathType, 'GENERAL')
  assert.equal(customerSuccess.templateKey, 'experience_ladder_role')

  const projectCoordinator = selectPlanRoute(
    makeProfile({
      title: 'Project Coordinator',
      employerSignals: ['Cross-functional coordination', 'Timeline tracking']
    })
  )
  assert.equal(projectCoordinator.careerPathType, 'GENERAL')
  assert.equal(projectCoordinator.templateKey, 'experience_ladder_role')
})

test('v3 dashboard ignores stray trade fields when the authoritative path type is healthcare', () => {
  const mapperModule = loadTranspiledTsModule(mapperPath)
  const { buildPlannerDashboardV3Model } = mapperModule

  const model = buildPlannerDashboardV3Model({
    report: {
      suggestedCareers: [
        {
          title: 'Licensed Practical Nurses',
          transitionTime: '12-24 months',
          salary: {
            native: {
              currency: 'CAD',
              low: 24,
              median: 31,
              high: 38,
              sourceName: 'Job Bank',
              asOfDate: '2026-03-13',
              region: 'ON'
            }
          }
        }
      ],
      targetRequirements: {
        certifications: ['CPNRE'],
        hardGates: ['Clinical placements'],
        employerSignals: ['Patient care experience'],
        apprenticeshipHours: 9000,
        examRequired: true,
        regulated: true,
        sources: []
      },
      transitionMode: {
        careerPathType: 'HEALTHCARE_LICENSED',
        templateKey: 'regulated_profession',
        difficulty: {
          score: 7.2,
          label: 'Hard',
          why: ['Formal program and exam requirements']
        },
        timeline: {
          minMonths: 12,
          maxMonths: 24,
          assumptions: ['Education plus clinical hours are required']
        },
        routes: {
          primary: {
            title: 'Primary route: education plus licensure sequence',
            reason: 'Healthcare path',
            firstStep: 'Confirm the program and licensing sequence.'
          },
          secondary: {
            title: 'Secondary route: support role first',
            reason: 'Support role',
            firstStep: 'Find adjacent support roles.'
          },
          contingency: {
            title: 'Contingency route: bridge prerequisites',
            reason: 'Bridge path',
            firstStep: 'Close prerequisites.'
          }
        },
        plan90: [
          {
            phase: 'Weeks 1-4',
            weeks: '1-4',
            tasks: ['Confirm admissions requirements', 'Compare practical nursing programs'],
            weeklyTargets: ['1 licensing checklist'],
            timePerWeekHours: 8
          },
          {
            phase: 'Months 2-6',
            weeks: '5-24',
            tasks: ['Start prerequisite coursework', 'Map clinical placement requirements'],
            weeklyTargets: ['1 prerequisite milestone'],
            timePerWeekHours: 10
          },
          {
            phase: 'Final licensing phase',
            weeks: '24+',
            tasks: ['Prepare for CPNRE', 'Register with the provincial nursing body'],
            weeklyTargets: ['1 licensing milestone'],
            timePerWeekHours: 10
          }
        ],
        execution: {
          dailyRoutine: ['Do one paperwork step'],
          weeklyCadence: ['2 program tasks'],
          outreachTemplates: {
            call: 'Call licensing body',
            email: 'Email licensing body'
          }
        },
        gaps: {
          strengths: ['Customer-facing experience'],
          missing: ['Clinical training'],
          first3Steps: ['Confirm the accredited program', 'Map funding', 'Confirm regulator']
        },
        earnings: [
          { stage: 'Entry', rangeLow: 24, rangeHigh: 28, unit: 'CAD/hr' },
          { stage: 'Program', rangeLow: 24, rangeHigh: 31, unit: 'CAD/hr' },
          { stage: 'Licensed', rangeLow: 31, rangeHigh: 38, unit: 'CAD/hr' },
          { stage: 'Senior', rangeLow: 38, rangeHigh: 42, unit: 'CAD/hr' }
        ],
        reality: {
          barriers: ['Formal education required', 'Clinical placements required', 'Licensing exam required'],
          mitigations: ['Map prerequisites', 'Apply to accredited program', 'Prepare for CPNRE']
        }
      },
      sourceEnrichment: {
        tradeFacts: {
          tradeCode: '309A',
          totalHours: 9000,
          sourceLabel: 'Incorrect stray trade fact'
        },
        entryRoles: [
          {
            title: 'Electrical Labourer',
            sourceUrl: 'https://example.com',
            sourceLabel: 'Incorrect stray trade role',
            sourceType: 'verified'
          }
        ]
      },
      transitionReport: {
        marketSnapshot: {
          summaryLine: 'Based on 100 recent postings in Ontario, Canada.',
          topRequirements: [{ label: 'Provincial nursing registration' }]
        },
        transferableStrengths: [{ strength: 'Customer care' }]
      }
    },
    plannerResult: null,
    currentRole: 'Cashier',
    targetRole: 'Licensed Practical Nurse',
    locationText: 'Ontario, Canada',
    timelineBucket: '1-3 months',
    skillsCount: 2,
    lastGeneratedAt: null
  })

  assert.equal(model.hero.mappedPathLabel, undefined)
  assert.equal(model.fastestPath.headline, 'Shortest realistic route to first field entry')
  assert.equal(model.training.tradeFacts.length, 0)
  assert.ok(model.roadmap.phases.every((phase) => !/Sponsorship|Qualification Milestone|Hours And School Loop/i.test(phase.title)))
  assert.ok(model.skillTransfer.evidenceRequired.every((item) => !/apprentice|red seal|sponsor/i.test(item.toLowerCase())))
})
