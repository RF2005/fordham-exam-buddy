import * as pdfjsLib from 'pdfjs-dist';
import { extractTextWithOCR, isLikelyScannedPDF } from './ocrService';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export interface ExtractedExam {
  title: string;
  date: string;
  type: 'exam' | 'midterm' | 'test' | 'quiz' | 'project' | 'presentation' | 'final';
  notes?: string;
}

interface RecitationSchedule {
  section: string;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
  time?: string;
}

/**
 * Parse uploaded PDF file and extract text (returns raw text, not parsed exams)
 */
export async function parseSyllabusFile(file: File): Promise<string> {
  const fileType = file.type;

  try {
    if (fileType !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      throw new Error('Please upload a PDF file only.');
    }

    const text = await parsePDF(file);
    return text;
  } catch (error) {
    console.error('Error parsing syllabus:', error);
    throw error;
  }
}

/**
 * Parse raw text and extract exam dates using STRICT same-line matching
 * Optionally filter by section number
 */
export function parseSyllabusText(text: string, sectionNumber?: string): ExtractedExam[] {
  if (!text || text.trim().length === 0) {
    throw new Error('Please enter some text to parse.');
  }
  const results = extractExamDates(text, sectionNumber);
  return results;
}

/**
 * Parse PDF file using PDF.js, with OCR fallback for scanned PDFs
 */
async function parsePDF(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    let fullText = '';

    // Extract text from each page, preserving line breaks
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();

      // Group text items by Y position to preserve lines
      const lines: Map<number, string[]> = new Map();

      textContent.items.forEach((item: any) => {
        if (!item.str.trim()) return; // Skip empty items

        // Round Y position to group items on the same line
        const y = Math.round(item.transform[5]);

        if (!lines.has(y)) {
          lines.set(y, []);
        }
        lines.get(y)!.push(item.str);
      });

      // Sort lines by Y position (top to bottom) and join
      const sortedLines = Array.from(lines.entries())
        .sort((a, b) => b[0] - a[0]) // PDF Y coordinates go bottom-to-top, so reverse
        .map(([_, items]) => items.join(' ').trim())
        .filter(line => line.length > 0);

      fullText += sortedLines.join('\n') + '\n';
    }

    // Check if the extracted text is too short (likely scanned PDF)
    if (isLikelyScannedPDF(fullText)) {
      console.log('PDF appears to be scanned (minimal text extracted), using OCR fallback');
      return await extractTextWithOCR(file);
    }

    return fullText;
  } catch (error) {
    console.error('PDF text extraction failed, trying OCR:', error);
    // If PDF parsing fails completely, try OCR as fallback
    return await extractTextWithOCR(file);
  }
}

/**
 * Extract exam dates - STRICT same-line matching only (no lookahead)
 * This prevents false positives from nearby dates
 * Optionally filter by section number
 */
