const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function testDirectBook() {
  const browser = await chromium.launch({
    headless: false // Show browser for debugging
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1200, height: 1600 }
    });
    const page = await context.newPage();
    
    // Test with the exact book ID from user
    const bookId = '6nkMShGgs7oC';
    const url = `https://www.google.com/books/edition/_/${bookId}?hl=en&gbpv=1&pg=PP1`;
    
    console.log(`Navigating to: ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    
    // Wait for content to load
    await page.waitForTimeout(5000);
    
    // Take screenshot
    const screenshot = await page.screenshot();
    fs.writeFileSync('test-direct-navigation.png', screenshot);
    console.log('Saved screenshot to test-direct-navigation.png');
    
    // Look for all interactive elements
    const allButtons = await page.locator('button, [role="button"], div[jsaction*="click"]').all();
    console.log(`Found ${allButtons.length} clickable elements`);
    
    // Check the toolbar area (top of the preview)
    const toolbarButtons = await page.locator('.gb_C button, [role="toolbar"] button').all();
    console.log(`Found ${toolbarButtons.length} toolbar buttons`);
    
    // Look for navigation in the specific area shown in user's screenshot
    const navArea = await page.locator('div.gb_C').first();
    if (await navArea.isVisible()) {
      console.log('Found navigation area');
      
      // Find buttons within this area
      const navButtons = await navArea.locator('button').all();
      console.log(`Found ${navButtons.length} buttons in nav area`);
      
      // Click the rightmost button (should be next)
      if (navButtons.length >= 2) {
        const nextButton = navButtons[navButtons.length - 1];
        const box = await nextButton.boundingBox();
        console.log('Next button position:', box);
        
        await nextButton.click();
        console.log('Clicked next button');
        await page.waitForTimeout(3000);
        
        // Take screenshot after navigation
        const screenshot2 = await page.screenshot();
        fs.writeFileSync('test-after-navigation.png', screenshot2);
        console.log('Saved screenshot after navigation');
      }
    }
    
    // Alternative: Try keyboard navigation
    console.log('Trying keyboard navigation...');
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(2000);
    
    const screenshot3 = await page.screenshot();
    fs.writeFileSync('test-after-keyboard.png', screenshot3);
    console.log('Saved screenshot after keyboard navigation');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

testDirectBook();