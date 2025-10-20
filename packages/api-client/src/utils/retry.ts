import { AxiosInstance } from 'axios';
import axiosRetry from 'axios-retry';

export function configureRetry(instance: AxiosInstance, retryAttempts: number = 3): void {
  axiosRetry(instance, {
    retries: retryAttempts,
    retryDelay: axiosRetry.exponentialDelay,
    retryCondition: (error) => {
      // Retry on network errors and 5xx errors
      return axiosRetry.isNetworkOrIdempotentRequestError(error) ||
             (error.response?.status ?? 0) >= 500;
    },
    onRetry: (retryCount, error) => {
      console.warn(`Retry attempt ${retryCount} for ${error.config?.url}`);
    }
  });
}
