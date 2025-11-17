import { getAuthenticatedAxios } from './client';
import type {
  LegalEntityEndpoint,
  EndpointAuthorization,
  ConnectionTestDetails,
} from './types';

// =====================================================
// ENDPOINT ENDPOINTS (Multi-System Support)
// =====================================================

export async function getEndpoints(legalEntityId: string): Promise<LegalEntityEndpoint[]> {
  const axiosInstance = await getAuthenticatedAxios();
  const response = await axiosInstance.get<LegalEntityEndpoint[]>(
    `/legal-entities/${legalEntityId}/endpoints`
  );
  return response.data;
}

export async function addEndpoint(
  endpoint: Omit<LegalEntityEndpoint, 'legal_entity_endpoint_id' | 'dt_created' | 'dt_modified'>
): Promise<LegalEntityEndpoint> {
  const axiosInstance = await getAuthenticatedAxios();
  const response = await axiosInstance.post<LegalEntityEndpoint>(
    `/legal-entities/${endpoint.legal_entity_id}/endpoints`,
    endpoint
  );
  return response.data;
}

export async function updateEndpoint(
  endpointId: string,
  data: Partial<LegalEntityEndpoint>
): Promise<LegalEntityEndpoint> {
  const axiosInstance = await getAuthenticatedAxios();
  const response = await axiosInstance.put<LegalEntityEndpoint>(`/endpoints/${endpointId}`, data);
  return response.data;
}

export async function deleteEndpoint(endpointId: string): Promise<void> {
  const axiosInstance = await getAuthenticatedAxios();
  await axiosInstance.delete(`/endpoints/${endpointId}`);
}

export async function testEndpointConnection(
  endpointId: string
): Promise<{ success: boolean; message?: string; details?: ConnectionTestDetails }> {
  const axiosInstance = await getAuthenticatedAxios();
  const response = await axiosInstance.post<{
    success: boolean;
    message?: string;
    details?: ConnectionTestDetails;
  }>(`/endpoints/${endpointId}/test`);
  return response.data;
}

export async function toggleEndpoint(
  endpointId: string,
  isActive: boolean
): Promise<LegalEntityEndpoint> {
  const axiosInstance = await getAuthenticatedAxios();
  const response = await axiosInstance.patch<LegalEntityEndpoint>(
    `/endpoints/${endpointId}/toggle`,
    { is_active: isActive }
  );
  return response.data;
}

// =====================================================
// TOKEN ENDPOINTS (Per-Endpoint Authorization)
// =====================================================

export async function getEndpointTokens(endpointId: string): Promise<EndpointAuthorization[]> {
  const axiosInstance = await getAuthenticatedAxios();
  const response = await axiosInstance.get<EndpointAuthorization[]>(
    `/endpoints/${endpointId}/tokens`
  );
  return response.data;
}

export async function issueEndpointToken(
  endpointId: string,
  options?: { expires_in_days?: number }
): Promise<EndpointAuthorization> {
  const axiosInstance = await getAuthenticatedAxios();
  const response = await axiosInstance.post<EndpointAuthorization>(
    `/endpoints/${endpointId}/tokens`,
    options
  );
  return response.data;
}

export async function revokeEndpointToken(tokenId: string, reason?: string): Promise<void> {
  const axiosInstance = await getAuthenticatedAxios();
  await axiosInstance.post(`/tokens/${tokenId}/revoke`, { reason });
}

export async function getTokenUsageStats(
  tokenId: string
): Promise<{ usage_count: number; last_used_at?: string }> {
  const axiosInstance = await getAuthenticatedAxios();
  const response = await axiosInstance.get<{ usage_count: number; last_used_at?: string }>(
    `/tokens/${tokenId}/stats`
  );
  return response.data;
}
