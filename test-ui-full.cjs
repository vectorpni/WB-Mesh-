const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const errors = [];
  const consoleMessages = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(`CONSOLE ERROR: ${msg.text()}`);
    }
    consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
  });
  page.on('pageerror', err => {
    errors.push(`PAGE ERROR: ${err.message}`);
  });

  try {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    console.log('=== INITIAL LOAD ===');
    console.log(`Title: ${await page.title()}`);
    console.log(`Console errors: ${errors.length}`);

    // Take screenshot of dashboard
    await page.screenshot({ path: 'test-dashboard.png', fullPage: true });
    console.log('Screenshot: test-dashboard.png');

    // Test all tabs
    const tabs = ['dashboard', 'pvz', 'seller', 'mcs', 'economics', 'demo', 'settings'];
    for (const tab of tabs) {
      console.log(`\n=== Testing tab: ${tab} ===`);
      await page.click(`[data-tab="${tab}"]`);
      await page.waitForTimeout(1000);

      const tabVisible = await page.isVisible(`#panel-${tab}`);
      const tabErrors = errors.length;
      console.log(`Panel visible: ${tabVisible}, Errors so far: ${tabErrors}`);

      await page.screenshot({ path: `test-${tab}.png`, fullPage: true });
    }

    // Test role switching
    console.log('\n=== Testing role switching ===');
    await page.selectOption('#roleSelect', 'pvz_operator');
    await page.waitForTimeout(500);
    console.log('Role switched to pvz_operator');

    await page.selectOption('#roleSelect', 'seller');
    await page.waitForTimeout(500);
    console.log('Role switched to seller');

    await page.selectOption('#roleSelect', 'owner');
    await page.waitForTimeout(500);
    console.log('Role switched back to owner');

    // Test virtual time controls
    console.log('\n=== Testing virtual time ===');
    await page.click('#timePlay');
    await page.waitForTimeout(500);
    await page.click('#timePause');
    await page.waitForTimeout(500);
    console.log('Time play/pause works');

    // Test modal open/close
    console.log('\n=== Testing modal ===');
    await page.click('#viewAllOrders');
    await page.waitForTimeout(500);
    const modalVisible = await page.isVisible('.modal-overlay.active');
    console.log(`Modal visible after click: ${modalVisible}`);
    await page.click('#modalClose');
    await page.waitForTimeout(500);
    const modalClosed = await page.isVisible('.modal-overlay.active');
    console.log(`Modal closed: ${!modalClosed}`);

    // Final check
    console.log('\n=== FINAL RESULTS ===');
    console.log(`Total errors: ${errors.length}`);
    errors.forEach(e => console.log(`  - ${e}`));

    const success = errors.length === 0;
    console.log(`\n=== OVERALL: ${success ? 'PASS ✓' : 'FAIL ✗'} ===`);

    await browser.close();
    process.exit(success ? 0 : 1);
  } catch (err) {
    console.error('Test failed:', err.message);
    await browser.close();
    process.exit(1);
  }
})();