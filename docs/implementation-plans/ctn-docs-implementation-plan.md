# Implementation Plan: CTN Portal Improvements

**Created:** October 19, 2025
**User Availability:** Evening (autonomous execution until then)
**Working Directory:** `/Users/ramondenoronha/Dev/DIL/ASR-full/ctn-docs-portal`

---

## Overview

**Goal:** Implement security hardening, code quality improvements, and document requirements for features across all CTN portals (Admin, Member, Orchestrator, Documentation).

**Total Tasks:** 10 (8 implementable today, 1 backend requirement documentation, 1 deferred)
**Estimated Total Time:** 6-8 hours

**Success Criteria:**
- [ ] All security improvements deployed and tested
- [ ] Code quality improvements committed with tests
- [ ] Backend requirements documented for IdentifierVerificationManager
- [ ] ROADMAP.md updated by TW agent
- [ ] All changes tested with API-first methodology

---

## Priority Structure

### P0 - Security Improvements (MUST DO FIRST)
**Time Estimate:** 2-3 hours
Tasks 1-3 address security vulnerabilities and hardening

### P1 - Code Quality (QUICK WINS)
**Time Estimate:** 3-4 hours
Tasks 4-7 improve maintainability and developer experience

### P2 - Feature Documentation (BACKEND REQUIRED)
**Time Estimate:** 1 hour
Task 9 documents requirements for backend team

### P3 - Deferred (COMPLEX)
Task 10 requires architectural changes (server-side pagination)

---

## Stage 1: Security Hardening - Orchestrator Portal

**Goal:** Fix CSP and HSTS vulnerabilities in Orchestrator Portal
**Time Estimate:** 30 minutes
**Status:** Not Started

### Task 1.1: Remove 'unsafe-eval' from CSP

**Priority:** P0 - Security
**Impact:** MEDIUM - Allows arbitrary JavaScript execution
**Location:** `/Users/ramondenoronha/Dev/DIL/ASR-full/orchestrator-portal/staticwebapp.config.json`

**Current State:**
```json
"Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://unpkg.com; img-src 'self' data: https:; font-src 'self' data: https://unpkg.com; connect-src 'self' https://func-ctn-demo-asr-dev.azurewebsites.net; frame-ancestors 'none'"
```

**Required Change:**
- Verify no code uses `eval()` or `Function()` constructor
- Remove 'unsafe-inline' if possible (check if any inline scripts exist)
- If inline scripts needed, consider using nonces or hashes

**Files to Modify:**
- `/Users/ramondenoronha/Dev/DIL/ASR-full/orchestrator-portal/staticwebapp.config.json`

**Testing Strategy:**
- Build and run Orchestrator Portal locally
- Verify no CSP violations in browser console
- Test all interactive features work correctly
- Use TE agent to run Playwright tests

**Success Criteria:**
- [ ] CSP header updated in staticwebapp.config.json
- [ ] No 'unsafe-eval' or 'unsafe-inline' in script-src
- [ ] Orchestrator Portal functions correctly
- [ ] Playwright tests pass (12/12)

---

### Task 1.2: Increase HSTS max-age to 1 year

**Priority:** P0 - Security
**Impact:** LOW - Best practice for HSTS preload
**Location:** Same file as Task 1.1

**Current State:**
```json
"Strict-Transport-Security": "max-age=10886400; includeSubDomains; preload"
```
Current: 126 days (10886400 seconds)

**Required Change:**
```json
"Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload"
```
New: 365 days (31536000 seconds)

**Files to Modify:**
- `/Users/ramondenoronha/Dev/DIL/ASR-full/orchestrator-portal/staticwebapp.config.json`

**Testing Strategy:**
- Verify header in response using curl or browser DevTools
- Check header value matches expected max-age
- Use TE agent security header tests

**Success Criteria:**
- [ ] HSTS max-age set to 31536000 (1 year)
- [ ] Security header tests pass

---

## Stage 2: Secrets Migration to Azure Key Vault

**Goal:** Copy secrets to Azure Key Vault and update .credentials file
**Time Estimate:** 1.5-2 hours
**Status:** Not Started

### Task 2.1: Inventory All Secrets

**Priority:** P0 - Security
**Impact:** HIGH - Centralizes secret management

**Secrets to Migrate:**
1. **PostgreSQL Connection String**
   - Source: API environment variables
   - Key Vault Name: `POSTGRES-CONNECTION-STRING`

2. **JWT Secret**
   - Source: API environment variables
   - Key Vault Name: `JWT-SECRET`

3. **Azure Storage Connection String**
   - Source: API environment variables
   - Key Vault Name: `STORAGE-CONNECTION-STRING`

4. **Event Grid Access Key**
   - Source: API environment variables
   - Key Vault Name: `EVENTGRID-ACCESS-KEY`

5. **Cosmos DB Keys** (Orchestration API)
   - COSMOS_ORCHESTRATION_ENDPOINT
   - COSMOS_ORCHESTRATION_KEY
   - Key Vault Names: `COSMOS-ORCHESTRATION-ENDPOINT`, `COSMOS-ORCHESTRATION-KEY`

**Files to Check:**
- `/Users/ramondenoronha/Dev/DIL/ASR-full/.credentials` (if exists - gitignored)
- Azure Portal → Function App → Configuration → Application Settings
- Azure DevOps → Pipelines → Library → Variable Groups

**Azure Portal Access Required:** YES
**Credentials Required:** YES (Azure Portal login)

---

