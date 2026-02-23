import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const contractSource = readFileSync(
  path.resolve(__dirname, '../lib/planner/contract.ts'),
  'utf8'
)
const migrationSource = readFileSync(
  path.resolve(__dirname, '../migrations/005_career_map_planner_core.sql'),
  'utf8'
)
const specSource = readFileSync(
  path.resolve(__dirname, '../docs/CAREER_MAP_PLANNER_PRODUCT_CONTRACT.md'),
  'utf8'
)

test('contract enforces deterministic score weight breakdown', () => {
  assert.match(contractSource, /skillOverlap:\s*40/)
  assert.match(contractSource, /experienceAdjacency:\s*25/)
  assert.match(contractSource, /educationFit:\s*10/)
  assert.match(contractSource, /certificationLicensingGap:\s*15/)
  assert.match(contractSource, /timelineFeasibility:\s*10/)
  assert.match(contractSource, /sum to 100/)
})

test('contract includes required report sections and anti-filler guardrails', () => {
  assert.match(contractSource, /resumeReframe/)
  assert.match(contractSource, /compatibilitySnapshot/)
  assert.match(contractSource, /suggestedCareers/)
  assert.match(contractSource, /skillGaps/)
  assert.match(contractSource, /roadmap/)
  assert.match(contractSource, /linksResources/)
  assert.match(contractSource, /reframed to highlight/)
  assert.match(contractSource, /validateCareerMapOutput/)
})

test('migration includes core planner data + provenance tables', () => {
  assert.match(migrationSource, /CREATE TABLE IF NOT EXISTS public\.occupations/)
  assert.match(migrationSource, /CREATE TABLE IF NOT EXISTS public\.occupation_skills/)
  assert.match(migrationSource, /CREATE TABLE IF NOT EXISTS public\.skills/)
  assert.match(migrationSource, /CREATE TABLE IF NOT EXISTS public\.occupation_requirements/)
  assert.match(migrationSource, /CREATE TABLE IF NOT EXISTS public\.occupation_wages/)
  assert.match(migrationSource, /CREATE TABLE IF NOT EXISTS public\.trade_requirements/)
  assert.match(migrationSource, /CREATE TABLE IF NOT EXISTS public\.career_map_reports/)
  assert.match(migrationSource, /CREATE TABLE IF NOT EXISTS public\.career_map_claims/)
})

test('spec requires explainability and provenance language', () => {
  assert.match(specSource, /Where did this come from\?/)
  assert.match(specSource, /Why this\?/)
  assert.match(specSource, /Every claim must cite/)
  assert.match(specSource, /Data transparency/)
})
