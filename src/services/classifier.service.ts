import { GeminiService } from './gemini.service';
import { BookClassification, PageContent } from '../types';

export class ClassifierService {
  private geminiService: GeminiService;

  constructor() {
    this.geminiService = new GeminiService();
  }

  async classifyBook(
    title: string,
    author: string | undefined,
    pageContents: PageContent[]
  ): Promise<BookClassification> {
    const pagesText = pageContents
      .map(page => `Page ${page.pageNumber}:\n${page.text}`)
      .join('\n\n---\n\n');

    const prompt = `Analyze this book and classify it as either FICTION or NON-FICTION.

Book Title: ${title}
Author: ${author || 'Unknown'}

Content from first pages:
${pagesText}

Based on the title, author, and content, determine if this is:
- FICTION: Novels, stories, creative writing, literature
- NON-FICTION: Educational, informational, biography, self-help, technical, etc.

Consider:
1. The writing style and narrative structure
2. Whether it tells a story or presents information
3. The presence of characters, dialogue, or plot
4. Technical or educational content
5. The book title and genre indicators

Respond in JSON format:
{
  "type": "fiction" or "non-fiction",
  "confidence": number between 0 and 1,
  "reasoning": "brief explanation"
}`;

    try {
      const response = await this.geminiService.generateContent(
        'gemini-2.5-flash',
        prompt
      );

      // Parse the JSON response
      const jsonMatch = response?.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to parse classification response');
      }

      const result = JSON.parse(jsonMatch[0]);
      
      return {
        type: result.type as 'fiction' | 'non-fiction',
        confidence: result.confidence || 0.5
      };
    } catch (error) {
      console.error('Error classifying book:', error);
      // Default to non-fiction if classification fails
      return {
        type: 'non-fiction',
        confidence: 0.3
      };
    }
  }
}