// ========================================
// API Versioning Middleware
// ========================================
// Implements API versioning with deprecation and sunset support
// Follows RFC 8594 for Sunset header
// See: docs/API_VERSIONING_STRATEGY.md

import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

/**
 * Version information including deprecation and sunset dates
 */
export interface VersionInfo {
  /** Current version identifier (e.g., 'v1', 'v2') */
  current: string;

  /** Whether this version is deprecated */
  deprecated: boolean;

  /** ISO 8601 date when version was deprecated (when warning started) */
  deprecationDate?: string;

  /** ISO 8601 date when version will be sunset (returns 410 Gone) */
  sunsetDate?: string;

  /** URL to migration guide for this version */
  migrationGuide?: string;
}

/**
 * Version registry
 * Configure all API versions here with their lifecycle status
 *
 * Timeline for version lifecycle:
 * 1. Active: current version, fully supported
 * 2. Deprecated: old version, still works but shows deprecation warnings
 * 3. Sunset: version no longer works, returns 410 Gone
 *
 * See: docs/API_VERSIONING_STRATEGY.md Section 3
 */
const VERSION_INFO: Record<string, VersionInfo> = {
  'v1': {
    current: 'v1',
    deprecated: false,  // Set to true when v2 is released
    // deprecationDate: '2026-06-01T00:00:00Z',  // Uncomment when deprecating
    // sunsetDate: '2026-12-01T00:00:00Z',       // Uncomment when deprecating
    // migrationGuide: 'https://docs.ctn.cloud/migrations/v1-to-v2'
  },
  // Add v2 when ready:
  // 'v2': {
  //   current: 'v2',
  //   deprecated: false
  // }
};

/**
 * Extract API version from request URL
 *
 * @param request - HTTP request object
 * @returns Version string (e.g., 'v1') or 'v1' as default
 *
 * @example
 * // URL: https://api.ctn.cloud/api/v1/members
 * getApiVersion(request) // Returns: 'v1'
 *
 * // URL: https://api.ctn.cloud/api/v2/parties
 * getApiVersion(request) // Returns: 'v2'
 */
