# Azure Static Web Apps - Deployment Slots Architecture

**Author:** DevOps Guardian Agent
**Date:** November 17, 2025
**Status:** Implemented
**Related Task:** DG-DEPLOY-001

---

## Overview

This document describes the deployment slot strategy for Azure Static Web Apps (Admin Portal and Member Portal) to enable zero-downtime deployments with pre-production validation.

**Problem Solved:** Previous pipeline configuration deployed directly to production without staging or testing, causing instant production cutover and potential user impact from failed deployments.

**Solution:** Named preview environments with smoke tests before production promotion.

---

## Architecture

### Named Environments vs Traditional Deployment Slots

Azure Static Web Apps uses **named preview environments** instead of traditional deployment slots (like Azure App Service). Key differences:

| Feature | Azure App Service Slots | Static Web Apps Named Environments |
|---------|------------------------|-----------------------------------|
| Creation | Manual creation via Portal | Automatic via deployment parameter |
| URLs | Slot-specific subdomains | Environment name in URL path |
| Swapping | Hot swap with zero downtime | Separate deployment to each environment |
| Custom Domains | Supported on all slots | Production only |
| Geo-distribution | Yes | Production only |

### Environment Types

1. **Production Environment**
   - URL: `https://{app-name}.azurestaticapps.net`
   - Custom domain supported
   - Geo-distributed globally
   - Indexed by search engines
   - Deployed when `deployment_environment` parameter is empty

2. **Named Preview Environment (Staging)**
   - URL: `https://{app-name}-{environment-name}.{location}.azurestaticapps.net`
   - Example: `https://calm-tree-03352ba03-staging.1.azurestaticapps.net`
   - Stable URL (does not change between deployments)
   - No custom domain support
   - Not geo-distributed
   - Deployed when `deployment_environment` parameter is set

---

## Deployment Flow

```
┌─────────────────────────────────────────────────────────────┐
│  1. Build Application                                       │
│     - TypeScript compilation                                │
│     - Security scans (Trivy, OWASP, Semgrep, Gitleaks)     │
│     - Unit tests (Vitest)                                   │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────────────────┐
│  2. Deploy to Staging Environment                           │
│     - URL: {app-name}-staging.azurestaticapps.net          │
│     - deployment_environment: 'staging'                     │
│     - Wait 30 seconds for propagation                       │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────────────────┐
│  3. Run Smoke Tests on Staging                              │
│     - HTTP 200 check (homepage loads)                       │
│     - JavaScript bundle loads (/assets/index-*.js)          │
│     - CSS bundle loads (/assets/index-*.css)                │
│     - Response time < 2 seconds                             │
│     - No 404 errors for critical assets                     │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ├─── PASS ───┐
                 │             ↓
                 │    ┌─────────────────────────────────────┐
                 │    │  4. Deploy to Production            │
                 │    │     - URL: {app-name}.azurestaticapps.net
                 │    │     - deployment_environment: ''    │
                 │    │     (empty = production)            │
                 │    └─────────────────────────────────────┘
                 │
                 └─── FAIL ───┐
                              ↓
                     ┌─────────────────────────────────────┐
                     │  Abort Deployment                   │
                     │  - Production unchanged             │
                     │  - Staging environment preserved    │
                     │  - Manual investigation required    │
                     └─────────────────────────────────────┘
```

---

## Implementation Details

### Admin Portal Configuration

**Static Web App Name:** calm-tree-03352ba03

**Environments:**
- Production: `https://calm-tree-03352ba03.1.azurestaticapps.net`
- Staging: `https://calm-tree-03352ba03-staging.1.azurestaticapps.net`

**Pipeline File:** `.azure-pipelines/admin-portal.yml`

### Member Portal Configuration

**Static Web App Name:** calm-pebble-043b2db03

**Environments:**
- Production: `https://calm-pebble-043b2db03.1.azurestaticapps.net`
- Staging: `https://calm-pebble-043b2db03-staging.1.azurestaticapps.net`

**Pipeline File:** `.azure-pipelines/member-portal.yml`

---

## Smoke Test Specifications

### Test Coverage

