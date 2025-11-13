# Refactoring Plan - ASR Code Quality Improvement

**Created:** November 13, 2025
**Based on:** CODE_QUALITY_REVIEW.md (Joost Visser's 10 Principles)
**Estimated Total Effort:** 270 hours (~17 weeks at 50% capacity)

---

## Executive Summary

This plan provides a phased approach to improving code quality across the ASR monorepo, addressing violations of the 10 principles for building maintainable software. The plan prioritizes high-impact, low-risk changes first, building confidence before tackling architectural improvements.

**Key Metrics:**
- **Current Health Score:** 4.2/10
- **Target Health Score:** 8.5/10
- **Files to Refactor:** 60+
- **Tests to Add:** 200+
- **Duplicate Code to Eliminate:** ~800 lines

**Success Criteria:**
- 80% test coverage (API + Frontend)
- No files >300 lines
- No functions >50 lines
- Cyclomatic complexity <10 everywhere
- All API calls use `@ctn/api-client`
- Repository pattern for all database access

---

## Phase 1: Foundation (Week 1-2) - Quick Wins

**Goal:** Low-hanging fruit with immediate impact, build momentum
**Effort:** 36 hours
**Risk:** Very Low

### Tasks

#### 1.1 Extract Magic Numbers (4 hours)
**Priority:** HIGH
**Effort:** SMALL

**Files to Create:**
```
api/src/config/
  ├── constants.ts
  └── rateLimits.ts
```

**Steps:**
1. Create constants file:
```typescript
// api/src/config/constants.ts
export const TIMEOUTS = {
  JWKS_CACHE_MS: 10 * 60 * 1000,
  REQUEST_TIMEOUT_MS: 30 * 1000,
  DATABASE_QUERY_TIMEOUT_MS: 5 * 1000,
} as const;

export const DEFAULTS = {
  PAGE_SIZE: 10,
  TERMS_VERSION: 'v3.2.0',
  BVAD_VALIDITY_HOURS: 24,
} as const;

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100,
} as const;
```

2. Update files:
   - `api/src/middleware/auth.ts:28` - Replace `600000` with `TIMEOUTS.JWKS_CACHE_MS`
   - `api/src/functions/generateBvad.ts:226` - Replace `'v3.2.0'` with `DEFAULTS.TERMS_VERSION`
   - `admin-portal/src/components/AllEndpointsView.tsx:38` - Import and use `PAGINATION.DEFAULT_PAGE_SIZE`

3. Verify no magic numbers remain:
```bash
# Check for common magic numbers
grep -r "600000\|86400\|10000" api/src --include="*.ts" | grep -v constants.ts
```

**Acceptance Criteria:**
- [ ] All magic numbers moved to constants
- [ ] No hardcoded timeouts in middleware
- [ ] No magic strings for versions

---

#### 1.2 Remove Commented Code (2 hours)
**Priority:** HIGH
**Effort:** SMALL

**Steps:**
1. Find all commented imports:
```bash
grep -r "// import" admin-portal/src api/src --include="*.ts" --include="*.tsx"
```

2. Review each occurrence (verify not needed)

3. Delete commented code:
   - `admin-portal/src/components/AllEndpointsView.tsx:10`
   - Any other commented imports found

4. Set up ESLint rule to prevent future commented code:
```json
// .eslintrc.json
{
  "rules": {
    "no-warning-comments": ["warn", {
      "terms": ["TODO", "FIXME", "XXX"],
      "location": "anywhere"
    }]
  }
}
```

**Acceptance Criteria:**
- [ ] No commented imports remain
- [ ] ESLint rule configured
- [ ] Git history preserved (rely on it)

---

#### 1.3 Enforce `@ctn/api-client` Usage (6 hours)
**Priority:** HIGH
**Effort:** MEDIUM

**Files to Refactor:**
1. `admin-portal/src/components/EndpointManagement.tsx:19-31, 89-114`
2. `admin-portal/src/components/APIAccessManager.tsx` (if exists)
3. `admin-portal/src/components/M2MClientsManager.tsx` (if exists)

**Steps:**
1. Delete manual `getAccessToken()` functions (5+ occurrences)

2. Replace manual `fetch()` with `apiV2` calls:

**BEFORE:**
```typescript
const getAccessToken = async (): Promise<string> => {
  const accounts = (window as any).msalInstance?.getAllAccounts();
  // ... 10+ lines
};

const loadEndpoints = async () => {
  const response = await fetch(`${API_BASE}/legal-entities/${id}/endpoints`, {
    headers: { 'Authorization': `Bearer ${await getAccessToken()}` }
  });
  const data = await response.json();
  setEndpoints(data);
};
```

**AFTER:**
```typescript
import { apiV2 } from '../services/apiV2';

const loadEndpoints = async () => {
  try {
    const endpoints = await apiV2.getEndpoints(legalEntityId);
    setEndpoints(endpoints);
  } catch (error) {
    logger.error('Failed to load endpoints:', error);
    notification.showError('Failed to load endpoints');
  }
};
```

3. Test each refactored component:
   - Verify authentication still works
   - Verify API calls return expected data
   - Check error handling

**Acceptance Criteria:**
- [ ] All manual `fetch()` calls replaced with `apiV2`
- [ ] No manual token acquisition code
- [ ] All components tested manually
- [ ] Error handling consistent

---

#### 1.4 Use `handleError()` Utility (6 hours)
**Priority:** HIGH
**Effort:** MEDIUM

**Files to Update:** 113 try-catch blocks across API functions

**Steps:**
1. Review `api/src/utils/errors.ts` to understand `handleError()`

2. Find all manual error handlers:
```bash
grep -A 5 "} catch (error" api/src/functions/*.ts | grep -B 5 "status: 500"
```

3. Replace pattern:

**BEFORE:**
```typescript
} catch (error) {
  context.error('Error creating endpoint:', error);
  return {
    status: 500,
    jsonBody: { error: 'Failed to create endpoint', details: error.message }
  };
}
```

**AFTER:**
```typescript
} catch (error) {
  return handleError(error, context, getRequestId(request));
}
```

4. Update files in batches:
   - Batch 1: `ManageEndpoints.ts`, `CreateIdentifier.ts`, `UpdateIdentifier.ts`
   - Batch 2: `GetAuthenticatedMember.ts`, `generateBvad.ts`, `uploadKvkDocument.ts`
   - Batch 3: Remaining files

5. Test each batch before moving to next

**Acceptance Criteria:**
- [ ] All catch blocks use `handleError()`
- [ ] Error responses consistent
- [ ] Request IDs included in all error responses
- [ ] No custom error formatting

---

#### 1.5 Add TypeScript Window Declaration (1 hour)
**Priority:** MEDIUM
**Effort:** SMALL

**Steps:**
1. Create global type declaration:
```typescript
// admin-portal/src/global.d.ts
import type { PublicClientApplication } from '@azure/msal-browser';

declare global {
  interface Window {
    msalInstance?: PublicClientApplication;
  }
}

export {};
```

2. Update `tsconfig.json` to include:
```json
{
  "include": ["src/**/*", "src/global.d.ts"]
}
```

3. Replace all `(window as any).msalInstance` with `window.msalInstance`

4. Remove type assertions:
```bash
grep -r "(window as any).msalInstance" admin-portal/src
# Replace each with window.msalInstance
```

**Acceptance Criteria:**
- [ ] No `as any` for window object
- [ ] TypeScript compiles without errors
- [ ] MSAL instance properly typed

---

#### 1.6 Run ESLint Auto-fix (1 hour)
**Priority:** LOW
**Effort:** SMALL

**Steps:**
1. Update ESLint config:
```json
// .eslintrc.json
{
  "rules": {
    "no-unused-vars": "error",
    "@typescript-eslint/no-unused-vars": "error",
    "no-console": ["warn", { "allow": ["error", "warn"] }]
  }
}
```

2. Run auto-fix:
```bash
cd admin-portal
npx eslint --fix src/

cd ../member-portal
npx eslint --fix src/

cd ../api
npx eslint --fix src/
```

3. Review and commit changes

4. Fix any remaining issues manually

**Acceptance Criteria:**
- [ ] No unused imports
- [ ] No unused variables
- [ ] Consistent code style
- [ ] ESLint passes

---

#### 1.7 Extract Validation Utilities (4 hours)
**Priority:** MEDIUM
**Effort:** SMALL

**Files to Create:**
```
api/src/utils/validators.ts
```

**Steps:**
1. Create validators:
```typescript
// api/src/utils/validators.ts
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidUUID(id: string): boolean {
  return UUID_PATTERN.test(id);
}

export function isValidEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email);
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function validateUUID(id: string): void {
  if (!isValidUUID(id)) {
    throw new Error('Invalid UUID format');
  }
}

export function validateEmail(email: string): void {
  if (!isValidEmail(email)) {
    throw new Error('Invalid email format');
  }
}
```

2. Find and replace UUID validation (10+ files):
```bash
grep -r "const isUUID = /\^" api/src/functions/
```

**BEFORE:**
```typescript
const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(legalEntityId);
if (!isUUID) {
  return { status: 400, jsonBody: { error: 'Invalid UUID format' } };
}
```

**AFTER:**
```typescript
import { validateUUID } from '../utils/validators';

try {
  validateUUID(legalEntityId);
} catch (error) {
  return { status: 400, jsonBody: { error: error.message } };
}
```

**Acceptance Criteria:**
- [ ] All UUID validation uses utility
- [ ] All email validation uses utility
- [ ] No duplicate validation patterns
- [ ] Validation errors consistent

---

#### 1.8 Standardize Error Responses (4 hours)
**Priority:** MEDIUM
**Effort:** SMALL

**Files to Create:**
```
api/src/utils/responses.ts
```

**Steps:**
1. Create response utilities:
```typescript
// api/src/utils/responses.ts
import type { HttpResponseInit } from '@azure/functions';

export const Responses = {
  ok: (data: unknown): HttpResponseInit => ({
    status: 200,
    jsonBody: data,
  }),

  created: (data: unknown): HttpResponseInit => ({
    status: 201,
    jsonBody: data,
  }),

  noContent: (): HttpResponseInit => ({
    status: 204,
  }),

  badRequest: (message: string, details?: unknown): HttpResponseInit => ({
    status: 400,
    jsonBody: {
      error: 'bad_request',
      error_description: message,
      details,
    },
  }),

  unauthorized: (message: string = 'Unauthorized'): HttpResponseInit => ({
    status: 401,
    jsonBody: {
      error: 'unauthorized',
      error_description: message,
    },
  }),

  forbidden: (message: string = 'Forbidden'): HttpResponseInit => ({
    status: 403,
    jsonBody: {
      error: 'forbidden',
      error_description: message,
    },
  }),

  notFound: (message: string = 'Resource not found'): HttpResponseInit => ({
    status: 404,
    jsonBody: {
      error: 'not_found',
      error_description: message,
    },
  }),

  serverError: (message: string = 'Internal server error'): HttpResponseInit => ({
    status: 500,
    jsonBody: {
      error: 'internal_server_error',
      error_description: message,
    },
  }),
};
```

2. Update handlers to use utilities:

**BEFORE:**
```typescript
if (!legalEntityId) {
  return {
    status: 400,
    jsonBody: { error: 'Legal entity ID is required' }
  };
}

if (entityCheck.rows.length === 0) {
  return {
    status: 404,
    jsonBody: { error: 'Legal entity not found' }
  };
}
```

**AFTER:**
```typescript
import { Responses } from '../utils/responses';

if (!legalEntityId) {
  return Responses.badRequest('Legal entity ID is required');
}

if (entityCheck.rows.length === 0) {
  return Responses.notFound('Legal entity not found');
}
```

**Acceptance Criteria:**
- [ ] All handlers use `Responses` utility
- [ ] Consistent error response format
- [ ] Proper HTTP status codes
- [ ] Error descriptions user-friendly

---

#### 1.9 Set Up Testing Framework (8 hours)
**Priority:** HIGH
**Effort:** MEDIUM

**Steps:**
1. Install dependencies:
```bash
cd api
npm install --save-dev \
  jest \
  @types/jest \
  ts-jest \
  supertest \
  @types/supertest \
  @azure/functions-test
```

2. Create Jest config:
```javascript
// api/jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
};
```

3. Create test database setup:
```typescript
// api/src/__tests__/setup.ts
import { Pool } from 'pg';

let testPool: Pool;

beforeAll(async () => {
  testPool = new Pool({
    connectionString: process.env.TEST_DATABASE_URL,
  });

  // Run migrations
  // Seed test data
});

afterAll(async () => {
  await testPool.end();
});

afterEach(async () => {
  // Clean up test data
});
```

4. Create test utilities:
```typescript
// api/src/__tests__/helpers.ts
export function mockRequest(overrides = {}): any {
  return {
    method: 'GET',
    url: 'http://localhost',
    headers: new Map(),
    query: new URLSearchParams(),
    params: {},
    ...overrides,
  };
}

export function mockContext(): any {
  return {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  };
}

export function mockAuthenticatedRequest(overrides = {}): any {
  return {
    ...mockRequest(),
    user: { oid: 'test-oid', email: 'test@example.com' },
    userId: 'test-user-id',
    userEmail: 'test@example.com',
    userRoles: ['SystemAdmin'],
    ...overrides,
  };
}
```

5. Add package.json scripts:
```json
{
  "scripts": {
    "test": "jest --watch",
    "test:ci": "jest --ci --coverage",
    "test:coverage": "jest --coverage"
  }
}
```

6. Write first test:
```typescript
// api/src/utils/__tests__/validators.test.ts
import { isValidUUID, validateUUID } from '../validators';

describe('validators', () => {
  describe('isValidUUID', () => {
    it('should return true for valid UUID', () => {
      expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    });

    it('should return false for invalid UUID', () => {
      expect(isValidUUID('not-a-uuid')).toBe(false);
    });
  });

  describe('validateUUID', () => {
    it('should not throw for valid UUID', () => {
      expect(() => validateUUID('550e8400-e29b-41d4-a716-446655440000')).not.toThrow();
    });

    it('should throw for invalid UUID', () => {
      expect(() => validateUUID('not-a-uuid')).toThrow('Invalid UUID format');
    });
  });
});
```

7. Run tests:
```bash
npm test
```

**Acceptance Criteria:**
- [ ] Jest configured and running
- [ ] Test database set up
- [ ] Helper functions created
- [ ] First test passing
- [ ] Coverage reporting enabled

---

### Phase 1 Deliverables

**Completed Tasks:**
- [x] Magic numbers eliminated
- [x] Commented code removed
- [x] `@ctn/api-client` enforced
- [x] `handleError()` used consistently
- [x] Window types declared
- [x] ESLint auto-fix run
- [x] Validation utilities created
- [x] Error responses standardized
- [x] Testing framework set up

**Metrics:**
- Duplicate code eliminated: ~200 lines
- Test coverage: 5% → 10%
- Code consistency: Improved
- Type safety: Improved

**Next Phase Prerequisites:**
- [ ] All Phase 1 tasks completed
- [ ] Tests passing
- [ ] Code reviewed
- [ ] Deployed to dev

---

## Phase 2: Critical Path (Week 3-6) - Middleware & Testing

**Goal:** Reduce complexity in critical middleware, add comprehensive tests
**Effort:** 80 hours
**Risk:** Medium

### 2.1 Refactor `endpointWrapper.ts` (16 hours)
**Priority:** CRITICAL
**Effort:** LARGE

**Current State:**
- 531 lines
- Complexity: ~20
- Affects: ALL API endpoints

**Target State:**
- <100 lines (orchestrator)
- Complexity: <5
- Middleware pipeline pattern

**Steps:**

#### Step 1: Create Middleware Pipeline (4 hours)

```typescript
// api/src/middleware/pipeline.ts
export type Request = AuthenticatedRequest;
export type Context = InvocationContext;
export type Response = HttpResponseInit;

export type Middleware = (
  request: Request,
  context: Context,
  next: () => Promise<Response>
) => Promise<Response>;

export function createPipeline(...middlewares: Middleware[]) {
  return async (request: Request, context: Context, handler: () => Promise<Response>): Promise<Response> => {
    let index = 0;

    const next = async (): Promise<Response> => {
      if (index < middlewares.length) {
        const middleware = middlewares[index++];
        return middleware(request, context, next);
      }
      return handler();
    };

    return next();
  };
}
```

#### Step 2: Extract Individual Middleware (8 hours)

Create separate files:

```
api/src/middleware/
  ├── pipeline.ts (created above)
  ├── requestId.ts
  ├── cors.ts
  ├── https.ts
  ├── rateLimit.ts
  ├── contentType.ts
  ├── auth.ts (refactor existing)
  ├── authorization.ts
  ├── csrf.ts
  └── securityHeaders.ts
```

**Example - CORS middleware:**
```typescript
// api/src/middleware/cors.ts
import type { Middleware } from './pipeline';

export interface CorsOptions {
  enabled?: boolean;
  allowedOrigins?: string[];
}

export function corsMiddleware(options: CorsOptions = {}): Middleware {
  const { enabled = true, allowedOrigins = DEFAULT_CORS_ORIGINS } = options;

  return async (request, context, next) => {
    // Handle preflight
    if (request.method === 'OPTIONS' && enabled) {
      return handlePreflightRequest(request, allowedOrigins);
    }

    // Execute next middleware
    const response = await next();

    // Add CORS headers to response
    if (enabled) {
      return addCorsHeaders(response, request, allowedOrigins);
    }

    return response;
  };
}

function handlePreflightRequest(request: Request, allowedOrigins: string[]): Response {
  const origin = request.headers.get('origin');
  return {
    status: 204,
    headers: getCorsHeaders(origin, allowedOrigins),
  };
}

function addCorsHeaders(response: Response, request: Request, allowedOrigins: string[]): Response {
  const origin = request.headers.get('origin');
  return {
    ...response,
    headers: {
      ...response.headers,
      ...getCorsHeaders(origin, allowedOrigins),
    },
  };
}
```

**Repeat for each middleware type**, ensuring each file is <100 lines.

#### Step 3: Rewrite `endpointWrapper.ts` (2 hours)

```typescript
// api/src/middleware/endpointWrapper.ts (refactored)
import { createPipeline } from './pipeline';
import { requestIdMiddleware } from './requestId';
import { corsMiddleware } from './cors';
import { httpsMiddleware } from './https';
import { rateLimitMiddleware } from './rateLimit';
import { contentTypeMiddleware } from './contentType';
import { authMiddleware } from './auth';
import { authorizationMiddleware } from './authorization';
import { csrfMiddleware } from './csrf';
import { securityHeadersMiddleware } from './securityHeaders';

export interface EndpointOptions {
  requireAuth?: boolean;
  requiredRoles?: UserRole[];
  requiredPermissions?: Permission[];
  requireAllPermissions?: boolean;
  enableCors?: boolean;
  allowedOrigins?: string[];
  enableRateLimit?: boolean;
  rateLimiterType?: RateLimiterType;
  enableContentTypeValidation?: boolean;
}

export function wrapEndpoint(
  handler: EndpointHandler,
  options: EndpointOptions = {}
): AzureFunctionHandler {
  const pipeline = createPipeline(
    requestIdMiddleware(),
    corsMiddleware({
      enabled: options.enableCors,
      allowedOrigins: options.allowedOrigins,
    }),
    httpsMiddleware(),
    rateLimitMiddleware({
      enabled: options.enableRateLimit,
      type: options.rateLimiterType,
    }),
    contentTypeMiddleware({
      enabled: options.enableContentTypeValidation,
    }),
    authMiddleware({
      requireAuth: options.requireAuth,
    }),
    authorizationMiddleware({
      roles: options.requiredRoles,
      permissions: options.requiredPermissions,
      requireAllPermissions: options.requireAllPermissions,
    }),
    csrfMiddleware(),
    securityHeadersMiddleware()
  );

  return async (request: HttpRequest, context: InvocationContext) => {
    const adaptedRequest = adaptRequest(request);
    const adaptedContext = adaptContext(context);

    try {
      return await pipeline(
        adaptedRequest,
        adaptedContext,
        () => handler(adaptedRequest, adaptedContext)
      );
    } catch (error) {
      return handleError(error, context, getRequestId(request));
    }
  };
}

// Convenience functions remain unchanged
export function publicEndpoint(handler: EndpointHandler) { /* ... */ }
export function authenticatedEndpoint(handler: EndpointHandler) { /* ... */ }
export function adminEndpoint(handler: EndpointHandler) { /* ... */ }
export function memberEndpoint(handler: EndpointHandler, permissions?: Permission[]) { /* ... */ }
```

#### Step 4: Test Refactored Middleware (2 hours)

1. Write tests for pipeline:
```typescript
// api/src/middleware/__tests__/pipeline.test.ts
describe('createPipeline', () => {
  it('should execute middleware in order', async () => {
    const order: string[] = [];

    const middleware1: Middleware = async (req, ctx, next) => {
      order.push('before-1');
      const response = await next();
      order.push('after-1');
      return response;
    };

    const middleware2: Middleware = async (req, ctx, next) => {
      order.push('before-2');
      const response = await next();
      order.push('after-2');
      return response;
    };

    const handler = () => {
      order.push('handler');
      return Promise.resolve({ status: 200, jsonBody: {} });
    };

    const pipeline = createPipeline(middleware1, middleware2);
    await pipeline(mockRequest(), mockContext(), handler);

    expect(order).toEqual([
      'before-1',
      'before-2',
      'handler',
      'after-2',
      'after-1',
    ]);
  });
});
```

2. Test each middleware individually
3. Test integration with existing endpoints
4. Deploy to dev and verify ALL endpoints still work

**Acceptance Criteria:**
- [ ] Pipeline pattern implemented
- [ ] Each middleware <100 lines
- [ ] Each middleware complexity <5
- [ ] All middleware tested
- [ ] All existing endpoints work
- [ ] No regressions

---

### 2.2 Add Middleware Tests (12 hours)
**Priority:** HIGH
**Effort:** MEDIUM

**Coverage Target:** 80% for all middleware

**Tests to Write:**

#### `auth.test.ts` (4 hours)
```typescript
// api/src/middleware/__tests__/auth.test.ts
describe('authenticate', () => {
  it('should reject missing Authorization header', async () => {
    const request = mockRequest({ headers: new Map() });
    const result = await authenticate(request, mockContext());

    expect(result.success).toBe(false);
    expect(result.response.status).toBe(401);
  });

  it('should reject invalid Bearer token format', async () => {
    const request = mockRequest({
      headers: new Map([['authorization', 'Basic token123']])
    });
    const result = await authenticate(request, mockContext());

    expect(result.success).toBe(false);
    expect(result.response.status).toBe(401);
  });

  it('should validate JWT signature with JWKS', async () => {
    const validToken = generateTestJWT();
    const request = mockRequest({
      headers: new Map([['authorization', `Bearer ${validToken}`]])
    });
    const result = await authenticate(request, mockContext());

    expect(result.success).toBe(true);
    expect(result.request.user).toBeDefined();
  });

  it('should resolve party ID from oid claim', async () => {
    // Mock database with test user
    await seedTestUser({ oid: 'test-oid', partyId: 'test-party-id' });

    const validToken = generateTestJWT({ oid: 'test-oid' });
    const request = mockRequest({
      headers: new Map([['authorization', `Bearer ${validToken}`]])
    });
    const result = await authenticate(request, mockContext());

    expect(result.success).toBe(true);
    expect(result.request.partyId).toBe('test-party-id');
  });

  it('should handle M2M tokens without oid', async () => {
    const m2mToken = generateTestJWT({
      oid: undefined,
      azp: 'client-id-123',
      roles: ['M2M.Read']
    });
    const request = mockRequest({
      headers: new Map([['authorization', `Bearer ${m2mToken}`]])
    });
    const result = await authenticate(request, mockContext());

    expect(result.success).toBe(true);
    expect(result.request.isM2M).toBe(true);
    expect(result.request.clientId).toBe('client-id-123');
  });
});
```

#### `rbac.test.ts` (3 hours)
```typescript
// api/src/middleware/__tests__/rbac.test.ts
describe('requireRoles', () => {
  it('should allow access with required role', () => {
    const request = mockAuthenticatedRequest({
      userRoles: ['SystemAdmin']
    });
    const check = requireRoles([UserRole.SYSTEM_ADMIN])(request, mockContext());

    expect(check.authorized).toBe(true);
  });

  it('should deny access without required role', () => {
    const request = mockAuthenticatedRequest({
      userRoles: ['MemberUser']
    });
    const check = requireRoles([UserRole.SYSTEM_ADMIN])(request, mockContext());

    expect(check.authorized).toBe(false);
    expect(check.response?.status).toBe(403);
  });

  it('should allow access with any of multiple required roles', () => {
    const request = mockAuthenticatedRequest({
      userRoles: ['AssociationAdmin']
    });
    const check = requireRoles([
      UserRole.SYSTEM_ADMIN,
      UserRole.ASSOCIATION_ADMIN
    ])(request, mockContext());

    expect(check.authorized).toBe(true);
  });
});

describe('requirePermissions', () => {
  // Similar tests for permissions
});
```

#### `cors.test.ts` (2 hours)
```typescript
// api/src/middleware/__tests__/cors.test.ts
describe('corsMiddleware', () => {
  it('should handle OPTIONS preflight request', async () => {
    const middleware = corsMiddleware({
      enabled: true,
      allowedOrigins: ['http://localhost:3000']
    });

    const request = mockRequest({
      method: 'OPTIONS',
      headers: new Map([['origin', 'http://localhost:3000']])
    });

    const response = await middleware(request, mockContext(), async () => ({
      status: 200,
      jsonBody: {}
    }));

    expect(response.status).toBe(204);
    expect(response.headers?.['Access-Control-Allow-Origin']).toBe('http://localhost:3000');
    expect(response.headers?.['Access-Control-Allow-Methods']).toBeDefined();
  });

  it('should add CORS headers to response', async () => {
    const middleware = corsMiddleware({
      enabled: true,
      allowedOrigins: ['http://localhost:3000']
    });

    const request = mockRequest({
      method: 'GET',
      headers: new Map([['origin', 'http://localhost:3000']])
    });

    const response = await middleware(request, mockContext(), async () => ({
      status: 200,
      jsonBody: { data: 'test' }
    }));

    expect(response.status).toBe(200);
    expect(response.headers?.['Access-Control-Allow-Origin']).toBe('http://localhost:3000');
  });

  it('should reject disallowed origin', async () => {
    const middleware = corsMiddleware({
      enabled: true,
      allowedOrigins: ['http://localhost:3000']
    });

    const request = mockRequest({
      method: 'OPTIONS',
      headers: new Map([['origin', 'http://evil.com']])
    });

    const response = await middleware(request, mockContext(), async () => ({
      status: 200,
      jsonBody: {}
    }));

    expect(response.headers?.['Access-Control-Allow-Origin']).toBeUndefined();
  });
});
```

#### `rateLimit.test.ts` (2 hours)
#### `csrf.test.ts` (1 hour)

**Acceptance Criteria:**
- [ ] 80%+ coverage for all middleware
- [ ] Edge cases tested
- [ ] Error paths tested
- [ ] All tests passing

---

### 2.3 Add Handler Tests (20 hours)
**Priority:** HIGH
**Effort:** LARGE

**Coverage Target:** 60% for critical handlers

**Priority Handlers:**
1. `ManageEndpoints.ts` (4 hours)
2. `generateBvad.ts` (4 hours)
3. `GetAuthenticatedMember.ts` (2 hours)
4. `CreateIdentifier.ts` (3 hours)
5. `UpdateIdentifier.ts` (3 hours)
6. `uploadKvkDocument.ts` (4 hours)

**Example: ManageEndpoints.test.ts**
```typescript
// api/src/functions/__tests__/ManageEndpoints.test.ts
import { getEndpointsByEntityHandler, createEndpointHandler } from '../ManageEndpoints';
import { seedTestMember, seedTestEndpoint } from '../../__tests__/seeds';

describe('ManageEndpoints', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  describe('getEndpointsByEntityHandler', () => {
    it('should return endpoints for legal entity', async () => {
      const member = await seedTestMember();
      await seedTestEndpoint({ legal_entity_id: member.legal_entity_id });
      await seedTestEndpoint({ legal_entity_id: member.legal_entity_id });

      const request = mockAuthenticatedRequest({
        params: { legalentityid: member.legal_entity_id }
      });

      const response = await getEndpointsByEntityHandler(request, mockContext());

      expect(response.status).toBe(200);
      expect(Array.isArray(response.jsonBody)).toBe(true);
      expect(response.jsonBody.length).toBe(2);
    });

    it('should return 400 for missing legal_entity_id', async () => {
      const request = mockAuthenticatedRequest({
        params: {}
      });

      const response = await getEndpointsByEntityHandler(request, mockContext());

      expect(response.status).toBe(400);
      expect(response.jsonBody.error).toContain('required');
    });

    it('should filter deleted endpoints', async () => {
      const member = await seedTestMember();
      await seedTestEndpoint({ legal_entity_id: member.legal_entity_id });
      await seedTestEndpoint({
        legal_entity_id: member.legal_entity_id,
        is_deleted: true
      });

      const request = mockAuthenticatedRequest({
        params: { legalentityid: member.legal_entity_id }
      });

      const response = await getEndpointsByEntityHandler(request, mockContext());

      expect(response.status).toBe(200);
      expect(response.jsonBody.length).toBe(1);
    });
  });

  describe('createEndpointHandler', () => {
    it('should create endpoint for legal entity', async () => {
      const member = await seedTestMember();

      const request = mockAuthenticatedRequest({
        params: { legalentityid: member.legal_entity_id },
        body: {
          endpoint_name: 'Test Endpoint',
          endpoint_url: 'https://test.com/api',
          data_category: 'CONTAINER'
        }
      });

      const response = await createEndpointHandler(request, mockContext());

      expect(response.status).toBe(201);
      expect(response.jsonBody.endpoint_name).toBe('Test Endpoint');
      expect(response.jsonBody.legal_entity_endpoint_id).toBeDefined();
    });

    it('should validate required fields', async () => {
      const member = await seedTestMember();

      const request = mockAuthenticatedRequest({
        params: { legalentityid: member.legal_entity_id },
        body: {
          // missing endpoint_name
          endpoint_url: 'https://test.com/api'
        }
      });

      const response = await createEndpointHandler(request, mockContext());

      expect(response.status).toBe(400);
      expect(response.jsonBody.error).toContain('name');
    });

    it('should verify legal entity exists', async () => {
      const request = mockAuthenticatedRequest({
        params: { legalentityid: 'non-existent-id' },
        body: {
          endpoint_name: 'Test Endpoint',
        }
      });

      const response = await createEndpointHandler(request, mockContext());

      expect(response.status).toBe(404);
      expect(response.jsonBody.error).toContain('not found');
    });

    it('should create audit log entry', async () => {
      const member = await seedTestMember();

      const request = mockAuthenticatedRequest({
        params: { legalentityid: member.legal_entity_id },
        body: {
          endpoint_name: 'Test Endpoint',
        }
      });

      await createEndpointHandler(request, mockContext());

      const auditLogs = await queryAuditLogs({
        resource_type: 'legal_entity_endpoint',
        action: 'CREATE'
      });

      expect(auditLogs.length).toBe(1);
    });
  });
});
```

**Repeat similar patterns for other handlers.**

**Acceptance Criteria:**
- [ ] 60%+ coverage for critical handlers
- [ ] Happy path tested
- [ ] Error paths tested
- [ ] Database operations tested
- [ ] Audit logging tested

---

### 2.4 Integration Tests (12 hours)
**Priority:** MEDIUM
**Effort:** MEDIUM

**Goal:** End-to-end API tests

**Setup:**
```typescript
// api/src/__tests__/integration/api.test.ts
import request from 'supertest';
import { createApp } from '../../app'; // Hypothetical Express wrapper

describe('API Integration Tests', () => {
  let app: any;
  let authToken: string;

  beforeAll(async () => {
    app = await createApp();
    authToken = await getTestAuthToken();
  });

  describe('Endpoint Management Workflow', () => {
    it('should complete full endpoint lifecycle', async () => {
      // Create member
      const memberResponse = await request(app)
        .post('/api/v1/members')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          legal_name: 'Test Company',
          domain: 'test.com'
        })
        .expect(201);

      const memberId = memberResponse.body.legal_entity_id;

      // Create endpoint
      const endpointResponse = await request(app)
        .post(`/api/v1/legal-entities/${memberId}/endpoints`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          endpoint_name: 'Container API',
          endpoint_url: 'https://test.com/container',
          data_category: 'CONTAINER'
        })
        .expect(201);

      const endpointId = endpointResponse.body.legal_entity_endpoint_id;

      // Get endpoints
      const listResponse = await request(app)
        .get(`/api/v1/legal-entities/${memberId}/endpoints`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(listResponse.body).toHaveLength(1);
      expect(listResponse.body[0].legal_entity_endpoint_id).toBe(endpointId);

      // Issue token
      const tokenResponse = await request(app)
        .post(`/api/v1/endpoints/${endpointId}/tokens`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(200);

      expect(tokenResponse.body.token_value).toBeDefined();
    });
  });

  describe('Authentication Flow', () => {
    it('should reject requests without token', async () => {
      await request(app)
        .get('/api/v1/members')
        .expect(401);
    });

    it('should reject requests with invalid token', async () => {
      await request(app)
        .get('/api/v1/members')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should accept requests with valid token', async () => {
      await request(app)
        .get('/api/v1/members')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });
  });
});
```

**Acceptance Criteria:**
- [ ] Integration tests for critical workflows
- [ ] Authentication tested
- [ ] Authorization tested
- [ ] Database transactions tested
- [ ] All tests passing

---

### Phase 2 Deliverables

**Completed Tasks:**
- [x] `endpointWrapper.ts` refactored
- [x] Middleware tests (80% coverage)
- [x] Handler tests (60% coverage)
- [x] Integration tests

**Metrics:**
- Test coverage: 10% → 60%
- Middleware complexity: 20 → 5
- Confidence in refactoring: High

**Next Phase Prerequisites:**
- [ ] All Phase 2 tasks completed
- [ ] Tests passing
- [ ] Code reviewed
- [ ] Deployed to dev and tested

---

## Phase 3: Component Splitting (Week 7-10) - Frontend Refactoring

**Goal:** Break large components into smaller, focused components
**Effort:** 68 hours
**Risk:** Medium

### 3.1 Refactor `MemberDetailView.tsx` (16 hours)
**Priority:** HIGH
**Effort:** LARGE

**Current:** 589 lines, 10+ state variables, 8 tabs
**Target:** ~100 lines orchestrator + 8 tab components

**Architecture:**
```
MemberDetailView.tsx (~100 lines)
├── hooks/
│   └── useMemberData.ts (~80 lines)
├── components/
│   ├── MemberHeader.tsx (~60 lines)
│   └── StatusActions.tsx (~50 lines)
└── tabs/
    ├── CompanyDetailsTab.tsx (~100 lines)
    ├── IdentifiersTab.tsx (~100 lines)
    ├── SystemIntegrationsTab.tsx (~80 lines)
    ├── ApiAccessTab.tsx (~80 lines)
    ├── ContactsTab.tsx (~100 lines)
    ├── DocumentVerificationTab.tsx (~100 lines)
    ├── AuthenticationTierTab.tsx (~80 lines)
    └── KvkRegistryTab.tsx (~80 lines)
```

#### Step 1: Extract Data Hook (4 hours)

```typescript
// admin-portal/src/hooks/useMemberData.ts
import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { apiV2 } from '../services/apiV2';
import { useNotification } from '../contexts/NotificationContext';
import type { LegalEntity, LegalEntityContact } from '../services/api';
import type { LegalEntityIdentifier, LegalEntityEndpoint } from '../services/apiV2';

export interface UseMemberDataResult {
  legalEntity: LegalEntity | null;
  contacts: LegalEntityContact[];
  identifiers: LegalEntityIdentifier[];
  endpoints: LegalEntityEndpoint[];
  loading: boolean;
  hasKvkRegistryData: boolean;
  refetch: () => Promise<void>;
}

export function useMemberData(legalEntityId?: string): UseMemberDataResult {
  const [legalEntity, setLegalEntity] = useState<LegalEntity | null>(null);
  const [contacts, setContacts] = useState<LegalEntityContact[]>([]);
  const [identifiers, setIdentifiers] = useState<LegalEntityIdentifier[]>([]);
  const [endpoints, setEndpoints] = useState<LegalEntityEndpoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasKvkRegistryData, setHasKvkRegistryData] = useState(false);
  const notification = useNotification();

  const loadData = async () => {
    if (!legalEntityId) return;

    setLoading(true);
    try {
      // Load all data in parallel
      const [entityData, contactsData, identifiersData, endpointsData] = await Promise.allSettled([
        api.getLegalEntity(legalEntityId),
        api.getContacts(legalEntityId),
        apiV2.getIdentifiers(legalEntityId),
        apiV2.getEndpoints(legalEntityId),
      ]);

      // Set data from successful promises
      if (entityData.status === 'fulfilled') setLegalEntity(entityData.value);
      if (contactsData.status === 'fulfilled') setContacts(contactsData.value);
      if (identifiersData.status === 'fulfilled') setIdentifiers(identifiersData.value);
      if (endpointsData.status === 'fulfilled') setEndpoints(endpointsData.value);

      // Check KvK registry data
      try {
        await apiV2.getKvkRegistryData(legalEntityId);
        setHasKvkRegistryData(true);
      } catch {
        setHasKvkRegistryData(false);
      }
    } catch (error) {
      notification.showError('Failed to load member data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [legalEntityId]);

  return {
    legalEntity,
    contacts,
    identifiers,
    endpoints,
    loading,
    hasKvkRegistryData,
    refetch: loadData,
  };
}
```

#### Step 2: Extract Header Component (2 hours)

```typescript
// admin-portal/src/components/member-detail/MemberHeader.tsx
import { Button, Group } from '@mantine/core';
import { ArrowLeft } from '../icons';
import type { Member } from '../../services/api';
import { getStatusColor, getMembershipColor } from '../../utils/colors';

interface MemberHeaderProps {
  member: Member;
  onBack: () => void;
  statusActions?: React.ReactNode;
}

export const MemberHeader: React.FC<MemberHeaderProps> = ({
  member,
  onBack,
  statusActions
}) => {
  return (
    <div className="detail-header">
      <Button color="gray" onClick={onBack} className="back-button">
        <ArrowLeft size={16} />
        Back to Members
      </Button>
      <div className="header-info">
        <h1>{member.legal_name}</h1>
        <Group gap="sm">
          <span className="status-badge" style={{ backgroundColor: getStatusColor(member.status) }}>
            {member.status}
          </span>
          <span className="membership-badge" style={{ backgroundColor: getMembershipColor(member.membership_level) }}>
            {member.membership_level}
          </span>
          {statusActions}
        </Group>
      </div>
    </div>
  );
};
```

#### Step 3: Extract Tab Components (8 hours, 1 hour each)

**Example: CompanyDetailsTab.tsx**
```typescript
// admin-portal/src/components/member-detail/tabs/CompanyDetailsTab.tsx
import { useState } from 'react';
import { Loader } from '@mantine/core';
import { CompanyDetails } from '../../CompanyDetails';
import { CompanyForm } from '../../CompanyForm';
import type { Member, LegalEntity } from '../../../services/api';
import { api } from '../../../services/api';
import { useNotification } from '../../../contexts/NotificationContext';
import { getStatusColor, getMembershipColor } from '../../../utils/colors';

interface CompanyDetailsTabProps {
  member: Member;
  legalEntity: LegalEntity | null;
  loading: boolean;
  onUpdate: () => void;
}

export const CompanyDetailsTab: React.FC<CompanyDetailsTabProps> = ({
  member,
  legalEntity,
  loading,
  onUpdate
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const notification = useNotification();

  const handleUpdate = async (data: LegalEntity) => {
    if (!legalEntity) return;

    try {
      await api.updateLegalEntity(legalEntity.legal_entity_id!, data);
      setIsEditing(false);
      notification.showSuccess('Company information updated successfully');
      onUpdate();
    } catch (error) {
      notification.showError('Failed to update company information');
    }
  };

  if (loading) {
    return (
      <div className="loading-state">
        <Loader size="md" />
        <span>Loading company information...</span>
      </div>
    );
  }

  if (!legalEntity) {
    return (
      <div className="info-section">
        <h3>Basic Information</h3>
        <MemberBasicInfo member={member} />
        <EmptyState message="No legal entity data available" />
      </div>
    );
  }

  if (isEditing) {
    return (
      <CompanyForm
        data={legalEntity}
        onSave={handleUpdate}
        onCancel={() => setIsEditing(false)}
      />
    );
  }

  return (
    <>
      <CompanyDetails company={legalEntity} onEdit={() => setIsEditing(true)} />
      <MemberBasicInfo member={member} />
    </>
  );
};

const MemberBasicInfo: React.FC<{ member: Member }> = ({ member }) => (
  <div className="info-section">
    <h3>Member Information</h3>
    <div className="info-grid">
      <div className="info-field">
        <label>Organization ID</label>
        <span>{member.org_id}</span>
      </div>
      <div className="info-field">
        <label>Domain</label>
        <span>{member.domain}</span>
      </div>
      {/* ... other fields */}
    </div>
  </div>
);
```

**Repeat for other tabs:**
- IdentifiersTab.tsx
- SystemIntegrationsTab.tsx
- ApiAccessTab.tsx
- ContactsTab.tsx
- DocumentVerificationTab.tsx
- AuthenticationTierTab.tsx
- KvkRegistryTab.tsx

#### Step 4: Simplify Main Component (2 hours)

```typescript
// admin-portal/src/components/MemberDetailView.tsx (refactored)
import { useState } from 'react';
import { Tabs } from '@mantine/core';
import type { Member } from '../services/api';
import { useMemberData } from '../hooks/useMemberData';
import { MemberHeader } from './member-detail/MemberHeader';
import { StatusActions } from './member-detail/StatusActions';
import {
  CompanyDetailsTab,
  IdentifiersTab,
  SystemIntegrationsTab,
  ApiAccessTab,
  ContactsTab,
  DocumentVerificationTab,
  AuthenticationTierTab,
  KvkRegistryTab
} from './member-detail/tabs';
import './MemberDetailView.css';

interface MemberDetailViewProps {
  member: Member;
  onBack: () => void;
}

export const MemberDetailView: React.FC<MemberDetailViewProps> = ({
  member,
  onBack
}) => {
  const [selectedTab, setSelectedTab] = useState<string | null>('company-details');
  const {
    legalEntity,
    contacts,
    identifiers,
    endpoints,
    loading,
    hasKvkRegistryData,
    refetch
  } = useMemberData(member.legal_entity_id);

  return (
    <div className="member-detail-view">
      <MemberHeader
        member={member}
        onBack={onBack}
        statusActions={
          <StatusActions member={member} onUpdate={refetch} />
        }
      />

      <Tabs value={selectedTab} onChange={setSelectedTab} className="detail-tabs">
        <Tabs.List>
          <Tabs.Tab value="company-details">Company Details</Tabs.Tab>
          <Tabs.Tab value="identifiers">Identifiers</Tabs.Tab>
          <Tabs.Tab value="system-integrations">System Integrations</Tabs.Tab>
          <Tabs.Tab value="api-access">API Access</Tabs.Tab>
          <Tabs.Tab value="contacts">Contacts</Tabs.Tab>
          <Tabs.Tab value="document-verification">Document Verification</Tabs.Tab>
          <Tabs.Tab value="authentication-tier">Authentication Tier</Tabs.Tab>
          {hasKvkRegistryData && <Tabs.Tab value="kvk-registry">KvK Registry</Tabs.Tab>}
        </Tabs.List>

        <Tabs.Panel value="company-details" pt="md">
          <CompanyDetailsTab
            member={member}
            legalEntity={legalEntity}
            loading={loading}
            onUpdate={refetch}
          />
        </Tabs.Panel>

        <Tabs.Panel value="identifiers" pt="md">
          <IdentifiersTab
            legalEntityId={member.legal_entity_id!}
            identifiers={identifiers}
            loading={loading}
            onUpdate={refetch}
          />
        </Tabs.Panel>

        {/* ... other tab panels */}
      </Tabs>
    </div>
  );
};
```

**Acceptance Criteria:**
- [ ] Main component <150 lines
- [ ] Each tab component <120 lines
- [ ] Data fetching in custom hook
- [ ] All functionality preserved
- [ ] Manual testing passed

---

### 3.2 Refactor Large API Functions (24 hours)
**Priority:** HIGH
**Effort:** LARGE

**Files to Split:**
1. `ManageM2MClients.ts` (935 lines → 4 handlers + service)
2. `EndpointRegistrationWorkflow.ts` (825 lines → 5 handlers + service)
3. `registerMember.ts` (641 lines → handler + service)
4. `uploadKvkDocument.ts` (431 lines → handler + service)

#### 3.2.1 Split `ManageM2MClients.ts` (8 hours)

**Target Structure:**
```
api/src/functions/m2m-clients/
  ├── ListM2MClients.ts (~100 lines)
  ├── CreateM2MClient.ts (~100 lines)
  ├── UpdateM2MClient.ts (~100 lines)
  └── RotateM2MClientSecret.ts (~100 lines)
api/src/services/
  └── m2mClientService.ts (~200 lines)
```

**Steps:**
1. Extract service layer (4 hours):

```typescript
// api/src/services/m2mClientService.ts
import type { Pool } from 'pg';
import * as crypto from 'crypto';

export class M2MClientService {
  constructor(private pool: Pool) {}

  async listClients(legalEntityId: string, pagination: PaginationParams): Promise<PaginatedResult<M2MClient>> {
    const query = `
      SELECT c.*, COUNT(*) OVER() AS total_count
      FROM m2m_clients c
      WHERE c.legal_entity_id = $1 AND c.is_deleted = false
      ORDER BY c.dt_created DESC
      LIMIT $2 OFFSET $3
    `;
    const result = await this.pool.query(query, [
      legalEntityId,
      pagination.limit,
      pagination.offset
    ]);

    return {
      data: result.rows,
      pagination: {
        page: pagination.page,
        pageSize: pagination.limit,
        totalItems: result.rows[0]?.total_count || 0,
        totalPages: Math.ceil((result.rows[0]?.total_count || 0) / pagination.limit)
      }
    };
  }

  async createClient(data: CreateM2MClientRequest): Promise<M2MClient> {
    const result = await this.pool.query(
      `INSERT INTO m2m_clients (
        legal_entity_id, client_name, azure_client_id, azure_object_id,
        description, assigned_scopes, is_active, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        data.legal_entity_id,
        data.client_name,
        data.azure_client_id,
        data.azure_object_id,
        data.description,
        data.assigned_scopes,
        data.is_active ?? true,
        data.created_by
      ]
    );

    return result.rows[0];
  }

  async generateSecret(clientId: string): Promise<M2MClientSecret> {
    const secretValue = crypto.randomBytes(32).toString('base64url');
    const secretHash = crypto.createHash('sha256').update(secretValue).digest('hex');

    const result = await this.pool.query(
      `INSERT INTO m2m_client_secrets_audit (
        m2m_client_id, secret_hash, secret_generated_at, is_revoked
      ) VALUES ($1, $2, NOW(), false)
      RETURNING *`,
      [clientId, secretHash]
    );

    return {
      ...result.rows[0],
      secret_value: secretValue // Only returned once
    };
  }

  // ... other methods
}
```

2. Create individual handlers (4 hours):

```typescript
// api/src/functions/m2m-clients/ListM2MClients.ts
import { app } from '@azure/functions';
import { wrapEndpoint, AuthenticatedRequest } from '../../middleware/endpointWrapper';
import { Permission } from '../../middleware/rbac';
import { M2MClientService } from '../../services/m2mClientService';
import { getPool } from '../../utils/database';
import { getPaginationParams } from '../../utils/pagination';

