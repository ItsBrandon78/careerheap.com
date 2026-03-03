-- ============================================================================
-- Dedicated cache columns for structured transition plans
-- Run after migrations/007_job_requirements_evidence_engine.sql
-- ============================================================================

BEGIN;

ALTER TABLE public.career_map_reports
  ADD COLUMN IF NOT EXISTS transition_structured_plan jsonb;

ALTER TABLE public.career_map_reports
  ADD COLUMN IF NOT EXISTS transition_plan_scripts jsonb;

ALTER TABLE public.career_map_reports
  ADD COLUMN IF NOT EXISTS transition_plan_cache_meta jsonb;

UPDATE public.career_map_reports
SET
  transition_structured_plan = CASE
    WHEN transition_structured_plan IS NULL
      AND jsonb_typeof(output_payload -> 'transitionStructuredPlan') = 'object'
    THEN output_payload -> 'transitionStructuredPlan'
    ELSE transition_structured_plan
  END,
  transition_plan_scripts = CASE
    WHEN transition_plan_scripts IS NULL
      AND jsonb_typeof(output_payload -> 'transitionPlanScripts') = 'object'
    THEN output_payload -> 'transitionPlanScripts'
    ELSE transition_plan_scripts
  END,
  transition_plan_cache_meta = CASE
    WHEN transition_plan_cache_meta IS NULL
      AND jsonb_typeof(output_payload -> 'transitionPlanCacheMeta') = 'object'
    THEN output_payload -> 'transitionPlanCacheMeta'
    ELSE transition_plan_cache_meta
  END
WHERE
  transition_structured_plan IS NULL
  OR transition_plan_scripts IS NULL
  OR transition_plan_cache_meta IS NULL;

COMMIT;
