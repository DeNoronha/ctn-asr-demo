/**
 * Middleware Composition Utility
 *
 * Provides a clean, functional way to compose middleware into a single handler.
 * Implements chain-of-responsibility pattern with support for:
 * - Short-circuiting (middleware can return early)
 * - Context propagation
 * - Error handling
 * - Performance tracking
 */

import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import {
  MiddlewareFunction,
  MiddlewareContext,
  BusinessLogicHandler,
} from './middlewareTypes';
import { getRequestId } from '../../utils/requestId';
import { handleError } from '../../utils/errors';
import { applySecurityHeaders } from '../securityHeaders';
import { formatCsrfCookie } from '../../utils/csrf';

/**
 * Compose multiple middleware functions into a single handler
 *
 * Middleware are executed in order. Each middleware can either:
 * 1. Return a response (short-circuit the chain)
 * 2. Call next() to continue to the next middleware
 *
 * The final middleware in the chain is the business logic handler.
 *
 * @param middlewares Array of middleware functions to compose
 * @param handler Business logic handler (receives authenticated request)
 * @returns Composed Azure Functions handler
 *
 * @example
 * ```typescript
 * const handler = composeMiddleware(
 *   [
 *     corsValidator,
 *     httpsValidator,
 *     rateLimiter,
 *     jwtAuthenticator,
 *     adminAuthorizer,
 *     csrfValidator,
 *   ],
 *   async (req, ctx) => {
 *     // Business logic here
 *     return { status: 200, jsonBody: { success: true } };
 *   }
 * );
 * ```
 */
export function composeMiddleware(
  middlewares: MiddlewareFunction[],
  handler: BusinessLogicHandler
): (request: HttpRequest, context: InvocationContext) => Promise<HttpResponseInit> {
  return async (request: HttpRequest, invocationContext: InvocationContext) => {
    const startTime = Date.now();
    const requestId = getRequestId(request);

    invocationContext.log(`[${requestId}] ${request.method} ${request.url} - Processing started`);

    // Initialize middleware context
    const middlewareContext: MiddlewareContext = {
      request,
      invocationContext,
      requestId,
      startTime,
      metadata: {},
    };

    try {
      let currentIndex = 0;

      // Define the next() function that advances through middleware chain
      const next = async (): Promise<HttpResponseInit> => {
        // If we've reached the end of middleware chain, execute business logic
        if (currentIndex >= middlewares.length) {
          if (!middlewareContext.authenticatedRequest) {
            throw new Error('Business logic requires authenticated request');
          }

          return handler(middlewareContext.authenticatedRequest, invocationContext);
        }

        // Get current middleware and advance index
        const middleware = middlewares[currentIndex];
        currentIndex++;

        // Execute middleware
        return middleware(middlewareContext, next);
      };

      // Start middleware chain execution
      let response = await next();

      // Post-processing: Add CSRF token cookie if needed (SEC-004)
      if (middlewareContext.csrfTokenToSet) {
        const csrfCookie = formatCsrfCookie(middlewareContext.csrfTokenToSet);

        response.headers = {
          ...response.headers,
          'Set-Cookie': csrfCookie,
        };

        invocationContext.log(
          `[${requestId}] CSRF token set for ${middlewareContext.authenticatedRequest?.userEmail || middlewareContext.authenticatedRequest?.userId}`
        );
      }

      // Post-processing: Add request ID to response
      response.headers = {
        ...response.headers,
        'X-Request-ID': requestId,
      };

      // Post-processing: Apply security headers
      response = applySecurityHeaders(response);

      const duration = Date.now() - startTime;
      invocationContext.log(`[${requestId}] ${request.method} ${request.url} - Completed (${duration}ms)`);

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      invocationContext.error(`[${requestId}] ${request.method} ${request.url} - Error (${duration}ms):`, error);

      // Use standardized error handling
      let errorResponse = handleError(error, invocationContext, requestId);

      // Apply security headers to error response
      errorResponse = applySecurityHeaders(errorResponse);

      return errorResponse;
    }
  };
}

/**
 * Create a middleware wrapper for business logic
 *
 * Converts a business logic handler into a middleware function.
 * Useful for consistency when mixing middleware and handlers.
 *
 * @param handler Business logic handler
 * @returns Middleware function
 */
export function wrapBusinessLogic(handler: BusinessLogicHandler): MiddlewareFunction {
  return async (context: MiddlewareContext) => {
    if (!context.authenticatedRequest) {
      throw new Error('Business logic requires authenticated request');
    }

    return handler(context.authenticatedRequest, context.invocationContext);
  };
}
