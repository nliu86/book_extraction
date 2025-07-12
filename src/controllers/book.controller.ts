import { Request, Response } from 'express';
import { BookDetectorService } from '../services/book-detector.service';
import { ISBNSearchService } from '../services/isbn-search.service';
import { GoogleBooksPlaywrightService } from '../services/google-books-playwright.service';
import { TextExtractorService } from '../services/text-extractor.service';
import { ClassifierService } from '../services/classifier.service';
import { ImageUtils } from '../utils/image.utils';
import { BookExtractionResult } from '../types';
import { MockBookService } from '../services/mock-book-service';
import * as fs from 'fs';
import * as path from 'path';

export class BookController {
  private bookDetector: BookDetectorService;
  private isbnSearch: ISBNSearchService;
  private googleBooksPreview: GoogleBooksPlaywrightService;
  private textExtractor: TextExtractorService;
  private classifier: ClassifierService;
  private mockService: MockBookService;

  constructor() {
    this.bookDetector = new BookDetectorService();
    this.isbnSearch = new ISBNSearchService();
    this.googleBooksPreview = new GoogleBooksPlaywrightService();
    this.textExtractor = new TextExtractorService();
    this.classifier = new ClassifierService();
    this.mockService = new MockBookService();
  }

  async extractBook(req: Request, res: Response) {
    try {
      // Check if file was uploaded
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No image file uploaded'
        });
      }

      // Validate image
      const isValid = await ImageUtils.validateImage(req.file.buffer);
      if (!isValid) {
        return res.status(400).json({
          success: false,
          error: 'Invalid image. Please upload a clear image of a book cover.'
        });
      }

      // Process image
      const { base64, mimeType } = await ImageUtils.processImage(req.file.buffer);

      // Save original uploaded image
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const debugDir = path.join(process.cwd(), 'debug', 'book-detection');
      const uploadedImageFile = path.join(debugDir, `uploaded-${timestamp}.${mimeType.split('/')[1]}`);
      fs.writeFileSync(uploadedImageFile, req.file.buffer);
      console.log(`Saved uploaded image to: ${uploadedImageFile}`);

      // Step 1: Detect if it's a book and extract metadata
      console.log('Step 1: Detecting book...');
      const bookDetection = await this.bookDetector.detectBook(base64);
      
      // Save book detection results
      const detectionFile = path.join(debugDir, `detection-${timestamp}.json`);
      fs.writeFileSync(detectionFile, JSON.stringify(bookDetection, null, 2));
      console.log(`Saved book detection results to: ${detectionFile}`);
      
      if (!bookDetection.isBook) {
        return res.status(400).json({
          success: false,
          error: 'The uploaded image does not appear to be a book cover. Please retake the photo.'
        });
      }

      if (!bookDetection.title) {
        return res.status(400).json({
          success: false,
          error: 'Could not extract book title from the cover. Please ensure the title is clearly visible.'
        });
      }

      // Step 2: Search for ISBN
      console.log(`Step 2: Searching ISBN for "${bookDetection.title}" by ${bookDetection.author || 'Unknown'}...`);
      const isbnResult = await this.isbnSearch.searchISBN(
        bookDetection.title,
        bookDetection.author
      );

      if (!isbnResult.found || (!isbnResult.isbn10 && !isbnResult.isbn13)) {
        return res.status(404).json({
          success: false,
          error: 'Could not find ISBN for this book. The book might not be available in our database.'
        });
      }

      const isbn = isbnResult.isbn13 || isbnResult.isbn10 || '';

      // Step 3: Get page images from Google Books
      console.log(`Step 3: Getting book pages from Google Books for ISBN ${isbn}...`);
      let pageImageUrls: string[] = [];
      
      try {
        pageImageUrls = await this.googleBooksPreview.getBookPages(isbn);
      } catch (error: any) {
        console.log('Google Books preview not available:', error.message);
        return res.status(404).json({
          success: false,
          error: `Book preview not available. ${error.message || 'The book might not have preview enabled on Google Books.'}`
        });
      }
      
      if (pageImageUrls.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Could not access book preview pages. The book might not have preview available on Google Books.'
        });
      }

      // Step 4: Extract text from pages
      console.log('Step 4: Extracting text from pages...');
      const pageContents = await this.textExtractor.extractTextFromPages(pageImageUrls);
      
      if (pageContents.length === 0) {
        return res.status(500).json({
          success: false,
          error: 'Failed to extract text from book pages.'
        });
      }

      // Step 5: Classify book as fiction or non-fiction
      console.log('Step 5: Classifying book...');
      const classification = await this.classifier.classifyBook(
        bookDetection.title,
        bookDetection.author,
        pageContents
      );

      // Step 6: Return appropriate page based on classification
      let returnText: string;
      if (classification.type === 'fiction') {
        // Return second page for fiction (or first with actual content)
        if (pageContents.length > 1) {
          // Find the first page with substantial text (more than 50 characters)
          const contentfulPage = pageContents.slice(1).find(p => p.text.length > 50);
          returnText = contentfulPage ? contentfulPage.text : pageContents[1].text;
        } else {
          returnText = pageContents[0].text;
        }
      } else {
        // Return first page for non-fiction (or first with actual content)
        const contentfulPage = pageContents.find(p => p.text.length > 50);
        returnText = contentfulPage ? contentfulPage.text : pageContents[0].text;
      }

      const result: BookExtractionResult = {
        success: true,
        text: returnText,
        bookType: classification.type,
        title: bookDetection.title,
        author: bookDetection.author,
        isbn: isbn
      };

      // Save debug summary
      const debugSummary = {
        timestamp: new Date().toISOString(),
        bookDetails: {
          title: bookDetection.title,
          author: bookDetection.author,
          isbn: isbn,
          bookType: classification.type
        },
        pagesCaptures: pageImageUrls.length,
        pagesExtracted: pageContents.length,
        extractedTexts: pageContents.map((p, i) => ({
          pageNumber: p.pageNumber,
          textLength: p.text.length,
          preview: p.text.substring(0, 100) + (p.text.length > 100 ? '...' : '')
        })),
        selectedText: {
          reason: classification.type === 'fiction' ? 'Fiction - returning page 2 or first with content' : 'Non-fiction - returning page 1 or first with content',
          textLength: returnText.length
        }
      };
      
      const summaryFile = path.join(debugDir, `summary-${timestamp}.json`);
      fs.writeFileSync(summaryFile, JSON.stringify(debugSummary, null, 2));
      console.log(`Saved debug summary to: ${summaryFile}`);

      return res.json(result);

    } catch (error) {
      console.error('Error in book extraction:', error);
      return res.status(500).json({
        success: false,
        error: 'An error occurred while processing the book. Please try again.'
      });
    }
  }

  async extractBookDemo(req: Request, res: Response) {
    try {
      // Check if file was uploaded
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No image file uploaded'
        });
      }

      // Validate image
      const isValid = await ImageUtils.validateImage(req.file.buffer);
      if (!isValid) {
        return res.status(400).json({
          success: false,
          error: 'Invalid image. Please upload a clear image of a book cover.'
        });
      }

      // Process image
      const { base64, mimeType } = await ImageUtils.processImage(req.file.buffer);

      // Step 1: Detect if it's a book and extract metadata
      console.log('Demo Step 1: Detecting book...');
      const bookDetection = await this.bookDetector.detectBook(base64);
      
      if (!bookDetection.isBook) {
        return res.status(400).json({
          success: false,
          error: 'The uploaded image does not appear to be a book cover. Please retake the photo.'
        });
      }

      if (!bookDetection.title) {
        return res.status(400).json({
          success: false,
          error: 'Could not extract book title from the cover. Please ensure the title is clearly visible.'
        });
      }

      // Step 2: Search for ISBN
      console.log(`Demo Step 2: Searching ISBN for "${bookDetection.title}" by ${bookDetection.author || 'Unknown'}...`);
      const isbnResult = await this.isbnSearch.searchISBN(
        bookDetection.title,
        bookDetection.author
      );

      const isbn = isbnResult.found ? (isbnResult.isbn13 || isbnResult.isbn10 || '978-0-123456-78-9') : '978-0-123456-78-9';

      // Step 3: Classify book type (fiction/non-fiction) based on title and author
      console.log('Demo Step 3: Classifying book type...');
      // Simple classification based on common patterns
      const bookType = this.classifyByTitleAndAuthor(bookDetection.title, bookDetection.author);

      // Step 4: Use mock service to demonstrate the complete flow
      console.log('Demo Step 4: Extracting text (using mock data for demonstration)...');
      const result = await this.mockService.extractBookWithMockData(
        bookDetection.title,
        bookDetection.author,
        isbn,
        bookType
      );

      console.log('Demo complete! In production, this would extract actual pages from Amazon.');
      return res.json(result);

    } catch (error) {
      console.error('Error in book extraction demo:', error);
      return res.status(500).json({
        success: false,
        error: 'An error occurred while processing the book. Please try again.'
      });
    }
  }

  private classifyByTitleAndAuthor(title: string, author?: string): 'fiction' | 'non-fiction' {
    const titleLower = title.toLowerCase();
    
    // Common fiction indicators
    const fictionKeywords = ['novel', 'story', 'tales', 'harry potter', 'gatsby', 'fiction'];
    const nonFictionKeywords = ['guide', 'handbook', 'introduction', 'learn', 'how to', 'science', 'history', 'biography', 'memoir', 'educated'];
    
    for (const keyword of fictionKeywords) {
      if (titleLower.includes(keyword)) return 'fiction';
    }
    
    for (const keyword of nonFictionKeywords) {
      if (titleLower.includes(keyword)) return 'non-fiction';
    }
    
    // Default to fiction for narrative-sounding titles
    return 'fiction';
  }
}