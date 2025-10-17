# CTN ASR Roadmap

**Last Updated:** October 17, 2025 (Vite migration completed with authentication fix - zero npm vulnerabilities)

This file contains ALL pending actions. See [docs/COMPLETED_ACTIONS.md](./docs/COMPLETED_ACTIONS.md) for historical record.

---

## CRITICAL - Security (Do Immediately)

**Priority: P0 - Address before any other work**

- [ ] **Rotate PostgreSQL password** - Was exposed in Git history before cleanup (URGENT)
  - **Impact:** Password may exist in clones made before history cleanup
  - **Why still needed:** External clones/backups may contain exposed password
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

### P3 - Medium Priority Bugs

- [ ] **BUG-008: Grid pagination state loss** - Page resets to 1 on filter changes
  - **Severity:** Medium (UX) | **Priority:** P3
  - **Impact:** Poor UX when filtering large datasets
  - **Fix:** Implement server-side pagination with preserved state
  - **Estimate:** 2 hours
  - **Status:** Deferred due to complexity - Requires server-side pagination state management


---

## HIGH - Backend Integration & Production Readiness

**Priority: Complete before considering production-ready**

### Backend Integration TODOs

- [ ] **Implement IdentifierVerificationManager API endpoint** - Backend development required
  - **Location:** IdentifierVerificationManager.tsx:57 and :110
  - **Frontend Status:** Component well-documented with comprehensive TODO comments
  - **Backend Required:**
    - New database table: identifier_verification_history
    - New endpoints: GET/POST /v1/legal-entities/{id}/verifications
    - Azure Blob Storage integration for document uploads
    - Document Intelligence API integration for KvK/LEI/EUID extraction
  - **Why Not Implemented:** Frontend expects generic identifier verification for all types (KvK, LEI, EUID, HRB, etc.), but backend only supports KvK-specific verification via legal_entity table columns
  - **Estimate:** 3-4 hours backend work (database table + APIs + blob storage + document intelligence)
  - **Frontend Ready:** Component already displays upload button with warning that backend is needed

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

### Low Priority UI/UX (~11 hours remaining)

- [ ] **L3: Audit trail/change history** (6h) - Not yet implemented
- [ ] **L5: Contextual help system** (3h) - Not yet implemented
- [ ] **L6: Progressive disclosure for complex forms** (2h) - Not yet implemented

### Code Quality & Testing

- [ ] **Vite Configuration Improvements** - Follow-up from Vite migration (Code Reviewer recommendations)
  - **Priority:** P3 (downgraded from P2 - critical auth bug fixed)
  - **Tasks:**
    - ✅ Fixed environment variable undefined handling (CRITICAL auth bug resolved - Oct 17)
    - Create .gitignore for portal directory (currently missing)
    - Add NODE_ENV to portal/vite.config.ts for consistency with web
    - Consider environment variable validation in vite.config.ts
    - Update TypeScript build command to use `tsc --noEmit` for explicit type checking
  - **Estimate:** 1.5 hours (reduced from 2h - auth fix complete)
  - **Status:** Non-blocking improvements to enhance Vite setup. Authentication now working correctly in production.

- [ ] **Fix Biome code quality issues** - 185 errors + 92 warnings in web portal
  - **Priority:** P2
  - **Impact:** Code maintainability, accessibility, and best practices
  - **Categories:**
    - **Accessibility (HIGH):** 20+ label-without-control errors, keyboard navigation issues
    - **Code Smells (MEDIUM):** noUselessElse, useSelfClosingElements, noArrayIndexKey
    - **Type Safety (MEDIUM):** 5+ noExplicitAny warnings, useImportType suggestions
    - **Formatting (LOW):** Import organization, quote style inconsistencies
  - **Affected:** web/src/ directory (95 files checked)
  - **Estimate:** 6-8 hours
  - **Plan:**
    1. Fix accessibility issues first (4h) - Critical for WCAG compliance
    2. Fix type safety warnings (2h) - Replace 'any' with proper types
    3. Run 'biome check --fix' for auto-fixable issues (1h)
    4. Manual review of remaining warnings (1h)

- [ ] **Fix Biome code quality issues** - 43 errors + 5 warnings in member portal
  - **Priority:** P2
  - **Impact:** Code maintainability and accessibility
  - **Categories:**
    - **Accessibility (HIGH):** 10+ label-without-control errors
    - **Type Safety (MEDIUM):** 3 noExplicitAny warnings
    - **Code Quality (LOW):** noExcessiveCognitiveComplexity, useSelfClosingElements
  - **Affected:** portal/src/ directory (22 files checked)
  - **Estimate:** 3-4 hours
  - **Plan:**
    1. Fix accessibility issues (2h)
    2. Fix type safety warnings (1h)
    3. Auto-fix remaining issues (1h)

- [ ] **Implement database transactions** - For multi-step operations
  - **Estimate:** 4 hours
- [ ] **Define API versioning strategy**
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

**Total Remaining Tasks:** 49

**By Priority:**
- CRITICAL (P0): 3 tasks - Security issues requiring immediate attention
- HIGH (P1-P2): 10 tasks - Backend integration blockers and bugs
- MEDIUM: 15 tasks - Code quality, testing, monitoring improvements (Vite auth bug fixed)
- LOW: 21 tasks - Future enhancements and additional features

**Estimated Time to Complete:**
- CRITICAL: ~3.75 hours (npm vulnerabilities now resolved)
- HIGH: ~28-33 hours
- MEDIUM: ~53-56 hours (reduced from 54-57h - Vite auth fix complete)
- LOW: ~70 hours

---

## Notes

**Current Release Readiness:** 97%+ (all CRITICAL bugs resolved, standardization complete, internationalization improved)

**Security Priority:** PostgreSQL password rotation remains URGENT. All procedures documented in docs/SECURITY_AUDIT_REPORT.md.

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
