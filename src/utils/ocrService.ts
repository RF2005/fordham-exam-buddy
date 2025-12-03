import Tesseract from 'tesseract.js';

/**
 * Extract text from an image or PDF using Tesseract.js (browser-based OCR)
 */
export async function extractTextWithOCR(file: File): Promise<string> {

  try {
    const { data: { text } } = await Tesseract.recognize(
      file,
      'eng',
      {
        logger: (m) => {
          if (m.status === 'recognizing text') {
          }
        }
      }
    );

    if (!text || text.trim().length === 0) {
      throw new Error('No text could be extracted from the file. Please ensure the image is clear and readable.');
    }

    return text;
  } catch (error: any) {
    throw new Error(`OCR extraction failed: ${error.message || 'Unknown error'}`);
  }
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
