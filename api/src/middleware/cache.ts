import type { Request, Response, NextFunction } from 'express';
import { getCache, setCache, CacheTTL } from '../utils/cache';

/**
 * Cache middleware for GET requests
 *
 * Usage:
 * router.get('/endpoint', cacheMiddleware(CacheTTL.MEMBER_PROFILE), handler);
 */
export function cacheMiddleware(ttl: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Generate cache key from request URL and user
    const userClaim = (req as any).user;
    const userId = userClaim?.oid || userClaim?.sub || 'anonymous';
    const cacheKey = `${req.originalUrl}:${userId}`;

    // Try to get from cache
    const cachedResponse = getCache<any>(cacheKey);
    if (cachedResponse) {
      // Cache hit - return cached response
      return res.json(cachedResponse);
    }

    // Cache miss - intercept res.json to cache the response
    const originalJson = res.json.bind(res);
    res.json = function (body: any) {
      // Store in cache before sending response
      setCache(cacheKey, body, ttl);
      return originalJson(body);
    };

    next();
  };
}

/**
 * Invalidate cache for a specific resource pattern
 *
 * Usage in POST/PUT/DELETE handlers:
 * invalidateCacheForUser(req, '/member-contacts');
 */
export function invalidateCacheForUser(req: Request, pattern: string): void {
  const { invalidateCachePattern } = require('../utils/cache');
  const userClaim = (req as any).user;
  const userId = userClaim?.oid || userClaim?.sub;
  if (userId) {
    invalidateCachePattern(`${pattern}:${userId}`);
  }
}
