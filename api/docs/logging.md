# API Logging Guide

## Overview

The CTN ASR API uses **Azure Application Insights** for structured logging with automatic integration to Azure monitoring. All logs are automatically sent to Application Insights for querying, alerting, and analysis.

## Logger Architecture

### Core Components

1. **AppInsightsLogger** (`src/utils/logger.ts`)
   - Main logging class that wraps Azure Functions context
   - Provides structured logging with properties
   - Automatic integration with Application Insights

2. **HTTP Request/Response Logging**
   - Correlation ID tracking across requests
   - Request/response timing
   - Automatic logging in middleware

3. **Security Event Logging**
   - Authentication failures
   - Authorization failures
   - Suspicious activity

## Log Levels

The API uses Application Insights log severity levels:

| Level | Value | When to Use | Examples |
|-------|-------|-------------|----------|
| **Verbose** | 0 | Development debugging only | "Query params: {...}", "Cache hit" |
| **Information** | 1 | Normal operations | "User authenticated", "Request completed" |
| **Warning** | 2 | Recoverable issues, security events | "Rate limit approaching", "Auth failed" |
| **Error** | 3 | Application errors | "Database query failed", "Invalid token" |
| **Critical** | 4 | Service outage, data loss | "Database down", "Security breach" |

## Usage Patterns

### Basic Logging

```typescript
import { createLogger } from '../utils/logger';

async function handler(request: AuthenticatedRequest, context: InvocationContext) {
  const logger = createLogger(context);

  // Info level
  logger.info('Processing request', {
    userId: request.userId,
    action: 'create_member',
  });

  // Warning level
  logger.warn('Rate limit approaching', {
    userId: request.userId,
    requestCount: 95,
    limit: 100,
  });

  // Error level
  logger.error('Database query failed', error, {
    query: 'SELECT * FROM members',
    userId: request.userId,
  });
}
```

### Correlation IDs

Correlation IDs track requests across the entire system:

```typescript
import { getOrCreateCorrelationId } from '../utils/logger';

const correlationId = getOrCreateCorrelationId(request);
// Automatically extracts from X-Correlation-ID header or generates new UUID
```

**Benefits:**
- Trace a single request through multiple services
- Correlate logs from different components
- Debug distributed transactions

**All responses include X-Correlation-ID header** for client-side tracking.

### HTTP Request/Response Logging

The authentication middleware automatically logs all HTTP requests and responses:

```typescript
import { logHttpRequest, logHttpResponse } from '../utils/logger';

// Request logging (automatic in auth middleware)
logHttpRequest(logger, request, correlationId);
// Logs: method, URL, user-agent, content-type, query params

// Response logging (automatic in auth middleware)
logHttpResponse(logger, request, statusCode, correlationId, durationMs);
// Logs: status code, duration, correlation ID
// Log level: error (5xx), warn (4xx), info (2xx/3xx)
```

### Authentication Event Logging

Authentication events are automatically logged by the auth middleware:

```typescript
import { logAuthEvent } from '../utils/logger';

// Successful authentication
logAuthEvent(logger, true, correlationId, {
  userId: 'user-123',
  userEmail: 'user@example.com',
  roles: 'MemberAdmin,MemberUser',
});

// Failed authentication (logged as security event)
logAuthEvent(logger, false, correlationId, {
  error: 'Invalid token signature',
  ipAddress: '192.168.1.1',
});
```

### Authorization Event Logging

Authorization events are automatically logged by RBAC middleware:

```typescript
import { logAuthzEvent } from '../utils/logger';

// Successful authorization
logAuthzEvent(logger, true, correlationId, {
  userId: 'user-123',
  userEmail: 'user@example.com',
  userRoles: 'MemberAdmin',
  requiredRoles: 'MemberAdmin,AssociationAdmin',
  checkType: 'roles',
});

// Failed authorization (logged as security event)
logAuthzEvent(logger, false, correlationId, {
  userId: 'user-123',
  userRoles: 'MemberUser',
  requiredRoles: 'MemberAdmin',
  reason: 'Insufficient roles',
});
```

### Security Event Logging

Log security-related events for monitoring and alerting:

```typescript
import { logSecurityEvent } from '../utils/logger';

logSecurityEvent(logger, 'Suspicious Login Pattern', correlationId, {
  userId: 'user-123',
  ipAddress: '192.168.1.1',
  failedAttempts: 5,
  timeWindow: '5 minutes',
});

logSecurityEvent(logger, 'Token Reuse Detected', correlationId, {
  tokenId: 'tok-xyz',
  userId: 'user-123',
  ipAddresses: '192.168.1.1, 10.0.0.5',
});
```

### Performance Tracking

Track operation performance for monitoring slow queries:

```typescript
import { trackPerformance } from '../utils/logger';

const logger = createLogger(context);
const perf = trackPerformance(logger, 'DatabaseQuery');

try {
  const result = await pool.query('SELECT * FROM members');
  perf.end(true, { rowCount: result.rows.length });
} catch (error) {
  perf.end(false, { error: error.message });
  throw error;
}
```

### Custom Events

Track business events for analytics:

```typescript
logger.trackEvent('MemberCreated', {
  memberId: 'member-123',
  membershipLevel: 'premium',
  source: 'api',
});

logger.trackEvent('TokenIssued', {
  tokenType: 'api',
  expiresIn: '90 days',
  memberId: 'member-123',
});
```

### Custom Metrics

Track quantitative metrics:

