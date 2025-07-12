import { Request, Response } from 'express';
import { CompleteBookExtractionService } from '../services/complete-book-extraction.service';
import { ImageUtils } from '../utils/image.utils';
import { ProgressEmitter } from '../utils/progress-emitter';
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

  async extractBookWithProgress(req: Request, res: Response) {
    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable Nginx buffering
    
    // Disable compression for SSE
    res.removeHeader('Content-Encoding');
    
    // Write initial comment to establish connection
    res.write(':ok\n\n');
    
    // Flush headers
    res.flushHeaders();

    console.log('[SSE] Starting book extraction with progress');
    
    // Handle client disconnect
    let isClientConnected = true;
    req.on('close', () => {
      console.log('[SSE] Client disconnected');
      isClientConnected = false;
    });
    
    // Send heartbeat every 30 seconds to keep connection alive
    const heartbeatInterval = setInterval(() => {
      if (!isClientConnected) {
        clearInterval(heartbeatInterval);
        return;
      }
      
      try {
        res.write(':heartbeat\n\n');
      } catch (e) {
        console.error('[SSE] Error sending heartbeat:', e);
        clearInterval(heartbeatInterval);
      }
    }, 30000);
    
    try {
      // Check if file was uploaded
      if (!req.file) {
        console.log('[SSE] No file uploaded');
        res.write(`data: ${JSON.stringify({
          type: 'error',
          message: 'No image file uploaded'
        })}\n\n`);
        res.end();
        clearInterval(heartbeatInterval);
        return;
      }

      // Validate image
      const isValid = await ImageUtils.validateImage(req.file.buffer);
      if (!isValid) {
        res.write(`data: ${JSON.stringify({
          type: 'error',
          message: 'Invalid image. Please upload a clear image of a book cover.'
        })}\n\n`);
        res.end();
        clearInterval(heartbeatInterval);
        return;
      }

      // Process image
      const { base64, mimeType } = await ImageUtils.processImage(req.file.buffer);

      // Create progress emitter
      const progressEmitter = new ProgressEmitter();
      
      // Set up progress listener
      progressEmitter.on('progress', (update) => {
        console.log('[SSE] Progress update:', update);
        const data = JSON.stringify({
          type: 'progress',
          ...update
        });
        res.write(`data: ${data}\n\n`);
        // Force flush after each write
        if ((res as any).flush) {
          (res as any).flush();
        }
      });

      // Create new service instance and set emitter
      const extractionService = new CompleteBookExtractionService();
      extractionService.setProgressEmitter(progressEmitter);

      // Send initial progress update
      res.write(`data: ${JSON.stringify({
        type: 'progress',
        stage: 'started',
        message: 'Starting book extraction...',
        timestamp: new Date()
      })}\n\n`);

      // Start extraction
      const result = await extractionService.extractFromImage(`data:${mimeType};base64,${base64}`);

      // Send final result
      if (result.success) {
        const extractedText = result.classification?.type === 'fiction' 
          ? result.extractedContent?.page2Content 
          : result.extractedContent?.page1Content;

        res.write(`data: ${JSON.stringify({
          type: 'result',
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
        })}\n\n`);
      } else {
        res.write(`data: ${JSON.stringify({
          type: 'result',
          success: false,
          error: result.error,
          errorType: result.errorType
        })}\n\n`);
      }

      res.end();
      clearInterval(heartbeatInterval);

    } catch (error: any) {
      console.error('[SSE] Error in book extraction:', error);
      console.error('[SSE] Error stack:', error.stack);
      
      // Make sure to send error to client
      try {
        res.write(`data: ${JSON.stringify({
          type: 'error',
          message: error.message || 'An error occurred while processing the book. Please try again.',
          errorDetails: error.toString()
        })}\n\n`);
      } catch (writeError) {
        console.error('[SSE] Error writing to response:', writeError);
      }
      
      // End the response
      try {
        res.end();
      } catch (endError) {
        console.error('[SSE] Error ending response:', endError);
      }
    }
  }
}