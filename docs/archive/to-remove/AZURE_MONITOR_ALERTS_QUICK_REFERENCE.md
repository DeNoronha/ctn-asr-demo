# Azure Monitor Alerts - Quick Reference

**Last Updated:** November 17, 2025

---

## Quick Commands

### Check Alert Status

```bash
# List all ASR alerts
az monitor metrics alert list \
  --resource-group rg-ctn-demo-asr-dev \
  --query "[?contains(name, 'ASR')].{Name:name, Enabled:enabled, Severity:severity}" \
  --output table

# Check if specific alert is firing
az monitor metrics alert show \
  --name "ASR-Health-Endpoint-Unhealthy" \
  --resource-group rg-ctn-demo-asr-dev \
  --query "{Name:name, Enabled:enabled, LastUpdated:lastUpdatedTime}"
```

### Get Teams Webhook URL

```bash
# Retrieve from Key Vault
az keyvault secret show \
  --vault-name kv-ctn-demo-asr-dev \
  --name TEAMS-WEBHOOK-DEPLOYMENTS \
  --query value -o tsv
```

### Test Teams Webhook

```bash
WEBHOOK_URL=$(az keyvault secret show \
  --vault-name kv-ctn-demo-asr-dev \
  --name TEAMS-WEBHOOK-DEPLOYMENTS \
  --query value -o tsv)

curl -H "Content-Type: application/json" \
  -d '{"text": "Test from CLI"}' \
  "$WEBHOOK_URL"
```

### Disable Alert (Maintenance Mode)

```bash
# Disable single alert
az monitor metrics alert update \
  --name "ASR-Health-Endpoint-Unhealthy" \
  --resource-group rg-ctn-demo-asr-dev \
  --enabled false

# Re-enable after maintenance
az monitor metrics alert update \
  --name "ASR-Health-Endpoint-Unhealthy" \
  --resource-group rg-ctn-demo-asr-dev \
  --enabled true
```

### Disable ALL Alerts (Emergency)

```bash
# Disable all ASR alerts
for alert in $(az monitor metrics alert list \
  --resource-group rg-ctn-demo-asr-dev \
  --query "[?contains(name, 'ASR')].name" -o tsv); do
  az monitor metrics alert update \
    --name "$alert" \
    --resource-group rg-ctn-demo-asr-dev \
    --enabled false
  echo "Disabled: $alert"
done
```

---

## Alert Severity Reference

| Severity | Azure Sev | When to Use | Notification |
|----------|-----------|-------------|--------------|
| **Critical** | 0 | System completely down | Teams + Email + SMS |
| **High** | 1 | Service degraded, user impact | Teams + Email |
| **Medium** | 2 | Warning, potential issue | Teams |
| **Low** | 3 | Informational, no action needed | Email |

---

## Common Troubleshooting

### Issue: Alert Not Firing

```bash
# 1. Check if alert is enabled
az monitor metrics alert show \
  --name "ASR-Health-Endpoint-Unhealthy" \
  --resource-group rg-ctn-demo-asr-dev \
  --query "enabled"

# 2. Check if metric data exists
az monitor metrics list \
  --resource /subscriptions/$(az account show --query id -o tsv)/resourceGroups/rg-ctn-demo-asr-dev/providers/Microsoft.Web/sites/func-ctn-demo-asr-dev \
  --metric Http5xx \
  --start-time 2025-11-17T00:00:00Z

# 3. Check alert condition threshold
az monitor metrics alert show \
  --name "ASR-Health-Endpoint-Unhealthy" \
  --resource-group rg-ctn-demo-asr-dev \
  --query "criteria"
```

### Issue: Teams Webhook Not Working

```bash
# Test webhook directly
WEBHOOK_URL=$(az keyvault secret show \
  --vault-name kv-ctn-demo-asr-dev \
  --name TEAMS-WEBHOOK-DEPLOYMENTS \
  --query value -o tsv)

HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Content-Type: application/json" \
  -d '{"text": "Test"}' \
  "$WEBHOOK_URL")

echo "HTTP Status: $HTTP_STATUS"
# Expected: 200
```

### Issue: Too Many Alerts (Alert Storm)

```bash
# Increase evaluation frequency (check less often)
az monitor metrics alert update \
  --name "ASR-Health-Endpoint-Unhealthy" \
  --resource-group rg-ctn-demo-asr-dev \
  --evaluation-frequency 5m \
  --window-size 15m

# Increase threshold (less sensitive)
az monitor metrics alert update \
  --name "ASR-Health-Endpoint-Unhealthy" \
  --resource-group rg-ctn-demo-asr-dev \
  --condition "count Http5xx >= 10"  # was: >= 5
```

---

## Alert Thresholds

### API Health Alerts

