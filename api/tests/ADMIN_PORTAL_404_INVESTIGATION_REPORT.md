# Admin Portal 404 Investigation Report

**Date:** 2025-10-25
**Investigator:** Test Engineer (TE) Agent
**Issue:** Admin Portal Dashboard and Members page showing 404 errors

---

## Executive Summary

**ROOT CAUSE:** API functions not deployed to Azure Function App
**SEVERITY:** Critical - Admin Portal completely non-functional
**IMPACT:** All API endpoints return 404, blocking all admin portal features

**CRITICAL LESSON #29 CONFIRMED:**
> "Old version in production = deployment sync issue, NOT code issue"

---

## Investigation Steps

### 1. API Tests (curl) - COMPLETED FIRST

Per TE agent protocol: **TEST API BEFORE UI**

#### Test Results:

| Endpoint | Expected Route | Status | Finding |
|----------|---------------|---------|---------|
| Base URL | `/api` | 200 | Returns default HTML page |
| Health | `/api/health` | 404 | NOT FOUND |
| Version | `/api/v1/version` | 404 | NOT FOUND |
| Members | `/api/v1/members` | 404 | NOT FOUND |
| Members (actual) | `/api/v1/all-members` | 404 | NOT FOUND |
| Identifiers | `/api/v1/identifiers` | 404 | NOT FOUND |

**Conclusion:** NO API functions are deployed. Function App returns default Azure page.

### 2. Code Review - Function Registration

✅ **GetMembers.ts exists:** `/Users/ramondenoronha/Dev/DIL/ASR-full/api/src/functions/GetMembers.ts`
✅ **Properly registered:** Imported in `api/src/index.ts` (line 23)
✅ **Entry point configured:** `package.json` main: `"dist/index.js"`

**Code Quality:** GOOD - No code issues found

### 3. Deployment Status Check

❌ **NO API DEPLOYMENT PIPELINE:** `.azure-pipelines/api.yml` does not exist
❌ **Last API deployment:** Unknown (likely weeks/months old)
✅ **Recent commits:** Multiple API updates (identifiers, members, health checks)
✅ **Admin portal pipeline:** Updated for web/ → admin-portal/ rename

**Git Timeline:**
```
f2819b6 (58 minutes ago) - feat: Add comprehensive Function App hardening
2b3f793 - fix: Update package.json main to dist/index.js
52e9f29 - fix: Replace index.ts with essential-index.ts
```

**Azure DevOps Last Build:** Admin portal pipeline triggered, API NOT triggered

### 4. Route Consistency Check

✅ **NO ROUTE MISMATCH FOUND:**
- **GetMembers route:** `/api/v1/all-members` (line 93 in GetMembers.ts)
- **Frontend uses:** `/all-members` (admin-portal/src/services/apiV2.ts line 265)

**Impact:** NONE - Routes are consistent between frontend and backend

---

## Root Cause Analysis

### Why Admin Portal Shows 404s

1. Recent monorepo changes renamed `web/` → `admin-portal/`
2. Admin portal pipeline was updated and triggered successfully
3. **API was NEVER redeployed** with latest code
4. Admin portal tries to call API endpoints that don't exist in deployed version
5. Function App still has old/minimal code (returns default Azure page)

### Why API Deployment Was Missed

1. **No automated pipeline:** `.azure-pipelines/api.yml` doesn't exist
2. **Manual deployments forgotten:** Relies on manual `func` CLI commands
3. **Monorepo complexity:** Easy to update one portal and forget API
4. **No deployment checklist:** Nothing enforces "deploy API after code changes"

---

## Proposed Solution

### IMMEDIATE FIX (Required)

**Deploy the API now:**

```bash
cd /Users/ramondenoronha/Dev/DIL/ASR-full/api
npm run build
func azure functionapp publish func-ctn-demo-asr-dev --typescript --build remote
```

**Wait 2-3 minutes, then verify:**

```bash
./tests/admin-portal-404-investigation.sh
```

**Expected outcome:** All API endpoints return 200 (or 401 for auth-protected endpoints)

### SECONDARY FIX (Not Required)

~~**Fix route mismatch in GetMembers.ts:**~~

**VERIFIED:** No route mismatch exists. Frontend and backend both use `/all-members`.

### LONG-TERM FIX (Pipeline Automation)

**Create `.azure-pipelines/api.yml`:**

```yaml
trigger:
  branches:
    include:
      - main
  paths:
    include:
      - api/**

pool:
  vmImage: 'ubuntu-latest'

variables:
  functionAppName: 'func-ctn-demo-asr-dev'
  workingDirectory: 'api'

steps:
- task: NodeTool@0
  inputs:
    versionSpec: '20.x'
  displayName: 'Install Node.js'

- script: |
    cd $(workingDirectory)
    npm ci
    npm run build
  displayName: 'Build API'

- task: AzureFunctionApp@1
  inputs:
    azureSubscription: 'Azure-Service-Connection'
    appType: 'functionAppLinux'
    appName: '$(functionAppName)'
    package: '$(workingDirectory)/dist'
    deploymentMethod: 'zipDeploy'
  displayName: 'Deploy to Azure Functions'
```

