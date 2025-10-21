# Bug Report: Validation Page Showing White/Blank Screen

**Date**: October 21, 2025
**Reported URL**: https://kind-coast-017153103.1.azurestaticapps.net/validate/booking-1760986565899
**Status**: CRITICAL - Page completely non-functional

---

## Executive Summary

The booking validation page is completely non-functional, showing a white/blank screen instead of the booking details. Investigation reveals **two separate critical issues**:

1. **PRIMARY ISSUE**: Authentication requirement blocking public access
2. **SECONDARY ISSUE**: API returning wrong data format (array instead of single object)

---

## Issue 1: Authentication Requirement (PRIMARY CAUSE)

### Problem
The `/validate/:bookingId` route requires authentication, redirecting unauthenticated users to Azure AD login page instead of showing booking data.

### Evidence
- **Screenshot**: `/Users/ramondenoronha/Dev/DIL/ASR-full/booking-portal/web/e2e/debug/validation-white-screen.png`
- **Console output**: "React root element found: false"
- **Page content**: Microsoft Azure AD "Sign in" form instead of React app
- **Body text length**: 3002 characters (Azure AD login page HTML)

### Root Cause
**File**: `/Users/ramondenoronha/Dev/DIL/ASR-full/booking-portal/web/src/App.tsx`

```tsx
// Line 23-42: ALL routes wrapped in ProtectedRoute
<Route
  path="/*"
  element={
    <ProtectedRoute>
      <div className="app-container">
        <div className="main-content">
          <Header />
          <div className="content-area">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/upload" element={<Upload />} />
              <Route path="/bookings" element={<Bookings />} />
              <Route path="/validate/:bookingId" element={<Validation />} /> {/* 🔴 REQUIRES AUTH */}
              <Route path="/admin" element={<Admin />} />
            </Routes>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  }
/>
```

**File**: `/Users/ramondenoronha/Dev/DIL/ASR-full/booking-portal/web/src/auth/ProtectedRoute.tsx`

```tsx
// Line 40-43: Redirects to login if not authenticated
if (!isAuthenticated) {
  return <Navigate to="/login" replace />;
}
```

### Impact
- **Severity**: CRITICAL
- **Affected users**: All external validators/truckers without Azure AD accounts
- **Business impact**: Complete validation workflow failure
- **Expected behavior**: Validation page should be publicly accessible (bookings are shareable links)

### Solution
Move the `/validate/:bookingId` route outside the `<ProtectedRoute>` wrapper:

```tsx
<Routes>
  {/* Public routes */}
  <Route path="/login" element={<LoginPage />} />
  <Route path="/unauthorized" element={<UnauthorizedPage />} />
  <Route path="/validate/:bookingId" element={<Validation />} /> {/* ✅ PUBLIC ACCESS */}

  {/* Protected routes */}
  <Route path="/*" element={<ProtectedRoute>...</ProtectedRoute>} />
</Routes>
```

---

## Issue 2: API Returning Wrong Data Format (SECONDARY ISSUE)

### Problem
The GET `/api/v1/bookings/{bookingId}` endpoint returns **all bookings as an array** instead of a **single booking object**.

### Evidence - API Test Results

```bash
# Test 1: Check endpoint with bookingId
curl -X GET "https://func-ctn-booking-prod.azurewebsites.net/api/v1/bookings/booking-1760986565899"

# Response: HTTP 200 OK (✅ Status correct)
# BUT: Returns array of 12 bookings instead of single booking object

{
  "data": [
    {
      "id": "booking-1760993814526",
      "documentId": "doc-1760993814526",
      ...
    },
    {
      "id": "booking-1760991578989",
      "documentId": "doc-1760991578989",
      ...
    },
    ... (10 more bookings)
  ]
}

# Test 2: Verify array length
curl -X GET "https://func-ctn-booking-prod.azurewebsites.net/api/v1/bookings/booking-1760986565899" | jq '.data | length'
# Returns: 12 (WRONG - should be single object)

# Test 3: Check for 'id' field (single object should have this)
curl -X GET "https://func-ctn-booking-prod.azurewebsites.net/api/v1/bookings/booking-1760986565899" | jq '.id // "No id field - returned array"'
# Returns: "No id field - returned array" (WRONG)
```

### Root Cause
**File**: `/Users/ramondenoronha/Dev/DIL/ASR-full/booking-portal/api/GetBookings/index.ts`

The code checks `context.bindingData.bookingid` (lowercase) but Azure Functions may be passing the parameter with different casing or not at all.

```typescript
// Line 29: Attempting to get bookingId from binding data
const bookingId = context.bindingData.bookingid;

// Line 31-64: If bookingId is truthy, return single booking
if (bookingId) {
  // ✅ This code path SHOULD execute but DOESN'T
  const { resource: booking } = await container.item(bookingId, bookingId).read();
  context.res = {
    status: 200,
    body: booking, // Single object ✅
    headers: { 'Content-Type': 'application/json' }
  };
} else {
  // 🔴 This code path IS executing (WRONG)
  // Line 66-96: Returns ALL bookings as array
  context.res = {
    status: 200,
    body: {
      data: formattedBookings // Array of all bookings ❌
    },
    headers: { 'Content-Type': 'application/json' }
  };
}
```

**File**: `/Users/ramondenoronha/Dev/DIL/ASR-full/booking-portal/api/GetBookings/function.json`

```json
{
  "route": "v1/bookings/{bookingId?}"
}
```

### Why It's Failing
The route parameter is defined as `{bookingId?}` (camelCase) in function.json, but the code accesses `context.bindingData.bookingid` (lowercase). Azure Functions v4 lowercases route parameters, so the correct access should be:

