# A) Executive Summary

## Inventory Snapshot
- App framework: Next.js App Router (`app/*`) with route handlers under `app/api/*`; no `middleware.ts` is present, so auth and request protection are enforced per route.
- Primary user-facing routes: `/`, `/pricing`, `/blog`, `/blog/[slug]`, `/tools`, `/tools/[slug]`, `/tools/[slug]/locked`, `/tools/career-switch-planner`, auth pages (`/login`, `/signup`, `/forgot-password`, `/reset-password`), `/account`, `/checkout`, `/success`, `/studio/[[...tool]]`.
- API endpoints: blog views, career-map occupations/skills, checkout, jobs ingest, resume capabilities/parse, Stripe checkout/portal/sync/webhooks, tool usage, planner generation, usage summary, auth callback.
- Auth providers: Supabase email/password, OTP, password reset, Google OAuth; server session access flows through `lib/supabase/server.ts`.
- Billing touchpoints: `app/api/checkout`, `app/api/stripe/checkout`, `app/api/stripe/portal`, `app/api/stripe/sync-checkout`, `app/api/stripe/sync-latest`, `app/api/stripe/webhook`, `app/api/webhooks/stripe`, plus `/checkout`, `/success`, `/account`.
- File uploads: only resume upload via `app/api/resume/parse/route.ts` (PDF/DOCX, OCR fallback).
- Background jobs / cron: none found in app code or config; only manual scripts under `scripts/*`.
- Source-of-truth server entrypoints: `app/layout.tsx`, `app/api/*/route.ts`, `lib/supabase/server.ts`, `lib/supabase/admin.ts`, `lib/server/*` service modules.

## High Confidence Wins (Low Risk)
- Remove two unused planner legacy files: `lib/planner/generator.ts` and `lib/mocks/careerSwitchPlanner.ts`; no imports or symbol references were found outside those files.
- Remove four unreferenced live Lighthouse artifact files: `lh-live-home.json`, `lh-live-blog.json`, `lh-live-pricing.json`, `lh-live-tool.json`; no references were found in code, docs, or scripts.
- Stop storing full raw resume text in `public.resumes.raw_text`; current code writes full resume text even though the UI copy says full text is not persisted by default, and no read path uses `raw_text`.
- Add a request timeout to the Adzuna fetch path in `lib/server/adzuna.ts`; current external fetch has no abort path and can hang an API request unnecessarily.
- Keep Stripe webhook signature validation as-is; it is correctly centralized in `lib/server/stripeWebhook.ts` and used by both webhook endpoints.
- Keep auth callback redirect sanitization as-is; `safeNextPath()` in `app/auth/callback/route.ts` already blocks open redirects to external origins.
- Keep file-upload size and type validation as-is; `lib/server/resumeParseCore.mjs` already enforces 10MB max and PDF/DOCX-only.
- Keep OCR timeout protections as-is; `app/api/resume/parse/route.ts` already caps OCR work to 20 seconds.

## Medium Confidence Candidates (Needs Verification)
- Add same-origin request validation for cookie-authenticated POST routes; current CSRF posture relies on cookie defaults rather than an explicit `Origin` / `Host` check.
- Replace the in-memory `Map` rate limiter in `lib/server/rateLimit.ts` with shared storage; current limits reset per process and do not hold across serverless instances.
- Add webhook replay protection (persist processed Stripe event IDs); signature verification is present, but there is no event-id dedupe table today.
- Require `DEV_ADMIN_TOKEN` whenever `/api/dev/planner-health` is enabled outside production; preview environments are currently open if the token is unset.
- Reconcile the stale UI test `tests/role-normalization-ui.test.mjs` with the current role-match copy; it is failing now even though the app builds.
- Consider removing direct dependencies with no repo imports (`axios`, `styled-components`, `@stripe/stripe-js`) after one more manual checkout/planner smoke pass.
- Review duplicated Stripe webhook routes (`/api/stripe/webhook` and `/api/webhooks/stripe`) before deleting either one; both currently point to the same handler, but external integrations may rely on either path.
- Consider trimming the legacy `lighthouse-*.json` artifacts only after confirming `scripts/lighthouse-local.mjs` outputs are still expected to remain checked in.

