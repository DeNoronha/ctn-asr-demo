# Emergency Rollback Runbook - Azure Static Web Apps

**Author:** DevOps Guardian Agent
**Date:** November 17, 2025
**Last Reviewed:** November 17, 2025
**Status:** Active

---

## Quick Reference

**Time-Critical Operations:**
- Production Down → Immediate Rollback: **5 minutes**
- Staging Tests Failing → Investigation: **15 minutes**
- Deployment Token Expired → Fix: **10 minutes**

**Emergency Contacts:**
- On-Call Engineer: Check PagerDuty rotation
- DevOps Lead: Ramon de Noronha
- Azure Support: https://portal.azure.com/#blade/Microsoft_Azure_Support

---

## Scenario 1: Production Down - Immediate Rollback Required

**Time Budget: 5 minutes**
**Severity: CRITICAL**

### Symptoms
- Production portal returns HTTP 500 or 404
- Users cannot access application
- Azure Monitor alerts firing
- Front Door health check failing

### Immediate Actions

```bash
# Step 1: Identify last known good commit (30 seconds)
cd /Users/ramondenoronha/Dev/DIL/DEV-CTN-ASR
git log --oneline -10

# Look for commit before current deployment
# Example output:
# abc1234 fix: critical production issue
# def5678 feat: new feature (← CURRENT, BROKEN)
# ghi9012 chore: update dependencies (← LAST KNOWN GOOD)

# Step 2: Note the last known good commit hash
GOOD_COMMIT="abc1234"  # Replace with actual hash

# Step 3: Trigger emergency pipeline run (60 seconds)
# Option A: Azure CLI (if authenticated)
az pipelines run \
  --name "Admin Portal Pipeline" \
  --branch main \
  --commit-id $GOOD_COMMIT \
  --org https://dev.azure.com/ctn-demo \
  --project ASR

# Option B: Azure DevOps Web Portal (if Azure CLI not available)
# 1. Open https://dev.azure.com/ctn-demo/ASR/_build
# 2. Click "Run pipeline"
# 3. Select "Admin Portal Pipeline"
# 4. Expand "Advanced options"
# 5. Set "Commit" to: abc1234
# 6. Click "Run"

# Step 4: Monitor pipeline execution (8-10 minutes)
# Watch build progress in Azure DevOps
# Expected stages:
# - Build (5 minutes)
# - Deploy to Staging (1 minute)
# - Smoke Tests (1 minute)
# - Deploy to Production (1 minute)
# - Post-Deployment Verification (30 seconds)

# Step 5: Verify production recovery (30 seconds)
curl -I https://calm-tree-03352ba03.1.azurestaticapps.net
# Expected: HTTP/2 200

# Check Front Door URL
curl -I https://admin-ctn-dev-gma8fnethbetbjgj.z02.azurefd.net
# Expected: HTTP/2 200

# Step 6: Notify stakeholders (60 seconds)
# Send Teams/Email message:
# "Production rollback completed to commit abc1234. Service restored."
```

### For Member Portal

Replace URLs and pipeline name:

```bash
# Pipeline name: "Member Portal Pipeline"
# Production URL: https://calm-pebble-043b2db03.1.azurestaticapps.net
# Front Door URL: https://portal-ctn-dev-fdb5cpeagdendtck.z02.azurefd.net
```

### Rollback Verification Checklist

- [ ] Pipeline execution completed successfully
- [ ] Smoke tests passed on staging
- [ ] Production deployment completed
- [ ] HTTP 200 response from production URL
- [ ] Front Door returns HTTP 200
- [ ] Application Insights shows no errors
- [ ] User login flow works (manual test)
- [ ] Stakeholders notified

---

## Scenario 2: Staging Tests Failing - Investigation Required

**Time Budget: 15 minutes**
**Severity: HIGH**

### Symptoms
- Pipeline fails at "Run smoke tests on staging" step
- Production deployment is automatically skipped
- Staging environment accessible but tests fail
- No user impact (production unchanged)

### Investigation Steps

