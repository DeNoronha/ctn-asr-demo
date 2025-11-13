import { HttpResponseInit } from '@azure/functions';
import { HTTP_STATUS, CORS } from '../config/constants';

/**
 * Response Helper Utilities
 *
 * Standardized HTTP response builders for consistent API responses.
 * All helpers support optional request IDs for tracking.
 */

export interface ResponseOptions {
  requestId?: string;
  headers?: Record<string, string>;
  corsEnabled?: boolean;
}

/**
 * Build response headers with optional CORS and request ID
 */
function buildHeaders(options?: ResponseOptions): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers || {})
  };

  if (options?.requestId) {
    headers['X-Request-ID'] = options.requestId;
  }

  if (options?.corsEnabled) {
    headers['Access-Control-Allow-Origin'] = process.env.ALLOWED_ORIGIN || '*';
    headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
    headers['Access-Control-Allow-Credentials'] = 'true';
    headers['Access-Control-Max-Age'] = CORS.MAX_AGE_HEADER;
  }

  return headers;
}

// =====================================================
// 2xx Success Responses
// =====================================================

/**
 * 200 OK - Standard success response
 * @param data - Response data
 * @param options - Response options (requestId, headers, CORS)
 */
export function ok<T>(data: T, options?: ResponseOptions): HttpResponseInit {
  return {
    status: HTTP_STATUS.OK,
    headers: buildHeaders(options),
    jsonBody: data
  };
}

/**
 * 201 Created - Resource created successfully
 * @param data - Created resource data
 * @param options - Response options (requestId, headers, CORS)
 */
export function created<T>(data: T, options?: ResponseOptions): HttpResponseInit {
  return {
    status: HTTP_STATUS.CREATED,
    headers: buildHeaders(options),
    jsonBody: data
  };
}

/**
 * 204 No Content - Success with no response body
 * @param options - Response options (requestId, headers, CORS)
 */
export function noContent(options?: ResponseOptions): HttpResponseInit {
  return {
    status: HTTP_STATUS.NO_CONTENT,
    headers: buildHeaders(options)
  };
}

// =====================================================
// 4xx Client Error Responses
// =====================================================

/**
 * 400 Bad Request - Client sent invalid data
 * @param message - Error message
 * @param details - Optional error details
 * @param options - Response options (requestId, headers, CORS)
 */
export function badRequest(
  message: string,
  details?: any,
  options?: ResponseOptions
): HttpResponseInit {
  return {
    status: HTTP_STATUS.BAD_REQUEST,
    headers: buildHeaders(options),
    jsonBody: {
      error: message,
      ...(details && { details }),
      ...(options?.requestId && { requestId: options.requestId })
    }
  };
}

/**
 * 401 Unauthorized - Authentication required or failed
 * @param message - Error message (default: 'Authentication required')
 * @param options - Response options (requestId, headers, CORS)
 */
export function unauthorized(
  message = 'Authentication required',
  options?: ResponseOptions
): HttpResponseInit {
  return {
    status: HTTP_STATUS.UNAUTHORIZED,
    headers: buildHeaders(options),
    jsonBody: {
      error: message,
      ...(options?.requestId && { requestId: options.requestId })
    }
  };
}

/**
 * 403 Forbidden - Client lacks permissions
 * @param message - Error message (default: 'Insufficient permissions')
 * @param options - Response options (requestId, headers, CORS)
 */
export function forbidden(
  message = 'Insufficient permissions',
  options?: ResponseOptions
): HttpResponseInit {
  return {
    status: HTTP_STATUS.FORBIDDEN,
    headers: buildHeaders(options),
    jsonBody: {
      error: message,
      ...(options?.requestId && { requestId: options.requestId })
    }
  };
}

/**
 * 404 Not Found - Resource does not exist
 * @param resource - Resource type (e.g., 'Member', 'Endpoint')
 * @param identifier - Optional resource identifier
 * @param options - Response options (requestId, headers, CORS)
 */
export function notFound(
  resource: string,
  identifier?: string,
  options?: ResponseOptions
): HttpResponseInit {
  const message = identifier
    ? `${resource} '${identifier}' not found`
    : `${resource} not found`;

  return {
    status: HTTP_STATUS.NOT_FOUND,
    headers: buildHeaders(options),
    jsonBody: {
      error: message,
      ...(options?.requestId && { requestId: options.requestId })
    }
  };
}

/**
 * 409 Conflict - Resource already exists or version conflict
 * @param message - Error message
 * @param options - Response options (requestId, headers, CORS)
 */
export function conflict(
  message: string,
  options?: ResponseOptions
): HttpResponseInit {
  return {
    status: HTTP_STATUS.CONFLICT,
    headers: buildHeaders(options),
    jsonBody: {
      error: message,
      ...(options?.requestId && { requestId: options.requestId })
    }
  };
}

// =====================================================
// 5xx Server Error Responses
// =====================================================

/**
 * 500 Internal Server Error - Unexpected server error
 * @param message - Error message (default: 'Internal server error')
 * @param details - Optional error details (only in development)
 * @param options - Response options (requestId, headers, CORS)
 */
export function serverError(
  message = 'Internal server error',
  details?: any,
  options?: ResponseOptions
): HttpResponseInit {
  return {
    status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    headers: buildHeaders(options),
    jsonBody: {
      error: message,
      ...(options?.requestId && { requestId: options.requestId }),
      // Only include details in development
      ...(process.env.NODE_ENV === 'development' && details && { details })
    }
  };
}

// =====================================================
// Specialized Responses
// =====================================================

/**
 * CORS Preflight Response (OPTIONS)
 * @param options - Response options (headers, CORS settings)
 */
export function corsPreflightResponse(options?: ResponseOptions): HttpResponseInit {
  return {
    status: 204,
    headers: buildHeaders({ ...options, corsEnabled: true })
  };
}

/**
 * Paginated Response
 * @param data - Array of items
 * @param page - Current page number
 * @param pageSize - Items per page
 * @param totalCount - Total number of items
 * @param options - Response options (requestId, headers, CORS)
 */
export function paginated<T>(
  data: T[],
  page: number,
  pageSize: number,
  totalCount: number,
  options?: ResponseOptions
): HttpResponseInit {
  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    status: HTTP_STATUS.OK,
    headers: buildHeaders(options),
    jsonBody: {
      data,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    }
  };
}
