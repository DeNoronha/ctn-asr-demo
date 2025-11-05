# DEPLOYMENT REQUIRED - Member Registration Multipart Fix

**Date:** November 5, 2025
**Status:** ⚠️ PENDING DEPLOYMENT
**Commit:** `e1e8e7c` - "fix(api): enable multipart/form-data for register-member endpoint"

---

## Summary

Fixed critical bug preventing KvK document upload during member registration. The API endpoint was rejecting `multipart/form-data` requests with **415 Unsupported Media Type** due to incorrect Content-Type validation.

## What Was Done

### 1. Identified Issue via curl Testing ✅

**Test Command:**
```bash
./api/tests/member-registration-with-kvk-document.sh
```

**Error Received:**
```json
{
  "error": "unsupported_media_type",
  "error_description": "Content-Type must be 'application/json' for POST requests",
  "received_content_type": "multipart/form-data",
  "required_content_type": "application/json"
}
```

**HTTP Status:** 415 Unsupported Media Type

### 2. Root Cause Analysis ✅

The `registerMember` function in `api/src/functions/registerMember.ts` was using:

```typescript
// BEFORE (BROKEN):
handler: publicEndpoint(handler)
```

The `publicEndpoint()` wrapper enables Content-Type validation by default, which rejects any non-`application/json` Content-Type. However, the `registerMember` handler is specifically designed to accept `multipart/form-data` for file uploads (line 90-102).

### 3. Fix Applied ✅

Changed the endpoint registration to explicitly disable Content-Type validation:

```typescript
// AFTER (FIXED):
handler: wrapEndpoint(handler, {
  requireAuth: false,
  enableContentTypeValidation: false // Multipart/form-data endpoint
})
```

**Why this is safe:**
- The handler performs its own Content-Type validation (lines 90-102)
- Validates boundary parameter exists
- Validates file is PDF with magic number check
- Validates file size < 10MB
- Validates all required form fields

### 4. Created Comprehensive Test Script ✅

**New file:** `api/tests/member-registration-with-kvk-document.sh`

**Tests:**
- ✅ Multipart/form-data request with PDF upload
- ✅ All 14 required form fields
- ✅ Document upload to Azure Blob Storage
- ✅ Document Intelligence OCR extraction
- ✅ KvK API validation
- ✅ Response structure validation
- ✅ Verification status analysis

### 5. Build Verification ✅

```bash
cd api && npm run build
```

**Result:** ✅ Build succeeds with no TypeScript errors

---

## DEPLOYMENT INSTRUCTIONS

### Option 1: Azure DevOps Pipeline (Recommended)

1. **Push commit to Azure DevOps:**
   ```bash
   cd /Users/ramondenoronha/Dev/DIL/ASR-full
   git push origin main
   ```

   **Note:** Current PAT token has expired. You'll need to authenticate with valid credentials.

2. **Monitor pipeline:**
   - Open: https://dev.azure.com/ctn-demo/ASR/_build
   - Wait for "ASR API Pipeline" to complete (~3-5 minutes)
   - Verify: ✅ Build succeeded

3. **Verify deployment:**
   ```bash
   # Check API uptime (should be < 5 minutes)
   curl https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1/version | jq '.api.uptime'
   ```

4. **Run test:**
   ```bash
   ./api/tests/member-registration-with-kvk-document.sh
   ```

   **Expected:** HTTP 201 Created with applicationId

### Option 2: Manual Deployment (If pipeline fails)

```bash
cd /Users/ramondenoronha/Dev/DIL/ASR-full/api
npm run build
func azure functionapp publish func-ctn-demo-asr-dev --typescript --build remote
```

**Duration:** ~5-10 minutes

**Verify:**
```bash
# Wait 2 minutes, then test
sleep 120
./api/tests/member-registration-with-kvk-document.sh
```

---

## POST-DEPLOYMENT VERIFICATION

### Step 1: API Health Check
```bash
curl https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1/version | jq '.'
```

**Expected:** API version info with recent uptime

### Step 2: Run Complete Test
```bash
cd /Users/ramondenoronha/Dev/DIL/ASR-full
./api/tests/member-registration-with-kvk-document.sh
```

**Expected output:**
```
========================================================================
  Member Registration API Test (WITH KvK Document Upload)
========================================================================

✓ KvK document found (0.36 MB)
✓ File is a valid PDF

[1/3] Submitting member registration with KvK document...
✓ Registration request accepted (201 Created)

[2/3] Validating response data...
✓ Application ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
✓ Application Status: pending
✓ Verification Status: verified/flagged/failed
✓ Verification Message: ...
✓ Submitted At: 2025-11-05T...
✓ Next Steps: [5 steps]
✓ All required response fields present

[3/3] Analyzing document verification results...
✓ VERIFIED - Document passed all validation checks

Test completed successfully! ✓
```

