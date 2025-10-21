"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthEndpoint = void 0;
class AuthEndpoint {
    constructor(axios) {
        this.axios = axios;
    }
    /**
     * Get current user's party information
     */
    async getPartyInfo() {
        const { data } = await this.axios.get('/me/party-info');
        return data;
    }
    /**
     * Validate current authentication token
     */
    async validateToken() {
        try {
            const { data } = await this.axios.get('/me/validate');
            return { valid: true, expires_at: data.expires_at };
        }
        catch (error) {
            return { valid: false };
        }
    }
}
exports.AuthEndpoint = AuthEndpoint;
