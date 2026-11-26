const { firefox } = require('playwright');

const RESOLUTIONS = [
  { name: '1536x864', width: 1536, height: 864 },
  { name: '1920x1080', width: 1920, height: 1080 },
  { name: '1366x768', width: 1366, height: 768 },
  { name: '390x844', width: 390, height: 844 },
];

const TABS = ['dashboard', 'pvz', 'seller', 'mcs', 'economics', 'demo', 'settings'];

(async () => {
  const browser = await firefox.launch({ headless: true });
  const errors = [];

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(`CONSOLE [${RESOLUTIONS[0].name}]: ${msg.text()}`);
  });
  page.on('pageerror', err => errors.push(`PAGE [${RESOLUTIONS[0].name}]: ${err.message}`));

  try {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    console.log('=== WB Mesh V7.0 Visual Acceptance (Firefox) ===\n');

    let overallPass = true;

    // 1. Initial state - no modal/drawer visible
    const modalVisible = await page.isVisible('.modal-overlay.active');
    const drawerVisible = await page.isVisible('.drawer.active');
    const drawerOverlayVisible = await page.isVisible('.drawer-overlay.active');
    console.log(`1. Initial overlays - Modal: ${modalVisible ? 'VISIBLE (BAD)' : 'hidden OK'}, Drawer: ${drawerVisible ? 'VISIBLE (BAD)' : 'hidden OK'}, Overlay: ${drawerOverlayVisible ? 'VISIBLE (BAD)' : 'hidden OK'}`);

    // 2. Layout present
    const mainVisible = await page.isVisible('.main');
    const headerVisible = await page.isVisible('.header');
    const sidebarVisible = await page.isVisible('.sidebar');
    console.log(`2. Layout - Main: ${mainVisible}, Header: ${headerVisible}, Sidebar: ${sidebarVisible}`);

    // 3. KPI cards on dashboard
    const kpiCount = await page.locator('.kpi-card').count();
    console.log(`3. Dashboard KPI cards: ${kpiCount}`);

    const initialOk = !modalVisible && !drawerVisible && !drawerOverlayVisible && mainVisible && headerVisible && sidebarVisible && kpiCount > 0;
    if (!initialOk) overallPass = false;

    // 4. All 7 tabs render
    console.log('\n-- Tab render check --');
    for (const tab of TABS) {
      await page.click(`[data-tab="${tab}"]`);
      await page.waitForTimeout(300);
      const visible = await page.isVisible(`#panel-${tab}`);
      console.log(`  Tab ${tab}: ${visible ? 'OK' : 'MISSING (FAIL)'}`);
      if (!visible) overallPass = false;
    }

    // 5. Role switching
    await page.click('[data-tab="dashboard"]');
    await page.waitForTimeout(300);
    await page.selectOption('#roleSelect', 'pvz_operator');
    await page.waitForTimeout(300);
    await page.selectOption('#roleSelect', 'owner');
    await page.waitForTimeout(300);
    console.log(`\n-- Role switching: OK --`);

    // 6. Demo tab scenarios
    await page.click('[data-tab="demo"]');
    await page.waitForTimeout(300);
    const scenarioCount = await page.locator('.demo-scenario-card').count();
    console.log(`-- Demo scenarios: ${scenarioCount} cards --`);

    // 7. Screenshots at each required resolution
    console.log('\n-- Screenshots --');
    for (const res of RESOLUTIONS) {
      await page.setViewportSize({ width: res.width, height: res.height });
      await page.waitForTimeout(500);
      const path = `test-visual-${res.name.toLowerCase()}.png`;
      await page.screenshot({ path, fullPage: true });
      console.log(`  ${res.name} (${res.width}x${res.height}): ${path}`);
    }

    // 8. Per-tab screenshots at desktop resolution
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(500);
    for (const tab of TABS) {
      // Close overlays and switch tab programmatically to avoid pointer interception
      await page.evaluate((t) => {
        document.getElementById('drawerOverlay')?.classList.remove('active');
        document.getElementById('modalOverlay')?.classList.remove('active');
        document.getElementById('modal')?.classList.remove('active');
        document.getElementById('drawer')?.classList.remove('active');
        // Dispatch click on the matching tab/button to trigger switchTab + render
        const el = document.querySelector(`[data-tab="${t}"]`);
        if (el) el.click();
      }, tab);
      await page.waitForTimeout(300);
      await page.screenshot({ path: `test-visual-tab-${tab}.png`, fullPage: true });
      console.log(`  Tab ${tab} screenshot: test-visual-tab-${tab}.png`);
    }

    console.log(`\n=== ERRORS: ${errors.length} ===`);
    errors.forEach(e => console.log(`  - ${e}`));

    const success = overallPass && errors.length === 0;
    console.log(`\n=== OVERALL: ${success ? 'PASS ✓' : 'FAIL ✗'} ===`);

    await browser.close();
    process.exit(success ? 0 : 1);
  } catch (err) {
    console.error('Test failed:', err.message);
    await browser.close();
    process.exit(1);
  }
})();
