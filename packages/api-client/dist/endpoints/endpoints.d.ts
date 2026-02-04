import type axiosLib from "axios";
import type { ApproveAccessPayload, CreateEndpointRequest, DenyAccessPayload, Endpoint, EndpointAccessRequest, EndpointConsumerGrant, EndpointDirectoryEntry, EndpointTestResult, InitiateEndpointRegistrationRequest, RequestAccessPayload, RevokeGrantPayload, UpdateEndpointRequest, VerifyTokenRequest } from "../types";
export declare class EndpointsEndpoint {
    private axios;
    constructor(axios: ReturnType<typeof axiosLib.create>);
    /**
     * Get endpoints for a legal entity
     */
    getByLegalEntity(legalEntityId: string): Promise<Endpoint[]>;
    /**
     * Get endpoint by ID (uses simplified path - endpoint ID is globally unique)
     */
    getById(endpointId: string): Promise<Endpoint>;
    /**
     * Create endpoint for legal entity
     */
    create(legalEntityId: string, endpoint: CreateEndpointRequest): Promise<Endpoint>;
    /**
     * Update endpoint (uses simplified path - endpoint ID is globally unique)
     */
    update(endpointId: string, updates: UpdateEndpointRequest): Promise<Endpoint>;
    /**
     * Delete endpoint (uses simplified path - endpoint ID is globally unique)
     */
    delete(endpointId: string): Promise<void>;
    /**
     * Test endpoint connectivity (uses simplified path - endpoint ID is globally unique)
     */
    test(endpointId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    /**
     * Toggle endpoint active status
     */
    toggle(endpointId: string, isActive: boolean): Promise<Endpoint>;
    /**
     * Step 1: Initiate endpoint registration with verification token
     */
    initiateRegistration(legalEntityId: string, request: InitiateEndpointRegistrationRequest): Promise<Endpoint>;
    /**
     * Step 2: Verify endpoint via callback challenge-response
     *
     * Sends a POST request to the endpoint URL with a challenge.
     * Endpoint must respond with the challenge value to verify ownership.
     *
     * Response on success: { message, verified: true, endpoint }
     * Response on failure: { message, verified: false, error, hint }
     */
    sendVerificationEmail(endpointId: string): Promise<{
        message: string;
        verified?: boolean;
        endpoint?: Endpoint;
        error?: string;
        hint?: string;
        mock?: boolean;
        token?: string;
        expires_at?: string;
    }>;
    /**
     * Step 3: Verify the token provided by user
     */
    verifyToken(endpointId: string, request: VerifyTokenRequest): Promise<{
        message: string;
        endpoint: Endpoint;
    }>;
    /**
     * Step 4: Test endpoint with mock API call
     */
    testEndpoint(endpointId: string): Promise<{
        message: string;
        mock: boolean;
        test_data: EndpointTestResult;
        endpoint: Endpoint;
    }>;
    /**
     * Step 5: Activate endpoint (final step)
     */
    activateEndpoint(endpointId: string): Promise<{
        message: string;
        endpoint: Endpoint;
    }>;
    /**
     * Publish endpoint to CTN directory (makes it discoverable)
     * Requires endpoint to be VERIFIED
     */
    publish(endpointId: string): Promise<{
        message: string;
        endpoint: Endpoint;
    }>;
    /**
     * Unpublish endpoint from CTN directory (removes from discovery)
     */
    unpublish(endpointId: string): Promise<{
        message: string;
        endpoint: Endpoint;
    }>;
    /**
     * Get published endpoints for consumer discovery
     * Excludes consumer's own endpoints
     */
    getDirectory(): Promise<EndpointDirectoryEntry[]>;
    /**
     * Consumer requests access to an endpoint
     * For 'open' endpoints: auto-approved immediately
     * For 'restricted'/'private': creates pending request
     */
    requestAccess(endpointId: string, payload?: RequestAccessPayload): Promise<{
        message: string;
        status: "approved" | "pending";
        access_request_id?: string;
        access_request?: EndpointAccessRequest;
        grant?: EndpointConsumerGrant;
    }>;
    /**
     * Provider views access requests for their endpoint
     * @param status Optional filter by status (pending, approved, denied, revoked)
     */
    getAccessRequests(endpointId: string, status?: string): Promise<EndpointAccessRequest[]>;
    /**
     * Provider approves an access request
     * Creates a grant for the consumer
     */
    approveAccess(requestId: string, payload?: ApproveAccessPayload): Promise<{
        message: string;
        grant: EndpointConsumerGrant;
    }>;
    /**
     * Provider denies an access request
     */
    denyAccess(requestId: string, payload?: DenyAccessPayload): Promise<{
        message: string;
        access_request: EndpointAccessRequest;
    }>;
    /**
     * Consumer views their granted endpoint accesses
     */
    getMyGrants(): Promise<EndpointConsumerGrant[]>;
    /**
     * Revoke an access grant
     * Can be done by provider (endpoint owner) or consumer (grant holder)
     */
    revokeGrant(grantId: string, payload?: RevokeGrantPayload): Promise<{
        message: string;
        grant: EndpointConsumerGrant;
    }>;
}
//# sourceMappingURL=endpoints.d.ts.map