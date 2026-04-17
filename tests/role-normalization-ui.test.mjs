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
const plannerComponentsPath = path.resolve(
  __dirname,
  '../components/career-switch-planner/CareerSwitchPlannerComponents.tsx'
)
const intakeWizardPath = path.resolve(
  __dirname,
  '../components/career-switch-planner/PlannerIntakeWizard.tsx'
)

const plannerClientSource = readFileSync(plannerClientPath, 'utf8')
const plannerComponentsSource = readFileSync(plannerComponentsPath, 'utf8')
const intakeWizardSource = readFileSync(intakeWizardPath, 'utf8')

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
  const roleAutocomplete = plannerComponentsSource.match(
    /export function RoleAutocomplete[\s\S]*?interface SkillsChipsInputProps/s
  )
  assert.ok(roleAutocomplete, 'Role autocomplete component not found')
  const roleMatchMarkup = roleAutocomplete[0]

  assert.match(roleMatchMarkup, /Not an exact match - showing closest known roles\./)
  assert.match(roleMatchMarkup, /scoreToLabel\(suggestion\.confidence\)/)
  assert.doesNotMatch(roleMatchMarkup, /toFixed\(/)
  assert.doesNotMatch(roleMatchMarkup, /\{\s*suggestion\.confidence\s*\}/)
})

test('similar roles display is gated by non-Exact confidence', () => {
  assert.match(
    plannerComponentsSource,
    /setHasClosestMatches\([\s\S]*bestMatch\.confidence < 0\.72[\s\S]*\)/
  )
  assert.match(plannerComponentsSource, /hasClosestMatches \? \(/)
  assert.match(intakeWizardSource, /Choose your closest match for the \{roleSelectionPrompt\.role\} role/)
  assert.match(intakeWizardSource, /roleMatchStrengthLabel\(option\.confidence\)/)
  assert.doesNotMatch(plannerClientSource, /function RoleNormalizationCard/)
})
