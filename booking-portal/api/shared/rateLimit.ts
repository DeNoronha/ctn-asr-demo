/**
 * Rate Limiting Middleware
 *
 * Implements sliding window rate limiting to prevent DoS attacks and control API costs.
 *
 * Features:
 * - Per-user rate limiting (keyed by userId + tenantId)
 * - Sliding window algorithm (more accurate than fixed window)
 * - Configurable limits per endpoint type
 * - Standard HTTP 429 responses with Retry-After header
 * - In-memory storage (can be upgraded to Redis for distributed scenarios)
 *
 * Security Considerations:
 * - Rate limiting applied AFTER authentication (prevents auth bypass)
 * - Separate limits for upload (expensive) vs read operations
 * - Logs rate limit violations for monitoring
 * - Auto-cleanup of expired entries to prevent memory leaks
 *
 * @module shared/rateLimit
 */

import { Context, HttpRequest } from '@azure/functions';
import { HTTP_STATUS, ERROR_MESSAGES, RATE_LIMIT_CONFIG } from './constants';
import { AuthenticatedUser } from './auth';

/**
 * Rate limit tier (determines which limits to apply)
 */
export type RateLimitTier = 'UPLOAD' | 'READ' | 'WRITE' | 'ADMIN';

/**
 * Request entry in the sliding window
 */
interface RequestEntry {
    timestamp: number;
}

/**
 * User's request history for rate limiting
 */
interface RateLimitEntry {
    requests: RequestEntry[];
    lastCleanup: number;
}

/**
 * In-memory rate limit store
 * Key format: "{userId}:{tenantId}:{tier}"
 */
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Cleanup interval: Remove expired entries every 5 minutes
 */
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastGlobalCleanup = Date.now();

/**
 * Generate rate limit key for user + tenant + tier
 */
function getRateLimitKey(user: AuthenticatedUser, tier: RateLimitTier): string {
    return `${user.userId}:${user.tenantId}:${tier}`;
}

/**
 * Get rate limit configuration for tier
 */
function getRateLimitConfig(tier: RateLimitTier): { MAX_REQUESTS: number; WINDOW_MS: number } {
    return RATE_LIMIT_CONFIG[tier];
}

/**
 * Clean up expired requests from the sliding window
 */
function cleanupExpiredRequests(entry: RateLimitEntry, windowMs: number): void {
    const now = Date.now();
    const cutoff = now - windowMs;

    entry.requests = entry.requests.filter(req => req.timestamp > cutoff);
    entry.lastCleanup = now;
}

/**
 * Perform global cleanup of expired entries
 * Runs every CLEANUP_INTERVAL_MS to prevent memory leaks
 */
function performGlobalCleanup(): void {
    const now = Date.now();

    if (now - lastGlobalCleanup < CLEANUP_INTERVAL_MS) {
        return;
    }

    let removedCount = 0;

    for (const [key, entry] of rateLimitStore.entries()) {
        // If entry has no requests and hasn't been accessed in 1 hour, remove it
        if (entry.requests.length === 0 && now - entry.lastCleanup > 3600000) {
            rateLimitStore.delete(key);
            removedCount++;
        }
    }

    lastGlobalCleanup = now;

    if (removedCount > 0) {
        console.log(`[RateLimit] Global cleanup removed ${removedCount} expired entries`);
    }
}

/**
 * Check if user is within rate limit for the specified tier
 *
 * @param user - Authenticated user
 * @param tier - Rate limit tier to check
 * @returns Object with allowed status and retry information
 */
export function checkRateLimit(
    user: AuthenticatedUser,
    tier: RateLimitTier
): {
    allowed: boolean;
    remaining: number;
    resetAt: number;
    retryAfter?: number;
} {
    // If rate limiting is disabled (e.g., for testing), allow all requests
    if (!RATE_LIMIT_CONFIG.ENABLED) {
        return {
            allowed: true,
            remaining: 9999,
            resetAt: Date.now() + 60000
        };
    }

    const config = getRateLimitConfig(tier);
    const key = getRateLimitKey(user, tier);
    const now = Date.now();

    // Get or create rate limit entry
    let entry = rateLimitStore.get(key);
    if (!entry) {
        entry = {
            requests: [],
            lastCleanup: now
        };
        rateLimitStore.set(key, entry);
    }

    // Clean up expired requests
    cleanupExpiredRequests(entry, config.WINDOW_MS);

    // Perform global cleanup periodically
    performGlobalCleanup();

    // Count requests in current window
    const requestCount = entry.requests.length;

    // Calculate remaining requests
    const remaining = Math.max(0, config.MAX_REQUESTS - requestCount);

    // Calculate reset time (when oldest request expires)
    const oldestRequest = entry.requests[0];
    const resetAt = oldestRequest
        ? oldestRequest.timestamp + config.WINDOW_MS
        : now + config.WINDOW_MS;

    // Check if limit exceeded
    if (requestCount >= config.MAX_REQUESTS) {
        const retryAfter = Math.ceil((resetAt - now) / 1000); // seconds

        return {
            allowed: false,
            remaining: 0,
            resetAt,
            retryAfter
        };
    }

    // Add new request to window
    entry.requests.push({ timestamp: now });

    return {
        allowed: true,
        remaining: remaining - 1, // -1 because we just added current request
        resetAt
    };
}