## Do Not Touch (High Risk Areas)
- `app/api/*`, especially billing, auth, planner, and upload handlers, except for surgical security fixes with explicit verification.
- `lib/supabase/*` and auth session wiring.
- `lib/server/stripeWebhook.ts`, `lib/server/stripe.ts`, and all Stripe routes except for additive replay protection.
- `sanity/*`, `sanity.config.ts`, and `/studio` flows.
- Database migrations already applied in production, except additive migrations with backfill and rollback notes.
- The main planner generation flow (`app/api/tools/career-switch-planner/route.ts` and `lib/server/careerMapPlanner.ts`) beyond small guardrails.

# B) Dead Code & Unused Assets Report (HIGH CONFIDENCE ONLY)

## 1. Unused legacy planner generator
- Path(s): `lib/planner/generator.ts`
- Why it is unused: `rg -n "generateCareerSwitchPlannerResult" app lib components src scripts` returns only the symbol definition inside this file. No import of `@/lib/planner/generator` was found.
- Risk level: Low
- Delete plan: delete the entire file (`lib/planner/generator.ts`, all 298 lines).
- Verification steps:
  - Run `npx tsc --noEmit`
  - Run `npm run lint`
  - Run `npm run build`
  - Click `/tools/career-switch-planner` and generate a plan to confirm the active planner path still works.

## 2. Unused legacy planner mock bundle
- Path(s): `lib/mocks/careerSwitchPlanner.ts`
- Why it is unused: the app imports FAQs and “more tools” content from `lib/planner/content.ts`, not from this file. `rg -n "getCareerSwitchPlannerMockResult" app lib components src scripts` returns only this file.
- Risk level: Low
- Delete plan: delete the entire file (`lib/mocks/careerSwitchPlanner.ts`, all 188 lines).
- Verification steps:
  - Run `npx tsc --noEmit`
  - Run `npm run lint`
  - Run `npm run build`
  - Visit `/tools/career-switch-planner` and verify the FAQ and “More Career Tools” sections still render.

## 3. Unreferenced live Lighthouse JSON artifacts
- Path(s): `lh-live-home.json`, `lh-live-blog.json`, `lh-live-pricing.json`, `lh-live-tool.json`
- Why it is unused: `rg -n "lh-live-home\\.json|lh-live-blog\\.json|lh-live-pricing\\.json|lh-live-tool\\.json" . --glob '!node_modules/**'` returns no references. They are not output targets in `scripts/lighthouse-local.mjs` either.
- Risk level: Low
- Delete plan: delete the four files entirely (10k+ lines each, artifact-only).
- Verification steps:
  - Run `npx tsc --noEmit`
  - Run `npm run lint`
  - Run `npm run build`
  - Optionally run `node scripts/lighthouse-local.mjs` to confirm the checked-in canonical Lighthouse outputs are still the `lighthouse-*.json` files.

# C) Dependency Audit

## Unused Dependencies (Safe to Remove)
- `axios`
  - Proof: `rg -n "axios" app lib components src scripts sanity --glob '!**/*.json'` returns no code references.
  - Safe removal basis: no imports, no dynamic requires, no script usage found.
- `styled-components`
  - Proof: `rg -n "styled-components" app lib components src scripts sanity --glob '!**/*.json'` returns no code references.
  - Safe removal basis: the app uses Tailwind and CSS modules/global CSS instead.
- `@stripe/stripe-js`
  - Proof: `rg -n "@stripe/stripe-js|loadStripe" app lib components src scripts sanity --glob '!**/*.json'` returns no code references.
  - Safe removal basis: checkout is server-created and redirects by URL; there is no client-side Stripe.js flow in the repo.

## Risky / Outdated Dependencies
- `rollup` (transitive, High via `npm audit --omit=dev --json`)
  - Why it matters: vulnerable to arbitrary file write via path traversal (`GHSA-mw96-cpmx-2vgc`); `npm why rollup` traces it to the Sanity CLI/runtime toolchain.
- `minimatch` (transitive, High via `npm audit --omit=dev --json`)
  - Why it matters: multiple ReDoS advisories (`GHSA-3ppc-4f35-3m26`, `GHSA-7r86-cg39-jmmj`, `GHSA-23c5-xmqv-rm74`); `npm why minimatch` traces affected copies mostly to Sanity CLI/export/runtime dependencies.
