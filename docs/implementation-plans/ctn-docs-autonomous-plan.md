# Autonomous Implementation Plan
**Generated:** October 19, 2025
**Based on:** ~/Desktop/ROADMAP.md
**Scope:** Tasks completable without Azure Portal access or external credentials

---

## Executive Summary

### What CAN Be Done Autonomously (91 hours)
- **28 tasks** can be completed through code changes, documentation, and automated deployments
- **Total Estimated Effort:** 91 hours
- **Success Rate:** 62% of all ROADMAP tasks can be done autonomously

### What CANNOT Be Done Autonomously (56 hours)
- **17 tasks** require Azure Portal access, external service credentials, or manual credential rotation
- **Blockers:** Azure DevOps variable groups, Key Vault configuration, credential rotation, BDI key setup

### High-Level Strategy
1. **Phase 1:** Documentation and quick wins (8 hours)
2. **Phase 2:** High-impact security and bug fixes (11.5 hours)
3. **Phase 3:** Backend integration and testing (28 hours)
4. **Phase 4:** Code quality and architecture improvements (43.5 hours)

---

## Tasks That CANNOT Be Done Autonomously

### CRITICAL (Requires Azure Portal/Credentials)
1. ❌ **Update Azure DevOps variable groups** - Requires Azure DevOps access (15 min)
2. ❌ **Rotate Azure AD test password** - Requires Azure Portal (5 min)
3. ❌ **Rotate Aikido API keys** - Requires Aikido console access (10 min)
4. ❌ **Rotate PostgreSQL password** - Requires Azure Portal (30 min)
5. ❌ **Generate strong JWT secret** - Requires Azure Portal for Key Vault storage (15 min)
6. ❌ **Move secrets to Azure Key Vault** - Requires Azure Portal (2-3 hours)

### HIGH Priority (Requires Azure Portal)
7. ❌ **Configure BDI RSA keys in Key Vault** - Requires Key Vault access (30 min)
8. ❌ **Set BDI_KEY_ID in Function App Settings** - Requires Azure Portal (15 min)
9. ❌ **Register external BDI systems in database** - Requires actual system credentials (2 hours)
10. ❌ **Configure Keycloak realm for BDI** - Requires Keycloak admin access (2 hours)

### MEDIUM Priority (Requires Azure Portal)
11. ❌ **Configure Application Insights telemetry** - Requires Azure Portal (2 hours)
12. ❌ **Set up alerting rules** - Requires Azure Portal (2 hours)
13. ❌ **Create operational dashboard** - Requires Azure Monitor access (3 hours)

### LOW Priority (Requires External Services)
14. ❌ **DNS verification for member onboarding** - Requires DNS provider access (6 hours)
15. ❌ **WAF/Firewall configuration** - Requires Azure Portal (4 hours)
16. ❌ **Set up proper production environment** - Requires new Azure resources (8 hours)
17. ❌ **KvK API integration** - Requires API credentials (8 hours)
18. ❌ **Companies House API integration** - Requires API credentials (6 hours)

**Total Cannot Do:** 17 tasks, ~56 hours

---

## Phase 1: Quick Wins & Documentation (8 hours)

### Goal
Complete high-impact documentation and small code improvements that can be deployed immediately.

### Tasks

#### 1.1 Document Orchestrator Portal Security Limitations
**Priority:** HIGH
**Effort:** 15 minutes
**Risk:** Low

**Description:** Add README.md warning that Orchestration API requires AUTH-001 completion before production.

**Files to Modify:**
- `orchestrator-portal/README.md` (create or update)

**Success Criteria:**
- Clear warning about AUTH-001 dependency
- Production readiness checklist
- Security limitations documented

**Testing:** N/A (documentation only)

**Deployment:** Git commit only

---

#### 1.2 Centralize Vite Configuration
**Priority:** LOW
**Effort:** 2 hours
**Risk:** Medium

**Description:** Create shared Vite configuration to eliminate duplication across 3 portals.

**Files to Modify:**
- `shared/vite.config.base.ts` (create)
- `admin-portal/vite.config.ts`
- `member-portal/vite.config.ts`
- `orchestrator-portal/vite.config.ts`

**Technical Approach:**
1. Extract common configuration from all 3 portals
2. Create base config with plugins, build settings, env validation
3. Each portal imports and extends base config
4. Test build process for all portals

**Success Criteria:**
- All 3 portals build successfully
- No duplication in vite.config.ts files
- Environment variable validation preserved

**Testing:**
```bash
cd admin-portal && npm run build
cd member-portal && npm run build
cd orchestrator-portal && npm run build
```

**Deployment:** Git commit, pipeline will rebuild

**Dependencies:** None

---

