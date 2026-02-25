# PROJECT_AUDIT

Date: 2026-02-23

## Completed

- [x] Blog media parity now uses Sanity cover assets end-to-end with one shared contract:
  - `coverImage: { url, width, height, alt } | null`
  - Wired in `lib/sanity/api.ts`, `components/blog/PostCard.tsx`, `components/blog/FeaturedPostCard.tsx`, `app/blog/[slug]/page.tsx`.
- [x] Placeholder/random blog image behavior removed:
  - Removed Unsplash fallback image generation from `lib/sanity/api.ts`.
  - Added deterministic no-cover state component: `components/blog/NoCoverState.tsx`.
- [x] Blog Popular sort is analytics-backed:
  - View tracker endpoint: `app/api/blog/views/route.ts`
  - Aggregation service: `lib/server/blogViews.ts`
  - UI sort behavior updated in `components/blog/BlogIndexClient.tsx` and `components/blog/FilterRow.tsx`.
- [x] Billing flow hardened for Stripe test mode:
  - Cadence-aware checkout for Pro (`monthly`/`yearly`) in `app/checkout/CheckoutClient.tsx` and `app/api/stripe/checkout/route.ts`.
  - Webhook lifecycle handling expanded in `lib/server/stripeWebhook.ts`.
  - Portal entitlement checks now use subscription-aware plan resolution in `app/api/stripe/portal/route.ts`.
  - Entitlement resolver added: `lib/server/billingEntitlements.ts`.
- [x] Usage gating now supports QA plan/uses overrides and subscription-aware entitlements:
  - `lib/server/toolUsage.ts`
  - `app/api/tools/[slug]/route.ts`
  - `app/api/usage/summary/route.ts`
- [x] Lighthouse local pipeline stabilized:
  - Added `scripts/lighthouse-local.mjs`
  - Added `npm run lighthouse:local`
  - Uses `127.0.0.1`, server health preflight, and runtimeError guard.
- [x] Accessibility dialog keyboard hardening:
  - Focus trap, initial focus, ESC close, and trigger focus return in `components/AccessibilityMenu.tsx`.
- [x] Env and schema readiness updates:
  - Env validation utility: `lib/server/envValidation.ts`
  - Migrations added:
    - `migrations/003_stripe_subscription_state.sql`
    - `migrations/004_blog_post_views.sql`

## Validation

- `npm run lint`: PASS
- `npm test`: PASS
- `npm run build`: PASS
- `npm run lighthouse:local`: PASS
  - `lighthouse-pricing.json` and `lighthouse-blog.json` now resolve to `http://127.0.0.1:4173/*` with `runtimeError: none`.

## Remaining Deviations (Clear/Testable)

1. Stripe test-mode live verification still depends on real Stripe keys/webhook forwarder.
- Needed to fully confirm end-to-end transitions in your environment:
  - successful checkout redirect with live test session
  - webhook-delivered profile updates in Supabase
  - portal downgrade/cancel flows reflected post-webhook

2. Popular sort quality depends on accumulating real traffic.
- With no view events, UI intentionally keeps Popular non-primary and falls back to Newest behavior.
