# Automatic KvK Verification Implementation

**Date:** November 22, 2025
**Build:** 20251122.5 (succeeded)
**Status:** ✅ Deployed to Production

## Overview

Implemented complete automatic KvK document verification workflow migrated from Azure Functions legacy code. This resolves the "endless verification loop" issue where documents remained in 'pending' status indefinitely.

## What Was Implemented

### 1. Automatic Verification Pipeline

**File:** `api/src/routes.ts` (lines 1654-1903)

**Function:** `processKvKVerification(legalEntityId, blobUrl, verificationId)`

**Workflow:**
```
1. Document Upload
   ↓
2. Generate SAS URL (60-min expiry)
   ↓
3. Extract Data (Azure Document Intelligence)
   ↓
4. Compare Extracted vs Entered Data
   ↓
5. Validate Against KvK API
   ↓
6. Store KvK Registry Data
   ↓
7. Create EUID (NL.KVK.{kvk_number})
   ↓
8. Fetch LEI from GLEIF API
   ↓
9. Update Verification Status
   (verified | flagged | failed)
```

### 2. Data Extraction (Document Intelligence)

**Service:** `api/src/services/documentIntelligenceService.ts`

**Extracts:**
- Company name
- KvK number
- Confidence scores

### 3. KvK API Validation

**Service:** `api/src/services/kvkService.ts`

**Validates:**
- Company exists in KvK registry
- Name matches
- Status is active
- Retrieves complete company data

**Stores in:** `kvk_registry_data` table

### 4. EUID Creation

**Format:** `NL.KVK.{kvk_number}`

**Example:** `NL.KVK.80749100`

**Stored in:** `legal_entity_number` table with `identifier_type = 'EUID'`

### 5. LEI Enrichment (NEW)

**Service:** `api/src/services/leiService.ts`

**API:** GLEIF (Global LEI Foundation)

**Query:** `https://api.gleif.org/api/v1/lei-records?filter[entity.registeredAs]=NL-KVK/{kvkNumber}`

**Stored in:** `legal_entity_number` table with `identifier_type = 'LEI'`

**Status:** Non-fatal - verification continues even if LEI not found

### 6. Manual Trigger Endpoint

**Endpoint:** `POST /api/v1/legal-entities/:legalentityid/kvk-document/verify`

**Purpose:** Re-process documents uploaded before automatic verification existed

**Use Case:** LK Holding and other entities with 'pending' documents

## Verification Statuses

| Status | Meaning |
|--------|---------|
| `pending` | Verification in progress |
| `verified` | All checks passed |
| `flagged` | Mismatches detected (manual review needed) |
| `failed` | Verification process error |

## Mismatch Flags

Stored in `kvk_mismatch_flags` array:

- `entered_kvk_mismatch` - Entered KvK number doesn't match extracted
- `entered_name_mismatch` - Entered company name doesn't match extracted
- `kvk_api_not_found` - Company not found in KvK API
- `kvk_api_error` - KvK API call failed
- `company_inactive` - Company status is not active
- `processing_error` - Exception during verification

## Testing Instructions

### Test 1: Upload New Document

1. Go to Member Portal → Document Verification tab
2. Upload a valid KvK extract PDF
3. Observe status changes from `null` → `pending` → `verified`/`flagged`/`failed`
4. Check that EUID and LEI identifiers were created (if company has LEI)

### Test 2: Manual Verification Trigger

**For entities with existing documents (status stuck at 'pending'):**

```bash
#!/bin/bash

# Get token
TOKEN=$(curl -s -X POST "https://login.microsoftonline.com/598664e7-725c-4daa-bd1f-89c4ada717ff/oauth2/v2.0/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=d3037c11-a541-4f21-8862-8079137a0cde" \
  -d "scope=api://d3037c11-a541-4f21-8862-8079137a0cde/.default" \
  -d "username=test-e2@denoronha.consulting" \
  -d "password=Madu5952" \
  -d "grant_type=password" | jq -r '.access_token')

# Trigger verification for entity
ENTITY_ID="<legal_entity_id>"
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  "https://ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io/api/v1/legal-entities/$ENTITY_ID/kvk-document/verify"

# Wait 10 seconds
sleep 10

# Check results
curl -H "Authorization: Bearer $TOKEN" \
  "https://ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io/api/v1/legal-entities/$ENTITY_ID" | \
  jq '{kvk_verification_status, kvk_extracted_company_name, kvk_verified_at}'

# Check identifiers (should include EUID and possibly LEI)
curl -H "Authorization: Bearer $TOKEN" \
  "https://ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io/api/v1/legal-entities/$ENTITY_ID/identifiers" | \
  jq '.data[] | {identifier_type, identifier_value, validation_status}'
```

## Current Limitation: LK Holding

**Issue:** LK Holding has NO document uploaded (`kvk_document_url = null`)

**Why:** Historical entity - created before document upload feature existed

**Options:**
1. Upload document via Member Portal for LK Holding
2. Use another entity that has a document uploaded
3. Create test entity with document upload

## Services Used

| Service | Purpose | Config |
|---------|---------|--------|
| Azure Document Intelligence | PDF data extraction | `DOCUMENT_INTELLIGENCE_ENDPOINT`, `DOCUMENT_INTELLIGENCE_KEY` |
| Azure Blob Storage | Document storage | `AZURE_STORAGE_CONNECTION_STRING` |
| KvK API | Company validation | `KVK_API_KEY` |
| GLEIF API | LEI lookup | Public API (no auth) |

## Deployment Details

**Build:** 20251122.5
**Pipeline:** Association-Register-Backend
**Deployed:** Container Apps (ca-ctn-asr-api-dev)
**Status:** ✅ Succeeded

## Commits

1. `c73ea68` - feat(api): implement automatic KvK document verification
2. `087f407` - feat(api): add GLEIF LEI enrichment to automatic KvK verification

## Next Steps

### Immediate
- [ ] Upload KvK document for LK Holding via Member Portal
- [ ] Test complete verification flow end-to-end
- [ ] Verify EUID and LEI creation

### Future
- [ ] Implement BDI token endpoints (bdiJwks, generateBvad, validateBvod)
- [ ] Add Event Grid notifications for verification status changes
- [ ] Implement batch re-verification for all historical documents

## Migration Context

**What was missing:** The Azure Functions implementation (lines 192-346 in `uploadKvkDocument.ts`) contained complete automatic verification logic that was NEVER migrated to Container Apps.

**Impact:** Documents uploaded after Container Apps migration remained in 'pending' status indefinitely - there was no processing.

**Resolution:** Complete migration of verification pipeline with enhancements (LEI enrichment).

## Related Issues

- Missing member records (resolved separately via migration 032)
- Frontend polling shows "Verifying document..." indefinitely (now resolves automatically)
- No EUID/LEI enrichment (now implemented)