#### 1.3 Remove 'unsafe-eval' from Orchestrator Portal CSP
**Priority:** LOW
**Effort:** 1-2 hours
**Risk:** High (may break functionality)

**Description:** Remove 'unsafe-eval' from Content Security Policy if possible.

**Files to Modify:**
- `orchestrator-portal/staticwebapp.config.json`

**Technical Approach:**
1. Review JavaScript dependencies for eval() usage
2. Test portal functionality without 'unsafe-eval'
3. If breaks, document why it's required
4. If works, remove directive

**Success Criteria:**
- Portal functions correctly without 'unsafe-eval'
- OR documented reason why it's required

**Testing:**
- Playwright E2E tests for orchestrator portal
- Manual testing of all features

**Deployment:** Git commit, pipeline will deploy

**Dependencies:** None

**Risk Assessment:** May require code refactoring if frameworks use eval()

---

#### 1.4 Implement Structured Logging
**Priority:** LOW
**Effort:** 3 hours
**Risk:** Low

**Description:** Replace console.log with structured JSON logging for Azure Application Insights.

**Files to Create:**
- `api/src/lib/logger.ts`

**Files to Modify:**
- All API functions (33 existing + 4 orchestration)

**Technical Approach:**
1. Create logger utility with log levels (debug, info, warn, error)
2. Add correlation IDs for request tracing
3. Replace console.log/error with structured logs
4. Include context (user, endpoint, duration)

**Success Criteria:**
- All logging uses structured format
- Logs include correlation IDs
- Compatible with Application Insights

**Testing:**
- API tests verify logs are created
- Check log format in Azure

**Deployment:** Git commit, deploy API function

**Dependencies:** None

---

### Phase 1 Summary
- **Total Tasks:** 4
- **Total Effort:** 6.5-7.5 hours
- **Risk Level:** Low-Medium
- **Deployment:** Git commits + API deployment

---

## Phase 2: High-Impact Security & Bug Fixes (11.5 hours)

### Goal
Implement AUTH-001 party ID resolution and fix critical bugs.

### Tasks

#### 2.1 AUTH-001: Implement Azure AD User → Party ID Resolution
**Priority:** HIGH
**Effort:** 3 hours
**Risk:** High

**Description:** Implement database lookup from Azure AD user to party_id via members/legal_entities.

**Files to Modify:**
- `api/src/functions/GetOrchestrations.ts`
- `api/src/functions/GetOrchestrationDetails.ts`
- `api/src/functions/GetEvents.ts`
- `api/src/middleware/rbac.ts` (potentially)

**Technical Approach:**
1. Study existing member/legal entity lookup patterns (find 3 similar implementations)
2. Create database query to resolve Azure AD user → member → legal entity → party_id
3. Implement caching to avoid repeated lookups
4. Replace "TBD" placeholder with actual resolution
5. Add error handling for unmapped users

**Success Criteria:**
- Azure AD users correctly mapped to party IDs
- Unmapped users receive appropriate error
- Orchestration endpoints filter by party ID
- No performance regression

**Testing:**
```bash
# API tests (curl)
curl -H "Authorization: Bearer $TOKEN" \
  https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1/orchestrations

# Playwright E2E tests
cd web && npm run test:e2e -- orchestrations.spec.ts
```

**Deployment:**
```bash
cd api
npm run build
func azure functionapp publish func-ctn-demo-asr-dev --typescript --build remote
```

**Dependencies:** None (database schema already supports this)

**Risk Assessment:**
- High risk: Core security feature
- User approval recommended before deployment

---

#### 2.2 Configure Dynamic termsVersion in BVAD Generation
**Priority:** HIGH
**Effort:** 1 hour
**Risk:** Low

**Description:** Replace hardcoded 'v3.2.0' with member metadata lookup.

**Files to Modify:**
- `api/src/utils/generateBvad.ts:213`

**Technical Approach:**
1. Find member metadata lookup pattern in codebase
2. Add database query for member's agreed terms version
3. Replace hardcoded value with dynamic lookup
4. Add fallback to latest version if not found

**Success Criteria:**
- BVAD generation uses member's actual terms version
- Fallback to latest version works
- No breaking changes to BVAD format

**Testing:**
- Unit test for generateBvad()
- API test for BVAD generation endpoint

**Deployment:** API function deployment

**Dependencies:** None

---

#### 2.3 Re-enable Strict MFA Checking
**Priority:** HIGH
**Effort:** 30 minutes
**Risk:** Medium

**Description:** Remove MFA workaround once Conditional Access policy is enforced.

**Files to Modify:**
- `admin-portal/src/contexts/AuthContext.tsx:82`

