# Planner Fit-Ranked Apply Pipeline — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a premium, accessible, fit-ranked "Jobs you can win" pipeline to the Career Switch Planner — real local openings scored against the user's profile, with one-click apply, Pro-gated tailored materials, and outcome capture for future institutional reporting.

**Architecture:** A pure scoring lib (`lib/planner/jobFit.ts`) matches market requirements (from the existing requirements extractor) against the user's profile signals. A no-auth `/api/jobs/search` route fans Adzuna across the target + bridge roles, scores each posting, and ranks winnable-first. A new accessible `JobsYouCanWinCard` renders results in the V3 dashboard. Application logging writes an append-only `planner_job_outcomes` row (tenant-ready) and bumps the Outreach CRM. Tailored cover-letter / resume-guidance generation goes through a Pro-gated `tailor` route reusing existing generation libs.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind v4 (design tokens), Supabase (admin client + RLS), Adzuna API, `node --test` with on-the-fly TS transpile for unit tests.

**Spec:** `docs/superpowers/specs/2026-06-12-planner-live-jobs-board-design.md`

---

## File Structure

**Create**
- `lib/planner/jobFit.ts` — pure matcher: aggregated requirements + profile signals → `JobFit`.
- `tests/planner-job-fit.test.mjs` — unit tests for the matcher.
- `app/api/jobs/search/route.ts` — Adzuna fan-out + extraction + scoring + ranking (no auth, no DB).
- `tests/jobs-search-ranking.test.mjs` — unit tests for the pure ranking/scoring helpers used by the route.
- `lib/planner/jobSearchRanking.ts` — pure helpers (dedupe, rank, pick bridge roles) used by the route and tested directly.
- `components/career-switch-planner/JobsYouCanWinCard.tsx` — accessible presentational card.
- `app/api/tools/career-switch-planner/outcome/route.ts` — append outcome event (auth).
- `app/api/tools/career-switch-planner/tailor/route.ts` — Pro-gated tailored docs.
- `migrations/008_planner_job_outcomes.sql` — `planner_job_outcomes` table + RLS.

**Modify**
- `lib/planner/jobRecommendations.ts` — export the `ScoredJob` / `JobFit` types used across layers.
- `components/career-switch-planner/PlannerDashboardV3.tsx` — render the new card above `OutreachSection`; thread new props.
- `app/tools/career-switch-planner/CareerSwitchPlannerClient.tsx` — fetch jobs after a plan exists; hold state; pass data + handlers down; implement log / tailored-doc handlers.

---

## Phase 1 — Pure fit scoring (`jobFit.ts`)

First shippable foundation; no UI/API/DB dependencies. Type-only imports erase under transpile; the one runtime import (`normalizeBulletKey`) comes from the self-contained `lib/transition/dedupe.ts`.

### Task 1: Define `JobFit` / `ScoredJob` types

**Files:**
- Modify: `lib/planner/jobRecommendations.ts` (append types at end of file)

- [ ] **Step 1: Add the shared types**

Append to `lib/planner/jobRecommendations.ts`:

```ts
export type JobFitTier = 'strong' | 'stretch' | 'reach'

export type JobFitFactor = {
  label: string
  frequency: number
}

export type JobFit = {
  tier: JobFitTier
  metCount: number
  totalCount: number
  matched: JobFitFactor[]
  missing: JobFitFactor[]
}

export type ScoredJob = PlannerJobRecommendationInput & {
  salaryMin?: number | null
  salaryMax?: number | null
  postedAt?: string | null
  matchedRole: string
  fit: JobFit
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS (no errors).

- [ ] **Step 3: Commit**

```bash
git add lib/planner/jobRecommendations.ts
git commit -m "feat(planner): add JobFit and ScoredJob types"
```

### Task 2: Implement `scoreRequirementFit` (TDD)

**Files:**
- Create: `lib/planner/jobFit.ts`
- Test: `tests/planner-job-fit.test.mjs`

- [ ] **Step 1: Write the failing test**

Create `tests/planner-job-fit.test.mjs`:

```js
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function loadTranspiledTsModule(filePath, requireMap = {}) {
  const source = readFileSync(filePath, 'utf8')
  const transpiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: filePath
  }).outputText
  const cjsModule = { exports: {} }
  const context = vm.createContext({
    module: cjsModule,
    exports: cjsModule.exports,
    require: (specifier) => {
      if (Object.prototype.hasOwnProperty.call(requireMap, specifier)) return requireMap[specifier]
      throw new Error(`Unexpected require in unit test: ${specifier}`)
    }
  })
  vm.runInContext(transpiled, context)
  return cjsModule.exports
}

const dedupeModule = loadTranspiledTsModule(path.resolve(__dirname, '../lib/transition/dedupe.ts'))
const jobFit = loadTranspiledTsModule(path.resolve(__dirname, '../lib/planner/jobFit.ts'), {
  '@/lib/transition/dedupe': dedupeModule
})

function req(type, label, frequency) {
  return { type, label, normalizedKey: '', normalized_key: '', frequency, frequency_count: frequency, frequency_percent: null, evidence: [], evidence_quotes: [] }
}

test('scoreRequirementFit: strong when most requirements met and no missing cert', () => {
  const requirements = [
    req('gate', 'Obtain WHMIS certification before applying', 4),
    req('hard_skill', 'Operate forklift in warehouse workflows', 3),
    req('soft_signal', 'Collaborate across teams to deliver milestones', 2)
  ]
  const signals = { skills: ['Forklift', 'Teamwork'], certifications: ['WHMIS'], experienceSignals: [], rawLines: [] }
  const fit = jobFit.scoreRequirementFit(requirements, signals)
  assert.equal(fit.tier, 'strong')
  assert.equal(fit.totalCount, 3)
  assert.ok(fit.metCount >= 2)
  assert.ok(fit.matched.some((m) => /whmis/i.test(m.label)))
})

