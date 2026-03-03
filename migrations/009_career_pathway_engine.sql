-- ============================================================================
-- Curated career pathway engine (additive content layer on top of planner data)
-- Run after migrations/008_transition_plan_cache_columns.sql
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.career_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  occupation_id uuid REFERENCES public.occupations(id) ON DELETE SET NULL,
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  summary text NOT NULL,
  noc_2021_code text,
  onet_soc_code text,
  trade_code text,
  role_type text NOT NULL DEFAULT 'occupation' CHECK (role_type IN ('occupation', 'certification', 'specialization')),
  jurisdiction_country text,
  jurisdiction_region text,
  is_regulated boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_career_roles_occupation_id
  ON public.career_roles(occupation_id);

CREATE INDEX IF NOT EXISTS idx_career_roles_region
  ON public.career_roles(jurisdiction_country, jurisdiction_region);

CREATE TABLE IF NOT EXISTS public.career_role_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES public.career_roles(id) ON DELETE CASCADE,
  version integer NOT NULL,
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
  profile_json jsonb NOT NULL CHECK (jsonb_typeof(profile_json) = 'object'),
  sources_hash text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (role_id, version)
);

CREATE INDEX IF NOT EXISTS idx_career_role_versions_role_status
  ON public.career_role_versions(role_id, status, version DESC);

CREATE TABLE IF NOT EXISTS public.career_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_version_id uuid NOT NULL REFERENCES public.career_role_versions(id) ON DELETE CASCADE,
  requirement_type text NOT NULL,
  title text NOT NULL,
  detail text,
  is_mandatory boolean NOT NULL DEFAULT true,
  min_level text,
  est_cost_cad numeric,
  est_time_hours integer,
  sort_order integer NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_career_requirements_role_version
  ON public.career_requirements(role_version_id, sort_order);

CREATE TABLE IF NOT EXISTS public.career_path_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_version_id uuid NOT NULL REFERENCES public.career_role_versions(id) ON DELETE CASCADE,
  step_key text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  phase text NOT NULL,
  est_duration_weeks integer,
  min_duration_weeks integer,
  max_duration_weeks integer,
  prerequisites text[] NOT NULL DEFAULT '{}'::text[],
  deliverables text[] NOT NULL DEFAULT '{}'::text[],
  resources jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(resources) = 'array'),
  sort_order integer NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_career_path_steps_unique_key
  ON public.career_path_steps(role_version_id, step_key);

CREATE INDEX IF NOT EXISTS idx_career_path_steps_role_version
  ON public.career_path_steps(role_version_id, sort_order);

CREATE TABLE IF NOT EXISTS public.credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  credential_type text NOT NULL,
  issuing_body text,
  jurisdiction_country text,
  jurisdiction_region text,
  description text
);

CREATE TABLE IF NOT EXISTS public.role_version_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_version_id uuid NOT NULL REFERENCES public.career_role_versions(id) ON DELETE CASCADE,
  credential_id uuid NOT NULL REFERENCES public.credentials(id) ON DELETE CASCADE,
  is_required boolean NOT NULL DEFAULT true,
  stage text,
  notes text,
  UNIQUE (role_version_id, credential_id)
);

CREATE TABLE IF NOT EXISTS public.career_role_version_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_version_id uuid NOT NULL REFERENCES public.career_role_versions(id) ON DELETE CASCADE,
  source_id text NOT NULL REFERENCES public.dataset_sources(id) ON DELETE CASCADE,
  source_context text
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_career_role_version_sources_unique
  ON public.career_role_version_sources(role_version_id, source_id);

ALTER TABLE public.career_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_role_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_path_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_version_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_role_version_sources ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'career_roles'
      AND policyname = 'Career roles are publicly readable'
  ) THEN
    CREATE POLICY "Career roles are publicly readable"
      ON public.career_roles FOR SELECT
      USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'career_role_versions'
      AND policyname = 'Career role versions are publicly readable'
  ) THEN
    CREATE POLICY "Career role versions are publicly readable"
      ON public.career_role_versions FOR SELECT
      USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'career_requirements'
      AND policyname = 'Career requirements are publicly readable'
  ) THEN
    CREATE POLICY "Career requirements are publicly readable"
      ON public.career_requirements FOR SELECT
      USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'career_path_steps'
      AND policyname = 'Career path steps are publicly readable'
  ) THEN
    CREATE POLICY "Career path steps are publicly readable"
      ON public.career_path_steps FOR SELECT
      USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'credentials'
      AND policyname = 'Credentials are publicly readable'
  ) THEN
    CREATE POLICY "Credentials are publicly readable"
      ON public.credentials FOR SELECT
      USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'role_version_credentials'
      AND policyname = 'Role version credentials are publicly readable'
  ) THEN
    CREATE POLICY "Role version credentials are publicly readable"
      ON public.role_version_credentials FOR SELECT
      USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'career_role_version_sources'
      AND policyname = 'Career role version sources are publicly readable'
  ) THEN
    CREATE POLICY "Career role version sources are publicly readable"
      ON public.career_role_version_sources FOR SELECT
      USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'career_roles'
      AND policyname = 'Service role can manage career roles'
  ) THEN
    CREATE POLICY "Service role can manage career roles"
      ON public.career_roles FOR ALL
      USING (auth.role() = 'service_role');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'career_role_versions'
      AND policyname = 'Service role can manage career role versions'
  ) THEN
    CREATE POLICY "Service role can manage career role versions"
      ON public.career_role_versions FOR ALL
      USING (auth.role() = 'service_role');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'career_requirements'
      AND policyname = 'Service role can manage career requirements'
  ) THEN
    CREATE POLICY "Service role can manage career requirements"
      ON public.career_requirements FOR ALL
      USING (auth.role() = 'service_role');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'career_path_steps'
      AND policyname = 'Service role can manage career path steps'
  ) THEN
    CREATE POLICY "Service role can manage career path steps"
      ON public.career_path_steps FOR ALL
      USING (auth.role() = 'service_role');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'credentials'
      AND policyname = 'Service role can manage credentials'
  ) THEN
    CREATE POLICY "Service role can manage credentials"
      ON public.credentials FOR ALL
      USING (auth.role() = 'service_role');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'role_version_credentials'
      AND policyname = 'Service role can manage role version credentials'
  ) THEN
    CREATE POLICY "Service role can manage role version credentials"
      ON public.role_version_credentials FOR ALL
      USING (auth.role() = 'service_role');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'career_role_version_sources'
      AND policyname = 'Service role can manage career role version sources'
  ) THEN
    CREATE POLICY "Service role can manage career role version sources"
      ON public.career_role_version_sources FOR ALL
      USING (auth.role() = 'service_role');
  END IF;
END $$;

COMMIT;
