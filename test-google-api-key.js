const axios = require('axios');
require('dotenv').config();

async function testGoogleBooksApiKey() {
  try {
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    console.log('Testing Google Books API...');
    console.log('API Key:', apiKey ? `${apiKey.substring(0, 10)}...` : 'Not configured');
    
    // Test the API directly
    const isbn = '9780141439518'; // Pride and Prejudice
    const url = 'https://www.googleapis.com/books/v1/volumes';
    
    console.log('\nTest 1: Without API key');
    try {
      const response1 = await axios.get(url, {
        params: {
          q: `isbn:${isbn}`,
          maxResults: 1
        }
      });
      console.log('Success! Total items found:', response1.data.totalItems);
    } catch (error) {
      console.log('Error:', error.response?.status, error.response?.statusText);
    }
    
    console.log('\nTest 2: With API key');
    try {
      const response2 = await axios.get(url, {
        params: {
          q: `isbn:${isbn}`,
          maxResults: 1,
          key: apiKey
        }
      });
      console.log('Success! Total items found:', response2.data.totalItems);
      if (response2.data.items && response2.data.items.length > 0) {
        const book = response2.data.items[0];
        console.log('Book title:', book.volumeInfo.title);
        console.log('Volume ID:', book.id);
        console.log('Preview link:', book.volumeInfo.previewLink);
      }
    } catch (error) {
      console.log('Error:', error.response?.status, error.response?.statusText);
      console.log('Error details:', error.response?.data);
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

testGoogleBooksApiKey();