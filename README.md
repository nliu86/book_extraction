# Book Extraction API

A TypeScript-based AI pipeline that extracts text from book pages using cover image analysis.

## Features

1. **Book Detection**: Validates if uploaded image contains a book cover
2. **Metadata Extraction**: Extracts book title and author from cover
3. **ISBN Search**: Finds ISBN using Google Books and Open Library APIs
4. **Page Retrieval**: Scrapes Amazon "Look Inside" for book preview pages
5. **Text Extraction**: Uses Gemini AI to extract text from page images
6. **Classification**: Determines if book is fiction or non-fiction
7. **Smart Return**: Returns page 1 for non-fiction, page 2 for fiction

## Prerequisites

- Node.js 18+ 
- Google Gemini API key

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables in `.env`:
   ```
   GEMINI_API_KEY=your_gemini_api_key_here
   PORT=3000
   ```

## Running the API

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm run build
npm start
```

## API Endpoint

### POST /api/extract-book

Upload a book cover image to extract text from its pages.

**Request:**
- Method: POST
- Content-Type: multipart/form-data
- Body: `image` field with image file (max 10MB)

**Response:**
```json
{
  "success": true,
  "text": "Extracted text from the appropriate page...",
  "bookType": "fiction" | "non-fiction",
  "title": "Book Title",
  "author": "Author Name",
  "isbn": "1234567890"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Error message"
}
```

## Testing

Use the provided test script:
```bash
./test-api.sh
```

Or test manually with curl:
```bash
curl -X POST http://localhost:3000/api/extract-book \
  -F "image=@path/to/book-cover.jpg" \
  -H "Accept: application/json"
```

## Test Images

The project includes test images in:
- `test-images/books/` - Sample book covers
- `test-images/non-books/` - Non-book images for testing validation

## Architecture

- **Express.js** - Web framework
- **TypeScript** - Type safety
- **Google Gemini AI** - Image analysis and text extraction
- **Puppeteer** - Web scraping
- **Sharp** - Image processing
- **Multer** - File uploads

## Models Used

- **gemini-2.5-pro** - Complex reasoning (book detection, metadata extraction)
- **gemini-2.5-flash** - Fast operations (text extraction, classification)