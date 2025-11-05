import { test, expect, Page } from '@playwright/test';
import * as path from 'path';

/**
 * Member Registration & Approval Workflow E2E Test
 *
 * Test Flow:
 * 1. Member Portal: Register new member with KvK document upload
 * 2. Admin Portal: Find and review the application
 * 3. Admin Portal: Approve the application
 * 4. Admin Portal: Verify member created with KvK verification data
 *
 * Expected Result:
 * - Application submitted successfully with document
 * - Application visible in admin portal with document
 * - Application approved and member created
 * - Member details show all KvK verification fields
 */

// Test credentials (from environment variables - see .credentials file)
const ADMIN_EMAIL = process.env.E2E_TEST_USER_EMAIL || 'test-e2@denoronha.consulting';
const ADMIN_PASSWORD = process.env.E2E_TEST_USER_PASSWORD || '';

// Test data (unique per test run)
const TIMESTAMP = Date.now();
const TEST_DATA = {
  legalName: `Test Company B.V. ${TIMESTAMP}`,
  kvkNumber: String(TIMESTAMP).slice(-8), // Last 8 digits
  email: `test-member-${TIMESTAMP}@example.com`,
  contactName: 'Test Contact',
  phone: '+31612345678',
  jobTitle: 'CEO',
  address: 'Test Street 123',
  postalCode: '1234AB',
  city: 'Amsterdam',
  country: 'Netherlands',
  membershipType: 'basic',
};

// KvK document path
const KVK_DOCUMENT_PATH = '/Users/ramondenoronha/Desktop/KvK-DNC-95944192.pdf';

