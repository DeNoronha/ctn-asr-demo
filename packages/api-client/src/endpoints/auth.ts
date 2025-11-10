import axiosLib from 'axios';
import type { PartyInfo } from '../types';

export class AuthEndpoint {
  constructor(private axios: ReturnType<typeof axiosLib.create>) {}

  /**
   * Get current user's party information
   */
  async getPartyInfo(): Promise<PartyInfo> {
    const { data } = await this.axios.get<PartyInfo>('/me/party-info');
    return data;
  }

  /**
   * Validate current authentication token
   */
  async validateToken(): Promise<{ valid: boolean; expires_at?: string }> {
    try {
      const { data } = await this.axios.get<{ expires_at?: string }>('/me/validate');
      return { valid: true, expires_at: data.expires_at };
    } catch (error) {
      return { valid: false };
    }
  }
}
