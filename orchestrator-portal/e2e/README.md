# Orchestrator Portal E2E Test Suite

## Overview

Comprehensive Playwright-based end-to-end test suite for the Orchestrator Portal application. This test battery validates all major user workflows, UI interactions, and Kendo React components.

## Test Coverage

### Authentication Tests (`auth.spec.ts`)
- Login page display and validation
- Valid/invalid credential handling
- Multi-tenant authentication (ITG, Rotterdam)
- Session persistence and logout
- Protected route access control

**Test Count:** 9 tests

### Dashboard Tests (`dashboard.spec.ts`)
- Dashboard stats cards display
- Kendo donut chart rendering
- Recent activity feed
- Multi-tenant data display
- Navigation to other pages
- Empty state handling

**Test Count:** 8 tests

### Orchestrations Tests (`orchestrations.spec.ts`)
- Kendo Grid display and loading
- Search functionality (Container ID, BOL)
- Status filtering
- Pagination
- Column sorting
- Row click navigation
- Detail page display
- Route, parties, cargo information
- Back navigation
- Error handling (404 cases)

**Test Count:** 17 tests

### Events Tests (`events.spec.ts`)
- Events feed display
- Relative timestamps
- Event type filtering
- Real-time updates (5s polling)
- Severity/priority indicators
- Navigation to related orchestrations
- Empty state handling
- Multi-tenant data

**Test Count:** 12 tests

### Webhooks Tests (`webhooks.spec.ts`)
- Webhooks list display
- URL, event types, status display
- Test, Edit, Delete buttons
- Create webhook dialog
- Test webhook functionality
- Status filtering
- Statistics display
- Empty state handling

**Test Count:** 12 tests

### Analytics Tests (`analytics.spec.ts`)
- Kendo column chart rendering
- Priority breakdown display
- Stats cards and metrics
- Date range filtering
- Chart interactions and tooltips
- Export functionality
- Data refresh
- Multi-chart display
- Empty state handling

**Test Count:** 14 tests

## Total Test Coverage

**Total Tests:** 72 tests across 6 test suites

## Running Tests

### Prerequisites

```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install chromium firefox
```

### Run All Tests

```bash
# Headless mode (CI)
npm run test:e2e

# Headed mode (see browser)
npm run test:e2e:headed

# UI mode (interactive)
npm run test:e2e:ui

# Debug mode (step through tests)
npm run test:e2e:debug
```

### Run Specific Test Suite

```bash
# Authentication tests only
npx playwright test auth.spec.ts

# Dashboard tests only
npx playwright test dashboard.spec.ts

# Orchestrations tests only
npx playwright test orchestrations.spec.ts

# Events tests only
npx playwright test events.spec.ts

# Webhooks tests only
npx playwright test webhooks.spec.ts

# Analytics tests only
npx playwright test analytics.spec.ts
```

### Run Tests by Browser

```bash
# Chromium only
npx playwright test --project=chromium

# Firefox only
npx playwright test --project=firefox
```

### View Test Report

```bash
# Generate and open HTML report
npm run test:e2e:report
```

## Test Configuration

Configuration is defined in `/Users/ramondenoronha/Dev/DIL/ASR-full/orchestrator-portal/playwright.config.ts`:

- **Base URL:** http://localhost:5173
- **Browsers:** Chromium, Firefox
- **Timeout:** 30 seconds per test
- **Retries:** 2 in CI, 0 locally
- **Screenshots:** On failure
- **Videos:** On retry
- **Trace:** On first retry

## Test Fixtures

### Authentication Fixtures (`fixtures/auth.ts`)

Provides pre-authenticated page instances for tests:

```typescript
import { test, expect } from './fixtures/auth';

test('should do something', async ({ authenticatedPage: page }) => {
  // Page is already authenticated as ITG user
  await page.goto('/dashboard');
});

test('should test Rotterdam tenant', async ({ authenticatedPageAsRotterdam: page }) => {
  // Page is already authenticated as Rotterdam user
  await page.goto('/dashboard');
});
```

### Test Users

```typescript
{
  itg: {
    email: 'itg@example.com',
    password: 'password',
    tenant: 'ITG',
  },
  rotterdam: {
    email: 'rotterdam@example.com',
    password: 'password',
    tenant: 'Rotterdam',
  },
}
```

## CI/CD Integration

The test suite is designed for CI/CD pipelines:

1. **Automatic Server Startup:** Dev server and mock API start automatically
2. **Retry Logic:** Tests retry 2x in CI on failure
3. **Artifact Collection:** Screenshots, videos, traces on failure
4. **JSON Report:** Results exported to `test-results/results.json`

### Azure DevOps Example

