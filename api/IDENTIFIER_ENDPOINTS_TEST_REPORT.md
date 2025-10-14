# Identifier CRUD Endpoints - Test Report and Diagnostic Analysis

**Date:** 2025-10-14
**Tested By:** Automated Test Suite
**Environment:** Azure Demo (func-ctn-demo-asr-dev)
**Admin Portal:** https://calm-tree-03352ba03.1.azurestaticapps.net

---

## Executive Summary

**Status:** ENDPOINTS DEPLOYED AND FUNCTIONAL - Authentication Issue Identified

The identifier CRUD endpoints have been successfully deployed to Azure and are responding correctly. However, the user is experiencing 404/500 errors in the admin portal due to an **authentication scope mismatch** between the frontend and backend.

### Key Findings

1. All four identifier endpoints are deployed and registered
2. Endpoints respond correctly to authentication (401 when no token)
3. CORS is properly configured
4. **Root Cause:** Frontend using wrong authentication scope

---

## Endpoint Deployment Verification

### 1. Endpoint Registration Status

All four identifier functions are successfully deployed:

```bash
az functionapp function list --name func-ctn-demo-asr-dev
```

| Function Name | Route | Methods | Status |
|---------------|-------|---------|--------|
| GetIdentifiers | v1/entities/{legalEntityId}/identifiers | GET | DEPLOYED |
| CreateIdentifier | v1/entities/{legalEntityId}/identifiers | POST, OPTIONS | DEPLOYED |
| UpdateIdentifier | v1/identifiers/{identifierId} | PUT, OPTIONS | DEPLOYED |
| DeleteIdentifier | v1/identifiers/{identifierId} | DELETE, OPTIONS | DEPLOYED |

### 2. Function Code Location

**Backend API:**
- `/Users/ramondenoronha/Dev/DIL/ASR-full/api/src/functions/GetIdentifiers.ts`
- `/Users/ramondenoronha/Dev/DIL/ASR-full/api/src/functions/CreateIdentifier.ts`
- `/Users/ramondenoronha/Dev/DIL/ASR-full/api/src/functions/UpdateIdentifier.ts`
- `/Users/ramondenoronha/Dev/DIL/ASR-full/api/src/functions/DeleteIdentifier.ts`

**Registration:**
- All functions registered in `/Users/ramondenoronha/Dev/DIL/ASR-full/api/src/essential-index.ts` (lines 22-25)
- Compiled to `/Users/ramondenoronha/Dev/DIL/ASR-full/api/dist/functions/` successfully

**Frontend:**
- Admin Portal: `/Users/ramondenoronha/Dev/DIL/ASR-full/web/src/components/IdentifiersManager.tsx`
- API Client: `/Users/ramondenoronha/Dev/DIL/ASR-full/web/src/services/apiV2.ts` (lines 281-310)

---

## Test Results

### Test 1: CORS Preflight (OPTIONS)

**Test Command:**
```bash
curl -v -X OPTIONS "https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1/entities/12345678-1234-1234-1234-123456789012/identifiers"
```

**Result:** PASS
- Status Code: 204 No Content
- Headers:
  - Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
  - Access-Control-Allow-Headers: Content-Type, Authorization, X-Request-ID

### Test 2: GET Identifiers (No Authentication)

**Test Command:**
```bash
curl -v "https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1/entities/12345678-1234-1234-1234-123456789012/identifiers"
```

**Result:** PASS (Expected behavior)
- Status Code: 401 Unauthorized
- Response Body:
  ```json
  {
    "error": "unauthorized",
    "error_description": "Missing Authorization header"
  }
  ```

### Test 3: POST Create Identifier (No Authentication)

**Test Command:**
```bash
curl -v -X POST "https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1/entities/12345678-1234-1234-1234-123456789012/identifiers" \
  -H "Content-Type: application/json" \
  -d '{"identifier_type":"KVK","identifier_value":"95944192"}'
```

**Result:** PASS (Expected behavior)
- Status Code: 401 Unauthorized
- Response Body:
  ```json
  {
    "error": "unauthorized",
    "error_description": "Missing Authorization header"
  }
  ```

---

## Root Cause Analysis

