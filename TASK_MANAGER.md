# Task Manager

**Purpose:** Track important tasks, refactoring needs, and technical debt that require attention.

**Last Updated:** November 14, 2025 (Added Phase 4.2 UI Patterns completion)

---

## 🔴 High Priority

### Security - Secret Rotation (URGENT)

**Status:** Not Started
**Priority:** Critical
**Source:** Desktop ROADMAP.md (November 10, 2025)

**Context:** DG agent found exposed secrets in local.settings.json files during audit

**Tasks:**
- [ ] **SEC-ROTATE-001: Rotate PostgreSQL password** - CRITICAL
  - **Exposed in:** api/local.settings.json (gitignored but exists locally)
  - **Action:** Change in Azure Portal, update Key Vault, update local settings
  - **Timeline:** 30 minutes

- [ ] **SEC-ROTATE-002: Rotate Storage Account keys** - CRITICAL
  - **Exposed in:** api/local.settings.json
  - **Action:** Regenerate keys in Azure Portal, update Function App settings
  - **Timeline:** 20 minutes

- [ ] **SEC-ROTATE-003: Rotate KVK API Key** - HIGH
  - **Exposed in:** api/local.settings.json
  - **Action:** Request new key from KVK, update Key Vault
  - **Timeline:** 1 hour (includes KVK request)

- [ ] **SEC-ROTATE-004: Rotate Anthropic API Key** - HIGH
  - **Exposed in:** booking-portal/api/local.settings.json
  - **Action:** Generate new key in Anthropic Console, update Key Vault
  - **Timeline:** 15 minutes

- [ ] **SEC-ROTATE-005: Rotate Cosmos DB keys (booking portal)** - HIGH
  - **Exposed in:** booking-portal/api/local.settings.json
  - **Action:** Regenerate in Azure Portal, update Function App settings
  - **Timeline:** 20 minutes

---

### Azure Key Vault Migration

**Status:** Not Started
**Priority:** High
**Source:** Desktop ROADMAP.md (November 10, 2025)
**Estimated Effort:** 2-3 hours

**Problem:**
Secrets currently in environment variables, need centralized secure storage.

**Tasks:**
- [ ] Move all secrets to Azure Key Vault
  - PostgreSQL connection strings
  - JWT secrets
  - Azure Storage account keys
  - Event Grid access keys
- [ ] Update Function App configuration to reference Key Vault secrets
- [ ] Create/update .credentials file (not in Git) for local development
- [ ] Store all credentials, URLs, Azure Function info for all 4 portals

**Impact:**
- Security best practice
- Enables centralized secret rotation
- Reduces risk of credential exposure

**Reference:** See docs/SECURITY_AUDIT_REPORT.md for migration instructions

---

### Database Schema Refactoring

**Issue Identified:** November 13, 2025 during Keycloak M2M setup
**Status:** Not Started
**Priority:** High
**Estimated Effort:** 2-3 days

**Problem:**
The current schema has overcomplicated relationships with redundancy between:
- `party_reference` (base entity)
- `legal_entity` (organization details)
- `members` (duplicate/overlapping data?)

**Symptoms:**
- Duplicate `legal_entity` rows for same `party_id` found during M2M credential mapping
- View `v_m2m_credentials_active` returns duplicate rows due to multiple legal_entity records
- Unclear separation of concerns between tables
- Data redundancy causing maintenance issues

**Tasks:**

1. **Invoke DE (Database Expert) Agent for Analysis**
   - [ ] Analyze current schema relationships
   - [ ] Identify duplicate data patterns
   - [ ] Document redundancies and inconsistencies
   - [ ] Recommend normalized schema structure

2. **Remove Duplicate Legal Entities**
   - [ ] Query to find all duplicate legal_entity records per party_id
   - [ ] Create cleanup script to remove duplicates (keeping most recent)
   - [ ] Add UNIQUE constraint: `(party_id) WHERE is_deleted = false`
   - [ ] Update views to handle edge cases

3. **Schema Simplification Proposal**
   - [ ] Evaluate if `members` table is still needed
   - [ ] Determine proper relationship: party_reference → legal_entity
   - [ ] Identify which columns are truly needed vs redundant
   - [ ] Design migration path with zero downtime

4. **Implementation Plan**
   - [ ] Create migration scripts (with rollback)
   - [ ] Test in development environment
   - [ ] Update all API queries and views
   - [ ] Update Keycloak middleware (resolvePartyIdFromKeycloak)
   - [ ] Deploy to production

**Impact:**
- **Medium Risk:** Changes affect core data model
- **High Reward:** Cleaner schema, fewer bugs, easier maintenance
- **Breaking Changes:** Potentially affects all party/entity queries

**Related Files:**
- `database/current_schema.sql`
- `database/migrations/026-rename-zitadel-to-generic-m2m-fixed-v2.sql` (view definition)
- `api/src/middleware/keycloak-auth.ts` (party resolution)

**Notes:**
- Current workaround: View uses `LEFT JOIN legal_entity ... AND le.is_deleted = false`
- This masks the underlying duplicate issue but doesn't fix it
- Need proper UNIQUE constraints to prevent future duplicates

---

## 🟡 Medium Priority

### Admin Portal - Testing & Quality Assurance

