# Identifier Verification Manager - Backend API Requirements

**Status:** Not Implemented
**Priority:** P2 (Feature Enhancement)
**Estimated Effort:** 3-4 hours
**Frontend Component:** `web/src/components/IdentifierVerificationManager.tsx`
**Last Updated:** 2025-10-19

---

## Executive Summary

The Identifier Verification Manager frontend component is complete and production-ready, but requires backend API implementation to enable document upload, verification tracking, and history management for all identifier types (KvK, LEI, EUID, HRB, etc.). Currently, only KvK-specific verification is supported via the existing `legal_entity` table columns.

**Why Not Implemented:**
- Frontend expects generic identifier verification for all types (KvK, LEI, EUID, HRB, etc.)
- Backend only supports KvK-specific verification via `legal_entity` table columns
- Requires new database table, API endpoints, Azure Blob Storage integration, and Document Intelligence API

**Frontend Readiness:** ✅ Component displays upload button with warning that backend is needed (lines 132-134)

---

## Current State

### What Exists
- ✅ Frontend component (`IdentifierVerificationManager.tsx`)
- ✅ UI for document upload with PDF validation
- ✅ Grid display for verification history
- ✅ Status badge rendering (pending, verified, failed, flagged)
- ✅ Comprehensive TODO comments in code (lines 56-73, 113-135)
- ✅ KvK-specific verification endpoint: `POST /v1/legal-entities/{legalEntityId}/kvk-verification`

### What's Missing
- ❌ Generic identifier verification table (`identifier_verification_history`)
- ❌ API endpoints for generic identifier verification (GET, POST, PUT)
- ❌ Azure Blob Storage integration for document uploads
- ❌ Azure Document Intelligence API integration for PDF extraction
- ❌ Backend validation and processing logic

---

## Required Components

### 1. Database Schema

Create new table: `identifier_verification_history`

```sql
CREATE TABLE identifier_verification_history (
    verification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legal_entity_id UUID NOT NULL REFERENCES legal_entity(legal_entity_id) ON DELETE CASCADE,
    identifier_type VARCHAR(50) NOT NULL, -- 'KvK', 'LEI', 'EUID', 'HRB', etc.
    identifier_value VARCHAR(255) NOT NULL,
    document_url VARCHAR(500), -- Azure Blob Storage URL
    document_filename VARCHAR(255),
    document_size_bytes INTEGER,
    verification_status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'verified', 'failed', 'flagged'
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    uploaded_by VARCHAR(255),
    verified_at TIMESTAMP WITH TIME ZONE,
    verified_by VARCHAR(255),
    verification_notes TEXT,
    extracted_data JSONB, -- Data extracted from Document Intelligence API
    mismatch_flags TEXT[], -- Array of field names that don't match
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT check_verification_status CHECK (verification_status IN ('pending', 'verified', 'failed', 'flagged'))
);

-- Indexes for performance
CREATE INDEX idx_identifier_verification_legal_entity
    ON identifier_verification_history(legal_entity_id);

CREATE INDEX idx_identifier_verification_status
    ON identifier_verification_history(verification_status);

CREATE INDEX idx_identifier_verification_type
    ON identifier_verification_history(identifier_type);
```

**Rationale:**
- Supports all identifier types (not just KvK)
- Tracks full verification lifecycle
- Stores extracted data for audit trail
- Flags mismatches for manual review

---

### 2. API Endpoints

#### 2.1 GET /v1/legal-entities/{legalEntityId}/verifications

**Purpose:** Retrieve all verification records for a legal entity

**Frontend Usage:** Line 63 in `IdentifierVerificationManager.tsx`

**Request:**
```http
GET /v1/legal-entities/{legalEntityId}/verifications HTTP/1.1
Authorization: Bearer {access_token}
```

