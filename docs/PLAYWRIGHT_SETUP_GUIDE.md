# Playwright Testing Configuration Guide

## Quick Start for Each Portal

### Admin Portal
```bash
cd /Users/ramondenoronha/Dev/DIL/ASR-full/admin-portal

# Run all tests
npm run test:e2e

# Run specific test file
npx playwright test e2e/admin-portal/authentication.spec.ts

# Run in UI mode
npx playwright test --ui

# Run in headed mode (see browser)
npx playwright test --headed

# Debug mode
npx playwright test --debug
```

**Environment**: `admin-portal/.env`
- PLAYWRIGHT_BASE_URL=https://calm-tree-03352ba03.1.azurestaticapps.net
- E2E_TEST_USER_EMAIL=test-e2@denoronha.consulting
- E2E_TEST_USER_PASSWORD=Madu5952

### Member Portal
```bash
cd /Users/ramondenoronha/Dev/DIL/ASR-full/member-portal

# Run all tests
npx playwright test

# Run specific test file
npx playwright test e2e/member-portal.spec.ts

# Run specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
npx playwright test --project='Mobile Chrome'
npx playwright test --project='Mobile Safari'
```

**Environment**: `member-portal/.env`
- BASE_URL=https://calm-pebble-043b2db03.1.azurestaticapps.net
- E2E_TEST_USER_EMAIL=test-e2@denoronha.consulting
- E2E_TEST_USER_PASSWORD=Madu5952

### Booking Portal
```bash
cd /Users/ramondenoronha/Dev/DIL/ASR-full/booking-portal

# Run all tests
npx playwright test

# Run specific test
npx playwright test bookings-grid-journey-timeline.spec.ts

# View HTML report
npx playwright show-report
```

**Environment**: Set via env variable
- BOOKING_PORTAL_URL (defaults to calm-mud-024a8ce03.1.azurestaticapps.net)

### Orchestrator Portal
```bash
cd /Users/ramondenoronha/Dev/DIL/ASR-full/orchestrator-portal

# Make sure mock API is running first
npm run mock-api &  # Background process

# In another terminal, run tests
npx playwright test

# Or run main app first
npm run dev &
npm run mock-api &
npx playwright test
```

**Note**: Orchestrator uses local development environment, not Azure

### Documentation Portal
```bash
cd /Users/ramondenoronha/Dev/DIL/ASR-full/ctn-docs-portal

# Tests run against production (no local setup needed)
npx playwright test

# Mobile testing
npx playwright test --project=mobile
```

---

## Key Selectors for Automation

### Admin Portal (MSAL)
```typescript
// Login indicators
page.locator('.user-info')  // User info container
page.locator('.user-name')  // Username display
page.locator('[data-testid="user-name"]')

// Role info
page.locator('.user-role')
page.locator('[data-testid="user-role"]')

// Kendo UI Components
page.locator('[data-testid="members-grid"]')  // Members grid
page.locator('[data-testid="identifiers-grid"]')  // Identifiers grid

// Buttons
page.locator('button:has-text("Add")')
page.locator('button:has-text("Edit")')
page.locator('button:has-text("Delete")')
```

### Member Portal (MSAL React)
```typescript
// Login page
page.locator('button:has-text("Sign In with Azure AD")')
page.locator('button:has-text("Register as Member")')

// After login
page.locator('.user-name')  // User display
page.locator('button:has-text("Sign Out")')  // Sign out button (emoji format)

// Tab navigation
page.locator('.tab-button')  // All tab buttons
page.locator('.tab-button.active')  // Active tab
page.locator('button:has-text("Dashboard")')
page.locator('button:has-text("Organization Profile")')
page.locator('button:has-text("Contacts")')
page.locator('button:has-text("System Integrations")')
page.locator('button:has-text("API Access")')
page.locator('button:has-text("DNS Verification")')
page.locator('button:has-text("Support")')
```

### Booking Portal
```typescript
// Navigation
page.locator('[data-testid="header"]')
page.locator('nav')

// Main routes
page.locator('[data-testid="dashboard"]')
page.locator('[data-testid="upload"]')
page.locator('[data-testid="bookings"]')
page.locator('[data-testid="admin"]')

// Forms
page.locator('[data-testid="booking-form"]')
page.locator('[data-testid="document-upload"]')
```

### Orchestrator Portal
```typescript
// Login
page.locator('[data-testid="login-form"]')

// Main layout
page.locator('[data-testid="main-layout"]')
page.locator('[data-testid="sidebar"]')
page.locator('[data-testid="dashboard"]')
```

---

## Authentication Flow Patterns

### MSAL-based Portals (Admin, Member, Booking)

#### Step-by-step login automation:
```typescript
import { test, expect } from '@playwright/test';

test('authenticate with MSAL', async ({ page }) => {
  // Navigate to portal
  await page.goto('/');
  
  // Expect redirect to Azure AD login
  // (This may be automatic with saved auth state)
  
  // Check if user is authenticated
  const userElement = page.locator('.user-name');
  await expect(userElement).toBeVisible();
});
```

