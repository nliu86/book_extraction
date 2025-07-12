import { chromium, Page } from 'playwright';
import axios from 'axios';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

interface GoogleBookVolume {
  volumeId: string;
  title: string;
  previewLink?: string;
}

export class GoogleBooksPlaywrightService {
  private googleBooksApiUrl = 'https://www.googleapis.com/books/v1/volumes';
  private debugDir = path.join(process.cwd(), 'debug', 'page-images');
  private apiKey = process.env.GOOGLE_BOOKS_API_KEY || process.env.GOOGLE_API_KEY;

  constructor() {
    // Ensure debug directory exists
    fs.mkdirSync(this.debugDir, { recursive: true });
    
    if (this.apiKey) {
      console.log('Google Books API key configured');
    } else {
      console.log('Warning: No Google Books API key configured. API calls may be rate-limited.');
    }
  }

  async getBookPages(isbn: string): Promise<string[]> {
    try {
      // Validate ISBN format
      const cleanIsbn = isbn.replace(/-/g, '');
      if (!/^\d{9}[\dXx]$|^\d{13}$/.test(cleanIsbn)) {
        throw new Error('Invalid ISBN format. Must be ISBN-10 or ISBN-13');
      }

      // First, get the Google Books volume ID using ISBN
      console.log(`Searching Google Books for ISBN: ${isbn}`);
      const volumeInfo = await this.getVolumeInfo(isbn);
      
      if (!volumeInfo.volumeId) {
        throw new Error('Book not found on Google Books');
      }

      console.log(`Found volume ID: ${volumeInfo.volumeId}`);
      
      // Use Playwright to get screenshots of preview pages
      return await this.capturePreviewPages(volumeInfo.volumeId, isbn);
      
    } catch (error: any) {
      console.error('Error getting book pages from Google Books:', error.message);
      throw error;
    }
  }

  private async getVolumeInfo(isbn: string): Promise<GoogleBookVolume> {
    try {
      // Search by ISBN
      // Build params - only add key if it's configured
      const params: any = {
        q: `isbn:${isbn}`,
        maxResults: 1
      };
      
      if (this.apiKey) {
        params.key = this.apiKey;
      }
      
      const response = await axios.get(this.googleBooksApiUrl, { params });

      if (!response.data.items || response.data.items.length === 0) {
        throw new Error('No results found for this ISBN');
      }

      const book = response.data.items[0];
      return {
        volumeId: book.id,
        title: book.volumeInfo.title,
        previewLink: book.volumeInfo.previewLink
      };
    } catch (error: any) {
      console.error('Error searching Google Books:', error.message);
      if (error.response?.status === 403) {
        console.error('API key may be invalid or Books API not enabled for this key');
        // Try without API key as fallback
        console.log('Retrying without API key...');
        try {
          const response = await axios.get(this.googleBooksApiUrl, {
            params: {
              q: `isbn:${isbn}`,
              maxResults: 1
            }
          });
          
          if (response.data.items && response.data.items.length > 0) {
            const book = response.data.items[0];
            return {
              volumeId: book.id,
              title: book.volumeInfo.title,
              previewLink: book.volumeInfo.previewLink
            };
          }
        } catch (fallbackError: any) {
          console.error('Fallback request also failed:', fallbackError.message);
        }
      }
      throw new Error('Failed to find book on Google Books');
    }
  }

