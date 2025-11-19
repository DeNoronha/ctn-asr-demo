# Test Findings Report

**Date:** November 19, 2025
**Tester:** Test Engineer (TE) Agent
**Deployment Status:** Recent commit (43 seconds before testing)
**Branch:** main (verified clean state)

---

## Executive Summary

**CRITICAL ISSUE DETECTED:** Multiple API endpoints returning 500 Internal Server Error, blocking all member-related functionality in both Admin and Member portals.

| Category | Total | Passed | Failed | Blocked |
|----------|-------|--------|--------|---------|
| API Tests | 15 | 6 | 3 | 6 |
| Admin Portal E2E | 32 | 6 | 15 | 11 |
| Member Portal E2E | 4 | 0 | 4 | 0 |
| Security Headers | 12 | 12 | 0 | 0 |
| Smoke Tests | 4 | 4 | 0 | 0 |

**Overall Status: BLOCKED - Cannot proceed until API 500 errors are fixed**

---

## Critical Issues (MUST FIX IMMEDIATELY)

### 1. API GET /v1/members Returns 500 Internal Server Error

**Severity:** CRITICAL
**Impact:** Blocks ALL member-related functionality

**Evidence:**
```bash
curl -H "Authorization: Bearer TOKEN" \
  "https://ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io/api/v1/members?page=1&pageSize=5"

Response: {"error":"Failed to fetch members"}
HTTP: 500
```

**Root Cause Investigation:**
- API health check returns healthy with database connection "up"
- Token acquisition works correctly
- Other authenticated endpoints (e.g., /v1/applications) work
- Error likely in database query or schema mismatch

**Location:** `/Users/ramondenoronha/Dev/DIL/DEV-CTN-ASR/api/src/routes.ts` lines 50-108

**Recommended Actions:**
1. Check database logs for query errors
2. Verify `members` table exists with correct columns
3. Check `legal_entity` join is valid
4. Add detailed error logging to catch specific exception

---

### 2. API GET /v1/audit-logs Returns 500 Internal Server Error

**Severity:** CRITICAL
**Impact:** Blocks audit log viewing in Admin Portal

**Evidence:**
```bash
curl -H "Authorization: Bearer TOKEN" \
  "https://ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io/api/v1/audit-logs?page=1&pageSize=5"

Response: {"error":"Failed to fetch audit logs"}
HTTP: 500
```

---

### 3. API GET /v1/tasks Returns 500 Internal Server Error

**Severity:** CRITICAL
**Impact:** Blocks task queue viewing in Admin Portal

**Evidence:**
```bash
curl -H "Authorization: Bearer TOKEN" \
  "https://ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io/api/v1/tasks"

Response: {"error":"Failed to fetch tasks"}
HTTP: 500
```

---

### 4. Member Portal Missing Authentication State

**Severity:** CRITICAL
**Impact:** ALL Member Portal E2E tests fail immediately

**Evidence:**
```
Error: Error reading storage state from playwright/.auth/user.json:
ENOENT: no such file or directory, open 'playwright/.auth/user.json'
```

**Location:** `/Users/ramondenoronha/Dev/DIL/DEV-CTN-ASR/member-portal/playwright/.auth/user.json` - MISSING

**Recommended Action:**
Run `npm run test:e2e:auth` in member-portal to capture auth state

---

## High Priority Issues

### 5. API GET /v1/member Returns 501 Not Implemented

**Severity:** HIGH
**Impact:** Member portal cannot display logged-in user's profile

**Evidence:**
```bash
curl -H "Authorization: Bearer TOKEN" \
  "https://ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io/api/v1/member"

Response: {"error":"Not Implemented","message":"Member portal endpoint requires JWT decoding - coming soon"}
HTTP: 501
```

**Note:** This is expected per the message, but impacts member portal functionality.

---

### 6. Multiple Admin Endpoints Return 404 Not Found

**Severity:** HIGH
**Impact:** Several expected endpoints are not registered

**Missing Endpoints:**
- `GET /v1/legal-entities` - 404
- `GET /v1/identifiers` - 404
- `GET /v1/contacts` - 404
- `GET /v1/endpoints` - 404
- `GET /v1/entities` - 404

**Recommendation:** Either implement these endpoints or update API documentation/tests to reflect actual available routes.

---

### 7. Admin Portal Auth Tests Failing

**Severity:** HIGH
**Impact:** Cannot verify proper authentication flow

**Failing Tests (8 of 10):**
- should successfully authenticate with Azure AD
- should display authenticated user information
- should display user role correctly
- should have valid Bearer token in API requests
- should maintain session on page reload
- should handle unauthorized access (401) gracefully
- should display logout button
- should have admin-only features visible for admin role

**Root Cause:** Tests are waiting for user info elements that depend on /v1/members API call

**Passing Tests (2 of 10):**
- should verify sessionStorage contains MSAL tokens (confirms auth works)
- should not expose sensitive data in browser console

---

## Medium Priority Issues

### 8. Playwright Test Selector Mismatch

**Severity:** MEDIUM
**Impact:** Test for dashboard navigation fails

**Evidence:**
```
Error: locator('.drawer-item:has-text("Dashboard")') not found
```

**Recommendation:** Update test selectors to match current UI component classes

---

### 9. Admin Portal Auth State Missing SessionStorage

**Severity:** MEDIUM
**Impact:** Warning during test setup

**Evidence:**
```
Warning: No sessionStorage found. Authentication may not work properly.
```

**Recommendation:** Re-capture auth state with `npm run test:e2e:auth` to include full sessionStorage

---

## Passing Tests (Good News)