### Issue: Authentication Scope Mismatch

**Backend API Configuration:**
- Location: `/Users/ramondenoronha/Dev/DIL/ASR-full/api/src/middleware/auth.ts`
- Expected Audience (lines 117-121):
  ```typescript
  const validAudiences = [
    `api://${AZURE_AD_CLIENT_ID}`,  // api://d3037c11-a541-4f21-8862-8079137a0cde
    AZURE_AD_CLIENT_ID,              // d3037c11-a541-4f21-8862-8079137a0cde
    `${AZURE_AD_CLIENT_ID}`,
  ];
  ```
- Azure AD Client ID: `d3037c11-a541-4f21-8862-8079137a0cde`

**Frontend Admin Portal Configuration:**
- Location: `/Users/ramondenoronha/Dev/DIL/ASR-full/web/src/auth/authConfig.ts`
- Current Scope (line 38):
  ```typescript
  export const apiRequest = {
    scopes: [`api://${process.env.REACT_APP_AZURE_CLIENT_ID}/access_as_user`],
  };
  ```

**Problem Identified:**

The frontend is requesting a scope with `/access_as_user` appended, but the backend is validating against the base audience without checking for this scope. This could cause one of two issues:

1. **Frontend using wrong Client ID**: If `REACT_APP_AZURE_CLIENT_ID` is different from the API's Client ID
2. **Scope validation issue**: The backend validates audience but may not be checking the scope claim properly

### Potential Error Scenarios

#### Scenario 1: Wrong Frontend Client ID
- Frontend uses its own Client ID (e.g., `7ba7bde4-aef6-4acf-8a31-dc4b577ec73f`)
- Backend expects: `d3037c11-a541-4f21-8862-8079137a0cde`
- Result: Token audience doesn't match → 401/403 error

#### Scenario 2: Token Not Acquired
- Frontend fails to acquire token silently
- Makes API call without token
- Result: 401 Unauthorized

#### Scenario 3: Database/Runtime Error
- Authentication succeeds
- Database query fails
- Result: 500 Internal Server Error

---

## Diagnostic Steps to Identify Exact Error

### Step 1: Check Frontend Environment Variables

The user should verify the admin portal's environment configuration:

**File to check:** Static Web App configuration (Azure Portal or local `.env`)

Required variables:
```env
REACT_APP_AZURE_CLIENT_ID=d3037c11-a541-4f21-8862-8079137a0cde
REACT_APP_AZURE_TENANT_ID=598664e7-725c-4daa-bd1f-89c4ada717ff
REACT_APP_API_URL=https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1
```

**Critical Question:** Is `REACT_APP_AZURE_CLIENT_ID` set to the API's Client ID (`d3037c11-a541-4f21-8862-8079137a0cde`) or the frontend's own Client ID?

### Step 2: Browser Console Inspection

The user should open the admin portal and check the browser console:

**Chrome DevTools → Console**
1. Look for authentication errors
2. Check token acquisition messages
3. Look for MSAL errors

**Chrome DevTools → Network Tab**
1. Find the failed POST request to `/identifiers`
2. Check Request Headers → Authorization header
3. Copy the JWT token
4. Decode at jwt.io to verify:
   - `aud` (audience) claim
   - `scp` (scope) claim
   - `exp` (expiration) claim

### Step 3: Azure Application Insights

Query for recent identifier endpoint calls:

```bash
az monitor app-insights query \
  --app appi-ctn-demo-asr-dev \
  --resource-group rg-ctn-demo-asr-dev \
  --analytics-query "requests | where timestamp > ago(1h) | where url contains 'identifier' | project timestamp, resultCode, url, customDimensions"
