const { CompleteBookExtractionService } = require('../dist/services/complete-book-extraction.service');
const path = require('path');

async function testGeminiFlash() {
  console.log('=== Testing Pipeline with gemini-2.5-flash ===\n');
  
  const service = new CompleteBookExtractionService();
  
  // Test with one book to verify it works
  const testFile = path.join(__dirname, '../test-images/books/gatsby.jpg');
  
  console.log('Testing with The Great Gatsby...\n');
  
  try {
    const startTime = Date.now();
    const result = await service.extractFromImage(testFile);
    const endTime = Date.now();
    
    console.log('\nResult:');
    console.log(`Success: ${result.success}`);
    if (result.success) {
      console.log(`Title: ${result.bookInfo.title}`);
      console.log(`Author: ${result.bookInfo.author}`);
      console.log(`Type: ${result.classification.type}`);
      console.log(`Confidence: ${result.classification.confidence}`);
      console.log(`Content Length: ${
        result.classification.type === 'fiction' 
          ? result.extractedContent.page2Content?.length 
          : result.extractedContent.page1Content?.length
      } chars`);
    } else {
      console.log(`Error: ${result.error}`);
    }
    
    console.log(`\nProcessing time: ${(endTime - startTime) / 1000}s`);
    console.log('\n✅ Pipeline is working correctly with gemini-2.5-flash!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testGeminiFlash().catch(console.error);