/**
 * Authentication Utilities
 * Shared helper functions for MSAL token management
 */

import { msalInstance } from '../auth/AuthContext';
import { logger } from './logger';

/**
 * Get access token for API requests
 *
 * @throws {Error} If no authenticated user found or token acquisition fails
 * @returns {Promise<string>} Access token for API authentication
 *
 * @example
 * ```typescript
 * const token = await getAccessToken();
 * const response = await axios.get('/api/endpoint', {
 *   headers: { Authorization: `Bearer ${token}` }
 * });
 * ```
 */
export async function getAccessToken(): Promise<string> {
  const accounts = msalInstance.getAllAccounts();

  if (accounts.length === 0) {
    throw new Error('No authenticated user found');
  }

  try {
    const clientId = import.meta.env.VITE_AZURE_CLIENT_ID;
    const response = await msalInstance.acquireTokenSilent({
      account: accounts[0],
      scopes: [`api://${clientId}/access_as_user`],
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
