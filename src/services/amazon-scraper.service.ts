import puppeteer from 'puppeteer';
import { AmazonPageData } from '../types';

export class AmazonScraperService {
  async getBookPages(isbn: string): Promise<AmazonPageData> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
      const page = await browser.newPage();
      
      // Set user agent to avoid detection
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      );

      // Navigate to Amazon search with ISBN
      const searchUrl = `https://www.amazon.com/s?k=${isbn}`;
      await page.goto(searchUrl, { waitUntil: 'networkidle2' });

      // Click on the first book result
      const firstBookLink = await page.$('h2.s-size-mini-headline a');
      if (!firstBookLink) {
        throw new Error('No book found for this ISBN');
      }

      await firstBookLink.click();
      await page.waitForNavigation({ waitUntil: 'networkidle2' });

      // Check if Look Inside is available
      const lookInsideButton = await page.$('#litb-read-iframe-trigger, #imgBlkFront, #imageBlockBooksImageBlock');
      if (!lookInsideButton) {
        throw new Error('Look Inside not available for this book');
      }

      // Click to open Look Inside
      await lookInsideButton.click();
      
      // Wait for the iframe or the page data to load
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Try to get page data from window.initialPageData
      const pageData = await page.evaluate(() => {
        // Check if the Look Inside iframe exists
        const iframe = document.querySelector('#litb-read-frame');
        if (iframe) {
          // Try to access iframe content (might be blocked by CORS)
          return { imageUrls: [] };
        }

        // Check for window.initialPageData
        if ((window as any).initialPageData) {
          const data = (window as any).initialPageData;
          const imageUrls: string[] = [];
          
          // Extract image URLs from the data structure
          if (data.imageUrl) {
            imageUrls.push(data.imageUrl);
          }
          
          // Look for page images in various possible locations
          if (data.pages) {
            data.pages.forEach((page: any) => {
              if (page.imageUrl) {
                imageUrls.push(page.imageUrl);
              }
            });
          }

          return { imageUrls, asin: data.asin };
        }

        return { imageUrls: [] };
      });

      // If no images found, try alternative approach
      if (pageData.imageUrls.length === 0) {
        // Extract ASIN from URL
        const asin = await page.evaluate(() => {
          const match = window.location.pathname.match(/\/dp\/([A-Z0-9]{10})/);
          return match ? match[1] : null;
        });

        if (asin) {
          // Try to construct page URLs based on common patterns
          const baseUrl = `https://m.media-amazon.com/images/I/`;
          pageData.imageUrls = [
            `/nb10/graphics/page_i1.jpg`,
            `/nb10/graphics/page_i2.jpg`
          ];
          pageData.asin = asin;
        }
      }

      return pageData;
    } catch (error) {
      console.error('Error scraping Amazon:', error);
      throw error;
    } finally {
      await browser.close();
    }
  }

  async getPageImages(isbn: string): Promise<string[]> {
    const pageData = await this.getBookPages(isbn);
    
    // Download the first two content pages (excluding cover, title page, etc.)
    // Typically page_i1.jpg and page_i2.jpg are the first content pages
    const contentPageUrls = pageData.imageUrls.filter(url => 
      url.includes('page_i1') || url.includes('page_i2') ||
      url.includes('page_11') || url.includes('page_12')
    ).slice(0, 2);

    if (contentPageUrls.length === 0 && pageData.imageUrls.length >= 2) {
      // Fallback: just take the first two available pages
      return pageData.imageUrls.slice(0, 2);
    }

    return contentPageUrls;
  }
}