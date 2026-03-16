BEGIN;

ALTER TABLE public.career_map_reports
  ADD COLUMN IF NOT EXISTS input_hash text;

CREATE INDEX IF NOT EXISTS idx_career_map_reports_user_input_hash_created
  ON public.career_map_reports(user_id, input_hash, created_at DESC);

COMMIT;

