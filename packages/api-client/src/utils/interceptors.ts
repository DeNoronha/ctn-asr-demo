import axiosLib from 'axios';
import { AsrApiError } from './error';

/**
 * Configure axios interceptors for authentication and error handling.
 *
 * NOTE: This file uses type assertions due to conflicts between axios type definitions
 * and angular/axios-retry typings in the monorepo. The runtime behavior is correct.
 */
export function configureInterceptors(
  instance: ReturnType<typeof axiosLib.create>,
  getAccessToken: () => Promise<string> | string,
  onError?: (error: Error) => void
): void {
  // Request interceptor - Add authentication token
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  instance.interceptors.request.use(
    async (config: any) => {
      try {
        const token = await getAccessToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (error) {
        console.error('Failed to get access token:', error);
        throw error;
      }
      return config;
    },
    (error: unknown) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor - Handle errors
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  instance.interceptors.response.use(
    (response: any) => response,
    (error: unknown) => {
      const apiError = AsrApiError.fromAxiosError(error as Parameters<typeof AsrApiError.fromAxiosError>[0]);

      // Call custom error handler if provided
      if (onError) {
        onError(apiError);
      }

      return Promise.reject(apiError);
    }
  );
}
