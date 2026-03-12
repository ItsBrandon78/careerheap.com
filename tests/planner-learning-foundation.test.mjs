import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const repoRoot = process.cwd()
const learningSource = fs.readFileSync(
  path.join(repoRoot, 'lib', 'server', 'plannerLearning.ts'),
  'utf8'
)
const routeSource = fs.readFileSync(
  path.join(repoRoot, 'app', 'api', 'tools', 'career-switch-planner', 'route.ts'),
  'utf8'
)
const progressRouteSource = fs.readFileSync(
  path.join(repoRoot, 'app', 'api', 'tools', 'career-switch-planner', 'progress', 'route.ts'),
  'utf8'
)
const migrationSource = fs.readFileSync(
  path.join(repoRoot, 'migrations', '013_career_map_learning_foundation.sql'),
  'utf8'
)

test('learning foundation migration creates analytics, events, and priors tables', () => {
  assert.match(migrationSource, /CREATE TABLE IF NOT EXISTS public\.career_map_report_analytics/)
  assert.match(migrationSource, /CREATE TABLE IF NOT EXISTS public\.career_map_progress_events/)
  assert.match(migrationSource, /CREATE TABLE IF NOT EXISTS public\.career_map_transition_priors/)
})

test('planner learning helper exports persistence and aggregation functions', () => {
  assert.match(learningSource, /export async function persistPlannerGenerationSnapshot/)
  assert.match(learningSource, /export async function persistPlannerProgressEvent/)
  assert.match(learningSource, /export async function aggregateTransitionPriors/)
  assert.match(learningSource, /export async function getTransitionPriorContext/)
  assert.match(learningSource, /export function applyTransitionPriorsToReport/)
})

test('transition priors aggregation weights completed training cards into learned training signals', () => {
  assert.match(learningSource, /completedTrainingIds/)
  assert.match(learningSource, /extractCompletedTrainingLabels/)
  assert.match(learningSource, /addCount\(bucket\.trainingCounts, completedTrainingLabels\)/)
})

test('planner generation route writes analytics snapshots and reads priors', () => {
  assert.match(routeSource, /persistPlannerGenerationSnapshot/)
  assert.match(routeSource, /getTransitionPriorContext/)
  assert.match(routeSource, /applyTransitionPriorsToReport/)
})

test('planner progress route writes progress events', () => {
  assert.match(progressRouteSource, /persistPlannerProgressEvent/)
})
