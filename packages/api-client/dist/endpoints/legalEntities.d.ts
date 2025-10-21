import { AxiosInstance } from 'axios';
import { LegalEntity, UpdateLegalEntityRequest, PaginatedResponse } from '../types';
export declare class LegalEntitiesEndpoint {
    private axios;
    constructor(axios: AxiosInstance);
    /**
     * Get all legal entities
     */
    getAll(): Promise<PaginatedResponse<LegalEntity>>;
    /**
     * Get legal entity by ID
     */
    getById(id: string): Promise<LegalEntity>;
    /**
     * Update legal entity
     */
    update(id: string, updates: UpdateLegalEntityRequest): Promise<LegalEntity>;
}
//# sourceMappingURL=legalEntities.d.ts.map