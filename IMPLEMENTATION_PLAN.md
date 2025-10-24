# Implementation Plan: Admin Portal Fixes

**Branch:** feature/admin-portal
**Portal Path:** web/
**Created:** October 24, 2025
**Last Updated:** October 24, 2025

---

## Overview
**Goal:** Fix 18 issues in the Admin Portal (web/)
**Estimated Stages:** 6

---

## Stage 1: Configuration & Licensing Fixes ✅ COMPLETED
**Goal:** Fix KendoReact license and environment labels
**Success Criteria:**
- [x] No "No valid license found for KendoReact" message appears (Already properly configured)
- [x] Health monitor and About page show consistent environment (production)

**Tests:**
- Load application and check console for license warnings
- Verify Health monitor and About page environment labels

**Status:** ✅ Completed - Commit 66d9abf

**Implementation Notes:**
- Look for kendo-ui-license.txt in web/ directory
- Check for KendoReact license initialization in App.tsx or index.tsx
- Find Health monitor and About components for environment label source

---

## Stage 2: Member Grid Enhancements ✅ COMPLETED
**Goal:** Improve member grid UX with icons, columns, pagination
**Success Criteria:**
- [x] Text action button replaced with Eye icon for view
- [x] "Member since" column added and visible by default
- [x] Columns button uses check icon (standard Kendo pattern)
- [ ] Grid pagination doesn't reset to page 1 on filter changes (needs testing)

**Tests:**
- Navigate to member grid and verify icon buttons
- Check column selector for check icons
- Apply filters and verify current page is maintained

**Status:** ✅ Mostly Completed - Commit 66d9abf (pagination needs verification)

**Implementation Notes:**
- Find member grid component (likely MemberList.tsx or similar)
- Use Kendo UI icons for edit and view actions
- Check pagination state management for filter changes

---

## Stage 3: Document Verification Screen Fixes
**Goal:** Fix all Document Verification screen issues
**Success Criteria:**
- [ ] Status shows correct verification state (not "Verification failed" when matching)
- [ ] Legend moved above table (not below)
- [ ] Matching values highlighted in green
- [ ] No "error processing document" when all fields match
- [ ] "Verified date" moved to Green Box (Company Status)

**Tests:**
- Upload a document with matching fields
- Verify status is correct and legend is above table
- Check matching values are green
- Verify no error when fields match
- Check Verified date location

**Status:** Not Started

**Implementation Notes:**
- Find DocumentVerification component
- Review verification logic for status determination
- Add CSS for green highlighting on matches
- Check error handling logic

---

## Stage 4: Contact Modal & Endpoint Registration
**Goal:** Fix Add Contact modal and endpoint registration
**Success Criteria:**
- [ ] Email field has visible label in Add Contact modal
- [ ] Endpoint registration issue resolved

**Tests:**
- Open Add Contact modal and verify email field label
- Test endpoint registration functionality

**Status:** Not Started

**Implementation Notes:**
- Find AddContact modal component
- Check form field definitions for email label
- Investigate endpoint registration issue (need more context on what this means)

---

## Stage 5: Database & KvK Integration Fixes
**Goal:** Fix audit_logs relation error and restore KvK data
**Success Criteria:**
- [ ] No "relation audit_logs does not exist" error in Admin notes
- [ ] KvK API data displays correctly

**Tests:**
- View Admin notes section and verify no database errors
- Check KvK details display for a company

**Status:** Not Started

**Implementation Notes:**
- Check AdminNotes component for audit_logs query
- May need database migration to create audit_logs table
- Find KvK integration component and API calls

---

## Stage 6: Grid Standardization & Menu Cleanup ✅ COMPLETED
**Goal:** Standardize grid styles and hide incomplete features
**Success Criteria:**
- [x] User management and audit grids already use similar pattern (no changes needed)
- [x] Tasks, Subscription, Newsletter menu items hidden

**Tests:**
- Navigate to User management grid and verify action buttons
- Navigate to Audit logs grid and verify action buttons
- Check main menu for hidden items

**Status:** ✅ Completed - Commit 66d9abf

**Implementation Notes:**
- User Management and Audit Logs already use standard Kendo Grid with action buttons
- MembersGrid doesn't have a "hamburger menu" - uses DropDownButton for bulk actions
- Requirement may have been misunderstood - all grids use consistent Kendo UI patterns

**Implementation Notes:**
- Find UserManagement and AuditLogs grid components
- Copy hamburger menu pattern from member grid
- Find main navigation menu component to hide items

---

## Progress Tracking
- [ ] Stage 1: Configuration & Licensing Fixes
- [ ] Stage 2: Member Grid Enhancements
- [ ] Stage 3: Document Verification Screen Fixes
- [ ] Stage 4: Contact Modal & Endpoint Registration
- [ ] Stage 5: Database & KvK Integration Fixes
- [ ] Stage 6: Grid Standardization & Menu Cleanup
- [ ] All tests passing
- [ ] Documentation updated
