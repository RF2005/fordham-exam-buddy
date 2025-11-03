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
 * Parse raw text and extract exam dates
 */
export function parseSyllabusText(text: string): ExtractedExam[] {
  if (!text || text.trim().length === 0) {
    throw new Error('Please enter some text to parse.');
  }
  console.log('Parsing text, length:', text.length);
  const results = extractExamDates(text);
  console.log('Found exams:', results);
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

    // Extract text from each page
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n';
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
 * Extract exam dates and information from text
 */
function extractExamDates(text: string): ExtractedExam[] {
  const exams: ExtractedExam[] = [];
  const lines = text.split('\n');
  console.log('Total lines to parse:', lines.length);

  // Keywords to identify exam-related content (more comprehensive)
  const examKeywords = [
    'exam', 'midterm', 'test', 'quiz', 'quizzes', 'project',
    'presentation', 'final', 'assessment', 'evaluation'
  ];

  // Common date patterns (expanded)
  const datePatterns = [
    // MM/DD/YYYY or MM-DD-YYYY or MM.DD.YYYY
    /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4}|\d{2})/g,
    // Month DD, YYYY (e.g., January 15, 2025)
    /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})/gi,
    // Mon DD, YYYY (e.g., Jan 15, 2025)
    /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+(\d{1,2}),?\s+(\d{4})/gi,
    // DD Month YYYY (e.g., 15 January 2025)
    /(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/gi,
    // Month DD (e.g., January 15) - will use current or next year
    /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})/gi,
    // Mon DD (e.g., Jan 15)
    /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+(\d{1,2})/gi,
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lowerLine = line.toLowerCase();

    // Check if line contains exam-related keywords
    const hasExamKeyword = examKeywords.some(keyword => lowerLine.includes(keyword));

    if (hasExamKeyword) {
      // Skip weekly/recurring quizzes - they need special handling
      const recurringPatterns = /weekly|every week|each week/i;
      if (lowerLine.includes('quiz') && recurringPatterns.test(line)) {
        console.log('Skipping recurring quiz description:', line.substring(0, 100));
        continue;
      }

      // Try to find a date in this line or nearby lines (check more lines)
      let dateFound = false;
      let extractedDate = '';
      let context = line;

      // Check current line and next 3 lines for dates
      for (let j = 0; j <= 3 && i + j < lines.length; j++) {
        const checkLine = lines[i + j];

        for (const pattern of datePatterns) {
          const matches = [...checkLine.matchAll(pattern)];
          if (matches.length > 0) {
            // Take the first match
            dateFound = true;
            extractedDate = matches[0][0];
            if (j > 0) context += ' ' + checkLine;
            break;
          }
        }
        if (dateFound) break;
      }

      if (dateFound && extractedDate) {
        // Determine exam type (check in order of specificity)
        let type: ExtractedExam['type'] = 'exam';
        if (lowerLine.includes('quiz')) type = 'quiz';
        else if (lowerLine.includes('midterm')) type = 'midterm';
        else if (lowerLine.includes('final')) type = 'exam'; // Final exam
        else if (lowerLine.includes('project')) type = 'project';
        else if (lowerLine.includes('presentation')) type = 'presentation';
        else if (lowerLine.includes('test')) type = 'test';

        // Try to extract a title from the line
        let title = line.trim();

        // If the line is too long or generic, create a better title
        if (title.length > 100 || title.length < 3) {
          title = capitalizeType(type);
        } else {
          // Clean up the title
          title = title.replace(/\s+/g, ' ').trim();
          if (title.length > 80) {
            title = title.substring(0, 80) + '...';
          }
        }

        // Convert date to YYYY-MM-DD format
        const standardDate = parseAndStandardizeDate(extractedDate);

        if (standardDate) {
          exams.push({
            title: title || capitalizeType(type),
            date: standardDate,
            type,
            notes: context.trim().substring(0, 300) // Limit notes length
          });
        }
      }
    }
  }

  // Remove duplicates - only if BOTH date AND title match exactly
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
    // Month name to number mapping
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

    // Try MM/DD/YYYY or MM-DD-YYYY or MM.DD.YYYY
    const slashMatch = dateStr.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4}|\d{2})/);
    if (slashMatch) {
      const month = parseInt(slashMatch[1]) - 1;
      const day = parseInt(slashMatch[2]);
      let year = parseInt(slashMatch[3]);
      if (year < 100) year += 2000; // Convert 2-digit year
      date = new Date(year, month, day);
    }

    // Try "Month DD, YYYY" format
    const monthDayYearMatch = dateStr.match(/(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+(\d{1,2}),?\s+(\d{4})/i);
    if (monthDayYearMatch && !date) {
      const monthName = monthDayYearMatch[1].toLowerCase().replace('.', '');
      const month = monthMap[monthName];
      const day = parseInt(monthDayYearMatch[2]);
      const year = parseInt(monthDayYearMatch[3]);
      date = new Date(year, month, day);
    }

    // Try "DD Month YYYY" format
    const dayMonthYearMatch = dateStr.match(/(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i);
    if (dayMonthYearMatch && !date) {
      const day = parseInt(dayMonthYearMatch[1]);
      const monthName = dayMonthYearMatch[2].toLowerCase();
      const month = monthMap[monthName];
      const year = parseInt(dayMonthYearMatch[3]);
      date = new Date(year, month, day);
    }

    // Try "Month DD" format (without year) - assume current or next year
    const monthDayMatch = dateStr.match(/(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+(\d{1,2})/i);
    if (monthDayMatch && !date) {
      const monthName = monthDayMatch[1].toLowerCase().replace('.', '');
      const month = monthMap[monthName];
      const day = parseInt(monthDayMatch[2]);

      // Use current year, or next year if the date has already passed
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
