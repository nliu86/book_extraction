const axios = require('axios');
require('dotenv').config();

async function testScraperAPISimple() {
  const apiKey = process.env.SCRAPER_API_KEY;
  console.log('Testing ScraperAPI...');
  console.log('API Key:', apiKey ? `${apiKey.substring(0, 8)}...` : 'NOT SET');
  
  // Test with a simple page first
  console.log('\nTest 1: Simple page (example.com)');
  try {
    const response = await axios.get('http://api.scraperapi.com', {
      params: {
        api_key: apiKey,
        url: 'https://example.com'
      },
      timeout: 30000
    });
    console.log('✓ Success! Status:', response.status);
    console.log('  Response size:', response.data.length, 'bytes');
  } catch (error) {
    console.log('✗ Error:', error.response?.status || error.message);
    if (error.response?.data) {
      console.log('  Error details:', error.response.data);
    }
  }
  
  // Test with Amazon homepage
  console.log('\nTest 2: Amazon homepage');
  try {
    const response = await axios.get('http://api.scraperapi.com', {
      params: {
        api_key: apiKey,
        url: 'https://www.amazon.com'
      },
      timeout: 30000
    });
    console.log('✓ Success! Status:', response.status);
    console.log('  Response size:', response.data.length, 'bytes');
    console.log('  Contains "Amazon":', response.data.includes('Amazon'));
  } catch (error) {
    console.log('✗ Error:', error.response?.status || error.message);
  }
  
  // Test with specific book
  console.log('\nTest 3: Specific book page');
  try {
    const response = await axios.get('http://api.scraperapi.com', {
      params: {
        api_key: apiKey,
        url: 'https://www.amazon.com/Great-Gatsby-F-Scott-Fitzgerald/dp/0743273567',
        country_code: 'us'
      },
      timeout: 30000
    });
    console.log('✓ Success! Status:', response.status);
    console.log('  Response size:', response.data.length, 'bytes');
    console.log('  Contains "Look Inside":', response.data.includes('Look Inside'));
    console.log('  Contains book title:', response.data.includes('Great Gatsby'));
  } catch (error) {
    console.log('✗ Error:', error.response?.status || error.message);
    if (error.response?.status === 500) {
      console.log('  Note: 500 errors often mean the target site blocked the request');
    }
  }
}

testScraperAPISimple();