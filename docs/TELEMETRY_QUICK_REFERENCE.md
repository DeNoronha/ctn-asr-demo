# Application Insights Telemetry - Quick Reference

## Access Points

**Azure Portal:**
```
https://portal.azure.com/#@/resource/subscriptions/add6a89c-7fb9-4f8a-9d63-7611a617430e/resourceGroups/rg-ctn-demo-asr-dev/providers/microsoft.insights/components/appi-ctn-demo-asr-dev
```

**Live Metrics (Real-time):**
```
Azure Portal → Application Insights → Live Metrics
```

**Log Analytics Queries:**
```
Azure Portal → Application Insights → Logs
```

---

## Quick Commands

### Generate Test Traffic
```bash
./api/tests/test-telemetry.sh
```

### Create Alerts
```bash
./infrastructure/app-insights-alerts.sh
```

### View Live Logs
```bash
func azure functionapp logstream func-ctn-demo-asr-dev --timeout 30
```

### Check Configuration
```bash
az functionapp config appsettings list \
  --name func-ctn-demo-asr-dev \
  --resource-group rg-ctn-demo-asr-dev \
  --query "[?name=='APPLICATIONINSIGHTS_CONNECTION_STRING'].value" -o tsv
```

---

## Essential Queries

### Recent Activity (Last Hour)
```kusto
customEvents
| where timestamp > ago(1h)
| project timestamp, name, customDimensions
| order by timestamp desc
| take 50
```

### Error Rate
```kusto
customEvents
| where timestamp > ago(1h)
| where name contains "success" or name contains "failure"
| summarize
    total = count(),
    failures = countif(name contains "failure"),
    error_rate = round(countif(name contains "failure") * 100.0 / count(), 2)
```

### Slow Requests (>1 second)
```kusto
customMetrics
| where name contains "duration"
| where value > 1000
| where timestamp > ago(1h)
| project timestamp, name, value, customDimensions
| order by value desc
```

### Database Performance
```kusto
dependencies
| where type == "SQL"
| where timestamp > ago(1h)
| summarize avg(duration), max(duration), count() by name
| order by avg_duration desc
```

### Exceptions
```kusto
exceptions
| where timestamp > ago(1h)
| project timestamp, type, outerMessage, innermostMessage, customDimensions
| order by timestamp desc
```

---

## Code Templates

### Basic Function Template
```typescript
import { trackEvent, trackMetric, trackException, trackDependency } from '../utils/telemetry';

async function handler(request: AuthenticatedRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const startTime = Date.now();

  try {
    trackEvent('operation_request', { user_id: request.userId || 'anonymous' }, undefined, context);

    // Database call
    const dbStart = Date.now();
    const result = await pool.query(query);
    trackDependency('PostgreSQL:Operation', 'SQL', Date.now() - dbStart, true, {
      table: 'table_name',
      operation: 'SELECT'
    });

    // Success tracking
    const totalDuration = Date.now() - startTime;
    trackEvent('operation_success', { status: 'success' }, { duration: totalDuration }, context);
    trackMetric('operation_duration', totalDuration);

    return response;

  } catch (error) {
    const totalDuration = Date.now() - startTime;
    trackException(error as Error, { operation: 'operation_name', user_id: request.userId || 'anonymous' });
    trackEvent('operation_failure', { status: 'failure', error: (error as Error).message }, { duration: totalDuration }, context);
    throw error;
  }
}
```

### Track Event
```typescript
trackEvent('event_name', {
  property1: 'value1',
  property2: 'value2'
}, {
  metric1: 123,
  metric2: 456
}, context);
```

### Track Metric
```typescript
trackMetric('metric_name', 123, {
  tag1: 'value1'
});
```

### Track Dependency
```typescript
trackDependency('PostgreSQL:GetData', 'SQL', 45, true, {
  table: 'members',
  operation: 'SELECT'
});
```

### Track Exception
```typescript
trackException(error, {
  operation: 'get_members',
  user_id: 'user-123'
}, 3); // 3 = Error severity
```

---

## Alert Severity Levels

- **0 (Critical)** - Service down, immediate action
- **1 (Error)** - Major issue, urgent attention
- **2 (Warning)** - Issue requiring investigation
- **3 (Information)** - Non-critical notification

---

## Common Issues

### No Data Appearing
1. Wait 2-3 minutes (ingestion delay)
2. Check connection string is configured
3. Check function logs for initialization message
4. Generate test traffic

### Slow Performance
- Telemetry is async and batched
- Typical overhead: <5ms
- Check dependencies query for AppInsights calls

### Missing Properties
- Use strings for all custom dimensions
- Don't pass objects (they won't serialize)
- Convert numbers to strings

---

## Useful Dashboards

### Performance Overview
```kusto
customMetrics
| where name contains "duration"
| where timestamp > ago(1h)
| summarize
    avg(value),
    percentile(value, 50),
    percentile(value, 95),
    percentile(value, 99)
  by bin(timestamp, 5m)
| render timechart
```

### Error Tracking
```kusto
customEvents
| where name contains "failure"
| where timestamp > ago(1h)
| extend
    operation = tostring(customDimensions.operation),
    error = tostring(customDimensions.error)
| summarize count() by operation, error
| order by count_ desc
```

### User Activity
```kusto
customEvents
| where timestamp > ago(24h)
| extend user_id = tostring(customDimensions.user_id)
| where user_id != "anonymous"
| summarize
    requests = count(),
    operations = dcount(name)
  by user_id
| order by requests desc
```

---

## Files

- **Utility:** `api/src/utils/telemetry.ts`
- **Test Script:** `api/tests/test-telemetry.sh`
- **Alert Script:** `infrastructure/app-insights-alerts.sh`
- **Full Docs:** `docs/APPLICATION_INSIGHTS_SETUP.md`
- **Credentials:** `.credentials` (gitignored)

---

**Quick Help:** See `docs/APPLICATION_INSIGHTS_SETUP.md` for detailed documentation.
