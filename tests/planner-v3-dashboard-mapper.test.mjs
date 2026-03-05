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
  assert.ok(model.realityCheck.applicationsNeeded.value.length > 0)
  assert.ok(model.checklist.immediate.length > 0)
  assert.ok(model.alternatives.cards.length >= 4)
  assert.ok(model.stickyPanel.nextSteps.length > 0)
})
