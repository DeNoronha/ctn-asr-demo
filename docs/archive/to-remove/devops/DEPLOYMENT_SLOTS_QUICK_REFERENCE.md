# Azure Functions Deployment Slots - Quick Reference

**Last Updated:** November 17, 2025

---

## Quick Commands

### Create Staging Slot

```bash
./scripts/manage-deployment-slots.sh create
```

### Check Slot Status

```bash
./scripts/manage-deployment-slots.sh status
```

### Manual Swap (Emergency)

```bash
./scripts/manage-deployment-slots.sh swap
```

### Emergency Rollback

```bash
./scripts/manage-deployment-slots.sh rollback
```

### Delete Staging Slot

```bash
./scripts/manage-deployment-slots.sh delete
```

---

## Slot URLs

| Environment | URL |
|-------------|-----|
| **Production** | https://func-ctn-demo-asr-dev.azurewebsites.net |
| **Staging** | https://func-ctn-demo-asr-dev-staging.azurewebsites.net |

---

## Health Check Endpoints

| Environment | Health Endpoint |
|-------------|----------------|
| **Production** | https://func-ctn-demo-asr-dev.azurewebsites.net/api/health |
| **Staging** | https://func-ctn-demo-asr-dev-staging.azurewebsites.net/api/health |

**Test Health:**

```bash
# Production
curl https://func-ctn-demo-asr-dev.azurewebsites.net/api/health | jq

# Staging
curl https://func-ctn-demo-asr-dev-staging.azurewebsites.net/api/health | jq
```

---

## Pipeline Deployment Flow

```
1. Build + Security Scans
   ↓
2. Deploy to Staging Slot
   ↓
3. Health Check (30s warmup + 5 retries)
   ↓
4. Smoke Tests (critical endpoints)
   ↓
5. Swap Staging → Production (20-30s)
   ↓
6. Post-Swap Verification
   ↓
7. Trigger Portal Pipelines
```

**Total Deployment Time:** ~5-7 minutes (was ~3-4 minutes without slots)

**Additional Time:** ~3 minutes for staging tests and swap

**Trade-off:** Slower deployments, but ZERO production failures from bad deployments

---

## Emergency Rollback Procedure

**Time to Rollback:** <60 seconds

**Steps:**

```bash
# Option 1: Using script (recommended)
./scripts/manage-deployment-slots.sh rollback

# Option 2: Azure CLI
az functionapp deployment slot swap \
  --name func-ctn-demo-asr-dev \
  --resource-group rg-ctn-demo-asr-dev \
  --slot staging \
  --target-slot production

# Option 3: Azure Portal
# Navigate to: func-ctn-demo-asr-dev → Deployment slots → Swap
```

**Verify Rollback:**

```bash
curl https://func-ctn-demo-asr-dev.azurewebsites.net/api/health | jq
```

---

## Common Issues

### Issue: "Staging slot not found"

**Cause:** Staging slot hasn't been created yet

**Fix:**

```bash
./scripts/manage-deployment-slots.sh create
```

### Issue: Staging health check fails

**Cause:** Slot is cold (stopped or just deployed)

**Fix:**

```bash
# Check slot status
az functionapp show \
  --name func-ctn-demo-asr-dev \
  --resource-group rg-ctn-demo-asr-dev \
  --slot staging \
  --query "state"

# Restart if needed
az functionapp restart \
  --name func-ctn-demo-asr-dev \
  --resource-group rg-ctn-demo-asr-dev \
  --slot staging
```

### Issue: Smoke tests fail on staging

**Cause:** Configuration mismatch or database connection issue

**Fix:**

```bash
# Check staging logs
az webapp log tail \
  --name func-ctn-demo-asr-dev \
  --resource-group rg-ctn-demo-asr-dev \
  --slot staging

# Verify environment variables
az functionapp config appsettings list \
  --name func-ctn-demo-asr-dev \
  --resource-group rg-ctn-demo-asr-dev \
  --slot staging \
  --output table
```

### Issue: Slot swap takes too long

**Cause:** Always-on disabled on staging slot

**Fix:**

```bash
# Enable always-on
az functionapp config set \
  --name func-ctn-demo-asr-dev \
  --resource-group rg-ctn-demo-asr-dev \
  --slot staging \
  --always-on true
```

---

## Monitoring Commands

### View Production Logs

```bash
az webapp log tail \
  --name func-ctn-demo-asr-dev \
  --resource-group rg-ctn-demo-asr-dev
```

### View Staging Logs

```bash
az webapp log tail \
  --name func-ctn-demo-asr-dev \
  --resource-group rg-ctn-demo-asr-dev \
  --slot staging
```

### Compare Versions

```bash
# Production version
curl -s https://func-ctn-demo-asr-dev.azurewebsites.net/api/health | jq '.version'

# Staging version
curl -s https://func-ctn-demo-asr-dev-staging.azurewebsites.net/api/health | jq '.version'
```

### Check Deployment History

```bash
az functionapp deployment list-publishing-profiles \
  --name func-ctn-demo-asr-dev \
  --resource-group rg-ctn-demo-asr-dev
```

---

## Slot Configuration

### Sticky Settings (Slot-Specific)

These settings do NOT swap:

- `ENVIRONMENT` (production vs staging)
- `LOG_LEVEL` (warn vs debug)
- `ENABLE_EXPERIMENTAL_FEATURES` (false vs true)

### Swap-Enabled Settings

These settings DO swap with deployment:

- `DATABASE_CONNECTION_STRING`
- `AZURE_AD_TENANT_ID`
- `AZURE_AD_CLIENT_ID`
- `APPLICATIONINSIGHTS_CONNECTION_STRING`
- All other application settings

### View Sticky Settings

```bash
az functionapp config appsettings list \
  --name func-ctn-demo-asr-dev \
  --resource-group rg-ctn-demo-asr-dev \
  --slot staging \
  --query "[?slotSetting]" \
  --output table
```

---

## Manual Deployment to Staging

**When to Use:** Testing hotfix before pipeline deployment

```bash
cd /Users/ramondenoronha/Dev/DIL/DEV-CTN-ASR/api

# Deploy to staging slot
func azure functionapp publish func-ctn-demo-asr-dev \
  --slot staging \
  --typescript \
  --build remote

# Test staging
curl https://func-ctn-demo-asr-dev-staging.azurewebsites.net/api/health

# Swap to production if tests pass
./scripts/manage-deployment-slots.sh swap
```

---

## Cost Information

**Staging Slot Cost:** ~$0-1/month

- Runs on same App Service Plan (no additional compute cost)
- Minimal storage increase (~$0.01/month)
- Negligible bandwidth (<1MB per deployment)

**Total Additional Cost:** <$5/year

**ROI:** Prevents production incidents, reduces MTTR, enables instant rollback

---

## Related Documentation

- [Full Documentation](/docs/devops/AZURE_FUNCTIONS_DEPLOYMENT_SLOTS.md)
- [Pipeline Configuration](/.azure-pipelines/asr-api.yml)
- [Deployment Scripts](/scripts/manage-deployment-slots.sh)
- [DORA Metrics Dashboard](/docs/devops/DORA_METRICS_DASHBOARD.md)

---

## Support

**Slack Channel:** #devops-asr
**On-Call:** DevOps rotation
**Escalation:** DevOps team lead

**Emergency Contact:** See `.credentials` file for on-call numbers
