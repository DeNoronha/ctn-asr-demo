# Implementation Plan: Admin Portal Test Fixes (Categories 1-3)

**Created:** November 1, 2025
**Scope:** Fix 47 failing E2E tests across accessibility, pagination, and authentication
**Estimated Total Time:** 14 hours

---

## Executive Summary

**Current State:**
- 65 E2E tests total | 18 PASSED (28%) | 47 FAILED (72%)
- Core accessibility complete: AdminSidebar, LoadingSpinner, MemberForm, MembersGrid
- Pagination hook (`useGridState`) implemented but not fully integrated
- Authentication tests failing due to design issues, not functional issues

**Risk Profile:**
- **Low Risk:** Category 2 (Grid Pagination) - Hook exists, just needs integration
- **Medium Risk:** Category 1 (Accessibility) - Requires audit and incremental fixes
- **Low Risk:** Category 3 (Authentication) - Test design fixes, no code changes needed

**Recommended Sequence:** Category 2 → Category 3 → Category 1
- Category 2: Quick win (3h), highest value/effort ratio
- Category 3: Fast fixes (2h), clears test noise
- Category 1: Systematic accessibility audit (9h), P0 for production

---

## Category 2: Grid Pagination URL State (PRIORITY 1 - QUICK WIN)

**Status:** Hook implemented, integration incomplete
**Estimated Time:** 3 hours
**Risk:** LOW - Existing infrastructure, just needs wiring

### Current State Analysis

✅ **Already Complete:**
- `useGridState` hook exists (`admin-portal/src/hooks/useGridState.ts`)
- URL state management working (page, pageSize, filters)
- React Router integration (`useSearchParams`)

❌ **Missing Integration:**
- MembersGrid uses hook but doesn't wire `updatePage`/`updatePageSize` to Grid events
- OnPageChange callback not propagating URL updates
- Filter changes don't preserve pageSize context

### Stage 1: Wire Grid Events to URL State (1.5h)

**Goal:** Connect Kendo Grid pagination events to `useGridState` hook

**Files:**
- `admin-portal/src/components/MembersGrid.tsx` (Line 71-76)

**Changes:**
1. Wire `GridPageChangeEvent` to `updatePage()`/`updatePageSize()`
2. Pass `skip` value from hook to Grid component
3. Ensure `onPageChange` prop callback receives updated values

**Tests to verify:**
- `should persist page number in URL when changing pages`
- `should persist page size in URL when changing page size`
- `should maintain pageSize when changing pages`

**Success Criteria:**
- URL updates: `?page=2&pageSize=20`
- Page state persists across navigation
- No lost pagination context

---

### Stage 2: Navigation Preservation (1h)

**Goal:** Ensure URL parameters survive route transitions

**Files:**
- `admin-portal/src/components/MembersGrid.tsx`
- `admin-portal/src/index.tsx` (Router configuration)

**Changes:**
1. Verify React Router `<Link>` components preserve query params
2. Test navigation to Dashboard → Members retains `?page=2`
3. Add URL param restoration on component mount

**Tests to verify:**
- `should preserve page state when navigating away and returning`
- `should load correct page from URL on initial load`

**Success Criteria:**
- Navigate away and return → same page displayed
- Direct URL navigation (`?page=2`) works on load

---

### Stage 3: Edge Cases & Filter Integration (0.5h)

**Goal:** Handle invalid params and filter interactions

**Files:**
- `admin-portal/src/hooks/useGridState.ts` (Lines 61-69, 133-138)

**Changes:**
1. Add bounds checking: `page < 1` → defaults to 1
2. Add max page validation: `page > totalPages` → show last page
3. Verify filter changes reset page to 1 (already implemented, line 136)

**Tests to verify:**
- `should handle filter application without losing all pagination context`
- `should handle page number exceeding total pages`
- `should handle page=0 or negative page numbers`

