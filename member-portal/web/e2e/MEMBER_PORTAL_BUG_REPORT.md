# Member Portal Bug Report

**Report Date:** October 17, 2025
**Test Environment:** Production
**Portal URL:** https://calm-pebble-043b2db03.1.azurestaticapps.net
**Test Suite:** Comprehensive E2E Tests (API + UI)

---

## Summary

Three bugs were discovered during automated E2E testing of the Member Portal:
- 1 MEDIUM severity (Navigation Menu)
- 2 LOW severity (Missing Assets, 404 Handling)

---

## BUG-001: Navigation Menu Not Found

**Severity:** MEDIUM
**Priority:** HIGH
**Category:** UI/Navigation
**Status:** Open

### Description
The Member Portal does not have a semantic navigation menu using standard HTML5 elements (`<nav>`, `<header>`, or `role="navigation"`).

### Steps to Reproduce
1. Visit https://calm-pebble-043b2db03.1.azurestaticapps.net
2. Inspect page HTML structure
3. Search for `<nav>`, `<header>`, or `[role="navigation"]` elements
4. **Result:** No semantic navigation elements found

### Expected Behavior
- Member Portal should have a visible navigation menu
- Navigation should use semantic HTML (`<nav>` element)
- Navigation should have `role="navigation"` for accessibility
- Navigation should be discoverable by automated tests and screen readers

### Actual Behavior
- No navigation menu found using standard selectors
- Navigation may be missing or using non-standard HTML elements
- Poor accessibility for screen reader users

### Impact
- Users may struggle to navigate between pages
- Poor accessibility (WCAG 2.1 AA compliance issue)
- Difficult to test navigation functionality

### Recommended Fix
```html
<!-- Add semantic navigation -->
<nav role="navigation" aria-label="Main navigation">
  <ul>
    <li><a href="/dashboard">Dashboard</a></li>
    <li><a href="/profile">Profile</a></li>
    <li><a href="/contacts">Contacts</a></li>
    <li><a href="/endpoints">Endpoints</a></li>
    <li><a href="/tokens">Tokens</a></li>
  </ul>
</nav>
```

### Test Case
```typescript
test('should display navigation menu', async ({ page }) => {
  await page.goto(MEMBER_PORTAL_URL);
  await page.waitForLoadState('networkidle');

  const hasNavigation = (await page.locator('nav, header, [role="navigation"]').count()) > 0;
  expect(hasNavigation).toBe(true);
});
```

### Screenshots
See: `test-results/member-portal-Member-Porta-4bffb-uld-display-navigation-menu-chromium/test-failed-1.png`

---

## BUG-002: Missing Logo Assets (6 x 404 Errors)

**Severity:** LOW
**Priority:** MEDIUM
**Category:** Assets/Static Files
**Status:** Open

### Description
The Member Portal attempts to load 6 logo images that return 404 Not Found errors, causing broken images and console errors.

### Failed Requests
1. `GET /assets/logos/contargo.png` - 404
2. `GET /assets/logos/ctn%20small.png` - 404
3. `GET /assets/logos/DIL.png` - 404
4. `GET /assets/logos/VanBerkel.png` - 404
5. `GET /assets/logos/Inland%20Terminals%20Group.png` - 404
6. `GET /assets/logos/portbase.png` - 404

### Steps to Reproduce
1. Visit https://calm-pebble-043b2db03.1.azurestaticapps.net
2. Open browser DevTools > Network tab
3. Filter by "Images" or "404"
4. **Result:** 6 logo images fail to load

### Expected Behavior
- All referenced logo images should exist in `/public/assets/logos/` directory
- All images should load successfully (200 OK)
- No 404 errors in console

### Actual Behavior
- 6 logo files missing from static assets
- Broken image icons displayed in UI
- Console shows 404 errors
- URL encoding issue: `ctn%20small.png` (space in filename)

### Impact
- Poor user experience (broken images)
- Console errors visible to users
- Unprofessional appearance
- May indicate missing member organization logos

### Recommended Fix

**Option 1: Add Missing Logo Files**
```bash
# Add logo files to public/assets/logos/
cp logos/contargo.png web/public/assets/logos/
cp logos/ctn-small.png web/public/assets/logos/
cp logos/DIL.png web/public/assets/logos/
cp logos/VanBerkel.png web/public/assets/logos/
cp logos/Inland-Terminals-Group.png web/public/assets/logos/
cp logos/portbase.png web/public/assets/logos/
```

**Option 2: Remove References to Non-Existent Logos**
```typescript
// Remove or comment out logo references
// const memberLogos = [
//   '/assets/logos/contargo.png',
//   '/assets/logos/DIL.png',
//   // ... etc
// ];
```

**Option 3: Use Placeholder Images**
```typescript
const getLogo = (logoPath: string) => {
  // Fallback to placeholder if logo doesn't exist
  return logoPath || '/assets/logos/placeholder.png';
};
```

**Fix URL Encoding Issue:**
```typescript
// Bad: Space in filename
'/assets/logos/ctn small.png'

// Good: Use dash or underscore
'/assets/logos/ctn-small.png'
```

