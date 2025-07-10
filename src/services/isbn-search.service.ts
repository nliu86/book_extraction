import axios from 'axios';
import { ISBNSearchResult } from '../types';

export class ISBNSearchService {
  private googleBooksApiUrl = 'https://www.googleapis.com/books/v1/volumes';

  async searchISBN(title: string, author?: string): Promise<ISBNSearchResult> {
    try {
      // Build search query
      let query = `intitle:"${title}"`;
      if (author) {
        query += ` inauthor:"${author}"`;
      }

      const response = await axios.get(this.googleBooksApiUrl, {
        params: {
          q: query,
          maxResults: 5
        }
      });

      if (!response.data.items || response.data.items.length === 0) {
        return { found: false };
      }

      // Look through results for ISBN
      for (const item of response.data.items) {
        const volumeInfo = item.volumeInfo;
        if (volumeInfo.industryIdentifiers) {
          const isbn10 = volumeInfo.industryIdentifiers.find(
            (id: any) => id.type === 'ISBN_10'
          );
          const isbn13 = volumeInfo.industryIdentifiers.find(
            (id: any) => id.type === 'ISBN_13'
          );

          if (isbn10 || isbn13) {
            return {
              isbn10: isbn10?.identifier,
              isbn13: isbn13?.identifier,
              found: true
            };
          }
        }
      }

      // Try Open Library as fallback
      return await this.searchOpenLibrary(title, author);
    } catch (error) {
      console.error('Error searching ISBN:', error);
      return { found: false };
    }
  }

  private async searchOpenLibrary(title: string, author?: string): Promise<ISBNSearchResult> {
    try {
      const query = author ? `${title} ${author}` : title;
      const response = await axios.get('https://openlibrary.org/search.json', {
        params: {
          q: query,
          limit: 5
        }
      });

      if (!response.data.docs || response.data.docs.length === 0) {
        return { found: false };
      }

      for (const doc of response.data.docs) {
        if (doc.isbn) {
          const isbn13 = doc.isbn.find((isbn: string) => isbn.length === 13);
          const isbn10 = doc.isbn.find((isbn: string) => isbn.length === 10);

          if (isbn13 || isbn10) {
            return {
              isbn10,
              isbn13,
              found: true
            };
          }
        }
      }

      return { found: false };
    } catch (error) {
      console.error('Error searching Open Library:', error);
      return { found: false };
    }
  }
}