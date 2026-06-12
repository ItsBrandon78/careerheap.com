# Career Switch Planner — Premium Fit-Ranked Apply Pipeline (Institution-Ready)

**Date:** 2026-06-12
**Status:** Approved design, pending implementation plan
**Tool:** `career-switch-planner`

## Positioning

This is being built to a bar where a **university career-services department** would pay
for it at institutional scale, with **K-12 district school boards** as a later, adjacent
market. That bar — not a consumer feature — drives every decision below.

**Primary buyer (this build): university career services.** The product is a
job-seeking engine (fit-ranked openings, tailored materials, apply-and-track), which maps
directly to a campus career centre and clears privacy/budget gates faster than K-12
(adults → PIPEDA, no parental-consent/FERPA-minor/COPPA; career centres have recurring
SaaS budgets). The data model stays **tenant-generic** so K-12 is a later configuration,
not a fork.

**This build = the premium student pipeline, engineered institution-ready.** The
institutional admin layer (counselor dashboards, cohorts, board reporting) is the *next*
spec — it is a set of views over the outcome data this build captures, so it must not
require a rewrite. The three institution-ready hooks (accessibility, outcome capture,
white-label) are in scope now precisely because retrofitting them later is expensive.

## Problem

After generating a plan, the dashboard never connects a student to **real jobs they can
win**, nor helps them *apply*. A plain board (list + "Apply") is undifferentiated and
proves nothing to an institution. We need a fit-ranked apply pipeline that finds winnable
local jobs, shows match + gaps with evidence, helps apply with tailored materials, and
**captures outcomes** an institution can later report on.

## Scope

**In scope**
- Live job search via the existing Adzuna client; **target role + bridge/entry roles**.
- **Per-job fit scoring** (Strong / Stretch / Reach + "what you're missing"), free for all.
- New premium "Jobs you can win" card in the V3 dashboard.
- **Per-job tailored cover letter** + **resume-tailoring guidance** (Pro/Lifetime only).
- **Outcome capture + Outreach CRM logging** (applied / interviewing / offer events).
- **WCAG 2.1 AA accessibility**, evidence-backed UI, white-label via design tokens,
  Adzuna attribution.

**Out of scope (explicitly — next specs)**
- Institutional admin layer: counselor/advisor dashboard, cohort management, board-level
  placement reporting, SSO, multi-seat billing.
- Surfacing individuals' phone numbers / personal emails (legal risk — rejected).
- Full resume *rewrite* (decision: tailoring *guidance* via the existing analyzer).
- Per-job interview prep, automated follow-up nudges, missing-cert→training deep links.

## Decisions

| Decision | Choice |
| --- | --- |
| Quality bar | Institution-grade; premium, accessible, evidence-backed |
| Primary buyer | University career services (K-12 later, tenant-generic data) |
| This build | Premium student pipeline, engineered institution-ready |
| Feature shape | Fit-ranked apply pipeline (not a plain board, not people-to-call) |
| Placement | New card in V3 dashboard, under "Next action", above Outreach Toolkit |
| Browse + fit scores | Free for everyone (incl. guests) |
| Tailored docs | Pro/Lifetime only |
| Resume action | Tailoring guidance (reuse analyzer), not full rewrite |
| Accessibility | WCAG 2.1 AA, non-negotiable, built in from the start |
| Outcomes | Structured, user- and tenant-scoped events captured from day one |
| Empty/unconfigured | Hide the card entirely |

## Premium quality bar (non-negotiable acceptance criteria)

- **Design quality:** uses `src/design/tokens.ts` tokens (no raw hex), real loading
  skeletons / empty / error states, considered spacing and hierarchy, mobile + desktop
  parity. Not a generic AI card — it should feel like paid software.
