import { GoogleGenerativeAI } from '@google/generative-ai';
import { ExtractionEvaluation } from '../types';
import * as dotenv from 'dotenv';

dotenv.config();

export class BookExtractionEvaluatorService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is required');
    }
    
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.3,
        topK: 1,
        topP: 0.95,
        maxOutputTokens: 1024,
      }
    });
  }

  async evaluateExtraction(
    originalCoverBase64: string,
    extractedContent: {
      title: string;
      author: string;
      classification: 'fiction' | 'non-fiction';
      extractedText: string;
      pageNumber: number;
    }
  ): Promise<ExtractionEvaluation> {
    try {
      const prompt = `You are a book extraction quality evaluator. Your task is to determine if the extracted content matches the book shown in the cover image and if the extraction quality is acceptable.

Cover Image Analysis:
- Analyze the book cover image to identify the book title and author

Extracted Content Review:
Title: ${extractedContent.title}
Author: ${extractedContent.author}
Classification: ${extractedContent.classification}
Extracted from page: ${extractedContent.pageNumber}
Content preview (first 500 chars): ${extractedContent.extractedText.substring(0, 500)}...

Evaluation Criteria:
1. Does the title and author from extraction match the book cover?
2. Is the extracted text actual book content (not auxiliary pages like TOC, copyright, etc.)?
3. For fiction: Is it narrative content from the story?
4. For non-fiction: Is it substantive content (not just preface/acknowledgments)?
5. Is the text quality sufficient (not garbled, cut off, or mostly blank)?

Provide your evaluation in this exact JSON format:
{
  "isValid": true/false,
  "confidence": 0.0-1.0,
  "reasoning": "Detailed explanation of your evaluation",
  "issues": ["List of any issues found"] // optional, only if there are problems
}

IMPORTANT: 
- Set isValid to true ONLY if the content definitely matches the book AND contains meaningful content
- Set confidence based on how certain you are (1.0 = absolutely certain, 0.0 = no confidence)
- Common issues to check: wrong book, only auxiliary pages, poor text quality, mostly blank pages`;

      const result = await this.model.generateContent([
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: originalCoverBase64
          }
        },
        prompt
      ]);

      const response = result.response;
      const text = response.text();
      
      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to extract JSON from evaluator response');
      }

      const evaluation = JSON.parse(jsonMatch[0]) as ExtractionEvaluation;
      
      console.log('\nEvaluation Result:');
      console.log(`- Valid: ${evaluation.isValid}`);
      console.log(`- Confidence: ${evaluation.confidence}`);
      console.log(`- Reasoning: ${evaluation.reasoning}`);
      if (evaluation.issues && evaluation.issues.length > 0) {
        console.log(`- Issues: ${evaluation.issues.join(', ')}`);
      }

      return evaluation;

    } catch (error: any) {
      console.error('Error evaluating extraction:', error.message);
      
      // Return a conservative evaluation on error
      return {
        isValid: false,
        confidence: 0,
        reasoning: `Evaluation failed: ${error.message}`,
        issues: ['Evaluation error occurred']
      };
    }
  }
}