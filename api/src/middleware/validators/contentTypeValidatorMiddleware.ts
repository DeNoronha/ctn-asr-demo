/**
 * Content-Type Validation Middleware Wrapper
 *
 * Integrates existing Content-Type validation into composable middleware pattern.
 * Ensures state-changing requests have proper Content-Type headers.
 */

import { HttpResponseInit } from '@azure/functions';
import { MiddlewareFunction, MiddlewareContext } from '../utils/middlewareTypes';
import { validateContentType, ContentTypeValidationResult } from '../contentTypeValidator';

/**
 * Content-Type validator configuration
 */
export interface ContentTypeValidatorOptions {
  /** Enable Content-Type validation (default: true) */
  enabled?: boolean;
}

/**
 * Create Content-Type validator middleware
 *
 * Validates that state-changing requests (POST, PUT, PATCH, DELETE)
 * have appropriate Content-Type headers (application/json).
 * Returns 415 Unsupported Media Type if validation fails.
 *
 * @param options Content-Type validator configuration
 * @returns Middleware function
 *
 * @example
 * ```typescript
 * const contentTypeValidator = createContentTypeValidator({
 *   enabled: true
 * });
 * ```
 */
export function createContentTypeValidator(
  options: ContentTypeValidatorOptions = {}
): MiddlewareFunction {
  const { enabled = true } = options;

  return async (context: MiddlewareContext, next: () => Promise<HttpResponseInit>) => {
    if (!enabled) {
      return next();
    }

    const { request, invocationContext, requestId } = context;

    // Validate Content-Type for mutation methods
    const contentTypeResult: ContentTypeValidationResult = await validateContentType(
      request,
      invocationContext
    );

    if (!contentTypeResult.valid) {
      const failureResult = contentTypeResult as { valid: false; response: HttpResponseInit };
      const duration = Date.now() - context.startTime;
      invocationContext.warn(`[${requestId}] Content-Type validation failed (${duration}ms)`);

      // Return error response
      return {
        ...failureResult.response,
        headers: {
          ...(failureResult.response.headers || {}),
          'X-Request-ID': requestId,
        },
      };
    }

    // Validation passed, continue to next middleware
    return next();
  };
}

/**
 * Default Content-Type validator middleware
 */
export const contentTypeValidator = createContentTypeValidator({ enabled: true });
