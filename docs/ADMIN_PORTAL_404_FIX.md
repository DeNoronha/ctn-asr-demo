# ADMIN PORTAL 404 FIX - Quick Start

**Issue:** Admin Portal Dashboard and Members pages showing 404 errors
**Root Cause:** API not deployed to Azure
**Fix Time:** 5 minutes

---

## Quick Fix (Do This Now)

```bash
cd /Users/ramondenoronha/Dev/DIL/ASR-full/api
./deploy-api.sh
```

This script will:
1. Build the API
2. Deploy to Azure Function App
3. Wait for deployment to stabilize
4. Run validation tests

**Time:** 3-4 minutes

---

## Verify the Fix

```bash
cd /Users/ramondenoronha/Dev/DIL/ASR-full/api
./tests/admin-portal-404-investigation.sh
```

**Expected:** All endpoints return 200 or 401 (auth required)

---

## What Happened?

1. Recent commits renamed `web/` → `admin-portal/`
2. Admin portal was deployed successfully
3. **API was never redeployed** with latest code
4. Admin portal tried to call API endpoints that don't exist

**This is CRITICAL LESSON #29:**
> "Old version in production = deployment sync issue, NOT code issue"

---

## Files Created

1. **Deployment Script:** `api/deploy-api.sh`
   - Automated deployment with validation
   - Use this instead of manual `func` commands

2. **Test Script:** `api/tests/admin-portal-404-investigation.sh`
   - Quick smoke test for all admin portal endpoints
   - Run before/after deployment

3. **Investigation Report:** `api/tests/ADMIN_PORTAL_404_INVESTIGATION_REPORT.md`
   - Complete analysis of the issue
   - Includes long-term fixes (API pipeline)

---

## Next Steps (After Fix Works)

1. **Test Admin Portal:**
   - Login: https://calm-tree-03352ba03.1.azurestaticapps.net
   - Navigate to Dashboard (should load)
   - Navigate to Members (should show grid)

2. **Create API Pipeline:**
   - See investigation report for pipeline YAML
   - Prevents future "forgot to deploy API" issues

3. **Add to Pre-Work Checklist:**
   - Check API deployment status before debugging
   - Verify both frontend AND backend are deployed

---

## Questions?

See full investigation report: `api/tests/ADMIN_PORTAL_404_INVESTIGATION_REPORT.md`