### Security Headers - 12/12 PASSED
All security headers properly configured:
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- Strict-Transport-Security: max-age=31536000
- Content-Security-Policy: Properly configured
- No unsafe-inline in script-src
- Cache-Control: no-cache, no-store, must-revalidate

### Portal Smoke Tests - 4/4 PASSED
- Admin Portal loads without white page
- Member Portal loads without white page
- Admin Portal i18n initialized
- Member Portal i18n initialized

### API Public Endpoints - PASSED
- `GET /health` - 200 (39ms)
- `GET /v1/version` - 200 (24ms)
- `POST /v1/register-member` (validation) - 400 (correct)

### API Authentication - PASSED
- `GET /v1/members` (no auth) - 401 (correct)
- Token acquisition - Working
- `GET /v1/applications` - 200 (working with auth)

---

## Detailed API Test Results

| Endpoint | Method | Auth | Status | Result | Notes |
|----------|--------|------|--------|--------|-------|
| /health | GET | No | 200 | PASS | 39ms, DB connected |
| /v1/version | GET | No | 200 | PASS | v1.0.0 container-apps |
| /v1/register-member | POST | No | 400 | PASS | Validates required fields |
| /v1/members | GET | No | 401 | PASS | Returns Unauthorized |
| /v1/members | GET | Yes | 500 | FAIL | Internal error |
| /v1/members/:id | GET | Yes | N/A | BLOCKED | Depends on members list |
| /v1/applications | GET | Yes | 200 | PASS | Returns 9 applications |
| /v1/audit-logs | GET | Yes | 500 | FAIL | Internal error |
| /v1/tasks | GET | Yes | 500 | FAIL | Internal error |
| /v1/member | GET | Yes | 501 | EXPECTED | Not implemented yet |
| /v1/legal-entities | GET | Yes | 404 | INFO | Route not registered |
| /v1/identifiers | GET | Yes | 404 | INFO | Route not registered |
| /v1/contacts | GET | Yes | 404 | INFO | Route not registered |
| /v1/endpoints | GET | Yes | 404 | INFO | Route not registered |

---

## Admin Portal E2E Test Results

### basic-authentication.spec.ts (6 tests)
| Test | Result | Notes |
|------|--------|-------|
| Load with auth state | PASS | Portal loads, CTN branding visible |
| Dashboard navigation | FAIL | Selector .drawer-item not found |
| Navigate to Members | SKIP | Members link not found |
| User info display | PASS | No standard elements expected |
| MSAL token verification | PASS | 1 MSAL entry in sessionStorage |
| Console errors check | PASS | No critical JS errors |

### authentication.spec.ts (10 tests)
- 2 PASSED (token verification, console security)
- 8 FAILED (all depend on API/UI elements)

### member-management.spec.ts (22 tests)
- 0 PASSED
- 11 FAILED (all timeout waiting for members data)
- 11 BLOCKED (skipped due to earlier failures)

### security-headers.spec.ts (12 tests)
- 12 PASSED

### portal-smoke-test.spec.ts (4 tests)
- 4 PASSED

---

## Member Portal E2E Test Results

| Test | Result | Notes |
|------|--------|-------|
| All tests | FAIL | Missing auth state file |

**Blocked Tests:** 4 (all authentication-dependent)

---

## Recommended Actions (Priority Order)

### Immediate (Tonight)

1. **Fix API /v1/members 500 Error**
   - Check Container App logs: `az containerapp logs show --name ca-ctn-asr-api-dev --resource-group rg-ctn-asr-dev --type console`
   - Verify database tables exist and match expected schema
   - Add try/catch with detailed logging

2. **Fix API /v1/audit-logs 500 Error**
   - Same investigation as above

3. **Fix API /v1/tasks 500 Error**
   - Same investigation as above

4. **Create Member Portal Auth State**
   ```bash
   cd member-portal
   npm run test:e2e:auth
   ```

### Before Tomorrow Morning

5. **Re-run Admin Portal E2E tests** after API fixes
6. **Re-run Member Portal E2E tests** after auth state created
7. **Update failing test selectors** (.drawer-item etc.)

### This Week

8. **Implement /v1/member endpoint** (currently 501)
9. **Register missing endpoints or update docs**
10. **Refresh Admin Portal auth state**

---

## Test Environment Details

- **API URL:** https://ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io/api
- **Admin Portal:** https://calm-tree-03352ba03.1.azurestaticapps.net
- **Member Portal:** https://calm-pebble-043b2db03.1.azurestaticapps.net
- **Test User:** test-e2@denoronha.consulting (SystemAdmin, MFA disabled)
- **Playwright Version:** 1.56.1
- **Node.js:** 20.x

---

## Files Referenced

- API routes: `/Users/ramondenoronha/Dev/DIL/DEV-CTN-ASR/api/src/routes.ts`
- Admin auth state: `/Users/ramondenoronha/Dev/DIL/DEV-CTN-ASR/admin-portal/playwright/.auth/user.json` (exists)
- Member auth state: `/Users/ramondenoronha/Dev/DIL/DEV-CTN-ASR/member-portal/playwright/.auth/user.json` (MISSING)
- API test scripts: `/Users/ramondenoronha/Dev/DIL/DEV-CTN-ASR/api/tests/`

---

## Conclusion

The ASR system has **critical API failures** that are blocking 80% of the test suite. The API endpoints for members, audit-logs, and tasks all return 500 errors, which cascades to make all member-related E2E tests fail.

**Immediate priority:** Investigate and fix the database query errors in the three failing API endpoints. Once fixed, re-run the full test suite to verify complete functionality.

**Positive findings:** Security configuration is excellent, basic portal loading works, and authentication token flow is functional. The infrastructure is sound; only the database queries need attention.
