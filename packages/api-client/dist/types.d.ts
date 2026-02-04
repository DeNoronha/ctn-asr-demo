export interface PaginationParams {
    page?: number;
    pageSize?: number;
}
export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
    };
}
export interface Member {
    legal_entity_id: string;
    legal_name: string;
    lei?: string;
    kvk?: string;
    euid?: string;
    eori?: string;
    duns?: string;
    domain?: string;
    status: "PENDING" | "ACTIVE" | "SUSPENDED" | "TERMINATED";
    membership_level?: "BASIC" | "FULL" | "PREMIUM";
    created_at: string;
    metadata?: Record<string, unknown>;
    contact_count?: number;
    endpoint_count?: number;
    party_id?: string;
}
export interface CreateMemberRequest {
    org_id: string;
    legal_name: string;
    domain: string;
    lei?: string;
    kvk?: string;
    contacts?: ContactRequest[];
}
export interface UpdateMemberRequest {
    legal_name?: string;
    domain?: string;
    lei?: string;
    kvk?: string;
    status?: "PENDING" | "ACTIVE" | "SUSPENDED" | "TERMINATED";
    membership_level?: "BASIC" | "FULL" | "PREMIUM";
}
export interface LegalEntity {
    legal_entity_id: string;
    party_id: string;
    primary_legal_name: string;
    address_line1?: string;
    address_line2?: string;
    postal_code?: string;
    city?: string;
    country_code?: string;
    status: string;
    created_at: string;
    updated_at?: string;
}
export interface UpdateLegalEntityRequest {
    primary_legal_name?: string;
    address_line1?: string;
    address_line2?: string;
    postal_code?: string;
    city?: string;
    country_code?: string;
}
export type ContactType = "AUTHORIZED_REP" | "TECHNICAL" | "BILLING" | "SUPPORT" | "LEGAL" | "OTHER";
export interface Contact {
    legal_entity_contact_id: string;
    legal_entity_id: string;
    contact_type: ContactType;
    full_name: string;
    email: string;
    phone?: string;
    mobile?: string;
    job_title?: string;
    department?: string;
    preferred_language?: string;
    preferred_contact_method?: "EMAIL" | "PHONE" | "SMS";
    is_primary?: boolean;
    is_active?: boolean;
    first_name?: string;
    last_name?: string;
    dt_created?: string;
    dt_modified?: string;
}
export interface ContactRequest {
    contact_type: ContactType;
    full_name: string;
    email: string;
    phone?: string;
    mobile?: string;
    job_title?: string;
    department?: string;
    preferred_language?: string;
    preferred_contact_method?: "EMAIL" | "PHONE" | "SMS";
    is_primary?: boolean;
}
export interface UpdateContactRequest {
    contact_type?: ContactType;
    full_name?: string;
    email?: string;
    phone?: string;
    mobile?: string;
    job_title?: string;
    department?: string;
    preferred_language?: string;
    preferred_contact_method?: "EMAIL" | "PHONE" | "SMS";
    is_primary?: boolean;
    is_active?: boolean;
}
export type IdentifierType = "LEI" | "KVK" | "EORI" | "VAT" | "DUNS" | "EUID" | "HRB" | "HRA" | "KBO" | "SIREN" | "SIRET" | "CRN" | "PEPPOL" | "VIES" | "RSIN" | "OTHER";
export interface Identifier {
    id: string;
    legal_entity_id: string;
    identifier_type: IdentifierType;
    identifier_value: string;
    country_code?: string;
    registry_name?: string;
    registry_url?: string;
    valid_from?: string;
    valid_to?: string;
    issued_by?: string;
    validated_by?: string;
    validation_status?: "PENDING" | "VALIDATED" | "VERIFIED" | "FAILED" | "EXPIRED";
    validation_date?: string;
    verification_status?: "PENDING" | "VERIFIED" | "FAILED" | "EXPIRED";
    issuing_authority?: string;
    issued_at?: string;
    expires_at?: string;
    is_deleted?: boolean;
    created_at: string;
    updated_at?: string;
}
export interface CreateIdentifierRequest {
    identifier_type: IdentifierType;
    identifier_value: string;
    country_code?: string;
    issued_by?: string;
    valid_from?: string;
    valid_to?: string;
}
export interface UpdateIdentifierRequest {
    identifier_value?: string;
    country_code?: string;
    issued_by?: string;
    valid_from?: string;
    valid_to?: string;
    validation_status?: "PENDING" | "VALIDATED" | "VERIFIED" | "FAILED" | "EXPIRED";
}
export type EndpointType = "REST" | "REST_API" | "SOAP" | "WEBHOOK" | "OTHER";
export type AccessModel = "open" | "restricted" | "private";
export type PublicationStatus = "draft" | "published" | "unpublished";
export type AccessRequestStatus = "pending" | "approved" | "denied" | "revoked";
export interface Endpoint {
    legal_entity_endpoint_id: string;
    legal_entity_id: string;
    endpoint_name: string;
    endpoint_url?: string;
    endpoint_description?: string;
    data_category?: "DATA_EXCHANGE" | "NOTIFICATION" | "SHIPMENT" | "BOOKING" | "CONTAINER" | "CUSTOMS" | "WAREHOUSE" | "TRANSPORT" | "OTHER";
    endpoint_type?: EndpointType;
    authentication_method?: string;
    last_connection_test?: string;
    last_connection_status?: string;
    is_active?: boolean;
    activation_date?: string;
    deactivation_date?: string;
    verification_status?: "PENDING" | "SENT" | "VERIFIED" | "FAILED" | "EXPIRED";
    verification_sent_at?: string;
    verification_expires_at?: string;
    test_result_data?: Record<string, unknown>;
    access_model?: AccessModel;
    publication_status?: PublicationStatus;
    published_at?: string;
    dt_created?: string;
    dt_modified?: string;
}
export interface CreateEndpointRequest {
    endpoint_name: string;
    endpoint_url: string;
    endpoint_description?: string;
    data_category?: string;
    endpoint_type?: EndpointType;
    authentication_method?: string;
}
export interface UpdateEndpointRequest {
    endpoint_name?: string;
    endpoint_url?: string;
    endpoint_description?: string;
    data_category?: string;
    endpoint_type?: EndpointType;
    authentication_method?: string;
    is_active?: boolean;
}
export interface InitiateEndpointRegistrationRequest {
    endpoint_name: string;
    endpoint_url: string;
    endpoint_description?: string;
    data_category?: string;
    endpoint_type?: string;
    access_model?: AccessModel;
}
export interface VerifyTokenRequest {
    token: string;
}
export interface EndpointTestResult {
    success: boolean;
    tested_at: string;
    endpoint_url: string;
    response_time_ms?: number;
    status_code?: number;
    mock_response?: Record<string, unknown>;
    error?: string;
}
export interface AuditLog {
    id: number;
    event_time: string;
    event_type: string;
    severity: "INFO" | "WARNING" | "ERROR" | "CRITICAL";
    user_email?: string;
    resource_type?: string;
    resource_id?: string;
    action?: string;
    result: "success" | "failure";
    ip_address?: string;
    details?: Record<string, unknown>;
}
export interface AuditLogFilters extends PaginationParams {
    event_type?: string;
    user_email?: string;
    resource_type?: string;
    resource_id?: string;
    result?: "success" | "failure";
    start_date?: string;
    end_date?: string;
}
export interface PartyInfo {
    party_id: string;
    party_name: string;
    legal_entity_id: string;
    member_name: string;
}
export interface ApiClientConfig {
    baseURL: string;
    timeout?: number;
    retryAttempts?: number;
    retryDelay?: number;
    getAccessToken: () => Promise<string> | string;
    onError?: (error: Error) => void;
}
export interface ApiError {
    message: string;
    status: number;
    code?: string;
    details?: unknown;
}
/**
 * Endpoint directory entry - returned by GET /endpoint-directory
 * Represents a published endpoint visible to consumers
 */
