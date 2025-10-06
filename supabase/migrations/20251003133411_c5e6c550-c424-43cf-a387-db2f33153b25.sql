-- Create a function to safely set the cron secret
-- This bypasses RLS with SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.set_cron_secret(secret_value text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.system_config (key, value)
  VALUES ('cron_secret', secret_value)
  ON CONFLICT (key) 
  DO UPDATE SET value = EXCLUDED.value;
END;
$$;