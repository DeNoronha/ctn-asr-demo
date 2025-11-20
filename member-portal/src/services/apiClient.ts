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

  const apiClientId = import.meta.env.VITE_API_CLIENT_ID;
  if (!apiClientId) {
    throw new Error('VITE_API_CLIENT_ID environment variable is required');
  }

  try {
    const response = await msalInstance.acquireTokenSilent({
      account: accounts[0],
      scopes: [`api://${apiClientId}/access_as_user`],
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
 * Validate required environment variables
 */
const apiUrl = import.meta.env.VITE_API_URL;
if (!apiUrl) {
  throw new Error('VITE_API_URL environment variable is required');
}

/**
 * Shared API client instance for member portal
 */
export const apiClient = new AsrApiClient({
  baseURL: apiUrl,
  timeout: 30000,
  retryAttempts: 3,
  getAccessToken,
  onError: handleApiError,
});