**Status:** Not Started
**Priority:** Medium
**Source:** Desktop ROADMAP.md (November 10, 2025)

**Tasks:**

#### Improve Authentication Test Coverage
- [ ] Fix test expecting login flow (design issue)
- [ ] Investigate API request timeouts
- [ ] Fix admin feature visibility checks
- **Impact:** Tests don't accurately reflect production behavior
- **Timeline:** 2 hours
- **Priority:** P1 - HIGH (Next Sprint)

#### Investigate KvK Identifier Bug
- [ ] Debug why tests cannot find identifier UI elements
- [ ] Verify endpoint URLs are correct
- **Impact:** Known production bug affecting user workflows
- **Timeline:** 4 hours
- **Priority:** P2 - MEDIUM (Backlog)

---

### BDI Production Setup

**Status:** Not Started
**Priority:** Medium
**Source:** Desktop ROADMAP.md (November 10, 2025)
**Estimated Effort:** 5.5 hours

**Tasks:**
- [ ] **Configure BDI RSA keys in Key Vault**
  - **Keys:** BDI_PRIVATE_KEY, BDI_PUBLIC_KEY
  - **Timeline:** 30 minutes

- [ ] **Set BDI_KEY_ID in Function App Settings**
  - **Timeline:** 15 minutes

- [ ] **Test BVAD generation with international companies**
  - **Timeline:** 1 hour

- [ ] **Test BVOD validation with sample orchestrations**
  - **Timeline:** 1 hour

- [ ] **Register external BDI systems**
  - **Action:** Register DHL, Maersk, etc. in `bdi_external_systems` table
  - **Timeline:** 2 hours

- [ ] **BDI token generation and validation E2E testing**
  - **Note:** Member portal is now stable and production-ready, can focus on BDI testing
  - **Timeline:** 4 hours

---

### API Development

**Status:** Not Started
**Priority:** Medium
**Source:** Desktop ROADMAP.md (November 10, 2025)

**Tasks:**
- [ ] **Define API versioning strategy**
  - **Timeline:** 2 hours

- [ ] **SEC-API-001: API keys visible in network requests**
  - Move to secure backend proxy
  - **Location:** Currently none, but needed for future integrations
  - **Timeline:** 2 hours
  - **Priority:** P0 - Address before production release

---

### Monitoring & Observability

**Status:** Not Started
**Priority:** Medium
**Source:** Desktop ROADMAP.md (November 10, 2025)
**Estimated Effort:** 12 hours

**Tasks:**
- [ ] **Configure Application Insights telemetry**
  - **Action:** Set up detailed metrics
  - **Timeline:** 2 hours

- [ ] **Set up alerting rules**
  - **Action:** Configure alerts for failed requests, slow queries, errors
  - **Timeline:** 2 hours

- [ ] **Create operational dashboard**
  - **Action:** Build dashboard in Azure Monitor
  - **Timeline:** 3 hours

- [ ] **Configure Alert Action Groups**
  - **Action:** Add email/SMS notifications for alerts
  - **Timeline:** 1 hour

- [ ] **Instrument Remaining API Functions**
  - **Action:** Add telemetry to 30+ additional functions
  - **Timeline:** 4 hours

---

### Add Database Constraints for Data Integrity

**Status:** Not Started
**Priority:** Medium

**Tasks:**
- [ ] Add UNIQUE constraint on `legal_entity(party_id)` WHERE is_deleted = false
- [ ] Add CHECK constraint to prevent NULL in critical fields
- [ ] Review all foreign key constraints for CASCADE vs RESTRICT
- [ ] Add partial indexes for soft-deleted records

---

## 🟢 Low Priority / Future Enhancements

### Architecture & Infrastructure Improvements

**Status:** Not Started
**Priority:** Low
**Source:** Desktop ROADMAP.md (November 10, 2025)

**Tasks:**

#### Create Shared API Client Package
- [ ] **Issue:** All 3 React portals implement their own axios wrapper and auth logic
- [ ] **Solution:** Create @ctn/api-client NPM package with shared services
- [ ] **Benefits:** Single source of truth, consistent error handling, easier maintenance
- [ ] **Reference:** Code Reviewer finding #5

#### Set Up Proper Production Environment
- [ ] **Issue:** Using "dev" naming convention
- [ ] **Current:** `func-ctn-demo-asr-dev.azurewebsites.net`
- [ ] **Recommended:** `fa-ctn-asr-{env}.azurewebsites.net` (dev/staging/prod)
- [ ] **WARNING:** Requires new Function App deployment + DNS updates (breaking change)

#### Implement Keycloak as Self-Hosted IdP
- [ ] **Action:** Deploy Keycloak in CTN Azure environment for member endpoint token generation
- [ ] **Configure Keycloak realm for BDI** (if using external Keycloak)
  - Documentation needed

#### Add Metadata Headers to All Documentation Files
- [ ] **Issue:** Files have stable names but no "Last Updated" metadata at document top
- [ ] **Solution:** Add structured metadata headers (Last Updated, Status, Version) to all markdown files
- [ ] **Scope:** Apply to all 66+ documentation files
- [ ] **Timeline:** 4-6 hours (52+ files)
- [ ] **Priority:** LOW - Time-consuming, low-impact task

