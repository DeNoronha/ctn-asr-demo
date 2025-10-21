import { AxiosInstance } from 'axios';
import { Endpoint, CreateEndpointRequest, UpdateEndpointRequest } from '../types';
export declare class EndpointsEndpoint {
    private axios;
    constructor(axios: AxiosInstance);
    /**
     * Get endpoints for a legal entity
     */
    getByLegalEntity(legalEntityId: string): Promise<Endpoint[]>;
    /**
     * Get endpoint by ID
     */
    getById(legalEntityId: string, endpointId: string): Promise<Endpoint>;
    /**
     * Create endpoint for legal entity
     */
    create(legalEntityId: string, endpoint: CreateEndpointRequest): Promise<Endpoint>;
    /**
     * Update endpoint
     */
    update(legalEntityId: string, endpointId: string, updates: UpdateEndpointRequest): Promise<Endpoint>;
    /**
     * Delete endpoint
     */
    delete(legalEntityId: string, endpointId: string): Promise<void>;
    /**
     * Test endpoint connectivity
     */
    test(legalEntityId: string, endpointId: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
//# sourceMappingURL=endpoints.d.ts.map