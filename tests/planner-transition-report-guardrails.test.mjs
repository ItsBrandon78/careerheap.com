import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const plannerSource = readFileSync(
  path.resolve(__dirname, '../lib/server/careerMapPlanner.ts'),
  'utf8'
)

test('planner report includes the new transitionReport contract sections', () => {
  assert.match(plannerSource, /transitionReport:\s*\{/)
  assert.match(plannerSource, /marketSnapshot:/)
  assert.match(plannerSource, /mustHaves:/)
  assert.match(plannerSource, /niceToHaves:/)
  assert.match(plannerSource, /coreTasks:/)
  assert.match(plannerSource, /toolsPlatformsEquipment:/)
  assert.match(plannerSource, /transferableStrengths:/)
  assert.match(plannerSource, /plan30_60_90:/)
  assert.match(plannerSource, /evidenceTransparency:/)
})

test('transition roadmap steps require linked requirements from missing registry', () => {
  assert.match(plannerSource, /linkedRequirements:/)
  assert.match(plannerSource, /missingRequirementRegistry/)
  assert.match(plannerSource, /normalized_key/)
})

test('evidence quote summaries are capped to two items', () => {
  assert.match(plannerSource, /pickEvidenceQuotes/)
  assert.match(plannerSource, /slice\(0,\s*2\)/)
})
