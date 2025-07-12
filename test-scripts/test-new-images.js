const { CompleteBookExtractionService } = require('../dist/services/complete-book-extraction.service');
const fs = require('fs');
const path = require('path');

async function testNewImages() {
  console.log('=== Testing New Images with Enhanced Pipeline ===\n');
  console.log('Date:', new Date().toISOString());
  console.log('Pipeline Version: Enhanced with Evaluation Loop\n');
  
  const service = new CompleteBookExtractionService();
  
  // Define test cases for new images
  const testCases = [
    // Book images
    {
      category: 'books',
      name: 'Braiding Sweetgrass',
      file: path.join(__dirname, '../new-test-images/books/breading_sweetgrass.jpeg'),
      expectedType: 'non-fiction' // Likely non-fiction based on title
    },
    {
      category: 'books',
      name: 'Bush Craft',
      file: path.join(__dirname, '../new-test-images/books/bush_craft.jpeg'),
      expectedType: 'non-fiction' // Survival/outdoor skills book
    },
    {
      category: 'books',
      name: 'Folklore Birds',
      file: path.join(__dirname, '../new-test-images/books/foldlore_birds.jpeg'),
      expectedType: 'non-fiction' // Nature/folklore book
    },
    {
      category: 'books',
      name: 'Harry Potter 1',
      file: path.join(__dirname, '../new-test-images/books/harry_potter_1.jpeg'),
      expectedType: 'fiction'
    },
    // Non-book images
    {
      category: 'non-books',
      name: 'Flight',
      file: path.join(__dirname, '../new-test-images/non-books/flight.png'),
      expectedType: null
    },
    {
      category: 'non-books',
      name: 'Music Note',
      file: path.join(__dirname, '../new-test-images/non-books/music_note.jpg'),
      expectedType: null
    },
    {
      category: 'non-books',
      name: 'Worm',
      file: path.join(__dirname, '../new-test-images/non-books/worm.jpeg'),
      expectedType: null
    }
  ];

  const results = {
    books: {
      total: 0,
      successful: 0,
      failed: 0,
      details: []
    },
    nonBooks: {
      total: 0,
      correctlyRejected: 0,
      incorrectlyAccepted: 0,
      details: []
    },
    performance: {
      totalTime: 0,
      averageTimePerImage: 0
    }
  };

  const startTime = Date.now();

  // Test each image
  for (const testCase of testCases) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Testing: ${testCase.name} (${testCase.category})`);
    console.log('='.repeat(60));

    const testStartTime = Date.now();

    try {
      const result = await service.extractFromImage(testCase.file);
      const testEndTime = Date.now();
      const testDuration = (testEndTime - testStartTime) / 1000;

      // Save full result JSON
      const outputFile = path.join(
        __dirname, 
        `../debug/results/new-images/${testCase.name.toLowerCase().replace(/\s+/g, '-')}-test.json`
      );
      
      // Ensure directory exists
      const outputDir = path.dirname(outputFile);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));

      if (testCase.category === 'books') {
        results.books.total++;
        
        if (result.success) {
          results.books.successful++;
          
          // Extract the actual content text
          let extractedText = '';
          if (result.classification.type === 'fiction') {
            extractedText = result.extractedContent.page2Content || '';
          } else {
            extractedText = result.extractedContent.page1Content || '';
          }

          // Save extracted content to text file
          const contentFile = path.join(
            __dirname,
            `../debug/extracted-content/new-images/${testCase.name.toLowerCase().replace(/\s+/g, '-')}-content.txt`
          );
          
          // Ensure directory exists
          const contentDir = path.dirname(contentFile);
          if (!fs.existsSync(contentDir)) {
            fs.mkdirSync(contentDir, { recursive: true });
          }
          
          const contentToSave = `Book: ${testCase.name}
Title Detected: ${result.bookInfo.title}
Author: ${result.bookInfo.author}
Classification: ${result.classification.type}
Expected Type: ${testCase.expectedType}
Type Match: ${result.classification.type === testCase.expectedType ? 'YES' : 'NO'}
Page Extracted: ${result.extractedContent.actualPageNumber}
Content Length: ${extractedText.length} characters

--- EXTRACTED CONTENT ---

${extractedText}

--- END OF CONTENT ---
`;
          fs.writeFileSync(contentFile, contentToSave);
          
          const details = {
            name: testCase.name,
            title: result.bookInfo.title,
            author: result.bookInfo.author,
            volumeId: result.bookInfo.volumeId,
            classification: result.classification.type,
            classificationConfidence: result.classification.confidence,
            expectedType: testCase.expectedType,
            typeMatch: result.classification.type === testCase.expectedType,
            extractedContentLength: extractedText.length,
            extractedContentPreview: extractedText.substring(0, 200) + '...',
            pageExtracted: result.extractedContent.actualPageNumber,
            totalPagesCaptured: result.debugInfo.totalPagesCaptured,
            contentPagesIdentified: result.debugInfo.contentPagesIdentified,
            processingTime: testDuration,
            status: 'SUCCESS'
          };
          
          results.books.details.push(details);
          
          console.log(`\n✅ Book extraction successful!`);
          console.log(`Title: ${details.title}`);
          console.log(`Author: ${details.author}`);
          console.log(`Type: ${details.classification} (Expected: ${details.expectedType})`);
          console.log(`Type Match: ${details.typeMatch ? '✓' : '✗'}`);
          console.log(`Content Length: ${details.extractedContentLength} chars`);
          console.log(`Content Preview: ${details.extractedContentPreview}`);
          console.log(`Processing Time: ${details.processingTime}s`);
          
        } else {
          results.books.failed++;
          
          results.books.details.push({
            name: testCase.name,
            status: 'FAILED',
            error: result.error,
            errorType: result.errorType,
            processingTime: testDuration
          });
          
          console.log(`\n❌ Book extraction failed: ${result.error}`);
        }
        
      } else {
        // Non-book test
        results.nonBooks.total++;
        
        if (!result.success && result.errorType === 'not_a_book') {
          results.nonBooks.correctlyRejected++;
          
          results.nonBooks.details.push({
            name: testCase.name,
            status: 'CORRECTLY_REJECTED',
            error: result.error,
            processingTime: testDuration
          });
          
          console.log(`\n✅ Non-book correctly rejected`);
          
        } else {
          results.nonBooks.incorrectlyAccepted++;
          
          results.nonBooks.details.push({
            name: testCase.name,
            status: 'INCORRECTLY_ACCEPTED',
            result: result,
            processingTime: testDuration
          });
          
          console.log(`\n❌ Non-book incorrectly accepted as book`);
        }
      }
      
      console.log(`Processing time: ${testDuration}s`);
      
    } catch (error) {
      console.error(`\n❌ Error testing ${testCase.name}:`, error.message);
      
      if (testCase.category === 'books') {
        results.books.failed++;
        results.books.details.push({
          name: testCase.name,
          status: 'ERROR',
          error: error.message,
          processingTime: (Date.now() - testStartTime) / 1000
        });
      } else {
        results.nonBooks.incorrectlyAccepted++;
        results.nonBooks.details.push({
          name: testCase.name,
          status: 'ERROR',
          error: error.message,
          processingTime: (Date.now() - testStartTime) / 1000
        });
      }
    }
  }

  const endTime = Date.now();
  results.performance.totalTime = (endTime - startTime) / 1000;
  results.performance.averageTimePerImage = results.performance.totalTime / testCases.length;

  // Generate summary
  const summary = {
    testDate: new Date().toISOString(),
    testSet: 'New Test Images',
    
    overallResults: {
      totalTests: testCases.length,
      totalPassed: results.books.successful + results.nonBooks.correctlyRejected,
      totalFailed: results.books.failed + results.nonBooks.incorrectlyAccepted,
      successRate: ((results.books.successful + results.nonBooks.correctlyRejected) / testCases.length * 100).toFixed(1) + '%'
    },
    
    bookDetection: {
      accuracy: results.nonBooks.total > 0 
        ? (results.nonBooks.correctlyRejected / results.nonBooks.total * 100).toFixed(1) + '%'
        : 'N/A',
      correctRejections: results.nonBooks.correctlyRejected,
      incorrectAcceptances: results.nonBooks.incorrectlyAccepted,
      total: results.nonBooks.total
    },
    
    bookExtraction: {
      successRate: results.books.total > 0
        ? (results.books.successful / results.books.total * 100).toFixed(1) + '%'
        : 'N/A',
      successful: results.books.successful,
      failed: results.books.failed,
      total: results.books.total
    },
    
    classification: {
      fictionBooks: results.books.details.filter(b => b.classification === 'fiction' && b.status === 'SUCCESS').length,
      nonFictionBooks: results.books.details.filter(b => b.classification === 'non-fiction' && b.status === 'SUCCESS').length,
      accurateClassification: results.books.details.filter(b => b.typeMatch && b.status === 'SUCCESS').length,
      totalClassified: results.books.successful,
      accuracy: results.books.successful > 0 
        ? (results.books.details.filter(b => b.typeMatch && b.status === 'SUCCESS').length / results.books.successful * 100).toFixed(1) + '%'
        : 'N/A'
    },
    
    performance: results.performance,
    
    detailedResults: {
      books: results.books.details,
      nonBooks: results.nonBooks.details
    }
  };

  // Save results
  const summaryFile = path.join(__dirname, '../NEW_TEST_IMAGES_RESULTS.md');
  const markdownContent = generateMarkdownReport(summary);
  fs.writeFileSync(summaryFile, markdownContent);
  
  // Save JSON version
  const jsonFile = path.join(__dirname, '../debug/results/new-images/test-summary.json');
  fs.writeFileSync(jsonFile, JSON.stringify(summary, null, 2));
  
  console.log(`\n${'='.repeat(60)}`);
  console.log('FINAL SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${summary.overallResults.totalTests}`);
  console.log(`Passed: ${summary.overallResults.totalPassed}`);
  console.log(`Failed: ${summary.overallResults.totalFailed}`);
  console.log(`Success Rate: ${summary.overallResults.successRate}`);
  console.log(`\nBook Detection Accuracy: ${summary.bookDetection.accuracy}`);
  console.log(`Book Extraction Success: ${summary.bookExtraction.successRate}`);
  console.log(`Classification Accuracy: ${summary.classification.accuracy}`);
  console.log(`\nTotal Time: ${summary.performance.totalTime}s`);
  console.log(`Average Time: ${summary.performance.averageTimePerImage}s per image`);
  console.log(`\n✓ Results saved to: ${summaryFile}`);
  console.log(`✓ Extracted content saved to: debug/extracted-content/new-images/`);
}

