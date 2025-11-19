# CTN ASR API Test Catalog

**Generated:** November 19, 2025
**Total Tests:** 145 (API) + 280 (E2E) = ~425 Total

---

## Test Summary by Module

| Module | Test Count | Type | Portal |
|--------|------------|------|--------|
| Members | 10 | API | Admin |
| Legal Entities | 7 | API | Admin |
| Identifiers | 15 | API | Admin |
| Contacts | 12 | API | Admin |
| KvK Integration | 5 | API | Admin |
| Endpoints | 12 | API | Admin |
| Audit Logs | 15 | API | Admin |
| **Member Profile** | **10** | **API** | **Member** |
| **Member Contacts** | **16** | **API** | **Member** |
| **Member Endpoints** | **15** | **API** | **Member** |
| **Member Authorization** | **30** | **API** | **Member** |

---

## Members (10 tests)

| # | Test Name | Description | Expected Result | Type | Portal |
|---|-----------|-------------|-----------------|------|--------|
| 1 | Get all members | Retrieve paginated list of all members | 200 OK with data array | API | Admin |
| 2 | Get members with pagination | Retrieve members with page=1&limit=5 | 200 OK with pagination info | API | Admin |
| 3 | Create member | Create new member with valid data (org_id, legal_name, domain, status, etc.) | 201 Created with org_id and legal_entity_id | API | Admin |
| 4 | Get single member | Retrieve member by org_id | 200 OK with org_id and legal_name | API | Admin |
| 5 | Get member - not found | Request non-existent member | 404 Not Found | API | Admin |
| 6 | Update member status to ACTIVE | Activate a member | 200 OK with newStatus=ACTIVE | API | Admin |
| 7 | Update member status to SUSPENDED | Suspend a member | 200 OK with newStatus=SUSPENDED | API | Admin |
| 8 | Update member status - invalid value | Update with invalid status value | 400 Bad Request | API | Admin |
| 9 | Create member - missing required fields | Create member with only org_id | 400 Bad Request | API | Admin |
| 10 | Cleanup (internal) | Set member to INACTIVE status | Member marked for cleanup | API | Admin |

---

## Legal Entities (7 tests)

| # | Test Name | Description | Expected Result | Type | Portal |
|---|-----------|-------------|-----------------|------|--------|
| 1 | Get legal entity by ID | Retrieve legal entity by UUID | 200 OK with legal_entity_id and primary_legal_name | API | Admin |
| 2 | Get legal entity with identifiers | Retrieve entity including identifiers array | 200 OK with identifiers array | API | Admin |
| 3 | Get legal entity - not found | Request non-existent entity | 404 Not Found | API | Admin |
| 4 | Get legal entity - invalid UUID | Request with malformed UUID | 400 Bad Request | API | Admin |
| 5 | Update legal entity | Update address fields (address_line1, city, postal_code, country_code) | 200 OK | API | Admin |
| 6 | Update legal entity - partial update | Update only city field | 200 OK | API | Admin |
| 7 | Update legal entity - not found | Update non-existent entity | 404 Not Found | API | Admin |

---

## Identifiers (15 tests)

| # | Test Name | Description | Expected Result | Type | Portal |
|---|-----------|-------------|-----------------|------|--------|
| 1 | Get identifiers for entity | Retrieve all identifiers for a legal entity | 200 OK with identifiers data | API | Admin |
| 2 | Get identifiers - invalid UUID | Request with malformed UUID | 400 Bad Request | API | Admin |
| 3 | Create KVK identifier | Add KVK number (8 digits) with country_code, registry_name | 201 Created with legal_entity_reference_id | API | Admin |
| 4 | Create LEI identifier | Add LEI (20 alphanumeric chars) with issued_by | 201 Created with identifier ID | API | Admin |
| 5 | Create EORI identifier | Add EORI number (NL prefix + digits) | 201 Created with identifier ID | API | Admin |
| 6 | Create DUNS identifier | Add DUNS number (9 digits) | 201 Created with identifier ID | API | Admin |
| 7 | Create identifier - invalid type | Create with identifier_type=INVALID_TYPE | 400 Bad Request | API | Admin |
| 8 | Create identifier - missing required fields | Create without identifier_value | 400 Bad Request | API | Admin |
| 9 | Create identifier - entity not found | Create for non-existent entity | 404 Not Found | API | Admin |
| 10 | Update identifier | Update validation_status to VALIDATED | 200 OK with validation_status=VALIDATED | API | Admin |
| 11 | Update identifier - not found | Update non-existent identifier | 404 Not Found | API | Admin |
| 12 | Update identifier - invalid status | Update with invalid validation_status | 400 Bad Request | API | Admin |
| 13 | Delete identifier | Delete an identifier (soft delete) | 200 OK | API | Admin |
| 14 | Delete identifier - not found | Delete non-existent identifier | 404 Not Found | API | Admin |
| 15 | Delete identifier - invalid UUID | Delete with malformed UUID | 400 Bad Request | API | Admin |

---

## Contacts (12 tests)

| # | Test Name | Description | Expected Result | Type | Portal |
|---|-----------|-------------|-----------------|------|--------|
| 1 | Get contacts for entity | Retrieve all contacts for a legal entity | 200 OK with contacts data | API | Admin |
| 2 | Get contacts - invalid UUID | Request with malformed UUID | 400 Bad Request | API | Admin |
| 3 | Create PRIMARY contact | Add primary contact with full_name, email, phone, job_title, is_primary=true | 201 Created with legal_entity_contact_id | API | Admin |
| 4 | Create BILLING contact | Add billing contact with department=Finance | 201 Created with contact ID | API | Admin |
| 5 | Create TECHNICAL contact | Add technical contact with department=IT | 201 Created with contact ID | API | Admin |
| 6 | Create ADMIN contact | Add admin contact | 201 Created with contact ID | API | Admin |
| 7 | Create contact - missing email | Create without email field | 400 Bad Request | API | Admin |
| 8 | Update contact | Update job_title, department, phone | 200 OK with legal_entity_contact_id | API | Admin |
| 9 | Update contact - change email | Update email address | 200 OK with new email | API | Admin |
| 10 | Update contact - not found | Update non-existent contact | 404 Not Found | API | Admin |
| 11 | Delete contact | Delete a contact | 204 No Content | API | Admin |
| 12 | Delete contact - not found | Delete non-existent contact | 404 Not Found | API | Admin |

