# Automated Rollback Mechanism

**Last Updated:** November 17, 2025
**Owner:** DevOps Team
**Status:** Implemented

## Overview

The CTN ASR deployment pipelines include automated and manual rollback capabilities to ensure production stability. This document describes the rollback architecture, decision criteria, and procedures.

## Architecture

### Rollback Strategy by Component

| Component | Strategy | Time to Rollback | Automated? |
|-----------|----------|------------------|------------|
| **API (Azure Functions)** | Slot swap (blue/green) | <60 seconds | Yes |
| **Admin Portal** | Redeploy previous commit | ~2-3 minutes | Manual |
| **Member Portal** | Redeploy previous commit | ~2-3 minutes | Manual |

### Deployment Flow with Rollback

```
┌─────────────────────────────────────────────────────────────┐
│  1. Deploy to Staging                                       │
│     - API: Deploy to staging slot                           │
│     - Portals: Deploy to staging environment (future)       │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────────────────┐
│  2. Health Checks & Smoke Tests                             │
│     - API: /api/health endpoint (5 retries, 10s delay)      │
│     - Portals: HTTP 200 on homepage                         │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ↓ SUCCESS
┌─────────────────────────────────────────────────────────────┐
│  3. Promote to Production                                   │
│     - API: Swap staging → production                        │
│     - Portals: Deploy to production environment             │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────────────────┐
│  4. Post-Deployment Verification                            │
│     - Production health check (5 retries, 10s delay)        │
│     - Response time validation                              │
│     - Critical endpoint smoke tests                         │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ↓ FAILURE
┌─────────────────────────────────────────────────────────────┐
│  5. AUTOMATIC ROLLBACK                                      │
│     - API: Swap production ↔ staging (restore previous)     │
│     - Portals: Production unchanged (no promotion)          │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────────────────┐
│  6. Verify Rollback                                         │
│     - Confirm production is healthy                         │
│     - Failed version remains in staging for investigation   │
│     - Send notification to team                             │
└─────────────────────────────────────────────────────────────┘
```

## Rollback Decision Criteria

### Automatic Rollback Triggers

Rollback is **automatically triggered** when:

1. **API Health Check Failure**
   - Post-swap health check returns non-200 status
   - Health check times out (>10 seconds)
   - 5 consecutive health check failures (50 seconds total)

2. **Portal Smoke Test Failure**
   - Staging environment smoke tests fail
   - Production promotion is prevented (no rollback needed)

### Manual Rollback Triggers

Human decision required for:

1. **Application Insights Alerts**
   - Error rate >10 errors/minute
   - Response time degradation >2x baseline
   - Availability drops below 99%

2. **User-Reported Issues**
   - Critical functionality broken
   - Authentication failures
   - Data integrity issues

3. **Security Incidents**
   - Vulnerability discovered in new deployment
   - Unexpected security scan results
   - Suspicious activity patterns

## Rollback Procedures

### API Rollback (Azure Functions)

#### Automatic Rollback (Pipeline)

The API pipeline automatically rolls back if post-swap health checks fail:

```yaml
# .azure-pipelines/asr-api.yml

# Step 5: Post-swap verification with retries
- script: |
    # 5 attempts, 10s delay = 50 seconds total
    # If all fail, exit 1 and trigger rollback

# Step 6: Automatic rollback on failure
- task: AzureAppServiceManage@0
  displayName: 'ROLLBACK: Swap Back to Previous Version'
  condition: failed()
  inputs:
    action: 'Swap Slots'
    webAppName: func-ctn-demo-asr-dev
    sourceSlot: staging
    targetSlot: production

# Step 7: Verify rollback success
- script: |
    # Confirm production health check passes after rollback

# Step 8: Send notification
- script: |
    # Log rollback event for monitoring
```

**Timeline:**
- Health check fails: T+0s
- Rollback initiated: T+50s (after retries)
- Rollback completed: T+60s
- Verification complete: T+70s

