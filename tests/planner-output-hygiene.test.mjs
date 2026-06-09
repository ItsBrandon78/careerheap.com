import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const read = (rel) => readFileSync(path.resolve(__dirname, '..', rel), 'utf8')

const v3 = read('lib/planner/v3Dashboard.ts')
const normalize = read('lib/requirements/normalize.ts')
const plannerClient = read('app/tools/career-switch-planner/CareerSwitchPlannerClient.tsx')
const plannerRoute = read('app/api/tools/career-switch-planner/route.ts')

test('current role is never an invented "{skill} specialist" title', () => {
  assert.doesNotMatch(plannerClient, /\$\{confirmedSkills\[0\]\} specialist/)
  assert.match(plannerClient, /currentRoleFallback = draft\.currentRoleText\.trim\(\) \|\| 'Career starter'/)
})

test('below-confidence role suggestions are relevance-gated (no irrelevant manager match for "IT Support")', () => {
  assert.match(plannerRoute, /function isRelevantUnmappedSuggestion/)
  assert.match(plannerRoute, /alternatives: relevantAlternatives/)
})

test('requirement gate labels do not double-prefix verb phrases (no "Obtain apply…")', () => {
  // Verb-initial gate phrases must be returned as-is, not prefixed with "Obtain".
  assert.match(normalize, /startsWithVerbPhrase\(stripped\)\s*\?\s*stripped\s*:\s*`Obtain \$\{stripped\}`/)
  assert.match(normalize, /startsWithVerbPhrase\(token\)\s*\?\s*token\s*:\s*`Obtain \$\{token\}`/)
  // Common action verbs that previously fell through must now be recognized.
  assert.match(normalize, /\bapply\b/)
  assert.match(normalize, /\bmeet\b/)
  assert.match(normalize, /\bregister\b/)
})

test('hero starting salary uses the entry band (low–median), not the full low–high range', () => {
  assert.match(
    v3,
    /const salaryPotential = salaryRangeToLabel\(effectiveWageSource\?\.low, effectiveWageSource\?\.median, salaryCurrency\)/
  )
  // Mid-career is a distinct median–high band, not the median repeated.
  assert.match(v3, /salaryRangeToLabel\(effectiveWageSource\?\.median, effectiveWageSource\?\.high, salaryCurrency\)/)
})

test('equal salary bounds collapse to a single value (no "$67-$67/hr")', () => {
  assert.match(v3, /Math\.round\(normLow\) >= Math\.round\(normHigh\)/)
})

test('month/year ranges collapse equal bounds (no "12-12 months")', () => {
  assert.match(v3, /function formatUnitRange/)
  assert.match(v3, /if \(lo === hi\) return `\$\{lo\} \$\{unit\}\$\{lo === 1 \? '' : 's'\}`/)
})

test('readiness band labels drop the confusing "Recovery Plan" / "Week 2" framing', () => {
  assert.doesNotMatch(v3, /Recovery Plan/)
  assert.doesNotMatch(v3, /\(Week 2\)/)
})

test('strength cards run through a short-claim guard (no leaked "60 years"/posting prose)', () => {
  assert.match(v3, /function sanitizeShortClaim/)
  assert.match(v3, /implausibleYears/)
  assert.match(v3, /advantage: sanitizeShortClaim\(item\.label,/)
  assert.match(v3, /whyItMatters: sanitizeShortClaim\(item\.why,/)
})

test('skill labels are sentence-cased (no lowercase "analyze data")', () => {
  assert.match(v3, /function capitalizeFirst/)
  assert.match(v3, /label: capitalizeFirst\(label\)/)
})

test('local-demand location is title-cased (no "ontario, canada")', () => {
  assert.match(v3, /replace\(\/\\b\(\[a-z\]\)\/g, \(m\) => m\.toUpperCase\(\)\)/)
})