test('scoreRequirementFit: reach when nothing matches', () => {
  const requirements = [req('gate', 'Obtain Red Seal certification before applying', 5)]
  const signals = { skills: ['Customer Service'], certifications: [], experienceSignals: [], rawLines: [] }
  const fit = jobFit.scoreRequirementFit(requirements, signals)
  assert.equal(fit.tier, 'reach')
  assert.equal(fit.metCount, 0)
  assert.equal(fit.missing[0].label, 'Obtain Red Seal certification before applying')
})

test('scoreRequirementFit: empty requirements is unscored reach, never throws', () => {
  const fit = jobFit.scoreRequirementFit([], { skills: [], certifications: [], experienceSignals: [], rawLines: [] })
  assert.equal(fit.tier, 'reach')
  assert.equal(fit.totalCount, 0)
  assert.deepEqual(fit.missing, [])
})

test('scoreRequirementFit: missing required cert caps tier below strong', () => {
  const requirements = [
    req('hard_skill', 'Operate forklift in warehouse workflows', 5),
    req('hard_skill', 'Maintain inventory accuracy in role workflows', 5),
    req('gate', 'Obtain WHMIS certification before applying', 5)
  ]
  const signals = { skills: ['Forklift', 'Inventory'], certifications: [], experienceSignals: [], rawLines: [] }
  const fit = jobFit.scoreRequirementFit(requirements, signals)
  assert.notEqual(fit.tier, 'strong')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/planner-job-fit.test.mjs`
Expected: FAIL with "Unexpected require" or "scoreRequirementFit is not a function" (file does not exist yet).

- [ ] **Step 3: Implement the matcher**

Create `lib/planner/jobFit.ts`:

```ts
import { normalizeBulletKey } from '@/lib/transition/dedupe'
import type { AggregatedRequirement } from '@/lib/requirements/types'
import type { NormalizedProfileSignals } from '@/lib/planner/profileSignals'
import type { JobFit, JobFitFactor, JobFitTier } from '@/lib/planner/jobRecommendations'

const STRONG_THRESHOLD = 0.7
const STRETCH_THRESHOLD = 0.4
const MAX_MISSING = 3

function userTokens(signals: NormalizedProfileSignals): Set<string> {
  const tokens = new Set<string>()
  const collect = (value: string) => {
    for (const token of normalizeBulletKey(value).split(' ')) {
      if (token.length >= 3) tokens.add(token)
    }
  }
  signals.skills.forEach(collect)
  signals.certifications.forEach(collect)
  signals.experienceSignals.forEach(collect)
  return tokens
}

function requirementIsMet(requirement: AggregatedRequirement, tokens: Set<string>): boolean {
  const reqTokens = normalizeBulletKey(requirement.label)
    .split(' ')
    .filter((token) => token.length >= 3)
  if (reqTokens.length === 0) return false
  // A requirement counts as met when the user covers a meaningful share of its
  // distinctive tokens (>= 50%), so "Operate forklift…" is met by "Forklift".
  let overlap = 0
  for (const token of reqTokens) {
    if (tokens.has(token)) overlap += 1
  }
  return overlap / reqTokens.length >= 0.5
}

export function scoreRequirementFit(
  requirements: AggregatedRequirement[],
  signals: NormalizedProfileSignals
): JobFit {
  const tokens = userTokens(signals)
  const matched: JobFitFactor[] = []
  const missing: JobFitFactor[] = []
  let weightedMet = 0
  let weightedTotal = 0
  let hasMissingGate = false

  for (const requirement of requirements) {
    const weight = Math.max(1, requirement.frequency_count || requirement.frequency || 1)
    weightedTotal += weight
    if (requirementIsMet(requirement, tokens)) {
      weightedMet += weight
      matched.push({ label: requirement.label, frequency: weight })
    } else {
      if (requirement.type === 'gate') hasMissingGate = true
      missing.push({ label: requirement.label, frequency: weight })
    }
  }

  matched.sort((a, b) => b.frequency - a.frequency)
  missing.sort((a, b) => b.frequency - a.frequency)

  const ratio = weightedTotal === 0 ? 0 : weightedMet / weightedTotal
  let tier: JobFitTier = 'reach'
  if (ratio >= STRONG_THRESHOLD && !hasMissingGate) tier = 'strong'
  else if (ratio >= STRETCH_THRESHOLD) tier = 'stretch'

  return {
    tier,
    metCount: matched.length,
    totalCount: requirements.length,
    matched: matched.slice(0, MAX_MISSING),
    missing: missing.slice(0, MAX_MISSING)
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/planner-job-fit.test.mjs`
Expected: PASS (4 tests).

- [ ] **Step 5: Typecheck and commit**

Run: `npx tsc --noEmit`
Expected: PASS.

```bash
git add lib/planner/jobFit.ts tests/planner-job-fit.test.mjs
git commit -m "feat(planner): add pure job-fit scoring with tests"
```

---

## Phase 2 — Search + ranking (`/api/jobs/search`)

### Task 3: Pure ranking helpers (TDD)

**Files:**
- Create: `lib/planner/jobSearchRanking.ts`
- Test: `tests/jobs-search-ranking.test.mjs`

- [ ] **Step 1: Write the failing test**

Create `tests/jobs-search-ranking.test.mjs` (reuse the `loadTranspiledTsModule` helper exactly as in Task 2, with `requireMap = {}` — this module has no runtime imports):

```js
// ... same loadTranspiledTsModule helper as tests/planner-job-fit.test.mjs ...
const ranking = loadTranspiledTsModule(path.resolve(__dirname, '../lib/planner/jobSearchRanking.ts'))

function job(id, tier, met, postedAt, matchedRole) {
  return {
    id, title: 't', company: 'c', location: 'l', description: 'd', sourceUrl: 'u',
    matchedRole, postedAt,
    fit: { tier, metCount: met, totalCount: 5, matched: [], missing: [] }
  }
}

test('rankScoredJobs: strong before stretch before reach', () => {
  const ranked = ranking.rankScoredJobs([
    job('a', 'reach', 1, '2026-06-01', 'target'),
    job('b', 'strong', 4, '2026-06-01', 'target'),
    job('c', 'stretch', 3, '2026-06-01', 'target')
  ], 'target')
  assert.deepEqual(ranked.map((j) => j.id), ['b', 'c', 'a'])
})

test('rankScoredJobs: dedupes by id', () => {
  const ranked = ranking.rankScoredJobs([
    job('a', 'strong', 4, '2026-06-01', 'target'),
    job('a', 'strong', 4, '2026-06-01', 'target')
  ], 'target')
  assert.equal(ranked.length, 1)
})

test('rankScoredJobs: guarantees a bridge-role result in the top 6', () => {
  const targets = Array.from({ length: 6 }, (_, i) => job(`t${i}`, 'strong', 5, '2026-06-01', 'target'))
  const bridge = job('bridge', 'reach', 0, '2026-06-01', 'Warehouse Associate')
  const ranked = ranking.rankScoredJobs([...targets, bridge], 'target').slice(0, 6)
  assert.ok(ranked.some((j) => j.matchedRole === 'Warehouse Associate'))
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/jobs-search-ranking.test.mjs`
Expected: FAIL (module not found / `rankScoredJobs` undefined).

- [ ] **Step 3: Implement the ranking helper**

Create `lib/planner/jobSearchRanking.ts`:

```ts
import type { ScoredJob, JobFitTier } from '@/lib/planner/jobRecommendations'

const TIER_RANK: Record<JobFitTier, number> = { strong: 3, stretch: 2, reach: 1 }
const MAX_RESULTS = 6

function compareJobs(left: ScoredJob, right: ScoredJob): number {
  const tierDelta = TIER_RANK[right.fit.tier] - TIER_RANK[left.fit.tier]
  if (tierDelta !== 0) return tierDelta
  if (right.fit.metCount !== left.fit.metCount) return right.fit.metCount - left.fit.metCount
  return (right.postedAt ?? '').localeCompare(left.postedAt ?? '')
}

export function rankScoredJobs(jobs: ScoredJob[], targetRole: string): ScoredJob[] {
  const deduped = jobs.filter(
    (job, index, all) => all.findIndex((candidate) => candidate.id === job.id) === index
  )
  const ranked = [...deduped].sort(compareJobs)
  const top = ranked.slice(0, MAX_RESULTS)

  // Guarantee at least one bridge-role result (a "fastest way in") when present.
  const normalizedTarget = targetRole.trim().toLowerCase()
  const hasBridge = top.some((job) => job.matchedRole.trim().toLowerCase() !== normalizedTarget)
  if (!hasBridge) {
    const bridge = ranked.find((job) => job.matchedRole.trim().toLowerCase() !== normalizedTarget)
    if (bridge && top.length === MAX_RESULTS) {
      top[MAX_RESULTS - 1] = bridge
    } else if (bridge) {
      top.push(bridge)
    }
  }
  return top
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/jobs-search-ranking.test.mjs`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/planner/jobSearchRanking.ts tests/jobs-search-ranking.test.mjs
git commit -m "feat(planner): add winnable-first job ranking with bridge guarantee"
```

### Task 4: `/api/jobs/search` route

**Files:**
- Create: `app/api/jobs/search/route.ts`

- [ ] **Step 1: Implement the route**

Create `app/api/jobs/search/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { fetchJobsPaged, isAdzunaConfigured } from '@/lib/server/adzuna'
import { aggregateRequirements, extractRequirementsFromText } from '@/lib/requirements/extractor'
import { scoreRequirementFit } from '@/lib/planner/jobFit'
import { rankScoredJobs } from '@/lib/planner/jobSearchRanking'
import { consumeRateLimit, getClientIp, toRateLimitHeaders } from '@/lib/server/rateLimit'
import type { ScoredJob } from '@/lib/planner/jobRecommendations'
import type { NormalizedProfileSignals } from '@/lib/planner/profileSignals'

export const dynamic = 'force-dynamic'

type SearchBody = {
  roles?: unknown
  location?: unknown
  country?: unknown
  profileSignals?: Partial<NormalizedProfileSignals>
}

function asString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function asRoles(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  const roles: string[] = []
  for (const entry of value) {
    const role = asString(entry)
    const key = role.toLowerCase()
    if (role.length >= 2 && !seen.has(key)) {
      seen.add(key)
      roles.push(role)
    }
  }
  return roles.slice(0, 3) // target + up to 2 bridge roles
}

function normalizeSignals(input: Partial<NormalizedProfileSignals> | undefined): NormalizedProfileSignals {
  return {
    skills: Array.isArray(input?.skills) ? input!.skills.filter((s) => typeof s === 'string') : [],
    certifications: Array.isArray(input?.certifications) ? input!.certifications.filter((s) => typeof s === 'string') : [],
    experienceSignals: Array.isArray(input?.experienceSignals) ? input!.experienceSignals.filter((s) => typeof s === 'string') : [],
    rawLines: []
  }
}

export async function POST(request: Request) {
  const rateLimit = consumeRateLimit({
    namespace: 'jobs-search',
    identifier: getClientIp(request),
    max: 24,
    windowMs: 60_000
  })
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'RATE_LIMITED', configured: isAdzunaConfigured(), jobs: [] },
      { status: 429, headers: toRateLimitHeaders(rateLimit) }
    )
  }

  if (!isAdzunaConfigured()) {
    return NextResponse.json({ configured: false, jobs: [] }, { headers: toRateLimitHeaders(rateLimit) })
  }

  const body = (await request.json().catch(() => null)) as SearchBody | null
  const roles = asRoles(body?.roles)
  const location = asString(body?.location)
  const country = asString(body?.country) || undefined
  const signals = normalizeSignals(body?.profileSignals)

  if (roles.length === 0 || !location) {
    return NextResponse.json(
      { error: 'INVALID_INPUT', configured: true, jobs: [] },
      { status: 400, headers: toRateLimitHeaders(rateLimit) }
    )
  }

  try {
    const scored: ScoredJob[] = []
    for (const role of roles) {
      const postings = await fetchJobsPaged({ role, location, country, maxPages: 1 })
      for (const posting of postings) {
        if (!posting.title || !posting.sourceUrl) continue
        const requirements = posting.description
          ? aggregateRequirements(
              extractRequirementsFromText({ source: 'adzuna', text: posting.description })
            )
          : []
        scored.push({
          id: posting.providerJobId,
          title: posting.title,
          company: posting.company ?? 'Unknown company',
          location: posting.location ?? location,
          description: posting.description ?? '',
          sourceUrl: posting.sourceUrl,
          salaryMin: posting.salaryMin,
          salaryMax: posting.salaryMax,
          postedAt: posting.postedAt,
          matchedRole: role,
          fit: scoreRequirementFit(requirements, signals)
        })
      }
    }

    const jobs = rankScoredJobs(scored, roles[0])
    return NextResponse.json({ configured: true, jobs }, { headers: toRateLimitHeaders(rateLimit) })
  } catch (error) {
    console.error('jobs/search failed:', error)
    return NextResponse.json(
      { error: 'SEARCH_FAILED', configured: true, jobs: [] },
      { status: 502, headers: toRateLimitHeaders(rateLimit) }
    )
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Manual smoke (optional, requires ADZUNA_* env)**

Run: `npm run dev` then in a second shell:
`curl -s -X POST http://localhost:3000/api/jobs/search -H 'content-type: application/json' -d '{"roles":["warehouse associate"],"location":"Toronto","profileSignals":{"skills":["Forklift"],"certifications":["WHMIS"]}}' | head -c 400`
Expected: JSON `{"configured":true,"jobs":[...]}` (or `{"configured":false,"jobs":[]}` if env unset — both acceptable).

- [ ] **Step 4: Commit**

```bash
git add app/api/jobs/search/route.ts
git commit -m "feat(api): add /api/jobs/search fit-ranked job search"
```

---

## Phase 3 — Accessible card + wiring (first shippable demo)

### Task 5: `JobsYouCanWinCard` component

**Files:**
- Create: `components/career-switch-planner/JobsYouCanWinCard.tsx`

- [ ] **Step 1: Implement the card**

Create `components/career-switch-planner/JobsYouCanWinCard.tsx`:

```tsx
'use client'

import Button from '@/components/Button'
import Card from '@/components/Card'
import Badge from '@/components/Badge'
import PaywallBanner from '@/components/PaywallBanner'
import type { ScoredJob, JobFitTier } from '@/lib/planner/jobRecommendations'

type JobsView =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'success'; jobs: ScoredJob[] }

const TIER_META: Record<JobFitTier, { label: string; icon: string; badge: 'success' | 'info' | 'warning' }> = {
  strong: { label: 'Strong match', icon: '●●●', badge: 'success' },
  stretch: { label: 'Stretch', icon: '●●○', badge: 'info' },
  reach: { label: 'Reach', icon: '●○○', badge: 'warning' }
}

function postedDaysAgo(postedAt?: string | null): string | null {
  if (!postedAt) return null
  const ts = Date.parse(postedAt)
  if (!Number.isFinite(ts)) return null
  const days = Math.max(0, Math.round((Date.now() - ts) / 86_400_000))
  return days === 0 ? 'Posted today' : `Posted ${days}d ago`
}

function salaryLabel(min?: number | null, max?: number | null): string | null {
  if (!min && !max) return null
  const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`
  if (min && max) return `${fmt(min)}–${fmt(max)}`
  return fmt((min || max) as number)
}

export function JobsYouCanWinCard({
  view,
  targetRole,
  location,
  isProUser,
  loggedJobIds,
  onApply,
  onLogApplication,
  onCoverLetter,
  onTailorResume,
  onRetry
}: {
  view: JobsView
  targetRole: string
  location: string
  isProUser: boolean
  loggedJobIds: Record<string, boolean>
  onApply: (job: ScoredJob) => void
  onLogApplication: (job: ScoredJob) => void
  onCoverLetter: (job: ScoredJob) => void
  onTailorResume: (job: ScoredJob) => void
  onRetry: () => void
}) {
  // Hide the card entirely when there is nothing useful to show (spec: no empty boxes).
  if (view.status === 'success' && view.jobs.length === 0) return null

  return (
    <Card className="!rounded-2xl !border-border-light bg-surface p-5 shadow-card md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-light pb-3">
        <h2 className="text-[18px] font-bold leading-[1.25] text-text-primary md:text-[20px]">
          Jobs you can win
        </h2>
        <Badge variant="info">Live</Badge>
      </div>
      <p className="mt-2 text-[13px] leading-[1.55] text-text-secondary">
        Real openings for {targetRole || 'your target role'} near {location || 'you'}, ranked by how well you match.
      </p>

      {view.status === 'loading' ? (
        <div className="mt-4 space-y-3" role="status" aria-live="polite">
          <span className="sr-only">Loading job matches</span>
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl border border-border-light bg-bg-secondary" />
          ))}
        </div>
      ) : null}

      {view.status === 'error' ? (
        <div className="mt-4 rounded-xl border border-border-light bg-bg-secondary p-4" role="alert">
          <p className="text-[13px] font-semibold text-text-secondary">
            We couldn’t load live jobs just now.
          </p>
          <Button size="sm" variant="outline" className="mt-3" onClick={onRetry}>
            Try again
          </Button>
        </div>
      ) : null}

      {view.status === 'success' ? (
        <ul className="mt-4 space-y-3">
          {view.jobs.map((job) => {
            const tier = TIER_META[job.fit.tier]
            const posted = postedDaysAgo(job.postedAt)
            const salary = salaryLabel(job.salaryMin, job.salaryMax)
            const logged = Boolean(loggedJobIds[job.id])
            return (
              <li key={job.id} className="rounded-xl border border-border-light bg-bg-secondary p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[14px] font-bold text-text-primary">
                      {job.title} <span className="font-semibold text-text-secondary">· {job.company}</span>
                    </p>
                    <p className="mt-0.5 text-[12px] font-semibold text-text-tertiary">{job.location}</p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-pill border px-2.5 py-1 text-[11px] font-bold ${
                      tier.badge === 'success'
                        ? 'border-success/25 bg-success/10 text-success'
                        : tier.badge === 'info'
                          ? 'border-accent/25 bg-accent-light text-accent'
                          : 'border-warning/25 bg-warning-light text-warning'
                    }`}
                  >
                    <span aria-hidden="true">{tier.icon}</span>
                    {tier.label}
                  </span>
                </div>

                <p className="mt-2 text-[12px] font-semibold text-text-secondary">
                  {job.fit.totalCount > 0
                    ? `You meet ${job.fit.metCount} of ${job.fit.totalCount} requirements.`
                    : 'Match detail unavailable for this posting.'}
                </p>

                {job.fit.matched.length > 0 ? (
                  <p className="mt-1 text-[11px] font-semibold text-text-tertiary">
                    Matched: {job.fit.matched.map((m) => m.label).join(', ')}
                  </p>
                ) : null}
                {job.fit.missing.length > 0 ? (
                  <p className="mt-1 text-[11px] font-semibold text-text-tertiary">
                    Still need: {job.fit.missing.map((m) => m.label).join(', ')}
                  </p>
                ) : null}

                {salary || posted ? (
                  <p className="mt-1 text-[11px] font-semibold text-text-tertiary">
                    {[salary, posted].filter(Boolean).join(' · ')}
                  </p>
                ) : null}

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => onApply(job)}>
                    Apply
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onLogApplication(job)}
                    aria-pressed={logged}
                  >
                    {logged ? 'Logged ✓' : 'Log application'}
                  </Button>
                  {isProUser ? (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => onCoverLetter(job)}>
                        Cover letter
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => onTailorResume(job)}>
                        Tailor resume
                      </Button>
                    </>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ul>
      ) : null}

      {view.status === 'success' && !isProUser ? (
        <div className="mt-4">
          <PaywallBanner
            title="Tailor your application for each job"
            description="Pro and Lifetime members get a tailored cover letter and resume guidance per posting."
          />
        </div>
      ) : null}

      <p className="mt-4 text-[10px] font-semibold uppercase tracking-[1px] text-text-tertiary">
        Jobs by Adzuna
      </p>
    </Card>
  )
}

export default JobsYouCanWinCard
```

- [ ] **Step 2: Verify `PaywallBanner` prop names**

Run: `grep -n "interface\|title\|description\|Props" components/PaywallBanner.tsx`
Expected: confirms `PaywallBanner` accepts `title` and `description` (string) props. If the real prop names differ, update the `<PaywallBanner .../>` usage above to match before continuing.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add components/career-switch-planner/JobsYouCanWinCard.tsx
git commit -m "feat(planner): add accessible JobsYouCanWinCard"
```

### Task 6: Thread the card into `PlannerDashboardV3`

**Files:**
- Modify: `components/career-switch-planner/PlannerDashboardV3.tsx`

- [ ] **Step 1: Import the card**

In the import block near the top of `PlannerDashboardV3.tsx`, add:

```tsx
import JobsYouCanWinCard from '@/components/career-switch-planner/JobsYouCanWinCard'
import type { ScoredJob } from '@/lib/planner/jobRecommendations'
```

- [ ] **Step 2: Extend `PlannerDashboardV3Props`**

Inside `interface PlannerDashboardV3Props { ... }` (ends at line ~78), add:

```tsx
  jobsView:
    | { status: 'loading' }
    | { status: 'error' }
    | { status: 'success'; jobs: ScoredJob[] };
  isProUser: boolean;
  loggedJobIds: Record<string, boolean>;
  onApplyToJob: (job: ScoredJob) => void;
  onLogJobApplication: (job: ScoredJob) => void;
  onJobCoverLetter: (job: ScoredJob) => void;
  onJobTailorResume: (job: ScoredJob) => void;
  onRetryJobs: () => void;
```

- [ ] **Step 3: Destructure the new props**

In the `export function PlannerDashboardV3({ ... }: PlannerDashboardV3Props)` parameter list (ends ~line 205), add the new names: `jobsView, isProUser, loggedJobIds, onApplyToJob, onLogJobApplication, onJobCoverLetter, onJobTailorResume, onRetryJobs`.

- [ ] **Step 4: Render the card above `OutreachSection`**

Immediately before the `<OutreachSection` element (line ~995), insert:

```tsx
              <JobsYouCanWinCard
                view={jobsView}
                targetRole={model.decision.targetRole}
                location={model.summaryBar.location}
                isProUser={isProUser}
                loggedJobIds={loggedJobIds}
                onApply={onApplyToJob}
                onLogApplication={onLogJobApplication}
                onCoverLetter={onJobCoverLetter}
                onTailorResume={onJobTailorResume}
                onRetry={onRetryJobs}
              />

```

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: FAIL — `CareerSwitchPlannerClient` does not yet pass the new required props. This is expected; Task 7 supplies them.

- [ ] **Step 6: Commit**

```bash
git add components/career-switch-planner/PlannerDashboardV3.tsx
git commit -m "feat(planner): render JobsYouCanWinCard in V3 dashboard"
```

### Task 7: Fetch + wire in `CareerSwitchPlannerClient`

**Files:**
- Modify: `app/tools/career-switch-planner/CareerSwitchPlannerClient.tsx`

- [ ] **Step 1: Add state + fetch effect**

Near the other `useState` hooks (around line 1186), add:

```tsx
  const [jobsView, setJobsView] = useState<
    | { status: 'loading' }
    | { status: 'error' }
    | { status: 'success'; jobs: import('@/lib/planner/jobRecommendations').ScoredJob[] }
  >({ status: 'success', jobs: [] })
  const [loggedJobIds, setLoggedJobIds] = useState<Record<string, boolean>>({})
  const [jobsReloadKey, setJobsReloadKey] = useState(0)
```

- [ ] **Step 2: Derive the search inputs and fetch**

After the dashboard model is computed (where `model` / report exist and `locationText`, target role, and profile signals are in scope), add an effect. Use the planner's already-computed dashboard model for roles and the existing `extractProfileSignals` import (line 18) for signals:

```tsx
  useEffect(() => {
    const report = /* the generated report/model used to render PlannerDashboardV3 */ null
    if (!report) {
      setJobsView({ status: 'success', jobs: [] })
      return
    }
    const targetRole = heroTargetRoleLabel?.trim()
    const location = locationText?.trim()
    if (!targetRole || !location) {
      setJobsView({ status: 'success', jobs: [] })
      return
    }
    const bridgeRoles = [
      report?.adjacentEntryOptions?.fastestEntry?.title,
      report?.adjacentEntryOptions?.closestMatch?.title
    ].filter((value): value is string => Boolean(value && value.trim()))
    const roles = Array.from(new Set([targetRole, ...bridgeRoles]))
    const signals = extractProfileSignals({
      experienceText: '', // pass the intake experience text used elsewhere in this component
      explicitSkills: undefined,
      explicitCertifications: undefined
    })

    let cancelled = false
    setJobsView({ status: 'loading' })
    fetch('/api/jobs/search', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ roles, location, profileSignals: signals })
    })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return
        setJobsView({ status: 'success', jobs: Array.isArray(data?.jobs) ? data.jobs : [] })
      })
      .catch(() => {
        if (!cancelled) setJobsView({ status: 'error' })
      })
    return () => {
      cancelled = true
    }
  }, [heroTargetRoleLabel, locationText, jobsReloadKey])
```

> **Implementation note for the worker:** wire the two `/* ... */` placeholders to the real local variables in this component — the generated report/model object that drives `PlannerDashboardV3` (search for where `model` or the V3 model is built/passed), the target-role label (`heroTargetRoleLabel` already exists, line ~1710), and the intake experience text used for profile signals (search for `extractProfileSignals` usage already in this file, line 18, and reuse the same source string). Do not invent new state — reuse what already feeds the dashboard.

- [ ] **Step 3: Add the handlers**

```tsx
  const handleApplyToJob = (job: import('@/lib/planner/jobRecommendations').ScoredJob) => {
    if (job.sourceUrl) window.open(job.sourceUrl, '_blank', 'noopener,noreferrer')
  }

  const handleLogJobApplication = async (job: import('@/lib/planner/jobRecommendations').ScoredJob) => {
    setLoggedJobIds((prev) => ({ ...prev, [job.id]: true }))
    const current = Number.parseInt(outreachTracker.sent || '0', 10)
    onOutreachTrackerChange('sent', String((Number.isFinite(current) ? current : 0) + 1))
    try {
      await fetch('/api/tools/career-switch-planner/outcome', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          jobId: job.id,
          jobTitle: job.title,
          company: job.company,
          stage: 'applied'
        })
      })
    } catch {
      // Outcome logging is best-effort; never block the UI (spec resilience).
    }
  }

  const handleJobCoverLetter = (job: import('@/lib/planner/jobRecommendations').ScoredJob) => {
    void requestTailoredDoc('cover-letter', job)
  }
  const handleJobTailorResume = (job: import('@/lib/planner/jobRecommendations').ScoredJob) => {
    void requestTailoredDoc('resume-guidance', job)
  }

  async function requestTailoredDoc(
    kind: 'cover-letter' | 'resume-guidance',
    job: import('@/lib/planner/jobRecommendations').ScoredJob
  ) {
    const res = await fetch('/api/tools/career-switch-planner/tailor', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        kind,
        role: heroTargetRoleLabel,
        company: job.company,
        jobPosting: job.description,
        resumeText: '' // reuse the resume/experience text already captured in this component
      })
    })
    const data = await res.json().catch(() => null)
    if (res.status === 402) return // free user — card already shows PaywallBanner
    if (kind === 'cover-letter' && data?.result) onEmailToolkitDraftChange(String(data.result))
    if (kind === 'resume-guidance' && data?.result) onResumeToolkitDraftChange(String(data.result))
  }