### Task 2.2: Add Secrets to Azure Key Vault

**Prerequisites:** Azure Portal access, Contributor role on Key Vault

**Steps:**
1. Navigate to Azure Portal → Key Vaults → `kv-ctn-demo-asr-dev` (or equivalent)
2. Add secrets with standardized naming:
   - Use UPPER-CASE-WITH-HYPHENS format
   - Add description and expiration date where applicable
3. Enable audit logging for secret access
4. Grant Function App managed identity access to Key Vault

**Success Criteria:**
- [ ] All 7 secrets added to Key Vault
- [ ] Function App has Get permissions on secrets
- [ ] Audit logging enabled

---

### Task 2.3: Update .credentials File

**Location:** `/Users/ramondenoronha/Dev/DIL/ASR-full/.credentials`

**Format:**
```bash
# CTN ASR Credentials - Local Development
# Last Updated: October 19, 2025
# NEVER COMMIT THIS FILE TO GIT

# PostgreSQL
POSTGRES_CONNECTION_STRING="<value from Key Vault>"

# JWT
JWT_SECRET="<value from Key Vault>"

# Azure Storage
STORAGE_CONNECTION_STRING="<value from Key Vault>"

# Event Grid
EVENTGRID_ACCESS_KEY="<value from Key Vault>"

# Cosmos DB (Orchestration)
COSMOS_ORCHESTRATION_ENDPOINT="<value from Key Vault>"
COSMOS_ORCHESTRATION_KEY="<value from Key Vault>"

# Azure Key Vault (for CI/CD)
KEY_VAULT_NAME="kv-ctn-demo-asr-dev"
KEY_VAULT_URL="https://kv-ctn-demo-asr-dev.vault.azure.net/"
```

**Success Criteria:**
- [ ] .credentials file created/updated with all secrets
- [ ] File format matches above template
- [ ] File in .gitignore (verify)

---

## Stage 3: Environment Variable Standardization

**Goal:** Standardize environment variable naming with VITE_ prefix
**Time Estimate:** 2-2.5 hours
**Status:** Not Started

### Task 3.1: Admin Portal - Standardize Variables

**Priority:** P1 - Code Quality
**Impact:** MEDIUM - Improves consistency and maintainability

**Current Naming (REACT_APP_*):**
- REACT_APP_AAD_CLIENT_ID
- REACT_APP_AAD_AUTHORITY
- REACT_APP_AAD_REDIRECT_URI
- REACT_APP_API_CLIENT_ID
- REACT_APP_API_BASE_URL

**New Naming (VITE_*):**
- VITE_AAD_CLIENT_ID
- VITE_AAD_AUTHORITY
- VITE_AAD_REDIRECT_URI
- VITE_API_CLIENT_ID
- VITE_API_BASE_URL

**Files to Modify:**

1. **Environment Files:**
   - `/Users/ramondenoronha/Dev/DIL/ASR-full/portal/.env`
   - `/Users/ramondenoronha/Dev/DIL/ASR-full/portal/.env.example`
   - `/Users/ramondenoronha/Dev/DIL/ASR-full/portal/.env.production`
   - `/Users/ramondenoronha/Dev/DIL/ASR-full/portal/.env.production.template`

2. **Vite Config:**
   - `/Users/ramondenoronha/Dev/DIL/ASR-full/portal/vite.config.ts`
   - Update `define` object to use VITE_ prefix

3. **Source Code (Find/Replace):**
   - Search: `process.env.REACT_APP_`
   - Replace: `process.env.VITE_`
   - Files: All `.ts` and `.tsx` files in `/Users/ramondenoronha/Dev/DIL/ASR-full/portal/src/`

4. **Azure DevOps Pipeline:**
   - `/Users/ramondenoronha/Dev/DIL/ASR-full/portal/azure-pipelines.yml` (if exists)
   - Variable group: `ctn-admin-portal-variables`
   - Update all variable names to VITE_ prefix

**Testing Strategy:**
- Build locally: `npm run build`
- Check generated files reference correct variables
- Test authentication flow
- Test API calls
- Run E2E tests

**Success Criteria:**
- [ ] All REACT_APP_* variables renamed to VITE_*
- [ ] Build succeeds without warnings
- [ ] Auth flow works correctly
- [ ] API calls successful
- [ ] E2E tests pass

---

### Task 3.2: Member Portal - Standardize Variables

**Same as Task 3.1, but for Member Portal**

**Files to Modify:**
- `/Users/ramondenoronha/Dev/DIL/ASR-full/web/.env.example`
- `/Users/ramondenoronha/Dev/DIL/ASR-full/web/vite.config.ts`
- All source files in `/Users/ramondenoronha/Dev/DIL/ASR-full/web/src/`
- Variable group: `ctn-member-portal-variables`

**Success Criteria:** Same as Task 3.1

---

### Task 3.3: Orchestrator Portal - Verify VITE_ Naming

**Files to Check:**
- `/Users/ramondenoronha/Dev/DIL/ASR-full/orchestrator-portal/vite.config.ts`
- `/Users/ramondenoronha/Dev/DIL/ASR-full/orchestrator-portal/src/`

**Expected:** Already using VITE_ prefix (verify only)

---

## Stage 4: Documentation Portal Improvements

**Goal:** Add error handling and version generation
**Time Estimate:** 1.5 hours
**Status:** Not Started

### Task 4.1: Add Error Handling to md-to-html.js

**Priority:** P1 - Code Quality
**Impact:** MEDIUM - Prevents silent failures during build

