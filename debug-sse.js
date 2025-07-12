#!/usr/bin/env node

const http = require('http');

// Test basic SSE endpoint
console.log('Testing SSE endpoint...\n');

const req = http.get('http://localhost:3000/test-sse', (res) => {
  console.log('Status:', res.statusCode);
  console.log('Headers:', res.headers);
  console.log('\nReceiving data:\n');
  
  res.on('data', (chunk) => {
    console.log('Chunk:', chunk.toString());
  });
  
  res.on('end', () => {
    console.log('\nConnection ended');
  });
  
  res.on('error', (err) => {
    console.error('Response error:', err);
  });
});

req.on('error', (err) => {
  console.error('Request error:', err);
});

// Timeout after 10 seconds
setTimeout(() => {
  console.log('\nClosing connection...');
  req.destroy();
}, 10000);