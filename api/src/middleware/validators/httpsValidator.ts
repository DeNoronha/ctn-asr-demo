/**
 * HTTPS Enforcement Middleware
 *
 * Enforces HTTPS in production environments and adds security headers.
 * Implements OWASP security best practices for transport layer security.
 */

import { HttpResponseInit } from '@azure/functions';
import { MiddlewareFunction, MiddlewareContext } from '../utils/middlewareTypes';
import { enforceHttps, addHttpsSecurityHeaders } from '../httpsEnforcement';

/**
 * HTTPS validator configuration
 */
export interface HttpsValidatorOptions {
  /** Enable HTTPS enforcement (default: true in production) */
  enabled?: boolean;
}

/**
 * Create HTTPS enforcement middleware
 *
 * Validates that requests use HTTPS in production environments.
 * If HTTPS is required but not used, returns 403 Forbidden.
 * Adds HTTPS-related security headers to all responses.
 *
 * @param options HTTPS configuration
 * @returns Middleware function
 *
 * @example
 * ```typescript
 * const httpsMiddleware = createHttpsValidator({
 *   enabled: process.env.NODE_ENV === 'production'
 * });
 * ```
 */
export function createHttpsValidator(
  options: HttpsValidatorOptions = {}
): MiddlewareFunction {
  const { enabled = true } = options;

  return async (context: MiddlewareContext, next: () => Promise<HttpResponseInit>) => {
    if (!enabled) {
      return next();
    }

    const { request, invocationContext, requestId } = context;

    // Check if HTTPS is required
    const httpsCheck = enforceHttps(request, invocationContext);

    if (httpsCheck) {
      // HTTPS required but not used - return 403
      invocationContext.warn(`[${requestId}] HTTPS enforcement failed - insecure connection`);

      return {
        ...httpsCheck,
        headers: {
          ...(httpsCheck.headers || {}),
          'X-Request-ID': requestId,
        },
      };
    }

    // HTTPS check passed, continue to next middleware
    const response = await next();

    // Add HTTPS security headers to response
    return addHttpsSecurityHeaders(response);
  };
}

/**
 * Default HTTPS validator middleware
 */
export const httpsValidator = createHttpsValidator({ enabled: true });
