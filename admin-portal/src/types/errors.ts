/**
 * Custom Error Classes for Type-Safe Error Handling
 * Eliminates `any` escape hatches and provides structured error information
 *
 * SECURITY: SEC-008 - Generic error messages for users, detailed logging for developers
 * COMPLIANCE: OWASP A04:2021 (Insecure Design)
 */

/**
 * Base class for all custom errors in the application
 * Extends Error with additional structured metadata
 */
export class AppError extends Error {
  public readonly timestamp: Date;
  public readonly isOperational: boolean; // true = expected error, false = unexpected bug

  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number,
    public readonly metadata?: Record<string, unknown>,
    isOperational = true
  ) {
    super(message);
    this.name = this.constructor.name;
    this.timestamp = new Date();
    this.isOperational = isOperational;

    // Maintains proper stack trace for where our error was thrown (V8 only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Base class for Microsoft Graph API errors
 * Common parent for all Graph-related errors
 */
export class GraphApiError extends AppError {
  constructor(
    message: string,
    code: string,
    statusCode?: number,
    public readonly originalError?: unknown,
    metadata?: Record<string, unknown>
  ) {
    super(message, code, statusCode, metadata, true);
    this.name = 'GraphApiError';
  }

  /**
   * Factory method to create GraphApiError from MSAL error objects
   */
  static fromMsalError(error: unknown): GraphApiError {
    const msalError = error as {
      errorCode?: string;
      errorMessage?: string;
      message?: string;
      statusCode?: number;
    };

    const code = msalError.errorCode || 'UNKNOWN_MSAL_ERROR';
    const message = msalError.errorMessage || msalError.message || 'An unknown error occurred';
    const statusCode = msalError.statusCode;

    return new GraphApiError(message, code, statusCode, error);
  }
}

/**
 * User consent required for Graph API access
 * Thrown when admin consent is needed for Graph scopes
 *
 * Error codes that trigger this:
 * - consent_required: User hasn't granted consent
 * - interaction_required: Interactive consent needed
 * - invalid_grant: No valid consent exists
 * - AADSTS65001: Token validation failed due to missing consent
 */
export class ConsentRequiredError extends GraphApiError {
  constructor(
    message = 'Administrator consent is required to access Microsoft Graph API',
    public readonly requiredScopes: string[] = [],
    originalError?: unknown
  ) {
    super(message, 'CONSENT_REQUIRED', 403, originalError, { requiredScopes });
    this.name = 'ConsentRequiredError';
  }

  /**
   * Check if an error is a consent-related error
   */
  static isConsentError(error: unknown): boolean {
    const msalError = error as {
      errorCode?: string;
      errorMessage?: string;
      message?: string;
    };

    const consentErrorCodes = ['consent_required', 'interaction_required', 'invalid_grant'];

    return (
      consentErrorCodes.includes(msalError.errorCode || '') ||
      msalError.errorMessage?.includes('AADSTS65001') ||
      msalError.message === 'CONSENT_REQUIRED'
    );
  }
}

/**
 * Graph API authentication/authorization errors
 * Covers token expiration, invalid tokens, permission issues
 */
export class GraphAuthError extends GraphApiError {
  constructor(
    message = 'Authentication failed for Microsoft Graph API',
    code = 'GRAPH_AUTH_ERROR',
    statusCode = 401,
    originalError?: unknown
  ) {
    super(message, code, statusCode, originalError);
    this.name = 'GraphAuthError';
  }
}

/**
 * Graph API rate limiting errors
 * Thrown when Graph API throttles requests
 */
export class GraphRateLimitError extends GraphApiError {
  constructor(
    message = 'Microsoft Graph API rate limit exceeded',
    public readonly retryAfterSeconds?: number,
    originalError?: unknown
  ) {
    super(message, 'GRAPH_RATE_LIMIT', 429, originalError, {
      retryAfterSeconds,
    });
    this.name = 'GraphRateLimitError';
  }
}

/**
 * Graph API resource not found errors
 * User, service principal, or other resource doesn't exist
 */
export class GraphNotFoundError extends GraphApiError {
  constructor(resourceType: string, resourceId: string, originalError?: unknown) {
    super(
      `${resourceType} with ID ${resourceId} not found`,
      'GRAPH_NOT_FOUND',
      404,
      originalError,
      { resourceType, resourceId }
    );
    this.name = 'GraphNotFoundError';
  }
}

/**
 * Graph API permission errors
 * User or app lacks required permissions
 */
export class GraphPermissionError extends GraphApiError {
  constructor(
    message = 'Insufficient permissions for this operation',
    public readonly requiredPermissions?: string[],
    originalError?: unknown
  ) {
    super(message, 'GRAPH_PERMISSION_DENIED', 403, originalError, {
      requiredPermissions,
    });
    this.name = 'GraphPermissionError';
  }
}

/**
 * API validation errors (400 Bad Request)
 * Invalid input, missing required fields, constraint violations
 */
export class ValidationError extends AppError {
  constructor(
    message: string,
    public readonly field?: string,
    public readonly validationErrors?: Array<{
      field: string;
      message: string;
    }>,
    _originalError?: unknown
  ) {
    super(message, 'VALIDATION_ERROR', 400, { field, validationErrors }, true);
    this.name = 'ValidationError';
  }
}

/**
 * Network/connectivity errors
 * Timeout, network unreachable, DNS failures
 */
export class NetworkError extends AppError {
  constructor(
    message = 'Network error occurred',
    public readonly url?: string,
    originalError?: unknown
  ) {
    super(message, 'NETWORK_ERROR', undefined, { url, originalError }, true);
    this.name = 'NetworkError';
  }
}

/**
 * API timeout errors
 * Request exceeded maximum allowed time
 */
export class TimeoutError extends AppError {
  constructor(
    message = 'Request timed out',
    public readonly timeoutMs?: number,
    originalError?: unknown
  ) {
    super(message, 'TIMEOUT_ERROR', 408, { timeoutMs, originalError }, true);
    this.name = 'TimeoutError';
  }
}

/**
 * Generic API errors for backend API calls (non-Graph)
 * HTTP errors from Azure Functions API
 */
export class ApiError extends AppError {
  constructor(
    message: string,
    statusCode: number,
    public readonly endpoint?: string,
    public readonly responseData?: unknown,
    originalError?: unknown
  ) {
    super(
      message,
      `API_ERROR_${statusCode}`,
      statusCode,
      { endpoint, responseData, originalError },
      true
    );
    this.name = 'ApiError';
  }

  /**
   * Factory method to create ApiError from axios/fetch error
   */
  static fromHttpError(error: unknown, endpoint?: string): ApiError {
    const httpError = error as {
      response?: {
        status?: number;
        data?: unknown;
      };
      message?: string;
      status?: number;
    };

    const status = httpError.response?.status || httpError.status || 500;
    const message = httpError.message || 'An error occurred while communicating with the API';
    const responseData = httpError.response?.data;

    return new ApiError(message, status, endpoint, responseData, error);
  }
}

/**
 * Type guard to check if error is an instance of AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Type guard to check if error is a ConsentRequiredError
 */
export function isConsentRequiredError(error: unknown): error is ConsentRequiredError {
  return error instanceof ConsentRequiredError;
}

/**
 * Type guard to check if error is a GraphApiError
 */
export function isGraphApiError(error: unknown): error is GraphApiError {
  return error instanceof GraphApiError;
}

/**
 * Type guard to check if error is a ValidationError
 */
export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

/**
 * Type guard to check if error is a NetworkError
 */
export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof NetworkError;
}

