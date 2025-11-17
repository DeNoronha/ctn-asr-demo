import { getAuthenticatedAxios } from './client';
import type { LegalEntity } from './types';

// =====================================================
// LEGAL ENTITY ENDPOINTS (Core Entity Management)
// =====================================================

export async function getLegalEntity(legalEntityId: string): Promise<LegalEntity> {
  const axiosInstance = await getAuthenticatedAxios();
  const response = await axiosInstance.get<LegalEntity>(`/legal-entities/${legalEntityId}`);
  return response.data;
}

export async function createLegalEntity(entity: Partial<LegalEntity>): Promise<LegalEntity> {
  const axiosInstance = await getAuthenticatedAxios();
  const response = await axiosInstance.post<LegalEntity>('/legal-entities', entity);
  return response.data;
}

export async function updateLegalEntity(
  legalEntityId: string,
  data: Partial<LegalEntity>
): Promise<LegalEntity> {
  const axiosInstance = await getAuthenticatedAxios();
  const response = await axiosInstance.put<LegalEntity>(
    `/legal-entities/${legalEntityId}`,
    data
  );
  return response.data;
}

export async function deleteLegalEntity(legalEntityId: string): Promise<void> {
  const axiosInstance = await getAuthenticatedAxios();
  await axiosInstance.delete(`/legal-entities/${legalEntityId}`);
}

export async function listLegalEntities(): Promise<LegalEntity[]> {
  const axiosInstance = await getAuthenticatedAxios();
  const response = await axiosInstance.get<LegalEntity[]>('/legal-entities');
  return response.data;
}

export async function getKvkRegistryData(legalEntityId: string): Promise<any> {
  const axiosInstance = await getAuthenticatedAxios();
  const response = await axiosInstance.get(`/legal-entities/${legalEntityId}/kvk-registry-data`);
  return response.data;
}
