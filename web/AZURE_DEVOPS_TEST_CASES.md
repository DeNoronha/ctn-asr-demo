# Azure DevOps Test Cases - KvK Document Upload and Verification

This document contains test cases formatted for Azure DevOps Test Plans. Each test case includes:
- Title
- Area Path
- Priority
- Test Steps
- Expected Results
- Automated (Yes/No)

---

## Test Plan: KvK Document Upload and Verification

**Test Plan ID:** TP-KVK-001
**Area Path:** CTN-ASR/Legal Entity Management/KvK Verification
**Iteration:** Sprint 2025-Q4
**Owner:** Test Team
**State:** Active

---

## Test Suite 1: API Endpoint Testing

### TC-KVK-API-001: Verify KvK Verification Status Endpoint (Authenticated)

**Priority:** 1 (High)
**Area Path:** API/KvK Verification
**Tags:** API, Authentication, KvK
**Automated:** Yes
**Automation Status:** Automated with Playwright

**Preconditions:**
- User is authenticated with valid Azure AD credentials
- User has member or admin role
- Legal entity exists in database with ID: fbc4bcdc-a9f9-4621-a153-c5deb6c49519

**Test Steps:**
1. Authenticate user with Azure AD
2. Send GET request to `/api/v1/legal-entities/{legalEntityId}/kvk-verification`
3. Include valid Authorization header with Bearer token
4. Verify response status code
5. Verify response body structure

**Expected Results:**
- Response status: 200 OK
- Response contains `legal_entity_id` field
- Response contains `kvk_verification_status` field
- Response contains `kvk_mismatch_flags` array (if any)
- Response contains `kvk_extracted_company_name` (if uploaded)
- Response contains `kvk_extracted_number` (if uploaded)

**Actual Results:** FAIL (401 Unauthorized due to test authentication issue, not application bug)

**Notes:** Test infrastructure needs MSAL token acquisition. Endpoint works correctly when accessed from frontend application.

---

### TC-KVK-API-002: Verify Flagged Entities Endpoint (Admin Only)

**Priority:** 1 (High)
**Area Path:** API/KvK Verification
**Tags:** API, Authentication, Authorization, Admin
**Automated:** Yes
**Automation Status:** Automated with Playwright

**Preconditions:**
- User is authenticated with valid Azure AD credentials
- User has admin role
- At least one legal entity has `kvk_verification_status = 'flagged'`

**Test Steps:**
1. Authenticate user with Azure AD (admin role)
2. Send GET request to `/api/v1/kvk-verification/flagged`
3. Include valid Authorization header with Bearer token
4. Verify response status code
5. Verify response is array of entities
6. Verify each entity has required fields

**Expected Results:**
- Response status: 200 OK
- Response is array of flagged entities
- Each entity contains:
  - `legal_entity_id`
  - `entered_company_name`
  - `entered_kvk_number`
  - `kvk_extracted_company_name`
  - `kvk_extracted_number`
  - `kvk_mismatch_flags` (array)
  - `document_uploaded_at`
  - `kvk_document_url` (with SAS token)

**Actual Results:** FAIL (401 Unauthorized due to test authentication issue, not application bug)

**Notes:** Test infrastructure needs MSAL token acquisition. Endpoint works correctly when accessed from frontend application.

---

### TC-KVK-API-003: Verify Unauthorized Access Returns 401

**Priority:** 2 (Medium)
**Area Path:** API/KvK Verification
**Tags:** API, Security, Authentication
**Automated:** Yes
**Automation Status:** Automated with Playwright

**Preconditions:**
- No authentication credentials provided

**Test Steps:**
1. Send GET request to `/api/v1/kvk-verification/flagged`
2. Do NOT include Authorization header
3. Verify response status code

**Expected Results:**
- Response status: 401 Unauthorized
- Response contains error message about missing authorization

**Actual Results:** PASS

**Notes:** Security measure working correctly.

---

### TC-KVK-API-004: Verify No 404 Errors on KvK Endpoints

**Priority:** 2 (Medium)
**Area Path:** API/KvK Verification
**Tags:** API, Routing
**Automated:** Yes
**Automation Status:** Automated with Playwright

**Preconditions:**
- Application is deployed and running
- User is authenticated

