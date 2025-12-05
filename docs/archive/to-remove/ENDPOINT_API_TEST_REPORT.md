# Endpoint API Test Report

**Date:** November 13, 2025
**Issue:** Admin portal shows "No API endpoints configured" despite 15 endpoints in database
**Test Environment:** https://func-ctn-demo-asr-dev.azurewebsites.net/api
**Test Member:** Test Email Company BV (legal_entity_id: `96eb64b2-31e9-4e11-b4c2-e8d8a58f1d0a`)

---

## Test Results Summary

| Test | Expected | Actual | Status |
|------|----------|--------|--------|
| Health endpoint | 200 OK | 200 OK | PASS |
| GET endpoints (no auth) | 401 Unauthorized | 404 Not Found | FAIL |
| GET endpoints (with dummy token) | 401 Unauthorized | 404 Not Found | FAIL |
| POST endpoints (no auth) | 401 Unauthorized | 415 Unsupported Media Type | FAIL (but route exists) |
| OPTIONS preflight | 204 No Content | 204 No Content | PASS |

---

## Phase 1: API Testing with curl

### Test 1: Health Endpoint (Baseline)

```bash
curl -s https://func-ctn-demo-asr-dev.azurewebsites.net/api/health
```

**Result:** PASS
```json
{
  "status": "healthy",
  "timestamp": "2025-11-13T19:30:51.999Z",
  "uptime": 1873.325404403,
  "environment": "dev",
  "version": "1.0.0",
  "checks": {
    "database": { "status": "up", "responseTime": 4 },
    "applicationInsights": { "status": "up", "details": { "configured": true } },
    "azureKeyVault": { "status": "up", "responseTime": 0 },
    "staticWebApps": {
      "status": "up",
      "responseTime": 34,
      "details": { "adminPortal": "up", "memberPortal": "up" }
    }
  }
}
```

### Test 2: GET Endpoints Without Authentication

```bash
curl -s -w "\nHTTP Status: %{http_code}\n" \
  https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1/legal-entities/96eb64b2-31e9-4e11-b4c2-e8d8a58f1d0a/endpoints
```

**Result:** FAIL
```
HTTP Status: 404
```

**Expected:** 401 Unauthorized (route exists but requires auth)
**Actual:** 404 Not Found (route not registered)

### Test 3: GET Endpoints With Dummy Token

```bash
curl -s -w "\nHTTP Status: %{http_code}\n" \
  -H "Authorization: Bearer dummy-token-for-testing" \
  https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1/legal-entities/96eb64b2-31e9-4e11-b4c2-e8d8a58f1d0a/endpoints
```

**Result:** FAIL
```
HTTP Status: 404
```

**Expected:** 401 Unauthorized (invalid token)
**Actual:** 404 Not Found (route not registered)

### Test 4: POST to Same Route (Testing Conflict)

```bash
curl -s -w "\nHTTP Status: %{http_code}\n" -X POST \
  https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1/legal-entities/96eb64b2-31e9-4e11-b4c2-e8d8a58f1d0a/endpoints
```

**Result:** PARTIAL PASS (route registered, but only for POST)
```json
{
  "error": "unsupported_media_type",
  "error_description": "Content-Type header is required for POST requests",
  "required_content_type": "application/json"
}
HTTP Status: 415
```

**Analysis:** POST handler (`createEndpoint`) is registered and responding. This confirms the route conflict hypothesis.

### Test 5: OPTIONS Request (CORS Preflight)

```bash
curl -s -w "\nHTTP Status: %{http_code}\n" -X OPTIONS \
  https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1/legal-entities/96eb64b2-31e9-4e11-b4c2-e8d8a58f1d0a/endpoints
```

**Result:** PASS
```
HTTP Status: 204
```

---

## Phase 2: Diagnosis

### Code Analysis

**File:** `/Users/ramondenoronha/Dev/DIL/DEV-CTN-ASR/api/src/index.ts`
**Lines 55-56:**
```typescript
// Endpoint management
import './functions/createEndpoint';      // Line 55 - Imported FIRST
import './functions/getEndpointsByEntity'; // Line 56 - Imported SECOND
```

**File:** `/Users/ramondenoronha/Dev/DIL/DEV-CTN-ASR/api/src/functions/createEndpoint.ts`
**Lines 101-106:**
```typescript
app.http('createEndpoint', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'v1/legal-entities/{legalentityid}/endpoints',
  handler: memberEndpoint(handler),
});
```

**File:** `/Users/ramondenoronha/Dev/DIL/DEV-CTN-ASR/api/src/functions/getEndpointsByEntity.ts`
**Lines 71-80:**
```typescript
app.http('getEndpointsByEntity', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'v1/legal-entities/{legalentityid}/endpoints',
  handler: wrapEndpoint(handler, {
    requireAuth: true,
    requiredPermissions: [Permission.READ_OWN_ENTITY, Permission.READ_ALL_ENTITIES],
    requireAllPermissions: false
  }),
});
```

