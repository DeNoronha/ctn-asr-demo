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
// LEI REGISTRY DATA (GLEIF)
// =====================================================

export interface LeiAddress {
  country: string;
  addressLines?: string[];
  city?: string;
  postalCode?: string;
  region?: string;
}

export interface LeiRegistryData {
  legalName: string;
  legalAddress?: LeiAddress;
  headquartersAddress?: LeiAddress;
  registrationAuthority?: string;
  registrationNumber?: string;
  registrationStatus: string;
  entityStatus?: string;
  initialRegistrationDate?: string;
  lastUpdateDate?: string;
  nextRenewalDate?: string;
  managingLou?: string;
  rawResponse?: Record<string, unknown>;
}

export interface LeiRegistryResponse {
  lei: string;
  hasData: boolean;
  data?: LeiRegistryData;
  fetchedAt?: string;
  message?: string;
}

export async function getLeiRegistryData(legalEntityId: string): Promise<LeiRegistryResponse> {
  const axiosInstance = await getAuthenticatedAxios();
  const response = await axiosInstance.get<LeiRegistryResponse>(
    `/legal-entities/${legalEntityId}/lei-registry`
  );
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

// =====================================================
// VIES REGISTRY DATA (EU VAT Information Exchange System)
// =====================================================

export interface ViesRegistryData {
  registry_data_id: string;
  legal_entity_id: string;
  country_code: string;
  vat_number: string;
  full_vat_number: string;
  is_valid: boolean;
  user_error?: string;
  request_date?: string;
  request_identifier?: string;
  trader_name?: string;
  trader_address?: string;
  // Approximate matching data
  approx_name?: string;
  approx_street?: string;
  approx_postal_code?: string;
  approx_city?: string;
  approx_company_type?: string;
  match_name?: number;
  match_street?: number;
  match_postal_code?: number;
  match_city?: number;
  match_company_type?: number;
  // Metadata
  fetched_at: string;
  last_verified_at?: string;
  data_source: string;
}

export interface ViesRegistryResponse {
  hasData: boolean;
  data?: ViesRegistryData;
  message?: string;
}

export async function getViesRegistryData(legalEntityId: string): Promise<ViesRegistryResponse> {
  const axiosInstance = await getAuthenticatedAxios();
  const response = await axiosInstance.get<ViesRegistryResponse>(
    `/legal-entities/${legalEntityId}/vies-registry`
  );
  return response.data;
}

export interface ViesFetchRequest {
  country_code: string;
  vat_number: string;
  save_to_database?: boolean;
}

export interface ViesFetchResponse {
  status: 'valid' | 'invalid' | 'error';
  is_valid: boolean;
  trader_name?: string;
  trader_address?: string;
  was_saved: boolean;
  message: string;
}

export async function fetchViesData(
  legalEntityId: string,
  request: ViesFetchRequest
): Promise<ViesFetchResponse> {
  const axiosInstance = await getAuthenticatedAxios();
  const response = await axiosInstance.post<ViesFetchResponse>(
    `/legal-entities/${legalEntityId}/vies/fetch`,
    request
  );
  return response.data;
}
