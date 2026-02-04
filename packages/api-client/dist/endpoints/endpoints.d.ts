import axiosLib from 'axios';
import type { Endpoint, CreateEndpointRequest, UpdateEndpointRequest, InitiateEndpointRegistrationRequest, VerifyTokenRequest, EndpointTestResult } from '../types';
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
}
//# sourceMappingURL=endpoints.d.ts.map