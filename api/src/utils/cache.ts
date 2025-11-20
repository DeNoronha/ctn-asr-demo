import NodeCache from 'node-cache';

/**
 * In-memory cache for API responses
 *
 * Cache Strategy:
 * - Member profile: 5 minutes (changes infrequently)
 * - Contacts: 5 minutes (changes infrequently)
 * - Endpoints: 5 minutes (changes infrequently)
 * - Identifiers: 10 minutes (rarely changes)
 * - KvK status: 15 minutes (rarely changes, verification is slow)
 * - M2M clients: 5 minutes (changes when secrets regenerated)
 *
 * Cache is invalidated on:
 * - POST (create)
 * - PUT (update)
 * - DELETE operations
 */

// Create cache instance with default TTL of 5 minutes
const cache = new NodeCache({
  stdTTL: 300, // 5 minutes default
  checkperiod: 60, // Check for expired keys every 60 seconds
  useClones: false, // Don't clone data (better performance)
});

/**
 * Cache TTL configurations (in seconds)
 */
export const CacheTTL = {
  MEMBER_PROFILE: 300,    // 5 minutes
  CONTACTS: 300,          // 5 minutes
  ENDPOINTS: 300,         // 5 minutes
  IDENTIFIERS: 600,       // 10 minutes
  KVK_STATUS: 900,        // 15 minutes
  M2M_CLIENTS: 300,       // 5 minutes
  DNS_TOKENS: 300,        // 5 minutes
};

/**
 * Generate cache key for a resource
 */
export function getCacheKey(resource: string, id: string, suffix?: string): string {
  return suffix ? `${resource}:${id}:${suffix}` : `${resource}:${id}`;
}

/**
 * Get value from cache
 */
export function getCache<T>(key: string): T | undefined {
  return cache.get<T>(key);
}

/**
 * Set value in cache with optional TTL
 */
export function setCache<T>(key: string, value: T, ttl?: number): boolean {
  if (ttl) {
    return cache.set(key, value, ttl);
  }
  return cache.set(key, value);
}

/**
 * Delete specific key from cache
 */
export function deleteCache(key: string): number {
  return cache.del(key);
}

/**
 * Delete all keys matching a pattern
 * Example: invalidateCachePattern('member:abc123') deletes all keys starting with 'member:abc123'
 */
export function invalidateCachePattern(pattern: string): number {
  const keys = cache.keys().filter(key => key.startsWith(pattern));
  return cache.del(keys);
}

/**
 * Clear all cache
 */
export function clearCache(): void {
  cache.flushAll();
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  return cache.getStats();
}

export default cache;