**Success Criteria:**
- Invalid page numbers handled gracefully (no crashes)
- Filters reset page to 1 (expected behavior)
- No empty grid states from out-of-bounds pages

---

## Category 3: Authentication Edge Cases (PRIORITY 2 - TEST FIXES)

**Status:** Functional authentication works, tests have wrong expectations
**Estimated Time:** 2 hours
**Risk:** LOW - Test design fixes, minimal code changes

### Current State Analysis

✅ **Working Correctly:**
- Azure AD authentication functional (Playwright auth setup captures 8 MSAL tokens)
- API requests include Bearer tokens
- Role-based access control working

❌ **Test Design Issues:**
- Test expects to see login flow, but auth is pre-saved (Playwright fixture)
- API timeout tests not accounting for network latency
- Selector issues for admin feature visibility

### Stage 1: Fix Test Expectations (1h)

**Goal:** Update test assertions to match Playwright auth fixture behavior

**Files:**
- `admin-portal/e2e/admin-portal/authentication.spec.ts`

**Changes:**

**Test 1: "should successfully authenticate with Azure AD" (Line 32-43)**
- **Issue:** Expects login redirect, but auth state already saved
- **Fix:** Change assertion from "should redirect to login" to "should load authenticated state from storage"
- **New assertion:** Check for presence of `.user-name` element (proves auth worked)

**Test 2: "should have valid Bearer token in API requests" (Line 77-102)**
- **Issue:** 11.2s timeout suggests network delay or slow endpoint
- **Fix:**
  - Add explicit wait for API response: `page.waitForResponse('/api/v1/**')`
  - Increase timeout to 15s for Azure Function cold start
  - Log request timing to identify bottleneck

**Test 3: "should have admin-only features visible for admin role" (Line 164-183)**
- **Issue:** Cannot find "Register New Member" button
- **Fix:**
  - Update selector: `getByRole('button', { name: /Register New Member/i })`
  - Add explicit wait for grid load before checking button
  - Log DOM structure if button not found (debug aid)

**Tests to verify:**
- All 8 authentication tests pass
- No false negatives from wrong expectations

**Success Criteria:**
- Authentication tests reflect Playwright fixture behavior
- API tests account for cold start latency
- Admin feature selectors match actual DOM structure

---

### Stage 2: Add Diagnostic Logging (1h)

**Goal:** Improve test failure debugging for future issues

**Files:**
- `admin-portal/e2e/admin-portal/authentication.spec.ts`

**Changes:**
1. Add request/response timing logs
2. Capture network failures with detailed error messages
3. Screenshot on test failure (already implemented, verify working)
4. Log MSAL token count from sessionStorage

**Tests to verify:**
- `should verify sessionStorage contains MSAL tokens` (enhanced logging)
- `should not expose sensitive data in browser console` (pattern detection)

**Success Criteria:**
- Test failures include actionable debugging information
- Network issues clearly identified (timeout vs 401 vs 404)
- No sensitive data in logs (passwords, tokens)

---

## Category 1: Accessibility - WCAG 2.1 AA (PRIORITY 3 - SYSTEMATIC AUDIT)

**Status:** Core components complete, advanced features pending
**Estimated Time:** 9 hours (6h keyboard + 3h ARIA)
**Risk:** MEDIUM - Requires Kendo UI Grid customization

### Current State Analysis

✅ **Already Complete (24 tests passing):**
- AdminSidebar: Full keyboard navigation
- LoadingSpinner: `role="status"` and `aria-live="polite"`
- MemberForm: Proper labels, `aria-required`
- MembersGrid: Core ARIA roles, semantic HTML

❌ **Remaining Gaps (24 tests failing):**
- Kendo Grid tab order broken (lines 127-144 in accessibility.spec.ts)
- Dialog keyboard navigation incomplete (lines 146-179)
- Missing `aria-required="true"` on some required fields
- Color contrast issues on badges (need 4.5:1 minimum)

