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
    Date
  })
  vm.runInContext(transpiled, context)
  return cjsModule.exports
}

const mapperPath = path.resolve(__dirname, '../lib/planner/v3Dashboard.ts')

test('V3 dashboard mapper always returns complete section model with deterministic fallbacks', () => {
  const mapperModule = loadTranspiledTsModule(mapperPath)
  const { buildPlannerDashboardV3Model } = mapperModule

  const model = buildPlannerDashboardV3Model({
    report: null,
    plannerResult: null,
    currentRole: '',
    targetRole: '',
    locationText: '',
    timelineBucket: '1-3 months',
    skillsCount: 0,
    lastGeneratedAt: null
  })

  assert.ok(Array.isArray(model.missingFields))
  assert.ok(model.missingFields.includes('report'))

  assert.ok(model.hero.title.length > 0)
  assert.ok(model.pathwayWeighting.type.length > 0)
  assert.ok(model.decision.fastestRoute.length > 0)
  assert.ok(Array.isArray(model.actionWindow14.thisWeek))
  assert.ok(Array.isArray(model.strengths))
  assert.ok(Array.isArray(model.blockers))
  assert.ok(Array.isArray(model.requirementsGaps.mustHave))
  assert.ok(Array.isArray(model.skillsBuckets.alreadyHave))
  assert.ok(Array.isArray(model.certEducation.required))
  assert.ok(Array.isArray(model.resumeEvidence.alreadyProves))
  assert.ok(model.adjacentEntryOptions.closestMatch || model.adjacentEntryOptions.fastestEntry)
  assert.ok(Array.isArray(model.longerTermRoadmap.windows))
  assert.equal(model.difficultyBreakdown.items.length, 5)
  assert.ok(model.skillTransfer.transferable.length > 0)
  assert.ok(model.skillTransfer.required.length > 0)
  assert.equal(model.roadmap.phases.length, 4)
  assert.ok(model.fastestPath.steps.length >= 3)
  assert.ok(model.training.courses.length > 0)
  assert.ok(model.marketSnapshot.entryWage.value.length > 0)
  assert.ok(model.marketSnapshot.entryWage.sourceType)
  assert.ok(model.hero.salaryPotential.sourceType)
  assert.ok(model.realityCheck.applicationsNeeded.value.length > 0)
  assert.ok(model.realityCheck.applicationsNeeded.sourceLabel)
  assert.ok(model.checklist.immediate.length > 0)
  assert.ok(Array.isArray(model.progress.tasks))
  assert.ok(model.progress.tasks.length > 0)
  assert.ok(Array.isArray(model.progress.phases))
  assert.equal(model.progress.phases.length, 4)
  assert.equal(typeof model.progress.weightedPercent, 'number')
  assert.ok(model.alternatives.cards.length >= 4)
  assert.equal(model.alternatives.cards[0].salary.badge, 'Estimate')
  assert.ok(model.stickyPanel.nextSteps.length > 0)
  assert.ok(Array.isArray(model.methodology.sourceLines))
  assert.ok(model.methodology.sourceLines.length >= 3)
})

