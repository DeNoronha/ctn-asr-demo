/**
 * Complete Authentication Capture Script
 *
 * Captures BOTH localStorage AND sessionStorage (where MSAL stores tokens)
 *
 * Run with: node scripts/capture-auth-final.js
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function captureAuth() {
  console.log('🔐 Starting authentication capture (with sessionStorage support)...\n');

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

  console.log('\n⏸️  Please complete Microsoft login + MFA in the browser');
  console.log('⏸️  The script will automatically detect when the dashboard loads\n');
  console.log('⏳ Waiting up to 5 minutes for authentication to complete...\n');

  try {
    // Wait for Dashboard to appear
    await page.waitForSelector('text=Dashboard', { timeout: 300000 });

    console.log('✅ Dashboard detected! Waiting for MSAL to finish storing tokens...');
    await page.waitForTimeout(5000);

    // Check BOTH localStorage and sessionStorage for MSAL data
    console.log('\n🔍 Checking browser storage...');
    const storageData = await page.evaluate(() => {
      const data = {
        localStorage: {
          keys: [],
          msal: []
        },
        sessionStorage: {
          keys: [],
          msal: []
        }
      };

      // Check localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          data.localStorage.keys.push(key);
          if (key.includes('msal')) {
            data.localStorage.msal.push(key);
          }
        }
      }

      // Check sessionStorage
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key) {
          data.sessionStorage.keys.push(key);
          if (key.includes('msal')) {
            data.sessionStorage.msal.push(key);
          }
        }
      }

      return data;
    });

    console.log(`   localStorage: ${storageData.localStorage.keys.length} entries, ${storageData.localStorage.msal.length} MSAL`);
    console.log(`   sessionStorage: ${storageData.sessionStorage.keys.length} entries, ${storageData.sessionStorage.msal.length} MSAL`);

    if (storageData.sessionStorage.msal.length > 0) {
      console.log('   ✅ MSAL cache found in sessionStorage (this is correct!)');
    }

    // Save storage state with context
    const authDir = path.join(__dirname, '..', 'playwright', '.auth');
    const authFile = path.join(authDir, 'user.json');

    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, { recursive: true });
    }

    console.log('\n💾 Saving storage state (cookies + localStorage)...');
    await context.storageState({ path: authFile });

    // Manually extract and save sessionStorage since Playwright doesn't do this automatically
    const sessionData = await page.evaluate(() => {
      const data = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key) {
          data.push({
            name: key,
            value: sessionStorage.getItem(key)
          });
        }
      }
      return data;
    });

    // Read the existing storage state and add sessionStorage
    const existingState = JSON.parse(fs.readFileSync(authFile, 'utf8'));

    // Add sessionStorage to the main origin
    if (existingState.origins && existingState.origins.length > 0) {
      const mainOrigin = existingState.origins.find(o => o.origin.includes('azurestaticapps'));
      if (mainOrigin) {
        mainOrigin.sessionStorage = sessionData;
      }
    }

    // Save the updated state
    fs.writeFileSync(authFile, JSON.stringify(existingState, null, 2));

    console.log(`   ✅ Saved ${sessionData.length} sessionStorage entries`);

    // Summary
    console.log('\n📊 Capture Summary:');
    console.log(`   File: ${authFile}`);
    console.log(`   Cookies: ${existingState.cookies.length}`);
    console.log(`   Origins: ${existingState.origins.length}`);

    if (existingState.origins[0]) {
      const origin = existingState.origins[0];
      if (origin.localStorage) console.log(`   LocalStorage entries: ${origin.localStorage.length}`);
      if (origin.sessionStorage) console.log(`   SessionStorage entries: ${origin.sessionStorage.length}`);
    }

    console.log(`\n✅ Authentication capture complete!`);
    console.log('📝 You can now run tests with: npm run test:e2e\n');

    await browser.close();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await browser.close();
    process.exit(1);
  }
}

captureAuth();
