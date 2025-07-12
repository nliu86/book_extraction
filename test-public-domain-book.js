const { chromium } = require('playwright');
const fs = require('fs');

async function testPublicDomainBook() {
  const browser = await chromium.launch({
    headless: false
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1200, height: 1600 }
    });
    const page = await context.newPage();
    
    // Test with Pride and Prejudice (public domain)
    const bookId = 's1gVAAAAYAAJ'; // Pride and Prejudice
    const url = `https://www.google.com/books/edition/_/${bookId}?hl=en&gbpv=1&pg=PP1`;
    
    console.log(`Navigating to: ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    
    // Wait for content to load
    await page.waitForTimeout(5000);
    
    // Take initial screenshot
    const screenshot1 = await page.screenshot();
    fs.writeFileSync('pride-prejudice-page1.png', screenshot1);
    console.log('Saved page 1');
    
    // Try navigation
    console.log('Navigating to page 2...');
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(2000);
    
    const screenshot2 = await page.screenshot();
    fs.writeFileSync('pride-prejudice-page2.png', screenshot2);
    console.log('Saved page 2');
    
    // Try one more
    console.log('Navigating to page 3...');
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(2000);
    
    const screenshot3 = await page.screenshot();
    fs.writeFileSync('pride-prejudice-page3.png', screenshot3);
    console.log('Saved page 3');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

testPublicDomainBook();