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
    const apiClientId =
      import.meta.env.VITE_API_CLIENT_ID || 'd3037c11-a541-4f21-8862-8079137a0cde';
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
 * Shared API client instance for member portal
 */
export const apiClient = new AsrApiClient({
  baseURL: import.meta.env.VITE_API_URL || 'https://ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io/api/v1',
  timeout: 30000,
  retryAttempts: 3,
  getAccessToken,
  onError: handleApiError,
});
