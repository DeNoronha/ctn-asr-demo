# Post-Migration Tasks - Kendo UI → Mantine v8

**Date:** November 2, 2025
**Migration Status:** Complete (all 4 portals)
**Agent Reviews:** Code Reviewer (CR), Security Analyst (SA), Test Engineer (TE)

---

## Executive Summary

After completing the Kendo UI → Mantine v8 migration across all 4 portals, three specialized agents reviewed the codebase and identified actionable improvements. This document provides detailed findings and remediation guidance.

**Quick Stats:**
- **Security Issues:** 8 (3 Critical, 5 High)
- **Code Quality Issues:** 15 (Important improvements)
- **Test Failures:** 24 E2E test files need selector updates
- **Missing Tests:** 5 new Mantine component categories

**All findings have been added to ~/Desktop/ROADMAP.md** organized by priority.

---

## 1. Security Analyst (SA) Findings

### 🔴 HIGH Priority (Fix This Week)

#### SA-001: xlsx Package Vulnerabilities
**CVE:** CVE-2024 Prototype Pollution + ReDoS
**Location:** admin-portal/src/components/MembersGrid.tsx:210-233
**Current:** xlsx@0.18.5
**Replacement:** exceljs
**Impact:** Critical security vulnerability in Excel export
**Effort:** 2 hours
**ROADMAP:** SEC-VUL-001

#### SA-002: validator.js URL Validation Bypass
**Location:** admin-portal package.json
**Issue:** Outdated validator.js with known bypass vulnerability
**Impact:** Input validation weakness
**Effort:** 1 hour
**ROADMAP:** SEC-VUL-002

#### SA-003: Console Logging in Production
**Location:** All portals (33 console.log in admin portal alone)
**Issue:** console.log/debug/info statements leak sensitive data in production
**Impact:** Information disclosure risk
**Effort:** 2 hours
**Action:** Implement terser plugin to strip console statements
**ROADMAP:** SEC-VUL-003

### 🟠 Improvements

#### SA-004: dangerouslySetInnerHTML XSS Risk
**Location:** admin-portal/src/components/MembersGrid.tsx:288, 361
**Issue:** Rendering user-provided content as HTML
**Impact:** Potential script injection
**Effort:** 1 hour
**ROADMAP:** SEC-XSS-001

#### SA-005: Subresource Integrity (SRI)
**Location:** All portals using unpkg.com for Mantine CSS
**Issue:** CDN compromise risk
**Action:** Add SRI hashes OR self-host Mantine CSS
**Effort:** 2 hours
**ROADMAP:** SEC-SRI-001

#### SA-006: Rate Limiting Headers Logging
**Impact:** Monitor for abuse/attacks
**Effort:** 1 hour
**ROADMAP:** SEC-RATE-001

#### SA-007: Content-Type Validation
**Impact:** Prevent content smuggling attacks
**Effort:** 2 hours
**ROADMAP:** SEC-TYPE-001

#### SA-008: Security Headers E2E Testing
**Impact:** Automated CSP/HSTS/X-Frame-Options validation
**Effort:** 2 hours
**ROADMAP:** SEC-TEST-001

---

## 2. Code Reviewer (CR) Findings

### 🔶 Important Improvements

#### CR-001: Excessive CSS Specificity
**Location:** admin-portal/src/components/MembersGrid.css:7-88
**Issue:** "Nuclear" selectors with !important declarations
**Example:** `.mantine-DataTable-root .mantine-Popover-dropdown .mantine-Menu-item:hover`
**Impact:** CSS maintainability, specificity wars
**Effort:** 2 hours
**ROADMAP:** CQ-CSS-001

#### CR-002: XSS Risk with dangerouslySetInnerHTML
**Location:** admin-portal/src/components/MembersGrid.tsx:288, 361
**Issue:** Same as SA-004 (cross-finding)
**ROADMAP:** SEC-XSS-001

#### CR-003: Missing Error Boundaries
**Location:** All portals using mantine-datatable
**Issue:** Grid errors crash entire page
**Impact:** Poor user experience on errors
**Effort:** 3 hours
**ROADMAP:** CQ-ERR-001

