# CTN ASR Task Manager

**Last Updated:** November 19, 2025
**Status:** Active Development
**Next Review:** November 24, 2025

---

## Overview

This document tracks all actionable tasks from comprehensive codebase reviews conducted by specialized agents:
- **Code Reviewer (CR)** - Code quality, maintainability, technical debt
- **Security Analyst (SA)** - Security vulnerabilities, compliance, hardening
- **Design Analyst (DA)** - UI/UX, accessibility, responsive design
- **Database Expert (DE)** - Schema optimization, query performance, data integrity
- **DevOps Guardian (DG)** - Pipeline reliability, deployment safety, monitoring

**Total Tasks:** 50+ remaining
**Critical:** 5 (Secret Rotation) | **Medium:** 1 (deferred) | **Low:** 45+

---

## Critical Priority 🔴 (Security - Secret Rotation)

### Security - Secret Rotation (URGENT)

**Status:** Not Started
**Priority:** Critical
**Source:** Desktop ROADMAP.md (November 10, 2025)

**Context:** DG agent found exposed secrets in local.settings.json files during audit

**Tasks:**
- [ ] **SEC-ROTATE-001: Rotate PostgreSQL password** - CRITICAL
  - **Exposed in:** api/local.settings.json (gitignored but exists locally)
  - **Action:** Change in Azure Portal, update Key Vault, update local settings

- [ ] **SEC-ROTATE-002: Rotate Storage Account keys** - CRITICAL
  - **Exposed in:** api/local.settings.json
  - **Action:** Regenerate keys in Azure Portal, update Function App settings

- [ ] **SEC-ROTATE-003: Rotate KVK API Key** - HIGH
  - **Exposed in:** api/local.settings.json
  - **Action:** Request new key from KVK, update Key Vault

- [ ] **SEC-ROTATE-004: Rotate Anthropic API Key** - HIGH
  - **Exposed in:** booking-portal/api/local.settings.json
  - **Action:** Generate new key in Anthropic Console, update Key Vault

- [ ] **SEC-ROTATE-005: Rotate Cosmos DB keys (booking portal)** - HIGH
  - **Exposed in:** booking-portal/api/local.settings.json
  - **Action:** Regenerate in Azure Portal, update Function App settings

---

## Medium Priority 🟡 (Remaining tasks)

### Security (Medium)

### TASK-SEC-005: Harden CSP for Inline Styles
- **Category:** Security
- **Severity:** Medium
- **CVSS:** 5.3
- **File:** `admin-portal/public/staticwebapp.config.json:28`
- **Issue:** CSP allows `'unsafe-inline'` styles, weakening XSS protection
- **Impact:** Increased XSS risk if user input rendered in styles
- **Fix:** Generate SHA-256 hashes for Mantine inline styles, implement nonce-based CSP
- **Compliance:** OWASP A03:2021
- **Effort:** 8 hours (PLUS 11 hours refactoring prerequisite)
- **Status:** ⚠️ ANALYSIS COMPLETE - Implementation deferred pending refactoring of 317 React inline styles
- **Analysis:** Comprehensive security review completed (Batch 10), 3 analysis scripts created
- **Blocking Issue:** 109 HIGH risk inline styles must be refactored before CSP can be safely hardened
- **Assigned To:** TBD

---

## Low Priority 🟢 (Backlog / Nice-to-Have)

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

### Improve Authentication Test Coverage
- [ ] Fix test expecting login flow (design issue)
- [ ] Investigate API request timeouts
- [ ] Fix admin feature visibility checks
- **Impact:** Tests don't accurately reflect production behavior
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

- [ ] **Set BDI_KEY_ID in Function App Settings**

- [ ] **Test BVAD generation with international companies**

- [ ] **Test BVOD validation with sample orchestrations**

- [ ] **Register external BDI systems**
  - **Action:** Register DHL, Maersk, etc. in `bdi_external_systems` table

- [ ] **BDI token generation and validation E2E testing**
  - **Note:** Member portal is now stable and production-ready, can focus on BDI testing

---

### Monitoring & Observability

