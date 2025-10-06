-- Remove email column from profiles table to reduce PII exposure
-- Email is already securely stored in auth.users table
ALTER TABLE public.profiles DROP COLUMN IF EXISTS email;

-- Update the trigger function to not insert email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (new.id);
  RETURN new;
END;
$$;