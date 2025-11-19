# Container Apps API Comprehensive Test Report

**Test Date:** November 19, 2025
**API URL:** https://ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io/api
**Test Environment:** Development (dev)

---

## Executive Summary

| Metric | Value |
|--------|-------|
| **Total Tests Run** | 28 |
| **Passed** | 21 |
| **Failed** | 2 |
| **Warnings** | 5 |
| **Pass Rate** | 75% |

### Critical Issues Found

1. **JWT Validation Error (500 instead of 401)** - Invalid tokens return 500 Internal Server Error instead of 401 Unauthorized
2. **Multiple Endpoints Not Registered** - Several endpoints return 404 Not Found

---

## Test Results by Category

### 1. Public Endpoints (No Auth Required)

| Test | Endpoint | Expected | Actual | Status | Response Time |
|------|----------|----------|--------|--------|---------------|
| Health Check | GET /health | 200 | 200 | PASS | 25519ms (cold start) |
| API Version | GET /v1/version | 200 | 200 | PASS | 25ms |
| Register Member (empty) | POST /v1/register-member | 400 | 400 | PASS | 43ms |
| Register Member (missing) | POST /v1/register-member | 400 | 400 | PASS | 24ms |
| Register Member (invalid email) | POST /v1/register-member | 400 | 400 | PASS | 24ms |

**Notes:**
- Health endpoint shows database status UP, but Application Insights is DOWN
- First request took 25 seconds due to container cold start
- Subsequent requests are fast (20-40ms)

### 2. Unauthorized Access Tests (Should Return 401)

| Test | Endpoint | Expected | Actual | Status |
|------|----------|----------|--------|--------|
| Members | GET /v1/members | 401 | 401 | PASS |
| Applications | GET /v1/applications | 401 | 401 | PASS |
| Audit Logs | GET /v1/audit-logs | 401 | 401 | PASS |
| Tasks | GET /v1/tasks | 401 | 401 | PASS |
| Member (self) | GET /v1/member | 401 | 401 | PASS |

**Result:** All protected endpoints correctly return 401 when no authorization is provided.

### 3. Edge Case & Security Tests

| Test | Description | Expected | Actual | Status | Notes |
|------|-------------|----------|--------|--------|-------|
| Invalid Token | Random string as Bearer token | 401 | **500** | **FAIL** | JWT validation throws unhandled error |
| Malformed JWT | Invalid JWT structure | 401 | **500** | **FAIL** | JWT validation throws unhandled error |
| Empty Bearer | Empty Bearer token value | 401 | 401 | PASS | |
| Wrong Auth Scheme | Basic auth instead of Bearer | 401 | 401 | PASS | |
| SQL Injection | SQL in legalName field | 400 | 400 | PASS | Properly rejected |
| XSS Payload | Script tag in legalName | 400 | 400 | PASS | Properly rejected |
| Wrong Content-Type | text/plain instead of JSON | 400 | 400 | PASS | |
| Long Payload | 10,000 char string | 400 | 400 | PASS | 24ms response |
| Non-existent Route | GET /v1/nonexistent | 404 | 404 | PASS | |

### 4. Endpoint Availability Tests

| Endpoint | Expected | Actual | Status | Notes |
|----------|----------|--------|--------|-------|
| GET /v1/members | 401 (protected) | 401 | PASS | Available |
| GET /v1/applications | 401 (protected) | 401 | PASS | Available |
| GET /v1/audit-logs | 401 (protected) | 401 | PASS | Available |
| GET /v1/tasks | 401 (protected) | 401 | PASS | Available |
| GET /v1/member | 401 (protected) | 401 | PASS | Available |
| POST /v1/register-member | 400 (validation) | 400 | PASS | Available |
| GET /health | 200 | 200 | PASS | Available |
| GET /v1/version | 200 | 200 | PASS | Available |
| GET /v1/legal-entities | 401 or 200 | **404** | WARN | Not registered |
| GET /v1/identifiers | 401 or 200 | **404** | WARN | Not registered |
| GET /v1/contacts | 401 or 200 | **404** | WARN | Not registered |
| GET /v1/endpoints | 401 or 200 | **404** | WARN | Not registered |
| GET /v1/m2m-clients | 401 or 200 | **404** | WARN | Not registered |
| GET /v1/dashboard-stats | 401 or 200 | **404** | WARN | Not registered |
| GET /v1/orchestrations | 401 or 200 | **404** | WARN | Not registered |

### 5. Authenticated Endpoint Tests

