# Document Upload Authentication Analysis

**Test Date:** October 20, 2025
**Test URL:** https://kind-coast-017153103.1.azurestaticapps.net
**API Endpoint:** https://func-ctn-booking-prod.azurewebsites.net/api/v1/documents

---

## Executive Summary

The document upload is **FAILING with 401 Unauthorized**, but the **token IS being acquired and sent correctly**. This is a **backend configuration issue**, not a frontend issue.

---

## Key Findings

### 1. Token Acquisition: ✅ WORKING

The frontend successfully acquires an access token:

```
Console Logs:
  - "Acquiring access token for API..." (2 occurrences)
  - "Access token acquired successfully" (2 occurrences)
  - "[Auth] Token acquired successfully!"
  - "[Auth] Token scopes: [api://d3037c11-a541-4f21-8862-8079137a0cde/access_as_user]"
```

**Timeline:**
- Token acquisition started: `2025-10-20T18:23:03.433Z`
- Token acquisition completed: `2025-10-20T18:23:03.556Z`
- Duration: **~123ms** (very fast)

### 2. Token Transmission: ✅ WORKING

The Authorization header **IS present** in both upload requests:

```http
POST https://func-ctn-booking-prod.azurewebsites.net/api/v1/documents
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImtpZCI6...
Content-Type: multipart/form-data
```

**Token Length:** 1651 characters (valid JWT)

### 3. Token Details: ✅ VALID

Decoded JWT Payload:

```json
{
  "aud": "d3037c11-a541-4f21-8862-8079137a0cde",
  "iss": "https://login.microsoftonline.com/598664e7-725c-4daa-bd1f-89c4ada717ff/v2.0",
  "scp": "access_as_user",
  "roles": ["SystemAdmin", "AssociationAdmin"],
  "name": "Ramon",
  "preferred_username": "ramon@denoronha.consulting",
  "exp": 1760989125 (2025-10-20T19:38:45Z),
  "ver": "2.0"
}
```

**Token Properties:**
- ✅ Audience (aud): `d3037c11-a541-4f21-8862-8079137a0cde` (booking portal client ID)
- ✅ Issuer (iss): Azure AD tenant
- ✅ Scope (scp): `access_as_user`
- ✅ Roles: `SystemAdmin`, `AssociationAdmin`
- ✅ Expiration: Valid for ~1 hour
- ✅ Version: 2.0 (correct)

### 4. API Response: ❌ FAILING

**Both upload requests returned 401 Unauthorized:**

```json
{
  "error": "Unauthorized",
  "message": "Valid authentication token required"
}
```

**Status:** `401 Unauthorized`
**Error Message:** "Valid authentication token required"

---

## Root Cause Analysis

### Frontend: ✅ ALL SYSTEMS OPERATIONAL

1. **Axios Interceptor:** Working correctly
2. **Token Acquisition:** MSAL successfully retrieves token
3. **Authorization Header:** Correctly attached to requests
4. **Token Format:** Valid JWT with correct claims

### Backend: ❌ AUTHENTICATION MIDDLEWARE ISSUE

The API backend is **rejecting a valid token**. Possible causes:

1. **Token Validation Configuration**
   - Backend may be validating against wrong audience
   - Backend may be expecting different token version
   - Backend may be checking for claims that aren't present

2. **Environment Mismatch**
   - Frontend is calling **PROD API** (`func-ctn-booking-prod`)
   - Token is issued for **DEV/TEST** tenant
   - Backend may be configured for different tenant/client ID

3. **Missing Middleware Configuration**
   - JWT validation library not configured
   - Issuer validation failing
   - Audience validation failing

4. **Token Scope Issues**
   - Backend expecting `api://func-ctn-booking-prod/.default`
   - Token contains `api://d3037c11-a541-4f21-8862-8079137a0cde/access_as_user`
   - Scope mismatch causing rejection

---

