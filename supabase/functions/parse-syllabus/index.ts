import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { syllabusText, sectionNumber } = await req.json();
    console.log("Parsing syllabus request received", sectionNumber ? `for section: ${sectionNumber}` : "");

    // Input validation
    if (!syllabusText || typeof syllabusText !== 'string') {
      return new Response(
        JSON.stringify({ error: "Syllabus text must be a valid string" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cleanText = syllabusText.trim();
    if (cleanText.length === 0) {
      return new Response(
        JSON.stringify({ error: "Syllabus text cannot be empty" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (cleanText.length > 50000) {
      return new Response(
        JSON.stringify({ error: "Syllabus text too large (max 50,000 characters)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          {
            role: "system",
            content: `You are an expert at extracting exam information from university syllabi. 

${sectionNumber ? `CRITICAL TASK: The student is in section "${sectionNumber}". You MUST:
1. First, carefully scan the entire syllabus to identify ALL section identifiers and their corresponding schedules
2. Confirm which section is "${sectionNumber}" by looking for patterns like:
   - "Section ${sectionNumber}"
   - "L${sectionNumber}" or "Lab ${sectionNumber}"
   - "${sectionNumber}:" followed by schedule information
   - Time/day patterns that match across the syllabus for this section
3. ONLY extract exam information (quizzes, recitations, midterms, finals) that explicitly belongs to section "${sectionNumber}"
4. If you find exam schedules for other sections (like L01, L03, Section 1, etc.), IGNORE them completely
5. In the notes field, always include the specific day/time for ${sectionNumber}'s classes to confirm you found the right section

DO NOT include exams from other sections even if they seem similar.` : 'The syllabus may contain multiple sections. Extract all exam information and include section identifiers in the notes field so the student can identify which applies to them.'}

Return a JSON array of exams with the following structure:
[
  {
    "title": "exam type (e.g., Weekly Quiz #1, Recitation Quiz #2, Midterm 1, Final Exam)",
    "date": "YYYY-MM-DD format",
    "notes": "MUST include: section identifier, day of week, time, location, and any other relevant details",
    "isRecurring": true/false (boolean indicating if this is part of a recurring series)
  }
]

CRITICAL RULES FOR RECURRING EXAMS/QUIZZES:
- If the syllabus mentions "weekly quizzes", "quizzes every week", or similar recurring patterns, you MUST:
  1. Calculate and list EVERY individual occurrence date
  2. Number each occurrence in the title (e.g., "Weekly Quiz #1", "Weekly Quiz #2", etc.)
  3. Set "isRecurring": true for each entry
  4. Skip weeks with holidays, exam weeks, or breaks mentioned in the syllabus
  5. Look at the class schedule to determine which weeks have quizzes
- For one-time exams (midterms, finals), set "isRecurring": false

Other Extraction Rules:
- Convert all dates to YYYY-MM-DD format
- If only month/day is given, assume academic year 2025 (fall semester) or 2025 (spring semester)
- Extract ALL exam types: weekly quizzes, recitation quizzes, midterms, finals
${sectionNumber ? `- Cross-reference class meeting times to verify you have the correct section "${sectionNumber}"` : ''}
- Include complete details in notes: day, time, location, section number, coverage area
- Use the class schedule section to determine exact quiz dates based on the recitation/quiz day
- If no exams found for the specified section, return empty array []`
          },
          {
            role: "user",
            content: cleanText
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_exams",
              description: "Extract all exam dates and information from a syllabus",
              parameters: {
                type: "object",
                properties: {
                  exams: {
                    type: "array",
                    items: {
                      type: "object",
                  properties: {
                    title: { type: "string" },
                    date: { type: "string" },
                    notes: { type: "string" },
                    isRecurring: { type: "boolean" }
                  },
                  required: ["title", "date", "isRecurring"],
                      additionalProperties: false
                    }
                  }
                },
                required: ["exams"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "extract_exams" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log("AI response:", JSON.stringify(data));

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error("No tool call in AI response");
    }

    const examsData = JSON.parse(toolCall.function.arguments);
    console.log("Extracted exams:", examsData);

    return new Response(JSON.stringify(examsData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in parse-syllabus function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