#### With global setup (Admin Portal):
```typescript
// playwright/global-setup.ts handles auth once
// All subsequent tests use saved auth state from playwright/.auth/user.json
// See: playwright.config.ts dependencies: ['setup']
```

#### Without global setup (Member Portal):
```typescript
// Each test authenticates directly using MSAL
// MSAL handles the Azure AD redirect automatically
// Once authenticated, user stays authenticated in sessionStorage
```

---

## Environment Variables for CI/CD

### GitHub Actions / Azure DevOps
```yaml
# Admin Portal
- name: Run Playwright tests
  env:
    PLAYWRIGHT_BASE_URL: https://calm-tree-03352ba03.1.azurestaticapps.net
    E2E_TEST_USER_EMAIL: test-e2@denoronha.consulting
    E2E_TEST_USER_PASSWORD: Madu5952
  run: cd admin-portal && npm run test:e2e

# Member Portal
- name: Run Playwright tests
  env:
    BASE_URL: https://calm-pebble-043b2db03.1.azurestaticapps.net
    E2E_TEST_USER_EMAIL: test-e2@denoronha.consulting
    E2E_TEST_USER_PASSWORD: Madu5952
  run: cd member-portal && npm run test:e2e

# Booking Portal
- name: Run Playwright tests
  env:
    BOOKING_PORTAL_URL: https://calm-mud-024a8ce03.1.azurestaticapps.net
  run: cd booking-portal && npm run test:e2e

# Orchestrator Portal (local only)
- name: Run Playwright tests
  run: |
    cd orchestrator-portal
    npm run mock-api &
    npm run dev &
    npm run test:e2e

# Docs Portal (production only)
- name: Run Playwright tests
  run: cd ctn-docs-portal && npm run test
```

---

## Common Issues & Solutions

### Issue: "Page not loading" in tests
**Solution**: Check baseURL in playwright.config.ts matches environment
```typescript
// Correct: Use process.env variables
baseURL: process.env.PLAYWRIGHT_BASE_URL || 'https://calm-tree-03352ba03.1.azurestaticapps.net'

// Or environment-specific
baseURL: process.env.CI ? 'https://production.azurestaticapps.net' : 'http://localhost:3000'
```

### Issue: "User not authenticated" in tests
**Solution**: Ensure .env file has correct test credentials
```bash
# Admin Portal
cat admin-portal/.env
# Should contain:
# E2E_TEST_USER_EMAIL=test-e2@denoronha.consulting
# E2E_TEST_USER_PASSWORD=Madu5952

# Or check global setup
cat admin-portal/playwright/global-setup.ts
```

### Issue: "Timeout waiting for element"
**Solution**: Increase timeout or wait for conditions
```typescript
// Increase specific test timeout
test('slow test', async ({ page }) => {
  // timeout: 90000 milliseconds
}, { timeout: 90000 });

// Or wait for condition
await page.waitForFunction(() => {
  return window.location.href.includes('/dashboard');
});
```

### Issue: "StorageState file not found"
**Solution**: Run global setup or capture auth manually
```bash
# Run setup project first
npx playwright test --project=setup

# Or manually capture auth state
npx playwright test --ui  # Login manually, state saves to .auth/user.json
```

---

## Test Organization & Best Practices

### File Structure
```
portal/
├── e2e/
│   ├── admin-portal/  (Portal-specific tests)
│   │   ├── authentication.spec.ts
│   │   ├── crud-operations.spec.ts
│   │   └── accessibility.spec.ts
│   ├── common/  (Shared utilities)
│   │   ├── helpers.ts
│   │   └── fixtures.ts
│   └── fixtures.ts  (Test fixtures with auth)
└── playwright.config.ts
```

### Use Fixtures for Reusable Auth
```typescript
// fixtures.ts
import { test as base, expect } from '@playwright/test';

type TestFixtures = {
  authenticatedPage: Page;
};

export const test = base.extend<TestFixtures>({
  authenticatedPage: async ({ page }, use) => {
    // Authenticate once
    await page.goto('/');
    await page.locator('.user-name').waitFor();
    // Reuse across tests
    await use(page);
  },
});

export { expect };
```

### Use in tests
```typescript
import { test, expect } from './fixtures';

test('test with authenticated page', async ({ authenticatedPage }) => {
  await authenticatedPage.goto('/members');
  // Already authenticated, ready to test
});
```

---

## Performance Optimization

### Parallel Execution
```typescript
// playwright.config.ts
{
  fullyParallel: true,  // Run all tests in parallel
  workers: process.env.CI ? 1 : 4,  // Limit in CI
}
```

### Reuse Browser Context
```typescript
// Save auth state to reuse
storageState: 'playwright/.auth/user.json'

// Dependencies for setup
dependencies: ['setup']
```

### Skip Slow Operations
```typescript
test.skip(process.env.CI, 'Skip video capture in CI');
test.slow();  // Mark slow tests (extends timeout 3x)
```