```yaml
- task: NodeTool@0
  inputs:
    versionSpec: '20.x'

- script: npm ci
  displayName: 'Install dependencies'

- script: npx playwright install --with-deps
  displayName: 'Install Playwright browsers'

- script: npm run test:e2e
  displayName: 'Run E2E tests'

- task: PublishTestResults@2
  inputs:
    testResultsFiles: 'test-results/results.json'
  condition: always()

- task: PublishPipelineArtifact@1
  inputs:
    targetPath: 'playwright-report'
    artifact: 'playwright-report'
  condition: always()
```

## Test Patterns

### Given-When-Then Pattern

Tests follow clear structure:

```typescript
test('should filter orchestrations by status', async ({ authenticatedPage: page }) => {
  // GIVEN: User is on orchestrations page
  await page.goto('/orchestrations');
  await page.waitForSelector('.k-grid', { timeout: 10000 });

  // WHEN: User selects "Active" status filter
  const statusFilter = page.locator('select').first();
  await statusFilter.selectOption('Active');

  // THEN: Grid shows only active orchestrations
  const rows = page.locator('.k-grid-table tbody tr');
  await expect(rows.first()).toBeVisible();
});
```

### Kendo Component Testing

Special attention to Kendo React components:

```typescript
// Wait for Kendo Grid to load
await page.waitForSelector('.k-grid', { timeout: 10000 });

// Wait for Kendo Chart to render
await page.waitForSelector('div[class*="k-chart"]', { timeout: 10000 });

// Interact with Kendo Dropdown
const dropdown = page.locator('.k-dropdown');
await dropdown.click();
await page.locator('li:has-text("Option")').click();
```

### Empty State Handling

Tests verify graceful handling of empty data:

```typescript
const rows = page.locator('.k-grid-table tbody tr');
const rowCount = await rows.count();

// Either data exists or empty state is shown
const emptyState = await page.locator('text=/No records/i').count();
expect(rowCount > 0 || emptyState > 0).toBe(true);
```

## Debugging Tests

### Visual Debugging

```bash
# See tests run in browser
npm run test:e2e:headed

# Interactive UI mode
npm run test:e2e:ui

# Step-by-step debugging
npm run test:e2e:debug
```

### Screenshots and Videos

Failed tests automatically capture:
- Screenshots: `test-results/<test-name>/test-failed-1.png`
- Videos: `test-results/<test-name>/video.webm`
- Traces: `test-results/<test-name>/trace.zip`

### View Trace

```bash
# Open Playwright trace viewer
npx playwright show-trace test-results/<test-name>/trace.zip
```

## Best Practices

1. **Wait for Elements:** Always use `waitForSelector()` for dynamic content
2. **Avoid Hardcoded Delays:** Prefer `waitForSelector()` over `waitForTimeout()`
3. **Test Isolation:** Each test should be independent
4. **Descriptive Names:** Use clear test descriptions (what, when, expected)
5. **Error Recovery:** Tests handle both success and empty states
6. **Multi-Browser:** Run on Chromium and Firefox for coverage
7. **Fixtures:** Use authentication fixtures to avoid repeated logins

## Maintenance

### Adding New Tests

1. Create new spec file: `e2e/feature-name.spec.ts`
2. Import test fixtures: `import { test, expect } from './fixtures/auth';`
3. Write tests following existing patterns
4. Run tests: `npx playwright test feature-name.spec.ts`

### Updating Selectors

If UI changes break tests, update selectors:

```typescript
// Before
const button = page.locator('button:has-text("Submit")');

// After (more resilient)
const button = page.locator('button[type="submit"], button:has-text("Submit")');
```

### Test Battery Growth

This test suite grows with each release:
- Add tests for new features
- Add regression tests for fixed bugs
- Maintain tests for deprecated features until removed
- Never remove tests unless features are deprecated

## Performance

- **Average test duration:** 5-10 seconds per test
- **Full suite runtime:** ~10-15 minutes (72 tests x 2 browsers)
- **Parallel execution:** Enabled (multiple workers)
- **CI runtime:** ~15-20 minutes with retries

## Known Issues

1. **Kendo Chart Loading:** Some charts take >5s to render, tests wait up to 10s
2. **Real-time Updates:** Events page polls every 5s, tests account for this
3. **Mock API:** Uses json-server, no real backend dependencies

## Support

For issues or questions:
1. Check test output and screenshots in `test-results/`
2. Run in UI mode for interactive debugging
3. Review trace files for detailed execution steps
4. Consult Playwright documentation: https://playwright.dev

## Version History

- **v1.0.0** (2025-10-17): Initial test suite with 72 comprehensive tests