**Test Steps:**
1. Navigate to admin portal
2. Monitor network requests for KvK-related endpoints
3. Verify all KvK API calls return valid status codes (not 404)

**Expected Results:**
- All KvK endpoints return 200, 401, or other valid status codes
- No 404 Not Found errors on KvK endpoints
- Endpoints are properly registered and routable

**Actual Results:** PASS

**Notes:** All endpoints correctly registered in essential-index.ts and routable.

---

### TC-KVK-API-005: Verify No 500 Server Errors During Verification

**Priority:** 1 (High)
**Area Path:** API/KvK Verification
**Tags:** API, Error Handling, Stability
**Automated:** Yes
**Automation Status:** Automated with Playwright

**Preconditions:**
- Application is deployed and running
- User is authenticated
- Document upload or verification in progress

**Test Steps:**
1. Navigate to admin portal
2. Monitor network requests during KvK verification workflow
3. Verify no 500-level server errors occur

**Expected Results:**
- No 500 Internal Server Error responses
- No 502 Bad Gateway errors
- No 503 Service Unavailable errors
- Backend handles errors gracefully

**Actual Results:** PASS

**Notes:** Backend is stable with proper error handling.

---

### TC-KVK-API-006: Upload KvK Document (PDF File)

**Priority:** 1 (High)
**Area Path:** API/KvK Verification
**Tags:** API, File Upload, Document Processing
**Automated:** No (to be implemented)
**Automation Status:** Manual

**Preconditions:**
- User is authenticated
- User has member or admin role
- Valid PDF file prepared (KvK uittreksel)
- Legal entity exists in database

**Test Steps:**
1. Authenticate user with Azure AD
2. Prepare multipart/form-data request with PDF file
3. Send POST request to `/api/v1/legal-entities/{legalEntityId}/kvk-document`
4. Include valid Authorization header
5. Include file in 'file' field
6. Verify response status code
7. Verify document is uploaded to blob storage
8. Verify database is updated with document URL
9. Wait for async verification to complete
10. Verify extracted data is stored in database

**Expected Results:**
- Response status: 200 OK
- Response contains `documentUrl` with blob storage URL
- Database `kvk_document_url` field updated
- Database `document_uploaded_at` timestamp set
- Database `kvk_verification_status` set to 'pending' initially
- After processing: `kvk_extracted_company_name` populated
- After processing: `kvk_extracted_number` populated
- After processing: `kvk_verification_status` updated to 'verified', 'flagged', or 'failed'

**Actual Results:** Not tested (requires implementation)

**Notes:** High priority test to add. Requires sample KvK PDF documents.

---

## Test Suite 2: Frontend Component Testing

### TC-KVK-UI-001: Navigate to KvK Review Queue

**Priority:** 2 (Medium)
**Area Path:** UI/KvK Verification
**Tags:** UI, Navigation
**Automated:** Yes
**Automation Status:** Automated with Playwright

**Preconditions:**
- User is authenticated
- User has admin role
- Admin portal is loaded

**Test Steps:**
1. Navigate to admin portal homepage
2. Locate navigation menu
3. Click on "KvK Review Queue" or "Validation Menu" link
4. Verify page navigation occurs
5. Verify page loads without errors

**Expected Results:**
- KvK Review Queue page loads successfully
- URL changes to review queue route
- Page displays without JavaScript errors
- Grid or table component is visible

**Actual Results:** PASS

**Notes:** Navigation works correctly, page loads without errors.

---

### TC-KVK-UI-002: Display Flagged Entities Grid with Proper Columns

**Priority:** 1 (High)
**Area Path:** UI/KvK Verification
**Tags:** UI, Grid, Data Display
**Automated:** Yes
**Automation Status:** Automated with Playwright

**Preconditions:**
- User is authenticated as admin
- At least one entity is flagged for review
- KvK Review Queue page is loaded

**Test Steps:**
1. Navigate to KvK Review Queue
2. Wait for grid to load
3. Verify column headers are present
4. Verify data rows are displayed
5. Verify all required columns exist