**Technical Approach:**
1. Review current MFA workaround logic
2. Document conditions for removal (Conditional Access policy must be active)
3. Create feature flag for easy rollback if needed
4. Remove workaround code

**Success Criteria:**
- MFA required for all admin portal access
- Non-MFA users redirected to enrollment
- No impact on MFA-enabled users

**Testing:**
- Test with MFA-enabled user
- Test with non-MFA user (should be blocked)

**Deployment:** Admin portal deployment

**Dependencies:** ⚠️ Requires verification that Conditional Access policy is active (Azure Portal)

**Risk Assessment:** May block users if Conditional Access not configured

**Recommendation:** DEFER until user confirms Conditional Access is active

---

#### 2.4 BUG-008: Fix Grid Pagination State Loss
**Priority:** MEDIUM (deferred in roadmap)
**Effort:** 4-6 hours
**Risk:** High

**Description:** Implement server-side pagination to preserve state when filtering.

**Files to Modify:**
- `api/src/functions/GetMembers.ts` (and other list endpoints)
- `admin-portal/src/components/grids/*` (all grids)

**Technical Approach:**
1. Add pagination params to API endpoints (page, pageSize, filters)
2. Return total count with paginated data
3. Update frontend grids to use server-side pagination
4. Preserve filter + page state in URL or session storage

**Success Criteria:**
- Page number preserved when applying filters
- Total count displayed correctly
- Performance improved for large datasets

**Testing:**
- E2E test: Filter → Navigate away → Return (page preserved)
- Load test with 1000+ records

**Deployment:** API + Admin portal deployment

**Dependencies:** None

**Risk Assessment:**
- High risk: Affects all grids in admin portal
- Significant backend and frontend changes
- User approval recommended

**Recommendation:** DEFER to Phase 4 (nice-to-have UX improvement)

---

### Phase 2 Summary
- **Total Tasks:** 4
- **Total Effort:** 8.5-10.5 hours
- **Risk Level:** High
- **Deployment:** API + Portal deployments
- **Recommendation:** Complete 2.1 and 2.2, defer 2.3 and 2.4

---

## Phase 3: Backend Integration & Testing (28 hours)

### Goal
Implement backend integrations and comprehensive testing.

### Tasks

#### 3.1 Implement User Management API Integration (Microsoft Graph)
**Priority:** HIGH
**Effort:** 4 hours
**Risk:** Medium

**Description:** Connect UserManagement.tsx to Microsoft Graph API for Azure AD operations.

**Files to Modify:**
- `admin-portal/src/pages/UserManagement.tsx:70,115,154,179`
- `api/src/functions/ManageUsers.ts` (create backend proxy)

**Technical Approach:**
1. Study Microsoft Graph API documentation
2. Use MSAL for authentication
3. Implement backend proxy functions (fetch, invite, update, enable/disable)
4. Update frontend to call backend proxy
5. Add error handling for Graph API errors

**Success Criteria:**
- Fetch users from Azure AD
- Invite new users (send email)
- Update user properties
- Enable/disable user accounts
- Error messages displayed to admin

**Testing:**
- Unit tests for Graph API client
- E2E tests for user management flow

**Deployment:** API + Admin portal deployment

**Dependencies:** Requires Graph API permissions (may need Azure Portal)

**Risk Assessment:** May require Azure Portal to grant permissions

**Recommendation:** Attempt implementation, flag if permissions needed

---

#### 3.2 BDI Token Generation and Validation E2E Testing
**Priority:** MEDIUM
**Effort:** 4 hours
**Risk:** Medium

**Description:** Create comprehensive E2E tests for BDI token lifecycle.

**Files to Create:**
- `web/e2e/bdi-tokens.spec.ts`
- `api/tests/bdi-token-validation.test.ts`

**Technical Approach:**
1. Test BVAD generation (member registration)
2. Test BVAD validation (external system)
3. Test BVOD generation (orchestration creation)
4. Test BVOD validation (party authorization)
5. Test token expiration handling
6. Test invalid token rejection

**Success Criteria:**
- All BDI token operations tested
- Edge cases covered (expiration, tampering, missing fields)
- Tests pass consistently

**Testing:** Run test suite, verify coverage

**Deployment:** Git commit (tests only)

**Dependencies:** None (uses existing API endpoints)

---

#### 3.3 Test BVAD Generation with International Companies
**Priority:** HIGH
**Effort:** 1 hour
**Risk:** Low

**Description:** Test BVAD generation for various international company identifiers.

**Files to Create:**
- `api/tests/bvad-international.test.ts`

**Technical Approach:**
1. Create test data for UK, German, Belgian, French companies
2. Test BVAD generation for each identifier type
3. Validate generated tokens against BDI spec
4. Document any identifier-specific issues

