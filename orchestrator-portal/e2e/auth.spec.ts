import { test, expect } from '@playwright/test';
import { TEST_USERS } from './fixtures/auth';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    // Wait for React app to load
    await page.waitForLoadState('networkidle');
  });

  test('should display login page correctly', async ({ page }) => {
    // Wait for h1 to appear
    await page.waitForSelector('h1', { timeout: 10000 });

    // Verify login page elements
    await expect(page.locator('h1')).toContainText('CTN Orchestrator Portal');

    // Kendo Input components render as .k-input elements
    const emailLabel = page.locator('text=Email');
    const passwordLabel = page.locator('text=Password');
    await expect(emailLabel).toBeVisible();
    await expect(passwordLabel).toBeVisible();

    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should reject invalid credentials', async ({ page }) => {
    // Kendo Input creates .k-input elements
    await page.locator('.k-input').first().fill('invalid@example.com');
    await page.locator('.k-input').nth(1).fill('wrongpassword');
    await page.click('button[type="submit"]');

    // Should show error message and stay on login page
    await expect(page.locator('text=/Invalid credentials/i')).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test('should reject empty email', async ({ page }) => {
    // Clear email field and try to submit
    await page.locator('.k-input').first().fill('');
    await page.locator('.k-input').nth(1).fill('password');
    await page.click('button[type="submit"]');

    // Should stay on login page (form not submitted or error shown)
    await expect(page).toHaveURL(/\/login/);
  });

  test('should reject empty password', async ({ page }) => {
    // Clear password field and try to submit
    await page.locator('.k-input').first().fill('test@example.com');
    await page.locator('.k-input').nth(1).fill('');
    await page.click('button[type="submit"]');

    // Should stay on login page (form not submitted or error shown)
    await expect(page).toHaveURL(/\/login/);
  });

  test('should login successfully with ITG credentials', async ({ page }) => {
    // Use Kendo Input elements
    await page.locator('.k-input').first().fill(TEST_USERS.itg.email);
    await page.locator('.k-input').nth(1).fill(TEST_USERS.itg.password);
    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard');

    // Should display user info in header
    await expect(page.locator('text=/ITG/i')).toBeVisible();
  });

  test('should login successfully with Rotterdam credentials', async ({ page }) => {
    // Use Kendo Input elements
    await page.locator('.k-input').first().fill(TEST_USERS.rotterdam.email);
    await page.locator('.k-input').nth(1).fill(TEST_USERS.rotterdam.password);
    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard');

    // Should display user info in header
    await expect(page.locator('text=/Rotterdam/i')).toBeVisible();
  });

  test('should redirect unauthenticated users to login', async ({ page }) => {
    await page.goto('/dashboard');

    // Should redirect to login
    await expect(page).toHaveURL('/login');
  });

  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.locator('.k-input').first().fill(TEST_USERS.itg.email);
    await page.locator('.k-input').nth(1).fill(TEST_USERS.itg.password);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/dashboard');

    // Click logout button (may be in dropdown or visible button)
    const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign out")').first();
    await logoutButton.click();

    // Should redirect to login
    await expect(page).toHaveURL('/login');

    // Attempting to access protected route should fail
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/login');
  });

  test('should maintain session after page reload', async ({ page }) => {
    // Login
    await page.locator('.k-input').first().fill(TEST_USERS.itg.email);
    await page.locator('.k-input').nth(1).fill(TEST_USERS.itg.password);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/dashboard');

    // Reload page
    await page.reload();

    // Should still be authenticated
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('text=/ITG/i')).toBeVisible();
  });
});