| Alert | Threshold | Window | Frequency |
|-------|-----------|--------|-----------|
| Health Endpoint Unhealthy | Http5xx >= 5 | 5m | 1m |
| Slow Response | ResponseTime > 5000ms | 5m | 1m |
| Function Failures | Http5xx > 10 | 5m | 1m |
| High Memory | MemoryWorkingSet > 800MB | 15m | 5m |

### Application Insights Alerts

| Alert | Threshold | Window | Frequency |
|-------|-----------|--------|-----------|
| High Error Rate | Failures > 10 | 5m | 1m |
| Slow API Response | Duration > 1000ms | 5m | 1m |
| Database Slow | SQL Duration > 500ms | 5m | 1m |
| High Exceptions | Exceptions > 5 | 5m | 1m |
| Auth Failures | resolve_party_failure > 3 | 5m | 1m |

---

## Pipeline Failure Notifications

### Check Recent Pipeline Runs

```bash
# Azure DevOps CLI
az pipelines runs list \
  --org https://dev.azure.com/ctn-demo \
  --project ASR \
  --top 10 \
  --query "[].{ID:id, Pipeline:definition.name, Status:status, Result:result, Branch:sourceBranch}" \
  --output table
```

### Get Pipeline Run Details

```bash
# Get specific build details
az pipelines runs show \
  --org https://dev.azure.com/ctn-demo \
  --project ASR \
  --id <BUILD_ID> \
  --query "{Pipeline:definition.name, Status:status, Result:result, StartTime:startTime, FinishTime:finishTime}"
```

---

## Links

### Azure Portal

- **Monitor - Alerts:** https://portal.azure.com/#view/Microsoft_Azure_Monitoring/AlertsManagementResource/alertsSummary
- **Application Insights:** https://portal.azure.com/#@/resource/subscriptions/$(az account show --query id -o tsv)/resourceGroups/rg-ctn-demo-asr-dev/providers/microsoft.insights/components/appi-ctn-demo-asr-dev
- **Function App Metrics:** https://portal.azure.com/#@/resource/subscriptions/$(az account show --query id -o tsv)/resourceGroups/rg-ctn-demo-asr-dev/providers/Microsoft.Web/sites/func-ctn-demo-asr-dev/metrics

### Azure DevOps

- **ASR Project:** https://dev.azure.com/ctn-demo/ASR
- **Pipeline History:** https://dev.azure.com/ctn-demo/ASR/_build
- **Service Hooks:** https://dev.azure.com/ctn-demo/ASR/_settings/serviceHooks

---

## Alert Action Scripts

### Run Setup

```bash
cd /Users/ramondenoronha/Dev/DIL/DEV-CTN-ASR
./scripts/setup-deployment-alerts.sh
```

### Run Tests

```bash
# All tests (including destructive)
./scripts/test-all-alerts.sh

# Skip tests that stop services
./scripts/test-all-alerts.sh --skip-destructive
```

### Existing Infrastructure Scripts

```bash
# Health monitoring alerts
./infrastructure/health-monitoring-alerts.sh

# Application Insights alerts
./infrastructure/app-insights-alerts.sh

# Azure Monitor alerts (Function App resilience)
./infrastructure/azure-monitor-alerts.sh
```

---

## Emergency Procedures

### Silence All Alerts (Planned Maintenance)

```bash
# Before maintenance
for alert in $(az monitor metrics alert list \
  --resource-group rg-ctn-demo-asr-dev \
  --query "[?contains(name, 'ASR')].name" -o tsv); do
  az monitor metrics alert update \
    --name "$alert" \
    --resource-group rg-ctn-demo-asr-dev \
    --enabled false
done

# After maintenance (re-enable)
for alert in $(az monitor metrics alert list \
  --resource-group rg-ctn-demo-asr-dev \
  --query "[?contains(name, 'ASR')].name" -o tsv); do
  az monitor metrics alert update \
    --name "$alert" \
    --resource-group rg-ctn-demo-asr-dev \
    --enabled true
done
```

### Check Service Health

```bash
# API Health
curl https://func-ctn-demo-asr-dev.azurewebsites.net/api/health | jq

# Admin Portal
curl -I https://calm-tree-03352ba03.1.azurestaticapps.net

# Member Portal
curl -I https://calm-pebble-043b2db03.1.azurestaticapps.net
```

---

## Documentation

- **Full Setup Guide:** [docs/AZURE_MONITOR_DEPLOYMENT_ALERTS_SETUP.md](./AZURE_MONITOR_DEPLOYMENT_ALERTS_SETUP.md)
- **CLAUDE.md:** [CLAUDE.md](../CLAUDE.md)
- **Azure Monitor Docs:** https://learn.microsoft.com/en-us/azure/azure-monitor/alerts/alerts-overview
