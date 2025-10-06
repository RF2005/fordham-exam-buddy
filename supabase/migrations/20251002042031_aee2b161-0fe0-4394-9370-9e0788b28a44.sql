-- Create table for final exam schedules
CREATE TABLE public.final_exam_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject TEXT NOT NULL,
  course_number TEXT NOT NULL,
  exam_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  semester TEXT NOT NULL,
  year INTEGER NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.final_exam_schedules ENABLE ROW LEVEL SECURITY;

-- Public read access (anyone can view exam schedules)
CREATE POLICY "Anyone can view final exam schedules"
ON public.final_exam_schedules
FOR SELECT
USING (true);

-- Create index for faster lookups
CREATE INDEX idx_final_exam_schedules_subject_course ON public.final_exam_schedules(subject, course_number);

-- Insert real Fordham courses with sample Fall 2025 exam dates
INSERT INTO public.final_exam_schedules (subject, course_number, exam_date, start_time, end_time, semester, year, notes) VALUES
('CISC', '1600', '2025-12-15', '09:00:00', '11:00:00', 'Fall', 2025, 'Computer Science I'),
('CISC', '2000', '2025-12-16', '14:00:00', '16:00:00', 'Fall', 2025, 'Computer Science II'),
('CISC', '1100', '2025-12-17', '09:00:00', '11:00:00', 'Fall', 2025, 'Structures of Computer Science'),
('MATH', '1100', '2025-12-15', '14:00:00', '16:00:00', 'Fall', 2025, 'Finite Mathematics'),
('MATH', '1203', '2025-12-16', '09:00:00', '11:00:00', 'Fall', 2025, 'Applied Calculus I'),
('MATH', '1204', '2025-12-17', '14:00:00', '16:00:00', 'Fall', 2025, 'Applied Calculus II'),
('ENGL', '1101', '2025-12-18', '09:00:00', '11:00:00', 'Fall', 2025, 'Composition I'),
('ENGL', '1102', '2025-12-18', '14:00:00', '16:00:00', 'Fall', 2025, 'Composition II');