#### Manual Rollback (Command Line)

Use the rollback script for manual intervention:

```bash
# Check current deployment status
./scripts/deployment-history.sh

# Rollback API to previous version
./scripts/rollback-deployment.sh api

# Confirm rollback
# This will prompt for confirmation, then:
# 1. Check staging slot health
# 2. Swap production ↔ staging
# 3. Verify production health
# 4. Display rollback summary
```

**Alternative:** Using deployment slots script:

```bash
# Check slot status
./scripts/manage-deployment-slots.sh status

# Perform rollback
./scripts/manage-deployment-slots.sh rollback
```

### Portal Rollback (Admin & Member)

Portals use a different rollback strategy: redeploying a previous commit.

#### Automatic Prevention (Pipeline)

Portal pipelines prevent bad deployments from reaching production:

```yaml
# Smoke tests on staging (future enhancement)
- script: |
    # Test staging environment
    # If tests fail, pipeline exits before production deployment
    # Production remains unchanged = automatic "rollback"
```

**Current Behavior:**
- Smoke tests not yet implemented for portals
- Post-deployment verification blocks pipeline on failure
- Production deployment succeeds or fails atomically

#### Manual Rollback (Command Line)

**Option 1: Automatic commit detection**

```bash
# Rollback to previous successful commit (auto-detected)
./scripts/rollback-deployment.sh admin-portal

# Or for member portal
./scripts/rollback-deployment.sh member-portal
```

The script will:
1. Find the last successful commit (2nd in git log)
2. Checkout that commit
3. Build the portal
4. Deploy to Azure Static Web Apps
5. Verify deployment
6. Restore git working directory

**Option 2: Specific commit**

```bash
# View deployment history
./scripts/deployment-history.sh

# Rollback to specific commit
./scripts/rollback-deployment.sh admin-portal abc1234

# Rollback member portal to specific commit
./scripts/rollback-deployment.sh member-portal def5678
```

**Timeline:**
- Identify target commit: T+0s
- Build portal: T+30s
- Deploy to Azure: T+2m
- Verification: T+2m10s
- Total: ~2-3 minutes

## Health Check Specifications

### API Health Endpoint

**URL:** `https://func-ctn-demo-asr-dev.azurewebsites.net/api/health`

**Success Criteria:**
- HTTP status: 200 OK
- Response time: <10 seconds
- JSON payload with database and Key Vault status

**Example Response:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "commit": "abc1234",
  "timestamp": "2025-11-17T10:00:00Z",
  "checks": {
    "database": {
      "status": "healthy",
      "responseTime": "15ms"
    },
    "azureKeyVault": {
      "status": "healthy",
      "responseTime": "120ms"
    }
  }
}
```

**Retry Strategy:**
- Max retries: 5
- Retry delay: 10 seconds
- Total timeout: 50 seconds
- Exponential backoff: No (linear)

### Portal Health Checks

**URLs:**
- Admin: `https://calm-tree-03352ba03.1.azurestaticapps.net`
- Member: `https://calm-pebble-043b2db03.1.azurestaticapps.net`

**Success Criteria:**
- HTTP status: 200 OK
- Response time: <5 seconds
- Content-Type: text/html

**Current Limitations:**
- No dedicated health endpoint
- Only checks homepage accessibility
- No deep health validation

**Future Enhancements:**
- Add `/health.json` endpoint to portals
- Include API connectivity check
- Validate authentication configuration

## Rollback Scripts

### `/scripts/rollback-deployment.sh`

**Purpose:** Unified rollback script for all components

**Usage:**
```bash
./scripts/rollback-deployment.sh [component] [optional-commit-hash]

Components:
  api              - Rollback Azure Functions API (slot swap)
  admin-portal     - Rollback Admin Portal (redeploy)
  member-portal    - Rollback Member Portal (redeploy)
  history          - Show deployment history
```

