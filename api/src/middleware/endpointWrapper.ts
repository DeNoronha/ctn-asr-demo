// ========================================
// Endpoint Wrapper Utility
// ========================================
// Simplifies applying authentication and authorization to endpoints

import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { authenticate, AuthenticatedRequest as AuthRequest } from './auth';
import { Permission, requirePermissions, requireRoles, UserRole } from './rbac';

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
    context.log(`${request.method} ${request.url} - Processing started`);

    try {
      // Handle CORS preflight
      if (request.method === 'OPTIONS' && enableCors) {
        const origin = request.headers.get('origin');
        return {
          status: 204,
          headers: getCorsHeaders(origin, allowedOrigins),
        };
      }

      // Apply authentication if required
      let authenticatedRequest: AuthenticatedRequest;

      if (requireAuth) {
        const authResult = await authenticate(request, context);

        if (!authResult.success) {
          const duration = Date.now() - startTime;
          context.warn(`Authentication failed (${duration}ms)`);

          // Type guard: authResult is the failure type here
          const errorResponse = (authResult as { success: false; response: any }).response;

          // Add CORS headers to error response
          if (enableCors) {
            const origin = request.headers.get('origin');
            const corsHeaders = getCorsHeaders(origin, allowedOrigins);
            return {
              ...errorResponse,
              headers: {
                ...(errorResponse?.headers || {}),
                ...corsHeaders,
              },
            };
          }

          return errorResponse || { status: 401, body: 'Unauthorized' };
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
          context.warn(`Authorization failed - roles (${duration}ms)`);

          if (enableCors) {
            const origin = request.headers.get('origin');
            const corsHeaders = getCorsHeaders(origin, allowedOrigins);
            return {
              ...roleCheck.response,
              headers: {
                ...(roleCheck.response.headers || {}),
                ...corsHeaders,
              },
            };
          }

          return roleCheck.response;
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
          context.warn(`Authorization failed - permissions (${duration}ms)`);

          if (enableCors) {
            const origin = request.headers.get('origin');
            const corsHeaders = getCorsHeaders(origin, allowedOrigins);
            return {
              ...permissionCheck.response,
              headers: {
                ...(permissionCheck.response.headers || {}),
                ...corsHeaders,
              },
            };
          }

          return permissionCheck.response;
        }
      }

      // Call the actual handler
      const response = await handler(authenticatedRequest, context);

      // Add CORS headers to response
      if (enableCors) {
        const origin = request.headers.get('origin');
        const corsHeaders = getCorsHeaders(origin, allowedOrigins);
        response.headers = {
          ...corsHeaders,
          ...response.headers,
        };
      }

      const duration = Date.now() - startTime;
      context.log(`${request.method} ${request.url} - Completed (${duration}ms)`);

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      context.error(`${request.method} ${request.url} - Error (${duration}ms):`, error);

      const errorResponse = {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'internal_server_error',
          error_description:
            error instanceof Error ? error.message : 'An unexpected error occurred',
        }),
      };

      // Add CORS headers to error response
      if (enableCors) {
        const origin = request.headers.get('origin');
        const corsHeaders = getCorsHeaders(origin, allowedOrigins);
        errorResponse.headers = {
          ...errorResponse.headers,
          ...corsHeaders,
        };
      }

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