**Location:** `/Users/ramondenoronha/Dev/DIL/ASR-full/ctn-docs-portal/scripts/md-to-html.js`

**Current Issues:**
- No try/catch in `processMarkdownFile()` function
- Errors bubble up without context (which file failed?)
- No graceful degradation on malformed markdown

**Required Changes:**

1. **Wrap processMarkdownFile() in try/catch:**
```javascript
async function processMarkdownFile(mdFilePath) {
  try {
    console.log(`Processing: ${mdFilePath}`);

    // ... existing code ...

  } catch (error) {
    console.error(`\n❌ Failed to process: ${mdFilePath}`);
    console.error(`Error: ${error.message}`);
    console.error(`Stack: ${error.stack}`);

    // Re-throw to fail build (don't silently skip broken files)
    throw new Error(`Failed to process ${mdFilePath}: ${error.message}`);
  }
}
```

2. **Improve error context in build():**
```javascript
async function build() {
  try {
    // ... existing code ...

    for (const mdFile of mdFiles) {
      await processMarkdownFile(mdFile);
    }

  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ Build failed');
    console.error('='.repeat(60));
    console.error(`\nError: ${error.message}\n`);

    process.exit(1);
  }
}
```

3. **Add validation for templates:**
```javascript
async function readTemplate(templateName) {
  const templatePath = path.join(TEMPLATES_DIR, templateName);

  try {
    const content = await fs.readFile(templatePath, 'utf-8');

    if (!content || content.trim().length === 0) {
      throw new Error(`Template ${templateName} is empty`);
    }

    return content;
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`Template not found: ${templateName} (${templatePath})`);
    }
    throw error;
  }
}
```

**Files to Modify:**
- `/Users/ramondenoronha/Dev/DIL/ASR-full/ctn-docs-portal/scripts/md-to-html.js`

**Testing Strategy:**
- Run build script: `npm run build`
- Introduce intentional error (malformed markdown)
- Verify error message is clear and identifies problematic file
- Verify build exits with non-zero status
- Restore correct markdown, verify build succeeds

**Success Criteria:**
- [ ] All async functions have try/catch blocks
- [ ] Error messages include file path and error type
- [ ] Build fails fast with clear error output
- [ ] Normal build still works correctly

---

### Task 4.2: Add version.json Generation

**Priority:** P1 - Code Quality
**Impact:** LOW - Improves deployment verification

**Reference Implementation:**
See Admin/Member portal scripts (if they exist)

**Create:** `/Users/ramondenoronha/Dev/DIL/ASR-full/ctn-docs-portal/scripts/generate-version.js`

```javascript
#!/usr/bin/env node

/**
 * Generate version.json for deployment tracking
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function getGitInfo() {
  try {
    const commitHash = execSync('git rev-parse HEAD').toString().trim();
    const commitShort = execSync('git rev-parse --short HEAD').toString().trim();
    const branch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
    const commitDate = execSync('git log -1 --format=%cI').toString().trim();
    const commitMessage = execSync('git log -1 --format=%s').toString().trim();

    return {
      commitHash,
      commitShort,
      branch,
      commitDate,
      commitMessage,
    };
  } catch (error) {
    console.warn('⚠️  Warning: Could not get Git info (not a Git repository?)');
    return {
      commitHash: 'unknown',
      commitShort: 'unknown',
      branch: 'unknown',
      commitDate: new Date().toISOString(),
      commitMessage: 'unknown',
    };
  }
}

function generateVersion() {
  const git = getGitInfo();

  const version = {
    version: process.env.BUILD_NUMBER || '0.0.0-local',
    buildId: process.env.BUILD_BUILDID || 'local',
    buildDate: new Date().toISOString(),
    git,
    environment: process.env.NODE_ENV || 'production',
  };

  const outputPath = path.join(__dirname, '..', 'public', 'version.json');

  fs.writeFileSync(outputPath, JSON.stringify(version, null, 2));

  console.log('✅ Generated version.json');
  console.log(`   Version: ${version.version}`);
  console.log(`   Commit: ${version.git.commitShort}`);
  console.log(`   Build: ${version.buildId}`);
}

generateVersion();
```

**Update package.json:**
```json
{
  "scripts": {
    "build": "node scripts/generate-version.js && node scripts/md-to-html.js"
  }
}
```

**Files to Create:**
- `/Users/ramondenoronha/Dev/DIL/ASR-full/ctn-docs-portal/scripts/generate-version.js`

**Files to Modify:**
- `/Users/ramondenoronha/Dev/DIL/ASR-full/ctn-docs-portal/package.json`

**Testing Strategy:**
- Run: `node scripts/generate-version.js`
- Verify `public/version.json` created
- Check JSON format is valid
- Run full build: `npm run build`
- Verify version.json in output

**Success Criteria:**
- [ ] generate-version.js script created
- [ ] package.json build script updated
- [ ] version.json generated on build
- [ ] JSON contains all expected fields

---

## Stage 5: Orchestrator Portal - Health Check Service

**Goal:** Add health check service for API availability
**Time Estimate:** 1 hour
**Status:** Not Started

### Task 5.1: Create HealthCheck Service

**Priority:** P1 - Code Quality
**Impact:** MEDIUM - Improves user experience and debugging

**Create:** `/Users/ramondenoronha/Dev/DIL/ASR-full/orchestrator-portal/src/services/healthCheck.ts`