**Query Parameters:**
- `identifier_type` (optional): Filter by identifier type (KvK, LEI, etc.)
- `status` (optional): Filter by status (pending, verified, failed, flagged)
- `limit` (optional): Number of records to return (default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Response (200 OK):**
```json
{
  "data": [
    {
      "verification_id": "123e4567-e89b-12d3-a456-426614174000",
      "identifier_type": "KvK",
      "identifier_value": "12345678",
      "document_url": "https://stctndemosasr.blob.core.windows.net/verifications/kvk-12345678.pdf",
      "verification_status": "verified",
      "verified_at": "2025-10-18T14:30:00Z",
      "verified_by": "user@example.com",
      "verification_notes": "Automatically verified via Document Intelligence",
      "uploaded_at": "2025-10-18T14:25:00Z",
      "extracted_data": {
        "kvk_number": "12345678",
        "company_name": "Example BV",
        "address": "Straat 123, 1234 AB Amsterdam"
      },
      "mismatch_flags": null
    }
  ],
  "total": 1,
  "limit": 50,
  "offset": 0
}
```

**Error Responses:**
- `401 Unauthorized`: Missing or invalid authentication token
- `403 Forbidden`: User doesn't have permission to access this legal entity
- `404 Not Found`: Legal entity not found

---

#### 2.2 POST /v1/legal-entities/{legalEntityId}/verifications

**Purpose:** Upload verification document and trigger automated verification

**Frontend Usage:** Line 123 in `IdentifierVerificationManager.tsx`

**Request:**
```http
POST /v1/legal-entities/{legalEntityId}/verifications HTTP/1.1
Content-Type: multipart/form-data
Authorization: Bearer {access_token}

--boundary
Content-Disposition: form-data; name="file"; filename="kvk-extract.pdf"
Content-Type: application/pdf

[PDF binary data]
--boundary
Content-Disposition: form-data; name="identifier_type"

KvK
--boundary
Content-Disposition: form-data; name="identifier_value"

12345678
--boundary--
```

**Validation Rules:**
- File must be PDF (validated at line 94 in frontend)
- File size max 10MB (validated at line 100 in frontend)
- `identifier_type` must be one of: KvK, LEI, EUID, HRB, DUNS, VAT, etc.
- `identifier_value` must match the format for the identifier type

**Response (201 Created):**
```json
{
  "verification_id": "123e4567-e89b-12d3-a456-426614174000",
  "identifier_type": "KvK",
  "identifier_value": "12345678",
  "document_url": "https://stctndemosasr.blob.core.windows.net/verifications/kvk-12345678.pdf",
  "verification_status": "pending",
  "uploaded_at": "2025-10-18T14:25:00Z",
  "message": "Document uploaded successfully. Verification in progress."
}
```

**Error Responses:**
- `400 Bad Request`: Invalid file type, size, or missing required fields
- `401 Unauthorized`: Missing or invalid authentication token
- `403 Forbidden`: User doesn't have permission to access this legal entity
- `404 Not Found`: Legal entity not found
- `413 Payload Too Large`: File exceeds 10MB limit
- `500 Internal Server Error`: Azure Blob Storage or Document Intelligence API failure

---

#### 2.3 PUT /v1/legal-entities/{legalEntityId}/verifications/{verificationId}

**Purpose:** Update verification status (manual review/override)

**Request:**
```http
PUT /v1/legal-entities/{legalEntityId}/verifications/{verificationId} HTTP/1.1
Content-Type: application/json
Authorization: Bearer {access_token}

{
  "verification_status": "verified",
  "verification_notes": "Manually verified by admin after resolving discrepancies"
}
```

**Response (200 OK):**
```json
{
  "verification_id": "123e4567-e89b-12d3-a456-426614174000",
  "verification_status": "verified",
  "verified_at": "2025-10-18T15:00:00Z",
  "verified_by": "admin@example.com",
  "verification_notes": "Manually verified by admin after resolving discrepancies"
}
```

**Error Responses:**
- `400 Bad Request`: Invalid status value
- `401 Unauthorized`: Missing or invalid authentication token
- `403 Forbidden`: User doesn't have permission or insufficient role
- `404 Not Found`: Verification record not found

---

### 3. Azure Blob Storage Integration

**Container:** `verifications` (private access)

**Blob Naming Convention:**
```
{legal_entity_id}/{identifier_type}/{identifier_value}/{timestamp}_{filename}

Example:
a1b2c3d4-e5f6-7890-abcd-ef1234567890/KvK/12345678/20251018142500_kvk-extract.pdf
```

**SAS Token Requirements:**
- Read-only access
- 1-year expiration
- Generated on-demand when document URL is accessed
- Stored in database as permanent blob URL (SAS token added at runtime)

**Implementation:**
```typescript
import { BlobServiceClient } from '@azure/storage-blob';

async function uploadVerificationDocument(
  legalEntityId: string,
  identifierType: string,
  identifierValue: string,
  file: Buffer,
  filename: string
): Promise<string> {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
  const containerClient = blobServiceClient.getContainerClient('verifications');

  const timestamp = new Date().toISOString().replace(/[:-]/g, '').split('.')[0];
  const blobName = `${legalEntityId}/${identifierType}/${identifierValue}/${timestamp}_${filename}`;
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  await blockBlobClient.upload(file, file.length, {
    blobHTTPHeaders: { blobContentType: 'application/pdf' },
    metadata: {
      legalEntityId,
      identifierType,
      identifierValue,
      uploadedAt: new Date().toISOString()
    }
  });

  return blockBlobClient.url;
}
```

---

### 4. Azure Document Intelligence Integration

**Purpose:** Automatically extract data from uploaded PDF documents

**Supported Documents:**
- KvK Extracts (Netherlands Chamber of Commerce)
- LEI Certificates (Legal Entity Identifier)
- EUID Certificates (European Unique Identifier)
- HRB Extracts (German Commercial Register)
- VAT Registration Documents

**Implementation:**
```typescript
import { DocumentAnalysisClient, AzureKeyCredential } from '@azure/ai-form-recognizer';

async function extractDocumentData(
  documentUrl: string,
  identifierType: string
): Promise<Record<string, string>> {
  const endpoint = process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT;
  const apiKey = process.env.AZURE_DOCUMENT_INTELLIGENCE_API_KEY;

  const client = new DocumentAnalysisClient(endpoint, new AzureKeyCredential(apiKey));

  // Use prebuilt model for business cards, invoices, or custom model
  const poller = await client.beginAnalyzeDocument('prebuilt-document', documentUrl);
  const result = await poller.pollUntilDone();

  // Extract key-value pairs based on identifier type
  const extracted = {};

  for (const keyValue of result.keyValuePairs || []) {
    if (keyValue.key && keyValue.value) {
      extracted[keyValue.key.content] = keyValue.value.content;
    }
  }

  // Validate extracted data against expected fields for identifier type
  return validateExtractedData(extracted, identifierType);
}

function validateExtractedData(
  extracted: Record<string, string>,
  identifierType: string
): Record<string, string> {
  const validators = {
    KvK: ['kvk_number', 'company_name', 'address'],
    LEI: ['lei_code', 'legal_name', 'registration_date'],
    EUID: ['euid_number', 'country_code', 'company_name'],
    // Add more validators as needed
  };

  const requiredFields = validators[identifierType] || [];
  const validated = {};

  for (const field of requiredFields) {
    // Fuzzy match field names in extracted data
    const match = findBestMatch(field, Object.keys(extracted));
    if (match) {
      validated[field] = extracted[match];
    }
  }

  return validated;
}
```

---

### 5. Verification Logic

**Automated Verification Flow:**

1. **Upload Document** (POST /verifications)
   - Validate file type and size
   - Upload to Azure Blob Storage
   - Create verification record with status='pending'
   - Return 201 Created immediately

2. **Background Processing** (Azure Function or Queue Trigger)
   - Call Document Intelligence API to extract data
   - Store extracted data in `extracted_data` JSONB column
   - Compare extracted data with existing identifier values
   - If mismatch detected:
     - Set status='flagged'
     - Store mismatched fields in `mismatch_flags` array
   - If data matches:
     - Set status='verified'
     - Set `verified_at` and `verified_by` (auto)
   - If extraction fails:
     - Set status='failed'
     - Store error in `verification_notes`

3. **Manual Review** (PUT /verifications/{id})
   - Admin can override status
   - Add notes explaining manual verification
   - Update `verified_by` with admin email

**Mismatch Detection:**
```typescript
function detectMismatches(
  expectedValues: Record<string, string>,
  extractedValues: Record<string, string>
): string[] {
  const mismatches: string[] = [];

  for (const [key, expectedValue] of Object.entries(expectedValues)) {
    const extractedValue = extractedValues[key];

    if (!extractedValue) {
      mismatches.push(key); // Field not found in document
      continue;
    }

    // Normalize and compare (case-insensitive, trim whitespace)
    const normalizedExpected = expectedValue.toLowerCase().trim();
    const normalizedExtracted = extractedValue.toLowerCase().trim();

    if (normalizedExpected !== normalizedExtracted) {
      mismatches.push(key);
    }
  }

  return mismatches;
}
```

---

## Security Considerations

### Authentication & Authorization
- ✅ All endpoints require Azure AD authentication (`Authorization: Bearer` token)
- ✅ User must have permission to access the legal entity (RBAC check)
- ✅ Admin role required for manual verification override (PUT endpoint)

### Data Protection
- ✅ Uploaded documents stored in private Azure Blob Storage container
- ✅ SAS tokens generated on-demand with 1-year expiration
- ✅ Document URLs not exposed publicly (only accessible via authenticated API)
- ✅ Sensitive extracted data stored in JSONB (encrypted at rest)

### Input Validation
- ✅ File type validation (PDF only)
- ✅ File size limit (10MB)
- ✅ Identifier value format validation
- ✅ SQL injection protection (parameterized queries)

### Audit Trail
- ✅ Full verification lifecycle tracked (`uploaded_at`, `verified_at`, `verified_by`)
- ✅ Verification notes stored for manual reviews
- ✅ Extracted data preserved for compliance

---

## Testing Requirements

### Unit Tests
- Database operations (INSERT, SELECT, UPDATE)
- Mismatch detection logic
- Extracted data validation
- Identifier format validation

### Integration Tests
- Azure Blob Storage upload/download
- Document Intelligence API extraction
- End-to-end verification flow
- Error handling (API failures, network issues)

### API Tests (curl)
```bash
# Test GET endpoint
curl -X GET \
  "https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1/legal-entities/{id}/verifications" \
  -H "Authorization: Bearer {token}"

# Test POST endpoint
curl -X POST \
  "https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1/legal-entities/{id}/verifications" \
  -H "Authorization: Bearer {token}" \
  -F "file=@kvk-extract.pdf" \
  -F "identifier_type=KvK" \
  -F "identifier_value=12345678"

# Test PUT endpoint
curl -X PUT \
  "https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1/legal-entities/{id}/verifications/{verification_id}" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"verification_status": "verified", "verification_notes": "Manually verified"}'
```

### Playwright E2E Tests
```typescript
test('Upload identifier verification document', async ({ page }) => {
  await page.goto('/legal-entities/{id}');
  await page.click('text=Identifier Verification');

  // Select identifier
  await page.click('.k-dropdown');
  await page.click('text=KvK - 12345678');

  // Upload document
  await page.setInputFiles('input[type="file"]', 'tests/fixtures/kvk-extract.pdf');

  // Verify upload success
  await expect(page.locator('text=Document uploaded successfully')).toBeVisible();

  // Verify record appears in grid
  await expect(page.locator('.k-grid-table >> text=KvK - 12345678')).toBeVisible();
  await expect(page.locator('.k-grid-table >> text=pending')).toBeVisible();
});
```

---

## Implementation Checklist

### Phase 1: Database & Basic API (2 hours)
- [ ] Create `identifier_verification_history` table
- [ ] Create migration script: `database/migrations/XXX_create_identifier_verification_history.sql`
- [ ] Implement GET `/v1/legal-entities/{id}/verifications` endpoint
- [ ] Implement POST `/v1/legal-entities/{id}/verifications` endpoint (without Document Intelligence)
- [ ] Add database access functions in `api/src/utils/database.ts`
- [ ] Add RBAC checks for legal entity access

### Phase 2: Azure Blob Storage (30 minutes)
- [ ] Create private `verifications` container in Azure Storage
- [ ] Implement document upload function
- [ ] Implement SAS token generation for document access
- [ ] Add error handling for storage failures

### Phase 3: Document Intelligence (1 hour)
- [ ] Set up Azure Document Intelligence resource
- [ ] Implement PDF extraction function
- [ ] Implement mismatch detection logic
- [ ] Create background processing function (Queue Trigger or HTTP)
- [ ] Update verification status based on extraction results

### Phase 4: Manual Review (30 minutes)
- [ ] Implement PUT `/v1/legal-entities/{id}/verifications/{verification_id}` endpoint
- [ ] Add admin role check for manual overrides
- [ ] Add verification notes support

### Phase 5: Testing (1 hour)
- [ ] Write unit tests for database operations
- [ ] Write API tests (curl scripts in `api/tests/`)
- [ ] Write Playwright E2E tests
- [ ] Test with TE agent
- [ ] Security review with SA agent

### Phase 6: Documentation (30 minutes)
- [ ] Update API documentation (Swagger/OpenAPI)
- [ ] Update frontend component comments (remove TODO warnings)
- [ ] Add usage examples to README
- [ ] Document with TW agent

---

## Deployment Steps

1. **Database Migration:**
   ```bash
   psql "host=..." -f database/migrations/XXX_create_identifier_verification_history.sql
   ```

2. **Azure Resources:**
   - Create Azure Storage account (if not exists)
   - Create `verifications` container
   - Create Document Intelligence resource
   - Add connection strings to Azure Key Vault

3. **API Deployment:**
   ```bash
   cd api
   npm run build
   func azure functionapp publish func-ctn-demo-asr-dev --typescript --build remote
   ```

4. **Frontend Update:**
   - Remove TODO warnings from `IdentifierVerificationManager.tsx`
   - Test upload flow in dev environment
   - Deploy to production

---

## Related Files

**Frontend:**
- `web/src/components/IdentifierVerificationManager.tsx` - Main component (lines 56-73, 113-135 have TODOs)
- `web/src/components/IdentifierVerificationManager.css` - Component styles

**Backend (To Create):**
- `api/src/functions/GetIdentifierVerifications.ts` - GET endpoint
- `api/src/functions/CreateIdentifierVerification.ts` - POST endpoint
- `api/src/functions/UpdateIdentifierVerification.ts` - PUT endpoint
- `api/src/utils/blobStorage.ts` - Azure Blob Storage helpers
- `api/src/utils/documentIntelligence.ts` - Document extraction helpers
- `database/migrations/XXX_create_identifier_verification_history.sql` - Database schema

**Testing:**
- `api/tests/identifier-verification-api.sh` - API test scripts (curl)
- `web/e2e/identifier-verification.spec.ts` - Playwright E2E tests

---

## Success Criteria

- [ ] All 3 API endpoints implemented and tested
- [ ] Documents successfully uploaded to Azure Blob Storage
- [ ] Document Intelligence extracts data from PDFs
- [ ] Verification history displays in frontend grid
- [ ] Mismatches flagged and visible to admins
- [ ] Manual override works for admin users
- [ ] All API tests passing (curl)
- [ ] All E2E tests passing (Playwright)
- [ ] Security review passed (SA agent)
- [ ] Code review passed (CR agent)
- [ ] Documentation complete (TW agent)

---

## Notes

- This feature is **not blocking production** - system functions without it
- KvK verification is already supported via existing endpoint
- This enhancement provides generic verification for all identifier types
- Frontend is production-ready and waiting for backend implementation
- Estimated effort: **3-4 hours** for experienced Azure Functions developer

---

**Document Version:** 1.0
**Created By:** Claude Code
**Last Updated:** 2025-10-19
**Status:** Ready for Implementation
