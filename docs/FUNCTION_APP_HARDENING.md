# Azure Function App Hardening Guide

**Date:** October 25, 2025
**Function App:** `func-ctn-demo-asr-dev`
**Environment:** Production (dev suffix is historical naming)

---

## Overview

This document details the resilience and hardening measures implemented for the CTN ASR Azure Function App to ensure reliability, observability, and rapid issue detection.

---

## Security Hardening

### 1. HTTPS Enforcement ✅
**Status:** Implemented
**Azure Advisor Recommendation:** Security - Medium Impact

```bash
az functionapp update --name func-ctn-demo-asr-dev \
  --resource-group rg-ctn-demo-asr-dev \
  --set httpsOnly=true
```

**Impact:**
- All HTTP requests are automatically redirected to HTTPS
- Prevents man-in-the-middle attacks
- Ensures data encryption in transit

**Verification:**
```bash
curl -i http://func-ctn-demo-asr-dev.azurewebsites.net/api/v1/health
# Should return 301 Moved Permanently to HTTPS URL
```

---

## Observability & Diagnostics

### 2. Startup Diagnostics ✅
**Status:** Implemented
**File:** `api/src/utils/startup-diagnostics.ts`

Comprehensive startup health checks that run on every Function App startup to detect configuration and deployment issues immediately.

**Checks Performed:**
1. ✅ Node.js version (expected: v20.x)
2. ✅ Azure Functions runtime version
3. ✅ Required environment variables (PostgreSQL, Azure AD, JWT, Storage)
4. ⚠️  Optional environment variables (Cosmos, Doc Intelligence, KvK API)
5. ✅ Package dependencies (@azure/functions, pg driver)
6. ⚠️  Application Insights telemetry

**Log Output:**
```
================================================================================
🔍 AZURE FUNCTIONS STARTUP DIAGNOSTICS
================================================================================
Timestamp: 2025-10-25T18:00:00.000Z
Environment: dev
Node.js: v20.10.0
Functions Runtime: ~4
--------------------------------------------------------------------------------
✅ Node.js Version: Running Node.js v20.10.0
✅ Azure Functions Runtime: ~4
✅ Required Environment Variables: All required environment variables are set
⚠️  Optional Environment Variables: Optional features may be disabled: COSMOS_ORCHESTRATION_ENDPOINT
✅ @azure/functions Package: Azure Functions SDK loaded successfully
✅ PostgreSQL Driver: PostgreSQL driver loaded successfully
✅ Application Insights: Telemetry enabled
--------------------------------------------------------------------------------
Summary: 6 passed, 0 failed, 1 warnings
================================================================================
```

**Benefits:**
- **Immediate issue detection** - Know within seconds if deployment has configuration problems
- **Clear error messages** - Tells you exactly which environment variables are missing
- **Fail-fast behavior** - Won't start if critical dependencies are missing
- **Visible in Azure logs** - Easy to diagnose via log stream

**How It Helps:**
- Detects missing environment variables before first request
- Validates Node.js and runtime versions
- Confirms all required packages are loaded
- Provides structured diagnostic output for troubleshooting

---

## Monitoring & Alerts

### 3. Azure Monitor Alerts ✅
**Status:** Script created, ready to execute
**File:** `infrastructure/azure-monitor-alerts.sh`

Comprehensive alerting for critical Function App issues.

**Alerts Configured:**

#### Alert 1: High Error Rate (Severity 1 - Critical)
- **Trigger:** >5 HTTP 5xx errors per minute (averaged over 5 minutes)
- **Description:** Function App experiencing high failure rate
- **Action:** Immediate notification to operations team

#### Alert 2: Function App Down (Severity 0 - Emergency)
- **Trigger:** 0 successful HTTP requests in 5 minutes
- **Description:** Complete outage - no successful requests
- **Action:** Immediate escalation

#### Alert 3: High Response Time (Severity 2 - Warning)
- **Trigger:** Average response time >5 seconds
- **Description:** Performance degradation
- **Action:** Investigation required

#### Alert 4: High Memory Usage (Severity 2 - Warning)
- **Trigger:** Memory working set >900MB
- **Description:** Approaching memory limits
- **Action:** Check for memory leaks

#### Alert 5: Function Execution Failures (Severity 1 - Critical)
- **Trigger:** No function executions AND no successful requests
- **Description:** Startup failure - functions not loading
- **Action:** Check startup diagnostics logs

**Setup Instructions:**
```bash
cd infrastructure
chmod +x azure-monitor-alerts.sh
./azure-monitor-alerts.sh
```

**Note:** Update the email address in the script before running:
```bash
# Line 16 in azure-monitor-alerts.sh
--email-receiver name=admin email=YOUR_EMAIL@ctn.com
```

---

## Resilience Features

### 4. Application Insights Integration ✅
**Status:** Already configured
**Connection:** Linked via Function App tags

The Function App is already connected to Application Insights for:
- Request telemetry (all HTTP requests)
- Dependency tracking (database, storage calls)
- Exception tracking
- Custom events and metrics

**View Telemetry:**
```
Azure Portal → Application Insights → appi-ctn-demo-asr-dev
```

### 5. Host Configuration (host.json)
**Status:** Optimized
**File:** `api/host.json`

Key resilience settings:
```json
{
  "functionTimeout": "00:05:00",     // 5 minute timeout
  "healthMonitor": {
    "enabled": true,                  // Health monitoring enabled
    "healthCheckInterval": "00:00:10",
    "healthCheckWindow": "00:02:00",
    "healthCheckThreshold": 6
  },
  "retry": {
    "strategy": "fixedDelay",
    "maxRetryCount": 3,
    "delayInterval": "00:00:05"       // Retry failed executions
  },
  "cors": {
    "allowedOrigins": [...],          // Restricted origins
    "supportCredentials": true
  }
}
```

