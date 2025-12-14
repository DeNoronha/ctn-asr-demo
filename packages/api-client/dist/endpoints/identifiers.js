export class IdentifiersEndpoint {
    constructor(axios) {
        this.axios = axios;
    }
    /**
     * Get identifiers for a legal entity
     */
    async getByLegalEntity(legalEntityId) {
        const { data } = await this.axios.get(`/legal-entities/${legalEntityId}/identifiers`);
        return data;
    }
    /**
     * Get identifier by ID (uses simplified path - identifier ID is globally unique)
     */
    async getById(identifierId) {
        const { data } = await this.axios.get(`/identifiers/${identifierId}`);
        return data;
    }
    /**
     * Create identifier for legal entity
     */
    async create(legalEntityId, identifier) {
        const { data } = await this.axios.post(`/entities/${legalEntityId}/identifiers`, identifier);
        return data;
    }
    /**
     * Update identifier (uses simplified path - identifier ID is globally unique)
     */
    async update(identifierId, updates) {
        const { data } = await this.axios.put(`/identifiers/${identifierId}`, updates);
        return data;
    }
    /**
     * Delete identifier (uses simplified path - identifier ID is globally unique)
     */
    async delete(identifierId) {
        await this.axios.delete(`/identifiers/${identifierId}`);
    }
    /**
     * Validate identifier format and optionally against registry
     */
    async validate(identifierId) {
        const { data } = await this.axios.post(`/identifiers/${identifierId}/validate`);
        return data;
    }
}
