/**
 * Production-Safe Structured Logger (SEC-009, TASK-CR-010)
 * Strips console.log/debug/info in production to prevent data leaks
 * Adds correlation IDs for distributed tracing
 * Supports structured logging with metadata
 *
 * Usage:
 * ```typescript
 * import { logger, createLogger } from '../utils/logger';
 *
 * // Simple logging (backward compatible - no correlation ID)
 * logger.log('Debug info');        // Stripped in production
 * logger.info('Info message');     // Stripped in production
 * logger.debug('Debug details');   // Stripped in production
 * logger.warn('Warning');          // Allowed in production
 * logger.error('Error', error);    // Allowed in production
 *
 * // Structured logging with correlation ID
 * const contextLogger = createLogger({ operation: 'fetchUsers', userId: '123' });
 * contextLogger.info('Fetching users from API', { pageSize: 10 });
 * contextLogger.error('API call failed', error, { endpoint: '/users' });
 * ```
 *
 * Correlation ID propagation:
 * - Automatically generated UUID v4 for each logger instance
 * - Can be manually specified for request tracing
 * - Included in structured log output
 * - Can be attached to HTTP headers for backend correlation
 */

import { v4 as uuidv4 } from 'uuid';

const isDevelopment = import.meta.env.MODE === 'development' || import.meta.env.DEV;

/**
 * Log context for structured logging
 */
export interface LogContext {
  correlationId?: string;
  userId?: string;
  operation?: string;
  [key: string]: unknown;
}

/**
 * Log levels (aligned with standard severity)
 */
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

/**
 * Structured log entry
 */
interface LogEntry {
  level: LogLevel;
  timestamp: string;
  correlationId: string;
  message: string;
  context?: LogContext;
  metadata?: object;
  error?: {
    message: string;
    stack?: string;
    name?: string;
  };
}

/**
 * Structured Logger with correlation ID support
 */
class StructuredLogger {
  private correlationId: string;
  private context: LogContext;

  constructor(context?: LogContext) {
    this.correlationId = context?.correlationId || uuidv4();
    this.context = context || {};
  }

  /**
   * Get the correlation ID for this logger instance
   */
  getCorrelationId(): string {
    return this.correlationId;
  }

  /**
   * Create a child logger with additional context
   */
  child(additionalContext: Partial<LogContext>): StructuredLogger {
    return new StructuredLogger({
      ...this.context,
      ...additionalContext,
      correlationId: this.correlationId, // Preserve parent correlation ID
    });
  }

  /**
   * Format log entry as JSON (for structured logging)
   */
  private formatEntry(
    level: LogLevel,
    message: string,
    error?: Error | unknown,
    metadata?: object
  ): LogEntry {
    const entry: LogEntry = {
      level,
      timestamp: new Date().toISOString(),
      correlationId: this.correlationId,
      message,
    };

    // Add context if present
    if (Object.keys(this.context).length > 0) {
      entry.context = { ...this.context };
    }

    // Add metadata if present
    if (metadata && Object.keys(metadata).length > 0) {
      entry.metadata = metadata;
    }

    // Add error details if present
    if (error) {
      if (error instanceof Error) {
        entry.error = {
          message: error.message,
          name: error.name,
          stack: isDevelopment ? error.stack : undefined, // Only include stack in dev
        };
      } else {
        entry.error = {
          message: String(error),
        };
      }
    }

    return entry;
  }

  /**
   * Output log entry (JSON in production, readable in dev)
   */
  private output(level: LogLevel, entry: LogEntry, consoleMethod: (...args: unknown[]) => void) {
    if (isDevelopment) {
      // Development: Human-readable format with colors
      const prefix = `[${entry.level}] ${entry.timestamp} [${entry.correlationId.slice(0, 8)}]`;
      consoleMethod(prefix, entry.message, entry.metadata || '', entry.error || '');
    } else {
      // Production: JSON format for log aggregation (Application Insights, etc.)
      consoleMethod(JSON.stringify(entry));
    }
  }

  /**
   * Log debug information (stripped in production)
   */
  debug(message: string, metadata?: object): void {
    if (isDevelopment) {
      const entry = this.formatEntry(LogLevel.DEBUG, message, undefined, metadata);
      this.output(LogLevel.DEBUG, entry, console.debug);
    }
  }

  /**
   * Log informational messages (stripped in production)
   */
  info(message: string, metadata?: object): void {
    if (isDevelopment) {
      const entry = this.formatEntry(LogLevel.INFO, message, undefined, metadata);
      this.output(LogLevel.INFO, entry, console.info);
    }
  }

  /**
   * Alias for info (for backward compatibility)
   */
  log(message: string, metadata?: object): void {
    this.info(message, metadata);
  }

  /**
   * Log warnings (allowed in production)
   * Use sparingly - only for legitimate production warnings
   */
  warn(message: string, metadata?: object): void {
    const entry = this.formatEntry(LogLevel.WARN, message, undefined, metadata);
    this.output(LogLevel.WARN, entry, console.warn);
  }

  /**
   * Log errors (allowed in production)
   * Always allowed for error tracking and debugging
   */
  error(message: string, error?: Error | unknown, metadata?: object): void {
    const entry = this.formatEntry(LogLevel.ERROR, message, error, metadata);
    this.output(LogLevel.ERROR, entry, console.error);
  }

  /**
   * Check if running in development mode
   */
  isDevelopment(): boolean {
    return isDevelopment;
  }
}

/**
 * Create a new logger instance with optional context
 * Use this for operation-scoped logging with correlation IDs
 */
export function createLogger(context?: LogContext): StructuredLogger {
  return new StructuredLogger(context);
}

/**
 * Simple logger (backward compatible - no correlation ID)
 * For quick logging without structured context
 * Use createLogger() for structured logging with correlation IDs
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
export type Logger = typeof logger | StructuredLogger;

/**
 * Extract correlation ID from HTTP response headers
 * Use this to correlate frontend logs with backend logs
 */
export function extractCorrelationId(headers: Headers | Record<string, string>): string | null {
  if (headers instanceof Headers) {
    return headers.get('x-correlation-id') || headers.get('x-request-id');
  }
  return headers['x-correlation-id'] || headers['x-request-id'] || null;
}

/**
 * Create HTTP headers with correlation ID
 * Use this to propagate correlation IDs to backend APIs
 */
export function withCorrelationHeaders(
  correlationId: string,
  existingHeaders: Record<string, string> = {}
): Record<string, string> {
  return {
    ...existingHeaders,
    'x-correlation-id': correlationId,
  };
}
