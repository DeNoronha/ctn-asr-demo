# Implementation Plan: Critical Security Tasks (SEC-004, SEC-008, SEC-009, SEC-005)

**Created:** October 29, 2025
**Project:** CTN ASR Admin Portal
**Estimated Total Time:** 14 hours
**Status:** Planning Complete

---

## Overview

Implementation of 4 critical security fixes for the CTN ASR Admin Portal:

1. **SEC-004**: CSRF protection for state-changing operations (4 hours)
2. **SEC-008**: Generic error messages to prevent information disclosure (2 hours)
3. **SEC-009**: Remove verbose console logging in production (2 hours)
4. **SEC-005**: Strengthen CSP policy (remove unsafe directives) (6 hours)

---

## Current State Analysis

### Existing Security Infrastructure

**✅ Already Implemented:**
- Generic error handler utility (`admin-portal/src/utils/errorHandler.ts`) created in commit 9b0c0b0
- Vite build configuration already strips `console.log/debug/info` in production (commit a8d92f2)
- Security headers configured in `admin-portal/public/staticwebapp.config.json`
- XSS prevention with DOMPurify (commit abde738)
- Session management security (commit f96a2bf)

**❌ Missing:**
- CSRF token generation and validation
- Systematic replacement of `error.message` with generic messages across all API services
- Additional console.log removal in 9 remaining files
- CSP policy hardening (current policy has `unsafe-inline` and `unsafe-eval`)

### Files Requiring Changes

**SEC-004 (CSRF):**
- `admin-portal/src/services/apiV2.ts` - 23 POST/PUT/DELETE/PATCH calls
- `admin-portal/src/services/api.ts` - 4 state-changing operations
- `api/src/middleware/auth.ts` - Backend CSRF validation

**SEC-008 (Error Messages):**
- `admin-portal/src/services/apiV2.ts` - Direct axios calls
- `admin-portal/src/services/apiClient.ts` - Error handler function
- 8 components using direct API calls without error handler

**SEC-009 (Console Logging):**
- `admin-portal/src/components/IdentifiersManager.tsx` (5 instances)
- `admin-portal/src/auth/AuthContext.tsx` (console.error)
- `admin-portal/src/components/MemberDetailView.tsx` (console.error)
- `admin-portal/src/components/KvkDocumentUpload.tsx` (console logs)
- `admin-portal/src/components/TasksGrid.tsx` (debug logs)
- `admin-portal/src/services/auditLogService.ts` (console.error)
- `admin-portal/src/pages/MemberRegistrationWizard.tsx` (console.error)
- `admin-portal/src/index.tsx` (console.error)
- `admin-portal/src/components/users/UserManagement.tsx` (console.error)

**SEC-005 (CSP):**
- `admin-portal/public/staticwebapp.config.json` - CSP header
- Potential Kendo UI inline style issues

---

## Stage 1: SEC-008 - Generic Error Messages (2 hours)

**Goal:** Replace all detailed error messages with user-friendly generic messages

**Foundation:** Generic error handler utility already exists at `admin-portal/src/utils/errorHandler.ts`

### Success Criteria
- [x] Generic error handler exists (already done)
- [ ] All API service files use `getGenericErrorMessage()`
- [ ] No `error.message` or `error.stack` exposed to users
- [ ] All errors logged to console.error (stripped in production by SEC-009)
- [ ] Manual testing confirms generic messages displayed

### Implementation Steps

#### Step 1.1: Update apiV2.ts (45 minutes)
**Pattern to replace:**
```typescript
// BEFORE (exposing details):
catch (error) {
  throw error; // or console.error(error.message)
}

// AFTER (generic message):
import { getGenericErrorMessage } from '../utils/errorHandler';
catch (error) {
  throw new Error(getGenericErrorMessage(error, 'loading members'));
}
```

**Apply to:**
- `getMembers()` - "loading members"
- `getMember()` - "loading member details"
- `createMember()` - "creating member"
- `createLegalEntity()` - "creating legal entity"
- `updateLegalEntity()` - "updating legal entity"
- `deleteLegalEntity()` - "deleting legal entity"
- `addIdentifier()` - "adding identifier"
- `updateIdentifier()` - "updating identifier"
- `deleteIdentifier()` - "deleting identifier"
- `validateIdentifier()` - "validating identifier"
- `addContact()` - "adding contact"
- `updateContact()` - "updating contact"
- `deleteContact()` - "deleting contact"
- `addEndpoint()` - "adding endpoint"
- `updateEndpoint()` - "updating endpoint"
- `deleteEndpoint()` - "deleting endpoint"
- `testEndpointConnection()` - "testing endpoint connection"
- `toggleEndpoint()` - "toggling endpoint"
- `issueEndpointToken()` - "issuing token"
- `revokeEndpointToken()` - "revoking token"
- `updateTier()` - "updating authentication tier"

