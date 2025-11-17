// ========================================
// Redis Client Configuration
// ========================================
// Provides centralized Redis connection management for distributed
// rate limiting across Azure Function instances.
//
// **Security Benefits:**
// - Distributed rate limiting (prevents bypass via horizontal scaling)
// - Sliding window algorithm (more accurate than fixed windows)
// - Connection pooling and automatic reconnection
// - TLS/SSL support for encrypted connections
//
// **Architecture:**
// Azure Functions → Redis Cache → Sliding Window Rate Limit Check
//
// Multiple function instances share the same Redis state, ensuring
// consistent rate limiting regardless of load balancer routing.

import Redis from 'ioredis';
import { InvocationContext } from '@azure/functions';

let redisClient: Redis | null = null;

/**
 * Redis connection configuration
 */
interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  tls?: boolean;
  db?: number;
  keyPrefix?: string;
  connectTimeout?: number;
  maxRetriesPerRequest?: number;
}

/**
 * Get or create Redis client singleton
 *
 * **Environment Variables:**
 * - REDIS_HOST: Redis server hostname (required)
 * - REDIS_PORT: Redis server port (default: 6380 for Azure Redis)
 * - REDIS_PASSWORD: Redis authentication password (required for Azure)
 * - REDIS_TLS: Enable TLS (default: true for Azure Redis)
 * - REDIS_DB: Database number (default: 0)
 *
 * **Azure Redis Cache Configuration:**
 * Azure Redis Cache requires TLS and authentication by default.
 * Connection string format: {name}.redis.cache.windows.net:6380
 *
 * @param context Invocation context for logging
 * @returns Redis client instance
 */
export function getRedisClient(context?: InvocationContext): Redis {
  if (redisClient && redisClient.status === 'ready') {
    return redisClient;
  }

  // Parse configuration from environment variables
  const config: RedisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6380'), // Azure Redis default port
    password: process.env.REDIS_PASSWORD,
    tls: process.env.REDIS_TLS === 'true' || process.env.REDIS_TLS === undefined,
    db: parseInt(process.env.REDIS_DB || '0'),
    keyPrefix: process.env.REDIS_KEY_PREFIX || 'asr:ratelimit:',
    connectTimeout: 10000, // 10 seconds
    maxRetriesPerRequest: 3,
  };

  // Validate required configuration
  if (!config.host) {
    throw new Error('REDIS_HOST environment variable is required');
  }

  // Azure Redis Cache requires password
  if (config.tls && !config.password) {
    console.warn('[Redis] TLS enabled but no password provided. This is insecure for production.');
  }

  // Create Redis client
  redisClient = new Redis({
    host: config.host,
    port: config.port,
    password: config.password,
    db: config.db,
    keyPrefix: config.keyPrefix,
    connectTimeout: config.connectTimeout,
    maxRetriesPerRequest: config.maxRetriesPerRequest,
    retryStrategy: (times: number) => {
      const delay = Math.min(times * 50, 2000);
      if (context) {
        context.warn(`[Redis] Retry attempt ${times}, waiting ${delay}ms`);
      }
      return delay;
    },
    tls: config.tls
      ? {
          // Azure Redis Cache TLS configuration
          rejectUnauthorized: true, // Validate server certificate
        }
      : undefined,
    lazyConnect: false, // Connect immediately
    enableReadyCheck: true,
    enableOfflineQueue: true, // Queue commands when disconnected
    showFriendlyErrorStack: process.env.NODE_ENV !== 'production',
  });

  // Event handlers
  redisClient.on('connect', () => {
    if (context) {
      context.log('[Redis] Connection established', {
        host: config.host,
        port: config.port,
        db: config.db,
        tls: config.tls,
      });
    }
  });

  redisClient.on('ready', () => {
    if (context) {
      context.log('[Redis] Client ready for operations');
    }
  });

  redisClient.on('error', (error) => {
    if (context) {
      context.error('[Redis] Connection error:', error);
    } else {
      console.error('[Redis] Connection error:', error);
    }
  });

  redisClient.on('close', () => {
    if (context) {
      context.warn('[Redis] Connection closed');
    }
  });

  redisClient.on('reconnecting', (delay: number) => {
    if (context) {
      context.warn(`[Redis] Reconnecting in ${delay}ms`);
    }
  });

  if (context) {
    context.log('[Redis] Client initialized', {
      host: config.host,
      port: config.port,
      db: config.db,
      tls: config.tls,
      keyPrefix: config.keyPrefix,
    });
  }

  return redisClient;
}

