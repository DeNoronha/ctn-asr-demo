import { getAuthenticatedAxios } from './client';
import type {
  LegalEntityEndpoint,
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