- Sanity stack is materially behind current latest versions (`npm outdated --json`)
  - `sanity`: `4.22.0` -> `5.12.0`
  - `@sanity/vision`: `4.22.0` -> `5.12.0`
  - `next-sanity`: `11.6.12` -> `12.1.0`
  - Why it matters: most current audit findings trace through this toolchain; upgrading here is the most likely path to clearing the transitive audit issues.
- Supabase packages are behind current latest minors
  - `@supabase/supabase-js`: `2.95.3` -> `2.98.0`
  - `@supabase/ssr`: `0.8.0` -> `0.9.0`
  - Why it matters: low urgency, but auth/session helpers and SSR compatibility are core infrastructure.

## Optional Upgrades (Defer Unless Security-Critical)
- `stripe`: `20.3.1` -> `20.4.0`
- `@stripe/stripe-js`: `8.7.0` -> `8.9.0` (only if the client SDK is actually kept)
- `tailwindcss`: `4.1.18` -> `4.2.1`
- `@tailwindcss/postcss`: `4.1.18` -> `4.2.1`
- `react` / `react-dom`: `19.2.3` -> `19.2.4`
- `eslint`: `9.39.2` -> `9.39.3` (or later after compatibility review)

# D) Security Audit (Practical, App-Specific)

## Auth / Session Handling
- Observed posture:
  - Supabase SSR cookies are read through `lib/supabase/server.ts`.
  - There is no global middleware; each route checks auth directly.
  - Auth providers in use: email/password, OTP, Google OAuth.
- Good:
  - `app/auth/callback/route.ts` uses `safeNextPath()` to prevent open redirects.
  - `getAuthenticatedUserFromRequest()` supports bearer-token auth first, then cookie/session fallback.
- Risk:
  - No explicit same-origin CSRF guard on cookie-authenticated POST endpoints.

## API Route Protections (AuthN vs AuthZ)
- Good:
  - Billing routes require authenticated billing users.
  - Planner, resume parse, and jobs ingest require authenticated users.
  - Rate limiting exists on planner, jobs ingest, resume parse, and career-map endpoints.
- Issue 1:
  - Severity: Medium
  - Impact: State-changing POST routes rely on session cookies without an explicit `Origin` / `Host` validation step. If browser cookie settings ever loosen, CSRF exposure increases.
  - Minimal fix: add a small helper that rejects requests when `Origin` is present and does not match the app origin; leave requests with no `Origin` untouched.
  - How to verify fix:
    - Browser path: same-site POSTs from the app still succeed.
    - Negative check: curl with a forged `Origin` header returns 403 on protected POST routes.

## Input Validation / File Upload Safety / Rate Limiting
- Good:
  - Resume upload limits to PDF/DOCX and 10MB in `lib/server/resumeParseCore.mjs`.
  - OCR work is bounded to 5 pages and 20 seconds.
  - Planner and upload APIs sanitize/normalize many inputs before processing.
- Issue 2:
  - Severity: Medium
  - Impact: `app/api/resume/parse/route.ts` stores the full parsed resume text in `public.resumes.raw_text`. This is sensitive personal data and contradicts current UI copy stating full resume text is not persisted by default.
  - Minimal fix: store a redacted placeholder in `raw_text` and keep only structured metadata in `parsed_data`, or add an explicit opt-in later.
  - How to verify fix:
    - Upload a resume.
    - Confirm planner UX is unchanged.
    - Inspect the inserted `resumes` row and verify `raw_text` no longer contains the resume body.
- Issue 3:
  - Severity: Low
  - Impact: `lib/server/rateLimit.ts` uses a process-local `Map`, so limits reset across processes/instances and after deploys.
  - Minimal fix: defer to a shared store (Redis or DB) later; do not replace in this audit pass.
  - How to verify fix:
    - For now, confirm the current in-process limiter still emits `X-RateLimit-*` headers.

## SSRF / XSS / CSRF
- SSRF:
  - Good: no user-supplied arbitrary URL fetch path was found. Job matching uses a hardcoded Adzuna endpoint with user-supplied role/location strings only.
- XSS:
  - Good: the only `dangerouslySetInnerHTML` found is the JSON-LD block in `app/blog/[slug]/page.tsx`, populated from `JSON.stringify(jsonLd)`. No user-generated HTML sink was found elsewhere.
- CSRF:
  - Risk remains Medium as noted above because POST routes rely on cookie defaults instead of an explicit origin check.

