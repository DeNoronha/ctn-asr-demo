# Azure Monitor Deployment Alerts Setup Guide

**Last Updated:** November 17, 2025
**Priority:** Batch 12 - Quick Wins (LOW)
**Effort:** 2 hours
**Status:** Complete

---

## Executive Summary

This guide provides comprehensive instructions for configuring Azure Monitor alerts for deployment failures, health check failures, and security scan blocking in the CTN ASR monorepo. The alert system ensures the team is notified immediately when deployments fail, reducing response time from hours to minutes.

### Alert Coverage

| Alert Type | Severity | Target | Notification Channel |
|------------|----------|--------|---------------------|
| Pipeline Failure | High | Azure DevOps | Teams + Email |
| Health Check Failure | Critical | Function App / Static Web Apps | Teams + Email |
| Security Scan Blocking | Medium | Semgrep / OWASP / Trivy | Teams |
| API Performance | Medium | Application Insights | Email |
| Database Issues | High | PostgreSQL Flexible Server | Teams + Email |

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Alert Strategy](#alert-strategy)
3. [Setup Instructions](#setup-instructions)
   - [Part 1: Azure DevOps Pipeline Alerts](#part-1-azure-devops-pipeline-alerts)
   - [Part 2: Health Check Failure Alerts](#part-2-health-check-failure-alerts)
   - [Part 3: Security Scan Blocking Alerts](#part-3-security-scan-blocking-alerts)
   - [Part 4: Application Insights Alerts](#part-4-application-insights-alerts)
4. [Teams Webhook Integration](#teams-webhook-integration)
5. [Testing Alerts](#testing-alerts)
6. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Tools

```bash
# Azure CLI (version 2.50+)
az --version

# Azure DevOps CLI extension
az extension add --name azure-devops

# jq for JSON parsing
brew install jq  # macOS
sudo apt-get install jq  # Ubuntu

# PowerShell (for Teams webhook testing)
# Pre-installed on Windows, install on macOS/Linux if needed
```

### Required Permissions

- **Azure Portal:**
  - `Contributor` role on `rg-ctn-demo-asr-dev` resource group
  - `Monitoring Contributor` role for alert creation

- **Azure DevOps:**
  - `Project Administrator` or `Build Administrator` role in ASR project
  - Access to create service hooks

- **Microsoft Teams:**
  - Permission to add incoming webhooks to the target channel
  - Channel ownership or admin rights

### Azure Resources

```bash
RESOURCE_GROUP="rg-ctn-demo-asr-dev"
SUBSCRIPTION_ID=$(az account show --query id -o tsv)

# Verify resources exist
az group show --name $RESOURCE_GROUP
az functionapp show --name func-ctn-demo-asr-dev --resource-group $RESOURCE_GROUP
az monitor app-insights component show --app appi-ctn-demo-asr-dev --resource-group $RESOURCE_GROUP
```

---

## Alert Strategy

### Design Principles

1. **Actionable Only:** Avoid alert fatigue - only alert on conditions requiring human intervention
2. **Clear Remediation:** Every alert includes specific remediation steps
3. **Severity-Based Routing:** Critical alerts go to multiple channels, warnings to a single channel
4. **Fail-Safe:** Alerts should not depend on the failing system (e.g., don't send API alerts via the API)

### Alert Severity Mapping

| Severity | Azure Sev | Description | Response Time | Notification |
|----------|-----------|-------------|---------------|--------------|
| **Critical** | 0 | System down, data loss imminent | < 15 minutes | Teams + Email + SMS |
| **High** | 1 | Service degraded, user impact | < 30 minutes | Teams + Email |
| **Medium** | 2 | Warning, potential issues | < 2 hours | Teams |
| **Low** | 3 | Informational, no immediate action | < 1 day | Email only |

### Alert Thresholds

**Pipeline Failures:**
- Trigger: ANY pipeline failure in ASR project
- Evaluation: Immediate (event-driven)
- Suppression: 5 minutes (avoid duplicate alerts for same build)

**Health Check Failures:**
- Trigger: 3 consecutive health check failures OR 5 failures in 5 minutes
- Evaluation: Every 1 minute
- Suppression: 10 minutes

**Security Scan Blocking:**
- Trigger: Semgrep ERROR severity findings (build blocking)
- Evaluation: Per pipeline run
- Suppression: Per commit (no suppression across builds)

**Performance Degradation:**
- Trigger: Average response time > 5 seconds for 5 minutes
- Evaluation: Every 5 minutes
- Suppression: 30 minutes

---

## Setup Instructions

### Part 1: Azure DevOps Pipeline Alerts

Azure DevOps supports **Service Hooks** that trigger on pipeline events (build completed, build failed, etc.). We'll use webhooks to send notifications to Teams.

#### Option A: Teams Integration (Recommended)

**Step 1: Create Teams Incoming Webhook**

1. Open Microsoft Teams, navigate to your target channel (e.g., `#asr-deployments`)
2. Click the `...` menu next to the channel name → **Manage channel**
3. Go to **Connectors** tab
4. Search for **Incoming Webhook**
5. Click **Configure**
6. Name: `ASR Pipeline Alerts`
7. Upload icon (optional)
8. Click **Create**
9. **COPY THE WEBHOOK URL** (you'll need this in Step 2)
10. Click **Done**

**Example Webhook URL:**
```
https://contoso.webhook.office.com/webhookb2/xxxxx/IncomingWebhook/yyyy/zzzzz
```

**Step 2: Create Azure DevOps Service Hook**

```bash
# Set variables
WEBHOOK_URL="<YOUR_TEAMS_WEBHOOK_URL_FROM_STEP_1>"
AZDO_ORG="https://dev.azure.com/ctn-demo"
AZDO_PROJECT="ASR"

# Login to Azure DevOps
az devops login --organization $AZDO_ORG

# Create service hook for pipeline failures
az devops service-endpoint create \
  --organization $AZDO_ORG \
  --project $AZDO_PROJECT \
  --service-endpoint-configuration '{
    "type": "ms.webhooks",
    "url": "'"$WEBHOOK_URL"'",
    "name": "ASR Pipeline Failure Alerts",
    "eventType": "build.complete",
    "filters": {
      "buildStatus": "failed"
    }
  }'
```

**Step 3: Configure Alert Message Format**

Azure DevOps sends JSON payloads. Teams expects specific formatting. Use the webhook configurator in Teams to customize the message card:

**Example JSON Payload (sent by Azure DevOps):**
```json
{
  "id": "12345",
  "eventType": "build.complete",
  "resource": {
    "status": "failed",
    "definition": {
      "name": "Association-Register-API"
    },
    "sourceBranch": "refs/heads/main",
    "sourceVersion": "abc123",
    "url": "https://dev.azure.com/ctn-demo/ASR/_build/results?buildId=12345"
  }
}
```

**Teams Message Card (formatted automatically by connector):**

```
🚨 Pipeline Failure Alert

Pipeline: Association-Register-API
Branch: main
Commit: abc123
Status: Failed

[View Build](https://dev.azure.com/ctn-demo/ASR/_build/results?buildId=12345)
```

#### Option B: Email Notifications (Basic)

If Teams is not available, use Azure DevOps built-in email notifications:

1. Navigate to **Azure DevOps** → **ASR Project** → **Project Settings**
2. Click **Notifications** under General
3. Click **New subscription**
4. Select **Build completed**
5. Filter:
   - **Build pipeline:** All pipelines (or specific: `Association-Register-API`, `Association-Register-Admin`, `Association-Register-Member`)
   - **Build status:** `Failed`
6. Delivery:
   - **Email:** Enter team email or distribution list
7. Click **Save**

**Repeat for all 3 pipelines:**
- `Association-Register-API` (asr-api.yml)
- `Association-Register-Admin` (admin-portal.yml)
- `Association-Register-Member` (member-portal.yml)

#### Option C: Azure Logic Apps (Advanced)

For complex routing logic (e.g., only alert during business hours, route by severity):

1. Create Logic App in Azure Portal
2. Trigger: **HTTP Request** (webhook endpoint)
3. Action: **Parse JSON** (parse Azure DevOps payload)
4. Condition: **If buildStatus == 'failed'**
5. Action: **Send Teams Message** (using Teams connector)

**See `scripts/setup-logic-app-alerts.json` for full Logic App ARM template.**

---

### Part 2: Health Check Failure Alerts

Health checks are implemented in:
- **API:** `GET /api/health` (returns 200 OK or 503 Service Unavailable)
- **Admin Portal:** HTTP 200 on root URL
- **Member Portal:** HTTP 200 on root URL

#### API Health Check Alerts

**Existing Script:** `infrastructure/health-monitoring-alerts.sh`

Run the script to create alerts:

```bash
cd infrastructure
chmod +x health-monitoring-alerts.sh
./health-monitoring-alerts.sh
```

**What it creates:**
- `ASR-Health-Endpoint-Unhealthy` (Severity 1)
- `ASR-Health-Check-Slow-Response` (Severity 2)
- `ASR-Function-Execution-Failures` (Severity 1)
- `ASR-High-Memory-Usage` (Severity 2)

**Verify alerts:**
```bash
az monitor metrics alert list \
  --resource-group rg-ctn-demo-asr-dev \
  --query "[?contains(name, 'ASR')].{Name:name, Severity:severity, Enabled:enabled}" \
  --output table
```

#### Static Web App Alerts (Admin/Member Portals)

Static Web Apps don't expose health endpoints by default. Use **Availability Tests** in Application Insights:

**Step 1: Create Availability Test (Admin Portal)**

```bash
RESOURCE_GROUP="rg-ctn-demo-asr-dev"
APP_INSIGHTS="appi-ctn-demo-asr-dev"
ADMIN_PORTAL_URL="https://calm-tree-03352ba03.1.azurestaticapps.net"

az monitor app-insights web-test create \
  --resource-group $RESOURCE_GROUP \
  --app $APP_INSIGHTS \
  --name "ASR-Admin-Portal-Availability" \
  --location "westeurope" \
  --kind "ping" \
  --web-test-properties-configuration '{
    "WebTest": "<WebTest><Items><Request Url=\"'"$ADMIN_PORTAL_URL"'\"/></Items></WebTest>",
    "Frequency": 300,
    "Timeout": 30,
    "Enabled": true,
    "Locations": [
      {"Id": "emea-nl-ams-azr"},
      {"Id": "us-va-ash-azr"},
      {"Id": "apac-sg-sin-azr"}
    ]
  }'
```

**Step 2: Create Alert for Availability Test Failures**

```bash
WEB_TEST_ID=$(az monitor app-insights web-test show \
  --resource-group $RESOURCE_GROUP \
  --name "ASR-Admin-Portal-Availability" \
  --app $APP_INSIGHTS \
  --query "id" -o tsv)

az monitor metrics alert create \
  --name "ASR-Admin-Portal-Down" \
  --resource-group $RESOURCE_GROUP \
  --scopes $WEB_TEST_ID \
  --condition "count availabilityResults/availabilityPercentage < 80" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --severity 0 \
  --description "Critical: Admin Portal availability below 80% (3+ test locations failing)"
```

**Repeat for Member Portal:**
```bash
MEMBER_PORTAL_URL="https://calm-pebble-043b2db03.1.azurestaticapps.net"
# ... same steps as above, change names to "ASR-Member-Portal-*"
```

---

### Part 3: Security Scan Blocking Alerts

Security scans run in pipelines:
- **Semgrep:** SAST (Static Application Security Testing)
- **OWASP Dependency Check:** Vulnerable dependencies
- **Trivy:** Container image vulnerabilities
- **Gitleaks:** Secret scanning

#### Current Implementation

**Pipeline Behavior:**
- Semgrep ERROR severity → **Blocks build** (exit code 1)
- OWASP CVSS >= 7.0 → **Blocks build** (`failOnCVSS: '7'`)
- Trivy HIGH/CRITICAL → **Blocks build** (`--exit-code 1`)
- Gitleaks secrets found → **Warning only** (`continueOnError: true`)

**Alert Strategy:**
Since security scan failures already block the build, they trigger the **Pipeline Failure Alert** (Part 1). No additional alerts needed.

**Optional: Dedicated Security Alerts**

If you want separate notifications for security failures (e.g., to a dedicated #security-alerts channel):

1. Create a second Teams webhook for security alerts
2. Add a pipeline step that checks for security failures and posts to webhook:

**Add to `.azure-pipelines/asr-api.yml` (after Semgrep step):**

```yaml
- script: |
    if [ -f semgrep-results.json ]; then
      ERROR_COUNT=$(jq '[.results[] | select(.extra.severity == "ERROR")] | length' semgrep-results.json)
      if [ "$ERROR_COUNT" -gt 0 ]; then
        curl -H 'Content-Type: application/json' \
          -d '{
            "@type": "MessageCard",
            "@context": "http://schema.org/extensions",
            "summary": "Security Scan Blocking Build",
            "themeColor": "FF0000",
            "title": "🔒 Security Scan Failure",
            "sections": [{
              "facts": [
                {"name": "Pipeline:", "value": "$(Build.DefinitionName)"},
                {"name": "Branch:", "value": "$(Build.SourceBranch)"},
                {"name": "Commit:", "value": "$(Build.SourceVersion)"},
                {"name": "Findings:", "value": "'"$ERROR_COUNT"' ERROR severity issues"}
              ]
            }],
            "potentialAction": [{
              "@type": "OpenUri",
              "name": "View Build",
              "targets": [{"os": "default", "uri": "$(Build.BuildUri)"}]
            }]
          }' \
          https://YOUR-SECURITY-TEAMS-WEBHOOK-URL.webhook.office.com/webhookb2/xxxxx
      fi
    fi
  displayName: 'Send Security Alert to Teams'
  condition: failed()
  continueOnError: true
```

---

### Part 4: Application Insights Alerts

**Existing Scripts:**
- `infrastructure/app-insights-alerts.sh` - API performance alerts
- `infrastructure/azure-monitor-alerts.sh` - Function App resilience alerts

**Run both scripts to create full alert coverage:**

```bash
cd infrastructure
chmod +x app-insights-alerts.sh azure-monitor-alerts.sh
./app-insights-alerts.sh
./azure-monitor-alerts.sh
```

**What gets created:**

**Performance Alerts:**
- High API Error Rate (>10 failures/5min)
- Slow API Response (avg >1s)
- Slow Database Queries (avg >500ms)
- High Exception Rate (>5 exceptions/5min)
- Authentication Failures (>3 failures/5min)

**Resilience Alerts:**
- Function App Down (no successful requests)
- High Memory Usage (>900MB)
- Function Execution Failures

**Add Action Groups for Notifications:**

```bash
RESOURCE_GROUP="rg-ctn-demo-asr-dev"

# Create action group for critical alerts (Teams + Email)
az monitor action-group create \
  --name "ag-ctn-asr-critical" \
  --resource-group $RESOURCE_GROUP \
  --short-name "ASR-Crit" \
  --email-receiver name="DevTeam" email="devteam@ctn.com" \
  --webhook-receiver name="Teams" service-uri="https://YOUR-TEAMS-WEBHOOK-URL.webhook.office.com/webhookb2/xxxxx"

# Create action group for warnings (Email only)
az monitor action-group create \
  --name "ag-ctn-asr-warnings" \
  --resource-group $RESOURCE_GROUP \
  --short-name "ASR-Warn" \
  --email-receiver name="DevTeam" email="devteam@ctn.com"

# Update existing alerts to use action groups
ACTION_GROUP_ID=$(az monitor action-group show \
  --name "ag-ctn-asr-critical" \
  --resource-group $RESOURCE_GROUP \
  --query "id" -o tsv)

# Update each alert (example for one)
az monitor metrics alert update \
  --name "ASR-Health-Endpoint-Unhealthy" \
  --resource-group $RESOURCE_GROUP \
  --add-action $ACTION_GROUP_ID
```

**Repeat for all alerts** (see `scripts/update-alert-action-groups.sh` for automated script).

---

## Teams Webhook Integration

### Webhook Security

**Best Practices:**
1. Store webhook URL in Azure Key Vault (never commit to git)
2. Use separate webhooks for different alert severities
3. Rotate webhook URLs every 90 days
4. Monitor webhook usage for abuse

**Store webhook in Key Vault:**

```bash
WEBHOOK_URL="https://contoso.webhook.office.com/webhookb2/xxxxx"

az keyvault secret set \
  --vault-name kv-ctn-demo-asr-dev \
  --name "TEAMS-WEBHOOK-DEPLOYMENTS" \
  --value "$WEBHOOK_URL"

# Retrieve in pipeline
- task: AzureKeyVault@2
  inputs:
    azureSubscription: 'Azure-CTN-ASR-ServiceConnection'
    KeyVaultName: 'kv-ctn-demo-asr-dev'
    SecretsFilter: 'TEAMS-WEBHOOK-DEPLOYMENTS'
```

### Message Formatting

Teams supports **Adaptive Cards** and **MessageCard** (legacy) formats.

**Example: Pipeline Failure Card**

```json
{
  "@type": "MessageCard",
  "@context": "http://schema.org/extensions",
  "summary": "Pipeline Failure",
  "themeColor": "FF0000",
  "title": "🚨 Deployment Failed",
  "sections": [
    {
      "activityTitle": "Association Register API",
      "activitySubtitle": "Pipeline failed on main branch",
      "facts": [
        {"name": "Pipeline:", "value": "Association-Register-API"},
        {"name": "Branch:", "value": "main"},
        {"name": "Commit:", "value": "abc123def456"},
        {"name": "Author:", "value": "Ramon de Noronha"},
        {"name": "Duration:", "value": "8m 32s"}
      ]
    }
  ],
  "potentialAction": [
    {
      "@type": "OpenUri",
      "name": "View Build Logs",
      "targets": [
        {"os": "default", "uri": "https://dev.azure.com/ctn-demo/ASR/_build/results?buildId=12345"}
      ]
    },
    {
      "@type": "OpenUri",
      "name": "View Commit",
      "targets": [
        {"os": "default", "uri": "https://dev.azure.com/ctn-demo/ASR/_git/DEV-CTN-ASR/commit/abc123def456"}
      ]
    }
  ]
}
```

**Test webhook:**
```bash
WEBHOOK_URL="<YOUR_WEBHOOK_URL>"

curl -H "Content-Type: application/json" \
  -d @- "$WEBHOOK_URL" << 'EOF'
{
  "@type": "MessageCard",
  "@context": "http://schema.org/extensions",
  "summary": "Test Alert",
  "themeColor": "0078D4",
  "title": "✅ Test Alert",
  "text": "This is a test message from Azure Monitor Alerts setup."
}
EOF
```

---

## Testing Alerts

### Pre-Production Testing Checklist

Before deploying alerts to production, test each alert type:

#### 1. Pipeline Failure Alert

**Simulate:**
```bash
# Commit a TypeScript compilation error
cd admin-portal
echo "const x: string = 123;" >> src/App.tsx
git add src/App.tsx
git commit -m "test: trigger pipeline failure"
git push origin main

# Watch for Teams notification (should arrive within 1 minute)
# Revert after test
git revert HEAD
git push origin main
```

**Expected:**
- Teams message appears in #asr-deployments channel
- Message includes pipeline name, branch, commit hash, and link to build logs
- Alert suppression prevents duplicate alerts for same build

#### 2. Health Check Failure Alert

**Simulate:**
```bash
# Temporarily break health endpoint (DO NOT COMMIT TO MAIN)
# Option A: Stop the Function App
az functionapp stop --name func-ctn-demo-asr-dev --resource-group rg-ctn-demo-asr-dev

# Wait 5-10 minutes for alert to trigger
# Check Azure Portal > Monitor > Alerts

# Restore
az functionapp start --name func-ctn-demo-asr-dev --resource-group rg-ctn-demo-asr-dev
```

**Expected:**
- Alert fires after 3 consecutive health check failures
- Teams message + Email sent
- Alert auto-resolves when health check succeeds

#### 3. Security Scan Blocking Alert

**Simulate:**
```bash
# Commit a hardcoded secret (DO NOT COMMIT TO MAIN - USE FEATURE BRANCH)
git checkout -b test-security-alert
cd api/src/functions

# Create a test file with EXAMPLE hardcoded secret (not a real key)
echo 'const exampleKey = "EXAMPLE-NOT-A-REAL-KEY-12345";' >> TestFunction.ts
git add TestFunction.ts
git commit -m "test: trigger Semgrep alert"
git push origin test-security-alert

# Watch pipeline fail on Semgrep step
# Delete branch after test
git checkout main
git branch -D test-security-alert
git push origin --delete test-security-alert
```

**Expected:**
- Pipeline fails at Semgrep step
- Pipeline Failure Alert triggers (Part 1)
- If dedicated security webhook configured: Security Alert triggers (Part 3)

#### 4. Application Insights Alert

**Simulate:**
```bash
# Generate high error rate
for i in {1..20}; do
  curl -X GET "https://func-ctn-demo-asr-dev.azurewebsites.net/api/nonexistent" &
done

# Wait 5 minutes for aggregation
# Check Azure Portal > Monitor > Alerts
```

**Expected:**
- `CTN ASR - High API Error Rate` alert fires
- Email notification sent to DevTeam
- Alert includes link to Application Insights logs

---

## Troubleshooting

### Common Issues

#### Issue 1: Teams Webhook Returns 400 Bad Request

**Cause:** Invalid JSON payload or missing required fields

**Solution:**
```bash
# Test webhook with minimal payload
curl -H "Content-Type: application/json" \
  -d '{"text": "Test"}' \
  "$WEBHOOK_URL"

# If this works, issue is with payload structure
# Validate JSON syntax: https://jsonlint.com/
```

#### Issue 2: Azure DevOps Service Hook Not Triggering

**Cause:** Incorrect event type or filter configuration

**Solution:**
```bash
# List existing service hooks
az devops service-endpoint list \
  --organization https://dev.azure.com/ctn-demo \
  --project ASR

# Verify event type matches pipeline events
# Debug: Check Azure DevOps > Project Settings > Service hooks > History
```

#### Issue 3: Alert Not Firing

**Cause:** Threshold not met, or metric not available

**Solution:**
```bash
# Check if metric data exists
az monitor metrics list \
  --resource /subscriptions/$SUBSCRIPTION_ID/resourceGroups/rg-ctn-demo-asr-dev/providers/Microsoft.Web/sites/func-ctn-demo-asr-dev \
  --metric Http5xx \
  --start-time 2025-11-17T00:00:00Z \
  --end-time 2025-11-17T23:59:59Z

# If no data: Metric name is incorrect or resource not emitting metric
# Check available metrics:
az monitor metrics list-definitions \
  --resource /subscriptions/$SUBSCRIPTION_ID/resourceGroups/rg-ctn-demo-asr-dev/providers/Microsoft.Web/sites/func-ctn-demo-asr-dev
```

#### Issue 4: Email Notifications Not Received

**Cause:** Email blocked by spam filter or action group misconfigured

**Solution:**
```bash
# Test action group
az monitor action-group test-notifications create \
  --action-group-name "ag-ctn-asr-critical" \
  --resource-group rg-ctn-demo-asr-dev \
  --alert-type "Test"

# Check spam folder
# Add noreply@microsoft.com to email whitelist
```

#### Issue 5: Alert Storms (Too Many Alerts)

**Cause:** Threshold too sensitive, or suppression window too short

**Solution:**
```bash
# Update alert to reduce frequency
az monitor metrics alert update \
  --name "ASR-Health-Endpoint-Unhealthy" \
  --resource-group rg-ctn-demo-asr-dev \
  --evaluation-frequency 5m \
  --window-size 15m

# Increase threshold (e.g., 5 failures → 10 failures)
az monitor metrics alert update \
  --name "ASR-Health-Endpoint-Unhealthy" \
  --resource-group rg-ctn-demo-asr-dev \
  --condition "count Http5xx >= 10"
```

---

## Maintenance

### Regular Tasks

**Weekly:**
- Review alert history in Azure Portal > Monitor > Alerts > Alert History
- Check for false positives (alerts triggered but no actual issue)
- Verify action groups are delivering notifications

**Monthly:**
- Review and adjust alert thresholds based on baseline metrics
- Update webhook URLs if approaching rotation deadline
- Test critical alerts (health check, pipeline failure)

**Quarterly:**
- Rotate Teams webhook URLs
- Review alert coverage (are new services/pipelines covered?)
- Update documentation with lessons learned

### Cost Optimization

**Alert Pricing:**
- Azure Monitor alerts: $0.10 per alert rule per month
- Application Insights availability tests: $0.60 per test per month
- Action group notifications:
  - Email: Free
  - SMS: $0.06 per SMS
  - Voice: $0.25 per call
  - Webhook: Free

**Estimated Monthly Cost (CTN ASR):**
- 15 alert rules: $1.50
- 2 availability tests: $1.20
- Email notifications: $0.00
- **Total: ~$3/month**

---

## Quick Reference

### Alert Status Check

```bash
# List all active alerts
az monitor metrics alert list \
  --resource-group rg-ctn-demo-asr-dev \
  --query "[].{Name:name, Enabled:enabled, Severity:severity}" \
  --output table

# Check alert history (last 24 hours)
az monitor metrics alert list \
  --resource-group rg-ctn-demo-asr-dev \
  --query "[?timeAggregation=='PT5M']" \
  --output table
```

### Manual Alert Trigger (Testing)

```bash
# Manually fire an alert (requires alert rule ID)
ALERT_RULE_ID="/subscriptions/$SUBSCRIPTION_ID/resourceGroups/rg-ctn-demo-asr-dev/providers/Microsoft.Insights/metricAlerts/ASR-Health-Endpoint-Unhealthy"

az monitor metrics alert update \
  --ids $ALERT_RULE_ID \
  --enabled true

# Verify alert is enabled
az monitor metrics alert show \
  --ids $ALERT_RULE_ID \
  --query "{Name:name, Enabled:enabled, Condition:criteria}"
```

### Disable All Alerts (Emergency)

```bash
# Disable all ASR alerts (e.g., during planned maintenance)
for alert in $(az monitor metrics alert list \
  --resource-group rg-ctn-demo-asr-dev \
  --query "[?contains(name, 'ASR')].name" -o tsv); do
  az monitor metrics alert update \
    --name "$alert" \
    --resource-group rg-ctn-demo-asr-dev \
    --enabled false
done

# Re-enable after maintenance
# ... (same loop with --enabled true)
```

---

## Appendix A: Alert Rule Reference

### API Health Alerts

| Alert Name | Condition | Window | Frequency | Severity |
|------------|-----------|--------|-----------|----------|
| ASR-Health-Endpoint-Unhealthy | Http5xx >= 5 | 5m | 1m | 1 |
| ASR-Health-Check-Slow-Response | HttpResponseTime > 5000 | 5m | 1m | 2 |
| ASR-Function-Execution-Failures | Http5xx > 10 | 5m | 1m | 1 |
| ASR-High-Memory-Usage | MemoryWorkingSet > 800MB | 15m | 5m | 2 |

### Application Insights Alerts

| Alert Name | Condition | Window | Frequency | Severity |
|------------|-----------|--------|-----------|----------|
| CTN ASR - High API Error Rate | failures > 10 | 5m | 1m | 2 |
| CTN ASR - Slow API Response | duration > 1000ms | 5m | 1m | 3 |
| CTN ASR - Slow Database Queries | SQL duration > 500ms | 5m | 1m | 3 |
| CTN ASR - High Exception Rate | exceptions > 5 | 5m | 1m | 2 |
| CTN ASR - Authentication Failures | resolve_party_failure > 3 | 5m | 1m | 1 |

---

## Appendix B: Teams Message Templates

### Pipeline Failure Template

```json
{
  "@type": "MessageCard",
  "@context": "http://schema.org/extensions",
  "summary": "Pipeline Failure",
  "themeColor": "FF0000",
  "title": "🚨 Pipeline Failed",
  "sections": [{
    "facts": [
      {"name": "Pipeline", "value": "{{pipeline_name}}"},
      {"name": "Branch", "value": "{{branch}}"},
      {"name": "Commit", "value": "{{commit_hash}}"},
      {"name": "Author", "value": "{{author}}"},
      {"name": "Reason", "value": "{{failure_reason}}"}
    ]
  }],
  "potentialAction": [
    {
      "@type": "OpenUri",
      "name": "View Logs",
      "targets": [{"os": "default", "uri": "{{build_url}}"}]
    },
    {
      "@type": "OpenUri",
      "name": "Retry Build",
      "targets": [{"os": "default", "uri": "{{retry_url}}"}]
    }
  ]
}
```

### Health Check Failure Template

```json
{
  "@type": "MessageCard",
  "@context": "http://schema.org/extensions",
  "summary": "Health Check Failed",
  "themeColor": "FF4500",
  "title": "❌ Health Check Failure",
  "sections": [{
    "facts": [
      {"name": "Service", "value": "{{service_name}}"},
      {"name": "Endpoint", "value": "{{health_endpoint}}"},
      {"name": "Status", "value": "{{http_status}}"},
      {"name": "Failed Checks", "value": "{{failed_checks}}"},
      {"name": "Time", "value": "{{timestamp}}"}
    ]
  }],
  "potentialAction": [
    {
      "@type": "OpenUri",
      "name": "View Metrics",
      "targets": [{"os": "default", "uri": "{{metrics_url}}"}]
    },
    {
      "@type": "OpenUri",
      "name": "View Logs",
      "targets": [{"os": "default", "uri": "{{logs_url}}"}]
    }
  ]
}
```

---

## Appendix C: Automation Scripts

All automation scripts are located in `scripts/`:

- `scripts/setup-deployment-alerts.sh` - Main setup script (runs all below)
- `scripts/create-teams-webhook-secrets.sh` - Store webhook URLs in Key Vault
- `scripts/configure-pipeline-alerts.sh` - Azure DevOps service hooks
- `scripts/configure-health-alerts.sh` - Health check monitoring
- `scripts/update-alert-action-groups.sh` - Add action groups to existing alerts
- `scripts/test-all-alerts.sh` - Automated alert testing

**Run all setup scripts:**
```bash
cd scripts
chmod +x setup-deployment-alerts.sh
./setup-deployment-alerts.sh
```

---

## Support

**Documentation:**
- Azure Monitor Alerts: https://learn.microsoft.com/en-us/azure/azure-monitor/alerts/alerts-overview
- Azure DevOps Service Hooks: https://learn.microsoft.com/en-us/azure/devops/service-hooks/overview
- Teams Incoming Webhooks: https://learn.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/add-incoming-webhook

**Contact:**
- DevOps Team: devops@ctn.com
- Teams Channel: #asr-deployments
