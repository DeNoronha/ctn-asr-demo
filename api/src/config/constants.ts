/**
 * Application Constants
 *
 * Centralized configuration for timeouts, defaults, and magic numbers.
 * All time-based values are in milliseconds.
 */

export const TIMEOUTS = {
  /** JWKS cache duration: 10 minutes */
  JWKS_CACHE_MS: 10 * 60 * 1000,

  /** Default HTTP request timeout: 30 seconds */
  REQUEST_TIMEOUT_MS: 30 * 1000,

  /** Database query timeout: 5 seconds */
  DATABASE_QUERY_TIMEOUT_MS: 5 * 1000,

  /** Token expiration check buffer: 5 minutes */
  TOKEN_EXPIRY_BUFFER_MS: 5 * 60 * 1000,
} as const;

export const DEFAULTS = {
  /** Default pagination page size */
  PAGE_SIZE: 10,

  /** Current BVAD terms version */
  TERMS_VERSION: 'v3.2.0',

  /** BVAD token validity duration in hours */
  BVAD_VALIDITY_HOURS: 24,

  /** Default session duration in hours */
  SESSION_DURATION_HOURS: 8,

  /** Maximum file upload size in bytes (10MB) */
  MAX_UPLOAD_SIZE_BYTES: 10 * 1024 * 1024,
} as const;

export const PAGINATION = {
  /** Default starting page number */
  DEFAULT_PAGE: 1,

  /** Default number of items per page */
  DEFAULT_PAGE_SIZE: 10,

  /** Maximum allowed items per page */
  MAX_PAGE_SIZE: 100,

  /** Minimum items per page */
  MIN_PAGE_SIZE: 1,
} as const;

export const VALIDATION = {
  /** Minimum password length */
  MIN_PASSWORD_LENGTH: 8,

  /** Maximum text field length */
  MAX_TEXT_LENGTH: 1000,

  /** Maximum name field length */
  MAX_NAME_LENGTH: 200,

  /** Maximum email length */
  MAX_EMAIL_LENGTH: 255,
} as const;

export const RETRY = {
  /** Maximum retry attempts for failed requests */
  MAX_ATTEMPTS: 3,

  /** Initial retry delay in milliseconds */
  INITIAL_DELAY_MS: 1000,

  /** Retry backoff multiplier */
  BACKOFF_MULTIPLIER: 2,
} as const;

export const CACHE = {
  /** Default cache TTL: 5 minutes */
  DEFAULT_TTL_MS: 5 * 60 * 1000,

  /** User profile cache TTL: 15 minutes */
  USER_PROFILE_TTL_MS: 15 * 60 * 1000,

  /** Static data cache TTL: 1 hour */
  STATIC_DATA_TTL_MS: 60 * 60 * 1000,
} as const;

export const CORS = {
  /** Access-Control-Max-Age in seconds: 24 hours */
  MAX_AGE_SECONDS: 86400,

  /** Access-Control-Max-Age as string for headers */
  MAX_AGE_HEADER: '86400',

  /** Allowed CORS methods */
  ALLOWED_METHODS: 'GET, POST, PUT, DELETE, OPTIONS',

  /** Allowed CORS headers */
  ALLOWED_HEADERS: 'Content-Type, Authorization, X-Request-ID, X-CSRF-Token',
} as const;

/**
 * HTTP Status Codes
 * Standard codes used throughout the application
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

/**
 * Rate Limiting Configuration
 * Controls request rate limits across different endpoint types
 */
