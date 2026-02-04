export class AuditLogsEndpoint {
    constructor(axios) {
        this.axios = axios;
    }
    /**
     * Get audit logs with optional filters
     */
    async getAll(filters) {
        const { data } = await this.axios.get("/audit-logs", { params: filters });
        return data;
    }
    /**
     * Get audit log by ID
     */
    async getById(id) {
        const { data } = await this.axios.get(`/audit-logs/${id}`);
        return data;
    }
    /**
     * Get audit logs for a specific resource
     */
    async getByResource(resourceType, resourceId) {
        const { data } = await this.axios.get("/audit-logs", {
            params: {
                resource_type: resourceType,
                resource_id: resourceId,
            },
        });
        return Array.isArray(data) ? data : data.data;
    }
    /**
     * Get audit logs for a specific user
     */
    async getByUser(userEmail, filters) {
        const { data } = await this.axios.get("/audit-logs", {
            params: {
                ...filters,
                user_email: userEmail,
            },
        });
        return data;
    }
}
