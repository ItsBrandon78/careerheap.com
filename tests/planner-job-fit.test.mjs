import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function loadTranspiledTsModule(filePath, requireMap = {}) {
  const source = readFileSync(filePath, 'utf8')
  const transpiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: filePath
  }).outputText
  const cjsModule = { exports: {} }
  const context = vm.createContext({
    module: cjsModule,
    exports: cjsModule.exports,
    require: (specifier) => {
      if (Object.prototype.hasOwnProperty.call(requireMap, specifier)) return requireMap[specifier]
      throw new Error(`Unexpected require in unit test: ${specifier}`)
    }
  })
  vm.runInContext(transpiled, context)
  return cjsModule.exports
}

const dedupeModule = loadTranspiledTsModule(path.resolve(__dirname, '../lib/transition/dedupe.ts'))
const jobFit = loadTranspiledTsModule(path.resolve(__dirname, '../lib/planner/jobFit.ts'), {
  '@/lib/transition/dedupe': dedupeModule
})

function req(type, label, frequency) {
  return {
    type,
    label,
    normalizedKey: '',
    normalized_key: '',
    frequency,
    frequency_count: frequency,
    frequency_percent: null,
    evidence: [],
    evidence_quotes: []
  }
}

test('scoreRequirementFit: strong when most requirements met and no missing cert', () => {
  const requirements = [
    req('gate', 'Obtain WHMIS certification before applying', 4),
    req('hard_skill', 'Operate forklift in warehouse workflows', 3),
    req('soft_signal', 'Collaborate across teams to deliver milestones', 2)
  ]
  const signals = { skills: ['Forklift', 'Teamwork'], certifications: ['WHMIS'], experienceSignals: [], rawLines: [] }
  const fit = jobFit.scoreRequirementFit(requirements, signals)
  assert.equal(fit.tier, 'strong')
  assert.equal(fit.totalCount, 3)
  assert.ok(fit.metCount >= 2)
  assert.ok(fit.matched.some((m) => /whmis/i.test(m.label)))
})

test('scoreRequirementFit: reach when nothing matches', () => {
  const requirements = [req('gate', 'Obtain Red Seal certification before applying', 5)]
  const signals = { skills: ['Customer Service'], certifications: [], experienceSignals: [], rawLines: [] }
  const fit = jobFit.scoreRequirementFit(requirements, signals)
  assert.equal(fit.tier, 'reach')
  assert.equal(fit.metCount, 0)
  assert.equal(fit.missing[0].label, 'Obtain Red Seal certification before applying')
})

test('scoreRequirementFit: empty requirements is unscored reach, never throws', () => {
  const fit = jobFit.scoreRequirementFit([], { skills: [], certifications: [], experienceSignals: [], rawLines: [] })
  assert.equal(fit.tier, 'reach')
  assert.equal(fit.totalCount, 0)
  assert.equal(fit.missing.length, 0)
})

test('scoreRequirementFit: missing required cert caps tier below strong', () => {
  const requirements = [
    req('hard_skill', 'Operate forklift in warehouse workflows', 5),
    req('hard_skill', 'Maintain inventory accuracy in role workflows', 5),
    req('gate', 'Obtain WHMIS certification before applying', 5)
  ]
  const signals = { skills: ['Forklift', 'Inventory'], certifications: [], experienceSignals: [], rawLines: [] }
  const fit = jobFit.scoreRequirementFit(requirements, signals)
  assert.notEqual(fit.tier, 'strong')
})
