-- Add location column to exams table
ALTER TABLE public.exams 
ADD COLUMN location text;