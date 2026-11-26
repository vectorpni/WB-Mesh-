const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  page.on('pageerror', err => {
    errors.push(err.message);
  });

  try {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Check if modal is visible (should NOT be)
    const modalVisible = await page.isVisible('.modal-overlay.active');
    const drawerVisible = await page.isVisible('.drawer.active');
    const drawerOverlayVisible = await page.isVisible('.drawer-overlay.active');

    // Check main content is visible
    const mainContent = await page.isVisible('.main');
    const header = await page.isVisible('.header');
    const sidebar = await page.isVisible('.sidebar');

    // Check KPI cards are rendered
    const kpiCards = await page.$$('.kpi-card');

    // Check active tab
    const activeTab = await page.$eval('.tab.active', el => el.textContent).catch(() => 'none');

    // Take screenshot
    await page.screenshot({ path: 'test-screenshot.png', fullPage: true });

    console.log('=== UI TEST RESULTS ===');
    console.log(`Modal visible (should be false): ${modalVisible}`);
    console.log(`Drawer visible (should be false): ${drawerVisible}`);
    console.log(`Drawer overlay visible (should be false): ${drawerOverlayVisible}`);
    console.log(`Main content visible: ${mainContent}`);
    console.log(`Header visible: ${header}`);
    console.log(`Sidebar visible: ${sidebar}`);
    console.log(`KPI cards count: ${kpiCards.length}`);
    console.log(`Active tab: ${activeTab}`);
    console.log(`Console errors: ${errors.length}`);
    errors.forEach(e => console.log(`  - ${e}`));

    const success = !modalVisible && !drawerVisible && !drawerOverlayVisible && mainContent && header && kpiCards.length > 0;
    console.log(`\n=== OVERALL: ${success ? 'PASS ✓' : 'FAIL ✗'} ===`);

    await browser.close();
    process.exit(success ? 0 : 1);
  } catch (err) {
    console.error('Test failed:', err.message);
    errors.push(err.message);
    await browser.close();
    process.exit(1);
  }
})();