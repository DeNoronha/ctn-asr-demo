// ========================================
// Content-Type Validation Middleware
// ========================================
// Validates Content-Type header on mutation requests
// Prevents content smuggling and content confusion attacks

import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { createLogger, logSecurityEvent } from '../utils/logger';
import { AuthenticatedRequest } from './endpointWrapper';

/**
 * Safely get header value to avoid "Cannot read private member" error
 */
function safeGetHeader(headers: any, name: string): string | null {
  try {
    return headers.get(name);
  } catch (error) {
    return null;
  }
}

/**
 * Content-Type validation result
 */
export interface ContentTypeValidationSuccess {
  valid: true;
}

export interface ContentTypeValidationFailure {
  valid: false;
  response: HttpResponseInit;
}

export type ContentTypeValidationResult = ContentTypeValidationSuccess | ContentTypeValidationFailure;

/**
 * Validate Content-Type header on mutation requests (POST/PUT/PATCH/DELETE)
 *
 * Security rationale:
 * - Prevents content smuggling attacks where attacker sends JSON in XML Content-Type
 * - Prevents MIME confusion where server processes unexpected content types
 * - Ensures API consistency and proper request parsing
 *
 * @param request HTTP request
 * @param context Invocation context
 * @param requiredContentType Expected Content-Type (default: 'application/json')
 * @returns Validation result
 */
export async function validateContentType(
  request: HttpRequest | AuthenticatedRequest,
  context: InvocationContext,
  requiredContentType: string = 'application/json'
): Promise<ContentTypeValidationResult> {
  const logger = createLogger(context);
  const correlationId = safeGetHeader(request.headers, 'x-correlation-id') || 'unknown';

  // Only validate mutation methods (POST, PUT, PATCH, DELETE)
  const mutationMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  if (!mutationMethods.includes(request.method.toUpperCase())) {
    // Skip validation for GET, HEAD, OPTIONS
    return { valid: true };
  }

  // Extract Content-Type header
  const contentType = safeGetHeader(request.headers, 'content-type');

  // Check if Content-Type header is present
  if (!contentType) {
    logSecurityEvent(logger, 'Content-Type Validation Failed - Missing Header', correlationId, {
      method: request.method,
      url: request.url,
      ipAddress: safeGetHeader(request.headers, 'x-forwarded-for') || 'unknown',
      userAgent: safeGetHeader(request.headers, 'user-agent') || 'unknown',
    });

    return {
      valid: false,
      response: {
        status: 415,
        headers: {
          'Content-Type': 'application/json',
          'X-Correlation-ID': correlationId,
        },
        body: JSON.stringify({
          error: 'unsupported_media_type',
          error_description: `Content-Type header is required for ${request.method} requests`,
          required_content_type: requiredContentType,
        }),
      },
    };
  }

  // Normalize Content-Type (strip charset and parameters)
  const normalizedContentType = contentType.split(';')[0].trim().toLowerCase();

  // Validate Content-Type matches expected type
  if (normalizedContentType !== requiredContentType.toLowerCase()) {
    logSecurityEvent(logger, 'Content-Type Validation Failed - Incorrect Type', correlationId, {
      method: request.method,
      url: request.url,
      receivedContentType: normalizedContentType,
      requiredContentType: requiredContentType,
      ipAddress: safeGetHeader(request.headers, 'x-forwarded-for') || 'unknown',
      userAgent: safeGetHeader(request.headers, 'user-agent') || 'unknown',
    });

    return {
      valid: false,
      response: {
        status: 415,
        headers: {
          'Content-Type': 'application/json',
          'X-Correlation-ID': correlationId,
        },
        body: JSON.stringify({
          error: 'unsupported_media_type',
          error_description: `Content-Type must be '${requiredContentType}' for ${request.method} requests`,
          received_content_type: normalizedContentType,
          required_content_type: requiredContentType,
        }),
      },
    };
  }

  // Content-Type validation successful
  context.log(`Content-Type validation passed for ${request.method} ${request.url}: ${contentType}`);
  return { valid: true };
}

/**
 * Content-Type validation middleware wrapper
 * Can be used to wrap endpoint handlers
 *
 * @example
 * ```typescript
 * const contentTypeCheck = await validateContentType(request, context);
 * if (!contentTypeCheck.valid) return contentTypeCheck.response;
 * ```
 */
export function withContentTypeValidation(
  requiredContentType: string = 'application/json'
): (
  request: HttpRequest | AuthenticatedRequest,
  context: InvocationContext
) => Promise<ContentTypeValidationResult> {
  return async (
    request: HttpRequest | AuthenticatedRequest,
    context: InvocationContext
  ) => {
    return validateContentType(request, context, requiredContentType);
  };
}
