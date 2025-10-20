# Application Insights Telemetry Setup

**Last Updated:** October 20, 2025

## Overview

This document describes the Application Insights telemetry implementation for the CTN ASR API. The telemetry system provides comprehensive monitoring of API performance, errors, and usage patterns.

---

## Table of Contents

1. [Architecture](#architecture)
2. [What's Being Tracked](#whats-being-tracked)
3. [Telemetry Functions](#telemetry-functions)
4. [Adding Telemetry to New Functions](#adding-telemetry-to-new-functions)
5. [Viewing Telemetry Data](#viewing-telemetry-data)
6. [Alerts and Monitoring](#alerts-and-monitoring)
7. [Performance Queries](#performance-queries)
8. [Troubleshooting](#troubleshooting)

---

## Architecture

### Components

1. **Application Insights Resource** - Azure resource collecting telemetry data
2. **Application Insights SDK** - Node.js library (`applicationinsights` v2.9.0)
3. **Telemetry Utility** - Custom wrapper functions in `api/src/utils/telemetry.ts`
4. **Function Instrumentation** - Telemetry calls in each API function

### Data Flow

```
API Function → Telemetry Utility → Application Insights SDK → Azure Application Insights → Log Analytics
```

### Configuration

**Environment Variables** (configured in Azure Function App):
- `APPLICATIONINSIGHTS_CONNECTION_STRING` - Connection string for Application Insights
- `APPINSIGHTS_INSTRUMENTATIONKEY` - Instrumentation key (legacy)

**Local Development:**
- Add connection string to `.credentials` file (gitignored)
- Telemetry will be disabled if connection string is missing (graceful degradation)

---

## What's Being Tracked

### 1. Custom Events

Events tracking specific actions and outcomes:

| Event Name | When Fired | Properties |
|------------|-----------|------------|
| `get_members_request` | When GetMembers is called | user_id, page, limit |
| `get_members_success` | When GetMembers succeeds | status, count, duration |
| `get_members_failure` | When GetMembers fails | status, error, duration |
| `create_member_request` | When CreateMember is called | user_id, org_id |
| `create_member_success` | When CreateMember succeeds | status, org_id, duration |
| `create_member_failure` | When CreateMember fails | status, error, duration |
| `resolve_party_request` | When ResolveParty is called | user_id, oid |
| `resolve_party_success` | When ResolveParty succeeds | status, party_id, duration |
| `resolve_party_failure` | When ResolveParty fails | status, error, duration |

### 2. Custom Metrics

Performance measurements:

| Metric Name | Description | Unit |
|-------------|-------------|------|
| `get_members_duration` | Total time to fetch members | milliseconds |
| `get_members_count` | Number of members returned | count |
| `create_member_duration` | Total time to create member | milliseconds |
| `resolve_party_duration` | Total time to resolve party | milliseconds |
| `database_query_duration` | Individual database query time | milliseconds |

### 3. Dependencies

External calls tracked:

| Dependency Type | Examples |
|----------------|----------|
| `SQL` | PostgreSQL database queries |
| `HTTP` | External API calls (KvK API, etc.) |

**Properties:**
- `name` - Operation name (e.g., "PostgreSQL:GetMembers")
- `duration` - Time taken in milliseconds
- `success` - Boolean indicating success/failure
- `table` - Database table queried
- `operation` - SQL operation type (SELECT, INSERT, UPDATE, DELETE)

### 4. Exceptions

All errors and exceptions with:
- Exception details and stack trace
- Context properties (operation, user_id)
- Severity level (1=Info, 2=Warning, 3=Error, 4=Critical)

---

## Telemetry Functions

Located in `api/src/utils/telemetry.ts`:

### `initializeTelemetry()`

Initializes Application Insights SDK. Called once at application startup in `essential-index.ts`.

```typescript
import { initializeTelemetry } from './utils/telemetry';
initializeTelemetry();
```

### `trackEvent(name, properties, measurements, context)`

Track custom events with optional properties and measurements.

```typescript
trackEvent('user_action', {
  user_id: 'user-123',
  action: 'button_click'
}, {
  duration: 150
}, context);
```

**Parameters:**
- `name` - Event name (string)
- `properties` - Key-value pairs (optional, Record<string, string>)
- `measurements` - Numeric values (optional, Record<string, number>)
- `context` - InvocationContext (optional)

### `trackMetric(name, value, properties)`

Track custom metrics (performance counters, counts, etc.).

```typescript
trackMetric('api_response_time', 234, {
  endpoint: '/members'
});
```

**Parameters:**
- `name` - Metric name (string)
- `value` - Numeric value (number)
- `properties` - Additional context (optional, Record<string, string>)

### `trackDependency(name, type, duration, success, properties)`

Track external dependencies (database, APIs).

```typescript
trackDependency('PostgreSQL:GetMembers', 'SQL', 45, true, {
  table: 'members',
  operation: 'SELECT'
});
```

**Parameters:**
- `name` - Dependency name (string)
- `type` - Type (e.g., 'SQL', 'HTTP')
- `duration` - Time in milliseconds (number)
- `success` - Whether call succeeded (boolean)
- `properties` - Additional context (optional, Record<string, string>)

### `trackException(error, properties, severity)`

Track exceptions and errors.

```typescript
trackException(error, {
  operation: 'get_members',
  user_id: 'user-123'
}, 3); // 3 = Error
```

**Parameters:**
- `error` - Error object (Error)
- `properties` - Additional context (optional, Record<string, string>)
- `severity` - Severity level (optional, 1-4)
  - 1 = Info
  - 2 = Warning
  - 3 = Error (default)
  - 4 = Critical

---

## Adding Telemetry to New Functions

### Step 1: Import Telemetry Functions

```typescript
import { trackEvent, trackMetric, trackException, trackDependency } from '../utils/telemetry';
```

### Step 2: Add Start Time Tracking

```typescript
async function handler(request: AuthenticatedRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const startTime = Date.now();

  // ... rest of function
}
```

### Step 3: Track Request Event

```typescript
trackEvent('your_operation_request', {
  user_id: request.userId || 'anonymous',
  // Add relevant request properties
}, undefined, context);
```

### Step 4: Track Database Calls

```typescript
const dbStart = Date.now();
const result = await pool.query(query, params);
const dbDuration = Date.now() - dbStart;

trackDependency('PostgreSQL:YourOperation', 'SQL', dbDuration, true, {
  table: 'your_table',
  operation: 'SELECT' // or INSERT, UPDATE, DELETE
});
```

### Step 5: Track Success/Failure

```typescript
try {
  // ... operation logic

  const totalDuration = Date.now() - startTime;
  trackEvent('your_operation_success', {
    status: 'success'
  }, { duration: totalDuration }, context);

  trackMetric('your_operation_duration', totalDuration, {
    operation: 'your_operation'
  });

  return response;

} catch (error) {
  const totalDuration = Date.now() - startTime;

  trackException(error as Error, {
    operation: 'your_operation',
    user_id: request.userId || 'anonymous'
  });

  trackEvent('your_operation_failure', {
    status: 'failure',
    error: (error as Error).message
  }, { duration: totalDuration }, context);

  throw error;
}
```

### Complete Example

```typescript
import { trackEvent, trackMetric, trackException, trackDependency } from '../utils/telemetry';

async function handler(
  request: AuthenticatedRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const startTime = Date.now();

  try {
    // Track request
    trackEvent('get_data_request', {
      user_id: request.userId || 'anonymous'
    }, undefined, context);

    // Database operation
    const dbStart = Date.now();
    const result = await pool.query('SELECT * FROM data');
    const dbDuration = Date.now() - dbStart;

    trackDependency('PostgreSQL:GetData', 'SQL', dbDuration, true, {
      table: 'data',
      operation: 'SELECT'
    });

    // Track success
    const totalDuration = Date.now() - startTime;
    trackEvent('get_data_success', {
      status: 'success',
      count: result.rows.length.toString()
    }, { duration: totalDuration }, context);

    trackMetric('get_data_duration', totalDuration);
    trackMetric('get_data_count', result.rows.length);

    return {
      status: 200,
      jsonBody: { data: result.rows }
    };

  } catch (error) {
    const totalDuration = Date.now() - startTime;

    trackException(error as Error, {
      operation: 'get_data',
      user_id: request.userId || 'anonymous'
    });

    trackEvent('get_data_failure', {
      status: 'failure',
      error: (error as Error).message
    }, { duration: totalDuration }, context);

    return {
      status: 500,
      jsonBody: { error: 'Failed to fetch data' }
    };
  }
}
```

---

## Viewing Telemetry Data

### Azure Portal

**Application Insights Overview:**
```
https://portal.azure.com/#@/resource/subscriptions/add6a89c-7fb9-4f8a-9d63-7611a617430e/resourceGroups/rg-ctn-demo-asr-dev/providers/microsoft.insights/components/appi-ctn-demo-asr-dev
```

**Key Views:**
1. **Overview** - Summary metrics, charts
2. **Logs** - Query telemetry data using KQL
3. **Transaction search** - Find specific requests/events
4. **Failures** - View exceptions and failed requests
5. **Performance** - Response times, dependencies
6. **Live Metrics** - Real-time monitoring

### Log Analytics (Kusto Query Language)

Access via: Azure Portal → Application Insights → Logs

**Query 1: Recent Custom Events**
```kusto
customEvents
| where timestamp > ago(1h)
| project timestamp, name, customDimensions
| order by timestamp desc
| take 50
```

**Query 2: API Performance by Operation**
```kusto
customMetrics
| where name contains "duration"
| where timestamp > ago(1h)
| summarize
    avg_duration = avg(value),
    p50 = percentile(value, 50),
    p95 = percentile(value, 95),
    p99 = percentile(value, 99)
  by operation = tostring(customDimensions.operation)
| order by avg_duration desc
```

**Query 3: Database Query Performance**
```kusto
dependencies
| where type == "SQL"
| where timestamp > ago(1h)
| summarize
    count = count(),
    avg_duration = avg(duration),
    p95_duration = percentile(duration, 95)
  by name
| order by avg_duration desc
```

**Query 4: Error Rate by Operation**
```kusto
customEvents
| where timestamp > ago(1h)
| where name contains "success" or name contains "failure"
| extend operation = tostring(customDimensions.operation)
| summarize
    total = count(),
    failures = countif(name contains "failure"),
    error_rate = round(countif(name contains "failure") * 100.0 / count(), 2)
  by operation
| order by error_rate desc
```

**Query 5: User Activity**
```kusto
customEvents
| where timestamp > ago(24h)
| extend user_id = tostring(customDimensions.user_id)
| where user_id != "anonymous"
| summarize
    requests = count(),
    unique_operations = dcount(name)
  by user_id
| order by requests desc
```

**Query 6: Slowest Database Queries**
```kusto
dependencies
| where type == "SQL"
| where timestamp > ago(1h)
| extend
    table = tostring(customDimensions.table),
    operation = tostring(customDimensions.operation)
| where duration > 100 // queries slower than 100ms
| project timestamp, name, duration, table, operation
| order by duration desc
| take 20
```

---

## Alerts and Monitoring

### Configured Alerts

Run `infrastructure/app-insights-alerts.sh` to create alerts.

| Alert Name | Condition | Severity | Description |
|-----------|-----------|----------|-------------|
| High API Error Rate | >10 failures in 5min | 2 (High) | Alerts when error rate is high |
| Slow API Response | Avg >1000ms for 5min | 3 (Medium) | Alerts when responses are slow |
| Slow Database Queries | Avg SQL >500ms | 3 (Medium) | Alerts when DB is slow |
| High Exception Rate | >5 exceptions in 5min | 2 (High) | Alerts on many exceptions |
| Authentication Failures | >3 failures in 5min | 1 (Critical) | Critical security alert |

### Alert Severity Levels

- **0 - Critical** - Immediate action required (e.g., service down)
- **1 - Error** - Major issue requiring attention (e.g., auth failures)
- **2 - Warning** - Issue that should be investigated (e.g., high error rate)
- **3 - Information** - Non-critical notification (e.g., slow responses)

---

## Performance Queries

### API Health Dashboard

```kusto
// Overall API Health (last hour)
let timeRange = 1h;
customEvents
| where timestamp > ago(timeRange)
| where name contains "success" or name contains "failure"
| summarize
    TotalRequests = count(),
    Failures = countif(name contains "failure"),
    SuccessRate = round((count() - countif(name contains "failure")) * 100.0 / count(), 2)
| extend Health = case(
    SuccessRate >= 99.5, "Excellent",
    SuccessRate >= 95, "Good",
    SuccessRate >= 90, "Fair",
    "Poor"
)
```

### Response Time Percentiles

```kusto
customMetrics
| where name contains "duration"
| where timestamp > ago(1h)
| summarize
    p50 = percentile(value, 50),
    p75 = percentile(value, 75),
    p90 = percentile(value, 90),
    p95 = percentile(value, 95),
    p99 = percentile(value, 99)
  by bin(timestamp, 5m)
| render timechart
```

### Most Used Endpoints

```kusto
customEvents
| where timestamp > ago(24h)
| where name contains "request"
| extend operation = tostring(customDimensions.operation)
| summarize count() by operation
| order by count_ desc
| take 10
```

---

## Troubleshooting

### Telemetry Not Appearing

**Issue:** No data in Application Insights after deployment.

**Solutions:**
1. **Check connection string:**
   ```bash
   az functionapp config appsettings list \
     --name func-ctn-demo-asr-dev \
     --resource-group rg-ctn-demo-asr-dev \
     --query "[?name=='APPLICATIONINSIGHTS_CONNECTION_STRING'].value" -o tsv
   ```

2. **Check function logs:**
   ```bash
   func azure functionapp logstream func-ctn-demo-asr-dev --timeout 30
   ```
   Should see: "Application Insights initialized successfully"

3. **Wait 2-3 minutes** - Telemetry ingestion has delay

4. **Generate test traffic:**
   ```bash
   ./api/tests/test-telemetry.sh
   ```

### High Latency

**Issue:** Telemetry causing slow API responses.

**Analysis:**
```kusto
dependencies
| where name contains "AppInsights"
| summarize avg(duration), max(duration)
```

**Notes:**
- Application Insights SDK is async and batches data
- Minimal impact on performance (<5ms typically)
- Data is cached locally and sent in background

### Missing Custom Properties

**Issue:** Custom dimensions not appearing in queries.

**Solution:**
```typescript
// WRONG - will not appear
trackEvent('my_event', {
  user: userObject // objects are not serialized
});

// CORRECT - use strings
trackEvent('my_event', {
  user_id: userObject.id.toString(),
  user_email: userObject.email
});
```

### Environment Variable Not Found

**Issue:** "Application Insights connection string not found. Telemetry disabled."

**Solutions:**
1. **Local development** - Add to `.credentials` file:
   ```
   APPLICATIONINSIGHTS_CONNECTION_STRING=InstrumentationKey=...
   ```

2. **Azure deployment** - Set app setting:
   ```bash
   az functionapp config appsettings set \
     --name func-ctn-demo-asr-dev \
     --resource-group rg-ctn-demo-asr-dev \
     --settings "APPLICATIONINSIGHTS_CONNECTION_STRING=..."
   ```

3. **Verify deployment:**
   ```bash
   func azure functionapp logstream func-ctn-demo-asr-dev
   ```

---

## Best Practices

### 1. Event Naming Convention

Use lowercase with underscores:
- ✅ `get_members_request`
- ❌ `GetMembersRequest`
- ❌ `get-members-request`

### 2. Property Values

Always use strings for custom dimensions:
```typescript
// ✅ GOOD
trackEvent('user_action', {
  user_id: userId.toString(),
  count: count.toString()
});

// ❌ BAD
trackEvent('user_action', {
  user_id: userId, // might be number
  user: userObject // objects don't serialize
});
```

### 3. Duration Tracking

Always track total duration and individual operation durations:
```typescript
const startTime = Date.now();
// ... operations
const totalDuration = Date.now() - startTime;
trackMetric('operation_duration', totalDuration);
```

### 4. Error Context

Include operation name and user context in exceptions:
```typescript
trackException(error as Error, {
  operation: 'get_members',
  user_id: request.userId || 'anonymous',
  resource_id: memberId
});
```

### 5. Database Tracking

Always track database calls with table and operation type:
```typescript
trackDependency('PostgreSQL:GetMembers', 'SQL', duration, true, {
  table: 'members',
  operation: 'SELECT',
  rows: result.rows.length.toString()
});
```

---

## Resources

**Azure Portal:**
- Application Insights: https://portal.azure.com/#@/resource/subscriptions/add6a89c-7fb9-4f8a-9d63-7611a617430e/resourceGroups/rg-ctn-demo-asr-dev/providers/microsoft.insights/components/appi-ctn-demo-asr-dev
- Log Analytics Workspace: Linked to Application Insights

**Documentation:**
- Application Insights for Node.js: https://learn.microsoft.com/en-us/azure/azure-monitor/app/nodejs
- Kusto Query Language: https://learn.microsoft.com/en-us/azure/data-explorer/kusto/query/
- Custom Events and Metrics: https://learn.microsoft.com/en-us/azure/azure-monitor/app/api-custom-events-metrics

**Local Files:**
- Telemetry utility: `api/src/utils/telemetry.ts`
- Test script: `api/tests/test-telemetry.sh`
- Alert script: `infrastructure/app-insights-alerts.sh`
- Credentials: `.credentials` (gitignored)

---

## Next Steps

1. **Add telemetry to remaining functions:**
   - UpdateLegalEntity
   - GetLegalEntity
   - CreateIdentifier, UpdateIdentifier, DeleteIdentifier
   - GetContacts, CreateContact, UpdateContact
   - GetOrchestrations, GetOrchestrationDetails
   - GetEvents

2. **Create custom dashboards:**
   - API performance dashboard
   - Error tracking dashboard
   - User activity dashboard

3. **Set up alert notifications:**
   - Configure email/SMS notifications
   - Integrate with incident management tools

4. **Advanced analytics:**
   - User journey analysis
   - Performance baseline establishment
   - Anomaly detection

---

**Maintained by:** CTN Development Team
**Last Review:** October 20, 2025
**Next Review:** November 20, 2025