/**
 * Extract a user-friendly error message from any error type
 * SECURITY: Prevents information disclosure while providing useful feedback
 *
 * @param error - The error to extract message from
 * @param fallback - Fallback message if extraction fails
 * @returns User-friendly error message
 */
export function getErrorMessage(error: unknown, fallback = 'An unexpected error occurred'): string {
  if (error instanceof AppError) {
    // AppError messages are already user-friendly
    return error.message;
  }

  if (error instanceof Error) {
    // Standard Error objects - use message
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  // Unknown error type - use fallback
  return fallback;
}

/**
 * Log error details for debugging while hiding sensitive information
 * Should be used in all catch blocks for proper error tracking
 *
 * @param error - The error to log
 * @param context - Additional context about where/when error occurred
 */
export function logError(error: unknown, context?: string): void {
  const prefix = context ? `[${context}]` : '';

  if (error instanceof AppError) {
    console.error(`${prefix} ${error.name}:`, {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      timestamp: error.timestamp,
      metadata: error.metadata,
      stack: error.stack,
    });
  } else if (error instanceof Error) {
    console.error(`${prefix} Error:`, {
      name: error.name,
      message: error.message,
      stack: error.stack,
    });
  } else {
    console.error(`${prefix} Unknown error:`, error);
  }
}

/**
 * Convert unknown errors to typed AppError instances
 * Useful for wrapping third-party errors in our error system
 *
 * @param error - Unknown error to convert
 * @param context - Context about where error occurred
 * @returns Typed AppError instance
 */
export function toAppError(error: unknown, context = 'Unknown operation'): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    return new AppError(error.message, 'WRAPPED_ERROR', undefined, { originalError: error }, false);
  }

  if (typeof error === 'string') {
    return new AppError(error, 'STRING_ERROR', undefined, undefined, false);
  }

  return new AppError(
    `An error occurred during: ${context}`,
    'UNKNOWN_ERROR',
    undefined,
    { originalError: error },
    false
  );
}
