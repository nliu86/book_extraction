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

export interface CompleteExtractionResult {
  success: boolean;
  isBook: boolean;
  bookInfo?: {
    title: string;
    author: string;
    volumeId: string;
  };
  classification?: {
    type: 'fiction' | 'non-fiction';
    confidence: number;
    reasoning?: string;
  };
  extractedContent?: {
    page1Content?: string;  // For non-fiction
    page2Content?: string;  // For fiction
    actualPageNumber: number; // Which captured page was used
  };
  debugInfo?: {
    totalPagesCaptured: number;
    contentPagesIdentified: number[];
  };
  error?: string;
  errorType?: 'not_a_book' | 'book_not_found' | 'no_preview' | 'extraction_failed';
}

export interface VolumeSearchResult {
  volumeId: string;
  previewLink: string;
  title: string;
  authors?: string[];
}

export interface ExtractionEvaluation {
  isValid: boolean;
  confidence: number;
  reasoning: string;
  issues?: string[];
}