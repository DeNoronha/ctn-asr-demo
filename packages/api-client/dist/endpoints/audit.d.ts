import { AuditLog, AuditLogFilters, PaginatedResponse } from '../types';
export declare class AuditLogsEndpoint {
    private axios;
    constructor(axios: Axios.AxiosInstance);
    /**
     * Get audit logs with optional filters
     */
    getAll(filters?: AuditLogFilters): Promise<PaginatedResponse<AuditLog>>;
    /**
     * Get audit log by ID
     */
    getById(id: number): Promise<AuditLog>;
    /**
     * Get audit logs for a specific resource
     */
    getByResource(resourceType: string, resourceId: string): Promise<AuditLog[]>;
    /**
     * Get audit logs for a specific user
     */
    getByUser(userEmail: string, filters?: AuditLogFilters): Promise<PaginatedResponse<AuditLog>>;
}
//# sourceMappingURL=audit.d.ts.map