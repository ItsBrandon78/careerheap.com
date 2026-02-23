# CareerHeap App

CareerHeap is a Next.js application with a Sanity-backed public blog.

## Stack

- Next.js App Router
- Tailwind (token-mapped design system)
- Sanity Content Lake + Sanity Studio
- Supabase Auth + Postgres
- Stripe Checkout + Customer Portal + Webhooks

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy env vars:

```bash
cp .env.local.example .env.local
```

3. Fill required env vars in `.env.local`:

- `SANITY_PROJECT_ID`
- `SANITY_DATASET`
- `SANITY_API_VERSION` (example: `2026-02-18`)
- `NEXT_PUBLIC_SANITY_PROJECT_ID` (same value as `SANITY_PROJECT_ID`, for `/studio`)
- `NEXT_PUBLIC_SANITY_DATASET` (same value as `SANITY_DATASET`, for `/studio`)
- `NEXT_PUBLIC_SANITY_API_VERSION` (optional, defaults to `2026-02-18`)
- `SANITY_READ_TOKEN` (optional; not needed for public published-content reads)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_PRO_MONTHLY`
- `STRIPE_PRICE_PRO_YEARLY` (optional)
- `STRIPE_PRICE_LIFETIME`
- `NEXT_PUBLIC_SITE_URL` (set to your production site, e.g. `https://careerheap.com`)
- Existing app keys (Supabase/Stripe) as needed

4. Create or connect a Sanity project/dataset (first-time setup):

```bash
npx sanity init
```

Choose/create your project and dataset, then mirror those values in `.env.local`.

5. Start Next.js:

```bash
npm run dev
```

6. Start Sanity Studio:

```bash
npm run studio
```

Sanity Studio runs on `http://localhost:3333` by default.
If Next.js is running, you can also use embedded Studio at `http://localhost:3000/studio`.

7. Apply database migrations in Supabase SQL Editor:
   - `migrations/001_initial_schema.sql`
   - `migrations/002_billing_and_tool_runs.sql`
   - `migrations/003_stripe_subscription_state.sql`
   - `migrations/004_blog_post_views.sql`

## Stripe Setup (Test Mode)

1. Create products/prices in Stripe test mode:
   - Pro monthly (`$7/month`) -> set as `STRIPE_PRICE_PRO_MONTHLY`
   - Pro yearly (optional) -> set as `STRIPE_PRICE_PRO_YEARLY`
   - Lifetime one-time (`$49`) -> set as `STRIPE_PRICE_LIFETIME`
2. Start a webhook forwarder:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

3. Copy the webhook signing secret into `STRIPE_WEBHOOK_SECRET`.

Billing APIs:

- `POST /api/stripe/checkout` body: `{ "plan": "pro" | "lifetime", "cadence"?: "monthly" | "yearly" }`
- `POST /api/stripe/portal` (Pro users)
- `POST /api/stripe/webhook`

Local Stripe test checklist:
1. Start app: `npm run dev`
2. Start webhook forwarding: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
3. Complete checkout from `/checkout`
4. Confirm plan updates in `/account?tab=billing` and usage is unlimited in `/account?tab=usage`
5. Open customer portal from `/account?tab=billing`

## Auth Flows

- Magic link sign-in
- Email/password sign-up + sign-in
- Forgot/reset password (`/forgot-password`, `/reset-password`)
- Google OAuth sign-in button (configure Google provider in Supabase Auth)

## Blog Routes

- `/blog` - blog index
- `/blog/[slug]` - blog post page

Both routes fetch only published Sanity content and use ISR revalidation.
Post cover behavior:
- If `coverImage` exists in Sanity, UI renders that exact asset on `/blog` and `/blog/[slug]`.
- If missing, UI renders a deterministic no-cover state (no random/stock fallback images).

## Sanity Content Model

Defined in `sanity/schemas`:

- `post`
- `category`
- `author`
- `callout` (for info/tip/warning blocks in article body)

## How to Publish a Blog Post

1. Open Studio (`npm run studio` or deployed studio URL).
2. Create/update `category` and `author` docs if needed.
3. Create a `post` doc:
   - title, slug, excerpt, cover image, category, body
   - set `publishedAt` (required for public visibility)
   - optional `seoTitle` and `seoDescription`
4. Publish.
5. Verify on `/blog` and `/blog/[slug]`.

## Hosted Studio Deployment (Recommended)

Deploy Studio separately:

```bash
npm run studio:deploy
```

This keeps browser authoring separate from the public web app.

## Vercel Notes

Set these vars in Vercel:

- `SANITY_PROJECT_ID`
- `SANITY_DATASET`
- `SANITY_API_VERSION`
- `NEXT_PUBLIC_SANITY_PROJECT_ID`
- `NEXT_PUBLIC_SANITY_DATASET`
- `NEXT_PUBLIC_SANITY_API_VERSION` (optional)
- `SANITY_READ_TOKEN` (only if required for private datasets/previews)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_PRO_MONTHLY`
- `STRIPE_PRICE_PRO_YEARLY` (optional)
- `STRIPE_PRICE_LIFETIME`
- `STRIPE_PORTAL_RETURN_URL` (optional)
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SITE_URL`

Important:

- Canonical/OG URLs are normalized to production domain (`https://careerheap.com`) when local domains like `localhost` are detected.
- Never commit `.env.local` or secret tokens.

## Scripts

- `npm run dev` - run Next.js locally
- `npm run build` - production build
- `npm run start` - production server
- `npm run lint` - lint checks
- `npm test` - regression tests
- `npm run lighthouse:local` - build/start locally on `127.0.0.1` and run Lighthouse for `/`, `/tools/career-switch-planner`, `/pricing`, `/blog`
- `npm run studio` - run Sanity Studio locally
- `npm run studio:deploy` - deploy hosted Studio
