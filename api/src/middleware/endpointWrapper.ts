// ========================================
// Endpoint Wrapper Utility
// ========================================
// Simplifies applying authentication and authorization to endpoints

import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { authenticate, AuthenticatedRequest as AuthRequest } from './auth';
import { Permission, requirePermissions, requireRoles, UserRole } from './rbac';
import { applySecurityHeaders } from './securityHeaders';
import { enforceHttps, addHttpsSecurityHeaders } from './httpsEnforcement';
import { handleError } from '../utils/errors';
import { getRequestId } from '../utils/requestId';
import { checkRateLimit, RateLimiterType } from './rateLimiter';
import { validateContentType, ContentTypeValidationResult } from './contentTypeValidator';
import { CORS, RATE_LIMIT, DEFAULT_CORS_ORIGINS, STATE_CHANGING_METHODS } from '../config/constants';

// Re-export AuthenticatedRequest for convenience
export type AuthenticatedRequest = AuthRequest;

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
}

/**
 * Safely get header value to avoid "Cannot read private member" error
 */
function safeGetHeader(headers: any, name: string): string | null {
  try {
    return headers.get(name);
  } catch (error) {
    return null;
  }
}

/**
 * Convert Headers object to plain object to avoid private member errors
 * Returns a wrapper that safely delegates to the original headers
 */
function headersToPlainObject(headers: any): any {
  return {
    get: (name: string) => {
      try {
        return headers.get(name);
      } catch {
        return null;
      }
    },
    has: (name: string) => {
      try {
        return headers.has(name);
      } catch {
        return false;
      }
    },
    // Prevent iteration which might access private members
    forEach: () => {},
    entries: () => [],
    keys: () => [],
    values: () => []
  };
}

/**
 * Get CORS headers
 */
function getCorsHeaders(
  origin: string | null,
  allowedOrigins: string[] | readonly string[]
): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': CORS.ALLOWED_METHODS,
    'Access-Control-Allow-Headers': CORS.ALLOWED_HEADERS,
    'Access-Control-Max-Age': CORS.MAX_AGE_HEADER,
  };

  // Check if origin is allowed
  if (origin && allowedOrigins.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Credentials'] = 'true';
  } else if (allowedOrigins.includes('*')) {
    headers['Access-Control-Allow-Origin'] = '*';
  }

  return headers;
}

/**
 * Endpoint handler type
 */
export type EndpointHandler = (
  request: AuthenticatedRequest,
  context: InvocationContext
) => Promise<HttpResponseInit>;

