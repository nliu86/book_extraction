const { GoogleBooksVolumeFinder } = require('./dist/services/google-books-volume-finder.service');

async function testVolumeFinder() {
  const finder = new GoogleBooksVolumeFinder();
  
  console.log('Testing Google Books Volume Finder...\n');

  // Test exact title and author search
  console.log('Test 1: Exact title and author search');
  console.log('=' * 40);
  
  try {
    const volumeId = await finder.findVolumeId("Treasure Island", "Robert Louis Stevenson");
    console.log(`Result: ${volumeId}`);
    if (volumeId) {
      console.log(`Preview URL: https://www.google.com/books/edition/_/${volumeId}?hl=en&gbpv=1&pg=PP1`);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }

  // Test with fallback
  console.log('\n\nTest 2: Search with fallback (partial author)');
  console.log('=' * 40);
  
  try {
    const volumeId = await finder.findVolumeIdWithFallback("The Great Gatsby", "Fitzgerald");
    console.log(`Result: ${volumeId}`);
    if (volumeId) {
      console.log(`Preview URL: https://www.google.com/books/edition/_/${volumeId}?hl=en&gbpv=1&pg=PP1`);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }

  // Test title only
  console.log('\n\nTest 3: Title only search');
  console.log('=' * 40);
  
  try {
    const volumeId = await finder.findVolumeIdWithFallback("1984");
    console.log(`Result: ${volumeId}`);
    if (volumeId) {
      const details = await finder.getVolumeDetails(volumeId);
      if (details) {
        console.log(`Book found: ${details.volumeInfo.title} by ${details.volumeInfo.authors?.join(', ')}`);
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testVolumeFinder().catch(console.error);