#### CR-004: Mixing Tailwind + Mantine
**Location:** orchestrator-portal/src/components/OrchestrationsPage.tsx
**Issue:** Inconsistent styling approach
**Impact:** Maintainability, bundle size
**Effort:** 3 hours
**ROADMAP:** CQ-STYLE-001

#### CR-005: Missing useCallback for Event Handlers
**Location:** member-portal/src/components/M2MClientsView.tsx
**Issue:** Inline functions causing unnecessary child re-renders
**Impact:** Performance
**Effort:** 3 hours (15+ components affected)
**ROADMAP:** PERF-002

#### CR-006: Inconsistent Date Formatting
**Location:** booking-portal/src/components/Bookings.tsx:86
**Issue:** Mixed date formats
**Effort:** 1 hour
**ROADMAP:** CQ-DATE-001

#### CR-007: Large Component Files
**Location:** admin-portal/src/components/MembersGrid.tsx (847 lines)
**Issue:** Component too large for maintainability
**Effort:** 3 hours
**ROADMAP:** CQ-COMP-001

#### CR-008: Missing React.memo
**Location:** MembersGrid, IdentifiersManager, grid cell renderers
**Issue:** Expensive components re-rendering unnecessarily
**Effort:** 2 hours
**ROADMAP:** PERF-001

#### CR-009: Inefficient Re-renders
**Location:** 15+ components with inline functions
**Issue:** Same as CR-005 (broader scope)
**ROADMAP:** PERF-002

#### CR-010: Missing Loading States
**Location:** All manager components
**Issue:** "Loading..." text not ideal UX
**Effort:** 2 hours
**ROADMAP:** PERF-003

### 💡 Suggestions (Nice to Have)

#### CR-011: Extract Common DataTable Configuration
**Impact:** Reduce code duplication across 4 portals
**Effort:** 4 hours
**ROADMAP:** CQ-SHARED-001

#### CR-012: Add Skeleton Loaders
**Impact:** Better perceived performance
**Effort:** 2 hours
**ROADMAP:** PERF-003

#### CR-013: Replace HTML Inputs with Mantine
**Location:** Orchestrator portal
**Impact:** Consistent UI patterns
**Effort:** 2 hours
**ROADMAP:** CQ-INPUT-001

#### CR-014: Bundle Size Optimization
**Location:** Booking portal (740KB)
**Effort:** 3 hours
**ROADMAP:** PERF-004

#### CR-015: Remove Legacy console.log
**Location:** admin-portal (33 found)
**Effort:** 1 hour
**ROADMAP:** CQ-CLEAN-001

---

## 3. Test Engineer (TE) Findings

### ❌ Test Failures (24 files)

#### Admin Portal (17 files need updates)

**High Priority:**
1. **admin-portal/e2e/admin-portal-improved.spec.ts**
   - Lines: 90, 94, 131, 231, 239
   - Issue: `.k-grid` selectors
   - Fix: Replace with `.mantine-DataTable-root` or `[role="table"]`

2. **admin-portal/e2e/admin-portal/member-management.spec.ts**
   - Issue: Kendo grid selectors throughout

3. **admin-portal/e2e/admin-portal/grid-pagination.spec.ts**
   - Issue: `.k-pager` → `.mantine-Pagination-root`

4. **admin-portal/e2e/admin-portal/managers-crud.spec.ts**
   - Lines: 27-31, 140, 198, 251, 295, 328
   - Issue: `.k-grid`, `.k-invalid`, `.k-dialog`

**Medium Priority:** 13 additional files
- admin-portal/e2e/urgent/add-kvk-to-contargo.spec.ts
- admin-portal/e2e/urgent/add-kvk-95944192-fixed.spec.ts
- admin-portal/e2e/bug-investigation/member-grid-row-click.spec.ts
- admin-portal/e2e/critical-flows.spec.ts
- admin-portal/e2e/kvk-verification.spec.ts
- admin-portal/e2e/portal-smoke-test.spec.ts
- admin-portal/e2e/progressive-disclosure.spec.ts
- admin-portal/e2e/help-system.spec.ts
- admin-portal/e2e/ui-inspection-authenticated.spec.ts
- admin-portal/e2e/urgent-production-diagnostic.spec.ts
- admin-portal/e2e/debug-identifier-500.spec.ts
- admin-portal/e2e/admin-portal/accessibility.spec.ts (minor update, line 131)
- (2 more)

