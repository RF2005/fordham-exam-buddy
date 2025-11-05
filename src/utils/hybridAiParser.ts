import { parseSyllabusText } from './syllabusParser';

export interface ParsedExam {
  title: string;
  date: string;
  type: 'exam' | 'midterm' | 'test' | 'quiz' | 'project' | 'presentation' | 'final';
  notes?: string;
}

export type ParserType = 'regex';

export interface ParseResult {
  exams: ParsedExam[];
  parserUsed: ParserType;
  error?: string;
  retryAfter?: number;
}


/**
 * Parse syllabus text using built-in regex pattern matching
 */
export async function parseWithBestAvailableAI(
  text: string,
  sectionNumber?: string
): Promise<ParseResult> {
  console.log('Starting regex-based parsing...');
  if (sectionNumber?.trim()) {
    console.log(`Filtering by section: ${sectionNumber}`);
  }

  try {
    const exams = parseSyllabusText(text, sectionNumber);
    return { exams, parserUsed: 'regex' };
  } catch (error: any) {
    console.error('Parsing failed:', error);
    throw new Error(`Parsing failed: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Get a friendly name for the parser type
 */
export function getParserName(type: ParserType): string {
  return 'Built-in Pattern Matching';
}