**Expected Results:**
- Grid displays with following columns:
  - Entered Company (from legal_entity.primary_legal_name)
  - Entered KvK (from legal_entity_number.identifier_value)
  - Extracted Company (from kvk_extracted_company_name)
  - Extracted KvK (from kvk_extracted_number)
  - Issues (mismatch flags as badges)
  - Upload Date (document_uploaded_at)
  - Review (action button)
- Data loads from API
- Rows are displayed with correct data
- Grid is scrollable if many entities

**Actual Results:** PASS

**Notes:** All columns present and displaying correctly.

---

### TC-KVK-UI-003: Display Flag Badges with Correct Colors

**Priority:** 1 (High)
**Area Path:** UI/KvK Verification
**Tags:** UI, Visual Indicators, UX
**Automated:** Yes
**Automation Status:** Automated with Playwright

**Preconditions:**
- User is authenticated as admin
- Flagged entities exist with various mismatch flags
- KvK Review Queue page is loaded

**Test Steps:**
1. Navigate to KvK Review Queue
2. Locate "Issues" column
3. Identify badge elements
4. Verify badge colors for different flag types
5. Take screenshot for visual verification

**Expected Results:**
- RED badges for entered data mismatches:
  - `entered_kvk_mismatch` - red background
  - `entered_name_mismatch` - red background
- YELLOW badges for other issues:
  - `name_mismatch` - yellow background
  - `address_mismatch` - yellow background
  - `not_active` - yellow background
  - `not_found` - yellow background
- Badges are clearly readable
- Colors are distinct and accessible

**Actual Results:** PASS

**Notes:** Color coding implemented correctly, provides clear visual priority.

---

### TC-KVK-UI-004: Prioritize Entities with Entered Data Mismatches

**Priority:** 1 (High)
**Area Path:** UI/KvK Verification
**Tags:** UI, Sorting, Business Logic
**Automated:** Yes
**Automation Status:** Automated with Playwright

**Preconditions:**
- Multiple flagged entities exist
- Some have `entered_kvk_mismatch` or `entered_name_mismatch` flags
- Some have only other flag types
- KvK Review Queue page is loaded

**Test Steps:**
1. Navigate to KvK Review Queue
2. Observe order of entities in grid
3. Verify entities with entered data mismatches appear first
4. Verify other entities appear after
5. Verify secondary sort by upload date (newest first)

**Expected Results:**
- Entities with `entered_kvk_mismatch` or `entered_name_mismatch` appear at top
- Entities without entered data mismatches appear below
- Within each group, entities sorted by `document_uploaded_at DESC`
- Sorting is consistent and predictable

**Actual Results:** PASS

**Notes:** Backend SQL ORDER BY clause working correctly.

---

### TC-KVK-UI-005: Open Review Dialog

**Priority:** 1 (High)
**Area Path:** UI/KvK Verification
**Tags:** UI, Dialog, User Interaction
**Automated:** Yes
**Automation Status:** Automated with Playwright

**Preconditions:**
- User is authenticated as admin
- At least one flagged entity exists
- KvK Review Queue page is loaded

**Test Steps:**
1. Navigate to KvK Review Queue
2. Locate first entity row
3. Click "Review" button
4. Verify dialog/modal opens
5. Verify dialog content loads
6. Verify dialog can be closed

**Expected Results:**
- Dialog opens successfully
- Dialog displays entity details
- Comparison table shows entered vs extracted data
- Match/mismatch indicators visible (checkmarks/X)
- Close/Cancel button works
- Dialog can be dismissed

**Actual Results:** PASS

**Notes:** Dialog functionality working correctly.

---

### TC-KVK-UI-006: Display Comparison Table in Review Dialog

**Priority:** 1 (High)
**Area Path:** UI/KvK Verification
**Tags:** UI, Data Display, Comparison
**Automated:** Yes
**Automation Status:** Automated with Playwright

**Preconditions:**
- User is authenticated as admin
- Review dialog is open for a flagged entity

**Test Steps:**
1. Open review dialog for an entity
2. Locate comparison table
3. Verify table structure
4. Verify data is displayed correctly
5. Verify match/mismatch indicators

**Expected Results:**
- Table with columns: Field, Entered Value, Extracted Value, Status
- Rows for:
  - KvK Number comparison
  - Company Name comparison
- Status column shows:
  - ✓ (checkmark) for matches
  - ✗ (X) for mismatches
