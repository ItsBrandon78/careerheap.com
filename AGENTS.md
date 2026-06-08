Mockup parity checklist
=======================

Source of truth
- The parity target comes from `careerheap/CareerHeap,pen.pen` top-level frames:
  - `Homepage`
  - `Tool Page - Active State`
  - `Tool Page - Locked State`
  - `Pricing Page`
  - `Blog Post Template`
  - `- Design System Components -`

Design tokens
- Canonical token file: `src/design/tokens.ts`
- Tailwind runtime mirror: `src/design/tokens.json` (consumed by `tailwind.config.js`)
- Required token groups:
  - `colors`: accent/navy surfaces, text hierarchy, borders, status colors
  - `spacing`: `xs, sm, md, lg, xl, 2xl, 3xl, section`
  - `radius`: `sm, md, lg, pill`
  - `shadows`: `button, card, panel`
  - `container`: `content=1100`, `wide=1280`, `tool=760`
  - `breakpoints`: `sm, md, lg, xl`

Global spacing/layout rules
- Section rhythm: `py-section` (`96px`) for major sections, `py-16` for secondary sections.
- Horizontal gutters:
  - Mobile: `px-4`
  - Desktop frame parity: `lg:px-[170px]` for content sections, `lg:px-[340px]` for narrow tool/pricing blocks.
- Max widths:
  - Main content: `max-w-content`
  - Footer/header shell: `max-w-wide`
  - Tool/pricing body: `max-w-tool`

Typography rules
- Body + headings use Inter (`font-body`, `font-heading`).
- Hero/page title sizes:
  - Marketing hero: `48px` desktop (`42px` mobile)
  - Page headers: `40px`
  - Section headers: `32px` or `24px` depending on frame density
- Secondary body text uses `text-text-secondary`; metadata uses `text-text-tertiary`.

Component reuse contract
- Reuse these components for parity pages and avoid one-off card/button implementations:
  - `Header`
  - `Footer`
  - `Button` (`primary`, `secondary`, `ghost`, `outline`)
  - `Badge`
  - `Card`
  - `ToolCard`
  - `BlogCard`
  - `PricingCard`
  - `FAQAccordion`
  - `ToolHero`
  - `ToolUIContainer`
  - `PaywallBanner`

Route composition contract
- Required parity routes must be composed from shared components:
  - `/`
  - `/pricing`
  - `/blog/[slug]`
  - `/tools/[slug]`
- Tool locked preview requirement:
  - Query param: `/tools/[slug]?locked=1`
  - Component API: `ToolPageTemplate({ locked: true })`

Regression guardrails
- Do not introduce raw hex color classes in route/component files; use token-mapped classes.
- Do not bypass shared components for cards/buttons/badges in parity routes.
- Keep Tailwind token mapping in sync when token values change.
- Validate desktop + mobile spacing and max-width behavior after layout changes.

Implementation status (roadmap/dev)
- [x] `src/design/tokens.ts` is the canonical design-token source.
- [x] Tailwind token mapping is wired through `tailwind.config.js`.
- [x] Shared parity components are implemented and reused (`Header`, `Footer`, `Button`, `Badge`, `Card`, `ToolCard`, `BlogCard`, `PricingCard`, `FAQAccordion`, `ToolHero`, `ToolUIContainer`, `PaywallBanner`).
- [x] Core parity pages are implemented:
  - [x] `/`
  - [x] `/pricing`
  - [x] `/blog/[slug]`
  - [x] `/tools/[slug]`
- [x] Locked tool preview flows are implemented:
  - [x] `/tools/[slug]?locked=1`
  - [x] `/tools/[slug]/locked`
- [x] Design system preview page is implemented: `/design-system`.
- [x] Shared lifetime usage gating is implemented across tools:
  - [x] Free: `3` lifetime total uses (shared pool)
  - [x] Pro/Lifetime: unlimited
  - [x] QA overrides: `?plan=free|pro|lifetime&uses=0..3`
- [x] Pricing model normalized everywhere:
  - [x] Free: `$0`
  - [x] Pro: `$7/month`
  - [x] Lifetime: `$49` one-time
- [x] Resume upload is gated to paid plans (Pro/Lifetime) with free fallback to manual paste.
- [x] Account hub includes tabbed Profile/Security/Billing/Usage states.

Career Switch Planner (V3)
==========================

Architecture
- Tool slug: `career-switch-planner` (rendered through `/tools/[slug]` template).
- Intake → Generation → Dashboard flow:
  - `PlannerIntakeWizard` (multi-step intake; resume upload gated to paid plans, free fallback to manual paste).
  - `app/api/tools/career-switch-planner` (server route: planner generation, validation, persistence).
  - `PlannerDashboardV3` (post-generation dashboard, decision-first 5-card layout).
- Supporting components:
  - `PlannerCommandCenter` — top action / control surface.
  - `PlannerDashboardSections` — focused dashboard cards (current state, target role, gap, plan, next action).
  - `CareerSwitchPlannerComponents` — shared subcomponents.
- Data/logic library: `lib/planner/`
  - `contract.ts`, `sourceContract.ts`, `types.ts` — input/output contracts.
  - `v3Dashboard.ts` — dashboard composition + ranking logic.
  - `recommendedTargets.ts`, `jobRecommendations.ts`, `roleNormalization.ts` — target role surfacing/ranking.
  - `profileSignals.ts`, `skillsPaste.ts` — intake signal extraction.
  - `content.ts`, `exampleScenarios.ts` — copy + example data.

Auth, billing, persistence
- Auth: Supabase (`lib/supabase/`, `app/auth/callback`, `/login`, `/signup`, `/forgot-password`, `/reset-password`).
- Billing: Stripe (`/app/api/stripe/{checkout,portal,sync-checkout,sync-latest,webhook}`, `/app/api/checkout`, `/app/api/webhooks/stripe`). Pro: `$7/month`. Lifetime: `$49` one-time.
- Resume parsing: `/app/api/resume/parse` (capabilities probe at `/app/api/resume/capabilities`).
- Usage tracking: `/app/api/usage/summary` (lifetime free pool of 3 shared across tools).
- Health probes: `/app/api/dev/planner-health` (planner generation guardrails against missing DB tables / env vars).

Planner regression guardrails
- Do not bypass `lib/planner/contract.ts` validation when adding generation paths.
- Do not introduce planner UI outside `components/career-switch-planner/` — keep dashboard + intake colocated.
- Keep target-role ranking logic in `recommendedTargets.ts` / `roleNormalization.ts`; do not inline ad-hoc scoring in components.
- Resume-gated flows must respect plan tier (free → manual paste only; pro/lifetime → upload + parse).
- Planner generation must remain resilient when Supabase tables or env vars are missing (see `Harden planner generation` commits).

Implementation status — Planner V3
- [x] Multi-step intake wizard with resume upload (gated) and manual paste fallback.
- [x] V3 dashboard restructured into decision-first 5-card layout.
- [x] Target roles ranked by real-time current/target similarity.
- [x] Planner generation hardened against missing DB tables / env vars.
- [x] Planner persistence + QA coverage.
- [x] Localhost unsigned planner testing enabled for QA.
- [x] V3 hero metrics aligned with mockup parity.
- [x] Roadmap section styling aligned to V3 mockup parity.
