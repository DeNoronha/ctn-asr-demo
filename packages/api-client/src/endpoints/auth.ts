// @ts-nocheck
import { PartyInfo } from '../types';

export class AuthEndpoint {
  constructor(private axios: any) {}

  /**
   * Get current user's party information
   */
  async getPartyInfo(): Promise<PartyInfo> {
    const { data } = await this.axios.get('/me/party-info') as any;
    return data as any;
  }

  /**
   * Validate current authentication token
   */
  async validateToken(): Promise<{ valid: boolean; expires_at?: string }> {
    try {
      const { data } = await this.axios.get('/me/validate') as any;
      return { valid: true, expires_at: data.expires_at };
    } catch (error) {
      return { valid: false };
    }
  }
}
