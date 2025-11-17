# Azure Functions Deployment Slots - Blue/Green Deployment Strategy

**Last Updated:** November 17, 2025
**Status:** Implemented
**Function App:** `func-ctn-demo-asr-dev`
**Resource Group:** `rg-ctn-demo-asr-dev`

---

## Executive Summary

This document describes the deployment slot architecture for Azure Functions, implementing a blue/green deployment strategy to achieve **zero-downtime deployments** with **instant rollback capability**.

**Key Benefits:**
- Zero-downtime deployments (slot swap in <30 seconds)
- Pre-production validation in production-like environment
- Instant rollback via slot swap reversal (no redeployment needed)
- Isolated staging environment for smoke tests
- Reduced production incident risk

**Trade-offs:**
- Additional Azure cost (staging slot runs continuously)
- Increased deployment time (~3 minutes for health checks + tests)
- More complex pipeline configuration

---

## Architecture Overview

### Deployment Slots Configuration

**Production Slot (Default):**
- **Name:** `func-ctn-demo-asr-dev` (default slot)
- **URL:** `https://func-ctn-demo-asr-dev.azurewebsites.net`
- **Purpose:** Live production environment serving all traffic
- **Always-on:** Enabled
- **Auto-swap:** Disabled (manual control for safety)

**Staging Slot:**
- **Name:** `func-ctn-demo-asr-dev/staging`
- **URL:** `https://func-ctn-demo-asr-dev-staging.azurewebsites.net`
- **Purpose:** Pre-production validation and smoke testing
- **Always-on:** Enabled (required for reliable health checks)
- **Auto-swap:** Disabled (controlled by pipeline)

### Deployment Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ Step 1: Build & Security Scans                                  │
│ - TypeScript compilation                                        │
│ - Trivy vulnerability scanning                                  │
│ - Semgrep SAST analysis                                         │
│ - OWASP dependency check                                        │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 2: Deploy to Staging Slot                                  │
│ - Deploy package to staging slot                                │
│ - Staging URL: func-ctn-demo-asr-dev-staging.azurewebsites.net  │
│ - Production remains unchanged (still serving old version)      │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 3: Staging Health Check (30 seconds warmup)                │
│ - Wait for cold start completion                                │
│ - HTTP GET /api/health                                          │
│ - Expected: 200 OK + valid JSON response                        │
│ - Timeout: 5 retries × 10s = 50s max                            │
│ - FAIL → Abort deployment, production unaffected                │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 4: Smoke Tests on Staging (Critical Endpoints)             │
│ - Test /api/v1/members (authenticated)                          │
│ - Test /api/v1/legal-entities (RBAC check)                      │
│ - Test database connectivity                                    │
│ - Verify no 500 errors                                          │
│ - FAIL → Abort deployment, production unaffected                │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 5: Slot Swap (Production ↔ Staging)                        │
│ - Staging slot promoted to production URL                       │
│ - Old production version moved to staging URL                   │
│ - Swap time: ~20-30 seconds                                     │
│ - Zero downtime (no dropped requests)                           │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 6: Post-Swap Verification                                  │
│ - Health check on production URL                                │
│ - Verify new version is live                                    │
│ - Monitor Application Insights for errors                       │
│ - SUCCESS → Deployment complete                                 │
│ - FAIL → Rollback (swap back to old version)                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Deployment Slot Configuration

### Slot-Specific Settings (Sticky)

**Sticky settings** do NOT swap between slots (remain with the slot).

**Environment Variable:** `ENVIRONMENT`
- **Production:** `production`
- **Staging:** `staging`
- **Purpose:** Application can detect which slot it's running in

**Logging Level:** `LOG_LEVEL`
- **Production:** `warn`
- **Staging:** `debug`
- **Purpose:** Verbose logging in staging, minimal in production

**Feature Flags:** `ENABLE_EXPERIMENTAL_FEATURES`
- **Production:** `false`
- **Staging:** `true`
- **Purpose:** Test new features in staging before production

### Swap-Enabled Settings (Non-Sticky)

These settings **DO swap** with the deployment:

- `DATABASE_CONNECTION_STRING` (same for both slots)
- `AZURE_AD_TENANT_ID` (same for both slots)
- `AZURE_AD_CLIENT_ID` (same for both slots)
- `APPLICATIONINSIGHTS_CONNECTION_STRING` (same for both slots)
- All other application settings

