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
    exports: cjsModule.exports
  })
  vm.runInContext(transpiled, context)
  return cjsModule.exports
}

const roleNormalizationPath = path.resolve(__dirname, '../lib/planner/roleNormalization.ts')
const plannerClientPath = path.resolve(
  __dirname,
  '../app/tools/career-switch-planner/CareerSwitchPlannerClient.tsx'
)

const plannerClientSource = readFileSync(plannerClientPath, 'utf8')

test('scoreToLabel maps raw similarity to non-numeric confidence labels', () => {
  const helperModule = loadTranspiledTsModule(roleNormalizationPath)
  const { scoreToLabel, shouldShowSimilarRoles } = helperModule

  assert.equal(scoreToLabel(0.95), 'Exact')
  assert.equal(scoreToLabel(0.88), 'Close')
  assert.equal(scoreToLabel(0.7), 'Broad')
  assert.equal(scoreToLabel(0.4), 'Unclear')
  assert.equal(shouldShowSimilarRoles('Exact'), false)
  assert.equal(shouldShowSimilarRoles('Close'), true)
  assert.equal(shouldShowSimilarRoles('Broad'), true)
  assert.equal(shouldShowSimilarRoles('Unclear'), true)
})

test('role match UI uses standardized wording and never renders numeric confidence', () => {
  const roleMatchSection = plannerClientSource.match(
    /<h3 className="text-base font-bold text-text-primary">Role Match<\/h3>([\s\S]*?)\{plannerReport\?\.marketEvidence/s
  )
  assert.ok(roleMatchSection, 'Role Match section not found')
  const roleMatchMarkup = roleMatchSection[1]

  assert.match(plannerClientSource, /Standardized as:/)
  assert.doesNotMatch(roleMatchMarkup, /Matched to:/)
  assert.match(plannerClientSource, /Similar roles:/)
  assert.doesNotMatch(plannerClientSource, /Closest:/)
  assert.doesNotMatch(roleMatchMarkup, /Math\.round\(.+confidence/)
  assert.doesNotMatch(roleMatchMarkup, /%\)/)
})

test('similar roles display is gated by non-Exact confidence', () => {
  assert.match(plannerClientSource, /shouldShowSimilarRoles\(confidenceLabel\)/)
  assert.match(plannerClientSource, /showSimilar && similarRoles\.length > 0/)
})
