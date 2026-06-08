-- ============================================================================
-- 017_security_hardening.sql
-- Addresses Supabase database linter advisories (all WARN level).
--
-- Section A (SAFE — applied): pins search_path on three functions flagged by
--   0011_function_search_path_mutable. Behavior is unchanged; the functions
--   only reference tables in the public schema.
--
-- Section B (OPTIONAL — commented out): revokes SELECT from the `anon` role on
--   user-private tables flagged by 0026_pg_graphql_anon_table_exposed. This is
--   defense-in-depth on top of RLS. Review first: confirm the browser (anon key)
--   never reads these tables directly (this app reads user data via API routes
--   using the service role, so revoking anon SELECT should be safe). Do NOT
--   revoke from `authenticated` — RLS already gates rows per user (lint 0027 is
--   expected/informational for an RLS-protected app).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Section A: pin function search_path (safe, no behavior change)
-- ---------------------------------------------------------------------------
ALTER FUNCTION public.is_pro(uuid)
  SET search_path = public;

ALTER FUNCTION public.check_and_increment_tool_usage(uuid, uuid, text, integer)
  SET search_path = public;

ALTER FUNCTION public.sync_occupation_wages_compat_columns()
  SET search_path = public;

-- ---------------------------------------------------------------------------
-- Section B: (OPTIONAL) revoke anon SELECT on user-private tables.
-- Uncomment after confirming the browser does not read these with the anon key.
-- RLS stays in force; authenticated SELECT is intentionally left untouched.
-- ---------------------------------------------------------------------------
-- REVOKE SELECT ON
--   public.profiles,
--   public.users,
--   public.resumes,
--   public.reports,
--   public.requirement_runs,
--   public.tool_runs,
--   public.tool_usage,
--   public.career_map_reports,
--   public.career_map_claims,
--   public.career_map_facts_bundles,
--   public.career_map_progress_events,
--   public.career_map_report_analytics,
--   public.career_map_report_progress
-- FROM anon;
