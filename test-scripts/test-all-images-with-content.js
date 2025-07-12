const { CompleteBookExtractionService } = require('../dist/services/complete-book-extraction.service');
const fs = require('fs');
const path = require('path');

async function testAllImagesWithContent() {
  console.log('=== Comprehensive Testing with Content Extraction ===\n');
  console.log('Date:', new Date().toISOString());
  console.log('Pipeline Version: Enhanced with Evaluation Loop\n');
  
  const service = new CompleteBookExtractionService();
  
  // Define all test cases
  const testCases = [
    // Book images
    {
      category: 'books',
      name: 'The Great Gatsby',
      file: path.join(__dirname, '../test-images/books/gatsby.jpg'),
      expectedType: 'fiction'
    },
    {
      category: 'books',
      name: 'Harry Potter',
      file: path.join(__dirname, '../test-images/books/harry-potter.jpg'),
      expectedType: 'fiction'
    },
    {
      category: 'books',
      name: 'Pride and Prejudice',
      file: path.join(__dirname, '../test-images/books/pride.jpg'),
      expectedType: 'fiction'
    },
    {
      category: 'books',
      name: 'Educated',
      file: path.join(__dirname, '../test-images/books/educated.jpg'),
      expectedType: 'non-fiction'
    },
    {
      category: 'books',
      name: 'Sapiens',
      file: path.join(__dirname, '../test-images/books/sapiens.jpg'),
      expectedType: 'non-fiction'
    },
    // Non-book images
    {
      category: 'non-books',
      name: 'Abstract Art',
      file: path.join(__dirname, '../test-images/non-books/abstract.jpg'),
      expectedType: null
    },
    {
      category: 'non-books',
      name: 'Landscape',
      file: path.join(__dirname, '../test-images/non-books/landscape.jpg'),
      expectedType: null
    },
    {
      category: 'non-books',
      name: 'Movie Poster',
      file: path.join(__dirname, '../test-images/non-books/movie-poster.jpg'),
      expectedType: null
    },
    {
      category: 'non-books',
      name: 'Nature',
      file: path.join(__dirname, '../test-images/non-books/nature.jpg'),
      expectedType: null
    },
    {
      category: 'non-books',
      name: 'Product',
      file: path.join(__dirname, '../test-images/non-books/product.jpg'),
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
    },
    validationMetrics: {
      totalVolumesChecked: 0,
      totalValidationsPassed: 0,
      totalValidationsFailed: 0,
      averageConfidence: 0,
      confidenceScores: []
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
        `../debug/results/${testCase.name.toLowerCase().replace(/\s+/g, '-')}-full-test.json`
      );
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
            `../debug/extracted-content/${testCase.name.toLowerCase().replace(/\s+/g, '-')}-content.txt`
          );
          const contentToSave = `Book: ${testCase.name}
Title Detected: ${result.bookInfo.title}
Author: ${result.bookInfo.author}
Classification: ${result.classification.type}
Page Extracted: ${result.extractedContent.actualPageNumber}
Content Length: ${extractedText.length} characters

--- EXTRACTED CONTENT ---

${extractedText}

--- END OF CONTENT ---
`;
          fs.writeFileSync(contentFile, contentToSave);

          // Save validation attempts if available
          if (result.validationAttempts) {
            const validationFile = path.join(
              __dirname,
              `../debug/validation-attempts/${testCase.name.toLowerCase().replace(/\s+/g, '-')}-attempts.json`
            );
            fs.writeFileSync(validationFile, JSON.stringify(result.validationAttempts, null, 2));
            
            // Update validation metrics
            results.validationMetrics.totalVolumesChecked += result.validationAttempts.length;
            const passed = result.validationAttempts.filter(a => a.passed).length;
            results.validationMetrics.totalValidationsPassed += passed;
            results.validationMetrics.totalValidationsFailed += result.validationAttempts.length - passed;
            
            result.validationAttempts.forEach(attempt => {
              if (attempt.confidence !== undefined) {
                results.validationMetrics.confidenceScores.push(attempt.confidence);
              }
            });
          }
          
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
            validationAttempts: result.validationAttempts?.length || 1,
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
          console.log(`Validation Attempts: ${details.validationAttempts}`);
          
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

  // Calculate average validation confidence
  if (results.validationMetrics.confidenceScores.length > 0) {
    results.validationMetrics.averageConfidence = 
      results.validationMetrics.confidenceScores.reduce((a, b) => a + b, 0) / 
      results.validationMetrics.confidenceScores.length;
  }

  // Generate comprehensive summary
  const summary = {
    testDate: new Date().toISOString(),
    pipelineVersion: 'Enhanced with Evaluation Loop and Content Extraction',
    
    overallResults: {
      totalTests: testCases.length,
      totalPassed: results.books.successful + results.nonBooks.correctlyRejected,
      totalFailed: results.books.failed + results.nonBooks.incorrectlyAccepted,
      successRate: ((results.books.successful + results.nonBooks.correctlyRejected) / testCases.length * 100).toFixed(1) + '%'
    },
    
    bookDetection: {
      accuracy: (results.nonBooks.correctlyRejected / results.nonBooks.total * 100).toFixed(1) + '%',
      correctRejections: results.nonBooks.correctlyRejected,
      incorrectAcceptances: results.nonBooks.incorrectlyAccepted,
      total: results.nonBooks.total
    },
    
    bookExtraction: {
      successRate: (results.books.successful / results.books.total * 100).toFixed(1) + '%',
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
    
    validationMetrics: {
      totalVolumesChecked: results.validationMetrics.totalVolumesChecked,
      averageVolumesPerBook: results.books.successful > 0 
        ? (results.validationMetrics.totalVolumesChecked / results.books.successful).toFixed(1)
        : 'N/A',
      validationPassRate: results.validationMetrics.totalVolumesChecked > 0
        ? (results.validationMetrics.totalValidationsPassed / results.validationMetrics.totalVolumesChecked * 100).toFixed(1) + '%'
        : 'N/A',
      averageConfidence: results.validationMetrics.averageConfidence.toFixed(2)
    },
    
    performance: results.performance,
    
    detailedResults: {
      books: results.books.details,
      nonBooks: results.nonBooks.details
    }
  };

  // Save comprehensive summary
  const summaryFile = path.join(__dirname, '../COMPREHENSIVE_TEST_RESULTS_WITH_CONTENT.md');
  const markdownContent = generateMarkdownReport(summary);
  fs.writeFileSync(summaryFile, markdownContent);
  
  // Also save JSON version
  const jsonFile = path.join(__dirname, '../debug/results/comprehensive-test-results.json');
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
  console.log(`\nValidation Metrics:`);
  console.log(`- Total Volumes Checked: ${summary.validationMetrics.totalVolumesChecked}`);
  console.log(`- Average Volumes per Book: ${summary.validationMetrics.averageVolumesPerBook}`);
  console.log(`- Validation Pass Rate: ${summary.validationMetrics.validationPassRate}`);
  console.log(`- Average Confidence: ${summary.validationMetrics.averageConfidence}`);
  console.log(`\nTotal Time: ${summary.performance.totalTime}s`);
  console.log(`Average Time: ${summary.performance.averageTimePerImage}s per image`);
  console.log(`\n✓ Results saved to: ${summaryFile}`);
  console.log(`✓ Extracted content saved to: debug/extracted-content/`);
  console.log(`✓ Validation logs saved to: debug/validation-attempts/`);
}

function generateMarkdownReport(summary) {
  let md = `# Comprehensive Test Results with Content Extraction\n\n`;
  md += `**Test Date:** ${summary.testDate}\n`;
  md += `**Pipeline Version:** ${summary.pipelineVersion}\n\n`;
  
  md += `## Executive Summary\n\n`;
  md += `- **Overall Success Rate:** ${summary.overallResults.successRate} (${summary.overallResults.totalPassed}/${summary.overallResults.totalTests})\n`;
  md += `- **Book Detection Accuracy:** ${summary.bookDetection.accuracy}\n`;
  md += `- **Book Extraction Success:** ${summary.bookExtraction.successRate}\n`;
  md += `- **Classification Accuracy:** ${summary.classification.accuracy}\n`;
  md += `- **Average Processing Time:** ${summary.performance.averageTimePerImage}s per image\n\n`;
  
  md += `## Validation Loop Performance\n\n`;
  md += `- **Total Volumes Checked:** ${summary.validationMetrics.totalVolumesChecked}\n`;
  md += `- **Average Volumes per Book:** ${summary.validationMetrics.averageVolumesPerBook}\n`;
  md += `- **Validation Pass Rate:** ${summary.validationMetrics.validationPassRate}\n`;
  md += `- **Average Confidence Score:** ${summary.validationMetrics.averageConfidence}\n\n`;
  
  md += `## Detailed Results\n\n`;
  
  md += `### Book Detection (Non-Book Images)\n\n`;
  md += `| Image | Status | Time (s) |\n`;
  md += `|-------|--------|----------|\n`;
  for (const nb of summary.detailedResults.nonBooks) {
    md += `| ${nb.name} | ${nb.status === 'CORRECTLY_REJECTED' ? '✅ Rejected' : '❌ Accepted'} | ${nb.processingTime?.toFixed(1) || 'N/A'} |\n`;
  }
  
  md += `\n### Book Extraction with Content\n\n`;
  md += `| Book | Title Detected | Type | Correct | Content Length | Validation Attempts | Time (s) | Status |\n`;
  md += `|------|----------------|------|---------|----------------|-------------------|----------|--------|\n`;
  for (const book of summary.detailedResults.books) {
    if (book.status === 'SUCCESS') {
      md += `| ${book.name} | ${book.title} | ${book.classification} | ${book.typeMatch ? '✅' : '❌'} | ${book.extractedContentLength} | ${book.validationAttempts} | ${book.processingTime.toFixed(1)} | ✅ |\n`;
    } else {
      md += `| ${book.name} | - | - | - | - | - | ${book.processingTime?.toFixed(1) || 'N/A'} | ❌ ${book.errorType || 'ERROR'} |\n`;
    }
  }
  
  md += `\n### Extracted Content Samples\n\n`;
  for (const book of summary.detailedResults.books) {
    if (book.status === 'SUCCESS') {
      md += `#### ${book.name}\n\n`;
      md += `- **Title:** ${book.title}\n`;
      md += `- **Author:** ${book.author}\n`;
      md += `- **Type:** ${book.classification}\n`;
      md += `- **Page Extracted:** ${book.pageExtracted}\n`;
      md += `- **Content Preview:**\n\n`;
      md += `> ${book.extractedContentPreview}\n\n`;
      md += `*Full content saved to: debug/extracted-content/${book.name.toLowerCase().replace(/\s+/g, '-')}-content.txt*\n\n`;
    }
  }
  
  md += `### Performance Metrics\n\n`;
  md += `- **Total Processing Time:** ${summary.performance.totalTime.toFixed(1)}s\n`;
  md += `- **Average Time per Image:** ${summary.performance.averageTimePerImage.toFixed(1)}s\n`;
  
  md += `\n### Classification Breakdown\n\n`;
  md += `- **Fiction Books Detected:** ${summary.classification.fictionBooks}\n`;
  md += `- **Non-Fiction Books Detected:** ${summary.classification.nonFictionBooks}\n`;
  md += `- **Correctly Classified:** ${summary.classification.accurateClassification}/${summary.classification.totalClassified}\n`;
  
  md += `\n## Key Findings\n\n`;
  
  // Analyze results
  const bookFailures = summary.detailedResults.books.filter(b => b.status !== 'SUCCESS');
  const classificationErrors = summary.detailedResults.books.filter(b => b.status === 'SUCCESS' && !b.typeMatch);
  const multiAttemptBooks = summary.detailedResults.books.filter(b => b.status === 'SUCCESS' && b.validationAttempts > 1);
  
  if (bookFailures.length > 0) {
    md += `### Failed Extractions\n\n`;
    for (const failure of bookFailures) {
      md += `- **${failure.name}:** ${failure.error || failure.errorType || 'Unknown error'}\n`;
    }
    md += `\n`;
  }
  
  if (classificationErrors.length > 0) {
    md += `### Classification Errors\n\n`;
    for (const error of classificationErrors) {
      md += `- **${error.name}:** Classified as ${error.classification}, expected ${error.expectedType}\n`;
    }
    md += `\n`;
  }
  
  if (multiAttemptBooks.length > 0) {
    md += `### Books Requiring Multiple Validation Attempts\n\n`;
    for (const book of multiAttemptBooks) {
      md += `- **${book.name}:** Required ${book.validationAttempts} attempts\n`;
    }
    md += `\n`;
  }
  
  md += `## Conclusion\n\n`;
  md += `The enhanced pipeline with evaluation loop shows ${summary.overallResults.successRate} overall success rate. `;
  md += `Book detection is ${summary.bookDetection.accuracy} accurate at rejecting non-book images. `;
  md += `For actual books, the extraction success rate is ${summary.bookExtraction.successRate} with ${summary.classification.accuracy} classification accuracy. `;
  md += `The validation loop averaged ${summary.validationMetrics.averageVolumesPerBook} volume attempts per book with a ${summary.validationMetrics.validationPassRate} pass rate.\n\n`;
  md += `All extracted content has been saved to individual text files in the debug/extracted-content/ directory for manual verification.\n`;
  
  return md;
}

// Run the test
testAllImagesWithContent().catch(console.error);