# Portal Login Selectors & API Endpoints Reference

## Login & Authentication Selectors

### Admin Portal

**URL**: https://calm-tree-03352ba03.1.azurestaticapps.net

**Flow**: 
1. Navigate to base URL
2. Auto-redirects to Microsoft Azure AD login
3. User is redirected back after authentication

**Selectors After Login**:
```typescript
// User authenticated indicators
page.locator('.user-info')  // Main user info container
page.locator('.user-name')  // Username text
page.locator('.user-role')  // User role display

// Data test IDs (if defined)
page.locator('[data-testid="user-name"]')
page.locator('[data-testid="user-role"]')

// Check authentication by verifying these elements are visible
await expect(page.locator('.user-name')).toBeVisible();
```

**Token Location**: sessionStorage
- Key: `msal.idtoken` (MSAL stores token in sessionStorage)

**Logout Selectors**:
- Located in header area
- Look for logout button or menu with user options

---

### Member Portal

**URL**: https://calm-pebble-043b2db03.1.azurestaticapps.net

**Unauthenticated Page Selectors**:
```typescript
// Login button
page.locator('button:has-text("Sign In with Azure AD")')

// Register button
page.locator('button:has-text("Register as Member")')

// Welcome heading
page.locator('h2:has-text("Welcome to CTN Member Portal")')
```

**After Login Selectors**:
```typescript
// User name display
page.locator('.user-name')

// Sign out button (has emoji)
page.locator('button:has-text("Sign Out")')
page.locator('button:has-text("🚪")')

// Tab navigation
page.locator('.tab-button')  // All tabs
page.locator('button:has-text("Dashboard")')
page.locator('button:has-text("Organization Profile")')
page.locator('button:has-text("Contacts")')
page.locator('button:has-text("System Integrations")')
page.locator('button:has-text("API Access")')
page.locator('button:has-text("DNS Verification")')
page.locator('button:has-text("Support")')

// Active tab indicator
page.locator('.tab-button.active')
```

**Token Location**: sessionStorage
- Key: `msal.idtoken`, `msal.accesstoken`

---

### Booking Portal

**URL**: https://calm-mud-024a8ce03.1.azurestaticapps.net

**Environment Variable**: `BOOKING_PORTAL_URL` (defaults to above)

**Selectors** (Similar to Admin Portal but portal-specific):
```typescript
// After authentication
page.locator('.header')  // Header area
page.locator('[data-testid="header"]')

// Main content areas
page.locator('[data-testid="dashboard"]')
page.locator('[data-testid="upload"]')
page.locator('[data-testid="bookings"]')
page.locator('[data-testid="admin"]')

// User menu/logout (check header for implementation)
page.locator('button:has-text("Logout")')
page.locator('button:has-text("Sign Out")')
```

**Token Location**: sessionStorage (MSAL)

---

### Orchestrator Portal

**URL**: http://localhost:5173 (development only)

**Selectors**:
```typescript
// Login page
page.locator('[data-testid="login-form"]')
page.locator('input[type="email"]')
page.locator('input[type="password"]')
page.locator('button:has-text("Login")')
page.locator('button[type="submit"]')

// After authentication
page.locator('[data-testid="main-layout"]')
page.locator('[data-testid="sidebar"]')
page.locator('[data-testid="dashboard"]')

// User menu
page.locator('[data-testid="user-menu"]')
page.locator('button:has-text("Logout")')
page.locator('button:has-text("Sign Out")')
```

**Auth Storage**: Zustand store (in-memory) + localStorage
- Key: `auth-store` (if persisted)

---

### Documentation Portal

**URL**: https://ambitious-sky-098ea8e03.2.azurestaticapps.net

**No Authentication Required** - Public static site

**Selectors** (Navigation only):
```typescript
// Home page
page.locator('h1:has-text("CTN Documentation")')

// Navigation
page.locator('nav')
page.locator('a[href="/"]')  // Home link
page.locator('a[href="/architecture"]')  // Architecture docs
page.locator('a[href="/guides"]')  // Guides

// Search (if implemented)
page.locator('[data-testid="search"]')
page.locator('input[placeholder*="Search"]')
```

