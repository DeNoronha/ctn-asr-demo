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
}

/**
 * Default CORS origins based on environment
 */
const DEFAULT_CORS_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://calm-tree-03352ba03.1.azurestaticapps.net', // Admin portal
  'https://calm-pebble-043b2db03.1.azurestaticapps.net', // Member portal
];

/**
 * Get CORS headers
 */
function getCorsHeaders(
  origin: string | null,
  allowedOrigins: string[]
): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID',
    'Access-Control-Max-Age': '86400',
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
        const origin = request.headers.get('origin');
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
          const origin = request.headers.get('origin');
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

      // Apply authentication if required
      let authenticatedRequest: AuthenticatedRequest;

      if (requireAuth) {
        const authResult = await authenticate(request, context);

        if (!authResult.success) {
          const duration = Date.now() - startTime;
          context.warn(`[${requestId}] Authentication failed (${duration}ms)`);

          // Type guard: authResult is the failure type here
          const errorResponse = (authResult as { success: false; response: any }).response;

          // Add CORS headers and request ID to error response
          if (enableCors) {
            const origin = request.headers.get('origin');
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
      } else {
        // Create authenticated request from regular request for anonymous access
        authenticatedRequest = {
          method: request.method,
          url: request.url,
          headers: request.headers as any, // Type compatibility fix
          query: request.query,
          params: request.params,
          text: request.text,
          json: request.json,
        };
      }

      // Apply role-based authorization
      if (requiredRoles && requiredRoles.length > 0) {
        const roleCheck = requireRoles(requiredRoles)(authenticatedRequest, context);

        if (!roleCheck.authorized && roleCheck.response) {
          const duration = Date.now() - startTime;
          context.warn(`[${requestId}] Authorization failed - roles (${duration}ms)`);

          if (enableCors) {
            const origin = request.headers.get('origin');
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
            const origin = request.headers.get('origin');
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

      // Call the actual handler
      let response = await handler(authenticatedRequest, context);

      // Add CORS headers to response
      if (enableCors) {
        const origin = request.headers.get('origin');
        const corsHeaders = getCorsHeaders(origin, allowedOrigins);
        response.headers = {
          ...corsHeaders,
          ...response.headers,
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
        const origin = request.headers.get('origin');
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
