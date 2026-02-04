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
    async sendVerificationCallback(endpointId) {
        const { data } = await this.axios.post(`/endpoints/${endpointId}/send-verification`);
        return data;
    }
    /**
     * @deprecated Use sendVerificationCallback instead
     */
    async sendVerificationEmail(endpointId) {
        return this.sendVerificationCallback(endpointId);
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
    // ==========================================================================
    // ENDPOINT LIFECYCLE - PUBLICATION (Phase 3)
    // ==========================================================================
    /**
     * Publish endpoint to CTN directory (makes it discoverable)
     * Requires endpoint to be VERIFIED
     */
    async publish(endpointId) {
        const { data } = await this.axios.post(`/endpoints/${endpointId}/publish`);
        return data;
    }
    /**
     * Unpublish endpoint from CTN directory (removes from discovery)
     */
    async unpublish(endpointId) {
        const { data } = await this.axios.post(`/endpoints/${endpointId}/unpublish`);
        return data;
    }
    // ==========================================================================
    // ENDPOINT DIRECTORY - CONSUMER DISCOVERY (Phase 4)
    // ==========================================================================
    /**
     * Get published endpoints for consumer discovery
     * Excludes consumer's own endpoints
     */
    async getDirectory() {
        const { data } = await this.axios.get("/endpoint-directory");
        return data.endpoints;
    }
    // ==========================================================================
    // ACCESS REQUEST WORKFLOW (Phase 4-5)
    // ==========================================================================
    /**
     * Consumer requests access to an endpoint
     * For 'open' endpoints: auto-approved immediately
     * For 'restricted'/'private': creates pending request
     */
    async requestAccess(endpointId, payload) {
        const { data } = await this.axios.post(`/endpoints/${endpointId}/request-access`, payload || {});
        return data;
    }
    /**
     * Provider views access requests for their endpoint
     * @param status Optional filter by status (pending, approved, denied, revoked)
     */
    async getAccessRequests(endpointId, status) {
        const params = status ? { status } : {};
        const { data } = await this.axios.get(`/endpoints/${endpointId}/access-requests`, { params });
        return data.access_requests;
    }
    /**
     * Provider approves an access request
     * Creates a grant for the consumer
     */
    async approveAccess(requestId, payload) {
        const { data } = await this.axios.post(`/access-requests/${requestId}/approve`, payload || {});
        return data;
    }
    /**
     * Provider denies an access request
     */
    async denyAccess(requestId, payload) {
        const { data } = await this.axios.post(`/access-requests/${requestId}/deny`, payload || {});
        return data;
    }
    // ==========================================================================
    // CONSUMER GRANTS (Phase 6)
    // ==========================================================================
    /**
     * Consumer views their granted endpoint accesses
     */
    async getMyGrants() {
        const { data } = await this.axios.get("/my-access-grants");
        return data.grants;
    }
    /**
     * Revoke an access grant
     * Can be done by provider (endpoint owner) or consumer (grant holder)
     */
    async revokeGrant(grantId, payload) {
        const { data } = await this.axios.post(`/grants/${grantId}/revoke`, payload || {});
        return data;
    }
}