**Success Criteria:**
- BVAD generation works for all identifier types
- Tokens validate correctly
- Edge cases documented

**Testing:** Run test suite

**Deployment:** Git commit (tests only)

**Dependencies:** None

---

#### 3.4 Test BVOD Validation with Sample Orchestrations
**Priority:** HIGH
**Effort:** 1 hour
**Risk:** Low

**Description:** Test BVOD validation for orchestration authorization.

**Files to Create:**
- `api/tests/bvod-validation.test.ts`

**Technical Approach:**
1. Create sample orchestrations with BVODs
2. Test valid BVOD acceptance
3. Test invalid BVOD rejection
4. Test expired BVOD handling
5. Test party mismatch detection

**Success Criteria:**
- All BVOD validation scenarios tested
- Security checks enforced correctly
- Error messages clear and actionable

**Testing:** Run test suite

**Deployment:** Git commit (tests only)

**Dependencies:** None

---

#### 3.5 Add Comprehensive Unit Tests
**Priority:** MEDIUM
**Effort:** 16 hours
**Risk:** Low

**Description:** Add unit tests for all API functions and frontend components.

**Files to Create:**
- `api/src/functions/*.test.ts` (33 existing + 4 orchestration)
- `admin-portal/src/components/*.test.tsx`
- `member-portal/src/components/*.test.tsx`
- `orchestrator-portal/src/components/*.test.tsx`

**Technical Approach:**
1. Use existing test patterns (find 3 similar tests)
2. Test happy path + error cases
3. Mock database and external services
4. Aim for 80% code coverage
5. Focus on business logic, not trivial getters/setters

**Success Criteria:**
- 80% code coverage for API
- 70% code coverage for portals
- All critical paths tested
- Tests run in CI/CD

**Testing:** Run test suite, check coverage report

**Deployment:** Git commit (tests only)

**Dependencies:** None

**Breakdown:**
- API functions: 8 hours (37 functions × 13 min/function)
- Portal components: 8 hours (estimate)

---

#### 3.6 Performance Testing and Optimization
**Priority:** MEDIUM
**Effort:** 8 hours
**Risk:** Low

**Description:** Test API performance under load and optimize slow queries.

**Files to Create:**
- `api/tests/performance/*.test.ts`
- `docs/PERFORMANCE_REPORT.md`

**Technical Approach:**
1. Use Artillery or k6 for load testing
2. Test all API endpoints (100 concurrent users)
3. Identify slow queries (>500ms)
4. Add database indexes for slow queries
5. Implement caching for frequently accessed data
6. Document performance baseline and improvements

**Success Criteria:**
- All endpoints <500ms at 100 concurrent users
- Slow queries optimized (before/after metrics)
- Performance report generated

**Testing:** Run load tests, verify improvements

**Deployment:**
- Database migrations for indexes
- API deployment for caching

**Dependencies:** None

---

### Phase 3 Summary
- **Total Tasks:** 6
- **Total Effort:** 34 hours
- **Risk Level:** Low-Medium
- **Deployment:** API deployments + Git commits (tests)
- **Note:** Task 3.1 may require Azure Portal for permissions

---

## Phase 4: Code Quality & Architecture (43.5 hours)

### Goal
Improve code architecture, reduce technical debt, and enhance maintainability.

### Tasks

#### 4.1 Create Shared API Client Package
**Priority:** LOW
**Effort:** 8 hours
**Risk:** High

**Description:** Eliminate code duplication by creating shared API client for all 3 portals.

**Files to Create:**
- `packages/@ctn/api-client/src/index.ts`
- `packages/@ctn/api-client/src/auth.ts`
- `packages/@ctn/api-client/src/client.ts`
- `packages/@ctn/api-client/package.json`

**Files to Modify:**
- `admin-portal/src/services/*` (remove duplicates)
- `member-portal/src/services/*` (remove duplicates)
- `orchestrator-portal/src/services/*` (remove duplicates)

**Technical Approach:**
1. Create NPM package structure
2. Extract common axios configuration
3. Extract authentication logic (MSAL)
4. Extract error handling
5. Add TypeScript types for all endpoints
6. Publish to local registry or use workspace
7. Update all portals to use shared package

**Success Criteria:**
- Single source of truth for API client
- No code duplication across portals
- Type-safe API calls
- All portals build and run correctly

**Testing:**
- Unit tests for API client
- E2E tests for all portals

**Deployment:** All 3 portals + Git commit

**Dependencies:** None

**Risk Assessment:**
- High risk: Affects all 3 portals
- Breaking changes if not done carefully
- Recommend thorough testing before deployment

---

#### 4.2 Add Health Check Dashboards to All Portals
**Priority:** LOW
**Effort:** 4 hours
**Risk:** Low

