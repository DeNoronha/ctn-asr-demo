# Task Manager

**Purpose:** Track important tasks, refactoring needs, and technical debt that require attention.

**Last Updated:** November 14, 2025 (Automated via post-commit hook)

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
**Status:** Partially Complete (Duplicates fixed, further simplification needed)
**Priority:** Medium
**Estimated Effort:** 1-2 days

**Problem:**
The current schema has overcomplicated relationships with potential redundancy between:
- `party_reference` (base entity)
- `legal_entity` (organization details)
- `members` (unclear if still needed, potential duplication)

**Completed (November 13, 2025 - Migration 027):**
- ✅ Identified and fixed duplicate `legal_entity` rows for same `party_id`
- ✅ Created comprehensive cleanup script (migration 027_fix_duplicate_legal_entities.sql)
- ✅ Added UNIQUE constraint: `uq_legal_entity_party_id_active` on `(party_id) WHERE is_deleted = false`
- ✅ Fixed `v_m2m_credentials_active` view to prevent duplicate rows
- ✅ Added data quality CHECK constraints on legal_entity table

**Remaining Tasks:**

1. **Schema Simplification Analysis (Optional)**
   - [ ] Evaluate if `members` table is still needed or can be consolidated
   - [ ] Determine if further normalization is beneficial
   - [ ] Identify any remaining redundant columns across tables
   - [ ] Design migration path if simplification is pursued

**Impact:**
- **Low Risk:** Core duplicate issue is resolved with UNIQUE constraint
- **Optional Enhancement:** Further simplification is nice-to-have, not urgent

**Related Files:**
- `database/migrations/027_fix_duplicate_legal_entities.sql` - Duplicate cleanup
- `database/current_schema.sql`
- `api/src/middleware/keycloak-auth.ts` (party resolution)

**Notes:**
- ✅ UNIQUE constraint now prevents future duplicates
- ✅ All foreign key references updated to canonical legal_entity records
- ✅ Backup table created: `legal_entity_backup_20251113`

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

**Status:** Partially Complete
**Priority:** Low

**Completed (Migration 027 - November 13, 2025):**
- ✅ Added UNIQUE constraint on `legal_entity(party_id)` WHERE is_deleted = false
- ✅ Added CHECK constraint: `primary_legal_name` length >= 2
- ✅ Added CHECK constraint: `status` IN ('PENDING', 'ACTIVE', 'SUSPENDED', 'INACTIVE', 'REJECTED')

**Remaining Tasks (Optional):**
- [ ] Review all foreign key constraints for CASCADE vs RESTRICT
- [ ] Add partial indexes for additional soft-deleted tables (if needed)

---

## 🟢 Low Priority / Future Enhancements

### Architecture & Infrastructure Improvements

**Status:** Not Started
**Priority:** Low
**Source:** Desktop ROADMAP.md (November 10, 2025)

**Tasks:**

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

## 📋 Component Refactoring Backlog

### Remaining Large Components

**Status:** Not Started
**Priority:** Low
**Source:** Code Quality Review (November 13, 2025)

**Components to Split:**

#### API Functions (>400 lines)
- [ ] `ManageM2MClients.ts` (935 lines → 4 handlers + service)
- [ ] `EndpointRegistrationWorkflow.ts` (825 lines → 5 handlers + service)
- [ ] `registerMember.ts` (641 lines → handler + service)
- [ ] `uploadKvkDocument.ts` (431 lines → handler + service)

#### Admin Portal Components (>500 lines)
- [ ] `TasksGrid.tsx` (1,147 lines) - Extract filters, modals, custom hook
- [ ] `IdentifiersManager.tsx` (949 lines) - Extract form, row components, hook
- [ ] `MembersGrid.tsx` (709 lines) - Extract filters, actions, hook
- [ ] `MemberDetailView.tsx` (589 lines) - Extract 8 tab components + data hook

**Pattern:**
- Extract custom hooks (useMembers, useTasks, etc.)
- Extract filter/action components
- Extract modal dialogs
- Create service layers for business logic

---

## 📊 Code Quality Refactoring (5-Phase Plan)

**Status:** ✅ COMPLETE (November 13, 2025)

**Summary:**
- ✅ Phase 1: Foundation - Quick Wins (28 hours actual vs 36 hours estimated)
- ✅ Phase 2: Critical Path - Testing Framework (12 new tests, Jest configured)
- ✅ Phase 3: Database Optimization (Indexes added, N+1 queries optimized, guide created)
- ✅ Phase 4: Frontend Standardization (API client migration complete, LoadingState standardized, patterns guide created)
- ✅ Phase 5: Operational Documentation (Runbook created, deployment procedures documented)

**Deliverables Created:**
- ✅ `docs/DATABASE_OPTIMIZATION_GUIDE.md` (224 lines)
- ✅ `docs/FRONTEND_PATTERNS.md` (271 lines)
- ✅ `docs/OPERATIONAL_RUNBOOK.md` (325 lines)
- ✅ `api/src/utils/__tests__/errors.test.ts` (146 lines, 12 tests)
- ✅ `api/jest.config.js` + test infrastructure

**Key Achievements:**
- 62 API functions refactored to use `handleError()` utility
- All admin/member portal components migrated to `@ctn/api-client`
- All components migrated to `LoadingState` wrapper (11 components, 14 loading states)
- Database performance indexes added (50-80% improvement potential)
- N+1 query patterns optimized (generateBvad, GetAuthenticatedMember)
- 500+ lines of duplicate code eliminated
- Code health score improved: 4.2 → 5.0

**Reference Commits:**
- `c99736d` - Phase 1 Complete
- `f2aa132` - Phases 2-5 Complete
- `08afaae` - Performance indexes
- `14a139c`, `7ebf7a0` - N+1 optimizations
- `e76ccfe`, `a1fb0b1` - API client migrations
- `f7769a1` through `e3a9cf8` - LoadingState migrations (7 batches)

---

## 🎯 Next Actions

**Immediate (This Week):**
1. **CRITICAL:** Execute secret rotation tasks (SEC-ROTATE-001 through SEC-ROTATE-005)
2. Complete Azure Key Vault migration (2-3 hours)

**Short Term (Next 2 Weeks):**
1. Configure BDI production setup (RSA keys, testing)
2. Improve Admin Portal authentication test coverage
3. Set up monitoring & observability (Application Insights, alerts, dashboard)

**Long Term (Next Month):**
1. (Optional) Evaluate schema simplification for members table
2. Complete BDI E2E testing and external system registration
3. Investigate and fix KvK identifier bug
4. Define API versioning strategy
5. Create production service accounts for partners
6. Implement per-client rate limiting
7. Secret rotation policy implementation (90-day cycle)

---

## 🔧 How to Use This File

1. **Adding Tasks:**
   - Use clear, actionable task descriptions
   - Include priority, status, and estimated effort
   - Link to relevant files and documentation

2. **Updating Status:**
   - Change checkboxes from `[ ]` to `[x]` when complete
   - Last Updated date is auto-updated via post-commit hook
   - Move completed major sections to COMPLETED_ACTIONS.md

3. **Invoking Agents:**
   - **DE (Database Expert):** Schema analysis, migrations, performance
   - **SA (Security Analyst):** Security reviews, vulnerability scanning
   - **CR (Code Reviewer):** Code quality, best practices
   - **TE (Test Engineer):** Test creation, E2E testing

---

**Document Version:** 2.0
**Created:** November 13, 2025
**Last Major Revision:** November 14, 2025 (Removed completed Phase 1-5 details)
**Owner:** Development Team
