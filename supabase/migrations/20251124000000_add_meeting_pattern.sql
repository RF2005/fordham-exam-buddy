-- Add meeting_pattern column to final_exam_schedules table
-- This enables lookup by class meeting times (e.g., "MR 8:30 AM-9:45 AM")

-- Add meeting_pattern column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'final_exam_schedules'
    AND column_name = 'meeting_pattern'
  ) THEN
    ALTER TABLE public.final_exam_schedules ADD COLUMN meeting_pattern TEXT;
  END IF;
END $$;

-- Make subject and course_number nullable since we now support meeting_pattern lookup
ALTER TABLE public.final_exam_schedules
ALTER COLUMN subject DROP NOT NULL;

ALTER TABLE public.final_exam_schedules
ALTER COLUMN course_number DROP NOT NULL;

-- Create index for faster pattern-based lookups (drop if exists first)
DROP INDEX IF EXISTS idx_final_exam_schedules_meeting_pattern;
CREATE INDEX idx_final_exam_schedules_meeting_pattern
ON public.final_exam_schedules(meeting_pattern);

-- Add comment explaining the format
COMMENT ON COLUMN public.final_exam_schedules.meeting_pattern IS
'Class meeting pattern in format "DAYS HH:MM AM/PM-HH:MM AM/PM". Example: "MR 8:30 AM-9:45 AM" (Monday/Thursday). Day codes: M=Monday, T=Tuesday, W=Wednesday, R=Thursday (not T to avoid confusion), F=Friday';
