/**
 * Error Handler Utility (SEC-008)
 * Provides generic error messages to prevent information disclosure
 * while logging detailed errors for debugging/monitoring
 */

interface ApiError {
  response?: {
    status?: number;
    data?: {
      error?: string;
      message?: string;
    };
  };
  message?: string;
}

/**
 * Converts detailed error objects into user-friendly generic messages
 * Logs full error details to console.error for debugging (stripped in production by SEC-009)
 *
 * @param error - The caught error object
 * @param operation - Description of the operation that failed (e.g., "loading members")
 * @returns User-friendly error message
 */
export function getGenericErrorMessage(error: unknown, operation: string): string {
  const apiError = error as ApiError;

  // Log full error details for debugging (stripped in production by SEC-009)
  console.error(`Error ${operation}:`, error);

  // Extract status code if available
  const status = apiError.response?.status;

  // For validation errors (400) and conflicts (409), allow specific error messages
  if (status === 400 || status === 409) {
    const specificMessage = apiError.response?.data?.message || apiError.response?.data?.error;
    if (specificMessage) {
      return specificMessage;
    }
  }

  // Return generic messages based on status code
  switch (status) {
    case 400:
      return `Invalid request while ${operation}. Please check your input and try again.`;
    case 401:
      return 'Your session has expired. Please log in again.';
    case 403:
      return `You don't have permission to perform this action.`;
    case 404:
      return `The requested resource was not found while ${operation}.`;
    case 409:
      return `A conflict occurred while ${operation}. The resource may already exist.`;
    case 422:
      return `The data provided while ${operation} could not be processed. Please check your input.`;
    case 429:
      return 'Too many requests. Please wait a moment and try again.';
    case 500:
      return `A server error occurred while ${operation}. Please try again later.`;
    case 502:
    case 503:
    case 504:
      return 'The service is temporarily unavailable. Please try again in a few moments.';
    default:
      return `An error occurred while ${operation}. Please try again.`;
  }
}

/**
 * Handles async operation errors with generic messages
 * Use this for API calls and async operations
 *
 * @example
 * ```ts
 * try {
 *   await api.createMember(data);
 * } catch (error) {
 *   notification.showError(getGenericErrorMessage(error, 'creating member'));
 * }
 * ```
 */
export function handleApiError(error: unknown, operation: string): never {
  throw new Error(getGenericErrorMessage(error, operation));
}

/**
 * Extract user-friendly message from error for display
 * Automatically sanitizes detailed error information
 *
 * @param error - The caught error object
 * @param fallbackMessage - Default message if error parsing fails
 * @returns User-friendly error message
 */
export function getErrorMessage(
  error: unknown,
  fallbackMessage = 'An unexpected error occurred'
): string {
  const apiError = error as ApiError;

  // Log full error for debugging
  console.error('Error details:', error);

  // For validation errors (400), try to extract specific message
  if (apiError.response?.status === 400) {
    return apiError.response?.data?.error || apiError.response?.data?.message || fallbackMessage;
  }

  // For all other errors, return generic message
  return fallbackMessage;
}