**Features:**
- Automatic commit detection for portals
- Health check before rollback
- Confirmation prompt for safety
- Deployment verification
- Detailed logging

**Requirements:**
- Azure CLI authenticated
- Git repository in clean state
- Appropriate Azure permissions
- Key Vault access for portal tokens

### `/scripts/deployment-history.sh`

**Purpose:** Display deployment history and current versions

**Usage:**
```bash
# Human-readable output
./scripts/deployment-history.sh

# JSON output (for automation)
./scripts/deployment-history.sh --json
```

**Output:**
- Current production versions
- Last 10 deployments per component
- Component health status
- Rollback instructions

**Example Output:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                   CTN ASR - Deployment History
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📦 Current Production Versions

API (Azure Functions):
  Version: 1.0.0
  Commit:  abc1234
  Status:  healthy
  URL:     https://func-ctn-demo-asr-dev.azurewebsites.net

Admin Portal:
  Deployed: 2 hours ago
  Status:   healthy
  URL:      https://calm-tree-03352ba03.1.azurestaticapps.net
```

### `/scripts/manage-deployment-slots.sh`

**Purpose:** Azure Functions slot management (existing script)

**Usage:**
```bash
# Create staging slot
./scripts/manage-deployment-slots.sh create

# Check slot status
./scripts/manage-deployment-slots.sh status

# Swap staging to production
./scripts/manage-deployment-slots.sh swap

# Rollback (emergency)
./scripts/manage-deployment-slots.sh rollback

# Delete staging slot
./scripts/manage-deployment-slots.sh delete
```

## Notification System

### Current Implementation

Rollback events are logged in pipeline output with structured format:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨 ROLLBACK NOTIFICATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Component: ASR API (Azure Functions)
Reason: Production health checks failed after deployment
Action: Automatic rollback executed
Timestamp: 2025-11-17T10:15:30Z

Build: 20251117.1
Commit: abc1234
Build URL: https://dev.azure.com/ctn-demo/ASR/_build/results?buildId=123

Production has been restored to the previous working version.
Failed deployment remains in staging slot for investigation.
```

### Future Enhancement: Teams Webhook

**Configuration:**

Add to Azure DevOps variable group:
```
TEAMS_WEBHOOK_URL=https://outlook.office.com/webhook/...
```

**Payload Example:**
```json
{
  "@type": "MessageCard",
  "themeColor": "FF0000",
  "summary": "Deployment Rollback",
  "sections": [{
    "activityTitle": "🚨 Rollback Executed: ASR API",
    "activitySubtitle": "Production health checks failed",
    "facts": [
      { "name": "Component", "value": "ASR API" },
      { "name": "Reason", "value": "Health check timeout" },
      { "name": "Timestamp", "value": "2025-11-17T10:15:30Z" },
      { "name": "Build", "value": "20251117.1" },
      { "name": "Commit", "value": "abc1234" }
    ],
    "potentialAction": [{
      "@type": "OpenUri",
      "name": "View Build",
      "targets": [{
        "os": "default",
        "uri": "https://dev.azure.com/ctn-demo/ASR/_build/results?buildId=123"
      }]
    }]
  }]
}
```

**Integration Points:**
- API pipeline: Post-rollback notification
- Manual rollback script: Notification on completion
- Deployment alerts: Azure Monitor integration

## Post-Rollback Checklist

After a rollback (automatic or manual), complete these steps:

### Immediate (Within 5 minutes)

- [ ] Verify production health checks pass
- [ ] Confirm user-facing functionality works
- [ ] Check Application Insights for errors
- [ ] Notify stakeholders of rollback

### Investigation (Within 1 hour)

- [ ] Review failed deployment logs
- [ ] Identify root cause of failure
- [ ] Document failure in incident log
- [ ] Assess impact on users

### Analysis (Within 24 hours)