### Stage 1: Kendo Grid Keyboard Navigation (4h)

**Goal:** Fix tab order and arrow key navigation in Kendo Grid

**Files:**
- `admin-portal/src/components/MembersGrid.tsx`
- `admin-portal/src/components/IdentifiersManager.tsx`
- `admin-portal/src/components/ContactsManager.tsx`
- `admin-portal/src/components/EndpointManagement.tsx`

**Root Cause:** Kendo Grid default behavior doesn't support full keyboard navigation

**Changes:**

**1. Enable Grid navigability (Line ~250 in MembersGrid.tsx):**
```typescript
<Grid
  navigatable={true}
  data={processedData}
  skip={skip}
  take={pageSize}
  pageable={{ pageSizes: [20, 50, 100] }}
  sortable={true}
  onPageChange={handlePageChange}
  onSortChange={(e) => setSort(e.sort)}
>
```

**2. Add keyboard event handlers for action buttons:**
```typescript
const handleRowKeyDown = (e: React.KeyboardEvent, member: Member) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    onViewDetails(member);
  }
};
```

**3. Add `tabIndex={0}` to custom cell renderers:**
```typescript
const ActionsCell = (props: GridCellProps) => (
  <td>
    <button
      aria-label={getGridActionLabel('view', props.dataItem.legal_name)}
      onClick={() => onViewDetails(props.dataItem)}
      onKeyDown={(e) => handleRowKeyDown(e, props.dataItem)}
      tabIndex={0}
    >
      <Eye />
    </button>
  </td>
);
```

**Tests to verify:**
- `should maintain tab order in grids`
- Grid cells receive focus in logical order
- Arrow keys navigate between rows

**Success Criteria:**
- Tab key navigates through grid cells
- Enter/Space activates action buttons
- Arrow keys move between rows (Kendo default behavior)

---

### Stage 2: Dialog Keyboard Navigation (2h)

**Goal:** Enable full keyboard navigation within all dialogs

**Files:**
- `admin-portal/src/components/MemberDetailDialog.tsx`
- `admin-portal/src/components/ConfirmDialog.tsx`
- `admin-portal/src/components/MemberForm.tsx` (when in dialog)
- `admin-portal/src/components/IdentifiersManager.tsx` (add identifier dialog)

**Changes:**

**1. Ensure Kendo Dialog has proper focus management:**
```typescript
<Dialog
  title="Member Details"
  onClose={onClose}
  autoFocus={true}
  restoreFocus={true}
>
```

**2. Add Escape key handling (if not already present):**
```typescript
useEffect(() => {
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };
  document.addEventListener('keydown', handleEscape);
  return () => document.removeEventListener('keydown', handleEscape);
}, [onClose]);
```

**3. Verify focus trap (Kendo should handle this by default):**
- Tab cycles within dialog only
- Last element → Tab → first element

**Tests to verify:**
- `should allow keyboard navigation within dialogs`
- Escape key closes dialog
- Tab order cycles within dialog

**Success Criteria:**
- Tab navigates all focusable elements in dialog
- Escape closes dialog
- Focus returns to trigger element on close

---

### Stage 3: ARIA Roles - Extended Coverage (3h)

**Goal:** Add `aria-required`, semantic HTML, and role="status" to all components

**Files to audit (15 components):**
- `admin-portal/src/components/MemberForm.tsx` ✅ Already complete
- `admin-portal/src/components/CompanyForm.tsx` ✅ Already complete (see commit bbeaea4)
- `admin-portal/src/components/ContactForm.tsx` - **Needs audit**
- `admin-portal/src/components/IdentifiersManager.tsx` - **Needs audit**
- `admin-portal/src/components/EndpointManagement.tsx` - **Needs audit**
- `admin-portal/src/components/M2MClientsManager.tsx` - **Needs audit**
- `admin-portal/src/components/APIAccessManager.tsx` - **Needs audit**
- `admin-portal/src/components/KvkDocumentUpload.tsx` - **Needs audit**
- `admin-portal/src/components/Dashboard.tsx` - **Needs audit**
- `admin-portal/src/components/EmptyState.tsx` - **Needs audit**
- `admin-portal/src/components/ProgressIndicator.tsx` - **Needs audit**

