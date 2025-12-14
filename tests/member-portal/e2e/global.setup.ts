import { chromium, FullConfig } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

async function globalSetup(config: FullConfig) {
  console.log('Member Portal E2E: Preparing authentication state...');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const baseURL = config.projects[0].use.baseURL || 'https://calm-pebble-043b2db03.1.azurestaticapps.net';

  try {
    // Navigate to the member portal
    await page.goto(baseURL, { waitUntil: 'networkidle' });

    // Click Sign In button
    await page.click('button:has-text("Sign In")', { timeout: 10000 });

    // Wait for Azure AD login page
    await page.waitForURL(/login.microsoftonline.com/, { timeout: 30000 });

    // Fill in email
    await page.fill('input[type="email"]', 'test-e2@denoronha.consulting');
    await page.click('input[type="submit"]');

    // Wait for password page
    await page.waitForSelector('input[type="password"]', { timeout: 10000 });

    // Fill in password
    await page.fill('input[type="password"]', 'Madu5952');
    await page.click('input[type="submit"]');

    // Handle "Stay signed in?" prompt
    try {
      await page.waitForSelector('input[type="submit"]', { timeout: 5000 });
      await page.click('input[type="submit"][value="Yes"]');
    } catch (e) {
      // No "stay signed in" prompt, continue
    }

    // Wait for redirect back to member portal
    await page.waitForURL(new RegExp(baseURL), { timeout: 30000 });

    // Wait for authenticated state - either Dashboard OR error message
    // The portal loads member data after auth, which may take time or fail
    try {
      await page.waitForSelector('text=Dashboard, text=Error, text=Failed', { timeout: 30000 });
      console.log('✅ Authentication successful - Portal loaded');
    } catch (e) {
      // Even if Dashboard doesn't appear, if we're authenticated, save the state
      const pageContent = await page.content();
      if (pageContent.includes('Sign Out') || pageContent.includes('test-e2@')) {
        console.log('⚠️  Authentication successful but Dashboard not loaded (may need test user setup)');
      } else {
        throw new Error('Authentication appears to have failed - no Dashboard or Sign Out button found');
      }
    }

    // Save authentication state
    const authDir = path.join(__dirname, '../../../member-portal/playwright/.auth');
    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, { recursive: true });
    }

    await context.storageState({ path: path.join(authDir, 'user.json') });
    console.log('✅ Auth state saved to playwright/.auth/user.json');

  } catch (error) {
    console.error('❌ Authentication failed:', error);
    await page.screenshot({ path: 'auth-failure.png', fullPage: true });
    throw error;
  } finally {
    await browser.close();
  }

  console.log('Global setup complete\n');
}

export default globalSetup;
