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
     * Get endpoint by ID
     */
    async getById(legalEntityId, endpointId) {
        const { data } = await this.axios.get(`/legal-entities/${legalEntityId}/endpoints/${endpointId}`);
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
     * Update endpoint
     */
    async update(legalEntityId, endpointId, updates) {
        const { data } = await this.axios.put(`/legal-entities/${legalEntityId}/endpoints/${endpointId}`, updates);
        return data;
    }
    /**
     * Delete endpoint
     */
    async delete(legalEntityId, endpointId) {
        await this.axios.delete(`/legal-entities/${legalEntityId}/endpoints/${endpointId}`);
    }
    /**
     * Test endpoint connectivity
     */
    async test(legalEntityId, endpointId) {
        const { data } = await this.axios.post(`/legal-entities/${legalEntityId}/endpoints/${endpointId}/test`);
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
     * Step 2: Send verification email (mock in development)
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
