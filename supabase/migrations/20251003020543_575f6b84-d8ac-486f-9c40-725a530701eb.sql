-- Drop the old boolean columns and add new days columns
ALTER TABLE public.notification_preferences 
DROP COLUMN IF EXISTS one_week_reminder,
DROP COLUMN IF EXISTS three_day_reminder,
DROP COLUMN IF EXISTS one_day_reminder;

-- Add a new column to store custom reminder days as an array
ALTER TABLE public.notification_preferences 
ADD COLUMN reminder_days integer[] DEFAULT ARRAY[]::integer[];