import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const toolRouteSource = readFileSync(
  path.resolve(__dirname, '../app/api/tools/[slug]/route.ts'),
  'utf8'
)
const summaryRouteSource = readFileSync(
  path.resolve(__dirname, '../app/api/usage/summary/route.ts'),
  'utf8'
)

test('tool usage API supports query overrides in GET and POST handlers', () => {
  assert.match(toolRouteSource, /parsePlanOverride/)
  assert.match(toolRouteSource, /parseUsesRemainingOverride/)
  assert.match(toolRouteSource, /buildSummaryFromOverrides/)
  assert.match(toolRouteSource, /consumeSummaryOverride/)
})

test('tool usage POST returns locked response for exhausted override', () => {
  assert.match(toolRouteSource, /status: 402/)
  assert.match(toolRouteSource, /error: 'LOCKED'/)
})

test('usage summary route exposes override-aware response path', () => {
  assert.match(summaryRouteSource, /parsePlanOverride/)
  assert.match(summaryRouteSource, /buildSummaryFromOverrides/)
})
