import { GeminiService } from './gemini.service';
import { BookDetectionResult } from '../types';

export class BookDetectorService {
  private geminiService: GeminiService;

  constructor() {
    this.geminiService = new GeminiService();
  }

  async detectBook(imageBase64: string): Promise<BookDetectionResult> {
    const prompt = `Analyze this image carefully and determine if it contains a book cover.
    
    If it is a book cover:
    1. Extract the book title exactly as it appears
    2. Extract the author name(s) exactly as they appear
    3. Provide a confidence score (0-1) for your detection
    
    If it is NOT a book cover:
    1. Clearly state it's not a book
    2. Provide a confidence score (0-1) for your determination
    
    Respond in JSON format:
    {
      "isBook": boolean,
      "title": "string or null",
      "author": "string or null",
      "confidence": number
    }`;

    try {
      const response = await this.geminiService.analyzeImage(
        'gemini-2.5-pro',
        prompt,
        imageBase64
      );

      // Parse the JSON response
      const jsonMatch = response?.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to parse Gemini response');
      }

      const result = JSON.parse(jsonMatch[0]);
      
      return {
        isBook: result.isBook || false,
        title: result.title || undefined,
        author: result.author || undefined,
        confidence: result.confidence || 0
      };
    } catch (error) {
      console.error('Error detecting book:', error);
      throw new Error('Failed to detect book from image');
    }
  }
}