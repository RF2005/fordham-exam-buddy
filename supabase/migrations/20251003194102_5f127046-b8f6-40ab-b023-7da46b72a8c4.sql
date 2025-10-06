-- Update default color for exams table to Fordham maroon
ALTER TABLE public.exams 
ALTER COLUMN color SET DEFAULT '#821537';