---

## KvK Integration (5 tests)

| # | Test Name | Description | Expected Result | Type | Portal |
|---|-----------|-------------|-----------------|------|--------|
| 1 | Get KvK registry data | Fetch KvK data for entity (may not exist) | 200 OK with kvk_number OR 404 if not exists | API | Admin |
| 2 | Get KvK registry data - invalid UUID | Request with malformed UUID | 400 Bad Request | API | Admin |
| 3 | Get KvK registry data - entity not found | Request for non-existent entity | 404 Not Found | API | Admin |
| 4 | Get KvK verification status | Check verification status for entity | 200 OK OR 404 if no verification | API | Admin |
| 5 | Get flagged entities | Retrieve list of entities flagged for review | 200 OK with entities data | API | Admin |

---

## Endpoints (12 tests)

| # | Test Name | Description | Expected Result | Type | Portal |
|---|-----------|-------------|-----------------|------|--------|
| 1 | Get endpoints for entity | Retrieve all M2M endpoints for entity | 200 OK with array of endpoints | API | Admin |
| 2 | Get endpoints - invalid UUID | Request with malformed UUID | 400 Bad Request | API | Admin |
| 3 | Create REST API endpoint | Create endpoint with type=REST_API, auth=TOKEN | 201 Created with legal_entity_endpoint_id | API | Admin |
| 4 | Create webhook endpoint | Create endpoint with type=WEBHOOK, auth=HMAC | 201 Created with endpoint ID | API | Admin |
| 5 | Create endpoint - missing name | Create without endpoint_name | 400 Bad Request | API | Admin |
| 6 | Create endpoint - entity not found | Create for non-existent entity | 404 Not Found | API | Admin |
| 7 | Update endpoint | Update description, set is_active=false | 200 OK | API | Admin |
| 8 | Update endpoint - reactivate | Set is_active=true | 200 OK | API | Admin |
| 9 | Update endpoint - not found | Update non-existent endpoint | 404 Not Found | API | Admin |
| 10 | Issue endpoint token | Generate new access token for endpoint | 200 or 201 OK | API | Admin |
| 11 | Get endpoint tokens | Retrieve all tokens for an endpoint | 200 OK with tokens | API | Admin |
| 12 | Cleanup (internal) | Deactivate endpoint (soft delete) | Endpoint marked inactive | API | Admin |

---

## Audit Logs (15 tests)

| # | Test Name | Description | Expected Result | Type | Portal |
|---|-----------|-------------|-----------------|------|--------|
| 1 | Get audit logs | Retrieve paginated list of audit logs | 200 OK with data array | API | Admin |
| 2 | Get audit logs with pagination | Retrieve logs with page=1&limit=10 | 200 OK with pagination info | API | Admin |
| 3 | Get audit logs by event type | Filter by event_type=MEMBER_CREATED | 200 OK with filtered results | API | Admin |
| 4 | Get audit logs by severity | Filter by severity=INFO | 200 OK with filtered results | API | Admin |
| 5 | Get audit logs by result | Filter by result=success | 200 OK with filtered results | API | Admin |
| 6 | Get audit logs by resource type | Filter by resource_type=member | 200 OK with filtered results | API | Admin |
| 7 | Get audit logs by action | Filter by action=create | 200 OK with filtered results | API | Admin |
| 8 | Get audit logs by date range | Filter by start_date and end_date | 200 OK with filtered results | API | Admin |
| 9 | Get audit logs - invalid event type | Filter with invalid event_type | 400 Bad Request | API | Admin |
| 10 | Get audit logs - invalid severity | Filter with invalid severity | 400 Bad Request | API | Admin |
| 11 | Get audit logs - invalid result | Filter with invalid result | 400 Bad Request | API | Admin |
| 12 | Get audit logs - invalid resource type | Filter with invalid resource_type | 400 Bad Request | API | Admin |
| 13 | Get audit logs - invalid date format | Filter with malformed date | 400 Bad Request | API | Admin |
| 14 | Get audit logs - invalid date range | Filter where end_date < start_date | 400 Bad Request | API | Admin |
| 15 | Get audit logs with multiple filters | Filter by resource_type + action + result | 200 OK with filtered results | API | Admin |

---

## Member Profile (10 tests) - Member Portal

| # | Test Name | Description | Expected Result | Type | Portal |
|---|-----------|-------------|-----------------|------|--------|
| 1 | Get authenticated member | Retrieve own profile via GET /member | 200 OK with legalEntityId, legalName | API | Member |
| 2 | Get member - no auth token | Request without authentication | 401 Unauthorized | API | Member |
| 3 | Get member - invalid token | Request with invalid/malformed token | 401 Unauthorized | API | Member |
| 4 | Profile contains required fields | Verify organizationId, legalName, status, legalEntityId | All fields present | API | Member |
| 5 | Profile includes registry identifiers | Verify identifierType, identifierValue in array | Array with proper structure | API | Member |
| 6 | Update profile - address fields | Update address_line1, postal_code, city, country_code | 200 OK with success message | API | Member |
| 7 | Update profile - domain | Update domain field | 200 OK | API | Member |
| 8 | Update profile - metadata | Update metadata object | 200 OK | API | Member |
| 9 | Update profile - empty body | Send empty update request | 200 OK (no changes) | API | Member |
| 10 | Update profile - no auth | Update without authentication | 401 Unauthorized | API | Member |

---

## Member Contacts (16 tests) - Member Portal

