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
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;