```

> **Implementation note:** route the cover-letter result into the Outreach Toolkit email draft (`onEmailToolkitDraftChange`) and resume guidance into the resume draft (`onResumeToolkitDraftChange`) — both already exist as props/handlers on this component. Reuse the same resume/experience string used for profile signals in Step 2 for `resumeText`.

- [ ] **Step 4: Pass new props to `PlannerDashboardV3`**

At the `<PlannerDashboardV3 ... />` render site, add:

```tsx
        jobsView={jobsView}
        isProUser={isProUser}
        loggedJobIds={loggedJobIds}
        onApplyToJob={handleApplyToJob}
        onLogJobApplication={handleLogJobApplication}
        onJobCoverLetter={handleJobCoverLetter}
        onJobTailorResume={handleJobTailorResume}
        onRetryJobs={() => setJobsReloadKey((k) => k + 1)}
```

- [ ] **Step 5: Typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: PASS.

- [ ] **Step 6: Manual verify**

Run: `npm run dev`, generate a plan for a realistic transition (e.g. "Cashier" → "Warehouse Associate", Toronto), and confirm: the "Jobs you can win" card appears above the Outreach Toolkit with fit badges; with `ADZUNA_*` unset the card is absent (not an empty box); "Log application" flips to "Logged ✓" and bumps the Outreach "Sent" counter.

- [ ] **Step 7: Commit**

```bash
git add app/tools/career-switch-planner/CareerSwitchPlannerClient.tsx
git commit -m "feat(planner): fetch and wire fit-ranked jobs into the dashboard"
```

---

## Phase 4 — Outcome capture

### Task 8: `planner_job_outcomes` migration

**Files:**
- Create: `migrations/008_planner_job_outcomes.sql`

- [ ] **Step 1: Write the migration**

Create `migrations/008_planner_job_outcomes.sql`:

```sql
create table if not exists public.planner_job_outcomes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid null,
  plan_id text null,
  job_id text not null,
  job_title text not null,
  company text not null,
  stage text not null check (stage in ('applied','interviewing','offer','rejected')),
  source text not null default 'careerheap-planner',
  created_at timestamptz not null default now()
);

