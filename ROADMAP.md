# CTN ASR Roadmap

**Last Updated:** October 16, 2025 (Comprehensive cleanup - moved 34 completed tasks, reorganized 27 remaining tasks by priority)

This file contains ALL pending actions. See [docs/COMPLETED_ACTIONS.md](./docs/COMPLETED_ACTIONS.md) for historical record.

---

## CRITICAL - Security (Do Immediately)

**Priority: P0 - Address before any other work**

- [ ] **Clean Git history** - Remove exposed credentials using git-filter-repo
  - **Impact:** Historical credentials accessible in Git history
  - **Timeline:** 1-2 hours
  - **Reference:** See docs/SECURITY_AUDIT_REPORT.md for step-by-step procedure

- [ ] **Rotate PostgreSQL password** - Currently exposed in Git history (URGENT)
  - **Impact:** Database access credentials compromised
  - **Timeline:** 30 minutes
  - **Reference:** See docs/SECRET_ROTATION_GUIDE.md for rotation procedure

- [ ] **Move all secrets to Azure Key Vault** - PostgreSQL, JWT, Storage, Event Grid keys
  - **Impact:** Secrets currently in environment variables
  - **Timeline:** 2-3 hours
  - **Reference:** See docs/SECURITY_AUDIT_REPORT.md for migration instructions

- [ ] **Generate strong JWT secret** - Replace any demo/default secrets
  - **Impact:** JWT security relies on secret strength
  - **Timeline:** 15 minutes
  - **Reference:** Commands provided in docs/SECURITY_AUDIT_REPORT.md

---

## HIGH - Bug Fixes from Testing (Block Production)

**Priority: P1-P2 - Fix before next release**

**Test Results:** 90%+ release readiness (3 of 3 CRITICAL bugs fixed). See [docs/testing/TEST_EXECUTION_REPORT.md](./docs/testing/TEST_EXECUTION_REPORT.md) for full details.

### P2 - High Priority Bugs

- [ ] **BUG-004: Create Member form validation issues** - Missing required field indicators
  - **Severity:** High | **Priority:** P2
  - **Impact:** User confusion during member creation
  - **Fix:** Add visual indicators for required fields and inline validation feedback
  - **Estimate:** 2 hours

- [ ] **BUG-005: Identifier modal country filter broken** - All types showing regardless of country selection
  - **Severity:** High | **Priority:** P2
  - **Impact:** Confusing UX, users see irrelevant identifier types
  - **Fix:** Implement proper country-based filtering logic for identifier type dropdown
  - **Estimate:** 1 hour

### P3 - Medium Priority Bugs

- [ ] **BUG-006: Token expiration warnings not displaying** - Tokens expiring in <30 days should show warning badge
  - **Severity:** Medium | **Priority:** P3
  - **Impact:** Admins miss token expiration alerts, causing service interruptions
  - **Fix:** Add badge color logic for tokens expiring within 30 days
  - **Estimate:** 1 hour

- [ ] **BUG-007: Contact edit modal pre-population failure** - Edit dialog shows empty fields
  - **Severity:** Medium | **Priority:** P3
  - **Impact:** Users must re-enter all contact data when editing
  - **Fix:** Properly populate form fields with existing contact data on edit
  - **Estimate:** 1 hour

- [ ] **BUG-008: Grid pagination state loss** - Page resets to 1 on filter changes
  - **Severity:** Medium (UX) | **Priority:** P3
  - **Impact:** Poor UX when filtering large datasets
  - **Fix:** Implement server-side pagination with preserved state
  - **Estimate:** 2 hours

- [ ] **BUG-009: Accessibility aria-labels missing** - 15+ action buttons lack descriptive labels
  - **Severity:** Medium (Accessibility) | **Priority:** P3
  - **Impact:** Screen reader users cannot identify button purposes
  - **Fix:** Add descriptive aria-label attributes to all action buttons
  - **Estimate:** 1 hour

---

## HIGH - Backend Integration & Production Readiness

