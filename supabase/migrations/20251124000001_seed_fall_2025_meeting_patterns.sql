-- Seed Fall 2025 Final Exam Schedule with Meeting Patterns
-- Exam Period: December 12-19, 2025
-- Based on official Fordham University Fall 2025 Final Exam Schedule

-- Clear any existing Fall 2025 data first
DELETE FROM public.final_exam_schedules
WHERE semester = 'Fall' AND year = 2025;

-- Monday/Thursday (MR) Classes
INSERT INTO public.final_exam_schedules (meeting_pattern, exam_date, start_time, end_time, semester, year, notes) VALUES
('MR 8:30 AM-9:45 AM', '2025-12-19', '09:30:00', '11:30:00', 'Fall', 2025, 'Block A'),
('MR 10:00 AM-11:15 AM', '2025-12-18', '09:30:00', '11:30:00', 'Fall', 2025, 'Block B'),
('MR 11:30 AM-12:45 PM', '2025-12-15', '09:30:00', '11:30:00', 'Fall', 2025, 'Block C'),
('MR 2:30 PM-3:45 PM', '2025-12-15', '13:30:00', '15:30:00', 'Fall', 2025, 'Block D'),
('MR 4:00 PM-5:15 PM', '2025-12-18', '13:30:00', '15:30:00', 'Fall', 2025, 'Block E'),
('MR 5:30 PM-6:45 PM', '2025-12-15', '17:30:00', '19:30:00', 'Fall', 2025, 'Block Y - Evening');

-- Tuesday/Friday (TF) Classes
INSERT INTO public.final_exam_schedules (meeting_pattern, exam_date, start_time, end_time, semester, year, notes) VALUES
('TF 8:30 AM-9:45 AM', '2025-12-16', '09:30:00', '11:30:00', 'Fall', 2025, 'Block F'),
('TF 10:00 AM-11:15 AM', '2025-12-12', '09:30:00', '11:30:00', 'Fall', 2025, 'Block G'),
('TF 11:30 AM-12:45 PM', '2025-12-19', '13:30:00', '15:30:00', 'Fall', 2025, 'Block H'),
('TF 1:00 PM-2:15 PM', '2025-12-12', '13:30:00', '15:30:00', 'Fall', 2025, 'Block I'),
('TF 2:30 PM-3:45 PM', '2025-12-16', '13:30:00', '15:30:00', 'Fall', 2025, 'Block J');

-- Monday/Wednesday (MW) Classes
INSERT INTO public.final_exam_schedules (meeting_pattern, exam_date, start_time, end_time, semester, year, notes) VALUES
('MW 11:30 AM-12:45 PM', '2025-12-15', '09:30:00', '11:30:00', 'Fall', 2025, 'Block K'),
('MW 1:00 PM-2:15 PM', '2025-12-17', '13:30:00', '15:30:00', 'Fall', 2025, 'Block L');

-- Tuesday/Wednesday/Friday (TWF) Classes
INSERT INTO public.final_exam_schedules (meeting_pattern, exam_date, start_time, end_time, semester, year, notes) VALUES
('TWF 8:30 AM-9:20 AM', '2025-12-16', '09:30:00', '11:30:00', 'Fall', 2025, 'Block M'),
('TWF 9:30 AM-10:20 AM', '2025-12-17', '09:30:00', '11:30:00', 'Fall', 2025, 'Block N'),
('TWF 10:30 AM-11:20 AM', '2025-12-12', '09:30:00', '11:30:00', 'Fall', 2025, 'Block O'),
('TWF 11:30 AM-12:20 PM', '2025-12-19', '13:30:00', '15:30:00', 'Fall', 2025, 'Block P'),
('TWF 12:30 PM-1:20 PM', '2025-12-12', '13:30:00', '15:30:00', 'Fall', 2025, 'Block Q'),
('TWF 1:30 PM-2:20 PM', '2025-12-17', '13:30:00', '15:30:00', 'Fall', 2025, 'Block R');

-- Tuesday Only (T) Classes
INSERT INTO public.final_exam_schedules (meeting_pattern, exam_date, start_time, end_time, semester, year, notes) VALUES
('T 2:30 PM-5:15 PM', '2025-12-16', '13:30:00', '15:30:00', 'Fall', 2025, 'Block V');

-- Wednesday Only (W) Classes
INSERT INTO public.final_exam_schedules (meeting_pattern, exam_date, start_time, end_time, semester, year, notes) VALUES
('W 8:30 AM-11:15 AM', '2025-12-17', '09:30:00', '11:30:00', 'Fall', 2025, 'Block W'),
('W 11:30 AM-2:15 PM', '2025-12-17', '13:30:00', '15:30:00', 'Fall', 2025, 'Block X'),
('W 2:30 PM-5:15 PM', '2025-12-17', '16:00:00', '18:00:00', 'Fall', 2025, 'Block YE');

-- Wednesday/Friday (WF) Classes
INSERT INTO public.final_exam_schedules (meeting_pattern, exam_date, start_time, end_time, semester, year, notes) VALUES
('WF 8:30 AM-9:45 AM', '2025-12-17', '09:30:00', '11:30:00', 'Fall', 2025, 'Block W1'),
('WF 10:00 AM-11:15 AM', '2025-12-12', '09:30:00', '11:30:00', 'Fall', 2025, 'Block W2');

-- Tuesday/Thursday Evening (TR) Classes
INSERT INTO public.final_exam_schedules (meeting_pattern, exam_date, start_time, end_time, semester, year, notes) VALUES
('TR 5:30 PM-6:45 PM', '2025-12-16', '17:30:00', '19:30:00', 'Fall', 2025, 'Block Z - Evening');

-- Special Cases
INSERT INTO public.final_exam_schedules (meeting_pattern, exam_date, start_time, end_time, semester, year, notes) VALUES
('Saturday Classes', '2025-12-13', '09:30:00', '11:30:00', 'Fall', 2025, 'Saturday exam - check with instructor for exact time');

-- Note: Special courses like ACBU 2222 (Accounting) and language levels can be added with subject/course_number fields
-- Language courses (levels 1001, 1002, 1501, 1502, 2001, SPAN 2301) have exams on Thursday, Dec 11 at 2:30 PM (reading day)
