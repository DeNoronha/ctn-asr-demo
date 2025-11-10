import { Contact, ContactRequest, UpdateContactRequest } from '../types';
export declare class ContactsEndpoint {
    private axios;
    constructor(axios: Axios.AxiosInstance);
    /**
     * Get contacts for a legal entity
     */
    getByLegalEntity(legalEntityId: string): Promise<Contact[]>;
    /**
     * Get contact by ID
     */
    getById(legalEntityId: string, contactId: string): Promise<Contact>;
    /**
     * Create contact for legal entity
     */
    create(legalEntityId: string, contact: ContactRequest): Promise<Contact>;
    /**
     * Update contact
     */
    update(legalEntityId: string, contactId: string, updates: UpdateContactRequest): Promise<Contact>;
    /**
     * Delete contact
     */
    delete(legalEntityId: string, contactId: string): Promise<void>;
}
//# sourceMappingURL=contacts.d.ts.map