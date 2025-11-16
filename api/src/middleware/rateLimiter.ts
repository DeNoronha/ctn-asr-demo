// ========================================
// Rate Limiting Middleware
// ========================================
// Protects API endpoints from abuse and DoS attacks

import { HttpRequest, InvocationContext } from '@azure/functions';
import { RateLimiterMemory, RateLimiterRes } from 'rate-limiter-flexible';
import { AuthenticatedRequest } from './endpointWrapper';
import { createLogger, logSecurityEvent } from '../utils/logger';
import { RATE_LIMIT, HTTP_STATUS } from '../config/constants';

/**
 * Rate limiter configurations
 */

// General API rate limiter - 100 requests per minute per user
const apiRateLimiter = new RateLimiterMemory({
  points: RATE_LIMIT.API_POINTS,
  duration: RATE_LIMIT.API_DURATION,
  blockDuration: RATE_LIMIT.API_BLOCK_DURATION,
});

// Authentication endpoints - stricter limit (10 per minute)
const authRateLimiter = new RateLimiterMemory({
  points: RATE_LIMIT.AUTH_POINTS,
  duration: RATE_LIMIT.AUTH_DURATION,
  blockDuration: RATE_LIMIT.AUTH_BLOCK_DURATION,
});

// Token issuance - very strict (5 per hour)
const tokenRateLimiter = new RateLimiterMemory({
  points: RATE_LIMIT.TOKEN_POINTS,
  duration: RATE_LIMIT.TOKEN_DURATION,
  blockDuration: RATE_LIMIT.TOKEN_BLOCK_DURATION,
});

// Failed authentication attempts - by IP (5 per hour)
const failedAuthRateLimiter = new RateLimiterMemory({
  points: RATE_LIMIT.FAILED_AUTH_POINTS,
  duration: RATE_LIMIT.FAILED_AUTH_DURATION,
  blockDuration: RATE_LIMIT.FAILED_AUTH_BLOCK_DURATION,
});

// File upload endpoints - 20 per hour
const uploadRateLimiter = new RateLimiterMemory({
  points: RATE_LIMIT.UPLOAD_POINTS,
  duration: RATE_LIMIT.UPLOAD_DURATION,
  blockDuration: RATE_LIMIT.UPLOAD_BLOCK_DURATION,
});

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
 * Rate limiter types
 */
export enum RateLimiterType {
  API = 'api',
  AUTH = 'auth',
  TOKEN = 'token',
  FAILED_AUTH = 'failed_auth',
  UPLOAD = 'upload',
}

/**
 * Get appropriate rate limiter instance
 */
function getRateLimiter(type: RateLimiterType): RateLimiterMemory {
  switch (type) {
    case RateLimiterType.AUTH:
      return authRateLimiter;
    case RateLimiterType.TOKEN:
      return tokenRateLimiter;
    case RateLimiterType.FAILED_AUTH:
      return failedAuthRateLimiter;
    case RateLimiterType.UPLOAD:
      return uploadRateLimiter;
    case RateLimiterType.API:
    default:
      return apiRateLimiter;
  }
}

/**
 * Get rate limit key from request
 * Uses user ID if authenticated, otherwise IP address
 */
function getRateLimitKey(
  request: HttpRequest | AuthenticatedRequest,
  context: InvocationContext
): string {
  // Try to get user ID from authenticated request
  const authRequest = request as AuthenticatedRequest;
  if (authRequest.userId) {
    return `user:${authRequest.userId}`;
  }

  // Fall back to IP address (safe header access)
  const ip =
    safeGetHeader(request.headers, 'x-forwarded-for') ||
    safeGetHeader(request.headers, 'x-real-ip') ||
    safeGetHeader(request.headers, 'cf-connecting-ip') ||
    'unknown';

  return `ip:${ip}`;
}

/**
 * Check rate limit for a request
 * @param request HTTP request
 * @param context Invocation context
 * @param type Rate limiter type
 * @returns Object with allowed status and remaining points
 */