```typescript
logger.trackMetric('ApiResponseTime', durationMs, {
  endpoint: '/api/v1/members',
  statusCode: 200,
});

logger.trackMetric('ActiveSessions', sessionCount, {
  timestamp: new Date().toISOString(),
});
```

## Security Best Practices

### DO NOT Log Sensitive Data

**Never log:**
- Passwords
- API tokens (full values)
- JWT tokens (full values)
- Credit card numbers
- Social security numbers
- Personal health information

**Safe to log:**
- User IDs (UUIDs, not emails in sensitive contexts)
- Token prefixes (first 8 chars)
- Hashed values
- IP addresses (for security monitoring)
- User-agent strings

### Example - Safe Logging

```typescript
// BAD - Don't do this
logger.info('User login', {
  email: user.email,
  password: user.password, // NEVER log passwords
  token: jwtToken, // NEVER log full tokens
});

// GOOD - Safe logging
logger.info('User login', {
  userId: user.id,
  tokenPrefix: jwtToken.substring(0, 8) + '...',
  ipAddress: request.headers.get('x-forwarded-for'),
});
```

## Querying Logs in Application Insights

### Find Logs by Correlation ID

```kql
traces
| where customDimensions.correlationId == "abc-123-def"
| order by timestamp asc
```

### Authentication Failures

```kql
traces
| where message contains "Authentication"
| where customDimensions.authenticationStatus == "failed"
| order by timestamp desc
| take 100
```

### Slow Requests

```kql
traces
| where message contains "HTTP Response"
| extend duration = todouble(customDimensions.duration)
| where duration > 1000
| order by duration desc
```

### Security Events

```kql
traces
| where customDimensions.securityEvent != ""
| order by timestamp desc
```

## Environment Configuration

The logger adapts to the environment:

**Development:**
- Verbose logging enabled
- Logs to console with colors
- All log levels visible

**Production:**
- Info level and above
- JSON format to Application Insights
- Verbose logs filtered out

## Automatic Logging

The following are automatically logged by middleware:

1. **All HTTP requests** (method, URL, headers, query params)
2. **All HTTP responses** (status code, duration, correlation ID)
3. **Authentication attempts** (success/failure, user info)
4. **Authorization checks** (role/permission checks)
5. **Request timing** (start time, duration)
6. **Errors** (stack traces, context)

**You don't need to add logging to:**
- Individual API function entry/exit (endpointWrapper handles this)
- Auth/authz events (middleware handles this)
- Request/response logging (middleware handles this)

**You should add logging for:**
- Business logic decisions
- Database queries (especially slow ones)
- External API calls
- Performance-critical operations
- Security-relevant events

## Example: Complete Handler with Logging

```typescript
import { HttpResponseInit, InvocationContext } from '@azure/functions';
import { AuthenticatedRequest } from '../middleware/auth';
import { createLogger, trackPerformance } from '../utils/logger';
import { getPool } from '../utils/database';

async function handler(
  request: AuthenticatedRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const logger = createLogger(context);
  const memberId = request.params.memberId;

  // Log business decision
  logger.info('Fetching member details', {
    memberId,
    requestedBy: request.userId,
  });

  // Track database performance
  const dbPerf = trackPerformance(logger, 'GetMemberQuery');

  try {
    const pool = getPool();
    const result = await pool.query(
      'SELECT * FROM members WHERE id = $1',
      [memberId]
    );

    dbPerf.end(true, { rowCount: result.rows.length });

    if (result.rows.length === 0) {
      logger.warn('Member not found', { memberId });
      return {
        status: 404,
        body: JSON.stringify({ error: 'Member not found' }),
      };
    }

    logger.info('Member details retrieved successfully', {
      memberId,
      membershipLevel: result.rows[0].membership_level,
    });

    return {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result.rows[0]),
    };
  } catch (error) {
    dbPerf.end(false, { error: error.message });

    logger.error('Failed to fetch member details', error, {
      memberId,
      requestedBy: request.userId,
    });

    return {
      status: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
}
```

## Monitoring and Alerting

### Recommended Alerts

Set up alerts in Application Insights for:

1. **Authentication Failures** - Spike in failed auth attempts
2. **Authorization Failures** - Users attempting unauthorized actions
3. **Error Rate** - High percentage of 5xx responses
4. **Slow Requests** - Requests taking >2 seconds
5. **Security Events** - Any critical security event

### Dashboard Queries

**Error Rate:**
```kql
requests
| summarize
    TotalRequests = count(),
    ErrorRequests = countif(resultCode >= 500)
    by bin(timestamp, 5m)
| extend ErrorRate = (ErrorRequests * 100.0) / TotalRequests
```

**Average Response Time:**
```kql
requests
| summarize AvgDuration = avg(duration) by bin(timestamp, 5m)
```

## Troubleshooting

### Logs Not Appearing

1. Check Application Insights connection string is set
2. Verify function app has Application Insights enabled
3. Check log level filter (Verbose only in development)
4. Wait 2-3 minutes for logs to propagate

### Missing Correlation IDs

1. Ensure auth middleware is running first
2. Check X-Correlation-ID header in requests
3. Verify getOrCreateCorrelationId() is called

### Performance Impact

- Logging is asynchronous and minimal overhead
- Application Insights batches logs
- Production logging is info level and above only
- No performance impact for normal usage

## References

- [Azure Application Insights Documentation](https://docs.microsoft.com/en-us/azure/azure-monitor/app/app-insights-overview)
- [Kusto Query Language (KQL)](https://docs.microsoft.com/en-us/azure/data-explorer/kusto/query/)
- [Azure Functions Logging](https://docs.microsoft.com/en-us/azure/azure-functions/functions-monitoring)
