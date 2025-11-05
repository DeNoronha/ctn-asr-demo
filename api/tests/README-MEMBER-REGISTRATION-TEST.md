# Member Registration API Test - KvK Document Upload

## Overview

This test suite validates the complete member registration workflow including:
- Multipart/form-data file upload
- KvK document upload to Azure Blob Storage
- Document Intelligence OCR extraction
- KvK API validation
- Application creation with verification status

## Test Scripts

### 1. **member-registration-with-kvk-document.sh** (Recommended)

**Complete end-to-end test with KvK document upload**

```bash
cd /Users/ramondenoronha/Dev/DIL/ASR-full
./api/tests/member-registration-with-kvk-document.sh
```

**What it tests:**
- ✅ Multipart/form-data request with PDF file upload
- ✅ All 14 required form fields
- ✅ Document upload to Azure Blob Storage
- ✅ Document Intelligence OCR extraction
- ✅ KvK API validation
- ✅ Response structure validation
- ✅ Verification status analysis (verified/flagged/failed)

**Expected outcome:**
- HTTP 201 Created
- Application ID returned
- Verification status: `verified`, `flagged`, or `failed`
- Verification message explaining next steps

### 2. **member-registration-api-test.sh** (Legacy - JSON only)

**Basic registration test WITHOUT document upload**

```bash
cd /Users/ramondenoronha/Dev/DIL/ASR-full
./api/tests/member-registration-api-test.sh
```

**Limitations:**
- ❌ No document upload
- ❌ No verification workflow testing
- ⚠️ Only tests application creation

## Recent Fixes (November 5, 2025)

### Issue: 415 Unsupported Media Type

**Symptom:**
```json
{
  "error": "unsupported_media_type",
  "error_description": "Content-Type must be 'application/json' for POST requests",
  "received_content_type": "multipart/form-data"
}
```

**Root Cause:**
The `registerMember` endpoint was using `publicEndpoint(handler)` which enables Content-Type validation by default, expecting `application/json`. However, the endpoint is designed to accept `multipart/form-data` for file uploads.

**Fix Applied:**
```typescript
// Before (BROKEN):
handler: publicEndpoint(handler)

// After (FIXED):
handler: wrapEndpoint(handler, {
  requireAuth: false,
  enableContentTypeValidation: false // Multipart/form-data endpoint
})
```

**Commit:** `e1e8e7c` - "fix(api): enable multipart/form-data for register-member endpoint"

## Deployment Instructions

### Option 1: Azure DevOps Pipeline (Recommended)

After committing the fix, the API pipeline should deploy automatically:

1. **Push to main:**
   ```bash
   git push origin main
   ```

2. **Monitor deployment:**
   - Open: https://dev.azure.com/ctn-demo/ASR/_build
   - Wait for "ASR API Pipeline" to complete (~3-5 minutes)
   - Verify build status: ✅ Succeeded

3. **Run test:**
   ```bash
   ./api/tests/member-registration-with-kvk-document.sh
   ```

### Option 2: Manual Deployment (If pipeline unavailable)

```bash
cd /Users/ramondenoronha/Dev/DIL/ASR-full/api
npm run build
func azure functionapp publish func-ctn-demo-asr-dev --typescript --build remote
```

**Note:** Manual deployment takes ~5-10 minutes. Wait for confirmation before testing.

## Verification After Deployment

### Step 1: Check API Health
```bash
curl https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1/version | jq '.'
```

Expected: API version info with uptime > 0

### Step 2: Run Complete Test
```bash
./api/tests/member-registration-with-kvk-document.sh
```

Expected output:
```
✓ KvK document found
✓ File is a valid PDF
✓ Registration request accepted (201 Created)
✓ Application ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
✓ Verification Status: verified/flagged/failed
✓ All required response fields present
```

### Step 3: Verify Database Record

```bash
psql "host=psql-ctn-demo-asr-dev.postgres.database.azure.com port=5432 dbname=asr user=ASR_admin password=YOUR_PASSWORD sslmode=require"
```

```sql
SELECT
  application_id,
  legal_name,
  kvk_number,
  status,
  kvk_verification_status,
  submitted_at
FROM applications
ORDER BY submitted_at DESC
LIMIT 1;
```

Expected: Recent application with verification status

### Step 4: Verify Blob Storage

1. Open Azure Portal
2. Navigate to Storage Account: `stctndemodev`
3. Container: `documents`
4. Path: `applications/{application_id}/kvk-document.pdf`

Expected: PDF file uploaded successfully

## Test Data

### KvK Document Location
```
/Users/ramondenoronha/Desktop/KvK-DNC-95944192.pdf
```

**Properties:**
- Company: DNC B.V.
- KvK Number: 95944192
- File Size: ~370 KB
- Format: PDF

### Test Application Data

The test script generates unique test data:
```javascript
TIMESTAMP=$(date +%s)
TEST_EMAIL="test-member-${TIMESTAMP}@example.com"
TEST_KVK=$(printf "%08d" $(echo $TIMESTAMP | tail -c 8))  // 8-digit KvK
TEST_COMPANY="Test Company B.V. ${TIMESTAMP}"
```

