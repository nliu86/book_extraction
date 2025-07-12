import { chromium, Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

export class GoogleBooksPlaywrightSimpleService {
  private debugDir = path.join(process.cwd(), 'debug', 'page-images-simple');

  constructor() {
    // Ensure debug directory exists
    fs.mkdirSync(this.debugDir, { recursive: true });
  }

  async getBookPages(volumeId: string): Promise<string[]> {
    // Default URL construction for backward compatibility
    const url = `https://www.google.com/books/edition/_/${volumeId}?hl=en&gbpv=1&pg=PP1`;
    return this.getBookPagesFromUrl(url);
  }

  async getBookPagesFromPreviewLink(previewLink: string): Promise<string[]> {
    // Ensure the preview link has the necessary parameters
    let url = previewLink;
    
    // Add gbpv=1 if not present (enables page view)
    if (!url.includes('gbpv=')) {
      url += url.includes('?') ? '&gbpv=1' : '?gbpv=1';
    }
    
    // Add pg=PP1 if not present (start at first page)
    if (!url.includes('pg=')) {
      url += '&pg=PP1';
    }
    
    console.log(`Using preview link: ${url}`);
    return this.getBookPagesFromUrl(url);
  }

  private async getBookPagesFromUrl(url: string): Promise<string[]> {
    let browser;
    
    try {
      // Extract volumeId from URL for filename
      const volumeIdMatch = url.match(/\/edition\/[^\/]*\/([^?]+)/);
      const volumeId = volumeIdMatch ? volumeIdMatch[1] : 'unknown';
      
      browser = await chromium.launch({
        headless: true, // Set to true for production
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const context = await browser.newContext({
        viewport: { width: 1400, height: 900 }
      });
      const page = await context.newPage();
      
      console.log(`Navigating to: ${url}`);
      
      await page.goto(url, { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });

      // Wait for page to fully load
      await page.waitForTimeout(3000);
      
      // Dismiss any dialogs if present
      await this.dismissDialogs(page);
      
      const pageImages: string[] = [];
      const maxPages = 10;
      
      for (let i = 1; i <= maxPages; i++) {
        console.log(`\nCapturing page ${i}...`);
        
        // Wait a bit for page to stabilize
        await page.waitForTimeout(1500);
        
        // Capture the current page
        const screenshot = await page.screenshot({
          fullPage: false
        });
        
        // Save screenshot
        const filename = `${volumeId}-page${i}.png`;
        const filepath = path.join(this.debugDir, filename);
        fs.writeFileSync(filepath, screenshot);
        console.log(`Saved: ${filepath}`);
        
        // Convert to base64
        const base64 = screenshot.toString('base64');
        pageImages.push(`data:image/png;base64,${base64}`);
        
        // Try to go to next page if not the last iteration
        if (i < maxPages) {
          console.log('Looking for next button...');
          
          // Next button is typically in the upper right corner
          // Try multiple selectors for the next button
          const nextButtonSelectors = [
            // Upper right navigation buttons
            'button[aria-label="Next page"]',
            'button[aria-label="Go to next page"]',
            'div[role="button"][aria-label*="Next"]',
            // Try clicking in the upper right area where next button usually is
            'div[jsname="Ylfh8"] button:last-child',
            // Navigation toolbar buttons
            'div[role="toolbar"] button[aria-label*="next" i]',
            'div[role="toolbar"] button[aria-label*="Next" i]',
            // Generic next button
            'button:has(svg path[d*="M12"])',
            // Sometimes it's just an icon button in the top right
            'button[jsname="nBTLFe"]'
          ];
          
          let clicked = false;
          for (const selector of nextButtonSelectors) {
            try {
              const button = page.locator(selector).first();
              if (await button.isVisible({ timeout: 1000 })) {
                const box = await button.boundingBox();
                // Make sure it's in the upper right area
                if (box && box.x > 700 && box.y < 200) {
                  console.log(`Clicking next button at: ${box.x}, ${box.y}`);
                  await button.click();
                  clicked = true;
                  break;
                }
              }
            } catch (e) {
              // Continue to next selector
            }
          }
          
          if (!clicked) {
            // As a fallback, try keyboard navigation
            console.log('Next button not found, trying keyboard navigation...');
            await page.keyboard.press('ArrowRight');
          }
          
          // Wait for page transition
          await page.waitForTimeout(2000);
        }
      }
      
      console.log(`\nTotal pages captured: ${pageImages.length}`);
      return pageImages;

    } catch (error: any) {
      console.error('Error capturing pages:', error.message);
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  private async dismissDialogs(page: Page): Promise<void> {
    try {
      // Look for any blocking dialogs
      const dismissButtons = [
        'button:has-text("Dismiss")',
        'button:has-text("Start tour")',
        'button:has-text("Got it")',
        'button:has-text("No thanks")',
        'div[role="dialog"] button[aria-label="Close"]'
      ];
      
      for (const selector of dismissButtons) {
        try {
          const button = page.locator(selector);
          if (await button.isVisible({ timeout: 500 })) {
            console.log(`Dismissing dialog with: ${selector}`);
            await button.click();
            await page.waitForTimeout(1000);
            return;
          }
        } catch (e) {
          // Continue
        }
      }
    } catch (e) {
      // No dialogs to dismiss
    }
  }
}