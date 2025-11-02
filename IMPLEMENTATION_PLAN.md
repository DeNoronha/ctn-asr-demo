# Implementation Plan: MembersGrid CSS Refactoring (CQ-CSS-001)

## Overview
**Goal**: Refactor MembersGrid.css to eliminate "nuclear" selectors with !important flags and reduce CSS specificity
**Estimated Stages**: 3
**Priority**: HIGH

---

## Current State Analysis

**Lines 7-122: Nuclear selectors identified**
- **42 !important flags** across lines 7-122
- **Specificity issues**: Up to 5-level deep selectors (e.g., `.members-grid-container table.mantine-Table-table thead tr th:first-child`)
- **Fighting framework**: Using attribute selectors, universal child selectors, and excessive nesting to override Mantine

**Categories of nuclear CSS:**
1. **Checkbox styling** (lines 7-40): 18 !important flags
2. **First column centering** (lines 42-88): 19 !important flags
3. **Popover/Menu dropdowns** (lines 90-122): 5 !important flags

---

## Stage 1: Refactor Checkbox Styling (Lines 7-40)
**Goal**: Remove checkbox !important flags, use Mantine Checkbox classNames prop
**Success Criteria**:
- [ ] Zero !important flags in checkbox selectors (18 → 0)
- [ ] Checkbox size = 18px via Mantine props (not CSS)
- [ ] Checkboxes remain centered in DataTable cells
- [ ] Visual appearance unchanged

**Approach**:
- Use DataTable `classNames` prop for checkbox column styling
- Apply Mantine Checkbox size="md" (18px) instead of CSS overrides
- Use single-level class selectors (`.checkbox-cell { text-align: center; }`)

**Tests**:
- Visual check: Checkboxes are 18px and centered
- Inspect: No !important in checkbox-related CSS
- Functionality: Row selection works correctly

**Status**: Not Started

**Implementation Notes**:
- Mantine Checkbox sizes: xs=16px, sm=20px, md=24px, lg=30px (need custom size prop)
- Alternative: Use `styles` prop on DataTable for checkbox column

---

## Stage 2: Refactor First Column Centering (Lines 42-88)
**Goal**: Simplify first-column centering without ultra-specific selectors
**Success Criteria**:
- [ ] Remove 19 !important flags from first-column selectors
- [ ] Reduce selector specificity from 5 levels → 2 levels max
- [ ] First column remains centered (checkboxes + content)
- [ ] Visual appearance unchanged

**Approach**:
- Use DataTable `cellsStyle` prop for first column
- Single class `.checkbox-column` with basic flexbox centering
- Remove attribute selectors like `[data-first-column="true"]`

**Tests**:
- Visual check: First column (checkboxes) centered
- Inspect: Selector count reduced by ~50%
- No ultra-specific selectors (5+ levels deep)

**Status**: Not Started

**Implementation Notes**:
- DataTable provides `cellsStyle` prop for per-column styling
- Consider using `textAlign: 'center'` in column definition

---

## Stage 3: Refactor Popover/Menu Styles (Lines 90-122)
**Goal**: Remove !important from dropdown styles, use Mantine Popover/Menu props
**Success Criteria**:
- [ ] Remove 5 !important flags from dropdown selectors
- [ ] Use Mantine Popover `maxHeight` and `styles` props
- [ ] Column selector dropdown maintains scrollable behavior
- [ ] Visual appearance unchanged

**Approach**:
- Move max-height/overflow to DataTable `popoverProps`
- Use single-level class selectors for Menu items
- Remove redundant legacy Menu selectors (lines 102-122)

**Tests**:
- Visual check: Column selector dropdown scrolls correctly
- Inspect: No !important in dropdown CSS
- Functionality: Column toggling works

**Status**: Not Started

**Implementation Notes**:
- Mantine Popover accepts `maxHeight` and `styles` props
- Menu.Item has `styles` prop for custom styling

---

## Stage 4: Final Cleanup & Verification
**Goal**: Verify all changes, run tests, document results
**Success Criteria**:
- [ ] Zero !important flags in lines 7-122 (42 → 0)
- [ ] Average selector specificity reduced by 60%+
- [ ] TypeScript check passes
- [ ] Visual regression: Zero UI changes
- [ ] All 3 stages documented in commits

**Tests**:
- Run `npm run typecheck` in admin-portal/
- Visual test: Open MembersGrid, verify checkboxes, column toggle, sorting
- Accessibility test: Screen reader announces checkboxes correctly
- Performance: No layout thrashing or reflows

**Status**: Not Started

**Implementation Notes**:
- Create before/after screenshots for documentation
- Update docs/COMPLETED_ACTIONS.md via TW agent

---

## Progress Tracking
- [ ] Stage 1: Checkbox styling refactored
- [ ] Stage 2: First column centering refactored
- [ ] Stage 3: Popover/Menu styles refactored
- [ ] Stage 4: Final cleanup & verification complete
- [ ] TypeScript passes
- [ ] Visual regression testing complete
- [ ] Documentation updated (TW agent)

---

## Risk Assessment

**Low Risk:**
- Toolbar styles (lines 123-185) - Clean, no !important, keep as-is
- Mobile responsiveness (lines 166-185) - No changes needed

**Medium Risk:**
- Checkbox centering - May need custom DataTable props
- First column alignment - Mantine may have built-in solution

**High Risk:**
- Breaking visual appearance (mitigated by incremental testing)
- Mantine props not supporting exact CSS behavior (fallback: minimal !important with justification)

---

## Success Metrics

**Before (Current State):**
- !important count: 42
- Average selector specificity: 5 levels
- Longest selector: `.members-grid-container table.mantine-Table-table thead tr th:first-child` (6 levels)

**After (Target State):**
- !important count: 0-2 (only if justified)
- Average selector specificity: 1-2 levels
- Longest selector: `.members-grid-container .checkbox-column` (2 levels)

**Reduction:**
- !important flags: 95%+ reduction (42 → 0-2)
- Selector specificity: 60%+ reduction (5 → 2 levels avg)
