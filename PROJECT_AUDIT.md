# PROJECT_AUDIT

## Audit Coverage Checklist (Desktop + Mobile)
- [x] Global design tokens and Tailwind mapping verified (`src/design/tokens.ts`, `src/design/tokens.json`, `tailwind.config.js`).
- [x] Shared UI primitives reviewed and normalized (`Button`, `Badge`, `Card`, `ToolCard`, `PricingCard`, `FAQAccordion`, `ToolHero`, `ToolUIContainer`, `PaywallBanner`).
- [x] Header logged-out and logged-in states reviewed and fixed.
- [x] Footer links reviewed and corrected.
- [x] Homepage audited for featured-tool hierarchy and tool grid emphasis.
- [x] Pricing page updated to final Free/Pro/Lifetime model.
- [x] Tool routes audited:
  - [x] `/tools/[slug]` active flow
  - [x] `/tools/[slug]?locked=1` locked preview
  - [x] `/tools/career-switch-planner` full state machine
- [x] Resume upload API flow verified (`/api/resume/parse`).
- [x] Account hub audited and rebuilt (`/account`, Profile/Security/Billing/Usage).
- [x] Checkout + webhook plan handling audited and updated for Pro/Lifetime.
- [x] 404 route added and validated (`app/not-found.tsx`).
- [x] Local quality checks passed:
  - [x] `npm run lint`
  - [x] `npm run build`

## Issues Found

### Blocker
1. Plan/usage gating was incorrect and not shared globally.
- Symptom: usage was incremented during "check" and enforced per-tool, not as shared 3 lifetime total.
- Fix: replaced with shared usage state pipeline + split check/consume behavior.
- Files: `app/api/tools/[slug]/route.ts`, `lib/hooks/useToolUsage.ts`, `lib/server/usage.ts`, `lib/server/usageState.ts`, `app/tools/[slug]/page.tsx`, `app/tools/career-switch-planner/CareerSwitchPlannerClient.tsx`.

2. Pricing model mismatched final spec ($19/$12 old model still present).
- Fix: normalized to Free ($0, 3 lifetime uses), Pro ($7/mo), Lifetime ($49 one-time).
- Files: `src/design/mockupData.ts`, `app/pricing/page.tsx`, `components/PricingCard.tsx`, `app/checkout/CheckoutClient.tsx`, `app/api/checkout/route.ts`, `app/api/webhooks/stripe/route.ts`.

### Major
1. Header auth state lacked clear plan/usage context and no account dropdown flow.
- Fix: rebuilt header auth UX with plan badge, usage indicator, avatar dropdown and mobile parity.
- Files: `components/Header.tsx`, `lib/auth/context.tsx`.

2. Account page was not a SaaS control center (missing structured tabs/states).
- Fix: rebuilt account experience with Profile/Security/Billing/Usage sections and plan-specific billing states.
- Files: `app/account/AccountClient.tsx`, `app/account/page.tsx`.

3. Locked panels were weak and inconsistent with final upgrade paths.
- Fix: added premium lock messaging with both upgrade options (Pro + Lifetime).
- Files: `components/PaywallBanner.tsx`, `components/career-switch-planner/CareerSwitchPlannerComponents.tsx`.

4. Several CTA flows were non-navigating/inert.
- Fix: added href-based CTA support and wired routes.
- Files: `components/CTASection.tsx`, `app/page.tsx`, `app/tools/page.tsx`, `app/blog/page.tsx`.

### Minor
1. Hardcoded body colors in global CSS bypassed token styling intent.
- Fix: replaced with token utility classes.
- File: `app/globals.css`.

2. Footer company links did not map to real destinations.
- Fix: created lightweight routes and linked them.
- Files: `components/Footer.tsx`, `app/about/page.tsx`, `app/contact/page.tsx`, `app/careers/page.tsx`.

3. No basic 404 experience.
- Fix: added branded not-found page.
- File: `app/not-found.tsx`.

## Remaining Deviations From Mockups
1. Blog card and post hero images are still placeholder blocks (no real assets connected).
- Reason: mockup image assets are not wired into route data yet; layout parity is maintained.

2. Billing actions are structured UI stubs (`Update payment method`, `Cancel subscription`, `Download invoices`) and require backend billing portal wiring.
- Reason: Stripe customer portal flow not yet integrated in this pass.

3. Lifetime checkout relies on `STRIPE_PRICE_LIFETIME` env configuration.
- Reason: runtime pricing IDs are deployment-specific.

## Additional Notes
- QA overrides are implemented for usage gating previews: `?plan=free|pro|lifetime` and `?uses=0..3`.
- Locked preview remains available via `?locked=1`.
- Career Switch Planner resume-upload Pro preview remains available via `?propreview=1`.
