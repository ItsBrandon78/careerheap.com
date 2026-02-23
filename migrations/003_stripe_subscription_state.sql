-- ============================================================================
-- CareerHeap Stripe subscription state fields
-- Run after migrations/002_billing_and_tool_runs.sql
-- ============================================================================

BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_cancel_at_period_end boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_current_period_end timestamp with time zone;

COMMIT;
