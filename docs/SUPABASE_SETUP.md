# Supabase Setup Guide

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up / Log in
3. Create a new project
4. Choose region (closest to your users)
5. Create a secure password
6. Wait for project to initialize (~2 minutes)

## Step 2: Get Your Credentials

Once project is ready, go to **Settings > API**:

- Copy **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- Copy **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Copy **service_role secret** → `SUPABASE_SERVICE_ROLE_KEY`

Add these to `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

## Step 3: Run SQL Migrations

1. In Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy the entire contents of `migrations/001_initial_schema.sql`, run it
4. Copy the entire contents of `migrations/002_billing_and_tool_runs.sql`, run it
5. Copy the entire contents of `migrations/003_stripe_subscription_state.sql`, run it
6. Copy the entire contents of `migrations/004_blog_post_views.sql`, run it
7. Copy the entire contents of `migrations/005_career_map_planner_core.sql`, run it
8. Copy the entire contents of `migrations/006_career_map_planner_execution_core.sql`, run it
9. Paste into the editor
10. Click **Run**

This creates:
- `tools` table (tool metadata)
- `tool_usage` table (legacy usage tracking)
- `tool_runs` table (canonical tool execution runs)
- `blog_post_views_daily` (aggregated blog views for Popular sort)
- Career Map Planner data model:
  - `skills`, `occupations`, `occupation_skills`, `occupation_requirements`
  - `occupation_wages`, `trade_requirements`, `dataset_sources`
  - `career_map_reports`, `career_map_facts_bundles`, `career_map_claims`
- `profiles` table (user plan status)
- `profiles.free_uses_used` shared free counter
- `profiles.stripe_cancel_at_period_end` and `profiles.stripe_current_period_end`
- RLS policies (row-level security)
- Auth setup

## Step 4: Enable Auth

1. Go to **Authentication > Providers**
2. Enable **Email** (magic link recommended)
3. Update redirect URLs:
   - `http://localhost:3000/auth/callback`
   - `https://careerheap.com/auth/callback` (production)

## Step 5: Test Connection

```bash
npm run dev
# Visit http://localhost:3000/login
# Should see login form
```

## Step 6 (Optional): Seed Career Data

After running migration `005`, you can ingest Career Map Planner datasets:

```bash
# Dry-run (recommended first)
npm run ingest:career-data -- --all --dry-run

# Persist to Supabase
npm run ingest:career-data -- --all --write

# Seed latest USD/CAD FX rate (required for CAD->USD display)
npm run seed:fx-rates

# Planner runtime preflight (schema + counts + FX freshness)
npm run preflight:planner
```

Optional dev health endpoint (non-production only):

```
GET /api/dev/planner-health
```

## Troubleshooting

**"No RLS policy found"**: Make sure you ran the full migration script

**Auth not working**: Check redirect URLs match your domain exactly

**Connection refused**: Verify `NEXT_PUBLIC_SUPABASE_URL` is correct

**`PGRST205: Could not find the table 'public.dataset_sources' in the schema cache`**:
Run migration `migrations/005_career_map_planner_core.sql` (after `001`-`004`) in Supabase SQL Editor, then rerun `npm run ingest:career-data -- --all --write`.
