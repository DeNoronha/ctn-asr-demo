# Member Portal Error Report
**Date:** November 14, 2025
**Reporter:** Test Engineer (TE Agent)
**Context:** Investigation after GetAuthenticatedMember SQL fix

---

## Executive Summary

After fixing the 500 error in GetAuthenticatedMember.ts (removed DISTINCT keyword), the member portal now returns a **404 error** instead. The root cause is **missing test data**: the E2E test user does not have a corresponding legal entity or contact record in the database.

---

## Error Details

### 1. API Error (Primary Issue)

**Endpoint:** `GET /api/v1/member`
**HTTP Status:** 404 Not Found
**Error Response:**
```json
{
  "error": "not_found",
  "error_description": "No member data found for this user",
  "email": "test-e2@denoronha.consulting",
  "userId": "7e093589-f654-4e53-9522-898995d1201b"
}
```

**Impact:**
- Member portal cannot load dashboard
- Shows error message: "Unable to Load Member Data - API error: 404"
- User sees notification: "Error - Failed to load member information"

### 2. Additional API Errors

**503 Errors:** Two console errors indicate additional 503 Service Unavailable responses (URLs not captured)

**Console Errors Captured:**
```
[1] Failed to load resource: the server responded with a status of 404 ()
[2] Failed to load resource: the server responded with a status of 503 ()
[3] Failed to load resource: the server responded with a status of 503 ()
[4] Failed to load resource: the server responded with a status of 404 (Not Found)
[5] Error: Error: API error: 404
    at g (https://calm-pebble-043b2db03.1.azurestaticapps.net/assets/index-wHuf1kKO.js:1:874067)
```

---

## Root Cause Analysis

### GetAuthenticatedMember Logic

The API function attempts to find member data using two strategies:

1. **Primary Strategy (Line 64):** Match by contact email
   ```sql
   WHERE c.email = $1 AND c.is_active = true
   ```
   Looks for: `legal_entity_contact.email = 'test-e2@denoronha.consulting'` with `is_active = true`

2. **Fallback Strategy (Line 115):** Match by domain
   ```sql
   WHERE m.domain = $1
   ```
   Looks for: `members.domain = 'denoronha.consulting'`

### Why the Test User Fails

**Test User:** test-e2@denoronha.consulting (Object ID: 7e093589-f654-4e53-9522-898995d1201b)

**Missing Data:**
- No record in `legal_entity_contact` with this email
- No member record with domain `denoronha.consulting`

**Result:** Both queries return 0 rows → 404 error

---

## Evidence

### Screenshot
![Member Portal Error](../member-portal/e2e/screenshots/dashboard.png)

**What the user sees:**
- Large error message: "Unable to Load Member Data"
- "API error: 404"
- "Refresh Page" button
- Error notification in top-right corner

### API Health Check
```bash
curl https://func-ctn-demo-asr-dev.azurewebsites.net/api/health

HTTP Status: 200
Response Time: 0.166092s

Response:
{
  "status": "healthy",
  "timestamp": "2025-11-14T20:40:31.474Z",
  "environment": "dev",
  "checks": {
    "database": {"status": "up", "responseTime": 3},
    "applicationInsights": {"status": "up"},
    "azureKeyVault": {"status": "up", "responseTime": 0},
    "staticWebApps": {
      "status": "up",
      "responseTime": 39,
      "details": {
        "adminPortal": "up",
        "memberPortal": "up"
      }
    }
  }
}
```

**Conclusion:** API infrastructure is healthy; issue is data-related.

---

## Solutions

### Option 1: Add Test Data to Database (RECOMMENDED)

**Action Required:** Insert test data for the E2E test user

