import { HttpResponseInit, InvocationContext } from '@azure/functions';
import { randomUUID } from 'crypto';

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
 * PostgreSQL error code mappings
 * Reference: https://www.postgresql.org/docs/current/errcodes-appendix.html
 */
const POSTGRES_ERROR_MAP: Record<string, { status: number; code: string; message: string }> = {
  // Class 23 - Integrity Constraint Violation
  '23000': { status: 400, code: ErrorCodes.VALIDATION_ERROR, message: 'Data integrity constraint violation' },
  '23001': { status: 400, code: ErrorCodes.VALIDATION_ERROR, message: 'Constraint violation' },
  '23502': { status: 400, code: ErrorCodes.MISSING_FIELD, message: 'Required field is missing' },
  '23503': { status: 400, code: 'FK_VIOLATION', message: 'Referenced resource not found' },
  '23505': { status: 409, code: ErrorCodes.DUPLICATE, message: 'Resource already exists' },
  '23514': { status: 400, code: ErrorCodes.VALIDATION_ERROR, message: 'Data validation failed' },

  // Class 22 - Data Exception
  '22001': { status: 400, code: ErrorCodes.VALIDATION_ERROR, message: 'Input value too long' },
  '22003': { status: 400, code: ErrorCodes.VALIDATION_ERROR, message: 'Numeric value out of range' },
  '22007': { status: 400, code: ErrorCodes.INVALID_FORMAT, message: 'Invalid date/time format' },
  '22008': { status: 400, code: ErrorCodes.INVALID_FORMAT, message: 'Date/time field overflow' },
  '22012': { status: 400, code: ErrorCodes.VALIDATION_ERROR, message: 'Division by zero' },
  '22P02': { status: 400, code: ErrorCodes.INVALID_FORMAT, message: 'Invalid input syntax' },
  '22P03': { status: 400, code: ErrorCodes.INVALID_FORMAT, message: 'Invalid binary representation' },

  // Class 42 - Syntax Error or Access Rule Violation (should not happen in production)
  '42601': { status: 500, code: ErrorCodes.DATABASE_ERROR, message: 'Database operation failed' },
  '42501': { status: 500, code: ErrorCodes.DATABASE_ERROR, message: 'Database operation failed' },
  '42846': { status: 500, code: ErrorCodes.DATABASE_ERROR, message: 'Database operation failed' },
  '42803': { status: 500, code: ErrorCodes.DATABASE_ERROR, message: 'Database operation failed' },

  // Class 08 - Connection Exception
  '08000': { status: 503, code: ErrorCodes.DATABASE_ERROR, message: 'Database temporarily unavailable' },
  '08003': { status: 503, code: ErrorCodes.DATABASE_ERROR, message: 'Database temporarily unavailable' },
  '08006': { status: 503, code: ErrorCodes.DATABASE_ERROR, message: 'Database temporarily unavailable' },

  // Class 53 - Insufficient Resources
  '53000': { status: 503, code: ErrorCodes.DATABASE_ERROR, message: 'Service temporarily unavailable' },
  '53100': { status: 503, code: ErrorCodes.DATABASE_ERROR, message: 'Service temporarily unavailable' },
  '53200': { status: 503, code: ErrorCodes.DATABASE_ERROR, message: 'Service temporarily unavailable' },
  '53300': { status: 503, code: ErrorCodes.DATABASE_ERROR, message: 'Service temporarily unavailable' },

  // Class 57 - Operator Intervention
  '57000': { status: 503, code: ErrorCodes.DATABASE_ERROR, message: 'Service temporarily unavailable' },
  '57014': { status: 503, code: ErrorCodes.DATABASE_ERROR, message: 'Database operation cancelled' },
  '57P01': { status: 503, code: ErrorCodes.DATABASE_ERROR, message: 'Database temporarily unavailable' },
};

/**
 * Generate a correlation ID for error tracking
 */
function generateCorrelationId(): string {
  return randomUUID();
}

/**
 * Standardized error handler for API functions with security-focused sanitization
 *
 * Security Features:
 * - Generates correlation IDs for error tracking without exposing internals
 * - Comprehensive PostgreSQL error code mapping to generic messages
 * - NO stack traces or internal details exposed (even in development)
 * - All sensitive error details logged server-side only
 *
 * @param error The error to handle
 * @param context Invocation context for logging
 * @param requestId Optional request ID for tracking (if not provided, generates one)
 * @returns HTTP response with sanitized error details
 */