| # | Test Name | Description | Expected Result | Type | Portal |
|---|-----------|-------------|-----------------|------|--------|
| 1 | Get own contacts | Retrieve contacts via GET /member-contacts | 200 OK with contacts array | API | Member |
| 2 | Get contacts - no auth | Request without authentication | 401 Unauthorized | API | Member |
| 3 | Get contacts - invalid token | Request with invalid token | 401 Unauthorized | API | Member |
| 4 | Verify contact data structure | Check legal_entity_contact_id, legal_entity_id, email | Required fields present | API | Member |
| 5 | Create TECHNICAL contact | POST /member/contacts with TECHNICAL type | 201 Created with contactId | API | Member |
| 6 | Create BILLING contact | POST /member/contacts with BILLING type | 201 Created with contactId | API | Member |
| 7 | Create ADMIN contact | POST /member/contacts with ADMIN type | 201 Created with contactId | API | Member |
| 8 | Create contact - missing full_name | Create without full_name | 400 Bad Request | API | Member |
| 9 | Create contact - missing email | Create without email | 400 or 500 (not-null constraint) | API | Member |
| 10 | Create contact - no auth | Create without authentication | 401 Unauthorized | API | Member |
| 11 | Verify created contacts in list | Check created contacts appear in GET | Contacts found in list | API | Member |
| 12 | Update own contact | PUT /member/contacts/{id} with new data | 200 OK with success message | API | Member |
| 13 | Update contact - change email | Update email address | 200 OK | API | Member |
| 14 | Update contact - invalid UUID | Update with malformed UUID | 400 Bad Request | API | Member |
| 15 | Update contact - not found (IDOR) | Update non-existent/other entity contact | 403 or 404 | API | Member |
| 16 | Contacts sorted by primary status | Primary contacts listed first | Proper ordering | API | Member |

---

## Member Endpoints (15 tests) - Member Portal

| # | Test Name | Description | Expected Result | Type | Portal |
|---|-----------|-------------|-----------------|------|--------|
| 1 | Get own endpoints | Retrieve endpoints via GET /member-endpoints | 200 OK with endpoints array | API | Member |
| 2 | Get endpoints - no auth | Request without authentication | 401 Unauthorized | API | Member |
| 3 | Get endpoints - invalid token | Request with invalid token | 401 Unauthorized | API | Member |
| 4 | Verify endpoint data structure | Check endpoint_id, legal_entity_id, name, url | Required fields present | API | Member |
| 5 | Create REST API endpoint | POST /member/endpoints with REST_API type | 201 Created with endpointId | API | Member |
| 6 | Create webhook endpoint | POST /member/endpoints with WEBHOOK type | 201 Created with endpointId | API | Member |
| 7 | Create GraphQL endpoint | POST /member/endpoints with GRAPHQL type | 201 Created with endpointId | API | Member |
| 8 | Create endpoint - missing name | Create without endpoint_name | 400 or 500 | API | Member |
| 9 | Create endpoint - missing URL | Create without endpoint_url | 400 or 500 | API | Member |
| 10 | Create endpoint - no auth | Create without authentication | 401 Unauthorized | API | Member |
| 11 | Verify created endpoints in list | Check created endpoints appear in GET | Endpoints found in list | API | Member |
| 12 | Get own tokens | Retrieve tokens via GET /member/tokens | 200 OK with tokens array | API | Member |
| 13 | Get tokens - no auth | Request without authentication | 401 Unauthorized | API | Member |
| 14 | All endpoints belong to same entity | IDOR check - all endpoints same legal_entity_id | No cross-entity data | API | Member |
| 15 | Only active endpoints returned | Verify is_deleted=false filter | No deleted endpoints | API | Member |

---

## Member Authorization (30 tests) - Member Portal

### Authentication Tests

| # | Test Name | Description | Expected Result | Type | Portal |
|---|-----------|-------------|-----------------|------|--------|
| 1 | Get profile requires auth | GET /member without token | 401 Unauthorized | API | Member |
| 2 | Update profile requires auth | PUT /member/profile without token | 401 Unauthorized | API | Member |
| 3 | Get contacts requires auth | GET /member-contacts without token | 401 Unauthorized | API | Member |
| 4 | Create contact requires auth | POST /member/contacts without token | 401 Unauthorized | API | Member |
| 5 | Get endpoints requires auth | GET /member-endpoints without token | 401 Unauthorized | API | Member |
| 6 | Create endpoint requires auth | POST /member/endpoints without token | 401 Unauthorized | API | Member |
| 7 | Get tokens requires auth | GET /member/tokens without token | 401 Unauthorized | API | Member |
| 8 | Invalid token format rejected | Request with invalid JWT | 401 Unauthorized | API | Member |
| 9 | Malformed JWT rejected | Request with malformed JWT | 401 Unauthorized | API | Member |

### IDOR Protection Tests

| # | Test Name | Description | Expected Result | Type | Portal |
|---|-----------|-------------|-----------------|------|--------|
| 10 | Cannot update other entity contact | PUT with fake contact UUID | 403 or 404 | API | Member |
| 11 | Contacts scoped to own entity | Verify all contacts same legal_entity_id | No cross-entity data | API | Member |
| 12 | Endpoints scoped to own entity | Verify all endpoints same legal_entity_id | No cross-entity data | API | Member |
| 13 | Cannot list all members | GET /members with member token | Filtered or 403 | API | Member |

### Admin-Only Restrictions

| # | Test Name | Description | Expected Result | Type | Portal |
|---|-----------|-------------|-----------------|------|--------|
| 14 | Cannot access audit logs | GET /audit-logs with member token | 403 or filtered | API | Member |
| 15 | Cannot create member | POST /members with member token | 403 | API | Member |
| 16 | Cannot get applications | GET /applications with member token | 403 or filtered | API | Member |
| 17 | Cannot get arbitrary legal entity | GET /legal-entities/{fakeId} | 403 or 404 | API | Member |
| 18 | Cannot update arbitrary legal entity | PUT /legal-entities/{fakeId} | 403 or 404 | API | Member |
| 19 | Cannot delete arbitrary contact | DELETE /contacts/{fakeId} | 403 or 404 | API | Member |
| 20 | Cannot delete arbitrary identifier | DELETE /identifiers/{fakeId} | 403 or 404 | API | Member |

### Input Validation Tests

| # | Test Name | Description | Expected Result | Type | Portal |
|---|-----------|-------------|-----------------|------|--------|
| 21 | Invalid UUID rejected - contacts | PUT /member/contacts/not-a-uuid | 400 Bad Request | API | Member |
| 22 | SQL injection in UUID rejected | PUT with SQL injection in UUID | 400 or 404 | API | Member |
| 23 | XSS in profile data sanitized | PUT with XSS payload | 200 OK (sanitized) | API | Member |

### Permission Boundary Tests

| # | Test Name | Description | Expected Result | Type | Portal |
|---|-----------|-------------|-----------------|------|--------|
| 24 | Cannot self-escalate to admin | PUT /member/profile with role=SystemAdmin | 200 or 400 (field ignored) | API | Member |
| 25 | Cannot approve applications | POST /applications/{id}/approve | 403 or 404 | API | Member |
| 26 | Cannot update member status | PUT /members/{id}/status | 403 or 404 | API | Member |

