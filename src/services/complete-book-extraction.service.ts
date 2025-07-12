import { BookDetectorService } from './book-detector.service';
import { GoogleBooksVolumeFinder } from './google-books-volume-finder.service';
import { GoogleBooksPlaywrightSimpleService } from './google-books-playwright-simple.service';
import { BookContentAnalyzerService } from './book-content-analyzer.service';
import { BookExtractionEvaluatorService } from './book-extraction-evaluator.service';
import { CompleteExtractionResult, VolumeSearchResult } from '../types';
import * as fs from 'fs';
import * as path from 'path';

export class CompleteBookExtractionService {
  private bookDetector: BookDetectorService;
  private volumeFinder: GoogleBooksVolumeFinder;
  private pageCapture: GoogleBooksPlaywrightSimpleService;
  private contentAnalyzer: BookContentAnalyzerService;
  private evaluator: BookExtractionEvaluatorService;
  private maxVolumesToTry: number = 5;
  private evaluationThreshold: number = 0.8;

  constructor() {
    this.bookDetector = new BookDetectorService();
    this.volumeFinder = new GoogleBooksVolumeFinder();
    this.pageCapture = new GoogleBooksPlaywrightSimpleService();
    this.contentAnalyzer = new BookContentAnalyzerService();
    this.evaluator = new BookExtractionEvaluatorService();
  }

