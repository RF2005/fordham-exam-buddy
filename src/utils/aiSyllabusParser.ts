import OpenAI from 'openai';

export interface AIExtractedExam {
  title: string;
  date: string; // YYYY-MM-DD format
  type: 'exam' | 'midterm' | 'test' | 'quiz' | 'project' | 'presentation' | 'final';
  notes?: string;
}

/**
 * Parse syllabus text using OpenAI's GPT-4 for intelligent extraction
 */
export async function parseWithAI(
  syllabusText: string,
  apiKey: string,
  sectionNumber?: string
): Promise<AIExtractedExam[]> {
  if (!apiKey) {
    throw new Error('OpenAI API key is required. Please enter your API key.');
  }

  const openai = new OpenAI({
    apiKey: apiKey,
    dangerouslyAllowBrowser: true // Note: In production, API calls should go through a backend
  });

  const prompt = `You are a syllabus parsing assistant. Extract ALL exam, test, quiz, midterm, and final exam dates from the following college course syllabus.

${sectionNumber ? `The student is in section: ${sectionNumber}. Only extract dates relevant to this section.` : ''}

IMPORTANT INSTRUCTIONS:
1. Extract ONLY assessments with specific dates (ignore recurring/weekly items without dates)
2. For each assessment, provide:
   - title: A brief descriptive title
   - date: In YYYY-MM-DD format
   - type: One of: exam, midterm, test, quiz, project, presentation, final
   - notes: Any relevant context (max 100 characters)

3. If you see "weekly quiz" or similar WITHOUT specific dates, skip it
4. Be careful to extract the correct dates - don't confuse calendar dates with exam dates
5. Return ONLY valid JSON array, no other text

Return the data as a JSON array like this:
[
  {
    "title": "Midterm Exam",
    "date": "2025-10-15",
    "type": "midterm",
    "notes": "Covers chapters 1-5"
  }
]

SYLLABUS TEXT:
${syllabusText}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Using mini for cost efficiency, can upgrade to gpt-4o for better accuracy
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that extracts exam dates from syllabi. Always return valid JSON arrays.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1, // Low temperature for consistent, factual extraction
      max_tokens: 2000,
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from AI');
    }

    // Parse the JSON response
    const parsed = JSON.parse(content);

    // Handle both array and object responses
    const exams = Array.isArray(parsed) ? parsed : (parsed.exams || []);

    // Validate and clean the results
    const validExams: AIExtractedExam[] = exams
      .filter((exam: any) => exam.date && exam.title && exam.type)
      .map((exam: any) => ({
        title: exam.title.substring(0, 200),
        date: exam.date,
        type: exam.type.toLowerCase(),
        notes: exam.notes ? exam.notes.substring(0, 300) : undefined
      }));

    console.log('AI extracted exams:', validExams);
    return validExams;
  } catch (error: any) {
    console.error('AI parsing error:', error);

    if (error.message?.includes('API key')) {
      throw new Error('Invalid OpenAI API key. Please check your API key and try again.');
    }

    throw new Error(`AI parsing failed: ${error.message || 'Unknown error'}`);
  }
}
