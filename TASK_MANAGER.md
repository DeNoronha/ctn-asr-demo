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



### Database Schema Simplification

**Status:** Not Started
**Priority:** Low
**Estimated Effort:** 1-2 days

**Note:** Duplicate legal_entity issue was fixed in Migration 027 (November 13, 2025). This task is optional further optimization.

**Problem:**
Potential redundancy between `party_reference`, `legal_entity`, and `members` tables. May benefit from further normalization.

**Tasks:**
- [ ] Evaluate if `members` table is still needed or can be consolidated
- [ ] Determine if further normalization is beneficial
- [ ] Identify any remaining redundant columns across tables
- [ ] Design migration path if simplification is pursued

---

#### Improve Authentication Test Coverage
- [ ] Fix test expecting login flow (design issue)
- [ ] Investigate API request timeouts
- [ ] Fix admin feature visibility checks
- **Impact:** Tests don't accurately reflect production behavior
- **Timeline:** 2 hours
- **Priority:** P1 - HIGH (Next Sprint)

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

#### Add Metadata Headers to All Documentation Files
- [ ] **Issue:** Files have stable names but no "Last Updated" metadata at document top
- [ ] **Solution:** Add structured metadata headers (Last Updated, Status, Version) to all markdown files
- [ ] **Scope:** Apply to all 66+ documentation files
- [ ] **Timeline:** 4-6 hours (52+ files)
- [ ] **Priority:** LOW - Time-consuming, low-impact task

---

### Keycloak M2M Authentication - Production Readiness

**Status:** ✅ Core Implementation Complete (November 13, 2025)

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
