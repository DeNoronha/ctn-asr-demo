"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IdentifiersEndpoint = void 0;
class IdentifiersEndpoint {
    constructor(axios) {
        this.axios = axios;
    }
    /**
     * Get identifiers for a legal entity
     */
    async getByLegalEntity(legalEntityId) {
        const { data } = await this.axios.get(`/legal-entities/${legalEntityId}/identifiers`), as, any;
        return data;
    }
    /**
     * Get identifier by ID
     */
    async getById(legalEntityId, identifierId) {
        const { data } = await this.axios.get(`/legal-entities/${legalEntityId}/identifiers/${identifierId}`), as, any;
        return data;
    }
    /**
     * Create identifier for legal entity
     */
    async create(legalEntityId, identifier) {
        const { data } = await this.axios.post(`/legal-entities/${legalEntityId}/identifiers`, identifier), as, any;
        return data;
    }
    /**
     * Update identifier
     */
    async update(legalEntityId, identifierId, updates) {
        const { data } = await this.axios.put(`/legal-entities/${legalEntityId}/identifiers/${identifierId}`, updates), as, any;
        return data;
    }
    /**
     * Delete identifier
     */
    async delete(legalEntityId, identifierId) {
        await this.axios.delete(`/legal-entities/${legalEntityId}/identifiers/${identifierId}`);
    }
}
exports.IdentifiersEndpoint = IdentifiersEndpoint;