alter table public.planner_job_outcomes enable row level security;

create policy "planner_job_outcomes_owner_select"
  on public.planner_job_outcomes for select
  using (auth.uid() = user_id);

create policy "planner_job_outcomes_owner_insert"
  on public.planner_job_outcomes for insert
  with check (auth.uid() = user_id);

create index if not exists planner_job_outcomes_user_idx
  on public.planner_job_outcomes (user_id, created_at desc);
create index if not exists planner_job_outcomes_org_idx
  on public.planner_job_outcomes (org_id, created_at desc);
```

- [ ] **Step 2: Apply the migration**

Apply via the project's migration path (Supabase SQL editor or `supabase db push`, matching how `migrations/007_*.sql` was applied). Verify the table exists:
Run (or via Supabase MCP `list_tables`): confirm `planner_job_outcomes` is present.

- [ ] **Step 3: Commit**

```bash
git add migrations/008_planner_job_outcomes.sql
git commit -m "feat(db): add planner_job_outcomes table with RLS"
```

### Task 9: `/api/tools/career-switch-planner/outcome` route

**Files:**
- Create: `app/api/tools/career-switch-planner/outcome/route.ts`

- [ ] **Step 1: Implement the route**

Create `app/api/tools/career-switch-planner/outcome/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { getAuthenticatedUserFromRequest } from '@/lib/server/toolUsage'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