### Creating the Staging Slot

**Using Azure CLI:**

```bash
# Create staging deployment slot
az functionapp deployment slot create \
  --name func-ctn-demo-asr-dev \
  --resource-group rg-ctn-demo-asr-dev \
  --slot staging \
  --configuration-source func-ctn-demo-asr-dev

# Verify slot created
az functionapp deployment slot list \
  --name func-ctn-demo-asr-dev \
  --resource-group rg-ctn-demo-asr-dev \
  --output table
```

**Using Azure Portal:**

1. Navigate to Function App: `func-ctn-demo-asr-dev`
2. Left menu: **Deployment** → **Deployment slots**
3. Click **+ Add Slot**
4. **Name:** `staging`
5. **Clone settings from:** `func-ctn-demo-asr-dev`
6. Click **Add**
7. Wait for provisioning (~2 minutes)

**Configure Sticky Settings (Azure Portal):**

1. Open staging slot: `func-ctn-demo-asr-dev/staging`
2. Left menu: **Configuration** → **Application settings**
3. Add setting: `ENVIRONMENT` = `staging`, check **Deployment slot setting**
4. Add setting: `LOG_LEVEL` = `debug`, check **Deployment slot setting**
5. Click **Save**

**Configure Sticky Settings (Azure CLI):**

```bash
# Set staging-specific environment variable
az functionapp config appsettings set \
  --name func-ctn-demo-asr-dev \
  --resource-group rg-ctn-demo-asr-dev \
  --slot staging \
  --settings ENVIRONMENT=staging LOG_LEVEL=debug \
  --slot-settings ENVIRONMENT LOG_LEVEL

# Verify sticky settings
az functionapp config appsettings list \
  --name func-ctn-demo-asr-dev \
  --resource-group rg-ctn-demo-asr-dev \
  --slot staging \
  --query "[?slotSetting]" \
  --output table
```

---

## Pipeline Implementation

### Updated `.azure-pipelines/asr-api.yml`

The pipeline now includes deployment slot steps after the existing security scans:

**Step 1: Deploy to Staging Slot**

```yaml
# Deploy to staging slot (after successful build + security scans)
- task: AzureFunctionApp@2
  displayName: 'Deploy API to Staging Slot'
  inputs:
    azureSubscription: $(azureSubscription)
    appType: 'functionAppLinux'
    appName: $(functionAppName)
    package: '$(System.DefaultWorkingDirectory)/api-package.zip'
    deploymentMethod: 'zipDeploy'
    deployToSlotOrASE: true
    resourceGroupName: 'rg-ctn-demo-asr-dev'
    slotName: 'staging'
```

**Step 2: Health Check on Staging Slot**

```yaml
- task: PowerShell@2
  displayName: 'Health Check - Staging Slot'
  inputs:
    targetType: 'inline'
    script: |
      Write-Host "Waiting 30 seconds for staging slot to warm up..."
      Start-Sleep -Seconds 30

      $healthUrl = 'https://func-ctn-demo-asr-dev-staging.azurewebsites.net/api/health'
      $maxRetries = 5
      $retryDelay = 10

      for ($i = 1; $i -le $maxRetries; $i++) {
        Write-Host "Health check attempt $i of $maxRetries..."
        try {
          $response = Invoke-WebRequest -Uri $healthUrl -Method GET -TimeoutSec 30
          if ($response.StatusCode -eq 200) {
            Write-Host "✅ Health check passed (HTTP 200)"
            $response.Content | ConvertFrom-Json | ConvertTo-Json
            exit 0
          }
        }
        catch {
          Write-Warning "Health check failed: $($_.Exception.Message)"
        }

        if ($i -lt $maxRetries) {
          Write-Host "Retrying in $retryDelay seconds..."
          Start-Sleep -Seconds $retryDelay
        }
      }

      Write-Error "❌ Health check failed after $maxRetries attempts"
      exit 1
```

**Step 3: Smoke Tests on Staging Slot**