### Cleanup

Test applications are tracked in:
```
/tmp/test-applications.txt
```

To clean up test data:
```sql
-- Mark test applications as rejected
UPDATE applications
SET status = 'rejected',
    updated_at = NOW()
WHERE applicant_email LIKE 'test-member-%@example.com'
  AND status = 'pending';

-- Or permanently delete (use with caution)
DELETE FROM applications
WHERE applicant_email LIKE 'test-member-%@example.com';
```

## Verification Status Explained

### ✅ `verified`
- Document Intelligence extracted KvK number successfully
- KvK API confirmed company exists and is active
- No discrepancies between entered and extracted data
- **Action:** Admin can approve immediately

### ⚠️ `flagged`
- Document uploaded and data extracted
- Some warnings detected:
  - `entered_kvk_mismatch`: Entered KvK ≠ Extracted KvK
  - `entered_name_mismatch`: Entered name ≠ Extracted name
  - `kvk_api_inactive`: Company inactive in KvK registry
  - `kvk_api_name_mismatch`: KvK registry name differs
- **Action:** Admin must review manually before approval

### ❌ `failed`
- Document Intelligence could not extract data
- OR KvK API validation failed completely
- Possible causes:
  - Poor document quality
  - Non-standard document format
  - KvK API unavailable
  - Network/service errors
- **Action:** Admin must verify document manually

### ⏳ `pending`
- Document uploaded successfully
- Verification queued for async processing
- **Action:** Wait for verification to complete

## Troubleshooting

### Issue: Test script can't find KvK document

**Error:**
```
✗ KvK document not found: /Users/ramondenoronha/Desktop/KvK-DNC-95944192.pdf
```

**Solution:**
```bash
# List available PDF files
ls -lh ~/Desktop/*.pdf

# Update KVK_DOCUMENT_PATH in script
export KVK_DOCUMENT_PATH="/path/to/your/kvk-document.pdf"
./api/tests/member-registration-with-kvk-document.sh
```

### Issue: 415 Unsupported Media Type (After deployment)

**Error:**
```json
{
  "error": "unsupported_media_type",
  "received_content_type": "multipart/form-data"
}
```

**Root Cause:** Deployment didn't complete or old code still running

**Solution:**
```bash
# 1. Verify deployment completed
curl https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1/version | jq '.api.uptime'

# 2. Check if uptime is recent (< 5 minutes)
# If uptime > 1 hour, deployment may not have restarted function app

# 3. Manually restart function app
az functionapp restart --name func-ctn-demo-asr-dev --resource-group rg-ctn-demo-dev
```

### Issue: 409 Conflict - Duplicate application

**Error:**
```json
{
  "error": "Application already exists",
  "applicationId": "xxx",
  "status": "pending"
}
```

**Root Cause:** Test script was run multiple times with same email

**Solution:** Test script automatically generates unique emails, but if you see this error:
```sql
-- Check existing applications
SELECT application_id, applicant_email, status
FROM applications
WHERE applicant_email LIKE 'test-member-%@example.com';

-- Reject old test applications
UPDATE applications
SET status = 'rejected'
WHERE applicant_email LIKE 'test-member-%@example.com';
```

### Issue: Document Intelligence extraction failed

**Error:** Verification status = `failed` with flag `extraction_failed`

**Possible Causes:**
1. Document Intelligence service unavailable
2. SAS token generation failed
3. PDF file corrupted or unsupported format

**Check logs:**
```bash
func azure functionapp logstream func-ctn-demo-asr-dev | grep -i "document intelligence"
```

### Issue: KvK API validation failed

**Error:** Verification status = `failed` with flag `api_error`

**Possible Causes:**
1. KvK API service unavailable
2. Rate limiting
3. Invalid API key

**Check KvK service:**
```bash
# Test KvK API directly (requires API key)
curl "https://api.kvk.nl/api/v1/zoeken?kvkNummer=95944192" \
  -H "apikey: YOUR_API_KEY"
```

## Related Documentation

- **Implementation Plan:** `docs/MEMBER_REGISTRATION_IMPLEMENTATION_PLAN.md`
- **API Documentation:** `api/src/openapi.json`
- **Database Schema:** `database/schema/current_schema.sql`
- **Lessons Learned:** `docs/LESSONS_LEARNED.md` (Lesson #13 - API-first testing)

## Next Steps

After API tests pass:

1. **Playwright UI Tests** (Test Engineer - TE agent)
   ```bash
   npx playwright test e2e/member-registration.spec.ts
   ```

2. **Admin Portal Approval Workflow**
   - Login to admin portal as system admin
   - Navigate to Applications > Pending
   - Review application with document viewer
   - Check verification status and flags
   - Approve/reject application

3. **Email Notification Verification**
   - Check applicant receives confirmation email
   - Check admin receives notification email
   - Verify email template formatting

4. **Azure AD Invitation (Post-approval)**
   - Verify approved member receives Azure AD invitation
   - Test member can accept invitation
   - Test member can login to member portal
