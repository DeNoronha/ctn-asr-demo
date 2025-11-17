# Structured Logging with Correlation IDs - Implementation Guide

**Task:** TASK-CR-010: Improved Logging - Structured Logging with Correlation IDs
**Priority:** LOW (Batch 13 - 3 hours effort)
**Status:** COMPLETED
**Date:** November 17, 2025

## Overview

The admin portal now includes a production-ready structured logging system with correlation ID support for distributed tracing. This enhancement improves debugging capabilities and enables request tracing across the frontend-backend boundary.

## Key Features

### 1. Backward Compatible Logger
The existing `logger` object continues to work exactly as before:

```typescript
import { logger } from '../utils/logger';

// Simple logging (existing code works unchanged)
logger.log('Debug info');
logger.info('Info message');
logger.debug('Debug details');
logger.warn('Warning message');
logger.error('Error occurred', error);
```

### 2. Structured Logger with Correlation IDs
New `createLogger()` function for structured logging:

```typescript
import { createLogger } from '../utils/logger';

// Create logger with operation context
const logger = createLogger({ operation: 'fetchUsers', userId: '123' });

// Structured logging with metadata
logger.info('Fetching users from API', { pageSize: 10, filter: 'active' });
logger.error('API call failed', error, { endpoint: '/users' });

// Get correlation ID for tracing
const correlationId = logger.getCorrelationId();
```

### 3. Correlation ID Features

- **Auto-generated:** UUID v4 automatically created per logger instance
- **Manually specified:** Can provide correlation ID for request tracing
- **Child loggers:** Preserve parent correlation ID with additional context
- **HTTP header support:** Helper functions for request/response correlation

## Log Output Format

### Development Mode
Human-readable format with truncated correlation ID:

```
[INFO] 2025-11-17T10:30:45.123Z [a1b2c3d4] Fetching users from API { pageSize: 10 }
[ERROR] 2025-11-17T10:30:47.456Z [a1b2c3d4] API call failed { endpoint: '/users' } Error: Network timeout
```

### Production Mode
JSON format for log aggregation (Application Insights, ELK, etc.):

```json
{
  "level": "INFO",
  "timestamp": "2025-11-17T10:30:45.123Z",
  "correlationId": "a1b2c3d4-5678-90ab-cdef-1234567890ab",
  "message": "Fetching users from API",
  "context": {
    "operation": "fetchUsers",
    "userId": "123"
  },
  "metadata": {
    "pageSize": 10
  }
}
```

## Usage Patterns

### Pattern 1: Operation-Scoped Logging

```typescript
export async function fetchUserData(userId: string): Promise<User> {
  const logger = createLogger({ operation: 'fetchUserData', userId });

  logger.info('Starting user data fetch', { userId });

  try {
    const data = await api.getUser(userId);
    logger.debug('Received user data', { fields: Object.keys(data) });
    return data;
  } catch (error) {
    logger.error('Failed to fetch user data', error, { userId });
    throw error;
  }
}
```

### Pattern 2: Child Loggers (Preserve Correlation ID)

```typescript
export async function complexWorkflow(): Promise<void> {
  const rootLogger = createLogger({ operation: 'complexWorkflow' });

  rootLogger.info('Starting complex workflow');

  // Step 1: Fetch data (same correlation ID)
  const step1Logger = rootLogger.child({ step: 'fetchData' });
  step1Logger.info('Fetching data from API');
  const data = await fetchData();

  // Step 2: Process data (same correlation ID)
  const step2Logger = rootLogger.child({ step: 'processData' });
  step2Logger.info('Processing fetched data', { recordCount: data.length });
  await processData(data);

  // All logs share the same correlation ID for tracing
  rootLogger.info('Complex workflow completed');
}
```

### Pattern 3: Backend Correlation

```typescript
import { createLogger, withCorrelationHeaders, extractCorrelationId } from '../utils/logger';

export async function apiCall(endpoint: string): Promise<Response> {
  const logger = createLogger({ operation: 'apiCall', endpoint });

  // Add correlation ID to request headers
  const headers = withCorrelationHeaders(logger.getCorrelationId(), {
    'Content-Type': 'application/json',
  });

  logger.info('Sending API request', { endpoint, correlationId: logger.getCorrelationId() });

  const response = await fetch(endpoint, { headers });

  // Extract backend correlation ID from response (if different)
  const backendCorrelationId = extractCorrelationId(response.headers);
  if (backendCorrelationId) {
    logger.debug('Backend correlation ID received', { backendCorrelationId });
  }

  return response;
}
```

## Migration Guide

### Existing Code (No Changes Required)

```typescript
// ✅ Existing code works unchanged
import { logger } from '../utils/logger';

logger.log('Simple log message');
logger.error('Error occurred:', error);
```

### Enhanced Code (Optional Migration)

```typescript
// ✅ Enhanced structured logging
import { createLogger } from '../utils/logger';

const logger = createLogger({ operation: 'myOperation' });

logger.info('Operation started', { param1: 'value1' });
logger.error('Operation failed', error, { param1: 'value1' });
```

## Recommended Migration Strategy

1. **Phase 1:** Keep existing `logger` usage (no changes required)
2. **Phase 2:** Add structured logging to new code
3. **Phase 3:** Gradually migrate critical operations:
   - API calls (e.g., graphService.ts)
   - Authentication flows
   - User management operations
   - Error-prone operations

## Example: graphService.ts Migration