const STAGES = new Set(['applied', 'interviewing', 'offer', 'rejected'])

function asString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ error: 'AUTH_REQUIRED' }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  const jobId = asString(body?.jobId)
  const jobTitle = asString(body?.jobTitle)
  const company = asString(body?.company)
  const stage = asString(body?.stage) || 'applied'
  const planId = asString(body?.planId) || null

  if (!jobId || !jobTitle || !STAGES.has(stage)) {
    return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 })
  }

  try {
    const admin = createAdminClient()
    const { error } = await admin.from('planner_job_outcomes').insert({
      user_id: user.id,
      plan_id: planId,
      job_id: jobId,
      job_title: jobTitle,
      company: company || 'Unknown company',
      stage,
      source: 'careerheap-planner'
    })
    if (error) {
      // Degrade gracefully when the table/env is missing (spec resilience).
      console.warn('planner outcome insert failed:', error.message)
      return NextResponse.json({ ok: false, persisted: false })
    }
    return NextResponse.json({ ok: true, persisted: true })
  } catch (error) {
    console.warn('planner outcome route error:', error)
    return NextResponse.json({ ok: false, persisted: false })
  }
}
```

- [ ] **Step 2: Verify `getAuthenticatedUserFromRequest` returns an object with `id`**

Run: `grep -n "getAuthenticatedUserFromRequest\|user.id\|\.id" lib/server/toolUsage.ts | head`
Expected: confirms the returned user exposes `id`. If it differs (e.g. nested), adjust `user.id` accordingly.

- [ ] **Step 3: Typecheck and commit**

Run: `npx tsc --noEmit`
Expected: PASS.

```bash
git add app/api/tools/career-switch-planner/outcome/route.ts
git commit -m "feat(api): add planner job outcome logging route"
```

---

## Phase 5 — Pro-gated tailored docs

### Task 10: `/api/tools/career-switch-planner/tailor` route

**Files:**
- Create: `app/api/tools/career-switch-planner/tailor/route.ts`

- [ ] **Step 1: Confirm the plan helpers available**

Run: `grep -n "export" lib/server/toolUsage.ts | grep -i "plan\|usage\|authenticated"`
Expected: identify the helper that resolves a user's plan/usage summary (e.g. `getUsageSummaryForUser`) and the `plan`/`isUnlimited` fields it returns (seen used in `app/api/tools/generate/route.ts`).

- [ ] **Step 2: Implement the route**

Create `app/api/tools/career-switch-planner/tailor/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { getAuthenticatedUserFromRequest, getUsageSummaryForUser } from '@/lib/server/toolUsage'
import { generateCoverLetter, generateResumeAnalysis } from '@/lib/server/toolGeneration'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