**ROADMAP:** TEST-001 (3 hours estimated)

#### Orchestrator Portal (6 files need updates)

**High Priority:**
1. **orchestrator-portal/e2e/orchestrations.spec.ts**
   - Lines: 13, 16, 22, 25, 30, 36, 74, 102, 105, 128, 131, 142, 164, 168, 177, 203, 219, 235
   - Issue: 18 Kendo grid references
   - Critical: Primary workflow test

2. **orchestrator-portal/e2e/dashboard.spec.ts**
   - Lines: 22-23, 26, 30, 90, 97, 108
   - Issue: Kendo chart selectors (`.k-chart`)
   - Fix: Replace with Recharts selectors or `[role="img"]`

**Medium Priority:** 4 additional files
- orchestrator-portal/e2e/analytics.spec.ts
- orchestrator-portal/e2e/auth.spec.ts
- orchestrator-portal/e2e/events.spec.ts
- orchestrator-portal/e2e/webhooks.spec.ts

**ROADMAP:** TEST-002 (2 hours estimated)

#### Booking Portal (1 file needs review)

**booking-portal/e2e/bookings-grid-journey-timeline.spec.ts**
- Status: Uses mantine-datatable reference, verify selectors

### ⚠️ Missing Test Coverage

**Mantine Components Without Tests:**

1. **DataTable** (mantine-datatable)
   - Column toggling (show/hide)
   - Column resizing
   - Row selection (single/multi)
   - Custom cell renderers
   - Keyboard navigation

2. **Modal** (@mantine/core)
   - Opening/closing animations
   - Focus trap behavior
   - Escape key handling
   - Overlay click-to-close
   - Nested modals

3. **Select** (@mantine/core)
   - Multi-select functionality
   - Search/filter within dropdown
   - Keyboard navigation (Arrow keys, Enter, Escape)
   - Custom option rendering

4. **Notifications** (@mantine/notifications)
   - Success/error/warning/info types
   - Auto-dismiss timing
   - Manual dismiss
   - Multiple simultaneous notifications
   - Notification stacking

5. **Stepper** (@mantine/core)
   - Step validation
   - Next/Previous navigation
   - Step completion indicators
   - Keyboard navigation between steps

**ROADMAP:** TEST-003 (4 hours estimated)

---

## 4. Selector Migration Reference

### Quick Reference Table

| Component | Old (Kendo) | New (Mantine) |
|-----------|-------------|---------------|
| Grid | `.k-grid` | `.mantine-DataTable-root` or `[role="table"]` |
| Grid Rows | `.k-grid-content tr` | `tbody tr` |
| Grid Headers | `.k-grid-header th` | `thead th` |
| Pagination | `.k-pager` | `.mantine-Pagination-root` |
| Button | `.k-button` | `.mantine-Button-root` or `button` |
| Dropdown | `.k-dropdown` | `.mantine-Select-root` |
| Dialog | `.k-dialog` | `.mantine-Modal-root` or `[role="dialog"]` |
| Input | `.k-input` | `.mantine-Input-input` |
| Validation Error | `.k-invalid` | `.mantine-Input-error` or `[aria-invalid="true"]` |
| Loader | `.k-loader` | `.mantine-Loader-root` or `[role="progressbar"]` |
| Notification | `.k-notification` | `.mantine-Notification-root` |
| Tabs | `.k-tabstrip` | `.mantine-Tabs-root` |
| Sort Indicator | `.k-i-sort-asc, .k-i-sort-desc` | `[aria-sort="ascending"], [aria-sort="descending"]` |

### Playwright Best Practices

```typescript
// ✅ GOOD - Use role-based selectors (framework-agnostic)
const button = page.getByRole('button', { name: 'Submit' });
const table = page.getByRole('table');
const dialog = page.getByRole('dialog');

// ✅ GOOD - Use Mantine-specific selectors when needed
const dataTable = page.locator('.mantine-DataTable-root');
const notification = page.locator('.mantine-Notification-root');

// ⚠️ ACCEPTABLE - CSS class selectors for specific components
const selectInput = page.locator('.mantine-Select-input');
const modalContent = page.locator('.mantine-Modal-content');

// ❌ BAD - Kendo selectors (will fail)
const grid = page.locator('.k-grid'); // NO!
const dropdown = page.locator('.k-dropdown'); // NO!
```