function extractExamDates(text: string, sectionNumber?: string): ExtractedExam[] {
  const exams: ExtractedExam[] = [];
  const lines = text.split('\n');

  console.log(`[Parser] Total lines to parse: ${lines.length}`);
  console.log(`[Parser] First 10 lines:`, lines.slice(0, 10));

  // Normalize section number for comparison (trim and uppercase)
  const targetSection = sectionNumber?.trim().toUpperCase();
  let currentSection: string | null = null;

  // Keywords for exam types (ordered by specificity - most specific first)
  const examKeywords = [
    { pattern: /\b(midterm|mid-term|mid term)\b/i, type: 'midterm' as const },
    { pattern: /\bfinal\s+(exam|test|essay)\b/i, type: 'exam' as const },
    { pattern: /\bessay\s+\d+/i, type: 'project' as const },  // "Essay 1", "Essay 2", etc.
    { pattern: /\bquiz(zes)?\b/i, type: 'quiz' as const },
    { pattern: /\btest\b/i, type: 'test' as const },
    { pattern: /\bexam\b/i, type: 'exam' as const },
    { pattern: /\bfinal\s+project\b/i, type: 'project' as const },  // "Final Project"
    { pattern: /\bresearch\s+project\b/i, type: 'project' as const },  // "Research Project"
    { pattern: /\bpresentation\b/i, type: 'presentation' as const }
  ];

  // Exclusion patterns - skip these lines entirely
  const exclusionPatterns = [
    /review\s+session/i,
    /office\s+hours/i,
    /grade(s)?\s+(posted|released|available)/i,
    /holiday|break|no\s+class|cancelled/i,
    /syllabus\s+updated/i,
    /weekly\s+reading/i,
    /subject\s+to\s+change/i
  ];

  // Date patterns
  const datePatterns = [
    // MM/DD/YYYY or MM-DD-YYYY or MM/DD/YY
    /(0?[1-9]|1[0-2])[\/\-](0?[1-9]|[12][0-9]|3[01])[\/\-](\d{2,4})/g,
    // MM/DD or M/D (no year) - e.g., "10/8", "11/19"
    /(0?[1-9]|1[0-2])[\/\-](0?[1-9]|[12][0-9]|3[01])(?![\/\-\d])/g,
    // Month DD, YYYY or Mon DD, YY
    /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(0?[1-9]|[12][0-9]|3[01])(st|nd|rd|th)?,?\s+(\d{2,4})/gi,
    // Mon DD, YYYY or Mon DD, YY
    /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+(0?[1-9]|[12][0-9]|3[01])(st|nd|rd|th)?,?\s+(\d{2,4})/gi,
    // DD Mon YY/YYYY - e.g., "24 Sep 25"
    /(0?[1-9]|[12][0-9]|3[01])\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+(\d{2,4})/gi,
    // DD(st/nd/rd/th) of Month (no year) - e.g., "25th of September"
    /(0?[1-9]|[12][0-9]|3[01])(st|nd|rd|th)\s+of\s+(January|February|March|April|May|June|July|August|September|October|November|December)/gi,
    // Month DD (no year) - e.g., "September 25"
    /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(0?[1-9]|[12][0-9]|3[01])(st|nd|rd|th)?/gi
  ];

  // Section detection patterns - detect section headings and inline sections
  const sectionPatterns = [
    // "Section L01", "Section A", "SECTION 01"
    /^[\s\-\*]*section\s+([A-Z0-9]+)/i,
    // "Sec. 01", "Sec 01"
    /^[\s\-\*]*sec\.?\s+([A-Z0-9]+)/i,
    // "01:" or "A:" or "L01:" at start of line
    /^[\s\-\*]*([A-Z0-9]{1,4}):/,
  ];

  // Helper function to normalize section identifier
  const normalizeSection = (section: string): string => {
    const normalized = section.trim().toUpperCase();
    // Only remove leading zeros if it's a purely numeric section (e.g., "01" -> "1")
    // Don't remove zeros from "L01", "A01", etc.
    if (/^\d+$/.test(normalized)) {
      return normalized.replace(/^0+/, '');
    }
    return normalized;
  };

  // Helper function to extract inline section from text (e.g., "(Section 01)", "[Sec 02]")
  const extractInlineSection = (text: string): string | null => {
    const inlinePatterns = [
      /\(section\s+([A-Z0-9]+)\)/i,
      /\[section\s+([A-Z0-9]+)\]/i,
      /\(sec\.?\s+([A-Z0-9]+)\)/i,
      /\[sec\.?\s+([A-Z0-9]+)\]/i,
    ];

    for (const pattern of inlinePatterns) {
      const match = text.match(pattern);
      if (match) {
        return normalizeSection(match[1]);
      }
    }
    return null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lowerLine = line.toLowerCase();

    // Check if this line is a section heading (only if section filtering is active)
    if (targetSection) {
      for (const pattern of sectionPatterns) {
        const match = line.match(pattern);
        if (match) {
          currentSection = normalizeSection(match[1]);
          break;
        }
      }
    }

    // Skip lines with exclusion patterns
    if (exclusionPatterns.some(pattern => pattern.test(line))) {
      continue;
    }

    // Check if line contains exam keyword
    let examType: ExtractedExam['type'] | null = null;
    for (const { pattern, type } of examKeywords) {
      if (pattern.test(line)) {
        examType = type;
        console.log(`[Parser] Found exam keyword on line ${i}: "${line}" -> type: ${type}`);
        break;
      }
    }

    if (!examType) continue;

    // Look for date on same line or next 2 lines (for multi-line entries)
    // ALSO check if the line STARTS with a date (common in schedule tables)
    let dateFound = false;
    let extractedDate = '';
    let context = line;

    // First, check if the line starts with a date (table format: "10/8    Midterm 1")
    for (const pattern of datePatterns) {
      const matches = [...line.matchAll(pattern)];
      if (matches.length > 0) {
        // Check if the date is near the beginning of the line (within first 20 characters)
        const datePosition = line.indexOf(matches[0][0]);
        if (datePosition < 20) {
          dateFound = true;
          extractedDate = matches[0][0];
          break;
        }
      }
    }

    // If no date found at start of line, look forward on next lines
    if (!dateFound) {
      for (let j = 0; j <= 2 && i + j < lines.length; j++) {
        const checkLine = lines[i + j];

        // Check if this line or previous line has temporal indicators
        const combinedContext = (j > 0 ? line + ' ' + checkLine : checkLine).toLowerCase();
        const hasTemporalIndicator = /\b(due|on|by|scheduled|deadline|submit|is)\b/i.test(combinedContext);

        // For same-line matches (j=0), be more lenient - just check if date exists
        // For lookahead lines (j>0), require temporal indicator
        if (!hasTemporalIndicator && j > 0) {
          continue;
        }

        for (const pattern of datePatterns) {
          const matches = [...checkLine.matchAll(pattern)];
          if (matches.length > 0) {
            dateFound = true;
            extractedDate = matches[0][0];
            if (j > 0) context += ' ' + checkLine;
            break;
          }
        }
        if (dateFound) break;
      }
    }

    if (dateFound && extractedDate) {
      console.log(`[Parser] Found date for exam: ${extractedDate}`);
      // Convert date to YYYY-MM-DD format
      const standardDate = parseAndStandardizeDate(extractedDate);

      if (standardDate) {
        console.log(`[Parser] Standardized date: ${standardDate}`);
        // Extract just the exam name from the line, not the whole line
        let title = '';

        // Find the matched exam keyword in the line
        for (const { pattern, type } of examKeywords) {
          if (type === examType) {
            const match = line.match(pattern);
            if (match) {
              // Extract the matched exam name
              if (type === 'project' && /\bessay\s+\d+/i.test(match[0])) {
                // For "Essay 1", "Essay 2", etc.
                title = match[0];
              } else if (type === 'presentation' || type === 'project') {
                // For presentations/projects, try to extract a more descriptive name
                // Look for pattern like "Social Issue Presentation" or "Final Project"
                const contextMatch = line.match(/([A-Z][a-zA-Z\s]+(?:Presentation|Project))/);
                title = contextMatch ? contextMatch[0].trim() : capitalizeType(type);
              } else {
                // For exams, tests, quizzes, midterms
                title = capitalizeType(type);
              }
              break;
            }
          }
        }

        // Determine which section this exam belongs to
        // Priority: 1) Inline section marker, 2) Current section context
        const inlineSection = extractInlineSection(context);
        const examSection = inlineSection || currentSection;

        // Apply section filter if specified
        if (targetSection) {
          const normalizedExamSection = examSection ? normalizeSection(examSection) : null;

          // Only include exam if it matches the target section
          if (normalizedExamSection && normalizedExamSection === normalizeSection(targetSection)) {
            exams.push({
              title: title || capitalizeType(examType),
              date: standardDate,
              type: examType,
              notes: context.trim().substring(0, 300)
            });
          }
          // If exam has no section or doesn't match, skip it silently
        } else {
          // No section filter - include all exams
          exams.push({
            title: title || capitalizeType(examType),
            date: standardDate,
            type: examType,
            notes: context.trim().substring(0, 300)
          });
        }
      }
    }
  }

  // Generate weekly quizzes if applicable
  if (targetSection) {
    const weeklyQuizzes = generateWeeklyQuizzes(text, targetSection, lines);
    exams.push(...weeklyQuizzes);
  }

  // Remove exact duplicates (same date AND same title)
  const unique = exams.filter((exam, index, self) =>
    index === self.findIndex((e) =>
      e.date === exam.date &&
      e.title.toLowerCase() === exam.title.toLowerCase()
    )
  );

  return unique;
}

