-- ============================================================================
-- Canada-first overlays and province-aware role metadata
-- Run after migrations/009_career_pathway_engine.sql
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.jurisdictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country text NOT NULL DEFAULT 'CA',
  region text NOT NULL,
  label text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (country, region)
);

INSERT INTO public.jurisdictions (country, region, label)
VALUES
  ('CA', 'ON', 'Ontario'),
  ('CA', 'BC', 'British Columbia'),
  ('CA', 'AB', 'Alberta'),
  ('CA', 'SK', 'Saskatchewan'),
  ('CA', 'MB', 'Manitoba'),
  ('CA', 'QC', 'Quebec'),
  ('CA', 'NB', 'New Brunswick'),
  ('CA', 'NS', 'Nova Scotia'),
  ('CA', 'PE', 'Prince Edward Island'),
  ('CA', 'NL', 'Newfoundland and Labrador'),
  ('CA', 'YT', 'Yukon'),
  ('CA', 'NT', 'Northwest Territories'),
  ('CA', 'NU', 'Nunavut')
ON CONFLICT (country, region) DO UPDATE
SET label = EXCLUDED.label;

ALTER TABLE public.career_roles
  ADD COLUMN IF NOT EXISTS teer smallint,
  ADD COLUMN IF NOT EXISTS jurisdiction_default_id uuid REFERENCES public.jurisdictions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pathway_type text CHECK (
    pathway_type IN ('trade_apprenticeship', 'regulated_profession', 'non_regulated', 'credential_stack')
  );

CREATE TABLE IF NOT EXISTS public.wage_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES public.career_roles(id) ON DELETE CASCADE,
  jurisdiction_id uuid NOT NULL REFERENCES public.jurisdictions(id) ON DELETE CASCADE,
  low_hourly_cad numeric,
  median_hourly_cad numeric,
  high_hourly_cad numeric,
  source text NOT NULL,
  observed_at date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT wage_stats_order CHECK (
    (low_hourly_cad IS NULL OR median_hourly_cad IS NULL OR low_hourly_cad <= median_hourly_cad) AND
    (median_hourly_cad IS NULL OR high_hourly_cad IS NULL OR median_hourly_cad <= high_hourly_cad)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_wage_stats_role_jurisdiction_observed
  ON public.wage_stats(role_id, jurisdiction_id, observed_at);

ALTER TABLE public.jurisdictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wage_stats ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'jurisdictions'
      AND policyname = 'Jurisdictions are publicly readable'
  ) THEN
    CREATE POLICY "Jurisdictions are publicly readable"
      ON public.jurisdictions FOR SELECT
      USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'wage_stats'
      AND policyname = 'Wage stats are publicly readable'
  ) THEN
    CREATE POLICY "Wage stats are publicly readable"
      ON public.wage_stats FOR SELECT
      USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'jurisdictions'
      AND policyname = 'Service role can manage jurisdictions'
  ) THEN
    CREATE POLICY "Service role can manage jurisdictions"
      ON public.jurisdictions FOR ALL
      USING (auth.role() = 'service_role');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'wage_stats'
      AND policyname = 'Service role can manage wage stats'
  ) THEN
    CREATE POLICY "Service role can manage wage stats"
      ON public.wage_stats FOR ALL
      USING (auth.role() = 'service_role');
  END IF;
END $$;

COMMIT;
