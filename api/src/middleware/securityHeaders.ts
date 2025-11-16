// ========================================
// Security Headers Middleware
// ========================================
// Implements comprehensive security headers for API responses
// Includes CSP, HSTS, X-Frame-Options, etc.

import { HttpResponseInit } from '@azure/functions';
import { URLS } from '../config/constants';

/**
 * Security header configuration
 */
export interface SecurityHeadersConfig {
  enableCSP?: boolean;
  enableHSTS?: boolean;
  enableXFrameOptions?: boolean;
  enableXContentTypeOptions?: boolean;
  enableReferrerPolicy?: boolean;
  enablePermissionsPolicy?: boolean;
}

/**
 * Default security headers configuration
 */
const DEFAULT_CONFIG: SecurityHeadersConfig = {
  enableCSP: true,
  enableHSTS: true,
  enableXFrameOptions: true,
  enableXContentTypeOptions: true,
  enableReferrerPolicy: true,
  enablePermissionsPolicy: true,
};

/**
 * Content Security Policy directives
 * Strict policy to prevent XSS and injection attacks
 */
function getCSPHeader(): string {
  const directives = [
    "default-src 'self'", // Only load resources from same origin by default
    "script-src 'self' 'unsafe-inline'", // Allow inline scripts (needed for some frameworks)
    "style-src 'self' 'unsafe-inline'", // Allow inline styles
    "img-src 'self' data: https:", // Allow images from same origin, data URLs, and HTTPS
    "font-src 'self' data:", // Allow fonts from same origin and data URLs
    `connect-src 'self' ${URLS.AZURE_AD_CONNECT}`, // Allow API calls to self and Azure AD
    "frame-ancestors 'none'", // Prevent embedding in iframes (clickjacking protection)
    "base-uri 'self'", // Restrict base URL
    "form-action 'self'", // Restrict form submissions
    "object-src 'none'", // Block plugins
    "upgrade-insecure-requests", // Upgrade HTTP to HTTPS
  ];

  return directives.join('; ');
}

/**
 * HTTP Strict Transport Security (HSTS)
 * Forces HTTPS connections for 1 year
 */
function getHSTSHeader(): string {
  return 'max-age=31536000; includeSubDomains; preload';
}

/**
 * Referrer-Policy header
 * Controls how much referrer information is sent
 */
function getReferrerPolicyHeader(): string {
  return 'strict-origin-when-cross-origin';
}

/**
 * Permissions-Policy header (formerly Feature-Policy)
 * Controls which browser features can be used
 */
function getPermissionsPolicyHeader(): string {
  const policies = [
    'geolocation=()', // Disable geolocation
    'microphone=()', // Disable microphone
    'camera=()', // Disable camera
    'payment=()', // Disable payment APIs
    'usb=()', // Disable USB
    'magnetometer=()', // Disable magnetometer
    'gyroscope=()', // Disable gyroscope
    'accelerometer=()', // Disable accelerometer
  ];

  return policies.join(', ');
}

/**
 * Apply security headers to HTTP response
 */
export function applySecurityHeaders(
  response: HttpResponseInit,
  config: SecurityHeadersConfig = DEFAULT_CONFIG
): HttpResponseInit {
  const headers: Record<string, string> = {
    ...(response.headers as Record<string, string>),
  };

  // Content Security Policy
  if (config.enableCSP !== false) {
    headers['Content-Security-Policy'] = getCSPHeader();
  }

  // HTTP Strict Transport Security
  if (config.enableHSTS !== false) {
    headers['Strict-Transport-Security'] = getHSTSHeader();
  }

  // Prevent clickjacking
  if (config.enableXFrameOptions !== false) {
    headers['X-Frame-Options'] = 'DENY';
  }

  // Prevent MIME sniffing
  if (config.enableXContentTypeOptions !== false) {
    headers['X-Content-Type-Options'] = 'nosniff';
  }

  // Referrer policy
  if (config.enableReferrerPolicy !== false) {
    headers['Referrer-Policy'] = getReferrerPolicyHeader();
  }

  // Permissions policy
  if (config.enablePermissionsPolicy !== false) {
    headers['Permissions-Policy'] = getPermissionsPolicyHeader();
  }

  // Additional security headers
  headers['X-XSS-Protection'] = '1; mode=block'; // XSS filter (legacy browsers)
  headers['X-Permitted-Cross-Domain-Policies'] = 'none'; // Adobe products
  headers['X-Download-Options'] = 'noopen'; // IE download security

  return {
    ...response,
    headers,
  };
}

/**
 * Security headers middleware wrapper
 * Automatically applies security headers to all responses
 */
export function withSecurityHeaders<T extends (...args: any[]) => Promise<HttpResponseInit>>(
  handler: T,
  config?: SecurityHeadersConfig
): T {
  return (async (...args: any[]) => {
    const response = await handler(...args);
    return applySecurityHeaders(response, config);
  }) as T;
}

/**
 * CSP violation report endpoint data structure
 * Used if CSP violation reporting is enabled
 */
export interface CSPViolationReport {
  'csp-report': {
    'document-uri': string;
    'violated-directive': string;
    'effective-directive': string;
    'original-policy': string;
    'blocked-uri': string;
    'status-code': number;
    'source-file'?: string;
    'line-number'?: number;
    'column-number'?: number;
  };
}

/**
 * Process CSP violation report
 * Log CSP violations for monitoring
 */
export function processCSPViolationReport(report: CSPViolationReport): void {
  const violation = report['csp-report'];

  // Log violation for monitoring
  console.warn('CSP Violation:', {
    directive: violation['violated-directive'],
    blockedUri: violation['blocked-uri'],
    documentUri: violation['document-uri'],
    sourceFile: violation['source-file'],
    lineNumber: violation['line-number'],
  });

  // In production, send to Application Insights or logging service
}