**Description:** Add /health route showing API connectivity, auth status, version info.

**Files to Create:**
- `admin-portal/src/pages/Health.tsx`
- `member-portal/src/pages/Health.tsx`
- `orchestrator-portal/src/pages/Health.tsx`
- `api/src/functions/GetHealth.ts`

**Technical Approach:**
1. Create backend health check endpoint
2. Check database connectivity
3. Check Azure AD connectivity
4. Return version info from version.json
5. Create frontend health dashboard
6. Display last deployment time
7. Display system status (green/yellow/red)

**Success Criteria:**
- Health check endpoint returns 200 OK
- Dashboard shows all system components
- Version info displayed correctly
- Accessible at /health in all portals

**Testing:**
- API test for health endpoint
- E2E test for health dashboard

**Deployment:** API + All 3 portals

**Dependencies:** None

---

#### 4.3 Implement Database Transactions
**Priority:** MEDIUM
**Effort:** 4 hours
**Risk:** Medium

**Description:** Wrap multi-step database operations in transactions for data consistency.

**Files to Modify:**
- All API functions with multi-step operations
- `api/src/utils/database.ts` (add transaction helpers)

**Technical Approach:**
1. Identify multi-step operations (create member + legal entity, etc.)
2. Create transaction wrapper utility
3. Wrap operations in BEGIN/COMMIT/ROLLBACK
4. Add error handling for rollback
5. Test rollback on failure

**Success Criteria:**
- All multi-step operations use transactions
- Rollback on error works correctly
- No partial data in database on failure

**Testing:**
- Unit tests for transaction wrapper
- Integration tests for rollback scenarios

**Deployment:** API deployment

**Dependencies:** None

---

#### 4.4 Define API Versioning Strategy
**Priority:** MEDIUM
**Effort:** 2 hours
**Risk:** Low

**Description:** Document API versioning approach and implement version headers.

**Files to Create:**
- `docs/API_VERSIONING_STRATEGY.md`

**Files to Modify:**
- `api/src/middleware/versioning.ts` (create)
- All API functions (add version check)

**Technical Approach:**
1. Document versioning strategy (URL vs header vs both)
2. Current: `/api/v1/...` (URL-based)
3. Add version response header (API-Version: 1.0.0)
4. Document breaking change policy
5. Create deprecation process

**Success Criteria:**
- Versioning strategy documented
- Version headers added to all responses
- Deprecation process defined

**Testing:**
- API tests verify version headers

**Deployment:** API deployment + Documentation

**Dependencies:** None

---

#### 4.5 L3: Audit Trail/Change History
**Priority:** MEDIUM
**Effort:** 6 hours
**Risk:** Medium

**Description:** Implement audit logging for all data modifications.

**Files to Create:**
- `database/migrations/XXX_create_audit_log.sql`
- `api/src/utils/auditLog.ts`

**Files to Modify:**
- All API functions with write operations

**Technical Approach:**
1. Create audit_log table (entity, action, user, timestamp, old_value, new_value)
2. Create audit logging middleware
3. Automatically log all INSERT/UPDATE/DELETE operations
4. Add audit trail view in admin portal
5. Add filtering by entity/user/date

**Success Criteria:**
- All data changes logged
- Audit trail viewable in admin portal
- Can filter by entity/user/date range
- Performance not impacted

**Testing:**
- Test audit logging for all operations
- Test audit trail UI

**Deployment:** Database migration + API + Admin portal

**Dependencies:** None

---

#### 4.6 L5: Contextual Help System
**Priority:** MEDIUM
**Effort:** 3 hours
**Risk:** Low

**Description:** Add contextual help tooltips and info icons throughout portals.

**Files to Create:**
- `admin-portal/src/components/HelpTooltip.tsx`
- `member-portal/src/components/HelpTooltip.tsx`
- `orchestrator-portal/src/components/HelpTooltip.tsx`

**Files to Modify:**
- All form fields (add help text)
- All complex features (add info icons)

**Technical Approach:**
1. Create reusable HelpTooltip component
2. Add help text for all form fields
3. Add info icons with detailed explanations
4. Support keyboard navigation (accessibility)
5. Responsive design (mobile-friendly)

**Success Criteria:**
- Help available for all form fields
- Tooltips accessible via keyboard
- Help text clear and concise
- No performance impact

**Testing:**
- Accessibility testing (screen reader)
- E2E tests for help tooltips

**Deployment:** All 3 portals

**Dependencies:** None

---

#### 4.7 L6: Progressive Disclosure for Complex Forms
**Priority:** MEDIUM
**Effort:** 2 hours
**Risk:** Low