### Cross-Entity Prevention Tests

| # | Test Name | Description | Expected Result | Type | Portal |
|---|-----------|-------------|-----------------|------|--------|
| 27 | Cannot specify other entity for contact | POST with different legal_entity_id | 201 (own entity) or 400/403 | API | Member |
| 28 | Cannot specify other entity for endpoint | POST with different legal_entity_id | 201 (own entity) or 400/403 | API | Member |

### Abuse Prevention Tests

| # | Test Name | Description | Expected Result | Type | Portal |
|---|-----------|-------------|-----------------|------|--------|
| 29 | Multiple rapid requests handled | 5 concurrent GET /member requests | All 200 OK | API | Member |
| 30 | Rate limiting enforced (if configured) | Excessive requests | 429 or all OK | API | Member |

---

## How to Run Tests

### Local Development

```bash
cd api

# Set password
export E2E_TEST_USER_PASSWORD=Madu5952

# Run all tests
npm run test:api

# Run in CI mode (non-blocking)
npm run test:api:ci
```

### CI/CD Pipeline

Tests are configured to run automatically after API deployment via `.azure-pipelines/api-tests.yml`.

---

## Test Output

Results are saved to `api/tests/results/` in JSON format:

```
api/tests/results/
├── api-test-results-{timestamp}.json
└── summary.json
```

### Sample Output

```
=== API Test Results ===
Total: 72
Passed: 68
Failed: 4

PASSED:
✓ Members - Get all members
✓ Members - Create member
...

FAILED:
✗ KvK - Get KvK registry data
  Error: 404 - No KvK data for test entity
...
```

---

## Future Tests (Planned for Playwright E2E)

| Feature | Description | Type | Portal |
|---------|-------------|------|--------|
| Document upload | Upload KvK/incorporation documents | E2E | Admin |
| Document verification | Admin reviews and approves documents | E2E | Admin |
| Bulk member import | CSV import of multiple members | E2E | Admin |
| Member search | Full-text search with filters | E2E | Admin |
| Dashboard metrics | Verify dashboard statistics | E2E | Admin |
| Member portal login | Member self-service login flow | E2E | Member |
| Profile editing | Member edits own contact info | E2E | Member |
| Document submission | Member uploads required documents | E2E | Member |

---

---

# E2E Playwright Tests

**Location:** `admin-portal/e2e/` and `member-portal/e2e/`
**Total E2E Tests:** ~150+

---

## Admin Portal - Member Management (24 tests)

**File:** `admin-portal/e2e/admin-portal/member-management.spec.ts`

| # | Test Name | Description | Expected Result | Type | Portal |
|---|-----------|-------------|-----------------|------|--------|
| 1 | Display members grid with data | Navigate to Members page and verify grid loads | Grid visible with >0 rows | E2E | Admin |
| 2 | Correct column headers | Verify grid has Legal Name, Status, Country, Type columns | Columns visible | E2E | Admin |
| 3 | Call GetMembers API endpoint | Monitor network for successful API call | 200 OK on /all-members | E2E | Admin |
| 4 | Display member count statistics | Check for pagination info | Pager info visible | E2E | Admin |
| 5 | Handle empty search results | Search for non-existent member | Empty state or "no results" message | E2E | Admin |
| 6 | Open member details on row click | Click grid row | Details view/dialog opens | E2E | Admin |
| 7 | Call GetMember API endpoint | Monitor network for member fetch | API call for specific member | E2E | Admin |
| 8 | Display member identifiers | View identifiers section in details | Identifiers section visible | E2E | Admin |
| 9 | Display member contacts | View contacts section in details | Contacts section visible | E2E | Admin |
| 10 | Display member endpoints | View endpoints section in details | Endpoints section visible | E2E | Admin |
| 11 | Open new member registration form | Click Register New Member button | Form/dialog opens | E2E | Admin |
| 12 | Required fields in registration form | Check for Legal Name, Country, Type, Email fields | Fields present | E2E | Admin |
| 13 | Validate required fields on submit | Submit empty form | Validation errors shown | E2E | Admin |
| 14 | Allow closing the form | Click Cancel/Close button | Form closes | E2E | Admin |
| 15 | Open edit form for existing member | Click Edit button in details | Edit form opens | E2E | Admin |
| 16 | Pre-populate form with existing data | Open edit form | Inputs have existing values | E2E | Admin |
| 17 | Display member status badges | View grid | Status badges (Active, Pending, Suspended) visible | E2E | Admin |
| 18 | Filter members by status | Use status filter dropdown | Grid filtered by status | E2E | Admin |
| 19 | Allow changing member status | Access status change control | Status dropdown/buttons available | E2E | Admin |
| 20 | Handle 404 errors gracefully | Monitor for API errors | No 404 errors during navigation | E2E | Admin |
| 21 | Handle 500 errors gracefully | Monitor for server errors | No 500 errors during navigation | E2E | Admin |
| 22 | Display error toast for failed operations | Monitor for toast notifications | Toast shown on error | E2E | Admin |

---

## Admin Portal - Managers CRUD (20 tests)

**File:** `admin-portal/e2e/admin-portal/managers-crud.spec.ts`

### Contacts Manager

| # | Test Name | Description | Expected Result | Type | Portal |
|---|-----------|-------------|-----------------|------|--------|
| 1 | Display contacts grid | View contacts section | Grid visible | E2E | Admin |
| 2 | Contact role types | Check for PRIMARY, TECHNICAL, BILLING, SUPPORT | Roles available in dropdown | E2E | Admin |
| 3 | Empty state when no contacts | New entity without contacts | Empty state message | E2E | Admin |
| 4 | ConfirmDialog for deletions | Click delete button | Confirmation dialog appears | E2E | Admin |
| 5 | Validate required fields | Submit empty contact form | Validation errors shown | E2E | Admin |

### Endpoints Manager

| # | Test Name | Description | Expected Result | Type | Portal |
|---|-----------|-------------|-----------------|------|--------|
| 6 | Display endpoints grid | View endpoints section | Grid visible | E2E | Admin |
| 7 | Open create endpoint dialog | Click Add Endpoint | Dialog opens | E2E | Admin |
| 8 | Token association with endpoints | Check for token field | Token association field visible | E2E | Admin |
| 9 | Validate endpoint URL format | Enter invalid URL | Validation error shown | E2E | Admin |

