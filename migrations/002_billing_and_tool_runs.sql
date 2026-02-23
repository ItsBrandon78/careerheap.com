-- ============================================================================
-- CareerHeap Billing + Tool Runs
-- Run after migrations/001_initial_schema.sql
-- ============================================================================

BEGIN;

-- 1) Expand profiles for billing + shared usage counter
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS free_uses_used integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_status text,
  ADD COLUMN IF NOT EXISTS stripe_price_id text,
  ADD COLUMN IF NOT EXISTS lifetime_purchased_at timestamp with time zone;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_free_uses_used_non_negative'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_free_uses_used_non_negative
      CHECK (free_uses_used >= 0);
  END IF;
END$$;

-- Backfill free_uses_used from legacy tool_usage if present
UPDATE public.profiles p
SET free_uses_used = u.total_count
FROM (
  SELECT user_id, COALESCE(SUM(count), 0)::integer AS total_count
  FROM public.tool_usage
  WHERE user_id IS NOT NULL
  GROUP BY user_id
) u
WHERE p.id = u.user_id
  AND p.free_uses_used = 0;

-- 2) Canonical run ledger for all tool executions
CREATE TABLE IF NOT EXISTS public.tool_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tool_name text NOT NULL,
  input_hash text,
  status text NOT NULL CHECK (status IN ('success', 'locked', 'failed')),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_tool_runs_user_created
  ON public.tool_runs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tool_runs_user_tool
  ON public.tool_runs(user_id, tool_name);

CREATE INDEX IF NOT EXISTS idx_tool_runs_status
  ON public.tool_runs(status);

ALTER TABLE public.tool_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own tool runs"
  ON public.tool_runs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage tool runs"
  ON public.tool_runs FOR ALL
  USING (auth.role() = 'service_role');

COMMIT;
