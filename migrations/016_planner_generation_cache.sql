BEGIN;

CREATE TABLE IF NOT EXISTS public.planner_generation_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key text NOT NULL UNIQUE,
  input_hash text NOT NULL,
  cache_version text NOT NULL,
  cache_mode text NOT NULL,
  normalized_input jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(normalized_input) = 'object'),
  response_payload jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(response_payload) = 'object'),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_planner_generation_cache_lookup
  ON public.planner_generation_cache(cache_key, expires_at DESC);

CREATE INDEX IF NOT EXISTS idx_planner_generation_cache_input_hash
  ON public.planner_generation_cache(input_hash, expires_at DESC);

ALTER TABLE public.planner_generation_cache ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'planner_generation_cache'
      AND policyname = 'Service role can manage planner generation cache'
  ) THEN
    CREATE POLICY "Service role can manage planner generation cache"
      ON public.planner_generation_cache FOR ALL
      USING (auth.role() = 'service_role');
  END IF;
END $$;

COMMIT;

