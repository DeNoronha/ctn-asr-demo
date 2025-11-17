# Middleware Migration Guide

**Date:** November 17, 2025
**Related:** TASK-CR-004 Refactoring Report

---

## Overview

This guide explains how to use the new composable middleware architecture introduced in the `endpointWrapper.ts` refactoring.

**Key Points:**
- Existing endpoints continue to work without changes
- New composable middleware pattern available for advanced use cases
- Each middleware is independently testable and reusable

---

## No Changes Required for Existing Endpoints

All existing endpoint code continues to work unchanged:

```typescript
// ✅ This still works exactly the same
export const myEndpoint = wrapEndpoint(
  async (req, ctx) => {
    return { status: 200, jsonBody: { data: [] } };
  },
  {
    requireAuth: true,
    requiredRoles: [UserRole.SYSTEM_ADMIN],
  }
);
```

---

## Using Convenience Functions

The refactored architecture preserves all convenience functions:

### Public Endpoints (No Auth)

```typescript
import { publicEndpoint } from '../middleware/endpointWrapper';

export const healthCheck = publicEndpoint(async (req, ctx) => {
  return {
    status: 200,
    jsonBody: { status: 'healthy', timestamp: new Date().toISOString() },
  };
});
```

### Authenticated Endpoints

```typescript
import { authenticatedEndpoint } from '../middleware/endpointWrapper';

export const getProfile = authenticatedEndpoint(async (req, ctx) => {
  return {
    status: 200,
    jsonBody: { userId: req.userId, email: req.userEmail },
  };
});
```

### Admin Endpoints

```typescript
import { adminEndpoint } from '../middleware/endpointWrapper';

export const deleteUser = adminEndpoint(async (req, ctx) => {
  // Only SystemAdmin and AssociationAdmin can access
  return { status: 204 };
});
```

### Member Endpoints

```typescript
import { memberEndpoint, Permission } from '../middleware/endpointWrapper';

export const updateProfile = memberEndpoint(
  async (req, ctx) => {
    return { status: 200, jsonBody: { updated: true } };
  },
  [Permission.MEMBER_WRITE] // Optional permissions
);
```

---

## Advanced: Custom Middleware Pipelines

For advanced use cases, you can compose custom middleware pipelines:

### Example 1: Rate-Limited Public Endpoint

```typescript
import { composeMiddleware } from '../middleware/utils/composeMiddleware';
import { corsValidator } from '../middleware/validators/corsValidator';
import { httpsValidator } from '../middleware/validators/httpsValidator';
import { createRateLimiter } from '../middleware/validators/rateLimiterValidator';
import { RateLimiterType } from '../middleware/rateLimiter';

export const publicApiEndpoint = composeMiddleware(
  [
    corsValidator,
    httpsValidator,
    createRateLimiter({
      enabled: true,
      type: RateLimiterType.API,
    }),
  ],
  async (req, ctx) => {
    return { status: 200, jsonBody: { data: [] } };
  }
);
```

### Example 2: Custom Authentication Flow

```typescript
import { composeMiddleware } from '../middleware/utils/composeMiddleware';
import { corsValidator } from '../middleware/validators';
import { createJwtAuthenticator } from '../middleware/auth';
import { MiddlewareFunction } from '../middleware/utils/middlewareTypes';

// Custom middleware to inject additional user data
const enrichUserContext: MiddlewareFunction = async (context, next) => {
  if (context.authenticatedRequest) {
    // Add custom data to context
    context.metadata.customUserData = await fetchUserData(
      context.authenticatedRequest.userId
    );
  }
  return next();
};

export const customAuthEndpoint = composeMiddleware(
  [
    corsValidator,
    createJwtAuthenticator({ required: true }),
    enrichUserContext,
  ],
  async (req, ctx) => {
    // Access custom data from context
    const userData = ctx.metadata.customUserData;
    return { status: 200, jsonBody: { user: userData } };
  }
);
```

### Example 3: Selective Middleware

