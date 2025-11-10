import { Identifier, CreateIdentifierRequest, UpdateIdentifierRequest } from '../types';
export declare class IdentifiersEndpoint {
    private axios;
    constructor(axios: Axios.AxiosInstance);
    /**
     * Get identifiers for a legal entity
     */
    getByLegalEntity(legalEntityId: string): Promise<Identifier[]>;
    /**
     * Get identifier by ID
     */
    getById(legalEntityId: string, identifierId: string): Promise<Identifier>;
    /**
     * Create identifier for legal entity
     */
    create(legalEntityId: string, identifier: CreateIdentifierRequest): Promise<Identifier>;
    /**
     * Update identifier
     */
    update(legalEntityId: string, identifierId: string, updates: UpdateIdentifierRequest): Promise<Identifier>;
    /**
     * Delete identifier
     */
    delete(legalEntityId: string, identifierId: string): Promise<void>;
}
//# sourceMappingURL=identifiers.d.ts.map