export function handleError(
  error: any,
  context: InvocationContext,
  requestId?: string
): HttpResponseInit {
  // Generate correlation ID if not provided
  const correlationId = requestId || generateCorrelationId();

  // Log full error details server-side ONLY (with correlation ID for support debugging)
  context.error(`[${correlationId}] API Error:`, {
    name: error.name,
    message: error.message,
    stack: error.stack,
    code: error.code,
    detail: error.detail,
    hint: error.hint,
    position: error.position,
    internalPosition: error.internalPosition,
    internalQuery: error.internalQuery,
    where: error.where,
    schema: error.schema,
    table: error.table,
    column: error.column,
    dataType: error.dataType,
    constraint: error.constraint,
    file: error.file,
    line: error.line,
    routine: error.routine
  });

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Correlation-ID': correlationId
  };

  // Handle ApiError instances (custom errors with safe messages)
  if (error instanceof ApiError) {
    return {
      status: error.statusCode,
      headers,
      body: JSON.stringify({
        error: error.message,
        code: error.code,
        correlationId
        // SECURITY: Never expose error.details to clients
      })
    };
  }

  // Handle PostgreSQL database errors (comprehensive mapping)
  if (error.code && POSTGRES_ERROR_MAP[error.code]) {
    const mapped = POSTGRES_ERROR_MAP[error.code];
    return {
      status: mapped.status,
      headers,
      body: JSON.stringify({
        error: mapped.message,
        code: mapped.code,
        correlationId
      })
    };
  }

  // Handle other PostgreSQL errors not in map (generic response)
  if (error.code && typeof error.code === 'string' && /^[0-9A-Z]{5}$/.test(error.code)) {
    // PostgreSQL error codes are 5-character alphanumeric
    const status = error.code.startsWith('23') ? 400 : 500; // 23xxx = constraint violations
    return {
      status,
      headers,
      body: JSON.stringify({
        error: status === 400 ? 'Invalid request data' : 'Database operation failed',
        code: status === 400 ? ErrorCodes.VALIDATION_ERROR : ErrorCodes.DATABASE_ERROR,
        correlationId
      })
    };
  }

  // Handle JWT/authentication errors
  if (error.name === 'JsonWebTokenError') {
    return {
      status: 401,
      headers,
      body: JSON.stringify({
        error: 'Invalid authentication token',
        code: ErrorCodes.INVALID_TOKEN,
        correlationId
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
        correlationId
      })
    };
  }

  // Handle network/external service errors
  if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
    return {
      status: 503,
      headers,
      body: JSON.stringify({
        error: 'External service temporarily unavailable',
        code: ErrorCodes.EXTERNAL_SERVICE_ERROR,
        correlationId
      })
    };
  }

  // Default error response - completely generic, no internal details
  // SECURITY: Never expose error.message or error.stack to clients
  return {
    status: 500,
    headers,
    body: JSON.stringify({
      error: 'An internal error occurred. Please contact support with the correlation ID if the issue persists.',
      code: ErrorCodes.INTERNAL_ERROR,
      correlationId
    })
  };
}

/**
 * Sanitize error message for safe client exposure
 * Use this when you want to return a specific error message but ensure it doesn't leak internals
 *
 * @param error The error to sanitize
 * @param context Invocation context for logging
 * @param safeMessage Safe message to show to client
 * @param errorCode Error code to return
 * @returns Sanitized error response
 */
export function sanitizeErrorMessage(
  error: any,
  context: InvocationContext,
  safeMessage: string,
  errorCode: string = ErrorCodes.INTERNAL_ERROR
): HttpResponseInit {
  const correlationId = generateCorrelationId();

  // Log full error server-side
  context.error(`[${correlationId}] Error:`, {
    message: error?.message || String(error),
    stack: error?.stack,
    code: error?.code
  });

  return {
    status: 500,
    headers: {
      'Content-Type': 'application/json',
      'X-Correlation-ID': correlationId
    },
    body: JSON.stringify({
      error: safeMessage,
      code: errorCode,
      correlationId
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
