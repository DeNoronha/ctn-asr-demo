# BUG REPORT: M2M Client Management Endpoints Not Deployed

**ID:** BUG-M2M-001
**Severity:** 🔴 Critical (P0 - Blocker)
**Status:** Open
**Reported:** October 26, 2025
**Reporter:** Test Engineer (TE)
**Branch:** feature/m2m-authentication

---

## Summary

All 5 M2M client management API endpoints return HTTP 404 when tested against the development environment. The feature is implemented in code but not deployed due to a missing import statement.

---

## Environment

- **API URL:** https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1
- **Branch:** feature/m2m-authentication
- **Last Deploy:** Unknown (feature never deployed)
- **Expected:** HTTP 401 (Unauthorized) without auth token
- **Actual:** HTTP 404 (Not Found)

---

## Reproduction Steps

```bash
# Clone repo and checkout feature branch
git checkout feature/m2m-authentication

# Run smoke test
./api/tests/m2m-endpoints-smoke-test.sh
```

**Observed Output:**
```
Test 1: List M2M clients for legal entity
  Method: GET
  Endpoint: /legal-entities/00000000-0000-0000-0000-000000000000/m2m-clients
  ❌ FAIL - Endpoint NOT REGISTERED (404)

Test 2: Create M2M client
  Method: POST
  Endpoint: /legal-entities/00000000-0000-0000-0000-000000000000/m2m-clients
  ❌ FAIL - Endpoint NOT REGISTERED (404)

[... 3 more failures ...]

Total Tests:  5
Passed:       0
Failed:       5
Pass Rate:    0.0%
```

---

## Root Cause Analysis

### Investigation

1. **Checked function implementation:**
   - ✅ File exists: `/api/src/functions/ManageM2MClients.ts`
   - ✅ Contains 5 HTTP endpoint registrations
   - ✅ Code compiles without errors

2. **Checked entry point:**
   - ❌ Missing from `/api/src/essential-index.ts`
   - Import statement not present

3. **Verified pattern:**
   - Other working endpoints (GetMembers, CreateMember, etc.) are imported in essential-index.ts
   - M2M endpoints follow same pattern but missing import

### Root Cause

**Missing import statement in `/api/src/essential-index.ts`:**

```typescript
// File: api/src/essential-index.ts
// Line 47: ResolveParty is imported
import './functions/ResolveParty';

// MISSING: ManageM2MClients should be here
// import './functions/ManageM2MClients';

// Line 49: AuditLogs is imported
import './functions/GetAuditLogs';
```

**Why it matters:**
- Azure Functions v4 requires explicit imports to register HTTP triggers
- Without import, TypeScript compilation excludes the function
- Deployment package doesn't include the endpoints
- Runtime never registers the HTTP routes

---

## Impact

### User Impact
- **Admin Portal:** API Access tab will fail to load M2M clients
- **Member Portal:** Cannot create M2M clients for API access
- **API Consumers:** Cannot use M2M authentication feature
- **Documentation:** Feature documented but not available

### Testing Impact
- ❌ Cannot test API endpoints (404 responses)
- ❌ Cannot test UI workflows (API calls fail)
- ❌ Cannot test OAuth integration (no clients to authenticate)
- ❌ Cannot verify IDOR protection
- ❌ Cannot verify security patterns

### Business Impact
- Feature development complete but unusable
- Testing blocked (25+ tests cannot run)
- Deployment timeline delayed
- Merge to main blocked

---

## Fix

### Required Changes

**File:** `/api/src/essential-index.ts`
**Line:** After line 47 (after `import './functions/ResolveParty';`)

**Add:**
```typescript
// M2M Client Management
import './functions/ManageM2MClients';
```

### Deployment

