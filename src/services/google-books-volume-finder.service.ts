import axios from 'axios';
import { VolumeSearchResult } from '../types';

interface GoogleBooksVolume {
  id: string;
  volumeInfo: {
    title: string;
    authors?: string[];
    publishedDate?: string;
    description?: string;
    pageCount?: number;
    previewLink?: string;
  };
}

interface GoogleBooksResponse {
  kind: string;
  totalItems: number;
  items?: GoogleBooksVolume[];
}

export class GoogleBooksVolumeFinder {
  private apiUrl = 'https://www.googleapis.com/books/v1/volumes';

  async findVolumeId(title: string, author: string): Promise<string | null> {
    try {
      // Build the search query with exact title and author matching
      const query = `intitle:"${title}" inauthor:"${author}"`;
      
      console.log(`Searching for: "${title}" by "${author}"`);
      console.log(`Query: ${query}`);
      
      // Make the API request without API key
      const response = await axios.get<GoogleBooksResponse>(this.apiUrl, {
        params: {
          q: query,
          printType: 'books',
          maxResults: 10,
          projection: 'full'
        }
      });

      // Check if we got any results
      if (!response.data.items || response.data.items.length === 0) {
        console.log('No books found matching the criteria');
        return null;
      }

      // Find the first result with a preview link
      for (const item of response.data.items) {
        if (item.volumeInfo.previewLink) {
          console.log(`Found book with preview: ${item.volumeInfo.title}`);
          console.log(`Volume ID: ${item.id}`);
          console.log(`Preview link: ${item.volumeInfo.previewLink}`);
          return item.id;
        }
      }

      // If no preview found, return the first result anyway
      const firstResult = response.data.items[0];
      console.log(`No preview found, using first result: ${firstResult.volumeInfo.title}`);
      console.log(`Volume ID: ${firstResult.id}`);
      
      return firstResult.id;
      
    } catch (error: any) {
      console.error('Error searching for book:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      throw new Error(`Failed to find book: ${error.message}`);
    }
  }

  async findVolumeIdWithFallback(title: string, author?: string): Promise<string | null> {
    try {
      // First try with both title and author if author is provided
      if (author) {
        const volumeId = await this.findVolumeId(title, author);
        if (volumeId) return volumeId;
      }

      // Fallback: try with just the title
      console.log('Trying search with title only...');
      const response = await axios.get<GoogleBooksResponse>(this.apiUrl, {
        params: {
          q: `intitle:"${title}"`,
          printType: 'books',
          maxResults: 10,
          projection: 'full'
        }
      });

      if (!response.data.items || response.data.items.length === 0) {
        return null;
      }

      // If author was provided, try to find a match with preview
      if (author) {
        const authorLower = author.toLowerCase();
        
        // First pass: look for author match WITH preview
        for (const item of response.data.items) {
          const bookAuthors = item.volumeInfo.authors || [];
          const hasAuthor = bookAuthors.some(a => 
            a.toLowerCase().includes(authorLower) || 
            authorLower.includes(a.toLowerCase())
          );
          if (hasAuthor && item.volumeInfo.previewLink) {
            console.log(`Found book with matching author and preview: ${item.volumeInfo.title}`);
            return item.id;
          }
        }
        
        // Second pass: author match without preview
        for (const item of response.data.items) {
          const bookAuthors = item.volumeInfo.authors || [];
          const hasAuthor = bookAuthors.some(a => 
            a.toLowerCase().includes(authorLower) || 
            authorLower.includes(a.toLowerCase())
          );
          if (hasAuthor) {
            console.log(`Found book with matching author (no preview): ${item.volumeInfo.title}`);
            return item.id;
          }
        }
      }

      // No author match, find first with preview
      for (const item of response.data.items) {
        if (item.volumeInfo.previewLink) {
          console.log(`Found book with preview (title only): ${item.volumeInfo.title}`);
          return item.id;
        }
      }

      // Last resort: return the first result
      const firstResult = response.data.items[0];
      console.log(`No preview found, using first result: ${firstResult.volumeInfo.title}`);
      return firstResult.id;
      
    } catch (error: any) {
      console.error('Error in fallback search:', error.message);
      return null;
    }
  }

  async getVolumeDetails(volumeId: string): Promise<GoogleBooksVolume | null> {
    try {
      const response = await axios.get<GoogleBooksVolume>(
        `${this.apiUrl}/${volumeId}`,
        {
          params: {
            projection: 'full'
          }
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Error getting volume details:', error.message);
      return null;
    }
  }

  async findMultipleVolumes(title: string, author?: string, maxResults: number = 5): Promise<VolumeSearchResult[]> {
    try {
      const results: VolumeSearchResult[] = [];
      
      // First try with both title and author if author is provided
      if (author) {
        const query = `intitle:"${title}" inauthor:"${author}"`;
        console.log(`Searching with full query: ${query}`);
        
        const response = await axios.get<GoogleBooksResponse>(this.apiUrl, {
          params: {
            q: query,
            printType: 'books',
            maxResults: 10,
            projection: 'full'
          }
        });

        if (response.data.items) {
          for (const item of response.data.items) {
            if (item.volumeInfo.previewLink) {
              results.push({
                volumeId: item.id,
                previewLink: item.volumeInfo.previewLink,
                title: item.volumeInfo.title,
                authors: item.volumeInfo.authors
              });
              if (results.length >= maxResults) return results;
            }
          }
        }
      }

      // If we don't have enough results, try with title only
      if (results.length < maxResults) {
        console.log('Searching with title only...');
        const response = await axios.get<GoogleBooksResponse>(this.apiUrl, {
          params: {
            q: `intitle:"${title}"`,
            printType: 'books',
            maxResults: 20,
            projection: 'full'
          }
        });

        if (response.data.items) {
          // If author provided, prioritize matches with that author
          if (author) {
            const authorLower = author.toLowerCase();
            
            // First pass: author matches with preview
            for (const item of response.data.items) {
              if (!item.volumeInfo.previewLink) continue;
              
              const bookAuthors = item.volumeInfo.authors || [];
              const hasAuthor = bookAuthors.some(a => 
                a.toLowerCase().includes(authorLower) || 
                authorLower.includes(a.toLowerCase())
              );
              
              if (hasAuthor && !results.some(r => r.volumeId === item.id)) {
                results.push({
                  volumeId: item.id,
                  previewLink: item.volumeInfo.previewLink,
                  title: item.volumeInfo.title,
                  authors: item.volumeInfo.authors
                });
                if (results.length >= maxResults) return results;
              }
            }
          }

          // Add any remaining books with preview
          for (const item of response.data.items) {
            if (!item.volumeInfo.previewLink) continue;
            if (!results.some(r => r.volumeId === item.id)) {
              results.push({
                volumeId: item.id,
                previewLink: item.volumeInfo.previewLink,
                title: item.volumeInfo.title,
                authors: item.volumeInfo.authors
              });
              if (results.length >= maxResults) return results;
            }
          }
        }
      }

      console.log(`Found ${results.length} volumes with preview`);
      return results;

    } catch (error: any) {
      console.error('Error finding multiple volumes:', error.message);
      return [];
    }
  }
}