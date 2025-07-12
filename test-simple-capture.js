const { GoogleBooksPlaywrightSimpleService } = require('./dist/services/google-books-playwright-simple.service');

async function testSimpleCapture() {
  try {
    const service = new GoogleBooksPlaywrightSimpleService();
    
    // Test with the volume ID you provided
    const volumeId = '6nkMShGgs7oC';
    
    console.log('Testing simplified Google Books capture...');
    console.log(`Volume ID: ${volumeId}`);
    
    const pages = await service.getBookPages(volumeId);
    
    console.log('\nResults:');
    console.log('Total pages captured:', pages.length);
    
    // Check the debug folder
    console.log('\nCheck the debug/page-images-simple folder for the captured screenshots');
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testSimpleCapture();