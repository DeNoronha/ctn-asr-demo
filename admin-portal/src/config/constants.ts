/**
 * Admin Portal Constants
 *
 * Centralized configuration for the admin portal.
 * Shared constants between frontend and backend should be kept in sync.
 */

export const PAGINATION = {
  /** Default starting page number */
  DEFAULT_PAGE: 1,

  /** Default number of items per page */
  DEFAULT_PAGE_SIZE: 10,

  /** Maximum allowed items per page */
  MAX_PAGE_SIZE: 100,

  /** Minimum items per page */
  MIN_PAGE_SIZE: 1,

  /** Available page size options for user selection */
  PAGE_SIZE_OPTIONS: [10, 25, 50, 100],
} as const;

export const TIMEOUTS = {
  /** Default toast/notification duration in milliseconds */
  NOTIFICATION_DURATION_MS: 5000,

  /** Debounce delay for search inputs in milliseconds */
  SEARCH_DEBOUNCE_MS: 300,

  /** Auto-save debounce delay in milliseconds */
  AUTO_SAVE_DEBOUNCE_MS: 1000,

  /** Polling interval for status updates in milliseconds */
  POLLING_INTERVAL_MS: 30000,
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

  /** Maximum KvK number length */
  KVK_LENGTH: 8,

  /** Maximum LEI length */
  LEI_LENGTH: 20,
} as const;

export const UI = {
  /** Default modal size */
  DEFAULT_MODAL_SIZE: 'lg' as const,

  /** Default DataTable height */
  DEFAULT_TABLE_HEIGHT: 600,

  /** Sidebar width in pixels */
  SIDEBAR_WIDTH: 260,

  /** Header height in pixels */
  HEADER_HEIGHT: 60,
} as const;

export const STORAGE_KEYS = {
  /** Key for storing user preferences */
  USER_PREFERENCES: 'admin-portal-preferences',

  /** Key for storing auth token */
  AUTH_TOKEN: 'admin-portal-auth-token',

  /** Key for storing last visited page */
  LAST_PAGE: 'admin-portal-last-page',

  /** Key for storing DataTable column state */
  DATATABLE_COLUMNS: 'admin-portal-datatable-columns',
} as const;

export const DATE_FORMATS = {
  /** Full date and time format */
  FULL: 'yyyy-MM-dd HH:mm:ss',

  /** Date only format */
  DATE_ONLY: 'yyyy-MM-dd',

  /** Time only format */
  TIME_ONLY: 'HH:mm:ss',

  /** Short date format */
  SHORT_DATE: 'dd/MM/yyyy',

  /** Long date format with month name */
  LONG_DATE: 'dd MMMM yyyy',
} as const;

export const FILE_UPLOAD = {
  /** Maximum file size in bytes (10MB) */
  MAX_SIZE_BYTES: 10 * 1024 * 1024,

  /** Allowed file types for KvK documents */
  ALLOWED_KVK_TYPES: ['application/pdf', 'image/png', 'image/jpeg'],

  /** Allowed file extensions */
  ALLOWED_EXTENSIONS: ['.pdf', '.png', '.jpg', '.jpeg'],
} as const;

/**
 * Application Routes
 */
export const ROUTES = {
  HOME: '/',
  MEMBERS: '/members',
  ENDPOINTS: '/endpoints',
  AUDIT_LOGS: '/audit-logs',
  SETTINGS: '/settings',
  HELP: '/help',
} as const;