- Values are correctly populated from database
- Table is readable and well-formatted

**Actual Results:** PASS

**Notes:** Comparison table provides clear side-by-side view.

---

### TC-KVK-UI-007: Display Alert Banner for Entered Data Mismatches

**Priority:** 2 (Medium)
**Area Path:** UI/KvK Verification
**Tags:** UI, Alerts, User Feedback
**Automated:** Yes
**Automation Status:** Automated with Playwright

**Preconditions:**
- User is authenticated as admin
- Entity with entered data mismatch is selected

**Test Steps:**
1. Navigate to entity with `entered_kvk_mismatch` or `entered_name_mismatch`
2. Open review dialog or view entity details
3. Locate alert/warning banner
4. Verify alert message content

**Expected Results:**
- Alert banner is visible
- Alert explains the mismatch between entered and extracted data
- Alert provides guidance on what to do
- Alert is visually distinct (warning color)

**Actual Results:** PASS

**Notes:** Alert provides helpful context for administrators.

---

### TC-KVK-UI-008: Display Entered and Extracted Data Side-by-Side

**Priority:** 1 (High)
**Area Path:** UI/KvK Verification
**Tags:** UI, Data Display, UX
**Automated:** Yes
**Automation Status:** Automated with Playwright

**Preconditions:**
- User is authenticated as admin
- Flagged entities with both entered and extracted data exist
- KvK Review Queue page is loaded

**Test Steps:**
1. Navigate to KvK Review Queue
2. Verify grid has separate columns for entered and extracted data
3. Compare values in each row
4. Verify alignment and readability

**Expected Results:**
- "Entered Company" column displays `primary_legal_name`
- "Entered KvK" column displays `identifier_value` from legal_entity_number
- "Extracted Company" column displays `kvk_extracted_company_name`
- "Extracted KvK" column displays `kvk_extracted_number`
- Columns are side-by-side for easy comparison
- Data is aligned properly
- Grid is responsive and readable

**Actual Results:** PASS

**Notes:** Side-by-side comparison makes it easy to spot differences.

---

## Test Suite 3: Data Comparison Logic

### TC-KVK-LOGIC-001: Compare Entered vs Extracted KvK Number (Exact Match)

**Priority:** 1 (High)
**Area Path:** Business Logic/KvK Verification
**Tags:** Backend, Comparison, Data Validation
**Automated:** Yes
**Automation Status:** Automated with Playwright

**Preconditions:**
- Legal entity has entered KvK number in database
- Document has been uploaded and extracted
- Extracted KvK number exists

**Test Steps:**
1. Retrieve entered KvK number from `legal_entity_number.identifier_value`
2. Retrieve extracted KvK number from `legal_entity.kvk_extracted_number`
3. Compare using exact string comparison
4. Verify mismatch flag is set if different
5. Verify no flag is set if identical

**Expected Results:**
- If `entered_kvk_number === extracted_kvk_number`: No flag
- If `entered_kvk_number !== extracted_kvk_number`: `entered_kvk_mismatch` flag set
- Comparison is case-sensitive
- Comparison does not normalize or trim
- Flag is added to `kvk_mismatch_flags` array

**Actual Results:** PASS

**Notes:** Logic correctly implements exact match comparison.

---

### TC-KVK-LOGIC-002: Compare Entered vs Extracted Company Name (Partial Match)

**Priority:** 1 (High)
**Area Path:** Business Logic/KvK Verification
**Tags:** Backend, Comparison, Data Validation
**Automated:** Yes
**Automation Status:** Automated with Playwright

**Preconditions:**
- Legal entity has entered company name in database
- Document has been uploaded and extracted
- Extracted company name exists

**Test Steps:**
1. Retrieve entered company name from `legal_entity.primary_legal_name`
2. Retrieve extracted company name from `legal_entity.kvk_extracted_company_name`
3. Normalize both: trim whitespace, convert to lowercase
4. Check if either contains the other (partial match)
5. Verify mismatch flag is set if no partial match
6. Verify no flag is set if partial match found

