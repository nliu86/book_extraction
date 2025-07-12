const { GoogleBooksIntegratedService } = require('./dist/services/google-books-integrated.service');

async function testIntegratedFlow() {
  const service = new GoogleBooksIntegratedService();
  
  // Test cases
  const testBooks = [
    { title: "Treasure Island", author: "Robert Louis Stevenson" },
    { title: "The Great Gatsby", author: "F. Scott Fitzgerald" },
    { title: "1984", author: "George Orwell" },
    { title: "Charlie Gehringer", author: "John C. Skipper" } // The book from your example
  ];

  console.log('Testing Google Books integrated service...\n');

  // Test finding volume IDs
  for (const book of testBooks) {
    try {
      console.log(`\n${'='.repeat(50)}`);
      console.log(`Testing: "${book.title}" by ${book.author}`);
      console.log('='.repeat(50));
      
      const result = await service.getBookPagesByTitleAuthor(book.title, book.author);
      
      if (result) {
        console.log(`\n✓ Success!`);
        console.log(`  Volume ID: ${result.volumeId}`);
        console.log(`  Pages captured: ${result.pages.length}`);
        console.log(`  Preview URL: https://www.google.com/books/edition/_/${result.volumeId}?hl=en&gbpv=1&pg=PP1`);
      } else {
        console.log(`\n✗ Book not found`);
      }
      
      // Don't capture pages for all books in the test to save time
      break; // Remove this to test all books
      
    } catch (error) {
      console.error(`\n✗ Error: ${error.message}`);
    }
  }

  // Test ISBN search
  console.log(`\n\n${'='.repeat(50)}`);
  console.log('Testing ISBN search...');
  console.log('='.repeat(50));
  
  try {
    const isbnResult = await service.getBookPagesByISBN('9780547249643'); // The Hobbit
    if (isbnResult) {
      console.log(`\n✓ ISBN search successful!`);
      console.log(`  Volume ID: ${isbnResult.volumeId}`);
      console.log(`  Pages captured: ${isbnResult.pages.length}`);
    }
  } catch (error) {
    console.error(`\n✗ ISBN search error: ${error.message}`);
  }
}

// Run the test
testIntegratedFlow().catch(console.error);