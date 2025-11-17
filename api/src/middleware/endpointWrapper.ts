// ========================================
// Endpoint Wrapper Utility (Refactored)
// ========================================
// Simplified endpoint wrapper using composable middleware pattern
// Reduces complexity from ~378 lines to ~150 lines
// Improves testability and maintainability

import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { AuthenticatedRequest } from './auth';
import { Permission, UserRole } from './rbac';
import { RateLimiterType } from './rateLimiter';
import { DEFAULT_CORS_ORIGINS } from '../config/constants';

// Import composable middleware
import { composeMiddleware } from './utils/composeMiddleware';
import { BusinessLogicHandler, MiddlewareFunction } from './utils/middlewareTypes';

// Import validators
import { createCorsValidator } from './validators/corsValidator';
import { createHttpsValidator } from './validators/httpsValidator';
import { createRateLimiter } from './validators/rateLimiterValidator';
import { createContentTypeValidator } from './validators/contentTypeValidatorMiddleware';
import { createCsrfValidator } from './validators/csrfValidator';

// Import auth middleware
import { createJwtAuthenticator } from './auth/jwtAuthenticator';
import { createRbacAuthorizer } from './auth/rbacAuthorizer';

/**
 * Options for endpoint wrapper
 */
export interface EndpointOptions {
  /** Require authentication (default: true) */
  requireAuth?: boolean;

  /** Required roles (any of these roles grants access) */
  requiredRoles?: UserRole[];

  /** Required permissions */
  requiredPermissions?: Permission[];

  /** Require all permissions (default: true) or any permission */
  requireAllPermissions?: boolean;

  /** Enable CORS (default: true) */
  enableCors?: boolean;

  /** Allowed CORS origins (default: environment-specific) */
  allowedOrigins?: string[];

  /** Enable rate limiting (default: true) */
  enableRateLimit?: boolean;

  /** Rate limiter type (default: API) */
  rateLimiterType?: RateLimiterType;

  /** Enable Content-Type validation (default: true) */
  enableContentTypeValidation?: boolean;

  /** Enable HTTPS enforcement (default: true) */
  enableHttps?: boolean;

  /** Enable CSRF protection (default: true for authenticated endpoints) */
  enableCsrf?: boolean;
}

/**
 * Endpoint handler type
 */
export type EndpointHandler = BusinessLogicHandler;

/**
 * Wrap endpoint with composable middleware chain
 *
 * Builds a middleware pipeline based on configuration options.
 * Middleware execution order:
 * 1. CORS validation (handles preflight)
 * 2. HTTPS enforcement
 * 3. Rate limiting
 * 4. Content-Type validation
 * 5. JWT authentication
 * 6. RBAC authorization (roles and permissions)
 * 7. CSRF validation
 * 8. Business logic handler
 *
 * @param handler Endpoint handler function
 * @param options Endpoint options
 * @returns Wrapped handler
 *
 * @example
 * ```typescript
 * export const myEndpoint = wrapEndpoint(
 *   async (req, ctx) => {
 *     return { status: 200, jsonBody: { success: true } };
 *   },
 *   {
 *     requireAuth: true,
 *     requiredRoles: [UserRole.SYSTEM_ADMIN],
 *     enableRateLimit: true,
 *   }
 * );
 * ```
 */
export function wrapEndpoint(
  handler: EndpointHandler,
  options: EndpointOptions = {}
): (request: HttpRequest, context: InvocationContext) => Promise<HttpResponseInit> {
  const {
    requireAuth = true,
    requiredRoles,
    requiredPermissions,
    requireAllPermissions = true,
    enableCors = true,
    allowedOrigins = DEFAULT_CORS_ORIGINS,
    enableRateLimit = true,
    rateLimiterType = RateLimiterType.API,
    enableContentTypeValidation = true,
    enableHttps = true,
    enableCsrf = requireAuth, // CSRF only needed for authenticated endpoints
  } = options;

  // Build middleware chain
  const middleware: MiddlewareFunction[] = [];

  // 1. CORS validation (always first to handle preflight)
  if (enableCors) {
    middleware.push(
      createCorsValidator({
        enabled: true,
        allowedOrigins,
      })
    );
  }

  // 2. HTTPS enforcement
  if (enableHttps) {
    middleware.push(
      createHttpsValidator({
        enabled: true,
      })
    );
  }

  // 3. Rate limiting
  if (enableRateLimit) {
    middleware.push(
      createRateLimiter({
        enabled: true,
        type: rateLimiterType,
      })
    );
  }

  // 4. Content-Type validation
  if (enableContentTypeValidation) {
    middleware.push(
      createContentTypeValidator({
        enabled: true,
      })
    );
  }

  // 5. JWT authentication
  middleware.push(
    createJwtAuthenticator({
      required: requireAuth,
    })
  );

  // 6. RBAC authorization
  if (requireAuth && (requiredRoles || requiredPermissions)) {
    middleware.push(
      createRbacAuthorizer({
        requiredRoles,
        requiredPermissions,
        requireAllPermissions,
      })
    );
  }

  // 7. CSRF validation (for authenticated state-changing requests)
  if (enableCsrf) {
    middleware.push(
      createCsrfValidator({
        enabled: true,
        requireAuth: true,
      })
    );
  }

  // Compose middleware with business logic handler
  return composeMiddleware(middleware, handler);
}

/**
 * Convenience function for public endpoints (no auth required)
 */
export function publicEndpoint(
  handler: EndpointHandler
): (request: HttpRequest, context: InvocationContext) => Promise<HttpResponseInit> {
  return wrapEndpoint(handler, {
    requireAuth: false,
    enableCsrf: false, // No CSRF for public endpoints
  });
}

/**
 * Convenience function for authenticated endpoints
 */
export function authenticatedEndpoint(
  handler: EndpointHandler
): (request: HttpRequest, context: InvocationContext) => Promise<HttpResponseInit> {
  return wrapEndpoint(handler, {
    requireAuth: true,
  });
}

/**
 * Convenience function for admin-only endpoints
 */
export function adminEndpoint(
  handler: EndpointHandler
): (request: HttpRequest, context: InvocationContext) => Promise<HttpResponseInit> {
  return wrapEndpoint(handler, {
    requireAuth: true,
    requiredRoles: [UserRole.SYSTEM_ADMIN, UserRole.ASSOCIATION_ADMIN],
  });
}

/**
 * Convenience function for member endpoints
 */
export function memberEndpoint(
  handler: EndpointHandler,
  permissions?: Permission[]
): (request: HttpRequest, context: InvocationContext) => Promise<HttpResponseInit> {
  return wrapEndpoint(handler, {
    requireAuth: true,
    requiredRoles: [
      UserRole.SYSTEM_ADMIN,
      UserRole.ASSOCIATION_ADMIN,
      UserRole.MEMBER_ADMIN,
      UserRole.MEMBER_USER,
    ],
    requiredPermissions: permissions,
  });
}

// Re-export AuthenticatedRequest for convenience
export type { AuthenticatedRequest };
