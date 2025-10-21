"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MembersEndpoint = void 0;
class MembersEndpoint {
    constructor(axios) {
        this.axios = axios;
    }
    /**
     * Get all members (admin only)
     */
    async getAll(params) {
        const { data } = await this.axios.get('/all-members', { params });
        return data;
    }
    /**
     * Get member by ID
     */
    async getById(id) {
        const { data } = await this.axios.get(`/members/${id}`);
        return data;
    }
    /**
     * Create new member
     */
    async create(member) {
        const { data } = await this.axios.post('/members', member);
        return data;
    }
    /**
     * Update member
     */
    async update(id, updates) {
        const { data } = await this.axios.put(`/members/${id}`, updates);
        return data;
    }
    /**
     * Delete member
     */
    async delete(id) {
        await this.axios.delete(`/members/${id}`);
    }
}
exports.MembersEndpoint = MembersEndpoint;