```typescript
/**
 * Health Check Service
 *
 * Monitors API availability and provides fallback behavior
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1';

export interface HealthCheckResult {
  healthy: boolean;
  endpoint: string;
  statusCode?: number;
  message: string;
  timestamp: string;
  responseTime?: number;
}

/**
 * Check if API is reachable and healthy
 */
export async function checkAPIHealth(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  const endpoint = `${API_BASE_URL}/health`;

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      // Timeout after 5 seconds
      signal: AbortSignal.timeout(5000),
    });

    const responseTime = Date.now() - startTime;

    if (response.ok) {
      return {
        healthy: true,
        endpoint,
        statusCode: response.status,
        message: 'API is healthy',
        timestamp: new Date().toISOString(),
        responseTime,
      };
    } else {
      return {
        healthy: false,
        endpoint,
        statusCode: response.status,
        message: `API returned ${response.status}: ${response.statusText}`,
        timestamp: new Date().toISOString(),
        responseTime,
      };
    }
  } catch (error) {
    const responseTime = Date.now() - startTime;

    if (error instanceof Error) {
      return {
        healthy: false,
        endpoint,
        message: `API unreachable: ${error.message}`,
        timestamp: new Date().toISOString(),
        responseTime,
      };
    }

    return {
      healthy: false,
      endpoint,
      message: 'API unreachable: Unknown error',
      timestamp: new Date().toISOString(),
      responseTime,
    };
  }
}

/**
 * Check health periodically
 */
export function createHealthCheckMonitor(
  onHealthChange: (result: HealthCheckResult) => void,
  intervalMs: number = 60000 // Check every 1 minute
): () => void {
  let intervalId: NodeJS.Timeout;

  const check = async () => {
    const result = await checkAPIHealth();
    onHealthChange(result);
  };

  // Initial check
  check();

  // Periodic checks
  intervalId = setInterval(check, intervalMs);

  // Return cleanup function
  return () => {
    clearInterval(intervalId);
  };
}
```

**Files to Create:**
- `/Users/ramondenoronha/Dev/DIL/ASR-full/orchestrator-portal/src/services/healthCheck.ts`

**Integration Example (for App.tsx or layout component):**
```typescript
import { useEffect, useState } from 'react';
import { checkAPIHealth, createHealthCheckMonitor, HealthCheckResult } from './services/healthCheck';

function App() {
  const [apiHealth, setApiHealth] = useState<HealthCheckResult | null>(null);

  useEffect(() => {
    // Set up health check monitoring
    const cleanup = createHealthCheckMonitor(setApiHealth);

    return cleanup;
  }, []);

  // Show warning banner if API is unhealthy
  if (apiHealth && !apiHealth.healthy) {
    return (
      <div className="api-error-banner">
        ⚠️ API is currently unavailable: {apiHealth.message}
      </div>
    );
  }

  return (
    // ... rest of app
  );
}
```

**Testing Strategy:**
- Create service file
- Write unit tests for checkAPIHealth()
- Test with API running (should return healthy: true)
- Test with API stopped (should return healthy: false with error message)
- Verify timeout works (5 second limit)
- Test monitor cleanup function

**Success Criteria:**
- [ ] healthCheck.ts service created
- [ ] checkAPIHealth() function implemented
- [ ] createHealthCheckMonitor() function implemented
- [ ] TypeScript types defined
- [ ] Service tested with API running and stopped

---

## Stage 6: Reduce 'any' Types (Targeted Approach)

**Goal:** Replace 'any' types in highest-impact files
**Time Estimate:** 1.5-2 hours
**Status:** Not Started

### Task 6.1: Identify High-Impact Files

**Priority:** P1 - Code Quality
**Impact:** HIGH - Improves type safety and maintainability

**Analysis Results:**
```
Admin Portal (web/): 62 occurrences across 19 files
- Primary offender: web/src/services/apiV2.ts

API: 100 occurrences across 48 files
- Primary offenders: api/src/middleware/auth.ts, api/src/functions/*.ts
```

**Targeted Approach (2 hours):**
Focus on files with highest impact (most called, most critical)

**High-Impact Files (Admin Portal):**
1. `/Users/ramondenoronha/Dev/DIL/ASR-full/web/src/services/apiV2.ts` - Core API client
2. `/Users/ramondenoronha/Dev/DIL/ASR-full/web/src/services/auth.ts` - Authentication

**High-Impact Files (API):**
1. `/Users/ramondenoronha/Dev/DIL/ASR-full/api/src/middleware/auth.ts` - Auth middleware
2. `/Users/ramondenoronha/Dev/DIL/ASR-full/api/src/utils/database.ts` - Database utilities

**Strategy:**
1. Read high-impact files
2. Identify 'any' types that can be easily replaced
3. Define proper interfaces/types
4. Replace 'any' with specific types
5. Verify TypeScript compilation succeeds
6. Run tests to ensure no runtime breaks

**Files to Modify:**
- See high-impact files above (4 files total)

**Testing Strategy:**
- TypeScript compilation: `npm run build` (no errors)
- Unit tests pass (if they exist)
- E2E tests pass
- Manual testing of critical flows

**Success Criteria:**
- [ ] At least 20-30 'any' types replaced with proper types
- [ ] TypeScript compilation succeeds
- [ ] All tests pass
- [ ] No runtime errors introduced

**Note:** This is a first pass. Full 'any' elimination is a larger effort (10+ hours) and should be tracked separately.

---

## Stage 7: Feature Documentation - Backend Requirements

