import { parseWithAI } from './aiSyllabusParser';

export interface ParsedExam {
  title: string;
  date: string;
  type: 'exam' | 'midterm' | 'test' | 'quiz' | 'project' | 'presentation' | 'final';
  notes?: string;
}

export type ParserType = 'chrome-ai' | 'openai';

export interface ParseResult {
  exams: ParsedExam[];
  parserUsed: ParserType;
  error?: string;
  retryAfter?: number;
}

/**
 * Check if Chrome Built-in AI is available
 */
async function isChromeAIAvailable(): Promise<boolean> {
  try {
    // @ts-ignore - Chrome AI API is experimental
    if (!window.ai || !window.ai.languageModel) {
      return false;
    }
    // @ts-ignore
    const capabilities = await window.ai.languageModel.capabilities();
    return capabilities.available === 'readily';
  } catch {
    return false;
  }
}

/**
 * Parse using Chrome Built-in AI (Gemini Nano)
 */
async function parseWithChromeAI(text: string, sectionNumber?: string): Promise<ParsedExam[]> {
  try {
    // @ts-ignore - Chrome AI API
    const session = await window.ai.languageModel.create({
      temperature: 0.1,
      topK: 3,
    });

    const prompt = `Extract ALL exam, test, quiz, midterm, and final exam dates from this syllabus.
${sectionNumber ? `Student section: ${sectionNumber}` : ''}

RULES:
1. Only extract assessments with specific dates
2. Skip "weekly quiz" without dates
3. Return JSON array only

Format:
[{"title":"Midterm Exam","date":"2025-10-15","type":"midterm","notes":"Covers Ch 1-5"}]

SYLLABUS:
${text.substring(0, 10000)}`;

    const result = await session.prompt(prompt);
    session.destroy();

    // Parse the JSON response
    const jsonMatch = result.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Chrome AI parsing error:', error);
    throw error;
  }
}

/**
 * Smart parser that tries Chrome AI first, falls back to OpenAI
 */
export async function parseWithBestAvailableAI(
  text: string,
  sectionNumber?: string,
  openaiApiKey?: string
): Promise<ParseResult> {
  console.log('Starting AI parsing...');

  // Try Chrome Built-in AI first (fastest, free, private) - only if available
  const chromeAvailable = await isChromeAIAvailable();
  if (chromeAvailable) {
    console.log('Using Chrome Built-in AI (Gemini Nano)');
    try {
      const exams = await parseWithChromeAI(text, sectionNumber);
      if (exams.length > 0) {
        return { exams, parserUsed: 'chrome-ai' };
      }
      console.log('Chrome AI found 0 exams, trying OpenAI...');
    } catch (error) {
      console.warn('Chrome AI failed, trying OpenAI...', error);
    }
  } else {
    console.log('Chrome Built-in AI not available (requires Chrome 128+ with experimental AI enabled)');
  }

  // Try OpenAI if API key provided (best quality)
  if (openaiApiKey && openaiApiKey.trim()) {
    console.log('Using OpenAI GPT-4');
    try {
      const exams = await parseWithAI(text, openaiApiKey, sectionNumber);
      return { exams, parserUsed: 'openai' };
    } catch (error: any) {
      console.error('OpenAI parsing failed:', error);
      throw new Error(`OpenAI error: ${error.message || 'Unknown error'}`);
    }
  }

  // No API key and Chrome AI not available
  throw new Error('Please provide an OpenAI API key to parse your syllabus. Get one free at platform.openai.com (new users get $5 credit).');
}

/**
 * Get a friendly name for the parser type
 */
export function getParserName(type: ParserType): string {
  switch (type) {
    case 'chrome-ai':
      return 'Chrome Built-in AI (Free)';
    case 'openai':
      return 'OpenAI GPT-4';
    default:
      return 'AI Parser';
  }
}