**Audit Checklist (per component):**
1. ✅ All required input fields have `aria-required="true"`
2. ✅ All inputs have associated `<label>` with `htmlFor` or `aria-label`
3. ✅ Loading states have `role="status"` and `aria-live="polite"`
4. ✅ Error messages have `role="alert"` and `aria-live="assertive"`
5. ✅ Icon buttons have `aria-label` (e.g., "Edit member", "Delete identifier")

**Example Fix (ContactForm.tsx):**
```typescript
<Input
  name="email"
  label="Email Address"
  required
  aria-required="true"
  aria-describedby={emailError ? 'email-error' : undefined}
/>
{emailError && (
  <span id="email-error" role="alert" className="error-message">
    {emailError}
  </span>
)}
```

**Tests to verify:**
- `should have ARIA labels on interactive elements`
- `should use semantic HTML roles`
- `should have role="status" for loading states`
- `should have required field indicators`

**Success Criteria:**
- All 11 components pass ARIA checklist
- Screen reader announces required fields
- Loading states announced to screen reader users

---

### Stage 4: Color Contrast Audit (Deferred to P1 - Not in P0 scope)

**Estimated Time:** 2 hours
**Status:** Medium priority, can be completed after P0 fixes

**Files:**
- `admin-portal/src/utils/colors.ts`
- `admin-portal/src/components/MembersGrid.css`

**Required Actions:**
1. Audit all badge colors for 4.5:1 contrast ratio
2. Fix `getStatusColor()` and `getMembershipColor()` utilities
3. Verify WCAG compliance with contrast checker tool

**Tests to verify:**
- `should have sufficient contrast on badges (4.5:1 minimum)`
- `should have readable text on all backgrounds`

---

## Testing Strategy

### After Each Stage

1. **Run targeted E2E tests:**
```bash
cd admin-portal
npx playwright test e2e/admin-portal/grid-pagination.spec.ts  # Category 2
npx playwright test e2e/admin-portal/authentication.spec.ts   # Category 3
npx playwright test e2e/admin-portal/accessibility.spec.ts    # Category 1
```

2. **Verify no regressions:**
```bash
npx playwright test e2e/admin-portal/ --grep="@smoke"
```

3. **Capture screenshots on failure:**
- Already configured: `playwright-report/screenshots/`
- Review failures before marking stage complete

### After All Categories Complete

**Invoke TE Agent for comprehensive test run:**
```bash
npx playwright test admin-portal/e2e/admin-portal/ --reporter=html
```

**Expected Outcome:**
- Grid Pagination: 11/11 tests passing (currently 0/11)
- Authentication: 14/14 tests passing (currently 6/14)
- Accessibility: 35/35 tests passing (currently 11/35)
- **TOTAL: 60/65 tests passing (92%)**

---

## Risk Assessment

### What Could Break

**Category 2 (Grid Pagination):**
- ❌ **LOW RISK:** URL params conflict with other state management
  - **Mitigation:** `useGridState` uses React Router, should be isolated
- ❌ **LOW RISK:** Performance impact from frequent URL updates
  - **Mitigation:** Hook uses `replace: true` (no history spam)

**Category 3 (Authentication):**
- ❌ **VERY LOW RISK:** Test fixes shouldn't affect production code
  - **Mitigation:** Only updating test expectations, no API changes

**Category 1 (Accessibility):**
- ⚠️ **MEDIUM RISK:** Kendo Grid customization may break existing functionality
  - **Mitigation:** Test after each file modification, incremental changes
