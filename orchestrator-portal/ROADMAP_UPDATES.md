# ROADMAP Updates - CTN Portal Testing Findings

**Date:** October 18, 2025
**Source:** Comprehensive portal testing across 4 CTN ecosystem portals

---

## CRITICAL Priority (Fix Immediately)

### 1. API Complete Failure - All Endpoints Return 404 ⭐⭐⭐
**Impact:** Production down, all portals non-functional except Documentation
**Symptoms:**
- `/api/v1/health` returns 404
- `/api/v1/entities` returns 404
- `/api/v1/members` returns 404
- `/api/v1/orchestrations` returns 404
- Root endpoint works (Azure Functions placeholder page)

**Required Actions:**
1. Check Azure DevOps build status: https://dev.azure.com/ctn-demo/ASR/_build
2. Compare last build time to git commit time (last commit: 10 minutes ago)
3. If build failed → Fix pipeline first
4. If build succeeded → Check Azure Function App logs: `func azure functionapp logstream func-ctn-demo-asr-dev`
5. Verify function imports in entry point file (check package.json "main" field)
6. Verify Azure Function App configuration and environment variables

**Reference:** Pre-Debugging Checklist (CLAUDE.md) - "Always check deployment status BEFORE debugging"

**Blocking:**
- Admin Portal testing
- Member Portal testing
- Orchestrator Portal testing

---

## HIGH Priority (Fix After API Restored)

### 2. Verify Orchestrator Portal Deployment
**Status:** Fix committed (6107fbf) but not yet deployed
**Issue:** Portal hardcoded to localhost:3001 instead of production API
**Fix Applied:** Centralized API configuration, removed hardcoded URLs
**Next Steps:**
1. Wait for Azure DevOps automatic deployment (~2 minutes)
2. Verify deployment succeeded
3. Test portal connects to production API
4. Verify dashboard loads and displays data

**Verification:**
```bash
# Check Orchestrator Portal uses production API
curl -s https://blue-dune-0353f1303.1.azurestaticapps.net | grep "func-ctn-demo-asr-dev"
```

---

## MEDIUM Priority (After Critical Issues Fixed)

### 3. Complete Admin Portal Testing
**Blocked Until:** API is functional
**Tests Required:**
- Authentication flow (Azure AD)
- Member CRUD operations (GET, POST, PUT, DELETE /api/v1/members)
- Legal entity management (GET, POST, PUT, DELETE /api/v1/entities)
- Identifier management (KvK, EUID, LEI, HRB)
- Contact management
- Kendo UI grids render and function correctly
- Filters, pagination, forms work

**Estimated Time:** 2-3 hours

---

### 4. Complete Member Portal Testing
**Blocked Until:** API is functional
**Tests Required:**
- Run existing Playwright E2E tests: `cd portal && npm run test:e2e`
- Member registration flow
- Profile management
- Self-service updates
- Authentication flow

**Notes:** E2E tests already exist in `/portal/e2e/` directory

**Estimated Time:** 1-2 hours

---

### 5. Test Documentation Portal (Independent - No API Dependency)
**Status:** Can be tested now (static site)
**Tests Required:**
- Home page renders correctly
- Kendo UI carousel functions
- Sidebar navigation works
- 404 page displays correctly
- Azure DevOps branding visible
- Responsive design across devices

**Method:** Playwright UI testing

**Estimated Time:** 30-60 minutes

---

## LOW Priority (Future Enhancements)

### 6. Create API Health Check Test Scripts
**Purpose:** Reusable curl-based API tests for smoke testing
**Location:** `api/tests/`
**Scripts to Create:**
- `health-check.sh` - Test /api/v1/health endpoint
- `entities-crud-test.sh` - Test entities CRUD operations
- `members-crud-test.sh` - Test members CRUD operations
- `identifiers-crud-test.sh` - Test identifier operations
- `orchestrations-crud-test.sh` - Test orchestration operations

**Pattern:**
```bash
#!/bin/bash
# Create test data
# Verify operations
# Clean up (delete created data)
```

**Estimated Time:** 2-3 hours

---

### 7. Expand E2E Test Coverage
**Goal:** Build comprehensive test battery across all portals
**Portals:**
- Admin Portal: Add E2E tests in `/web/e2e/`
- Member Portal: Expand existing tests in `/portal/e2e/`
- Orchestrator Portal: Create tests in `/orchestrator-portal/e2e/` (72 tests already exist!)
- Documentation Portal: Add basic navigation tests

**Estimated Time:** 4-6 hours

---

### 8. Setup API Health Monitoring
**Purpose:** Prevent undetected production outages
**Implementation:**
- Azure Application Insights health checks every 5 minutes
- Alert on HTTP 404/500 errors
- Email/Slack notifications on failures
- Dashboard showing uptime percentage

**Estimated Time:** 1-2 hours

---

### 9. Improve CI/CD Pipeline Reliability
**Issues to Address:**
- Add health check verification after deployment
- Rollback on failed health checks
- Notifications on deployment failures
- Quality check failures should inform, not block (with proper reporting)

**Reference:** October 16, 2025 lesson - "Pipeline Quality Checks Must Use continueOnError"

**Estimated Time:** 2-3 hours

---

## Summary

**Total Issues Found:** 9
- CRITICAL: 1 (API complete failure)
- HIGH: 1 (Orchestrator Portal deployment)
- MEDIUM: 3 (Portal testing blocked by API)
- LOW: 4 (Future enhancements)

**Estimated Total Effort After API Fixed:** 12-18 hours

**Blockers:**
- API 404 errors block 66% of testing (Admin, Member, Orchestrator portals)
- Documentation Portal can be tested immediately (no API dependency)

**Next Action:**
1. Check Azure DevOps build status
2. Fix API deployment
3. Continue portal testing
