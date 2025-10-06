-- Remove email column from notification_preferences table
-- Email will now be retrieved from auth.users instead for better security

ALTER TABLE public.notification_preferences 
DROP COLUMN IF EXISTS email;