**Goal:** Document IdentifierVerificationManager API requirements
**Time Estimate:** 1 hour
**Status:** Not Started

### Task 7.1: Create Backend API Requirements Document

**Priority:** P2 - Documentation (Backend Required)
**Impact:** BLOCKS FEATURE - Cannot implement frontend until backend exists

**Context:**
- Frontend component already exists: `IdentifierVerificationManager.tsx`
- Component has comprehensive TODO comments (lines 57, 110)
- Backend expects generic identifier verification for all types (KvK, LEI, EUID, HRB, etc.)
- Current backend only supports KvK-specific verification via legal_entity table

**Create:** `/Users/ramondenoronha/Dev/DIL/ASR-full/docs/backend-requirements/IDENTIFIER_VERIFICATION_API.md`

**Document Structure:**

```markdown
# Backend API Requirements: Identifier Verification Manager

**Created:** October 19, 2025
**Priority:** HIGH (blocks frontend feature)
**Estimated Backend Effort:** 3-4 hours
**Frontend Status:** Component ready, awaiting backend

---

## Overview

The IdentifierVerificationManager component requires a backend API to manage identifier verification history for legal entities. This includes document upload, automated extraction using Azure Document Intelligence, and verification status tracking.

---

## Database Schema

### New Table: `identifier_verification_history`

```sql
CREATE TABLE identifier_verification_history (
  id SERIAL PRIMARY KEY,
  legal_entity_id INTEGER NOT NULL REFERENCES legal_entities(id) ON DELETE CASCADE,

  -- Identifier details
  identifier_type VARCHAR(50) NOT NULL, -- 'KVK', 'LEI', 'EUID', 'HRB', 'CRN', etc.
  identifier_value VARCHAR(255) NOT NULL,

  -- Verification details
  verification_status VARCHAR(50) NOT NULL, -- 'pending', 'verified', 'failed', 'expired'
  verification_method VARCHAR(100), -- 'manual', 'document_upload', 'api_check', 'registry_lookup'

  -- Document tracking
  document_blob_url TEXT, -- Azure Blob Storage URL
  document_filename VARCHAR(255),
  document_upload_date TIMESTAMPTZ,

  -- Extraction results (from Azure Document Intelligence)
  extracted_data JSONB, -- Store all extracted fields
  extraction_confidence NUMERIC(3,2), -- 0.00 to 1.00

  -- Verification metadata
  verified_by INTEGER REFERENCES users(id), -- Admin who verified
  verified_at TIMESTAMPTZ,
  verification_notes TEXT,

  -- Expiration tracking
  expiration_date DATE,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_identifier_verification UNIQUE (legal_entity_id, identifier_type, identifier_value)
);

CREATE INDEX idx_verification_legal_entity ON identifier_verification_history(legal_entity_id);
CREATE INDEX idx_verification_status ON identifier_verification_history(verification_status);
CREATE INDEX idx_verification_type ON identifier_verification_history(identifier_type);
```

---

## API Endpoints

### 1. GET /api/v1/legal-entities/{id}/verifications

**Purpose:** Retrieve verification history for a legal entity

**Auth:** Requires admin role

**Response:**
```json
{
  "data": [
    {
      "id": 123,
      "legalEntityId": 456,
      "identifierType": "KVK",
      "identifierValue": "12345678",
      "verificationStatus": "verified",
      "verificationMethod": "document_upload",
      "documentFilename": "kvk_extract.pdf",
      "verifiedBy": {
        "id": 789,
        "name": "John Doe"
      },
      "verifiedAt": "2025-10-15T14:30:00Z",
      "expirationDate": "2026-10-15",
      "createdAt": "2025-10-15T14:25:00Z"
    }
  ],
  "pagination": {
    "total": 3,
    "page": 1,
    "pageSize": 10
  }
}
```

**Implementation Notes:**
- Filter by legal_entity_id from URL param
- Order by created_at DESC (most recent first)
- Include user details for verified_by (join with users table)
- Support pagination (optional, but recommended)

---

### 2. POST /api/v1/legal-entities/{id}/verifications

**Purpose:** Create new verification record with document upload

**Auth:** Requires admin role

**Request (multipart/form-data):**
```
POST /api/v1/legal-entities/456/verifications
Content-Type: multipart/form-data