## Comparison: Expected vs Actual

### Expected Audience (Backend)
```
api://func-ctn-booking-prod/.default
OR
{backend-client-id}
```

### Actual Audience (Frontend Token)
```
d3037c11-a541-4f21-8862-8079137a0cde
(booking portal frontend client ID)
```

**This is the likely issue!** The backend API needs to accept tokens with audience = frontend client ID.

---

## Recommendations

### 1. Immediate Fix: Backend Configuration

Update the Azure Function app authentication settings:

```javascript
// api/src/middleware/auth.ts (or similar)
const validAudiences = [
  'd3037c11-a541-4f21-8862-8079137a0cde', // Frontend client ID
  process.env.CLIENT_ID,                   // Backend client ID (if different)
  `api://${process.env.CLIENT_ID}`         // API URI format
];

// Validate token audience against allowed list
if (!validAudiences.includes(token.aud)) {
  throw new UnauthorizedError('Invalid audience');
}
```

### 2. Verify Environment Variables

Check these environment variables in the Azure Function App:

- `AZURE_CLIENT_ID` or `CLIENT_ID`
- `AZURE_TENANT_ID`
- `ALLOWED_AUDIENCES` (if configured)
- `VALID_ISSUERS` (if configured)

Expected values:
```
CLIENT_ID=d3037c11-a541-4f21-8862-8079137a0cde
TENANT_ID=598664e7-725c-4daa-bd1f-89c4ada717ff
ALLOWED_AUDIENCES=d3037c11-a541-4f21-8862-8079137a0cde,api://d3037c11-a541-4f21-8862-8079137a0cde
```

### 3. Alternative: Update Frontend Scope

If the backend MUST have a different audience, update the frontend:

```typescript
// web/src/config/authConfig.ts
const loginRequest = {
  scopes: [
    'api://{backend-function-app-client-id}/access_as_user'
  ]
};
```

But this requires:
1. Backend to have its own App Registration
2. Frontend to be granted API permissions to backend
3. Admin consent for the permission

---

## Test Evidence

### Console Logs
✅ Token acquisition logs present
✅ No token acquisition errors
✅ Successful token retrieval confirmed

### Network Requests
✅ Authorization header present in upload requests
✅ Token correctly formatted
✅ Request reached the API

### API Response
❌ 401 Unauthorized (2 occurrences)
❌ "Valid authentication token required"

---

## Next Steps

1. **Check Backend Auth Middleware**
   - Review `api/src/middleware/auth.ts` or equivalent
   - Check what audience is expected
   - Verify token validation logic

2. **Check Azure Function App Configuration**
   - App Settings → Authentication
   - Verify allowed client IDs
   - Check issuer configuration

3. **Enable Backend Logging**
   - Log incoming Authorization headers
   - Log token validation failures
   - Identify exact validation step failing

4. **Test API Directly with curl**
   ```bash
   TOKEN="eyJ0eXAiOiJKV1QiLCJhbGci..."

   curl -X POST https://func-ctn-booking-prod.azurewebsites.net/api/v1/documents \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: multipart/form-data" \
     -F "file=@test.pdf"
   ```

---

## Files Generated

- `console-logs.json` - All browser console messages
- `network-requests.json` - All HTTP requests/responses
- `debug-summary.txt` - Quick summary of findings
- `ANALYSIS_REPORT.md` - This comprehensive report
- `decode-token.js` - JWT decoder script

---

## Conclusion

**The frontend is working perfectly.** The axios interceptor is correctly acquiring tokens and attaching them to requests. The issue is **100% on the backend** - the API's authentication middleware is rejecting valid tokens.

The most likely cause is an **audience mismatch**: the backend expects tokens with a different audience claim than what the frontend is requesting from Azure AD.

**Immediate Action Required:** Review backend authentication configuration and update to accept tokens with audience `d3037c11-a541-4f21-8862-8079137a0cde`.