---

## API Endpoints for Testing

### ASR API (Admin & Member Portals)

**Base URL**: https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1

**Health Check**:
```bash
curl https://func-ctn-demo-asr-dev.azurewebsites.net/api/health
```

**Authentication**: Bearer Token (JWT)
```typescript
// Acquire token in Playwright
const token = await page.evaluate(() => {
  // Access from sessionStorage or MSAL instance
  return sessionStorage.getItem('msal.idtoken');
});

// Use in requests
const headers = {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
};
```

**Common Endpoints**:
```
GET    /v1/members           - List members
GET    /v1/members/{id}      - Get member detail
POST   /v1/members           - Create member
PUT    /v1/members/{id}      - Update member
DELETE /v1/members/{id}      - Delete member

GET    /v1/identifiers       - List identifiers
POST   /v1/identifiers       - Create identifier
GET    /v1/identifiers/{id}  - Get identifier
PUT    /v1/identifiers/{id}  - Update identifier
DELETE /v1/identifiers/{id}  - Delete identifier

GET    /v1/legal-entities    - List legal entities
GET    /v1/legal-entities/{id} - Get legal entity
```

**Example API Test in Playwright**:
```typescript
test('fetch members API', async ({ page }) => {
  // First authenticate via UI
  await page.goto('/');
  await expect(page.locator('.user-name')).toBeVisible();
  
  // Intercept API responses
  const response = await page.request.get(
    'https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1/members',
    {
      headers: {
        'Authorization': `Bearer ${await getToken(page)}`
      }
    }
  );
  
  expect(response.ok()).toBeTruthy();
  const data = await response.json();
  expect(Array.isArray(data.data)).toBeTruthy();
});

async function getToken(page) {
  return await page.evaluate(() => {
    const msalInstance = (window as any).msalInstance;
    if (msalInstance) {
      const accounts = msalInstance.getAllAccounts();
      if (accounts.length > 0) {
        return msalInstance.acquireTokenSilent({
          scopes: ['User.Read'],
          account: accounts[0]
        }).then((response: any) => response.accessToken);
      }
    }
    return null;
  });
}
```

### Booking API

**Base URL**: https://func-ctn-booking-prod.azurewebsites.net

**Common Endpoints**:
```
GET    /api/bookings           - List bookings
POST   /api/bookings           - Create booking
GET    /api/bookings/{id}      - Get booking detail
PUT    /api/bookings/{id}      - Update booking

POST   /api/documents          - Upload document
GET    /api/documents/{id}     - Get document

POST   /api/validate           - Validate booking
```

---

## Test User Credentials

### Test User (All ASR Portals)

**Email**: test-e2@denoronha.consulting
**Password**: Madu5952
**Object ID**: 7e093589-f654-4e53-9522-898995d1201b
**Default Role**: SystemAdmin

**MFA**: DISABLED (special test account)

**Availability**: Valid in all environments
- Production
- Development
- Staging

### Creating Custom Test Users

For production testing:
1. Create new Azure AD user with @denoronha.consulting domain
2. Assign appropriate roles (SystemAdmin, AssociationAdmin, Member)
3. Disable MFA requirement in Conditional Access policy
4. Add credentials to CI/CD secrets

---

## Environment-Specific Configuration

### Local Development

```bash
# Admin Portal (.env)
PLAYWRIGHT_BASE_URL=http://localhost:3000
E2E_TEST_USER_EMAIL=test-e2@denoronha.consulting
E2E_TEST_USER_PASSWORD=Madu5952

# Member Portal (.env)
BASE_URL=http://localhost:3001
E2E_TEST_USER_EMAIL=test-e2@denoronha.consulting
E2E_TEST_USER_PASSWORD=Madu5952

# Orchestrator Portal (localhost:5173)
# No .env needed - hardcoded in playwright.config.ts
```

