const { CompleteBookExtractionService } = require('./dist/services/complete-book-extraction.service');

async function testSingleBook() {
  const service = new CompleteBookExtractionService();
  
  // Test with Harry Potter (should be fiction)
  const testImage = 'test-images/books/harry-potter.jpg';
  
  console.log('Testing single book extraction...');
  console.log(`Image: ${testImage}\n`);
  
  try {
    const result = await service.extractFromImage(testImage);
    
    console.log('\n=== RESULT ===');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testSingleBook();