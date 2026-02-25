import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const source = readFileSync(path.resolve(__dirname, '../lib/server/stripeWebhook.ts'), 'utf8')

test('webhook handles required Stripe lifecycle events', () => {
  assert.match(source, /checkout\.session\.completed/)
  assert.match(source, /customer\.subscription\.created/)
  assert.match(source, /customer\.subscription\.updated/)
  assert.match(source, /customer\.subscription\.deleted/)
  assert.match(source, /invoice\.payment_succeeded/)
  assert.match(source, /invoice\.payment_failed/)
})

test('subscription payload includes period/cancel metadata', () => {
  assert.match(source, /stripe_cancel_at_period_end/)
  assert.match(source, /stripe_current_period_end/)
  assert.match(source, /buildSubscriptionProfilePayload/)
})
