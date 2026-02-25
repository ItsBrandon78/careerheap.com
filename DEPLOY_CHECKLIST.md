# Career Map Planner Deploy Checklist

## 1) Environment Variables

Required:
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (legacy fallback: `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
- `SUPABASE_SECRET_KEY` (legacy fallback: `SUPABASE_SERVICE_ROLE_KEY`)
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_PRO_MONTHLY`
- `STRIPE_PRICE_LIFETIME`

Optional but recommended:
- `STRIPE_PRICE_PRO_YEARLY`
- `STRIPE_PORTAL_RETURN_URL`
- `DEV_ADMIN_TOKEN` (for non-prod `/api/dev/planner-health`)

## 2) Database + Data Steps

1. Apply migrations in order:
   - `migrations/001_initial_schema.sql`
   - `migrations/002_billing_and_tool_runs.sql`
   - `migrations/003_stripe_subscription_state.sql`
   - `migrations/004_blog_post_views.sql`
   - `migrations/005_career_map_planner_core.sql`
   - `migrations/006_career_map_planner_execution_core.sql`
2. Ingest planner datasets:
   - `npm run ingest:career-data -- --all --write`
3. Seed FX rates:
   - `npm run seed:fx-rates`
4. Run planner preflight:
   - `npm run preflight:planner`

## 3) Build + Test Commands

- `npm run lint`
- `npm test`
- `npm run build`

## 4) Smoke Test Command

With local server running:
- `npm run dev`
- `npm run smoke:career-map -- --base-url=http://127.0.0.1:3000`

Smoke test verifies:
- Free user first analysis succeeds and persists report
- Free user second analysis is blocked by cap
- Pro user analysis succeeds
- Pro resume-parse endpoint is allowed
- Deterministic scoring (`same input -> same score`)

## 5) Manual QA (Launch Gate)

Free plan:
- Can run one full analysis
- Second analysis is blocked/upgrade-gated
- Resume parse endpoint is blocked

Pro plan:
- Unlimited analyses
- Resume parse enabled
- Full roadmap + resume reframe visible

Data correctness:
- Salary cards show USD first
- CAD cards show native values + FX date
- Missing salary displays: `Not available for selected region`
- Data transparency panel lists datasets and FX source/date

Stripe:
- Checkout success page finalizes status
- Billing tab reflects plan and renewal state

No launch if:
- Build fails
- Smoke test fails
- Planner preflight fails
