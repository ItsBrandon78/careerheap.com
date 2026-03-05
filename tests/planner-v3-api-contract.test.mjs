import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const routePath = path.resolve(__dirname, '../app/api/tools/career-switch-planner/route.ts')
const source = readFileSync(routePath, 'utf8')

test('planner API remains additive and includes optional V3 diagnostics/version fields', () => {
  assert.match(source, /function normalizeInput/)
  assert.match(source, /planVersion/)
  assert.match(source, /inputVersion/)
  assert.match(source, /collectV3MissingFields/)
  assert.match(source, /getAnonymousUsageSummary/)
  assert.match(source, /applyGuestPreviewOutputLimits/)
  assert.match(source, /previewLimited/)
  assert.match(source, /v3Diagnostics/)
  assert.match(source, /missing_v3_fields/)
})
