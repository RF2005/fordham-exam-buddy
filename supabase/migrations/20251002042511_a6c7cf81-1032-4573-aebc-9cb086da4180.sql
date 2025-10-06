-- Add time fields to exams table
ALTER TABLE public.exams 
ADD COLUMN start_time TIME,
ADD COLUMN end_time TIME;

-- Add default values for existing records (9 AM - 11 AM)
UPDATE public.exams 
SET start_time = '09:00:00', 
    end_time = '11:00:00' 
WHERE start_time IS NULL;