**Description:** Show/hide form sections based on user selections to reduce cognitive load.

**Files to Modify:**
- `admin-portal/src/pages/MemberRegistration.tsx`
- `admin-portal/src/pages/LegalEntityManagement.tsx`

**Technical Approach:**
1. Identify complex forms with many fields
2. Group fields into logical sections
3. Show sections progressively based on user input
4. Use Kendo UI Stepper or Accordion components
5. Save progress at each step

**Success Criteria:**
- Complex forms use progressive disclosure
- User can navigate forward/backward
- Progress saved at each step
- Improved UX (reduced cognitive load)

**Testing:**
- E2E tests for form navigation
- User testing (if possible)

**Deployment:** Admin portal

**Dependencies:** None

---

#### 4.8 Member Self-Service Token Management
**Priority:** LOW
**Effort:** 4 hours
**Risk:** Low

**Description:** Allow members to view/regenerate API tokens in member portal.

**Files to Create:**
- `member-portal/src/pages/TokenManagement.tsx`
- `api/src/functions/RegenerateToken.ts`

**Technical Approach:**
1. Create token management page in member portal
2. Display current token (masked)
3. Add "Regenerate" button with confirmation
4. Create backend endpoint to regenerate token
5. Invalidate old token on regeneration
6. Email notification on token change

**Success Criteria:**
- Members can view their token
- Members can regenerate token
- Old token invalidated immediately
- Email notification sent

**Testing:**
- E2E test for token regeneration
- API test for token invalidation

**Deployment:** API + Member portal

**Dependencies:** None

---

#### 4.9 Member Contact Updates
**Priority:** LOW
**Effort:** 2 hours
**Risk:** Low

**Description:** Allow members to update contact information in member portal.

**Files to Create:**
- `member-portal/src/pages/ContactManagement.tsx`
- `api/src/functions/UpdateContact.ts`

**Technical Approach:**
1. Create contact management page
2. Display current contact info
3. Add edit form with validation
4. Create backend endpoint to update contacts
5. Audit log changes
6. Email confirmation on change

**Success Criteria:**
- Members can update contact info
- Validation enforced (email format, phone)
- Audit log entry created
- Confirmation email sent

**Testing:**
- E2E test for contact update
- Validation tests

**Deployment:** API + Member portal

**Dependencies:** None

---

#### 4.10 Member Endpoint Registration
**Priority:** LOW
**Effort:** 4 hours
**Risk:** Medium

**Description:** Allow members to register webhook endpoints for notifications.

**Files to Create:**
- `member-portal/src/pages/EndpointManagement.tsx`
- `api/src/functions/RegisterEndpoint.ts`
- `api/src/functions/TestEndpoint.ts`

**Technical Approach:**
1. Create endpoint management page
2. Add form to register webhook URL
3. Add endpoint verification (test ping)
4. Store endpoint in database
5. Add endpoint health monitoring
6. Notify member if endpoint unreachable

**Success Criteria:**
- Members can register endpoints
- Endpoint verification works
- Health monitoring active
- Notifications sent on failure

**Testing:**
- E2E test for endpoint registration
- API test for verification

**Deployment:** API + Member portal

**Dependencies:** None

---

#### 4.11 Newsletter Subscription Management
**Priority:** LOW
**Effort:** 3 hours
**Risk:** Low

**Description:** Allow members to manage newsletter subscriptions.

**Files to Create:**
- `member-portal/src/pages/SubscriptionManagement.tsx`
- `api/src/functions/UpdateSubscriptions.ts`

**Technical Approach:**
1. Create subscription management page
2. Display available newsletters
3. Add checkboxes for opt-in/opt-out
4. Create backend endpoint to update preferences
5. Audit log changes
6. Confirmation email on change

**Success Criteria:**
- Members can opt-in/opt-out of newsletters
- Preferences saved correctly
- Audit log entry created
- Confirmation email sent

**Testing:**
- E2E test for subscription management
- API test for preference updates

**Deployment:** API + Member portal

**Dependencies:** None

---

#### 4.12 Implement Regex Validation for International Identifiers
**Priority:** LOW
**Effort:** 4 hours
**Risk:** Low

**Description:** Add regex validation for each international company identifier type.

**Files to Create:**
- `api/src/utils/identifierValidation.ts`

**Files to Modify:**
- `api/src/functions/CreateMember.ts`
- `api/src/functions/UpdateMember.ts`

**Technical Approach:**
1. Research regex patterns for each identifier type:
   - KvK (NL): 8 digits
   - Companies House (UK): 8 characters
   - German: HRB + number
   - Belgian: 10 digits (0xxx.xxx.xxx)
   - French SIREN: 9 digits
2. Create validation function for each type
3. Add validation to member creation/update
4. Return clear error messages for invalid formats