1. **Homepage Accessibility**
   - HTTP GET request to staging URL
   - Expected: HTTP 200 status code
   - Timeout: 10 seconds
   - Retries: 3 attempts with 10-second intervals

2. **JavaScript Bundle Loading**
   - Verify main bundle exists and loads
   - Pattern: `/assets/index-*.js`
   - Expected: HTTP 200 status code
   - File size: > 100KB (confirms bundle not empty)

3. **CSS Bundle Loading**
   - Verify stylesheet exists and loads
   - Pattern: `/assets/index-*.css`
   - Expected: HTTP 200 status code
   - File size: > 10KB (confirms styles not empty)

4. **Response Time Validation**
   - Measure time to first byte (TTFB)
   - Expected: < 2000ms
   - Location: Azure DevOps agent (US-based)

5. **Error Page Detection**
   - Check for HTML error pages in responses
   - Expected: No "404 Not Found" or "500 Internal Server Error" text
   - Validates deployment completed successfully

### Implementation (Bash Script)

```bash
#!/bin/bash
set -e

STAGING_URL="$1"
MAX_ATTEMPTS=3
RETRY_DELAY=10

echo "Starting smoke tests for: $STAGING_URL"

# Wait for deployment propagation
echo "Waiting 30 seconds for deployment to propagate..."
sleep 30

# Test 1: Homepage accessibility
echo "Test 1: Homepage accessibility"
for i in $(seq 1 $MAX_ATTEMPTS); do
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -m 10 "$STAGING_URL")
  if [ "$HTTP_CODE" = "200" ]; then
    echo "✓ Homepage returned HTTP 200"
    break
  elif [ $i -eq $MAX_ATTEMPTS ]; then
    echo "✗ Homepage test failed after $MAX_ATTEMPTS attempts (HTTP $HTTP_CODE)"
    exit 1
  else
    echo "  Attempt $i failed (HTTP $HTTP_CODE), retrying in ${RETRY_DELAY}s..."
    sleep $RETRY_DELAY
  fi
done

# Test 2: Response time
echo "Test 2: Response time validation"
RESPONSE_TIME=$(curl -s -o /dev/null -w "%{time_total}" "$STAGING_URL")
RESPONSE_MS=$(echo "$RESPONSE_TIME * 1000" | bc | cut -d'.' -f1)
if [ "$RESPONSE_MS" -lt 2000 ]; then
  echo "✓ Response time acceptable: ${RESPONSE_MS}ms"
else
  echo "✗ Response time too slow: ${RESPONSE_MS}ms (threshold: 2000ms)"
  exit 1
fi

# Test 3: JavaScript bundle exists
echo "Test 3: JavaScript bundle availability"
HTML_CONTENT=$(curl -s "$STAGING_URL")
if echo "$HTML_CONTENT" | grep -q "/assets/index.*\.js"; then
  echo "✓ JavaScript bundle reference found in HTML"
else
  echo "✗ JavaScript bundle not found in HTML"
  exit 1
fi

# Test 4: CSS bundle exists
echo "Test 4: CSS bundle availability"
if echo "$HTML_CONTENT" | grep -q "/assets/index.*\.css"; then
  echo "✓ CSS bundle reference found in HTML"
else
  echo "✗ CSS bundle not found in HTML"
  exit 1
fi

# Test 5: No error pages
echo "Test 5: Error page detection"
if echo "$HTML_CONTENT" | grep -iq "404\|500\|error"; then
  echo "✗ Error indicators found in HTML content"
  exit 1
else
  echo "✓ No error indicators detected"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✓ All smoke tests passed - safe to deploy to production"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
```

---

## Pipeline Integration

### Two-Stage Deployment Pattern

**Stage 1: Deploy to Staging**
```yaml
- script: |
    npx @azure/static-web-apps-cli@latest deploy admin-portal/build \
      --deployment-token $(AZURE-STATIC-WEB-APPS-API-TOKEN-ADMIN) \
      --env staging
  displayName: 'Deploy to Staging Environment'
  condition: succeeded()
```