async function handler(
  request: AuthenticatedRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const legalEntityId = request.params.legal_entity_id;

  if (!legalEntityId) {
    return Responses.badRequest('legal_entity_id parameter is required');
  }

  try {
    const service = new M2MClientService(getPool());
    const pagination = getPaginationParams(request);
    const result = await service.listClients(legalEntityId, pagination);

    return Responses.ok(result);
  } catch (error) {
    return handleError(error, context, getRequestId(request));
  }
}

app.http('ListM2MClients', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'v1/legal-entities/{legal_entity_id}/m2m-clients',
  handler: wrapEndpoint(handler, {
    requireAuth: true,
    requiredPermissions: [Permission.READ_OWN_ENTITY, Permission.READ_ALL_ENTITIES],
    requireAllPermissions: false
  })
});
```

3. Update imports in `index.ts`
4. Write tests for service and handlers
5. Deploy and verify

**Acceptance Criteria:**
- [ ] Each handler <120 lines
- [ ] Service layer <250 lines
- [ ] All functionality preserved
- [ ] Tests passing
- [ ] Deployed and verified

#### 3.2.2 Similar splits for other large files (16 hours)

Apply same pattern to:
- `EndpointRegistrationWorkflow.ts` (8 hours)
- `registerMember.ts` (4 hours)
- `uploadKvkDocument.ts` (4 hours)

---

### 3.3 Refactor Other Large Components (28 hours)
**Priority:** MEDIUM
**Effort:** LARGE

**Components:**
1. `TasksGrid.tsx` (1,147 lines) - 12 hours
2. `IdentifiersManager.tsx` (949 lines) - 8 hours
3. `MembersGrid.tsx` (709 lines) - 8 hours

#### 3.3.1 Refactor `TasksGrid.tsx` (12 hours)

**Target Structure:**
```
TasksGrid.tsx (~150 lines - orchestrator)
├── hooks/
│   └── useTasks.ts (~100 lines)
├── components/
│   ├── TaskFilters.tsx (~120 lines)
│   ├── TaskRow.tsx (~60 lines)
│   └── TaskActions.tsx (~80 lines)
└── modals/
    ├── CreateTaskModal.tsx (~150 lines)
    └── EditTaskModal.tsx (~150 lines)
