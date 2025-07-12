import axios from 'axios';
import * as dotenv from 'dotenv';
import { GeminiService } from './gemini.service';
import { PageContent } from '../types';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

export class TextExtractorService {
  private geminiService: GeminiService;
  private debugDir = path.join(process.cwd(), 'debug', 'text-extraction');

  constructor() {
    this.geminiService = new GeminiService();
  }

  async extractTextFromImage(imageUrl: string, pageNumber: number): Promise<PageContent> {
    try {
      // For data URLs, extract base64 directly
      let imageBase64: string;
      if (imageUrl.startsWith('data:image')) {
        imageBase64 = imageUrl.split(',')[1];
      } else {
        imageBase64 = await this.downloadImageAsBase64(imageUrl);
      }

      // Extract text using Gemini
      const prompt = `Extract all text from this book page image. 
      Preserve the original formatting as much as possible, including:
      - Paragraph breaks
      - Chapter titles or headers
      - Any special formatting
      
      Return only the extracted text, nothing else.`;

      console.log(`Sending page ${pageNumber} to Gemini for text extraction...`);
      const text = await this.geminiService.analyzeImage(
        'gemini-2.5-flash',
        prompt,
        imageBase64
      );

      // Save the extracted text to debug folder
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `page${pageNumber}-${timestamp}.txt`;
      const filepath = path.join(this.debugDir, filename);
      fs.writeFileSync(filepath, text || 'No text extracted');
      console.log(`Saved extracted text to: ${filepath}`);

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
      // If URL needs to be accessed through ScraperAPI
      const scraperApiKey = process.env.SCRAPER_API_KEY;
      let finalUrl = imageUrl;
      
      if (scraperApiKey && imageUrl.includes('amazon.com')) {
        // Use ScraperAPI to download Amazon images
        finalUrl = `http://api.scraperapi.com?api_key=${scraperApiKey}&url=${encodeURIComponent(imageUrl)}`;
      }
      
      const response = await axios.get(finalUrl, {
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