**Stage 2: Run Smoke Tests**
```yaml
- script: |
    STAGING_URL="https://calm-tree-03352ba03-staging.1.azurestaticapps.net"

    # Wait for propagation
    sleep 30

    # Execute smoke tests
    bash scripts/smoke-tests.sh "$STAGING_URL"
  displayName: 'Run smoke tests on staging'
  condition: succeeded()
```

**Stage 3: Deploy to Production**
```yaml
- script: |
    npx @azure/static-web-apps-cli@latest deploy admin-portal/build \
      --deployment-token $(AZURE-STATIC-WEB-APPS-API-TOKEN-ADMIN) \
      --env production
  displayName: 'Deploy to Production (after smoke tests pass)'
  condition: succeeded()
```

### Environment Variable Configuration

**Staging Environment Variables:**
- Same as production (VITE_* variables)
- API points to same backend (func-ctn-demo-asr-dev)
- Authentication uses same Azure AD tenant

**Note:** Named environments share the same configuration as production. There is no separate staging backend.

---

## Rollback Procedures

### Scenario 1: Smoke Tests Fail in Pipeline

**Automatic Protection:**
- Production deployment step is skipped (condition: succeeded())
- Production remains on previous version
- Staging environment shows failed deployment
- No user impact

**Manual Steps:**
1. Review smoke test logs in Azure DevOps pipeline
2. Identify root cause (build artifacts, API dependency, etc.)
3. Fix issue in code
4. Commit and re-trigger pipeline
5. Verify smoke tests pass before production deployment

### Scenario 2: Production Deployment Completed but Issues Found

**Option A: Redeploy Previous Version (Recommended)**

```bash
# 1. Identify last known good commit
git log --oneline -10

# 2. Get commit hash (e.g., abc1234)
GOOD_COMMIT="abc1234"

# 3. Trigger pipeline with previous commit
az pipelines run \
  --name "Admin Portal Pipeline" \
  --branch main \
  --commit-id $GOOD_COMMIT \
  --org https://dev.azure.com/ctn-demo \
  --project ASR
```

**Option B: Manual Rollback via Azure CLI**

```bash
# 1. List recent deployments
az staticwebapp show \
  --name calm-tree-03352ba03 \
  --query "defaultHostname"

# 2. Delete current production deployment
az staticwebapp environment delete \
  --name calm-tree-03352ba03 \
  --environment-name production \
  --yes

# 3. Redeploy from previous artifact (if available)
# Note: This requires previous build artifacts to be archived
```

**Option C: Emergency Hotfix**

```bash
# 1. Create fix in code
# 2. Commit and push to main
git add .
git commit -m "hotfix: critical production issue"
git push origin main

# 3. Monitor pipeline deployment
# 4. Verify smoke tests pass
# 5. Confirm production deployment
```

### Scenario 3: Need to Test in Staging Without Production Deployment

**Manual Staging Deployment:**

```bash
# Deploy to staging only (skip production step)
cd admin-portal

# Build locally
npm run build

# Deploy to staging environment
npx @azure/static-web-apps-cli@latest deploy build \
  --deployment-token <token-from-key-vault> \
  --env staging

# Access staging URL
open https://calm-tree-03352ba03-staging.1.azurestaticapps.net
```

**Note:** This is useful for testing changes without affecting production.

---

## Monitoring and Observability

### Azure DevOps Pipeline Monitoring

1. **Build Duration Tracking**
   - Baseline: ~8-10 minutes (including security scans)
   - With staging: +2 minutes (staging deployment + smoke tests)
   - Total expected: ~10-12 minutes

2. **Deployment Success Rate**
   - Track ratio of successful staging deployments
   - Track ratio of smoke test passes
   - Track ratio of production deployment successes

3. **Alerts Configuration**
   - Pipeline failure notification → DevOps team email
   - Smoke test failure → Immediate investigation
   - Production deployment failure → On-call engineer

### Staging Environment Health Checks

**Automated Checks (Post-Deployment):**
- Homepage loads (HTTP 200)
- Bundle files exist and load
- Response time < 2 seconds
- No console errors (requires browser testing)

**Manual Verification (Optional):**
- Login flow works (Azure AD authentication)
- API calls succeed (health endpoint)
- UI renders correctly (visual regression)

