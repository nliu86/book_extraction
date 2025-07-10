import axios from 'axios';
import { GeminiService } from './gemini.service';
import { PageContent } from '../types';

export class TextExtractorService {
  private geminiService: GeminiService;

  constructor() {
    this.geminiService = new GeminiService();
  }

  async extractTextFromImage(imageUrl: string, pageNumber: number): Promise<PageContent> {
    try {
      // Download image
      const imageBase64 = await this.downloadImageAsBase64(imageUrl);

      // Extract text using Gemini
      const prompt = `Extract all text from this book page image. 
      Preserve the original formatting as much as possible, including:
      - Paragraph breaks
      - Chapter titles or headers
      - Any special formatting
      
      Return only the extracted text, nothing else.`;

      const text = await this.geminiService.analyzeImage(
        'gemini-2.5-flash',
        prompt,
        imageBase64
      );

      return {
        pageNumber,
        text: text?.trim() || '',
        imageUrl
      };
    } catch (error) {
      console.error(`Error extracting text from page ${pageNumber}:`, error);
      throw error;
    }
  }

  async extractTextFromPages(imageUrls: string[]): Promise<PageContent[]> {
    const pageContents: PageContent[] = [];

    for (let i = 0; i < imageUrls.length; i++) {
      try {
        const content = await this.extractTextFromImage(imageUrls[i], i + 1);
        pageContents.push(content);
      } catch (error) {
        console.error(`Failed to extract page ${i + 1}:`, error);
      }
    }

    return pageContents;
  }

  private async downloadImageAsBase64(imageUrl: string): Promise<string> {
    try {
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const base64 = Buffer.from(response.data).toString('base64');
      return base64;
    } catch (error) {
      console.error('Error downloading image:', error);
      throw new Error('Failed to download image');
    }
  }
}