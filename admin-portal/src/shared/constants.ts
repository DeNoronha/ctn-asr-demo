/**
 * Shared Application Constants
 * Centralized constants used across the admin portal
 *
 * Usage:
 * ```typescript
 * import { PAGINATION, API_TIMEOUTS } from '../shared/constants';
 *
 * const [pageSize, setPageSize] = useState(PAGINATION.DEFAULT_PAGE_SIZE);
 * ```
 */

/**
 * Pagination constants
 */
export const PAGINATION = {
  /** Default page size for data tables */
  DEFAULT_PAGE_SIZE: 20,

  /** Starting page number (1-indexed) */
  START_PAGE: 1,

  /** Available page size options for user selection */
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],

  /** Maximum items per page */
  MAX_PAGE_SIZE: 100,
} as const;

/**
 * API request timeouts (milliseconds)
 */
export const API_TIMEOUTS = {
  /** Standard API request timeout */
  DEFAULT: 30000, // 30 seconds

  /** Short timeout for lightweight requests */
  SHORT: 10000, // 10 seconds

  /** Long timeout for heavy operations (exports, reports) */
  LONG: 60000, // 60 seconds

  /** File upload timeout */
  UPLOAD: 120000, // 120 seconds (2 minutes)
} as const;

/**
 * Retry configuration
 */
export const RETRY_CONFIG = {
  /** Maximum number of retry attempts */
  MAX_ATTEMPTS: 3,

  /** Initial delay before first retry (ms) */
  INITIAL_DELAY: 1000,

  /** Maximum delay between retries (ms) */
  MAX_DELAY: 5000,

  /** Delay multiplier for exponential backoff */
  BACKOFF_MULTIPLIER: 2,
} as const;

/**
 * Local storage keys
 */
export const STORAGE_KEYS = {
  LANGUAGE: 'ctn-language',
  THEME: 'ctn-theme',
  AUTH_STATE: 'ctn-auth-state',
  USER_PREFERENCES: 'ctn-user-preferences',
  DRAFT_PREFIX: 'ctn-draft-',
} as const;

/**
 * Date/time formats
 */
export const DATE_FORMATS = {
  /** Display format: Nov 8, 2025 */
  DISPLAY: { year: 'numeric', month: 'short', day: 'numeric' } as Intl.DateTimeFormatOptions,

  /** Display with time: Nov 8, 2025, 14:30 */
  DISPLAY_WITH_TIME: {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  } as Intl.DateTimeFormatOptions,

  /** ISO format for API calls */
  ISO: 'YYYY-MM-DDTHH:mm:ss.SSSZ',
} as const;

/**
 * Validation rules
 */
export const VALIDATION = {
  /** Minimum password length */
  MIN_PASSWORD_LENGTH: 8,

  /** Maximum field lengths */
  MAX_LENGTH: {
    LEGAL_NAME: 200,
    EMAIL: 100,
    PHONE: 20,
    ADDRESS: 200,
    CITY: 100,
    POSTAL_CODE: 20,
    ORG_ID: 50,
    LEI: 20,
    KVK: 8,
    DOMAIN: 100,
  },

  /** Regular expressions */
  REGEX: {
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    PHONE: /^\+?[\d\s\-()]{7,20}$/,
    URL: /^https?:\/\/.+/,
    LEI: /^[A-Z0-9]{20}$/,
    KVK: /^\d{8}$/,
    DOMAIN: /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/,
  },
} as const;

/**
 * Feature flags
 */
export const FEATURES = {
  /** Enable dark mode toggle */
  DARK_MODE: true,

  /** Enable multi-language support */
  I18N: true,

  /** Enable advanced filtering */
  ADVANCED_FILTERS: true,

  /** Enable export functionality */
  EXPORT: true,

  /** Enable audit logging */
  AUDIT_LOGS: true,
} as const;

/**
 * Application metadata
 */
export const APP_META = {
  NAME: 'CTN Admin Portal',
  VERSION: '0.1.4',
  COPYRIGHT_YEAR: new Date().getFullYear(),
  COPYRIGHT_OWNER: 'Connected Trade Network',
} as const;

/**
 * Type exports for type-safe access
 */
export type PaginationConfig = typeof PAGINATION;
export type ApiTimeouts = typeof API_TIMEOUTS;
export type RetryConfig = typeof RETRY_CONFIG;
export type StorageKeys = typeof STORAGE_KEYS;
export type DateFormats = typeof DATE_FORMATS;
export type ValidationRules = typeof VALIDATION;
export type FeatureFlags = typeof FEATURES;
export type AppMetadata = typeof APP_META;
