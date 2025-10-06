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

    console.log('Starting course import...');

    // Complete course data from Fordham spreadsheet
    // Format: "DEPT CODE|Course Name"
    const coursesRaw = `QFGB 8900|Greenpoint/Finastra Project
QFGB 8901|Basics of Accounting
QFGB 8902|Basics of Economics
QFGB 8903|Basics of Finance
QFGB 8905|Math for Quantitative Finance
QFGB 8906|Probability and Statistics
QFGB 890C|Cloud Computing and Finance Uses
QFGB 890H|Advanced Machine Learning
QFGB 890K|Python Bootcamp
QFGB 890M|Market Impact Model
QFGB 890N|Real Estate Capital Market Analysis
QFGB 890P|AI in Asset Management
QFGB 890Q|Monte Carlo Simulations
QFGB 890R|Machine Learning and LLMs
QFGB 890S|Quantitative Asset Management Capstone Consulting Projects
QFGB 890T|Blockchain, Cryptocurrency, and Algorithmic Trading
QFGB 890U|Advanced Credit Risk Modeling
QFGB 8911|Financial Markets and Modeling
QFGB 8914|Derivatives
QFGB 8915|Introduction to Stochastic Calculus
QFGB 8923|Machine Learn & Econometrics
QFGB 8924|Advanced Derivatives
QFGB 8925|Simulation Applications
QFGB 8926|Finance Theory
QFGB 8928|Auto Trading Systems - Intro
QFGB 8931|Fixed Income Securities
QFGB 8933|Time Series Econometrics
QFGB 8934|Interest Rate Derivatives
QFGB 8935|Risk Management
QFGB 8943|Large-Scale Data Modeling
QFGB 8944|Credit Risk Mgmt
QFGB 8946|Financial Programming
QFGB 8948|Quantitative Methods for Portfolio Management
QFGB 8950|Alternative Investments
QFGB 8951|Internship and Project Report
QFGB 8952|Business Comm for Quants A
QFGB 8953|Research Seminar 1
QFGB 8954|Research Seminar 2
QFGB 8955|Computational Finance
QFGB 8957|Applied Capital Markets and Financial Regulations
QFGB 8960|Advanced C++ for Finance
QFGB 8961|Business Comm for Quants B
QFGB 8963|Stress Tests and Cap Adequacy
QFGB 8965|Trading - Market Making and Algorithms
QFGB 8966|Behavioral Finance
QFGB 8967|Bank Capital and CCAR
QFGB 8968|Blockchain Technology and Application Development
QFGB 8969|Systematic Investment Strategies
QFGB 8972|Deep Machine Learning
QFGB 8999|Independent Study
ARHI 1100|Art History Introduction: World Art
ARHI 1101|Introduction to Art History: Europe
ARHI 1102|Introduction to Art History: Asia
ARHI 1103|Introduction to Art History: Americas
ARHI 1104|Introduction to Art History: Africa and African Diaspora
ARHI 1105|Introduction to Art History: Architecture
ARHI 1298|Art History AP
ARHI 1999|Tutorial
ARHI 2100|History of Architecture
ARHI 2211|The Arts and Visual Culture of China and Beyond
ARHI 2221|Japanese Visual Culture: Prehistory to Present
ARHI 2223|Art and Violence in Modern Asia
ARHI 2230|Islamic Art
ARHI 2250|Ancient American Art
ARHI 2254|Topics in Global Art
ARHI 2257|Modern Latin American Art
ARHI 2260|Global Modern Architecture
ARHI 2305|Gods, Monsters, Heroes, and Mortals: Narrative in Greek Art
ARHI 2311|Athens and Ancient Greece: Athens and Pericles in the Fifth Century BC "Golden Age"
ARHI 2313|Greek Art and Architecture
ARHI 2314|Ancient Architecture and New York City
ARHI 2315|Roman Art
ARHI 2320|The Fall of Ancient Rome: A Material Culture Investigation
ARHI 2341|Medieval Desire and Devotion
ARHI 2360|Illuminated Manuscripts
ARHI 2361|Italian Art, Politics, and Religion in the Age of Dante
ARHI 2365|Medieval Art and the Museum
ARHI 2370|Art and Science in the Middle Ages
ARHI 2410|Northern Renaissance Art
ARHI 2415|Italian Renaissance Art
ARHI 2418|Gender and Sexuality in Renaissance Art
ARHI 2419|The Medici: Art and Politics in Renaissance Florence
ARHI 2430|Renaissance Portraits
ARHI 2432|Renaissance Centers
ARHI 2450|17th Century Art
ARHI 2510|18th Century Art
ARHI 2520|American Art
ARHI 2525|Museums from Revolution to Restitution (1793-present)
ARHI 2526|Art and the Black Atlantic
ARHI 2527|London Monuments: Power, Protest, and Public Space
ARHI 2528|Asian American Art
ARHI 2530|19th Century Art
ARHI 2534|The Victorian City: Art and Architecture in the 19th Century London
ARHI 2535|History of Photography
ARHI 2545|Museum Architecture
ARHI 2550|20th Century Art
ARHI 2552|Modern Asian Art
ARHI 2553|Art, Gender, and Sexuality in Asia
ARHI 2565|Architecture and the Environment
ARHI 2571|Topics in Modern Art
ARHI 2575|Visualizing Black Queer Feminisms
ARHI 2576|Black Art and Fashion, 1850-Present
ARHI 2580|Contemporary Black and Indigenous Art
ARHI 2620|Introduction to Fashion History
ARHI 2621|Art and Fashion in the Modern Age
ARHI 2999|Tutorial
ARHI 3100|Museum Methods
ARHI 3110|Can Museums Be Decolonized?
ARHI 3200|Museum Studies in Ancient Art
ARHI 3300|Art Crime and the Law
ARHI 3316|Art and Architecture of Rome
ARHI 3350|Age of Cathedrals
ARHI 3455|Michelangelo
ARHI 3480|Art and Architecture in London
ARHI 3540|Seminar: Contemporary Architecture
ARHI 3555|Contemporary Art
ARHI 3565|Issues: Contemporary Art
ARHI 3621|Museum Collaboration
ARHI 3999|Tutorial
ARHI 4100|Contemporary Art in Exhibition
ARHI 4230|Art and Ethics: Articulating Function in the Visual Arts
ARHI 4250|Aztec Art
ARHI 4435|Art of the Tudor Courts
ARHI 4530|Gender and Modern Art
ARHI 4535|Contemporary Black and Indigenous Art
ARHI 4540|Seminar: Modern Art
ARHI 4555|Art & Ecology in the 19th, 20th & 21st century
ARHI 4562|Art and the Second World War
ARHI 4600|Methods of Art History
ARHI 4610|Art History Senior Thesis
ARHI 4900|Internship
ARHI 4999|Tutorial
ARHI 5100|Contemporary Art in Exhibition
ARHI 5555|Art and Ecology
ARHI 8999|Tutorial`;

    const lines = coursesRaw.split('\n');
    const courses = [];
    
    for (const line of lines) {
      if (line.trim()) {
        const parts = line.split('|');
        if (parts.length === 2) {
          courses.push({
            course_number: parts[0].trim(),
            course_name: parts[1].trim()
          });
        }
      }
    }

    console.log(`Parsed ${courses.length} courses from data`);

    // Insert in batches of 100 to avoid size limits
    const batchSize = 100;
    let totalInserted = 0;
    
    for (let i = 0; i < courses.length; i += batchSize) {
      const batch = courses.slice(i, i + batchSize);
      const { error } = await supabaseClient
        .from('courses')
        .upsert(batch, { onConflict: 'course_number' });

      if (error) {
        console.error(`Error inserting batch ${i / batchSize + 1}:`, error);
        throw error;
      }
      
      totalInserted += batch.length;
      console.log(`Inserted batch ${i / batchSize + 1}: ${totalInserted}/${courses.length} courses`);
    }

    console.log('Course import completed successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully imported ${totalInserted} courses`,
        total: totalInserted
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error importing courses:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});