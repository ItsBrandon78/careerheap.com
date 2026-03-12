import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const repoRoot = 'c:\\dev\\careerheap-app'

test('role enrichment cache migration defines dedicated cache table', () => {
  const source = fs.readFileSync(
    path.join(repoRoot, 'migrations', '014_planner_role_enrichment_cache.sql'),
    'utf8'
  )

  assert.match(source, /CREATE TABLE IF NOT EXISTS public\.planner_role_enrichment_cache/)
  assert.match(source, /target_role_key text NOT NULL/)
  assert.match(source, /current_role_cluster text NOT NULL DEFAULT 'all'/)
  assert.match(source, /source_current_role text/)
  assert.match(source, /enrichment_payload jsonb NOT NULL DEFAULT '\{\}'::jsonb/)
})

test('planner source enrichment reads and writes the dedicated role cache and route passes currentRole', () => {
  const enrichmentSource = fs.readFileSync(
    path.join(repoRoot, 'lib', 'server', 'plannerSourceEnrichment.ts'),
    'utf8'
  )
  const routeSource = fs.readFileSync(
    path.join(repoRoot, 'app', 'api', 'tools', 'career-switch-planner', 'route.ts'),
    'utf8'
  )

  assert.match(enrichmentSource, /\.from\('planner_role_enrichment_cache'\)/)
  assert.match(enrichmentSource, /deriveRoleCluster\(args\.currentRole\)/)
  assert.match(routeSource, /currentRole:\s*resolvedCurrentRoleTitle \|\| input\.currentRole \|\| input\.currentRoleText/)
})
