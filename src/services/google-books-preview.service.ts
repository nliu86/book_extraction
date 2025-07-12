import puppeteer, { Page } from 'puppeteer';
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

export class GoogleBooksPreviewService {
  private googleBooksApiUrl = 'https://www.googleapis.com/books/v1/volumes';
  private debugDir = path.join(process.cwd(), 'debug', 'page-images');

  async getBookPages(isbn: string): Promise<string[]> {
    try {
      // First, get the Google Books volume ID using ISBN
      console.log(`Searching Google Books for ISBN: ${isbn}`);
      const volumeInfo = await this.getVolumeInfo(isbn);
      
      if (!volumeInfo.volumeId) {
        throw new Error('Book not found on Google Books');
      }

      console.log(`Found volume ID: ${volumeInfo.volumeId}`);
      
      // Use Puppeteer to get screenshots of preview pages
      return await this.capturePreviewPages(volumeInfo.volumeId, isbn);
      
    } catch (error: any) {
      console.error('Error getting book pages from Google Books:', error.message);
      throw error;
    }
  }

  private async getVolumeInfo(isbn: string): Promise<GoogleBookVolume> {
    try {
      // Search by ISBN
      const response = await axios.get(this.googleBooksApiUrl, {
        params: {
          q: `isbn:${isbn}`,
          maxResults: 1
        }
      });

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
      throw new Error('Failed to find book on Google Books');
    }
  }

