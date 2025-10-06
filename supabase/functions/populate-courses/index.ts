import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Course data from the spreadsheet
    const courses = [
      { course_number: "QFGB 8900", course_name: "Greenpoint/Finastra Project" },
      { course_number: "QFGB 8901", course_name: "Basics of Accounting" },
      { course_number: "QFGB 8902", course_name: "Basics of Economics" },
      { course_number: "QFGB 8903", course_name: "Basics of Finance" },
      { course_number: "QFGB 8905", course_name: "Math for Quantitative Finance" },
      { course_number: "QFGB 8906", course_name: "Probability and Statistics" },
      { course_number: "QFGB 890C", course_name: "Cloud Computing and Finance Uses" },
      { course_number: "QFGB 890H", course_name: "Advanced Machine Learning" },
      { course_number: "QFGB 890K", course_name: "Python Bootcamp" },
      { course_number: "QFGB 890M", course_name: "Market Impact Model" },
      { course_number: "QFGB 890N", course_name: "Real Estate Capital Market Analysis" },
      { course_number: "QFGB 890P", course_name: "AI in Asset Management" },
      { course_number: "QFGB 890Q", course_name: "Monte Carlo Simulations" },
      { course_number: "QFGB 890R", course_name: "Machine Learning and LLMs" },
      { course_number: "QFGB 890S", course_name: "Quantitative Asset Management Capstone Consulting Projects" },
      { course_number: "QFGB 890T", course_name: "Blockchain, Cryptocurrency, and Algorithmic Trading" },
      { course_number: "QFGB 890U", course_name: "Advanced Credit Risk Modeling" },
      { course_number: "QFGB 8911", course_name: "Financial Markets and Modeling" },
      { course_number: "QFGB 8914", course_name: "Derivatives" },
      { course_number: "QFGB 8915", course_name: "Introduction to Stochastic Calculus" },
      { course_number: "QFGB 8923", course_name: "Machine Learn & Econometrics" },
      { course_number: "QFGB 8924", course_name: "Advanced Derivatives" },
      { course_number: "QFGB 8925", course_name: "Simulation Applications" },
      { course_number: "QFGB 8926", course_name: "Finance Theory" },
      { course_number: "QFGB 8928", course_name: "Auto Trading Systems - Intro" },
      { course_number: "QFGB 8931", course_name: "Fixed Income Securities" },
      { course_number: "QFGB 8933", course_name: "Time Series Econometrics" },
      { course_number: "QFGB 8934", course_name: "Interest Rate Derivatives" },
      { course_number: "QFGB 8935", course_name: "Risk Management" },
      { course_number: "QFGB 8943", course_name: "Large-Scale Data Modeling" },
      { course_number: "QFGB 8944", course_name: "Credit Risk Mgmt" },
      { course_number: "QFGB 8946", course_name: "Financial Programming" },
      { course_number: "QFGB 8948", course_name: "Quantitative Methods for Portfolio Management" },
      { course_number: "QFGB 8950", course_name: "Alternative Investments" },
      { course_number: "QFGB 8951", course_name: "Internship and Project Report" },
      { course_number: "QFGB 8952", course_name: "Business Comm for Quants A" },
      { course_number: "QFGB 8953", course_name: "Research Seminar 1" },
      { course_number: "QFGB 8954", course_name: "Research Seminar 2" },
      { course_number: "QFGB 8955", course_name: "Computational Finance" },
      { course_number: "QFGB 8957", course_name: "Applied Capital Markets and Financial Regulations" },
      { course_number: "QFGB 8960", course_name: "Advanced C++ for Finance" },
      { course_number: "QFGB 8961", course_name: "Business Comm for Quants B" },
      { course_number: "QFGB 8963", course_name: "Stress Tests and Cap Adequacy" },
      { course_number: "QFGB 8965", course_name: "Trading - Market Making and Algorithms" },
      { course_number: "QFGB 8966", course_name: "Behavioral Finance" },
      { course_number: "QFGB 8967", course_name: "Bank Capital and CCAR" },
      { course_number: "QFGB 8968", course_name: "Blockchain Technology and Application Development" },
      { course_number: "QFGB 8969", course_name: "Systematic Investment Strategies" },
      { course_number: "QFGB 8972", course_name: "Deep Machine Learning" },
      { course_number: "QFGB 8999", course_name: "Independent Study" }
      // Note: This is a small sample. The full function would include all ~2000 courses
    ];

    // Insert courses (upsert to avoid duplicates)
    const { data, error } = await supabaseClient
      .from('courses')
      .upsert(courses, { onConflict: 'course_number' });

    if (error) throw error;

    return new Response(
      JSON.stringify({ message: `Successfully populated ${courses.length} courses`, data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});