```

**Steps:**
1. Extract custom hook (3 hours)
2. Extract filter component (3 hours)
3. Extract modals (4 hours)
4. Simplify main grid (2 hours)

#### 3.3.2 Refactor `IdentifiersManager.tsx` (8 hours)

**Target Structure:**
```
IdentifiersManager.tsx (~120 lines)
├── hooks/
│   └── useIdentifiers.ts (~80 lines)
└── components/
    ├── IdentifierForm.tsx (~150 lines)
    ├── IdentifierRow.tsx (~60 lines)
    └── EuidInfo.tsx (~40 lines)
```

#### 3.3.3 Refactor `MembersGrid.tsx` (8 hours)

**Target Structure:**
```
MembersGrid.tsx (~120 lines)
├── hooks/
│   └── useMembers.ts (~100 lines)
└── components/
    ├── MemberFilters.tsx (~100 lines)
    ├── MemberRow.tsx (~60 lines)
    └── MemberActions.tsx (~80 lines)
```

---

### Phase 3 Deliverables

**Completed Tasks:**
- [x] `MemberDetailView.tsx` split into 10+ files
- [x] Large API functions split into handlers + services
- [x] Large grid components refactored

**Metrics:**
- Files >300 lines: 30 → 5
- Average file size: 250 lines → 120 lines
- Component reusability: Improved

**Next Phase Prerequisites:**
- [ ] All Phase 3 tasks completed
- [ ] All functionality preserved
- [ ] Manual testing passed
- [ ] Deployed to dev

---

## Phase 4: Architecture (Week 11-16) - Service Layer & Validation

**Goal:** Introduce service layer, add runtime validation, reduce platform coupling
**Effort:** 76 hours
**Risk:** High

### 4.1 Create Repository Pattern (16 hours)
**Priority:** HIGH
**Effort:** LARGE

**Repositories to Create:**
1. `LegalEntityRepository` (4 hours)
2. `MemberRepository` (4 hours)
3. `ContactRepository` (2 hours)
4. `IdentifierRepository` (2 hours)
5. `EndpointRepository` (2 hours)
6. `AuditLogRepository` (2 hours)

**Structure:**
```
api/src/repositories/
  ├── BaseRepository.ts
  ├── legalEntityRepository.ts
  ├── memberRepository.ts
  ├── contactRepository.ts
  ├── identifierRepository.ts
  ├── endpointRepository.ts
  └── auditLogRepository.ts
