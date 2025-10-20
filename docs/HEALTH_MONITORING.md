# Health Monitoring System

**Last Updated:** October 20, 2025

---

## Overview

The CTN ASR Health Monitoring System provides comprehensive real-time monitoring of all system components with automated alerting and visual dashboards.

### Components

1. **Backend Health Check Endpoint** - `/api/health`
2. **Admin Portal Health Dashboard** - Visual monitoring interface
3. **Azure Monitor Alerts** - Automated failure detection
4. **Application Insights** - Telemetry and diagnostics

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Health Monitoring System                    │
└─────────────────────────────────────────────────────────────────┘
                                │
                ┌───────────────┴───────────────┐
                │                               │
         ┌──────▼──────┐                 ┌─────▼──────┐
         │   Backend   │                 │  Frontend  │
         │ Health Check│                 │  Dashboard │
         └──────┬──────┘                 └─────┬──────┘
                │                               │
    ┌───────────┼───────────┐                   │
    │           │           │                   │
┌───▼───┐   ┌──▼──┐    ┌───▼────┐         ┌───▼────┐
│Database│   │App  │    │Key     │         │Static  │
│        │   │Ins. │    │Vault   │         │Web Apps│
└────────┘   └─────┘    └────────┘         └────────┘
                                │
                        ┌───────▼────────┐
                        │ Azure Monitor  │
                        │    Alerts      │
                        └────────────────┘
```

---

## Health Check Endpoint

### Endpoint Details

**URL:** `https://func-ctn-demo-asr-dev.azurewebsites.net/api/health`

**Method:** `GET`

**Authentication:** Anonymous (public endpoint)

**Response Time:** < 500ms (target)

### Health Checks Performed

| Check                  | Description                                    | Timeout |
|------------------------|------------------------------------------------|---------|
| **Database**           | PostgreSQL connection and query execution      | 2s      |
| **Application Insights** | Telemetry configuration validation           | 1s      |
| **Azure Key Vault**    | Environment variables from Key Vault loaded    | 1s      |
| **Static Web Apps**    | Admin and Member portal availability (HEAD)    | 5s      |

### Response Format

```json
{
  "status": "healthy|degraded|unhealthy",
  "timestamp": "2025-10-20T04:56:11.893Z",
  "uptime": 708.72,
  "environment": "development",
  "version": "1.0.0",
  "checks": {
    "database": {
      "status": "up|down",
      "responseTime": 41,
      "error": "Optional error message"
    },
    "applicationInsights": {
      "status": "up|down",
      "details": {
        "configured": true
      },
      "error": "Optional error message"
    },
    "azureKeyVault": {
      "status": "up|down",
      "responseTime": 0,
      "error": "Optional error message"
    },
    "staticWebApps": {
      "status": "up|down",
      "responseTime": 77,
      "details": {
        "adminPortal": "up|down",
        "memberPortal": "up|down"
      },
      "error": "Optional error message"
    }
  }
}
```

### Status Determination Logic

```
Overall Status Calculation:
- 0 failed checks   → healthy
- 1-2 failed checks → degraded
- 3+ failed checks  → unhealthy

HTTP Status Codes:
- healthy   → 200 OK
- degraded  → 200 OK
- unhealthy → 503 Service Unavailable
```

### Testing the Health Endpoint

```bash
# Basic health check
curl https://func-ctn-demo-asr-dev.azurewebsites.net/api/health

# Pretty print JSON
curl -s https://func-ctn-demo-asr-dev.azurewebsites.net/api/health | jq .

# Check HTTP status code
curl -s -o /dev/null -w "%{http_code}" https://func-ctn-demo-asr-dev.azurewebsites.net/api/health

# Monitor continuously (every 10 seconds)
watch -n 10 'curl -s https://func-ctn-demo-asr-dev.azurewebsites.net/api/health | jq .status'
```

---

## Health Dashboard

### Access

**URL:** `https://calm-tree-03352ba03.1.azurestaticapps.net/health`

**Required Role:** Association Admin or System Admin

**Features:**
- Real-time system status overview
- Individual component health checks
- Auto-refresh (30 seconds, configurable)
- Manual refresh button
- Response time tracking
- Error message display
- Quick links to Azure resources

### Dashboard Components

#### Overall Status Card
- System-wide health status
- Environment information
- API version
- System uptime
- Last update timestamp

#### Individual Check Cards
- **Database** - Connection status and response time
- **Application Insights** - Configuration status
- **Azure Key Vault** - Secrets availability
- **Static Web Apps** - Portal accessibility