```typescript
import { composeMiddleware } from '../middleware/utils/composeMiddleware';
import { corsValidator } from '../middleware/validators';
import { createJwtAuthenticator } from '../middleware/auth';
import { createRbacAuthorizer, systemAdminAuthorizer } from '../middleware/auth';

// Only apply CORS and auth, skip rate limiting
export const internalEndpoint = composeMiddleware(
  [
    corsValidator,
    createJwtAuthenticator({ required: true }),
    systemAdminAuthorizer, // Pre-configured authorizer
  ],
  async (req, ctx) => {
    return { status: 200, jsonBody: { internal: true } };
  }
);
```

---

## Creating Custom Middleware

You can create your own middleware functions:

### Template

```typescript
import { MiddlewareFunction } from '../middleware/utils/middlewareTypes';

export const myCustomMiddleware: MiddlewareFunction = async (context, next) => {
  const { request, invocationContext, requestId } = context;

  // Pre-processing (runs before handler)
  invocationContext.log(`[${requestId}] Custom middleware - before`);

  // Validation example
  if (!request.headers.get('x-custom-header')) {
    return {
      status: 400,
      jsonBody: { error: 'Missing required header' },
    };
  }

  // Call next middleware/handler
  const response = await next();

  // Post-processing (runs after handler)
  invocationContext.log(`[${requestId}] Custom middleware - after`);

  // Modify response if needed
  response.headers = {
    ...response.headers,
    'X-Custom-Response': 'value',
  };

  return response;
};
```

### Using Custom Middleware

```typescript
import { composeMiddleware } from '../middleware/utils/composeMiddleware';
import { corsValidator } from '../middleware/validators';
import { myCustomMiddleware } from './myCustomMiddleware';

export const customEndpoint = composeMiddleware(
  [corsValidator, myCustomMiddleware],
  async (req, ctx) => {
    return { status: 200, jsonBody: { success: true } };
  }
);
```

---

## Available Middleware

### Validators

Located in `/api/src/middleware/validators/`:

```typescript
import {
  corsValidator,           // CORS validation
  createCorsValidator,     // Configurable CORS
  httpsValidator,          // HTTPS enforcement
  createHttpsValidator,    // Configurable HTTPS
  rateLimiter,             // API rate limiting
  authRateLimiter,         // Auth rate limiting
  tokenRateLimiter,        // Token rate limiting
  createRateLimiter,       // Custom rate limiter
  contentTypeValidator,    // Content-Type validation
  createContentTypeValidator, // Configurable
  csrfValidator,           // CSRF protection
  createCsrfValidator,     // Configurable CSRF
} from '../middleware/validators';
```

### Auth Middleware

Located in `/api/src/middleware/auth/`:

```typescript
import {
  jwtAuthenticator,        // Required JWT auth
  optionalJwtAuthenticator, // Optional JWT auth
  createJwtAuthenticator,   // Configurable auth
  adminAuthorizer,          // Admin-only RBAC
  memberAuthorizer,         // Member RBAC
  systemAdminAuthorizer,    // System admin only
  createRbacAuthorizer,     // Custom RBAC
} from '../middleware/auth';
```

### Utilities

Located in `/api/src/middleware/utils/`:

```typescript
import {
  composeMiddleware,       // Compose middleware pipeline
  wrapBusinessLogic,       // Convert handler to middleware
  MiddlewareFunction,      // Middleware type
  MiddlewareContext,       // Context type
  BusinessLogicHandler,    // Handler type
} from '../middleware/utils/composeMiddleware';
```

---

## Middleware Execution Order

Middleware execute in the order they are added to the array:

```typescript
composeMiddleware(
  [
    middleware1, // Runs first
    middleware2, // Runs second
    middleware3, // Runs third
  ],
  handler // Runs last
);
```

**Response processing happens in reverse order:**

```
Request  →  M1 →  M2 →  M3 →  Handler
         ↓              ↓          ↓
Response ←  M1 ←  M2 ←  M3 ←  Response
```

**Recommended order (matching original implementation):**

1. CORS validation (handles preflight)
2. HTTPS enforcement
3. Rate limiting
4. Content-Type validation
5. JWT authentication
6. RBAC authorization
7. CSRF validation
8. Business logic handler

---

## Testing Middleware

