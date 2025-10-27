# Implementation Plan: Admin Portal Fixes & Analysis

**Created:** October 25, 2025
**Estimated Stages:** 3
**Priority:** High (Dashboard/Members 404), Medium (Logo), Low (Analysis)

---

## Pre-Flight Checklist (CRITICAL)

**STOP**: Before implementing ANY fixes, verify this is a code issue and not deployment sync:

```bash
# 1. Check last commit vs Azure pipeline
git log -1 --format="%ar - %s"
# Compare to: https://dev.azure.com/ctn-demo/ASR/_build

# 2. Check if recent feature branches need merging
git branch -a | grep feature

# 3. Verify admin-portal pipeline status
# Expected: Build triggered after web -> admin-portal rename
```

**RED FLAGS (Fix deployment first, NOT code):**
- Last Azure build predates "web -> admin-portal" rename
- Pipeline shows "admin-portal.yml" but builds "web/"
- Recent commits not reflected in Azure DevOps builds
- User reports "old version" or "missing features"

**If RED FLAGS exist:**
→ This is Lesson #29: Deployment sync issue, NOT code bug
→ Solution: Push to main, wait 2-3 minutes for pipeline
→ DO NOT debug code until deployment is current

---

## Stage 1: Verify & Diagnose 404 Issue

**Goal:** Determine root cause - deployment sync vs actual code bug
**Status:** Not Started
**Priority:** HIGH

### Success Criteria
- [ ] Azure DevOps pipeline status checked
- [ ] Last build timestamp matches latest commit
- [ ] Admin portal deployment path confirmed (web/ vs admin-portal/)
- [ ] Root cause identified (deployment vs code)

### Investigation Steps

1. **Check Deployment Status**
   ```bash
   # Compare git vs Azure pipeline
   git log -1 --format="%H %ar - %s"
   # Visit: https://dev.azure.com/ctn-demo/ASR/_build
   # Expected: Timestamps match within 5 minutes
   ```

2. **Verify Pipeline Configuration**
   ```bash
   # Check pipeline uses correct directory
   cat .azure-pipelines/admin-portal.yml | grep -A5 "app_location"
   # Expected: app_location: 'admin-portal/build'
   ```

3. **Test Dashboard Route Locally**
   ```bash
   cd admin-portal
   npm run dev
   # Navigate to http://localhost:3000/
   # Expected: Dashboard loads without 404
   ```

4. **Test Production Deployment**
   ```bash
   # Check production site
   curl -I https://calm-tree-03352ba03.1.azurestaticapps.net/
   # Expected: 200 OK, not 404
   ```

### Root Cause Analysis

