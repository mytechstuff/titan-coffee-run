import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:8000';

test.describe('Apply form smoke tests', () => {
  test('invalid submit shows validation summary and errors table and no POSTs', async ({ page }) => {
    const requests = [];
    page.on('request', (r) => requests.push({ url: r.url(), method: r.method() }));
    page.on('console', (m) => console.log('PAGE:', m.text()));

    await page.goto(`${BASE}/apply.html`);
    await page.click('button[type="submit"]');

    await expect(page.locator('#validation-summary')).toBeVisible();
    const rows = await page.locator('#errors-table tbody tr').count();
    expect(rows).toBeGreaterThan(0);

    const postRequests = requests.filter((r) => r.method === 'POST' && r.url.includes('/api/'));
    expect(postRequests.length).toBe(0);
  });

  test('valid submit shows approved decision and no POSTs', async ({ page }) => {
    const requests = [];
    page.on('request', (r) => requests.push({ url: r.url(), method: r.method() }));
    page.on('console', (m) => console.log('PAGE:', m.text()));

    await page.goto(`${BASE}/apply.html`);
    await page.fill('#email', 'applicant@example.com');
    await page.fill('#emailConfirm', 'applicant@example.com');
    await page.fill('#firstName', 'Jane');
    await page.fill('#lastName', 'Doe');
    await page.fill('#city', 'Seattle');
    await page.fill('#state', 'WA');
    await page.fill('#zip', '98101');
    await page.fill('#grossIncome', '25000');
    await page.fill('#ssnLast4', '1234');
    await page.check('#consent');

    await page.click('button[type="submit"]');

    await expect(page.locator('#decision-result')).toBeVisible();
    await expect(page.locator('#decision-result')).toContainText('Approved');

    const postRequests = requests.filter((r) => r.method === 'POST' && r.url.includes('/api/'));
    expect(postRequests.length).toBe(0);
  });
});