**Success Criteria:**
- All identifier types validated
- Invalid formats rejected with clear messages
- Valid formats accepted

**Testing:**
- Unit tests for each validator
- API tests for validation

**Deployment:** API deployment

**Dependencies:** None

---

#### 4.13 Registry Verification UI (Admin Portal)
**Priority:** LOW
**Effort:** 6 hours
**Risk:** Low

**Description:** Add UI in admin portal to manually verify company identifiers.

**Files to Create:**
- `admin-portal/src/pages/RegistryVerification.tsx`
- `api/src/functions/VerifyIdentifier.ts`

**Technical Approach:**
1. Create registry verification page
2. Display unverified members
3. Add "Verify" button for manual verification
4. Create backend endpoint to mark as verified
5. Add notes field for verification comments
6. Audit log verification actions

**Success Criteria:**
- Admin can view unverified members
- Admin can manually verify identifiers
- Verification logged in audit trail
- Notes captured for reference

**Testing:**
- E2E test for verification workflow
- API test for verification endpoint

**Deployment:** API + Admin portal

**Dependencies:** None

---

### Phase 4 Summary
- **Total Tasks:** 13
- **Total Effort:** 52 hours
- **Risk Level:** Low-Medium
- **Deployment:** Multiple API + Portal deployments
- **Note:** Can be done incrementally over time

---

## Recommended Execution Order

### Sprint 1: Documentation & Quick Wins (1 day)
1. Document Orchestrator Portal security limitations (15 min)
2. Centralize Vite configuration (2h)
3. Remove 'unsafe-eval' from CSP (1-2h)
4. Implement structured logging (3h)

**Total:** 6.5-7.5 hours

---

### Sprint 2: Critical Security Implementation (1 day)
5. AUTH-001: Implement party ID resolution (3h)
6. Configure dynamic termsVersion (1h)
7. Test BVAD generation internationally (1h)
8. Test BVOD validation (1h)

**Total:** 6 hours

**⚠️ User Approval Required:** AUTH-001 is critical security feature

---

### Sprint 3: Backend Integrations (1-2 days)
9. Implement User Management API integration (4h)
10. BDI token E2E testing (4h)

**Total:** 8 hours

---

### Sprint 4: Testing & Quality (2-3 days)
11. Add comprehensive unit tests (16h)
12. Performance testing and optimization (8h)

**Total:** 24 hours

---

### Sprint 5: Code Architecture (1 week)
13. Create shared API client package (8h)
14. Add health check dashboards (4h)
15. Implement database transactions (4h)
16. Define API versioning strategy (2h)

**Total:** 18 hours

---

### Sprint 6: UX Enhancements (1 week)
17. L3: Audit trail/change history (6h)
18. L5: Contextual help system (3h)
19. L6: Progressive disclosure (2h)

**Total:** 11 hours

---

### Sprint 7: Member Portal Features (1 week)
20. Member self-service token management (4h)
21. Member contact updates (2h)
22. Member endpoint registration (4h)
23. Newsletter subscription management (3h)

**Total:** 13 hours

---

### Sprint 8: Data Validation & Registry (1 week)
24. Implement regex validation (4h)
25. Registry verification UI (6h)

**Total:** 10 hours

---

## Deferred Tasks (Require User Input/Approval)

### Task: Re-enable Strict MFA Checking
**Why Deferred:** Requires confirmation that Conditional Access policy is active in Azure AD.

**What's Needed:** User to verify in Azure Portal that Conditional Access is enforced.

**Estimated Effort:** 30 minutes once confirmed

---

### Task: BUG-008 Grid Pagination State Loss
**Why Deferred:** Significant refactoring with high risk, marked as P3 in ROADMAP.

**What's Needed:** User approval for major backend/frontend changes.

**Estimated Effort:** 4-6 hours

**Recommendation:** Complete higher-priority work first, revisit if UX complaints arise.

---

## Risk Assessment by Task

### High Risk (Requires User Approval)
- AUTH-001: Party ID resolution (core security)
- Create shared API client package (affects all portals)
- BUG-008: Grid pagination refactor (major changes)
- Re-enable strict MFA checking (may block users)

### Medium Risk
- Remove 'unsafe-eval' from CSP (may break functionality)
- User Management API integration (requires permissions)
- Database transactions (data integrity)
- Audit trail implementation (performance impact)
- Member endpoint registration (external dependencies)

### Low Risk
- All documentation tasks
- Testing tasks
- UI/UX enhancements
- Member portal features
- Validation improvements

---

## Dependencies & Blockers

### No Blockers
- 24 tasks can be completed immediately with no dependencies

