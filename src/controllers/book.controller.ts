import { Request, Response } from 'express';
import { BookDetectorService } from '../services/book-detector.service';
import { ISBNSearchService } from '../services/isbn-search.service';
import { AmazonScraperService } from '../services/amazon-scraper.service';
import { TextExtractorService } from '../services/text-extractor.service';
import { ClassifierService } from '../services/classifier.service';
import { ImageUtils } from '../utils/image.utils';
import { BookExtractionResult } from '../types';

export class BookController {
  private bookDetector: BookDetectorService;
  private isbnSearch: ISBNSearchService;
  private amazonScraper: AmazonScraperService;
  private textExtractor: TextExtractorService;
  private classifier: ClassifierService;

  constructor() {
    this.bookDetector = new BookDetectorService();
    this.isbnSearch = new ISBNSearchService();
    this.amazonScraper = new AmazonScraperService();
    this.textExtractor = new TextExtractorService();
    this.classifier = new ClassifierService();
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

      // Step 1: Detect if it's a book and extract metadata
      console.log('Step 1: Detecting book...');
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

      // Step 3: Get page images from Amazon
      console.log(`Step 3: Getting book pages for ISBN ${isbn}...`);
      const pageImageUrls = await this.amazonScraper.getPageImages(isbn);
      
      if (pageImageUrls.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Could not access book preview pages. The book might not have preview available.'
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
        // Return second page for fiction
        returnText = pageContents.length > 1 ? pageContents[1].text : pageContents[0].text;
      } else {
        // Return first page for non-fiction
        returnText = pageContents[0].text;
      }

      const result: BookExtractionResult = {
        success: true,
        text: returnText,
        bookType: classification.type,
        title: bookDetection.title,
        author: bookDetection.author,
        isbn: isbn
      };

      return res.json(result);

    } catch (error) {
      console.error('Error in book extraction:', error);
      return res.status(500).json({
        success: false,
        error: 'An error occurred while processing the book. Please try again.'
      });
    }
  }
}