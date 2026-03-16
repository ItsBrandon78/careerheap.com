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
const sourceContractPath = path.resolve(__dirname, '../lib/planner/sourceContract.ts')

test('planner source contract passes for deterministic fallback dashboard model', () => {
  const mapperModule = loadTranspiledTsModule(mapperPath)
  const sourceContractModule = loadTranspiledTsModule(sourceContractPath)
  const { buildPlannerDashboardV3Model } = mapperModule
  const { validatePlannerDashboardSourceContract } = sourceContractModule

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

  const result = validatePlannerDashboardSourceContract(model)
  assert.equal(result.valid, true)
  assert.equal(result.issues.length, 0)
})

test('planner source contract fails when verified values are labeled as estimate', () => {
  const mapperModule = loadTranspiledTsModule(mapperPath)
  const sourceContractModule = loadTranspiledTsModule(sourceContractPath)
  const { buildPlannerDashboardV3Model } = mapperModule
  const { validatePlannerDashboardSourceContract } = sourceContractModule

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

  model.marketSnapshot.entryWage.sourceType = 'verified'
  model.marketSnapshot.entryWage.sourceLabel = 'Regional estimate'

  const result = validatePlannerDashboardSourceContract(model)
  assert.equal(result.valid, false)
  assert.ok(
    result.issues.some((issue) => issue.path === 'market.entryWage')
  )
})