### Before
```typescript
export async function listUsers(): Promise<User[]> {
  try {
    logger.log('Fetching CTN application users from Microsoft Graph...');
    // ... operation logic
    logger.log(`Fetched ${users.length} CTN-authorized users`);
    return users;
  } catch (error) {
    logger.error('Failed to list users:', error);
    throw error;
  }
}
```

### After (with correlation IDs)
```typescript
export async function listUsers(): Promise<User[]> {
  const logger = createLogger({ operation: 'listUsers' });

  try {
    logger.info('Fetching CTN application users from Microsoft Graph');
    // ... operation logic
    logger.info('Fetched CTN-authorized users', {
      userCount: users.length,
      correlationId: logger.getCorrelationId(),
    });
    return users;
  } catch (error) {
    logger.error('Failed to list users', error);
    throw error;
  }
}
```

## Correlation ID Best Practices

### 1. Generate at Entry Points
```typescript
// Entry point: API call handler
export async function handleUserRequest(userId: string) {
  const logger = createLogger({ operation: 'handleUserRequest', userId });
  // ... operation logic
}
```

### 2. Pass Correlation ID to Backend
```typescript
const headers = withCorrelationHeaders(logger.getCorrelationId(), {
  'Authorization': `Bearer ${token}`,
});
```

### 3. Use Child Loggers for Sub-Operations
```typescript
const childLogger = logger.child({ subOperation: 'validateInput' });
```

### 4. Log Correlation ID in Final Summary
```typescript
logger.info('Operation completed', {
  correlationId: logger.getCorrelationId(),
  duration: Date.now() - startTime,
});
```

## Helper Functions

### `extractCorrelationId(headers)`
Extract correlation ID from HTTP response headers:

```typescript
const correlationId = extractCorrelationId(response.headers);
// Returns: string | null (checks x-correlation-id and x-request-id)
```

### `withCorrelationHeaders(correlationId, existingHeaders)`
Add correlation ID to HTTP request headers:

```typescript
const headers = withCorrelationHeaders('abc-123', {
  'Content-Type': 'application/json',
});
// Returns: { 'Content-Type': 'application/json', 'x-correlation-id': 'abc-123' }
```

## Log Levels

| Level | When to Use | Production Output |
|-------|-------------|-------------------|
| **DEBUG** | Detailed diagnostic info | Stripped (not logged) |
| **INFO** | Informational messages | Stripped (not logged) |
| **WARN** | Warning conditions | Logged |
| **ERROR** | Error conditions | Logged |

## Integration with Application Insights

The structured JSON format is optimized for Azure Application Insights:

```typescript
// Production logs are automatically JSON-formatted
logger.error('API call failed', error, { endpoint: '/users' });

// In Application Insights:
// - correlationId becomes operation_Id for tracing
// - context and metadata appear as customDimensions
// - error details captured in exceptions
```

## Testing Structured Logging

```typescript
import { createLogger } from '../utils/logger';

describe('Structured Logging', () => {
  it('generates unique correlation IDs', () => {
    const logger1 = createLogger({ operation: 'test1' });
    const logger2 = createLogger({ operation: 'test2' });

    expect(logger1.getCorrelationId()).not.toBe(logger2.getCorrelationId());
  });

  it('preserves correlation ID in child loggers', () => {
    const parent = createLogger({ operation: 'parent' });
    const child = parent.child({ step: 'child' });

    expect(child.getCorrelationId()).toBe(parent.getCorrelationId());
  });
});
```

## Files Modified

1. **`/admin-portal/src/utils/logger.ts`**
   - Enhanced with `StructuredLogger` class
   - Added `createLogger()` function
   - Maintains backward compatibility with existing `logger` object
   - Added helper functions for HTTP correlation

2. **`/admin-portal/src/services/graphService.example.ts`** (NEW)
   - Comprehensive examples of structured logging patterns
   - Demonstrates all key features
   - Copy-paste ready code snippets

3. **`/admin-portal/docs/LOGGING_GUIDE.md`** (NEW)
   - Complete documentation
   - Migration guide
   - Best practices

## Performance Considerations

- **Development:** Minimal overhead (logs are formatted)
- **Production:** Negligible overhead for warn/error (debug/info stripped at compile time)
- **Memory:** Correlation IDs are short-lived (function scope)
- **Bundle Size:** +2KB minified (uuid package already in dependencies)

## Security Considerations

- **No PII in logs:** Never log passwords, tokens, or sensitive data
- **Production stripping:** Debug/info logs removed in production builds
- **Error sanitization:** Error stack traces only in development mode
- **Correlation IDs:** Safe to expose (UUID v4 is non-sequential)

## Future Enhancements

1. **Backend Integration:** Add correlation ID support to API endpoints
2. **Rate Limiting:** Track correlation IDs for rate limit violations
3. **Distributed Tracing:** Integrate with OpenTelemetry
4. **Log Sampling:** Sample debug logs in production (configurable)
5. **Log Export:** Export logs to external services (Datadog, Splunk, etc.)

## References

- [Azure Application Insights Correlation](https://docs.microsoft.com/en-us/azure/azure-monitor/app/correlation)
- [W3C Trace Context](https://www.w3.org/TR/trace-context/)
- [Structured Logging Best Practices](https://www.loggly.com/ultimate-guide/node-logging-basics/)

## Support

For questions or issues with structured logging:
1. Check the example file: `graphService.example.ts`
2. Review this guide: `docs/LOGGING_GUIDE.md`
3. Consult the logger source: `utils/logger.ts`

---

**Implementation Date:** November 17, 2025
**Implemented By:** Claude Code (Code Reviewer Agent)
**Task Reference:** TASK-CR-010 (Batch 13 - LOW Priority)