Each middleware can be unit tested independently:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { myCustomMiddleware } from './myCustomMiddleware';
import { MiddlewareContext } from '../middleware/utils/middlewareTypes';

describe('myCustomMiddleware', () => {
  it('should validate custom header', async () => {
    const mockContext: MiddlewareContext = {
      request: {
        headers: new Map(), // Missing header
      } as any,
      invocationContext: { log: vi.fn() } as any,
      requestId: 'test-123',
      startTime: Date.now(),
      metadata: {},
    };

    const next = vi.fn();
    const response = await myCustomMiddleware(mockContext, next);

    expect(response.status).toBe(400);
    expect(next).not.toHaveBeenCalled();
  });
});
```

---

## Best Practices

### 1. Keep Middleware Focused

Each middleware should have a single responsibility:

```typescript
// ✅ Good - single responsibility
const validateApiKey: MiddlewareFunction = async (context, next) => {
  const apiKey = context.request.headers.get('x-api-key');
  if (!apiKey || !isValidApiKey(apiKey)) {
    return { status: 401, jsonBody: { error: 'Invalid API key' } };
  }
  return next();
};

// ❌ Bad - multiple responsibilities
const validateEverything: MiddlewareFunction = async (context, next) => {
  // Validates API key, rate limit, CORS, auth...
  // Too many concerns in one function
};
```

### 2. Use Configuration Functions

Create configurable middleware instead of hard-coded values:

```typescript
// ✅ Good - configurable
export function createApiKeyValidator(options: { required: boolean }) {
  return async (context, next) => {
    if (!options.required) return next();
    // Validation logic
  };
}

// ❌ Bad - hard-coded
export const apiKeyValidator = async (context, next) => {
  // Always required, no flexibility
};
```

### 3. Short-Circuit Early

Return error responses immediately when validation fails:

```typescript
// ✅ Good - short-circuit on failure
const validate: MiddlewareFunction = async (context, next) => {
  if (!isValid(context.request)) {
    return { status: 400, jsonBody: { error: 'Invalid' } };
  }
  return next();
};

// ❌ Bad - unnecessary next() call
const validate: MiddlewareFunction = async (context, next) => {
  if (isValid(context.request)) {
    return next();
  } else {
    return { status: 400, jsonBody: { error: 'Invalid' } };
  }
};
```

### 4. Use Context for Data Sharing

Share data between middleware via context.metadata:

```typescript
const middleware1: MiddlewareFunction = async (context, next) => {
  context.metadata.userId = 'user-123';
  return next();
};

const middleware2: MiddlewareFunction = async (context, next) => {
  const userId = context.metadata.userId; // Access shared data
  return next();
};
```

### 5. Always Call next() Unless Short-Circuiting

```typescript
// ✅ Good - calls next() or returns response
const middleware: MiddlewareFunction = async (context, next) => {
  if (shouldShortCircuit) {
    return { status: 403, jsonBody: { error: 'Forbidden' } };
  }
  return next(); // Continue to next middleware
};

// ❌ Bad - forgets to call next()
const middleware: MiddlewareFunction = async (context, next) => {
  doSomething();
  // Oops! Forgot to call next() or return response
};
```

---

## Common Patterns

### Pattern 1: Conditional Middleware

```typescript
function createConditionalMiddleware(
  condition: (context: MiddlewareContext) => boolean,
  middleware: MiddlewareFunction
): MiddlewareFunction {
  return async (context, next) => {
    if (condition(context)) {
      return middleware(context, next);
    }
    return next();
  };
}

