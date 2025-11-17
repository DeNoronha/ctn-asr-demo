/**
 * Rate Limiter Middleware Wrapper
 *
 * Integrates existing rate limiter functionality into composable middleware pattern.
 * Provides protection against abuse and DDoS attacks.
 */

import { HttpResponseInit } from '@azure/functions';
import { MiddlewareFunction, MiddlewareContext } from '../utils/middlewareTypes';
import { checkRateLimit, RateLimiterType } from '../rateLimiter';
import { RATE_LIMIT } from '../../config/constants';

/**
 * Rate limiter configuration
 */
export interface RateLimiterOptions {
  /** Enable rate limiting (default: true) */
  enabled?: boolean;

  /** Type of rate limiter to use */
  type?: RateLimiterType;
}

/**
 * Create rate limiter middleware
 *
 * Enforces rate limits based on IP address and endpoint type.
 * If rate limit exceeded, returns 429 Too Many Requests.
 * Adds rate limit headers to successful responses.
 *
 * @param options Rate limiter configuration
 * @returns Middleware function
 *
 * @example
 * ```typescript
 * const rateLimiter = createRateLimiter({
 *   enabled: true,
 *   type: RateLimiterType.API
 * });
 * ```
 */
export function createRateLimiter(
  options: RateLimiterOptions = {}
): MiddlewareFunction {
  const {
    enabled = true,
    type = RateLimiterType.API,
  } = options;

  return async (context: MiddlewareContext, next: () => Promise<HttpResponseInit>) => {
    if (!enabled) {
      return next();
    }

    const { request, invocationContext, requestId } = context;

    // Check rate limit
    const rateLimitResult = await checkRateLimit(request, invocationContext, type);

    if (!rateLimitResult.allowed && rateLimitResult.response) {
      const duration = Date.now() - context.startTime;
      invocationContext.warn(`[${requestId}] Rate limit exceeded (${duration}ms)`);

      // Return rate limit error response
      return {
        ...rateLimitResult.response,
        headers: {
          ...(rateLimitResult.response.headers || {}),
          'X-Request-ID': requestId,
        },
      };
    }

    // Store rate limit info in context for response headers
    context.rateLimit = {
      allowed: true,
      remaining: rateLimitResult.remaining,
      resetTime: rateLimitResult.resetTime,
    };

    // Continue to next middleware
    const response = await next();

    // Add rate limit headers to response
    if (context.rateLimit.allowed) {
      return {
        ...response,
        headers: {
          ...response.headers,
          'X-RateLimit-Limit': RATE_LIMIT.API_POINTS.toString(),
          'X-RateLimit-Remaining': context.rateLimit.remaining.toString(),
          'X-RateLimit-Reset': context.rateLimit.resetTime.toISOString(),
        },
      };
    }

    return response;
  };
}

/**
 * Default rate limiter middleware (API type)
 */
export const rateLimiter = createRateLimiter({
  enabled: true,
  type: RateLimiterType.API,
});

/**
 * Auth-specific rate limiter (stricter limits)
 */
export const authRateLimiter = createRateLimiter({
  enabled: true,
  type: RateLimiterType.AUTH,
});

/**
 * Token issuance rate limiter (very strict)
 */
export const tokenRateLimiter = createRateLimiter({
  enabled: true,
  type: RateLimiterType.TOKEN,
});