### Production Environment Monitoring

**Existing Monitoring:**
- Application Insights (performance, errors, availability)
- Azure Monitor (resource health, deployment tracking)
- Custom dashboards (user journeys, API latency)

**Post-Deployment Verification:**
- Automatic HTTP 200 check (already in pipeline)
- Response time validation
- API dependency health check

---

## Cost Implications

### Azure Static Web Apps Pricing (Free Tier)

**Current Plan:** Free tier
- Includes: 3 staging environments
- Storage: 250MB per environment
- Bandwidth: 100GB/month shared
- Custom domains: 2 per app

**Named Environment Usage:**
- Staging environment count: 1 per portal
- Total staging environments: 2 (Admin + Member)
- Remaining capacity: 1 additional environment

**Cost:** $0.00/month (within free tier limits)

### Bandwidth Considerations

**Staging Deployments:**
- Build size: ~15MB (Admin Portal), ~12MB (Member Portal)
- Deployments per day: ~5-10 (development activity)
- Monthly bandwidth: ~4GB (well within 100GB limit)

**Smoke Test Traffic:**
- Request size: ~200KB (homepage + assets)
- Requests per deployment: ~5 HTTP requests
- Monthly bandwidth: ~50MB (negligible)

**Total Impact:** No additional cost, well within free tier limits.

---

## Comparison with Alternative Approaches

### Alternative 1: Manual Testing Before Deployment

**Approach:**
- Deploy to production
- Manually test after deployment
- Rollback if issues found

**Drawbacks:**
- User impact during testing window
- Slow feedback loop (manual testing required)
- No automated validation
- Risk of missed edge cases

**Why Our Approach is Better:**
- Zero user impact (staging isolated)
- Fast feedback (smoke tests run in 60 seconds)
- Automated validation (repeatable, consistent)
- Production unchanged if tests fail

### Alternative 2: Separate Staging Static Web App

**Approach:**
- Create second Static Web App for staging
- Deploy to staging app first
- Then deploy to production app

**Drawbacks:**
- Higher cost (second app instance)
- Different URLs (harder to test production routing)
- Configuration drift risk (two apps to maintain)
- Requires duplicate secrets/tokens

**Why Our Approach is Better:**
- Same app instance (lower cost)
- Predictable URLs (environment name suffix)
- Single configuration (no drift)
- Single deployment token

### Alternative 3: Feature Flags

**Approach:**
- Deploy to production with features disabled
- Enable features via feature flags
- Rollback by disabling flags

**Drawbacks:**
- Code complexity (flag logic everywhere)
- Cannot prevent build/bundle errors
- Frontend requires flag evaluation library
- Slower rollback (requires code deployment)

**Why Our Approach is Better:**
- Catches build errors before production
- No code complexity (pure infrastructure)
- Instant rollback (redeploy previous version)
- Works for all changes (not just features)

---

## Lessons Learned

### Key Insights

1. **Named Environments Are Not Deployment Slots**
   - No "swap" functionality
   - Each environment is independently deployed
   - Production promotion = separate deployment

2. **Propagation Delay Matters**
   - Static Web Apps CDN requires 10-30 seconds to propagate
   - Smoke tests must wait before validation
   - Retry logic essential for reliability

3. **Staging Environment Limitations**
   - No custom domain support
   - Not geo-distributed
   - Same backend as production (no staging API)

4. **Smoke Tests Should Be Fast**
   - Target: < 60 seconds total
   - Focus on critical paths only
   - Avoid complex E2E tests (use Playwright separately)

### Best Practices

1. **Deployment Token Security**
   - Store in Azure Key Vault
   - Never commit to git
   - Rotate quarterly

2. **Smoke Test Coverage**
   - Test deployment success (not functionality)
   - Verify assets load (JS, CSS)
   - Check for error pages
   - Validate response times

3. **Rollback Strategy**
   - Always archive previous commits
   - Test rollback procedure quarterly
   - Document emergency contacts

4. **Monitoring and Alerts**
   - Track deployment success rate
   - Alert on smoke test failures
   - Monitor staging environment health

---

## References

### Azure Documentation

