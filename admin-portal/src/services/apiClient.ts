import { AsrApiClient } from '@ctn/api-client';
import { getAccessToken } from '../utils/auth';
import { logger } from '../utils/logger';

/**
 * Global error handler for API client
 */
function handleApiError(error: Error): void {
  // SEC-009: Sanitize error output - never log full stack traces or error objects in production
  logger.error('API Client Error', {
    message: error.message,
    name: error.name,
    // Stack traces only in development via logger utility
  });

  // You can add additional error handling here:
  // - Toast notifications
  // - Error tracking (e.g., Application Insights)
  // - Redirect to error page
}

/**
 * Shared API client instance for admin portal
 */
export const apiClient = new AsrApiClient({
  baseURL: import.meta.env.VITE_API_URL || 'https://ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io/api/v1',
  timeout: 30000,
  retryAttempts: 3,
  getAccessToken,
  onError: handleApiError,
});
