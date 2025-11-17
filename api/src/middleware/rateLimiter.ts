// ========================================
// Rate Limiting Middleware
// ========================================
// Protects API endpoints from abuse and DoS attacks
//
// **Security Architecture:**
// - Primary: Redis-based distributed rate limiting (sliding window)
// - Fallback: In-memory rate limiting (per-instance, less accurate)
// - Circuit breaker: Fail-closed when Redis unavailable (blocks requests)
//
// **Security Improvements (SEC-007):**
// - FIXED: Fail-open vulnerability (CWE-755) - now fails closed
// - ADDED: Circuit breaker pattern for Redis dependency
// - ADDED: Distributed rate limiting across function instances
// - ADDED: Application Insights monitoring for circuit breaker state

import { HttpRequest, InvocationContext } from '@azure/functions';
import { RateLimiterMemory, RateLimiterRes } from 'rate-limiter-flexible';
import { AuthenticatedRequest } from './endpointWrapper';
import { createLogger, logSecurityEvent } from '../utils/logger';
import { RATE_LIMIT, HTTP_STATUS, CIRCUIT_BREAKER } from '../config/constants';
import {
  CircuitBreaker,
  CircuitBreakerConfig,
  DEFAULT_CIRCUIT_BREAKER_CONFIG,
} from '../utils/circuitBreaker';
import {
  checkRateLimitRedis,
  penalizeRedis,
  isRedisReady,
} from '../utils/redisClient';

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
 * Circuit breaker instances (per-context, created on-demand)
 * Prevents creating circuit breakers during module initialization
 */
const circuitBreakers = new Map<string, CircuitBreaker>();

/**
 * Get or create circuit breaker for rate limiting
 */