**Status:** Not Started
**Priority:** Medium
**Source:** Desktop ROADMAP.md (November 10, 2025)
**Estimated Effort:** 12 hours

**Tasks:**
- [ ] **Configure Application Insights telemetry**
  - **Action:** Set up detailed metrics

- [ ] **Set up alerting rules**
  - **Action:** Configure alerts for failed requests, slow queries, errors

- [ ] **Create operational dashboard**
  - **Action:** Build dashboard in Azure Monitor

- [ ] **Configure Alert Action Groups**
  - **Action:** Add email/SMS notifications for alerts

- [ ] **Instrument Remaining API Functions**
  - **Action:** Add telemetry to 30+ additional functions

---

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
- [ ] **Priority:** LOW - Time-consuming, low-impact task

---

### Keycloak M2M Authentication - Production Readiness

**Status:** Core Implementation Complete (November 13, 2025)

**Remaining Production Tasks:**
- [ ] Create additional service accounts for production partners
- [ ] Implement per-client rate limiting (Azure APIM or custom middleware)
- [ ] Set up monitoring dashboard for M2M usage metrics
- [ ] Configure alerting for failed authentication attempts
- [ ] Implement secret rotation policy (90-day cycle)
- [ ] Create partner onboarding documentation/portal
- [ ] Load testing with concurrent M2M requests (TE agent)

---

### Component Refactoring Backlog

**Status:** Not Started
**Priority:** Low
**Source:** Code Quality Review (November 13, 2025)

**Components to Split:**

#### API Functions (>400 lines)
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

### Code Quality (Low)

### TASK-CR-008: Improve Type Safety - Custom Error Classes
- **Category:** Code Quality / Type Safety
- **Severity:** Low
- **File:** `admin-portal/src/services/graphService.ts:82-84`
- **Issue:** Using `any` escape hatch for error properties
- **Fix:** Define `ConsentRequiredError` class extending Error
- **Effort:** 2 hours
- **Assigned To:** TBD

### TASK-CR-009: Performance Optimization - N+1 Query Pattern in Graph Service
- **Category:** Code Quality / Performance
- **Severity:** Low
- **File:** `admin-portal/src/services/graphService.ts:243-274`
- **Issue:** Loop fetching individual users instead of batch request
- **Fix:** Use `$batch` endpoint for parallel user fetching
- **Effort:** 4 hours
- **Assigned To:** TBD

### TASK-CR-010: Improved Logging - Structured Logging with Correlation IDs
- **Category:** Code Quality / Observability
- **Severity:** Low
- **File:** `admin-portal/src/services/graphService.ts`
- **Issue:** Simple console logging without correlation
- **Fix:** Add correlation IDs and structured metadata to all log statements
- **Effort:** 3 hours
- **Assigned To:** TBD

### TASK-CR-011: API Client Architecture - Split Monolithic Service File
- **Category:** Code Quality / Architecture
- **Severity:** Low
- **File:** `admin-portal/src/services/apiV2.ts` (832 lines)
- **Issue:** Monolithic service file mixing types, API calls, utilities
- **Fix:** Split into focused modules (client.ts, types.ts, members.ts, etc.)
- **Effort:** 6 hours
- **Assigned To:** TBD

### TASK-CR-012: Remove Array.from() Conversion Pattern
- **Category:** Code Quality
- **Severity:** Low
- **File:** `admin-portal/src/services/graphService.ts:243, 260, 268`
- **Issue:** Unnecessary Array.from() conversions for Map/Set iteration
- **Fix:** Use direct iteration (Maps/Sets are already iterable)
- **Effort:** 1 hour
- **Assigned To:** TBD

### Security (Low)

### TASK-SEC-006: Implement Error Message Sanitization
- **Category:** Security / Information Disclosure
- **Severity:** Low
- **CVSS:** 3.7
- **Files:** Multiple API endpoints
- **Issue:** Verbose error messages leak implementation details
- **Fix:** Create `sanitizeErrorMessage()` utility, replace verbose errors with codes
- **Compliance:** OWASP A04:2021
- **Effort:** 6 hours
- **Assigned To:** TBD