---

## 5. Implementation Priority

### Week 1 (Critical)
1. SEC-VUL-001: Replace xlsx with exceljs (2h)
2. SEC-VUL-002: Update validator.js (1h)
3. SEC-VUL-003: Strip console.log in production (2h)
4. TEST-001: Update admin portal E2E tests - high priority files (3h)
5. TEST-002: Update orchestrator portal E2E tests (2h)

**Total:** ~10 hours

### Week 2 (High Priority)
1. SEC-XSS-001: Remove dangerouslySetInnerHTML (1h)
2. SEC-SRI-001: Add SRI or self-host Mantine CSS (2h)
3. CQ-ERR-001: Add Error Boundaries (3h)
4. TEST-003: Add Mantine component tests (4h)
5. PERF-001: Add React.memo to expensive components (2h)

**Total:** ~12 hours

### Week 3 (Medium Priority)
1. CQ-CSS-001: Refactor MembersGrid CSS (2h)
2. CQ-STYLE-001: Standardize orchestrator styling (3h)
3. PERF-002: Add useCallback to event handlers (3h)
4. PERF-003: Add skeleton loaders (2h)
5. CQ-COMP-001: Split large components (3h)

**Total:** ~13 hours

### Backlog (Low Priority)
- CQ-SHARED-001: Extract common DataTable config (4h)
- PERF-004: Bundle size optimization (3h)
- CQ-CLEAN-001: Remove console.log statements (1h)
- CQ-INPUT-001: Replace HTML inputs (2h)
- CQ-DATE-001: Standardize date formatting (1h)

**Total:** ~11 hours

---

## 6. Test Health Metrics

### Current State

| Category | Total | Passing | Failing | Coverage |
|----------|-------|---------|---------|----------|
| **API Tests** | 26 | 26 ✅ | 0 | 100% |
| **Accessibility Tests** | 24 | 24 ✅ | 0 | 100% |
| **Admin Portal E2E** | 17 | 0 | 17 ❌ | 0% |
| **Orchestrator Portal E2E** | 6 | 0 | 6 ❌ | 0% |
| **Booking Portal E2E** | 1 | 0 | 1 ❌ | 0% |
| **Member Portal E2E** | 2 | 2 ✅ | 0 | 100% |
| **TOTAL E2E Tests** | 50 | 26 | 24 | 52% |
| **OVERALL** | 76 | 50 | 26 | 66% |

### Target State (After Updates)

| Category | Coverage |
|----------|----------|
| **All Tests** | 100% ✅ |

**Estimated Effort:** 20-34 hours (2.5-4 days)

---

## 7. Documentation Status

All documentation is current and accurate:

✅ **docs/TEST_STATUS_AFTER_MANTINE_MIGRATION.md** - Comprehensive test analysis
✅ **docs/GRID_STANDARDIZATION_TODO.md** - Migration summary (all 4 portals)
✅ **docs/ACCESSIBILITY.md** - WCAG 2.1 AA implementation guide
✅ **docs/COMPLETED_ACTIONS.md** - Chronological history (most recent first)
✅ **~/Desktop/ROADMAP.md** - Prioritized pending tasks (64 items)

**No stale/obsolete documentation found.**

---

## 8. Next Steps

1. **Review ~/Desktop/ROADMAP.md** - All findings organized by priority
2. **Start with CRITICAL tasks** - Security vulnerabilities first
3. **Update E2E tests incrementally** - 4-5 high-priority files per day
4. **Add missing test coverage** - One Mantine component category per day
5. **Invoke agents regularly:**
   - TE: After test updates
   - SA: After security fixes
   - CR: After code refactoring
   - TW: After task completion (update ROADMAP + COMPLETED_ACTIONS)

---

**Document Generated:** November 2, 2025 18:35 CET
**Generated By:** Technical Writer Agent (TW)
**Source:** Code Reviewer, Security Analyst, Test Engineer findings
**Linked to:** ~/Desktop/ROADMAP.md (master task list)
