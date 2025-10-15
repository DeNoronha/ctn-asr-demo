// ========================================
// Application Insights Logger
// ========================================
// Comprehensive logging utility for production monitoring
// Integrates with Azure Application Insights

import type { InvocationContext } from '@azure/functions';

/**
 * Log severity levels matching Application Insights
 */
export enum LogLevel {
  Verbose = 0,
  Information = 1,
  Warning = 2,
  Error = 3,
  Critical = 4,
}

/**
 * Custom properties to attach to log entries
 */
export interface LogProperties {
  [key: string]: string | number | boolean | undefined;
}

/**
 * Application Insights Logger
 * Provides structured logging with automatic integration to Azure monitoring
 */
export class AppInsightsLogger {
  private context: InvocationContext;
  private functionName: string;

  constructor(context: InvocationContext) {
    this.context = context;
    this.functionName = context.functionName || 'Unknown';
  }

  /**
   * Log informational message
   */
  info(message: string, properties?: LogProperties): void {
    this.log(LogLevel.Information, message, properties);
  }

  /**
   * Log warning message
   */
  warn(message: string, properties?: LogProperties): void {
    this.log(LogLevel.Warning, message, properties);
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error | unknown, properties?: LogProperties): void {
    const errorProps = this.extractErrorProperties(error);
    this.log(LogLevel.Error, message, { ...properties, ...errorProps });
  }

  /**
   * Log critical error (service outage, data loss, security breach)
   */
  critical(message: string, error?: Error | unknown, properties?: LogProperties): void {
    const errorProps = this.extractErrorProperties(error);
    this.log(LogLevel.Critical, message, { ...properties, ...errorProps });
  }

  /**
   * Log verbose/debug message (only in development)
   */
  verbose(message: string, properties?: LogProperties): void {
    if (process.env.NODE_ENV === 'development') {
      this.log(LogLevel.Verbose, message, properties);
    }
  }

  /**
   * Track custom event with Application Insights
   */
  trackEvent(eventName: string, properties?: LogProperties): void {
    const enrichedProperties = {
      ...properties,
      functionName: this.functionName,
      invocationId: this.context.invocationId,
      timestamp: new Date().toISOString(),
    };

    this.context.log(`[EVENT] ${eventName}`, enrichedProperties);
  }

  /**
   * Track custom metric with Application Insights
   */
  trackMetric(metricName: string, value: number, properties?: LogProperties): void {
    const enrichedProperties = {
      ...properties,
      functionName: this.functionName,
      invocationId: this.context.invocationId,
      metricValue: value,
    };

    this.context.log(`[METRIC] ${metricName}: ${value}`, enrichedProperties);
  }

  /**
   * Track dependency call (database, external API, etc.)
   */
  trackDependency(
    dependencyName: string,
    durationMs: number,
    success: boolean,
    properties?: LogProperties
  ): void {
    const enrichedProperties = {
      ...properties,
      functionName: this.functionName,
      invocationId: this.context.invocationId,
      duration: durationMs,
      success,
    };

    const level = success ? LogLevel.Information : LogLevel.Warning;
    this.log(
      level,
      `[DEPENDENCY] ${dependencyName} (${durationMs}ms) - ${success ? 'Success' : 'Failed'}`,
      enrichedProperties
    );
  }

  /**
   * Core logging method
   */
  private log(level: LogLevel, message: string, properties?: LogProperties): void {
    const enrichedProperties = {
      ...properties,
      functionName: this.functionName,
      invocationId: this.context.invocationId,
      timestamp: new Date().toISOString(),
      logLevel: LogLevel[level],
    };

    const prefix = this.getLogPrefix(level);
    const formattedMessage = `${prefix} ${message}`;

    // Use context.log methods which automatically integrate with Application Insights
    switch (level) {
      case LogLevel.Critical:
      case LogLevel.Error:
        this.context.error(formattedMessage, enrichedProperties);
        break;
      case LogLevel.Warning:
        this.context.warn(formattedMessage, enrichedProperties);
        break;
      case LogLevel.Information:
        this.context.log(formattedMessage, enrichedProperties);
        break;
      case LogLevel.Verbose:
        this.context.trace(formattedMessage, enrichedProperties);
        break;
      default:
        this.context.log(formattedMessage, enrichedProperties);
    }
  }

  /**
   * Extract error properties for logging
   */
  private extractErrorProperties(error: Error | unknown): LogProperties {
    if (!error) return {};

    if (error instanceof Error) {
      return {
        errorName: error.name,
        errorMessage: error.message,
        errorStack: error.stack || 'No stack trace available',
      };
    }

    return {
      errorType: typeof error,
      errorValue: String(error),
    };
  }

  /**
   * Get log prefix based on severity
   */
  private getLogPrefix(level: LogLevel): string {
    switch (level) {
      case LogLevel.Critical:
        return '🔴 [CRITICAL]';
      case LogLevel.Error:
        return '❌ [ERROR]';
      case LogLevel.Warning:
        return '⚠️  [WARNING]';
      case LogLevel.Information:
        return 'ℹ️  [INFO]';
      case LogLevel.Verbose:
        return '🔍 [VERBOSE]';
      default:
        return '[LOG]';
    }
  }
}

/**
 * Create logger instance for Azure Function context
 */
export function createLogger(context: InvocationContext): AppInsightsLogger {
  return new AppInsightsLogger(context);
}

/**
 * Performance tracking helper
 */
export class PerformanceTracker {
  private startTime: number;
  private logger: AppInsightsLogger;
  private operationName: string;

  constructor(logger: AppInsightsLogger, operationName: string) {
    this.logger = logger;
    this.operationName = operationName;
    this.startTime = Date.now();
  }

  /**
   * End tracking and log duration
   */
  end(success: boolean = true, properties?: LogProperties): void {
    const duration = Date.now() - this.startTime;
    this.logger.trackDependency(this.operationName, duration, success, {
      ...properties,
      operationType: 'performance',
    });
  }
}

/**
 * Track operation performance
 */
export function trackPerformance(
  logger: AppInsightsLogger,
  operationName: string
): PerformanceTracker {
  return new PerformanceTracker(logger, operationName);
}