### Test Case
```typescript
test('should load without failed network requests', async ({ page }) => {
  const failedRequests: string[] = [];

  page.on('requestfailed', (request) => {
    const url = request.url();
    if (!url.includes('chrome-extension') && !url.includes('moz-extension')) {
      failedRequests.push(`${request.method()} ${url}`);
    }
  });

  await page.goto(MEMBER_PORTAL_URL);
  await page.waitForLoadState('networkidle');

  expect(failedRequests).toHaveLength(0);
});
```

### Screenshots
See: `test-results/member-portal-Member-Porta-ee4ca-out-failed-network-requests-chromium/test-failed-1.png`

---

## BUG-003: No 404 Error Page

**Severity:** LOW
**Priority:** MEDIUM
**Category:** Error Handling/UX
**Status:** Open

### Description
When navigating to a non-existent page, the Member Portal does not display a 404 error page or redirect to the home page. Users get stuck on a blank or broken page.

### Steps to Reproduce
1. Visit https://calm-pebble-043b2db03.1.azurestaticapps.net/this-page-does-not-exist-12345
2. **Result:** No 404 error page shown, no redirect to home

### Expected Behavior
- Display a custom 404 error page with clear messaging
- Provide "Go to Home" button
- OR automatically redirect to home page after 3 seconds
- Use React Router's catch-all route for 404 handling

### Actual Behavior
- User stays on non-existent URL
- No error message displayed
- Blank or broken page shown
- No way to navigate back to app

### Impact
- Poor user experience
- Users get stuck on broken pages
- No guidance for users who mistype URLs
- Unprofessional error handling

### Recommended Fix

**Create 404 Component:**
```typescript
// src/components/NotFound.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';

export const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="not-found">
      <h1>404 - Page Not Found</h1>
      <p>The page you're looking for doesn't exist.</p>
      <button onClick={() => navigate('/')}>
        Go to Home
      </button>
    </div>
  );
};
```

**Add Catch-All Route:**
```typescript
// src/App.tsx or Router configuration
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { NotFound } from './components/NotFound';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/contacts" element={<Contacts />} />
        {/* ... other routes ... */}

        {/* Catch-all 404 route - MUST BE LAST */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
```

**Optional: Auto-Redirect After 3 Seconds:**
```typescript
export const NotFound: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/');
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="not-found">
      <h1>404 - Page Not Found</h1>
      <p>Redirecting to home in 3 seconds...</p>
      <button onClick={() => navigate('/')}>
        Go Now
      </button>
    </div>
  );
};
```

### Test Case
```typescript
test('should handle 404 responses gracefully', async ({ page }) => {
  await page.goto(`${MEMBER_PORTAL_URL}/this-page-does-not-exist-12345`);
  await page.waitForLoadState('networkidle');

  const has404Page = (await page.locator('text=/404|not found|page not found/i').count()) > 0;

  // Either shows 404 page or redirects to home
  expect(has404Page || page.url() === MEMBER_PORTAL_URL).toBe(true);
});
```

### Screenshots
See: `test-results/member-portal-Member-Porta-af73e-le-404-responses-gracefully-chromium/test-failed-1.png`

---

## Feature Gaps (Not Bugs, But Need Implementation)

### API Endpoint Creation/Update
**Severity:** N/A (Feature Gap)
**Status:** Not Implemented

The following API endpoints are referenced in tests but don't exist:
- `POST /api/v1/member/endpoints` - Create new endpoint
- `PUT /api/v1/member/endpoints/{endpointId}` - Update endpoint
- `DELETE /api/v1/member/endpoints/{endpointId}` - Delete endpoint

**Recommendation:** Implement these endpoints to complete endpoint management CRUD operations.

---

### BDI Token Issuance
**Severity:** N/A (Feature Gap)
**Status:** Requires BDI Integration

Token issuance via `POST /api/v1/member/tokens` requires BDI integration setup.

**Recommendation:** Complete BDI integration and implement token issuance endpoint.

---

## Testing Notes

### Authentication Required
Many tests were skipped because they require Azure AD authentication:
- Contact management CRUD operations
- Endpoint management CRUD operations
- Token management operations

**Recommendation:** Set up test user credentials in CI/CD to enable authenticated test scenarios.

---

### Test Selectors Need Improvement
Tests rely on text-based selectors (e.g., `button:has-text("Save")`) which are fragile and language-dependent.

**Recommendation:** Add `data-testid` attributes to key UI elements:
```html
<button data-testid="save-contact-button" type="submit">Save</button>
<nav data-testid="main-navigation">...</nav>
<div data-testid="contact-list">...</div>
```

---

## Regression Prevention

These bugs have been added to the automated test suite in:
- `/portal/web/e2e/member-portal.spec.ts`

The test suite will run on every deployment to prevent regression.

---

## Priority for Fixes

### Immediate (Before Next Release)
1. ✅ **BUG-001:** Navigation Menu - HIGH priority, MEDIUM severity
2. ✅ **BUG-002:** Missing Logos - MEDIUM priority, LOW severity

### Short-Term (Next Sprint)
3. ✅ **BUG-003:** 404 Page - MEDIUM priority, LOW severity

### Long-Term (Future Releases)
4. Implement endpoint management API
5. Complete BDI token issuance
6. Add test user authentication

---

**Bug Report Generated:** October 17, 2025
**Test Engineer:** TE Agent (Automated)
**Status:** Ready for Developer Assignment