---

### Keycloak M2M Authentication - Production Readiness

**Status:** ✅ Core Implementation Complete (November 13, 2025)

**Completed:**
- ✅ Database migration to generic M2M naming (migration 026)
- ✅ Keycloak middleware created (`keycloak-auth.ts`)
- ✅ Cloud IAM instance configured (France, EU)
- ✅ Test service account mapped to database
- ✅ Azure Functions environment variables configured
- ✅ API functions updated to use Keycloak middleware
- ✅ Deployed and tested end-to-end (all M2M endpoints working)
- ✅ Documentation created (`docs/KEYCLOAK_M2M_AUTHENTICATION.md`)
- ✅ Removed Zitadel remnants

**Remaining Production Tasks:**
- [ ] Create additional service accounts for production partners
- [ ] Implement per-client rate limiting (Azure APIM or custom middleware)
- [ ] Set up monitoring dashboard for M2M usage metrics
- [ ] Configure alerting for failed authentication attempts
- [ ] Implement secret rotation policy (90-day cycle)
- [ ] Create partner onboarding documentation/portal
- [ ] Load testing with concurrent M2M requests (TE agent)

---

## 📋 Backlog

### Documentation
- [x] Update API documentation with Keycloak authentication examples
- [x] Create partner onboarding guide for M2M access (`docs/KEYCLOAK_M2M_AUTHENTICATION.md`)
- [ ] Document schema relationships in Arc42 format
- [ ] Create visual architecture diagrams (Mermaid) for M2M flow

### Testing
- [ ] Add unit tests for Keycloak middleware (Vitest)
- [ ] Create integration tests for M2M authentication flows (Playwright)
- [ ] Load test M2M endpoints with concurrent requests
- [ ] Add negative test cases (expired tokens, invalid scopes, etc.)

### Security
- [ ] Implement rate limiting per M2M client (Azure APIM or custom middleware)
- [ ] Add monitoring/alerting for failed authentication attempts
- [ ] Regular secret rotation policy for service accounts (90-day cycle)
- [ ] Security audit of Keycloak configuration (SA agent)
- [ ] Penetration testing of M2M endpoints

---

## 📊 Code Quality Refactoring (5-Phase Plan)

