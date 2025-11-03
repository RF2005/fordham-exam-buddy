import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Verify user authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 2. Get file from request
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return new Response(
        JSON.stringify({ error: 'No file provided' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate file size (max 10MB for images, 50MB for PDFs)
    const maxSize = file.type.startsWith('image/') ? 10 * 1024 * 1024 : 50 * 1024 * 1024;
    if (file.size > maxSize) {
      return new Response(
        JSON.stringify({
          error: `File too large. Maximum size: ${maxSize / (1024 * 1024)}MB`
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 3. Call PaddleOCR API
    const paddleOcrUrl = Deno.env.get('PADDLEOCR_API_URL');
    const apiKey = Deno.env.get('PADDLEOCR_API_KEY');

    if (!paddleOcrUrl || !apiKey) {
      console.error('PaddleOCR API credentials not configured');
      return new Response(
        JSON.stringify({
          error: 'OCR service not configured. Please contact support.'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Convert file to base64 for API request
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const base64 = btoa(String.fromCharCode(...bytes));

    // Make request to PaddleOCR API
    const ocrResponse = await fetch(paddleOcrUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: base64,
        language: 'en',
      }),
    });

    if (!ocrResponse.ok) {
      const errorText = await ocrResponse.text();
      console.error('PaddleOCR API error:', errorText);
      throw new Error(`OCR API error: ${ocrResponse.statusText}`);
    }

    const result = await ocrResponse.json();

    // Extract text from OCR result
    // Note: The exact structure depends on PaddleOCR API response format
    // This is a generic implementation that may need adjustment
    let extractedText = '';

    if (result.text) {
      extractedText = result.text;
    } else if (result.data?.text) {
      extractedText = result.data.text;
    } else if (result.result) {
      // Handle array of text blocks
      if (Array.isArray(result.result)) {
        extractedText = result.result
          .map((item: any) => item.text || item[1] || '')
          .join('\n');
      } else if (typeof result.result === 'string') {
        extractedText = result.result;
      }
    }

    // Log success for monitoring
    console.log(`OCR extraction successful for user ${user.id}, extracted ${extractedText.length} characters`);

    // 4. Return extracted text
    return new Response(
      JSON.stringify({
        text: extractedText,
        length: extractedText.length
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in OCR extraction:', error);

    return new Response(
      JSON.stringify({
        error: error.message || 'OCR extraction failed',
        details: 'Please try again with a clearer image or contact support if the problem persists.'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
