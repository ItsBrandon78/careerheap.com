BEGIN;

CREATE TABLE IF NOT EXISTS public.planner_role_enrichment_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key text NOT NULL UNIQUE,
  target_role_key text NOT NULL,
  province_code text NOT NULL,
  current_role_cluster text NOT NULL DEFAULT 'all',
  target_role text NOT NULL,
  source_current_role text,
  profile_slug text,
  training_source_path text NOT NULL DEFAULT 'none',
  wage_source_path text NOT NULL DEFAULT 'none',
  source_urls jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(source_urls) = 'array'),
  enrichment_payload jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(enrichment_payload) = 'object'),
  retrieved_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_planner_role_enrichment_cache_lookup
  ON public.planner_role_enrichment_cache(target_role_key, province_code, current_role_cluster, expires_at DESC);

CREATE INDEX IF NOT EXISTS idx_planner_role_enrichment_cache_expires
  ON public.planner_role_enrichment_cache(expires_at);

ALTER TABLE public.planner_role_enrichment_cache ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'planner_role_enrichment_cache'
      AND policyname = 'Service role can manage planner role enrichment cache'
  ) THEN
    CREATE POLICY "Service role can manage planner role enrichment cache"
      ON public.planner_role_enrichment_cache FOR ALL
      USING (auth.role() = 'service_role');
  END IF;
END $$;

COMMIT;