Fields:
- identifierType: string (required) - 'KVK', 'LEI', 'EUID', etc.
- identifierValue: string (required) - The identifier value
- verificationMethod: string (optional, default: 'document_upload')
- document: file (optional) - PDF/image of verification document
- notes: string (optional) - Verification notes
```

**Response:**
```json
{
  "id": 123,
  "legalEntityId": 456,
  "identifierType": "KVK",
  "identifierValue": "12345678",
  "verificationStatus": "pending",
  "documentBlobUrl": "https://storage.../documents/kvk_extract.pdf",
  "documentFilename": "kvk_extract.pdf",
  "extractedData": {
    "kvkNumber": "12345678",
    "companyName": "Example BV",
    "extractedAt": "2025-10-19T10:00:00Z"
  },
  "extractionConfidence": 0.95,
  "createdAt": "2025-10-19T10:00:00Z"
}
```

**Implementation Steps:**

1. **File Upload to Azure Blob Storage:**
   - Container: `verification-documents`
   - Path: `legal-entities/{legalEntityId}/{timestamp}_{filename}`
   - Generate SAS URL for secure access

2. **Azure Document Intelligence Processing:**
   - Use Form Recognizer to extract fields
   - For KvK: Extract company name, KvK number, address
   - For LEI: Extract LEI code, legal name, registration authority
   - Store extracted data in `extracted_data` JSONB field
   - Store confidence score

3. **Database Insert:**
   - Create verification record with status 'pending'
   - Store blob URL and extraction results
   - Set verified_by to current admin user ID

4. **Validation:**
   - Check if legal_entity_id exists
   - Validate identifier_type is supported
   - Check for duplicate verification (same identifier_type + identifier_value)

**Error Responses:**
- 400: Invalid identifier type or missing required fields
- 404: Legal entity not found
- 409: Duplicate verification already exists
- 413: File too large (max 10MB)
- 415: Unsupported file type (only PDF, JPG, PNG allowed)

---

### 3. PUT /api/v1/legal-entities/{id}/verifications/{verificationId}

**Purpose:** Update verification status (approve/reject)

**Auth:** Requires admin role

**Request:**
```json
{
  "verificationStatus": "verified",
  "verificationNotes": "Document verified manually, all details match",
  "expirationDate": "2026-10-19"
}
```

**Response:**
```json
{
  "id": 123,
  "verificationStatus": "verified",
  "verifiedAt": "2025-10-19T10:15:00Z",
  "verifiedBy": {
    "id": 789,
    "name": "John Doe"
  },
  "verificationNotes": "Document verified manually, all details match",
  "expirationDate": "2026-10-19"
}
```

**Allowed Status Transitions:**
- pending → verified
- pending → failed
- verified → expired (automatic, based on expiration_date)

---

## Azure Services Integration

### Azure Blob Storage

**Configuration:**
- Container: `verification-documents`
- Access: Private (SAS token required)
- Retention: Keep for 7 years (compliance)

**Environment Variables:**
```bash
STORAGE_CONNECTION_STRING="<from Key Vault>"
STORAGE_CONTAINER_VERIFICATIONS="verification-documents"
```

### Azure Document Intelligence (Form Recognizer)

**Configuration:**
- Model: Prebuilt document model (general documents)
- Custom models for specific identifier types (future enhancement)

**Environment Variables:**
```bash
FORM_RECOGNIZER_ENDPOINT="https://<resource>.cognitiveservices.azure.com/"
FORM_RECOGNIZER_KEY="<from Key Vault>"
```

**Extraction Fields by Type:**

**KvK (Netherlands):**
- kvkNumber
- companyName
- legalForm
- registrationDate
- address (street, city, postalCode)

**LEI (Global):**
- leiCode
- legalName
- registrationAuthority
- registrationNumber
- legalForm

**EUID (EU):**
- euidCode
- countryCode
- registerCode
- businessIdentifier

---

## Testing Requirements

### Unit Tests
- [ ] Database CRUD operations
- [ ] File upload to Blob Storage
- [ ] Document Intelligence extraction
- [ ] Validation logic (duplicate checks, file type validation)

### Integration Tests
- [ ] Full flow: Upload → Extract → Store → Retrieve
- [ ] Error handling: Invalid file, missing fields, duplicate verification
- [ ] Auth: Verify admin-only access

### E2E Tests (Frontend)
- [ ] Upload document and see verification appear in history
- [ ] Approve/reject verification
- [ ] View extraction results

---

## Security Considerations

1. **File Upload Security:**
   - Validate file type (whitelist: PDF, JPG, PNG)
   - Scan for malware (Azure Defender for Storage)
   - Limit file size (max 10MB)

2. **Access Control:**
   - Only admins can create/update verifications
   - Only admins can view verification history
   - Legal entity members CANNOT see verification details (privacy)

3. **Data Privacy:**
   - Store PII (personal data) securely
   - Implement data retention policy (GDPR compliance)
   - Audit all access to verification documents

---

## Migration Path

### Phase 1: Database Schema
- [ ] Create identifier_verification_history table
- [ ] Run migration on dev environment
- [ ] Verify constraints and indexes

### Phase 2: Backend API
- [ ] Implement GET endpoint
- [ ] Implement POST endpoint (without Document Intelligence)
- [ ] Implement PUT endpoint
- [ ] Write unit tests

### Phase 3: Azure Integration
- [ ] Set up Blob Storage container
- [ ] Integrate Document Intelligence
- [ ] Test extraction for KvK documents

### Phase 4: Frontend Integration
- [ ] Remove TODOs from IdentifierVerificationManager.tsx
- [ ] Connect to backend API
- [ ] Test full flow

---

## Frontend Component Status

**File:** `web/src/components/legalentity/IdentifierVerificationManager.tsx`

**Current State:**
- Component UI complete
- Upload button visible but disabled
- Warning message: "Backend API not yet implemented"
- TODO comments at lines 57 and 110

**Required Frontend Changes (after backend complete):**
1. Remove TODO comments
2. Implement fetchVerificationHistory() function
3. Implement handleUpload() function
4. Enable upload button
5. Remove warning message

**Estimated Frontend Work:** 1 hour (after backend ready)

---

## Questions for Stakeholders

1. **Document Retention:** How long should verification documents be kept? (Recommended: 7 years for compliance)
2. **Manual vs Automated:** Should all verifications require manual admin approval, or can some be auto-approved based on confidence score?
3. **Expiration Handling:** Should system send notifications when verifications are about to expire?
4. **Audit Trail:** Do we need to track who viewed verification documents?

---

## References

- Frontend Component: `web/src/components/legalentity/IdentifierVerificationManager.tsx`
- Azure Document Intelligence Docs: https://learn.microsoft.com/en-us/azure/ai-services/document-intelligence/
- Azure Blob Storage Docs: https://learn.microsoft.com/en-us/azure/storage/blobs/
```

