import { AsrApiClient } from '@ctn/api-client';
import { msalInstance } from '../auth/AuthContext';
import { logger } from '../utils/logger';

/**
 * Get access token for API requests
 */
async function getAccessToken(): Promise<string> {
  const accounts = msalInstance.getAllAccounts();
  if (accounts.length === 0) {
    throw new Error('No authenticated user found');
  }

  try {
    const response = await msalInstance.acquireTokenSilent({
      account: accounts[0],
      scopes: ['api://d3037c11-a541-4f21-8862-8079137a0cde/access_as_user'],
    });

    return response.accessToken;
  } catch (error) {
    // SEC-009: Sanitize error to prevent token leakage in logs
    logger.error('Failed to acquire token', {
      errorType: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Token acquisition failed',
    });
    throw error;
  }
}

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
  baseURL: import.meta.env.VITE_API_URL || 'https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1',
  timeout: 30000,
  retryAttempts: 3,
  getAccessToken,
  onError: handleApiError,
});