```typescript
const bookingId = context.bindingData.bookingid; // ✅ Correct (lowercase)
// OR
const bookingId = req.params.bookingId; // ✅ Alternative approach
```

However, the API is still returning all bookings, indicating the parameter isn't being captured at all. This could be due to:
1. Route not registered correctly in Azure
2. Deployment issue (old version running)
3. Parameter binding configuration issue

### Impact
- **Severity**: HIGH (but masked by Issue 1)
- **Performance**: Returning 12+ bookings when only 1 needed
- **Data privacy**: Potentially exposes other bookings to unauthorized users
- **Client-side impact**: Frontend expects single object but receives array

### Expected Behavior

```typescript
// GET /api/v1/bookings/booking-1760986565899
// Should return:
{
  "id": "booking-1760986565899",
  "documentId": "doc-1760986565899",
  "documentUrl": "...",
  "processingStatus": "completed",
  "overallConfidence": 0.66,
  "dcsaPlusData": { ... },
  "extractionMetadata": { ... }
}
```

### Solution Options

**Option 1: Fix binding data access** (Recommended)
```typescript
// Try multiple approaches to get the parameter
const bookingId = context.bindingData.bookingid
  || context.bindingData.bookingId
  || req.params.bookingId;

context.log(`Route parameter bookingId: ${bookingId}`);
context.log(`All binding data: ${JSON.stringify(context.bindingData)}`);
```

**Option 2: Use URL parsing**
```typescript
const url = new URL(req.url);
const pathSegments = url.pathname.split('/');
const bookingId = pathSegments[pathSegments.length - 1];
```

**Option 3: Use Express-style params**
```typescript
const bookingId = req.params.bookingId;
```

---

## Frontend Code Expectations

**File**: `/Users/ramondenoronha/Dev/DIL/ASR-full/booking-portal/web/src/pages/Validation.tsx`

```typescript
// Line 33: Frontend expects single object, not array
const response = await axios.get<Booking>(`/api/v1/bookings/${bookingId}`);
const bookingData = response.data; // ❌ Will break if response.data is array

// Should be:
// const bookingData = Array.isArray(response.data.data)
//   ? response.data.data.find(b => b.id === bookingId)
//   : response.data;
```

---

## Test Results Summary

### API Tests (curl)
- ✅ **HTTP 200 OK** - API endpoint responds
- ✅ **Booking exists** - booking-1760986565899 found in database
- ❌ **Wrong format** - Returns array instead of single object
- ❌ **Parameter not parsed** - Route parameter not being captured

### UI Tests (Playwright)
- ✅ **Page loads** - No JavaScript errors
- ✅ **No console errors** - Only Telerik license warning
- ❌ **Authentication blocks** - Redirects to Azure AD login
- ❌ **React not rendering** - React root element not found
- ❌ **Wrong page content** - Shows Microsoft login instead of booking form

### Console Messages Captured
```
[WARN] KendoReact - No Telerik and Kendo UI License found
[INFO] BSSO Telemetry: {"result":"Error","error":"NoExtension"...}
[ERROR] Failed to load resource: the server responded with a status of 404 ()
```

---

## Reproduction Steps

1. Visit URL: https://kind-coast-017153103.1.azurestaticapps.net/validate/booking-1760986565899
2. Expected: See booking validation form with document viewer
3. Actual: See Microsoft Azure AD login page (white background, Microsoft logo)

---

## Fix Priority

1. **IMMEDIATE**: Remove authentication requirement from validation route (Issue 1)
2. **HIGH**: Fix API to return single booking object (Issue 2)
3. **MEDIUM**: Add error handling for array responses in frontend
4. **LOW**: Add deployment verification tests

---

## Related Files

### Frontend
- `/Users/ramondenoronha/Dev/DIL/ASR-full/booking-portal/web/src/App.tsx` - Routing configuration
- `/Users/ramondenoronha/Dev/DIL/ASR-full/booking-portal/web/src/auth/ProtectedRoute.tsx` - Auth guard
- `/Users/ramondenoronha/Dev/DIL/ASR-full/booking-portal/web/src/pages/Validation.tsx` - Validation page component

### Backend
- `/Users/ramondenoronha/Dev/DIL/ASR-full/booking-portal/api/GetBookings/index.ts` - API function
- `/Users/ramondenoronha/Dev/DIL/ASR-full/booking-portal/api/GetBookings/function.json` - Route config

### Test Artifacts
- `/Users/ramondenoronha/Dev/DIL/ASR-full/booking-portal/web/e2e/debug-validation-page.spec.ts` - Debug test
- `/Users/ramondenoronha/Dev/DIL/ASR-full/booking-portal/web/e2e/debug/validation-white-screen.png` - Screenshot

---

## Recommended Next Steps

1. **Deploy authentication fix** to make validation route public
2. **Test API parameter binding** with curl after deployment
3. **Add logging** to API function to debug parameter capture
4. **Create E2E test** for validation page public access
5. **Add API contract test** to verify single object response
6. **Document** that validation links are public (design decision)

---

## Security Considerations

**Question**: Should the validation page be public?

**Analysis**:
- ✅ **Yes, if**: Validation links are meant to be shared with truckers/validators without accounts
- ❌ **No, if**: Validation should only be done by authenticated internal users

**Recommendation**: Based on the workflow (booking upload → share link → external validation), the validation page **should be public** but:
1. Use unguessable booking IDs (already using timestamp-based IDs)
2. Consider time-limited SAS tokens for document access
3. Rate limit validation endpoint to prevent abuse
4. Log all validation access for audit trail

---

**Generated**: October 21, 2025 06:41 UTC
**Test Environment**: Playwright + curl
**API Endpoint**: https://func-ctn-booking-prod.azurewebsites.net/api/v1
**Frontend URL**: https://kind-coast-017153103.1.azurestaticapps.net