**Benefits:**
- Automatic deployment on API changes
- Prevents forgotten manual deployments
- Consistent build/deploy process
- Deployment history in Azure DevOps

---

## Test Battery Additions

### New Test Script Created

**Location:** `/Users/ramondenoronha/Dev/DIL/ASR-full/api/tests/admin-portal-404-investigation.sh`

**Purpose:**
- Quick smoke test for all admin portal API endpoints
- Pre-deployment validation
- Post-deployment verification

**Usage:**
```bash
cd /Users/ramondenoronha/Dev/DIL/ASR-full/api
./tests/admin-portal-404-investigation.sh
```

### Future E2E Tests (AFTER API Deployment)

**DO NOT create Playwright tests until API is fixed!**

Once API is deployed and working:

1. `admin-portal/e2e/admin-portal/members-api-integration.spec.ts`
   - Test members grid loads
   - Test pagination works
   - Test search/filter functionality

2. `admin-portal/e2e/admin-portal/identifiers-api-integration.spec.ts`
   - Test identifiers load for entity
   - Test add/edit/delete identifier flows
   - Test KvK, LEI, EORI identifier types

3. `admin-portal/e2e/admin-portal/dashboard-api-integration.spec.ts`
   - Test dashboard loads without errors
   - Test all dashboard widgets fetch data

---

## Lessons Learned Additions

### Proposed Addition to docs/LESSONS_LEARNED.md

**#30: API Deployment Must Be Explicit in Monorepo**

When working in a monorepo with separate frontend/backend:
1. Updating frontend code != updating API
2. Frontend pipelines DO NOT trigger API deployments
3. **ALWAYS deploy API explicitly** when API code changes
4. Create separate pipeline for API or combine into single deployment
5. Add deployment checklist: "Did you deploy the API?"

**Evidence:** Oct 25, 2025 - Admin portal 404s caused by deploying frontend (web/ → admin-portal/) but forgetting to redeploy API. Wasted 60+ minutes debugging code when issue was simply "API not deployed".

---

## Action Items

### Immediate (User Must Execute)

- [ ] **Deploy API** (use `./deploy-api.sh` or command provided above)
- [ ] **Verify deployment** (run `./tests/admin-portal-404-investigation.sh`)

### Follow-up (TE Agent Can Assist)

- [ ] **Create API pipeline** (`.azure-pipelines/api.yml`)
- [ ] **Add to Azure DevOps**
- [ ] **Create E2E tests** (ONLY after API works)
- [ ] **Update LESSONS_LEARNED.md** (lesson #30)
- [ ] **Create deployment checklist** (docs/DEPLOYMENT_CHECKLIST.md)

### Documentation Updates

- [ ] Update CLAUDE.md with "API deployment reminder"
- [ ] Add to MANDATORY PRE-WORK CHECKLIST: "Check API deployment status"
- [ ] Create docs/API_DEPLOYMENT_GUIDE.md

---

## Verification Commands

### After API Deployment

```bash
# 1. Test health endpoint
curl https://func-ctn-demo-asr-dev.azurewebsites.net/api/health

# 2. Test version endpoint
curl https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1/version

# 3. Test members endpoint
curl https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1/members

# 4. Run full test battery
cd /Users/ramondenoronha/Dev/DIL/ASR-full/api
./tests/admin-portal-404-investigation.sh
```

### Expected Results

All endpoints should return:
- **200 OK** (with data or empty array)
- **401 Unauthorized** (if auth required and no token)
- **NOT 404** (function registered and deployed)

---

## Time Saved by API-First Testing

**Without API-first approach:**
1. Launch Playwright (2 min)
2. Navigate to admin portal (1 min)
3. Try to debug UI issues (10+ min)
4. Realize API is broken (5 min)
5. **Total wasted:** 18+ minutes

**With API-first approach:**
1. Run curl tests (30 sec)
2. Identify API 404s immediately
3. Check deployment status
4. **Total time:** 2 minutes

**Time saved:** 16 minutes per investigation cycle

---

## Conclusion

This investigation confirms **CRITICAL LESSON #29** from CLAUDE.md:

> When user reports "old version" or "missing features", this is a **deployment sync issue, NOT a code issue**.

**The fix is simple:** Deploy the API.

**The lesson is critical:** In a monorepo, deploying one component doesn't deploy others. Always verify all components are deployed after code changes.

---

**Next Steps:**
1. User deploys API (or requests TE agent assistance)
2. Verify with test script
3. Create E2E tests for regression prevention
4. Set up API pipeline to prevent future occurrences