```bash
# Step 1: Add import (from repo root)
cat >> api/src/essential-index.ts << 'EOF'

// M2M Client Management
import './functions/ManageM2MClients';
EOF

# Step 2: Deploy to Azure
cd api
func azure functionapp publish func-ctn-demo-asr-dev --typescript --build remote

# Step 3: Wait for deployment
echo "Waiting for deployment..."
sleep 120

# Step 4: Verify fix
cd ..
./api/tests/m2m-endpoints-smoke-test.sh
```

**Expected Result:**
```
Total Tests:  5
Passed:       5
Failed:       0

✅ ALL ENDPOINTS REGISTERED AND PROTECTED!
```

---

## Verification Steps

After fix is deployed:

### 1. Smoke Test (30 seconds)
```bash
./api/tests/m2m-endpoints-smoke-test.sh
```
**Expected:** 5/5 pass (all endpoints return 401)

### 2. List Deployed Functions (30 seconds)
```bash
func azure functionapp list-functions func-ctn-demo-asr-dev | grep -i m2m
```
**Expected:** 5 M2M functions listed

### 3. Manual Endpoint Test (30 seconds)
```bash
curl -s -o /dev/null -w "%{http_code}\n" \
  "https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1/legal-entities/00000000-0000-0000-0000-000000000000/m2m-clients"
```
**Expected:** 401 (not 404)

### 4. Full Test Suite (2 minutes)
```bash
export AUTH_TOKEN=$(az account get-access-token \
  --resource "api://d3037c11-a541-4f21-8862-8079137a0cde" \
  --query accessToken -o tsv)
./api/tests/m2m-clients-crud-test.sh
```
**Expected:** 25+ tests pass

---

## Prevention

### Lessons Learned

1. **Always test deployment after feature implementation**
   - Smoke tests should be part of feature checklist
   - Don't assume code in branch is deployed

2. **Verify essential-index.ts during code review**
   - New functions must be imported
   - Add to CR agent checklist

3. **Automate import verification**
   - Pre-commit hook to check imports
   - CI/CD pipeline validation

### Recommended Changes

1. **Add to `docs/LESSONS_LEARNED.md`:**
   ```markdown
   30. **Azure Functions require explicit imports** - HTTP triggers must be
       imported in essential-index.ts to be included in deployment package.
       Missing imports result in 404 responses. Always verify new functions
       are imported and test with smoke tests after deployment.
   ```

2. **Add to pre-commit hook:**
   ```bash
   # Verify all functions are imported
   for func in api/src/functions/*.ts; do
     func_name=$(basename "$func" .ts)
     if ! grep -q "$func_name" api/src/essential-index.ts; then
       echo "Warning: $func_name not imported in essential-index.ts"
     fi
   done
   ```

3. **Add to pipeline:**
   ```yaml
   - task: Bash@3
     displayName: 'Verify function imports'
     inputs:
       targetType: 'inline'
       script: |
         cd api/src
         for func in functions/*.ts; do
           func_name=$(basename "$func" .ts)
           if ! grep -q "$func_name" essential-index.ts; then
             echo "##vso[task.logissue type=error]$func_name not imported"
             exit 1
           fi
         done
   ```

---

## Related Documentation

- **Test Report:** `/api/tests/M2M_AUTHENTICATION_TEST_REPORT.md`
- **Quick Start:** `/api/tests/M2M_TESTING_QUICKSTART.md`
- **Test Summary:** `/api/tests/M2M_TEST_SUMMARY.md`
- **Implementation:** `/api/src/functions/ManageM2MClients.ts`
- **Database Migration:** `/database/migrations/012-create-m2m-clients.sql`

---

## Status Updates

| Date | Status | Notes |
|------|--------|-------|
| 2025-10-26 | Open | Bug discovered during smoke testing |
| | | Root cause identified: missing import |
| | | Fix documented, ready to apply |
| | | Waiting for deployment |

---

**Reporter:** Test Engineer
**Assignee:** TBD
**Priority:** P0 (Critical Blocker)
**Estimated Fix Time:** 10 minutes
**Estimated Test Time:** 5 minutes