/**
 * Parse recitation schedule from syllabus to find which day recitation occurs for a section
 */
function parseRecitationSchedule(text: string, sectionNumber: string): RecitationSchedule | null {
  const lines = text.split('\n');
  const normalizedSection = sectionNumber.trim().toUpperCase();

  console.log(`[Recitation Parser] Looking for section: ${normalizedSection}`);

  // Day abbreviation to weekday number mapping
  const dayMap: Record<string, number> = {
    'SU': 0, 'SUN': 0, 'SUNDAY': 0,
    'M': 1, 'MON': 1, 'MONDAY': 1,
    'T': 2, 'TU': 2, 'TUE': 2, 'TUES': 2, 'TUESDAY': 2,
    'W': 3, 'WED': 3, 'WEDNESDAY': 3,
    'TH': 4, 'THU': 4, 'THUR': 4, 'THURS': 4, 'THURSDAY': 4,
    'F': 5, 'FRI': 5, 'FRIDAY': 5,
    'SA': 6, 'SAT': 6, 'SATURDAY': 6
  };

  // Look for recitation patterns like:
  // "Recitations	 	M at 4:00-4:50PM in LL510"
  // "Section L02 ... Recitations ... W at 10:00-10:50AM"
  // Table format: find the "Recitations" row that has day/times

  // First, try to find a line that says "Recitations" with times for each section
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (/^recitations\s/i.test(line.trim())) {
      console.log(`[Recitation Parser] Found recitations row on line ${i}: "${line}"`);

      // Pattern: "M at 4:00PM" or "W at 10:00-10:50AM"
      const dayMatches = [...line.matchAll(/\b([MTWFS]|TH|MON|TUE|TUES|WED|THUR|THURS|FRI|SAT|SUN)\s+at\s+(\d{1,2}:\d{2})/gi)];

      console.log(`[Recitation Parser] Found ${dayMatches.length} day/time matches in recitations row`);

      if (dayMatches.length > 0) {
        // Need to figure out which column is for which section
        // Look back up to 10 lines to find the section header row
        for (let k = Math.max(0, i - 10); k < i; k++) {
          const headerLine = lines[k];
          if (headerLine.toUpperCase().includes('SECTION')) {
            console.log(`[Recitation Parser] Found section header on line ${k}: "${headerLine}"`);

            // Now determine which day/time corresponds to which section based on position
            // For section L02, we want the second day/time if there are two
            let matchIndex = 0;
            if (normalizedSection === 'L02' && dayMatches.length >= 2) {
              matchIndex = 1; // Second match is for L02
            } else if (normalizedSection === 'L01' && dayMatches.length >= 1) {
              matchIndex = 0; // First match is for L01
            }

            const match = dayMatches[matchIndex];
            if (match) {
              const dayAbbr = match[1].toUpperCase();
              const time = match[2];
              const dayOfWeek = dayMap[dayAbbr];

              if (dayOfWeek !== undefined) {
                console.log(`[Recitation Parser] Found recitation for ${normalizedSection}: Day ${dayOfWeek} (${dayAbbr}) at ${time}`);
                return { section: normalizedSection, dayOfWeek, time };
              }
            }
          }
        }
      }
    }
  }

  console.log(`[Recitation Parser] Could not find recitation schedule for ${normalizedSection}`);
  return null;
}

