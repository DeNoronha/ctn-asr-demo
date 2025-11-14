/**
 * Production-Safe Logger (SEC-009)
 * Strips console.log/debug/info in production to prevent data leaks
 *
 * Usage:
 * ```typescript
 * import { logger } from '../utils/logger';
 *
 * logger.log('Debug info');        // Stripped in production
 * logger.info('Info message');     // Stripped in production
 * logger.debug('Debug details');   // Stripped in production
 * logger.warn('Warning');          // Allowed in production
 * logger.error('Error');           // Allowed in production
 * ```
 */

const isDevelopment = import.meta.env.MODE === 'development' || import.meta.env.DEV;

/**
 * Production-safe logger
 * - Development: All console methods work normally
 * - Production: Only error and warn are allowed, others are no-ops
 */
export const logger = {
  /**
   * Log debug information (stripped in production)
   */
  log: (...args: unknown[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },

  /**
   * Log informational messages (stripped in production)
   */
  info: (...args: unknown[]) => {
    if (isDevelopment) {
      console.info(...args);
    }
  },

  /**
   * Log debug details (stripped in production)
   */
  debug: (...args: unknown[]) => {
    if (isDevelopment) {
      console.debug(...args);
    }
  },

  /**
   * Log warnings (allowed in production)
   * Use sparingly - only for legitimate production warnings
   */
  warn: (...args: unknown[]) => {
    console.warn(...args);
  },

  /**
   * Log errors (allowed in production)
   * Always allowed for error tracking and debugging
   */
  error: (...args: unknown[]) => {
    console.error(...args);
  },

  /**
   * Check if running in development mode
   */
  isDevelopment: () => isDevelopment,
};

/**
 * Type-safe logger interface
 */
export type Logger = typeof logger;