- **Evidence-backed:** every fit claim is explained ("matched: forklift cert — appears in
  4/6 postings"), salary/posted-date shown only when sourced, "Jobs by Adzuna" attribution.
  No unsourced assertions (consistent with the planner's paid-grade evidence work).
- **Trust & resilience:** bounded latency, graceful degradation, never a blank screen
  (route/global error boundaries already exist); the card hides rather than erroring.
- **White-label-ready:** all color/spacing via tokens so a campus brand is a config swap.

## Accessibility (WCAG 2.1 AA)

- **Not color-alone:** Strong/Stretch/Reach convey via **label + icon + text**, not just
  hue; contrast ≥ 4.5:1 for text, ≥ 3:1 for UI/graphics.
- **Keyboard:** every action (Apply, Log, Cover letter, Tailor resume, Retry) reachable
  and operable by keyboard with visible focus rings.
- **Screen readers:** semantic headings, `aria-label`s on icon/short buttons, fit summary
  announced as text ("Strong match, you meet 7 of 9 requirements"), live-region for
  loading/error.
- **Motion:** respect `prefers-reduced-motion`; no essential info conveyed by motion.
- **Verification:** automated axe pass + manual keyboard/SR check are part of acceptance.

## Outcome capture (institution-ready data hook)

A new lightweight, append-only outcome event per student action, so the future reporting
layer is a query, not a migration.

```ts
type OutcomeEvent = {
  userId: string
  orgId: string | null        // nullable now; populated when tenancy lands (K-12/uni orgs)
  planId: string | null
  jobId: string
  jobTitle: string
  company: string
  stage: 'applied' | 'interviewing' | 'offer' | 'rejected'
  source: 'careerheap-planner'
  createdAt: string
}
```

- Persisted via a new `/api/tools/career-switch-planner/outcome` route (auth required),
  table `planner_job_outcomes`, RLS scoped to the owning user (and org when present).
- Must degrade gracefully: if the table/env is missing, logging no-ops client-side with a
  friendly message (AGENTS.md resilience guardrail) — never breaks the dashboard.
- Logging an application also increments the existing Outreach CRM tracker.

## Architecture

```
Plan renders (CareerSwitchPlannerClient)
   │  target role + bridge roles + profile signals (skills/certs/experience)
   ▼
POST /api/jobs/search ─► fetchJobsPaged() per role ─► Adzuna API
   │                     (target + top 2 bridge roles, 1 page each)
   │  per posting: scoreJobFit(posting, profileSignals)   ← lib/planner/jobFit.ts
   ▼                     (heuristic requirement extraction, NO LLM, NO DB)
   { jobs:[{ ...posting, fit:{ tier, metCount, totalCount, matched[], missing[] } }], configured }
   ▼  derive view + rank (winnable first, guarantee ≥1 bridge role)
<JobsYouCanWinCard />  (accessible, hidden unless ≥1 scored job)
   ├─ Apply ────────────► sourceUrl (new tab)
   ├─ Log application ──► /api/.../outcome (OutcomeEvent) + Outreach CRM tracker
   ├─ Cover letter ─┐
   └─ Tailor resume ┴──► /api/.../tailor  (Pro-gated)
                          → generateCoverLetter / generateResumeAnalysis (lib/server/toolGeneration)
```

### Component boundaries

- **`lib/planner/jobFit.ts` (new, pure)** — given a posting description + the user's
  `NormalizedProfileSignals`, return `{ tier, metCount, totalCount, matched[], missing[] }`.
  Uses `aggregateRequirements(extractRequirementsFromText({ source:'adzuna', text }))`
  (heuristic, no LLM) then matches each requirement `normalizedKey` to the user's
  skills/certs via `normalizeBulletKey`. Score = frequency-weighted met/total.
  Tiers: **Strong** ≥0.7 and no missing required cert; **Stretch** 0.4–0.7; **Reach** <0.4.
  `matched`/`missing` carry the evidence labels (+ posting frequency) for the UI.
  *No I/O — fully unit-testable.*
- **`/api/jobs/search` (new)** — `{ roles[], location, country?, profileSignals }` → fan
  out Adzuna per role (target + ≤2 bridge roles, 1 page each), score, dedupe, rank, top 6.
  No auth, no LLM, no DB. `{ configured:false, jobs:[] }` when Adzuna env unset.
  Rate-limited via `lib/server/rateLimit`.
- **`/api/tools/career-switch-planner/tailor` (new, Pro-gated)** — `{ kind, role, company,
  jobPosting, resumeText|background }`; verifies Pro/Lifetime then calls
  `generateCoverLetter`/`generateResumeAnalysis`. Separate from metered free-pool
  `/api/tools/generate`. Non-paid → 402 upgrade payload.
- **`/api/tools/career-switch-planner/outcome` (new, auth)** — append an `OutcomeEvent`;
  no-ops gracefully when table/env missing.
- **`JobsYouCanWinCard` (new component)** — presentational, accessible; up to 6 fit-scored
  postings or nothing. Reuses `FocusCard`/`Button`/`Badge`/`PaywallBanner`.
- **Client wiring (`CareerSwitchPlannerClient`)** — trigger search after a plan exists;
  loading/error/data state; `onLogApplication` (outcome + CRM); Pro-gated
  `onCoverLetter`/`onTailorResume` (free users → `PaywallBanner`).

### Data contracts

```ts
type JobFit = {
  tier: 'strong' | 'stretch' | 'reach'
  metCount: number
  totalCount: number
  matched: { label: string; frequency: number }[]
  missing: { label: string; frequency: number }[]   // top 3
}
type ScoredJob = PlannerJobRecommendationInput & {
  salaryMin?: number | null
  salaryMax?: number | null
  postedAt?: string | null
  matchedRole: string                                 // target vs which bridge role
  fit: JobFit
}
type JobsSearchResponse = { configured: boolean; jobs: ScoredJob[] }
```

`profileSignals` = the planner model's already-computed skills/certs/experience (PII
stripped by `extractProfileSignals`).

### Card UI

`FocusCard`, header **"Jobs you can win"**, hint "Real openings for {targetRole} near
{location}, ranked by how well you match." Per posting:

- **{Title} · {Company}** · {location}
- **Fit:** icon + label + "You meet {met}/{total} requirements" (accessible text, not
  color-only)
- **Matched / Still need:** chips with the evidence labels (+ "in N/M postings")
- Salary range + "Posted {n}d ago" (only when sourced)
- **Apply** (primary), **Log application**, and Pro-gated **Cover letter** / **Tailor
  resume** (free users → `PaywallBanner` upsell)
- Footer: **"Jobs by Adzuna"**

### Ranking

Winnable-first: fit score desc, tie-break Strong>Stretch>Reach, then `postedAt` desc.
Guarantee ≥1 bridge-role result when present (always show a "fastest way in").

## Error handling & resilience

- Adzuna unconfigured/empty → card hidden (HTTP 200, `configured:false`).
- Adzuna timeout/failure → inline Retry; never errors the dashboard.
- Rate limit → 429; client treats as error.
- `tailor` non-paid → 402 → `PaywallBanner`.
- `outcome` table/env missing → client-side no-op with friendly note.
- Posting with zero extractable requirements → unscored, ranked last, never crashes.
- Whole job/fit/outcome path is DB-optional for *browsing* (AGENTS.md resilience).

## Testing

- **`jobFit` unit:** met/missing/tier math; cert synonym match; empty-requirements posting.
- **`/api/jobs/search`:** mock fan-out, scoring, dedupe, winnable ranking, bridge
  guarantee, unconfigured short-circuit, rate limit. No real Adzuna/LLM.
- **`/api/.../tailor`:** paid generates; non-paid 402; bad input 400.
- **`/api/.../outcome`:** persists event; graceful no-op when table absent; RLS scoping.
- **Component:** success renders accessible fit badges + actions; empty/unconfigured →
  nothing; Log fires callback; doc buttons gated for free users.
- **Accessibility:** automated axe pass + manual keyboard/screen-reader check (acceptance).
- **Guardrails (AGENTS.md):** scoring/ranking in `lib/planner/*`; reuse shared components;
  no raw hex; respect `contract.ts` and paid-gating.

## Compliance

- **Adzuna:** visible "Jobs by Adzuna" attribution; postings fetched live, not stored by
  the search path.
- **Accessibility:** WCAG 2.1 AA (institutional procurement gate; AODA for Ontario).
- **Privacy posture (university buyer):** outcome events scoped per user with nullable
  `orgId` for future tenancy; no third-party personal contact data collected.

## Suggested implementation phasing (for the plan)

Each phase independently shippable; premium + accessibility baked into every UI phase:

1. `lib/planner/jobFit.ts` + unit tests (pure).
2. `/api/jobs/search` (Adzuna fan-out + fit + ranking) + tests.
3. `JobsYouCanWinCard` + client wiring — **accessible, premium, free browse path**
   (shippable demo on its own).
4. Outcome capture (`/api/.../outcome` + table) + Outreach CRM logging.
5. `/api/.../tailor` + cover-letter / resume-guidance with Pro gating.

## Open questions

None blocking. Bridge-role count (2), per-role page depth (1), and tier thresholds are
tunable during implementation. Institutional admin layer (dashboards/cohorts/reporting)
is a deliberate next spec built on the outcome events captured here.