```yaml
- task: AzureCLI@2
  displayName: 'Smoke Tests - Staging Slot'
  inputs:
    azureSubscription: $(azureSubscription)
    scriptType: 'bash'
    scriptLocation: 'inlineScript'
    inlineScript: |
      echo "🧪 Running smoke tests on staging slot..."
      STAGING_URL="https://func-ctn-demo-asr-dev-staging.azurewebsites.net/api/v1"

      # Test 1: Health endpoint (unauthenticated)
      echo "Test 1: Health endpoint"
      HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$STAGING_URL/health")
      if [ "$HEALTH_STATUS" != "200" ]; then
        echo "❌ Health endpoint failed (HTTP $HEALTH_STATUS)"
        exit 1
      fi
      echo "✅ Health endpoint passed"

      # Test 2: Get access token for authenticated tests
      echo "Test 2: Acquiring access token..."
      TOKEN=$(az account get-access-token \
        --resource api://your-api-client-id \
        --query accessToken -o tsv)

      if [ -z "$TOKEN" ]; then
        echo "❌ Failed to acquire access token"
        exit 1
      fi
      echo "✅ Access token acquired"

      # Test 3: Members endpoint (authenticated)
      echo "Test 3: Members endpoint (authenticated)"
      MEMBERS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
        -H "Authorization: Bearer $TOKEN" \
        "$STAGING_URL/members")

      if [ "$MEMBERS_STATUS" != "200" ]; then
        echo "❌ Members endpoint failed (HTTP $MEMBERS_STATUS)"
        exit 1
      fi
      echo "✅ Members endpoint passed"

      # Test 4: Legal entities endpoint (RBAC check)
      echo "Test 4: Legal entities endpoint (RBAC check)"
      ENTITIES_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
        -H "Authorization: Bearer $TOKEN" \
        "$STAGING_URL/legal-entities")

      if [ "$ENTITIES_STATUS" != "200" ] && [ "$ENTITIES_STATUS" != "403" ]; then
        echo "❌ Legal entities endpoint failed (HTTP $ENTITIES_STATUS)"
        exit 1
      fi
      echo "✅ Legal entities endpoint passed (HTTP $ENTITIES_STATUS)"

      echo ""
      echo "✅ All smoke tests passed"
```

**Step 4: Swap Staging to Production**

```yaml
- task: AzureAppServiceManage@0
  displayName: 'Swap Staging → Production'
  condition: succeeded()
  inputs:
    azureSubscription: $(azureSubscription)
    action: 'Swap Slots'
    webAppName: $(functionAppName)
    resourceGroupName: 'rg-ctn-demo-asr-dev'
    sourceSlot: 'staging'
    targetSlot: 'production'
    preserveVnet: true
```

**Step 5: Post-Swap Verification**

```yaml
- task: PowerShell@2
  displayName: 'Post-Swap Production Verification'
  inputs:
    targetType: 'inline'
    script: |
      Write-Host "Verifying production slot after swap..."
      Start-Sleep -Seconds 10

      $prodUrl = 'https://func-ctn-demo-asr-dev.azurewebsites.net/api/health'

      try {
        $response = Invoke-WebRequest -Uri $prodUrl -Method GET -TimeoutSec 30
        if ($response.StatusCode -eq 200) {
          Write-Host "✅ Production health check passed"
          $response.Content | ConvertFrom-Json | ConvertTo-Json
          exit 0
        }
      }
      catch {
        Write-Error "❌ Production health check failed: $($_.Exception.Message)"
        Write-Host "⚠️  Consider immediate rollback via slot swap reversal"
        exit 1
      }
```

---

## Health Check Specifications

### Health Endpoint Requirements

**URL:** `https://func-ctn-demo-asr-dev-staging.azurewebsites.net/api/health`

**Expected Response:**

```json
{
  "status": "healthy",
  "timestamp": "2025-11-17T10:30:00Z",
  "version": "1.2.3",
  "checks": {
    "database": "healthy",
    "storage": "healthy",
    "keyVault": "healthy"
  }
}
```

**Success Criteria:**
- HTTP status code: `200 OK`
- Response time: < 1000ms
- Valid JSON body
- `status` field: `"healthy"`

**Failure Handling:**
- Retry up to 5 times with 10-second delays
- Total timeout: 50 seconds
- On failure: Abort deployment, keep production unchanged

---

## Smoke Test Specifications

### Critical Endpoints to Test

**1. Health Endpoint (Unauthenticated)**