### Tokens Manager

| # | Test Name | Description | Expected Result | Type | Portal |
|---|-----------|-------------|-----------------|------|--------|
| 10 | Display tokens grid | View tokens section | Grid visible | E2E | Admin |
| 11 | Status badges | Check for Active, Expiring, Expired, Revoked | Status badges present | E2E | Admin |
| 12 | Copy token to clipboard | Find copy button | Copy button available | E2E | Admin |
| 13 | Filter tokens by endpoint | Find filter dropdown | Filter available | E2E | Admin |
| 14 | Revoke tokens | Click revoke button | Confirmation dialog appears | E2E | Admin |
| 15 | Issue new tokens | Click Issue/Generate button | Issue dialog opens | E2E | Admin |
| 16 | Sort by last_used_at | Check default sort | Sorted column indicator | E2E | Admin |
| 17 | Color contrast on badges | Capture badge colors | Colors captured for WCAG check | E2E | Admin |

### Error Handling & Loading

| # | Test Name | Description | Expected Result | Type | Portal |
|---|-----------|-------------|-----------------|------|--------|
| 18 | Handle API errors gracefully | Monitor for 500 errors | No server errors | E2E | Admin |
| 19 | Use toast notifications | Override window.alert | No browser alerts used | E2E | Admin |
| 20 | Display loading states | Navigate and check loaders | Loading indicators present | E2E | Admin |

---

## Admin Portal - Identifiers CRUD (8 tests)

**File:** `admin-portal/e2e/admin-portal/identifiers-crud.spec.ts`

| # | Test Name | Description | Expected Result | Type | Portal |
|---|-----------|-------------|-----------------|------|--------|
| 1 | API responds without private member error | GET /identifiers | No 500 error | E2E | Admin |
| 2 | POST endpoint responds without header error | POST /identifiers | No 500 error | E2E | Admin |
| 3 | Audit logging captures headers | Custom headers in request | Headers captured without error | E2E | Admin |
| 4 | All identifier types accepted | POST KVK, LEI, EORI, VAT, DUNS | No 500 errors | E2E | Admin |
| 5 | Error responses properly formatted | Invalid UUID request | Proper error structure | E2E | Admin |
| 6 | OPTIONS request for CORS | CORS preflight | 200 or 204 response | E2E | Admin |
| 7 | Bug fix documentation | Document the fix | Test passes | E2E | Admin |

---

## Admin Portal - KvK Verification (35 tests)

**File:** `admin-portal/e2e/kvk-verification.spec.ts`

### API Endpoints

| # | Test Name | Description | Expected Result | Type | Portal |
|---|-----------|-------------|-----------------|------|--------|
| 1 | GET verification status | Fetch KvK verification for entity | 200 OK with legal_entity_id | E2E | Admin |
| 2 | GET flagged entities | Admin review endpoint | 200 OK with array | E2E | Admin |
| 3 | Return 401 unauthenticated | Request without auth | 401 Unauthorized | E2E | Admin |
| 4 | No 404 errors on KvK endpoints | Monitor API calls | No 404 errors | E2E | Admin |

### Review Queue Component

| # | Test Name | Description | Expected Result | Type | Portal |
|---|-----------|-------------|-----------------|------|--------|
| 5 | Navigate to KvK Review Queue | Find and click navigation | Queue page loads | E2E | Admin |
| 6 | Display flagged entities grid | Check for expected columns | Grid with proper columns | E2E | Admin |
| 7 | Display flag badges with colors | Check badge styling | Badges visible with colors | E2E | Admin |
| 8 | Prioritize entered data mismatches | Check sorting order | Entered mismatches first | E2E | Admin |
| 9 | Open review dialog | Click Review button | Dialog opens | E2E | Admin |
| 10 | Display alert banner | Check for mismatch alerts | Alert elements present | E2E | Admin |

### Entered vs Extracted Comparison

| # | Test Name | Description | Expected Result | Type | Portal |
|---|-----------|-------------|-----------------|------|--------|
| 11 | Compare KvK numbers | Entered vs extracted | Mismatch flagged correctly | E2E | Admin |
| 12 | Compare company names | Entered vs extracted | Mismatch flagged correctly | E2E | Admin |
| 13 | Display side-by-side | Both columns visible | Entered and Extracted visible | E2E | Admin |
| 14 | Merge mismatch flags | Unique flags only | No duplicate flags | E2E | Admin |

### Chrome Console Monitoring

| # | Test Name | Description | Expected Result | Type | Portal |
|---|-----------|-------------|-----------------|------|--------|
| 15 | No JavaScript errors | Monitor console | No console errors | E2E | Admin |
| 16 | No failed network requests | Monitor requests | No critical failures | E2E | Admin |
| 17 | No 500 errors during verification | Monitor responses | No server errors | E2E | Admin |
| 18 | Monitor DevTools Console | Categorize messages | Summary logged | E2E | Admin |

### Visual Indicators

| # | Test Name | Description | Expected Result | Type | Portal |
|---|-----------|-------------|-----------------|------|--------|
| 19 | Red badges for entered mismatches | Check badge colors | Red background | E2E | Admin |
| 20 | Yellow badges for other issues | Check badge colors | Yellow background | E2E | Admin |
| 21 | Explanatory text for mismatches | Check for text | Mismatch explanation present | E2E | Admin |

---

## Admin Portal - Accessibility (24 tests)

**File:** `admin-portal/e2e/admin-portal/accessibility.spec.ts`

### Keyboard Navigation

| # | Test Name | Description | Expected Result | Type | Portal |
|---|-----------|-------------|-----------------|------|--------|
| 1 | Navigate using Tab key | Press Tab multiple times | Focus moves between elements | E2E | Admin |
| 2 | Activate buttons with Enter | Press Enter on focused button | Button action triggered | E2E | Admin |
| 3 | Activate buttons with Space | Press Space on focused button | Button action triggered | E2E | Admin |
| 4 | Visible focus indicators | Tab to element | Focus ring visible | E2E | Admin |
| 5 | Tab order in grids | Tab through grid | Focus stays within grid | E2E | Admin |
| 6 | Keyboard navigation in dialogs | Tab through dialog | Focus trapped in dialog | E2E | Admin |

### ARIA Labels and Roles