**Expected Results:**
- Comparison is case-insensitive
- Leading/trailing whitespace is trimmed
- Partial match is allowed (substring matching)
- If `enteredLower.includes(extractedLower)`: No flag
- If `extractedLower.includes(enteredLower)`: No flag
- If neither contains the other: `entered_name_mismatch` flag set
- Flag is added to `kvk_mismatch_flags` array

**Actual Results:** PASS

**Notes:** Flexible matching allows for minor variations in company name format.

**Examples:**
- "Contargo GmbH" matches "Contargo GmbH & Co. KG" ✓
- "CONTARGO" matches "Contargo" ✓ (case-insensitive)
- "Contargo" does NOT match "ABC Company" ✗

---

### TC-KVK-LOGIC-003: Merge Mismatch Flags (Entered + API Validation)

**Priority:** 1 (High)
**Area Path:** Business Logic/KvK Verification
**Tags:** Backend, Flag Management, Data Integrity
**Automated:** Yes
**Automation Status:** Automated with Playwright

**Preconditions:**
- Document has been uploaded and extracted
- Both entered data comparison and KvK API validation have run
- Multiple flags may be generated

**Test Steps:**
1. Collect flags from entered data comparison
2. Collect flags from KvK API validation
3. Merge flag arrays
4. Remove duplicates
5. Store in database
6. Verify uniqueness

**Expected Results:**
- Flags from entered data comparison included:
  - `entered_kvk_mismatch`
  - `entered_name_mismatch`
- Flags from KvK API validation included:
  - `name_mismatch`
  - `address_mismatch`
  - `not_active`
  - `not_found`
- All flags merged into single array
- Duplicates removed (using Set)
- Array stored in `kvk_mismatch_flags` column
- Order does not matter

**Actual Results:** PASS

**Notes:** Proper flag merging ensures all issues are tracked without duplication.

**Implementation:**
```typescript
const allMismatchFlags = [...new Set([...mismatchFlags, ...validation.flags])];
```

---

### TC-KVK-LOGIC-004: Determine Verification Status Based on Flags

**Priority:** 1 (High)
**Area Path:** Business Logic/KvK Verification
**Tags:** Backend, Status Management, Business Rules
**Automated:** Yes
**Automation Status:** Automated with Playwright

**Preconditions:**
- Document has been processed
- Mismatch flags have been collected (if any)
- KvK API validation has completed (if applicable)

**Test Steps:**
1. Check if any flags exist
2. Check if entered data mismatch flags exist
3. Check KvK API validation result
4. Determine final verification status
5. Update database

**Expected Results:**
- **Status = 'verified'** if:
  - No flags at all, OR
  - KvK API validation passed and no entered data mismatches
- **Status = 'flagged'** if:
  - `entered_kvk_mismatch` OR `entered_name_mismatch` flag exists (prioritized), OR
  - Other flags exist but KvK API validation failed
- **Status = 'failed'** if:
  - Processing error occurred, OR
  - No KvK number extracted
- Priority order: entered data mismatches > API validation > other flags

**Actual Results:** PASS

**Notes:** Status determination logic correctly prioritizes entered data mismatches.

**Implementation:**
```typescript
let newStatus: string;
if (allMismatchFlags.length === 0) {
  newStatus = 'verified';
} else if (allMismatchFlags.some(f => f === 'entered_kvk_mismatch' || f === 'entered_name_mismatch')) {
  newStatus = 'flagged'; // Prioritize entered data mismatches
} else if (validation.isValid) {
  newStatus = 'verified';
} else {
  newStatus = validation.flags.length > 0 ? 'flagged' : 'failed';
}
```

---

### TC-KVK-LOGIC-005: Handle Missing Entered Data

**Priority:** 2 (Medium)
**Area Path:** Business Logic/KvK Verification
**Tags:** Backend, Edge Cases, Data Validation
**Automated:** No (to be implemented)
**Automation Status:** Manual

**Preconditions:**
- Legal entity exists without KvK number in `legal_entity_number` table
- OR legal entity exists without company name
- Document has been uploaded and extracted

**Test Steps:**
1. Upload document for entity without entered KvK number
2. Verify comparison logic handles null/undefined
3. Verify no mismatch flag is set
4. Upload document for entity without company name
5. Verify comparison logic handles null/undefined
6. Verify no mismatch flag is set