export async function checkRateLimit(
  request: HttpRequest | AuthenticatedRequest,
  context: InvocationContext,
  type: RateLimiterType = RateLimiterType.API
): Promise<{
  allowed: boolean;
  remaining: number;
  resetTime: Date;
  response?: any;
}> {
  const rateLimiter = getRateLimiter(type);
  const key = getRateLimitKey(request, context);

  try {
    const result: RateLimiterRes = await rateLimiter.consume(key, 1);

    context.log(`Rate limit check passed for ${key}: ${result.remainingPoints} remaining`);

    // Log rate limit headers for monitoring
    const logger = createLogger(context);
    logger.info('Rate Limit Headers', {
      key,
      type,
      'X-RateLimit-Limit': rateLimiter.points.toString(),
      'X-RateLimit-Remaining': result.remainingPoints.toString(),
      'X-RateLimit-Reset': new Date(Date.now() + result.msBeforeNext).toISOString(),
    });

    return {
      allowed: true,
      remaining: result.remainingPoints,
      resetTime: new Date(Date.now() + result.msBeforeNext),
    };
  } catch (error) {
    if (error instanceof Error && 'msBeforeNext' in error) {
      const rateLimitError = error as any;
      const resetTime = new Date(Date.now() + rateLimitError.msBeforeNext);
      const retryAfter = Math.ceil(rateLimitError.msBeforeNext / 1000);

      // Log rate limit exceeded to Application Insights with severity=warning
      const logger = createLogger(context);
      const correlationId = safeGetHeader(request.headers, 'x-correlation-id') || 'unknown';

      logSecurityEvent(logger, 'Rate Limit Exceeded', correlationId, {
        key,
        type,
        'X-RateLimit-Limit': rateLimiter.points.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': resetTime.toISOString(),
        'Retry-After': retryAfter.toString(),
        ipAddress: safeGetHeader(request.headers, 'x-forwarded-for') || 'unknown',
        userAgent: safeGetHeader(request.headers, 'user-agent') || 'unknown',
        url: request.url,
        method: request.method,
      });

      context.warn(`Rate limit exceeded for ${key}, reset at ${resetTime.toISOString()}`);

      return {
        allowed: false,
        remaining: 0,
        resetTime,
        response: {
          status: HTTP_STATUS.TOO_MANY_REQUESTS,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Limit': rateLimiter.points.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': resetTime.toISOString(),
          },
          body: JSON.stringify({
            error: 'rate_limit_exceeded',
            error_description: 'Too many requests. Please try again later.',
            retry_after: retryAfter,
            reset_time: resetTime.toISOString(),
          }),
        },
      };
    }

    // Unknown error
    context.error('Error checking rate limit:', error);
    return {
      allowed: true, // Fail open to avoid blocking legitimate requests
      remaining: -1,
      resetTime: new Date(),
    };
  }
}

/**
 * Rate limit middleware wrapper
 * Can be used to wrap endpoint handlers
 */
export function withRateLimit(
  type: RateLimiterType = RateLimiterType.API
): (
  request: HttpRequest | AuthenticatedRequest,
  context: InvocationContext
) => Promise<{ allowed: boolean; response?: any }> {
  return async (
    request: HttpRequest | AuthenticatedRequest,
    context: InvocationContext
  ) => {
    const result = await checkRateLimit(request, context, type);

    if (!result.allowed && result.response) {
      return {
        allowed: false,
        response: result.response,
      };
    }

    return { allowed: true };
  };
}

/**
 * Add rate limit headers to response
 */
export function addRateLimitHeaders(
  response: any,
  remaining: number,
  resetTime: Date,
  limit: number
): any {
  return {
    ...response,
    headers: {
      ...response.headers,
      'X-RateLimit-Limit': limit.toString(),
      'X-RateLimit-Remaining': remaining.toString(),
      'X-RateLimit-Reset': resetTime.toISOString(),
    },
  };
}

/**
 * Penalty for failed operations (e.g., failed auth attempts)
 * Consumes additional points to slow down attackers
 */
export async function penalizeFailedAttempt(
  request: HttpRequest | AuthenticatedRequest,
  context: InvocationContext,
  points: number = RATE_LIMIT.PENALTY_POINTS
): Promise<void> {
  const key = getRateLimitKey(request, context);

  try {
    await failedAuthRateLimiter.consume(key, points);
    context.log(`Penalized ${key} with ${points} points for failed attempt`);
  } catch (error) {
    context.warn(`Failed attempt penalty exceeded for ${key}`);
  }
}