**Files to Create:**
- `/Users/ramondenoronha/Dev/DIL/ASR-full/docs/backend-requirements/IDENTIFIER_VERIFICATION_API.md`

**Success Criteria:**
- [ ] Requirements document created
- [ ] Database schema defined
- [ ] All 3 API endpoints documented
- [ ] Azure services integration specified
- [ ] Testing requirements listed
- [ ] Security considerations documented
- [ ] Frontend integration path clear

---

## Stage 8: Deferred - BUG-008 Grid Pagination

**Goal:** Document decision to defer grid pagination fix
**Time Estimate:** N/A (deferred)
**Status:** Deferred

### Task 8.1: Document Deferral Reason

**Priority:** P3 - Deferred
**Impact:** MEDIUM - UX issue, not blocking

**Issue:** Grid pagination state resets to page 1 when filters change

**Complexity:**
- Requires server-side pagination implementation
- Need to preserve filter + page state across requests
- Involves changes to API endpoints (add page/pageSize params)
- Involves changes to frontend state management
- Estimated effort: 4-6 hours (too complex for quick win)

**Decision:** Defer to future sprint

**Reasoning:**
1. Not blocking production deployment
2. Workaround exists (users can navigate back to page)
3. Requires architectural changes (server-side pagination)
4. Higher priority tasks exist (security, backend integration)

**Documentation:**
- Already documented in ROADMAP.md under "P3 - Admin Portal Bugs"
- No additional action required

---

## Testing Strategy (All Stages)

### API-First Testing Methodology

**Per CLAUDE.md guidelines:**
1. **API tests FIRST (curl)** - Catch 404/500 before UI testing
2. **E2E tests (Playwright)** - Only after API tests pass
3. Test pattern: Create → Verify → Clean up

### Security Testing (Stage 1)

**Tools:**
- Browser DevTools (check CSP violations)
- curl (verify security headers)
- TE agent (Playwright security tests)

**Tests:**
1. Verify CSP header in response
2. Check for CSP violations in browser console
3. Test HSTS header value
4. Run existing Playwright security tests

### Build Testing (Stages 3-6)

**Tests:**
1. TypeScript compilation: `npm run build` (no errors)
2. Runtime testing: Start dev server, test critical flows
3. E2E tests: Run Playwright test suite
4. Deployment simulation: Build production bundle, verify output

### Deployment Testing (All Stages)

**Post-Deployment Workflow (MANDATORY per CLAUDE.md):**
```
Build → Deploy → Test (TE agent) → Document (TW agent)
```

**Steps:**
1. Commit changes to Git
2. Push to Azure DevOps
3. Wait ~2min for pipeline
4. Verify deployment: https://dev.azure.com/ctn-demo/ASR/_build
5. Invoke TE agent for smoke tests
6. Invoke TW agent to update ROADMAP.md

---

## Commit Strategy

**Per CLAUDE.md guidelines: Commit frequently**

**Commit Points:**
1. After Stage 1 (security improvements)
2. After Stage 2 (Key Vault migration - if completed)
3. After Stage 3.1 (Admin Portal env vars)
4. After Stage 3.2 (Member Portal env vars)
5. After Stage 4.1 (Documentation Portal error handling)
6. After Stage 4.2 (Documentation Portal version.json)
7. After Stage 5 (Orchestrator health check)
8. After Stage 6 (any type reductions)
9. After Stage 7 (backend requirements doc)

**Commit Message Format:**
```
<type>: <description>

<body explaining why, not what>

Part of IMPLEMENTATION_PLAN.md Stage X
```

**Types:** feat, fix, refactor, docs, test, chore

---

## Agent Invocations

**Auto-invoke per CLAUDE.md guidelines:**

### After Each Stage:
- **CR (Code Reviewer)** - For code changes (Stages 1, 3-6)
- **SA (Security Analyst)** - For security changes (Stages 1-2)
- **TE (Test Engineer)** - After deployment of each stage

### Before Final Commit:
- **TW (Technical Writer)** - MANDATORY to update ROADMAP.md

### Optional:
- **DE (Database Expert)** - If Stage 2 involves database changes (not expected)

---

## Azure Portal Access Requirements

### Tasks Requiring Azure Portal:

**Stage 2 (Secrets Migration):**
- [ ] Task 2.2: Add secrets to Azure Key Vault
  - Requires: Azure Portal login
  - Role: Contributor on Key Vault resource
  - Time in Portal: 15-20 minutes

**All Other Tasks:**
- ✅ No Azure Portal access required
- Can be completed with Git, VS Code, terminal

### If Azure Portal Access Not Available:

**Fallback for Stage 2:**
1. Document all secrets that need migration
2. Create `.credentials` file template
3. Create Key Vault migration script (ready to run when access available)
4. Update ROADMAP.md with "Blocked: Awaiting Azure Portal access"

---

## Time Estimates Summary

