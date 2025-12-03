-- Fix all Supabase security and performance warnings
-- This migration addresses:
-- 1. Mutable search_path in functions
-- 2. RLS policy performance issues (auth.uid() re-evaluation)

-- ============================================================================
-- 1. Fix search_path for set_cron_secret function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.set_cron_secret(secret_value TEXT)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.system_config (key, value)
  VALUES ('cron_secret', secret_value)
  ON CONFLICT (key) DO UPDATE SET value = secret_value;
END;
$$;

-- ============================================================================
-- 2. Fix RLS policies to use (select auth.uid()) for better performance
-- ============================================================================

-- Drop and recreate all RLS policies with optimized auth.uid() calls

-- PROFILES TABLE
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK ((select auth.uid()) = id);

-- EXAMS TABLE
DROP POLICY IF EXISTS "Users can view own exams" ON public.exams;
CREATE POLICY "Users can view own exams" ON public.exams
  FOR SELECT USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own exams" ON public.exams;
CREATE POLICY "Users can insert own exams" ON public.exams
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own exams" ON public.exams;
CREATE POLICY "Users can update own exams" ON public.exams
  FOR UPDATE USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own exams" ON public.exams;
CREATE POLICY "Users can delete own exams" ON public.exams
  FOR DELETE USING ((select auth.uid()) = user_id);

-- NOTIFICATION_PREFERENCES TABLE
DROP POLICY IF EXISTS "Users can view own preferences" ON public.notification_preferences;
CREATE POLICY "Users can view own preferences" ON public.notification_preferences
  FOR SELECT USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own preferences" ON public.notification_preferences;
CREATE POLICY "Users can insert own preferences" ON public.notification_preferences
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own preferences" ON public.notification_preferences;
CREATE POLICY "Users can update own preferences" ON public.notification_preferences
  FOR UPDATE USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own preferences" ON public.notification_preferences;
CREATE POLICY "Users can delete own preferences" ON public.notification_preferences
  FOR DELETE USING ((select auth.uid()) = user_id);

-- ============================================================================
-- Summary of fixes:
-- ✓ Fixed search_path for set_cron_secret function
-- ✓ Fixed search_path for handle_new_user function (previous migration)
-- ✓ Optimized all RLS policies to use (select auth.uid()) instead of auth.uid()
--   This prevents re-evaluation for each row, improving query performance
--
-- Note: The HaveIBeenPwned password protection warning needs to be enabled
-- in the Supabase Dashboard under Authentication > Settings > Password Protection
-- It cannot be enabled via SQL migration.
-- ============================================================================