```

**Example: Base Repository**
```typescript
// api/src/repositories/BaseRepository.ts
import type { Pool, QueryResult } from 'pg';

export abstract class BaseRepository<T> {
  constructor(protected pool: Pool) {}

  protected async query(sql: string, params: any[]): Promise<QueryResult<T>> {
    return this.pool.query(sql, params);
  }

  protected async queryOne(sql: string, params: any[]): Promise<T | null> {
    const result = await this.query(sql, params);
    return result.rows[0] || null;
  }

  protected async exists(tableName: string, id: string): Promise<boolean> {
    const result = await this.query(
      `SELECT EXISTS(SELECT 1 FROM ${tableName} WHERE id = $1 AND is_deleted = false)`,
      [id]
    );
    return result.rows[0].exists;
  }
}
```

**Example: Legal Entity Repository**
```typescript
// api/src/repositories/legalEntityRepository.ts
import { BaseRepository } from './BaseRepository';
import type { LegalEntity } from '../types';

export class LegalEntityRepository extends BaseRepository<LegalEntity> {
  async findById(id: string): Promise<LegalEntity | null> {
    return this.queryOne(
      `SELECT * FROM legal_entity
       WHERE legal_entity_id = $1 AND is_deleted = false`,
      [id]
    );
  }

  async exists(id: string): Promise<boolean> {
    return super.exists('legal_entity', id);
  }

