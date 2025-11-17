import { getAuthenticatedAxios } from './client';
import type { M2MClient } from './types';

// ========================================================================
// M2M CLIENT MANAGEMENT
// ========================================================================

export async function getM2MClients(legalEntityId: string): Promise<M2MClient[]> {
  const axiosInstance = await getAuthenticatedAxios();
  const response = await axiosInstance.get<M2MClient[]>(
    `/legal-entities/${legalEntityId}/m2m-clients`
  );
  return response.data;
}

export async function createM2MClient(
  legalEntityId: string,
  data: {
    client_name: string;
    description: string;
    assigned_scopes: string[];
  }
): Promise<{ client: M2MClient; client_secret: string }> {
  const axiosInstance = await getAuthenticatedAxios();
  const response = await axiosInstance.post<{ client: M2MClient; client_secret: string }>(
    `/legal-entities/${legalEntityId}/m2m-clients`,
    data
  );
  return response.data;
}

export async function generateM2MClientSecret(
  clientId: string
): Promise<{ client_secret: string }> {
  const axiosInstance = await getAuthenticatedAxios();
  const response = await axiosInstance.post<{ client_secret: string }>(
    `/m2m-clients/${clientId}/generate-secret`
  );
  return response.data;
}

export async function deleteM2MClient(clientId: string): Promise<void> {
  const axiosInstance = await getAuthenticatedAxios();
  await axiosInstance.delete(`/m2m-clients/${clientId}`);
}
