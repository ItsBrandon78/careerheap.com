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
    require: (specifier) => {
      if (Object.prototype.hasOwnProperty.call(requireMap, specifier)) {
        return requireMap[specifier]
      }
      throw new Error(`External require is not supported in this transpiled unit test: ${specifier}`)
    }
  })
  vm.runInContext(transpiled, context)
  return cjsModule.exports
}

const normalizePath = path.resolve(__dirname, '../lib/requirements/normalize.ts')
const classifyPath = path.resolve(__dirname, '../lib/requirements/classify.ts')
const extractorPath = path.resolve(__dirname, '../lib/requirements/extractor.ts')
const cachingPath = path.resolve(__dirname, '../lib/server/jobRequirements.ts')
const llmNormalizerPath = path.resolve(__dirname, '../lib/server/requirementsLlmNormalizer.ts')

const extractorSource = readFileSync(extractorPath, 'utf8')
const cachingSource = readFileSync(cachingPath, 'utf8')
const llmNormalizerSource = readFileSync(llmNormalizerPath, 'utf8')

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

test('extractor returns concrete named gates and tool mentions from listing text', () => {
  const normalizeModule = loadTranspiledTsModule(normalizePath)
  const classifyModule = loadTranspiledTsModule(classifyPath, {
    '@/lib/requirements/normalize': normalizeModule
  })
  const extractorModule = loadTranspiledTsModule(extractorPath, {
    '@/lib/requirements/classify': classifyModule,
    '@/lib/requirements/normalize': normalizeModule
  })

  const { extractRequirementsFromText } = extractorModule
  const extracted = extractRequirementsFromText({
    source: 'adzuna',
    text: [
      'Requirements: Valid Red Seal certification, WHMIS certification, and Class G driver license.',
      'Must have experience with AutoCAD, Revit, and Procore.',
      'Need 3+ years of field experience in electrical installation.'
    ].join(' ')
  })

  const labels = extracted.map((item) => item.label)
  const gates = extracted.filter((item) => item.type === 'gate').map((item) => item.label)
  const tools = extracted.filter((item) => item.type === 'tool').map((item) => item.label)
  const experience = extracted.filter((item) => item.type === 'experience_signal').map((item) => item.label)

  assert.ok(gates.some((label) => /Red Seal certification/i.test(label)))
  assert.ok(gates.some((label) => /WHMIS certification/i.test(label)))
  assert.ok(gates.some((label) => /Class G driver's license/i.test(label)))
  assert.ok(tools.some((label) => /Use AutoCAD/i.test(label)))
  assert.ok(tools.some((label) => /Use Revit/i.test(label)))
  assert.ok(tools.some((label) => /Use Procore/i.test(label)))
  assert.ok(experience.some((label) => /3\+ years/i.test(label)))
  assert.ok(!labels.some((label) => /^mechanical$/i.test(label)))
})

test('job requirements cache logic includes TTL freshness and reuse path', () => {
  assert.match(cachingSource, /function isFresh/)
  assert.match(cachingSource, /const canUseCache/)
  assert.match(cachingSource, /usedCache:\s*canUseCache/)
  assert.match(cachingSource, /REQUIREMENTS_TTL_HOURS/)
})

test('llm normalizer enforces strict schema and fail-closed fallback', () => {
  assert.match(llmNormalizerSource, /response_format/)
  assert.match(llmNormalizerSource, /json_schema/)
  assert.match(llmNormalizerSource, /strict:\s*true/)
  assert.match(llmNormalizerSource, /toTaskLevelLabel/)
  assert.match(llmNormalizerSource, /includesComparableQuote/)
  assert.match(llmNormalizerSource, /if \(!llmResponse\) return \[\]/)
  assert.match(cachingSource, /enrichLowConfidenceRequirementsWithLlm/)
})
