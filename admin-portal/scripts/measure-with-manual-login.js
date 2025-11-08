/**
 * Width Measurement with Manual Login
 *
 * Opens browser, waits for manual login, then measures widths
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function measureWithManualLogin() {
  console.log('🔍 Starting width measurement with manual login...\n');

  const browser = await chromium.launch({
    headless: false,
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });

  const page = await context.newPage();
  const measurements = [];

  console.log('📱 Opening admin portal...');
  await page.goto('https://admin-ctn-dev-gma8fnethbetbjgj.z02.azurefd.net/');

  console.log('\n⏸️  Please login manually in the browser...');
  console.log('   Email: test-e2@denoronha.consulting');
  console.log('   Password: Madu5952');
  console.log('   (This account has NO MFA)\n');

  // Wait for dashboard to load (indicating successful login)
  console.log('⏳ Waiting for dashboard to load...');
  try {
    await page.waitForSelector('.app-header', { timeout: 120000 }); // 2 minutes
    console.log('✅ Dashboard loaded!\n');
  } catch (error) {
    console.error('❌ Timeout waiting for dashboard. Please check login.');
    await browser.close();
    return;
  }

  await page.waitForTimeout(3000); // Allow page to fully render

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
      const contentArea = document.querySelector('.content-area');

      return {
        header: header ? {
          offsetWidth: header.offsetWidth,
          scrollWidth: header.scrollWidth,
          clientWidth: header.clientWidth,
          maxWidth: window.getComputedStyle(header).maxWidth,
          margin: window.getComputedStyle(header).margin,
        } : null,
        contentArea: contentArea ? {
          offsetWidth: contentArea.offsetWidth,
          scrollWidth: contentArea.scrollWidth,
          padding: window.getComputedStyle(contentArea).padding,
        } : null,
        contentFirstChild: contentFirst ? {
          offsetWidth: contentFirst.offsetWidth,
          scrollWidth: contentFirst.scrollWidth,
          clientWidth: contentFirst.clientWidth,
          maxWidth: window.getComputedStyle(contentFirst).maxWidth,
          width: window.getComputedStyle(contentFirst).width,
          padding: window.getComputedStyle(contentFirst).padding,
          margin: window.getComputedStyle(contentFirst).margin,
          className: contentFirst.className,
        } : null,
        dataTable: dataTable ? {
          offsetWidth: dataTable.offsetWidth,
          scrollWidth: dataTable.scrollWidth,
          maxWidth: window.getComputedStyle(dataTable).maxWidth,
        } : null,
        gridContainer: gridContainer ? {
          offsetWidth: gridContainer.offsetWidth,
          scrollWidth: gridContainer.scrollWidth,
          maxWidth: window.getComputedStyle(gridContainer).maxWidth,
          width: window.getComputedStyle(gridContainer).width,
        } : null,
      };
    });

    // Calculate consistency
    const headerWidth = measurement.header?.offsetWidth || 0;
    const contentWidth = measurement.contentFirstChild?.offsetWidth || 0;
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
    console.log(`   Content Width: ${contentWidth}px (max-width: ${measurement.contentFirstChild?.maxWidth || 'N/A'})`);
    console.log(`   Difference: ${widthDiff}px`);
    console.log(`   Consistent: ${isConsistent ? '✅ YES' : '❌ NO'}`);

    if (measurement.gridContainer) {
      console.log(`   Grid Container: ${measurement.gridContainer.offsetWidth}px (scrollWidth: ${measurement.gridContainer.scrollWidth}px)`);
    }
    if (measurement.dataTable) {
      console.log(`   DataTable: ${measurement.dataTable.offsetWidth}px (scrollWidth: ${measurement.dataTable.scrollWidth}px)`);
    }
    if (measurement.contentFirstChild) {
      console.log(`   Content Class: ${measurement.contentFirstChild.className}`);
    }

    // Take screenshot
    const screenshotPath = path.join(__dirname, '..', 'e2e', 'screenshots', `manual-${screenName.toLowerCase().replace(/\s+/g, '-')}.png`);
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
      console.log(`      Content class: ${m.fullMeasurement.contentFirstChild?.className || 'N/A'}`);
      if (m.fullMeasurement.gridContainer) {
        console.log(`      Grid: ${m.fullMeasurement.gridContainer.offsetWidth}px (scroll: ${m.fullMeasurement.gridContainer.scrollWidth}px)`);
      }
      if (m.fullMeasurement.dataTable) {
        console.log(`      DataTable: ${m.fullMeasurement.dataTable.offsetWidth}px (scroll: ${m.fullMeasurement.dataTable.scrollWidth}px)`);
      }
      console.log('');
    });

    console.log('\n🔍 ROOT CAUSE ANALYSIS:');
    inconsistentScreens.forEach(m => {
      console.log(`\n   ${m.screen}:`);

      // Check if it's a scrollWidth issue (content overflowing)
      const contentScroll = m.fullMeasurement.contentFirstChild?.scrollWidth || 0;
      const contentOffset = m.fullMeasurement.contentFirstChild?.offsetWidth || 0;
      if (contentScroll > contentOffset) {
        console.log(`      ⚠️  Content is overflowing (scrollWidth: ${contentScroll}px > offsetWidth: ${contentOffset}px)`);
      }

      // Check grid/table widths
      if (m.fullMeasurement.gridContainer) {
        const gridScroll = m.fullMeasurement.gridContainer.scrollWidth;
        const gridOffset = m.fullMeasurement.gridContainer.offsetWidth;
        if (gridScroll > gridOffset) {
          console.log(`      ⚠️  Grid is overflowing (scrollWidth: ${gridScroll}px > offsetWidth: ${gridOffset}px)`);
        }
      }

      if (m.fullMeasurement.dataTable) {
        const tableScroll = m.fullMeasurement.dataTable.scrollWidth;
        const tableOffset = m.fullMeasurement.dataTable.offsetWidth;
        if (tableScroll > tableOffset) {
          console.log(`      ⚠️  DataTable is overflowing (scrollWidth: ${tableScroll}px > offsetWidth: ${tableOffset}px)`);
        }
      }

      // Check CSS max-width
      const maxWidth = m.fullMeasurement.contentFirstChild?.maxWidth;
      if (maxWidth && maxWidth !== '1600px') {
        console.log(`      ⚠️  Content max-width is NOT 1600px (actual: ${maxWidth})`);
      }
    });
  } else {
    console.log(`✅ All screens are consistent!`);
  }

  // Save full report
  const reportPath = path.join(__dirname, '..', 'e2e', 'width-measurements-manual.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    measurements,
    summary: {
      total: measurements.length,
      inconsistent: inconsistentScreens.length,
      timestamp: new Date().toISOString(),
    }
  }, null, 2));
  console.log(`\n💾 Full report saved: ${reportPath}`);

  console.log('\n═══════════════════════════════════════════════════════════════\n');

  // Keep browser open for manual inspection
  console.log('⏸️  Browser will stay open for 60 seconds for manual inspection...');
  console.log('   You can navigate to different screens and visually inspect the widths.\n');
  await page.waitForTimeout(60000);

  await browser.close();
  console.log('\n✅ Investigation complete!');
}

measureWithManualLogin().catch(console.error);
