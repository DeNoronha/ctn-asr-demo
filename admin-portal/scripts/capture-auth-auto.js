/**
 * Automatic Authentication Capture Script
 *
 * This script captures authentication state automatically by:
 * 1. Opening the browser
 * 2. Waiting for you to complete login and see the dashboard
 * 3. Automatically detecting when authentication is complete
 * 4. Saving the complete storage state
 *
 * Run with: node scripts/capture-auth-auto.js
 */

const { chromium } = require('playwright');
const path = require('node:path');
const fs = require('node:fs');

async function captureAuth() {
  console.log('🔐 Starting automatic authentication capture...\n');

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
    // Wait for Dashboard text to appear - this indicates successful authentication
    await page.waitForSelector('text=Dashboard', { timeout: 300000 }); // 5 minutes

    console.log('✅ Dashboard detected! Waiting for MSAL to finish storing tokens...');

    // Give MSAL extra time to complete token storage
    await page.waitForTimeout(5000);

    // Check localStorage for MSAL data
    console.log('\n🔍 Checking MSAL cache...');
    const msalData = await page.evaluate(() => {
      const data = {
        keys: [],
        hasTokens: false,
        hasAccounts: false,
      };

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.includes('msal')) {
          data.keys.push(key);

          if (key.includes('accesstoken') || key.includes('idtoken')) {
            data.hasTokens = true;
          }
          if (key.includes('account')) {
            data.hasAccounts = true;
          }
        }
      }

      return data;
    });

    if (msalData.keys.length === 0) {
      console.warn('⚠️  Warning: No MSAL cache entries found in localStorage');
      console.warn('    This may be normal if auth is stored in sessionStorage');
    } else {
      console.log(`✅ Found ${msalData.keys.length} MSAL entries in localStorage:`);
      console.log(`   - Has Tokens: ${msalData.hasTokens ? 'Yes' : 'No'}`);
      console.log(`   - Has Accounts: ${msalData.hasAccounts ? 'Yes' : 'No'}`);
    }

    // Save the storage state
    const authDir = path.join(__dirname, '..', 'playwright', '.auth');
    const authFile = path.join(authDir, 'user.json');

    // Ensure directory exists
    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, { recursive: true });
    }

    console.log('\n💾 Saving storage state...');
    await context.storageState({ path: authFile });

    // Display summary
    const storageData = JSON.parse(fs.readFileSync(authFile, 'utf8'));
    console.log('\n📊 Capture Summary:');
    console.log(`   File: ${authFile}`);
    console.log(`   Cookies: ${storageData.cookies.length}`);
    console.log(`   Origins: ${storageData.origins.length}`);

    if (storageData.origins && storageData.origins.length > 0) {
      const mainOrigin = storageData.origins.find((o) => o.origin.includes('azurestaticapps'));
      if (mainOrigin?.localStorage) {
        console.log(`   LocalStorage entries: ${mainOrigin.localStorage.length}`);

        // Show MSAL-specific entries
        const msalEntries = mainOrigin.localStorage.filter((item) => item.name.includes('msal'));
        if (msalEntries.length > 0) {
          console.log(`   ✅ MSAL entries captured: ${msalEntries.length}`);
        }
      }
    }

    console.log('\n✅ Authentication capture complete!');
    console.log('📝 You can now run tests with: npm run test:e2e\n');

    await browser.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error during authentication capture:');
    console.error(error.message);

    if (error.message.includes('Timeout')) {
      console.error('\n💡 Possible reasons:');
      console.error('   - Login took longer than 5 minutes');
      console.error("   - Dashboard didn't load properly");
      console.error('   - Network issues');
      console.error('\nPlease try running the script again.');
    }

    await browser.close();
    process.exit(1);
  }
}

captureAuth().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
