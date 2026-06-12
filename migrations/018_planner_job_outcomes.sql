-- ============================================================================
-- Planner job outcomes (append-only application/interview/offer events)
-- Powers the future institutional placement-reporting layer. Tenant-ready via
-- nullable org_id so K-12 / university orgs slot in without a migration.
-- Run after migrations/017_security_hardening.sql
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.planner_job_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id uuid,
  plan_id text,
  job_id text NOT NULL,
  job_title text NOT NULL,
  company text NOT NULL,
  stage text NOT NULL DEFAULT 'applied'
    CHECK (stage IN ('applied', 'interviewing', 'offer', 'rejected')),
  source text NOT NULL DEFAULT 'careerheap-planner',
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_planner_job_outcomes_user
  ON public.planner_job_outcomes(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_planner_job_outcomes_org
  ON public.planner_job_outcomes(org_id, created_at DESC);

ALTER TABLE public.planner_job_outcomes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'planner_job_outcomes'
      AND policyname = 'Users can read own job outcomes'
  ) THEN
    CREATE POLICY "Users can read own job outcomes"
      ON public.planner_job_outcomes FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'planner_job_outcomes'
      AND policyname = 'Users can insert own job outcomes'
  ) THEN
    CREATE POLICY "Users can insert own job outcomes"
      ON public.planner_job_outcomes FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'planner_job_outcomes'
      AND policyname = 'Service role can manage job outcomes'
  ) THEN
    CREATE POLICY "Service role can manage job outcomes"
      ON public.planner_job_outcomes FOR ALL
      USING (auth.role() = 'service_role');
  END IF;
END $$;

COMMIT;