### TASK-SEC-007: Add Rate Limiter Circuit Breaker
- **Category:** Security / Reliability
- **Severity:** Low
- **CVSS:** 3.1
- **File:** `api/src/middleware/rateLimiter.ts:205-209`
- **Issue:** Rate limiter fails open on errors
- **Fix:** Implement error threshold circuit breaker, replace in-memory limiter with Redis
- **Compliance:** OWASP A04:2021
- **Effort:** 12 hours
- **Assigned To:** TBD

### TASK-SEC-008: Implement Audit Log PII Pseudonymization
- **Category:** Security / Compliance
- **Severity:** Low
- **CVSS:** 2.7
- **File:** `api/src/middleware/auditLog.ts`
- **Issue:** Audit logs contain PII without pseudonymization
- **Fix:** Implement email/IP pseudonymization, 90-day retention policy, encryption at rest
- **Compliance:** GDPR Art. 5(1)(c), SOC 2 CC6.7
- **Effort:** 16 hours
- **Assigned To:** TBD

### TASK-SEC-009: Add Missing HTTP Security Headers
- **Category:** Security / Hardening
- **Severity:** Low
- **CVSS:** 3.7
- **File:** `admin-portal/public/staticwebapp.config.json`
- **Issue:** Missing defense-in-depth headers (COEP, COOP, CORP)
- **Fix:** Add Cross-Origin-Embedder-Policy, Cross-Origin-Opener-Policy headers
- **Compliance:** OWASP A05:2021
- **Effort:** 4 hours
- **Assigned To:** TBD

### UI/UX (Low)

### TASK-DA-011: User Management - Bulk Actions
- **Category:** UX/UI / Enhancement
- **Severity:** Low
- **Component:** `UserManagement.tsx`
- **Issue:** No bulk operations (enable/disable multiple users)
- **Fix:** Add checkbox selection and bulk action menu
- **Effort:** 8 hours
- **Assigned To:** TBD

### TASK-DA-012: Audit Log Viewer - Export Format Options
- **Category:** UX/UI / Enhancement
- **Severity:** Low
- **Component:** `AuditLogViewer.tsx`
- **Issue:** Only exports JSON, non-technical users prefer Excel
- **Fix:** Add CSV and Excel export using `xlsx` library
- **Effort:** 4 hours
- **Assigned To:** TBD

### TASK-DA-013: Dark Mode Compatibility - Badge Colors
- **Category:** UX/UI / Enhancement
- **Severity:** Low
- **File:** `UserManagement.css`
- **Issue:** Custom badge colors don't adapt to dark mode
- **Fix:** Use Mantine theme colors instead of custom CSS
- **Effort:** 2 hours
- **Assigned To:** TBD

### TASK-DA-014: User Management - Confirmation Dialogs for Destructive Actions
- **Category:** UX/UI / Safety
- **Severity:** Low
- **Component:** `UserManagement.tsx`
- **Issue:** No confirmation before disabling users or revoking permissions
- **Fix:** Add ConfirmDialog component before destructive actions
- **Effort:** 3 hours
- **Assigned To:** TBD

### TASK-DA-015: Keyboard Shortcuts
- **Category:** UX/UI / Enhancement
- **Severity:** Low
- **Component:** All portals
- **Issue:** No keyboard shortcuts for frequent actions
- **Fix:** Add Ctrl+K for search, Ctrl+N for new user, etc.
- **Effort:** 6 hours
- **Assigned To:** TBD

### Database (Low)

### TASK-DE-005: Add Index on audit_log.action Column
- **Category:** Database / Performance
- **Severity:** Low
- **Table:** `audit_log`
- **Issue:** Missing index on frequently filtered column
- **Fix:** `CREATE INDEX idx_audit_log_action ON audit_log(action);`
- **Migration Required:** Yes (simple index creation)
- **Effort:** 15 minutes
- **Assigned To:** TBD

### TASK-DE-006: Add Connection Pool Metrics Logging
- **Category:** Database / Monitoring
- **Severity:** Low
- **File:** `api/src/utils/database.ts`
- **Issue:** No visibility into connection pool utilization
- **Fix:** Add event handlers for 'connect', 'acquire', 'remove' events
- **Migration Required:** No (code change only)
- **Effort:** 30 minutes
- **Assigned To:** TBD

