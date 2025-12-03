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
  if (sectionNumber?.trim()) {
  }

  try {
    const exams = parseSyllabusText(text, sectionNumber);
    return { exams, parserUsed: 'regex' };
  } catch (error: any) {
    throw new Error(`Parsing failed: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Get a friendly name for the parser type
 */
export function getParserName(type: ParserType): string {
  return 'Built-in Pattern Matching';
}