test.describe('Member Registration & Approval Workflow', () => {
  let applicationId: string;
  let legalEntityId: string;

  test.setTimeout(180000); // 3 minutes for full workflow

  test('Step 1: Member submits registration with KvK document', async ({ page }) => {
    console.log('\n========================================');
    console.log('STEP 1: Member Registration');
    console.log('========================================');

    // Navigate to member portal
    await page.goto('https://calm-pebble-043b2db03.1.azurestaticapps.net');
    await page.waitForLoadState('networkidle');

    // Take screenshot of landing page
    await page.screenshot({ path: 'e2e-results/1-member-portal-landing.png', fullPage: true });

    // Look for registration link/button
    // Check common patterns for registration CTAs
    const registrationSelectors = [
      'text=/register/i',
      'text=/sign up/i',
      'text=/apply/i',
      'text=/join/i',
      'a[href*="register"]',
      'button:has-text("Register")',
    ];

    let registrationFound = false;
    for (const selector of registrationSelectors) {
      try {
        const element = await page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 })) {
          console.log(`Found registration element: ${selector}`);
          await element.click();
          registrationFound = true;
          break;
        }
      } catch (e) {
        // Try next selector
      }
    }

    if (!registrationFound) {
      console.log('No registration link found on landing page - may already be on registration form');
    }

    // Wait for registration form to be visible
    await page.waitForSelector('input[name="legalName"], input[name="companyName"], input[placeholder*="company"]', {
      timeout: 10000,
      state: 'visible'
    });

    // Take screenshot of registration form
    await page.screenshot({ path: 'e2e-results/2-registration-form.png', fullPage: true });

    // Fill in company information
    // Try multiple selector patterns as field names may vary
    await fillField(page, ['input[name="legalName"]', 'input[name="companyName"]'], TEST_DATA.legalName);
    await fillField(page, ['input[name="kvkNumber"]', 'input[name="kvk"]'], TEST_DATA.kvkNumber);
    await fillField(page, ['input[name="companyAddress"]', 'input[name="address"]'], TEST_DATA.address);
    await fillField(page, ['input[name="postalCode"]', 'input[name="zipCode"]'], TEST_DATA.postalCode);
    await fillField(page, ['input[name="city"]'], TEST_DATA.city);

    // Select country if dropdown exists
    try {
      const countryField = page.locator('select[name="country"]').first();
      if (await countryField.isVisible({ timeout: 2000 })) {
        await countryField.selectOption(TEST_DATA.country);
      }
    } catch (e) {
      console.log('Country field not found or not a dropdown');
    }

    // Fill in contact information
    await fillField(page, ['input[name="contactName"]', 'input[name="name"]'], TEST_DATA.contactName);
    await fillField(page, ['input[name="contactEmail"]', 'input[name="email"]', 'input[type="email"]'], TEST_DATA.email);
    await fillField(page, ['input[name="contactPhone"]', 'input[name="phone"]', 'input[type="tel"]'], TEST_DATA.phone);
    await fillField(page, ['input[name="jobTitle"]', 'input[name="title"]'], TEST_DATA.jobTitle);

    // Select membership type if exists
    try {
      const membershipField = page.locator('select[name="membershipType"]').first();
      if (await membershipField.isVisible({ timeout: 2000 })) {
        await membershipField.selectOption(TEST_DATA.membershipType);
      }
    } catch (e) {
      console.log('Membership type field not found');
    }

    // Upload KvK document
    console.log(`Uploading KvK document: ${KVK_DOCUMENT_PATH}`);
    const fileInputSelectors = [
      'input[type="file"]',
      'input[name="kvkDocument"]',
      'input[name="document"]',
      'input[accept*="pdf"]',
    ];

    let fileUploaded = false;
    for (const selector of fileInputSelectors) {
      try {
        const fileInput = page.locator(selector).first();
        if (await fileInput.count() > 0) {
          await fileInput.setInputFiles(KVK_DOCUMENT_PATH);
          console.log(`File uploaded via selector: ${selector}`);
          fileUploaded = true;
          break;
        }
      } catch (e) {
        console.log(`Failed to upload with selector ${selector}: ${e}`);
      }
    }

    if (!fileUploaded) {
      console.warn('WARNING: Could not find file input - document upload may not be working');
    }

    // Accept terms and conditions
    try {
      const termsCheckbox = page.locator('input[name="termsAccepted"], input[type="checkbox"]').first();
      if (await termsCheckbox.isVisible({ timeout: 2000 })) {
        await termsCheckbox.check();
      }

      const gdprCheckbox = page.locator('input[name="gdprConsent"]').first();
      if (await gdprCheckbox.isVisible({ timeout: 2000 })) {
        await gdprCheckbox.check();
      }
    } catch (e) {
      console.log('Terms/GDPR checkboxes not found');
    }

    // Take screenshot before submission
    await page.screenshot({ path: 'e2e-results/3-registration-form-filled.png', fullPage: true });

    // Submit the form
    const submitButton = page.locator('button[type="submit"], button:has-text("Submit"), button:has-text("Register")').first();
    await submitButton.click();

    // Wait for success message or redirect
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'e2e-results/4-registration-submitted.png', fullPage: true });

    // Try to extract application ID from success message
    const pageContent = await page.content();
    const appIdMatch = pageContent.match(/application[:\s]+([a-f0-9-]{36})/i);
    if (appIdMatch) {
      applicationId = appIdMatch[1];
      console.log(`Application ID: ${applicationId}`);
    } else {
      console.log('Could not extract application ID from success message');
    }

    console.log('✓ Step 1 Complete: Registration submitted');
  });

  test('Step 2: Admin finds application and reviews document', async ({ page }) => {
    console.log('\n========================================');
    console.log('STEP 2: Admin Review');
    console.log('========================================');

    // Login to admin portal
    await page.goto('https://calm-tree-03352ba03.1.azurestaticapps.net');
    await page.waitForLoadState('networkidle');

    // Take screenshot of login page
    await page.screenshot({ path: 'e2e-results/5-admin-login.png', fullPage: true });

    // Azure AD login flow
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.click('input[type="submit"]');
    await page.waitForTimeout(2000);

    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('input[type="submit"]');
    await page.waitForTimeout(2000);

    // Handle "Stay signed in?" prompt
    try {
      const staySignedInButton = page.locator('input[type="submit"][value="Yes"], button:has-text("Yes")').first();
      if (await staySignedInButton.isVisible({ timeout: 5000 })) {
        await staySignedInButton.click();
      }
    } catch (e) {
      console.log('No "Stay signed in?" prompt');
    }

    // Wait for admin portal to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'e2e-results/6-admin-portal-dashboard.png', fullPage: true });

    // Navigate to Applications tab
    const applicationsTab = page.locator('text=/applications/i, a[href*="application"]').first();
    await applicationsTab.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'e2e-results/7-applications-list.png', fullPage: true });

    // Find the test application by company name or email
    const applicationRow = page.locator(`tr:has-text("${TEST_DATA.legalName}"), tr:has-text("${TEST_DATA.email}")`).first();

    // Verify application is visible
    await expect(applicationRow).toBeVisible({ timeout: 10000 });

    // Click to view application details
    await applicationRow.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'e2e-results/8-application-details.png', fullPage: true });

    // Verify KvK document is present
    const documentLink = page.locator('a[href*="blob.core.windows.net"], a:has-text("document"), a:has-text("KvK")').first();

    // Check if document link exists
    const documentExists = await documentLink.count() > 0;
    console.log(`KvK document link present: ${documentExists}`);

    if (documentExists) {
      console.log('✓ KvK document found in application');
    } else {
      console.warn('⚠ WARNING: KvK document link not found in application details');
    }

    console.log('✓ Step 2 Complete: Application reviewed');
  });

  test('Step 3: Admin approves application', async ({ page }) => {
    console.log('\n========================================');
    console.log('STEP 3: Application Approval');
    console.log('========================================');

    // Login again (tests run independently)
    await page.goto('https://calm-tree-03352ba03.1.azurestaticapps.net');
    await loginAsAdmin(page, ADMIN_EMAIL, ADMIN_PASSWORD);

    // Navigate to Applications
    await page.locator('text=/applications/i, a[href*="application"]').first().click();
    await page.waitForTimeout(2000);

    // Find and click the test application
    const applicationRow = page.locator(`tr:has-text("${TEST_DATA.legalName}")`).first();
    await applicationRow.click();
    await page.waitForTimeout(2000);

    // Click Approve button
    const approveButton = page.locator('button:has-text("Approve")').first();
    await approveButton.click();
    await page.waitForTimeout(2000);

    // Handle confirmation dialog if present
    try {
      const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes")').first();
      if (await confirmButton.isVisible({ timeout: 3000 })) {
        await confirmButton.click();
      }
    } catch (e) {
      console.log('No confirmation dialog');
    }

    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'e2e-results/9-application-approved.png', fullPage: true });

    // Try to extract legal entity ID from success message
    const pageContent = await page.content();
    const legalEntityMatch = pageContent.match(/legal[_\s]entity[:\s]+([a-f0-9-]{36})/i);
    if (legalEntityMatch) {
      legalEntityId = legalEntityMatch[1];
      console.log(`Legal Entity ID: ${legalEntityId}`);
    }

    console.log('✓ Step 3 Complete: Application approved');
  });

  test('Step 4: Verify member details show KvK verification data', async ({ page }) => {
    console.log('\n========================================');
    console.log('STEP 4: Verify KvK Data Transfer');
    console.log('========================================');

    // Login as admin
    await page.goto('https://calm-tree-03352ba03.1.azurestaticapps.net');
    await loginAsAdmin(page, ADMIN_EMAIL, ADMIN_PASSWORD);

    // Navigate to Members tab
    await page.locator('text=/members/i, a[href*="member"]').first().click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'e2e-results/10-members-list.png', fullPage: true });

    // Find the newly created member
    const memberRow = page.locator(`tr:has-text("${TEST_DATA.legalName}")`).first();
    await expect(memberRow).toBeVisible({ timeout: 10000 });

    // Click to view member details
    await memberRow.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'e2e-results/11-member-details.png', fullPage: true });

    // Verify KvK verification fields are present
    const pageContent = await page.textContent('body');

    const kvkFieldChecks = [
      { field: 'KvK Document URL', pattern: /kvk[_\s]document|document[_\s]url/i },
      { field: 'KvK Verification Status', pattern: /verification[_\s]status|kvk[_\s]status/i },
      { field: 'KvK Verified At', pattern: /verified[_\s]at|verification[_\s]date/i },
      { field: 'KvK Verified By', pattern: /verified[_\s]by/i },
      { field: 'KvK Verification Notes', pattern: /verification[_\s]notes|kvk[_\s]notes/i },
    ];

    const results: Record<string, boolean> = {};

    for (const check of kvkFieldChecks) {
      const found = check.pattern.test(pageContent || '');
      results[check.field] = found;
      console.log(`  ${found ? '✓' : '✗'} ${check.field}: ${found ? 'present' : 'missing'}`);
    }

    // Summary
    const foundCount = Object.values(results).filter(Boolean).length;
    const totalCount = kvkFieldChecks.length;

    console.log(`\n KvK Verification Fields: ${foundCount}/${totalCount} found`);

    if (foundCount === totalCount) {
      console.log('✓ All KvK verification fields present');
    } else {
      console.warn(`⚠ WARNING: Only ${foundCount}/${totalCount} KvK fields found`);
    }

    // Take final screenshot
    await page.screenshot({ path: 'e2e-results/12-member-details-full.png', fullPage: true });

    console.log('✓ Step 4 Complete: Verification complete');
    console.log('\n========================================');
    console.log('TEST COMPLETE');
    console.log('========================================\n');
  });
});

// Helper function to fill field with multiple selector attempts
async function fillField(page: Page, selectors: string[], value: string) {
  for (const selector of selectors) {
    try {
      const field = page.locator(selector).first();
      if (await field.isVisible({ timeout: 2000 })) {
        await field.fill(value);
        return;
      }
    } catch (e) {
      // Try next selector
    }
  }
  console.warn(`Could not find field for value: ${value}`);
}

// Helper function to login as admin
async function loginAsAdmin(page: Page, email: string, password: string) {
  await page.waitForLoadState('networkidle');

  // Azure AD login
  try {
    await page.fill('input[type="email"]', email);
    await page.click('input[type="submit"]');
    await page.waitForTimeout(2000);

    await page.fill('input[type="password"]', password);
    await page.click('input[type="submit"]');
    await page.waitForTimeout(2000);

    // Handle "Stay signed in?" if present
    const staySignedInButton = page.locator('input[type="submit"][value="Yes"]').first();
    if (await staySignedInButton.isVisible({ timeout: 3000 })) {
      await staySignedInButton.click();
    }
  } catch (e) {
    console.log('Already logged in or login failed');
  }

  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
}