/**
 * Rate limit middleware for Azure Functions
 *
 * Usage in function endpoint:
 * ```typescript
 * const rateLimitResult = applyRateLimit(context, req, user, 'UPLOAD');
 * if (rateLimitResult) {
 *     context.res = rateLimitResult;
 *     return;
 * }
 * ```
 *
 * @param context - Azure Function context
 * @param req - HTTP request
 * @param user - Authenticated user (must be authenticated before rate limiting)
 * @param tier - Rate limit tier to apply
 * @returns HTTP response object if rate limit exceeded, null if allowed
 */
export function applyRateLimit(
    context: Context,
    req: HttpRequest,
    user: AuthenticatedUser,
    tier: RateLimitTier
): { status: number; headers: Record<string, string>; body: any } | null {
    const result = checkRateLimit(user, tier);

    // Add rate limit headers to response (informational)
    const headers = {
        'X-RateLimit-Limit': getRateLimitConfig(tier).MAX_REQUESTS.toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': new Date(result.resetAt).toISOString()
    };

    if (!result.allowed) {
        // Log rate limit violation
        context.log.warn(
            `[RateLimit] User ${user.email} (${user.userId}) exceeded ${tier} rate limit. ` +
            `Retry after ${result.retryAfter} seconds.`
        );

        // Return 429 Too Many Requests with Retry-After header
        return {
            status: HTTP_STATUS.TOO_MANY_REQUESTS,
            headers: {
                ...headers,
                'Retry-After': result.retryAfter!.toString()
            },
            body: {
                error: ERROR_MESSAGES.RATE_LIMIT_EXCEEDED,
                retryAfter: result.retryAfter,
                resetAt: new Date(result.resetAt).toISOString()
            }
        };
    }

    // Request allowed - store headers for later use (if needed)
    // Note: Azure Functions doesn't have middleware chain like Express,
    // so caller needs to add these headers to final response
    (req as any).rateLimitHeaders = headers;

    return null;
}

/**
 * Get rate limit headers from request (if available)
 *
 * Use this to add rate limit headers to successful responses:
 * ```typescript
 * context.res = {
 *     status: 200,
 *     headers: getRateLimitHeaders(req),
 *     body: data
 * };
 * ```
 */
export function getRateLimitHeaders(req: HttpRequest): Record<string, string> {
    return (req as any).rateLimitHeaders || {};
}

/**
 * Reset rate limit for a user (admin function)
 *
 * Useful for testing or manual intervention.
 *
 * @param user - User to reset limits for
 * @param tier - Specific tier to reset, or undefined to reset all tiers
 */
export function resetRateLimit(user: AuthenticatedUser, tier?: RateLimitTier): void {
    if (tier) {
        const key = getRateLimitKey(user, tier);
        rateLimitStore.delete(key);
    } else {
        // Reset all tiers for user
        const tiers: RateLimitTier[] = ['UPLOAD', 'READ', 'WRITE', 'ADMIN'];
        for (const t of tiers) {
            const key = getRateLimitKey(user, t);
            rateLimitStore.delete(key);
        }
    }
}

/**
 * Get current rate limit status for user (admin/monitoring function)
 */
export function getRateLimitStatus(user: AuthenticatedUser, tier: RateLimitTier): {
    requestCount: number;
    limit: number;
    remaining: number;
    resetAt: number;
} {
    const config = getRateLimitConfig(tier);
    const key = getRateLimitKey(user, tier);
    const entry = rateLimitStore.get(key);

    if (!entry) {
        return {
            requestCount: 0,
            limit: config.MAX_REQUESTS,
            remaining: config.MAX_REQUESTS,
            resetAt: Date.now() + config.WINDOW_MS
        };
    }

    // Clean up expired requests
    cleanupExpiredRequests(entry, config.WINDOW_MS);

    const requestCount = entry.requests.length;
    const remaining = Math.max(0, config.MAX_REQUESTS - requestCount);
    const oldestRequest = entry.requests[0];
    const resetAt = oldestRequest
        ? oldestRequest.timestamp + config.WINDOW_MS
        : Date.now() + config.WINDOW_MS;

    return {
        requestCount,
        limit: config.MAX_REQUESTS,
        remaining,
        resetAt
    };
}