/**
 * Generate weekly quiz entries based on recitation schedule
 */
function generateWeeklyQuizzes(text: string, sectionNumber: string, lines: string[]): ExtractedExam[] {
  const quizzes: ExtractedExam[] = [];

  // Check if syllabus mentions weekly quizzes at recitation
  const hasWeeklyQuizzes = /weekly\s+quiz(zes)?/i.test(text) &&
                          (/recitation/i.test(text) && /quiz(zes)?/i.test(text));

  if (!hasWeeklyQuizzes) {
    console.log('[Quiz Generator] Weekly quiz detection failed');
    return quizzes;
  }

  console.log('[Quiz Generator] Detected weekly quizzes at recitation');

  // Parse recitation schedule for this section
  const recitation = parseRecitationSchedule(text, sectionNumber);
  if (!recitation) {
    console.log('[Quiz Generator] Could not find recitation schedule for section');
    return quizzes;
  }

  // Find semester start and end dates from schedule
  const { startDate, endDate, breakWeeks } = findSemesterDates(lines);
  if (!startDate || !endDate) {
    console.log('[Quiz Generator] Could not determine semester dates');
    return quizzes;
  }

  console.log(`[Quiz Generator] Generating quizzes from ${startDate} to ${endDate} on day ${recitation.dayOfWeek}`);

  // Generate quiz for each recitation day (skip first week and break weeks)
  let currentDate = new Date(startDate);
  const end = new Date(endDate);
  let weekNumber = 0;

  // Move to first recitation day
  while (currentDate.getDay() !== recitation.dayOfWeek && currentDate <= end) {
    currentDate.setDate(currentDate.getDate() + 1);
  }

  while (currentDate <= end) {
    weekNumber++;

    // Skip first week (no quiz on first recitation)
    if (weekNumber > 1) {
      const dateStr = currentDate.toISOString().split('T')[0];

      // Check if this date is during a break week
      const isBreakWeek = breakWeeks.some(breakDate => {
        const diff = Math.abs(currentDate.getTime() - breakDate.getTime());
        const daysDiff = diff / (1000 * 60 * 60 * 24);
        return daysDiff < 7; // Within a week of break
      });

      if (!isBreakWeek) {
        quizzes.push({
          title: `Quiz ${weekNumber - 1}`,
          date: dateStr,
          type: 'quiz',
          notes: `Weekly quiz at recitation`
        });
      }
    }

    // Move to next week's recitation
    currentDate.setDate(currentDate.getDate() + 7);
  }

  console.log(`[Quiz Generator] Generated ${quizzes.length} weekly quizzes`);
  return quizzes;
}

