-- ============================================================================
-- Career Map Planner execution core alignment
-- Run after migrations/005_career_map_planner_core.sql
-- ============================================================================

BEGIN;

-- 1) Users mirror table (maps to auth.users + profile plan for planner flow)
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE,
  subscription_tier text NOT NULL DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro')),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

INSERT INTO public.users (id, email, subscription_tier, created_at)
SELECT
  p.id,
  p.email,
  CASE WHEN p.plan IN ('pro', 'lifetime') THEN 'pro' ELSE 'free' END,
  p.created_at
FROM public.profiles p
ON CONFLICT (id) DO UPDATE
SET
  email = EXCLUDED.email,
  subscription_tier = EXCLUDED.subscription_tier;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'users'
      AND policyname = 'Users can read own user row'
  ) THEN
    CREATE POLICY "Users can read own user row"
      ON public.users FOR SELECT
      USING (auth.uid() = id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'users'
      AND policyname = 'Service role can manage users mirror'
  ) THEN
    CREATE POLICY "Service role can manage users mirror"
      ON public.users FOR ALL
      USING (auth.role() = 'service_role');
  END IF;
END $$;

-- 2) Resume persistence
CREATE TABLE IF NOT EXISTS public.resumes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  raw_text text NOT NULL,
  parsed_data jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(parsed_data) = 'object'),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_resumes_user_created
  ON public.resumes(user_id, created_at DESC);

ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'resumes'
      AND policyname = 'Users can read own resumes'
  ) THEN
    CREATE POLICY "Users can read own resumes"
      ON public.resumes FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'resumes'
      AND policyname = 'Users can insert own resumes'
  ) THEN
    CREATE POLICY "Users can insert own resumes"
      ON public.resumes FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'resumes'
      AND policyname = 'Service role can manage resumes'
  ) THEN
    CREATE POLICY "Service role can manage resumes"
      ON public.resumes FOR ALL
      USING (auth.role() = 'service_role');
  END IF;
END $$;

-- 3) FX rates (USD base)
CREATE TABLE IF NOT EXISTS public.fx_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  base_currency text NOT NULL CHECK (base_currency IN ('USD')),
  quote_currency text NOT NULL CHECK (quote_currency IN ('CAD')),
  rate numeric(12,6) NOT NULL CHECK (rate > 0),
  source text NOT NULL,
  as_of_date date NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (base_currency, quote_currency, as_of_date)
);

CREATE INDEX IF NOT EXISTS idx_fx_rates_pair_date
  ON public.fx_rates(base_currency, quote_currency, as_of_date DESC);

ALTER TABLE public.fx_rates ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'fx_rates'
      AND policyname = 'FX rates are publicly readable'
  ) THEN
    CREATE POLICY "FX rates are publicly readable"
      ON public.fx_rates FOR SELECT
      USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'fx_rates'
      AND policyname = 'Service role can manage fx rates'
  ) THEN
    CREATE POLICY "Service role can manage fx rates"
      ON public.fx_rates FOR ALL
      USING (auth.role() = 'service_role');
  END IF;
END $$;

-- 4) Reports (planner snapshots)
CREATE TABLE IF NOT EXISTS public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  input_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(input_snapshot) = 'object'),
  scoring_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(scoring_snapshot) = 'object'),
  generated_report jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(generated_report) = 'object'),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_reports_user_created
  ON public.reports(user_id, created_at DESC);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'reports'
      AND policyname = 'Users can read own reports'
  ) THEN
    CREATE POLICY "Users can read own reports"
      ON public.reports FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'reports'
      AND policyname = 'Users can insert own reports'
  ) THEN
    CREATE POLICY "Users can insert own reports"
      ON public.reports FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'reports'
      AND policyname = 'Service role can manage reports'
  ) THEN
    CREATE POLICY "Service role can manage reports"
      ON public.reports FOR ALL
      USING (auth.role() = 'service_role');
  END IF;
END $$;

-- 5) Compatibility columns on existing planner tables
ALTER TABLE public.skills
  ALTER COLUMN aliases DROP DEFAULT;

