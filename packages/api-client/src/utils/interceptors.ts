import { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { AsrApiError } from './error';

export function configureInterceptors(
  instance: AxiosInstance,
  getAccessToken: () => Promise<string> | string,
  onError?: (error: Error) => void
): void {
  // Request interceptor - Add authentication token
  instance.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
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
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor - Handle errors
  instance.interceptors.response.use(
    (response: AxiosResponse) => response,
    (error: AxiosError) => {
      const apiError = AsrApiError.fromAxiosError(error);

      // Call custom error handler if provided
      if (onError) {
        onError(apiError);
      }

      return Promise.reject(apiError);
    }
  );
}