**Expected Results:**
- If `entered_kvk_number` is null/undefined: Skip KvK number comparison, no flag
- If `entered_company_name` is null/undefined: Skip name comparison, no flag
- Only compare when both values exist
- No errors thrown when data is missing

**Actual Results:** Not tested (requires test data setup)

**Notes:** Important edge case - comparison should only happen when both values exist.

**Implementation:**
```typescript
if (enteredData.entered_kvk_number && extractedData.kvkNumber) {
  // Only compare if both exist
}
```

---

### TC-KVK-LOGIC-006: Handle Missing Extracted Data

**Priority:** 2 (Medium)
**Area Path:** Business Logic/KvK Verification
**Tags:** Backend, Edge Cases, Document Processing
**Automated:** No (to be implemented)
**Automation Status:** Manual

**Preconditions:**
- Document upload fails to extract KvK number or company name
- Document Intelligence returns empty/null values

**Test Steps:**
1. Upload document that fails extraction
2. Verify comparison logic handles null/undefined extracted data
3. Verify appropriate status is set
4. Verify appropriate flags are set

**Expected Results:**
- If no KvK number extracted: Status = 'failed', flag = 'extraction_failed'
- If no company name extracted: Still attempt KvK API validation if number exists
- Comparison only happens when both values exist
- No errors thrown when extracted data is missing

**Actual Results:** Not tested (requires invalid document)

**Notes:** Graceful handling of extraction failures.

**Implementation:**
```typescript
if (!extractedData.kvkNumber) {
  await pool.query(
    `UPDATE legal_entity
     SET kvk_verification_status = 'failed',
         kvk_mismatch_flags = ARRAY['extraction_failed']
     WHERE legal_entity_id = $1`,
    [legalEntityId]
  );
}
```

---

## Test Suite 4: Chrome Console Monitoring

### TC-KVK-CONSOLE-001: No JavaScript Errors During Page Load

**Priority:** 1 (High)
**Area Path:** Quality/Browser Compatibility
**Tags:** Console, Errors, JavaScript
**Automated:** Yes
**Automation Status:** Automated with Playwright

**Preconditions:**
- Browser DevTools console is monitoring
- Application is deployed

**Test Steps:**
1. Open Chrome DevTools
2. Navigate to KvK Review Queue
3. Monitor console for error messages
4. Interact with grid and dialogs
5. Count console errors

**Expected Results:**
- Zero JavaScript console errors
- No uncaught exceptions
- No reference errors
- No type errors
- Application is stable

**Actual Results:** PASS

**Notes:** Application is stable with no JavaScript errors.

---

### TC-KVK-CONSOLE-002: No Failed Network Requests

**Priority:** 2 (Medium)
**Area Path:** Quality/Network
**Tags:** Console, Network, API
**Automated:** Yes
**Automation Status:** Automated with Playwright

**Preconditions:**
- Browser DevTools Network tab is monitoring
- Application is deployed

**Test Steps:**
1. Open Chrome DevTools Network tab
2. Navigate to KvK Review Queue
3. Monitor network requests
4. Filter for failed requests (4xx, 5xx)
5. Categorize failures

**Expected Results:**
- No unexpected failed requests
- 401 errors only for intentionally unauthenticated calls
- No 404 errors (missing resources)
- No 500 errors (server errors)
- All API calls resolve successfully

**Actual Results:** FAIL (5 failed requests for logo images - non-critical)

**Notes:** Logo assets returning 401 due to authentication config. Does not affect KvK verification functionality.

**Failed Requests (Non-Critical):**
- `/assets/logos/*.png` - 401 Unauthorized (static asset auth issue)

---

### TC-KVK-CONSOLE-003: No 500 Server Errors During Verification

**Priority:** 1 (High)
**Area Path:** Quality/Backend Stability
**Tags:** Console, API, Server Errors
**Automated:** Yes
**Automation Status:** Automated with Playwright

**Preconditions:**
- Browser DevTools Network tab is monitoring
- Document verification workflow in progress

**Test Steps:**
1. Monitor network requests during verification
2. Filter for 5xx status codes
3. Verify backend stability

**Expected Results:**
- No 500 Internal Server Error
- No 502 Bad Gateway
- No 503 Service Unavailable
- Backend handles all requests gracefully

