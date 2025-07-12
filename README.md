# Book Text Extractor

An AI-powered web application that extracts text from book covers. Upload a photo of a book cover, and the system will automatically identify the book and extract text from its first pages.

## Features

- **Book Detection**: Uses AI to verify if the uploaded image contains a book cover
- **Automatic Book Identification**: Finds the book title and author from the cover
- **Smart Content Extraction**: 
  - For fiction books: Returns the 2nd page of actual content
  - For non-fiction books: Returns the 1st page of actual content
- **Multi-Volume Validation**: Tries multiple editions to ensure quality extraction
- **User-Friendly Interface**: Simple drag-and-drop web interface

## Assignment Requirements Met

✅ Built in TypeScript  
✅ Takes an image of a book cover  
✅ Returns text from first pages (not provided by user)  
✅ Validates that the image contains a book  
✅ Prompts user to retake photo if not a book  
✅ Fiction books return 2nd page of content  
✅ Non-fiction books return 1st page of content  
✅ Accessible through web interface  

## Technology Stack

- **Backend**: Node.js, Express, TypeScript
- **AI Models**: Google Gemini 2.5 Flash
- **Book Data**: Google Books API
- **Web Scraping**: Playwright
- **Frontend**: HTML, CSS, JavaScript

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file with your API key:
   ```
   GEMINI_API_KEY=your_gemini_api_key
   ```

4. Build the application:
   ```bash
   npm run build
   ```

5. Copy public files to dist:
   ```bash
   cp -r public dist/
   ```

## Usage

1. Start the server:
   ```bash
   npm start
   ```

2. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

3. Upload a clear photo of a book cover

4. Wait for the extraction (typically 30-60 seconds)

5. View and copy the extracted text

## API Endpoint

The application also provides a REST API:

```
POST /api/extract-book
Content-Type: multipart/form-data
Body: image (file)
```

Response:
```json
{
  "success": true,
  "text": "Extracted text content...",
  "bookType": "fiction",
  "title": "Book Title",
  "author": "Author Name",
  "confidence": 0.95
}
```

## Limitations

- Requires Google Books preview availability
- Limited to first 10 preview pages
- Processing time depends on book availability and validation requirements
- Maximum file size: 10MB

## Development

Run in development mode with auto-reload:
```bash
npm run dev
```

## Testing

Test the pipeline with sample images:
```bash
node test-scripts/test-all-images.js
```

## Architecture

The system uses a 5-step pipeline:

1. **Book Detection** - Validates the image contains a book
2. **Volume Discovery** - Finds book candidates on Google Books
3. **Page Capture** - Captures preview pages using Playwright
4. **Content Analysis** - Classifies book type and extracts content
5. **Quality Validation** - Ensures extraction matches the original cover