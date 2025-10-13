// ========================================
// Rate Limiting Middleware
// ========================================
// Protects API endpoints from abuse and DoS attacks

import { HttpRequest, InvocationContext } from '@azure/functions';
import { RateLimiterMemory, RateLimiterRes } from 'rate-limiter-flexible';
import { AuthenticatedRequest } from './endpointWrapper';

/**
 * Rate limiter configurations
 */

// General API rate limiter - 100 requests per minute per user
const apiRateLimiter = new RateLimiterMemory({
  points: 100, // Number of requests
  duration: 60, // Per 60 seconds (1 minute)
  blockDuration: 60, // Block for 60 seconds if exceeded
});

// Authentication endpoints - stricter limit (10 per minute)
const authRateLimiter = new RateLimiterMemory({
  points: 10,
  duration: 60,
  blockDuration: 300, // Block for 5 minutes
});

// Token issuance - very strict (5 per hour)
const tokenRateLimiter = new RateLimiterMemory({
  points: 5,
  duration: 3600, // Per hour
  blockDuration: 3600, // Block for 1 hour
});

// Failed authentication attempts - by IP (5 per hour)
const failedAuthRateLimiter = new RateLimiterMemory({
  points: 5,
  duration: 3600,
  blockDuration: 3600,
});

// File upload endpoints - 20 per hour
const uploadRateLimiter = new RateLimiterMemory({
  points: 20,
  duration: 3600,
  blockDuration: 1800, // Block for 30 minutes
});

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

  // Fall back to IP address
  const ip =
    request.headers.get('x-forwarded-for') ||
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
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

    return {
      allowed: true,
      remaining: result.remainingPoints,
      resetTime: new Date(Date.now() + result.msBeforeNext),
    };
  } catch (error) {
    if (error instanceof Error && 'msBeforeNext' in error) {
      const rateLimitError = error as any;
      const resetTime = new Date(Date.now() + rateLimitError.msBeforeNext);

      context.warn(`Rate limit exceeded for ${key}, reset at ${resetTime.toISOString()}`);

      return {
        allowed: false,
        remaining: 0,
        resetTime,
        response: {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': Math.ceil(rateLimitError.msBeforeNext / 1000).toString(),
            'X-RateLimit-Limit': rateLimiter.points.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': resetTime.toISOString(),
          },
          body: JSON.stringify({
            error: 'rate_limit_exceeded',
            error_description: 'Too many requests. Please try again later.',
            retry_after: Math.ceil(rateLimitError.msBeforeNext / 1000),
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
  points: number = 2
): Promise<void> {
  const key = getRateLimitKey(request, context);

  try {
    await failedAuthRateLimiter.consume(key, points);
    context.log(`Penalized ${key} with ${points} points for failed attempt`);
  } catch (error) {
    context.warn(`Failed attempt penalty exceeded for ${key}`);
  }
}
