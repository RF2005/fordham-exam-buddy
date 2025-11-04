import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import { extractTextWithOCR, isImageFile, isLikelyScannedPDF } from './ocrService';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export interface ExtractedExam {
  title: string;
  date: string;
  type: 'exam' | 'midterm' | 'test' | 'quiz' | 'project' | 'presentation' | 'final';
  notes?: string;
}

/**
 * Parse uploaded file and extract text (returns raw text, not parsed exams)
 */
export async function parseSyllabusFile(file: File): Promise<string> {
  const fileType = file.type;
  let text = '';

  try {
    // Check if it's an image file - use OCR directly
    if (isImageFile(file)) {
      console.log('Image file detected, using OCR');
      text = await parseImage(file);
    } else if (fileType === 'application/pdf') {
      text = await parsePDF(file);
    } else if (
      fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      fileType === 'application/msword'
    ) {
      text = await parseDOCX(file);
    } else if (fileType === 'text/plain') {
      text = await parseTXT(file);
    } else {
      throw new Error('Unsupported file type. Please upload PDF, DOCX, TXT, PNG, or JPG files.');
    }

    return text;
  } catch (error) {
    console.error('Error parsing syllabus:', error);
    throw error;
  }
}

/**
 * Parse raw text and extract exam dates using STRICT same-line matching
 */
export function parseSyllabusText(text: string): ExtractedExam[] {
  if (!text || text.trim().length === 0) {
    throw new Error('Please enter some text to parse.');
  }
  const results = extractExamDates(text);
  return results;
}

/**
 * Parse image file using OCR
 */
async function parseImage(file: File): Promise<string> {
  return await extractTextWithOCR(file);
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
 * Parse DOCX file
 */
async function parseDOCX(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

/**
 * Parse TXT file
 */
async function parseTXT(file: File): Promise<string> {
  return await file.text();
}

/**
 * Extract exam dates - STRICT same-line matching only (no lookahead)
 * This prevents false positives from nearby dates
 */
function extractExamDates(text: string): ExtractedExam[] {
  const exams: ExtractedExam[] = [];
  const lines = text.split('\n');

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
    /class\s+schedule/i,
    /weekly\s+reading/i,
    /subject\s+to\s+change/i
  ];

  // Date patterns
  const datePatterns = [
    // MM/DD/YYYY or MM-DD-YYYY or MM/DD/YY
    /(0?[1-9]|1[0-2])[\/\-](0?[1-9]|[12][0-9]|3[01])[\/\-](\d{2,4})/g,
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

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lowerLine = line.toLowerCase();

    // Skip lines with exclusion patterns
    if (exclusionPatterns.some(pattern => pattern.test(line))) {
      continue;
    }

    // Check if line contains exam keyword
    let examType: ExtractedExam['type'] | null = null;
    for (const { pattern, type } of examKeywords) {
      if (pattern.test(line)) {
        examType = type;
        break;
      }
    }

    if (!examType) continue;

    // Look for date on same line or next 2 lines (for multi-line entries)
    // But only if the context suggests it's a due date (contains "due", "on", "by", etc.)
    let dateFound = false;
    let extractedDate = '';
    let context = line;

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

    if (dateFound && extractedDate) {
      // Convert date to YYYY-MM-DD format
      const standardDate = parseAndStandardizeDate(extractedDate);

      if (standardDate) {
        // Extract a clean title from the line
        let title = line.trim();

        // Clean up the title
        if (title.length > 80) {
          title = title.substring(0, 80) + '...';
        }

        exams.push({
          title: title || capitalizeType(examType),
          date: standardDate,
          type: examType,
          notes: line.trim().substring(0, 300)
        });
      }
    }
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