### Potential Blockers
1. **User Management API** - May require Graph API permissions (Azure Portal)
2. **MFA Re-enable** - Requires Conditional Access policy confirmation
3. **Shared API Client** - High risk, recommend user approval

### External Dependencies
- None of the autonomous tasks require external service credentials

---

## Testing Strategy

### API Tests (Curl) - ALWAYS FIRST
```bash
# Test each API endpoint after changes
curl -H "Authorization: Bearer $TOKEN" \
  https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1/{endpoint}
```

### Unit Tests
```bash
cd api && npm test
cd admin-portal && npm test
cd member-portal && npm test
cd orchestrator-portal && npm test
```

### E2E Tests (Playwright)
```bash
cd web && npm run test:e2e
```

### Performance Tests
```bash
cd api/tests/performance && npm run load-test
```

---

## Deployment Strategy

### For Each Task
1. **Code changes** → Git commit
2. **API changes** → `func azure functionapp publish func-ctn-demo-asr-dev --typescript --build remote`
3. **Portal changes** → Git commit → Azure DevOps pipeline auto-deploys
4. **Database changes** → `psql "host=..." -f database/migrations/XXX.sql`
5. **Wait 2 minutes** → Verify deployment in Azure DevOps
6. **Test API with curl** → Before E2E tests
7. **Run E2E tests** → Verify functionality
8. **Invoke TE agent** → Autonomous bug investigation if failures
9. **Invoke TW agent** → Update documentation

---

## Post-Implementation Checklist

### After Each Sprint
- [ ] All code changes committed to Git
- [ ] All deployments verified in Azure DevOps
- [ ] API tests passing (curl)
- [ ] E2E tests passing (Playwright)
- [ ] Documentation updated (invoke TW agent)
- [ ] ROADMAP.md updated (move to COMPLETED_ACTIONS.md)
- [ ] No failing tests
- [ ] No console errors in browser
- [ ] No API errors in Azure logs

---

## Estimated Timeline

### Total Autonomous Work
- **91 hours** of development work
- **~12 working days** at 8 hours/day
- **~2.5 weeks** accounting for testing and deployment

### By Priority
- **HIGH:** 11.5 hours (1.5 days)
- **MEDIUM:** 36 hours (4.5 days)
- **LOW:** 43.5 hours (5.5 days)

### Realistic Timeline
- **Week 1:** Sprints 1-2 (Documentation + Security)
- **Week 2:** Sprints 3-4 (Integrations + Testing)
- **Week 3:** Sprints 5-6 (Architecture + UX)
- **Week 4:** Sprints 7-8 (Member Features + Validation)

---

## Success Metrics

### Code Quality
- 80% API test coverage
- 70% Portal test coverage
- All linting rules passing
- No TypeScript errors
- No console.log statements (use structured logging)

### Performance
- All API endpoints <500ms at 100 concurrent users
- Portal load time <2 seconds
- No memory leaks

### Security
- AUTH-001 implemented correctly
- All inputs validated
- No secrets in code
- Audit trail for all changes

### Documentation
- All new features documented
- API versioning strategy defined
- ROADMAP.md updated
- COMPLETED_ACTIONS.md maintained

---

## Next Steps

1. **User Approval Required:**
   - Review this plan
   - Approve HIGH-risk tasks (AUTH-001, Shared API client)
   - Confirm Conditional Access policy status (for MFA re-enable)
   - Decide on BUG-008 priority (deferred vs. sprint)

2. **Start Execution:**
   - Begin Sprint 1 (Documentation & Quick Wins)
   - Commit frequently (after each task)
   - Deploy and test after each task
   - Invoke agents (TE, TW, CR, SA) as needed

3. **Progress Tracking:**
   - Update ROADMAP.md after each sprint
   - Move completed tasks to COMPLETED_ACTIONS.md
   - Generate session summary after each day
   - Flag blockers immediately

---

## Summary

**Can Complete Autonomously:**
- 28 tasks (62% of roadmap)
- 91 hours of work
- 2.5-4 weeks depending on pace

**Cannot Complete Autonomously:**
- 17 tasks (38% of roadmap)
- 56 hours of work
- Requires Azure Portal access, external credentials, or manual operations

**Recommended Approach:**
1. Start with Sprint 1 (quick wins)
2. Get user approval for Sprint 2 (AUTH-001)
3. Execute Sprints 3-8 incrementally
4. Invoke agents (TE, TW, CR, SA, DE) throughout
5. Update documentation continuously

**Key Success Factor:**
Follow the autonomous operation principle - work end-to-end, commit frequently, test thoroughly, and only ask for approval on HIGH-risk changes.

---

*Generated by Coding Assistant (CA) Agent*
*Last Updated: October 19, 2025*