### 6. Auto-Scaling
**Status:** Enabled (Consumption Plan)
**Current:** Dynamic scaling with minimum 1 instance

The Function App runs on Consumption Plan which automatically scales based on load:
- **Minimum instances:** 1 (configurable via `minimumElasticInstanceCount`)
- **Maximum instances:** 200 (set in Function App config)
- **Scale-out trigger:** Queue length, HTTP load, CPU, memory

**View Scaling Metrics:**
```bash
az monitor metrics list --resource $FUNCTION_APP_ID \
  --metric "FunctionExecutionCount" \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --interval PT1M
```

---

## Current Configuration Summary

| Feature | Status | Benefit |
|---------|--------|---------|
| HTTPS Only | ✅ Enabled | Security |
| Startup Diagnostics | ✅ Implemented | Issue Detection |
| Application Insights | ✅ Connected | Observability |
| Azure Monitor Alerts | ⚠️ Script Ready | Proactive Monitoring |
| Health Monitoring | ✅ Enabled | Self-healing |
| Auto-Retry | ✅ Enabled | Resilience |
| Auto-Scaling | ✅ Enabled | Performance |
| CORS Restrictions | ✅ Configured | Security |

---

## Deployment & Verification

### Deploy Hardening Changes

```bash
# 1. Commit hardening changes
cd /Users/ramondenoronha/Dev/DIL/ASR-full
git add api/src/utils/startup-diagnostics.ts \
        api/src/index.ts \
        infrastructure/azure-monitor-alerts.sh \
        docs/FUNCTION_APP_HARDENING.md
git commit -m "feat: Add comprehensive Function App hardening

- Add startup diagnostics to detect deployment/config issues
- Enforce HTTPS only (Azure Advisor recommendation)
- Create Azure Monitor alert scripts
- Document all hardening measures

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# 2. Push to trigger deployment
git push origin main

# 3. Wait for pipeline (2-3 minutes)
# https://dev.azure.com/ctn-demo/ASR/_build

# 4. Verify startup diagnostics in logs
az webapp log tail --name func-ctn-demo-asr-dev --resource-group rg-ctn-demo-asr-dev
# Look for: "🔍 AZURE FUNCTIONS STARTUP DIAGNOSTICS"

# 5. Set up alerts (one-time setup)
cd infrastructure
chmod +x azure-monitor-alerts.sh
# Update email address first!
./azure-monitor-alerts.sh
```

### Verification Checklist

After deployment, verify:

- [ ] **HTTPS Enforcement**
  ```bash
  curl -i http://func-ctn-demo-asr-dev.azurewebsites.net/api/v1/health
  # Should redirect to HTTPS
  ```

- [ ] **Startup Diagnostics Logging**
  - Check Azure Function log stream
  - Should see diagnostic output with ✅/⚠️/❌ symbols
  - Summary should show "X passed, 0 failed, Y warnings"

- [ ] **Function Registration**
  ```bash
  func azure functionapp list-functions func-ctn-demo-asr-dev
  # Should show 40+ functions
  ```

- [ ] **API Health Check**
  ```bash
  curl https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1/health
  # Should return {"status": "healthy"}
  ```

- [ ] **Alerts Configured**
  ```bash
  az monitor metrics alert list --resource-group rg-ctn-demo-asr-dev
  # Should show 5 alerts
  ```

---

## Troubleshooting

### Issue: Startup Diagnostics Show Failures

**Symptom:** Diagnostic checks fail with ❌

**Solution:**
1. Check which environment variables are missing in the diagnostic output
2. Add missing variables to Function App configuration:
   ```bash
   az functionapp config appsettings set \
     --name func-ctn-demo-asr-dev \
     --resource-group rg-ctn-demo-asr-dev \
     --settings VARIABLE_NAME=value
   ```
3. Restart Function App:
   ```bash
   az functionapp restart --name func-ctn-demo-asr-dev --resource-group rg-ctn-demo-asr-dev
   ```

### Issue: Functions Still Not Loading

**Symptom:** Log stream shows diagnostics but no "Loading essential functions" message

**Possible Causes:**
1. **package.json main field incorrect** - Should point to `dist/index.js`
2. **node_modules missing** - Pipeline should run `npm ci`
3. **TypeScript compilation errors** - Check build logs

**Diagnostic Steps:**
```bash
# 1. Check package.json
cat api/package.json | grep '"main"'
# Should show: "main": "dist/index.js"

# 2. Check local build
cd api
npm run build
# Should complete without errors

# 3. Test locally
npm start
# Should see startup diagnostics and function registration
```

---

## Future Enhancements

Potential additional hardening measures:

1. **VNet Integration** - Isolate Function App in private network
2. **Key Vault References** - Move secrets from app settings to Key Vault
3. **Deployment Slots** - Blue/green deployments for zero-downtime
4. **Custom Domain + SSL** - Professional endpoint with custom certificate
5. **DDoS Protection** - Additional layer via Application Gateway
6. **Geo-Redundancy** - Multi-region deployment for disaster recovery

---

## References

- [Azure Functions Best Practices](https://learn.microsoft.com/en-us/azure/azure-functions/functions-best-practices)
- [Azure Advisor Recommendations](https://learn.microsoft.com/en-us/azure/advisor/advisor-overview)
- [Application Insights for Azure Functions](https://learn.microsoft.com/en-us/azure/azure-functions/functions-monitoring)
- [Azure Monitor Alerts](https://learn.microsoft.com/en-us/azure/azure-monitor/alerts/alerts-overview)

---

**Maintained by:** CTN Development Team
**Last Updated:** October 25, 2025