### Step 3: Check Database
```bash
psql "host=psql-ctn-demo-asr-dev.postgres.database.azure.com ..." \
  -c "SELECT application_id, legal_name, kvk_verification_status FROM applications ORDER BY submitted_at DESC LIMIT 1;"
```

**Expected:** Recent application with verification status

### Step 4: Check Blob Storage
- Azure Portal → Storage Account `stctndemodev`
- Container: `documents`
- Path: `applications/{application_id}/kvk-document.pdf`

**Expected:** PDF file exists

---

## FILES CHANGED

### Modified
- ✅ `api/src/functions/registerMember.ts` (lines 3, 609-620)
  - Changed import from `publicEndpoint` to `wrapEndpoint`
  - Disabled Content-Type validation for multipart/form-data

### Created
- ✅ `api/tests/member-registration-with-kvk-document.sh` (309 lines)
  - Comprehensive test script with KvK document upload
  - Pre-flight checks, validation, verification analysis

- ✅ `api/tests/README-MEMBER-REGISTRATION-TEST.md`
  - Complete documentation for test suite
  - Deployment instructions
  - Troubleshooting guide

---

## RISK ASSESSMENT

### Security Impact: ✅ LOW RISK

**Why disabling Content-Type validation is safe:**

1. **Handler validates Content-Type** (lines 90-102):
   ```typescript
   if (!contentType || !contentType.includes('multipart/form-data')) {
     return { status: 400, body: JSON.stringify({ error: '...' }) };
   }
   ```

2. **File type validation** (lines 254-264):
   - PDF magic number check (`%PDF`)
   - MIME type verification
   - File size limit (10MB)

3. **Comprehensive input validation** (lines 168-236):
   - Email format
   - KvK number (8 digits)
   - LEI format (20 alphanumeric)
   - Phone format
   - Required fields check

4. **Other security measures still active:**
   - ✅ CORS enabled
   - ✅ HTTPS enforcement
   - ✅ Rate limiting
   - ✅ Security headers
   - ✅ Request ID tracking

### Regression Risk: ✅ LOW RISK

**Changes are isolated:**
- Only affects `/api/v1/register-member` endpoint
- No other endpoints modified
- No shared code changes
- No database schema changes

---

## ROLLBACK PLAN

If issues occur after deployment:

### Option 1: Revert Commit
```bash
git revert e1e8e7c
git push origin main
```

### Option 2: Re-enable Content-Type Validation
```typescript
// Revert to:
handler: publicEndpoint(handler)
```

Then redeploy.

---

## NEXT STEPS AFTER DEPLOYMENT

1. **Run API tests** (Test Engineer - TE agent)
   ```bash
   ./api/tests/member-registration-with-kvk-document.sh
   ```

2. **Run Playwright UI tests** (Test Engineer - TE agent)
   ```bash
   npx playwright test e2e/member-registration.spec.ts
   ```

3. **Test admin approval workflow**
   - Login to admin portal
   - Navigate to Applications > Pending
   - Review application with KvK document
   - Verify verification status display
   - Approve/reject application

4. **Test email notifications**
   - Verify applicant confirmation email
   - Verify admin notification email

5. **Update documentation** (Technical Writer - TW agent)
   - Move completed items from ROADMAP.md to COMPLETED_ACTIONS.md
   - Update API documentation with multipart/form-data example

---

## MONITORING

After deployment, monitor for:

### Azure Function Logs
```bash
func azure functionapp logstream func-ctn-demo-asr-dev | grep -E "(register-member|multipart)"
```

### Application Insights
- Query: `traces | where operation_Name == "registerMember"`
- Check for: 415 errors (should be 0), 201 success responses

### Database
```sql
-- Check registration success rate
SELECT
  status,
  kvk_verification_status,
  COUNT(*) as count
FROM applications
WHERE submitted_at > NOW() - INTERVAL '24 hours'
GROUP BY status, kvk_verification_status;
```

---

## CONTACT

**Issue discovered by:** Test Engineer (TE) agent - API-first testing workflow
**Fix implemented by:** Claude Code assistant
**Date:** November 5, 2025, 16:03 UTC
**Commit:** e1e8e7c

**Questions or issues?** Check:
- `api/tests/README-MEMBER-REGISTRATION-TEST.md` (troubleshooting)
- `docs/LESSONS_LEARNED.md` (Lesson #13 - API-first testing)
- Azure Function logs: `func azure functionapp logstream func-ctn-demo-asr-dev`