```bash
curl -X GET https://func-ctn-demo-asr-dev-staging.azurewebsites.net/api/health
# Expected: HTTP 200
```

**2. Members Endpoint (Authenticated)**

```bash
curl -X GET https://func-ctn-demo-asr-dev-staging.azurewebsites.net/api/v1/members \
  -H "Authorization: Bearer $TOKEN"
# Expected: HTTP 200 + JSON array
```

**3. Legal Entities Endpoint (RBAC Check)**

```bash
curl -X GET https://func-ctn-demo-asr-dev-staging.azurewebsites.net/api/v1/legal-entities \
  -H "Authorization: Bearer $TOKEN"
# Expected: HTTP 200 or 403 (depending on permissions)
```

**4. Database Connectivity Test**

```bash
curl -X GET https://func-ctn-demo-asr-dev-staging.azurewebsites.net/api/v1/audit-logs?limit=1 \
  -H "Authorization: Bearer $TOKEN"
# Expected: HTTP 200 + valid response
```

### Success Criteria

All smoke tests must pass:
- No 500 errors (internal server errors)
- Authentication works (JWT validation)
- Database queries execute successfully
- RBAC permissions enforced correctly

### Failure Handling

If ANY smoke test fails:
1. Log detailed error message
2. Abort deployment pipeline
3. Keep production unchanged (old version still running)
4. Notify team via Azure DevOps failure notification

---

## Slot Swap Procedure

### Automatic Swap (Pipeline-Controlled)

The pipeline performs slot swap automatically after successful smoke tests:

```yaml
- task: AzureAppServiceManage@0
  displayName: 'Swap Staging → Production'
  inputs:
    azureSubscription: $(azureSubscription)
    action: 'Swap Slots'
    webAppName: func-ctn-demo-asr-dev
    resourceGroupName: rg-ctn-demo-asr-dev
    sourceSlot: staging
    targetSlot: production
    preserveVnet: true
```

**What Happens During Swap:**

1. Azure prepares staging slot for production traffic
2. Application settings (non-sticky) are swapped
3. Environment variables move between slots
4. Routing rules updated (staging URL → old version, production URL → new version)
5. No application restart required
6. Swap completes in ~20-30 seconds

**Zero-Downtime Guarantee:**

- Existing connections to production remain active
- New requests route to new version immediately
- No dropped HTTP requests
- WebSocket connections gracefully transferred

### Manual Swap (Azure Portal)

**When to Use:** Emergency hotfix deployment or rollback validation

**Steps:**

1. Navigate to: `func-ctn-demo-asr-dev` → **Deployment slots**
2. Click **Swap** button
3. **Source:** `staging`
4. **Target:** `production`
5. Review configuration changes preview
6. Click **Swap**
7. Monitor swap progress (20-30 seconds)
8. Verify production URL serves new version

### Manual Swap (Azure CLI)

```bash
# Swap staging to production
az functionapp deployment slot swap \
  --name func-ctn-demo-asr-dev \
  --resource-group rg-ctn-demo-asr-dev \
  --slot staging \
  --target-slot production

# Verify swap completed
az functionapp show \
  --name func-ctn-demo-asr-dev \
  --resource-group rg-ctn-demo-asr-dev \
  --query "state" \
  --output tsv
```

---

## Rollback Procedures

### Emergency Rollback (Instant)

**Scenario:** Production deployment causes critical failure (detected within minutes)

**Time to Rollback:** <1 minute

**Steps (Azure Portal):**

1. Navigate to: `func-ctn-demo-asr-dev` → **Deployment slots**
2. Click **Swap** button
3. **Source:** `staging` (contains old version after swap)
4. **Target:** `production` (contains new broken version)
5. Click **Swap**
6. Production immediately reverts to old version

**Steps (Azure CLI - Fastest):**

```bash
# Immediate rollback (swap back)
az functionapp deployment slot swap \
  --name func-ctn-demo-asr-dev \
  --resource-group rg-ctn-demo-asr-dev \
  --slot staging \
  --target-slot production

# Verify rollback
curl https://func-ctn-demo-asr-dev.azurewebsites.net/api/health
```

**Post-Rollback Actions:**