| # | Test Name | Description | Expected Result | Type | Portal |
|---|-----------|-------------|-----------------|------|--------|
| 7 | ARIA labels on interactive elements | Check buttons | aria-label attributes present | E2E | Admin |
| 8 | Semantic HTML roles | Check for grid, button, dialog, etc. | Semantic roles present | E2E | Admin |
| 9 | role="status" for loading | Check loading states | Status role present | E2E | Admin |
| 10 | ARIA live regions | Check dynamic content | Live regions present | E2E | Admin |
| 11 | Accessible form labels | Check inputs | Labels associated with inputs | E2E | Admin |

### Color Contrast

| # | Test Name | Description | Expected Result | Type | Portal |
|---|-----------|-------------|-----------------|------|--------|
| 12 | Focus indicator contrast (8.59:1) | Check focus styles | High contrast focus | E2E | Admin |
| 13 | Badge contrast (4.5:1 minimum) | Check badge colors | Sufficient contrast | E2E | Admin |
| 14 | Readable text on backgrounds | Check UI elements | Sufficient contrast | E2E | Admin |

### Screen Reader Support

| # | Test Name | Description | Expected Result | Type | Portal |
|---|-----------|-------------|-----------------|------|--------|
| 15 | Descriptive page title | Check document title | Title present | E2E | Admin |
| 16 | Landmark regions | Check for main, nav, etc. | Landmarks present | E2E | Admin |
| 17 | Heading hierarchy | Check h1-h6 structure | Proper heading levels | E2E | Admin |
| 18 | Alt text on images | Check img elements | Alt attributes present | E2E | Admin |
| 19 | aria-describedby for tooltips | Check hints | Describedby present | E2E | Admin |

### Form Accessibility

| # | Test Name | Description | Expected Result | Type | Portal |
|---|-----------|-------------|-----------------|------|--------|
| 20 | Associate labels with controls | Check label-input pairs | Proper association | E2E | Admin |
| 21 | Required field indicators | Check for * or aria-required | Indicators present | E2E | Admin |
| 22 | Announce validation errors | Submit invalid form | Errors announced via ARIA | E2E | Admin |

### WCAG Compliance

| # | Test Name | Description | Expected Result | Type | Portal |
|---|-----------|-------------|-----------------|------|--------|
| 23 | WCAG 2.1 Level AA summary | Overall compliance check | Summary logged | E2E | Admin |

---

## Admin Portal - Grid Pagination (12 tests)

**File:** `admin-portal/e2e/admin-portal/grid-pagination.spec.ts`

### URL State Persistence

| # | Test Name | Description | Expected Result | Type | Portal |
|---|-----------|-------------|-----------------|------|--------|
| 1 | Persist page number in URL | Change to page 2 | URL contains page=2 | E2E | Admin |
| 2 | Persist page size in URL | Change page size to 50 | URL contains pageSize=50 | E2E | Admin |
| 3 | Preserve state across navigation | Navigate away and return | State maintained | E2E | Admin |
| 4 | Load correct page from URL | Direct URL with ?page=2 | Page 2 displayed | E2E | Admin |
| 5 | Filter resets to page 1 | Apply search filter | Page resets to 1 | E2E | Admin |
| 6 | Show correct pagination info | Change pages | Info updates correctly | E2E | Admin |
| 7 | Maintain pageSize when changing pages | Change page after size | Both params in URL | E2E | Admin |
| 8 | Direct URL navigation with params | Navigate with ?page=1&pageSize=10 | Params respected | E2E | Admin |

### Edge Cases

| # | Test Name | Description | Expected Result | Type | Portal |
|---|-----------|-------------|-----------------|------|--------|
| 9 | Page number exceeds total | Navigate to page 9999 | Handles gracefully | E2E | Admin |
| 10 | Invalid page numbers | page=0 or negative | Defaults to page 1 | E2E | Admin |
| 11 | Very large page size | pageSize=1000 | Handles gracefully | E2E | Admin |

---

## Admin Portal - Basic Authentication (6 tests)

**File:** `admin-portal/e2e/basic-authentication.spec.ts`

| # | Test Name | Description | Expected Result | Type | Portal |
|---|-----------|-------------|-----------------|------|--------|
| 1 | Load with authenticated state | Navigate to / | Not redirected to Azure AD | E2E | Admin |
| 2 | Display dashboard navigation | Check sidebar elements | Dashboard, Members, Settings visible | E2E | Admin |
| 3 | Navigate to Members page | Click Members link | Content loads | E2E | Admin |
| 4 | Display user information | Check for user elements | User info visible | E2E | Admin |
| 5 | Valid MSAL tokens in sessionStorage | Check for msal keys | Tokens present | E2E | Admin |
| 6 | No critical console errors | Monitor console | <10 critical errors | E2E | Admin |

---

## Admin Portal - Portal Smoke Test (4 tests)

**File:** `admin-portal/e2e/portal-smoke-test.spec.ts`

| # | Test Name | Description | Expected Result | Type | Portal |
|---|-----------|-------------|-----------------|------|--------|
| 1 | Admin Portal loads without white page | Check page content | >100 chars content, buttons present | E2E | Admin |
| 2 | Member Portal loads without white page | Check page content | >100 chars content, buttons present | E2E | Member |
| 3 | Admin Portal i18n initialized | Check window object | No Suspense indicators stuck | E2E | Admin |
| 4 | Member Portal i18n initialized | Check window object | No Suspense indicators stuck | E2E | Member |

---

## Member Portal - Authentication (11 tests)

**File:** `member-portal/e2e/member-portal/authentication.spec.ts`

| # | Test Name | Description | Expected Result | Type | Portal |
|---|-----------|-------------|-----------------|------|--------|
| 1 | Load with authenticated state | Navigate to / | Not redirected to Azure AD | E2E | Member |
| 2 | Display CTN branding | Check for branding elements | CTN visible | E2E | Member |
| 3 | Bearer token in API requests | Monitor network requests | Authorization header present | E2E | Member |
| 4 | Session persistence on reload | Reload page | Session maintained | E2E | Member |
| 5 | MSAL tokens in sessionStorage | Check storage | Token keys present | E2E | Member |
| 6 | Access token not exposed in URL | Check URL | No token in URL | E2E | Member |
| 7 | Refresh token not in localStorage | Check storage | No refresh token exposed | E2E | Member |
| 8 | Sign out button visible | Check UI | Sign out available | E2E | Member |
| 9 | No critical console errors | Monitor console | <10 critical errors | E2E | Member |
| 10 | API requests authenticated | Check network | All requests have auth | E2E | Member |
| 11 | User info accessible | Check profile data | User data loaded | E2E | Member |