  private async capturePreviewPages(volumeId: string, isbn: string): Promise<string[]> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
    });

    try {
      const page = await browser.newPage();
      
      // Set viewport for consistent screenshots
      await page.setViewport({ width: 1200, height: 1600 });
      
      // Navigate directly to the book preview reader
      // Using the same URL format as shown in the user's screenshot
      const previewUrl = `https://books.google.com/books?id=${volumeId}&printsec=frontcover&source=gbs_api&hl=en&gbpv=1&pg=PP1`;
      console.log(`Navigating directly to preview reader: ${previewUrl}`);
      
      await page.goto(previewUrl, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });

      // Wait for the preview to load
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Log page content for debugging
      const pageTitle = await page.title();
      console.log(`Page title: ${pageTitle}`);
      
      // Try to find all buttons on the page
      const buttons = await page.evaluate(() => {
        const allButtons = Array.from(document.querySelectorAll('button, [role="button"], div[class*="button"]'));
        return allButtons.map(btn => ({
          text: btn.textContent?.trim() || '',
          ariaLabel: btn.getAttribute('aria-label') || '',
          className: btn.className || '',
          tagName: btn.tagName
        }));
      });
      console.log('Found buttons:', JSON.stringify(buttons, null, 2));

      const pageImages: string[] = [];

      // Check if preview is available
      const previewAvailable = await this.checkPreviewAvailability(page);
      if (!previewAvailable) {
        throw new Error('Preview not available for this book');
      }

      // Wait for the preview reader to load
      console.log('Waiting for preview reader to load...');
      
      // Check if we're in the reader view by looking for the book content
      const bookImageSelectors = [
        'img[jsname="YJubyd"]',
        'img[aria-label*="Page"]',
        '.BRpageimage',
        '#page_view_canvas'
      ];
      
      let readerLoaded = false;
      for (const selector of bookImageSelectors) {
        const element = await page.$(selector);
        if (element) {
          console.log(`Found book content with selector: ${selector}`);
          readerLoaded = true;
          break;
        }
      }
      
      if (!readerLoaded) {
        console.log('Reader not loaded, waiting for any book image...');
        await page.waitForSelector('img[src*="books.google.com"], canvas', {
          timeout: 10000
        }).catch(() => console.log('Still waiting for reader...'));
      }

      // Check for and dismiss any dialogs that appear
      try {
        // Look for the "Discover what's new" dialog
        const dialogSelectors = [
          'button:has-text("Start tour")',
          'button:has-text("Dismiss")',
          'button[aria-label="Dismiss"]',
          '[role="dialog"] button'
        ];
        
        for (const selector of dialogSelectors) {
          const dismissButton = await page.$(selector);
          if (dismissButton) {
            const buttonText = await page.evaluate(el => el.textContent?.trim() || '', dismissButton);
            if (buttonText === 'Dismiss' || buttonText === 'Start tour') {
              console.log(`Found dialog button: "${buttonText}", clicking it...`);
              await dismissButton.click();
              await new Promise(resolve => setTimeout(resolve, 2000));
              break;
            }
          }
        }
      } catch (e) {
        console.log('No dialogs to dismiss');
      }

      // Check if we need to click the Preview button to open the reader
      const previewButton = await page.$('[aria-label="Preview book"], .omtrnc.OMvBaf');
      if (previewButton) {
        console.log('Found Preview button, clicking to open reader...');
        await previewButton.click();
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Wait for the reader to load
        await page.waitForSelector('#viewer-container, .ebooksContainer, [jsname="tJHJj"]', {
          timeout: 10000
        }).catch(() => console.log('Waiting for reader to open...'));
      }
      
      // Click on the book content area to enable keyboard navigation
      console.log('Clicking on book content area to enable navigation...');
      const bookContent = await page.$('img[jsname="YJubyd"], img[jsname="YKwuPb"], .pageImageDisplay');
      if (bookContent) {
        await bookContent.click();
      } else {
        // Fallback: click center of page
        const { width, height } = await page.viewport() || { width: 1200, height: 1600 };
        await page.mouse.click(width / 2, height / 2);
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Capture up to 10 pages
      const maxPages = 10;
      let previousPageIndicator = '';
      
      for (let i = 1; i <= maxPages; i++) {
        console.log(`Capturing page ${i}...`);
        
        // Get current page indicator to detect if we're stuck
        const currentPageIndicator = await this.getCurrentPageIndicator(page);
        if (currentPageIndicator === previousPageIndicator && i > 1) {
          console.log(`Still on same page (${currentPageIndicator}), stopping capture`);
          break;
        }
        previousPageIndicator = currentPageIndicator;
        
        // Capture current page
        const pageScreenshot = await this.captureCurrentPage(page, isbn, i);
        if (pageScreenshot) {
          pageImages.push(pageScreenshot);
        }
        
        // Try to navigate to next page (except on last iteration)
        if (i < maxPages) {
          console.log(`Navigating to page ${i + 1}...`);
          const hasNextPage = await this.scrollToNextPage(page);
          if (!hasNextPage) {
            console.log(`No more pages available after page ${i}`);
            break;
          }
          // Wait for page to load
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      console.log(`Captured ${pageImages.length} pages`);
      return pageImages;

    } finally {
      await browser.close();
    }
  }

  private async checkPreviewAvailability(page: Page): Promise<boolean> {
    try {
      // Check for common "no preview" indicators
      const noPreviewText = await page.evaluate(() => {
        const body = document.body.innerText || '';
        return body.includes('No preview available') || body.includes('Preview not available');
      });
      
      if (noPreviewText) {
        return false;
      }

      // In the new interface, check for the preview button or book image
      const hasPreviewButton = await page.$('[aria-label="Preview book"]');
      const hasBookImage = await page.$('img[jsname="YKwuPb"], div[jsname="tJHJj"] img');
      
      return hasPreviewButton !== null || hasBookImage !== null;
    } catch (error) {
      console.error('Error checking preview availability:', error);
      return true; // Assume preview is available if we can't determine
    }
  }

  private async getCurrentPageIndicator(page: Page): Promise<string> {
    try {
      // For new interface, check the actual book content
      const bookContent = await page.evaluate(() => {
        // Look for the actual page content in various containers
        const contentSelectors = [
          '.book-reader-container',
          '#viewport',
          '.pageImageDisplay',
          '[role="main"]'
        ];
        
        for (const selector of contentSelectors) {
          const element = document.querySelector(selector);
          if (element) {
            // Get text content, but exclude UI elements
            const clone = element.cloneNode(true) as HTMLElement;
            // Remove buttons and navigation elements
            clone.querySelectorAll('button, [role="button"], .navigation, .toolbar').forEach(el => el.remove());
            const text = clone.textContent || '';
            if (text.trim().length > 0) {
              // Return first 200 chars as fingerprint
              return text.trim().substring(0, 200);
            }
          }
        }
        return '';
      });
      
      if (bookContent) {
        return bookContent;
      }
      
      // Try to find page number indicators
      const pageSelectors = [
        '[aria-label*="Page"]',
        '.page-number',
        'input[type="number"][aria-label*="Page"]',
        '[role="status"]'
      ];

      for (const selector of pageSelectors) {
        const element = await page.$(selector);
        if (element) {
          const text = await page.evaluate(el => {
            return el.textContent || (el as any).value || el.getAttribute('aria-label') || '';
          }, element);
          if (text && text.trim().length > 0) {
            return text.trim();
          }
        }
      }

      // Final fallback: get the page URL or current page number
      const currentUrl = page.url();
      const pageMatch = currentUrl.match(/pg=([^&]+)/);
      return pageMatch ? pageMatch[1] : 'unknown-page';
    } catch (error) {
      console.error('Error getting page indicator:', error);
      return '';
    }
  }

  private async initializePreview(page: Page): Promise<void> {
    try {
      // Look for "Read sample" or similar buttons
      const readSampleSelectors = [
        'button[aria-label*="Read sample"]',
        'button[aria-label*="Preview"]',
        'button:has-text("Read sample")',
        'button:has-text("Preview")',
        '.read-sample-button',
        '[data-action="preview"]'
      ];

      for (const selector of readSampleSelectors) {
        try {
          const button = await page.$(selector);
          if (button) {
            console.log('Found preview button, clicking...');
            await button.click();
            await new Promise(resolve => setTimeout(resolve, 3000));
            break;
          }
        } catch (e) {
          // Continue to next selector
        }
      }

      // Wait for the viewer to fully load
      await page.waitForSelector('#viewport, #page_view_canvas, .pageImageDisplay', { 
        timeout: 10000 
      }).catch(() => console.log('Preview viewer not found with expected selectors'));
      
    } catch (error) {
      console.error('Error initializing preview:', error);
    }
  }

  private async scrollToNextPage(page: Page): Promise<boolean> {
    try {
      // First try keyboard navigation which works in the new interface
      console.log('Attempting keyboard navigation (ArrowRight)...');
      await page.keyboard.press('ArrowRight');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check if page changed by looking at the viewport content
      const currentContent = await page.evaluate(() => {
        const viewport = document.querySelector('#viewport, .book-reader-container');
        return viewport ? viewport.textContent?.substring(0, 100) : '';
      });
      
      if (currentContent && currentContent.length > 10) {
        console.log('Page navigation successful via keyboard');
        return true;
      }
      
      // If keyboard didn't work, try button navigation
      console.log('Keyboard navigation may have failed, trying button navigation...');
      
      // Look for the next page navigation button
      const nextButtonSelectors = [
        // Navigation buttons in the top right (as shown in screenshot)
        'div[jscontroller="pXgSbe"] button[jsname="ONH6Ef"]',
        'button[jsname="ONH6Ef"]',
        'button[aria-label="Next page"]',
        'button[aria-label="Go to next page"]',
        // Try finding by position in the navigation bar
        'div[role="navigation"] button:nth-child(2)',
        'div[jsname="tJHJj"] button:nth-of-type(2)',
        // Icon-based selectors for the arrow button
        'button svg path[d*="M10"]',
        'button:has(svg[viewBox="0 0 24 24"])',
      ];

      for (const selector of nextButtonSelectors) {
        try {
          const nextButton = await page.$(selector);
          if (nextButton) {
            // Check if button is visible and enabled
            const isClickable = await page.evaluate(el => {
              const rect = el.getBoundingClientRect();
              const isVisible = rect.width > 0 && rect.height > 0;
              const isDisabled = (el as any).disabled || el.getAttribute('aria-disabled') === 'true';
              return isVisible && !isDisabled;
            }, nextButton);
            
            if (isClickable) {
              console.log(`Found clickable next button with selector: ${selector}`);
              await nextButton.click();
              // Wait for page transition
              await new Promise(resolve => setTimeout(resolve, 2000));
              return true;
            }
          }
        } catch (e) {
          // Continue to next selector
        }
      }

      // Try old interface navigation buttons
      const navButtons = await page.$$('.jfk-button-narrow');
      if (navButtons.length >= 2) {
        console.log(`Found ${navButtons.length} narrow buttons, trying the second one`);
        const isClickable = await page.evaluate(el => {
          const rect = el.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        }, navButtons[1]);
        
        if (isClickable) {
          await navButtons[1].click();
          await new Promise(resolve => setTimeout(resolve, 2000));
          return true;
        }
      }

      console.log('No navigation method worked');
      return false;
      
    } catch (error) {
      console.error('Error navigating to next page:', error);
      return false;
    }
  }

  private async navigateToNextPage(page: Page): Promise<boolean> {
    // This method is now replaced by scrollToNextPage
    return this.scrollToNextPage(page);
  }

  private async captureCurrentPage(page: Page, isbn: string, pageNumber: number): Promise<string | null> {
    try {
      // Wait for any animations to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      // For scrollable previews, capture the viewport
      const viewportHeight = await page.evaluate(() => window.innerHeight);
      const viewportWidth = await page.evaluate(() => window.innerWidth);
      
      // Set a specific viewport area for consistent captures
      await page.setViewport({ 
        width: Math.min(viewportWidth, 800), 
        height: Math.min(viewportHeight, 1200) 
      });

      // Try to find the main content area in the direct preview
      const contentSelectors = [
        // Direct preview image selectors
        'img[jsname="YJubyd"]', // Main book page image
        'img[jsname="YKwuPb"]',
        // Canvas elements (some pages render as canvas)
        'canvas[jsname="UzWXSb"]',
        'canvas.page-canvas',
        // Generic page image selectors
        '.pageImageDisplay img',
        'img[alt*="Page"]',
        // Fallback selectors
        'div[jscontroller="pXgSbe"] img',
        '[role="main"] img',
      ];

      let captured = false;
      
      for (const selector of contentSelectors) {
        const element = await page.$(selector);
        if (element) {
          // Check if element is visible and has content
          const isVisible = await page.evaluate((sel) => {
            const el = document.querySelector(sel);
            if (!el) return false;
            const rect = el.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
          }, selector);
          
          if (isVisible) {
            const screenshot = await element.screenshot({ 
              encoding: 'base64',
              type: 'png'
            });
            
            // Save to debug folder
            const filename = `${isbn}-page${pageNumber}.png`;
            const filepath = path.join(this.debugDir, filename);
            fs.writeFileSync(filepath, Buffer.from(screenshot, 'base64'));
            console.log(`Saved page image to: ${filepath} (selector: ${selector})`);
            
            captured = true;
            return `data:image/png;base64,${screenshot}`;
          }
        }
      }

      // Fallback: capture the visible viewport
      if (!captured) {
        console.log('Using fallback: capturing visible viewport');
        const screenshot = await page.screenshot({ 
          encoding: 'base64',
          type: 'png',
          fullPage: false
        });
        
        // Save to debug folder
        const filename = `${isbn}-page${pageNumber}-viewport.png`;
        const filepath = path.join(this.debugDir, filename);
        fs.writeFileSync(filepath, Buffer.from(screenshot, 'base64'));
        console.log(`Saved viewport image to: ${filepath}`);
        
        return `data:image/png;base64,${screenshot}`;
      }
      
      return null; // Return null if no capture was successful

    } catch (error) {
      console.error('Error capturing page:', error);
      return null;
    }
  }
}