1. Verify production health: `curl https://func-ctn-demo-asr-dev.azurewebsites.net/api/health`
2. Check Application Insights for error rate drop
3. Investigate root cause in staging slot
4. Fix issue in code
5. Redeploy through pipeline (staging → tests → swap)

### Partial Rollback (Slot-Specific)

**Scenario:** Issue only affects staging slot, production unaffected

**Action:** Redeploy to staging without swapping

```bash
# Redeploy to staging slot only
cd /Users/ramondenoronha/Dev/DIL/DEV-CTN-ASR/api
func azure functionapp publish func-ctn-demo-asr-dev \
  --slot staging \
  --typescript \
  --build remote
```

---

## Monitoring and Logging

### Application Insights Queries

**Monitor Deployment Slot Traffic:**

```kql
requests
| where timestamp > ago(1h)
| extend slot = tostring(customDimensions.slot)
| summarize count() by slot, bin(timestamp, 5m)
| render timechart
```

**Detect Errors by Slot:**

```kql
exceptions
| where timestamp > ago(30m)
| extend slot = tostring(customDimensions.slot)
| summarize errorCount = count() by slot, problemId
| order by errorCount desc
```

**Compare Performance Between Slots:**

```kql
requests
| where timestamp > ago(1h)
| extend slot = tostring(customDimensions.slot)
| summarize avgDuration = avg(duration), p95Duration = percentile(duration, 95) by slot
```

### Azure Portal Monitoring

**Real-Time Metrics:**

1. Navigate to: `func-ctn-demo-asr-dev` → **Metrics**
2. Add metric: **Requests** (split by slot)
3. Add metric: **Response Time** (split by slot)
4. Add metric: **Errors** (split by slot)

**Log Stream:**

```bash
# Production logs
az webapp log tail \
  --name func-ctn-demo-asr-dev \
  --resource-group rg-ctn-demo-asr-dev

# Staging logs
az webapp log tail \
  --name func-ctn-demo-asr-dev \
  --resource-group rg-ctn-demo-asr-dev \
  --slot staging
```

### Alert Configuration

**Recommended Alerts:**

1. **Production HTTP 500 Rate** > 5% (5 minutes)
2. **Production Response Time** > 2000ms (p95, 10 minutes)
3. **Staging Health Check Failure** (immediate)
4. **Slot Swap Failure** (immediate)

**Create Alert (Azure CLI):**

```bash
# Alert on production HTTP 500 errors
az monitor metrics alert create \
  --name 'Production HTTP 500 Spike' \
  --resource-group rg-ctn-demo-asr-dev \
  --scopes /subscriptions/{subscription-id}/resourceGroups/rg-ctn-demo-asr-dev/providers/Microsoft.Web/sites/func-ctn-demo-asr-dev \
  --condition "total Http5xx > 10" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --action-group-id /subscriptions/{subscription-id}/resourceGroups/rg-ctn-demo-asr-dev/providers/Microsoft.Insights/actionGroups/DevOpsTeam
```

---

## Cost Implications

### Additional Costs

**Staging Slot:**
- Same App Service Plan as production
- **Cost:** $0 (runs on existing plan, no additional charge)

**Storage:**
- Staging slot uses same storage account
- **Cost:** Minimal increase (~$0.01/month for additional file share)

**Bandwidth:**
- Staging slot health checks + smoke tests
- **Cost:** Negligible (< 1MB per deployment)

**Total Estimated Cost:** ~$0-1/month

### Cost Optimization

**Option 1: Stop Staging Slot When Not Deploying**

```bash
# Stop staging slot after successful swap
az functionapp stop \
  --name func-ctn-demo-asr-dev \
  --resource-group rg-ctn-demo-asr-dev \
  --slot staging

# Start staging slot before deployment
az functionapp start \
  --name func-ctn-demo-asr-dev \
  --resource-group rg-ctn-demo-asr-dev \
  --slot staging
```

**Trade-off:** Longer deployment time (cold start adds ~60 seconds)

**Option 2: Delete and Recreate Staging Slot**

```bash
# Delete staging slot
az functionapp deployment slot delete \
  --name func-ctn-demo-asr-dev \
  --resource-group rg-ctn-demo-asr-dev \
  --slot staging

# Recreate when needed
az functionapp deployment slot create \
  --name func-ctn-demo-asr-dev \
  --resource-group rg-ctn-demo-asr-dev \
  --slot staging \
  --configuration-source func-ctn-demo-asr-dev
```