/**
 * Wrap endpoint with authentication, authorization, and CORS
 * @param handler Endpoint handler function
 * @param options Endpoint options
 * @returns Wrapped handler
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
  } = options;

  return async (
    request: HttpRequest,
    context: InvocationContext
  ): Promise<HttpResponseInit> => {
    const startTime = Date.now();

    // Generate or extract request ID for tracking
    const requestId = getRequestId(request);
    context.log(`[${requestId}] ${request.method} ${request.url} - Processing started`);

    try {
      // Handle CORS preflight
      if (request.method === 'OPTIONS' && enableCors) {
        const origin = safeGetHeader(request.headers, 'origin');
        return {
          status: 204,
          headers: {
            ...getCorsHeaders(origin, allowedOrigins),
            'X-Request-ID': requestId
          },
        };
      }

      // Enforce HTTPS in production
      const httpsCheck = enforceHttps(request, context);
      if (httpsCheck) {
        // HTTPS required but not used - return 403
        if (enableCors) {
          const origin = safeGetHeader(request.headers, 'origin');
          const corsHeaders = getCorsHeaders(origin, allowedOrigins);
          return {
            ...httpsCheck,
            headers: {
              ...(httpsCheck.headers || {}),
              ...corsHeaders,
              'X-Request-ID': requestId
            },
          };
        }
        return {
          ...httpsCheck,
          headers: {
            ...(httpsCheck.headers || {}),
            'X-Request-ID': requestId
          }
        };
      }

      // Apply rate limiting
      let rateLimitResult: { allowed: boolean; remaining: number; resetTime: Date; response?: any } | null = null;
      if (enableRateLimit) {
        rateLimitResult = await checkRateLimit(request, context, rateLimiterType);

        if (!rateLimitResult.allowed && rateLimitResult.response) {
          const duration = Date.now() - startTime;
          context.warn(`[${requestId}] Rate limit exceeded (${duration}ms)`);

          // Add CORS headers and request ID to rate limit response
          if (enableCors) {
            const origin = safeGetHeader(request.headers, 'origin');
            const corsHeaders = getCorsHeaders(origin, allowedOrigins);
            return {
              ...rateLimitResult.response,
              headers: {
                ...(rateLimitResult.response.headers || {}),
                ...corsHeaders,
                'X-Request-ID': requestId
              },
            };
          }

          return {
            ...rateLimitResult.response,
            headers: {
              ...(rateLimitResult.response.headers || {}),
              'X-Request-ID': requestId
            }
          };
        }
      }

      // Apply Content-Type validation for mutation methods
      if (enableContentTypeValidation) {
        const contentTypeResult: ContentTypeValidationResult = await validateContentType(request, context);

        if (!contentTypeResult.valid) {
          const failureResult = contentTypeResult as { valid: false; response: HttpResponseInit };
          const duration = Date.now() - startTime;
          context.warn(`[${requestId}] Content-Type validation failed (${duration}ms)`);

          // Add CORS headers and request ID to error response
          if (enableCors) {
            const origin = safeGetHeader(request.headers, 'origin');
            const corsHeaders = getCorsHeaders(origin, allowedOrigins);
            return {
              ...failureResult.response,
              headers: {
                ...(failureResult.response.headers || {}),
                ...corsHeaders,
                'X-Request-ID': requestId
              },
            };
          }

          return {
            ...failureResult.response,
            headers: {
              ...(failureResult.response.headers || {}),
              'X-Request-ID': requestId
            }
          };
        }
      }

      // Apply authentication if required
      let authenticatedRequest: AuthenticatedRequest;
      let csrfTokenToSet: string | undefined;

      if (requireAuth) {
        const authResult = await authenticate(request, context);

        if (!authResult.success) {
          const duration = Date.now() - startTime;
          context.warn(`[${requestId}] Authentication failed (${duration}ms)`);

          // Type guard: authResult is the failure type here
          const errorResponse = (authResult as { success: false; response: any }).response;

          // Add CORS headers and request ID to error response
          if (enableCors) {
            const origin = safeGetHeader(request.headers, 'origin');
            const corsHeaders = getCorsHeaders(origin, allowedOrigins);
            return {
              ...errorResponse,
              headers: {
                ...(errorResponse?.headers || {}),
                ...corsHeaders,
                'X-Request-ID': requestId
              },
            };
          }

          return {
            ...(errorResponse || { status: 401, body: 'Unauthorized' }),
            headers: {
              ...(errorResponse?.headers || {}),
              'X-Request-ID': requestId
            }
          };
        }

        authenticatedRequest = authResult.request;
        csrfTokenToSet = authResult.csrfToken; // Store CSRF token for response
      } else {
        // Create authenticated request from regular request for anonymous access
        // Bind methods to avoid accessing private Headers members
        authenticatedRequest = {
          method: request.method,
          url: request.url,
          headers: headersToPlainObject(request.headers),
          query: request.query,
          params: request.params,
          text: request.text.bind(request),
          json: request.json.bind(request),
          arrayBuffer: request.arrayBuffer.bind(request),
        };
      }

      // Apply role-based authorization
      if (requiredRoles && requiredRoles.length > 0) {
        const roleCheck = requireRoles(requiredRoles)(authenticatedRequest, context);

        if (!roleCheck.authorized && roleCheck.response) {
          const duration = Date.now() - startTime;
          context.warn(`[${requestId}] Authorization failed - roles (${duration}ms)`);

          if (enableCors) {
            const origin = safeGetHeader(request.headers, 'origin');
            const corsHeaders = getCorsHeaders(origin, allowedOrigins);
            return {
              ...roleCheck.response,
              headers: {
                ...(roleCheck.response.headers || {}),
                ...corsHeaders,
                'X-Request-ID': requestId
              },
            };
          }

          return {
            ...roleCheck.response,
            headers: {
              ...(roleCheck.response.headers || {}),
              'X-Request-ID': requestId
            }
          };
        }
      }

      // Apply permission-based authorization
      if (requiredPermissions && requiredPermissions.length > 0) {
        const permissionCheck = requirePermissions(
          requiredPermissions,
          requireAllPermissions
        )(authenticatedRequest, context);

        if (!permissionCheck.authorized && permissionCheck.response) {
          const duration = Date.now() - startTime;
          context.warn(`[${requestId}] Authorization failed - permissions (${duration}ms)`);

          if (enableCors) {
            const origin = safeGetHeader(request.headers, 'origin');
            const corsHeaders = getCorsHeaders(origin, allowedOrigins);
            return {
              ...permissionCheck.response,
              headers: {
                ...(permissionCheck.response.headers || {}),
                ...corsHeaders,
                'X-Request-ID': requestId
              },
            };
          }

          return {
            ...permissionCheck.response,
            headers: {
              ...(permissionCheck.response.headers || {}),
              'X-Request-ID': requestId
            }
          };
        }
      }

      // SEC-004: CSRF protection using double-submit cookie pattern
      // Validates CSRF tokens for all state-changing requests (POST/PUT/PATCH/DELETE)
      // Security properties:
      // - Cryptographically secure random tokens (256 bits)
      // - Cookie + Header must match (double-submit pattern)
      // - Constant-time comparison prevents timing attacks
      // - Token expiration enforced (30 minutes)
      //
      // This prevents CSRF attacks because:
      // - Attacker cannot read cookie from different origin (SameSite=Strict)
      // - Attacker cannot set custom headers on cross-origin requests
      // - Tokens are cryptographically random and cannot be predicted
      if (requireAuth && STATE_CHANGING_METHODS.includes(request.method.toUpperCase() as any)) {
        // Import CSRF validation utilities
        const { validateCsrfTokens, extractCsrfCookie } = await import('../utils/csrf');

        // Extract CSRF token from cookie
        const cookieHeader = authenticatedRequest.headers.get('cookie');
        const csrfCookie = extractCsrfCookie(cookieHeader);

        // Extract CSRF token from header
        const csrfHeader = authenticatedRequest.headers.get('x-csrf-token');

        // Validate double-submit pattern
        const csrfValidation = validateCsrfTokens(
          csrfCookie,
          csrfHeader,
          authenticatedRequest.userId,
          context
        );

        if (!csrfValidation.valid) {
          const duration = Date.now() - startTime;
          context.warn(`[${requestId}] CSRF validation failed: ${csrfValidation.errorCode} (${duration}ms)`);

          if (enableCors) {
            const origin = safeGetHeader(request.headers, 'origin');
            const corsHeaders = getCorsHeaders(origin, allowedOrigins);
            return {
              status: 403,
              headers: { 'Content-Type': 'application/json', ...corsHeaders, 'X-Request-ID': requestId },
              jsonBody: {
                error: 'forbidden',
                error_description: csrfValidation.error || 'CSRF validation failed',
                error_code: csrfValidation.errorCode,
              },
            };
          }

          return {
            status: 403,
            headers: { 'Content-Type': 'application/json', 'X-Request-ID': requestId },
            jsonBody: {
              error: 'forbidden',
              error_description: csrfValidation.error || 'CSRF validation failed',
              error_code: csrfValidation.errorCode,
            },
          };
        }

        // CSRF validation passed - log for audit
        context.log(`[${requestId}] CSRF validation successful for ${authenticatedRequest.userEmail || authenticatedRequest.userId}`);
      }

      // Call the actual handler
      let response = await handler(authenticatedRequest, context);

      // Set CSRF token cookie if this is an authenticated request (SEC-004)
      // Token is generated on each successful authentication and set as cookie
      // Frontend will read this cookie and include it in X-CSRF-Token header
      if (csrfTokenToSet) {
        const { formatCsrfCookie } = await import('../utils/csrf');
        const csrfCookie = formatCsrfCookie(csrfTokenToSet);

        // Add Set-Cookie header for CSRF token
        response.headers = {
          ...response.headers,
          'Set-Cookie': csrfCookie,
        };

        context.log(`[${requestId}] CSRF token set for ${authenticatedRequest.userEmail || authenticatedRequest.userId}`);
      }

      // Add CORS headers to response
      if (enableCors) {
        const origin = safeGetHeader(request.headers, 'origin');
        const corsHeaders = getCorsHeaders(origin, allowedOrigins);
        response.headers = {
          ...corsHeaders,
          ...response.headers,
        };
      }

      // Add rate limit headers to response
      if (rateLimitResult && rateLimitResult.allowed) {
        response.headers = {
          ...response.headers,
          'X-RateLimit-Limit': RATE_LIMIT.API_POINTS.toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': rateLimitResult.resetTime.toISOString(),
        };
      }

      // Add request ID to response
      response.headers = {
        ...response.headers,
        'X-Request-ID': requestId
      };

      // Apply security headers
      response = applySecurityHeaders(response);

      // Add HTTPS security headers
      response = addHttpsSecurityHeaders(response);

      const duration = Date.now() - startTime;
      context.log(`[${requestId}] ${request.method} ${request.url} - Completed (${duration}ms)`);

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      context.error(`[${requestId}] ${request.method} ${request.url} - Error (${duration}ms):`, error);

      // Use standardized error handling
      let errorResponse = handleError(error, context, requestId);

      // Add CORS headers to error response
      if (enableCors) {
        const origin = safeGetHeader(request.headers, 'origin');
        const corsHeaders = getCorsHeaders(origin, allowedOrigins);
        errorResponse.headers = {
          ...errorResponse.headers,
          ...corsHeaders,
        };
      }

      // Apply security headers to error response
      errorResponse = applySecurityHeaders(errorResponse);

      // Add HTTPS security headers
      errorResponse = addHttpsSecurityHeaders(errorResponse);

      return errorResponse;
    }
  };
}

/**
 * Convenience function for public endpoints (no auth required)
 */
export function publicEndpoint(
  handler: EndpointHandler
): (request: HttpRequest, context: InvocationContext) => Promise<HttpResponseInit> {
  return wrapEndpoint(handler, {
    requireAuth: false,
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
