# E2E Testing Guide - Member Portal

Quick reference guide for running Member Portal E2E tests.

---

## Quick Start

### Phase 1: API Tests (Run First)

```bash
# Set your Azure AD access token
export ACCESS_TOKEN="your_access_token_here"

# Run API tests
cd /Users/ramondenoronha/Dev/DIL/ASR-full/portal
./api/tests/member-portal-api-tests.sh
```

### Phase 2: UI Tests (Only After API Tests Pass)

```bash
# Run Playwright tests
npx playwright test web/e2e/member-portal.spec.ts --project=chromium
```

---

## Test Files

### API Tests (curl-based)
- **Location:** `/portal/api/tests/member-portal-api-tests.sh`
- **Tests:** Member data, Contacts CRUD, Endpoints, Tokens
- **Runtime:** ~10-30 seconds

### UI Tests (Playwright)
- **Location:** `/portal/web/e2e/member-portal.spec.ts`
- **Tests:** 38 test cases covering all features
- **Runtime:** ~5-10 seconds

---

## Documentation

### Test Results
- **File:** `MEMBER_PORTAL_TEST_RESULTS.md`
- **Contains:** Detailed test execution report, pass/fail analysis

### Bug Report
- **File:** `MEMBER_PORTAL_BUG_REPORT.md`
- **Contains:** 3 identified bugs with fix recommendations

### Deliverables Summary
- **File:** `MEMBER_PORTAL_TEST_DELIVERABLES.md`
- **Contains:** Complete overview of all test deliverables

---

## Test Results Summary

**Last Run:** October 17, 2025

- ✅ **15 tests passed** (39.5%)
- ❌ **3 tests failed** (7.9%)
- ⏸️ **20 tests skipped** (52.6%)

### Bugs Found
1. **BUG-001:** Navigation menu not found (MEDIUM)
2. **BUG-002:** Missing logo assets (LOW)
3. **BUG-003:** No 404 error page (LOW)

---

## Getting an Access Token

To run authenticated API tests, you need an Azure AD access token:

1. Visit https://calm-pebble-043b2db03.1.azurestaticapps.net
2. Open browser DevTools → Console
3. Run: `localStorage.getItem('msal.token')`
4. Copy the token
5. Export: `export ACCESS_TOKEN='your_token'`

---

## CI/CD Integration

Tests can be integrated into Azure DevOps pipelines:

```yaml
- script: |
    export ACCESS_TOKEN=$(MEMBER_ACCESS_TOKEN)
    ./api/tests/member-portal-api-tests.sh
  displayName: 'API Tests'

- script: |
    npx playwright test web/e2e/member-portal.spec.ts
  displayName: 'UI Tests'
```

---

## View Test Reports

```bash
# View HTML report
npx playwright show-report

# View results summary
cat web/e2e/MEMBER_PORTAL_TEST_RESULTS.md

# View bug report
cat web/e2e/MEMBER_PORTAL_BUG_REPORT.md
```

---

## Testing Philosophy

**API-First Testing:**
1. Test API endpoints with curl BEFORE testing UI
2. Catches 404/500 errors immediately
3. Isolates API issues from UI issues
4. Faster than UI testing

**UI Testing:**
1. Only run AFTER API tests pass
2. Tests user workflows through browser
3. Verifies UI correctly calls API endpoints
4. Builds regression test battery

---

## Need Help?

- **Test Results:** `MEMBER_PORTAL_TEST_RESULTS.md`
- **Bug Report:** `MEMBER_PORTAL_BUG_REPORT.md`
- **Deliverables:** `MEMBER_PORTAL_TEST_DELIVERABLES.md`

---

**Created:** October 17, 2025
**Test Engineer:** TE Agent (Automated)
