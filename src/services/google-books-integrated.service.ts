import { GoogleBooksVolumeFinder } from './google-books-volume-finder.service';
import { GoogleBooksPlaywrightSimpleService } from './google-books-playwright-simple.service';

export class GoogleBooksIntegratedService {
  private volumeFinder: GoogleBooksVolumeFinder;
  private pageCapture: GoogleBooksPlaywrightSimpleService;

  constructor() {
    this.volumeFinder = new GoogleBooksVolumeFinder();
    this.pageCapture = new GoogleBooksPlaywrightSimpleService();
  }

  async getBookPagesByTitleAuthor(
    title: string, 
    author?: string
  ): Promise<{ volumeId: string; pages: string[] } | null> {
    try {
      console.log(`\n=== Google Books Page Extraction ===`);
      console.log(`Title: ${title}`);
      console.log(`Author: ${author || 'Not specified'}`);
      
      // Step 1: Find the volume ID
      console.log('\nStep 1: Finding volume ID...');
      const volumeId = await this.volumeFinder.findVolumeIdWithFallback(title, author);
      
      if (!volumeId) {
        console.error('Could not find book on Google Books');
        return null;
      }
      
      console.log(`✓ Found volume ID: ${volumeId}`);
      
      // Step 2: Get volume details (optional, for verification)
      const details = await this.volumeFinder.getVolumeDetails(volumeId);
      if (details) {
        console.log(`\nBook details:`);
        console.log(`- Title: ${details.volumeInfo.title}`);
        console.log(`- Authors: ${details.volumeInfo.authors?.join(', ') || 'Unknown'}`);
        console.log(`- Pages: ${details.volumeInfo.pageCount || 'Unknown'}`);
        console.log(`- Published: ${details.volumeInfo.publishedDate || 'Unknown'}`);
      }
      
      // Step 3: Capture pages
      console.log('\nStep 2: Capturing preview pages...');
      const pages = await this.pageCapture.getBookPages(volumeId);
      
      console.log(`✓ Successfully captured ${pages.length} pages`);
      
      return {
        volumeId,
        pages
      };
      
    } catch (error: any) {
      console.error('Error in integrated service:', error.message);
      throw error;
    }
  }

  async getBookPagesByISBN(isbn: string): Promise<{ volumeId: string; pages: string[] } | null> {
    try {
      console.log(`\n=== Google Books Page Extraction (ISBN) ===`);
      console.log(`ISBN: ${isbn}`);
      
      // For ISBN search, we can use the volumeFinder with a special query
      const volumeId = await this.findVolumeIdByISBN(isbn);
      
      if (!volumeId) {
        console.error('Could not find book with this ISBN');
        return null;
      }
      
      console.log(`✓ Found volume ID: ${volumeId}`);
      
      // Capture pages
      console.log('\nCapturing preview pages...');
      const pages = await this.pageCapture.getBookPages(volumeId);
      
      console.log(`✓ Successfully captured ${pages.length} pages`);
      
      return {
        volumeId,
        pages
      };
      
    } catch (error: any) {
      console.error('Error in ISBN search:', error.message);
      throw error;
    }
  }

  private async findVolumeIdByISBN(isbn: string): Promise<string | null> {
    try {
      const axios = require('axios');
      const response = await axios.get('https://www.googleapis.com/books/v1/volumes', {
        params: {
          q: `isbn:${isbn}`,
          maxResults: 1
        }
      });

      if (!response.data.items || response.data.items.length === 0) {
        return null;
      }

      return response.data.items[0].id;
    } catch (error) {
      console.error('Error finding book by ISBN:', error);
      return null;
    }
  }
}