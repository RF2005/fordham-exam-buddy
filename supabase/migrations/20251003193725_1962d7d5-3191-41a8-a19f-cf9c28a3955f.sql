-- Add color column to exams table
ALTER TABLE public.exams 
ADD COLUMN color text DEFAULT '#8B5CF6' CHECK (color ~ '^#[0-9A-Fa-f]{6}$');