# Function App Deletion Checklist

**Date:** November 20, 2025
**Function App:** `func-ctn-demo-asr-dev`
**Replacement:** Container Apps (`ca-ctn-asr-api-dev`)

## Pre-Deletion Verification ✅

### 1. Container Apps Health Check
```bash
# Status: Running ✅
az containerapp show \
  --name ca-ctn-asr-api-dev \
  --resource-group rg-ctn-demo-asr-dev \
  --query "{status:properties.runningStatus, revision:properties.latestRevisionName}"

# Health: healthy ✅
curl https://ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io/api/health
```

**Result:** ✅ Container Apps is healthy, running revision `ca-ctn-asr-api-dev--0000003`

### 2. Production Portals Using Container Apps ✅
```bash
# Admin Portal
grep VITE_API_URL admin-portal/.env.production
# Output: https://ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io/api/v1 ✅

# Member Portal
grep VITE_API_URL member-portal/.env.production
# Output: https://ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io/api/v1 ✅
```

**Result:** ✅ Both portals configured for Container Apps

### 3. Pipelines Deploy to Container Apps ✅
```bash
# Container Apps pipeline is active
cat .azure-pipelines/container-app-api.yml | grep "template-file"
# Output: infrastructure/bicep/container-app.bicep ✅

# Function App pipelines removed/commented out ✅
```

**Result:** ✅ No active Function App deployments

### 4. No Critical Dependencies ✅
- API client uses runtime baseURL (environment variable) ✅
- Test scripts reference old URL (need updating but non-blocking) ⚠️
- Documentation has historical references (informational only) ℹ️
- Monitoring scripts need updating (see cleanup tasks below) ⚠️

---

## Deletion Steps

### Step 1: Stop the Function App (Test Impact)
```bash
# Stop without deleting (reversible)
az functionapp stop \
  --name func-ctn-demo-asr-dev \
  --resource-group rg-ctn-demo-asr-dev

echo "Function App stopped. Monitor for 1 hour..."
```

**Monitor these for 1 hour:**
- [ ] Admin Portal health: https://calm-tree-03352ba03.1.azurestaticapps.net
- [ ] Member Portal health: https://calm-pebble-043b2db03.1.azurestaticapps.net
- [ ] Container Apps metrics: Check requests are still flowing
- [ ] No error alerts triggered

### Step 2: Delete the Function App
```bash
# After 1 hour with no issues, delete permanently
az functionapp delete \
  --name func-ctn-demo-asr-dev \
  --resource-group rg-ctn-demo-asr-dev

echo "✅ Function App deleted"
```

### Step 3: Delete Associated Resources
```bash
# Delete App Service Plan (if not used by other apps)
az appservice plan delete \
  --name plan-ctn-demo-asr-dev \
  --resource-group rg-ctn-demo-asr-dev \
  --yes

# Keep Storage Account - may have historical data
# Note: Check if storage account has logs/data before deleting
az storage account show \
  --name stappctndemoasrdev \
  --resource-group rg-ctn-demo-asr-dev
```

---

## Post-Deletion Cleanup Tasks

### Priority 1: Update Monitoring Scripts (CRITICAL)
```bash
# Update health monitoring
sed -i '' 's/func-ctn-demo-asr-dev/ca-ctn-asr-api-dev/g' infrastructure/health-monitoring-alerts.sh
sed -i '' 's/azurewebsites\.net/azurecontainerapps.io/g' infrastructure/health-monitoring-alerts.sh

# Update Azure Monitor alerts
sed -i '' 's/func-ctn-demo-asr-dev/ca-ctn-asr-api-dev/g' infrastructure/azure-monitor-alerts.sh
```

### Priority 2: Update Test Scripts
```bash
# Update all test scripts to use Container Apps URL
find tests/api/curl -type f -name "*.sh" -exec sed -i '' \
  's|https://func-ctn-demo-asr-dev.azurewebsites.net/api|https://ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io/api|g' {} +

# Update test configs
sed -i '' 's|func-ctn-demo-asr-dev.azurewebsites.net|ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io|g' \
  tests/api/integration/test-config.js
```

### Priority 3: Update Documentation
```bash
# Update README
sed -i '' 's|func-ctn-demo-asr-dev.azurewebsites.net|ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io|g' README.md

# Update code examples in api-client
sed -i '' 's|func-ctn-demo-asr-dev.azurewebsites.net|ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io|g' \
  packages/api-client/src/client.ts

# Update .azure-pipelines comments
sed -i '' 's|func-ctn-demo-asr-dev.azurewebsites.net|ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io|g' \
  .azure-pipelines/admin-portal.yml \
  .azure-pipelines/member-portal.yml
```

### Priority 4: Update CLAUDE.md
Remove all references to Function App deployment commands:
- ❌ `func azure functionapp publish`
- ❌ `func azure functionapp logstream`
- ✅ Keep Container Apps deployment docs only

---

## Rollback Plan (If Needed)

**If issues arise within 1 hour of stopping:**
```bash
# Restart the Function App
az functionapp start \
  --name func-ctn-demo-asr-dev \
  --resource-group rg-ctn-demo-asr-dev

# Temporarily update portals to use Function App
# (This requires redeployment - avoid if possible)
```

**Note:** After deletion, rollback requires redeploying from backup or rebuilding Function App infrastructure.

---

## Cost Savings

**Function App Resources to be Removed:**
- Function App: `func-ctn-demo-asr-dev` (consumption or premium plan)
- App Service Plan: `plan-ctn-demo-asr-dev`
- **Estimated Monthly Savings:** €50-150 (depending on plan tier)

**Retained Resources:**
- Storage Account: Keep for historical logs/data
- Application Insights: Shared with Container Apps

---

## Timeline

| Step | Duration | Status |
|------|----------|--------|
| Stop Function App | 5 min | ⏸️ Pending |
| Monitor period | 1 hour | ⏸️ Pending |
| Delete Function App | 5 min | ⏸️ Pending |
| Delete App Service Plan | 5 min | ⏸️ Pending |
| Update monitoring scripts | 10 min | ⏸️ Pending |
| Update test scripts | 15 min | ⏸️ Pending |
| Update documentation | 10 min | ⏸️ Pending |
| **Total** | **~2 hours** | |

---

## Sign-Off

- [ ] Container Apps verified healthy for 1+ hour
- [ ] Function App stopped and monitored
- [ ] No production issues detected
- [ ] Function App deleted
- [ ] App Service Plan deleted
- [ ] Monitoring scripts updated
- [ ] Test scripts updated
- [ ] Documentation updated
- [ ] CLAUDE.md updated

**Completed By:** _______________
**Date:** _______________
**Verified By:** _______________
