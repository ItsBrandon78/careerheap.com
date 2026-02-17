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
3. Copy the entire contents of `migrations/001_initial_schema.sql`
4. Paste into the editor
5. Click **Run**

This creates:
- `tools` table (tool metadata)
- `tool_usage` table (usage tracking with 3-use limit)
- `profiles` table (user plan status)
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

## Troubleshooting

**"No RLS policy found"**: Make sure you ran the full migration script

**Auth not working**: Check redirect URLs match your domain exactly

**Connection refused**: Verify `NEXT_PUBLIC_SUPABASE_URL` is correct