```bash
# Step 1: Access staging environment (30 seconds)
# Admin Portal Staging:
open https://calm-tree-03352ba03-staging.1.azurestaticapps.net

# Member Portal Staging:
open https://calm-pebble-043b2db03-staging.1.azurestaticapps.net

# Step 2: Check browser console for errors (60 seconds)
# 1. Open browser DevTools (F12)
# 2. Go to Console tab
# 3. Look for red errors:
#    - JavaScript syntax errors
#    - Failed network requests (404, 500)
#    - CORS errors
#    - Authentication failures

# Step 3: Verify API health (30 seconds)
curl https://func-ctn-demo-asr-dev.azurewebsites.net/api/health | jq
# Expected output:
# {
#   "status": "healthy",
#   "checks": {
#     "database": { "status": "healthy" },
#     "azureKeyVault": { "status": "healthy" }
#   }
# }

# If API returns non-200, wait for API deployment to complete

# Step 4: Check Azure Static Web App logs (5 minutes)
az staticwebapp show \
  --name calm-tree-03352ba03 \
  --query "{name:name, status:status, defaultHostname:defaultHostname}"

# Check recent deployments
az staticwebapp environment list \
  --name calm-tree-03352ba03 \
  --output table

# Step 5: Review pipeline logs (5 minutes)
# Azure DevOps → Pipelines → Recent runs → Failed run
# Expand "Run smoke tests on staging" step
# Identify which test failed:
# - Test 1: Homepage accessibility → CDN propagation delay
# - Test 2: Response time → Network/performance issue
# - Test 3: JavaScript bundle → Build artifact missing
# - Test 4: CSS bundle → Build artifact missing
# - Test 5: Error page → Deployment failed

# Step 6: Decision matrix (2 minutes)
```

### Decision Matrix

| Failure Reason | Action | Expected Time |
|----------------|--------|---------------|
| HTTP 404/500 from staging | Wait 2 minutes, re-run pipeline | 10 minutes |
| JavaScript/CSS bundle missing | Check build artifacts in pipeline logs | 5 minutes |
| API dependency unhealthy | Wait for API deployment, re-run | 15 minutes |
| Response time > 2000ms | Re-run (transient issue) or investigate Azure Static Web Apps performance | 10 minutes |
| Error page detected | Check deployment logs, verify build succeeded | 10 minutes |

### Common Fixes

**Fix 1: CDN Propagation Delay**
```bash
# Wait 2 minutes, then manually re-run pipeline
az pipelines run \
  --name "Admin Portal Pipeline" \
  --branch main \
  --org https://dev.azure.com/ctn-demo \
  --project ASR
```

**Fix 2: Build Artifact Issue**
```bash
# Verify build step succeeded
# Azure DevOps → Pipeline → "Build React application" step
# Check for:
# - TypeScript compilation errors
# - Vite build failures
# - Missing environment variables

# If build succeeded, check file sizes:
cd admin-portal/build
du -sh .  # Should be ~15MB
ls -lh assets/  # Should have index-*.js and index-*.css
```

**Fix 3: API Dependency Unhealthy**
```bash
# Check ASR API pipeline status
az pipelines runs list \
  --org https://dev.azure.com/ctn-demo \
  --project ASR \
  --pipeline-ids <api-pipeline-id> \
  --top 5

# Wait for API deployment to complete, then re-run portal pipeline
```

---

## Scenario 3: Deployment Token Expired or Invalid

**Time Budget: 10 minutes**
**Severity: HIGH**

### Symptoms
- Pipeline fails at "Deploy to Staging Environment" step
- Error message: "Deployment token is invalid or expired"
- No deployment occurs (neither staging nor production)

### Fix Steps