export interface EndpointDirectoryEntry {
    legal_entity_endpoint_id: string;
    endpoint_name: string;
    endpoint_description?: string;
    data_category?: string;
    endpoint_type?: EndpointType;
    access_model: AccessModel;
    published_at: string;
    provider_entity_id: string;
    provider_name: string;
    provider_domain?: string;
    /** Consumer's access status for this endpoint */
    access_status?: AccessRequestStatus | "granted" | null;
}
/**
 * Access request - consumer requests access to provider endpoint
 */
export interface EndpointAccessRequest {
    access_request_id: string;
    endpoint_id: string;
    consumer_entity_id: string;
    provider_entity_id: string;
    status: AccessRequestStatus;
    requested_scopes?: string[];
    approved_scopes?: string[];
    requested_at: string;
    decided_at?: string;
    decided_by?: string;
    denial_reason?: string;
    /** Consumer organization name (populated in provider view) */
    consumer_name?: string;
    consumer_domain?: string;
    dt_created?: string;
    dt_modified?: string;
}
/**
 * Consumer grant - active access grant to an endpoint
 */
export interface EndpointConsumerGrant {
    grant_id: string;
    access_request_id?: string;
    endpoint_id: string;
    consumer_entity_id: string;
    keycloak_client_id?: string;
    granted_scopes?: string[];
    is_active: boolean;
    granted_at: string;
    revoked_at?: string;
    revoked_by?: string;
    revocation_reason?: string;
    /** Populated in consumer's "my grants" view */
    endpoint_name?: string;
    endpoint_url?: string;
    endpoint_description?: string;
    data_category?: string;
    endpoint_type?: EndpointType;
    provider_name?: string;
    provider_domain?: string;
    dt_created?: string;
    dt_modified?: string;
}
/**
 * Request access payload
 */
export interface RequestAccessPayload {
    requested_scopes?: string[];
}
/**
 * Approve access request payload
 */
export interface ApproveAccessPayload {
    approved_scopes?: string[];
}
/**
 * Deny access request payload
 */
export interface DenyAccessPayload {
    denial_reason?: string;
}
/**
 * Revoke grant payload
 */
export interface RevokeGrantPayload {
    revocation_reason?: string;
}
//# sourceMappingURL=types.d.ts.map