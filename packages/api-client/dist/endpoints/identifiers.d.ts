import axiosLib from 'axios';
import type { Identifier, CreateIdentifierRequest, UpdateIdentifierRequest } from '../types';
export declare class IdentifiersEndpoint {
    private axios;
    constructor(axios: ReturnType<typeof axiosLib.create>);
    /**
     * Get identifiers for a legal entity
     */
    getByLegalEntity(legalEntityId: string): Promise<Identifier[]>;
    /**
     * Get identifier by ID (uses simplified path - identifier ID is globally unique)
     */
    getById(identifierId: string): Promise<Identifier>;
    /**
     * Create identifier for legal entity
     */
    create(legalEntityId: string, identifier: CreateIdentifierRequest): Promise<Identifier>;
    /**
     * Update identifier (uses simplified path - identifier ID is globally unique)
     */
    update(identifierId: string, updates: UpdateIdentifierRequest): Promise<Identifier>;
    /**
     * Delete identifier (uses simplified path - identifier ID is globally unique)
     */
    delete(identifierId: string): Promise<void>;
    /**
     * Validate identifier format and optionally against registry
     */
    validate(identifierId: string): Promise<{
        valid: boolean;
        details?: {
            validation_method: string;
            validated_at: string;
        };
    }>;
}
//# sourceMappingURL=identifiers.d.ts.map