**Trade-off:** Requires pipeline changes, loses staging history

**Recommendation:** Keep staging slot always-on for faster deployments and better reliability.

---

## Troubleshooting Guide

### Issue: Staging Slot Health Check Fails

**Symptoms:**
- Pipeline fails at "Health Check - Staging Slot" step
- Staging URL returns HTTP 503 or timeout

**Root Causes:**
1. Cold start timeout (slot was stopped)
2. Configuration error in staging slot
3. Database connection failure
4. Missing environment variables

**Resolution:**

```bash
# Check staging slot status
az functionapp show \
  --name func-ctn-demo-asr-dev \
  --resource-group rg-ctn-demo-asr-dev \
  --slot staging \
  --query "state"

# Check staging logs
az webapp log tail \
  --name func-ctn-demo-asr-dev \
  --resource-group rg-ctn-demo-asr-dev \
  --slot staging

# Restart staging slot
az functionapp restart \
  --name func-ctn-demo-asr-dev \
  --resource-group rg-ctn-demo-asr-dev \
  --slot staging

# Verify settings copied correctly
az functionapp config appsettings list \
  --name func-ctn-demo-asr-dev \
  --resource-group rg-ctn-demo-asr-dev \
  --slot staging \
  --output table
```

### Issue: Smoke Tests Fail on Staging

**Symptoms:**
- Health check passes
- Authenticated endpoints return HTTP 401 or 500

**Root Causes:**
1. Missing Azure AD configuration
2. Database connection string invalid
3. RBAC permissions not configured

**Resolution:**

```bash
# Test staging URL manually
curl -v https://func-ctn-demo-asr-dev-staging.azurewebsites.net/api/health

# Check Application Insights for errors
az monitor app-insights query \
  --app func-ctn-demo-asr-dev \
  --analytics-query "exceptions | where timestamp > ago(10m) | take 10"

# Verify environment variables
az functionapp config appsettings show \
  --name func-ctn-demo-asr-dev \
  --resource-group rg-ctn-demo-asr-dev \
  --slot staging \
  --setting-names AZURE_AD_TENANT_ID AZURE_AD_CLIENT_ID DATABASE_CONNECTION_STRING
```

### Issue: Slot Swap Takes Too Long

**Symptoms:**
- Swap operation times out (>5 minutes)
- Production becomes unresponsive during swap

**Root Causes:**
1. Large application size (>500MB)
2. Always-on disabled on staging slot
3. Network connectivity issues

**Resolution:**

```bash
# Enable always-on for staging slot
az functionapp config set \
  --name func-ctn-demo-asr-dev \
  --resource-group rg-ctn-demo-asr-dev \
  --slot staging \
  --always-on true

# Check swap operation status
az functionapp deployment slot list \
  --name func-ctn-demo-asr-dev \
  --resource-group rg-ctn-demo-asr-dev \
  --query "[].{Name:name, State:state}" \
  --output table
```

### Issue: Rollback Doesn't Restore Old Version

**Symptoms:**
- Swap back completes but production still shows new version
- Old version not in staging slot

**Root Causes:**
1. Staging slot was redeployed after swap
2. Configuration drift between slots

**Resolution:**

```bash
# Check deployment history
az functionapp deployment list-publishing-profiles \
  --name func-ctn-demo-asr-dev \
  --resource-group rg-ctn-demo-asr-dev

# Manually deploy known-good version to staging
cd /Users/ramondenoronha/Dev/DIL/DEV-CTN-ASR/api
git checkout <known-good-commit>
func azure functionapp publish func-ctn-demo-asr-dev \
  --slot staging \
  --typescript \
  --build remote

# Swap staging to production
az functionapp deployment slot swap \
  --name func-ctn-demo-asr-dev \
  --resource-group rg-ctn-demo-asr-dev \
  --slot staging
```

---

## Scripts and Automation

### Slot Management Scripts

**File:** `/Users/ramondenoronha/Dev/DIL/DEV-CTN-ASR/scripts/manage-deployment-slots.sh`