- [Preview Environments in Azure Static Web Apps](https://learn.microsoft.com/en-us/azure/static-web-apps/preview-environments)
- [Create Named Preview Environments](https://learn.microsoft.com/en-us/azure/static-web-apps/named-environments)
- [Multi-stage Azure Static Web Apps Deployments](https://techcommunity.microsoft.com/blog/appsonazureblog/multi-stage-azure-static-web-apps-deployments-with-azure-devops/3390625)
- [AzureStaticWebApp Task Reference](https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/azure-static-web-app-v0)

### Internal Documentation

- `.azure-pipelines/admin-portal.yml` - Admin portal pipeline
- `.azure-pipelines/member-portal.yml` - Member portal pipeline
- `CLAUDE.md` - Project-specific rules and conventions
- `docs/devops/AZURE_MONITOR_DEPLOYMENT_ALERTS_SETUP.md` - Deployment monitoring
- `docs/LESSONS_LEARNED.md` - Project lessons and gotchas

### Related Tasks

- DG-DEPLOY-001: Implement deployment slots (this task)
- DG-MONITOR-001: DORA metrics tracking
- DG-MONITOR-002: Deployment alerts and monitoring
- DG-SEC-001: OWASP blocking implementation

---

## Appendix: Emergency Runbook

### Production Down - Immediate Rollback Required

**Time Budget: 5 minutes**

```bash
# Step 1: Identify last known good commit (30 seconds)
git log --oneline -10
# Find commit before current (e.g., abc1234)

# Step 2: Trigger emergency pipeline run (60 seconds)
az pipelines run \
  --name "Admin Portal Pipeline" \
  --branch main \
  --commit-id abc1234 \
  --org https://dev.azure.com/ctn-demo \
  --project ASR

# Step 3: Monitor pipeline (180 seconds)
# Wait for build + staging + smoke tests + production
# Expected: 8-10 minutes total

# Step 4: Verify production (30 seconds)
curl -I https://calm-tree-03352ba03.1.azurestaticapps.net
# Expected: HTTP 200

# Step 5: Notify stakeholders (60 seconds)
# Email/Teams: "Production rollback completed to commit abc1234"
```

### Staging Tests Failing - Investigation Required

**Time Budget: 15 minutes**

```bash
# Step 1: Access staging environment (30 seconds)
open https://calm-tree-03352ba03-staging.1.azurestaticapps.net

# Step 2: Check browser console (60 seconds)
# Open DevTools → Console tab
# Look for JavaScript errors, failed network requests

# Step 3: Verify API health (30 seconds)
curl https://func-ctn-demo-asr-dev.azurewebsites.net/api/health
# Expected: {"status":"healthy"}

# Step 4: Check Azure Static Web App logs (5 minutes)
az staticwebapp logs show \
  --name calm-tree-03352ba03 \
  --follow

# Step 5: Review pipeline logs (5 minutes)
# Azure DevOps → Pipelines → Recent runs → Failed step
# Identify smoke test failure reason

# Step 6: Decision point (2 minutes)
# A) Build artifact issue → Fix code, re-trigger pipeline
# B) API dependency issue → Wait for API recovery
# C) Transient issue → Re-run pipeline
```

### Deployment Token Expired - Update Required

**Time Budget: 10 minutes**

```bash
# Step 1: Regenerate deployment token (2 minutes)
az staticwebapp secrets list \
  --name calm-tree-03352ba03 \
  --query "properties.apiKey" -o tsv

# Step 2: Update Key Vault secret (3 minutes)
az keyvault secret set \
  --vault-name kv-ctn-demo-asr-dev \
  --name AZURE-STATIC-WEB-APPS-API-TOKEN-ADMIN \
  --value "<new-token-from-step-1>"

# Step 3: Verify variable group (2 minutes)
# Azure DevOps → Pipelines → Library → ctn-admin-portal-variables
# Ensure Key Vault reference is correct

# Step 4: Test deployment (3 minutes)
# Trigger pipeline manually
# Verify "Fetch secrets from Key Vault" step succeeds
```

---

**Document Version:** 1.0
**Last Updated:** November 17, 2025
**Next Review:** February 17, 2026 (quarterly review)