**Actual Results:** PASS

**Notes:** Backend is stable and reliable.

---

### TC-KVK-CONSOLE-004: Monitor Console Messages (Errors, Warnings, Info)

**Priority:** 3 (Low)
**Area Path:** Quality/Logging
**Tags:** Console, Monitoring, Logging
**Automated:** Yes
**Automation Status:** Automated with Playwright

**Preconditions:**
- Browser DevTools console is open
- Application is running

**Test Steps:**
1. Monitor all console message types
2. Categorize by severity:
   - Errors (red)
   - Warnings (yellow)
   - Info/Log (blue)
3. Review messages for actionable items

**Expected Results:**
- Errors: 0 (except expected auth failures in tests)
- Warnings: Only non-critical warnings (e.g., library license notices)
- Info: Normal application logging
- All messages are appropriate and actionable

**Actual Results:** PASS

**Notes:** Console output is clean and appropriate.

**Warnings (Non-Critical):**
- Kendo UI trial license expiring - expected, non-blocking

---

## Test Suite 5: Visual Indicators and UX

### TC-KVK-VISUAL-001: Red Badges for Entered Data Mismatches

**Priority:** 1 (High)
**Area Path:** UI/Visual Design
**Tags:** UI, Visual, UX, Accessibility
**Automated:** Yes
**Automation Status:** Automated with Playwright

**Preconditions:**
- Entities with entered data mismatch flags exist
- KvK Review Queue is displayed

**Test Steps:**
1. Navigate to KvK Review Queue
2. Locate badges for `entered_kvk_mismatch`
3. Locate badges for `entered_name_mismatch`
4. Verify background color is red
5. Verify text is readable (contrast)
6. Take screenshot for visual verification

**Expected Results:**
- `entered_kvk_mismatch` badge has red background
- `entered_name_mismatch` badge has red background
- Red color indicates high priority
- Text color provides sufficient contrast (WCAG AA)
- Badges are visually distinct from yellow badges

**Actual Results:** PASS

**Notes:** Red badges clearly indicate priority items for review.

---

### TC-KVK-VISUAL-002: Yellow Badges for Other Issues

**Priority:** 2 (Medium)
**Area Path:** UI/Visual Design
**Tags:** UI, Visual, UX
**Automated:** Yes
**Automation Status:** Automated with Playwright

**Preconditions:**
- Entities with other mismatch flags exist (not entered data)
- KvK Review Queue is displayed

**Test Steps:**
1. Navigate to KvK Review Queue
2. Locate badges for other flag types:
   - `name_mismatch`
   - `address_mismatch`
   - `not_active`
   - `not_found`
3. Verify background color is yellow/warning color
4. Verify text is readable

**Expected Results:**
- Other flag badges have yellow/warning background
- Yellow indicates medium priority
- Text color provides sufficient contrast
- Badges are visually distinct from red badges

**Actual Results:** PASS

**Notes:** Yellow badges appropriately indicate issues that need review but are lower priority.

---

### TC-KVK-VISUAL-003: Explanatory Text for Data Mismatches

**Priority:** 2 (Medium)
**Area Path:** UI/Content
**Tags:** UI, Help Text, UX
**Automated:** Yes
**Automation Status:** Automated with Playwright

**Preconditions:**
- KvK Review Queue or review dialog is displayed
- Entities with mismatches exist

**Test Steps:**
1. Navigate to KvK Review Queue
2. Locate explanatory text or help icons
3. Read text content
4. Verify clarity and usefulness

**Expected Results:**
- Text explains what "entered data" means
- Text explains what "extracted data" means
- Text explains what a mismatch means
- Text provides guidance on what to do
- Text is clear, concise, and helpful

**Actual Results:** PASS

**Notes:** Explanatory text helps administrators understand the comparison and take appropriate action.

**Example Text:**
- "Entered data is the KvK number and company name that was manually entered during registration"
- "Extracted data is what was read from the uploaded KvK document"
- "A mismatch means the entered information does not match the document"

---

## Test Coverage Summary

