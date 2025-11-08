import { test, expect } from '@playwright/test';

/**
 * Width Consistency Investigation Test
 *
 * Purpose: Systematically measure and compare widths across ALL admin portal screens
 * to identify why content is not respecting the 1600px max-width constraint.
 *
 * Test User: test-e2@denoronha.consulting / Madu5952 (SystemAdmin, MFA excluded)
 */

interface WidthMeasurement {
  screen: string;
  headerWidth: number;
  contentWidth: number;
  tableWidth: number | null;
  gridWidth: number | null;
  computedMaxWidth: string;
  headerComputedMaxWidth: string;
  isConsistent: boolean;
  widthDifference: number;
  problematicElement: string | null;
}

test.describe('Admin Portal Width Consistency Investigation', () => {
  test.use({ storageState: 'playwright/.auth/user.json' });

  let measurements: WidthMeasurement[] = [];

  /**
   * Helper function to measure widths on any screen
   */
  async function measureScreenWidths(page: any, screenName: string, waitForSelector?: string): Promise<WidthMeasurement> {
    // Wait for page to stabilize
    if (waitForSelector) {
      await page.waitForSelector(waitForSelector, { timeout: 15000 }).catch(() => {
        console.log(`Warning: ${waitForSelector} not found, continuing anyway...`);
      });
    }
    await page.waitForTimeout(2000); // Allow CSS to settle and data to load

    // Measure header width (direct child div of .app-header)
    const headerExists = await page.locator('.app-header > div').count() > 0;
    const headerWidth = headerExists
      ? await page.locator('.app-header > div').first().evaluate((el: HTMLElement) => el.offsetWidth)
      : 0;
    const headerComputedMaxWidth = headerExists
      ? await page.locator('.app-header > div').first().evaluate((el: HTMLElement) =>
        window.getComputedStyle(el).maxWidth
      )
      : 'none';

    // Measure main content area width (first child of content-area)
    const contentExists = await page.locator('.content-area > *').count() > 0;
    const contentWidth = contentExists
      ? await page.locator('.content-area > *').first().evaluate((el: HTMLElement) => el.offsetWidth)
      : 0;
    const computedMaxWidth = contentExists
      ? await page.locator('.content-area > *').first().evaluate((el: HTMLElement) =>
        window.getComputedStyle(el).maxWidth
      )
      : 'none';

    // Check for DataTable
    let tableWidth: number | null = null;
    const tableExists = await page.locator('.mantine-DataTable-root').count() > 0;
    if (tableExists) {
      tableWidth = await page.locator('.mantine-DataTable-root').first().evaluate((el: HTMLElement) => el.offsetWidth);
    }

    // Check for MembersGrid container
    let gridWidth: number | null = null;
    const gridExists = await page.locator('.members-grid-container').count() > 0;
    if (gridExists) {
      gridWidth = await page.locator('.members-grid-container').first().evaluate((el: HTMLElement) => el.offsetWidth);
    }

    // Determine problematic element
    let problematicElement: string | null = null;
    const widthDifference = Math.abs(headerWidth - contentWidth);

    if (widthDifference > 10) { // Allow 10px tolerance
      if (tableWidth && tableWidth > 1610) {
        problematicElement = '.mantine-DataTable-root';
      } else if (gridWidth && gridWidth > 1610) {
        problematicElement = '.members-grid-container';
      } else if (contentWidth > 1610) {
        problematicElement = '.content-area > * (first child)';
      }
    }

    const measurement: WidthMeasurement = {
      screen: screenName,
      headerWidth,
      contentWidth,
      tableWidth,
      gridWidth,
      computedMaxWidth,
      headerComputedMaxWidth,
      isConsistent: widthDifference <= 10, // 10px tolerance
      widthDifference,
      problematicElement,
    };

    measurements.push(measurement);
    return measurement;
  }

  test('should measure width consistency across all screens', async ({ page }) => {
    // Navigate to admin portal
    await page.goto('https://admin-ctn-dev-gma8fnethbetbjgj.z02.azurefd.net');
    await page.waitForLoadState('networkidle');

    // 1. Dashboard
    console.log('\n=== Measuring Dashboard ===');
    await page.goto('https://admin-ctn-dev-gma8fnethbetbjgj.z02.azurefd.net/');
    const dashboardMeasurement = await measureScreenWidths(page, 'Dashboard', '.content-area');
    await page.screenshot({ path: 'admin-portal/e2e/screenshots/width-dashboard.png', fullPage: true });
    console.log('Dashboard:', JSON.stringify(dashboardMeasurement, null, 2));

    // 2. Members (Grid view)
    console.log('\n=== Measuring Members (Grid) ===');
    await page.goto('https://admin-ctn-dev-gma8fnethbetbjgj.z02.azurefd.net/members');
    await page.waitForTimeout(2000); // Wait for data load
    const membersGridMeasurement = await measureScreenWidths(page, 'Members (Grid)', '.members-grid');
    await page.screenshot({ path: 'admin-portal/e2e/screenshots/width-members-grid.png', fullPage: true });
    console.log('Members (Grid):', JSON.stringify(membersGridMeasurement, null, 2));

    // 3. Members (Table view) - switch to table view
    console.log('\n=== Measuring Members (Table) ===');
    const tableViewButton = page.getByRole('button', { name: /table view/i });
    if (await tableViewButton.count() > 0) {
      await tableViewButton.click();
      await page.waitForTimeout(1000);
      const membersTableMeasurement = await measureScreenWidths(page, 'Members (Table)', '.mantine-DataTable-root');
      await page.screenshot({ path: 'admin-portal/e2e/screenshots/width-members-table.png', fullPage: true });
      console.log('Members (Table):', JSON.stringify(membersTableMeasurement, null, 2));
    }

    // 4. User Management
    console.log('\n=== Measuring User Management ===');
    await page.goto('https://admin-ctn-dev-gma8fnethbetbjgj.z02.azurefd.net/user-management');
    await page.waitForTimeout(2000);
    const userMgmtMeasurement = await measureScreenWidths(page, 'User Management', '.mantine-DataTable-root');
    await page.screenshot({ path: 'admin-portal/e2e/screenshots/width-user-management.png', fullPage: true });
    console.log('User Management:', JSON.stringify(userMgmtMeasurement, null, 2));

    // 5. Audit Logs
    console.log('\n=== Measuring Audit Logs ===');
    await page.goto('https://admin-ctn-dev-gma8fnethbetbjgj.z02.azurefd.net/audit');
    await page.waitForTimeout(2000);
    const auditMeasurement = await measureScreenWidths(page, 'Audit Logs', '.mantine-DataTable-root');
    await page.screenshot({ path: 'admin-portal/e2e/screenshots/width-audit.png', fullPage: true });
    console.log('Audit Logs:', JSON.stringify(auditMeasurement, null, 2));

    // 6. Health Status
    console.log('\n=== Measuring Health Status ===');
    await page.goto('https://admin-ctn-dev-gma8fnethbetbjgj.z02.azurefd.net/health');
    await page.waitForTimeout(1000);
    const healthMeasurement = await measureScreenWidths(page, 'Health Status', '.content-area');
    await page.screenshot({ path: 'admin-portal/e2e/screenshots/width-health.png', fullPage: true });
    console.log('Health Status:', JSON.stringify(healthMeasurement, null, 2));

    // 7. Tasks
    console.log('\n=== Measuring Tasks ===');
    await page.goto('https://admin-ctn-dev-gma8fnethbetbjgj.z02.azurefd.net/tasks');
    await page.waitForTimeout(1000);
    const tasksMeasurement = await measureScreenWidths(page, 'Tasks', '.content-area');
    await page.screenshot({ path: 'admin-portal/e2e/screenshots/width-tasks.png', fullPage: true });
    console.log('Tasks:', JSON.stringify(tasksMeasurement, null, 2));

    // 8. About
    console.log('\n=== Measuring About ===');
    await page.goto('https://admin-ctn-dev-gma8fnethbetbjgj.z02.azurefd.net/about');
    await page.waitForTimeout(1000);
    const aboutMeasurement = await measureScreenWidths(page, 'About', '.content-area');
    await page.screenshot({ path: 'admin-portal/e2e/screenshots/width-about.png', fullPage: true });
    console.log('About:', JSON.stringify(aboutMeasurement, null, 2));

    // Generate detailed report
    console.log('\n\n=================================================================');
    console.log('WIDTH CONSISTENCY INVESTIGATION REPORT');
    console.log('=================================================================\n');

    console.log('SUMMARY:');
    console.log(`Total screens tested: ${measurements.length}`);
    const inconsistentScreens = measurements.filter(m => !m.isConsistent);
    console.log(`Inconsistent screens: ${inconsistentScreens.length}`);
    console.log(`Consistent screens: ${measurements.length - inconsistentScreens.length}\n`);

    console.log('DETAILED MEASUREMENTS:\n');
    measurements.forEach(m => {
      console.log(`${m.screen}:`);
      console.log(`  Header Width: ${m.headerWidth}px (max-width: ${m.headerComputedMaxWidth})`);
      console.log(`  Content Width: ${m.contentWidth}px (max-width: ${m.computedMaxWidth})`);
      if (m.tableWidth !== null) {
        console.log(`  DataTable Width: ${m.tableWidth}px`);
      }
      if (m.gridWidth !== null) {
        console.log(`  Grid Width: ${m.gridWidth}px`);
      }
      console.log(`  Width Difference: ${m.widthDifference}px`);
      console.log(`  Consistent: ${m.isConsistent ? 'YES ✓' : 'NO ✗'}`);
      if (m.problematicElement) {
        console.log(`  Problematic Element: ${m.problematicElement}`);
      }
      console.log('');
    });

    if (inconsistentScreens.length > 0) {
      console.log('\nINCONSISTENT SCREENS (width difference > 10px):');
      inconsistentScreens.forEach(m => {
        console.log(`  - ${m.screen}: ${m.widthDifference}px difference`);
        if (m.problematicElement) {
          console.log(`    Problematic: ${m.problematicElement}`);
        }
      });
    }

    console.log('\n=================================================================\n');

    // Save measurements to JSON file for further analysis
    const fs = require('fs');
    fs.writeFileSync(
      'admin-portal/e2e/width-measurements.json',
      JSON.stringify({ measurements, summary: { total: measurements.length, inconsistent: inconsistentScreens.length } }, null, 2)
    );

    // Expect all screens to be consistent (this will fail if issues found)
    expect(inconsistentScreens.length).toBe(0);
  });

  test('should inspect CSS specificity on Members Grid', async ({ page }) => {
    console.log('\n=== CSS Specificity Investigation: Members Grid ===');

    await page.goto('https://admin-ctn-dev-gma8fnethbetbjgj.z02.azurefd.net/members');
    await page.waitForTimeout(3000); // Allow time for data to load

    // Get all CSS rules applied to .members-grid-container
    const cssDetails = await page.evaluate(() => {
      const grid = document.querySelector('.members-grid-container') as HTMLElement;
      if (!grid) return { error: 'Grid container not found' };

      const computedStyle = window.getComputedStyle(grid);
      const parent = grid.parentElement;
      const parentComputedStyle = parent ? window.getComputedStyle(parent) : null;

      return {
        grid: {
          maxWidth: computedStyle.maxWidth,
          width: computedStyle.width,
          margin: computedStyle.margin,
          padding: computedStyle.padding,
          boxSizing: computedStyle.boxSizing,
          display: computedStyle.display,
          offsetWidth: grid.offsetWidth,
          scrollWidth: grid.scrollWidth,
          clientWidth: grid.clientWidth,
          className: grid.className,
        },
        parent: parentComputedStyle ? {
          maxWidth: parentComputedStyle.maxWidth,
          width: parentComputedStyle.width,
          margin: parentComputedStyle.margin,
          padding: parentComputedStyle.padding,
          className: parent?.className,
        } : null,
      };
    });

    console.log('Members Grid CSS Details:', JSON.stringify(cssDetails, null, 2));

    // Check for inline styles
    const gridExists = await page.locator('.members-grid-container').count() > 0;
    if (gridExists) {
      const inlineStyles = await page.locator('.members-grid-container').evaluate((el: HTMLElement) => el.style.cssText);
      console.log('Inline styles on .members-grid-container:', inlineStyles || 'none');
    }

    // Check parent container (.members-view)
    const parentInfo = await page.locator('.content-area > *').first().evaluate((el: HTMLElement) => ({
      className: el.className,
      maxWidth: window.getComputedStyle(el).maxWidth,
      width: window.getComputedStyle(el).width,
      offsetWidth: el.offsetWidth,
    }));
    console.log('Parent container (.members-view) info:', JSON.stringify(parentInfo, null, 2));
  });

  test('should inspect CSS specificity on DataTable', async ({ page }) => {
    console.log('\n=== CSS Specificity Investigation: DataTable ===');

    await page.goto('https://admin-ctn-dev-gma8fnethbetbjgj.z02.azurefd.net/user-management');
    await page.waitForTimeout(2000);

    const tableDetails = await page.evaluate(() => {
      const table = document.querySelector('.mantine-DataTable-root') as HTMLElement;
      if (!table) return { error: 'DataTable not found' };

      const computedStyle = window.getComputedStyle(table);
      const wrapper = table.closest('.mantine-DataTable-wrapper') as HTMLElement | null;
      const wrapperStyle = wrapper ? window.getComputedStyle(wrapper) : null;

      return {
        table: {
          maxWidth: computedStyle.maxWidth,
          width: computedStyle.width,
          overflowX: computedStyle.overflowX,
          offsetWidth: table.offsetWidth,
          scrollWidth: table.scrollWidth,
        },
        wrapper: wrapperStyle ? {
          maxWidth: wrapperStyle.maxWidth,
          width: wrapperStyle.width,
          overflowX: wrapperStyle.overflowX,
        } : null,
      };
    });

    console.log('DataTable CSS Details:', JSON.stringify(tableDetails, null, 2));
  });
});
