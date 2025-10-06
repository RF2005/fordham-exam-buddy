-- Improve system_config RLS policy documentation
-- Drop the existing policy
DROP POLICY IF EXISTS "Service role only" ON public.system_config;

-- Recreate with better naming and documentation
-- Note: This policy blocks all RLS access because the service role bypasses RLS entirely.
-- This table is meant to be accessed only by service role operations, not by authenticated users.
COMMENT ON TABLE public.system_config IS 'System configuration table accessible only via service role (bypasses RLS)';

CREATE POLICY "Block direct user access (service role bypasses RLS)"
ON public.system_config
FOR ALL
TO authenticated, anon
USING (false);