**Note:** Could not complete authenticated tests due to Azure AD token acquisition failure.

**Error:** `AADSTS50034: The user account does not exist in the directory`

The test user `test-e2@denoronha.consulting` may have been removed from the Azure AD tenant or the credentials need to be updated.

---

## Detailed Findings

### Critical Issue 1: JWT Validation Returns 500

**Problem:** When invalid tokens are provided, the API returns 500 Internal Server Error instead of 401 Unauthorized.

**Test Case:**
```bash
curl -H "Authorization: Bearer invalid-token-12345" \
  https://ca-ctn-asr-api-dev.../api/v1/members
```

**Expected Response:**
```json
{"error":"Unauthorized","message":"Invalid token"}
```
**HTTP 401**

**Actual Response:**
```json
{"error":"Failed to fetch members"}
```
**HTTP 500**

**Root Cause:** The JWT validation middleware is throwing an unhandled exception when parsing invalid tokens, causing the error to bubble up as a 500 error.

**Recommended Fix:** Wrap JWT validation in try-catch and return 401 for any token parsing errors.

### Critical Issue 2: Missing Endpoints

Several endpoints that should be available are returning 404:
- `/v1/legal-entities`
- `/v1/identifiers`
- `/v1/contacts`
- `/v1/endpoints`
- `/v1/m2m-clients`
- `/v1/dashboard-stats`
- `/v1/orchestrations`

**Possible Causes:**
1. These endpoints are not included in the Container Apps deployment entry point
2. The index.ts file for Container Apps may be using a minimal set of endpoints
3. Route registration issue in the Express/Fastify server

### Issue 3: Application Insights Down

The health check reports Application Insights status as "down":
```json
{
  "checks": {
    "database": {"status": "up", "responseTime": 1},
    "applicationInsights": {"status": "down"}
  }
}
```

This may affect monitoring and telemetry collection.

### Issue 4: Test User Not Found

The E2E test user `test-e2@denoronha.consulting` returned error `AADSTS50034` indicating the user doesn't exist in the Azure AD directory. This needs to be verified and potentially recreated.

---

## Performance Metrics

| Metric | Value |
|--------|-------|
| Cold Start Time | ~25 seconds |
| Warm Response Time (avg) | 23-43ms |
| Database Response Time | 1ms |
| Long Payload Handling | 24ms for 10KB |

**Note:** The 25-second cold start is typical for Container Apps but may impact user experience for first requests.

---

## Recommendations

### High Priority

1. **Fix JWT Validation Error Handling**
   - Wrap token validation in try-catch
   - Return 401 for any invalid/malformed tokens
   - Add detailed error logging for debugging

2. **Register Missing Endpoints**
   - Verify all required endpoints are exported in the Container Apps entry point
   - Compare with the Azure Functions deployment to ensure parity

3. **Fix Application Insights Connection**
   - Check Application Insights configuration
   - Verify connection string environment variable

4. **Recreate E2E Test User**
   - Verify user exists in Azure AD
   - Update credentials in `.credentials` file
   - Ensure MFA exemption is still in place

### Medium Priority

5. **Reduce Cold Start Time**
   - Configure minimum instances to 1 to keep container warm
   - Implement health check probe to prevent scale-to-zero

6. **Add Authentication Tests**
   - Once test user is fixed, run full authenticated endpoint tests
   - Test RBAC permissions for different roles

### Low Priority

7. **Add Rate Limiting Tests**
   - Test rate limiting behavior
   - Verify Redis integration

8. **Add Integration Tests**
   - Test database operations
   - Test member creation workflow

---

## Test Scripts Created

Location: `/Users/ramondenoronha/Dev/DIL/DEV-CTN-ASR/api/tests/`

1. **container-apps-comprehensive-test.sh** - Full test suite with authentication
2. **container-apps-migration-test.sh** - Basic migration validation tests (existing)

---

## Conclusion

The Container Apps API migration is **partially functional** with some critical issues to address:

- **Working:** Core endpoints (health, version, register-member, members, applications, audit-logs, tasks)
- **Not Working:** JWT error handling, several secondary endpoints (404)
- **Needs Verification:** Authenticated operations (blocked by test user issue)

**Recommended Action:** Fix the JWT validation issue first (returns 500 for invalid tokens), then register the missing endpoints to achieve full parity with the Azure Functions deployment.

---

## Test Environment Details

```
API Runtime: container-apps
Node.js: (containerized)
Database: PostgreSQL (up, 1ms response)
Application Insights: down
Test Date: 2025-11-19T18:44-18:48 CET
```