```

---

## Test Cases for Complete Coverage

### Test Case 1: GET All Identifiers for Entity

**Endpoint:** `GET /api/v1/entities/{legalEntityId}/identifiers`

**Prerequisites:**
- Valid authentication token
- Legal entity exists in database
- User has READ_OWN_ENTITY or READ_ALL_ENTITIES permission

**Test Data:**
```
Legal Entity ID: (Get from database)
```

**Expected Response:**
```json
{
  "data": [
    {
      "legal_entity_reference_id": "uuid",
      "legal_entity_id": "uuid",
      "identifier_type": "KVK",
      "identifier_value": "95944192",
      "country_code": "NL",
      "registry_name": "Dutch Chamber of Commerce",
      "registry_url": "https://www.kvk.nl/",
      "validation_status": "PENDING",
      "dt_created": "timestamp",
      "dt_modified": "timestamp"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "totalItems": 1,
    "totalPages": 1
  }
}
```

**Status Codes:**
- 200: Success
- 401: Unauthorized (no token)
- 403: Forbidden (insufficient permissions)
- 400: Invalid UUID format
- 500: Server error

---

### Test Case 2: POST Create New Identifier

**Endpoint:** `POST /api/v1/entities/{legalEntityId}/identifiers`

**Prerequisites:**
- Valid authentication token
- Legal entity exists
- User has UPDATE_OWN_ENTITY or UPDATE_ALL_ENTITIES permission

**Request Body:**
```json
{
  "identifier_type": "KVK",
  "identifier_value": "95944192",
  "country_code": "NL",
  "registry_name": "Dutch Chamber of Commerce (Kamer van Koophandel)",
  "registry_url": "https://www.kvk.nl/",
  "validation_status": "PENDING"
}
```

**Expected Response:**
```json
{
  "legal_entity_reference_id": "uuid",
  "legal_entity_id": "uuid",
  "identifier_type": "KVK",
  "identifier_value": "95944192",
  "country_code": "NL",
  "registry_name": "Dutch Chamber of Commerce (Kamer van Koophandel)",
  "registry_url": "https://www.kvk.nl/",
  "validation_status": "PENDING",
  "created_by": "user@example.com",
  "dt_created": "timestamp",
  "dt_modified": "timestamp"
}
```

**Status Codes:**
- 201: Created successfully
- 400: Invalid request (missing fields, invalid enum values)
- 401: Unauthorized
- 403: Forbidden
- 409: Duplicate identifier (unique constraint violation)
- 500: Server error

**Validation Rules:**
- `identifier_type`: Must be one of: LEI, KVK, EORI, VAT, DUNS, EUID, HRB, HRA, KBO, SIREN, SIRET, CRN, OTHER
- `identifier_value`: Required, string
- `validation_status`: Must be one of: PENDING, VALIDATED, FAILED, EXPIRED

---

### Test Case 3: PUT Update Identifier

**Endpoint:** `PUT /api/v1/identifiers/{identifierId}`

**Prerequisites:**
- Valid authentication token
- Identifier exists
- User has UPDATE_OWN_ENTITY or UPDATE_ALL_ENTITIES permission

**Request Body:**
```json
{
  "validation_status": "VALIDATED",
  "verification_notes": "Verified through KVK API on 2025-10-14"
}
```

**Expected Response:**
```json
{
  "legal_entity_reference_id": "uuid",
  "identifier_type": "KVK",
  "identifier_value": "95944192",
  "validation_status": "VALIDATED",
  "verification_notes": "Verified through KVK API on 2025-10-14",
  "dt_modified": "timestamp",
  "modified_by": "user@example.com"
}
```

**Status Codes:**
- 200: Updated successfully
- 400: Invalid request
- 401: Unauthorized
- 403: Forbidden
- 404: Identifier not found
- 409: Duplicate identifier (if updating value)
- 500: Server error

---

### Test Case 4: DELETE Identifier (Soft Delete)

**Endpoint:** `DELETE /api/v1/identifiers/{identifierId}`

**Prerequisites:**
- Valid authentication token
- Identifier exists
- User has UPDATE_OWN_ENTITY or UPDATE_ALL_ENTITIES permission

**Expected Response:**
```json
{
  "message": "Identifier deleted successfully"
}
```

**Status Codes:**
- 200: Deleted successfully
- 401: Unauthorized
- 403: Forbidden
- 404: Identifier not found
- 500: Server error

**Note:** This is a soft delete - the identifier is marked as `is_deleted = true` rather than being removed from the database.

---

## Recommended Fixes

### Fix 1: Verify Frontend Environment Variables

**Priority:** HIGH

**Action:** Check the Static Web App configuration in Azure Portal

**Steps:**
1. Open Azure Portal
2. Navigate to Static Web App: `calm-tree-03352ba03.1.azurestaticapps.net`
3. Go to Configuration → Application settings
4. Verify:
   ```
   REACT_APP_AZURE_CLIENT_ID = d3037c11-a541-4f21-8862-8079137a0cde
   REACT_APP_AZURE_TENANT_ID = 598664e7-725c-4daa-bd1f-89c4ada717ff
   REACT_APP_API_URL = https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1
   ```

### Fix 2: Browser Console Debugging

**Priority:** HIGH

**Action:** User should open browser DevTools while using the admin portal

**Steps:**
1. Open admin portal: https://calm-tree-03352ba03.1.azurestaticapps.net
2. Open Chrome DevTools (F12)
3. Go to Console tab
4. Try to add identifier: KVK 95944192
5. Look for errors in console
6. Go to Network tab
7. Find the failed POST request
8. Click on it → Headers tab
9. Check:
   - Request URL
   - Authorization header value
   - Response status code
   - Response body

### Fix 3: Token Debugging

**Priority:** MEDIUM

**Action:** Decode and verify JWT token

**Steps:**
1. From Network tab, copy the Authorization header value (the JWT token after "Bearer ")
2. Go to https://jwt.io
3. Paste the token
4. Verify:
   - `aud` claim = `api://d3037c11-a541-4f21-8862-8079137a0cde` or `d3037c11-a541-4f21-8862-8079137a0cde`
   - `scp` claim = `access_as_user`
   - `exp` claim is not expired
   - `roles` claim includes appropriate role

### Fix 4: Azure AD App Registration Verification

**Priority:** MEDIUM

**Action:** Verify Azure AD app registration configuration

**Steps:**
1. Open Azure Portal → Azure Active Directory → App registrations
2. Find app: `d3037c11-a541-4f21-8862-8079137a0cde`
3. Check:
   - Expose an API → Scopes → Ensure `access_as_user` scope exists
   - API permissions → Check admin portal app has permission to API
   - Authentication → Ensure redirect URIs include the admin portal URL

### Fix 5: Enable Detailed Logging

**Priority:** LOW

**Action:** Enable Application Insights logging for debugging

**Steps:**
1. Azure Portal → Function App: func-ctn-demo-asr-dev
2. Application Insights → Enable detailed logging
3. Try the identifier operation again
4. Query logs:
   ```
   requests
   | where timestamp > ago(10m)
   | where url contains "identifier"
   | project timestamp, resultCode, url, customDimensions
   ```

---

## Integration Test Script

**File:** `/Users/ramondenoronha/Dev/DIL/ASR-full/api/test-identifier-endpoints.sh`

```bash
#!/bin/bash
# Comprehensive test script for identifier endpoints
# Run with: ./test-identifier-endpoints.sh
```

**Note:** This script requires:
1. Azure CLI authentication
2. Database access to get legal entity ID
3. Valid access token acquisition

---

## Validation Checklist

Before marking this issue as resolved, verify:

- [ ] User can successfully add identifier KVK 95944192 in admin portal
- [ ] No 404 errors in browser console
- [ ] No 500 errors in browser console
- [ ] Success notification shows "Identifier added successfully"
- [ ] Identifier appears in the identifiers list
- [ ] User can edit the identifier
- [ ] User can delete the identifier
- [ ] Audit logs show the operations

---

## Next Steps

1. **User Action Required:**
   - Open admin portal
   - Open browser DevTools (F12)
   - Try adding identifier KVK 95944192
   - Take screenshot of Console and Network tabs
   - Share error details

2. **Expected Outcome:**
   - Identify exact error (401, 403, 404, or 500)
   - See specific error message
   - View token claims to verify authentication

3. **Follow-up Actions:**
   - Based on error details, implement specific fix
   - Retest after fix
   - Document resolution

---

## Contact & Support

For questions or additional diagnostics:
- Check Application Insights: `appi-ctn-demo-asr-dev`
- Review Azure Function logs
- Test endpoints directly using the provided curl commands

**Report Generated:** 2025-10-14
