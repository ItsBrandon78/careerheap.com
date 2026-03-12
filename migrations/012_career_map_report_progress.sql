BEGIN;

CREATE TABLE IF NOT EXISTS public.career_map_report_progress (
  report_id uuid PRIMARY KEY REFERENCES public.career_map_reports(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  progress_state jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(progress_state) = 'object'),
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_career_map_report_progress_user_updated
  ON public.career_map_report_progress(user_id, updated_at DESC);

ALTER TABLE public.career_map_report_progress ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'career_map_report_progress'
      AND policyname = 'Users can read own career map report progress'
  ) THEN
    CREATE POLICY "Users can read own career map report progress"
      ON public.career_map_report_progress FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'career_map_report_progress'
      AND policyname = 'Users can insert own career map report progress'
  ) THEN
    CREATE POLICY "Users can insert own career map report progress"
      ON public.career_map_report_progress FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'career_map_report_progress'
      AND policyname = 'Users can update own career map report progress'
  ) THEN
    CREATE POLICY "Users can update own career map report progress"
      ON public.career_map_report_progress FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'career_map_report_progress'
      AND policyname = 'Service role can manage career map report progress'
  ) THEN
    CREATE POLICY "Service role can manage career map report progress"
      ON public.career_map_report_progress FOR ALL
      USING (auth.role() = 'service_role');
  END IF;
END $$;

COMMIT;
