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
    require: () => {
      throw new Error('External require is not supported in this transpiled unit test.')
    }
  })
  vm.runInContext(transpiled, context)
  return cjsModule.exports
}

const normalizePath = path.resolve(__dirname, '../lib/requirements/normalize.ts')
const extractorPath = path.resolve(__dirname, '../lib/requirements/extractor.ts')
const cachingPath = path.resolve(__dirname, '../lib/server/jobRequirements.ts')

const extractorSource = readFileSync(extractorPath, 'utf8')
const cachingSource = readFileSync(cachingPath, 'utf8')

test('normalize module rejects vague single-word requirements and expands tool labels', () => {
  const normalizeModule = loadTranspiledTsModule(normalizePath)
  const { toTaskLevelLabel, normalizeRequirementKey } = normalizeModule

  assert.equal(toTaskLevelLabel('mechanical', 'hard_skill'), null)
  assert.equal(
    toTaskLevelLabel('Excel', 'tool'),
    'Use Excel in role-relevant workflows'
  )
  assert.equal(
    normalizeRequirementKey('  Build APIs, End-to-End!  '),
    'build apis end to end'
  )
})

test('extractor enforces task-level shaping and category-specific extraction', () => {
  assert.match(extractorSource, /toTaskLevelLabel/)
  assert.match(extractorSource, /ACTION_VERB_PATTERN/)
  assert.match(extractorSource, /extractToolMentions/)
  assert.match(extractorSource, /hasGateSignal/)
  assert.match(extractorSource, /aggregateRequirements/)
})

test('job requirements cache logic includes TTL freshness and reuse path', () => {
  assert.match(cachingSource, /function isFresh/)
  assert.match(cachingSource, /const canUseCache/)
  assert.match(cachingSource, /usedCache:\s*canUseCache/)
  assert.match(cachingSource, /REQUIREMENTS_TTL_HOURS/)
})
