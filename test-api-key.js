const axios = require('axios');

async function testGoogleBooksWithApiKey() {
  try {
    // Test with a known public domain book ISBN
    const isbn = '9780141439518'; // Pride and Prejudice
    
    console.log('Testing Google Books API with API key...');
    console.log(`ISBN: ${isbn}`);
    
    const response = await axios.post('http://localhost:3000/api/extract-book', {
      isbn: isbn,
      service: 'google-books-playwright'
    });
    
    console.log('\nAPI Response Status:', response.status);
    console.log('Book Title:', response.data.title);
    console.log('Total Pages Captured:', response.data.pages.length);
    console.log('First Page Preview:', response.data.pages[0].substring(0, 100) + '...');
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

// Run the test
testGoogleBooksWithApiKey();