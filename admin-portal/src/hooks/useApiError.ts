/**
 * useApiError Hook (SEC-008)
 * React hook for consistent API error handling with generic user messages
 *
 * Usage:
 * ```tsx
 * const { handleError } = useApiError();
 *
 * try {
 *   await apiV2.createMember(data);
 * } catch (error) {
 *   handleError(error, 'creating member');
 * }
 * ```
 */

import { useNotification } from '../contexts/NotificationContext';
import { getGenericErrorMessage } from '../utils/errorHandler';

export function useApiError() {
  const notification = useNotification();

  /**
   * Handles API errors by showing generic user-friendly messages
   * and logging full error details for debugging
   *
   * @param error - The caught error object
   * @param operation - Description of the operation (e.g., "loading members", "creating contact")
   */
  const handleError = (error: unknown, operation: string) => {
    const userMessage = getGenericErrorMessage(error, operation);
    notification.showError(userMessage);
  };

  /**
   * Handles API errors without showing notification
   * Returns generic error message for manual handling
   *
   * @param error - The caught error object
   * @param operation - Description of the operation
   * @returns Generic error message
   */
  const getError = (error: unknown, operation: string): string => {
    return getGenericErrorMessage(error, operation);
  };

  return {
    handleError,
    getError,
  };
}
