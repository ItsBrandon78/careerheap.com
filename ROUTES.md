# ROUTES

## Marketing + Product
- `/` - Homepage with flagship Featured Tool, tools grid, blog previews, and upgrade CTA.
- `/tools` - Tools index with featured Career Switch Planner and secondary tool cards.
- `/tools/career-switch-planner` - Flagship planner tool with full multi-state UX.
- `/tools/[slug]` - Generic tool template (active state) for tool slugs.
- `/tools/[slug]/locked` - Forced locked-state preview of generic tool template.
- `/pricing` - Free / Pro / Lifetime pricing page.
- `/blog` - Blog listing page.
- `/blog/[slug]` - Blog post template page.

## Account + Auth
- `/login` - Magic link + password auth page.
- `/auth/callback` - Supabase auth callback exchange route.
- `/account` - Account hub wrapper (Suspense boundary).
- `/account?tab=profile|security|billing|usage` - Account tab states.
- `/checkout` - Plan checkout UI (Pro subscription + Lifetime one-time).
- `/success` - Post-checkout success page.

## Company + Legal
- `/about` - About page.
- `/contact` - Contact page.
- `/careers` - Careers page.
- `/privacy` - Privacy policy page.
- `/terms` - Terms page.

## Utility
- `/design-system` - Internal design system preview route.
- `/_not-found` - Framework-generated not-found endpoint.

## API Routes
- `/api/tools/[slug]` - Tool usage API.
  - `GET`: read plan/usage availability.
  - `POST`: consume one use after successful generation.
  - Supports QA overrides via query: `plan`, `uses`.
- `/api/usage/summary` - Global usage summary for header/account.
- `/api/resume/parse` - Multipart resume parsing (PDF/DOCX, max 10MB) with LOW_TEXT handling.
- `/api/checkout` - Stripe checkout session creation (Pro or Lifetime).
- `/api/webhooks/stripe` - Stripe webhook handling for plan updates.
