-- Create a table to store Fordham course information
CREATE TABLE public.courses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_number TEXT NOT NULL UNIQUE,
  course_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view courses (public reference data)
CREATE POLICY "Anyone can view courses"
ON public.courses
FOR SELECT
USING (true);

-- Create an index for faster lookups
CREATE INDEX idx_courses_course_number ON public.courses(course_number);