  async extractFromImage(imagePathOrBase64: string): Promise<CompleteExtractionResult> {
    try {
      console.log('\n=== Complete Book Extraction Pipeline ===');
      
      // Step 1: Load image and detect if it's a book
      let imageBase64: string;
      if (imagePathOrBase64.startsWith('data:') || imagePathOrBase64.length > 500) {
        // Already base64
        imageBase64 = imagePathOrBase64.replace(/^data:image\/[a-z]+;base64,/, '');
      } else {
        // File path - read and convert to base64
        const imageBuffer = fs.readFileSync(imagePathOrBase64);
        imageBase64 = imageBuffer.toString('base64');
      }

      console.log('\nStep 1: Detecting book...');
      const bookDetection = await this.bookDetector.detectBook(imageBase64);
      
      if (!bookDetection.isBook) {
        console.log('❌ Not a book');
        return {
          success: false,
          isBook: false,
          error: 'The image does not contain a book cover',
          errorType: 'not_a_book'
        };
      }

      console.log(`✓ Book detected: "${bookDetection.title}" by ${bookDetection.author}`);
      console.log(`  Confidence: ${bookDetection.confidence}`);

      if (!bookDetection.title || !bookDetection.author) {
        return {
          success: false,
          isBook: true,
          error: 'Could not extract book title or author from cover',
          errorType: 'extraction_failed'
        };
      }

      // Step 2: Find volumes on Google Books
      console.log('\nStep 2: Finding volumes on Google Books...');
      const volumes = await this.volumeFinder.findMultipleVolumes(
        bookDetection.title,
        bookDetection.author,
        this.maxVolumesToTry
      );

      if (volumes.length === 0) {
        console.log('❌ Book not found on Google Books');
        return {
          success: false,
          isBook: true,
          bookInfo: {
            title: bookDetection.title,
            author: bookDetection.author,
            volumeId: ''
          },
          error: 'Book not found on Google Books',
          errorType: 'book_not_found'
        };
      }

      console.log(`✓ Found ${volumes.length} volumes to try`);

      // Step 3: Loop through volumes and try extraction
      let bestResult: CompleteExtractionResult | null = null;
      let bestEvaluationScore = 0;

      for (let i = 0; i < volumes.length; i++) {
        const volume = volumes[i];
        console.log(`\n=== Trying volume ${i + 1}/${volumes.length} ===`);
        console.log(`Volume: ${volume.title} by ${volume.authors?.join(', ') || 'Unknown'}`);
        console.log(`Volume ID: ${volume.volumeId}`);

        try {
          // Step 3a: Capture preview pages
          console.log('\nCapturing preview pages...');
          let pageImages: string[];
          
          try {
            pageImages = await this.pageCapture.getBookPagesFromPreviewLink(volume.previewLink);
          } catch (error: any) {
            console.log('❌ Preview capture failed:', error.message);
            continue; // Try next volume
          }

          console.log(`✓ Captured ${pageImages.length} pages`);

          // Step 3b: Analyze pages with Gemini Pro
          console.log('\nAnalyzing content...');
          
          // Convert base64 URLs to just base64 data
          const pagesBase64 = pageImages.map(img => 
            img.replace(/^data:image\/[a-z]+;base64,/, '')
          );

          const contentAnalysis = await this.contentAnalyzer.analyzeBookPagesWithFallback(pagesBase64);
          
          console.log(`✓ Classification: ${contentAnalysis.classification.type}`);
          console.log(`  Confidence: ${contentAnalysis.classification.confidence}`);
          console.log(`  Content pages identified: ${contentAnalysis.contentPages.join(', ')}`);
          console.log(`  Extracted from page: ${contentAnalysis.extractedText.pageNumber}`);

          // Step 3c: Evaluate extraction quality
          console.log('\nEvaluating extraction quality...');
          const evaluation = await this.evaluator.evaluateExtraction(
            imageBase64,
            {
              title: bookDetection.title,
              author: bookDetection.author,
              classification: contentAnalysis.classification.type,
              extractedText: contentAnalysis.extractedText.content,
              pageNumber: contentAnalysis.extractedText.pageNumber
            }
          );

          // Prepare result
          const result: CompleteExtractionResult = {
            success: true,
            isBook: true,
            bookInfo: {
              title: bookDetection.title,
              author: bookDetection.author,
              volumeId: volume.volumeId
            },
            classification: {
              type: contentAnalysis.classification.type,
              confidence: contentAnalysis.classification.confidence,
              reasoning: contentAnalysis.classification.reasoning
            },
            extractedContent: {
              actualPageNumber: contentAnalysis.extractedText.pageNumber
            },
            debugInfo: {
              totalPagesCaptured: pageImages.length,
              contentPagesIdentified: contentAnalysis.contentPages
            }
          };

          // Add appropriate content based on type
          if (contentAnalysis.classification.type === 'fiction') {
            result.extractedContent!.page2Content = contentAnalysis.extractedText.content;
          } else {
            result.extractedContent!.page1Content = contentAnalysis.extractedText.content;
          }

          // Check if this is a good result
          if (evaluation.isValid && evaluation.confidence >= this.evaluationThreshold) {
            console.log(`\n✅ Extraction validated! Confidence: ${evaluation.confidence}`);
            console.log('✓ Extraction complete!');
            return result;
          } else {
            console.log(`\n⚠️ Extraction validation failed or below threshold`);
            console.log(`Valid: ${evaluation.isValid}, Confidence: ${evaluation.confidence}`);
            if (evaluation.issues) {
              console.log(`Issues: ${evaluation.issues.join(', ')}`);
            }

            // Keep best result so far
            if (evaluation.confidence > bestEvaluationScore) {
              bestResult = result;
              bestEvaluationScore = evaluation.confidence;
            }
          }

        } catch (error: any) {
          console.error(`Error processing volume ${volume.volumeId}:`, error.message);
          continue; // Try next volume
        }
      }

      // If we get here, no volume passed validation
      if (bestResult) {
        console.log('\n⚠️ No volume passed validation threshold');
        console.log(`Returning best attempt with confidence: ${bestEvaluationScore}`);
        return bestResult;
      }

      // No successful extraction at all
      return {
        success: false,
        isBook: true,
        bookInfo: {
          title: bookDetection.title,
          author: bookDetection.author,
          volumeId: ''
        },
        error: 'Failed to extract valid content from any available preview',
        errorType: 'extraction_failed'
      };

    } catch (error: any) {
      console.error('Unexpected error:', error.message);
      return {
        success: false,
        isBook: false,
        error: `Extraction failed: ${error.message}`,
        errorType: 'extraction_failed'
      };
    }
  }
}