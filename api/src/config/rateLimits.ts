/**
 * Rate Limiting Configuration
 *
 * Defines rate limits for different types of API endpoints and users.
 * All limits are per time window (default: per minute unless specified).
 */

export interface RateLimitConfig {
  /** Maximum number of requests allowed */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Human-readable description */
  description: string;
}

/**
 * Rate limit presets for different endpoint types
 */
export const RATE_LIMITS = {
  /** Public endpoints (no authentication required) */
  PUBLIC: {
    maxRequests: 100,
    windowMs: 15 * 60 * 1000, // 15 minutes
    description: 'Public endpoint rate limit',
  },

  /** Authenticated user endpoints */
  AUTHENTICATED: {
    maxRequests: 1000,
    windowMs: 15 * 60 * 1000, // 15 minutes
    description: 'Authenticated user rate limit',
  },

  /** M2M (Machine-to-Machine) endpoints */
  M2M: {
    maxRequests: 5000,
    windowMs: 15 * 60 * 1000, // 15 minutes
    description: 'M2M client rate limit',
  },

  /** Admin endpoints */
  ADMIN: {
    maxRequests: 2000,
    windowMs: 15 * 60 * 1000, // 15 minutes
    description: 'Admin endpoint rate limit',
  },

  /** Login/authentication endpoints (stricter to prevent brute force) */
  AUTH: {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    description: 'Authentication endpoint rate limit (brute force protection)',
  },

  /** File upload endpoints */
  UPLOAD: {
    maxRequests: 50,
    windowMs: 15 * 60 * 1000, // 15 minutes
    description: 'File upload rate limit',
  },

  /** Search/query endpoints */
  SEARCH: {
    maxRequests: 200,
    windowMs: 15 * 60 * 1000, // 15 minutes
    description: 'Search endpoint rate limit',
  },

  /** Webhook/callback endpoints */
  WEBHOOK: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minute
    description: 'Webhook endpoint rate limit',
  },
} as const;

/**
 * Rate limit by user role
 */
export const ROLE_RATE_LIMITS: Record<string, RateLimitConfig> = {
  SystemAdmin: {
    maxRequests: 5000,
    windowMs: 15 * 60 * 1000,
    description: 'System admin rate limit',
  },
  AssociationAdmin: {
    maxRequests: 3000,
    windowMs: 15 * 60 * 1000,
    description: 'Association admin rate limit',
  },
  MemberAdmin: {
    maxRequests: 2000,
    windowMs: 15 * 60 * 1000,
    description: 'Member admin rate limit',
  },
  MemberUser: {
    maxRequests: 1000,
    windowMs: 15 * 60 * 1000,
    description: 'Member user rate limit',
  },
  MemberReadOnly: {
    maxRequests: 500,
    windowMs: 15 * 60 * 1000,
    description: 'Read-only user rate limit',
  },
};

/**
 * IP-based rate limits (fallback for unauthenticated requests)
 */
export const IP_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 100,
  windowMs: 15 * 60 * 1000, // 15 minutes
  description: 'IP-based rate limit for unauthenticated requests',
};

/**
 * Get rate limit configuration for a specific endpoint type
 */
export function getRateLimitConfig(type: keyof typeof RATE_LIMITS): RateLimitConfig {
  return RATE_LIMITS[type];
}

/**
 * Get rate limit configuration for a specific user role
 */
export function getRoleRateLimitConfig(role: string): RateLimitConfig {
  return ROLE_RATE_LIMITS[role] || RATE_LIMITS.AUTHENTICATED;
}