**Created:** November 13, 2025
**Source:** CODE_QUALITY_REVIEW.md (Joost Visser's 10 Principles)
**Total Effort:** 270 hours (~17 weeks at 50% capacity)
**Current Health Score:** 4.2/10
**Target Health Score:** 8.5/10

**Progress Tracking:**
- Phase 1 (Foundation): 0/9 tasks (0 hours / 36 hours)
- Phase 2 (Critical Path): 0/4 tasks (0 hours / 80 hours)
- Phase 3 (Component Splitting): 1/4 tasks (8 hours / 76 hours) - **UI Patterns ✅**
- Phase 4 (Architecture): 0/4 tasks (0 hours / 76 hours)
- Phase 5 (Polish): 0/2 tasks (0 hours / 24 hours)
- **Overall:** 1/23 tasks (8 hours / 278 hours)

### Phase 1: Foundation - Quick Wins (36 hours)

**Goal:** Low-hanging fruit with immediate impact
**Risk:** Very Low
**Status:** Not Started

#### 1.1 Extract Magic Numbers
**Priority:** HIGH | **Effort:** 4 hours | **Status:** Not Started

- [ ] Create `api/src/config/constants.ts`
- [ ] Create `api/src/config/rateLimits.ts`
- [ ] Replace magic numbers in `api/src/middleware/auth.ts:28` (600000 → TIMEOUTS.JWKS_CACHE_MS)
- [ ] Replace magic strings in `api/src/functions/generateBvad.ts:226` ('v3.2.0' → DEFAULTS.TERMS_VERSION)
- [ ] Replace magic numbers in `admin-portal/src/components/AllEndpointsView.tsx:38` (10 → PAGINATION.DEFAULT_PAGE_SIZE)
- [ ] Verify no remaining magic numbers with grep
- [ ] Commit changes

**Acceptance Criteria:**
- [ ] All magic numbers moved to constants
- [ ] No hardcoded timeouts in middleware
- [ ] No magic strings for versions

---

#### 1.2 Remove Commented Code
**Priority:** HIGH | **Effort:** 2 hours | **Status:** Not Started

- [ ] Find all commented imports: `grep -r "// import" admin-portal/src api/src`
- [ ] Review each occurrence (verify not needed)
- [ ] Delete commented code in `admin-portal/src/components/AllEndpointsView.tsx:10`
- [ ] Delete any other commented imports found
- [ ] Add ESLint rule to prevent future commented code
- [ ] Commit changes

**Acceptance Criteria:**
- [ ] No commented imports remain
- [ ] ESLint rule configured
- [ ] Git history preserved

---

#### 1.3 Enforce @ctn/api-client Usage
**Priority:** HIGH | **Effort:** 6 hours | **Status:** Not Started

**Files to Refactor:**
- `admin-portal/src/components/EndpointManagement.tsx:19-31, 89-114`
- `admin-portal/src/components/APIAccessManager.tsx`
- `admin-portal/src/components/M2MClientsManager.tsx`

- [ ] Delete manual `getAccessToken()` functions (5+ occurrences)
- [ ] Replace manual `fetch()` calls with `apiV2` in EndpointManagement.tsx
- [ ] Replace manual `fetch()` calls with `apiV2` in APIAccessManager.tsx
- [ ] Replace manual `fetch()` calls with `apiV2` in M2MClientsManager.tsx
- [ ] Test each refactored component manually
- [ ] Verify authentication still works
- [ ] Verify API calls return expected data
- [ ] Commit changes

**Acceptance Criteria:**
- [ ] All manual `fetch()` calls replaced with `apiV2`
- [ ] No manual token acquisition code
- [ ] All components tested manually
- [ ] Error handling consistent

---

#### 1.4 Use handleError() Utility
**Priority:** HIGH | **Effort:** 6 hours | **Status:** Not Started

**Files to Update:** 113 try-catch blocks across API functions

- [ ] Review `api/src/utils/errors.ts` to understand `handleError()`
- [ ] Batch 1: Update `ManageEndpoints.ts`, `CreateIdentifier.ts`, `UpdateIdentifier.ts`
- [ ] Test Batch 1
- [ ] Batch 2: Update `GetAuthenticatedMember.ts`, `generateBvad.ts`, `uploadKvkDocument.ts`
- [ ] Test Batch 2
- [ ] Batch 3: Update remaining files
- [ ] Test Batch 3
- [ ] Commit changes

**Acceptance Criteria:**
- [ ] All catch blocks use `handleError()`
- [ ] Error responses consistent
- [ ] Request IDs included in all error responses
- [ ] No custom error formatting

---

#### 1.5 Add TypeScript Window Declaration
**Priority:** MEDIUM | **Effort:** 1 hour | **Status:** Not Started

- [ ] Create `admin-portal/src/global.d.ts` with MSAL type declaration
- [ ] Update `tsconfig.json` to include `src/global.d.ts`
- [ ] Replace all `(window as any).msalInstance` with `window.msalInstance`
- [ ] Verify TypeScript compiles without errors
- [ ] Commit changes

**Acceptance Criteria:**
- [ ] No `as any` for window object
- [ ] TypeScript compiles without errors
- [ ] MSAL instance properly typed

---

#### 1.6 Run ESLint Auto-fix
**Priority:** LOW | **Effort:** 1 hour | **Status:** Not Started

- [ ] Update ESLint config with rules (no-unused-vars, no-console)
- [ ] Run `npx eslint --fix src/` in admin-portal
- [ ] Run `npx eslint --fix src/` in member-portal
- [ ] Run `npx eslint --fix src/` in api
- [ ] Review and commit changes
- [ ] Fix any remaining issues manually

**Acceptance Criteria:**
- [ ] No unused imports
- [ ] No unused variables
- [ ] Consistent code style
- [ ] ESLint passes

---

#### 1.7 Extract Validation Utilities
**Priority:** MEDIUM | **Effort:** 4 hours | **Status:** Not Started

- [ ] Create `api/src/utils/validators.ts`
- [ ] Implement UUID, email, URL validators
- [ ] Find all duplicate UUID validation (10+ files): `grep -r "const isUUID = /\^" api/src/functions/`
- [ ] Replace inline validation with utility functions
- [ ] Test validators
- [ ] Commit changes

**Acceptance Criteria:**
- [ ] All UUID validation uses utility
- [ ] All email validation uses utility
- [ ] No duplicate validation patterns
- [ ] Validation errors consistent

---

#### 1.8 Standardize Error Responses
**Priority:** MEDIUM | **Effort:** 4 hours | **Status:** Not Started

- [ ] Create `api/src/utils/responses.ts`
- [ ] Implement response utilities (ok, created, badRequest, unauthorized, forbidden, notFound, serverError)
- [ ] Update handlers to use `Responses` utility (replace manual response objects)
- [ ] Test error responses
- [ ] Commit changes

**Acceptance Criteria:**
- [ ] All handlers use `Responses` utility
- [ ] Consistent error response format
- [ ] Proper HTTP status codes
- [ ] Error descriptions user-friendly

---

#### 1.9 Set Up Testing Framework
**Priority:** HIGH | **Effort:** 8 hours | **Status:** Not Started

- [ ] Install Jest dependencies: `jest`, `@types/jest`, `ts-jest`, `supertest`, `@azure/functions-test`
- [ ] Create `api/jest.config.js`
- [ ] Create `api/src/__tests__/setup.ts` (test database setup)
- [ ] Create `api/src/__tests__/helpers.ts` (mock utilities)
- [ ] Add test scripts to `package.json`
- [ ] Write first test: `api/src/utils/__tests__/validators.test.ts`
- [ ] Run tests: `npm test`
- [ ] Commit changes

**Acceptance Criteria:**
- [ ] Jest configured and running
- [ ] Test database set up
- [ ] Helper functions created
- [ ] First test passing
- [ ] Coverage reporting enabled

---

### Phase 2: Critical Path - Middleware & Testing (80 hours)

**Goal:** Reduce complexity in critical middleware, add comprehensive tests
**Risk:** Medium
**Status:** Not Started

#### 2.1 Refactor endpointWrapper.ts
**Priority:** CRITICAL | **Effort:** 16 hours | **Status:** Not Started

**Current State:** 531 lines, Complexity ~20
**Target State:** <100 lines, Complexity <5

- [ ] Step 1: Create middleware pipeline (4 hours)
  - [ ] Create `api/src/middleware/pipeline.ts`
  - [ ] Implement `createPipeline()` function
  - [ ] Test pipeline execution order
- [ ] Step 2: Extract individual middleware (8 hours)
  - [ ] Create `api/src/middleware/requestId.ts`
  - [ ] Create `api/src/middleware/cors.ts`
  - [ ] Create `api/src/middleware/https.ts`
  - [ ] Create `api/src/middleware/rateLimit.ts`
  - [ ] Create `api/src/middleware/contentType.ts`
  - [ ] Refactor `api/src/middleware/auth.ts`
  - [ ] Create `api/src/middleware/authorization.ts`
  - [ ] Create `api/src/middleware/csrf.ts`
  - [ ] Create `api/src/middleware/securityHeaders.ts`
- [ ] Step 3: Rewrite endpointWrapper.ts (2 hours)
  - [ ] Import all middleware
  - [ ] Rewrite `wrapEndpoint()` to use pipeline
  - [ ] Keep convenience functions unchanged
- [ ] Step 4: Test refactored middleware (2 hours)
  - [ ] Write tests for pipeline
  - [ ] Test each middleware individually
  - [ ] Test integration with existing endpoints
  - [ ] Deploy to dev and verify ALL endpoints work

**Acceptance Criteria:**
- [ ] Pipeline pattern implemented
- [ ] Each middleware <100 lines
- [ ] Each middleware complexity <5
- [ ] All middleware tested
- [ ] All existing endpoints work
- [ ] No regressions

---

#### 2.2 Add Middleware Tests
**Priority:** HIGH | **Effort:** 12 hours | **Status:** Not Started

**Coverage Target:** 80% for all middleware

- [ ] Write `auth.test.ts` (4 hours)
  - [ ] Test missing Authorization header
  - [ ] Test invalid Bearer token format
  - [ ] Test JWT signature validation with JWKS
  - [ ] Test party ID resolution from oid claim
  - [ ] Test M2M tokens without oid
- [ ] Write `rbac.test.ts` (3 hours)
  - [ ] Test role-based access control
  - [ ] Test permission-based access control
  - [ ] Test multiple roles/permissions
- [ ] Write `cors.test.ts` (2 hours)
  - [ ] Test OPTIONS preflight request
  - [ ] Test CORS headers on response
  - [ ] Test disallowed origin rejection
- [ ] Write `rateLimit.test.ts` (2 hours)
- [ ] Write `csrf.test.ts` (1 hour)

**Acceptance Criteria:**
- [ ] 80%+ coverage for all middleware
- [ ] Edge cases tested
- [ ] Error paths tested
- [ ] All tests passing

---

#### 2.3 Add Handler Tests
**Priority:** HIGH | **Effort:** 20 hours | **Status:** Not Started

**Coverage Target:** 60% for critical handlers

- [ ] Test `ManageEndpoints.ts` (4 hours)
  - [ ] Test getEndpointsByEntity (happy path)
  - [ ] Test getEndpointsByEntity (missing ID, filters deleted)
  - [ ] Test createEndpoint (success, validation, legal entity exists, audit log)
- [ ] Test `generateBvad.ts` (4 hours)
- [ ] Test `GetAuthenticatedMember.ts` (2 hours)
- [ ] Test `CreateIdentifier.ts` (3 hours)
- [ ] Test `UpdateIdentifier.ts` (3 hours)
- [ ] Test `uploadKvkDocument.ts` (4 hours)

**Acceptance Criteria:**
- [ ] 60%+ coverage for critical handlers
- [ ] Happy path tested
- [ ] Error paths tested
- [ ] Database operations tested
- [ ] Audit logging tested

---

#### 2.4 Integration Tests
**Priority:** MEDIUM | **Effort:** 12 hours | **Status:** Not Started

**Goal:** End-to-end API tests

- [ ] Set up integration test infrastructure
- [ ] Test Endpoint Management Workflow (create member → create endpoint → get endpoints → issue token)
- [ ] Test Authentication Flow (reject without token, reject invalid token, accept valid token)
- [ ] Test Authorization Flow
- [ ] Test Database Transactions
- [ ] All integration tests passing

**Acceptance Criteria:**
- [ ] Integration tests for critical workflows
- [ ] Authentication tested
- [ ] Authorization tested
- [ ] Database transactions tested
- [ ] All tests passing

---

### Phase 3: Component Splitting (68 hours)

**Goal:** Break large components into smaller, focused components
**Risk:** Medium
**Status:** Partially Complete (UI Patterns Standardization ✅)

#### 3.0 UI Patterns Standardization - LoadingState
**Priority:** HIGH | **Effort:** 8 hours | **Status:** ✅ COMPLETED (November 14, 2025)

**Commits:**
- `2ac5388` - Batch 4: MemberDetailView.tsx (3 tabs), AllEndpointsView.tsx
- `582a689` - Batch 5: TierManagement.tsx, KvkReviewQueue.tsx, ReviewTasks.tsx
- `09a04f6` - Batch 6: KvkDocumentUpload.tsx, KvkRegistryDetails.tsx, About.tsx
- `e3a9cf8` - Batch 7: HealthDashboard.tsx, UserManagement.tsx

**Components Migrated (11 total, 14 loading states):**
- [x] MemberDetailView.tsx (3 tab panels with LoadingState)
- [x] AllEndpointsView.tsx
- [x] TierManagement.tsx
- [x] KvkReviewQueue.tsx
- [x] ReviewTasks.tsx
- [x] KvkDocumentUpload.tsx
- [x] KvkRegistryDetails.tsx
- [x] About.tsx
- [x] HealthDashboard.tsx
- [x] UserManagement.tsx
- [x] MemberDetailDialog.tsx (already using LoadingState)

**Pattern Applied:**
```typescript
return (
  <LoadingState loading={loading} minHeight={400}>
    {/* content */}
  </LoadingState>
);
```

**Results:**
- Removed all early return loading patterns
- Removed custom loading divs and LoadingSpinner components
- Consistent UX across all admin portal components
- Improved accessibility with standardized ARIA attributes
- Single source of truth for loading states

**Remaining Components:**
- IdentifierVerificationManager.tsx - Uses inline Loader for section-specific loading (not early return pattern)
- Some components retain inline Loader for status indicators (intentional, not full-page loading)

---

#### 3.1 Refactor MemberDetailView.tsx
**Priority:** HIGH | **Effort:** 16 hours | **Status:** Partially Complete (LoadingState ✅, Component Splitting Pending)

**Current:** 589 lines, 10+ state variables, 8 tabs
**Target:** ~100 lines orchestrator + 8 tab components

- [ ] Step 1: Extract data hook (4 hours)
  - [ ] Create `admin-portal/src/hooks/useMemberData.ts`
  - [ ] Move all data fetching logic to hook
  - [ ] Test hook
- [ ] Step 2: Extract header component (2 hours)
  - [ ] Create `admin-portal/src/components/member-detail/MemberHeader.tsx`
  - [ ] Move header UI to component
- [ ] Step 3: Extract tab components (8 hours, 1 hour each)
  - [ ] Create `CompanyDetailsTab.tsx`
  - [ ] Create `IdentifiersTab.tsx`
  - [ ] Create `SystemIntegrationsTab.tsx`
  - [ ] Create `ApiAccessTab.tsx`
  - [ ] Create `ContactsTab.tsx`
  - [ ] Create `DocumentVerificationTab.tsx`
  - [ ] Create `AuthenticationTierTab.tsx`
  - [ ] Create `KvkRegistryTab.tsx`
- [ ] Step 4: Simplify main component (2 hours)
  - [ ] Refactor MemberDetailView to use new components
  - [ ] Test all functionality preserved

**Acceptance Criteria:**
- [ ] Main component <150 lines
- [ ] Each tab component <120 lines
- [ ] Data fetching in custom hook
- [ ] All functionality preserved
- [ ] Manual testing passed

---

#### 3.2 Refactor Large API Functions
**Priority:** HIGH | **Effort:** 24 hours | **Status:** Not Started

**Files to Split:**
1. `ManageM2MClients.ts` (935 lines → 4 handlers + service)
2. `EndpointRegistrationWorkflow.ts` (825 lines → 5 handlers + service)
3. `registerMember.ts` (641 lines → handler + service)
4. `uploadKvkDocument.ts` (431 lines → handler + service)

- [ ] Split ManageM2MClients.ts (8 hours)
  - [ ] Extract service layer: `api/src/services/m2mClientService.ts`
  - [ ] Create individual handlers (ListM2MClients, CreateM2MClient, UpdateM2MClient, RotateM2MClientSecret)
  - [ ] Update imports in index.ts
  - [ ] Write tests for service and handlers
  - [ ] Deploy and verify
- [ ] Split EndpointRegistrationWorkflow.ts (8 hours)
- [ ] Split registerMember.ts (4 hours)
- [ ] Split uploadKvkDocument.ts (4 hours)

**Acceptance Criteria:**
- [ ] Each handler <120 lines
- [ ] Service layer <250 lines
- [ ] All functionality preserved
- [ ] Tests passing
- [ ] Deployed and verified

---

#### 3.3 Refactor Other Large Components
**Priority:** MEDIUM | **Effort:** 28 hours | **Status:** Not Started

**Components:**
1. `TasksGrid.tsx` (1,147 lines) - 12 hours
2. `IdentifiersManager.tsx` (949 lines) - 8 hours
3. `MembersGrid.tsx` (709 lines) - 8 hours

- [ ] Refactor TasksGrid.tsx (12 hours)
  - [ ] Extract custom hook: `useTasks.ts`
  - [ ] Extract filter component: `TaskFilters.tsx`
  - [ ] Extract modals: `CreateTaskModal.tsx`, `EditTaskModal.tsx`
  - [ ] Simplify main grid
- [ ] Refactor IdentifiersManager.tsx (8 hours)
  - [ ] Extract hook: `useIdentifiers.ts`
  - [ ] Extract components: `IdentifierForm.tsx`, `IdentifierRow.tsx`, `EuidInfo.tsx`
- [ ] Refactor MembersGrid.tsx (8 hours)
  - [ ] Extract hook: `useMembers.ts`
  - [ ] Extract components: `MemberFilters.tsx`, `MemberRow.tsx`, `MemberActions.tsx`

**Acceptance Criteria:**
- [ ] All components <150 lines
- [ ] Functionality preserved
- [ ] Manual testing passed

---

### Phase 4: Architecture - Service Layer & Validation (76 hours)

**Goal:** Introduce service layer, add runtime validation, reduce platform coupling
**Risk:** High
**Status:** Not Started

#### 4.1 Create Repository Pattern
**Priority:** HIGH | **Effort:** 16 hours | **Status:** Not Started

**Repositories to Create:**
1. BaseRepository (included in each)
2. LegalEntityRepository (4 hours)
3. MemberRepository (4 hours)
4. ContactRepository (2 hours)
5. IdentifierRepository (2 hours)
6. EndpointRepository (2 hours)
7. AuditLogRepository (2 hours)

- [ ] Create `api/src/repositories/BaseRepository.ts`
- [ ] Create `api/src/repositories/legalEntityRepository.ts`
- [ ] Create `api/src/repositories/memberRepository.ts`
- [ ] Create `api/src/repositories/contactRepository.ts`
- [ ] Create `api/src/repositories/identifierRepository.ts`
- [ ] Create `api/src/repositories/endpointRepository.ts`
- [ ] Create `api/src/repositories/auditLogRepository.ts`
- [ ] Write tests for repositories (80% coverage)
- [ ] Update handlers to use repositories

**Acceptance Criteria:**
- [ ] All repositories created
- [ ] Base repository with common methods
- [ ] All duplicate queries eliminated
- [ ] Tests for repositories (80% coverage)
- [ ] All handlers use repositories

---

#### 4.2 Add Runtime Validation with Zod
**Priority:** HIGH | **Effort:** 20 hours | **Status:** Not Started

**Goal:** Eliminate `as any`, add type-safe validation

- [ ] Install Zod: `npm install zod` (1 hour)
- [ ] Create validation schemas (8 hours)
  - [ ] Create `api/src/schemas/common.ts`
  - [ ] Create `api/src/schemas/legalEntity.ts`
  - [ ] Create `api/src/schemas/member.ts`
  - [ ] Create `api/src/schemas/contact.ts`
  - [ ] Create `api/src/schemas/identifier.ts`
  - [ ] Create `api/src/schemas/endpoint.ts`
  - [ ] Create `api/src/schemas/bvad.ts`
- [ ] Add validation middleware (2 hours)
  - [ ] Create `validateBody()` middleware
  - [ ] Create `validateParams()` middleware
- [ ] Update handlers to use validation (8 hours)
  - [ ] Replace manual validation with Zod schemas
  - [ ] Update all handlers systematically
- [ ] Update types to use Zod inference (1 hour)

**Acceptance Criteria:**
- [ ] All input validation uses Zod
- [ ] No `as any` in handlers
- [ ] Validation errors user-friendly
- [ ] Types inferred from schemas
- [ ] All handlers updated

---

#### 4.3 Introduce Service Layer
**Priority:** HIGH | **Effort:** 24 hours | **Status:** Not Started

**Services to Create:**
1. EndpointService (4 hours)
2. MemberService (4 hours)
3. BvadService (4 hours)
4. KvkVerificationService (4 hours)
5. M2MClientService (already created in Phase 3)
6. AuthenticationService (4 hours)
7. AuditService (4 hours)

- [ ] Create `api/src/services/endpointService.ts`
- [ ] Create `api/src/services/memberService.ts`
- [ ] Create `api/src/services/bvadService.ts`
- [ ] Create `api/src/services/kvkVerificationService.ts`
- [ ] Create `api/src/services/authenticationService.ts`
- [ ] Create `api/src/services/auditService.ts`
- [ ] Write tests for services (80% coverage)
- [ ] Update handlers to use services

**Acceptance Criteria:**
- [ ] All services created
- [ ] All business logic in services
- [ ] Handlers <50 lines
- [ ] Services tested (80% coverage)
- [ ] All handlers use services

---

#### 4.4 Platform Abstraction (OPTIONAL)
**Priority:** LOW | **Effort:** 16 hours | **Status:** Not Started

**Goal:** Reduce dependency on Azure Functions SDK

- [ ] Create platform-agnostic types (4 hours)
  - [ ] Create `api/src/core/types.ts`
  - [ ] Define HttpRequest, HttpResponse, Logger, RequestContext interfaces
- [ ] Create adapters (4 hours)
  - [ ] Create `api/src/adapters/azureFunctionsAdapter.ts`
  - [ ] Create `api/src/adapters/expressAdapter.ts` (for testing)
- [ ] Update handlers to use platform-agnostic types (6 hours)
- [ ] Test with alternative platform (2 hours)
  - [ ] Test handlers work with Express adapter

**Acceptance Criteria:**
- [ ] Core types defined
- [ ] Azure adapter created
- [ ] Alternative adapter created for testing
- [ ] All handlers use platform-agnostic types
- [ ] Tests passing with both adapters

---

### Phase 5: Polish - Coverage & Documentation (24 hours)

**Goal:** Achieve 80% test coverage, update documentation
**Risk:** Low
**Status:** Not Started

#### 5.1 Achieve 80% Test Coverage
**Priority:** HIGH | **Effort:** 16 hours | **Status:** Not Started

**Current Coverage:** 60% (after Phase 2-4)
**Target Coverage:** 80%

- [ ] Write Service Layer Tests (6 hours)
  - [ ] EndpointService
  - [ ] MemberService
  - [ ] BvadService
  - [ ] KvkVerificationService
  - [ ] AuditService
- [ ] Write Repository Tests (4 hours)
  - [ ] All repositories (if not already at 80%)
- [ ] Write Integration Tests (4 hours)
  - [ ] Critical workflows end-to-end
  - [ ] Multi-step processes
- [ ] Write Frontend Component Tests (2 hours)
  - [ ] Critical components
  - [ ] Custom hooks
- [ ] Run coverage report: `npm run test:coverage`
- [ ] Fix coverage gaps

**Acceptance Criteria:**
- [ ] 80% line coverage
- [ ] 70% branch coverage
- [ ] All critical paths covered
- [ ] Coverage report in CI

---

#### 5.2 Update Documentation
**Priority:** HIGH | **Effort:** 8 hours | **Status:** Not Started

- [ ] Update CLAUDE.md (3 hours)
  - [ ] Update architecture section
  - [ ] Document new patterns (repositories, services)
  - [ ] Update testing section
  - [ ] Add refactoring outcomes
- [ ] Update README.md (2 hours)
  - [ ] Update development commands
  - [ ] Add testing instructions
  - [ ] Update architecture diagram
- [ ] Update API Documentation (2 hours)
  - [ ] Update OpenAPI/Swagger spec
  - [ ] Document validation schemas
  - [ ] Add examples
- [ ] Update Code Comments (1 hour)
  - [ ] Review and update JSDoc comments
  - [ ] Ensure "why" not "what"
  - [ ] Document complex algorithms

**Acceptance Criteria:**
- [ ] All documentation updated
- [ ] Architecture diagrams current
- [ ] Examples working
- [ ] Comments reviewed

---

### Success Metrics

**Phase-by-Phase Targets:**

| Phase | Test Coverage | Files >300 Lines | Avg Complexity | Health Score |
|-------|---------------|------------------|----------------|--------------|
| Start | 0%            | 50               | 12             | 4.2/10       |
| Phase 1 | 10%         | 50               | 12             | 4.5/10       |
| Phase 2 | 60%         | 50               | 8              | 6.0/10       |
| Phase 3 | 60%         | 10               | 8              | 7.0/10       |
| Phase 4 | 70%         | 5                | 6              | 8.0/10       |
| Phase 5 | 80%         | 0                | 5              | 8.5/10       |

**Key Performance Indicators:**

**Code Quality:**
- [ ] No files >300 lines
- [ ] No functions >50 lines
- [ ] Cyclomatic complexity <10 everywhere
- [ ] <100 lines of duplicate code

**Testing:**
- [ ] 80% line coverage (API)
- [ ] 70% line coverage (Frontend)
- [ ] All critical paths tested
- [ ] CI runs tests on every commit

**Maintainability:**
- [ ] All API calls use `@ctn/api-client`
- [ ] All database queries use repositories
- [ ] All validation uses Zod
- [ ] All error handling uses utilities

**Documentation:**
- [ ] Architecture docs updated
- [ ] All public APIs documented
- [ ] Code comments explain "why"
- [ ] README current

---

## 🔧 How to Use This File

1. **Adding Tasks:**
   - Use clear, actionable task descriptions
   - Include priority, status, and estimated effort
   - Link to relevant files and documentation

2. **Updating Status:**
   - Change checkboxes from `[ ]` to `[x]` when complete
   - Update "Last Updated" date at top
   - Move completed tasks to COMPLETED_ACTIONS.md

3. **Invoking Agents:**
   - **DE (Database Expert):** Schema analysis, migrations, performance
   - **SA (Security Analyst):** Security reviews, vulnerability scanning
   - **CR (Code Reviewer):** Code quality, best practices
   - **TE (Test Engineer):** Test creation, E2E testing

---

## 🎯 Next Actions

**Immediate (This Week):**
1. **CRITICAL:** Execute secret rotation tasks (SEC-ROTATE-001 through SEC-ROTATE-005)
2. Complete Azure Key Vault migration (2-3 hours)
3. Invoke DE (Database Expert) agent to analyze schema redundancy
4. Create duplicate legal_entity cleanup script

**Short Term (Next 2 Weeks):**
1. Fix duplicate legal_entity records issue
2. Add UNIQUE constraint on legal_entity(party_id)
3. Configure BDI production setup (RSA keys, testing)
4. Improve Admin Portal authentication test coverage
5. Set up monitoring & observability (Application Insights, alerts, dashboard)

**Long Term (Next Month):**
1. Design and implement schema simplification (party/legal_entity/members)
2. Complete BDI E2E testing and external system registration
3. Investigate and fix KvK identifier bug
4. Define API versioning strategy
5. Create production service accounts for partners
6. Implement per-client rate limiting
7. Secret rotation policy implementation (90-day cycle)

---

**Document Version:** 1.0
**Created:** November 13, 2025
**Owner:** Development Team
