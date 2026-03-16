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

const modulePath = path.resolve(__dirname, '../lib/occupations/canonicalRoleRegistry.ts')

test('canonical role resolver maps known intents', () => {
  const { resolveCanonicalRoleIntent } = loadTranspiledTsModule(modulePath)

  const ux = resolveCanonicalRoleIntent('UX Designer')
  assert.equal(ux?.key, 'ux_designer')
  assert.equal(ux?.careerPathType, 'TECH')

  const csm = resolveCanonicalRoleIntent('Customer Success Manager')
  assert.equal(csm?.key, 'customer_success_manager')

  const rn = resolveCanonicalRoleIntent('Registered Nurse')
  assert.equal(rn?.careerPathType, 'HEALTHCARE_LICENSED')
})

test('canonical role resolver returns null for unknown long-tail input', () => {
  const { resolveCanonicalRoleIntent } = loadTranspiledTsModule(modulePath)
  const unknown = resolveCanonicalRoleIntent('Moon Habitat Systems Liaison')
  assert.equal(unknown, null)
})

test('canonical helper infers path and family constraint', () => {
  const {
    inferCanonicalCareerPathTypeFromTitle,
    inferRoleFamilyConstraintFromCanonical
  } = loadTranspiledTsModule(modulePath)

  assert.equal(inferCanonicalCareerPathTypeFromTitle('Plumber'), 'TRADES')
  const constraint = inferRoleFamilyConstraintFromCanonical('Licensed Practical Nurse')
  assert.equal(constraint?.id, 'healthcare_lpn')
})