```bash
# Step 1: Regenerate deployment token (2 minutes)
# Admin Portal
az staticwebapp secrets list \
  --name calm-tree-03352ba03 \
  --query "properties.apiKey" -o tsv

# Member Portal
az staticwebapp secrets list \
  --name calm-pebble-043b2db03 \
  --query "properties.apiKey" -o tsv

# Copy the output token (long alphanumeric string)

# Step 2: Update Azure Key Vault secret (3 minutes)
# Admin Portal Token
az keyvault secret set \
  --vault-name kv-ctn-demo-asr-dev \
  --name AZURE-STATIC-WEB-APPS-API-TOKEN-ADMIN \
  --value "<token-from-step-1>"

# Member Portal Token
az keyvault secret set \
  --vault-name kv-ctn-demo-asr-dev \
  --name AZURE-STATIC-WEB-APPS-API-TOKEN-MEMBER \
  --value "<token-from-step-1>"

# Step 3: Verify Key Vault update (2 minutes)
az keyvault secret show \
  --vault-name kv-ctn-demo-asr-dev \
  --name AZURE-STATIC-WEB-APPS-API-TOKEN-ADMIN \
  --query "value" -o tsv | head -c 20

# Should show first 20 characters of new token

# Step 4: Re-run pipeline (3 minutes)
az pipelines run \
  --name "Admin Portal Pipeline" \
  --branch main \
  --org https://dev.azure.com/ctn-demo \
  --project ASR

# Step 5: Verify "Fetch secrets from Key Vault" step succeeds
# Azure DevOps → Pipeline run → "Fetch secrets from Key Vault" step
# Should show: ✓ AZURE-STATIC-WEB-APPS-API-TOKEN-ADMIN is set
```

### Alternative: Manual Token Rotation via Azure Portal

```
1. Open Azure Portal: https://portal.azure.com
2. Navigate to: Static Web Apps → calm-tree-03352ba03
3. Left menu → "Settings" → "Configuration"
4. Click "Manage deployment token"
5. Copy token
6. Open Key Vault: kv-ctn-demo-asr-dev
7. Secrets → AZURE-STATIC-WEB-APPS-API-TOKEN-ADMIN → New Version
8. Paste token → Save
9. Re-run pipeline
```

---

## Scenario 4: Both Staging and Production Fail

**Time Budget: 20 minutes**
**Severity: CRITICAL**

### Symptoms
- Smoke tests pass on staging
- Production deployment completes
- Post-deployment verification fails (HTTP 404/500)
- Both staging and production return errors

### Root Cause Analysis

This scenario indicates a **build artifact issue**, not a deployment issue.

### Investigation Steps

```bash
# Step 1: Check build artifacts (5 minutes)
cd /Users/ramondenoronha/Dev/DIL/DEV-CTN-ASR

# Verify build directory exists
ls -la admin-portal/build/
ls -la member-portal/build/

# Expected files:
# - index.html (entry point)
# - assets/index-*.js (JavaScript bundle, ~2-5MB)
# - assets/index-*.css (CSS bundle, ~100-500KB)
# - staticwebapp.config.json (routing config)
# - version.json (build metadata)

# Check file sizes
du -sh admin-portal/build/

# Should be ~15MB for admin-portal, ~12MB for member-portal
# If < 1MB, build is incomplete

# Step 2: Review build logs (5 minutes)
# Azure DevOps → Pipeline run → "Build React application" step
# Check for:
# - ✗ Vite build errors
# - ✗ TypeScript compilation errors
# - ✗ Missing environment variables
# - ✗ Out of memory errors

# Step 3: Local build test (5 minutes)
cd admin-portal
npm run build

# If local build succeeds, issue is in pipeline environment
# If local build fails, issue is in code

# Step 4: Environment variable validation (2 minutes)
# Verify all VITE_* variables are set in pipeline YAML
# .azure-pipelines/admin-portal.yml line ~440-449
grep -A 10 "VITE_AZURE_CLIENT_ID" .azure-pipelines/admin-portal.yml

# Step 5: Decision (3 minutes)
```

### Decision Matrix

| Root Cause | Action | Expected Time |
|------------|--------|---------------|
| Build artifacts missing | Fix build step, re-run pipeline | 15 minutes |
| Environment variables incorrect | Update pipeline YAML, commit, push | 10 minutes |
| Out of memory (build agent) | Increase agent memory or optimize build | 30 minutes |
| Code syntax error | Fix code, commit, push, re-run | 20 minutes |