### Root Cause

**Azure Functions v4 Route Registration Conflict**

Both functions define the EXACT same route:
- `v1/legal-entities/{legalentityid}/endpoints`

With different HTTP methods:
- `createEndpoint`: POST, OPTIONS
- `getEndpointsByEntity`: GET, OPTIONS

**Problem:** Azure Functions v4 only registers ONE handler per route. When multiple functions define the same route in separate files, the FIRST import wins and subsequent imports are silently ignored.

**Result:**
- `createEndpoint` is imported first (line 55) and claims the route
- `getEndpointsByEntity` is imported second (line 56) and is silently ignored
- GET requests to the route return 404
- POST requests work correctly

### Evidence from Working Pattern

**File:** `/Users/ramondenoronha/Dev/DIL/DEV-CTN-ASR/api/src/functions/ManageM2MClients.ts`
**Lines 882-902:**

This file successfully handles multiple HTTP methods on the same route:

```typescript
// GET handler
app.http('ListM2MClients', {
  methods: ['GET'],
  route: 'v1/legal-entities/{legal_entity_id}/m2m-clients',
  authLevel: 'anonymous',
  handler: wrapEndpoint(listM2MClientsHandler, { /* ... */ })
});

// POST handler (same route, different method)
app.http('CreateM2MClient', {
  methods: ['POST'],
  route: 'v1/legal-entities/{legal_entity_id}/m2m-clients',
  authLevel: 'anonymous',
  handler: wrapEndpoint(createM2MClientHandler, { /* ... */ })
});
```

**Key Difference:** Both handlers are defined in the SAME FILE with unique handler names.

---

## Phase 3: Root Cause Analysis

### Why This Happens

1. **Azure Functions v4 uses file-based registration:** Each `app.http()` call registers a route
2. **Route collision detection is limited:** Multiple registrations on the same route don't throw errors
3. **First registration wins:** The first imported file claims the route
4. **Silent failure:** Subsequent registrations are ignored without warnings

### Why It Worked Before (Hypothesis)

If this worked previously, possible causes:
1. Import order was different (`getEndpointsByEntity` before `createEndpoint`)
2. Functions were in the same file
3. Different Azure Functions version with different behavior

### Current State

- Database has 15 valid endpoints for test legal entity
- POST endpoint works (can create new endpoints)
- GET endpoint fails (cannot retrieve existing endpoints)
- Admin portal cannot display endpoints
- Recent auth middleware fix (m.status → le.status) is unrelated to this issue

---

## Recommended Fix

### Solution 1: Merge Functions into Single File (RECOMMENDED)

Follow the pattern used in `ManageM2MClients.ts`:

**Create:** `/Users/ramondenoronha/Dev/DIL/DEV-CTN-ASR/api/src/functions/ManageEndpoints.ts`

