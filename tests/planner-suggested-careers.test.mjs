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

const mod = loadTranspiledTsModule(path.resolve(__dirname, '../lib/planner/suggestedCareers.ts'))

function cand(occupationId, title, score, targetRoleSimilarity) {
  return { occupationId, title, score, targetRoleSimilarity }
}

// Sous chef -> apprentice electrician candidate pool: kitchen roles score high
// on current-profile fit but ~0 on target similarity; electrician-family roles
// are the opposite.
const pool = [
  cand('kitchen', 'Food counter attendants, kitchen helpers', 0.92, 0.01),
  cand('letter', 'Letter carriers', 0.61, 0.0),
  cand('electrician', 'Electricians', 0.40, 0.95),
  cand('industrial', 'Industrial electricians', 0.35, 0.78),
  cand('helper', 'Electrical helper', 0.30, 0.52)
]

test('targeted mode: ranks adjacent roles by target similarity, drops off-target', () => {
  const out = mod.rankSuggestedCareers(pool, {
    explicitTargetId: 'electrician',
    hasExplicitTarget: true,
    fallback: pool
  })
  const ids = out.map((c) => c.occupationId)
  assert.ok(!ids.includes('kitchen'), 'kitchen should be dropped')
  assert.ok(!ids.includes('letter'), 'letter carrier should be dropped')
  assert.ok(!ids.includes('electrician'), 'the explicit target itself is excluded')
  assert.equal(ids[0], 'industrial') // highest remaining target similarity
})

test('targeted mode with no adjacent roles: falls back to provided list', () => {
  const onlyOffTarget = [cand('kitchen', 'Kitchen helpers', 0.9, 0.0)]
  const out = mod.rankSuggestedCareers(onlyOffTarget, {
    explicitTargetId: 'electrician',
    hasExplicitTarget: true,
    fallback: onlyOffTarget
  })
  assert.equal(out.length, 1)
  assert.equal(out[0].occupationId, 'kitchen')
})

test('discovery mode (no explicit target): keeps the current-profile fallback order', () => {
  const out = mod.rankSuggestedCareers(pool, {
    explicitTargetId: null,
    hasExplicitTarget: false,
    fallback: pool
  })
  assert.equal(out[0].occupationId, 'kitchen') // unchanged current-profile ranking
})

test('respects the limit', () => {
  const out = mod.rankSuggestedCareers(pool, {
    explicitTargetId: 'electrician',
    hasExplicitTarget: true,
    fallback: pool,
    limit: 1
  })
  assert.equal(out.length, 1)
})