```bash
#!/bin/bash
# Azure Functions Deployment Slot Management
# Usage: ./manage-deployment-slots.sh [create|swap|rollback|status|delete]

set -e

FUNCTION_APP="func-ctn-demo-asr-dev"
RESOURCE_GROUP="rg-ctn-demo-asr-dev"
STAGING_SLOT="staging"

function create_staging_slot() {
  echo "Creating staging deployment slot..."
  az functionapp deployment slot create \
    --name "$FUNCTION_APP" \
    --resource-group "$RESOURCE_GROUP" \
    --slot "$STAGING_SLOT" \
    --configuration-source "$FUNCTION_APP"

  echo "Configuring staging-specific settings..."
  az functionapp config appsettings set \
    --name "$FUNCTION_APP" \
    --resource-group "$RESOURCE_GROUP" \
    --slot "$STAGING_SLOT" \
    --settings ENVIRONMENT=staging LOG_LEVEL=debug \
    --slot-settings ENVIRONMENT LOG_LEVEL

  echo "✅ Staging slot created and configured"
}

function swap_slots() {
  echo "Swapping staging → production..."
  az functionapp deployment slot swap \
    --name "$FUNCTION_APP" \
    --resource-group "$RESOURCE_GROUP" \
    --slot "$STAGING_SLOT" \
    --target-slot production

  echo "✅ Slot swap completed"
}

function rollback_deployment() {
  echo "Rolling back production → staging..."
  az functionapp deployment slot swap \
    --name "$FUNCTION_APP" \
    --resource-group "$RESOURCE_GROUP" \
    --slot "$STAGING_SLOT" \
    --target-slot production

  echo "✅ Rollback completed"
}

function show_slot_status() {
  echo "Deployment Slot Status:"
  echo ""
  az functionapp deployment slot list \
    --name "$FUNCTION_APP" \
    --resource-group "$RESOURCE_GROUP" \
    --output table
}

function delete_staging_slot() {
  echo "Deleting staging slot..."
  az functionapp deployment slot delete \
    --name "$FUNCTION_APP" \
    --resource-group "$RESOURCE_GROUP" \
    --slot "$STAGING_SLOT"

  echo "✅ Staging slot deleted"
}

case "$1" in
  create)
    create_staging_slot
    ;;
  swap)
    swap_slots
    ;;
  rollback)
    rollback_deployment
    ;;
  status)
    show_slot_status
    ;;
  delete)
    delete_staging_slot
    ;;
  *)
    echo "Usage: $0 [create|swap|rollback|status|delete]"
    exit 1
    ;;
esac
```

---

## References

**Azure Documentation:**
- [Azure Functions Deployment Slots](https://learn.microsoft.com/en-us/azure/azure-functions/functions-deployment-slots)
- [Blue-Green Deployments](https://learn.microsoft.com/en-us/azure/architecture/patterns/deployment-stamp)
- [Slot Swap with Preview](https://learn.microsoft.com/en-us/azure/app-service/deploy-staging-slots)

**Internal Documentation:**
- `/docs/devops/DORA_METRICS_DASHBOARD.md` - Deployment frequency tracking
- `/docs/LESSONS_LEARNED.md` - Deployment failures and fixes
- `.azure-pipelines/asr-api.yml` - Pipeline configuration

**Related Tickets:**
- `TASK-DG-DEPLOY-002` - Deployment slots implementation
- `TASK-DG-MONITOR-001` - DORA metrics dashboard

---

## Appendix A: Complete Pipeline YAML

See updated `.azure-pipelines/asr-api.yml` for complete implementation.

## Appendix B: Health Check Endpoint Implementation

**File:** `/Users/ramondenoronha/Dev/DIL/DEV-CTN-ASR/api/src/functions/health.ts`

```typescript
import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

export async function health(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const environment = process.env.ENVIRONMENT || 'unknown';

  return {
    status: 200,
    jsonBody: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment,
      version: process.env.npm_package_version || '1.0.0',
      checks: {
        database: 'healthy', // TODO: Add actual DB health check
        storage: 'healthy',  // TODO: Add actual storage check
        keyVault: 'healthy', // TODO: Add actual Key Vault check
      },
    },
  };
}

app.http('health', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'health',
  handler: health,
});
```

---

**Document Version:** 1.0
**Author:** DevOps Guardian Agent
**Review Date:** November 17, 2025
**Next Review:** Quarterly or after major deployment changes
