/**
 * Manual Authentication Capture Script
 *
 * This script helps capture a complete authenticated session including MSAL cache.
 *
 * Run with: node scripts/capture-auth-manual.js
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function captureAuth() {
  console.log('🔐 Starting manual authentication capture...\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 100,
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
  });

  const page = await context.newPage();

  console.log('📱 Opening app...');
  await page.goto('https://calm-tree-03352ba03.1.azurestaticapps.net/');

  console.log('\n⏸️  MANUAL STEPS:');
  console.log('1. Complete Microsoft login in the browser window');
  console.log('2. Complete MFA authentication');
  console.log('3. Wait for the dashboard to load completely');
  console.log('4. Press Enter in this terminal when you see the dashboard\n');

  // Wait for user confirmation
  await waitForUserInput();

  console.log('\n🔍 Checking authentication status...');

  // Check if we're on the dashboard
  try {
    const isDashboardVisible = await page.locator('text=Dashboard').isVisible({ timeout: 5000 });
    const isMembersVisible = await page.locator('text=Members').isVisible({ timeout: 5000 });

    if (!isDashboardVisible || !isMembersVisible) {
      console.error('❌ Dashboard not detected. Please ensure you completed login and the dashboard is visible.');
      await browser.close();
      process.exit(1);
    }

    console.log('✅ Dashboard detected!');
  } catch (error) {
    console.error('❌ Could not verify dashboard. Error:', error.message);
    await browser.close();
    process.exit(1);
  }

  // Check localStorage for MSAL data
  console.log('\n🔍 Checking MSAL cache...');
  const msalKeys = await page.evaluate(() => {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes('msal')) {
        keys.push(key);
      }
    }
    return keys;
  });

  if (msalKeys.length === 0) {
    console.warn('⚠️  Warning: No MSAL cache entries found in localStorage');
    console.log('This might mean authentication is stored differently or hasn\'t completed yet.');
  } else {
    console.log(`✅ Found ${msalKeys.length} MSAL cache entries`);
  }

  // Save the storage state
  const authDir = path.join(__dirname, '..', 'playwright', '.auth');
  const authFile = path.join(authDir, 'user.json');

  // Ensure directory exists
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  await context.storageState({ path: authFile });

  console.log(`\n✅ Storage state saved to: ${authFile}`);

  // Display summary
  const storageData = JSON.parse(fs.readFileSync(authFile, 'utf8'));
  console.log('\n📊 Capture Summary:');
  console.log(`   Cookies: ${storageData.cookies.length}`);
  console.log(`   Origins: ${storageData.origins.length}`);
  if (storageData.origins[0]?.localStorage) {
    console.log(`   LocalStorage entries: ${storageData.origins[0].localStorage.length}`);
  }

  console.log('\n✅ Authentication capture complete!');
  console.log('📝 You can now run tests with: npm run test:e2e');

  await browser.close();
}

function waitForUserInput() {
  return new Promise((resolve) => {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question('Press Enter when ready to continue...', () => {
      rl.close();
      resolve();
    });
  });
}

captureAuth().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
