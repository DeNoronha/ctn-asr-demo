import { HttpRequest } from '@azure/functions';
import { randomUUID } from 'crypto';

/**
 * Get or generate a request ID for request tracking
 * @param request HTTP request
 * @returns Request ID (from header or newly generated)
 */
export function getRequestId(request: HttpRequest): string {
  try {
    const headerValue = request.headers.get('x-request-id');
    return headerValue || randomUUID();
  } catch (error) {
    // If headers access fails, just generate a new ID
    return randomUUID();
  }
}

/**
 * Create standard response headers with request ID
 * @param requestId Request ID to include
 * @returns Headers object
 */
export function createResponseHeaders(requestId: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'X-Request-ID': requestId
  };
}
