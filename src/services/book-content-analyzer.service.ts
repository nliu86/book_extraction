import { GeminiService } from './gemini.service';

interface ContentAnalysisResult {
  classification: {
    type: 'fiction' | 'non-fiction';
    confidence: number;
    reasoning: string;
  };
  contentPages: number[];
  extractedText: {
    pageNumber: number;
    content: string;
  };
}

export class BookContentAnalyzerService {
  private geminiService: GeminiService;

  constructor() {
    this.geminiService = new GeminiService();
  }

  async analyzeBookPages(pageImagesBase64: string[]): Promise<ContentAnalysisResult> {
    const prompt = `You are analyzing ${pageImagesBase64.length} sequential pages from a book. Your task is to:

1. CLASSIFY the book as either 'fiction' or 'non-fiction' based on:
   - Writing style and narrative structure
   - Content type (story vs informational)
   - Language patterns and tone
   - Subject matter

2. IDENTIFY which pages contain actual book content vs auxiliary pages:
   - Skip: title pages, copyright pages, table of contents, preface, acknowledgments, dedication pages
   - Include: actual chapter content, introduction (if part of main content)

3. EXTRACT text from the appropriate page:
   - If FICTION: Extract text from the SECOND page of actual content
   - If NON-FICTION: Extract text from the FIRST page of actual content

Important: When extracting text, include ALL text visible on the selected page, maintaining paragraph breaks and formatting where possible.

Return a JSON response with:
{
  "classification": {
    "type": "fiction" or "non-fiction",
    "confidence": 0.0-1.0,
    "reasoning": "brief explanation of why you classified it this way"
  },
  "contentPages": [array of page numbers (1-based) that contain actual content],
  "extractedText": {
    "pageNumber": number (which page number 1-based was extracted),
    "content": "full text content from the selected page, preserving paragraphs"
  }
}

IMPORTANT: Return ONLY valid JSON, no additional text or explanation outside the JSON structure.`;

    try {
      // Use Gemini Pro for analysis
      const response = await this.geminiService.analyzeMultipleImages(
        'gemini-1.5-pro',
        prompt,
        pageImagesBase64,
        'image/png'
      );

      // Parse JSON response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to parse JSON from Gemini response');
      }

      const result = JSON.parse(jsonMatch[0]) as ContentAnalysisResult;

      // Validate result structure
      if (!result.classification || !result.contentPages || !result.extractedText) {
        throw new Error('Invalid response structure from Gemini');
      }

      return result;
    } catch (error: any) {
      console.error('Error analyzing book pages:', error.message);
      throw new Error(`Failed to analyze book content: ${error.message}`);
    }
  }

  async analyzeBookPagesWithFallback(pageImagesBase64: string[]): Promise<ContentAnalysisResult> {
    try {
      // First try with all pages
      return await this.analyzeBookPages(pageImagesBase64);
    } catch (error: any) {
      console.log('Full analysis failed, trying with fewer pages...');
      
      // If it fails, try with just the first 5 pages
      if (pageImagesBase64.length > 5) {
        try {
          const reducedPages = pageImagesBase64.slice(0, 5);
          const result = await this.analyzeBookPages(reducedPages);
          
          // Adjust page numbers since we only analyzed first 5
          console.log('Note: Analysis based on first 5 pages only');
          return result;
        } catch (fallbackError: any) {
          console.error('Fallback analysis also failed:', fallbackError.message);
          throw fallbackError;
        }
      }
      
      throw error;
    }
  }
}