ALTER TABLE public.skills
  ALTER COLUMN aliases TYPE jsonb USING to_jsonb(aliases);

ALTER TABLE public.skills
  ALTER COLUMN aliases SET DEFAULT '[]'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'skills_aliases_is_array'
      AND conrelid = 'public.skills'::regclass
  ) THEN
    ALTER TABLE public.skills
      ADD CONSTRAINT skills_aliases_is_array
      CHECK (jsonb_typeof(aliases) = 'array');
  END IF;
END $$;

ALTER TABLE public.occupations
  ADD COLUMN IF NOT EXISTS onet_code text,
  ADD COLUMN IF NOT EXISTS noc_code text,
  ADD COLUMN IF NOT EXISTS education_level text,
  ADD COLUMN IF NOT EXISTS regulated boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS trade_code text;

UPDATE public.occupations
SET
  onet_code = COALESCE(onet_code, codes ->> 'onet_soc'),
  noc_code = COALESCE(noc_code, codes ->> 'noc_2021'),
  trade_code = COALESCE(trade_code, codes ->> 'trade_code');

UPDATE public.occupations
SET regulated = true
WHERE regulated = false
  AND (trade_code IS NOT NULL OR lower(title) LIKE '%electrician%' OR lower(title) LIKE '%apprentice%');

CREATE INDEX IF NOT EXISTS idx_occupations_onet_code ON public.occupations(onet_code);
CREATE INDEX IF NOT EXISTS idx_occupations_noc_code ON public.occupations(noc_code);
CREATE INDEX IF NOT EXISTS idx_occupations_regulated ON public.occupations(regulated);

ALTER TABLE public.occupation_wages
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS low numeric(10,2),
  ADD COLUMN IF NOT EXISTS median numeric(10,2),
  ADD COLUMN IF NOT EXISTS high numeric(10,2),
  ADD COLUMN IF NOT EXISTS source_name text,
  ADD COLUMN IF NOT EXISTS as_of_date date;

CREATE OR REPLACE FUNCTION public.sync_occupation_wages_compat_columns()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.country := COALESCE(NEW.country, NULLIF(split_part(NEW.region, '-', 1), ''));
  NEW.low := COALESCE(NEW.low, NEW.wage_low);
  NEW.median := COALESCE(NEW.median, NEW.wage_median);
  NEW.high := COALESCE(NEW.high, NEW.wage_high);
  NEW.source_name := COALESCE(NEW.source_name, NEW.source);
  NEW.as_of_date := COALESCE(NEW.as_of_date, NEW.last_updated);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_occupation_wages_compat ON public.occupation_wages;
CREATE TRIGGER trg_sync_occupation_wages_compat
BEFORE INSERT OR UPDATE ON public.occupation_wages
FOR EACH ROW
EXECUTE FUNCTION public.sync_occupation_wages_compat_columns();

UPDATE public.occupation_wages
SET
  country = COALESCE(country, NULLIF(split_part(region, '-', 1), '')),
  low = COALESCE(low, wage_low),
  median = COALESCE(median, wage_median),
  high = COALESCE(high, wage_high),
  source_name = COALESCE(source_name, source),
  as_of_date = COALESCE(as_of_date, last_updated);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'occupation_wages_country_check'
      AND conrelid = 'public.occupation_wages'::regclass
  ) THEN
    ALTER TABLE public.occupation_wages
      ADD CONSTRAINT occupation_wages_country_check CHECK (country IN ('US', 'CA'));
  END IF;
END $$;

ALTER TABLE public.trade_requirements
  ADD COLUMN IF NOT EXISTS licensing_body text,
  ADD COLUMN IF NOT EXISTS required_hours integer,
  ADD COLUMN IF NOT EXISTS registration_url text;

UPDATE public.trade_requirements
SET
  required_hours = COALESCE(required_hours, hours),
  licensing_body = COALESCE(
    licensing_body,
    CASE
      WHEN province = 'ON' THEN 'Skilled Trades Ontario'
      ELSE null
    END
  ),
  registration_url = COALESCE(
    registration_url,
    official_links #>> '{0,url}'
  );

COMMIT;
