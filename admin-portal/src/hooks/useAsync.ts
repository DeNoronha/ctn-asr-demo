// useAsync.ts - Hook for managing async operations with loading/error states
import { useCallback, useState } from 'react';
import { useNotification } from '../contexts/NotificationContext';

interface UseAsyncOptions<T = unknown> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  showSuccessNotification?: boolean;
  showErrorNotification?: boolean;
  successMessage?: string;
  errorMessage?: string;
}

export const useAsync = <T = unknown>(options: UseAsyncOptions<T> = {}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<T | null>(null);
  const notification = useNotification();

  // Destructure options to avoid object reference issues in dependencies
  const {
    showSuccessNotification,
    showErrorNotification,
    successMessage,
    errorMessage,
    onSuccess,
    onError,
  } = options;

  const execute = useCallback(
    async (asyncFunction: () => Promise<T>) => {
      setLoading(true);
      setError(null);

      try {
        const result = await asyncFunction();
        setData(result);

        if (showSuccessNotification && successMessage) {
          notification.showSuccess(successMessage);
        }

        onSuccess?.(result);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('An error occurred');
        setError(error);

        if (showErrorNotification !== false) {
          notification.showError(errorMessage || error.message || 'Operation failed');
        }

        onError?.(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [notification, showSuccessNotification, showErrorNotification, successMessage, errorMessage, onSuccess, onError]
  );

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setData(null);
  }, []);

  return {
    loading,
    error,
    data,
    execute,
    reset,
  };
};
