import { PartyInfo } from '../types';
export declare class AuthEndpoint {
    private axios;
    constructor(axios: any);
    /**
     * Get current user's party information
     */
    getPartyInfo(): Promise<PartyInfo>;
    /**
     * Validate current authentication token
     */
    validateToken(): Promise<{
        valid: boolean;
        expires_at?: string;
    }>;
}
//# sourceMappingURL=auth.d.ts.map