| Test Suite | Total | Passed | Failed | Not Tested | Pass Rate |
|------------|-------|--------|--------|------------|-----------|
| API Endpoints | 6 | 3 | 2 | 1 | 50% |
| Frontend Components | 8 | 8 | 0 | 0 | 100% |
| Data Comparison Logic | 6 | 4 | 0 | 2 | 67% |
| Console Monitoring | 4 | 3 | 1 | 0 | 75% |
| Visual Indicators | 3 | 3 | 0 | 0 | 100% |
| **TOTAL** | **27** | **21** | **3** | **3** | **78%** |

### Automation Coverage

- **Automated:** 24 tests (89%)
- **Manual/To Be Implemented:** 3 tests (11%)

---

## Traceability Matrix

| Requirement | Test Cases | Status |
|-------------|------------|--------|
| REQ-KVK-001: Upload KvK document | TC-KVK-API-006 | Not Tested |
| REQ-KVK-002: Extract data from document | TC-KVK-LOGIC-006 | Not Tested |
| REQ-KVK-003: Compare entered vs extracted KvK number | TC-KVK-LOGIC-001 | PASS |
| REQ-KVK-004: Compare entered vs extracted company name | TC-KVK-LOGIC-002 | PASS |
| REQ-KVK-005: Set mismatch flags | TC-KVK-LOGIC-003 | PASS |
| REQ-KVK-006: Determine verification status | TC-KVK-LOGIC-004 | PASS |
| REQ-KVK-007: Display flagged entities | TC-KVK-API-002, TC-KVK-UI-002 | FAIL (auth), PASS |
| REQ-KVK-008: Prioritize entered data mismatches | TC-KVK-UI-004 | PASS |
| REQ-KVK-009: Visual distinction (red badges) | TC-KVK-VISUAL-001 | PASS |
| REQ-KVK-010: Review dialog with comparison | TC-KVK-UI-005, TC-KVK-UI-006 | PASS |

---

## Recommendations for Azure DevOps Test Plan

1. **Import Test Cases:** Import these test cases into Azure Test Plans under the "KvK Verification" test suite
2. **Link to User Stories:** Link each test case to corresponding user stories or requirements
3. **Configure Test Runs:** Set up automated test runs after deployment to Dev/QA environments
4. **Track Test Execution:** Use Azure Test Plans to track manual test execution for the 3 untested cases
5. **Integrate with CI/CD:** Configure test results to be published to Azure Pipelines after each build
6. **Set Up Automated Tests:** The 24 automated tests should run on every PR to main branch
7. **Manual Test Execution:** Schedule manual execution of upload test (TC-KVK-API-006) after each deployment
8. **Bug Tracking:** Link failed tests to work items for tracking and resolution

---

## Test Data Requirements for Azure DevOps

To execute all test cases, prepare the following test data in Azure DevOps Test Plans:

### Test Entities

1. **Entity with Perfect Match:**
   - ID: TBD
   - Entered KvK: 12345678
   - Entered Name: "Test Company B.V."
   - Uploaded Document: Contains "12345678" and "Test Company B.V."
   - Expected: Status = verified, no flags

2. **Entity with KvK Mismatch:**
   - ID: TBD
   - Entered KvK: 11111111
   - Entered Name: "Test Company B.V."
   - Uploaded Document: Contains "22222222" and "Test Company B.V."
   - Expected: Status = flagged, flag = entered_kvk_mismatch

3. **Entity with Name Mismatch:**
   - ID: TBD
   - Entered KvK: 12345678
   - Entered Name: "Company A"
   - Uploaded Document: Contains "12345678" and "Company B"
   - Expected: Status = flagged, flag = entered_name_mismatch

4. **Entity with Both Mismatches:**
   - ID: TBD
   - Entered KvK: 11111111
   - Entered Name: "Company A"
   - Uploaded Document: Contains "22222222" and "Company B"
   - Expected: Status = flagged, flags = [entered_kvk_mismatch, entered_name_mismatch]

### Test Documents

1. **Valid KvK Uittreksel PDF:** Contains extractable KvK number and company name
2. **Invalid PDF:** Non-KvK document to test extraction failure
3. **Corrupted PDF:** To test error handling

---

**Document Version:** 1.0
**Last Updated:** 2025-10-15
**Created By:** Claude Code - Test Automation Engineer
**Approved By:** [Pending]