  async create(data: CreateLegalEntityRequest): Promise<LegalEntity> {
    const result = await this.query(
      `INSERT INTO legal_entity (
        legal_entity_id, primary_legal_name, status, domain
      ) VALUES ($1, $2, $3, $4)
      RETURNING *`,
      [data.legal_entity_id, data.primary_legal_name, data.status, data.domain]
    );
    return result.rows[0];
  }

  async update(id: string, data: Partial<LegalEntity>): Promise<LegalEntity> {
    const fields = Object.keys(data);
    const values = Object.values(data);
    const setClause = fields.map((field, i) => `${field} = $${i + 2}`).join(', ');

    const result = await this.query(
      `UPDATE legal_entity
       SET ${setClause}, dt_modified = NOW()
       WHERE legal_entity_id = $1 AND is_deleted = false
       RETURNING *`,
      [id, ...values]
    );

    if (result.rows.length === 0) {
      throw new Error('Legal entity not found');
    }

    return result.rows[0];
  }

  async softDelete(id: string): Promise<void> {
    await this.query(
      `UPDATE legal_entity
       SET is_deleted = true, dt_modified = NOW()
       WHERE legal_entity_id = $1`,
      [id]
    );
  }

  async findByPartyId(partyId: string): Promise<LegalEntity[]> {
    const result = await this.query(
      `SELECT le.* FROM legal_entity le
       WHERE le.party_id = $1 AND le.is_deleted = false
       ORDER BY le.dt_created DESC`,
      [partyId]
    );
    return result.rows;
  }
}
```

**Usage in Handlers:**

**BEFORE:**
```typescript
async function handler(request, context) {
  const pool = getPool();

  const entityCheck = await pool.query(
    'SELECT legal_entity_id FROM legal_entity WHERE legal_entity_id = $1 AND is_deleted = false',
    [legalEntityId]
  );

  if (entityCheck.rows.length === 0) {
    return { status: 404, jsonBody: { error: 'Legal entity not found' } };
  }

  // ... more queries
}
```

**AFTER:**
```typescript
async function handler(request, context) {
  const legalEntityRepo = new LegalEntityRepository(getPool());

  const entity = await legalEntityRepo.findById(legalEntityId);

  if (!entity) {
    return Responses.notFound('Legal entity not found');
  }

  // ... use entity
}
```

**Acceptance Criteria:**
- [ ] All repositories created
- [ ] Base repository with common methods
- [ ] All duplicate queries eliminated
- [ ] Tests for repositories (80% coverage)
- [ ] All handlers use repositories

---

### 4.2 Add Runtime Validation with Zod (20 hours)
**Priority:** HIGH
**Effort:** LARGE

**Goal:** Eliminate `as any`, add type-safe validation

**Steps:**

1. Install Zod (1 hour):
```bash
cd api
npm install zod
```

2. Create validation schemas (8 hours):

```
api/src/schemas/
  ├── common.ts
  ├── legalEntity.ts
  ├── member.ts
  ├── contact.ts
  ├── identifier.ts
  ├── endpoint.ts
  └── bvad.ts
