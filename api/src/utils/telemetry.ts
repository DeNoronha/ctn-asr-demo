import * as appInsights from 'applicationinsights';
import { InvocationContext } from '@azure/functions';

// Initialize Application Insights
export function initializeTelemetry(): void {
  const connectionString = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;

  if (!connectionString) {
    console.warn('Application Insights connection string not found. Telemetry disabled.');
    return;
  }

  appInsights
    .setup(connectionString)
    .setAutoDependencyCorrelation(true)
    .setAutoCollectRequests(true)
    .setAutoCollectPerformance(true, true)
    .setAutoCollectExceptions(true)
    .setAutoCollectDependencies(true)
    .setAutoCollectConsole(true, true)
    .setUseDiskRetryCaching(true)
    .setSendLiveMetrics(true)
    .start();

  console.log('Application Insights initialized successfully');
}

// Get telemetry client
export function getTelemetryClient(): appInsights.TelemetryClient | null {
  return appInsights.defaultClient;
}

/**
 * Track custom event
 */
export function trackEvent(
  name: string,
  properties?: Record<string, string>,
  measurements?: Record<string, number>,
  context?: InvocationContext
): void {
  const client = getTelemetryClient();
  if (!client) return;

  client.trackEvent({
    name,
    properties: {
      ...properties,
      environment: process.env.NODE_ENV || 'development',
      functionName: context?.functionName || 'unknown',
    },
    measurements,
  });
}

/**
 * Track custom metric
 */
export function trackMetric(
  name: string,
  value: number,
  properties?: Record<string, string>
): void {
  const client = getTelemetryClient();
  if (!client) return;

  client.trackMetric({
    name,
    value,
    properties,
  });
}

/**
 * Track dependency (database, external API)
 */
export function trackDependency(
  name: string,
  type: string,
  duration: number,
  success: boolean,
  properties?: Record<string, string>
): void {
  const client = getTelemetryClient();
  if (!client) return;

  client.trackDependency({
    name,
    data: name,
    dependencyTypeName: type,
    duration,
    success,
    resultCode: success ? 200 : 500,
    properties,
  });
}

/**
 * Track exception
 */
export function trackException(
  error: Error,
  properties?: Record<string, string>,
  severity?: number
): void {
  const client = getTelemetryClient();
  if (!client) return;

  client.trackException({
    exception: error,
    properties,
    severity: severity || 3, // 3 = Error, 2 = Warning, 1 = Info, 4 = Critical
  });
}

/**
 * Flush telemetry (call before function exits)
 */
export async function flushTelemetry(): Promise<void> {
  const client = getTelemetryClient();
  if (!client) return;

  return new Promise((resolve) => {
    client.flush({
      callback: () => resolve(),
    });
  });
}

/**
 * Create telemetry middleware for API functions
 */
export function withTelemetry<T>(
  operationName: string,
  fn: () => Promise<T>,
  context?: InvocationContext
): Promise<T> {
  const startTime = Date.now();

  return fn()
    .then((result) => {
      const duration = Date.now() - startTime;

      trackEvent(
        `${operationName}_success`,
        {
          operation: operationName,
          status: 'success',
        },
        { duration },
        context
      );

      trackMetric(`${operationName}_duration`, duration, {
        operation: operationName,
      });

      return result;
    })
    .catch((error) => {
      const duration = Date.now() - startTime;

      trackEvent(
        `${operationName}_failure`,
        {
          operation: operationName,
          status: 'failure',
          error: error.message,
        },
        { duration },
        context
      );

      trackException(error, {
        operation: operationName,
      });

      throw error;
    });
}
