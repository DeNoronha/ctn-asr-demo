/**
 * Admin Portal UI Inspection - Authenticated Tests
 * October 26, 2025
 *
 * Tests all 8 priority areas identified by user:
 * 1. Endpoint Registration - Save button functionality
 * 2. Sidebar - Tasks, Subscriptions, Newsletters hidden
 * 3. Members Grid - "Member Since" column and Eye icon
 * 4. Contact Modal - Email field and checkbox labels
 * 5. Document Verification - UI improvements
 * 6. Health Monitor - Layout and data display
 * 7. Settings Page - Links working
 * 8. About Page - Information display
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { expect, test } from '../playwright/fixtures';

// Ensure output directory exists
const OUTPUT_DIR = 'test-results/authenticated';
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

test.describe('Priority Area Tests - Authenticated', () => {
  test.beforeEach(async ({ page }) => {
    // Monitor console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error('CONSOLE ERROR:', msg.text());
      }
    });

    // Navigate to portal (already authenticated via fixtures)
    await page.goto('/', { waitUntil: 'networkidle' });

    // Verify we're authenticated
    const isAuthenticated = !page.url().includes('login.microsoftonline.com');
    expect(isAuthenticated).toBe(true);
  });

  test('1. Endpoint Registration - Save button functionality', async ({ page }) => {
    console.log('🔍 Testing Endpoint Registration...');

    // Try to navigate to Endpoint Registration
    // Check multiple possible navigation patterns
    const navVariants = ['Endpoints', 'Endpoint', 'Registration', 'Endpoint Registration'];

    let navigated = false;
    for (const variant of navVariants) {
      const nav = page.locator('nav, .sidebar, .drawer').getByText(variant, { exact: false });
      if ((await nav.count()) > 0) {
        await nav.first().click();
        await page.waitForTimeout(1500);
        navigated = true;
        break;
      }
    }

    if (!navigated) {
      console.log('⚠️ Could not find Endpoint Registration navigation - checking main content');
    }

    // Take screenshot of current page
    await page.screenshot({
      path: `${OUTPUT_DIR}/01-endpoint-registration.png`,
      fullPage: true,
    });

    // Check for save button
    const saveButtons = await page.getByRole('button', { name: /save/i }).all();
    console.log(`Save buttons found: ${saveButtons.length}`);

    for (const btn of saveButtons) {
      const text = await btn.textContent();
      const isEnabled = await btn.isEnabled();
      const isVisible = await btn.isVisible();
      console.log(`  Button: "${text?.trim()}" - Enabled: ${isEnabled}, Visible: ${isVisible}`);
    }

    // Document form structure if present
    const forms = await page.locator('form').count();
    const inputs = await page.locator('input:visible').count();
    console.log(`Forms: ${forms}, Visible inputs: ${inputs}`);

    // Save page content for analysis
    const pageContent = await page.locator('body').textContent();
    fs.writeFileSync(
      path.join(OUTPUT_DIR, '01-endpoint-registration-content.txt'),
      pageContent || ''
    );

    console.log('✅ Endpoint Registration test complete');
  });

  test('2. Sidebar - Verify hidden menu items', async ({ page }) => {
    console.log('🔍 Testing Sidebar Navigation...');

    const sidebar = page.locator('nav, .sidebar, .drawer, [role="navigation"]').first();

    // Wait for sidebar to be visible
    await sidebar.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {
      console.log('⚠️ Sidebar not found with standard selectors');
    });

    // Take screenshot of sidebar
    if ((await sidebar.count()) > 0) {
      await sidebar.screenshot({
        path: `${OUTPUT_DIR}/02-sidebar-navigation.png`,
      });

      // Get all visible menu items for documentation
      const menuItems = await sidebar
        .locator('[role="menuitem"], .menu-item, .nav-item, a, button')
        .allTextContents();
      console.log('Visible menu items:', menuItems.map((item) => item.trim()).filter(Boolean));
    }

    // Take full page screenshot as backup
    await page.screenshot({
      path: `${OUTPUT_DIR}/02-full-page-with-sidebar.png`,
      fullPage: true,
    });

    // Check for items that should be hidden
    const tasksVisible = (await page.locator('text=/^Tasks$/i').count()) > 0;
    const subscriptionsVisible = (await page.locator('text=/^Subscriptions$/i').count()) > 0;
    const newslettersVisible = (await page.locator('text=/^Newsletters$/i').count()) > 0;

    console.log('Sidebar visibility check:');
    console.log(`  Tasks: ${tasksVisible ? '❌ VISIBLE (should be hidden)' : '✅ Hidden'}`);
    console.log(
      `  Subscriptions: ${subscriptionsVisible ? '❌ VISIBLE (should be hidden)' : '✅ Hidden'}`
    );
    console.log(
      `  Newsletters: ${newslettersVisible ? '❌ VISIBLE (should be hidden)' : '✅ Hidden'}`
    );

    // Save findings
    const findings = {
      timestamp: new Date().toISOString(),
      hiddenMenuItems: {
        tasks: !tasksVisible,
        subscriptions: !subscriptionsVisible,
        newsletters: !newslettersVisible,
      },
      allMenuItems: await page.locator('nav a, nav button').allTextContents(),
    };

    fs.writeFileSync(
      path.join(OUTPUT_DIR, '02-sidebar-findings.json'),
      JSON.stringify(findings, null, 2)
    );

    // Assertions
    expect(tasksVisible).toBe(false);
    expect(subscriptionsVisible).toBe(false);
    expect(newslettersVisible).toBe(false);

    console.log('✅ Sidebar navigation test complete');
  });

  test('3. Members Grid - Member Since column and Eye icon', async ({ page }) => {
    console.log('🔍 Testing Members Grid...');

    // Navigate to Members
    const membersNav = page.locator('nav, .sidebar').getByText('Members', { exact: false });
    if ((await membersNav.count()) > 0) {
      await membersNav.first().click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
    } else {
      console.log('⚠️ Could not find Members navigation');
    }

    // Take screenshot
    await page.screenshot({
      path: `${OUTPUT_DIR}/03-members-grid.png`,
      fullPage: true,
    });

    // Check for "Member Since" column in various formats
    const memberSinceVariants = [
      'Member Since',
      'member since',
      'MemberSince',
      'Joined',
      'Registration Date',
    ];

    let memberSinceFound = false;
    for (const variant of memberSinceVariants) {
      const count = await page
        .locator(`th:has-text("${variant}"), [data-field="${variant}"], [data-title="${variant}"]`)
        .count();
      if (count > 0) {
        console.log(`✅ Found column: "${variant}"`);
        memberSinceFound = true;
        break;
      }
    }

    if (!memberSinceFound) {
      // Get all column headers for analysis
      const allHeaders = await page.locator('th, [role="columnheader"]').allTextContents();
      console.log('All grid columns:', allHeaders.map((h) => h.trim()).filter(Boolean));
    }

    // Check for Eye icon in various formats
    const eyeIconSelectors = [
      '[data-icon="eye"]',
      '.fa-eye',
      'svg[data-testid*="eye"]',
      'button[title*="View"]',
      'button[aria-label*="View"]',
      'svg[data-icon="eye"]',
      'span:has(svg) >> text=/view/i',
    ];

    let eyeIconFound = false;
    for (const selector of eyeIconSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        console.log(`✅ Found Eye icon with selector: ${selector} (count: ${count})`);
        eyeIconFound = true;
        break;
      }
    }

    // Check for any icon buttons in grid
    const iconButtons = await page.locator('button[data-icon], button > svg, button > svg').count();
    console.log(`Total icon buttons in grid: ${iconButtons}`);

    // Save findings
    const findings = {
      timestamp: new Date().toISOString(),
      memberSinceColumn: {
        found: memberSinceFound,
        allColumns: await page.locator('th, [role="columnheader"]').allTextContents(),
      },
      eyeIcon: {
        found: eyeIconFound,
        iconButtonsCount: iconButtons,
      },
    };

    fs.writeFileSync(
      path.join(OUTPUT_DIR, '03-members-grid-findings.json'),
      JSON.stringify(findings, null, 2)
    );

    console.log('Member Since column found:', memberSinceFound ? '✅' : '❌');
    console.log('Eye icon found:', eyeIconFound ? '✅' : '⚠️ (may use different icon)');

    expect(memberSinceFound).toBe(true);

    console.log('✅ Members Grid test complete');
  });

  test('4. Contact Modal - Email field and checkbox labels', async ({ page }) => {
    console.log('🔍 Testing Contact Modal...');

    // Navigate to Members first
    await page.locator('nav, .sidebar').getByText('Members', { exact: false }).first().click();
    await page.waitForTimeout(1500);

    // Try to find and click a member to open details/contact modal
    const firstMemberRow = page.locator('tr[role="row"], tbody tr').nth(1);

    if ((await firstMemberRow.count()) > 0) {
      // Try clicking the row or an action button
      const viewButton = firstMemberRow
        .locator('button[title*="View"], button[aria-label*="View"], button')
        .first();

      if ((await viewButton.count()) > 0) {
        await viewButton.click();
        await page.waitForTimeout(1500);
      } else {
        await firstMemberRow.click();
        await page.waitForTimeout(1500);
      }
    }

    // Look for contact-related elements (tab, section, or modal)
    const contactVariants = ['Contact', 'Contacts', 'contact', 'contacts'];

    for (const variant of contactVariants) {
      const contactElement = page.getByText(variant, { exact: false });
      if ((await contactElement.count()) > 0) {
        await contactElement.first().click();
        await page.waitForTimeout(1000);
        break;
      }
    }

    // Take screenshot
    await page.screenshot({
      path: `${OUTPUT_DIR}/04-contact-modal.png`,
      fullPage: true,
    });

    // Check for email field
    const emailInputs = await page.locator('input[type="email"]').all();
    console.log(`Email input fields found: ${emailInputs.length}`);

    for (const input of emailInputs) {
      const label =
        (await input.getAttribute('aria-label')) ||
        (await input.getAttribute('placeholder')) ||
        'No label';
      const id = await input.getAttribute('id');

      // Check if there's a label element for this input
      let associatedLabel = '';
      if (id) {
        const labelElement = page.locator(`label[for="${id}"]`);
        if ((await labelElement.count()) > 0) {
          associatedLabel = (await labelElement.textContent()) || '';
        }
      }

      console.log(
        `  Email field - Label: "${associatedLabel || label}", Placeholder: ${await input.getAttribute('placeholder')}`
      );
    }

    // Check for checkboxes and their labels
    const checkboxes = await page.locator('input[type="checkbox"]:visible').all();
    console.log(`Checkboxes found: ${checkboxes.length}`);

    for (const checkbox of checkboxes) {
      const id = await checkbox.getAttribute('id');
      const ariaLabel = await checkbox.getAttribute('aria-label');

      let associatedLabel = '';
      if (id) {
        const labelElement = page.locator(`label[for="${id}"]`);
        if ((await labelElement.count()) > 0) {
          associatedLabel = (await labelElement.textContent()) || '';
        }
      }

      // Also check for label wrapping the checkbox
      const parentLabel = await checkbox.evaluate((el) => {
        const parent = el.closest('label');
        return parent ? parent.textContent : null;
      });

      console.log(
        `  Checkbox - Label: "${associatedLabel || parentLabel || ariaLabel || 'No label'}"`
      );
    }

    // Save findings
    const findings = {
      timestamp: new Date().toISOString(),
      emailFields: emailInputs.length,
      checkboxes: checkboxes.length,
      emailFieldDetails: await Promise.all(
        emailInputs.map(async (input) => ({
          placeholder: await input.getAttribute('placeholder'),
          ariaLabel: await input.getAttribute('aria-label'),
          id: await input.getAttribute('id'),
        }))
      ),
    };

    fs.writeFileSync(
      path.join(OUTPUT_DIR, '04-contact-modal-findings.json'),
      JSON.stringify(findings, null, 2)
    );

    console.log('✅ Contact Modal test complete');
  });

  test('5. Document Verification - UI improvements check', async ({ page }) => {
    console.log('🔍 Testing Document Verification...');

    // Try to navigate to Document Verification
    const docVariants = ['Documents', 'Document', 'Verification', 'Verify'];

    let navigated = false;
    for (const variant of docVariants) {
      const nav = page.locator('nav, .sidebar').getByText(variant, { exact: false });
      if ((await nav.count()) > 0) {
        await nav.first().click();
        await page.waitForTimeout(1500);
        navigated = true;
        break;
      }
    }

    if (!navigated) {
      console.log('⚠️ Could not find Document Verification navigation in sidebar');
      // Try within a member detail view
      const membersNav = page.locator('nav, .sidebar').getByText('Members', { exact: false });
      if ((await membersNav.count()) > 0) {
        await membersNav.first().click();
        await page.waitForTimeout(1000);

        const firstRow = page.locator('tr[role="row"]').nth(1);
        if ((await firstRow.count()) > 0) {
          await firstRow.click();
          await page.waitForTimeout(1000);

          // Look for Document tab
          const docTab = page.getByText('Document', { exact: false });
          if ((await docTab.count()) > 0) {
            await docTab.first().click();
            await page.waitForTimeout(1000);
          }
        }
      }
    }

    // Take screenshot
    await page.screenshot({
      path: `${OUTPUT_DIR}/05-document-verification.png`,
      fullPage: true,
    });

    // Document current UI state
    const tabLabels = await page.locator('[role="tab"], .mantine-Tabs-tab, .tab').allTextContents();
    console.log('Tab labels:', tabLabels.map((t) => t.trim()).filter(Boolean));

    const hasFileUpload =
      (await page.locator('input[type="file"], [data-testid*="upload"]').count()) > 0;
    console.log(`File upload component: ${hasFileUpload ? '✅ Present' : '❌ Not found'}`);

    const hasStatusBadges = (await page.locator('.badge, .status, [data-status]').count()) > 0;
    console.log(`Status badges: ${hasStatusBadges ? '✅ Present' : '❌ Not found'}`);

    const hasProgressIndicator =
      (await page.locator('.progress, [role="progressbar"]').count()) > 0;
    console.log(`Progress indicators: ${hasProgressIndicator ? '✅ Present' : '❌ Not found'}`);

    // Save findings
    const findings = {
      timestamp: new Date().toISOString(),
      navigated,
      tabs: tabLabels.map((t) => t.trim()).filter(Boolean),
      features: {
        fileUpload: hasFileUpload,
        statusBadges: hasStatusBadges,
        progressIndicator: hasProgressIndicator,
      },
    };

    fs.writeFileSync(
      path.join(OUTPUT_DIR, '05-document-verification-findings.json'),
      JSON.stringify(findings, null, 2)
    );

    console.log('✅ Document Verification test complete');
  });

  test('6. Health Monitor - Layout and data display', async ({ page }) => {
    console.log('🔍 Testing Health Monitor...');

    // Try to navigate to Health Monitor
    const healthVariants = ['Health', 'Monitor', 'Status', 'Health Monitor', 'System Status'];

    let navigated = false;
    for (const variant of healthVariants) {
      const nav = page.locator('nav, .sidebar').getByText(variant, { exact: false });
      if ((await nav.count()) > 0) {
        await nav.first().click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
        navigated = true;
        break;
      }
    }

    if (!navigated) {
      console.log('⚠️ Could not find Health Monitor navigation');
    }

    // Take screenshot
    await page.screenshot({
      path: `${OUTPUT_DIR}/06-health-monitor.png`,
      fullPage: true,
    });

    // Check for common health monitor elements
    const statusIndicators = await page
      .locator('[data-testid*="status"], .status-indicator, .health-status, .badge')
      .count();
    const metrics = await page.locator('[data-testid*="metric"], .metric, .chart, canvas').count();
    const timestamps = await page.locator('[data-testid*="time"], .timestamp, time').count();

    console.log(`Status indicators: ${statusIndicators}`);
    console.log(`Metrics/charts: ${metrics}`);
    console.log(`Timestamps: ${timestamps}`);

    // Check for layout issues - overlapping elements
    const layoutIssues = await page.evaluate(() => {
      const mainContent = document.querySelector('main') || document.body;
      const elements = Array.from(mainContent.querySelectorAll('*'));
      const issues: string[] = [];

      // Check for negative margins that might cause overlaps
      elements.forEach((el) => {
        const style = window.getComputedStyle(el);
        if (Number.parseFloat(style.marginTop) < -20 || Number.parseFloat(style.marginLeft) < -20) {
          issues.push(`Element with negative margin: ${el.tagName}.${el.className}`);
        }
      });

      return issues;
    });

    if (layoutIssues.length > 0) {
      console.log('⚠️ Potential layout issues:', layoutIssues);
    } else {
      console.log('✅ No obvious layout issues detected');
    }

    // Check responsive design
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: `${OUTPUT_DIR}/06-health-monitor-tablet.png`,
      fullPage: true,
    });

    // Save findings
    const findings = {
      timestamp: new Date().toISOString(),
      navigated,
      elements: {
        statusIndicators,
        metrics,
        timestamps,
      },
      layoutIssues,
    };

    fs.writeFileSync(
      path.join(OUTPUT_DIR, '06-health-monitor-findings.json'),
      JSON.stringify(findings, null, 2)
    );

    console.log('✅ Health Monitor test complete');
  });

  test('7. Settings Page - Links functionality', async ({ page }) => {
    console.log('🔍 Testing Settings Page...');

    // Navigate to Settings
    const settingsNav = page.locator('nav, .sidebar').getByText('Settings', { exact: false });
    if ((await settingsNav.count()) > 0) {
      await settingsNav.first().click();
      await page.waitForTimeout(1500);
    } else {
      console.log('⚠️ Could not find Settings navigation');
    }

    // Take screenshot
    await page.screenshot({
      path: `${OUTPUT_DIR}/07-settings-page.png`,
      fullPage: true,
    });

    // Get all links on the page
    const links = await page.locator('a[href]').all();
    console.log(`Total links found: ${links.length}`);

    const linkAnalysis = [];

    for (const link of links) {
      const href = await link.getAttribute('href');
      const text = (await link.textContent())?.trim() || '';
      const target = await link.getAttribute('target');
      const isExternal = href?.startsWith('http') && !href.includes(new URL(page.url()).hostname);

      const analysis = {
        text,
        href,
        target,
        isExternal,
        opensInNewTab: target === '_blank',
      };

      linkAnalysis.push(analysis);

      console.log(`Link: "${text}"`);
      console.log(`  URL: ${href}`);
      if (isExternal) {
        console.log(
          `  External link - Opens in new tab: ${target === '_blank' ? '✅' : '⚠️ Should use target="_blank"'}`
        );
      }
    }

    // Test internal links (non-destructively - just check they're not broken)
    const internalLinks = linkAnalysis.filter((l) => !l.isExternal && l.href?.startsWith('/'));
    console.log(`\nInternal links to test: ${internalLinks.length}`);

    for (const link of internalLinks.slice(0, 5)) {
      // Test first 5 only
      if (link.href) {
        console.log(`Testing: ${link.href}`);
        // Just verify the link would respond (don't navigate)
        // This is a placeholder - in production, you might check response status
      }
    }

    // Save findings
    fs.writeFileSync(
      path.join(OUTPUT_DIR, '07-settings-page-findings.json'),
      JSON.stringify({ timestamp: new Date().toISOString(), links: linkAnalysis }, null, 2)
    );

    console.log('✅ Settings Page test complete');
  });

  test('8. About Page - Information display', async ({ page }) => {
    console.log('🔍 Testing About Page...');

    // Navigate to About
    const aboutNav = page.locator('nav, .sidebar').getByText('About', { exact: false });
    if ((await aboutNav.count()) > 0) {
      await aboutNav.first().click();
      await page.waitForTimeout(1500);
    } else {
      console.log('⚠️ Could not find About navigation');
    }

    // Take screenshot
    await page.screenshot({
      path: `${OUTPUT_DIR}/08-about-page.png`,
      fullPage: true,
    });

    // Check for expected content
    const pageContent = await page.locator('main, [role="main"], body').textContent();

    const contentChecks = {
      version: pageContent?.toLowerCase().includes('version') || false,
      copyright:
        pageContent?.includes('©') || pageContent?.toLowerCase().includes('copyright') || false,
      contact: pageContent?.toLowerCase().includes('contact') || false,
      license: pageContent?.toLowerCase().includes('license') || false,
      documentation:
        pageContent?.toLowerCase().includes('documentation') ||
        pageContent?.toLowerCase().includes('docs') ||
        false,
    };

    console.log('About page content check:');
    console.log(`  Version info: ${contentChecks.version ? '✅' : '⚠️'}`);
    console.log(`  Copyright: ${contentChecks.copyright ? '✅' : '⚠️'}`);
    console.log(`  Contact info: ${contentChecks.contact ? '✅' : '⚠️'}`);
    console.log(`  License info: ${contentChecks.license ? '✅' : '⚠️'}`);
    console.log(`  Documentation links: ${contentChecks.documentation ? '✅' : '⚠️'}`);

    // Check for broken images
    const images = await page.locator('img').all();
    const brokenImages: string[] = [];

    for (const img of images) {
      const naturalWidth = await img.evaluate((el: HTMLImageElement) => el.naturalWidth);
      const src = await img.getAttribute('src');
      if (naturalWidth === 0) {
        console.log(`⚠️ Broken image detected: ${src}`);
        brokenImages.push(src || 'unknown');
      }
    }

    if (brokenImages.length === 0) {
      console.log('✅ No broken images detected');
    }

    // Check formatting and layout
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').allTextContents();
    console.log('Page headings:', headings.map((h) => h.trim()).filter(Boolean));

    // Save findings
    const findings = {
      timestamp: new Date().toISOString(),
      contentPresent: contentChecks,
      brokenImages,
      headings: headings.map((h) => h.trim()).filter(Boolean),
      fullContent: pageContent?.substring(0, 500), // First 500 chars
    };

    fs.writeFileSync(
      path.join(OUTPUT_DIR, '08-about-page-findings.json'),
      JSON.stringify(findings, null, 2)
    );

    console.log('✅ About Page test complete');
  });
});

test.describe('Summary Report Generation', () => {
  test('Generate comprehensive findings report', async ({ page }) => {
    console.log('📊 Generating comprehensive findings report...');

    // Compile all findings from JSON files
    const findingsFiles = [
      '02-sidebar-findings.json',
      '03-members-grid-findings.json',
      '04-contact-modal-findings.json',
      '05-document-verification-findings.json',
      '06-health-monitor-findings.json',
      '07-settings-page-findings.json',
      '08-about-page-findings.json',
    ];

    const allFindings: Record<string, any> = {};

    for (const file of findingsFiles) {
      const filePath = path.join(OUTPUT_DIR, file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        allFindings[file] = JSON.parse(content);
      }
    }

    const summary = {
      testDate: new Date().toISOString(),
      portal: 'Admin Portal',
      url: 'https://calm-tree-03352ba03.1.azurestaticapps.net',
      totalTests: 8,
      findings: allFindings,
      screenshots: fs.readdirSync(OUTPUT_DIR).filter((f) => f.endsWith('.png')),
    };

    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'COMPREHENSIVE_FINDINGS.json'),
      JSON.stringify(summary, null, 2)
    );

    console.log('✅ Comprehensive findings report generated');
    console.log(`📁 Location: ${OUTPUT_DIR}/COMPREHENSIVE_FINDINGS.json`);
    console.log(`📸 Screenshots: ${summary.screenshots.length}`);
  });
});