function getCircuitBreaker(context: InvocationContext): CircuitBreaker {
  const key = 'RateLimiter';

  if (!circuitBreakers.has(key)) {
    const config: CircuitBreakerConfig = {
      ...DEFAULT_CIRCUIT_BREAKER_CONFIG,
      errorThreshold: CIRCUIT_BREAKER.ERROR_THRESHOLD,
      openDuration: CIRCUIT_BREAKER.OPEN_DURATION_MS,
      halfOpenMaxRequests: CIRCUIT_BREAKER.HALF_OPEN_MAX_REQUESTS,
      monitorWindow: CIRCUIT_BREAKER.MONITOR_WINDOW_MS,
      name: 'RateLimiterCircuitBreaker',
    };

    circuitBreakers.set(key, new CircuitBreaker(config, context));
  }

  return circuitBreakers.get(key)!;
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
 * Get rate limit configuration for a type
 */
function getRateLimitConfig(type: RateLimiterType): { limit: number; windowMs: number } {
  switch (type) {
    case RateLimiterType.AUTH:
      return { limit: RATE_LIMIT.AUTH_POINTS, windowMs: RATE_LIMIT.AUTH_DURATION * 1000 };
    case RateLimiterType.TOKEN:
      return { limit: RATE_LIMIT.TOKEN_POINTS, windowMs: RATE_LIMIT.TOKEN_DURATION * 1000 };
    case RateLimiterType.FAILED_AUTH:
      return {
        limit: RATE_LIMIT.FAILED_AUTH_POINTS,
        windowMs: RATE_LIMIT.FAILED_AUTH_DURATION * 1000,
      };
    case RateLimiterType.UPLOAD:
      return { limit: RATE_LIMIT.UPLOAD_POINTS, windowMs: RATE_LIMIT.UPLOAD_DURATION * 1000 };
    case RateLimiterType.API:
    default:
      return { limit: RATE_LIMIT.API_POINTS, windowMs: RATE_LIMIT.API_DURATION * 1000 };
  }
}

/**
 * Check rate limit for a request
 *
 * **Security Architecture (SEC-007 Fix):**
 * 1. Try Redis-based distributed rate limiting (primary)
 * 2. Circuit breaker wraps Redis calls
 * 3. If circuit OPEN or Redis fails: FAIL CLOSED (503 Service Unavailable)
 * 4. Fallback to in-memory rate limiting ONLY if Redis explicitly disabled
 *
 * **BEFORE (VULNERABLE):**
 * ```
 * catch (error) {
 *   return { allowed: true }; // ❌ Fails open - allows unlimited requests
 * }
 * ```
 *
 * **AFTER (SECURE):**
 * ```
 * catch (error) {
 *   return { allowed: false, response: 503 }; // ✅ Fails closed - blocks requests
 * }
 * ```
 *
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
  const key = getRateLimitKey(request, context);
  const logger = createLogger(context);
  const correlationId = safeGetHeader(request.headers, 'x-correlation-id') || 'unknown';
  const { limit, windowMs } = getRateLimitConfig(type);

  // Prefer Redis for distributed rate limiting
  const useRedis = process.env.REDIS_ENABLED !== 'false'; // Enabled by default

  if (useRedis) {
    const circuitBreaker = getCircuitBreaker(context);

    try {
      // Wrap Redis call in circuit breaker
      const result = await circuitBreaker.execute(async () => {
        return await checkRateLimitRedis(key, limit, windowMs, context);
      });

      if (!result.allowed) {
        // Rate limit exceeded
        const retryAfter = Math.ceil(windowMs / 1000);

        logSecurityEvent(logger, 'Rate Limit Exceeded (Redis)', correlationId, {
          key,
          type,
          limit: limit.toString(),
          remaining: result.remaining.toString(),
          resetTime: result.resetTime.toISOString(),
          retryAfter: retryAfter.toString(),
          ipAddress: safeGetHeader(request.headers, 'x-forwarded-for') || 'unknown',
          userAgent: safeGetHeader(request.headers, 'user-agent') || 'unknown',
          url: request.url,
          method: request.method,
        });

        context.warn(`Rate limit exceeded (Redis) for ${key}, reset at ${result.resetTime.toISOString()}`);

        return {
          allowed: false,
          remaining: 0,
          resetTime: result.resetTime,
          response: {
            status: HTTP_STATUS.TOO_MANY_REQUESTS,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': retryAfter.toString(),
              'X-RateLimit-Limit': limit.toString(),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': result.resetTime.toISOString(),
            },
            body: JSON.stringify({
              error: 'rate_limit_exceeded',
              error_description: 'Too many requests. Please try again later.',
              retry_after: retryAfter,
              reset_time: result.resetTime.toISOString(),
            }),
          },
        };
      }

      // Request allowed
      logger.info('Rate Limit Check Passed (Redis)', {
        key,
        type,
        limit: limit.toString(),
        remaining: result.remaining.toString(),
        resetTime: result.resetTime.toISOString(),
      });

      return {
        allowed: true,
        remaining: result.remaining,
        resetTime: result.resetTime,
      };
    } catch (error) {
      // Circuit breaker OPEN or Redis error
      // **SECURITY FIX (SEC-007): FAIL CLOSED instead of FAIL OPEN**
      logger.error('Rate limiter failed (circuit breaker OPEN or Redis error)', error, {
        key,
        type,
        circuitBreakerState: circuitBreaker.getState(),
        correlationId,
      });

      logSecurityEvent(logger, 'Rate Limiter Service Unavailable', correlationId, {
        key,
        type,
        circuitBreakerState: circuitBreaker.getState(),
        errorMessage: error instanceof Error ? error.message : String(error),
        url: request.url,
        method: request.method,
      });

      // FAIL CLOSED: Return 503 Service Unavailable
      return {
        allowed: false,
        remaining: 0,
        resetTime: new Date(Date.now() + 60000), // Try again in 60 seconds
        response: {
          status: HTTP_STATUS.SERVICE_UNAVAILABLE,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': '60',
          },
          body: JSON.stringify({
            error: 'service_unavailable',
            error_description:
              'Rate limiting service is temporarily unavailable. Please try again later.',
            retry_after: 60,
          }),
        },
      };
    }
  }

  // Fallback to in-memory rate limiting (if Redis explicitly disabled)
  const rateLimiter = getRateLimiter(type);

  try {
    const result: RateLimiterRes = await rateLimiter.consume(key, 1);

    logger.info('Rate Limit Check Passed (In-Memory)', {
      key,
      type,
      limit: rateLimiter.points.toString(),
      remaining: result.remainingPoints.toString(),
      resetTime: new Date(Date.now() + result.msBeforeNext).toISOString(),
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

      logSecurityEvent(logger, 'Rate Limit Exceeded (In-Memory)', correlationId, {
        key,
        type,
        limit: rateLimiter.points.toString(),
        remaining: '0',
        resetTime: resetTime.toISOString(),
        retryAfter: retryAfter.toString(),
        ipAddress: safeGetHeader(request.headers, 'x-forwarded-for') || 'unknown',
        userAgent: safeGetHeader(request.headers, 'user-agent') || 'unknown',
        url: request.url,
        method: request.method,
      });

      context.warn(`Rate limit exceeded (In-Memory) for ${key}, reset at ${resetTime.toISOString()}`);

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

    // Unknown error in in-memory rate limiter
    // This should never happen, but fail closed for safety
    logger.error('In-memory rate limiter error', error, { key, type, correlationId });

    return {
      allowed: false,
      remaining: 0,
      resetTime: new Date(Date.now() + 60000),
      response: {
        status: HTTP_STATUS.SERVICE_UNAVAILABLE,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': '60',
        },
        body: JSON.stringify({
          error: 'service_unavailable',
          error_description: 'Rate limiting service error. Please try again later.',
          retry_after: 60,
        }),
      },
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
 *
 * Uses Redis when available, falls back to in-memory
 */
export async function penalizeFailedAttempt(
  request: HttpRequest | AuthenticatedRequest,
  context: InvocationContext,
  points: number = RATE_LIMIT.PENALTY_POINTS
): Promise<void> {
  const key = getRateLimitKey(request, context);
  const useRedis = process.env.REDIS_ENABLED !== 'false';

  if (useRedis) {
    try {
      const circuitBreaker = getCircuitBreaker(context);
      await circuitBreaker.execute(async () => {
        return await penalizeRedis(
          key,
          points,
          RATE_LIMIT.FAILED_AUTH_DURATION * 1000,
          context
        );
      });
      context.log(`Penalized ${key} with ${points} points (Redis)`);
    } catch (error) {
      // Circuit breaker open or Redis error
      // Continue execution (penalty is best-effort, not critical)
      context.warn(`Failed to penalize ${key} via Redis, circuit may be open:`, error);

      // Fallback to in-memory
      try {
        await failedAuthRateLimiter.consume(key, points);
        context.log(`Penalized ${key} with ${points} points (In-Memory fallback)`);
      } catch (fallbackError) {
        context.warn(`In-memory penalty also failed for ${key}`);
      }
    }
  } else {
    // Use in-memory directly
    try {
      await failedAuthRateLimiter.consume(key, points);
      context.log(`Penalized ${key} with ${points} points (In-Memory)`);
    } catch (error) {
      context.warn(`Failed attempt penalty exceeded for ${key}`);
    }
  }
}