#### Step 1.2: Update apiClient.ts handleApiError (15 minutes)
Replace current implementation:
```typescript
function handleApiError(error: Error): void {
  console.error('API Client Error:', {
    message: error.message,
    name: error.name,
    stack: error.stack
  });
}
```

With:
```typescript
import { getGenericErrorMessage } from '../utils/errorHandler';

function handleApiError(error: Error): void {
  const operation = 'processing request';
  const genericMessage = getGenericErrorMessage(error, operation);
  console.error('API error occurred:', genericMessage); // Full error logged here
  // Don't re-throw - let consumers handle
}
```

#### Step 1.3: Create Component Error Wrapper Hook (30 minutes)
Create `admin-portal/src/hooks/useApiError.ts`:
```typescript
import { useNotification } from '../contexts/NotificationContext';
import { getGenericErrorMessage } from '../utils/errorHandler';

export function useApiError() {
  const notification = useNotification();

  const handleError = (error: unknown, operation: string) => {
    const message = getGenericErrorMessage(error, operation);
    notification.showError(message);
  };

  return { handleError };
}
```

Usage example:
```typescript
const { handleError } = useApiError();
try {
  await apiV2.createMember(data);
} catch (error) {
  handleError(error, 'creating member');
}
```

#### Step 1.4: Update Components (30 minutes)
Apply `useApiError` hook to components with direct API calls:
- `IdentifiersManager.tsx`
- `ContactsManager.tsx`
- `EndpointManagement.tsx`
- `TokensManager.tsx`
- `MemberDetailView.tsx`
- `MemberRegistrationWizard.tsx`
- `Dashboard.tsx`
- `UserManagement.tsx`

### Testing Strategy
1. Trigger validation error (400) - should show specific message
2. Simulate auth failure (401) - should show "session expired"
3. Simulate server error (500) - should show generic "server error"
4. Verify no stack traces in browser console
5. Verify full errors logged to console.error (for debugging)

### Rollback Plan
If issues occur:
```bash
git revert <commit-sha>
```
Old behavior: errors exposed to users, but functionality works.

---

## Stage 2: SEC-009 - Remove Console Logging (2 hours)

**Goal:** Remove all console.log/debug/info statements, keep only console.error/warn

**Foundation:** Vite build already strips console.log/debug/info in production (vite.config.ts lines 56-58)

### Success Criteria
- [ ] All `console.log()` removed from 9 files
- [ ] All `console.debug()` removed
- [ ] `console.error()` kept for genuine errors
- [ ] `console.warn()` kept for warnings
- [ ] Vite build stripping verified in production bundle
- [ ] No sensitive data logged

### Implementation Steps

#### Step 2.1: Create Logger Utility (30 minutes)
Create `admin-portal/src/utils/logger.ts`:
```typescript
/**
 * Production-safe logger that respects environment
 * In production: Only error/warn go through (console.log/debug/info stripped by Vite)
 * In development: All levels work
 */

class Logger {
  private isDevelopment = import.meta.env.DEV;

  debug(message: string, ...args: unknown[]): void {
    if (this.isDevelopment) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.isDevelopment) {
      console.log(`[INFO] ${message}`, ...args);
    }
  }

  error(message: string, error?: unknown): void {
    console.error(`[ERROR] ${message}`, error);
  }

  warn(message: string, ...args: unknown[]): void {
    console.warn(`[WARN] ${message}`, ...args);
  }
}

export const logger = new Logger();
```

#### Step 2.2: Replace Console Calls (1 hour 30 minutes)

**File 1: IdentifiersManager.tsx (5 instances)**
```typescript
// Line 230, 258, 396, 468, 534
import { logger } from '../utils/logger';

// Replace console.error with logger.error
logger.error('Failed to acquire token:', error);
logger.error('Failed to delete identifier:', error);
logger.error('Failed to save identifier:', error);
logger.error('Failed to fetch LEI:', error);

// Replace console.debug with logger.debug (or remove if not needed)
logger.debug('No KvK verification status available yet');
```