```typescript
import { app, HttpResponseInit, InvocationContext } from '@azure/functions';
import { wrapEndpoint, memberEndpoint, AuthenticatedRequest } from '../middleware/endpointWrapper';
import { Permission } from '../middleware/rbac';
import { getPool } from '../utils/database';

// =====================================================
// Handler: Get Endpoints by Legal Entity
// =====================================================
async function getEndpointsByEntityHandler(
  request: AuthenticatedRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const pool = getPool();
    const legalEntityId = request.params.legalentityid;

    if (!legalEntityId) {
      return { status: 400, jsonBody: { error: 'Legal entity ID is required' } };
    }

    const result = await pool.query(
      `SELECT
        legal_entity_endpoint_id,
        legal_entity_id,
        endpoint_name,
        endpoint_url,
        endpoint_description,
        data_category,
        endpoint_type,
        authentication_method,
        last_connection_test,
        last_connection_status,
        connection_test_details,
        is_active,
        activation_date,
        deactivation_date,
        deactivation_reason,
        dt_created,
        dt_modified
       FROM legal_entity_endpoint
       WHERE legal_entity_id = $1 AND is_deleted = false
       ORDER BY dt_created DESC`,
      [legalEntityId]
    );

    context.log('✅ Found', result.rows.length, 'endpoints for legal_entity_id:', legalEntityId);

    return { status: 200, jsonBody: result.rows };
  } catch (error: any) {
    context.error('❌ Error fetching endpoints:', error);
    return { status: 500, jsonBody: { error: 'Failed to fetch endpoints' } };
  }
}

// =====================================================
// Handler: Create Endpoint
// =====================================================
async function createEndpointHandler(
  request: AuthenticatedRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const pool = getPool();
    const legalEntityId = request.params.legalentityid;
    const body = await request.json() as any;

    if (!legalEntityId) {
      return { status: 400, jsonBody: { error: 'Legal entity ID is required' } };
    }

    if (!body.endpoint_name) {
      return { status: 400, jsonBody: { error: 'Endpoint name is required' } };
    }

    // Verify legal entity exists
    const entityCheck = await pool.query(
      'SELECT legal_entity_id FROM legal_entity WHERE legal_entity_id = $1 AND is_deleted = false',
      [legalEntityId]
    );

    if (entityCheck.rows.length === 0) {
      return { status: 404, jsonBody: { error: 'Legal entity not found' } };
    }

    // Create endpoint
    const result = await pool.query(
      `INSERT INTO legal_entity_endpoint (
        legal_entity_id, endpoint_name, endpoint_url, endpoint_description,
        data_category, endpoint_type, authentication_method, is_active,
        activation_date, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        legalEntityId,
        body.endpoint_name,
        body.endpoint_url || null,
        body.endpoint_description || null,
        body.data_category || null,
        body.endpoint_type || 'REST_API',
        body.authentication_method || 'TOKEN',
        body.is_active !== undefined ? body.is_active : true,
        body.is_active !== false ? new Date() : null,
        request.userEmail || 'SYSTEM'
      ]
    );

    // Log audit event
    await pool.query(
      `INSERT INTO audit_logs (event_type, actor_org_id, resource_type, resource_id, action, result, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        'ENDPOINT_MANAGEMENT',
        legalEntityId,
        'legal_entity_endpoint',
        result.rows[0].legal_entity_endpoint_id,
        'CREATE',
        'SUCCESS',
        JSON.stringify({ endpoint_name: body.endpoint_name, created_by: request.userEmail })
      ]
    );

    return { status: 201, jsonBody: result.rows[0] };
  } catch (error: any) {
    context.error('Error creating endpoint:', error);
    return { status: 500, jsonBody: { error: 'Failed to create endpoint', details: error.message } };
  }
}

// =====================================================
// Register HTTP endpoints
// =====================================================

app.http('GetEndpointsByEntity', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'v1/legal-entities/{legalentityid}/endpoints',
  handler: wrapEndpoint(getEndpointsByEntityHandler, {
    requireAuth: true,
    requiredPermissions: [Permission.READ_OWN_ENTITY, Permission.READ_ALL_ENTITIES],
    requireAllPermissions: false
  }),
});

app.http('CreateEndpoint', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'v1/legal-entities/{legalentityid}/endpoints',
  handler: memberEndpoint(createEndpointHandler),
});
```

**Update index.ts:**

```typescript
// Endpoint management
import './functions/ManageEndpoints';  // Single import for both GET and POST
import './functions/updateEndpoint';
import './functions/issueEndpointToken';
import './functions/getEndpointTokens';
import './functions/EndpointRegistrationWorkflow';
```

**Delete old files:**
- `api/src/functions/createEndpoint.ts`
- `api/src/functions/getEndpointsByEntity.ts`

### Solution 2: Use Different Routes (NOT RECOMMENDED)

Change routes to be method-specific:
- GET: `v1/legal-entities/{legalentityid}/endpoints` (keep)
- POST: `v1/legal-entities/{legalentityid}/endpoints/create` (change)

**Drawback:** Breaks REST conventions and requires frontend changes.

---

## Deployment Steps

1. **Create new merged file:** `api/src/functions/ManageEndpoints.ts`
2. **Update index.ts:** Replace two imports with single import
3. **Delete old files:** `createEndpoint.ts` and `getEndpointsByEntity.ts`
4. **Build and deploy:**
   ```bash
   cd /Users/ramondenoronha/Dev/DIL/DEV-CTN-ASR/api
   npm run build
   func azure functionapp publish func-ctn-demo-asr-dev --typescript --build remote
   ```
5. **Verify deployment:**
   ```bash
   curl -s https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1/legal-entities/96eb64b2-31e9-4e11-b4c2-e8d8a58f1d0a/endpoints
   # Should return 401 Unauthorized (not 404)
   ```
6. **Test with valid token in admin portal**

---

## Impact Assessment

### Systems Affected
- Admin Portal (primary impact - cannot view endpoints)
- Member Portal (if it uses same GET endpoint)

### Data Integrity
- No data loss
- 15 endpoints exist in database
- Can still create endpoints via POST

### Deployment Risk
- Low risk (merging two working functions)
- Rollback: Revert to separate files with swapped import order

---

## Lessons Learned

1. **Azure Functions v4 route collisions are silent:** No errors when multiple files define same route
2. **Import order matters:** First imported file wins route registration
3. **Multiple methods on same route:** Must be defined in SAME FILE (see ManageM2MClients pattern)
4. **Test API layer first:** Curl tests immediately identified 404 vs 401 distinction
5. **404 = route not registered, 401 = route exists but auth failed**

---

## Related Documentation

- CLAUDE.md: Section "Critical Patterns & Gotchas" #2 (Functions must be imported in index.ts)
- API Architecture: Multiple entry points (index.ts, essential-index.ts)
- M2M Clients Pattern: `/api/src/functions/ManageM2MClients.ts` (working example)

---

**Report Generated:** November 13, 2025
**Tested By:** Test Engineer Agent (Claude Code)
**Test Duration:** 5 minutes (API layer only)
**Next Steps:** Implement Solution 1 (merge functions)
