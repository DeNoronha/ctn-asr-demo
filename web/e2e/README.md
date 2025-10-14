# Playwright E2E Tests for CTN Admin Portal

This directory contains end-to-end tests for the CTN Admin Portal using Playwright.

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Environment Variables

Create a `.env` file in the `web` directory with your Azure AD test credentials:

```bash
AZURE_AD_TEST_USERNAME=your-email@domain.com
AZURE_AD_TEST_PASSWORD=your-password
```

**IMPORTANT**: Never commit `.env` files with real credentials!

### 3. Install Browsers

```bash
npx playwright install chromium
```

## Running Tests

### Run all tests (headless)
```bash
npm run test:e2e
```

### Run tests with visible browser
```bash
npm run test:e2e:headed
```

### Run tests in UI mode (interactive)
```bash
npm run test:e2e:ui
```

### Debug tests
```bash
npm run test:e2e:debug
```

### View test report
```bash
npm run test:e2e:report
```

## Test Structure

```
e2e/
├── auth.setup.ts          # Authentication setup (runs first)
├── admin-portal.spec.ts   # Main admin portal tests
└── README.md              # This file
```

## How Authentication Works

1. **auth.setup.ts** runs first and:
   - Logs in with Azure AD credentials
   - Saves authentication state to `playwright/.auth/user.json`

2. **All other tests** reuse the saved authentication state:
   - No need to log in again
   - Tests run faster
   - More reliable

## Writing New Tests

### Example Test

```typescript
import { test, expect } from '@playwright/test';

test('my new test', async ({ page }) => {
  // Navigate to a page
  await page.goto('/members');

  // Find an element
  const heading = page.locator('h1');

  // Assert
  await expect(heading).toHaveText('Members');

  // Take screenshot
  await page.screenshot({ path: 'my-test.png' });
});
```

### Best Practices

1. **Use data-testid attributes** for stable selectors:
   ```typescript
   await page.locator('[data-testid="member-name"]').click();
   ```

2. **Wait for elements** to be ready:
   ```typescript
   await page.waitForSelector('table', { state: 'visible' });
   ```

3. **Capture screenshots** for visual verification:
   ```typescript
   await page.screenshot({ path: 'test-result.png', fullPage: true });
   ```

4. **Check API responses**:
   ```typescript
   page.on('response', (response) => {
     console.log(response.status(), response.url());
   });
   ```

## Troubleshooting

### Authentication fails

1. Check that credentials are correct in `.env`
2. Verify MFA is not blocking automated login
3. Try running in headed mode to see what happens:
   ```bash
   npm run test:e2e:headed
   ```

### Tests are flaky

1. Add explicit waits:
   ```typescript
   await page.waitForLoadState('networkidle');
   ```

2. Increase timeouts:
   ```typescript
   await page.waitForSelector('selector', { timeout: 10000 });
   ```

3. Run tests serially instead of in parallel (already configured)

### Can't find elements

1. Use Playwright Inspector to debug:
   ```bash
   npm run test:e2e:debug
   ```

2. Check the selector in the Playwright UI mode:
   ```bash
   npm run test:e2e:ui
   ```

## CI/CD Integration

For running in CI pipelines:

```yaml
- name: Install Playwright
  run: npx playwright install --with-deps chromium

- name: Run E2E tests
  env:
    AZURE_AD_TEST_USERNAME: ${{ secrets.AZURE_AD_TEST_USERNAME }}
    AZURE_AD_TEST_PASSWORD: ${{ secrets.AZURE_AD_TEST_PASSWORD }}
  run: npm run test:e2e

- name: Upload test results
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: playwright-report/
```

## Resources

- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Playwright API Reference](https://playwright.dev/docs/api/class-playwright)
