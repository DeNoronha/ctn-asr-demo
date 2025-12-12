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
    status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'TERMINATED';
    membership_level?: 'BASIC' | 'FULL' | 'PREMIUM';
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
    status?: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'TERMINATED';
    membership_level?: 'BASIC' | 'FULL' | 'PREMIUM';
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
export interface Contact {
    id: string;
    email: string;
    full_name: string;
    contact_type: 'AUTHORIZED_REP' | 'TECHNICAL' | 'BILLING' | 'SUPPORT' | 'LEGAL' | 'OTHER';
    is_primary: boolean;
    phone?: string;
    mobile?: string;
    job_title?: string;
    department?: string;
    created_at: string;
    updated_at?: string;
}
export interface ContactRequest {
    email: string;
    name: string;
    type: 'AUTHORIZED_REP' | 'TECHNICAL' | 'BILLING' | 'SUPPORT' | 'LEGAL' | 'OTHER';
    phone?: string;
    mobile?: string;
    job_title?: string;
    department?: string;
}
export interface UpdateContactRequest {
    email?: string;
    full_name?: string;
    contact_type?: 'AUTHORIZED_REP' | 'TECHNICAL' | 'BILLING' | 'SUPPORT' | 'LEGAL' | 'OTHER';
    phone?: string;
    mobile?: string;
    job_title?: string;
    department?: string;
}
export interface Identifier {
    id: string;
    identifier_type: 'EORI' | 'SCAC' | 'UNLOC' | 'GLN';
    identifier_value: string;
    country_code: string;
    is_active: boolean;
    created_at: string;
    updated_at?: string;
}
export interface CreateIdentifierRequest {
    identifier_type: 'EORI' | 'SCAC' | 'UNLOC' | 'GLN';
    identifier_value: string;
    country_code: string;
}
export interface UpdateIdentifierRequest {
    identifier_value?: string;
    country_code?: string;
    is_active?: boolean;
}
export interface Endpoint {
    id: string;
    endpoint_url: string;
    endpoint_type: 'WEBHOOK' | 'API' | 'CALLBACK';
    is_active: boolean;
    auth_type?: string;
    created_at: string;
    updated_at?: string;
    verification_token?: string;
    verification_status?: 'PENDING' | 'SENT' | 'VERIFIED' | 'FAILED' | 'EXPIRED';
    verification_sent_at?: string;
    verification_expires_at?: string;
    test_result_data?: Record<string, unknown>;
}
export interface CreateEndpointRequest {
    endpoint_url: string;
    endpoint_type: 'WEBHOOK' | 'API' | 'CALLBACK';
    auth_token?: string;
}
export interface UpdateEndpointRequest {
    endpoint_url?: string;
    endpoint_type?: 'WEBHOOK' | 'API' | 'CALLBACK';
    is_active?: boolean;
    auth_token?: string;
}
export interface InitiateEndpointRegistrationRequest {
    endpoint_name: string;
    endpoint_url: string;
    endpoint_description?: string;
    data_category?: string;
    endpoint_type?: string;
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
    severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
    user_email?: string;
    resource_type?: string;
    resource_id?: string;
    action?: string;
    result: 'success' | 'failure';
    ip_address?: string;
    details?: Record<string, unknown>;
}
export interface AuditLogFilters extends PaginationParams {
    event_type?: string;
    user_email?: string;
    resource_type?: string;
    resource_id?: string;
    result?: 'success' | 'failure';
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
//# sourceMappingURL=types.d.ts.map