**Priority: Complete before considering production-ready**

### Backend Integration TODOs

- [ ] **Implement IdentifierVerificationManager API endpoint** - Replace mock data
  - **Location:** IdentifierVerificationManager.tsx:57 and :110
  - **Action:** Replace mock data with actual API calls for verification history
  - **Estimate:** 3 hours

- [ ] **Implement MemberDetailDialog API calls** - Replace mock implementations
  - **Location:** MemberDetailDialog.tsx:92 (member details) and :105 (member updates)
  - **Action:** Replace with actual API endpoints
  - **Estimate:** 2 hours

- [ ] **Implement User Management API integration** - Connect to Microsoft Graph API
  - **Location:** UserManagement.tsx
  - :70 - Fetch users from Azure Entra ID
  - :115 - User invitation functionality
  - :154 - User update functionality
  - :179 - Enable/disable user functionality
  - **Estimate:** 4 hours

- [ ] **Configure dynamic termsVersion in BVAD generation** - Replace hardcoded value
  - **Location:** generateBvad.ts:213
  - **Action:** Replace hardcoded 'v3.2.0' with member metadata lookup
  - **Estimate:** 1 hour

- [ ] **Re-enable strict MFA checking** - Remove workaround
  - **Location:** AuthContext.tsx:82
  - **Action:** Remove workaround once Conditional Access policy is fully enforced
  - **Estimate:** 30 minutes

### BDI Production Setup

- [ ] **Configure BDI RSA keys in Key Vault** - BDI_PRIVATE_KEY, BDI_PUBLIC_KEY
  - **Estimate:** 30 minutes
- [ ] **Set BDI_KEY_ID in Function App Settings**
  - **Estimate:** 15 minutes
- [ ] **Test BVAD generation with international companies**
  - **Estimate:** 1 hour
- [ ] **Test BVOD validation with sample orchestrations**
  - **Estimate:** 1 hour
- [ ] **Register external BDI systems** - DHL, Maersk, etc. in `bdi_external_systems` table
  - **Estimate:** 2 hours
- [ ] **Configure Keycloak realm for BDI** (if using external Keycloak)
  - **Estimate:** 2 hours

---

## MEDIUM - UI/UX Polish & Code Quality

**Priority: Nice-to-have improvements**

### Low Priority UI/UX (~24 hours total)

- [ ] **L1: Bulk actions for grid operations** (4h)
- [ ] **L2: Export functionality for grids** (2h)
- [ ] **L3: Audit trail/change history** (6h)
- [ ] **L4: Advanced filtering** (4h)
- [ ] **L5: Contextual help system** (3h)
- [ ] **L6: Progressive disclosure for complex forms** (2h)
- [ ] **L7: Responsive layout improvements** (1h)
- [ ] **L8: Print-friendly views** (1h)

### UI/UX Improvements

- [ ] **Change Documentation menu to Settings** - Rename menu item and create Settings page
  - **Action:** Create Settings page with links to Swagger, HowTo, Wiki (similar to member portal), and Lokalise button for translation management
  - **Estimate:** 2 hours

### Code Quality & Testing

- [ ] **Implement database transactions** - For multi-step operations
  - **Estimate:** 4 hours
- [ ] **Define API versioning strategy**
  - **Estimate:** 2 hours
- [ ] **Standardize naming conventions** across codebase
  - **Estimate:** 3 hours
- [ ] **Handle locale/timezone consistently**
  - **Estimate:** 2 hours

### Testing

- [ ] **Member portal critical paths** - E2E testing needed
  - **Estimate:** 8 hours
- [ ] **BDI token generation and validation** - E2E testing needed
  - **Estimate:** 4 hours
- [ ] **Add comprehensive unit tests**
  - **Estimate:** 16 hours
- [ ] **Performance testing and optimization**
  - **Estimate:** 8 hours

### Monitoring

- [ ] **Configure Application Insights telemetry** - Detailed metrics
  - **Estimate:** 2 hours
