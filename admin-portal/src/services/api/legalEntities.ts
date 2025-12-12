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
  const response = await axiosInstance.get(`/legal-entities/${legalEntityId}/kvk-registry`);
  return response.data;
}

// =====================================================
// PEPPOL REGISTRY DATA
// =====================================================

export interface PeppolRegistryResponse {
  hasData: boolean;
  data?: {
    registry_data_id: string;
    participant_id: string;
    participant_scheme: string;
    participant_value: string;
    entity_name?: string;
    country_code?: string;
    registration_date?: string;
    additional_identifiers?: Array<{ scheme: string; value: string }>;
    document_types?: Array<{ scheme: string; value: string }>;
    websites?: string[];
    contacts?: Array<{ type?: string; name?: string; phone?: string; email?: string }>;
    geo_info?: string;
    additional_info?: string;
    fetched_at: string;
    last_verified_at?: string;
    data_source: string;
  };
  message?: string;
}

export async function getPeppolRegistryData(legalEntityId: string): Promise<PeppolRegistryResponse> {
  const axiosInstance = await getAuthenticatedAxios();
  const response = await axiosInstance.get<PeppolRegistryResponse>(
    `/legal-entities/${legalEntityId}/peppol-registry`
  );
  return response.data;
}

export interface PeppolFetchRequest {
  identifier_type?: string;
  identifier_value?: string;
  company_name?: string;
  country_code?: string;
  save_to_database?: boolean;
}

export interface PeppolFetchResponse {
  status: 'found' | 'not_found' | 'error';
  participant_id: string | null;
  entity_name?: string | null;
  country?: string | null;
  registration_date?: string | null;
  document_types_count?: number;
  was_saved: boolean;
  identifier_id?: string | null;
  message: string;
}

export async function fetchPeppolData(
  legalEntityId: string,
  request: PeppolFetchRequest
): Promise<PeppolFetchResponse> {
  const axiosInstance = await getAuthenticatedAxios();
  const response = await axiosInstance.post<PeppolFetchResponse>(
    `/legal-entities/${legalEntityId}/peppol/fetch`,
    request
  );
  return response.data;
}
