# Implementation Plan: Performance Optimization (PERF-003, PERF-004)

## Overview
**Goal**: Improve perceived performance with skeleton loaders and reduce bundle size through code splitting
**Estimated Stages**: 3

---

## Stage 1: Add Skeleton Loaders (PERF-003)
**Goal**: Replace DataTable fetching spinners with Skeleton loaders in 5 components
**Success Criteria**:
- [x] MembersGrid.tsx uses Skeleton loader (8 rows)
- [x] TasksGrid.tsx uses Skeleton loader (5 rows, 2 tabs)
- [x] AuditLogViewer.tsx uses Skeleton loader (6 rows)
- [x] ContactsManager.tsx - N/A (no loading state prop)
- [x] IdentifiersManager.tsx - N/A (no loading state prop)
- [x] Skeleton structure matches actual content
- [ ] Visual appearance tested

**Tests**:
- Visual verification of skeleton loaders
- Loading states display correctly
- Transition from skeleton to content is smooth

**Status**: Complete (pending visual test after deployment)

**Implementation Notes**:
- DataTable already has `fetching` prop that shows built-in loader
- Add custom skeleton loaders BEFORE DataTable renders
- Use Mantine Skeleton component
- Match skeleton structure: 5-8 table rows with multiple columns
- Use Stack component for vertical spacing

---

## Stage 2: Bundle Analysis and Code Splitting (PERF-004 Part 1)
**Goal**: Implement route-based and component-based code splitting
**Success Criteria**:
- [x] Route-based code splitting implemented (AdminPortal, NotFound)
- [x] Suspense boundary with skeleton fallback added
- [x] Heavy components identified for future lazy loading
- [ ] Bundle size analyzed (before/after metrics)
- [ ] App functionality verified after changes

**Tests**:
- All routes load correctly
- Lazy loaded components display properly
- No runtime errors from dynamic imports

**Status**: Complete (pending build verification)

**Implementation Notes**:
- Used React.lazy() for AdminPortal and NotFound
- Added Suspense boundary with LoadingFallback skeleton
- Future candidates for lazy loading: AuditLogViewer (only for SystemAdmin), TasksGrid, heavy dialogs

---

## Stage 3: Build Optimization and Tree Shaking (PERF-004 Part 2)
**Goal**: Optimize Vite build configuration and remove unused dependencies
**Success Criteria**:
- [x] Vite manualChunks configured (9 vendor chunks)
- [x] Unused dependencies identified (@tanstack/react-table, react-transition-group)
- [ ] Unused dependencies removed from package.json
- [ ] Bundle size reduction documented (before/after)
- [ ] Production build tested

**Tests**:
- Production build succeeds
- App works in production mode
- Bundle size measurably reduced

**Status**: In Progress

**Implementation Notes**:
- Configured manualChunks: react-vendor, mantine-core, mantine-datatable, mantine-forms, mantine-notifications, icons, auth, i18n, excel-vendor
- Unused dependencies found:
  - @tanstack/react-table (0 imports, replaced by mantine-datatable)
  - react-transition-group (0 imports, animations handled by Mantine)
- Build currently failing due to concurrent DataTableConfig refactoring by user

---

## Progress Tracking
- [ ] Stage 1 complete
- [ ] Stage 2 complete
- [ ] Stage 3 complete
- [ ] All tests passing
- [ ] Documentation updated