- [ ] Determine if rollback was necessary
- [ ] Review rollback decision criteria
- [ ] Update rollback procedures if needed
- [ ] Plan fix for failed deployment

### Prevention (Within 1 week)

- [ ] Implement fix for root cause
- [ ] Add test coverage for failure scenario
- [ ] Update documentation
- [ ] Conduct post-mortem review

## Rollback Metrics

Track these metrics to improve rollback procedures:

### Frequency Metrics

- **Rollback Rate:** Number of rollbacks / Total deployments
  - Target: <5%
  - Current: Track in DORA metrics

- **Automatic vs Manual:** Ratio of automatic to manual rollbacks
  - Target: >80% automatic
  - Indicates health check effectiveness

### Performance Metrics

- **Mean Time to Rollback (MTTR):** Time from detection to restoration
  - API: <2 minutes
  - Portals: <5 minutes

- **Rollback Success Rate:** Successful rollbacks / Total rollback attempts
  - Target: >95%
  - Failures indicate deeper issues

### Quality Metrics

- **False Positive Rate:** Unnecessary rollbacks / Total rollbacks
  - Target: <10%
  - Indicates health check accuracy

- **Escaped Defects:** Production incidents not caught by health checks
  - Target: <2 per month
  - Indicates gaps in validation

## Troubleshooting

### Rollback Script Fails

**Symptom:** `./scripts/rollback-deployment.sh` exits with error

**Common Causes:**

1. **Not logged into Azure CLI**
   ```bash
   # Fix: Login to Azure
   az login
   ```

2. **Key Vault access denied**
   ```bash
   # Fix: Verify permissions
   az keyvault show --name kv-ctn-demo-asr-dev
   ```

3. **Git repository in dirty state**
   ```bash
   # Fix: Clean or stash changes
   git status
   git stash
   ```

4. **Deployment token expired**
   ```bash
   # Fix: Regenerate in Azure Portal
   # Static Web Apps > Deployment tokens > Regenerate
   ```

### Automatic Rollback Didn't Trigger

**Symptom:** Deployment failed but rollback didn't execute

**Investigation Steps:**

1. Check pipeline logs for health check results
2. Verify health endpoint is accessible
3. Review condition logic in pipeline YAML
4. Check if pipeline was manually cancelled

**Resolution:**
- If production is unhealthy, use manual rollback
- Fix pipeline condition logic if broken
- Add monitoring alert for failed deployments

### Rollback Successful But Production Still Unhealthy

**Symptom:** Rollback completed but health checks still fail

**Possible Causes:**

1. **Infrastructure issue** (not deployment)
   - Check Azure service health
   - Review Application Insights logs
   - Verify database connectivity

2. **Both versions are bad**
   - Rollback to earlier commit
   - Check for breaking schema changes
   - Verify environment variables

3. **Propagation delay**
   - Wait 2-5 minutes
   - Check Front Door cache
   - Verify DNS propagation

**Escalation:**
- Contact Azure support if infrastructure issue
- Review last known good deployment
- Consider manual database rollback if schema changed

## Related Documentation

- [Deployment Procedures](https://github.com/ramondenoronha/DEV-CTN-Documentation/blob/main/docs/arc42/07-deployment/ctn-asr-deployment-procedures.md)
- [DORA Metrics Report](TASK-DG-MONITOR-001-DORA-METRICS-SUMMARY.md)
- [Deployment Alerts Setup](TASK-DG-MONITOR-002-DEPLOYMENT-ALERTS-SUMMARY.md)
- [Blue/Green Deployment Guide](../docs/devops/BLUE_GREEN_DEPLOYMENT.md)

## Changelog

| Date | Author | Changes |
|------|--------|---------|
| 2025-11-17 | DevOps Guardian | Initial automated rollback implementation |
| 2025-11-17 | DevOps Guardian | Added rollback scripts and documentation |
| 2025-11-17 | DevOps Guardian | Integrated health checks with retry logic |
