-- ============================================================================
-- Evidence-driven requirements engine (Adzuna + user posting + baseline)
-- Run after migrations/006_career_map_planner_execution_core.sql
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.job_queries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL,
  location text NOT NULL,
  country text NOT NULL DEFAULT 'ca',
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  last_fetched_at timestamp with time zone,
  fetch_status text NOT NULL DEFAULT 'idle' CHECK (fetch_status IN ('idle', 'fetching', 'success', 'error')),
  error text
);

CREATE INDEX IF NOT EXISTS idx_job_queries_created_at
  ON public.job_queries(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_job_queries_last_fetched_at
  ON public.job_queries(last_fetched_at DESC NULLS LAST);

CREATE UNIQUE INDEX IF NOT EXISTS idx_job_queries_unique_normalized
  ON public.job_queries ((lower(trim(role))), (lower(trim(location))), (lower(trim(country))));

CREATE TABLE IF NOT EXISTS public.job_postings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  provider_job_id text NOT NULL,
  query_id uuid NOT NULL REFERENCES public.job_queries(id) ON DELETE CASCADE,
  title text,
  company text,
  location text,
  description text,
  category text,
  salary_min numeric,
  salary_max numeric,
  contract_type text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  posted_at timestamp with time zone,
  source_url text,
  raw jsonb NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_job_postings_provider_unique
  ON public.job_postings(provider, provider_job_id);

CREATE INDEX IF NOT EXISTS idx_job_postings_query_id
  ON public.job_postings(query_id);

CREATE INDEX IF NOT EXISTS idx_job_postings_created_at
  ON public.job_postings(created_at DESC);

CREATE TABLE IF NOT EXISTS public.job_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query_id uuid NOT NULL REFERENCES public.job_queries(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('gate', 'hard_skill', 'tool', 'experience_signal', 'soft_signal')),
  label text NOT NULL,
  normalized_key text NOT NULL,
  evidence jsonb NOT NULL,
  frequency integer NOT NULL DEFAULT 1 CHECK (frequency >= 1),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_job_requirements_unique_key
  ON public.job_requirements(query_id, type, normalized_key);

CREATE INDEX IF NOT EXISTS idx_job_requirements_query_id
  ON public.job_requirements(query_id);

CREATE INDEX IF NOT EXISTS idx_job_requirements_updated_at
  ON public.job_requirements(updated_at DESC);

CREATE TABLE IF NOT EXISTS public.requirement_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query_id uuid NOT NULL REFERENCES public.job_queries(id) ON DELETE CASCADE,
  started_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  finished_at timestamp with time zone,
  postings_count integer,
  requirements_count integer,
  model text,
  status text NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'error')),
  error text
);

CREATE INDEX IF NOT EXISTS idx_requirement_runs_query_id
  ON public.requirement_runs(query_id, started_at DESC);

ALTER TABLE public.job_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_postings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requirement_runs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'job_queries'
      AND policyname = 'Authenticated users can read job queries'
  ) THEN
    CREATE POLICY "Authenticated users can read job queries"
      ON public.job_queries FOR SELECT
      USING (auth.role() = 'authenticated');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'job_requirements'
      AND policyname = 'Authenticated users can read job requirements'
  ) THEN
    CREATE POLICY "Authenticated users can read job requirements"
      ON public.job_requirements FOR SELECT
      USING (auth.role() = 'authenticated');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'requirement_runs'
      AND policyname = 'Authenticated users can read requirement runs'
  ) THEN
    CREATE POLICY "Authenticated users can read requirement runs"
      ON public.requirement_runs FOR SELECT
      USING (auth.role() = 'authenticated');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'job_queries'
      AND policyname = 'Service role can manage job queries'
  ) THEN
    CREATE POLICY "Service role can manage job queries"
      ON public.job_queries FOR ALL
      USING (auth.role() = 'service_role');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'job_postings'
      AND policyname = 'Service role can manage job postings'
  ) THEN
    CREATE POLICY "Service role can manage job postings"
      ON public.job_postings FOR ALL
      USING (auth.role() = 'service_role');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'job_requirements'
      AND policyname = 'Service role can manage job requirements'
  ) THEN
    CREATE POLICY "Service role can manage job requirements"
      ON public.job_requirements FOR ALL
      USING (auth.role() = 'service_role');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'requirement_runs'
      AND policyname = 'Service role can manage requirement runs'
  ) THEN
    CREATE POLICY "Service role can manage requirement runs"
      ON public.requirement_runs FOR ALL
      USING (auth.role() = 'service_role');
  END IF;
END $$;

COMMIT;
