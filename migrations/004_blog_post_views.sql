-- ============================================================================
-- CareerHeap blog views aggregation (for Popular sort)
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.blog_post_views_daily (
  post_slug text NOT NULL,
  view_date date NOT NULL DEFAULT current_date,
  view_count integer NOT NULL DEFAULT 0 CHECK (view_count >= 0),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (post_slug, view_date)
);

CREATE INDEX IF NOT EXISTS idx_blog_post_views_daily_date
  ON public.blog_post_views_daily(view_date DESC);

ALTER TABLE public.blog_post_views_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read blog post views"
  ON public.blog_post_views_daily FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage blog post views"
  ON public.blog_post_views_daily FOR ALL
  USING (auth.role() = 'service_role');

CREATE OR REPLACE FUNCTION public.increment_blog_post_view(p_post_slug text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.blog_post_views_daily (post_slug, view_date, view_count)
  VALUES (p_post_slug, current_date, 1)
  ON CONFLICT (post_slug, view_date)
  DO UPDATE
    SET view_count = public.blog_post_views_daily.view_count + 1,
        updated_at = timezone('utc'::text, now());
END;
$$;

COMMIT;
