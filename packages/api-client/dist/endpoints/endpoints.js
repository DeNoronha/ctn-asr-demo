"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EndpointsEndpoint = void 0;
class EndpointsEndpoint {
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
}
exports.EndpointsEndpoint = EndpointsEndpoint;