**File 2-9: Similar pattern for:**
- AuthContext.tsx
- MemberDetailView.tsx
- KvkDocumentUpload.tsx
- TasksGrid.tsx
- auditLogService.ts
- MemberRegistrationWizard.tsx
- index.tsx
- UserManagement.tsx

#### Step 2.3: Add ESLint Rule (if time permits)
Update `.eslintrc.json`:
```json
{
  "rules": {
    "no-console": ["warn", {
      "allow": ["error", "warn"]
    }]
  }
}
```

### Testing Strategy
1. Run `npm run build` - verify no console.log in production bundle
2. Check `build/assets/*.js` - grep for "console.log" should find nothing
3. Manual testing - verify errors still show in dev console during development
4. Production testing - verify no debug logs in deployed app

### Rollback Plan
Simple revert - logger utility can coexist with old console calls.

---

## Stage 3: SEC-004 - CSRF Protection (4 hours)

**Goal:** Implement CSRF tokens for all state-changing operations

**Approach:** Double-submit cookie pattern (suitable for SPA + Azure Functions)

### Success Criteria
- [ ] CSRF token generated on login
- [ ] CSRF token included in all POST/PUT/DELETE/PATCH requests
- [ ] Backend validates CSRF token
- [ ] 403 Forbidden returned for invalid/missing tokens
- [ ] Tokens rotated on auth renewal
- [ ] Manual testing with curl confirms rejection without token

### Architecture Decision

**Why Double-Submit Cookie Pattern?**
1. Works well with Azure AD authentication (already using JWT)
2. No server-side session state required
3. Compatible with Azure Functions stateless architecture
4. Defense against cross-origin attacks

**How it works:**
1. On login, generate random CSRF token
2. Store in cookie (HttpOnly, Secure, SameSite=Strict)
3. Include same token in custom header (X-CSRF-Token)
4. Backend validates cookie matches header

### Implementation Steps