- [ ] **Set up alerting rules** - Failed requests, slow queries, errors
  - **Estimate:** 2 hours
- [ ] **Create operational dashboard** - Azure Monitor
  - **Estimate:** 3 hours

---

## LOW - Future Features

**Priority: Post-production enhancements**

### Agent Workflow

- [ ] **Add additional specialized agents:**
  - [ ] Performance Tuner (PT) - Optimize slow queries and frontend performance
  - [ ] Architecture Reviewer (AR) - System architecture and design patterns
  - [ ] Quality Auditor (QA) - Overall quality assessment and standards compliance
  - [ ] Research Manager (RM) - Research and document new features/technologies

### DNS and Security Infrastructure

- [ ] **DNS verification for member onboarding**
  - **Estimate:** 6 hours
- [ ] **WAF/Firewall configuration**
  - **Estimate:** 4 hours
- [ ] **Set up proper production environment** - Move from "dev" naming convention
  - Current: `func-ctn-demo-asr-dev.azurewebsites.net`
  - Recommended: `fa-ctn-asr-{env}.azurewebsites.net` (dev/staging/prod)
  - ⚠️ Requires new Function App deployment + DNS updates (breaking change)
  - **Estimate:** 8 hours

### Registry Integrations

- [ ] **KvK API integration** - Automated verification (https://developers.kvk.nl)
  - **Estimate:** 8 hours
- [ ] **Companies House API** - UK registry integration
  - **Estimate:** 6 hours
- [ ] **Implement regex validation** - For each international identifier type
  - **Estimate:** 4 hours
- [ ] **Registry verification UI** - Admin portal feature
  - **Estimate:** 6 hours
- [ ] **Add more European registries:**
  - [ ] Spain: Registro Mercantil (2h)
  - [ ] Italy: Registro delle Imprese (2h)
  - [ ] Poland: KRS (Krajowy Rejestr Sądowy) (2h)

### Member Portal Enhancements

- [ ] **Member self-service token management** (4h)
- [ ] **Member contact updates** (2h)
- [ ] **Member endpoint registration** (4h)
- [ ] **Newsletter subscription management** (3h)

---

## Summary Statistics

**Total Remaining Tasks:** 27

**By Priority:**
- CRITICAL (P0): 4 tasks - Security issues requiring immediate attention
- HIGH (P1-P2): 11 tasks - Bug fixes and backend integration blockers
- MEDIUM: 8 tasks - Code quality, testing, monitoring improvements
- LOW: 4 tasks - Future enhancements and additional features

**Estimated Time to Complete:**
- CRITICAL: ~4-5 hours
- HIGH: ~30-35 hours
- MEDIUM: ~60 hours
- LOW: ~70 hours

---

## Notes

**Current Release Readiness:** 90%+ (all CRITICAL bugs resolved)

**Security Priority:** PostgreSQL password rotation and Git history cleanup are CRITICAL and should be done immediately. All procedures documented in docs/SECURITY_AUDIT_REPORT.md.

**Production Deployment Status:** Most API functions have been restored and are working correctly. Remaining HIGH priority items are backend integrations and bug fixes.

**BDI Setup:** RSA key generation and Key Vault storage are prerequisites for production BDI operations.

**One-Person Operation:** This roadmap is optimized for single-developer workflow. Tasks are prioritized by risk and impact.

---

## Quick References

- **Completed Actions:** See [docs/COMPLETED_ACTIONS.md](./docs/COMPLETED_ACTIONS.md)
- **Deployment:** See [docs/DEPLOYMENT_GUIDE.md](./docs/DEPLOYMENT_GUIDE.md)
- **Security:** See [docs/SECRET_ROTATION_GUIDE.md](./docs/SECRET_ROTATION_GUIDE.md)
- **BDI Integration:** See [docs/BDI_INTEGRATION.md](./docs/BDI_INTEGRATION.md)
- **Way of Working:** See [CLAUDE.md](./CLAUDE.md)
