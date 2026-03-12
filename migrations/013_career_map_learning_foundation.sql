BEGIN;

CREATE TABLE IF NOT EXISTS public.career_map_report_analytics (
  report_id uuid PRIMARY KEY REFERENCES public.career_map_reports(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_role_key text NOT NULL,
  target_role_key text NOT NULL,
  current_role_cluster text NOT NULL DEFAULT 'general',
  province_code text NOT NULL DEFAULT 'CA',
  timeline_bucket text,
  generated_score integer CHECK (generated_score IS NULL OR (generated_score >= 0 AND generated_score <= 100)),
  analytics_payload jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(analytics_payload) = 'object'),
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_career_map_report_analytics_lookup
  ON public.career_map_report_analytics(target_role_key, province_code, current_role_cluster, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_career_map_report_analytics_user_updated
  ON public.career_map_report_analytics(user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.career_map_progress_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.career_map_reports(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  event_payload jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(event_payload) = 'object'),
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_career_map_progress_events_report_created
  ON public.career_map_progress_events(report_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_career_map_progress_events_user_created
  ON public.career_map_progress_events(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_career_map_progress_events_type_created
  ON public.career_map_progress_events(event_type, created_at DESC);

CREATE TABLE IF NOT EXISTS public.career_map_transition_priors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_role_key text NOT NULL,
  province_code text NOT NULL DEFAULT 'CA',
  current_role_cluster text NOT NULL DEFAULT 'all',
  sample_size integer NOT NULL DEFAULT 0 CHECK (sample_size >= 0),
  priors_payload jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(priors_payload) = 'object'),
  refreshed_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_career_map_transition_priors_key
  ON public.career_map_transition_priors(target_role_key, province_code, current_role_cluster);

ALTER TABLE public.career_map_report_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_map_progress_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_map_transition_priors ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'career_map_report_analytics'
      AND policyname = 'Users can read own career map report analytics'
  ) THEN
    CREATE POLICY "Users can read own career map report analytics"
      ON public.career_map_report_analytics FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'career_map_report_analytics'
      AND policyname = 'Service role can manage career map report analytics'
  ) THEN
    CREATE POLICY "Service role can manage career map report analytics"
      ON public.career_map_report_analytics FOR ALL
      USING (auth.role() = 'service_role');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'career_map_progress_events'
      AND policyname = 'Users can read own career map progress events'
  ) THEN
    CREATE POLICY "Users can read own career map progress events"
      ON public.career_map_progress_events FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'career_map_progress_events'
      AND policyname = 'Service role can manage career map progress events'
  ) THEN
    CREATE POLICY "Service role can manage career map progress events"
      ON public.career_map_progress_events FOR ALL
      USING (auth.role() = 'service_role');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'career_map_transition_priors'
      AND policyname = 'Transition priors are publicly readable'
  ) THEN
    CREATE POLICY "Transition priors are publicly readable"
      ON public.career_map_transition_priors FOR SELECT
      USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'career_map_transition_priors'
      AND policyname = 'Service role can manage transition priors'
  ) THEN
    CREATE POLICY "Service role can manage transition priors"
      ON public.career_map_transition_priors FOR ALL
      USING (auth.role() = 'service_role');
  END IF;
END $$;

COMMIT;
