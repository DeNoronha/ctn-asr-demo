/**
 * Automated Width Measurement Script
 *
 * Measures widths across all screens in the deployed admin portal
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function measureDeployedWidths() {
  console.log('🔍 Starting automated width measurement on DEPLOYED application...\n');

  const browser = await chromium.launch({
    headless: false,
  });

  const authFile = path.join(__dirname, '..', 'playwright', '.auth', 'user.json');
  const context = await browser.newContext({
    storageState: authFile,
    viewport: { width: 1920, height: 1080 },
  });

  const page = await context.newPage();
  const measurements = [];

  async function measureScreen(screenName, url) {
    console.log(`\n📏 Measuring: ${screenName}`);
    console.log(`   URL: ${url}`);

    await page.goto(url);
    await page.waitForTimeout(3000); // Allow data to load

    const measurement = await page.evaluate(() => {
      const header = document.querySelector('.app-header > div');
      const contentFirst = document.querySelector('.content-area > *');
      const dataTable = document.querySelector('.mantine-DataTable-root');
      const gridContainer = document.querySelector('.members-grid-container');

      return {
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
          width: window.getComputedStyle(gridContainer).width,
        } : null,
      };
    });

    // Calculate consistency
    const headerWidth = measurement.header?.offsetWidth || 0;
    const contentWidth = measurement.contentArea?.offsetWidth || 0;
    const widthDiff = Math.abs(headerWidth - contentWidth);
    const isConsistent = widthDiff <= 10;

    const result = {
      screen: screenName,
      url,
      headerWidth,
      contentWidth,
      widthDiff,
      isConsistent,
      fullMeasurement: measurement,
    };

    measurements.push(result);

    console.log(`   Header Width: ${headerWidth}px (max-width: ${measurement.header?.maxWidth || 'N/A'})`);
    console.log(`   Content Width: ${contentWidth}px (max-width: ${measurement.contentArea?.maxWidth || 'N/A'})`);
    console.log(`   Difference: ${widthDiff}px`);
    console.log(`   Consistent: ${isConsistent ? '✅ YES' : '❌ NO'}`);

    if (measurement.gridContainer) {
      console.log(`   Grid Container: ${measurement.gridContainer.offsetWidth}px`);
    }
    if (measurement.dataTable) {
      console.log(`   DataTable: ${measurement.dataTable.offsetWidth}px`);
    }

    // Take screenshot
    const screenshotPath = path.join(__dirname, '..', 'e2e', 'screenshots', `deployed-${screenName.toLowerCase().replace(/\s+/g, '-')}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`   📸 Screenshot: ${screenshotPath}`);

    return result;
  }

  const baseUrl = 'https://admin-ctn-dev-gma8fnethbetbjgj.z02.azurefd.net';

  // Measure all screens
  await measureScreen('Dashboard', `${baseUrl}/`);
  await measureScreen('Members', `${baseUrl}/members`);
  await measureScreen('User Management', `${baseUrl}/user-management`);
  await measureScreen('Audit Logs', `${baseUrl}/audit`);
  await measureScreen('Health Status', `${baseUrl}/health`);
  await measureScreen('Tasks', `${baseUrl}/tasks`);
  await measureScreen('About', `${baseUrl}/about`);

  // Generate report
  console.log('\n\n═══════════════════════════════════════════════════════════════');
  console.log('              WIDTH CONSISTENCY INVESTIGATION REPORT');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const inconsistentScreens = measurements.filter(m => !m.isConsistent);
  console.log(`📊 Summary:`);
  console.log(`   Total screens: ${measurements.length}`);
  console.log(`   Consistent: ${measurements.length - inconsistentScreens.length}`);
  console.log(`   Inconsistent: ${inconsistentScreens.length}\n`);

  if (inconsistentScreens.length > 0) {
    console.log(`❌ INCONSISTENT SCREENS (difference > 10px):\n`);
    inconsistentScreens.forEach(m => {
      console.log(`   ${m.screen}:`);
      console.log(`      Header: ${m.headerWidth}px`);
      console.log(`      Content: ${m.contentWidth}px`);
      console.log(`      Difference: ${m.widthDiff}px`);
      console.log(`      Content class: ${m.fullMeasurement.contentArea?.className || 'N/A'}`);
      console.log('');
    });
  } else {
    console.log(`✅ All screens are consistent!`);
  }

  // Save full report
  const reportPath = path.join(__dirname, '..', 'e2e', 'width-measurements-deployed.json');
  fs.writeFileSync(reportPath, JSON.stringify({ measurements, summary: { total: measurements.length, inconsistent: inconsistentScreens.length } }, null, 2));
  console.log(`\n💾 Full report saved: ${reportPath}`);

  console.log('\n═══════════════════════════════════════════════════════════════\n');

  // Keep browser open for manual inspection
  console.log('⏸️  Browser will stay open for 30 seconds for manual inspection...');
  await page.waitForTimeout(30000);

  await browser.close();
  console.log('\n✅ Investigation complete!');
}

measureDeployedWidths().catch(console.error);
