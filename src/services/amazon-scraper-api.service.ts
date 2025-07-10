import axios from 'axios';
import { AmazonPageData } from '../types';

export class AmazonScraperAPIService {
  private scraperApiKey: string;
  private scraperApiUrl = 'http://api.scraperapi.com';

  constructor() {
    this.scraperApiKey = process.env.SCRAPER_API_KEY || '';
    if (!this.scraperApiKey) {
      console.warn('SCRAPER_API_KEY not set - Amazon scraping will fail');
    }
  }

  async getBookPages(isbn: string): Promise<AmazonPageData> {
    try {
      // First, search for the book
      const searchUrl = `https://www.amazon.com/s?k=${isbn}`;
      
      const searchResponse = await axios.get(this.scraperApiUrl, {
        params: {
          api_key: this.scraperApiKey,
          url: searchUrl,
          render: true,  // Enable JavaScript rendering
          wait_for_selector: 'h2.s-size-mini-headline'  // Wait for results
        }
      });

      // Parse the HTML to find the first book link
      const bookUrlMatch = searchResponse.data.match(/\/dp\/([A-Z0-9]{10})/);
      if (!bookUrlMatch) {
        throw new Error('No book found for this ISBN');
      }

      const asin = bookUrlMatch[1];
      const bookUrl = `https://www.amazon.com/dp/${asin}`;

      // Now get the book page
      const bookResponse = await axios.get(this.scraperApiUrl, {
        params: {
          api_key: this.scraperApiKey,
          url: bookUrl,
          render: true,
          wait_for_selector: '#litb-read-iframe-trigger, #imgBlkFront',
          premium: true  // Use premium proxies for harder sites
        }
      });

      // Extract Look Inside data
      const pageData = this.extractLookInsideData(bookResponse.data, asin);
      
      return pageData;
    } catch (error: any) {
      console.error('Error with ScraperAPI:', error.response?.data || error.message);
      throw new Error('Failed to scrape Amazon');
    }
  }

  private extractLookInsideData(html: string, asin: string): AmazonPageData {
    // Try to find Look Inside preview URLs in the HTML
    const imageUrls: string[] = [];
    
    // Pattern 1: Look for litb (Look Inside The Book) image URLs
    const litbMatches = html.matchAll(/https:\/\/[^"'\s]+\/litb\/[^"'\s]+\.jpg/g);
    for (const match of litbMatches) {
      imageUrls.push(match[0]);
    }

    // Pattern 2: Look for page preview URLs
    const pageMatches = html.matchAll(/\/\/[^"'\s]+\/(page_i?\d+|P\d+)\.(jpg|jpeg)/g);
    for (const match of pageMatches) {
      imageUrls.push(`https:${match[0]}`);
    }

    // If no Look Inside images found, construct potential URLs
    if (imageUrls.length === 0) {
      console.log('No Look Inside images found, attempting URL construction...');
      // These are common patterns for Amazon book previews
      imageUrls.push(
        `https://m.media-amazon.com/images/I/${asin}._SX_SCLZZZZZZZ_V1_.jpg`,
        `https://m.media-amazon.com/images/S/sitb-sticker-v3-storefronts/page_i1.jpg`,
        `https://m.media-amazon.com/images/S/sitb-sticker-v3-storefronts/page_i2.jpg`
      );
    }

    return {
      imageUrls: imageUrls.slice(0, 10), // Limit to first 10 pages
      asin
    };
  }

  async getPageImages(isbn: string): Promise<string[]> {
    const pageData = await this.getBookPages(isbn);
    
    // Filter for actual content pages (not cover, copyright, etc.)
    const contentPages = pageData.imageUrls.filter(url => 
      url.includes('page_i') || url.includes('page_1') || url.includes('page_2')
    ).slice(0, 2);

    if (contentPages.length === 0 && pageData.imageUrls.length >= 2) {
      // Fallback: just return first two available pages
      return pageData.imageUrls.slice(0, 2);
    }

    return contentPages;
  }
}