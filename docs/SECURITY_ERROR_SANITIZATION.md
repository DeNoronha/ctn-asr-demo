# Security Enhancement: Error Message Sanitization

**Date**: November 17, 2025
**Task**: TASK-SEC-006
**Severity**: Medium (CVSS 3.7 - Information Disclosure)
**OWASP Category**: A04:2021 - Insecure Design
**CWE**: CWE-209 - Generation of Error Message Containing Sensitive Information

## Executive Summary

Implemented comprehensive error message sanitization across all API endpoints to prevent information disclosure vulnerabilities. The enhancement ensures that stack traces, database internals, file paths, and implementation details are never exposed to clients while maintaining full server-side logging for debugging with correlation IDs.

## Security Issues Addressed

### 1. Stack Trace Exposure (CRITICAL)
**Before**: Error stack traces were exposed in development mode
```typescript
// INSECURE - Exposed in NODE_ENV=development
...(process.env.NODE_ENV === 'development' && {
  message: error.message,
  stack: error.stack
})
```

**After**: Stack traces NEVER exposed, logged server-side only
```typescript
// Log full error server-side with correlation ID
context.error(`[${correlationId}] API Error:`, {
  message: error.message,
  stack: error.stack,
  code: error.code,
  // ... all PostgreSQL error details
});

// Return generic message to client
return {
  status: 500,
  body: JSON.stringify({
    error: 'An internal error occurred. Please contact support with the correlation ID if the issue persists.',
    code: ErrorCodes.INTERNAL_ERROR,
    correlationId
  })
};
```

### 2. Database Table/Column Name Exposure
**Before**: PostgreSQL errors exposed table names, column names, constraints
```typescript
// Example error exposed to client:
// "duplicate key value violates unique constraint 'legal_entity_contact_legal_entity_id_email_key'"
```

**After**: Comprehensive PostgreSQL error code mapping (34 error codes)
```typescript
const POSTGRES_ERROR_MAP: Record<string, { status: number; code: string; message: string }> = {
  '23505': { status: 409, code: ErrorCodes.DUPLICATE, message: 'Resource already exists' },
  '23503': { status: 400, code: 'FK_VIOLATION', message: 'Referenced resource not found' },
  '23502': { status: 400, code: ErrorCodes.MISSING_FIELD, message: 'Required field is missing' },
  // ... 31 more mappings
};
```

### 3. File Path Exposure
**Before**: Error messages could contain server file paths
```typescript
// Example:
// "Error: ENOENT: no such file or directory, open '/var/app/config/secrets.json'"
```

**After**: File system errors mapped to generic messages
```typescript
if (error.code === 'ENOENT' || error.code === 'EACCES') {
  return { error: 'External service temporarily unavailable', ... };
}
```

### 4. Direct Error Message Exposure in 6 Functions
**Fixed Functions**:
- `getTasks.ts` - Task listing endpoint
- `updateTask.ts` - Task update endpoint
- `createTask.ts` - Task creation endpoint
- `EndpointRegistrationWorkflow.ts` - 5 workflow handlers (initiate, send email, verify token, test, activate)
- `getKvkRegistryData.ts` - KvK registry data retrieval
- `EventGridHandler.ts` - Event Grid webhook handler

**Before**:
```typescript
catch (error: any) {
  return {
    status: 500,
    jsonBody: { error: 'Failed to fetch tasks', message: error.message }
  };
}
```

**After**:
```typescript
catch (error: any) {
  return handleError(error, context);
}
```

## Implementation Details

### 1. Enhanced Error Sanitization Utility (`api/src/utils/errors.ts`)

**Key Features**:
- Correlation ID generation for error tracking (UUID v4)
- Comprehensive PostgreSQL error code mapping (34 codes covering Classes 08, 22, 23, 42, 53, 57)
- Network error handling (ECONNREFUSED, ETIMEDOUT, ENOTFOUND)
- JWT error handling (JsonWebTokenError, TokenExpiredError)
- Generic fallback for unknown errors

**New Functions**:
```typescript
export function handleError(
  error: any,
  context: InvocationContext,
  requestId?: string
): HttpResponseInit

export function sanitizeErrorMessage(
  error: any,
  context: InvocationContext,
  safeMessage: string,
  errorCode: string = ErrorCodes.INTERNAL_ERROR
): HttpResponseInit
```

**Response Headers**:
- `X-Correlation-ID`: Unique ID for tracking errors in logs

### 2. PostgreSQL Error Code Mapping

| Error Class | Description | Status | Client Message |
|-------------|-------------|--------|----------------|
| **23xxx** | Constraint Violations | 400/409 | Generic constraint messages |
| **22xxx** | Data Exceptions | 400 | "Invalid input syntax", "Input value too long" |
| **42xxx** | Syntax/Access Errors | 500 | "Database operation failed" |
| **08xxx** | Connection Exceptions | 503 | "Database temporarily unavailable" |
| **53xxx** | Insufficient Resources | 503 | "Service temporarily unavailable" |
| **57xxx** | Operator Intervention | 503 | "Database temporarily unavailable" |

**Security Benefit**: Client cannot enumerate database schema or constraints.

### 3. Error Logging Strategy

**Server-Side Logs** (Full Details):
```typescript
context.error(`[${correlationId}] API Error:`, {
  name: error.name,
  message: error.message,
  stack: error.stack,
  code: error.code,
  detail: error.detail,
  hint: error.hint,
  schema: error.schema,
  table: error.table,
  column: error.column,
  constraint: error.constraint,
  file: error.file,
  line: error.line,
  routine: error.routine
});
```

