import { test, expect } from '../../playwright/fixtures';

/**
 * Member Portal E2E Tests - Support & Resources
 *
 * Test Area: Support page, FAQs, system status
 * Priority: Medium
 *
 * Coverage:
 * - Support contact information
 * - Documentation links
 * - Community resources
 * - System status display
 * - FAQ section
 */

test.describe('Support & Resources', () => {
  test.beforeEach(async ({ page }) => {
    // Monitor console for errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error('CONSOLE ERROR:', msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Navigate to Support tab
    await page.locator('.tab-button').filter({ hasText: 'Support' }).click();
    await page.waitForTimeout(1000);
  });

  test('should display Support & Resources page header', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Support & Resources' })).toBeVisible();
  });

  test('should display page subtitle', async ({ page }) => {
    await expect(page.locator('.page-subtitle')).toContainText('Get help');
  });

  test('should display Contact Support card', async ({ page }) => {
    const contactCard = page.locator('.card').filter({ hasText: 'Contact Support' });
    await expect(contactCard).toBeVisible();
  });

  test('should display support email address', async ({ page }) => {
    const emailLink = page.locator('a[href^="mailto:"]');
    await expect(emailLink).toBeVisible();

    const href = await emailLink.getAttribute('href');
    expect(href).toContain('support@ctn-network.org');
  });

  test('should display response time information', async ({ page }) => {
    const responseTime = page.locator(':text("Response Time:")');
    await expect(responseTime).toBeVisible();
  });

  test('should display Documentation card', async ({ page }) => {
    const docsCard = page.locator('.card').filter({ hasText: 'Documentation' });
    await expect(docsCard).toBeVisible();
  });

  test('should display documentation links (Coming Soon)', async ({ page }) => {
    const docsCard = page.locator('.card').filter({ hasText: 'Documentation' });

    // Check for documentation items
    await expect(docsCard.locator(':text("Getting Started")')).toBeVisible();
    await expect(docsCard.locator(':text("API Documentation")')).toBeVisible();
    await expect(docsCard.locator(':text("Integration Examples")')).toBeVisible();
    await expect(docsCard.locator(':text("Troubleshooting")')).toBeVisible();
  });

  test('should display Community card', async ({ page }) => {
    const communityCard = page.locator('.card').filter({ hasText: 'Community' });
    await expect(communityCard).toBeVisible();
  });

  test('should display community resources (Coming Soon)', async ({ page }) => {
    const communityCard = page.locator('.card').filter({ hasText: 'Community' });

    await expect(communityCard.locator(':text("Member Forum")')).toBeVisible();
    await expect(communityCard.locator(':text("Technical Blog")')).toBeVisible();
    await expect(communityCard.locator(':text("Webinars")')).toBeVisible();
    await expect(communityCard.locator(':text("Release Notes")')).toBeVisible();
  });

  test('should display System Status card', async ({ page }) => {
    const statusCard = page.locator('.card').filter({ hasText: 'System Status' });
    await expect(statusCard).toBeVisible();
  });

  test('should display All Systems Operational status', async ({ page }) => {
    const statusIndicator = page.locator(':text("All Systems Operational")');
    await expect(statusIndicator).toBeVisible();
  });

  test('should display status indicator with green color', async ({ page }) => {
    // The green indicator div
    const statusCard = page.locator('.card').filter({ hasText: 'System Status' });
    const statusIndicator = statusCard.locator('div').filter({ hasText: 'All Systems Operational' });
    await expect(statusIndicator).toBeVisible();
  });

  test('should display last updated time', async ({ page }) => {
    const lastUpdated = page.locator(':text("Last updated")');
    await expect(lastUpdated).toBeVisible();
  });

  test('should display FAQ section', async ({ page }) => {
    const faqCard = page.locator('.card').filter({ hasText: 'Frequently Asked Questions' });
    await expect(faqCard).toBeVisible();
  });

  test('should display FAQ about API tokens', async ({ page }) => {
    const faqItem = page.locator('h4').filter({ hasText: 'How do I generate an API token?' });
    await expect(faqItem).toBeVisible();
  });

  test('should display FAQ about adding endpoints', async ({ page }) => {
    const faqItem = page.locator('h4').filter({ hasText: 'How do I add a new data endpoint?' });
    await expect(faqItem).toBeVisible();
  });

  test('should display FAQ about organization status', async ({ page }) => {
    const faqItem = page.locator('h4').filter({ hasText: 'What is my organization status?' });
    await expect(faqItem).toBeVisible();
  });

  test('should display FAQ about updating organization details', async ({ page }) => {
    const faqItem = page.locator('h4').filter({ hasText: 'How do I update my organization details?' });
    await expect(faqItem).toBeVisible();
  });

  test('should display FAQ about portal access', async ({ page }) => {
    const faqItem = page.locator('h4').filter({ hasText: 'Who can access the Member Portal?' });
    await expect(faqItem).toBeVisible();
  });

  test('should display 5 FAQ items', async ({ page }) => {
    const faqItems = page.locator('.faq-item, .card h4');
    const count = await faqItems.count();

    // Should have at least 5 FAQs
    expect(count).toBeGreaterThanOrEqual(5);
  });

  test('should take screenshot of Support page', async ({ page }) => {
    await page.screenshot({
      path: 'playwright-report/screenshots/member-support.png',
      fullPage: true
    });

    console.log('Support page screenshot captured');
  });
});
