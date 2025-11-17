/**
 * CSRF Validation Middleware
 *
 * Implements double-submit cookie pattern for CSRF protection.
 * Validates CSRF tokens for state-changing requests (POST, PUT, PATCH, DELETE).
 *
 * Security Properties (SEC-004):
 * - Cryptographically secure random tokens (256 bits)
 * - Cookie + Header must match (double-submit pattern)
 * - Constant-time comparison prevents timing attacks
 * - Token expiration enforced (30 minutes)
 */

import { HttpResponseInit } from '@azure/functions';
import { MiddlewareFunction, MiddlewareContext } from '../utils/middlewareTypes';
import { validateCsrfTokens, extractCsrfCookie } from '../../utils/csrf';
import { STATE_CHANGING_METHODS } from '../../config/constants';

/**
 * CSRF validator configuration
 */
export interface CsrfValidatorOptions {
  /** Enable CSRF validation (default: true) */
  enabled?: boolean;

  /** Require authentication before CSRF check (default: true) */
  requireAuth?: boolean;
}

/**
 * Create CSRF validator middleware
 *
 * Validates CSRF tokens for all state-changing requests (POST/PUT/PATCH/DELETE).
 * Implements double-submit cookie pattern:
 * 1. Extract CSRF token from cookie
 * 2. Extract CSRF token from X-CSRF-Token header
 * 3. Validate tokens match using constant-time comparison
 *
 * Returns 403 Forbidden if validation fails.
 *
 * Note: This middleware requires authentication to have already occurred.
 * It expects context.authenticatedRequest to be populated.
 *
 * @param options CSRF validator configuration
 * @returns Middleware function
 *
 * @example
 * ```typescript
 * const csrfMiddleware = createCsrfValidator({
 *   enabled: true,
 *   requireAuth: true
 * });
 * ```
 */
export function createCsrfValidator(
  options: CsrfValidatorOptions = {}
): MiddlewareFunction {
  const {
    enabled = true,
    requireAuth = true,
  } = options;

  return async (context: MiddlewareContext, next: () => Promise<HttpResponseInit>) => {
    if (!enabled) {
      return next();
    }

    const { request, invocationContext, requestId, authenticatedRequest } = context;

    // Only validate CSRF for state-changing methods
    if (!STATE_CHANGING_METHODS.includes(request.method.toUpperCase() as any)) {
      return next();
    }

    // Ensure authentication has occurred (if required)
    if (requireAuth && !authenticatedRequest) {
      invocationContext.error(`[${requestId}] CSRF check failed - no authenticated request`);
      return {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': requestId,
        },
        jsonBody: {
          error: 'unauthorized',
          error_description: 'Authentication required for CSRF validation',
        },
      };
    }

    // Extract CSRF token from cookie
    const cookieHeader = authenticatedRequest?.headers.get('cookie');
    const csrfCookie = extractCsrfCookie(cookieHeader);

    // Extract CSRF token from header
    const csrfHeader = authenticatedRequest?.headers.get('x-csrf-token');

    // Get user ID for validation
    const userId = authenticatedRequest?.userId;

    // Validate double-submit pattern
    const csrfValidation = validateCsrfTokens(
      csrfCookie,
      csrfHeader,
      userId,
      invocationContext
    );

    if (!csrfValidation.valid) {
      const duration = Date.now() - context.startTime;
      invocationContext.warn(
        `[${requestId}] CSRF validation failed: ${csrfValidation.errorCode} (${duration}ms)`
      );

      return {
        status: 403,
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': requestId,
        },
        jsonBody: {
          error: 'forbidden',
          error_description: csrfValidation.error || 'CSRF validation failed',
          error_code: csrfValidation.errorCode,
        },
      };
    }

    // CSRF validation passed - log for audit
    invocationContext.log(
      `[${requestId}] CSRF validation successful for ${authenticatedRequest?.userEmail || userId || 'anonymous'}`
    );

    // Continue to next middleware
    return next();
  };
}

/**
 * Default CSRF validator middleware
 */
export const csrfValidator = createCsrfValidator({
  enabled: true,
  requireAuth: true,
});
