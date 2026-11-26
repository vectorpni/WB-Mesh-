const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(`CONSOLE: ${msg.text()}`);
  });
  page.on('pageerror', err => errors.push(`PAGE: ${err.message}`));

  try {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    console.log('=== WB Mesh UI Verification ===');

    // 1. Modal/Drawer should NOT be visible on load
    const modalVisible = await page.isVisible('.modal-overlay.active');
    const drawerVisible = await page.isVisible('.drawer.active');
    const drawerOverlayVisible = await page.isVisible('.drawer-overlay.active');
    console.log(`1. Initial state - Modal: ${modalVisible ? 'VISIBLE (BAD)' : 'hidden (OK)'}, Drawer: ${drawerVisible ? 'VISIBLE (BAD)' : 'hidden (OK)'}, DrawerOverlay: ${drawerOverlayVisible ? 'VISIBLE (BAD)' : 'hidden (OK)'}`);

    // 2. Main content visible
    const mainVisible = await page.isVisible('.main');
    const headerVisible = await page.isVisible('.header');
    const sidebarVisible = await page.isVisible('.sidebar');
    console.log(`2. Layout - Main: ${mainVisible}, Header: ${headerVisible}, Sidebar: ${sidebarVisible}`);

    // 3. KPI cards
    const kpiCount = await page.locator('.kpi-card').count();
    console.log(`3. KPI cards: ${kpiCount}`);

    // 4. All tabs
    for (const tab of ['dashboard', 'pvz', 'seller', 'mcs', 'economics', 'demo', 'settings']) {
      await page.click(`[data-tab="${tab}"]`);
      await page.waitForTimeout(300);
      const visible = await page.isVisible(`#panel-${tab}`);
      console.log(`4. Tab ${tab}: ${visible ? 'OK' : 'MISSING'}`);
    }

    // 5. Role switching
    await page.selectOption('#roleSelect', 'pvz_operator');
    await page.waitForTimeout(300);
    await page.selectOption('#roleSelect', 'owner');
    await page.waitForTimeout(300);
    console.log(`5. Role switching: OK`);

    // 6. Modal trigger buttons exist on dashboard
    await page.click('[data-tab="dashboard"]');
    await page.waitForTimeout(300);
    const modalTriggers = await page.locator('button[id*="add"], button[id*="Modal"], button[id*="modal"]').count();
    console.log(`6. Modal trigger buttons on dashboard: ${modalTriggers}`);

    // 7. Role switching
    await page.selectOption('#roleSelect', 'pvz_operator');
    await page.waitForTimeout(300);
    await page.selectOption('#roleSelect', 'owner');
    await page.waitForTimeout(300);
    console.log(`7. Role switching: OK`);

    // 8. Demo tab
    await page.click('[data-tab="demo"]');
    await page.waitForTimeout(300);
    const scenarioCount = await page.locator('.demo-scenario-card').count();
    console.log(`8. Demo scenarios: ${scenarioCount} cards`);

    // 9. Screenshot
    await page.screenshot({ path: 'test-final.png', fullPage: true });
    console.log(`9. Screenshot saved: test-final.png`);

    console.log(`\n=== ERRORS: ${errors.length} ===`);
    errors.forEach(e => console.log(`  - ${e}`));

    const success = errors.length === 0 && !modalVisible && !drawerVisible && !drawerOverlayVisible && mainVisible && headerVisible && sidebarVisible && kpiCount > 0;
    console.log(`\n=== OVERALL: ${success ? 'PASS ✓' : 'FAIL ✗'} ===`);

    await browser.close();
    process.exit(success ? 0 : 1);
  } catch (err) {
    console.error('Test failed:', err.message);
    await browser.close();
    process.exit(1);
  }
})();