### TASK-DE-007: Add Partial Index for Active Endpoints
- **Category:** Database / Performance
- **Severity:** Low
- **Table:** `legal_entity_endpoint`
- **Issue:** Index includes soft-deleted records
- **Fix:** `CREATE INDEX idx_legal_entity_endpoint_active_not_deleted ON legal_entity_endpoint(legal_entity_id) WHERE is_active = true AND is_deleted = false;`
- **Migration Required:** Yes (`034_optimize_endpoint_indexes.sql`)
- **Effort:** 1 hour
- **Assigned To:** TBD

### DevOps (Low)

### TASK-DG-DEPLOY-001: Implement Azure Static Web Apps Deployment Slots
- **Category:** DevOps / Safety
- **Severity:** Low
- **Files:** Admin and Member portal pipelines
- **Issue:** No blue-green deployment, instant production cutover
- **Fix:** Create staging deployment slots, add smoke tests before swap
- **Effort:** 8 hours
- **Assigned To:** TBD

### TASK-DG-DEPLOY-002: Implement Azure Functions Deployment Slots
- **Category:** DevOps / Safety
- **Severity:** Low
- **File:** `.azure-pipelines/asr-api.yml`
- **Issue:** Direct production deployment, no rollback capability
- **Fix:** Deploy to staging slot, run health checks, swap to production
- **Effort:** 6 hours
- **Assigned To:** TBD

### TASK-DG-ROLLBACK-001: Automated Rollback Mechanism
- **Category:** DevOps / Safety
- **Severity:** Low
- **Files:** All deployment pipelines
- **Issue:** Manual rollback required for failed deployments
- **Fix:** Implement automated rollback on health check failure
- **Effort:** 8 hours
- **Assigned To:** TBD

### TASK-DG-MONITOR-001: Implement DORA Metrics Collection
- **Category:** DevOps / Observability
- **Severity:** Low
- **Files:** Azure DevOps dashboards
- **Issue:** No tracking of deployment frequency, lead time, MTTR, change failure rate
- **Fix:** Create Azure DevOps dashboard with DORA metrics widgets
- **Effort:** 4 hours
- **Assigned To:** TBD

### TASK-DG-MONITOR-002: Add Deployment Alerts
- **Category:** DevOps / Observability
- **Severity:** Low
- **Files:** Azure Monitor alert rules
- **Issue:** No automated alerts for deployment failures
- **Fix:** Configure Azure Monitor alerts for failed deployments, send to Teams channel
- **Effort:** 2 hours
- **Assigned To:** TBD

### TASK-DG-TEST-001: Add Unit Test Integration to Pipelines
- **Category:** DevOps / Quality
- **Severity:** Low
- **Files:** Admin and Member portal pipelines
- **Issue:** Unit tests exist but not run in CI/CD
- **Fix:** Add Vitest test step, publish JUnit XML results
- **Effort:** 3 hours
- **Assigned To:** TBD

---

## Review Schedule

- **Weekly:** Review Critical and High priority tasks
- **Bi-weekly:** Review Medium priority tasks
- **Monthly:** Review Low priority tasks and backlog grooming
- **Quarterly:** Comprehensive codebase review by all agents

---

## Notes

- All CVSS scores use CVSS v3.1 calculator
- WCAG compliance targets WCAG 2.1 Level AA
- GDPR compliance tasks reviewed by legal (TBD)
- SOC 2 compliance tasks reviewed by auditor (TBD)
- Migration files follow sequential numbering (032, 033, 034, etc.)

**Last Agent Review:**
- Code Reviewer: November 16, 2025 (Batch 9: CR-004)
- Security Analyst: November 17, 2025 (Batch 10: SEC-005 analysis)
- Design Analyst: November 16, 2025 (Batch 7: DA-010)
- Database Expert: November 17, 2025 (Batch 11: DE-004)
- DevOps Guardian: November 17, 2025 (Batch 11: DG-VARS-001)
