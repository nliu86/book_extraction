import { Request, Response } from 'express';
import { CompleteBookExtractionService } from '../services/complete-book-extraction.service';
import { ImageUtils } from '../utils/image.utils';
import * as fs from 'fs';
import * as path from 'path';

export class BookController {
  private completeExtractionService: CompleteBookExtractionService;

  constructor() {
    this.completeExtractionService = new CompleteBookExtractionService();
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

      // Save original uploaded image for debugging
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const debugDir = path.join(process.cwd(), 'debug', 'book-detection');
      fs.mkdirSync(debugDir, { recursive: true });
      
      const uploadedImageFile = path.join(debugDir, `uploaded-${timestamp}.${mimeType.split('/')[1]}`);
      fs.writeFileSync(uploadedImageFile, req.file.buffer);
      console.log(`Saved uploaded image to: ${uploadedImageFile}`);

      // Use the complete extraction service
      console.log('Starting complete book extraction pipeline...');
      const result = await this.completeExtractionService.extractFromImage(`data:${mimeType};base64,${base64}`);

      // Save extraction results for debugging
      const resultFile = path.join(debugDir, `result-${timestamp}.json`);
      fs.writeFileSync(resultFile, JSON.stringify(result, null, 2));
      console.log(`Saved extraction result to: ${resultFile}`);

      // Handle different result scenarios
      if (!result.success) {
        const statusCode = result.errorType === 'not_a_book' ? 400 : 
                          result.errorType === 'book_not_found' ? 404 :
                          result.errorType === 'no_preview' ? 404 : 500;
        
        return res.status(statusCode).json({
          success: false,
          error: result.error
        });
      }

      // Format successful response
      const extractedText = result.classification?.type === 'fiction' 
        ? result.extractedContent?.page2Content 
        : result.extractedContent?.page1Content;

      return res.json({
        success: true,
        text: extractedText || '',
        bookType: result.classification?.type || 'unknown',
        title: result.bookInfo?.title || '',
        author: result.bookInfo?.author || '',
        volumeId: result.bookInfo?.volumeId || '',
        confidence: result.classification?.confidence || 0,
        debugInfo: {
          totalPagesCaptured: result.debugInfo?.totalPagesCaptured || 0,
          contentPagesIdentified: result.debugInfo?.contentPagesIdentified || [],
          actualPageExtracted: result.extractedContent?.actualPageNumber || 0
        }
      });

    } catch (error) {
      console.error('Error in book extraction:', error);
      return res.status(500).json({
        success: false,
        error: 'An error occurred while processing the book. Please try again.'
      });
    }
  }
}