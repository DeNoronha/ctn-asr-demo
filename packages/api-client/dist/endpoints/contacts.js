export class ContactsEndpoint {
    constructor(axios) {
        this.axios = axios;
    }
    /**
     * Get contacts for a legal entity
     */
    async getByLegalEntity(legalEntityId) {
        const { data } = await this.axios.get(`/legal-entities/${legalEntityId}/contacts`);
        return data;
    }
    /**
     * Get contact by ID
     */
    async getById(legalEntityId, contactId) {
        const { data } = await this.axios.get(`/legal-entities/${legalEntityId}/contacts/${contactId}`);
        return data;
    }
    /**
     * Create contact for legal entity
     */
    async create(legalEntityId, contact) {
        const { data } = await this.axios.post(`/legal-entities/${legalEntityId}/contacts`, contact);
        return data;
    }
    /**
     * Update contact
     */
    async update(legalEntityId, contactId, updates) {
        const { data } = await this.axios.put(`/legal-entities/${legalEntityId}/contacts/${contactId}`, updates);
        return data;
    }
    /**
     * Delete contact
     */
    async delete(legalEntityId, contactId) {
        await this.axios.delete(`/legal-entities/${legalEntityId}/contacts/${contactId}`);
    }
}
