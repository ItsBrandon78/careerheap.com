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
const relevance = loadTranspiledTsModule(path.resolve(__dirname, '../lib/planner/jobRelevance.ts'), {
  '@/lib/transition/dedupe': dedupeModule
})

test('isRelevantJobTitle: drops an unrelated title (Technician vs Apprentice Electrician)', () => {
  assert.equal(relevance.isRelevantJobTitle('Technician', ['Apprentice Electrician']), false)
})

test('isRelevantJobTitle: keeps an on-target title', () => {
  assert.equal(relevance.isRelevantJobTitle('Electrician', ['Apprentice Electrician']), true)
  assert.equal(relevance.isRelevantJobTitle('Electrical Apprentice', ['Apprentice Electrician']), true)
})

test('isRelevantJobTitle: ignores generic seniority tokens', () => {
  // "Apprentice" alone must NOT make a title relevant.
  assert.equal(relevance.isRelevantJobTitle('Apprentice Plumber', ['Apprentice Electrician']), false)
})

test('isRelevantJobTitle: matches against any of the searched roles (bridge roles)', () => {
  assert.equal(
    relevance.isRelevantJobTitle('Line Cook', ['Apprentice Electrician', 'Line Cook']),
    true
  )
})

test('isRelevantJobTitle: returns true when role has no distinctive tokens (do not over-filter)', () => {
  assert.equal(relevance.isRelevantJobTitle('Anything', ['Senior']), true)
})
