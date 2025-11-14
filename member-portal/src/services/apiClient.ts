import { AsrApiClient } from '@ctn/api-client';
import { msalInstance } from '../index';

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
      scopes: ['api://bcc3ddce-6891-42aa-91f6-99d85b02bb7d/.default'],
    });

    return response.accessToken;
  } catch (error) {
    console.error('Failed to acquire token:', error);
    throw error;
  }
}

/**
 * Global error handler for API client
 */
function handleApiError(error: Error): void {
  console.error('API Client Error:', {
    message: error.message,
    name: error.name,
    stack: error.stack,
  });

  // You can add additional error handling here:
  // - Toast notifications
  // - Error tracking (e.g., Application Insights)
  // - Redirect to error page
}

/**
 * Shared API client instance for member portal
 */
export const apiClient = new AsrApiClient({
  baseURL: import.meta.env.VITE_API_URL || 'https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1',
  timeout: 30000,
  retryAttempts: 3,
  getAccessToken,
  onError: handleApiError,
});