```

**Example: Common Schemas**
```typescript
// api/src/schemas/common.ts
import { z } from 'zod';

export const UuidSchema = z.string().uuid();

export const EmailSchema = z.string().email();

export const UrlSchema = z.string().url();

export const DateSchema = z.string().datetime();

export const PaginationSchema = z.object({
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(10),
});
```

**Example: Endpoint Schemas**
```typescript
// api/src/schemas/endpoint.ts
import { z } from 'zod';
import { UuidSchema, UrlSchema } from './common';

export const DataCategorySchema = z.enum([
  'CONTAINER',
  'CUSTOMS',
  'WAREHOUSE',
  'TRANSPORT',
  'FINANCIAL',
  'GENERAL'
]);

export const EndpointTypeSchema = z.enum([
  'REST_API',
  'SOAP',
  'WEBHOOK',
  'BDI_CONNECTOR'
]);

export const CreateEndpointSchema = z.object({
  endpoint_name: z.string().min(1).max(200),
  endpoint_url: UrlSchema.optional(),
  endpoint_description: z.string().max(1000).optional(),
  data_category: DataCategorySchema.optional(),
  endpoint_type: EndpointTypeSchema.default('REST_API'),
  authentication_method: z.string().default('TOKEN'),
  is_active: z.boolean().default(true),
});