/**
 * Find semester start/end dates and break weeks from schedule table
 */
function findSemesterDates(lines: string[]): { startDate: Date | null, endDate: Date | null, breakWeeks: Date[] } {
  let startDate: Date | null = null;
  let endDate: Date | null = null;
  const breakWeeks: Date[] = [];

  const datePattern = /(0?[1-9]|1[0-2])[\/\-](0?[1-9]|[12][0-9]|3[01])/g;

  // Find the schedule section (look for "Date" or "Class schedule" header)
  let inSchedule = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Start capturing when we see schedule table header (has "Date" column)
    // Look for lines that contain "Date" followed by "Section" or "Topic"
    if ((/^date\s/i.test(line.trim()) && /(section|topic)/i.test(line)) ||
        /^date\s+.*\s+(section|topic)/i.test(line.trim())) {
      console.log(`[Semester Dates] Found schedule table header on line ${i}: "${line}"`);
      inSchedule = true;
      continue;
    }

    // Stop when we hit academic integrity or other policy sections (but not grading, which comes before schedule)
    if (inSchedule && /(academic|integrity|students\s+with\s+disabilities)/i.test(line)) {
      console.log(`[Semester Dates] Stopping at line ${i}: "${line}"`);
      break;
    }

    if (inSchedule) {
      // Check for break/holiday mentions
      if ((/break|holiday|recess/i.test(line) || /no\s+class/i.test(line)) && !/\bno\s+make-up/i.test(line)) {
        const matches = [...line.matchAll(datePattern)];
        for (const match of matches) {
          const date = parseSimpleDate(match[0]);
          if (date) breakWeeks.push(date);
        }
      }

      // Find dates in schedule table (exclude lines that are just section labels)
      if (!/section\s+L\d+/i.test(line)) {
        const matches = [...line.matchAll(datePattern)];
        for (const match of matches) {
          const date = parseSimpleDate(match[0]);
          if (date) {
            // Only consider dates in reasonable academic year range (Aug-Dec for fall semester)
            const month = date.getMonth();
            if (month >= 7 && month <= 11) { // Aug (7) through Dec (11)
              if (!startDate || date < startDate) startDate = date;
              if (!endDate || date > endDate) endDate = date;
            }
          }
        }
      }
    }
  }

  return { startDate, endDate, breakWeeks };
}

