"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrchestrationsEndpoint = void 0;
class OrchestrationsEndpoint {
    constructor(axios) {
        this.axios = axios;
    }
    /**
     * Get all orchestrations
     */
    async getAll(params) {
        const { data } = await this.axios.get('/orchestrations', { params });
        return data;
    }
    /**
     * Get orchestration by ID
     */
    async getById(id) {
        const { data } = await this.axios.get(`/orchestrations/${id}`);
        return data;
    }
    /**
     * Create new orchestration
     */
    async create(orchestration) {
        const { data } = await this.axios.post('/orchestrations', orchestration);
        return data;
    }
    /**
     * Get orchestrations by party
     */
    async getByParty(partyId, params) {
        const { data } = await this.axios.get('/orchestrations', {
            params: {
                ...params,
                party_id: partyId
            }
        });
        return data;
    }
}
exports.OrchestrationsEndpoint = OrchestrationsEndpoint;
