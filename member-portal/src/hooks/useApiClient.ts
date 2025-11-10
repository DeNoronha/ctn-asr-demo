import { useMsal } from '@azure/msal-react';
import { AsrApiClient } from '@ctn/api-client';
import { useMemo } from 'react';

export function useApiClient() {
  const { instance, accounts } = useMsal();

  const apiClient = useMemo(() => {
    const getAccessToken = async (): Promise<string> => {
      const account = accounts[0];
      if (!account) {
        throw new Error('No active account');
      }

      const tokenResponse = await instance.acquireTokenSilent({
        scopes: [`api://${process.env.VITE_API_CLIENT_ID}/Member.Read`],
        account: account,
      });

      return tokenResponse.accessToken;
    };

    return new AsrApiClient({
      baseURL: process.env.VITE_API_BASE_URL || '',
      getAccessToken,
      retryAttempts: 3,
    });
  }, [instance, accounts]);

  return apiClient;
}