**Hypothesis A: Deployment Sync Issue (Lesson #29)**
- Evidence: web -> admin-portal rename happened 4 minutes ago
- Evidence: Pipeline trigger paths may reference old "web/" directory
- Solution: Commit any pending changes, push to main, wait for pipeline

**Hypothesis B: Routing Configuration Issue**
- Evidence: AdminPortal.tsx uses selectedView state, not React Router
- Evidence: App.tsx has catch-all route for AdminPortal (path="/*")
- Solution: Verify staticwebapp.config.json SPA fallback

**Hypothesis C: Build Output Directory Mismatch**
- Evidence: Pipeline deploys from 'admin-portal/build'
- Evidence: Vite may output to 'admin-portal/dist' by default
- Solution: Check vite.config.ts build.outDir

### Tests
- Manual test: Navigate to https://calm-tree-03352ba03.1.azurestaticapps.net/ → Should show Dashboard, not 404
- Manual test: Navigate to https://calm-tree-03352ba03.1.azurestaticapps.net/members → Should show Members grid
- API test: `curl https://calm-tree-03352ba03.1.azurestaticapps.net/version.json` → Should show recent build time

### Implementation Notes
- **CRITICAL**: Follow MANDATORY PRE-WORK CHECKLIST from CLAUDE.md before debugging
- **CRITICAL**: Review Lesson #29 - "Old version in production = deployment sync issue, NOT code issue"
- Dashboard.tsx and MembersGrid.tsx exist in codebase (no missing files)
- AdminPortal uses internal routing (selectedView state), not React Router paths
- Actual 404 would trigger App.tsx's NotFound component, not AdminPortal's internal 404

---

## Stage 2: Fix Portbase Logo on Login Page

**Goal:** Replace Portbase logo with CTN logo in partner section
**Status:** Not Started
**Priority:** MEDIUM (cosmetic fix)

### Success Criteria
- [ ] Portbase logo removed from LoginPage.tsx partner logos
- [ ] Only CTN partners remain (Contargo, Inland Terminals Group, Van Berkel)
- [ ] Visual layout remains balanced
- [ ] Change committed with clear message

### Implementation Steps

1. **Review Current Login Page**
   ```bash
   # File: admin-portal/src/components/auth/LoginPage.tsx
   # Lines 79-87: Partner logos section
   ```

2. **Update Partner Logos**
   ```typescript
   // Remove line 82: <img src="/assets/logos/portbase.png" alt="Portbase" />
   // Keep: Contargo, Inland Terminals Group, Van Berkel
   ```

3. **Update CSS if Needed**
   ```bash
   # File: admin-portal/src/components/auth/LoginPage.css
   # Check .partner-logos-login grid layout
   # Adjust grid-template-columns from 4 items to 3
   ```

4. **Test Locally**
   ```bash
   cd admin-portal
   npm run dev
   # Navigate to http://localhost:3000/login
   # Verify layout looks balanced with 3 logos
   ```

### Tests
- Visual test: Login page shows 3 partner logos (not 4)
- Visual test: Logos are evenly spaced
- Visual test: No broken image links

### Implementation Notes
- Portbase logo file can remain in public/assets/logos/ (may be used elsewhere)
- Simple edit operation (remove 1 line from LoginPage.tsx)
- May need CSS adjustment for 3-column grid vs 4-column
- Verify main CTN logo at top of page remains unchanged (line 40)

---

## Stage 3: Comprehensive Agent Analysis

**Goal:** Run specialized agents for security, code quality, design, and testing
**Status:** Not Started
**Priority:** LOW (run after fixes complete)

### Success Criteria
- [ ] Security Analyst (SA) review completed
- [ ] Code Reviewer (CR) review completed
- [ ] Design Analyst (DA) review completed
- [ ] Test Engineer (TE) API and E2E tests completed
- [ ] All findings documented
- [ ] Critical issues addressed

### Agent Invocations

#### 3.1: Security Analyst (SA)
**When:** After Stage 1 & 2 complete, before any commits
**Focus:**
- AuthContext.tsx authentication flow
- ProtectedRoute.tsx authorization logic
- API token handling in AdminPortal.tsx (handleIssueToken)
- Environment variable exposure in vite.config.ts
- Aikido scan results review

**Expected Findings:**
- Token display in plaintext (tokens-view textarea) - low risk (admin-only)
- Verify Azure AD scope configuration
- Check for IDOR vulnerabilities in member detail view

#### 3.2: Code Reviewer (CR)
**When:** After Stage 1 & 2 complete
**Focus:**
- AdminPortal.tsx complexity (375 lines, multiple responsibilities)
- Duplicate routing logic (App.tsx React Router + AdminPortal.tsx internal state)
- MembersGrid pagination handling
- Error boundary coverage
- TypeScript strict mode compliance

**Expected Findings:**
- AdminPortal.tsx should split into smaller components
- Consider React Router for internal navigation vs state-based routing
- Memoization usage (useMemo, useCallback) is appropriate

#### 3.3: Design Analyst (DA)
**When:** After Stage 2 (logo fix) complete
**Focus:**
- LoginPage.tsx accessibility (WCAG 2.1 AA)
- Keyboard navigation in AdminPortal
- Color contrast ratios (CTN brand colors)
- Responsive design breakpoints
- Kendo UI theme consistency

**Expected Findings:**
- Partner logo alt text adequacy
- Focus indicators for keyboard navigation
- Mobile responsive layout (drawer collapse behavior)

#### 3.4: Test Engineer (TE)
**When:** After Stage 1 & 2 complete, deployment verified
**Focus:**
- **API tests FIRST** (curl to verify endpoints)
- E2E tests for Dashboard and Members pages
- Login flow with Azure AD (check e2e/auth.setup.ts)
- Member detail navigation
- Error scenarios (404, 401, 403)

**Expected Test Battery:**
```bash
# API tests (TE will create in api/tests/admin-portal/)
- GET /api/v1/members → 200 OK with pagination
- GET /api/v1/members?page=1&pageSize=20 → Valid response
- POST /api/v1/token → 201 Created with JWT

# E2E tests (TE will create in admin-portal/e2e/admin-portal/)
- admin-portal-navigation.spec.ts (Dashboard, Members, Sidebar)
- admin-portal-member-detail.spec.ts (View member, issue token)
- admin-portal-auth.spec.ts (Login, logout, role guards)
```

### Implementation Notes
- **Autonomous Operation**: No confirmation needed for agent invocations
- **Sequential Execution**: SA → CR → DA → TE (dependencies)
- **Documentation**: Each agent generates findings in their respective format
- **Follow-up**: Create GitHub issues for non-critical findings
- **ROADMAP Update**: TW agent auto-invoked after Stage 3 complete

---

## Progress Tracking

- [ ] **Stage 1 Complete**: 404 root cause identified & fixed
- [ ] **Stage 2 Complete**: Portbase logo removed from login page
- [ ] **Stage 3 Complete**: All agent reviews complete and findings documented
- [ ] **All Tests Passing**: API tests + E2E tests green
- [ ] **Documentation Updated**: TW agent invoked for ROADMAP.md sync

---

## Dependencies

- **Stage 1 → Stage 2**: Can run in parallel (independent changes)
- **Stage 1 + 2 → Stage 3**: Must complete fixes before agent analysis
- **Stage 3 → TW Agent**: Mandatory TW invocation after completion

---

## Success Metrics

**Stage 1 Success:**
- Production admin portal shows Dashboard without 404
- Members page loads member grid successfully
- Azure DevOps build reflects latest code

**Stage 2 Success:**
- Login page shows 3 partner logos (Contargo, ITG, Van Berkel)
- Layout remains visually balanced

**Stage 3 Success:**
- Zero critical security findings
- All E2E tests passing
- Code quality baseline established

---

## Risk Assessment

**LOW RISK** - Stage 2 (logo removal, cosmetic only)
**MEDIUM RISK** - Stage 1 if code issue (routing changes could affect all pages)
**MEDIUM RISK** - Stage 1 if deployment issue (pipeline changes could break deployment)
**LOW RISK** - Stage 3 (analysis only, no code changes)

---

## Rollback Plan

**If Stage 1 breaks deployment:**
```bash
git revert HEAD
git push origin main
# Wait 2-3 minutes for pipeline rollback
```

**If Stage 2 breaks layout:**
```bash
# Simple: Restore Portbase logo line
git checkout HEAD -- admin-portal/src/components/auth/LoginPage.tsx
git commit -m "Revert: Restore Portbase logo"
```

---

## Lessons Applied

- **Lesson #29**: Check deployment status BEFORE debugging (3-command git workflow)
- **Lesson #1**: Always check Azure DevOps build status vs git log
- **Lesson #13**: Test API FIRST with curl, then UI with Playwright
- **Lesson #21**: Never test pipeline changes on main (use feature branch if needed)

---

## Notes

**User Request Context:**
- "Dashboard and Members page 404 issue" → HIGH priority
- "Fix Portbase logo on login page" → MEDIUM priority
- "Comprehensive agent analysis preparation" → LOW priority (run after fixes)

**Autonomous Operation:**
- Work autonomously through all stages
- No confirmation needed for obvious next steps
- Auto-invoke agents (SA, CR, DA, TE) when Stage 3 reached
- Auto-invoke TW agent after ROADMAP.md task completion

**Commit Frequency:**
- Commit after each stage
- Descriptive messages explaining "why"
- Reference stage number in commit message
- Format: `fix(admin-portal): <description> - Stage N`

**Testing Strategy:**
- Stage 1: API tests FIRST (curl), then E2E (Playwright)
- Stage 2: Visual tests only (no functional changes)
- Stage 3: TE agent builds comprehensive test battery

---

**Plan Status:** Ready for Stage 1 investigation
**Next Action:** Run Pre-Flight Checklist → Verify deployment sync issue