function generateMarkdownReport(summary) {
  let md = `# New Test Images - Results\n\n`;
  md += `**Test Date:** ${summary.testDate}\n`;
  md += `**Test Set:** ${summary.testSet}\n\n`;
  
  md += `## Executive Summary\n\n`;
  md += `- **Overall Success Rate:** ${summary.overallResults.successRate} (${summary.overallResults.totalPassed}/${summary.overallResults.totalTests})\n`;
  md += `- **Book Detection Accuracy:** ${summary.bookDetection.accuracy}\n`;
  md += `- **Book Extraction Success:** ${summary.bookExtraction.successRate}\n`;
  md += `- **Classification Accuracy:** ${summary.classification.accuracy}\n`;
  md += `- **Average Processing Time:** ${summary.performance.averageTimePerImage}s per image\n\n`;
  
  md += `## Detailed Results\n\n`;
  
  md += `### Book Detection (Non-Book Images)\n\n`;
  md += `| Image | Status | Time (s) |\n`;
  md += `|-------|--------|----------|\n`;
  for (const nb of summary.detailedResults.nonBooks) {
    md += `| ${nb.name} | ${nb.status === 'CORRECTLY_REJECTED' ? '✅ Rejected' : '❌ Accepted'} | ${nb.processingTime?.toFixed(1) || 'N/A'} |\n`;
  }
  
  md += `\n### Book Extraction with Content\n\n`;
  md += `| Book | Title Detected | Type | Expected | Match | Content Length | Time (s) | Status |\n`;
  md += `|------|----------------|------|----------|-------|----------------|----------|--------|\n`;
  for (const book of summary.detailedResults.books) {
    if (book.status === 'SUCCESS') {
      md += `| ${book.name} | ${book.title} | ${book.classification} | ${book.expectedType} | ${book.typeMatch ? '✅' : '❌'} | ${book.extractedContentLength} | ${book.processingTime.toFixed(1)} | ✅ |\n`;
    } else {
      md += `| ${book.name} | - | - | ${book.expectedType || '-'} | - | - | ${book.processingTime?.toFixed(1) || 'N/A'} | ❌ ${book.errorType || 'ERROR'} |\n`;
    }
  }
  
  md += `\n### Extracted Content Samples\n\n`;
  for (const book of summary.detailedResults.books) {
    if (book.status === 'SUCCESS') {
      md += `#### ${book.name}\n\n`;
      md += `- **Title:** ${book.title}\n`;
      md += `- **Author:** ${book.author}\n`;
      md += `- **Type:** ${book.classification} (Expected: ${book.expectedType})\n`;
      md += `- **Classification Match:** ${book.typeMatch ? '✅ Correct' : '❌ Incorrect'}\n`;
      md += `- **Page Extracted:** ${book.pageExtracted}\n`;
      md += `- **Content Preview:**\n\n`;
      md += `> ${book.extractedContentPreview}\n\n`;
      md += `*Full content saved to: debug/extracted-content/new-images/${book.name.toLowerCase().replace(/\s+/g, '-')}-content.txt*\n\n`;
    }
  }
  
  md += `### Performance Metrics\n\n`;
  md += `- **Total Processing Time:** ${summary.performance.totalTime.toFixed(1)}s\n`;
  md += `- **Average Time per Image:** ${summary.performance.averageTimePerImage.toFixed(1)}s\n`;
  
  if (summary.classification) {
    md += `\n### Classification Breakdown\n\n`;
    md += `- **Fiction Books Detected:** ${summary.classification.fictionBooks}\n`;
    md += `- **Non-Fiction Books Detected:** ${summary.classification.nonFictionBooks}\n`;
    md += `- **Correctly Classified:** ${summary.classification.accurateClassification}/${summary.classification.totalClassified}\n`;
  }
  
  md += `\n## Key Findings\n\n`;
  
  // Analyze results
  const bookFailures = summary.detailedResults.books.filter(b => b.status !== 'SUCCESS');
  const classificationErrors = summary.detailedResults.books.filter(b => b.status === 'SUCCESS' && !b.typeMatch);
  
  if (bookFailures.length > 0) {
    md += `### Failed Extractions\n\n`;
    for (const failure of bookFailures) {
      md += `- **${failure.name}:** ${failure.error || failure.errorType || 'Unknown error'}\n`;
    }
    md += `\n`;
  }
  
  if (classificationErrors.length > 0) {
    md += `### Classification Mismatches\n\n`;
    for (const error of classificationErrors) {
      md += `- **${error.name}:** Classified as ${error.classification}, expected ${error.expectedType}\n`;
    }
    md += `\n`;
  }
  
  md += `## Conclusion\n\n`;
  md += `The enhanced pipeline tested on new images shows ${summary.overallResults.successRate} overall success rate. `;
  if (summary.nonBooks.total > 0) {
    md += `Book detection is ${summary.bookDetection.accuracy} accurate at rejecting non-book images. `;
  }
  if (summary.books.total > 0) {
    md += `For actual books, the extraction success rate is ${summary.bookExtraction.successRate} with ${summary.classification.accuracy} classification accuracy.`;
  }
  md += `\n\nAll extracted content has been saved to individual text files in the debug/extracted-content/new-images/ directory for manual verification.\n`;
  
  return md;
}

// Run the test
testNewImages().catch(console.error);