export const RATE_LIMIT = {
  /** General API endpoints: requests per minute */
  API_POINTS: 100,
  /** General API endpoints: duration in seconds */
  API_DURATION: 60,
  /** General API endpoints: block duration in seconds */
  API_BLOCK_DURATION: 60,

  /** Authentication endpoints: requests per minute */
  AUTH_POINTS: 10,
  /** Authentication endpoints: duration in seconds */
  AUTH_DURATION: 60,
  /** Authentication endpoints: block duration in seconds (5 minutes) */
  AUTH_BLOCK_DURATION: 300,

  /** Token issuance: requests per hour */
  TOKEN_POINTS: 5,
  /** Token issuance: duration in seconds (1 hour) */
  TOKEN_DURATION: 3600,
  /** Token issuance: block duration in seconds (1 hour) */
  TOKEN_BLOCK_DURATION: 3600,

  /** Failed authentication: attempts per hour */
  FAILED_AUTH_POINTS: 5,
  /** Failed authentication: duration in seconds (1 hour) */
  FAILED_AUTH_DURATION: 3600,
  /** Failed authentication: block duration in seconds (1 hour) */
  FAILED_AUTH_BLOCK_DURATION: 3600,

  /** File upload: requests per hour */
  UPLOAD_POINTS: 20,
  /** File upload: duration in seconds (1 hour) */
  UPLOAD_DURATION: 3600,
  /** File upload: block duration in seconds (30 minutes) */
  UPLOAD_BLOCK_DURATION: 1800,

  /** Default penalty points for failed operations */
  PENALTY_POINTS: 2,
} as const;

/**
 * Circuit Breaker Configuration
 * Prevents cascading failures when dependencies (Redis) are unavailable
 * Implements fail-closed behavior to maintain security posture
 */
export const CIRCUIT_BREAKER = {
  /** Number of consecutive failures before opening circuit */
  ERROR_THRESHOLD: 5,

  /** Duration to keep circuit open (milliseconds) - 60 seconds */
  OPEN_DURATION_MS: 60000,

  /** Maximum test requests allowed in half-open state */
  HALF_OPEN_MAX_REQUESTS: 3,

  /** Time window for tracking errors (milliseconds) - 5 minutes */
  MONITOR_WINDOW_MS: 300000,
} as const;

/**
 * External URLs and Endpoints
 */
export const URLS = {
  /** Azure AD JWKS URI template (requires tenant ID) */
  JWKS_URI_TEMPLATE: 'https://login.microsoftonline.com/{tenantId}/discovery/v2.0/keys',

  /** Azure AD issuer template (requires tenant ID) */
  ISSUER_TEMPLATE: 'https://login.microsoftonline.com/{tenantId}/v2.0',

  /** Azure AD connection endpoint for CSP */
  AZURE_AD_CONNECT: 'https://login.microsoftonline.com',

  /** API documentation URL */
  API_DOCS: 'https://docs.ctn.cloud/api',

  /** Development API base (localhost) */
  DEV_API_BASE: 'http://localhost:8080/api/v1',

  /** Production API base (Container Apps) */
  PROD_API_BASE: 'https://ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io/api/v1',
} as const;

/**
 * Allowed CORS Origins
 * Production URLs for admin and member portals
 */
export const ALLOWED_ORIGINS = {
  /** Local development - admin portal */
  LOCAL_ADMIN: 'http://localhost:3000',

  /** Local development - member portal */
  LOCAL_MEMBER: 'http://localhost:3001',

  /** Production admin portal (Azure Static Web App) */
  PROD_ADMIN: 'https://calm-tree-03352ba03.1.azurestaticapps.net',

  /** Production member portal (Azure Static Web App) */
  PROD_MEMBER: 'https://calm-pebble-043b2db03.1.azurestaticapps.net',
} as const;

/**
 * Default array of allowed CORS origins
 */
export const DEFAULT_CORS_ORIGINS = [
  ALLOWED_ORIGINS.LOCAL_ADMIN,
  ALLOWED_ORIGINS.LOCAL_MEMBER,
  ALLOWED_ORIGINS.PROD_ADMIN,
  ALLOWED_ORIGINS.PROD_MEMBER,
] as const;

/**
 * HTTP Methods that trigger state changes
 * Used for CSRF protection
 */
export const STATE_CHANGING_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'] as const;
