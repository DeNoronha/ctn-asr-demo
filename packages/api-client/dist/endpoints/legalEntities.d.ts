import type axiosLib from "axios";
import type { LegalEntity, PaginatedResponse, UpdateLegalEntityRequest } from "../types";
export declare class LegalEntitiesEndpoint {
    private axios;
    constructor(axios: ReturnType<typeof axiosLib.create>);
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