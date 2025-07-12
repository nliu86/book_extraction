const { CompleteBookExtractionService } = require('../dist/services/complete-book-extraction.service');
const fs = require('fs');
const path = require('path');

async function testEnhancedPipeline() {
  console.log('=== Testing Enhanced Pipeline with Evaluation ===\n');
  
  const service = new CompleteBookExtractionService();
  
  // Test with different books
  const testCases = [
    {
      name: 'The Great Gatsby',
      file: path.join(__dirname, '../test-images/books/gatsby.jpg')
    },
    {
      name: 'Educated',
      file: path.join(__dirname, '../test-images/books/educated.jpg')
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Testing: ${testCase.name}`);
    console.log('='.repeat(60));

    try {
      const result = await service.extractFromImage(testCase.file);
      
      // Save result to file
      const outputFile = path.join(__dirname, `../debug/results/${testCase.name.toLowerCase().replace(/\s+/g, '-')}-enhanced.json`);
      fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));
      console.log(`\nResult saved to: ${outputFile}`);

      // Display summary
      if (result.success) {
        console.log('\n✅ Extraction successful!');
        console.log(`Book: ${result.bookInfo.title} by ${result.bookInfo.author}`);
        console.log(`Volume ID: ${result.bookInfo.volumeId}`);
        console.log(`Type: ${result.classification.type}`);
        console.log(`Confidence: ${result.classification.confidence}`);
        
        const content = result.classification.type === 'fiction' 
          ? result.extractedContent.page2Content 
          : result.extractedContent.page1Content;
        
        console.log(`\nExtracted content preview (first 200 chars):`);
        console.log(content.substring(0, 200) + '...');
      } else {
        console.log(`\n❌ Extraction failed: ${result.error}`);
      }
    } catch (error) {
      console.error(`\n❌ Error: ${error.message}`);
    }
  }
}

// Run the test
testEnhancedPipeline().catch(console.error);