---

## Member Portal - Dashboard (19 tests)

**File:** `member-portal/e2e/member-portal/dashboard.spec.ts`

| # | Test Name | Description | Expected Result | Type | Portal |
|---|-----------|-------------|-----------------|------|--------|
| 1 | Display dashboard on load | Navigate to / | Dashboard visible | E2E | Member |
| 2 | Organization name visible | Check header | Org name displayed | E2E | Member |
| 3 | Status badge visible | Check status indicator | Status badge present | E2E | Member |
| 4 | Membership tier display | Check tier info | Tier displayed | E2E | Member |
| 5 | Stats cards - contacts count | Check contacts stat | Count displayed | E2E | Member |
| 6 | Stats cards - endpoints count | Check endpoints stat | Count displayed | E2E | Member |
| 7 | Stats cards - tokens count | Check tokens stat | Count displayed | E2E | Member |
| 8 | Registry identifiers section | Check identifiers | Identifiers visible | E2E | Member |
| 9 | Recent activity section | Check activity | Activity list visible | E2E | Member |
| 10 | Navigation sidebar visible | Check sidebar | Nav items present | E2E | Member |
| 11 | Quick actions available | Check action buttons | Actions clickable | E2E | Member |
| 12-19 | Tab navigation, data refresh, etc. | Various dashboard features | Features work correctly | E2E | Member |

---

## Member Portal - Profile Management (19 tests)

**File:** `member-portal/e2e/member-portal/profile.spec.ts`

| # | Test Name | Description | Expected Result | Type | Portal |
|---|-----------|-------------|-----------------|------|--------|
| 1 | Display organization details | View profile section | Details visible | E2E | Member |
| 2 | Edit button opens modal | Click Edit | Modal opens | E2E | Member |
| 3 | Form pre-populated | Open edit modal | Existing values shown | E2E | Member |
| 4 | Update address fields | Edit address | Changes saved | E2E | Member |
| 5 | Cancel closes modal | Click Cancel | Modal closes, no changes | E2E | Member |
| 6 | Validation - required fields | Submit empty | Errors shown | E2E | Member |
| 7 | Success notification | Save changes | Toast shown | E2E | Member |
| 8 | Country code dropdown | Check dropdown | Country codes available | E2E | Member |
| 9 | Registry identifiers display | Check identifiers | KVK/LEI visible | E2E | Member |
| 10-19 | Form validation, field limits, etc. | Various profile features | Features work correctly | E2E | Member |

---

## Member Portal - Contacts Management (22 tests)

**File:** `member-portal/e2e/member-portal/contacts.spec.ts`

| # | Test Name | Description | Expected Result | Type | Portal |
|---|-----------|-------------|-----------------|------|--------|
| 1 | Display contacts table | Navigate to contacts | Table visible | E2E | Member |
| 2 | Table columns | Check headers | Name, Type, Email, Phone, Primary | E2E | Member |
| 3 | Add contact button | Check UI | Button visible | E2E | Member |
| 4 | Add contact modal | Click Add | Modal opens | E2E | Member |
| 5 | Contact type dropdown | Check options | PRIMARY, TECHNICAL, BILLING, ADMIN | E2E | Member |
| 6 | Create TECHNICAL contact | Fill form and save | Contact created | E2E | Member |
| 7 | Create BILLING contact | Fill form and save | Contact created | E2E | Member |
| 8 | Edit contact | Click edit row | Edit modal opens | E2E | Member |
| 9 | Delete with confirmation | Click delete | Confirm dialog shown | E2E | Member |
| 10 | Validation - email format | Enter invalid email | Error shown | E2E | Member |
| 11 | Validation - phone format | Enter invalid phone | Error shown | E2E | Member |
| 12 | Empty state | No contacts | Empty message shown | E2E | Member |
| 13 | Primary contact badge | Check indicator | Badge visible | E2E | Member |
| 14-22 | Preferred contact method, sorting, etc. | Various features | Features work correctly | E2E | Member |

---

## Member Portal - Endpoints Management (16 tests)

**File:** `member-portal/e2e/member-portal/endpoints.spec.ts`

| # | Test Name | Description | Expected Result | Type | Portal |
|---|-----------|-------------|-----------------|------|--------|
| 1 | Display endpoints table | Navigate to endpoints | Table visible | E2E | Member |
| 2 | Register endpoint button | Check UI | Button visible | E2E | Member |
| 3 | Registration wizard | Click Register | Wizard opens | E2E | Member |
| 4 | Endpoint type selection | Check options | REST_API, WEBHOOK, GRAPHQL | E2E | Member |
| 5 | Auth method selection | Check options | BEARER_TOKEN, API_KEY, HMAC | E2E | Member |
| 6 | Create REST API endpoint | Complete wizard | Endpoint created | E2E | Member |
| 7 | Create webhook endpoint | Complete wizard | Endpoint created | E2E | Member |
| 8 | Status badges | Check indicators | Active/Inactive badges | E2E | Member |
| 9 | Connection status | Check indicator | Connected/Disconnected | E2E | Member |
| 10 | Edit endpoint | Click edit | Edit form opens | E2E | Member |
| 11 | Deactivate endpoint | Toggle status | Status changed | E2E | Member |
| 12-16 | URL validation, empty state, etc. | Various features | Features work correctly | E2E | Member |

---

## Member Portal - API Access (17 tests)

**File:** `member-portal/e2e/member-portal/api-access.spec.ts`

| # | Test Name | Description | Expected Result | Type | Portal |
|---|-----------|-------------|-----------------|------|--------|
| 1 | Display API access page | Navigate to API | Page visible | E2E | Member |
| 2 | M2M clients section | Check section | Clients listed | E2E | Member |
| 3 | Legacy tokens section | Check section | Tokens listed | E2E | Member |
| 4 | OAuth 2.0 configuration | Check info | Client ID, scopes displayed | E2E | Member |
| 5 | Create new client | Click Create | Form opens | E2E | Member |
| 6 | Token status badges | Check indicators | Active/Expired badges | E2E | Member |
| 7 | Copy client ID | Click copy | Copied to clipboard | E2E | Member |
| 8 | Scope-based permissions | Check scopes | Permissions displayed | E2E | Member |
| 9-17 | Token management, revocation, etc. | Various features | Features work correctly | E2E | Member |

