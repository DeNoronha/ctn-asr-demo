# Application Insights Logging Guide

**Last Updated:** October 15, 2025

This guide explains how to use the comprehensive Application Insights logging system in the CTN ASR API.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Log Levels](#log-levels)
- [Usage Examples](#usage-examples)
- [Performance Tracking](#performance-tracking)
- [Best Practices](#best-practices)
- [Configuration](#configuration)

## Overview

The CTN ASR API uses a structured logging system that integrates seamlessly with Azure Application Insights. All logs are automatically enriched with function context, invocation IDs, and timestamps.

**Key Features:**
- ✅ Automatic integration with Application Insights
- ✅ Structured logging with custom properties
- ✅ Performance tracking and metrics
- ✅ Dependency tracking (database, external APIs)
- ✅ Custom events and metrics
- ✅ W3C distributed tracing support

## Quick Start

### 1. Import the Logger

```typescript
import { createLogger } from '../utils/logger';
import type { HttpRequest, InvocationContext } from '@azure/functions';
```

### 2. Create Logger Instance

```typescript
export async function myFunction(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const logger = createLogger(context);

  // Use logger throughout your function
  logger.info('Function started');

  // Your function logic here

  return { status: 200, jsonBody: { success: true } };
}
```

## Log Levels

The logger supports five severity levels matching Application Insights:

| Level | Method | Use Case | Color |
|-------|--------|----------|-------|
| **Verbose** | `logger.verbose()` | Detailed debugging (dev only) | 🔍 |
| **Information** | `logger.info()` | Normal operation events | ℹ️ |
| **Warning** | `logger.warn()` | Non-critical issues | ⚠️ |
| **Error** | `logger.error()` | Recoverable errors | ❌ |
| **Critical** | `logger.critical()` | Service outages, data loss | 🔴 |

### When to Use Each Level

**Verbose (Development Only):**
- Variable values during debugging
- Detailed flow information
- Automatically disabled in production

**Information:**
- Function execution started/completed
- Successful operations
- User actions (login, logout, data access)
- Integration points (API calls made)

**Warning:**
- Deprecated feature usage
- Fallback to default values
- Rate limiting applied
- Slow operations (but not failed)

**Error:**
- Failed operations that can be retried
- Invalid user input
- External service failures
- Database query failures

**Critical:**
- Service cannot start
- Data corruption detected
- Security breach detected
- Unrecoverable system failure

## Usage Examples

### Basic Logging

```typescript
// Information log
logger.info('User authenticated successfully', {
  userId: user.id,
  email: user.email
});

// Warning log
logger.warn('Rate limit approaching threshold', {
  currentRequests: 95,
  limit: 100
});

// Error log with exception
try {
  await riskyOperation();
} catch (error) {
  logger.error('Operation failed', error, {
    operation: 'riskyOperation',
    retryCount: 3
  });
}

// Critical error
logger.critical('Database connection lost', error, {
  connectionString: 'postgresql://...',
  lastSuccessfulQuery: Date.now() - 60000
});
```

### Custom Events

Track business events that occur in your application:

```typescript
// User registration
logger.trackEvent('UserRegistered', {
  userId: newUser.id,
  registrationMethod: 'OAuth',
  membershipLevel: 'BASIC'
});

// Document uploaded
logger.trackEvent('KvKDocumentUploaded', {
  legalEntityId: entity.id,
  documentSize: file.size,
  documentType: 'KvK'
});

// Token issued
logger.trackEvent('TokenIssued', {
  tokenId: token.id,
  expiresIn: token.expiresIn,
  scope: token.scope
});
```

### Custom Metrics

Track numeric values over time:

```typescript
// Queue length
logger.trackMetric('ReviewQueueLength', queueLength, {
  queueType: 'kvk_verification',
  priority: 'high'
});

// Processing time
logger.trackMetric('DocumentProcessingTime', durationMs, {
  documentType: 'KvK',
  pageCount: 5
});

// Active users
logger.trackMetric('ActiveUsers', activeUserCount, {
  timeWindow: '5m',
  environment: 'production'
});
```

### Dependency Tracking

Track calls to external services:

```typescript
// Database query
const startTime = Date.now();
try {
  const result = await pool.query('SELECT * FROM members');
  const duration = Date.now() - startTime;

  logger.trackDependency('PostgreSQL', duration, true, {
    query: 'GetMembers',
    rowCount: result.rows.length
  });
} catch (error) {
  const duration = Date.now() - startTime;
  logger.trackDependency('PostgreSQL', duration, false, {
    query: 'GetMembers',
    error: (error as Error).message
  });
  throw error;
}

// External API call
const apiStart = Date.now();
try {
  const response = await fetch('https://api.kvk.nl/...');
  logger.trackDependency('KvK API', Date.now() - apiStart, response.ok, {
    endpoint: '/search',
    statusCode: response.status
  });
} catch (error) {
  logger.trackDependency('KvK API', Date.now() - apiStart, false, {
    endpoint: '/search',
    error: (error as Error).message
  });
}
```

## Performance Tracking

Use the built-in performance tracker for automatic duration logging:

```typescript
import { createLogger, trackPerformance } from '../utils/logger';

export async function complexOperation(
  request: HttpRequest,
  context: InvocationContext
) {
  const logger = createLogger(context);

  // Start performance tracking
  const perfTracker = trackPerformance(logger, 'DocumentProcessing');

  try {
    // Your complex operation
    await processDocument(document);

    // End tracking - logs success with duration
    perfTracker.end(true, { documentId: document.id });
  } catch (error) {
    // End tracking - logs failure with duration
    perfTracker.end(false, {
      documentId: document.id,
      error: (error as Error).message
    });
    throw error;
  }
}
```

## Best Practices

### 1. Always Add Context

Include relevant information to make logs actionable:

```typescript
// ❌ Bad - No context
logger.error('Failed to save');

// ✅ Good - With context
logger.error('Failed to save member', error, {
  memberId: member.id,
  operation: 'CreateMember',
  validationErrors: errors
});
```

### 2. Don't Log Sensitive Data

Never log passwords, tokens, or personal data:

```typescript
// ❌ Bad - Logs sensitive data
logger.info('User logged in', {
  password: user.password,  // NEVER!
  accessToken: token        // NEVER!
});

// ✅ Good - Only safe identifiers
logger.info('User logged in', {
  userId: user.id,
  email: user.email.split('@')[1], // Only domain
  authMethod: 'OAuth'
});
```

### 3. Use Appropriate Log Levels

Don't overuse error/critical levels:

```typescript
// ❌ Bad - Everything is an error
logger.error('User not found'); // This is expected behavior

// ✅ Good - Use warning for expected issues
logger.warn('User not found', { userId: requestedId });

// ✅ Critical only for system failures
logger.critical('Database unavailable', error);
```

### 4. Structure Your Properties

Use consistent property names across your application:

```typescript
// Standard property names
const logProperties = {
  // Identifiers
  userId: string,
  memberId: string,
  tokenId: string,

  // Operations
  operation: 'Create' | 'Read' | 'Update' | 'Delete',
  operationType: string,

  // Timing
  duration: number,
  timestamp: string,

  // Results
  success: boolean,
  statusCode: number,
  rowCount: number
};
```

### 5. Log at Function Boundaries

Log at the start and end of functions:

```typescript
export async function GetMember(
  request: HttpRequest,
  context: InvocationContext
) {
  const logger = createLogger(context);
  const memberId = request.params.id;

  logger.info('GetMember started', { memberId });

  try {
    const member = await fetchMember(memberId);
    logger.info('GetMember completed', {
      memberId,
      found: !!member
    });
    return { status: 200, jsonBody: member };
  } catch (error) {
    logger.error('GetMember failed', error, { memberId });
    throw error;
  }
}
```

## Configuration

### Application Insights Settings

The logging configuration is defined in `api/host.json`:

```json
{
  "logging": {
    "logLevel": {
      "default": "Information",
      "Function": "Information"
    },
    "applicationInsights": {
      "samplingSettings": {
        "isEnabled": true,
        "maxTelemetryItemsPerSecond": 20
      },
      "enableLiveMetrics": true,
      "enableDependencyTracking": true,
      "enablePerformanceCountersCollection": true,
      "httpAutoCollectionOptions": {
        "enableHttpTriggerExtendedInfoCollection": true,
        "enableW3CDistributedTracing": true
      }
    }
  }
}
```

### Environment Variables

Required for Application Insights:

```bash
# Automatically set by Azure Functions
APPLICATIONINSIGHTS_CONNECTION_STRING=InstrumentationKey=...

# Optional - for custom configuration
APPINSIGHTS_INSTRUMENTATIONKEY=your-key
```

### Query Logs in Application Insights

Use KQL (Kusto Query Language) to query your logs:

```kql
// All errors in last 24 hours
traces
| where timestamp > ago(24h)
| where severityLevel >= 3
| project timestamp, message, customDimensions

// Slow operations
dependencies
| where duration > 1000
| project timestamp, name, duration, success

// Custom events by type
customEvents
| where name == "UserRegistered"
| summarize count() by tostring(customDimensions.registrationMethod)
```

## Migration from Console Logging

If you're migrating from `console.log`:

```typescript
// Before
console.log('Processing member:', memberId);
console.error('Failed:', error);

// After
const logger = createLogger(context);
logger.info('Processing member', { memberId });
logger.error('Processing failed', error, { memberId });
```

## Troubleshooting

### Logs Not Appearing in Application Insights

1. Check `APPLICATIONINSIGHTS_CONNECTION_STRING` is set
2. Verify Application Insights is enabled in Azure Portal
3. Wait 2-3 minutes for logs to appear (not real-time)
4. Check sampling settings in `host.json`

### Performance Impact

The logger is designed for minimal overhead:
- Async logging doesn't block function execution
- Sampling prevents excessive telemetry
- Structured data is efficient to transmit

## Related Documentation

- [Azure Application Insights Overview](https://docs.microsoft.com/en-us/azure/azure-monitor/app/app-insights-overview)
- [Azure Functions Logging](https://docs.microsoft.com/en-us/azure/azure-functions/functions-monitoring)
- [KQL Query Language](https://docs.microsoft.com/en-us/azure/data-explorer/kusto/query/)

---

**Need Help?** Contact the development team or refer to `api/src/utils/logger.ts` for implementation details.
