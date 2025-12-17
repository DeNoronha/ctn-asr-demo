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
// ENRICHMENT - Sync data from external registries
// =====================================================

export interface EnrichmentResult {
  identifier: string;
  status: 'added' | 'exists' | 'error' | 'not_available';
  value?: string;
  message?: string;
}

export interface EnrichmentResponse {
  success: boolean;
  added_count: number;
  company_details_updated: boolean;
  updated_fields: string[];
  results: EnrichmentResult[];
  summary: {
    added: string[];
    already_exists: string[];
    not_available: string[];
    errors: string[];
    company_fields_updated: string[];
  };
}

/**
 * Enriches a legal entity by fetching data from external registries (KVK, GLEIF, Peppol, VIES)
 * and updating the legal_entity table with company details (name, address, legal form, etc.)
 */
export async function enrichLegalEntity(legalEntityId: string): Promise<EnrichmentResponse> {
  const axiosInstance = await getAuthenticatedAxios();
  const response = await axiosInstance.post<EnrichmentResponse>(
    `/legal-entities/${legalEntityId}/enrich`
  );
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

// =====================================================
// GERMAN REGISTRY DATA (Handelsregister)
// =====================================================

export interface GermanRegistryData {
  registry_data_id: string;
  legal_entity_id: string;
  register_number: string;
  register_type: string;  // HRA, HRB, GnR, PR, VR
  register_court?: string;
  register_court_code?: string;
  euid?: string;
  company_name: string;
  legal_form?: string;
  legal_form_long?: string;
  company_status?: string;
  registration_date?: string;
  dissolution_date?: string;
  street?: string;
  house_number?: string;
  postal_code?: string;
  city?: string;
  country?: string;
  full_address?: string;
  business_purpose?: string;
  share_capital?: string;
  share_capital_currency?: string;
  representatives?: Array<{
    name: string;
    role: string;
    birthDate?: string;
    residence?: string;
    appointedDate?: string;
  }>;
  shareholders?: Array<{
    name: string;
    share?: string;
    type?: string;
  }>;
  is_main_establishment?: boolean;
  branch_count?: number;
  vat_number?: string;
  lei?: string;
  data_source: string;
  source_url?: string;
  fetched_at: string;
  last_verified_at?: string;
}

export interface GermanRegistryResponse {
  hasData: boolean;
  data?: GermanRegistryData;
  message?: string;
}

export async function getGermanRegistryData(legalEntityId: string): Promise<GermanRegistryResponse> {
  const axiosInstance = await getAuthenticatedAxios();
  const response = await axiosInstance.get<GermanRegistryResponse>(
    `/legal-entities/${legalEntityId}/german-registry`
  );
  return response.data;
}

// =====================================================
// EORI REGISTRY DATA (EU Economic Operators Registration)
// =====================================================

export interface EoriRegistryData {
  registry_data_id: string;
  legal_entity_id?: string;
  eori_number: string;
  country_code: string;
  status: string;             // '0' = valid, '1' = invalid, '2' = error
  status_description?: string;
  error_reason?: string;
  trader_name?: string;
  trader_address?: string;
  street?: string;
  postal_code?: string;
  city?: string;
  country?: string;
  request_date?: string;
  request_identifier?: string;
  data_source: string;
  raw_api_response?: Record<string, unknown>;
  fetched_at: string;
  last_verified_at?: string;
  dt_created?: string;
  dt_modified?: string;
}

export interface EoriRegistryResponse {
  hasData: boolean;
  data?: EoriRegistryData;
  message?: string;
}

export async function getEoriRegistryData(legalEntityId: string): Promise<EoriRegistryResponse> {
  const axiosInstance = await getAuthenticatedAxios();
  const response = await axiosInstance.get<EoriRegistryResponse>(
    `/legal-entities/${legalEntityId}/eori-registry`
  );
  return response.data;
}

export interface EoriFetchRequest {
  eori_number: string;
  save_to_database?: boolean;
}

export interface EoriFetchResponse {
  status: 'validated' | 'error';
  is_valid: boolean;
  eori_number?: string;
  trader_name?: string;
  trader_address?: string;
  request_date?: string;
  was_saved: boolean;
  flags?: string[];
  message: string;
}

export async function fetchEoriData(
  legalEntityId: string,
  request: EoriFetchRequest
): Promise<EoriFetchResponse> {
  const axiosInstance = await getAuthenticatedAxios();
  const response = await axiosInstance.post<EoriFetchResponse>(
    `/legal-entities/${legalEntityId}/eori/fetch`,
    request
  );
  return response.data;
}

// =====================================================
// BELGIUM REGISTRY DATA (KBO - Kruispuntbank van Ondernemingen)
// =====================================================

export interface BelgiumRegistryData {
  registry_data_id: string;
  legal_entity_id?: string;
  kbo_number: string;
  kbo_number_clean: string;
  enterprise_type?: string;
  enterprise_type_code?: string;
  company_name: string;
  legal_form?: string;
  legal_form_full?: string;
  company_status?: string;
  status_start_date?: string;
  start_date?: string;
  end_date?: string;
  street?: string;
  house_number?: string;
  bus_number?: string;
  postal_code?: string;
  city?: string;
  country?: string;
  full_address?: string;
  vat_number?: string;
  vat_status?: string;
  vat_start_date?: string;
  nace_codes?: Array<{ code: string; description: string; isMain?: boolean }>;
  main_activity?: string;
  representatives?: Array<{ name: string; role: string; startDate?: string }>;
  establishment_count?: number;
  establishments?: unknown[];
  lei?: string;
  data_source: string;
  source_url?: string;
  raw_response?: Record<string, unknown>;
  fetched_at: string;
  last_verified_at?: string;
  dt_created?: string;
  dt_modified?: string;
}

export interface BelgiumRegistryResponse {
  hasData: boolean;
  data?: BelgiumRegistryData;
  message?: string;
}

export async function getBelgiumRegistryData(legalEntityId: string): Promise<BelgiumRegistryResponse> {
  const axiosInstance = await getAuthenticatedAxios();
  const response = await axiosInstance.get<BelgiumRegistryResponse>(
    `/legal-entities/${legalEntityId}/belgium-registry`
  );
  return response.data;
}