## Secret Handling / Sensitive Logging
- Good:
  - Secrets are read from `process.env` server-side.
  - Stripe route responses are generic in production.
  - Resume parse debug logging only emits source/text length metadata and is disabled in production.
- Watch item:
  - Some routes log raw `error` objects (`console.error(...)`). This is common, but upstream provider responses can still leak operational details into logs. Keep logging, but avoid adding request bodies or tokens to future logs.

## Stripe Webhook Verification & Idempotency
- Good:
  - `lib/server/stripeWebhook.ts` verifies `STRIPE_WEBHOOK_SECRET`.
  - It calls `stripe.webhooks.constructEvent(body, signature, webhookSecret)` before processing.
  - Both `/api/stripe/webhook` and `/api/webhooks/stripe` reuse the same verified handler.
- Issue 4:
  - Severity: Medium
  - Impact: there is no persistent replay/idempotency guard by Stripe event ID. Duplicate valid deliveries can re-run writes and can overwrite timestamps like `lifetime_purchased_at`.
  - Minimal fix: add a small processed-events table keyed by `event.id`, or record the last processed event per billing object before applying updates.
  - How to verify fix:
    - Replay the same signed webhook payload twice.
    - Confirm the second delivery is ignored while the first still applies.

# E) Performance & Reliability (LOW RISK ONLY)

## Bundle / Repo Size Quick Wins
- Delete `lh-live-*.json` artifacts; they add ~42k lines of checked-in noise and are not used by app code or scripts.
- Remove unused direct dependencies (`axios`, `styled-components`, `@stripe/stripe-js`) after one final smoke pass.

## Server / API Performance Hotspots
- `lib/server/adzuna.ts` uses `fetch()` without an abort timeout.
  - Low-risk improvement: add an abort signal (for example 8–10 seconds) so job-ingest requests fail fast instead of hanging a lambda.
- `lib/server/rateLimit.ts` is process-local only.
  - Reliability concern more than performance: scaling out reduces its effectiveness.
- The planner and resume routes instantiate multiple admin clients and DB queries in a single request.
  - Do not refactor now; just note as a future optimization hotspot.

## Build / Runtime Optimizations
- `npx tsc --noEmit` fails before a build because `.next/types/routes.js` is not generated yet; after `npm run build`, `npx tsc --noEmit` passes.
  - Low-risk process fix: document the correct local verification order (`build` before standalone `tsc`) or add a dedicated typecheck script later.

## Observability Suggestions (Minimal)
- Add a single timeout/error metric around Adzuna fetch failures and planner generation failures; do not add a new telemetry stack in this pass.

# F) Future-Proofing (NO REFACTOR)

## Architectural Risks
- The planner client (`app/tools/career-switch-planner/CareerSwitchPlannerClient.tsx`) is very large and mixes form flow, networking, rendering, and print logic. It works today, but regression surface is high.
- Stripe has two public webhook routes hitting the same handler. This is manageable, but it increases operational ambiguity until one canonical endpoint is chosen.
- Several route handlers still own input normalization, orchestration, persistence, and response shaping inline. That makes surgical fixes harder over time.
- QA/override query params on usage endpoints are intentionally exposed; that is a product decision, but it is also an easy place for behavior drift if not covered by tests.

## Add Later Recommendations
- Add a minimal processed-Stripe-events table for replay protection.
- Add one integration test that covers a same-origin protected POST route once CSRF origin checks are introduced.
- Add one privacy-focused test proving `resumes.raw_text` does not store the uploaded document body.
- Add monitoring around planner route latency, Adzuna timeout rate, and webhook failures.
- Add a tiny “verified smoke” checklist to release docs that includes planner generation, resume upload, checkout, portal, login, signup, blog, and studio.

## Proposed Smallest Safe Commit Plan
- Commit 1: `AUDIT_REPORT.md` only (report-only, no behavior changes).
- Commit 2: low-risk deletions only
  - Delete `lib/planner/generator.ts`
  - Delete `lib/mocks/careerSwitchPlanner.ts`
  - Delete `lh-live-home.json`, `lh-live-blog.json`, `lh-live-pricing.json`, `lh-live-tool.json`
- Commit 3: minimal security / reliability guardrails
  - Redact `raw_text` storage in `app/api/resume/parse/route.ts`
  - Add a timeout to the external Adzuna fetch in `lib/server/adzuna.ts`