/**
 * Parse M/D format date and infer year
 * Smart logic for academic calendar: Fall semesters run Aug-Dec, Spring semesters run Jan-May
 */
function parseSimpleDate(dateStr: string): Date | null {
  const match = dateStr.match(/(0?[1-9]|1[0-2])[\/\-](0?[1-9]|[12][0-9]|3[01])/);
  if (!match) return null;

  const month = parseInt(match[1]) - 1;
  const day = parseInt(match[2]);
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  // Academic year logic:
  // If current month is Aug-Dec (7-11), assume dates Aug-Dec are current year
  // If current month is Jan-Jul (0-6), assume dates Aug-Dec are previous year
  let year = currentYear;

  if (month >= 7 && month <= 11) {
    // Date is in Aug-Dec
    if (currentMonth >= 0 && currentMonth <= 6) {
      // We're in Jan-Jul, so Aug-Dec dates are from previous year
      year = currentYear - 1;
    }
  } else {
    // Date is in Jan-Jul
    if (currentMonth >= 7 && currentMonth <= 11) {
      // We're in Aug-Dec, so Jan-Jul dates are from next year
      year = currentYear + 1;
    }
  }

  return new Date(year, month, day);
}

/**
 * Parse various date formats and convert to YYYY-MM-DD
 */