/**
 * Check if Redis client is connected and ready
 */
export function isRedisReady(): boolean {
  return redisClient !== null && redisClient.status === 'ready';
}

/**
 * Gracefully close Redis connection
 */
export async function closeRedisClient(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    console.log('[Redis] Client disconnected');
  }
}

/**
 * Redis-based sliding window rate limiter
 *
 * **Algorithm:**
 * 1. Use sorted set (ZSET) to store request timestamps
 * 2. Remove entries older than the time window
 * 3. Count remaining entries
 * 4. If count < limit, add new entry and allow request
 * 5. If count >= limit, reject request
 *
 * **Advantages over fixed window:**
 * - No sudden traffic spikes at window boundaries
 * - More accurate request rate measurement
 * - Prevents "double-dipping" across window boundaries
 *
 * **Complexity:** O(log(N) + M) where N = entries in window, M = expired entries
 *
 * @param key Rate limit key (e.g., "user:123" or "ip:192.168.1.1")
 * @param limit Maximum requests allowed in window
 * @param windowMs Time window in milliseconds
 * @param context Invocation context for logging
 * @returns Object with allowed status, remaining count, and reset time
 */
export async function checkRateLimitRedis(
  key: string,
  limit: number,
  windowMs: number,
  context: InvocationContext
): Promise<{ allowed: boolean; remaining: number; resetTime: Date }> {
  const client = getRedisClient(context);
  const now = Date.now();
  const windowStart = now - windowMs;
  const resetTime = new Date(now + windowMs);

  // Full key with prefix
  const fullKey = `${client.options.keyPrefix || ''}${key}`;

  try {
    // Use pipeline for atomic operations
    const pipeline = client.pipeline();

    // 1. Remove expired entries (outside time window)
    pipeline.zremrangebyscore(fullKey, 0, windowStart);

    // 2. Count entries in current window
    pipeline.zcard(fullKey);

    // 3. Add current request timestamp
    pipeline.zadd(fullKey, now, `${now}`);

    // 4. Set expiration on the key (cleanup old keys)
    pipeline.expire(fullKey, Math.ceil(windowMs / 1000));

    // Execute pipeline
    const results = await pipeline.exec();

    if (!results) {
      throw new Error('Redis pipeline returned null');
    }

    // Extract count from ZCARD result (index 1 in pipeline)
    const zcardResult = results[1];
    if (!zcardResult || zcardResult[0]) {
      throw new Error(`ZCARD failed: ${zcardResult ? zcardResult[0] : 'null result'}`);
    }

    const count = zcardResult[1] as number;

    // Check if rate limit exceeded
    if (count > limit) {
      // Remove the request we just added (over limit)
      await client.zrem(fullKey, `${now}`);

      context.warn(`[Redis Rate Limit] Exceeded for ${key}: ${count}/${limit}`);

      return {
        allowed: false,
        remaining: 0,
        resetTime,
      };
    }

    context.log(`[Redis Rate Limit] Allowed for ${key}: ${count}/${limit}`);

    return {
      allowed: true,
      remaining: Math.max(0, limit - count),
      resetTime,
    };
  } catch (error) {
    // Redis operation failed - propagate error to circuit breaker
    context.error(`[Redis Rate Limit] Error for ${key}:`, error);
    throw error;
  }
}

/**
 * Increment rate limit counter for failed operations
 * Used to penalize failed authentication attempts
 *
 * @param key Rate limit key
 * @param points Number of points to consume
 * @param windowMs Time window in milliseconds
 * @param context Invocation context
 */
export async function penalizeRedis(
  key: string,
  points: number,
  windowMs: number,
  context: InvocationContext
): Promise<void> {
  const client = getRedisClient(context);
  const now = Date.now();
  const fullKey = `${client.options.keyPrefix || ''}${key}`;

  try {
    const pipeline = client.pipeline();

    // Add multiple entries to consume more points
    for (let i = 0; i < points; i++) {
      pipeline.zadd(fullKey, now + i, `${now + i}`);
    }

    pipeline.expire(fullKey, Math.ceil(windowMs / 1000));

    await pipeline.exec();

    context.log(`[Redis Rate Limit] Penalized ${key} with ${points} points`);
  } catch (error) {
    context.error(`[Redis Rate Limit] Penalty error for ${key}:`, error);
    throw error;
  }
}
