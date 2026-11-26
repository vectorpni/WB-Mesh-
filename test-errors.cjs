const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(`CONSOLE ERROR: ${msg.text()}`);
    }
  });
  page.on('pageerror', err => {
    errors.push(`PAGE ERROR: ${err.message}`);
  });

  try {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Test all tabs
    const tabs = ['dashboard', 'pvz', 'seller', 'mcs', 'economics', 'demo', 'settings'];
    for (const tab of tabs) {
      await page.click(`[data-tab="${tab}"]`);
      await page.waitForTimeout(1000);
      console.log(`Tab ${tab}: errors=${errors.length}`);
    }

    console.log('\n=== ALL ERRORS ===');
    errors.forEach((e, i) => console.log(`${i+1}. ${e}`));

    await browser.close();
    process.exit(0);
  } catch (err) {
    console.error('Test failed:', err.message);
    await browser.close();
    process.exit(1);
  }
})();