import { AxiosInstance } from 'axios';
import { PartyInfo } from '../types';

export class AuthEndpoint {
  constructor(private axios: AxiosInstance) {}

  /**
   * Get current user's party information
   */
  async getPartyInfo(): Promise<PartyInfo> {
    const { data } = await this.axios.get('/me/party-info');
    return data;
  }

  /**
   * Validate current authentication token
   */
  async validateToken(): Promise<{ valid: boolean; expires_at?: string }> {
    try {
      const { data } = await this.axios.get('/me/validate');
      return { valid: true, expires_at: data.expires_at };
    } catch (error) {
      return { valid: false };
    }
  }
}
