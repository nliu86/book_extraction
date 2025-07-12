const { CompleteBookExtractionService } = require('./dist/services/complete-book-extraction.service');
const fs = require('fs');
const path = require('path');

async function testCompletePipeline() {
  const service = new CompleteBookExtractionService();
  
  // Test images
  const bookImages = [
    { path: 'test-images/books/gatsby.jpg', expectedType: 'fiction' },
    { path: 'test-images/books/harry-potter.jpg', expectedType: 'fiction' },
    { path: 'test-images/books/educated.jpg', expectedType: 'non-fiction' },
    { path: 'test-images/books/sapiens.jpg', expectedType: 'non-fiction' },
    { path: 'test-images/books/python-book.jpg', expectedType: 'non-fiction' }
  ];
  
  const nonBookImages = [
    'test-images/non-books/abstract.jpg',
    'test-images/non-books/landscape.jpg',
    'test-images/non-books/movie-poster.jpg',
    'test-images/non-books/nature.jpg',
    'test-images/non-books/product.jpg'
  ];
  
  console.log('=== COMPLETE BOOK EXTRACTION PIPELINE TEST ===\n');
  
  // Test book images
  console.log('TESTING BOOK IMAGES\n');
  for (const bookImage of bookImages) {
    console.log(`\nTesting: ${bookImage.path}`);
    console.log('─'.repeat(60));
    
    try {
      const result = await service.extractFromImage(bookImage.path);
      
      if (!result.isBook) {
        console.log('❌ ERROR: Should have detected as book');
      } else if (result.success) {
        console.log(`✓ Book: ${result.bookInfo.title} by ${result.bookInfo.author}`);
        console.log(`✓ Volume ID: ${result.bookInfo.volumeId}`);
        console.log(`✓ Classification: ${result.classification.type} (expected: ${bookImage.expectedType})`);
        console.log(`✓ Confidence: ${result.classification.confidence}`);
        console.log(`✓ Extracted from page: ${result.extractedContent.actualPageNumber}`);
        
        // Show extracted content preview
        const content = result.extractedContent.page1Content || result.extractedContent.page2Content;
        if (content) {
          const preview = content.substring(0, 150).replace(/\n/g, ' ');
          console.log(`✓ Content preview: "${preview}..."`);
        }
        
        // Save full result to file
        const resultFile = `debug/results/${path.basename(bookImage.path, '.jpg')}-result.json`;
        fs.mkdirSync('debug/results', { recursive: true });
        fs.writeFileSync(resultFile, JSON.stringify(result, null, 2));
        console.log(`✓ Full result saved to: ${resultFile}`);
      } else {
        console.log(`❌ Failed: ${result.errorType} - ${result.error}`);
      }
    } catch (error) {
      console.log(`❌ Exception: ${error.message}`);
    }
  }
  
  // Test non-book images
  console.log('\n\nTESTING NON-BOOK IMAGES\n');
  for (const imagePath of nonBookImages) {
    console.log(`\nTesting: ${imagePath}`);
    console.log('─'.repeat(60));
    
    try {
      const result = await service.extractFromImage(imagePath);
      
      if (result.isBook) {
        console.log('❌ ERROR: Should NOT have detected as book');
        console.log(`  Detected: ${result.bookInfo?.title} by ${result.bookInfo?.author}`);
      } else {
        console.log('✓ Correctly identified as non-book');
        console.log(`  Error type: ${result.errorType}`);
      }
    } catch (error) {
      console.log(`❌ Exception: ${error.message}`);
    }
  }
  
  // Summary
  console.log('\n\n=== TEST SUMMARY ===');
  console.log('Book images tested: 5');
  console.log('Non-book images tested: 5');
  console.log('\nCheck debug/results/ for detailed extraction results');
}

// Run the test
testCompletePipeline()
  .then(() => console.log('\n✓ All tests completed'))
  .catch(error => console.error('\n❌ Test failed:', error));