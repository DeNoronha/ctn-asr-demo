"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContactsEndpoint = void 0;
class ContactsEndpoint {
    constructor(axios) {
        this.axios = axios;
    }
    /**
     * Get contacts for a legal entity
     */
    async getByLegalEntity(legalEntityId) {
        const { data } = await this.axios.get(`/legal-entities/${legalEntityId}/contacts`), as, any;
        return data;
    }
    /**
     * Get contact by ID
     */
    async getById(legalEntityId, contactId) {
        const { data } = await this.axios.get(`/legal-entities/${legalEntityId}/contacts/${contactId}`), as, any;
        return data;
    }
    /**
     * Create contact for legal entity
     */
    async create(legalEntityId, contact) {
        const { data } = await this.axios.post(`/legal-entities/${legalEntityId}/contacts`, contact), as, any;
        return data;
    }
    /**
     * Update contact
     */
    async update(legalEntityId, contactId, updates) {
        const { data } = await this.axios.put(`/legal-entities/${legalEntityId}/contacts/${contactId}`, updates), as, any;
        return data;
    }
    /**
     * Delete contact
     */
    async delete(legalEntityId, contactId) {
        await this.axios.delete(`/legal-entities/${legalEntityId}/contacts/${contactId}`);
    }
}
exports.ContactsEndpoint = ContactsEndpoint;
