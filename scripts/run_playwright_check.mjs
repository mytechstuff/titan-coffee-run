import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('console', (msg) => console.log('PAGE_CONSOLE', msg.type(), msg.text()));
  page.on('pageerror', (err) => console.log('PAGE_ERROR', err && err.stack ? err.stack : String(err)));
  page.on('requestfailed', (r) => console.log('REQUEST_FAILED', r.url(), r.failure && r.failure.errorText));

  console.log('Navigating to apply page...');
  await page.goto('http://localhost:8000/apply.html', { waitUntil: 'load' });
  console.log('Page loaded.');

  // show module scripts present
  const scripts = await page.$$eval('script[type="module"]', (s) => s.map((el) => el.getAttribute('src')));
  console.log('Module scripts on page:', scripts);

  // take screenshot for debugging
  await page.screenshot({ path: 'playwright-snapshot.png', fullPage: false });

  // click submit to trigger validation
  console.log('Clicking submit...');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1000);

  // grab validation summary innerHTML
  const summaryHidden = await page.$eval('#validation-summary', (el) => el.hidden);
  console.log('#validation-summary hidden?', summaryHidden);
  const decisionHidden = await page.$eval('#decision-result', (el) => el.hidden);
  console.log('#decision-result hidden?', decisionHidden);

  await browser.close();
  console.log('Done.');
})();
