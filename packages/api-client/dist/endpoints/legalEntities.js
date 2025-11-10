"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LegalEntitiesEndpoint = void 0;
class LegalEntitiesEndpoint {
    constructor(axios) {
        this.axios = axios;
    }
    /**
     * Get all legal entities
     */
    async getAll() {
        const { data } = await this.axios.get('/legal-entities'), as, any;
        return data;
    }
    /**
     * Get legal entity by ID
     */
    async getById(id) {
        const { data } = await this.axios.get(`/legal-entities/${id}`), as, any;
        return data;
    }
    /**
     * Update legal entity
     */
    async update(id, updates) {
        const { data } = await this.axios.put(`/legal-entities/${id}`, updates), as, any;
        return data;
    }
}
exports.LegalEntitiesEndpoint = LegalEntitiesEndpoint;