// Usage
const conditionalAuth = createConditionalMiddleware(
  (ctx) => ctx.request.method !== 'GET',
  jwtAuthenticator
);
```

### Pattern 2: Logging Middleware

```typescript
const loggingMiddleware: MiddlewareFunction = async (context, next) => {
  const startTime = Date.now();
  const { request, invocationContext, requestId } = context;

  invocationContext.log(
    `[${requestId}] ${request.method} ${request.url} - Start`
  );

  const response = await next();

  const duration = Date.now() - startTime;
  invocationContext.log(
    `[${requestId}] ${request.method} ${request.url} - ${response.status} (${duration}ms)`
  );

  return response;
};
```

### Pattern 3: Error Handling Middleware

```typescript
const errorHandlingMiddleware: MiddlewareFunction = async (context, next) => {
  try {
    return await next();
  } catch (error) {
    context.invocationContext.error('Middleware error:', error);
    return {
      status: 500,
      jsonBody: { error: 'Internal server error' },
    };
  }
};
```

---

## Troubleshooting

### Issue: "Business logic requires authenticated request"

**Cause:** Handler expects `AuthenticatedRequest` but authentication middleware not included

**Solution:** Add `jwtAuthenticator` to middleware chain:

```typescript
composeMiddleware(
  [
    corsValidator,
    jwtAuthenticator, // ← Add this
  ],
  handler
);
```

### Issue: Middleware not executing

**Cause:** Middleware returned response without calling `next()`

**Solution:** Always call `next()` unless intentionally short-circuiting:

```typescript
const middleware: MiddlewareFunction = async (context, next) => {
  // Do work
  return next(); // ← Don't forget this
};
```

### Issue: TypeScript errors on context properties

**Cause:** Accessing properties not defined in `MiddlewareContext`

**Solution:** Use `context.metadata` for custom properties:

```typescript
// ✅ Good
context.metadata.customData = 'value';

// ❌ Bad
context.customData = 'value'; // TypeScript error
```

---

## Performance Considerations

### Middleware Overhead

Each middleware adds ~0.1-0.5ms of overhead. For typical API requests (10-100ms), this is negligible.

**Recommendations:**
- Keep middleware lightweight
- Avoid heavy computations in middleware
- Use async operations efficiently

### Composition vs. Direct Calls

**Composable Middleware (Recommended):**
```typescript
composeMiddleware([m1, m2, m3], handler); // Flexible, testable
```

**Direct Wrapper (Legacy):**
```typescript
wrapEndpoint(handler, options); // Simpler, less flexible
```

Both have similar performance. Use composition for custom pipelines, use wrapper for standard cases.

---

## Examples from Codebase

### Example 1: Simple Admin Endpoint

```typescript
// File: api/src/functions/admin/deleteUser.ts
import { adminEndpoint } from '../../middleware/endpointWrapper';

export const deleteUser = adminEndpoint(async (req, ctx) => {
  const { userId } = req.params;
  await database.deleteUser(userId);
  return { status: 204 };
});
```

### Example 2: Custom Rate-Limited Endpoint

```typescript
// File: api/src/functions/public/tokenIssuance.ts
import { composeMiddleware } from '../../middleware/utils/composeMiddleware';
import { corsValidator } from '../../middleware/validators';
import { tokenRateLimiter } from '../../middleware/validators';

export const issueToken = composeMiddleware(
  [
    corsValidator,
    tokenRateLimiter, // Very strict rate limit
  ],
  async (req, ctx) => {
    const token = await generateToken();
    return { status: 200, jsonBody: { token } };
  }
);
```

### Example 3: Multi-Step Validation

```typescript
// File: api/src/functions/member/updateProfile.ts
import { composeMiddleware } from '../../middleware/utils/composeMiddleware';
import { corsValidator, csrfValidator } from '../../middleware/validators';
import { jwtAuthenticator, memberAuthorizer } from '../../middleware/auth';

export const updateProfile = composeMiddleware(
  [
    corsValidator,
    jwtAuthenticator,
    memberAuthorizer,
    csrfValidator,
  ],
  async (req, ctx) => {
    const data = await req.json();
    await database.updateProfile(req.userId, data);
    return { status: 200, jsonBody: { updated: true } };
  }
);
```

---

## Additional Resources

- **Refactoring Report:** `/api/docs/REFACTORING_REPORT_TASK_CR_004.md`
- **Middleware Types:** `/api/src/middleware/utils/middlewareTypes.ts`
- **Composition Utility:** `/api/src/middleware/utils/composeMiddleware.ts`
- **Example Tests:** `/api/src/middleware/__tests__/`

---

**Last Updated:** November 17, 2025
**Questions?** Refer to the comprehensive refactoring report or review the unit tests for examples.
