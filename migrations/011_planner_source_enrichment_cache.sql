-- ============================================================================
-- Planner source enrichment cache
-- Run after migrations/010_canada_first_overlays.sql
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.planner_source_enrichment_cache (
  cache_key text PRIMARY KEY,
  target_role text NOT NULL,
  province text NOT NULL,
  profile_slug text,
  training_source_path text NOT NULL DEFAULT 'none',
  wage_source_path text NOT NULL DEFAULT 'none',
  enrichment_payload jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(enrichment_payload) = 'object'),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_planner_source_enrichment_cache_expires
  ON public.planner_source_enrichment_cache(expires_at);

ALTER TABLE public.planner_source_enrichment_cache ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'planner_source_enrichment_cache'
      AND policyname = 'Service role can manage planner source enrichment cache'
  ) THEN
    CREATE POLICY "Service role can manage planner source enrichment cache"
      ON public.planner_source_enrichment_cache FOR ALL
      USING (auth.role() = 'service_role');
  END IF;
END $$;

COMMIT;
