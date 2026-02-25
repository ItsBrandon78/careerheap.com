-- ============================================================================
-- Career Map Planner core data model + provenance
-- Run after migrations/004_blog_post_views.sql
-- ============================================================================

BEGIN;

-- 1) Dataset source registry (for provenance and version tracking)
CREATE TABLE IF NOT EXISTS public.dataset_sources (
  id text PRIMARY KEY,
  name text NOT NULL,
  region text NOT NULL CHECK (region IN ('CA', 'US', 'CA_US')),
  source_url text NOT NULL,
  version_label text,
  last_synced_at date,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.dataset_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dataset sources are publicly readable"
  ON public.dataset_sources FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage dataset sources"
  ON public.dataset_sources FOR ALL
  USING (auth.role() = 'service_role');

-- 2) Occupation + skill graph
CREATE TABLE IF NOT EXISTS public.skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  aliases text[] NOT NULL DEFAULT '{}'::text[],
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_skills_name_unique
  ON public.skills ((lower(name)));

CREATE TABLE IF NOT EXISTS public.occupations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  region text NOT NULL CHECK (region IN ('CA', 'US')),
  codes jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(codes) = 'object'),
  description text,
  source text,
  source_url text,
  last_updated date,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_occupations_region ON public.occupations(region);
CREATE INDEX IF NOT EXISTS idx_occupations_codes_gin ON public.occupations USING gin(codes);
CREATE INDEX IF NOT EXISTS idx_occupations_title_lower ON public.occupations ((lower(title)));

CREATE TABLE IF NOT EXISTS public.occupation_skills (
  occupation_id uuid NOT NULL REFERENCES public.occupations(id) ON DELETE CASCADE,
  skill_id uuid NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  weight numeric(6,4) NOT NULL CHECK (weight >= 0 AND weight <= 1),
  source text,
  source_url text,
  last_updated date,
  PRIMARY KEY (occupation_id, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_occupation_skills_skill_id
  ON public.occupation_skills(skill_id);

CREATE TABLE IF NOT EXISTS public.occupation_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  occupation_id uuid NOT NULL REFERENCES public.occupations(id) ON DELETE CASCADE,
  education text,
  certs_licenses jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(certs_licenses) = 'array'),
  notes text,
  source text NOT NULL,
  source_url text,
  last_updated date,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_occupation_requirements_occupation_id
  ON public.occupation_requirements(occupation_id);

CREATE TABLE IF NOT EXISTS public.occupation_wages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  occupation_id uuid NOT NULL REFERENCES public.occupations(id) ON DELETE CASCADE,
  region text NOT NULL,
  wage_low numeric(10,2) CHECK (wage_low IS NULL OR wage_low >= 0),
  wage_median numeric(10,2) CHECK (wage_median IS NULL OR wage_median >= 0),
  wage_high numeric(10,2) CHECK (wage_high IS NULL OR wage_high >= 0),
  currency text NOT NULL CHECK (currency IN ('CAD', 'USD')),
  source text NOT NULL,
  source_url text,
  last_updated date NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT occupation_wages_order CHECK (
    (wage_low IS NULL OR wage_median IS NULL OR wage_low <= wage_median) AND
    (wage_median IS NULL OR wage_high IS NULL OR wage_median <= wage_high)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_occupation_wages_unique_snapshot
  ON public.occupation_wages(occupation_id, region, source, last_updated);

CREATE INDEX IF NOT EXISTS idx_occupation_wages_region
  ON public.occupation_wages(region);

CREATE TABLE IF NOT EXISTS public.trade_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_code text NOT NULL,
  province text NOT NULL,
  occupation_id uuid REFERENCES public.occupations(id) ON DELETE SET NULL,
  hours integer CHECK (hours IS NULL OR hours >= 0),
  levels jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(levels) = 'array'),
  exam_required boolean NOT NULL DEFAULT false,
  official_links jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(official_links) = 'array'),
  notes text,
  source text NOT NULL,
  source_url text,
  last_updated date NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT trade_requirements_unique_trade_per_province UNIQUE (trade_code, province)
);

CREATE INDEX IF NOT EXISTS idx_trade_requirements_trade_code
  ON public.trade_requirements(trade_code);

ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.occupations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.occupation_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.occupation_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.occupation_wages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_requirements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Skills are publicly readable"
  ON public.skills FOR SELECT
  USING (true);

CREATE POLICY "Occupations are publicly readable"
  ON public.occupations FOR SELECT
  USING (true);

CREATE POLICY "Occupation skills are publicly readable"
  ON public.occupation_skills FOR SELECT
  USING (true);

CREATE POLICY "Occupation requirements are publicly readable"
  ON public.occupation_requirements FOR SELECT
  USING (true);

CREATE POLICY "Occupation wages are publicly readable"
  ON public.occupation_wages FOR SELECT
  USING (true);

CREATE POLICY "Trade requirements are publicly readable"
  ON public.trade_requirements FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage skills"
  ON public.skills FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage occupations"
  ON public.occupations FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage occupation skills"
  ON public.occupation_skills FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage occupation requirements"
  ON public.occupation_requirements FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage occupation wages"
  ON public.occupation_wages FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage trade requirements"
  ON public.trade_requirements FOR ALL
  USING (auth.role() = 'service_role');

-- 3) Report persistence + provenance
CREATE TABLE IF NOT EXISTS public.career_map_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_role text NOT NULL,
  target_role text,
  input_payload jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(input_payload) = 'object'),
  normalized_input jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(normalized_input) = 'object'),
  output_payload jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(output_payload) = 'object'),
  score integer CHECK (score IS NULL OR (score >= 0 AND score <= 100)),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_career_map_reports_user_created
  ON public.career_map_reports(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.career_map_facts_bundles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.career_map_reports(id) ON DELETE CASCADE,
  facts_bundle jsonb NOT NULL CHECK (jsonb_typeof(facts_bundle) = 'object'),
  model text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_career_map_facts_bundles_report_id
  ON public.career_map_facts_bundles(report_id);

CREATE TABLE IF NOT EXISTS public.career_map_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.career_map_reports(id) ON DELETE CASCADE,
  section text NOT NULL CHECK (
    section IN (
      'resume_reframe',
      'compatibility_snapshot',
      'suggested_careers',
      'skill_gaps',
      'roadmap',
      'links_resources'
    )
  ),
  claim_text text NOT NULL,
  source_tags jsonb NOT NULL CHECK (
    jsonb_typeof(source_tags) = 'array' AND jsonb_array_length(source_tags) > 0
  ),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_career_map_claims_report_section
  ON public.career_map_claims(report_id, section);

ALTER TABLE public.career_map_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_map_facts_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_map_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own career map reports"
  ON public.career_map_reports FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own career map reports"
  ON public.career_map_reports FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage career map reports"
  ON public.career_map_reports FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Users can read own facts bundles"
  ON public.career_map_facts_bundles FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.career_map_reports r
      WHERE r.id = report_id AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage facts bundles"
  ON public.career_map_facts_bundles FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Users can read own claim provenance"
  ON public.career_map_claims FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.career_map_reports r
      WHERE r.id = report_id AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage career map claims"
  ON public.career_map_claims FOR ALL
  USING (auth.role() = 'service_role');

COMMIT;
