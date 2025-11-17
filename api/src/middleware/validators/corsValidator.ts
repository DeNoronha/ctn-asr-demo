/**
 * CORS Validation Middleware
 *
 * Handles Cross-Origin Resource Sharing (CORS) validation and preflight requests.
 * Implements security best practices:
 * - Validates origin against whitelist
 * - Handles OPTIONS preflight requests
 * - Sets appropriate CORS headers
 * - Supports credentials with origin validation
 */

import { HttpResponseInit } from '@azure/functions';
import { MiddlewareFunction, MiddlewareContext } from '../utils/middlewareTypes';
import { CORS, DEFAULT_CORS_ORIGINS } from '../../config/constants';

/**
 * CORS validator configuration
 */
export interface CorsValidatorOptions {
  /** Enable CORS handling (default: true) */
  enabled?: boolean;

  /** Allowed origins (default: environment-specific whitelist) */
  allowedOrigins?: string[] | readonly string[];
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
 * Get CORS headers based on origin and allowed origins
 */
export function getCorsHeaders(
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
 * Apply CORS headers to an existing response
 */
export function applyCorsHeaders(
  response: HttpResponseInit,
  origin: string | null,
  allowedOrigins: string[] | readonly string[]
): HttpResponseInit {
  const corsHeaders = getCorsHeaders(origin, allowedOrigins);

  return {
    ...response,
    headers: {
      ...corsHeaders,
      ...response.headers,
    },
  };
}

/**
 * Create CORS validator middleware
 *
 * Handles two scenarios:
 * 1. OPTIONS preflight - Returns 204 with CORS headers (short-circuits)
 * 2. Regular request - Adds CORS headers to context for response decoration
 *
 * @param options CORS configuration
 * @returns Middleware function
 *
 * @example
 * ```typescript
 * const corsMiddleware = createCorsValidator({
 *   enabled: true,
 *   allowedOrigins: ['https://example.com']
 * });
 * ```
 */
export function createCorsValidator(
  options: CorsValidatorOptions = {}
): MiddlewareFunction {
  const {
    enabled = true,
    allowedOrigins = DEFAULT_CORS_ORIGINS,
  } = options;

  return async (context: MiddlewareContext, next: () => Promise<HttpResponseInit>) => {
    if (!enabled) {
      return next();
    }

    const { request, requestId } = context;
    const origin = safeGetHeader(request.headers, 'origin');

    // Handle CORS preflight (OPTIONS request)
    if (request.method === 'OPTIONS') {
      context.invocationContext.log(`[${requestId}] CORS preflight request from origin: ${origin}`);

      return {
        status: 204,
        headers: {
          ...getCorsHeaders(origin, allowedOrigins),
          'X-Request-ID': requestId,
        },
      };
    }

    // For non-preflight requests, store CORS headers in metadata
    // They will be applied to the response later
    context.metadata.corsOrigin = origin;
    context.metadata.corsAllowedOrigins = allowedOrigins;

    // Continue to next middleware
    const response = await next();

    // Apply CORS headers to response
    return applyCorsHeaders(response, origin, allowedOrigins);
  };
}

/**
 * Default CORS validator middleware with standard configuration
 */
export const corsValidator = createCorsValidator({
  enabled: true,
  allowedOrigins: DEFAULT_CORS_ORIGINS,
});
