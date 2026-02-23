import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const source = readFileSync(path.resolve(__dirname, '../lib/server/toolUsage.ts'), 'utf8')

test('tool usage service includes override parsers and override summary builders', () => {
  assert.match(source, /export function parsePlanOverride/)
  assert.match(source, /export function parseUsesRemainingOverride/)
  assert.match(source, /export function buildSummaryFromOverrides/)
  assert.match(source, /export function consumeSummaryOverride/)
})

test('override parser enforces free quota bounds 0..3', () => {
  assert.match(source, /rounded < 0 \|\| rounded > FREE_LIFETIME_LIMIT/)
})

test('entitlements use Stripe subscription status aware resolver', () => {
  assert.match(source, /resolveEntitledPlan\(/)
  assert.match(source, /stripe_subscription_status/)
})
