-- ============================================================================
-- CareerHeap Supabase Initial Schema
-- Run this in Supabase SQL Editor to set up database
-- ============================================================================

-- ============================================================================
-- 1. Profiles Table (extends auth.users)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE,
  plan text DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'lifetime')),
  stripe_customer_id text UNIQUE,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS: Users can read/update their own profile
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Service role can insert/update (for webhooks)
CREATE POLICY "Service role can manage profiles"
  ON public.profiles FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- 2. Tools Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.tools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  category text,
  icon text DEFAULT '⚙️',
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.tools ENABLE ROW LEVEL SECURITY;

-- RLS: Public read-only access
CREATE POLICY "Tools are publicly readable"
  ON public.tools FOR SELECT
  USING (true);

-- Insert sample tools
INSERT INTO public.tools (slug, name, description, category, icon, is_active)
VALUES
  ('resume-analyzer', 'Resume Analyzer', 'Get AI-powered feedback on your resume with actionable improvements.', 'Career Tools', '📄', true),
  ('cover-letter', 'Cover Letter Writer', 'Create compelling cover letters tailored to job descriptions.', 'Career Tools', '✍️', false),
  ('interview-prep', 'Interview Q&A Prep', 'Prepare for interviews with suggested answers and tips.', 'Career Tools', '🎤', false)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- 3. Tool Usage Table (legacy per-tool usage log)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.tool_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_id uuid NOT NULL REFERENCES public.tools(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  anon_id text,
  count integer DEFAULT 0,
  reset_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  -- Ensure unique constraint on (tool_id, user_id) for logged-in users
  CONSTRAINT unique_user_tool_usage UNIQUE NULLS NOT DISTINCT (tool_id, user_id),
  
  -- Ensure unique constraint on (tool_id, anon_id) for anonymous users
  CONSTRAINT unique_anon_tool_usage UNIQUE NULLS NOT DISTINCT (tool_id, anon_id),
  
  -- At least one of user_id or anon_id must be set
  CONSTRAINT user_or_anon_required CHECK (user_id IS NOT NULL OR anon_id IS NOT NULL)
);

ALTER TABLE public.tool_usage ENABLE ROW LEVEL SECURITY;

-- RLS: Users can read/update own usage
CREATE POLICY "Users can read own tool usage"
  ON public.tool_usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own tool usage"
  ON public.tool_usage FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role can manage all usage (for API routes)
CREATE POLICY "Service role can manage tool usage"
  ON public.tool_usage FOR ALL
  USING (auth.role() = 'service_role');

-- Create indexes for faster queries
CREATE INDEX idx_tool_usage_tool_id ON public.tool_usage(tool_id);
CREATE INDEX idx_tool_usage_user_id ON public.tool_usage(user_id);
CREATE INDEX idx_tool_usage_anon_id ON public.tool_usage(anon_id);

-- ============================================================================
-- 4. Trigger to auto-create profile on signup
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 5. Function to check if user is pro
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_pro(user_id uuid)
RETURNS boolean
LANGUAGE sql
AS $$
  SELECT COALESCE((
    SELECT plan IN ('pro', 'lifetime')
    FROM profiles
    WHERE id = user_id
  ), false);
$$;

-- ============================================================================
-- 6. Function to check/increment tool usage
-- ============================================================================
CREATE OR REPLACE FUNCTION public.check_and_increment_tool_usage(
  p_tool_id uuid,
  p_user_id uuid DEFAULT NULL,
  p_anon_id text DEFAULT NULL,
  p_max_uses integer DEFAULT 3
)
RETURNS TABLE (
  can_use boolean,
  uses_remaining integer
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_usage_count integer;
  v_is_pro boolean;
  v_usage_id uuid;
BEGIN
  -- Check if user is pro
  IF p_user_id IS NOT NULL THEN
    SELECT is_pro(p_user_id) INTO v_is_pro;
    IF v_is_pro THEN
      RETURN QUERY SELECT true::boolean, p_max_uses::integer;
      RETURN;
    END IF;
  END IF;
  
  -- Get or create usage record
  SELECT id, count INTO v_usage_id, v_usage_count
  FROM tool_usage
  WHERE tool_id = p_tool_id
    AND (
      (p_user_id IS NOT NULL AND user_id = p_user_id) OR
      (p_anon_id IS NOT NULL AND anon_id = p_anon_id)
    )
  LIMIT 1;
  
  -- Create if doesn't exist
  IF v_usage_id IS NULL THEN
    INSERT INTO tool_usage (tool_id, user_id, anon_id, count)
    VALUES (p_tool_id, p_user_id, p_anon_id, 0)
    RETURNING id, count INTO v_usage_id, v_usage_count;
  END IF;
  
  -- Check if under limit
  IF v_usage_count >= p_max_uses THEN
    RETURN QUERY SELECT false::boolean, 0::integer;
    RETURN;
  END IF;
  
  -- Increment count
  UPDATE tool_usage
  SET count = count + 1, updated_at = now()
  WHERE id = v_usage_id;
  
  RETURN QUERY SELECT true::boolean, (p_max_uses - v_usage_count - 1)::integer;
END;
$$;

-- ============================================================================
-- End of Migration
-- ============================================================================
COMMIT;
