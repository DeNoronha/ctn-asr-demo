export interface RegistryIdentifier {
  identifierType: string;
  identifierValue: string;
  countryCode?: string;
  registryName?: string;
  registryUrl?: string;
  validationStatus?: string;
}

export interface MemberData {
  organizationId: string;
  legalEntityId?: string;
  legalName: string;
  lei?: string;
  kvk?: string;
  domain: string;
  status: string;
  membershipLevel: string;
  createdAt: string;
  entityName?: string;
  entityType?: string;
  contactName?: string;
  email?: string;
  jobTitle?: string;
  registryIdentifiers?: RegistryIdentifier[];
}

export interface Contact {
  legal_entity_contact_id: string;
  contact_type: string;
  full_name: string;
  first_name?: string;
  last_name?: string;
  email: string;
  phone?: string;
  mobile?: string;
  job_title?: string;
  department?: string;
  preferred_language?: string;
  preferred_contact_method?: string;
  is_primary: boolean;
  is_active: boolean;
  dt_created: string;
  dt_modified: string;
}

export interface Endpoint {
  legal_entity_endpoint_id: string;
  endpoint_name: string;
  endpoint_url: string;
  endpoint_description?: string;
  data_category?: string;
  endpoint_type: string;
  authentication_method?: string;
  last_connection_test?: string;
  last_connection_status?: string;
  is_active: boolean;
  activation_date?: string;
  deactivation_date?: string;
  dt_created: string;
  dt_modified: string;
}

export interface Token {
  jti: string;
  token_type: string;
  issued_at: string;
  expires_at: string;
  revoked: boolean;
  metadata?: Record<string, unknown>;
}

export interface ComponentProps {
  apiBaseUrl: string;
  getAccessToken: () => Promise<string>;
  memberData: MemberData;
  onNotification: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  onDataChange: () => void;
}