test('V3 dashboard mapper prefers trade starter cert bundle when trade profile coverage exists', () => {
  const mapperModule = loadTranspiledTsModule(mapperPath)
  const { buildPlannerDashboardV3Model } = mapperModule

  const model = buildPlannerDashboardV3Model({
    report: {
      careerPathwayProfile: {
        meta: {
          title: 'Electrician (Construction and Maintenance) (309A) - Ontario',
          slug: 'electrician-construction-maintenance-309a-on',
          jurisdiction: { country: 'CA', region: 'ON' },
          codes: { noc_2021: '72200', trade_code: '309A', onet_soc: null },
          teer: 2,
          pathway_type: 'trade_apprenticeship',
          regulated: true,
          last_verified: '2026-03-12'
        },
        snapshot: {
          one_liner: 'Electrical trade path',
          what_you_do: ['Install electrical systems'],
          where_you_work: ['Ontario'],
          who_hires: ['Electrical contractors']
        },
        entry_paths: [
          {
            path_name: 'Ontario apprenticeship route',
            who_its_for: 'Career switchers',
            steps: [
              'Target electrical labourer and maintenance helper roles first',
              'Get hired by a sponsor employer',
              'Register apprenticeship'
            ],
            time_to_first_job_weeks: { min: 2, max: 16 }
          }
        ],
        requirements: {
          must_have: [],
          nice_to_have: [],
          starter_cert_bundle: [
            {
              type: 'health_safety',
              name: 'WHMIS',
              details: 'Common baseline',
              source_title: 'CCOHS WHMIS guidance',
              source_url: 'https://www.ccohs.ca/oshanswers/chemicals/whmis_ghs/general.html',
              provider: 'Employer or approved Canadian training provider'
            },
            {
              type: 'health_safety',
              name: 'Working at Heights',
              details: 'Ontario construction training',
              source_title: 'Ontario Working at Heights training',
              source_url: 'https://www.ontario.ca/page/training-working-heights',
              provider: 'Approved Ontario training provider'
            },
            {
              type: 'health_safety',
              name: 'Worker Health and Safety Awareness',
              details: 'Ontario worker awareness',
              source_title: 'Ontario Worker Health and Safety Awareness workbook',
              source_url: 'https://www.ontario.ca/document/worker-health-and-safety-awareness-workbook',
              provider: 'Ontario workplace safety awareness source'
            }
          ],
          tools_or_gear: []
        },
        timeline: {
          time_to_employable: { min_weeks: 2, max_weeks: 16 },
          time_to_full_qualification: { min_months: 48, max_months: 60 },
          phases: []
        },
        progression: { levels: [] },
        wages: { currency: 'CAD', hourly: [], notes: 'n/a' },
        wages_by_province: [],
        difficulty: {
          overall_1_5: 3,
          why: ['Long qualification path'],
          common_failure_points: ['No sponsor']
        },
        skills: { core: ['Safety'], tools_tech: [], soft_skills: ['Reliability'] },
        resources: {
          official: [{ title: 'Skilled Trades Ontario overview', url: 'https://www.skilledtradesontario.ca/' }],
          training: [{ title: 'Ontario Working at Heights training', url: 'https://www.ontario.ca/page/training-working-heights' }],
          job_search: [{ title: 'Ontario apprenticeship pathway', url: 'https://www.ontario.ca/page/start-apprenticeship' }]
        },
        sources: []
      },
      targetRequirements: {
        certifications: [],
        hardGates: [],
        employerSignals: [],
        apprenticeshipHours: 9000,
        examRequired: true,
        regulated: true,
        sources: []
      },
      sourceEnrichment: {
        entryRoles: [
          {
            title: 'Electrical Labourer',
            sourceUrl: 'https://www.jobbank.gc.ca',
            sourceLabel: 'Job Bank',
            sourceType: 'verified'
          },
          {
            title: 'Maintenance Helper',
            sourceUrl: 'https://www.jobbank.gc.ca',
            sourceLabel: 'Job Bank',
            sourceType: 'verified'
          }
        ]
      }
    },
    plannerResult: null,
    currentRole: 'Sous Chef',
    targetRole: 'Apprentice Electrician',
    locationText: 'Ontario, Canada',
    timelineBucket: '1-3 months',
    skillsCount: 3,
    lastGeneratedAt: null
  })

  assert.equal(
    model.training.courses.slice(0, 3).map((course) => course.name).join(' | '),
    'WHMIS | Working at Heights | Worker Health and Safety Awareness'
  )
  assert.equal(model.hero.title, 'Sous Chef -> Apprentice Electrician')
  assert.equal(model.hero.mappedPathLabel, 'Mapped to Ontario pathway: Electrician (309A)')
  assert.equal(model.summaryBar.targetRole, 'Apprentice Electrician')
  assert.equal(model.fastestPath.headline, 'Ontario apprenticeship path from sponsorship to qualification')
  assert.equal(
    model.fastestPath.steps.map((step) => step.label).join(' | '),
    'Entry Route | Sponsorship | Registration | Apprenticeship Loop'
  )
  assert.match(model.fastestPath.steps[0].detail, /Electrical Labourer|Maintenance Helper/)
  assert.ok(
    model.skillTransfer.evidenceRequired.some((item) => item.includes('Secure sponsorship and register the apprenticeship pathway'))
  )
  assert.ok(
    model.skillTransfer.largestGap.length > 0
  )
  assert.ok(model.training.tradeFacts.some((fact) => fact.label === 'First Field Entry'))
  assert.ok(model.training.tradeFacts.some((fact) => fact.label === 'Full Qualification'))
  assert.equal(model.training.courses[0].priorityLabel, 'Get first')
  assert.ok(model.training.costStack.some((item) => item.label === 'Starter certifications and training'))
  assert.ok(model.resources.cards.length > 0)
})

test('V3 dashboard mapper uses source enrichment certification cards when target requirements are sparse', () => {
  const mapperModule = loadTranspiledTsModule(mapperPath)
  const { buildPlannerDashboardV3Model } = mapperModule

  const model = buildPlannerDashboardV3Model({
    report: {
      targetRequirements: {
        certifications: [],
        hardGates: [],
        employerSignals: [],
        apprenticeshipHours: null,
        examRequired: false,
        regulated: false,
        sources: []
      },
      sourceEnrichment: {
        certificationCards: [
          {
            name: 'CPNRE',
            provider: 'College of Nurses',
            sourceUrl: 'https://www.cno.org/',
            sourceLabel: 'College of Nurses of Ontario',
            sourceType: 'verified'
          },
          {
            name: 'BLS Provider',
            provider: 'Heart & Stroke',
            sourceUrl: 'https://www.heartandstroke.ca/',
            sourceLabel: 'Heart & Stroke',
            sourceType: 'verified'
          }
        ]
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

  assert.ok(
    model.training.courses.some((course) => course.name === 'CPNRE'),
    'Expected CPNRE from source enrichment certification cards'
  )
  assert.ok(
    model.training.courses.some((course) => course.name === 'BLS Provider'),
    'Expected BLS Provider from source enrichment certification cards'
  )
})
