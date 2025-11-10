import { Orchestration, CreateOrchestrationRequest, PaginatedResponse, PaginationParams } from '../types';
export declare class OrchestrationsEndpoint {
    private axios;
    constructor(axios: any);
    /**
     * Get all orchestrations
     */
    getAll(params?: PaginationParams): Promise<PaginatedResponse<Orchestration>>;
    /**
     * Get orchestration by ID
     */
    getById(id: string): Promise<Orchestration>;
    /**
     * Create new orchestration
     */
    create(orchestration: CreateOrchestrationRequest): Promise<Orchestration>;
    /**
     * Get orchestrations by party
     */
    getByParty(partyId: string, params?: PaginationParams): Promise<PaginatedResponse<Orchestration>>;
}
//# sourceMappingURL=orchestrations.d.ts.map