---

## Member Portal - DNS Verification (21 tests)

**File:** `member-portal/e2e/member-portal/dns-verification.spec.ts`

| # | Test Name | Description | Expected Result | Type | Portal |
|---|-----------|-------------|-----------------|------|--------|
| 1 | Display DNS verification page | Navigate to DNS | Page visible | E2E | Member |
| 2 | Token generation form | Check form | Domain input, generate button | E2E | Member |
| 3 | Generate verification token | Enter domain | Token generated | E2E | Member |
| 4 | TXT record instructions | Check display | DNS record shown | E2E | Member |
| 5 | Copy verification token | Click copy | Copied to clipboard | E2E | Member |
| 6 | Domain validation | Enter invalid | Error shown | E2E | Member |
| 7 | Verification status | Check status | Pending/Verified badge | E2E | Member |
| 8-21 | Multiple domains, expiration, etc. | Various features | Features work correctly | E2E | Member |

---

## Member Portal - Support & Resources (21 tests)

**File:** `member-portal/e2e/member-portal/support.spec.ts`

| # | Test Name | Description | Expected Result | Type | Portal |
|---|-----------|-------------|-----------------|------|--------|
| 1 | Display support page | Navigate to support | Page visible | E2E | Member |
| 2 | Contact support info | Check section | Email, phone visible | E2E | Member |
| 3 | Documentation links | Check links | Docs links work | E2E | Member |
| 4 | System status indicator | Check status | Status badge visible | E2E | Member |
| 5 | FAQ section | Check FAQs | Questions visible | E2E | Member |
| 6-21 | FAQ expansion, links, etc. | Various features | Features work correctly | E2E | Member |

---

## Member Portal - Accessibility (19 tests)

**File:** `member-portal/e2e/member-portal/accessibility.spec.ts`

| # | Test Name | Description | Expected Result | Type | Portal |
|---|-----------|-------------|-----------------|------|--------|
| 1 | Landmark regions | Check main, header, nav, footer | Landmarks present | E2E | Member |
| 2 | Focus indicators visible | Tab through page | Focus rings visible | E2E | Member |
| 3 | Images have alt text | Check img elements | Alt attributes present | E2E | Member |
| 4 | Form inputs have labels | Check inputs | Labels associated | E2E | Member |
| 5 | Heading hierarchy | Check h1-h6 | Proper structure | E2E | Member |
| 6 | Keyboard navigation | Tab through UI | All interactive reachable | E2E | Member |
| 7 | Escape closes modals | Open modal, press Esc | Modal closes | E2E | Member |
| 8 | Language attribute | Check html lang | Lang present | E2E | Member |
| 9-19 | ARIA labels, contrast, etc. | WCAG 2.1 AA checks | Compliance verified | E2E | Member |

---

## Member Portal - Error Handling (16 tests)

**File:** `member-portal/e2e/member-portal/error-handling.spec.ts`

| # | Test Name | Description | Expected Result | Type | Portal |
|---|-----------|-------------|-----------------|------|--------|
| 1 | No JavaScript errors | Monitor console | No critical errors | E2E | Member |
| 2 | API 500 error display | Intercept with 500 | Error message shown | E2E | Member |
| 3 | API 404 error handling | Intercept with 404 | Graceful handling | E2E | Member |
| 4 | Form validation errors | Submit invalid | Field errors shown | E2E | Member |
| 5 | Empty states | No data | Empty message shown | E2E | Member |
| 6 | Network timeout | Slow response | Timeout handling | E2E | Member |
| 7-16 | Unhandled rejections, etc. | Various error cases | Proper handling | E2E | Member |

---

## Member Portal - Responsive Design (25 tests)

**File:** `member-portal/e2e/member-portal/responsive.spec.ts`

| # | Test Name | Description | Expected Result | Type | Portal |
|---|-----------|-------------|-----------------|------|--------|
| 1 | Mobile 375px - layout | iPhone SE viewport | Content fits, no overflow | E2E | Member |
| 2 | Mobile 375px - navigation | Check nav | Hamburger menu | E2E | Member |
| 3 | Mobile 375px - touch targets | Check buttons | Min 44px | E2E | Member |
| 4 | Mobile 414px - layout | iPhone Plus viewport | Content fits | E2E | Member |
| 5 | Tablet 768px - layout | iPad viewport | Responsive grid | E2E | Member |
| 6 | Tablet 768px - sidebar | Check nav | Collapsed or visible | E2E | Member |
| 7 | Desktop 1920px - layout | Full HD | Full width utilized | E2E | Member |
| 8-25 | Modal behavior, font sizes, etc. | Various viewports | Proper responsiveness | E2E | Member |

---

## Security Headers Tests

**Files:** `admin-portal/e2e/security-headers.spec.ts`, `member-portal/e2e/security-headers.spec.ts`

Tests for Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, and other security headers.

---

## How to Run E2E Tests

### Admin Portal

```bash
cd admin-portal

# Run all E2E tests
npm run test:e2e

# Run with UI
npm run test:e2e:ui

# Run specific test file
npx playwright test e2e/admin-portal/member-management.spec.ts

# Run in headed mode
npm run test:e2e:headed

# Generate report
npm run test:e2e:report
```

### Member Portal

```bash
cd member-portal

# Run all E2E tests
npm run test:e2e

# Run specific test
npx playwright test e2e/basic-authentication.spec.ts
```

---

## Test User

All E2E tests use the shared test user:

- **Email:** test-e2@denoronha.consulting
- **Password:** Madu5952
- **Object ID:** 7e093589-f654-4e53-9522-898995d1201b
- **Role:** SystemAdmin
- **MFA:** Excluded for testing

Auth state stored in `playwright/.auth/user.json`.

---

## Test Data Conventions

- Test data prefix: `Test` or `TEST_`
- Auto-generated IDs include timestamp: `Test Company 1731945123456`
- Email format: `test-{type}-{timestamp}@example.com`
- All test data is cleaned up after test run
- Members set to INACTIVE, endpoints deactivated, identifiers/contacts deleted