function asString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ error: 'AUTH_REQUIRED' }, { status: 401 })
  }

  const summary = await getUsageSummaryForUser(user)
  const isPaid = summary.isUnlimited || summary.plan === 'pro' || summary.plan === 'lifetime'
  if (!isPaid) {
    return NextResponse.json(
      { error: 'LOCKED', message: 'Tailored documents are a Pro feature.' },
      { status: 402 }
    )
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  const kind = asString(body?.kind)
  const role = asString(body?.role)
  const company = asString(body?.company)
  const jobPosting = asString(body?.jobPosting)
  const resumeText = asString(body?.resumeText)

  try {
    if (kind === 'cover-letter') {
      if (jobPosting.length < 30) {
        return NextResponse.json({ error: 'Paste the job posting so we can tailor the letter.' }, { status: 400 })
      }
      const outcome = await generateCoverLetter({ role, company, jobPosting, background: resumeText, locale: 'en' })
      if ('error' in outcome) return NextResponse.json({ error: outcome.error }, { status: 400 })
      return NextResponse.json({ result: outcome.result, source: outcome.source })
    }
    if (kind === 'resume-guidance') {
      if (resumeText.length < 30) {
        return NextResponse.json({ error: 'Add your resume text to get tailoring guidance.' }, { status: 400 })
      }
      const outcome = await generateResumeAnalysis({ resumeText, targetRole: role, locale: 'en' })
      if ('error' in outcome) return NextResponse.json({ error: outcome.error }, { status: 400 })
      return NextResponse.json({ result: outcome.result, source: outcome.source })
    }
    return NextResponse.json({ error: 'Unknown tailoring kind.' }, { status: 400 })
  } catch (error) {
    console.error('planner tailor route error:', error)
    return NextResponse.json({ error: 'Generation failed. Please try again.' }, { status: 500 })
  }
}
```

- [ ] **Step 3: Reconcile generation return shape**

Run: `grep -n "export async function generateCoverLetter\|export async function generateResumeAnalysis\|return {" lib/server/toolGeneration.ts | head`
Expected: confirm both return `{ result, source }` on success and `{ error }` on failure (matches usage in `app/api/tools/generate/route.ts`). Adjust the destructuring above if the real shape differs.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Manual verify gating**

Run: `npm run dev`. As a free user (or `?plan=free`), click "Cover letter" — expect no generation and the PaywallBanner remains the upsell. As `?plan=pro`, expect the generated letter to populate the Outreach Toolkit email draft.

- [ ] **Step 6: Commit**

```bash
git add app/api/tools/career-switch-planner/tailor/route.ts
git commit -m "feat(api): add Pro-gated planner tailored-doc route"
```

---

## Final verification

- [ ] **Step 1: Full test suite**

Run: `npm test`
Expected: PASS, including `planner-job-fit` and `jobs-search-ranking`.

- [ ] **Step 2: Typecheck + lint + build**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: PASS.

- [ ] **Step 3: Accessibility check (acceptance gate)**

With `npm run dev` running and a plan generated, run an axe pass on the planner page (Playwright MCP `browser_navigate` + an axe evaluate, or the browser devtools axe extension). Verify: fit tier conveyed by text+icon not color alone; every action keyboard-reachable with a visible focus ring; loading uses `role="status"` and error uses `role="alert"`. Fix any AA violations before claiming done.

- [ ] **Step 4: Commit any accessibility fixes**

```bash
git add -A
git commit -m "fix(planner): resolve accessibility findings on jobs card"
```

---

## Self-Review notes (addressed)

- **Spec coverage:** fit scoring (T2), bridge-role search + winnable ranking (T3–T4), card + free browse (T5–T7), outcome capture (T8–T9), Pro-gated tailored docs (T10), accessibility (T5 + final gate), Adzuna attribution (T5), hide-when-empty (T5). Institutional admin layer is intentionally out of scope per spec.
- **Type consistency:** `JobFit`/`ScoredJob` defined once (T1) and imported everywhere; `scoreRequirementFit`, `rankScoredJobs` names stable across tasks and tests.
- **Known integration seams flagged for the worker:** the two `/* ... */` placeholders in T7 Step 2 and the resume-text reuse must be wired to existing locals in `CareerSwitchPlannerClient` (the file is large; the note says exactly what to search for). Prop-name checks for `PaywallBanner` (T5), user `.id` (T9), plan helpers (T10), and generation return shape (T10) are explicit verification steps rather than assumptions.
```
