/**
 * Manual Width Inspection Script
 *
 * Opens a browser with authentication and allows manual inspection
 * of widths across different screens.
 */

const { chromium } = require('playwright');
const path = require('path');

async function inspectWidths() {
  console.log('🔍 Starting manual width inspection...\n');

  // Launch browser with saved auth state
  const browser = await chromium.launch({
    headless: false,
    slowMo: 100,
  });

  const authFile = path.join(__dirname, '..', 'playwright', '.auth', 'user.json');
  const context = await browser.newContext({
    storageState: authFile,
    viewport: { width: 1920, height: 1080 },
  });

  const page = await context.newPage();

  // Navigate to admin portal
  console.log('📱 Opening admin portal...');
  await page.goto('https://admin-ctn-dev-gma8fnethbetbjgj.z02.azurefd.net/');
  await page.waitForTimeout(3000);

  // Inject width measurement script
  await page.addScriptTag({
    content: `
      window.measureWidths = function() {
        const header = document.querySelector('.app-header > div');
        const contentFirst = document.querySelector('.content-area > *');
        const dataTable = document.querySelector('.mantine-DataTable-root');
        const gridContainer = document.querySelector('.members-grid-container');

        const results = {
          header: header ? {
            offsetWidth: header.offsetWidth,
            maxWidth: window.getComputedStyle(header).maxWidth,
            margin: window.getComputedStyle(header).margin,
          } : null,
          contentArea: contentFirst ? {
            offsetWidth: contentFirst.offsetWidth,
            maxWidth: window.getComputedStyle(contentFirst).maxWidth,
            width: window.getComputedStyle(contentFirst).width,
            padding: window.getComputedStyle(contentFirst).padding,
            className: contentFirst.className,
          } : null,
          dataTable: dataTable ? {
            offsetWidth: dataTable.offsetWidth,
            maxWidth: window.getComputedStyle(dataTable).maxWidth,
          } : null,
          gridContainer: gridContainer ? {
            offsetWidth: gridContainer.offsetWidth,
            maxWidth: window.getComputedStyle(gridContainer).maxWidth,
          } : null,
        };

        console.log('=== WIDTH MEASUREMENTS ===');
        console.log(JSON.stringify(results, null, 2));
        console.log('===========================');

        // Visual highlight
        if (header) {
          header.style.outline = '3px solid red';
          header.style.outlineOffset = '-3px';
        }
        if (contentFirst) {
          contentFirst.style.outline = '3px solid blue';
          contentFirst.style.outlineOffset = '-3px';
        }

        return results;
      };

      // Add button to trigger measurement
      const button = document.createElement('button');
      button.textContent = '📏 Measure Widths';
      button.style.cssText = 'position: fixed; top: 10px; right: 10px; z-index: 10000; padding: 12px 20px; background: #ff8c00; color: white; border: none; border-radius: 6px; font-size: 14px; font-weight: bold; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.2);';
      button.onclick = window.measureWidths;
      document.body.appendChild(button);
    `,
  });

  console.log('\n✅ Browser opened with width measurement tools!');
  console.log('\n📋 Instructions:');
  console.log('   1. Navigate to different screens (Dashboard, Members, User Management, etc.)');
  console.log('   2. Click the "📏 Measure Widths" button (top-right corner)');
  console.log('   3. Check the browser console for measurements');
  console.log('   4. Header will be outlined in RED, content in BLUE');
  console.log('   5. Compare the widths - they should match (1600px max)');
  console.log('\n⏸️  Script will wait for you to finish inspection...');
  console.log('   Press Ctrl+C when done.\n');

  // Keep the browser open
  await page.waitForTimeout(300000); // 5 minutes
}

inspectWidths().catch(console.error);