### Azure Staging

```bash
# Admin Portal
PLAYWRIGHT_BASE_URL=https://calm-tree-03352ba03.1.azurestaticapps.net

# Member Portal
BASE_URL=https://calm-pebble-043b2db03.1.azurestaticapps.net

# Booking Portal
BOOKING_PORTAL_URL=https://calm-mud-024a8ce03.1.azurestaticapps.net
```

### CI/CD Pipeline (GitHub Actions / Azure DevOps)

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    env:
      PLAYWRIGHT_BASE_URL: ${{ secrets.ADMIN_PORTAL_URL }}
      E2E_TEST_USER_EMAIL: ${{ secrets.E2E_USER_EMAIL }}
      E2E_TEST_USER_PASSWORD: ${{ secrets.E2E_USER_PASSWORD }}
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: cd admin-portal && npm install
      - run: cd admin-portal && npm run test:e2e
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: admin-portal/playwright-report
```

---

## Token Management in Tests

### Extracting Token from MSAL (Admin/Member/Booking Portals)

```typescript
import { test, expect, Page } from '@playwright/test';

async function getAccessToken(page: Page): Promise<string> {
  // Method 1: From MSAL instance (if exposed globally)
  const token = await page.evaluate(async () => {
    const msalInstance = (window as any).msalInstance;
    if (!msalInstance) {
      throw new Error('MSAL instance not available');
    }
    
    const accounts = msalInstance.getAllAccounts();
    if (accounts.length === 0) {
      throw new Error('No accounts found');
    }
    
    const response = await msalInstance.acquireTokenSilent({
      scopes: ['User.Read'],
      account: accounts[0],
      forceRefresh: true
    });
    
    return response.accessToken;
  });
  
  return token;
}

// Use in test
test('get API data with token', async ({ page }) => {
  await page.goto('/');  // Triggers authentication
  await expect(page.locator('.user-name')).toBeVisible();
  
  const token = await getAccessToken(page);
  
  const response = await page.request.get(
    'https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1/members',
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  expect(response.ok()).toBeTruthy();
});
```

### Intercepting Network Requests

```typescript
test('verify API request includes auth token', async ({ page }) => {
  let authTokenFound = false;
  
  page.on('request', request => {
    const url = request.url();
    if (url.includes('api/v1/members')) {
      const authHeader = request.headers()['authorization'];
      if (authHeader && authHeader.startsWith('Bearer ')) {
        authTokenFound = true;
        console.log('Auth token found in request:', authHeader.substring(0, 20) + '...');
      }
    }
  });
  
  await page.goto('/');
  await page.locator('[data-testid="members-grid"]').waitFor();
  
  expect(authTokenFound).toBeTruthy();
});
```

---

## Debugging Authentication Issues

### Check MSAL Instance

```typescript
// In browser console (dev tools)
window.msalInstance  // Should show MSAL PublicClientApplication
window.msalInstance.getAllAccounts()  // Should show logged-in accounts
sessionStorage  // Check for MSAL tokens
```

### Verify Scopes

```typescript
test('check MSAL scopes', async ({ page }) => {
  await page.goto('/');
  
  const scopes = await page.evaluate(() => {
    const msalConfig = (window as any).msalConfig;
    return msalConfig?.auth?.scopes;
  });
  
  console.log('MSAL scopes:', scopes);
  expect(scopes).toBeDefined();
});
```

### Monitor Network Requests

```typescript
test('monitor auth flow network requests', async ({ page }) => {
  const requests: { url: string, status: number }[] = [];
  
  page.on('response', response => {
    requests.push({
      url: response.url(),
      status: response.status()
    });
  });
  
  await page.goto('/');
  await expect(page.locator('.user-name')).toBeVisible();
  
  // Log authentication-related requests
  const authRequests = requests.filter(r => 
    r.url.includes('login.microsoftonline.com') ||
    r.url.includes('api.v1/') ||
    r.url.includes('authorize')
  );
  
  console.table(authRequests);
});
```