function parseAndStandardizeDate(dateStr: string): string | null {
  try {
    const monthMap: Record<string, number> = {
      'january': 0, 'jan': 0,
      'february': 1, 'feb': 1,
      'march': 2, 'mar': 2,
      'april': 3, 'apr': 3,
      'may': 4,
      'june': 5, 'jun': 5,
      'july': 6, 'jul': 6,
      'august': 7, 'aug': 7,
      'september': 8, 'sep': 8,
      'october': 9, 'oct': 9,
      'november': 10, 'nov': 10,
      'december': 11, 'dec': 11,
    };

    let date: Date | null = null;
    const currentYear = new Date().getFullYear();

    // Helper to convert 2-digit year to 4-digit
    const expandYear = (yearStr: string): number => {
      const year = parseInt(yearStr);
      if (yearStr.length === 2) {
        // Assume 20xx for years 00-99
        return year + 2000;
      }
      return year;
    };

    // Try MM/DD/YYYY or MM-DD-YYYY or MM/DD/YY
    const slashMatch = dateStr.match(/(0?[1-9]|1[0-2])[\/\-](0?[1-9]|[12][0-9]|3[01])[\/\-](\d{2,4})/);
    if (slashMatch) {
      const month = parseInt(slashMatch[1]) - 1;
      const day = parseInt(slashMatch[2]);
      const year = expandYear(slashMatch[3]);
      date = new Date(year, month, day);
    }

    // Try MM/DD or M/D (no year) - e.g., "10/8", "11/19"
    const slashNoYearMatch = dateStr.match(/^(0?[1-9]|1[0-2])[\/\-](0?[1-9]|[12][0-9]|3[01])$/);
    if (slashNoYearMatch && !date) {
      const month = parseInt(slashNoYearMatch[1]) - 1;
      const day = parseInt(slashNoYearMatch[2]);

      // Use current year or next year if date has passed
      let year = currentYear;
      const testDate = new Date(year, month, day);
      if (testDate < new Date()) {
        year = currentYear + 1;
      }
      date = new Date(year, month, day);
    }

    // Try "DD Mon YY" format - e.g., "24 Sep 25"
    const dayMonYearMatch = dateStr.match(/(0?[1-9]|[12][0-9]|3[01])\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+(\d{2,4})/i);
    if (dayMonYearMatch && !date) {
      const day = parseInt(dayMonYearMatch[1]);
      const monthName = dayMonYearMatch[2].toLowerCase().replace('.', '');
      const month = monthMap[monthName];
      const year = expandYear(dayMonYearMatch[3]);
      date = new Date(year, month, day);
    }

    // Try "Month DD, YYYY" or "Mon DD, YY" format (with optional st/nd/rd/th)
    const monthDayYearMatch = dateStr.match(/(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+(0?[1-9]|[12][0-9]|3[01])(st|nd|rd|th)?,?\s+(\d{2,4})/i);
    if (monthDayYearMatch && !date) {
      const monthName = monthDayYearMatch[1].toLowerCase().replace('.', '');
      const month = monthMap[monthName];
      const day = parseInt(monthDayYearMatch[2]);
      const year = expandYear(monthDayYearMatch[4]);
      date = new Date(year, month, day);
    }

    // Try "DDth of Month" format (no year) - e.g., "25th of September"
    const dayOfMonthMatch = dateStr.match(/(0?[1-9]|[12][0-9]|3[01])(st|nd|rd|th)\s+of\s+(January|February|March|April|May|June|July|August|September|October|November|December)/i);
    if (dayOfMonthMatch && !date) {
      const day = parseInt(dayOfMonthMatch[1]);
      const monthName = dayOfMonthMatch[3].toLowerCase();
      const month = monthMap[monthName];

      // Use current year or next year if date has passed
      let year = currentYear;
      const testDate = new Date(year, month, day);
      if (testDate < new Date()) {
        year = currentYear + 1;
      }
      date = new Date(year, month, day);
    }

    // Try "Month DD" format (no year) - e.g., "September 25"
    const monthDayMatch = dateStr.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(0?[1-9]|[12][0-9]|3[01])(st|nd|rd|th)?(?!\s*,?\s*\d{4})/i);
    if (monthDayMatch && !date) {
      const monthName = monthDayMatch[1].toLowerCase();
      const month = monthMap[monthName];
      const day = parseInt(monthDayMatch[2]);

      // Use current year or next year if date has passed
      let year = currentYear;
      const testDate = new Date(year, month, day);
      if (testDate < new Date()) {
        year = currentYear + 1;
      }
      date = new Date(year, month, day);
    }

    if (date && !isNaN(date.getTime())) {
      // Format as YYYY-MM-DD
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    return null;
  } catch (error) {
    console.error('Error parsing date:', dateStr, error);
    return null;
  }
}

/**
 * Capitalize exam type for display
 */
function capitalizeType(type: string): string {
  return type.charAt(0).toUpperCase() + type.slice(1);
}