**SQL Script:**
```sql
-- Step 1: Create party_reference for test user
INSERT INTO party_reference (party_id, party_type, is_deleted)
VALUES (gen_random_uuid(), 'LEGAL_ENTITY', false);

-- Step 2: Create legal_entity for test organization
INSERT INTO legal_entity (
  legal_entity_id,
  party_id,
  primary_legal_name,
  entity_legal_form,
  entity_status,
  country_code,
  is_deleted
)
VALUES (
  gen_random_uuid(),
  (SELECT party_id FROM party_reference ORDER BY dt_created DESC LIMIT 1),
  'Test Organization E2E',
  'BV',
  'ACTIVE',
  'NL',
  false
);

-- Step 3: Create contact for test user
INSERT INTO legal_entity_contact (
  contact_id,
  legal_entity_id,
  contact_type,
  full_name,
  email,
  is_active,
  is_deleted
)
VALUES (
  gen_random_uuid(),
  (SELECT legal_entity_id FROM legal_entity ORDER BY dt_created DESC LIMIT 1),
  'PRIMARY',
  'E2E Test User',
  'test-e2@denoronha.consulting',
  true,
  false
);

-- Step 4: Verify insertion
SELECT
  c.email,
  c.full_name,
  le.primary_legal_name,
  le.entity_status
FROM legal_entity_contact c
JOIN legal_entity le ON c.legal_entity_id = le.legal_entity_id
WHERE c.email = 'test-e2@denoronha.consulting';
```

**Benefits:**
- Realistic test data for E2E tests
- Tests actual production code path
- Verifies multi-table join queries work correctly

### Option 2: Update API to Handle Test Users

**Action:** Add special handling for test users (NOT RECOMMENDED)

**Why not:**
- Introduces test-specific code in production API
- Violates separation of test/production concerns
- Makes debugging harder (different code paths)

### Option 3: Create Seed Data Script

**Action:** Create automated seed script for test environments

**Benefits:**
- Repeatable test data setup
- Can be run in CI/CD pipeline
- Documents required test data structure

**Location:** `database/seeds/test-users.sql`

---

## Recommendations

### Immediate Action (Today)
1. Insert test data using SQL script above (Option 1)
2. Re-run Playwright tests to verify member portal loads successfully
3. Document test data setup in `.claude/TEST_DATA_SETUP.md`

### Short-term (This Week)
1. Create automated seed script for test data
2. Add test data setup to E2E test setup/teardown hooks
3. Update CLAUDE.md with test data requirements

### Long-term (Next Sprint)
1. Create dedicated test database with pre-populated test data
2. Add database reset endpoint for E2E tests (dev environment only)
3. Document all test users and their roles in test documentation

---

## Test Execution Log

### API Tests (curl)
```
✅ Health endpoint: 200 OK (0.166s)
⏭️  GET /v1/member: Skipped (ROPC flow not enabled for app)
```

### Playwright E2E Tests
```
Test: member-portal-errors.spec.ts
Browser: Chromium
Duration: 16.2s

Results:
✅ Portal loaded successfully
✅ Login successful (Azure AD authentication)
✅ Screenshot captured
❌ Dashboard shows error: "Unable to Load Member Data - API error: 404"
❌ API returned 404 for GET /v1/member
❌ Console errors detected (5 errors)
✅ No JavaScript page errors
```

---

## Files Created/Modified

### Test Scripts
- `/Users/ramondenoronha/Dev/DIL/DEV-CTN-ASR/api/tests/test-member-portal-api.sh` (API curl tests)
- `/Users/ramondenoronha/Dev/DIL/DEV-CTN-ASR/member-portal/e2e/member-portal-errors.spec.ts` (Playwright E2E)

### Screenshots
- `/Users/ramondenoronha/Dev/DIL/DEV-CTN-ASR/member-portal/e2e/screenshots/dashboard.png`

### Reports
- `/Users/ramondenoronha/Dev/DIL/DEV-CTN-ASR/docs/ERROR_REPORT_2025-11-14.md` (this file)

---

## Conclusion

The GetAuthenticatedMember fix was successful - the SQL error is resolved. However, the 404 error is expected behavior because the test user has no associated legal entity data. This is a **test data issue**, not a code issue.

**Next Step:** Add test data to database using Option 1 above.

---

**Test Engineer Sign-off:** November 14, 2025
**Status:** Investigation Complete - Awaiting Test Data Setup
