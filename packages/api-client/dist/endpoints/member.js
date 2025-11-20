/**
 * Member Self-Service Endpoint
 *
 * Provides authenticated member-specific operations for the current user's organization.
 * These endpoints operate on the authenticated user's legal entity without requiring explicit IDs.
 */
export class MemberEndpoint {
    constructor(axios) {
        this.axios = axios;
    }
    /**
     * Get current member's profile
     */
    async getProfile() {
        const { data } = await this.axios.get('/member/profile');
        return data;
    }
    /**
     * Update current member's profile
     */
    async updateProfile(updates) {
        await this.axios.put('/member/profile', updates);
    }
    /**
     * Get current member's contacts
     */
    async getContacts() {
        const { data } = await this.axios.get('/member-contacts');
        return data;
    }
    /**
     * Create contact for current member
     */
    async createContact(contact) {
        const { data } = await this.axios.post('/member/contacts', contact);
        return data;
    }
    /**
     * Update contact for current member
     */
    async updateContact(contactId, updates) {
        const { data } = await this.axios.put(`/member/contacts/${contactId}`, updates);
        return data;
    }
    /**
     * Get current member's endpoints
     */
    async getEndpoints() {
        const { data } = await this.axios.get('/member-endpoints');
        return data;
    }
    /**
     * Create endpoint for current member
     */
    async createEndpoint(endpoint) {
        const { data } = await this.axios.post('/member/endpoints', endpoint);
        return data;
    }
    /**
     * Update endpoint for current member
     */
    async updateEndpoint(endpointId, updates) {
        const { data } = await this.axios.put(`/member/endpoints/${endpointId}`, updates);
        return data;
    }
    /**
     * Delete endpoint for current member
     */
    async deleteEndpoint(endpointId) {
        await this.axios.delete(`/member/endpoints/${endpointId}`);
    }
    /**
     * Get current member's API tokens
     */
    async getTokens() {
        const { data } = await this.axios.get('/member/tokens');
        return data;
    }
    /**
     * Create API token for current member
     */
    async createToken(tokenData) {
        const { data } = await this.axios.post('/member/tokens', tokenData);
        return data;
    }
    /**
     * Revoke API token
     */
    async revokeToken(tokenId) {
        await this.axios.delete(`/member/tokens/${tokenId}`);
    }
    /**
     * Get authentication tier information for a legal entity
     */
    async getTierInfo(legalEntityId) {
        const { data } = await this.axios.get(`/entities/${legalEntityId}/tier`);
        return data;
    }
    /**
     * Get DNS verification tokens for a legal entity
     */
    async getDnsTokens(legalEntityId) {
        const { data } = await this.axios.get(`/entities/${legalEntityId}/dns/tokens`);
        return data;
    }
    /**
     * Generate DNS verification token for a legal entity
     */
    async generateDnsToken(legalEntityId, domain) {
        const { data } = await this.axios.post(`/entities/${legalEntityId}/dns/token`, { domain });
        return data;
    }
    /**
     * Verify DNS token
     */
    async verifyDnsToken(tokenId) {
        const { data } = await this.axios.post(`/dns/verify/${tokenId}`, {});
        return data;
    }
    /**
     * Get M2M clients for a legal entity
     */
    async getM2MClients(legalEntityId) {
        const { data } = await this.axios.get(`/legal-entities/${legalEntityId}/m2m-clients`);
        return data;
    }
    /**
     * Create M2M client for a legal entity
     */
    async createM2MClient(legalEntityId, clientData) {
        const { data } = await this.axios.post(`/legal-entities/${legalEntityId}/m2m-clients`, clientData);
        return data;
    }
    /**
     * Delete M2M client
     */
    async deleteM2MClient(clientId) {
        await this.axios.delete(`/m2m-clients/${clientId}`);
    }
    /**
     * Generate secret for M2M client
     */
    async generateM2MClientSecret(clientId) {
        const { data } = await this.axios.post(`/m2m-clients/${clientId}/generate-secret`, {});
        return data;
    }
    /**
     * Get KvK verification status for a legal entity
     */
    async getKvkVerificationStatus(legalEntityId) {
        const { data } = await this.axios.get(`/legal-entities/${legalEntityId}/kvk-verification`);
        return data;
    }
    /**
     * Upload KvK document for a legal entity
     */
    async uploadKvkDocument(legalEntityId, file) {
        const formData = new FormData();
        formData.append('file', file);
        const { data } = await this.axios.post(`/legal-entities/${legalEntityId}/kvk-document`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return data;
    }
    /**
     * Get identifiers for a legal entity
     */
    async getIdentifiers(legalEntityId) {
        const { data } = await this.axios.get(`/legal-entities/${legalEntityId}/identifiers`);
        return data;
    }
    /**
     * Create identifier for a legal entity
     */
    async createIdentifier(legalEntityId, identifier) {
        const { data } = await this.axios.post(`/legal-entities/${legalEntityId}/identifiers`, identifier);
        return data;
    }
    /**
     * Update identifier
     */
    async updateIdentifier(legalEntityId, identifierId, updates) {
        const { data } = await this.axios.put(`/legal-entities/${legalEntityId}/identifiers/${identifierId}`, updates);
        return data;
    }
    /**
     * Delete identifier
     */
    async deleteIdentifier(legalEntityId, identifierId) {
        await this.axios.delete(`/legal-entities/${legalEntityId}/identifiers/${identifierId}`);
    }
}
