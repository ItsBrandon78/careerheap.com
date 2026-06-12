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

const ranking = loadTranspiledTsModule(path.resolve(__dirname, '../lib/planner/jobSearchRanking.ts'))

function job(id, tier, met, postedAt, matchedRole) {
  return {
    id,
    title: 't',
    company: 'c',
    location: 'l',
    description: 'd',
    sourceUrl: 'u',
    matchedRole,
    postedAt,
    fit: { tier, metCount: met, totalCount: 5, matched: [], missing: [] }
  }
}

test('rankScoredJobs: strong before stretch before reach', () => {
  const ranked = ranking.rankScoredJobs(
    [
      job('a', 'reach', 1, '2026-06-01', 'target'),
      job('b', 'strong', 4, '2026-06-01', 'target'),
      job('c', 'stretch', 3, '2026-06-01', 'target')
    ],
    'target'
  )
  assert.equal(ranked.map((j) => j.id).join(','), 'b,c,a')
})

test('rankScoredJobs: dedupes by id', () => {
  const ranked = ranking.rankScoredJobs(
    [job('a', 'strong', 4, '2026-06-01', 'target'), job('a', 'strong', 4, '2026-06-01', 'target')],
    'target'
  )
  assert.equal(ranked.length, 1)
})

test('rankScoredJobs: guarantees a bridge-role result in the top 6', () => {
  const targets = Array.from({ length: 6 }, (_, i) => job(`t${i}`, 'strong', 5, '2026-06-01', 'target'))
  const bridge = job('bridge', 'reach', 0, '2026-06-01', 'Warehouse Associate')
  const ranked = ranking.rankScoredJobs([...targets, bridge], 'target').slice(0, 6)
  assert.ok(ranked.some((j) => j.matchedRole === 'Warehouse Associate'))
})