#### Step 3.1: Create CSRF Service (1 hour)
Create `admin-portal/src/services/csrfService.ts`:
```typescript
import { v4 as uuidv4 } from 'uuid';

const CSRF_COOKIE_NAME = 'XSRF-TOKEN';
const CSRF_HEADER_NAME = 'X-CSRF-Token';

export class CsrfService {
  /**
   * Generate and store CSRF token in cookie
   * Called on login and token refresh
   */
  generateToken(): string {
    const token = uuidv4();

    // Store in cookie (accessible to JavaScript for reading)
    document.cookie = `${CSRF_COOKIE_NAME}=${token}; Secure; SameSite=Strict; Path=/`;

    return token;
  }

  /**
   * Get current CSRF token from cookie
   */
  getToken(): string | null {
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === CSRF_COOKIE_NAME) {
        return value;
      }
    }
    return null;
  }

  /**
   * Remove CSRF token (on logout)
   */
  clearToken(): void {
    document.cookie = `${CSRF_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; Path=/`;
  }

  /**
   * Get header name for CSRF token
   */
  getHeaderName(): string {
    return CSRF_HEADER_NAME;
  }
}

export const csrfService = new CsrfService();
```

#### Step 3.2: Integrate into AuthContext (30 minutes)
Update `admin-portal/src/auth/AuthContext.tsx`:
```typescript
import { csrfService } from '../services/csrfService';

// After successful login:
const handleLogin = async () => {
  await msalInstance.loginPopup(loginRequest);
  csrfService.generateToken(); // Generate CSRF token
  // ... rest of login logic
};

// On token refresh:
const refreshToken = async () => {
  const response = await msalInstance.acquireTokenSilent({...});
  csrfService.generateToken(); // Rotate CSRF token
  return response.accessToken;
};

// On logout:
const handleLogout = async () => {
  csrfService.clearToken(); // Clear CSRF token
  await msalInstance.logoutPopup();
};
```

#### Step 3.3: Add CSRF to Axios Interceptor (1 hour)
Update `admin-portal/src/services/apiV2.ts`:
```typescript
import { csrfService } from './csrfService';

async function getAuthenticatedAxios() {
  const token = await getAccessToken();
  const csrfToken = csrfService.getToken();

  return axios.create({
    baseURL: API_BASE_URL,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(csrfToken ? { [csrfService.getHeaderName()]: csrfToken } : {}),
    },
  });
}
```

#### Step 3.4: Backend CSRF Validation (1 hour 30 minutes)
Update `api/src/middleware/auth.ts`:
```typescript
/**
 * Validate CSRF token for state-changing operations
 * Uses double-submit cookie pattern
 */
function validateCsrfToken(request: HttpRequest): boolean {
  const method = request.method.toUpperCase();

  // Only validate for state-changing operations
  if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    return true;
  }

  // Extract token from header
  const headerToken = request.headers.get('x-csrf-token');

  // Extract token from cookie
  const cookieHeader = request.headers.get('cookie');
  let cookieToken: string | null = null;

  if (cookieHeader) {
    const cookies = cookieHeader.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'XSRF-TOKEN') {
        cookieToken = value;
        break;
      }
    }
  }

  // Both must exist and match
  if (!headerToken || !cookieToken || headerToken !== cookieToken) {
    return false;
  }

  return true;
}

// Add to authentication middleware:
export async function authenticateRequest(
  request: HttpRequest,
  context: InvocationContext
): Promise<AuthResult> {
  // ... existing auth checks ...

  // Validate CSRF token
  if (!validateCsrfToken(request)) {
    context.warn('CSRF token validation failed', {
      security_issue: 'CSRF_VALIDATION_FAILED',
      method: request.method,
      url: request.url,
    });

    return {
      authenticated: false,
      error: 'CSRF token validation failed',
      statusCode: 403,
    };
  }

  return { authenticated: true, user };
}
```

### Testing Strategy
1. **Manual Testing:**
   ```bash
   # Should succeed (with CSRF token):
   curl -X POST https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1/members \
     -H "Authorization: Bearer $TOKEN" \
     -H "X-CSRF-Token: $CSRF_TOKEN" \
     -H "Cookie: XSRF-TOKEN=$CSRF_TOKEN" \
     -d '{"legal_name": "Test"}'

   # Should fail (missing CSRF token):
   curl -X POST https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1/members \
     -H "Authorization: Bearer $TOKEN" \
     -d '{"legal_name": "Test"}'
   ```

2. **UI Testing:**
   - Create member - should work
   - Update member - should work
   - Delete member - should work
   - Check browser DevTools - verify X-CSRF-Token header present

### Rollback Plan
CSRF validation is isolated in middleware. Can be disabled by commenting out validation:
```typescript
// Temporarily disable CSRF validation
if (false && !validateCsrfToken(request)) { ... }
```

---

## Stage 4: SEC-005 - Strengthen CSP (6 hours)

**Goal:** Remove `unsafe-inline` and `unsafe-eval` from Content-Security-Policy

**Challenge:** Kendo UI uses inline styles extensively

### Current CSP
```
Content-Security-Policy: default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval';
  style-src 'self' 'unsafe-inline' https://unpkg.com;
```

### Target CSP
```
Content-Security-Policy: default-src 'self';
  script-src 'self' 'nonce-{random}';
  style-src 'self' 'nonce-{random}' https://unpkg.com;
```

### Success Criteria
- [ ] CSP policy removes `unsafe-inline` and `unsafe-eval`
- [ ] Nonce-based CSP implemented for inline scripts/styles
- [ ] Kendo UI still functions correctly
- [ ] No CSP violations in browser console
- [ ] Manual testing of all Kendo components (grids, forms, dialogs)

### Implementation Steps

#### Step 4.1: Research Kendo UI CSP Compatibility (1 hour)
1. Check Kendo React documentation for CSP support
2. Test if Kendo UI 8.5.0 works without `unsafe-inline`
3. Identify components using inline styles
4. Document workarounds needed

**Research findings (to be completed):**
- Kendo UI React uses CSS modules (should be safe)
- Some components may require `unsafe-inline` for dynamic styling
- May need to refactor custom inline styles

#### Step 4.2: Implement Nonce-based CSP (2 hours)

**Challenge:** Static Web Apps don't support dynamic nonce generation

**Solution:** Use hash-based CSP instead of nonces:

1. Generate hashes for inline scripts/styles during build
2. Add hashes to CSP header
3. Azure Static Web Apps supports hash-based CSP

Create build script `admin-portal/scripts/generate-csp-hashes.js`:
```javascript
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Find all inline scripts/styles in built HTML
const indexPath = path.join(__dirname, '../build/index.html');
const html = fs.readFileSync(indexPath, 'utf8');

const scriptHashes = [];
const styleHashes = [];

// Extract inline scripts
const scriptRegex = /<script>([\s\S]*?)<\/script>/g;
let match;
while ((match = scriptRegex.exec(html)) !== null) {
  const content = match[1].trim();
  if (content) {
    const hash = crypto.createHash('sha256').update(content).digest('base64');
    scriptHashes.push(`'sha256-${hash}'`);
  }
}

// Extract inline styles
const styleRegex = /<style>([\s\S]*?)<\/style>/g;
while ((match = styleRegex.exec(html)) !== null) {
  const content = match[1].trim();
  if (content) {
    const hash = crypto.createHash('sha256').update(content).digest('base64');
    styleHashes.push(`'sha256-${hash}'`);
  }
}

console.log('Script hashes:', scriptHashes.join(' '));
console.log('Style hashes:', styleHashes.join(' '));

// Update staticwebapp.config.json
const configPath = path.join(__dirname, '../public/staticwebapp.config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

config.globalHeaders['Content-Security-Policy'] =
  `default-src 'self'; ` +
  `script-src 'self' ${scriptHashes.join(' ')}; ` +
  `style-src 'self' ${styleHashes.join(' ')} https://unpkg.com; ` +
  `img-src 'self' data: https:; ` +
  `font-src 'self' data: https://unpkg.com; ` +
  `connect-src 'self' https://func-ctn-demo-asr-dev.azurewebsites.net https://login.microsoftonline.com https://graph.microsoft.com; ` +
  `frame-ancestors 'none'`;

fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
console.log('Updated CSP in staticwebapp.config.json');
```

Update `package.json`:
```json
{
  "scripts": {
    "build": "vite build && node scripts/generate-csp-hashes.js"
  }
}
```

#### Step 4.3: Test Kendo UI Components (2 hours)
Systematic testing of all Kendo components after CSP change:

**Components to test:**
1. Grid (MembersGrid, IdentifiersManager, ContactsManager, TokensManager)
2. Forms (MemberForm, CompanyForm, ContactForm)
3. Dialogs (MemberDetailDialog, ConfirmDialog)
4. Dropdowns (DropDownList, ComboBox)
5. Date pickers
6. Buttons and button groups
7. Tabs (TabStrip)
8. Excel export functionality

**Testing checklist for each component:**
- [ ] Renders without CSP violations in console
- [ ] Interactive elements work (click, type, select)
- [ ] Styling appears correct (no missing CSS)
- [ ] Animations/transitions work
- [ ] Export functionality works

#### Step 4.4: Fix CSP Violations (1 hour buffer)
If violations occur:

1. **Identify violation:**
   ```
   Refused to execute inline script because it violates CSP directive...
   ```

2. **Solutions:**
   - Add hash to CSP for legitimate inline code
   - Refactor inline code to external file
   - Use Kendo UI's built-in CSP-safe alternatives

3. **Common fixes:**
   ```typescript
   // BEFORE (inline style):
   <div style={{ color: 'red' }}>Text</div>

   // AFTER (CSS class):
   <div className="text-red">Text</div>
   ```

### Testing Strategy
1. **Browser Console:**
   - Open DevTools Console
   - Filter for "Content Security Policy"
   - Verify no violations

2. **Manual Testing:**
   - Navigate through all admin portal pages
   - Interact with every Kendo component
   - Check Excel export
   - Verify dialogs and modals open/close

3. **Automated Testing:**
   - Run existing Playwright tests
   - All tests should pass without CSP errors

### Rollback Plan
If CSP breaks functionality:

**Quick rollback:**
```json
// admin-portal/public/staticwebapp.config.json
{
  "globalHeaders": {
    "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://unpkg.com; ..."
  }
}
```

Redeploy to Azure Static Web Apps - header change takes effect immediately.

---

## Dependencies

**No blocking dependencies** - all stages can proceed independently:

```
Stage 1 (SEC-008) ──┐
                    ├──> Stage 3 (SEC-004)
Stage 2 (SEC-009) ──┘

Stage 4 (SEC-005) ──> Independent (infrastructure change)
```

**Recommended order:**
1. SEC-008 (error messages) - Foundation for SEC-004
2. SEC-009 (console logging) - Quick win, supports SEC-008
3. SEC-004 (CSRF) - Depends on clean error handling
4. SEC-005 (CSP) - Most complex, test thoroughly

---

## Risk Assessment

### SEC-008 (Error Messages) - **LOW RISK**
- ✅ Foundation already exists
- ✅ No breaking changes to functionality
- ✅ Easy rollback

### SEC-009 (Console Logging) - **LOW RISK**
- ✅ Vite already strips in production
- ✅ Only affects debugging experience
- ✅ Logger utility provides safe alternative

### SEC-004 (CSRF) - **MEDIUM RISK**
- ⚠️ Changes authentication flow
- ⚠️ Backend + frontend coordination required
- ⚠️ Could break existing API consumers
- ✅ Isolated in middleware (easy to disable)

### SEC-005 (CSP) - **HIGH RISK**
- ⚠️ May break Kendo UI functionality
- ⚠️ Difficult to test comprehensively
- ⚠️ Affects all UI components
- ✅ Can rollback via config change only (no code changes)

---

## Testing Approach

### Unit Tests
- `errorHandler.ts` - test generic message generation
- `csrfService.ts` - test token generation/retrieval
- `logger.ts` - test conditional logging

### Integration Tests
- API calls with CSRF tokens
- Error handling end-to-end
- CSP policy enforcement

### E2E Tests (Playwright)
- Existing test suite should continue to pass
- Add CSRF token tests
- Add CSP violation detection

### Manual Testing Checklist
- [ ] Login/logout flow
- [ ] Create/update/delete member
- [ ] Create/update/delete identifier
- [ ] Create/update/delete contact
- [ ] Excel export functionality
- [ ] All Kendo UI components render correctly
- [ ] No CSP violations in browser console
- [ ] Error messages are user-friendly (not exposing stack traces)

---

## Commit Strategy

Follow conventional commits with security prefix:

```bash
# Stage 1
git commit -m "feat(security): Apply generic error handler to apiV2 service (SEC-008)"
git commit -m "feat(security): Create useApiError hook for components (SEC-008)"
git commit -m "feat(security): Update components to use generic error messages (SEC-008)"

# Stage 2
git commit -m "feat(security): Create production-safe logger utility (SEC-009)"
git commit -m "feat(security): Replace console calls with logger in 9 files (SEC-009)"

# Stage 3
git commit -m "feat(security): Create CSRF service with double-submit pattern (SEC-004)"
git commit -m "feat(security): Integrate CSRF into AuthContext (SEC-004)"
git commit -m "feat(security): Add CSRF headers to axios requests (SEC-004)"
git commit -m "feat(security): Add CSRF validation to backend middleware (SEC-004)"

# Stage 4
git commit -m "feat(security): Implement hash-based CSP build script (SEC-005)"
git commit -m "feat(security): Remove unsafe-inline and unsafe-eval from CSP (SEC-005)"
git commit -m "fix(security): Refactor Kendo inline styles for CSP compliance (SEC-005)"
```

---

## Documentation Updates

After completion, update:

1. **admin-portal/SECURITY_ANALYSIS.md** - Mark SEC-004/005/008/009 as RESOLVED
2. **docs/COMPLETED_ACTIONS.md** - Add entries for all 4 tasks
3. **docs/CODING_STANDARDS.md** - Add sections:
   - Error handling standards (use generic messages)
   - Logging standards (use logger utility)
   - CSRF token requirements for API calls
4. **admin-portal/README.md** - Security features section

---

## Success Metrics

**Before:**
- 4 CRITICAL security issues
- Detailed error messages exposed to users
- Console.log in 9 files
- CSP allows unsafe-inline and unsafe-eval

**After:**
- 0 CRITICAL security issues (SEC-004/005/008/009)
- Generic error messages only
- Production-safe logging with logger utility
- Hardened CSP policy
- CSRF protection on all state-changing operations

**Estimated Release Readiness Increase:** +8% (from current baseline)

---

## Notes

- **SEC-008 foundation already exists** - commit 9b0c0b0 created errorHandler.ts
- **SEC-009 build stripping already configured** - commit a8d92f2 added Vite esbuild drop config
- **Vite config shows precedent** - lines 56-58 already strip console in production
- **CSP is most complex** - may require Kendo UI refactoring, allocate buffer time
- **CSRF uses standard pattern** - double-submit cookie is industry best practice for SPAs
- **All changes are incremental** - no "big bang" deployment required

---

## Questions for User

Before starting implementation:

1. **SEC-004 (CSRF):** Should CSRF validation be enforced immediately or with grace period?
2. **SEC-005 (CSP):** If Kendo UI requires unsafe-inline, is partial CSP hardening acceptable?
3. **Priority:** Confirm implementation order (SEC-008 → SEC-009 → SEC-004 → SEC-005)?
4. **Testing:** Should we create dedicated E2E tests for security features?

---

**Ready to proceed with implementation once approved.**
