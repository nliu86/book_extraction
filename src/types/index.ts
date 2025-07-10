export interface BookDetectionResult {
  isBook: boolean;
  title?: string;
  author?: string;
  confidence: number;
}

export interface ISBNSearchResult {
  isbn10?: string;
  isbn13?: string;
  found: boolean;
}

export interface PageContent {
  pageNumber: number;
  text: string;
  imageUrl?: string;
}

export interface BookClassification {
  type: 'fiction' | 'non-fiction';
  confidence: number;
}

export interface BookExtractionResult {
  success: boolean;
  text?: string;
  bookType?: 'fiction' | 'non-fiction';
  title?: string;
  author?: string;
  isbn?: string;
  error?: string;
}

export interface AmazonPageData {
  imageUrls: string[];
  asin?: string;
}