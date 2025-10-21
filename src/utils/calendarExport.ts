interface Exam {
  id: string;
  course: string;
  title: string;
  exam_date: string;
  start_time?: string | null;
  end_time?: string | null;
  location?: string | null;
  notes?: string | null;
}

/**
 * Formats a date-time string for iCalendar format (YYYYMMDDTHHMMSS)
 */
const formatICalDateTime = (date: string, time?: string | null): string => {
  const dateObj = new Date(date);

  if (time) {
    const [hours, minutes] = time.split(':');
    dateObj.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  } else {
    // Default to 9:00 AM if no time specified
    dateObj.setHours(9, 0, 0, 0);
  }

  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  const hour = String(dateObj.getHours()).padStart(2, '0');
  const minute = String(dateObj.getMinutes()).padStart(2, '0');

  return `${year}${month}${day}T${hour}${minute}00`;
};

/**
 * Formats date for all-day events (YYYYMMDD)
 */
const formatICalDate = (date: string): string => {
  const dateObj = new Date(date);
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');

  return `${year}${month}${day}`;
};

/**
 * Escapes special characters for iCalendar format
 */
const escapeICalText = (text: string): string => {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
};

/**
 * Calculates date for alarm/reminder (days before exam)
 */
const calculateAlarmDate = (examDate: string, examTime: string | null | undefined, daysBefore: number): string => {
  const dateObj = new Date(examDate);

  if (examTime) {
    const [hours, minutes] = examTime.split(':');
    dateObj.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  } else {
    dateObj.setHours(9, 0, 0, 0);
  }

  // Subtract the specified number of days
  dateObj.setDate(dateObj.getDate() - daysBefore);

  return formatICalDateTime(dateObj.toISOString().split('T')[0],
    `${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`);
};

/**
 * Generates .ics file content from exam data
 */
export const generateICSFile = (exams: Exam[]): string => {
  const now = new Date();
  const timestamp = formatICalDateTime(
    now.toISOString().split('T')[0],
    `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  );

  let icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Fordham Exam Buddy//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Fordham Exams',
    'X-WR-TIMEZONE:America/New_York',
    ''
  ].join('\r\n');

  exams.forEach((exam) => {
    const hasTime = exam.start_time && exam.end_time;
    const dtStart = hasTime
      ? `DTSTART:${formatICalDateTime(exam.exam_date, exam.start_time)}`
      : `DTSTART;VALUE=DATE:${formatICalDate(exam.exam_date)}`;

    const dtEnd = hasTime
      ? `DTEND:${formatICalDateTime(exam.exam_date, exam.end_time)}`
      : `DTEND;VALUE=DATE:${formatICalDate(exam.exam_date)}`;

    const summary = escapeICalText(`${exam.course} - ${exam.title}`);
    const description = exam.notes ? escapeICalText(exam.notes) : '';
    const location = exam.location ? escapeICalText(exam.location) : '';
    const uid = `${exam.id}@fordham-exam-buddy.com`;

    icsContent += [
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${timestamp}`,
      dtStart,
      dtEnd,
      `SUMMARY:${summary}`,
      description ? `DESCRIPTION:${description}` : '',
      location ? `LOCATION:${location}` : '',
      'STATUS:CONFIRMED',
      'SEQUENCE:0',
      ''
    ].filter(line => line !== '').join('\r\n');

    // Add reminders for 7, 3, and 1 days before
    const reminderDays = [7, 3, 1];
    reminderDays.forEach((days) => {
      icsContent += [
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        `DESCRIPTION:Reminder: ${summary} in ${days} day${days > 1 ? 's' : ''}`,
        `TRIGGER;VALUE=DATE-TIME:${calculateAlarmDate(exam.exam_date, exam.start_time, days)}`,
        'END:VALARM',
        ''
      ].join('\r\n');
    });

    icsContent += 'END:VEVENT\r\n';
  });

  icsContent += 'END:VCALENDAR\r\n';

  return icsContent;
};

/**
 * Triggers download of .ics file
 */
export const downloadICSFile = (exams: Exam[], filename: string = 'fordham-exams.ics'): void => {
  const icsContent = generateICSFile(exams);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
};
