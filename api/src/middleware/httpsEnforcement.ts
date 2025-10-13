// ========================================
// HTTPS Enforcement Middleware
// ========================================
// Ensures all production requests use HTTPS protocol
// Prevents man-in-the-middle attacks and credential exposure

import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

/**
 * Check if request uses HTTPS protocol
 * @param request HTTP request
 * @returns true if HTTPS, false if HTTP
 */
export function isHttpsRequest(request: HttpRequest): boolean {
  const url = request.url.toLowerCase();
  return url.startsWith('https://');
}

/**
 * Enforce HTTPS in production environment
 * @param request HTTP request
 * @param context Invocation context
 * @returns null if HTTPS enforcement passed, error response if HTTP used in production
 */
export function enforceHttps(
  request: HttpRequest,
  context: InvocationContext
): HttpResponseInit | null {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const httpsOnly = process.env.HTTPS_ONLY === 'true';

  // Skip enforcement in development
  if (nodeEnv === 'development' || nodeEnv === 'test') {
    return null;
  }

  // Skip enforcement if HTTPS_ONLY not explicitly enabled
  if (!httpsOnly) {
    context.warn('HTTPS_ONLY is not enabled - insecure HTTP connections allowed in production');
    return null;
  }

  // Check if request uses HTTPS
  if (!isHttpsRequest(request)) {
    context.error(`HTTP request blocked in production: ${request.method} ${request.url}`);

    // Construct HTTPS redirect URL
    const httpsUrl = request.url.replace(/^http:\/\//i, 'https://');

    return {
      status: 403,
      headers: {
        'Content-Type': 'application/json',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
      },
      body: JSON.stringify({
        error: 'https_required',
        error_description: 'HTTPS is required for all API requests in production',
        https_url: httpsUrl,
        message: 'Please use HTTPS instead of HTTP to access this API',
      }),
    };
  }

  // Request uses HTTPS - allow it
  return null;
}

/**
 * Add security headers to enforce HTTPS
 * Should be added to all responses in production
 */
export function addHttpsSecurityHeaders(response: HttpResponseInit): HttpResponseInit {
  const nodeEnv = process.env.NODE_ENV || 'development';

  // Skip in development
  if (nodeEnv === 'development' || nodeEnv === 'test') {
    return response;
  }

  return {
    ...response,
    headers: {
      ...response.headers,
      // HSTS - Force HTTPS for 1 year
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
      // Prevent protocol downgrade attacks
      'Upgrade-Insecure-Requests': '1',
    },
  };
}