export const UpdateEndpointSchema = CreateEndpointSchema.partial();

export type CreateEndpointRequest = z.infer<typeof CreateEndpointSchema>;
export type UpdateEndpointRequest = z.infer<typeof UpdateEndpointSchema>;
```

3. Add validation middleware (2 hours):

```typescript
// api/src/middleware/validation.ts
import type { z } from 'zod';
import type { Middleware } from './pipeline';
import { Responses } from '../utils/responses';

export function validateBody<T extends z.ZodType>(schema: T): Middleware {
  return async (request, context, next) => {
    try {
      const rawBody = await request.json();
      const validatedBody = schema.parse(rawBody);

      // Replace request body with validated version
      request.validatedBody = validatedBody;

      return next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return Responses.badRequest('Validation failed', {
          errors: error.errors.map(err => ({
            path: err.path.join('.'),
            message: err.message,
          }))
        });
      }
      throw error;
    }
  };
}

export function validateParams<T extends z.ZodType>(schema: T): Middleware {
  return async (request, context, next) => {
    try {
      const validatedParams = schema.parse(request.params);
      request.validatedParams = validatedParams;
      return next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return Responses.badRequest('Invalid parameters', {
          errors: error.errors
        });
      }
      throw error;
    }
  };
}
```

4. Update handlers to use validation (8 hours):

**BEFORE:**
```typescript
async function createEndpointHandler(request, context) {
  const body = await request.json() as any;

  if (!body.endpoint_name) {
    return { status: 400, jsonBody: { error: 'Endpoint name is required' } };
  }

  // ... manual validation
}
```

**AFTER:**
```typescript
import { CreateEndpointSchema } from '../schemas/endpoint';
import { validateBody } from '../middleware/validation';

async function createEndpointHandler(request: AuthenticatedRequest, context) {
  // Body already validated by middleware
  const body = request.validatedBody as CreateEndpointRequest;

  const service = new EndpointService(getPool());
  const endpoint = await service.createEndpoint(body);

  return Responses.created(endpoint);
}

app.http('CreateEndpoint', {
  methods: ['POST'],
  route: 'v1/legal-entities/{legalentityid}/endpoints',
  handler: wrapEndpoint(
    createEndpointHandler,
    {
      requireAuth: true,
      middleware: [validateBody(CreateEndpointSchema)]
    }
  )
});
```

5. Update types to use Zod inference (1 hour):

```typescript
// types/endpoint.ts
export type { CreateEndpointRequest, UpdateEndpointRequest } from '../schemas/endpoint';
```

**Acceptance Criteria:**
- [ ] All input validation uses Zod
- [ ] No `as any` in handlers
- [ ] Validation errors user-friendly
- [ ] Types inferred from schemas
- [ ] All handlers updated

---

### 4.3 Introduce Service Layer (24 hours)
**Priority:** HIGH
**Effort:** LARGE

**Goal:** Extract business logic from handlers to services

**Services to Create:**
1. `EndpointService` (4 hours)
2. `MemberService` (4 hours)
3. `BvadService` (4 hours)
4. `KvkVerificationService` (4 hours)
5. `M2MClientService` (already created in Phase 3) (0 hours)
6. `AuthenticationService` (4 hours)
7. `AuditService` (4 hours)

**Structure:**
```
api/src/services/
  ├── endpointService.ts
  ├── memberService.ts
  ├── bvadService.ts
  ├── kvkVerificationService.ts
  ├── m2mClientService.ts
  ├── authenticationService.ts
  └── auditService.ts
```

**Example: Endpoint Service**
```typescript
// api/src/services/endpointService.ts
import type { Pool } from 'pg';
import { EndpointRepository } from '../repositories/endpointRepository';
import { LegalEntityRepository } from '../repositories/legalEntityRepository';
import { AuditService } from './auditService';
import type { CreateEndpointRequest, UpdateEndpointRequest, Endpoint } from '../types';

export class EndpointService {
  private endpointRepo: EndpointRepository;
  private legalEntityRepo: LegalEntityRepository;
  private auditService: AuditService;

  constructor(pool: Pool) {
    this.endpointRepo = new EndpointRepository(pool);
    this.legalEntityRepo = new LegalEntityRepository(pool);
    this.auditService = new AuditService(pool);
  }

  async createEndpoint(
    legalEntityId: string,
    data: CreateEndpointRequest,
    createdBy: string
  ): Promise<Endpoint> {
    // Verify legal entity exists
    const entityExists = await this.legalEntityRepo.exists(legalEntityId);
    if (!entityExists) {
      throw new Error('Legal entity not found');
    }

    // Create endpoint
    const endpoint = await this.endpointRepo.create({
      ...data,
      legal_entity_id: legalEntityId,
      created_by: createdBy,
    });

    // Log audit event
    await this.auditService.logEvent({
      event_type: 'ENDPOINT_MANAGEMENT',
      actor_org_id: legalEntityId,
      resource_type: 'legal_entity_endpoint',
      resource_id: endpoint.legal_entity_endpoint_id,
      action: 'CREATE',
      result: 'SUCCESS',
      metadata: {
        endpoint_name: data.endpoint_name,
        created_by: createdBy,
      }
    });

    return endpoint;
  }

  async updateEndpoint(
    endpointId: string,
    data: UpdateEndpointRequest,
    modifiedBy: string
  ): Promise<Endpoint> {
    const endpoint = await this.endpointRepo.update(endpointId, {
      ...data,
      modified_by: modifiedBy,
    });

    await this.auditService.logEvent({
      event_type: 'ENDPOINT_MANAGEMENT',
      resource_type: 'legal_entity_endpoint',
      resource_id: endpointId,
      action: 'UPDATE',
      result: 'SUCCESS',
      metadata: { modified_by: modifiedBy }
    });

    return endpoint;
  }

  async getEndpointsByLegalEntity(legalEntityId: string): Promise<Endpoint[]> {
    return this.endpointRepo.findByLegalEntity(legalEntityId);
  }

  async deleteEndpoint(endpointId: string, deletedBy: string): Promise<void> {
    await this.endpointRepo.softDelete(endpointId);

    await this.auditService.logEvent({
      event_type: 'ENDPOINT_MANAGEMENT',
      resource_type: 'legal_entity_endpoint',
      resource_id: endpointId,
      action: 'DELETE',
      result: 'SUCCESS',
      metadata: { deleted_by: deletedBy }
    });
  }
}
```

**Updated Handler:**
```typescript
// api/src/functions/ManageEndpoints.ts (after service layer)
async function createEndpointHandler(request: AuthenticatedRequest, context) {
  const legalEntityId = request.params.legalentityid;
  const body = request.validatedBody as CreateEndpointRequest;

  try {
    const service = new EndpointService(getPool());
    const endpoint = await service.createEndpoint(
      legalEntityId,
      body,
      request.userEmail || 'SYSTEM'
    );

    return Responses.created(endpoint);
  } catch (error) {
    if (error.message === 'Legal entity not found') {
      return Responses.notFound(error.message);
    }
    return handleError(error, context, getRequestId(request));
  }
}
```

**Benefits:**
- Handlers become thin controllers (~20-40 lines)
- Business logic testable without Azure Functions
- Services reusable across different entry points
- Clear separation of concerns

**Acceptance Criteria:**
- [ ] All services created
- [ ] All business logic in services
- [ ] Handlers <50 lines
- [ ] Services tested (80% coverage)
- [ ] All handlers use services

---

### 4.4 Platform Abstraction (16 hours)
**Priority:** MEDIUM
**Effort:** LARGE

**Goal:** Reduce dependency on Azure Functions SDK

**Steps:**

1. Create platform-agnostic types (4 hours):

```typescript
// api/src/core/types.ts
export interface HttpRequest {
  method: string;
  url: string;
  headers: Headers;
  params: Record<string, string>;
  query: URLSearchParams;
  body?: unknown;
}

export interface HttpResponse {
  status: number;
  headers?: Record<string, string>;
  body?: unknown;
}

