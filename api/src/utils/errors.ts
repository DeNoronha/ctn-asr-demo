import { HttpResponseInit, InvocationContext } from '@azure/functions';

/**
 * Custom API Error class for structured error handling
 */
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Standard error codes
 */
export const ErrorCodes = {
  // 400 Bad Request
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  MISSING_FIELD: 'MISSING_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',

  // 401 Unauthorized
  AUTH_FAILED: 'AUTH_FAILED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  MISSING_AUTH: 'MISSING_AUTH',

  // 403 Forbidden
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  ACCESS_DENIED: 'ACCESS_DENIED',

  // 404 Not Found
  NOT_FOUND: 'NOT_FOUND',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',

  // 409 Conflict
  DUPLICATE: 'DUPLICATE',
  CONFLICT: 'CONFLICT',

  // 429 Too Many Requests
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

  // 500 Internal Server Error
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
} as const;

/**
 * Standardized error handler for API functions
 * @param error The error to handle
 * @param context Invocation context for logging
 * @param requestId Optional request ID for tracking
 * @returns HTTP response with appropriate error details
 */
export function handleError(
  error: any,
  context: InvocationContext,
  requestId?: string
): HttpResponseInit {
  // Log full error for debugging
  context.error('API Error:', {
    message: error.message,
    stack: error.stack,
    code: error.code,
    requestId
  });

  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  if (requestId) {
    headers['X-Request-ID'] = requestId;
  }

  // Handle ApiError instances
  if (error instanceof ApiError) {
    return {
      status: error.statusCode,
      headers,
      body: JSON.stringify({
        error: error.message,
        code: error.code,
        requestId,
        // Only include details in development
        ...(process.env.NODE_ENV === 'development' && { details: error.details })
      })
    };
  }

  // Handle database errors
  if (error.code) {
    // PostgreSQL unique violation
    if (error.code === '23505') {
      return {
        status: 409,
        headers,
        body: JSON.stringify({
          error: 'Resource already exists',
          code: ErrorCodes.DUPLICATE,
          requestId
        })
      };
    }

    // PostgreSQL foreign key violation
    if (error.code === '23503') {
      return {
        status: 400,
        headers,
        body: JSON.stringify({
          error: 'Referenced resource not found',
          code: 'FK_VIOLATION',
          requestId
        })
      };
    }

    // PostgreSQL not null violation
    if (error.code === '23502') {
      return {
        status: 400,
        headers,
        body: JSON.stringify({
          error: 'Required field is missing',
          code: ErrorCodes.MISSING_FIELD,
          requestId
        })
      };
    }
  }

  // Handle JWT/authentication errors
  if (error.name === 'JsonWebTokenError') {
    return {
      status: 401,
      headers,
      body: JSON.stringify({
        error: 'Invalid authentication token',
        code: ErrorCodes.INVALID_TOKEN,
        requestId
      })
    };
  }

  if (error.name === 'TokenExpiredError') {
    return {
      status: 401,
      headers,
      body: JSON.stringify({
        error: 'Authentication token has expired',
        code: ErrorCodes.TOKEN_EXPIRED,
        requestId
      })
    };
  }

  // Default error response (don't expose internal details)
  return {
    status: 500,
    headers,
    body: JSON.stringify({
      error: 'An internal error occurred',
      code: ErrorCodes.INTERNAL_ERROR,
      requestId,
      // Only in development
      ...(process.env.NODE_ENV === 'development' && {
        message: error.message,
        stack: error.stack
      })
    })
  };
}

/**
 * Validate required fields in request body
 * @param body Request body
 * @param requiredFields Array of required field names
 * @throws ApiError if validation fails
 */
export function validateRequiredFields(body: any, requiredFields: string[]): void {
  const missingFields: string[] = [];

  for (const field of requiredFields) {
    if (!body[field]) {
      missingFields.push(field);
    }
  }

  if (missingFields.length > 0) {
    throw new ApiError(
      400,
      `Missing required fields: ${missingFields.join(', ')}`,
      ErrorCodes.MISSING_FIELD,
      { missingFields }
    );
  }
}

/**
 * Create a CORS-enabled response
 * @param response Base response
 * @param allowOrigin Allowed origin (defaults to config)
 * @returns Response with CORS headers
 */
export function withCORS(
  response: HttpResponseInit,
  allowOrigin?: string
): HttpResponseInit {
  const origin = allowOrigin || process.env.ALLOWED_ORIGIN || 'https://calm-tree-03352ba03.1.azurestaticapps.net';

  return {
    ...response,
    headers: {
      ...response.headers,
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true'
    }
  };
}