#### Quick Links
- Azure Portal
- Azure Monitor
- Build Pipeline
- Raw Health Endpoint

### Status Color Coding

| Status    | Color  | Border     | Meaning                          |
|-----------|--------|------------|----------------------------------|
| Healthy   | Green  | `#10b981`  | All systems operational          |
| Degraded  | Orange | `#f59e0b`  | 1-2 components experiencing issues |
| Unhealthy | Red    | `#ef4444`  | 3+ components down or critical failure |

---

## Azure Monitor Alerts

### Configured Alerts

Run the configuration script:

```bash
cd infrastructure
./health-monitoring-alerts.sh
```

#### Alert Details

| Alert Name                       | Severity | Condition                                  | Window | Frequency |
|----------------------------------|----------|-------------------------------------------|--------|-----------|
| ASR-Health-Endpoint-Unhealthy    | Critical | HTTP 5xx >= 5                             | 5m     | 1m        |
| ASR-Health-Check-Slow-Response   | Warning  | Avg Response Time > 5000ms                | 5m     | 1m        |
| ASR-Database-Connection-Failures | Critical | Exceptions > 10                           | 5m     | 1m        |
| ASR-Function-App-Availability    | Warning  | Availability < 95%                        | 15m    | 5m        |
| ASR-High-Memory-Usage            | Warning  | Memory > 800MB                            | 10m    | 5m        |

### Alert Severity Levels

- **Critical (1):** Immediate action required, system degraded
- **Warning (2):** Investigate within business hours, potential issue
- **Informational (3):** FYI, no action required

### Viewing Alerts

**Azure Portal:**
1. Navigate to: https://portal.azure.com
2. Go to: Monitor > Alerts
3. Filter by: Resource Group = `rg-ctn-demo-asr-dev`

**Azure CLI:**
```bash
# List all active alerts
az monitor metrics alert list \
  --resource-group rg-ctn-demo-asr-dev \
  --output table

# Show specific alert
az monitor metrics alert show \
  --name ASR-Health-Endpoint-Unhealthy \
  --resource-group rg-ctn-demo-asr-dev
```

### Configuring Notifications

To receive email/SMS notifications when alerts fire:

```bash
# Create action group
az monitor action-group create \
  --name "ASR-Health-Notifications" \
  --resource-group rg-ctn-demo-asr-dev \
  --short-name "ASR-Health" \
  --email-receiver "Admin" "admin@ctn-association.com"

# Add action group to alert
az monitor metrics alert update \
  --name ASR-Health-Endpoint-Unhealthy \
  --resource-group rg-ctn-demo-asr-dev \
  --add-action /subscriptions/{subscription-id}/resourceGroups/rg-ctn-demo-asr-dev/providers/microsoft.insights/actionGroups/ASR-Health-Notifications
```

---

## Troubleshooting

### Health Endpoint Returns 503

**Possible Causes:**
1. Database connection failure
2. Multiple components down
3. Azure Key Vault misconfiguration

**Resolution Steps:**
1. Check health endpoint response: `curl https://func-ctn-demo-asr-dev.azurewebsites.net/api/health | jq .`
2. Identify failed check(s) in `checks` object
3. Review error messages
4. Check Application Insights logs
5. Verify network connectivity to failing component

### Dashboard Shows "Error Loading Health Status"

**Possible Causes:**
1. API endpoint unreachable
2. CORS configuration issue
3. Network connectivity problem

**Resolution Steps:**
1. Test API directly: `curl https://func-ctn-demo-asr-dev.azurewebsites.net/api/health`
2. Check browser console for errors (F12)
3. Verify VITE_API_URL environment variable
4. Check Azure Static Web Apps deployment status

### Database Check Fails

**Possible Causes:**
1. PostgreSQL server down
2. Connection string incorrect
3. Firewall rules blocking connection
4. SSL certificate validation failure

**Resolution Steps:**
```bash
# Test database connection
psql "host=psql-ctn-demo-asr-dev.postgres.database.azure.com \
      port=5432 \
      dbname=asr-db \
      user=adminuser@psql-ctn-demo-asr-dev \
      sslmode=require"

# Check Function App environment variables
az functionapp config appsettings list \
  --name func-ctn-demo-asr-dev \
  --resource-group rg-ctn-demo-asr-dev \
  --query "[?name=='POSTGRES_HOST']"
```

### High Response Times

**Possible Causes:**
1. Database query slow
2. Network latency
3. Static Web Apps slow to respond
4. High system load

**Resolution Steps:**
1. Check individual check response times in health response
2. Review Application Insights performance metrics
3. Analyze database query performance
4. Check Azure service health status

