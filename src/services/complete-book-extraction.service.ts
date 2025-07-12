import { BookDetectorService } from './book-detector.service';
import { GoogleBooksVolumeFinder } from './google-books-volume-finder.service';
import { GoogleBooksPlaywrightSimpleService } from './google-books-playwright-simple.service';
import { BookContentAnalyzerService } from './book-content-analyzer.service';
import { CompleteExtractionResult } from '../types';
import * as fs from 'fs';
import * as path from 'path';

export class CompleteBookExtractionService {
  private bookDetector: BookDetectorService;
  private volumeFinder: GoogleBooksVolumeFinder;
  private pageCapture: GoogleBooksPlaywrightSimpleService;
  private contentAnalyzer: BookContentAnalyzerService;

  constructor() {
    this.bookDetector = new BookDetectorService();
    this.volumeFinder = new GoogleBooksVolumeFinder();
    this.pageCapture = new GoogleBooksPlaywrightSimpleService();
    this.contentAnalyzer = new BookContentAnalyzerService();
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

      // Step 2: Find volume ID on Google Books
      console.log('\nStep 2: Finding on Google Books...');
      const volumeId = await this.volumeFinder.findVolumeIdWithFallback(
        bookDetection.title,
        bookDetection.author
      );

      if (!volumeId) {
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

      console.log(`✓ Found volume ID: ${volumeId}`);

      // Step 3: Capture preview pages
      console.log('\nStep 3: Capturing preview pages...');
      let pageImages: string[];
      
      try {
        pageImages = await this.pageCapture.getBookPages(volumeId);
      } catch (error: any) {
        console.log('❌ Preview not available');
        return {
          success: false,
          isBook: true,
          bookInfo: {
            title: bookDetection.title,
            author: bookDetection.author,
            volumeId
          },
          error: 'Book preview not available on Google Books',
          errorType: 'no_preview'
        };
      }

      console.log(`✓ Captured ${pageImages.length} pages`);

      // Step 4: Analyze pages with Gemini Pro
      console.log('\nStep 4: Analyzing content with Gemini Pro...');
      
      // Convert base64 URLs to just base64 data
      const pagesBase64 = pageImages.map(img => 
        img.replace(/^data:image\/[a-z]+;base64,/, '')
      );

      const contentAnalysis = await this.contentAnalyzer.analyzeBookPagesWithFallback(pagesBase64);
      
      console.log(`✓ Classification: ${contentAnalysis.classification.type}`);
      console.log(`  Confidence: ${contentAnalysis.classification.confidence}`);
      console.log(`  Content pages identified: ${contentAnalysis.contentPages.join(', ')}`);
      console.log(`  Extracted from page: ${contentAnalysis.extractedText.pageNumber}`);

      // Prepare result based on book type
      const result: CompleteExtractionResult = {
        success: true,
        isBook: true,
        bookInfo: {
          title: bookDetection.title,
          author: bookDetection.author,
          volumeId
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

      console.log('\n✓ Extraction complete!');
      return result;

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