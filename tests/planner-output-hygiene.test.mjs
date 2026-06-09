import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const read = (rel) => readFileSync(path.resolve(__dirname, '..', rel), 'utf8')

const v3 = read('lib/planner/v3Dashboard.ts')
const normalize = read('lib/requirements/normalize.ts')
const extractor = read('lib/requirements/extractor.ts')
const careerMapPlanner = read('lib/server/careerMapPlanner.ts')
const generatePlan = read('lib/transition/generatePlan.ts')
const plannerClient = read('app/tools/career-switch-planner/CareerSwitchPlannerClient.tsx')
const resultsPrototype = read('components/career-switch-planner/PlannerResultsPrototype.tsx')
const intakeWizard = read('components/career-switch-planner/PlannerIntakeWizard.tsx')
const plannerRoute = read('app/api/tools/career-switch-planner/route.ts')
const canonical = read('lib/occupations/canonicalRoleRegistry.ts')

test('IT support / help desk maps to an IT-support family (not customer-service manager)', () => {
  // Verified behaviorally: "IT Support" -> "User support technicians" (0.95).
  // A canonical it_support family with an exact "it support" alias must exist so it
  // out-scores the customer_success_manager family's weak "support"-token overlap,
  // and its constraint must keep manager/personal-services occupations out.
  assert.match(canonical, /key: 'it_support'/)
  assert.match(canonical, /'it support'/)
  assert.match(canonical, /'help desk'/)
  assert.match(canonical, /blockedKeywords: \[[^\]]*'manager'[^\]]*'personal services'/)
})

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
  // capitalizeFirst is now applied inside sanitizeSkillLabel, which every skill
  // label routes through (see "skill-gap / transferable" test below).
  assert.match(v3, /function capitalizeFirst/)
  assert.match(v3, /return capitalizeFirst\(cleaned\)/)
})

test('local-demand location is title-cased (no "ontario, canada")', () => {
  assert.match(v3, /replace\(\/\\b\(\[a-z\]\)\/g, \(m\) => m\.toUpperCase\(\)\)/)
})

test('experience extractor caps implausible years (company-age phrases like "over 100 years" do not become requirements)', () => {
  // "over 100 years"/"Founded 50 years ago" are company history, not experience asks.
  assert.match(extractor, /yearsValue >= 25/)
  // Context phrases with digits / first-person posting prose are dropped.
  assert.match(extractor, /contextIsClean/)
})

test('experience-signal labels are guarded in normalize (implausible years / posting prose -> null)', () => {
  assert.match(normalize, /function hasImplausibleOrLeakedClaim/)
  assert.match(normalize, /if \(hasImplausibleOrLeakedClaim\(stripped\)\) return null/)
})

test('requirement read-time guard drops cached implausible-years / first-person rows', () => {
  // Defense-in-depth: even requirements already persisted before the extractor was
  // hardened must be filtered out when assembled into the report.
  assert.match(careerMapPlanner, /function hasImplausibleOrLeakedRequirementClaim/)
  assert.match(careerMapPlanner, /if \(hasImplausibleOrLeakedRequirementClaim\(normalized\)\) return false/)
  assert.match(careerMapPlanner, /Number\.parseInt\(yearsMatch\[1\], 10\) >= 25/)
})

test('generation cache version is bumped to invalidate pre-fix cached reports', () => {
  // The bad reports lived in planner_generation_cache; the cacheKey embeds the
  // schema version, so the default must move past v1 to force regeneration.
  assert.match(plannerRoute, /PLANNER_GENERATION_CACHE_VERSION\?\.trim\(\) \|\| 'v3'/)
})

test('trades are reframed apprentice-first (canonical pathway from trade data, not "get cert before applying")', () => {
  assert.match(careerMapPlanner, /function buildTradeApprenticeshipGates/)
  // The pathway leads with getting hired as an apprentice and ends at the C of Q exam.
  assert.match(careerMapPlanner, /Apply to apprentice or helper roles/)
  assert.match(careerMapPlanner, /Pass the Certificate of Qualification exam/)
  // Posting-scraped trade-cert gates are superseded, and bare trade codes are dropped.
  assert.match(careerMapPlanner, /function isWrongFramedTradeGate/)
  assert.match(careerMapPlanner, /309a\|442a/)
  // The 309A/442A "before applying" gate is no longer scraped from postings.
  assert.doesNotMatch(extractor, /309a\|442a/)
})

test('role-family detection tolerates plural occupation titles ("Electricians", "Plumbers")', () => {
  assert.match(careerMapPlanner, /electricians\?/)
  assert.match(careerMapPlanner, /weld\(\?:er\|ers\|ing\)/)
})

test('outer action templates use toRequirementObjectPhrase (no "Start obtain …")', () => {
  assert.match(normalize, /export function toRequirementObjectPhrase/)
  assert.match(careerMapPlanner, /toRequirementObjectPhrase\(item\.requirement\.label\)/)
  assert.match(generatePlan, /toRequirementObjectPhrase\(displayLabel\)/)
})

test('leaked recruiting prose is rejected at extraction and read time', () => {
  assert.match(normalize, /is seeking\|are seeking/)
  assert.match(careerMapPlanner, /is seeking\|are seeking/)
})

test('adjacent "roles you can reach" are relevance-gated by domain (no pet groomers for electricians)', () => {
  assert.match(v3, /function isRelevantAdjacentTitle/)
  assert.match(v3, /domainTokenSet\(roleTargetDisplay, roleCurrent\)/)
})

test('strengths are framed as transferable, not falsely "directly supporting" an unrelated target', () => {
  assert.doesNotMatch(v3, /Directly supports employer signals for/)
  assert.match(v3, /A transferable strength to lead with/)
})

test('roadmap task toggle does not call onProgressStateChange inside the setChecked updater', () => {
  // Calling a parent setState inside a state updater runs during render and
  // triggers "Cannot update a component while rendering a different component".
  // The updater must stay pure; the parent is notified from the event handler.
  const toggle = resultsPrototype.slice(
    resultsPrototype.indexOf('const toggleTask'),
    resultsPrototype.indexOf('const toggleTask') + 600
  )
  assert.doesNotMatch(toggle, /setChecked\(\(prev\)\s*=>[\s\S]*onProgressStateChange/)
  assert.match(toggle, /const next = \{ \.\.\.checked, \[id\]: !checked\[id\] \}/)
})

test('intake wizard renders a current-role field (so plans are not stuck on "Career starter")', () => {
  assert.match(intakeWizard, /id="current-role"/)
  assert.match(intakeWizard, /value=\{currentRoleText\}/)
  assert.match(intakeWizard, /onChange=\{onCurrentRoleInputChange\}/)
})

test('skill-gap / transferable labels run through sanitizeSkillLabel', () => {
  assert.match(v3, /function sanitizeSkillLabel/)
  assert.match(v3, /label: sanitizeSkillLabel\(label, 'Relevant transferable strength'\)/)
  assert.match(v3, /label: sanitizeSkillLabel\(label, 'Role-relevant technical skill'\)/)
})

test('hero timeline uses formatUnitRange (no "13-13 months")', () => {
  // The hero metric must route through the equal-bound collapsing formatter.
  assert.match(v3, /formatUnitRange\(\s*input\.report\.transitionMode\.timeline\.minMonths/)
})
