# CTN ASR Admin Portal - Comprehensive Test Plan

**Last Updated:** November 1, 2025
**Application:** Admin Portal (https://calm-tree-03352ba03.1.azurestaticapps.net)
**API Base:** https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1
**Test User:** test-e2@denoronha.consulting / Madu5952 (SystemAdmin, MFA excluded)
**Tech Stack:** React 18 + TypeScript + Kendo UI, Azure Functions, PostgreSQL

---

## Table of Contents

1. [API Endpoints Inventory](#api-endpoints-inventory)
2. [Critical User Flows](#critical-user-flows)
3. [Test Scenarios by Priority](#test-scenarios-by-priority)
4. [Test Data Requirements](#test-data-requirements)
5. [Test Execution Strategy](#test-execution-strategy)
6. [Success Criteria](#success-criteria)

---

## API Endpoints Inventory

### Health & Diagnostics
| Endpoint | Method | Auth | Expected Response | Priority |
|----------|--------|------|-------------------|----------|
| `/api/health` | GET | No | 200 - Health status | CRITICAL |
| `/api/version` | GET | No | 200 - Version info | HIGH |
| `/api/diagnostic` | GET | Yes | 200 - Diagnostic data | MEDIUM |

### Authentication & Authorization
| Endpoint | Method | Auth | Expected Response | Priority |
|----------|--------|------|-------------------|----------|
| `/api/v1/authenticated-member` | GET | Yes | 200 - Current user info | CRITICAL |
| Azure AD Login | - | - | Redirect + token | CRITICAL |
| CSRF Token Generation | - | - | Token in headers | HIGH |

### Members (Legacy V1)
| Endpoint | Method | Auth | Expected Response | Priority |
|----------|--------|------|-------------------|----------|
| `/api/v1/all-members` | GET | Yes | 200 - Paginated members | CRITICAL |
| `/api/v1/members/{orgId}` | GET | Yes | 200 - Single member | CRITICAL |
| `/api/v1/members` | POST | Yes | 201 - Created member | CRITICAL |
| `/api/v1/members/{orgId}` | PUT | Yes | 200 - Updated member | HIGH |
| `/api/v1/members/{orgId}` | DELETE | Yes | 204 - Deleted | MEDIUM |

### Legal Entities (Enhanced Schema)
| Endpoint | Method | Auth | Expected Response | Priority |
|----------|--------|------|-------------------|----------|
| `/api/v1/legal-entities/{legalEntityId}` | GET | Yes | 200 - Legal entity details | CRITICAL |
| `/api/v1/legal-entities/{legalEntityId}` | PUT | Yes | 200 - Updated entity | HIGH |
| `/api/v1/legal-entities` | GET | Yes | 200 - All entities | MEDIUM |
| `/api/v1/legal-entities` | POST | Yes | 201 - Created entity | HIGH |
| `/api/v1/legal-entities/{legalEntityId}` | DELETE | Yes | 204 - Deleted | LOW |

### Identifiers (LEI, KVK, EUID, etc.)
| Endpoint | Method | Auth | Expected Response | Priority |
|----------|--------|------|-------------------|----------|
| `/api/v1/entities/{legalEntityId}/identifiers` | GET | Yes | 200 - Paginated identifiers | CRITICAL |
| `/api/v1/entities/{legalEntityId}/identifiers` | POST | Yes | 201 - Created identifier | CRITICAL |
| `/api/v1/identifiers/{identifierId}` | PUT | Yes | 200 - Updated identifier | HIGH |
| `/api/v1/identifiers/{identifierId}` | DELETE | Yes | 204 - Deleted | HIGH |
| `/api/v1/identifiers/{identifierId}/validate` | POST | Yes | 200 - Validation result | HIGH |
| `/api/v1/legal-entities/{legalEntityId}/generate-euid` | POST | Yes | 201 - Generated EUID | HIGH |
| `/api/v1/legal-entities/{legalEntityId}/fetch-lei` | POST | Yes | 200 - Fetched LEI data | MEDIUM |

### Contacts
| Endpoint | Method | Auth | Expected Response | Priority |
|----------|--------|------|-------------------|----------|
| `/api/v1/legal-entities/{legalEntityId}/contacts` | GET | Yes | 200 - Paginated contacts | CRITICAL |
| `/api/v1/contacts` | POST | Yes | 201 - Created contact | CRITICAL |
| `/api/v1/contacts/{contactId}` | PUT | Yes | 200 - Updated contact | HIGH |
| `/api/v1/contacts/{contactId}` | DELETE | Yes | 204 - Deleted | HIGH |

### Endpoints (Data Connections)
| Endpoint | Method | Auth | Expected Response | Priority |
|----------|--------|------|-------------------|----------|
| `/api/v1/legal-entities/{legalEntityId}/endpoints` | GET | Yes | 200 - Entity endpoints | CRITICAL |
| `/api/v1/legal-entities/{legalEntityId}/endpoints` | POST | Yes | 201 - Created endpoint | HIGH |
| `/api/v1/endpoints/{endpointId}` | PUT | Yes | 200 - Updated endpoint | HIGH |
| `/api/v1/endpoints/{endpointId}` | DELETE | Yes | 204 - Deleted | MEDIUM |
| `/api/v1/endpoints/{endpointId}/test` | POST | Yes | 200 - Connection test result | HIGH |
| `/api/v1/endpoints/{endpointId}/toggle` | PATCH | Yes | 200 - Toggled active status | MEDIUM |

### Endpoint Tokens (Authorization)
| Endpoint | Method | Auth | Expected Response | Priority |
|----------|--------|------|-------------------|----------|
| `/api/v1/endpoints/{endpointId}/tokens` | GET | Yes | 200 - Endpoint tokens | HIGH |
| `/api/v1/endpoints/{endpointId}/tokens` | POST | Yes | 201 - Issued token | HIGH |
| `/api/v1/tokens/{tokenId}/revoke` | POST | Yes | 200 - Revoked token | HIGH |
| `/api/v1/tokens/{tokenId}/stats` | GET | Yes | 200 - Token usage stats | MEDIUM |

### KvK Registry
| Endpoint | Method | Auth | Expected Response | Priority |
|----------|--------|------|-------------------|----------|
| `/api/v1/legal-entities/{legalEntityId}/kvk-registry-data` | GET | Yes | 200 - KvK data | HIGH |
| `/api/v1/legal-entities/{legalEntityId}/upload-kvk-document` | POST | Yes | 201 - Document uploaded | HIGH |
| `/api/v1/legal-entities/{legalEntityId}/kvk-verification-status` | GET | Yes | 200 - Verification status | MEDIUM |
| `/api/v1/kvk-verifications/{verificationId}/review` | POST | Yes | 200 - Review submitted | MEDIUM |
| `/api/v1/flagged-entities` | GET | Yes | 200 - Flagged entities list | LOW |

### Three-Tier Authentication
| Endpoint | Method | Auth | Expected Response | Priority |
|----------|--------|------|-------------------|----------|
| `/api/v1/entities/{legalEntityId}/tier` | GET | Yes | 200 - Tier info | HIGH |
| `/api/v1/entities/{legalEntityId}/tier` | PUT | Yes | 200 - Updated tier | HIGH |

### User Management
| Endpoint | Method | Auth | Expected Response | Priority |
|----------|--------|------|-------------------|----------|
| `/api/v1/users` | GET | Yes | 200 - All users | MEDIUM |
| `/api/v1/users/{userId}` | GET | Yes | 200 - User details | MEDIUM |
| `/api/v1/users/invite` | POST | Yes | 201 - User invited | MEDIUM |
| `/api/v1/users/{userId}` | PUT | Yes | 200 - Updated user | MEDIUM |
| `/api/v1/users/{userId}` | DELETE | Yes | 204 - Deleted user | LOW |

### Audit Logs
| Endpoint | Method | Auth | Expected Response | Priority |
|----------|--------|------|-------------------|----------|
| `/api/v1/audit-logs` | GET | Yes | 200 - Paginated audit logs | MEDIUM |
| `/api/v1/audit-logs?entity_id={id}` | GET | Yes | 200 - Entity-specific logs | MEDIUM |

### M2M Clients (Machine-to-Machine)
| Endpoint | Method | Auth | Expected Response | Priority |
|----------|--------|------|-------------------|----------|
| `/api/v1/m2m-clients` | GET | Yes | 200 - M2M clients list | MEDIUM |
| `/api/v1/m2m-clients` | POST | Yes | 201 - Created client | MEDIUM |
| `/api/v1/m2m-clients/{clientId}` | DELETE | Yes | 204 - Deleted client | LOW |

### Task Management
| Endpoint | Method | Auth | Expected Response | Priority |
|----------|--------|------|-------------------|----------|
| `/api/v1/tasks` | GET | Yes | 200 - Tasks list | LOW |
| `/api/v1/tasks` | POST | Yes | 201 - Created task | LOW |
| `/api/v1/tasks/{taskId}` | PUT | Yes | 200 - Updated task | LOW |

### Newsletter & Subscriptions
| Endpoint | Method | Auth | Expected Response | Priority |
|----------|--------|------|-------------------|----------|
| `/api/v1/newsletters` | GET | Yes | 200 - Newsletters list | LOW |
| `/api/v1/newsletters` | POST | Yes | 201 - Created newsletter | LOW |
| `/api/v1/subscriptions` | GET | Yes | 200 - Subscriptions list | LOW |
| `/api/v1/subscriptions` | POST | Yes | 201 - Created subscription | LOW |
| `/api/v1/subscriptions/{subscriptionId}` | PUT | Yes | 200 - Updated subscription | LOW |

---

## Critical User Flows

### Flow 1: Authentication & Authorization
**Priority:** CRITICAL
**Description:** User logs in via Azure AD and accesses admin portal

**Steps:**
1. Navigate to admin portal URL
2. Redirect to Azure AD login
3. Enter credentials (test-e2@denoronha.consulting / Madu5952)
4. MFA bypass (user excluded from MFA requirement)
5. Redirect back to portal with JWT token
6. Verify CSRF token generation
7. Access protected resources

**Expected Outcome:**
- Successful login without MFA prompt
- Valid JWT token with SystemAdmin role
- CSRF token present in session storage
- User sees Dashboard

**Error Scenarios:**
- Invalid credentials → Redirect to login with error
- Expired token → Re-authentication required
- Missing CSRF token → State-changing requests blocked
- Insufficient role → 403 Forbidden on admin-only pages

---

### Flow 2: Member Management (CRUD)
**Priority:** CRITICAL
**Description:** Admin creates, views, updates, and deletes member organizations

#### 2A: View All Members
**Steps:**
1. Navigate to Members page
2. Verify grid loads with pagination
3. Check server-side pagination controls
4. Verify member count displayed
5. Test page navigation (next, previous, page size)

**Expected Outcome:**
- Members grid displays with data
- Pagination controls functional
- Total count matches actual records
- Grid performance acceptable (<2s load)

#### 2B: Search & Filter Members
**Steps:**
1. Use search bar to find member by name
2. Apply advanced filters (status, membership level)
3. Clear filters and verify reset
4. Test filter combinations

**Expected Outcome:**
- Search returns relevant results
- Filters narrow down results correctly
- Clear filters resets to all members
- No client-side sorting when server-paging active

#### 2C: View Member Details
**Steps:**
1. Click on member row to view details
2. Verify member information displayed
3. Check tabs load correctly (Company, Contacts, Identifiers, Endpoints, etc.)
4. Navigate between tabs
5. Verify back button returns to members list

**Expected Outcome:**
- Member detail page loads successfully
- All tabs accessible
- Data displays correctly in each tab
- Back navigation works

#### 2D: Create New Member
**Steps:**
1. Click "Add Member" button
2. Fill in required fields (legal name, domain)
3. Add optional fields (LEI, KVK, status)
4. Submit form
5. Verify success notification
6. Check member appears in grid

**Expected Outcome:**
- Form validates required fields
- Submission succeeds with 201 response
- Success notification shown
- New member visible in list

**Error Scenarios:**
- Missing required fields → Validation error
- Duplicate domain → 409 Conflict
- Invalid LEI format → Validation error
- Server error → Error notification with details

#### 2E: Update Member
**Steps:**
1. Open member details
2. Edit company information
3. Save changes
4. Verify success notification
5. Confirm changes persisted

**Expected Outcome:**
- Edit mode enabled
- Changes saved successfully
- Updated data displayed immediately

#### 2F: Delete Member (Soft Delete)
**Steps:**
1. Select member to delete
2. Confirm deletion
3. Verify member marked as deleted (is_deleted = true)
4. Confirm member no longer in active list

**Expected Outcome:**
- Soft delete (not permanent removal)
- Member removed from active view
- Audit log entry created

---

### Flow 3: Legal Entity & Company Management
**Priority:** HIGH
**Description:** Manage detailed legal entity information

**Steps:**
1. Navigate to member details → Company tab
2. View legal entity details (name, address, registration)
3. Click "Edit Company"
4. Update fields:
   - Primary legal name
   - Address (line1, line2, postal code, city, province, country)
   - Entity legal form
   - Registration date
   - Parent entity relationships
   - Domain
   - Status (PENDING, ACTIVE, SUSPENDED, TERMINATED)
   - Membership level (BASIC, PREMIUM, ENTERPRISE)
5. Save changes
6. Verify inline validation and contextual help
7. Check accessibility (ARIA labels, keyboard navigation)

**Expected Outcome:**
- All fields editable and validated
- Inline validation shows errors immediately
- Contextual help available (tooltips)
- WCAG 2.1 AA compliant (color contrast, keyboard nav)
- Changes saved successfully

**Error Scenarios:**
- Invalid postal code → Validation error with hint
- Required field empty → Inline error message
- Network error → Error notification with retry option

---

### Flow 4: Identifier Management (LEI, KVK, EUID)
**Priority:** CRITICAL
**Description:** Manage business identifiers for legal entities

#### 4A: View Identifiers
**Steps:**
1. Navigate to member details → Identifiers tab
2. View existing identifiers
3. Check identifier types, values, validation status
4. Verify empty state if no identifiers

**Expected Outcome:**
- Identifiers displayed in grid
- Status badges color-coded (VALIDATED, PENDING, FAILED, EXPIRED)
- Empty state with "Add Identifier" CTA if none exist

#### 4B: Generate EUID
**Steps:**
1. Click "Generate EUID" button
2. Confirm generation
3. Wait for API response
4. Verify EUID created and displayed

**Expected Outcome:**
- EUID generated successfully
- Unique identifier format (EUID-xxx)
- Identifier appears in list
- Success notification shown

#### 4C: Fetch LEI Data
**Steps:**
1. Click "Fetch LEI" button
2. Enter LEI code (if not already present)
3. Submit request
4. Verify LEI data retrieved and saved

**Expected Outcome:**
- LEI fetched from external registry
- Data populated automatically
- Validation status updated

#### 4D: Add Manual Identifier
**Steps:**
1. Click "Add Identifier"
2. Select type (LEI, KVK, EORI, VAT, DUNS, etc.)
3. Enter identifier value
4. Fill optional fields (country, registry, valid dates)
5. Save identifier

**Expected Outcome:**
- Form validation enforces format rules
- Identifier saved with PENDING status
- Success notification shown

#### 4E: Update Identifier
**Steps:**
1. Click "Edit" on existing identifier
2. Update validation status, dates, or notes
3. Save changes

**Expected Outcome:**
- Changes saved successfully
- Updated identifier displayed

#### 4F: Delete Identifier
**Steps:**
1. Click "Delete" on identifier
2. Confirm deletion
3. Verify removed from list

**Expected Outcome:**
- Soft delete (is_deleted = true)
- Identifier removed from view
- Success notification shown

#### 4G: Validate Identifier
**Steps:**
1. Click "Validate" on identifier
2. Wait for external validation (if applicable)
3. Check validation result

**Expected Outcome:**
- Validation status updated
- Details stored in validation_notes
- Badge color reflects status

---

### Flow 5: Contact Management
**Priority:** HIGH
**Description:** Manage contacts for legal entities

#### 5A: View Contacts
**Steps:**
1. Navigate to member details → Contacts tab
2. View contacts grid
3. Check contact types (PRIMARY, TECHNICAL, BILLING, SUPPORT, COMPLIANCE, ADMIN)
4. Verify grid row height (36px) and single-line text rendering

**Expected Outcome:**
- Contacts displayed in grid
- Contact type badges visible
- Primary contact highlighted
- Grid rows uniform height

#### 5B: Add Contact
**Steps:**
1. Click "Add Contact"
2. Fill required fields:
   - Contact type
   - Full name
   - Email
   - Phone (optional)
   - Job title (optional)
   - Department (optional)
3. Mark as primary if needed
4. Save contact

**Expected Outcome:**
- Form validation enforces email format
- Required fields marked with aria-required
- No placeholder text (accessibility)
- Autocomplete attributes set correctly
- Success notification shown

#### 5C: Update Contact
**Steps:**
1. Click "Edit" on contact
2. Modify fields
3. Save changes

**Expected Outcome:**
- Changes saved successfully
- Grid updates immediately
- Success notification shown

#### 5D: Delete Contact
**Steps:**
1. Click "Delete" on contact
2. Confirm deletion in dialog
3. Wait for async deletion
4. Verify removed from grid

**Expected Outcome:**
- Confirmation dialog appears
- Async deletion completes
- Contact removed from view
- Success notification shown

**Error Scenarios:**
- Cannot delete last primary contact → Validation error
- Network error → Error notification

---

### Flow 6: Endpoint Management (Data Connections)
**Priority:** HIGH
**Description:** Manage API endpoints and data connections

#### 6A: View Endpoints
**Steps:**
1. Navigate to member details → Endpoints tab
2. View endpoints list
3. Check endpoint details (name, URL, type, status)
4. Verify empty state if no endpoints

**Expected Outcome:**
- Endpoints displayed with status indicators
- Active/inactive toggle visible
- Empty state with "Add Endpoint" CTA

#### 6B: Add Endpoint
**Steps:**
1. Click "Add Endpoint"
2. Fill fields:
   - Endpoint name
   - Endpoint URL
   - Description
   - Data category (CONTAINER, CUSTOMS, WAREHOUSE, TRANSPORT, OTHER)
   - Endpoint type (REST_API, SOAP, WEBHOOK, SFTP, OTHER)
   - Authentication method
3. Save endpoint

**Expected Outcome:**
- Form validation enforces URL format
- Endpoint created with is_active = true
- Success notification shown

#### 6C: Test Endpoint Connection
**Steps:**
1. Click "Test Connection" on endpoint
2. Wait for connection test
3. View test results (status code, response time, error message)

**Expected Outcome:**
- Connection test executes
- Results displayed (success/failure)
- Test details stored in connection_test_details
- Last connection status updated

#### 6D: Toggle Endpoint Active Status
**Steps:**
1. Click toggle switch on endpoint
2. Confirm activation/deactivation
3. Verify status updated

**Expected Outcome:**
- Endpoint status toggled
- Deactivation reason captured if deactivating
- Success notification shown

#### 6E: Update Endpoint
**Steps:**
1. Click "Edit" on endpoint
2. Modify fields
3. Save changes

**Expected Outcome:**
- Changes saved successfully
- Updated endpoint displayed

#### 6F: Delete Endpoint
**Steps:**
1. Click "Delete" on endpoint
2. Confirm deletion
3. Verify removed

**Expected Outcome:**
- Soft delete (is_deleted = true)
- Endpoint removed from view
- Associated tokens revoked

---

### Flow 7: Endpoint Token Management
**Priority:** HIGH
**Description:** Issue and manage access tokens for endpoints

#### 7A: View Endpoint Tokens
**Steps:**
1. Navigate to endpoint details
2. Click "Tokens" tab or button
3. View issued tokens
4. Check token status (active, revoked, expired)

**Expected Outcome:**
- Tokens listed with metadata
- Active tokens highlighted
- Revoked/expired tokens greyed out

#### 7B: Issue New Token
**Steps:**
1. Click "Issue Token"
2. Set expiration (optional, default 90 days)
3. Generate token
4. Copy token value (only shown once)

**Expected Outcome:**
- Token generated with secure random value
- Token value displayed ONCE
- Expiration date set correctly
- Success notification with warning to copy token

#### 7C: Revoke Token
**Steps:**
1. Click "Revoke" on active token
2. Enter revocation reason
3. Confirm revocation

**Expected Outcome:**
- Token revoked immediately
- Revocation reason stored
- Token no longer usable
- Success notification shown

#### 7D: View Token Usage Stats
**Steps:**
1. Click "View Stats" on token
2. Check usage count and last used timestamp

**Expected Outcome:**
- Usage statistics displayed
- Last used date formatted correctly

---

### Flow 8: KvK Registry Integration
**Priority:** MEDIUM
**Description:** KvK (Chamber of Commerce) data verification

#### 8A: View KvK Registry Data
**Steps:**
1. Navigate to member details → KvK Registry tab (if data exists)
2. View KvK data fetched from registry
3. Check company details, board members, activities

**Expected Outcome:**
- KvK data displayed in structured format
- Tab only visible if KvK data exists (404 → tab hidden)
- Data refreshable

#### 8B: Upload KvK Document
**Steps:**
1. Navigate to KvK Document Upload
2. Select PDF document
3. Upload file
4. Verify upload success

**Expected Outcome:**
- File upload succeeds
- Document stored in Azure Blob Storage
- Document URL saved to database
- Success notification shown

#### 8C: Review KvK Verification
**Steps:**
1. Navigate to Review Tasks
2. View pending KvK verifications
3. Click "Review" on verification
4. Approve or reject with notes
5. Submit review

**Expected Outcome:**
- Review submitted successfully
- Verification status updated
- Notification sent to member (future)

---

### Flow 9: Three-Tier Authentication
**Priority:** HIGH
**Description:** Manage authentication tier levels

#### 9A: View Tier Information
**Steps:**
1. Navigate to member details → Tier Management tab
2. View current tier (1, 2, or 3)
3. Check authentication method (Basic, DNS, eHerkenning)
4. View verification dates and re-verification due date

**Expected Outcome:**
- Current tier displayed with badge
- Authentication method shown
- Re-verification schedule visible if applicable

#### 9B: Update Tier
**Steps:**
1. Click "Update Tier"
2. Select new tier (1, 2, or 3)
3. Choose authentication method:
   - Tier 1: Basic (email/password)
   - Tier 2: DNS verification (domain ownership)
   - Tier 3: eHerkenning (government-issued)
4. Provide required evidence (DNS record, eHerkenning ID)
5. Save tier update

**Expected Outcome:**
- Tier updated successfully
- Verification date recorded
- Re-verification schedule set (if applicable)
- Audit log entry created

**Error Scenarios:**
- Tier 2 without DNS verification → Validation error
- Tier 3 without eHerkenning ID → Validation error

---

### Flow 10: User Management (Admin)
**Priority:** MEDIUM
**Description:** Manage admin portal users

#### 10A: View Users
**Steps:**
1. Navigate to Settings → User Management
2. View all users
3. Check user roles (SystemAdmin, MemberAdmin, Viewer)

**Expected Outcome:**
- Users listed with roles
- Current user highlighted

#### 10B: Invite New User
**Steps:**
1. Click "Invite User"
2. Enter email address
3. Select role
4. Send invitation

**Expected Outcome:**
- Invitation email sent
- User added with pending status
- Success notification shown

#### 10C: Update User Role
**Steps:**
1. Click "Edit" on user
2. Change role
3. Save changes

**Expected Outcome:**
- Role updated successfully
- User permissions change immediately

#### 10D: Delete User
**Steps:**
1. Click "Delete" on user
2. Confirm deletion
3. Verify user removed

**Expected Outcome:**
- User soft-deleted
- User removed from active list

---

### Flow 11: Audit Logs
**Priority:** MEDIUM
**Description:** View system audit trail

**Steps:**
1. Navigate to Audit Logs
2. View recent activity
3. Filter by entity, user, or date range
4. Search for specific actions
5. View log details (who, what, when, where)

**Expected Outcome:**
- Audit logs displayed chronologically
- Filters work correctly
- Log details comprehensive
- Pagination functional

**Key Audit Events:**
- Member created/updated/deleted
- Identifier added/validated/deleted
- Contact created/updated/deleted
- Endpoint created/toggled/deleted
- Token issued/revoked
- Tier updated
- User login/logout
- IDOR attempts (security_issue flag)

---

### Flow 12: Dashboard & Analytics
**Priority:** MEDIUM
**Description:** View member statistics and visualizations

**Steps:**
1. Navigate to Dashboard
2. View summary statistics:
   - Total members
   - Active members
   - Pending members
   - Suspended members
   - Premium members
3. View charts:
   - Status distribution (Pie Chart)
   - Membership level distribution (Bar Chart)
   - Growth trends (Line Chart - if time-series data available)
4. Check performance (<2s load)

**Expected Outcome:**
- Statistics calculated correctly
- Charts render properly using Recharts
- Data updates when members change
- Responsive layout on different screen sizes

---

### Flow 13: Settings & Configuration
**Priority:** LOW
**Description:** View and update portal settings

**Steps:**
1. Navigate to Settings
2. View environment information (Production/Development)
3. View API host dynamically
4. Check Health Monitor status
5. Verify version information

**Expected Outcome:**
- Environment displayed correctly (Production)
- API host shown dynamically
- Health status indicator visible
- Version number matches deployment

---

### Flow 14: Accessibility & Keyboard Navigation
**Priority:** HIGH
**Description:** Verify WCAG 2.1 AA compliance

**Steps:**
1. Navigate entire portal using keyboard only (Tab, Enter, Escape)
2. Verify skip-to-content link
3. Check screen reader announcements (VoiceOver/NVDA)
4. Test color contrast (all text meets 4.5:1 ratio)
5. Verify ARIA labels on all interactive elements
6. Test form validation with screen reader

**Expected Outcome:**
- All interactive elements keyboard-accessible
- Skip-to-content link functional
- Screen reader reads all content correctly
- No color-only information conveyed
- All forms announce validation errors
- Focus indicators visible

**Accessibility Checklist:**
- Skip-to-content link present
- ARIA labels on icon buttons
- ARIA live regions for notifications
- Keyboard navigation for all modals/dialogs
- Color contrast meets WCAG AA (4.5:1 for text, 3:1 for UI components)
- No placeholders in required fields (accessibility anti-pattern)
- Autocomplete attributes on form fields
- aria-required on required fields

---

## Test Scenarios by Priority

### CRITICAL Priority Tests

**These tests MUST pass before any release:**

1. **API Health Check**
   - `/api/health` returns 200
   - Response time < 500ms

2. **Authentication Flow**
   - Azure AD login successful
   - JWT token obtained
   - Token includes correct role claims
   - CSRF token generated

3. **Members CRUD**
   - GET /api/v1/all-members returns data
   - Pagination works correctly
   - Create member succeeds (201)
   - Update member succeeds (200)
   - View member details loads all tabs

4. **Legal Entity Operations**
   - GET legal entity returns complete data
   - Update legal entity persists changes

5. **Identifiers CRUD**
   - GET identifiers returns paginated data
   - Add identifier succeeds (201)
   - Generate EUID succeeds
   - Delete identifier succeeds

6. **Contacts CRUD**
   - GET contacts returns paginated data
   - Add contact succeeds (201)
   - Update contact succeeds (200)
   - Delete contact with confirmation

7. **Endpoints CRUD**
   - GET endpoints returns data
   - Add endpoint succeeds (201)
   - Test connection executes

8. **Error Handling**
   - 404 errors handled gracefully (not cascading failures)
   - Network errors show user-friendly messages
   - Validation errors displayed inline

### HIGH Priority Tests

9. **Token Management**
   - Issue endpoint token succeeds
   - Token value shown only once
   - Revoke token succeeds
   - View token usage stats

10. **KvK Registry**
    - Fetch KvK data succeeds (if KvK number present)
    - Upload KvK document succeeds
    - Tab conditionally rendered (404 → hidden)

11. **Tier Management**
    - View tier information correct
    - Update tier with validation
    - Re-verification schedule calculated

12. **Search & Filtering**
    - Member search returns relevant results
    - Advanced filters work correctly
    - Clear filters resets state

13. **Accessibility**
    - Keyboard navigation functional
    - ARIA labels present
    - Color contrast meets WCAG AA
    - Screen reader compatible

14. **Data Validation**
    - Required fields enforced
    - Email format validated
    - URL format validated
    - Date fields validated

### MEDIUM Priority Tests

15. **User Management**
    - View users list
    - Invite user sends email
    - Update user role
    - Delete user

16. **Audit Logs**
    - View audit logs
    - Filter by entity/user
    - Search logs
    - Pagination works

17. **Dashboard Analytics**
    - Statistics calculated correctly
    - Charts render properly
    - Performance acceptable

18. **M2M Clients**
    - View M2M clients
    - Create M2M client
    - Delete M2M client

19. **Diagnostic Checks**
    - Diagnostic endpoint returns data
    - Version endpoint correct

20. **Connection Testing**
    - Endpoint connection test executes
    - Results stored correctly
    - Error messages descriptive

### LOW Priority Tests

21. **Task Management**
    - View tasks
    - Create task
    - Update task status

22. **Newsletter & Subscriptions**
    - View newsletters
    - Create newsletter
    - View subscriptions
    - Create subscription
    - Update subscription

23. **Settings Page**
    - Environment displayed correctly
    - API host shown
    - Health monitor visible

24. **About Page**
    - Version information correct
    - Links functional

---

## Test Data Requirements

### Existing Test Data
- **Test User:** test-e2@denoronha.consulting (SystemAdmin, MFA excluded)
- **Azure AD Tenant:** ctn-demo
- **Database:** psql-ctn-demo-asr-dev.postgres.database.azure.com

### Required Test Data Sets

#### 1. Members/Legal Entities
- **Minimum 20 members** for pagination testing
- **Various statuses:** ACTIVE (10), PENDING (5), SUSPENDED (3), TERMINATED (2)
- **Various membership levels:** PREMIUM (5), STANDARD (10), BASIC (5)
- **At least 3 members** with complete data (all identifiers, contacts, endpoints)
- **At least 1 member** with no identifiers (test empty state)
- **At least 1 member** with KvK registry data

#### 2. Identifiers
- **LEI:** 1 valid LEI code for fetch testing
- **KVK:** 1 valid KvK number for registry integration
- **EUID:** Generated identifiers
- **Various validation statuses:** VALIDATED, PENDING, FAILED, EXPIRED

#### 3. Contacts
- **At least 2 contacts per test member**
- **All contact types represented:** PRIMARY, TECHNICAL, BILLING, SUPPORT, COMPLIANCE, ADMIN
- **Valid email addresses** (test format validation)
- **Valid phone numbers**

#### 4. Endpoints
- **At least 2 endpoints per test member**
- **Various endpoint types:** REST_API, SOAP, WEBHOOK, SFTP
- **Various data categories:** CONTAINER, CUSTOMS, WAREHOUSE, TRANSPORT
- **Mix of active/inactive endpoints**
- **1 endpoint with successful connection test**
- **1 endpoint with failed connection test**

#### 5. Endpoint Tokens
- **At least 3 tokens per test endpoint**
- **Mix of active, revoked, and expired tokens**
- **Various expiration dates**

#### 6. KvK Documents
- **1 sample KvK PDF** for upload testing
- **1 legal entity** with KvK registry data

#### 7. Audit Logs
- **Sufficient historical data** for filtering tests
- **Various action types** represented
- **Multiple users** in logs

#### 8. Users
- **3-5 admin users** with different roles
- **At least 1 pending invitation**

### Test Data Cleanup Strategy
- Use transactions for reversible tests
- Soft-delete instead of hard-delete
- Automated cleanup script after test runs
- Separate test database/schema (future consideration)

---

## Test Execution Strategy

### Phase 1: API Testing (TE Agent - Priority)
**Objective:** Validate all backend endpoints before UI testing

**Tool:** curl/Postman/automated scripts
**Duration:** 2-3 hours
**Owner:** TE (Test Engineer) Agent

**Execution:**
1. Obtain JWT token via Azure AD (use test-e2@denoronha.consulting)
2. Test all CRITICAL endpoints first (health, auth, members, legal entities, identifiers, contacts, endpoints)
3. Test HIGH priority endpoints (tokens, KvK, tier)
4. Test MEDIUM priority endpoints (users, audit, M2M)
5. Test LOW priority endpoints (tasks, newsletters)
6. Document all failures with request/response details

**Success Criteria:**
- All CRITICAL endpoints return expected status codes
- Response times < 2s for GET requests
- Response times < 5s for POST/PUT requests
- Error responses include helpful messages
- No 500 Internal Server Errors

**Output:**
- API test battery in `api/tests/`
- Test results summary
- List of failing endpoints with details

---

### Phase 2: UI Testing (TE Agent - E2E with Playwright)
**Objective:** Validate all user flows in browser

**Tool:** Playwright
**Duration:** 4-6 hours
**Owner:** TE (Test Engineer) Agent

**Execution:**
1. Login flow test
2. Dashboard load test
3. Members CRUD tests (critical flows)
4. Legal entity management tests
5. Identifiers management tests
6. Contacts management tests
7. Endpoints management tests
8. Token management tests
9. KvK registry tests
10. Tier management tests
11. User management tests
12. Audit logs tests
13. Accessibility tests
14. Responsive design tests

**Success Criteria:**
- All critical flows complete without errors
- No console errors during navigation
- All modals/dialogs open and close correctly
- All forms validate properly
- All grids load and paginate correctly
- Accessibility audit passes (aXe/Lighthouse)

**Output:**
- E2E test suite in `admin-portal/tests/e2e/`
- Playwright test reports
- Screenshots of failures
- Video recordings of critical flows

---

### Phase 3: Cross-Browser Testing
**Objective:** Ensure compatibility across browsers

**Browsers:**
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

**Focus Areas:**
- Authentication flow
- Kendo UI component rendering
- Chart rendering (Recharts)
- Modal/dialog behavior
- File uploads

---

### Phase 4: Performance Testing
**Objective:** Validate acceptable load times and responsiveness

**Metrics:**
- Initial page load < 3s
- Dashboard render < 2s
- Members grid load < 2s
- API response times < 2s (GET), < 5s (POST/PUT)
- Chart rendering < 1s

**Tools:**
- Chrome DevTools Lighthouse
- Network tab profiling
- Azure Application Insights

---

### Phase 5: Security Testing (SA Agent)
**Objective:** Validate security controls

**Focus Areas:**
- Authentication bypass attempts
- Authorization checks (role-based access)
- CSRF token enforcement
- SQL injection prevention
- XSS prevention
- IDOR vulnerability checks
- Secrets in client-side code (none should exist)

**Owner:** SA (Security Analyst) Agent

---

### Phase 6: Accessibility Audit (DA Agent)
**Objective:** WCAG 2.1 AA compliance

**Focus Areas:**
- Keyboard navigation
- Screen reader compatibility
- Color contrast
- ARIA labels
- Form validation announcements
- Skip-to-content link

**Tools:**
- aXe DevTools
- WAVE
- VoiceOver/NVDA
- Lighthouse Accessibility Audit

**Owner:** DA (Design Analyst) Agent

---

## Success Criteria

### Critical Success Criteria (Must Pass)
- All CRITICAL priority tests pass (100%)
- All HIGH priority tests pass (≥95%)
- No 500 Internal Server Errors in production
- Authentication flow works correctly
- Members CRUD operations functional
- Identifiers CRUD operations functional
- Contacts CRUD operations functional
- Endpoints CRUD operations functional

### Quality Success Criteria (Target)
- All MEDIUM priority tests pass (≥90%)
- All LOW priority tests pass (≥80%)
- Page load times < 3s
- API response times < 2s (GET)
- WCAG 2.1 AA compliance (100% critical paths)
- Zero console errors on critical flows
- Lighthouse score ≥90 (Performance, Accessibility, Best Practices)

### Security Success Criteria (Must Pass)
- CSRF protection enforced
- No secrets in client-side code
- Authorization checks prevent unauthorized access
- IDOR vulnerabilities prevented
- Audit logs capture security events

---

## Test Reporting

### Daily Status Report
- Tests executed
- Tests passed/failed
- Blockers encountered
- Next steps

### Final Test Report
- Executive summary
- Test coverage (% endpoints tested)
- Pass/fail rates by priority
- Known issues and workarounds
- Recommendations for production readiness
- Risk assessment

---

## Appendix A: Test User Credentials

**Test User (SystemAdmin, MFA Excluded):**
- Email: test-e2@denoronha.consulting
- Password: Madu5952
- Object ID: 7e093589-f654-4e53-9522-898995d1201b
- Role: SystemAdmin

**Environment URLs:**
- Admin Portal: https://calm-tree-03352ba03.1.azurestaticapps.net
- API: https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1
- Database: psql-ctn-demo-asr-dev.postgres.database.azure.com

---

## Appendix B: Recent Features to Test

**Recent features (from git log):**

1. **EUID Generation** - Verify EUID identifier generation works
2. **LEI Fetch** - Test external LEI registry integration
3. **Inline Validation** - Test CompanyForm inline validation and contextual help
4. **Accessibility Improvements** - Test ARIA labels, keyboard navigation, color tokens
5. **CSRF Protection (SEC-004)** - Verify X-CSRF-Token required for state-changing requests
6. **Empty States (DA-009)** - Test standardized empty states across all tabs
7. **Success Messages (DA-010)** - Verify success notifications for all CRUD operations
8. **Members Grid Pagination** - Test server-side pagination fixes
9. **Contact Grid Row Height** - Verify single-line text rendering (36px row height)
10. **KvK Registry Tab Conditional Rendering** - Verify tab only shows when data exists

---

## Appendix C: Known Issues to Verify Fixed

**Issues from LESSONS_LEARNED.md:**

1. **Cascading try-catch failures** - Verify getEndpoints() 404 doesn't prevent other data loading (Lesson #34)
2. **Deployment sync** - Verify API deployment status before testing (Lesson #29, #31)
3. **Package.json pagination** - Verify paginated API responses extract `response.data.data` correctly (Lesson #9)
4. **Route params lowercased** - Verify API route params use lowercase (Lesson #6)
5. **IDOR vulnerabilities** - Test authorization checks prevent unauthorized access (Lesson #18)

---

**End of Test Plan**
