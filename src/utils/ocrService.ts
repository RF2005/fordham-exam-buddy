import { supabase } from '@/integrations/supabase/client';

/**
 * Extract text from an image or scanned PDF using OCR via Supabase Edge Function
 */
export async function extractTextWithOCR(file: File): Promise<string> {
  console.log('Using OCR to extract text from:', file.name);

  // Get auth token
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Must be logged in to use OCR');
  }

  // Prepare form data
  const formData = new FormData();
  formData.append('file', file);

  // Get Supabase URL from environment
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error('Supabase URL not configured');
  }

  // Call edge function
  const response = await fetch(
    `${supabaseUrl}/functions/v1/ocr-extract`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`
      },
      body: formData
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'OCR extraction failed' }));
    throw new Error(error.error || error.message || 'OCR extraction failed');
  }

  const result = await response.json();

  if (!result.text || result.text.length === 0) {
    throw new Error('No text could be extracted from the file. Please ensure the image is clear and readable.');
  }

  console.log(`OCR extracted ${result.text.length} characters`);
  return result.text;
}

/**
 * Check if a file is an image type
 */
export function isImageFile(file: File): boolean {
  const imageTypes = ['image/png', 'image/jpeg', 'image/jpg'];
  const imageExtensions = ['.png', '.jpg', '.jpeg'];

  return imageTypes.includes(file.type) ||
         imageExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
}

/**
 * Check if a PDF file appears to be scanned (has minimal extractable text)
 */
export function isLikelyScannedPDF(extractedText: string): boolean {
  const trimmed = extractedText.trim();

  // If text is very short, likely scanned
  if (trimmed.length < 100) {
    return true;
  }

  // If text has very few words, likely scanned
  const wordCount = trimmed.split(/\s+/).length;
  if (wordCount < 20) {
    return true;
  }

  // If text is mostly garbage characters, likely scanned
  const alphanumericRatio = (trimmed.match(/[a-zA-Z0-9]/g) || []).length / trimmed.length;
  if (alphanumericRatio < 0.5) {
    return true;
  }

  return false;
}