**Client Response** (Sanitized):
```json
{
  "error": "Resource already exists",
  "code": "DUPLICATE",
  "correlationId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

**Support Workflow**:
1. User reports error with correlation ID
2. Support searches Application Insights: `traces | where message contains "a1b2c3d4-e5f6-7890-abcd-ef1234567890"`
3. Full error context available without exposing to client

## Testing Recommendations

### 1. Database Error Testing
```bash
# Test constraint violation (23505)
curl -X POST https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1/members \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"org_id": "duplicate-id", "legal_name": "Test", "domain": "test.com"}'

# Expected Response:
# {
#   "error": "Resource already exists",
#   "code": "DUPLICATE",
#   "correlationId": "..."
# }
# NOT: "duplicate key value violates unique constraint 'members_pkey'"
```

### 2. Authentication Error Testing
```bash
# Test expired JWT
curl -X GET https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1/members \
  -H "Authorization: Bearer expired.jwt.token"

# Expected Response:
# {
#   "error": "Authentication token has expired",
#   "code": "TOKEN_EXPIRED",
#   "correlationId": "..."
# }
# NOT: JWT stack trace or library version
```

### 3. Database Connection Error Testing
```bash
# Simulate database connection failure (would require stopping PostgreSQL)
# Expected Response:
# {
#   "error": "Database temporarily unavailable",
#   "code": "DATABASE_ERROR",
#   "correlationId": "..."
# }
# NOT: PostgreSQL connection string or host details
```

## Security Compliance

### OWASP ASVS 4.0
- **V7.4.1**: Error responses do not contain sensitive information (COMPLIANT)
- **V7.4.2**: Exception handling is in place (COMPLIANT)
- **V7.4.3**: A "last resort" error handler is defined (COMPLIANT)

### CWE Mitigations
- **CWE-209**: Generation of Error Message Containing Sensitive Information (MITIGATED)
- **CWE-497**: Exposure of Sensitive System Information (MITIGATED)
- **CWE-536**: Servlet Runtime Error Message Information Leak (MITIGATED)

### CVSS Score: 3.7 (Low)
**Vector**: AV:N/AC:H/PR:N/UI:N/S:U/C:L/I:N/A:N

**Justification**:
- Network-based attack vector
- High complexity (requires triggering specific errors)
- Low confidentiality impact (information disclosure only, no direct exploitation)
- No integrity or availability impact

## Deployment Verification

After deployment, verify sanitization:

```bash
# 1. Check health endpoint still works
curl https://func-ctn-demo-asr-dev.azurewebsites.net/api/health

# 2. Trigger intentional error (invalid UUID)
curl https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1/legal-entities/invalid-uuid \
  -H "Authorization: Bearer $TOKEN"

# 3. Verify response contains:
#    - Generic error message
#    - Error code
#    - Correlation ID
#    - NO stack traces
#    - NO database table names
#    - NO file paths

# 4. Check Application Insights for correlation ID
# Full error details should be logged server-side
```

## Files Modified

### Core Utility
- `api/src/utils/errors.ts` (Enhanced with 34 PostgreSQL error mappings + correlation IDs)

### Fixed Functions (6 files, 10 handlers)
1. `api/src/functions/getTasks.ts`
2. `api/src/functions/updateTask.ts`
3. `api/src/functions/createTask.ts`
4. `api/src/functions/EndpointRegistrationWorkflow.ts` (5 handlers)
5. `api/src/functions/getKvkRegistryData.ts`
6. `api/src/functions/EventGridHandler.ts`

### Total Changes
- **Lines Modified**: ~150 lines
- **Error Handlers Updated**: 10 handlers
- **PostgreSQL Error Codes Mapped**: 34 codes
- **Security Issues Fixed**: 4 critical information disclosure vectors

## Maintenance

### Adding New Error Codes
When adding new database constraints or error scenarios:

1. **Identify Error Code**: Trigger error in dev and check PostgreSQL logs
2. **Add to Mapping**: Update `POSTGRES_ERROR_MAP` in `errors.ts`
3. **Test**: Verify generic message returned to client
4. **Document**: Update this document with new error class

### Example - New Constraint
```typescript
// Database migration adds check constraint
ALTER TABLE members ADD CONSTRAINT valid_status
  CHECK (status IN ('PENDING', 'ACTIVE', 'SUSPENDED'));

// Update POSTGRES_ERROR_MAP
'23514': {
  status: 400,
  code: ErrorCodes.VALIDATION_ERROR,
  message: 'Data validation failed'
}
```

## Future Enhancements

1. **Rate Limit Error Sanitization**: Add specific handling for rate limit errors (429)
2. **Structured Logging**: Integrate with Azure Monitor custom dimensions
3. **Error Analytics**: Dashboard showing most common error codes by correlation ID
4. **Client SDK**: Provide error code handling in `@ctn/api-client` package

## References

- **PostgreSQL Error Codes**: https://www.postgresql.org/docs/current/errcodes-appendix.html
- **OWASP ASVS 4.0**: https://owasp.org/www-project-application-security-verification-standard/
- **CWE-209**: https://cwe.mitre.org/data/definitions/209.html
- **CVSS 3.1 Calculator**: https://www.first.org/cvss/calculator/3.1

## Security Review Sign-Off

- **Implemented By**: Security Analyst (SA) Agent
- **Reviewed By**: (Pending Code Review)
- **Approved By**: (Pending Security Approval)
- **Deployment Date**: (Pending)

---

**SECURITY NOTICE**: This document contains information about security vulnerabilities. Do not share publicly until fixes are deployed to production.