| Stage | Task | Estimate | Complexity | Portal Access Required |
|-------|------|----------|------------|----------------------|
| 1.1 | Remove CSP unsafe-eval | 20 min | Low | No |
| 1.2 | Increase HSTS max-age | 10 min | Low | No |
| 2.1 | Inventory secrets | 30 min | Low | No |
| 2.2 | Add to Key Vault | 1 hour | Medium | **YES** |
| 2.3 | Update .credentials | 30 min | Low | No |
| 3.1 | Admin Portal env vars | 1 hour | Medium | No |
| 3.2 | Member Portal env vars | 1 hour | Medium | No |
| 3.3 | Orchestrator verify | 10 min | Low | No |
| 4.1 | Error handling | 1 hour | Medium | No |
| 4.2 | Version.json | 30 min | Low | No |
| 5.1 | Health check service | 1 hour | Medium | No |
| 6.1 | Reduce 'any' types | 2 hours | High | No |
| 7.1 | Backend requirements doc | 1 hour | Low | No |
| **TOTAL** | | **10.5 hours** | | 1 task requires portal |

**Realistic Today (8 hours):**
- All tasks EXCEPT Stage 2.2 (Key Vault addition)
- Can complete Stages 1, 3, 4, 5, 6, 7
- Stage 2 can be partially completed (inventory + script creation)

---

## Success Criteria (Overall)

### Security (Stage 1-2):
- [ ] Orchestrator Portal CSP fixed (no unsafe-eval)
- [ ] HSTS max-age increased to 1 year
- [ ] All secrets documented for Key Vault migration
- [ ] .credentials file template created (if portal access unavailable)
- [ ] Key Vault migration script ready (if portal access unavailable)

### Code Quality (Stages 3-6):
- [ ] All portals use VITE_ prefix for env vars
- [ ] Documentation Portal has error handling in build script
- [ ] Documentation Portal generates version.json
- [ ] Orchestrator Portal has health check service
- [ ] 20-30 'any' types replaced with proper types

### Documentation (Stage 7):
- [ ] Backend API requirements document created
- [ ] Database schema defined
- [ ] API endpoints documented
- [ ] Frontend integration path clear

### Testing:
- [ ] All Playwright tests pass
- [ ] Security headers verified
- [ ] TypeScript compilation succeeds
- [ ] No runtime errors

### Process:
- [ ] All changes committed with clear messages
- [ ] TE agent ran smoke tests
- [ ] CR agent reviewed code changes
- [ ] SA agent reviewed security changes
- [ ] TW agent updated ROADMAP.md
- [ ] IMPLEMENTATION_PLAN.md removed (after completion)

---

## Execution Order

**Recommended sequence (security first, then quick wins):**

1. **Stage 1** (30 min) - Security fixes (Orchestrator Portal)
   - Commit after completion
   - Deploy and test

2. **Stage 4** (1.5 hours) - Documentation Portal improvements
   - Quick wins, low risk
   - Commit after completion

3. **Stage 5** (1 hour) - Health check service
   - Standalone feature, no dependencies
   - Commit after completion

4. **Stage 3** (2-2.5 hours) - Env var standardization
   - Requires careful testing
   - Commit after each portal (3.1, then 3.2)

5. **Stage 6** (1.5-2 hours) - Reduce 'any' types
   - Can be partial (target 2 hours max)
   - Commit after completion

6. **Stage 7** (1 hour) - Backend requirements doc
   - Documentation only
   - Commit after completion

7. **Stage 2** (2 hours) - Secrets migration
   - **IF Azure Portal access available**
   - Otherwise, create migration script and defer

8. **Final** - TW agent updates ROADMAP.md

**Total Autonomous Work:** 6-8 hours (excluding Stage 2 if portal access unavailable)

---

## Risk Assessment

### Low Risk (Can execute confidently):
- ✅ Stage 1: Security header changes (tested pattern)
- ✅ Stage 4: Error handling additions (additive, no breaking changes)
- ✅ Stage 5: New health check service (additive, optional feature)
- ✅ Stage 7: Documentation only (no code changes)

### Medium Risk (Requires careful testing):
- ⚠️ Stage 3: Env var renaming (breaking change if missed anywhere)
- ⚠️ Stage 6: Type changes (could introduce TypeScript errors)

### High Risk (Requires Azure Portal access):
- 🔴 Stage 2.2: Key Vault addition (requires portal, credentials)

### Deferred (Too complex for today):
- ⏸️ Stage 8: Grid pagination (requires architecture changes)

---

## Rollback Plan

**If issues occur during deployment:**

### Stage 1 (Security Headers):
- Revert staticwebapp.config.json
- Redeploy previous version
- Review browser console for CSP errors

### Stage 3 (Env Vars):
- Revert vite.config.ts and .env files
- Update Azure DevOps variable groups back to REACT_APP_*
- Redeploy

### Stage 6 (Type Changes):
- Revert TypeScript changes
- Run `npm run build` to verify
- Redeploy

**All stages use Git, so rollback is simple:**
```bash
git revert <commit-hash>
git push origin main
```

---

## Dependencies

**None - All stages can be executed independently**

**Optional dependencies:**
- Stage 2.2 depends on Azure Portal access (can defer if unavailable)
- Stage 7 provides documentation for future backend work (no blocker)

---

## Notes

**Working Autonomously:**
- User is away until evening
- Execute all low-risk and medium-risk tasks
- Document blockers clearly (Stage 2.2 if portal access unavailable)
- Commit frequently per CLAUDE.md guidelines
- Invoke agents proactively (TE, CR, SA, TW)

**Test-First Approach:**
- API tests before UI tests (per CLAUDE.md)
- Verify security headers with curl before Playwright
- TypeScript compilation before runtime testing

**End with TW Agent:**
- MANDATORY: Update ROADMAP.md with completed tasks
- Move tasks to COMPLETED_ACTIONS.md
- Re-prioritize remaining tasks
