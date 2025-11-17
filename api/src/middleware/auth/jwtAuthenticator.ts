/**
 * JWT Authentication Middleware
 *
 * Validates JWT tokens and populates authenticated request context.
 * Integrates existing authentication logic into composable middleware pattern.
 */

import { HttpResponseInit, HttpRequest } from '@azure/functions';
import { MiddlewareFunction, MiddlewareContext } from '../utils/middlewareTypes';
import { authenticate, AuthenticatedRequest } from '../auth';

/**
 * JWT authenticator configuration
 */
export interface JwtAuthenticatorOptions {
  /** Require authentication (default: true) */
  required?: boolean;
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
    forEach: () => {},
    entries: () => [],
    keys: () => [],
    values: () => [],
  };
}

/**
 * Create JWT authenticator middleware
 *
 * Validates JWT token from Authorization header.
 * If authentication succeeds:
 * - Populates context.authenticatedRequest
 * - Stores CSRF token in context.csrfTokenToSet
 *
 * If authentication fails and required=true:
 * - Returns 401 Unauthorized
 *
 * If authentication not required:
 * - Creates anonymous AuthenticatedRequest
 *
 * @param options JWT authenticator configuration
 * @returns Middleware function
 *
 * @example
 * ```typescript
 * // Required authentication
 * const authMiddleware = createJwtAuthenticator({ required: true });
 *
 * // Optional authentication
 * const optionalAuth = createJwtAuthenticator({ required: false });
 * ```
 */
export function createJwtAuthenticator(
  options: JwtAuthenticatorOptions = {}
): MiddlewareFunction {
  const { required = true } = options;

  return async (context: MiddlewareContext, next: () => Promise<HttpResponseInit>) => {
    const { request, invocationContext, requestId } = context;

    if (required) {
      // Perform authentication
      const authResult = await authenticate(request, invocationContext);

      if (!authResult.success) {
        const duration = Date.now() - context.startTime;
        invocationContext.warn(`[${requestId}] Authentication failed (${duration}ms)`);

        // Type guard: authResult is the failure type here
        const errorResponse = (authResult as { success: false; response: any }).response;

        return {
          ...(errorResponse || { status: 401, body: 'Unauthorized' }),
          headers: {
            ...(errorResponse?.headers || {}),
            'X-Request-ID': requestId,
          },
        };
      }

      // Authentication succeeded
      context.authenticatedRequest = authResult.request;
      context.csrfTokenToSet = authResult.csrfToken; // Store for response

      invocationContext.log(
        `[${requestId}] Authenticated user: ${authResult.request.userEmail || authResult.request.userId}`
      );
    } else {
      // Create anonymous authenticated request
      context.authenticatedRequest = {
        method: request.method,
        url: request.url,
        headers: headersToPlainObject(request.headers),
        query: request.query,
        params: request.params,
        text: request.text.bind(request),
        json: request.json.bind(request),
        arrayBuffer: request.arrayBuffer.bind(request),
      };

      invocationContext.log(`[${requestId}] Anonymous access allowed`);
    }

    // Continue to next middleware
    return next();
  };
}

/**
 * Required authentication middleware
 */
export const jwtAuthenticator = createJwtAuthenticator({ required: true });

/**
 * Optional authentication middleware (for public endpoints)
 */
export const optionalJwtAuthenticator = createJwtAuthenticator({ required: false });