export function getApiVersion(request: HttpRequest): string {
  const url = new URL(request.url);
  const match = url.pathname.match(/\/api\/(v\d+)\//);
  return match ? match[1] : 'v1'; // Default to v1 for backward compatibility
}

/**
 * Add versioning headers to HTTP response
 *
 * Headers added:
 * - API-Version: Current version identifier
 * - Deprecation: RFC 8594 deprecation date (if deprecated)
 * - Sunset: RFC 8594 sunset date (if deprecated)
 * - Link: Migration guide URL with rel="deprecation" (if deprecated)
 *
 * @param response - HTTP response object
 * @param version - API version string
 * @returns Response with version headers added
 *
 * @example
 * const response = { status: 200, jsonBody: data };
 * return addVersionHeaders(response, 'v1');
 * // Response includes: API-Version: v1, Deprecation, Sunset headers
 */
export function addVersionHeaders(
  response: HttpResponseInit,
  version: string
): HttpResponseInit {
  const versionInfo = VERSION_INFO[version];

  if (!versionInfo) {
    // Unknown version - add basic API-Version header
    return {
      ...response,
      headers: {
        'API-Version': version,
        ...(response.headers as Record<string, string>)
      }
    };
  }

  const headers: Record<string, string> = {
    'API-Version': versionInfo.current,
    ...(response.headers as Record<string, string>)
  };

  // Add deprecation headers if version is deprecated
  if (versionInfo.deprecated) {
    // RFC 8594 Deprecation header
    // Format: HTTP-date (e.g., "Sun, 01 Jun 2026 00:00:00 GMT")
    if (versionInfo.deprecationDate) {
      const deprecationDate = new Date(versionInfo.deprecationDate);
      headers['Deprecation'] = deprecationDate.toUTCString();
    }

    // RFC 8594 Sunset header
    // Format: HTTP-date indicating when version will be sunset
    if (versionInfo.sunsetDate) {
      const sunsetDate = new Date(versionInfo.sunsetDate);
      headers['Sunset'] = sunsetDate.toUTCString();
    }

    // Link header with migration guide
    // Format: <URL>; rel="deprecation"
    if (versionInfo.migrationGuide) {
      headers['Link'] = `<${versionInfo.migrationGuide}>; rel="deprecation"`;
    }
  }

  return {
    ...response,
    headers
  };
}

/**
 * Check if API version is still active (not sunset)
 *
 * A version is considered active if:
 * 1. It exists in VERSION_INFO
 * 2. It has no sunsetDate, OR current date is before sunsetDate
 *
 * @param version - API version string
 * @returns true if version is active, false if sunset
 *
 * @example
 * isVersionActive('v1') // Returns: true (if v1 not sunset)
 * isVersionActive('v0') // Returns: false (if v0 is sunset)
 */
export function isVersionActive(version: string): boolean {
  const versionInfo = VERSION_INFO[version];

  // Unknown version is not active
  if (!versionInfo) {
    return false;
  }

  // No sunset date means version is still active
  if (!versionInfo.sunsetDate) {
    return true;
  }

  // Check if current date is before sunset date
  const sunsetDate = new Date(versionInfo.sunsetDate);
  return new Date() < sunsetDate;
}

/**
 * Check if version is sunset and return 410 Gone response if needed
 *
 * Returns null if version is still active, or 410 Gone response if sunset.
 *
 * HTTP 410 Gone indicates that the resource is no longer available and
 * will not be available again (unlike 404 which may be temporary).
 *
 * @param version - API version string
 * @returns null if active, or HttpResponseInit with 410 status if sunset
 *
 * @example
 * const sunsetResponse = checkVersionSunset('v1');
 * if (sunsetResponse) {
 *   return sunsetResponse; // Returns 410 Gone
 * }
 * // Continue with normal request processing
 */
export function checkVersionSunset(version: string): HttpResponseInit | null {
  if (!isVersionActive(version)) {
    const versionInfo = VERSION_INFO[version];

    return {
      status: 410,
      headers: {
        'Content-Type': 'application/json',
        'API-Version': version
      },
      jsonBody: {
        error: 'API Version Sunset',
        message: `API version ${version} is no longer supported`,
        sunset_date: versionInfo?.sunsetDate || 'unknown',
        current_version: getCurrentVersion(),
        migration_guide: versionInfo?.migrationGuide || 'https://docs.ctn.cloud/api',
        documentation: 'https://docs.ctn.cloud/api'
      }
    };
  }

  return null;
}

/**
 * Get the current (latest) active API version
 *
 * @returns Current version string (e.g., 'v2')
 */
export function getCurrentVersion(): string {
  // Find the highest version number that is not deprecated
  const activeVersions = Object.entries(VERSION_INFO)
    .filter(([_, info]) => !info.deprecated)
    .map(([version, _]) => version);

  if (activeVersions.length === 0) {
    // Fallback: return highest version even if deprecated
    const allVersions = Object.keys(VERSION_INFO).sort().reverse();
    return allVersions[0] || 'v1';
  }

  // Sort versions and return the highest
  return activeVersions.sort().reverse()[0];
}

/**
 * Add deprecation notice to response body
 *
 * For deprecated versions, adds a non-breaking field to inform clients
 * about upcoming sunset.
 *
 * @param response - HTTP response object
 * @param version - API version string
 * @returns Response with deprecation notice added to body (if deprecated)
 *
 * @example
 * const response = { status: 200, jsonBody: { data: [...] } };
 * return addDeprecationNotice(response, 'v1');
 * // Response body includes: _deprecation_notice: {...}
 */
export function addDeprecationNotice(
  response: HttpResponseInit,
  version: string
): HttpResponseInit {
  const versionInfo = VERSION_INFO[version];

  // Only add notice if version is deprecated
  if (!versionInfo?.deprecated) {
    return response;
  }

  // Only modify JSON responses
  if (!response.jsonBody || typeof response.jsonBody !== 'object') {
    return response;
  }

  const notice = {
    message: `API ${version} is deprecated and will be sunset on ${versionInfo.sunsetDate || 'a future date'}`,
    sunset_date: versionInfo.sunsetDate,
    current_version: getCurrentVersion(),
    migration_guide: versionInfo.migrationGuide || 'https://docs.ctn.cloud/api',
    action_required: 'Please migrate to the current API version before the sunset date'
  };

  return {
    ...response,
    jsonBody: {
      ...response.jsonBody,
      _deprecation_notice: notice
    }
  };
}

/**
 * Log API request with version information
 *
 * Logs to Application Insights for monitoring and metrics.
 * Use this to track version adoption and deprecated version usage.
 *
 * @param context - Azure Functions invocation context
 * @param version - API version string
 * @param endpoint - Endpoint path
 * @param request - HTTP request object
 *
 * @example
 * logApiRequest(context, 'v1', '/members', request);
 */
export function logApiRequest(
  context: InvocationContext,
  version: string,
  endpoint: string,
  request: HttpRequest
): void {
  const versionInfo = VERSION_INFO[version];

  context.log('API Request', {
    version: version,
    endpoint: endpoint,
    method: request.method,
    client_ip: request.headers.get('x-forwarded-for'),
    user_agent: request.headers.get('user-agent'),
    deprecated: versionInfo?.deprecated || false,
    timestamp: new Date().toISOString()
  });
}

/**
 * Log deprecated version usage with warning
 *
 * Logs warning-level message when deprecated API version is used.
 * This helps track clients that need to migrate.
 *
 * @param context - Azure Functions invocation context
 * @param version - API version string
 * @param endpoint - Endpoint path
 * @param request - HTTP request object
 *
 * @example
 * if (versionInfo.deprecated) {
 *   logDeprecatedVersionUsage(context, version, endpoint, request);
 * }
 */
export function logDeprecatedVersionUsage(
  context: InvocationContext,
  version: string,
  endpoint: string,
  request: HttpRequest
): void {
  const versionInfo = VERSION_INFO[version];

  context.warn('Deprecated API version used', {
    version: version,
    endpoint: endpoint,
    method: request.method,
    client_ip: request.headers.get('x-forwarded-for'),
    user_agent: request.headers.get('user-agent'),
    sunset_date: versionInfo?.sunsetDate || 'unknown',
    migration_guide: versionInfo?.migrationGuide || 'https://docs.ctn.cloud/api',
    days_until_sunset: versionInfo?.sunsetDate
      ? Math.floor((new Date(versionInfo.sunsetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null
  });
}

/**
 * Versioning middleware wrapper
 *
 * Wraps an API handler with automatic versioning support:
 * 1. Checks if version is sunset (returns 410 if yes)
 * 2. Adds version headers to response
 * 3. Adds deprecation notice to response body (if deprecated)
 * 4. Logs request with version info
 * 5. Logs warning if deprecated version used
 *
 * @param handler - Original Azure Function handler
 * @returns Wrapped handler with versioning support
 *
 * @example
 * export const GetMembers = withVersioning(async (request, context) => {
 *   // Your handler logic
 *   return { status: 200, jsonBody: data };
 * });
 */
export function withVersioning<T extends (request: HttpRequest, context: InvocationContext) => Promise<HttpResponseInit>>(
  handler: T
): T {
  return (async (request: HttpRequest, context: InvocationContext) => {
    // Extract version from URL
    const version = getApiVersion(request);
    const endpoint = new URL(request.url).pathname;

    // Check if version is sunset
    const sunsetResponse = checkVersionSunset(version);
    if (sunsetResponse) {
      context.warn('Sunset API version accessed', {
        version: version,
        endpoint: endpoint,
        client_ip: request.headers.get('x-forwarded-for')
      });
      return sunsetResponse;
    }

    // Log request with version info
    logApiRequest(context, version, endpoint, request);

    // Log warning if deprecated version
    const versionInfo = VERSION_INFO[version];
    if (versionInfo?.deprecated) {
      logDeprecatedVersionUsage(context, version, endpoint, request);
    }

    // Execute original handler
    let response = await handler(request, context);

    // Add version headers
    response = addVersionHeaders(response, version);

    // Add deprecation notice to body if deprecated
    if (versionInfo?.deprecated) {
      response = addDeprecationNotice(response, version);
    }

    return response;
  }) as T;
}

/**
 * Deprecate a version by updating VERSION_INFO
 *
 * Helper function to mark a version as deprecated.
 * In production, update VERSION_INFO directly instead of using this function.
 *
 * @param version - Version to deprecate
 * @param deprecationDate - ISO 8601 date when deprecation starts
 * @param sunsetDate - ISO 8601 date when version will be sunset
 * @param migrationGuide - URL to migration guide
 *
 * @example
 * // When releasing v2, deprecate v1:
 * deprecateVersion('v1', '2026-06-01T00:00:00Z', '2026-12-01T00:00:00Z',
 *   'https://docs.ctn.cloud/migrations/v1-to-v2');
 */
export function deprecateVersion(
  version: string,
  deprecationDate: string,
  sunsetDate: string,
  migrationGuide: string
): void {
  if (VERSION_INFO[version]) {
    VERSION_INFO[version] = {
      ...VERSION_INFO[version],
      deprecated: true,
      deprecationDate: deprecationDate,
      sunsetDate: sunsetDate,
      migrationGuide: migrationGuide
    };
  }
}

/**
 * Get version information for all registered versions
 *
 * Useful for admin endpoints or monitoring dashboards
 *
 * @returns Record of all version information
 *
 * @example
 * // Admin endpoint
 * return { status: 200, jsonBody: getAllVersionInfo() };
 */
export function getAllVersionInfo(): Record<string, VersionInfo> {
  return { ...VERSION_INFO };
}
