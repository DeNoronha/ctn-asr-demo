export class EndpointsEndpoint {
    constructor(axios) {
        this.axios = axios;
    }
    /**
     * Get endpoints for a legal entity
     */
    async getByLegalEntity(legalEntityId) {
        const { data } = await this.axios.get(`/legal-entities/${legalEntityId}/endpoints`);
        return data;
    }
    /**
     * Get endpoint by ID (uses simplified path - endpoint ID is globally unique)
     */
    async getById(endpointId) {
        const { data } = await this.axios.get(`/endpoints/${endpointId}`);
        return data;
    }
    /**
     * Create endpoint for legal entity
     */
    async create(legalEntityId, endpoint) {
        const { data } = await this.axios.post(`/legal-entities/${legalEntityId}/endpoints`, endpoint);
        return data;
    }
    /**
     * Update endpoint (uses simplified path - endpoint ID is globally unique)
     */
    async update(endpointId, updates) {
        const { data } = await this.axios.put(`/endpoints/${endpointId}`, updates);
        return data;
    }
    /**
     * Delete endpoint (uses simplified path - endpoint ID is globally unique)
     */
    async delete(endpointId) {
        await this.axios.delete(`/endpoints/${endpointId}`);
    }
    /**
     * Test endpoint connectivity (uses simplified path - endpoint ID is globally unique)
     */
    async test(endpointId) {
        const { data } = await this.axios.post(`/endpoints/${endpointId}/test`);
        return data;
    }
    /**
     * Toggle endpoint active status
     */
    async toggle(endpointId, isActive) {
        const { data } = await this.axios.patch(`/endpoints/${endpointId}/toggle`, { is_active: isActive });
        return data;
    }
    /**
     * Step 1: Initiate endpoint registration with verification token
     */
    async initiateRegistration(legalEntityId, request) {
        const { data } = await this.axios.post(`/entities/${legalEntityId}/endpoints/register`, request);
        return data;
    }
    /**
     * Step 2: Verify endpoint via callback challenge-response
     *
     * Sends a POST request to the endpoint URL with a challenge.
     * Endpoint must respond with the challenge value to verify ownership.
     *
     * Response on success: { message, verified: true, endpoint }
     * Response on failure: { message, verified: false, error, hint }
     */
    async sendVerificationEmail(endpointId) {
        const { data } = await this.axios.post(`/endpoints/${endpointId}/send-verification`);
        return data;
    }
    /**
     * Step 3: Verify the token provided by user
     */
    async verifyToken(endpointId, request) {
        const { data } = await this.axios.post(`/endpoints/${endpointId}/verify-token`, request);
        return data;
    }
    /**
     * Step 4: Test endpoint with mock API call
     */
    async testEndpoint(endpointId) {
        const { data } = await this.axios.post(`/endpoints/${endpointId}/test`);
        return data;
    }
    /**
     * Step 5: Activate endpoint (final step)
     */
    async activateEndpoint(endpointId) {
        const { data } = await this.axios.post(`/endpoints/${endpointId}/activate`);
        return data;
    }
}