  private async capturePreviewPages(volumeId: string, isbn: string): Promise<string[]> {
    let browser;
    
    try {
      browser = await chromium.launch({
        headless: true
      });
      const context = await browser.newContext({
        viewport: { width: 1200, height: 1600 }
      });
      const page = await context.newPage();
      
      // Navigate directly to the book reader with preview enabled
      // Using the exact format from the user's example
      const previewUrl = `https://www.google.com/books/edition/_/${volumeId}?hl=en&gbpv=1&pg=PP1`;
      console.log(`Navigating to preview reader: ${previewUrl}`);
      
      await page.goto(previewUrl, { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      });

      // Wait for Google Books UI to fully load
      console.log('Waiting for Google Books reader to load...');
      try {
        await page.waitForSelector('[role="main"]', { timeout: 10000 });
      } catch (e) {
        console.log('Main content not found, continuing anyway...');
      }
      await page.waitForTimeout(3000);

      // Take a debug screenshot with sanitized filename
      const debugScreenshot = await page.screenshot();
      const safeIsbn = isbn.replace(/[^0-9Xx-]/g, '');
      const debugFilename = `${safeIsbn}-${volumeId}-initial-load.png`;
      const debugPath = path.join(this.debugDir, path.basename(debugFilename));
      fs.writeFileSync(debugPath, debugScreenshot);
      console.log(`Saved initial page screenshot to: ${debugPath}`);

      const pageImages: string[] = [];

      // Check if preview is available
      const previewAvailable = await this.checkPreviewAvailability(page);
      if (!previewAvailable) {
        throw new Error('Preview not available for this book');
      }

      // Handle any initial dialogs
      await this.dismissDialogs(page);
      
      // Wait for the navigation controls to be visible (top right area)
      const navControlsVisible = await page.waitForSelector('[role="navigation"], div[jscontroller="pXgSbe"]', {
        timeout: 10000
      }).catch(() => null);
      
      if (!navControlsVisible) {
        console.log('Navigation controls not found, waiting longer...');
        await page.waitForTimeout(5000);
      }
      
      // Wait for book content to load
      console.log('Waiting for book content to load...');
      const bookContentSelectors = [
        'img[jsname="YJubyd"]',
        'img[src*="books.google.com/books/content"]',
        'img[src*="books.googleusercontent.com"]',
        '.BRpageimage',
        'canvas[jsname="YJubyd"]',
        // Additional selectors for page content
        '[role="main"]',
        'div[jscontroller]'
      ];
      
      let contentFound = false;
      for (const selector of bookContentSelectors) {
        const element = await page.locator(selector).first();
        if (await element.isVisible().catch(() => false)) {
          console.log(`Found book content with selector: ${selector}`);
          contentFound = true;
          break;
        }
      }
      
      if (!contentFound) {
        console.log('Book content not loaded properly, waiting additional time...');
        await page.waitForTimeout(5000);
      }
      
      // Capture up to 10 pages
      const maxPages = 10;
      let currentPageUrl = page.url();
      let capturedUrls = new Set<string>();
      capturedUrls.add(this.extractPageNumber(currentPageUrl));
      
      for (let i = 1; i <= maxPages; i++) {
        console.log(`\n--- Capturing page ${i} ---`);
        console.log(`Current page in URL: ${this.extractPageNumber(page.url())}`);
        
        // Wait for content to stabilize
        await page.waitForTimeout(1500);
        
        // Capture current page
        const pageScreenshot = await this.captureCurrentPage(page, isbn, i, volumeId);
        if (pageScreenshot) {
          pageImages.push(pageScreenshot);
        }
        
        // Try to navigate to next page (except on last iteration)
        if (i < maxPages) {
          console.log(`Attempting to navigate to page ${i + 1}...`);
          const hasNextPage = await this.navigateToNextPage(page);
          if (!hasNextPage) {
            console.log(`No more pages available after page ${i}`);
            break;
          }
          
          // Check if we've seen this page before
          const newPageNumber = this.extractPageNumber(page.url());
          if (capturedUrls.has(newPageNumber)) {
            console.log(`Already captured page ${newPageNumber}, stopping`);
            break;
          }
          capturedUrls.add(newPageNumber);
        }
      }

      console.log(`Captured ${pageImages.length} pages`);
      return pageImages;

    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  private async checkPreviewAvailability(page: Page): Promise<boolean> {
    try {
      // Check for "no preview" indicators
      const noPreviewText = await page.locator('text=/no preview available|preview not available|preview unavailable/i').count();
      if (noPreviewText > 0) {
        console.log('Found "no preview" text indicator');
        return false;
      }

      // For direct preview URLs with gbpv=1, assume preview is available
      const currentUrl = page.url();
      if (currentUrl.includes('gbpv=1')) {
        console.log('Direct preview URL detected, assuming preview is available');
        return true;
      }

      // Check if there's a preview button or actual content
      const previewElements = await page.locator('[aria-label="Preview book"], button:has-text("Preview"), img[jsname="YJubyd"], .BRpageimage').count();
      console.log(`Found ${previewElements} preview elements`);
      return previewElements > 0;
    } catch (error) {
      console.error('Error checking preview availability:', error);
      return true; // Assume available if we can't determine
    }
  }

  private async dismissDialogs(page: Page): Promise<void> {
    try {
      // Look for common dialog dismiss buttons
      const dismissSelectors = [
        'button:has-text("Dismiss")',
        'button:has-text("Start tour")', 
        'button:has-text("Got it")',
        'button:has-text("No thanks")',
        'button[aria-label="Close"]',
        'button[aria-label="Dismiss"]',
        // Google Books specific dialogs
        'div[role="dialog"] button',
        'div[jsname="V67aGc"] button' // Modal close button
      ];
      
      for (const selector of dismissSelectors) {
        try {
          const button = page.locator(selector).first();
          if (await button.isVisible({ timeout: 1000 })) {
            console.log(`Found dialog button to dismiss: ${selector}`);
            await button.click();
            await page.waitForTimeout(1500);
            break;
          }
        } catch (e) {
          // Continue to next selector
        }
      }
    } catch (e) {
      console.log('No dialogs to dismiss');
    }
  }

  private async navigateToNextPage(page: Page): Promise<boolean> {
    try {
      // Store initial state to detect changes
      const initialUrl = page.url();
      const initialPageNumber = this.extractPageNumber(initialUrl);
      
      console.log('Current URL:', initialUrl);
      console.log('Attempting page navigation...');
      
      // Method 1: Try keyboard navigation first
      await page.keyboard.press('ArrowRight');
      console.log('Pressed ArrowRight key');
      
      // Wait for navigation with better detection
      await page.waitForTimeout(1500);
      
      // Check if URL changed (page number should increment)
      let newUrl = page.url();
      let newPageNumber = this.extractPageNumber(newUrl);
      
      if (newPageNumber !== initialPageNumber) {
        console.log(`Navigation successful - moved from ${initialPageNumber} to ${newPageNumber}`);
        return true;
      }
      
      // Method 2: Try clicking the page itself (sometimes enables keyboard nav)
      console.log('Keyboard nav may have failed, trying page click...');
      await page.click('[role="main"]', { position: { x: 600, y: 400 } });
      await page.waitForTimeout(500);
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(1500);
      
      // Check if navigation worked
      newUrl = page.url();
      newPageNumber = this.extractPageNumber(newUrl);
      
      if (newPageNumber !== initialPageNumber) {
        console.log(`Navigation successful after click - moved to page ${newPageNumber}`);
        return true;
      }
      
      // Method 3: Try clicking navigation buttons
      console.log('Trying navigation button click...');
      
      // Look for navigation controls specific to Google Books
      const navigationSelectors = [
        // Google Books specific selectors
        'button[jsname="O6lKKd"]', // Next page button
        'div[jsname="BlSEhc"] button:last-child', // Navigation bar buttons
        'button[aria-label*="next" i]',
        'button[aria-label*="Next" i]',
        'button[title*="next" i]',
        'button[title*="Next" i]',
        // Generic forward buttons
        'button[aria-label="Go forward"]',
        'button[aria-label="Go to next page"]',
        '[role="navigation"] button:has(svg)',
        // Try any button that might be navigation
        'button:has(path[d*="M12 4l-1.41"])', // Right arrow SVG path
        'button:has(path[d*="M10 6L8"])'  // Another common arrow path
      ];
      
      for (const selector of navigationSelectors) {
        try {
          const buttons = await page.locator(selector).all();
          
          // Try clicking buttons that are likely navigation controls
          for (const button of buttons) {
            if (await button.isVisible() && await button.isEnabled()) {
              const box = await button.boundingBox();
              // Navigation buttons are typically on the right side or bottom
              if (box && (box.x > 600 || box.y > 800)) {
                console.log(`Clicking button at position: ${box.x}, ${box.y}`);
                await button.click();
                await page.waitForTimeout(2000);
                
                // Check if navigation succeeded
                const finalUrl = page.url();
                const finalPageNumber = this.extractPageNumber(finalUrl);
                
                if (finalPageNumber !== initialPageNumber) {
                  console.log(`Button navigation successful - moved to page ${finalPageNumber}`);
                  return true;
                }
              }
            }
          }
        } catch (e) {
          // Continue to next selector
        }
      }
      
      console.log('Navigation failed - no method worked');
      return false;
      
    } catch (error) {
      console.error('Error during navigation:', error);
      return false;
    }
  }

  private extractPageNumber(url: string): string {
    // Extract page number from URL (e.g., pg=PP1, pg=PA1, pg=PA2)
    const match = url.match(/pg=([^&]+)/);
    return match ? match[1] : 'unknown';
  }

  private async captureCurrentPage(page: Page, isbn: string, pageNumber: number, volumeId: string): Promise<string | null> {
    try {
      // Wait for any animations to complete
      await page.waitForTimeout(1000);

      // For Google Books, the main content area contains the page
      // We'll capture the entire main content area which includes the page image
      const mainContent = page.locator('[role="main"]').first();
      
      if (await mainContent.isVisible()) {
        // Get the viewport to ensure we capture the visible area
        const viewport = page.viewportSize();
        if (viewport) {
          // Capture the visible area of the main content
          const screenshot = await page.screenshot({
            clip: {
              x: 0,
              y: 100, // Skip the top toolbar
              width: viewport.width,
              height: viewport.height - 200 // Skip bottom toolbar
            }
          });
          
          // Save to debug folder with sanitized filename
          const safeIsbn = isbn.replace(/[^0-9Xx-]/g, '');
          const pageId = this.extractPageNumber(page.url());
          const filename = `${safeIsbn}-${volumeId}-page${pageNumber}-${pageId}.png`;
          const filepath = path.join(this.debugDir, path.basename(filename));
          fs.writeFileSync(filepath, screenshot);
          console.log(`Saved page image to: ${filepath}`);
          
          // Convert to base64
          const base64 = screenshot.toString('base64');
          return `data:image/png;base64,${base64}`;
        }
      }

      // Fallback: try specific image selectors
      const imageSelectors = [
        'img[jsname="YJubyd"]',
        '.BRpageimage',
        'img[src*="books.google.com/books/content"]',
        '[role="main"] img'
      ];

      for (const selector of imageSelectors) {
        const element = page.locator(selector).first();
        if (await element.isVisible()) {
          const screenshot = await element.screenshot();
          
          // Save to debug folder with sanitized filename
          const safeIsbn = isbn.replace(/[^0-9Xx-]/g, '');
          const pageId = this.extractPageNumber(page.url());
          const filename = `${safeIsbn}-${volumeId}-page${pageNumber}-${pageId}-img.png`;
          const filepath = path.join(this.debugDir, path.basename(filename));
          fs.writeFileSync(filepath, screenshot);
          console.log(`Saved page image to: ${filepath} (selector: ${selector})`);
          
          // Convert to base64
          const base64 = screenshot.toString('base64');
          return `data:image/png;base64,${base64}`;
        }
      }

      // Last resort: capture full page
      console.log('Using fallback: capturing full page');
      const screenshot = await page.screenshot({ fullPage: false });
      
      // Save to debug folder with sanitized filename
      const safeIsbn = isbn.replace(/[^0-9Xx-]/g, '');
      const pageId = this.extractPageNumber(page.url());
      const filename = `${safeIsbn}-${volumeId}-page${pageNumber}-${pageId}-fallback.png`;
      const filepath = path.join(this.debugDir, path.basename(filename));
      fs.writeFileSync(filepath, screenshot);
      console.log(`Saved fallback image to: ${filepath}`);
      
      // Convert to base64
      const base64 = screenshot.toString('base64');
      return `data:image/png;base64,${base64}`;

    } catch (error) {
      console.error('Error capturing page:', error);
      return null;
    }
  }
}