- ⚠️ **LOW RISK:** ARIA changes may conflict with Kendo defaults
  - **Mitigation:** Use Kendo's built-in accessibility props where possible

### Safest Sequence

1. **Category 2 first** - Lowest risk, isolated to hook integration
2. **Category 3 second** - Test-only changes, no production code risk
3. **Category 1 last** - Highest risk, test each component individually

---

## Dependencies & Blockers

### None Identified

✅ **All infrastructure exists:**
- React Router (`useSearchParams`)
- Kendo UI accessibility props (`navigatable`, `autoFocus`)
- ARIA utilities (`getGridActionLabel`, color utilities)
- Playwright auth fixture (working)

❌ **No external dependencies needed:**
- No new packages to install
- No API changes required
- No Azure infrastructure changes

### Assumption Validation

**Before starting Category 1, verify:**
1. Kendo UI version supports `navigatable` prop (should be in v5.x)
2. All grids use same base Grid component (check for variations)
3. Dialog components all use Kendo Dialog (not custom implementation)

---

## Quick Wins (if time-constrained)

**If only 4 hours available, prioritize:**

1. **Category 2, Stage 1** (1.5h) - Wire grid pagination to URL
   - **Impact:** 5 tests pass, major UX improvement
2. **Category 3, Stage 1** (1h) - Fix authentication test expectations
   - **Impact:** 6 tests pass, clears test noise
3. **Category 1, Stage 1 (partial)** (1.5h) - Fix MembersGrid keyboard nav only
   - **Impact:** 3 tests pass, most visible improvement

**Total: 14 tests fixed in 4 hours (22% → 42% pass rate)**

---

## Post-Implementation

**After all stages complete:**

1. **Invoke TW Agent** - Update `docs/COMPLETED_ACTIONS.md`
2. **Invoke TE Agent** - Comprehensive E2E test run
3. **Update ROADMAP.md** - Move tasks from P0 to completed
4. **Commit incremental changes** - One commit per stage, not per file

**Final Deliverables:**
- 47 test failures → ~14 test failures (72% → 21% failure rate)
- URL-based pagination working
- Authentication tests stable
- Advanced accessibility improvements in place

---

## Time Breakdown Summary

| Category | Stage | Time | Cumulative |
|----------|-------|------|------------|
| **Category 2** | Wire Grid Events | 1.5h | 1.5h |
| | Navigation Preservation | 1h | 2.5h |
| | Edge Cases | 0.5h | 3h |
| **Category 3** | Fix Test Expectations | 1h | 4h |
| | Diagnostic Logging | 1h | 5h |
| **Category 1** | Kendo Grid Keyboard | 4h | 9h |
| | Dialog Keyboard | 2h | 11h |
| | ARIA Extended Coverage | 3h | 14h |
| **Testing** | TE Agent verification | +2h | 16h |
| **Documentation** | TW Agent update | +0.5h | 16.5h |

**Total Estimated Time:** 14 hours implementation + 2.5 hours verification/docs = **16.5 hours**

---

## Status Tracking

- [ ] Category 2: Grid Pagination URL State (3h)
  - [ ] Stage 1: Wire Grid Events (1.5h)
  - [ ] Stage 2: Navigation Preservation (1h)
  - [ ] Stage 3: Edge Cases (0.5h)
- [ ] Category 3: Authentication Edge Cases (2h)
  - [ ] Stage 1: Fix Test Expectations (1h)
  - [ ] Stage 2: Diagnostic Logging (1h)
- [ ] Category 1: Accessibility - WCAG 2.1 AA (9h)
  - [ ] Stage 1: Kendo Grid Keyboard (4h)
  - [ ] Stage 2: Dialog Keyboard (2h)
  - [ ] Stage 3: ARIA Extended Coverage (3h)
- [ ] Final Testing (TE Agent)
- [ ] Documentation Update (TW Agent)

**Delete this file when all stages complete.**
