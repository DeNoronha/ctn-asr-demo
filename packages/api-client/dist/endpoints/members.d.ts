import { AxiosInstance } from 'axios';
import { Member, CreateMemberRequest, UpdateMemberRequest, PaginatedResponse, PaginationParams } from '../types';
export declare class MembersEndpoint {
    private axios;
    constructor(axios: AxiosInstance);
    /**
     * Get all members (admin only)
     */
    getAll(params?: PaginationParams): Promise<PaginatedResponse<Member>>;
    /**
     * Get member by ID
     */
    getById(id: string): Promise<Member>;
    /**
     * Create new member
     */
    create(member: CreateMemberRequest): Promise<Member>;
    /**
     * Update member
     */
    update(id: string, updates: UpdateMemberRequest): Promise<Member>;
    /**
     * Delete member
     */
    delete(id: string): Promise<void>;
}
//# sourceMappingURL=members.d.ts.map