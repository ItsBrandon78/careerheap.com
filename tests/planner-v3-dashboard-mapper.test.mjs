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
            steps: ['Get hired by a sponsor employer', 'Register apprenticeship'],
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
        resources: { official: [], training: [], job_search: [] },
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
      sourceEnrichment: {}
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
})