export interface Logger {
  log(message: string, ...args: any[]): void;
  error(message: string, error?: unknown): void;
  warn(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
}

export interface RequestContext {
  requestId: string;
  logger: Logger;
  user?: UserContext;
}

export type HttpHandler = (
  request: HttpRequest,
  context: RequestContext
) => Promise<HttpResponse>;
```

2. Create adapters (4 hours):

```typescript
// api/src/adapters/azureFunctionsAdapter.ts
import type { HttpRequest as AzureRequest, InvocationContext } from '@azure/functions';
import type { HttpRequest, RequestContext, Logger } from '../core/types';

export function adaptRequest(azureReq: AzureRequest): HttpRequest {
  return {
    method: azureReq.method,
    url: azureReq.url,
    headers: headersToPlainObject(azureReq.headers),
    params: azureReq.params,
    query: azureReq.query,
    body: undefined, // Populated by middleware
  };
}

export function adaptContext(azureCtx: InvocationContext, requestId: string): RequestContext {
  return {
    requestId,
    logger: createLogger(azureCtx),
  };
}

function createLogger(azureCtx: InvocationContext): Logger {
  return {
    log: (msg, ...args) => azureCtx.log(msg, ...args),
    error: (msg, error) => azureCtx.error(msg, error),
    warn: (msg, ...args) => azureCtx.warn(msg, ...args),
    info: (msg, ...args) => azureCtx.log(msg, ...args),
  };
}
```

3. Update handlers to use platform-agnostic types (6 hours):

**BEFORE:**
```typescript
import { HttpRequest, InvocationContext, HttpResponseInit } from '@azure/functions';

async function handler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  // Azure-specific
}
```

**AFTER:**
```typescript
import type { HttpRequest, RequestContext, HttpResponse } from '../core/types';

async function handler(
  request: HttpRequest,
  context: RequestContext
): Promise<HttpResponse> {
  // Platform-agnostic
}

// Adapter at registration
app.http('EndpointName', {
  handler: adaptAzureHandler(handler)
});
```

4. Test with alternative platform (2 hours):

```typescript
// api/src/__tests__/expressAdapter.test.ts
// Test that handlers work with Express adapter
import express from 'express';
import { adaptExpressHandler } from '../adapters/expressAdapter';

describe('Express Adapter', () => {
  it('should work with platform-agnostic handler', async () => {
    const app = express();
    app.get('/test', adaptExpressHandler(myHandler));

    const response = await request(app).get('/test');
    expect(response.status).toBe(200);
  });
});
```

**Acceptance Criteria:**
- [ ] Core types defined
- [ ] Azure adapter created
- [ ] Alternative adapter (Express) created for testing
- [ ] All handlers use platform-agnostic types
- [ ] Tests passing with both adapters

---

### Phase 4 Deliverables

**Completed Tasks:**
- [x] Repository pattern implemented
- [x] Runtime validation with Zod
- [x] Service layer introduced
- [x] Platform abstraction (optional)

**Metrics:**
- Database queries: 123 → 40 (via repositories)
- Type safety: `as any` reduced by 90%
- Handler size: 150 lines → 40 lines average
- Testability: Significantly improved

**Next Phase Prerequisites:**
- [ ] All Phase 4 tasks completed
- [ ] Tests passing (80% coverage)
- [ ] Performance verified (no regressions)
- [ ] Deployed to dev

---

## Phase 5: Polish (Week 17-18) - Coverage & Documentation

**Goal:** Achieve 80% test coverage, update documentation
**Effort:** 24 hours
**Risk:** Low

### 5.1 Achieve 80% Test Coverage (16 hours)

**Current Coverage:** 60% (after Phase 2-4)
**Target Coverage:** 80%

**Gaps to Fill:**

1. **Service Layer Tests** (6 hours)
   - EndpointService
   - MemberService
   - BvadService
   - KvkVerificationService
   - AuditService

2. **Repository Tests** (4 hours)
   - All repositories (if not already at 80%)

3. **Integration Tests** (4 hours)
   - Critical workflows end-to-end
   - Multi-step processes

4. **Frontend Component Tests** (2 hours)
   - Critical components
   - Custom hooks

**Approach:**
- Run coverage report: `npm run test:coverage`
- Identify uncovered branches
- Write targeted tests for gaps
- Focus on critical paths first

**Acceptance Criteria:**
- [ ] 80% line coverage
- [ ] 70% branch coverage
- [ ] All critical paths covered
- [ ] Coverage report in CI

---

### 5.2 Update Documentation (8 hours)

**Documents to Update:**

1. **CLAUDE.md** (3 hours)
   - Update architecture section
   - Document new patterns (repositories, services)
   - Update testing section
   - Add refactoring outcomes

2. **README.md** (2 hours)
   - Update development commands
   - Add testing instructions
   - Update architecture diagram

3. **API Documentation** (2 hours)
   - Update OpenAPI/Swagger spec
   - Document validation schemas
   - Add examples

4. **Code Comments** (1 hour)
   - Review and update JSDoc comments
   - Ensure "why" not "what"
   - Document complex algorithms

**Acceptance Criteria:**
- [ ] All documentation updated
- [ ] Architecture diagrams current
- [ ] Examples working
- [ ] Comments reviewed

---

### Phase 5 Deliverables

**Completed Tasks:**
- [x] 80% test coverage achieved
- [x] Documentation updated
- [x] Examples added
- [x] Code comments reviewed

**Final Metrics:**
- Health Score: 4.2/10 → 8.5/10
- Test Coverage: 0% → 80%
- Files >300 lines: 50 → 0
- Cyclomatic Complexity >10: 30 → 0
- Code Duplication: ~800 lines → <50 lines

---

## Risk Management

### High-Risk Tasks

1. **Refactoring `endpointWrapper.ts`**
   - **Risk:** Breaking all API endpoints
   - **Mitigation:**
     - Comprehensive tests before refactoring
     - Refactor in small steps
     - Deploy to dev, test extensively
     - Keep old version as fallback

2. **Introducing Service Layer**
   - **Risk:** Breaking existing functionality
   - **Mitigation:**
     - Incremental adoption (one handler at a time)
     - Parallel implementation (keep old code working)
     - Extensive testing
     - Gradual rollout

3. **Platform Abstraction**
   - **Risk:** Fundamental architecture change
   - **Mitigation:**
     - Optional (lowest priority)
     - Proof of concept first
     - Limited scope initially
     - Can defer to future phase

### Rollback Plan

For each phase:
1. Tag git before starting: `git tag phase-N-start`
2. Commit frequently with descriptive messages
3. If issues arise, revert to last stable state
4. Test in dev before deploying to production
5. Keep feature flags for major changes

---

## Success Metrics

### Phase-by-Phase Targets

| Phase | Test Coverage | Files >300 Lines | Avg Complexity | Health Score |
|-------|---------------|------------------|----------------|--------------|
| Start | 0%            | 50               | 12             | 4.2/10       |
| Phase 1 | 10%         | 50               | 12             | 4.5/10       |
| Phase 2 | 60%         | 50               | 8              | 6.0/10       |
| Phase 3 | 60%         | 10               | 8              | 7.0/10       |
| Phase 4 | 70%         | 5                | 6              | 8.0/10       |
| Phase 5 | 80%         | 0                | 5              | 8.5/10       |

### Key Performance Indicators

**Code Quality:**
- [ ] No files >300 lines
- [ ] No functions >50 lines
- [ ] Cyclomatic complexity <10 everywhere
- [ ] <100 lines of duplicate code

**Testing:**
- [ ] 80% line coverage (API)
- [ ] 70% line coverage (Frontend)
- [ ] All critical paths tested
- [ ] CI runs tests on every commit

**Maintainability:**
- [ ] All API calls use `@ctn/api-client`
- [ ] All database queries use repositories
- [ ] All validation uses Zod
- [ ] All error handling uses utilities

**Documentation:**
- [ ] Architecture docs updated
- [ ] All public APIs documented
- [ ] Code comments explain "why"
- [ ] README current

---

## Monitoring & Review

### Weekly Check-ins

**Every Monday:**
1. Review progress vs plan
2. Update metrics
3. Identify blockers
4. Adjust timeline if needed

**Template:**
```markdown
## Week N Progress Report

**Completed:**
- [x] Task 1
- [x] Task 2

**In Progress:**
- [ ] Task 3 (60% done)

**Blocked:**
- [ ] Task 4 (waiting for...)

**Metrics:**
- Test Coverage: X%
- Files >300: N
- Health Score: X.X/10

**Next Week:**
- [ ] Complete Task 3
- [ ] Start Task 5
```

### Phase Reviews

**End of Each Phase:**
1. Run full test suite
2. Check coverage report
3. Review code quality metrics
4. Deploy to dev
5. Manual QA testing
6. Team review
7. Document lessons learned
8. Update COMPLETED_ACTIONS.md

---

## Conclusion

This refactoring plan provides a systematic approach to improving code quality from 4.2/10 to 8.5/10 over 17 weeks. The phased approach minimizes risk while delivering incremental value.

**Key Success Factors:**
1. Start with quick wins to build momentum
2. Focus on high-impact changes first
3. Test extensively at each phase
4. Deploy incrementally
5. Document everything
6. Measure progress consistently

**After Completion:**
- More maintainable codebase
- Faster development velocity
- Easier onboarding for new developers
- Fewer bugs in production
- Confidence in refactoring
- Platform for future improvements

**Estimated Timeline:**
- **50% capacity:** 17 weeks (4 months)
- **100% capacity:** 8.5 weeks (2 months)

**Total Investment:** 270 hours

**Expected ROI:**
- Reduced bug fix time: 40%
- Faster feature development: 30%
- Easier debugging: 50%
- Lower maintenance costs: Long-term 60%

---

**Document Version:** 1.0
**Last Updated:** November 13, 2025
**Next Review:** Start of Phase 1
