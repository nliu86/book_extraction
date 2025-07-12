const { GoogleBooksPlaywrightService } = require('./dist/services/google-books-playwright.service');

async function testGoogleBooksDirectly() {
  try {
    const service = new GoogleBooksPlaywrightService();
    
    // Test with a book that has preview available
    const isbn = '9780547249643'; // The Hobbit - has preview pages
    
    console.log('Testing Google Books service directly...');
    console.log(`ISBN: ${isbn}`);
    console.log('API Key:', process.env.GOOGLE_API_KEY ? 'Configured' : 'Not configured');
    
    const pages = await service.getBookPages(isbn);
    
    console.log('\nResults:');
    console.log('Total pages captured:', pages.length);
    console.log('First page length:', pages[0]?.length || 0);
    
    // Check if we got actual page data
    if (pages.length > 0) {
      console.log('First page preview (first 100 chars):', pages[0].substring(0, 100) + '...');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Load environment variables
require('dotenv').config();

// Run the test
testGoogleBooksDirectly();