---

## Monitoring Best Practices

### Regular Checks

**Daily:**
- Review health dashboard for any degraded status
- Check Azure Monitor for fired alerts
- Verify all components show "up" status

**Weekly:**
- Review response time trends
- Analyze alert patterns
- Check for false positives
- Update alert thresholds if needed

**Monthly:**
- Review and update documentation
- Test alert notification delivery
- Simulate failure scenarios
- Update runbooks based on incidents

### Incident Response

When an alert fires:

1. **Acknowledge** - Log into Azure Portal and acknowledge alert
2. **Assess** - Check health dashboard for component status
3. **Investigate** - Review Application Insights logs
4. **Resolve** - Fix the underlying issue
5. **Verify** - Confirm health endpoint shows "healthy"
6. **Document** - Update runbook with learnings

### SLO/SLA Definitions

**Service Level Objectives:**
- **Availability:** 99.9% uptime (allows ~8.7 hours downtime/year)
- **Health Check Response Time:** < 500ms (95th percentile)
- **Database Query Time:** < 50ms (95th percentile)
- **Static Web Apps Availability:** > 99.9%

**Measurement:**
- Track via Application Insights availability tests
- Monitor via health endpoint metrics
- Review monthly in Azure Monitor dashboards

---

## Integration with CI/CD

### Pre-Deployment Health Check

Add to Azure Pipelines before deployment:

```yaml
- task: Bash@3
  displayName: 'Check System Health Before Deployment'
  inputs:
    targetType: 'inline'
    script: |
      HEALTH_STATUS=$(curl -s https://func-ctn-demo-asr-dev.azurewebsites.net/api/health | jq -r .status)
      if [ "$HEALTH_STATUS" != "healthy" ]; then
        echo "System not healthy, aborting deployment"
        exit 1
      fi
      echo "System healthy, proceeding with deployment"
```

### Post-Deployment Verification

```yaml
- task: Bash@3
  displayName: 'Verify Health After Deployment'
  inputs:
    targetType: 'inline'
    script: |
      sleep 30  # Allow time for warm-up
      HEALTH_STATUS=$(curl -s https://func-ctn-demo-asr-dev.azurewebsites.net/api/health | jq -r .status)
      if [ "$HEALTH_STATUS" == "unhealthy" ]; then
        echo "Deployment caused unhealthy status, consider rollback"
        exit 1
      fi
      echo "Post-deployment health check passed: $HEALTH_STATUS"
```

---

## API Reference

### GET /api/health

Returns comprehensive system health status.

**Request:**
```http
GET /api/health HTTP/1.1
Host: func-ctn-demo-asr-dev.azurewebsites.net
Accept: application/json
```

**Response (200 OK):**
```json
{
  "status": "healthy",
  "timestamp": "2025-10-20T04:56:11.893Z",
  "uptime": 708.72,
  "environment": "development",
  "version": "1.0.0",
  "checks": {
    "database": {
      "status": "up",
      "responseTime": 41
    },
    "applicationInsights": {
      "status": "up",
      "details": {
        "configured": true
      }
    },
    "azureKeyVault": {
      "status": "up",
      "responseTime": 0
    },
    "staticWebApps": {
      "status": "up",
      "responseTime": 77,
      "details": {
        "adminPortal": "up",
        "memberPortal": "up"
      }
    }
  }
}
```

**Response (503 Service Unavailable):**
```json
{
  "status": "unhealthy",
  "timestamp": "2025-10-20T04:56:11.893Z",
  "uptime": 708.72,
  "environment": "development",
  "version": "1.0.0",
  "checks": {
    "database": {
      "status": "down",
      "error": "Connection timeout"
    },
    "applicationInsights": {
      "status": "up",
      "details": {
        "configured": true
      }
    },
    "azureKeyVault": {
      "status": "down",
      "error": "Key Vault variables not loaded"
    },
    "staticWebApps": {
      "status": "down",
      "error": "Admin portal unreachable; Member portal unreachable",
      "details": {
        "adminPortal": "down",
        "memberPortal": "down"
      }
    }
  }
}
```

---

## Related Documentation

- [API Documentation](./API.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [Monitoring Guide](./MONITORING.md)
- [Incident Response Runbook](./INCIDENT_RESPONSE.md)

---

## Change Log

| Date       | Version | Changes                                           |
|------------|---------|---------------------------------------------------|
| 2025-10-20 | 1.0.0   | Initial health monitoring system implementation   |

---

**For support or questions, contact the CTN ASR development team.**