---

## Scenario 5: Manual Staging Deployment (Testing Only)

**Time Budget: 5 minutes**
**Severity: LOW**

### Use Case
- Need to test changes in staging without production deployment
- Manual QA testing required
- Feature flag testing

### Steps

```bash
# Step 1: Build locally
cd /Users/ramondenoronha/Dev/DIL/DEV-CTN-ASR/admin-portal
npm run build

# Step 2: Get deployment token from Key Vault
az keyvault secret show \
  --vault-name kv-ctn-demo-asr-dev \
  --name AZURE-STATIC-WEB-APPS-API-TOKEN-ADMIN \
  --query "value" -o tsv

# Copy the token output

# Step 3: Deploy to staging environment only
npx @azure/static-web-apps-cli@latest deploy build \
  --deployment-token <token-from-step-2> \
  --env staging

# Step 4: Access staging URL
open https://calm-tree-03352ba03-staging.1.azurestaticapps.net

# Step 5: Manual testing
# - Test login flow
# - Test critical user journeys
# - Verify API calls work
# - Check browser console for errors

# Note: This does NOT deploy to production
# Production remains unchanged
```

---

## Escalation Procedures

### Level 1: DevOps Engineer (Self-Service)
- Use runbook procedures
- Re-run pipelines
- Check logs and monitoring
- Time limit: 15 minutes

### Level 2: On-Call Engineer
- Complex rollback scenarios
- Infrastructure changes required
- API dependency issues
- Time limit: 30 minutes

**Contact:** Check PagerDuty rotation

### Level 3: Azure Support
- Azure service outages
- Static Web Apps platform issues
- CDN propagation failures
- Key Vault access issues

**Contact:** https://portal.azure.com/#blade/Microsoft_Azure_Support

**SLA:** Response within 1 hour (Standard Support)

---

## Post-Incident Review Checklist

After any rollback or incident:

- [ ] Document timeline in incident log
- [ ] Identify root cause
- [ ] Update runbook if new scenario discovered
- [ ] Add monitoring/alerting to prevent recurrence
- [ ] Schedule blameless post-mortem (within 48 hours)
- [ ] Update LESSONS_LEARNED.md
- [ ] Test rollback procedure quarterly

---

## References

### Internal Documentation
- `docs/devops/STATIC_WEB_APPS_DEPLOYMENT_SLOTS.md` - Full architecture
- `CLAUDE.md` - Project conventions and workflow
- `docs/LESSONS_LEARNED.md` - Historical issues and fixes
- `docs/devops/AZURE_MONITOR_DEPLOYMENT_ALERTS_SETUP.md` - Monitoring setup

### Azure Resources
- Admin Portal: https://portal.azure.com/#@598664e7-725c-4daa-bd1f-89c4ada717ff/resource/subscriptions/<sub-id>/resourceGroups/rg-ctn-demo-asr-dev/providers/Microsoft.Web/staticSites/calm-tree-03352ba03
- Member Portal: https://portal.azure.com/#@598664e7-725c-4daa-bd1f-89c4ada717ff/resource/subscriptions/<sub-id>/resourceGroups/rg-ctn-demo-asr-dev/providers/Microsoft.Web/staticSites/calm-pebble-043b2db03
- Key Vault: https://portal.azure.com/#@598664e7-725c-4daa-bd1f-89c4ada717ff/resource/subscriptions/<sub-id>/resourceGroups/rg-ctn-demo-asr-dev/providers/Microsoft.KeyVault/vaults/kv-ctn-demo-asr-dev

### Azure DevOps
- Pipelines: https://dev.azure.com/ctn-demo/ASR/_build
- Admin Portal Pipeline: https://dev.azure.com/ctn-demo/ASR/_build?definitionId=<admin-portal-id>
- Member Portal Pipeline: https://dev.azure.com/ctn-demo/ASR/_build?definitionId=<member-portal-id>

---

**Document Version:** 1.0
**Last Tested:** November 17, 2025
**Next Test Date:** February 17, 2026 (quarterly)
**Owner:** DevOps Team
